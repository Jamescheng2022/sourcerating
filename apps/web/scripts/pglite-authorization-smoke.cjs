const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require(process.env.SR_PGLITE_PKG || '@electric-sql/pglite');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures','ai-migration.fixture.sql'),'utf8');
const migration=fs.readFileSync(path.resolve(__dirname,'../../../supabase/migrations/202610280001_scoped_ai_pilot.sql'),'utf8');
const ids={
  roomA:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',roomB:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  buyer:'11111111-1111-4111-8111-111111111111',
  supplier:'22222222-2222-4222-8222-222222222222',
  userA:'33333333-3333-4333-8333-333333333333',
  userB:'44444444-4444-4444-8444-444444444444',
  event1:'55555555-5555-4555-8555-555555555555',
  event2:'66666666-6666-4666-8666-666666666666',
  event3:'77777777-7777-4777-8777-777777777777'
};
const row=async(db,sql,args=[]) =>(await db.query(sql,args)).rows[0];
async function main(){
  const db=new PGlite();
  await db.waitReady;
  try {
    await db.exec(fixture);
    await db.exec(migration);
    await db.exec(fs.readFileSync(path.resolve(__dirname,'../../../supabase/migrations/20261030000629_source_rating_modern_claim_role.sql'),'utf8'));
    console.log('MIGRATION_SQL_APPLIED');
    for (const uid of [ids.userA,ids.userB]) await db.query('insert into auth.users values ($1)',[uid]);
    for (const org of [ids.buyer,ids.supplier]) await db.query('insert into public.organizations values ($1)',[org]);
    for (const room of [ids.roomA,ids.roomB]) await db.query('insert into public.rooms values ($1)',[room]);
    for (const [event,room] of [[ids.event1,ids.roomA],[ids.event2,ids.roomB],[ids.event3,ids.roomA]]) {
      await db.query('insert into public.room_events values ($1,$2)',[event,room]);
    }
    await db.query('insert into public.room_members(room_id,user_id,acting_organization_id) values($1,$2,$3)',[ids.roomA,ids.userA,ids.buyer]);
    await db.query('insert into public.room_members(room_id,user_id,acting_organization_id) values($1,$2,$3)',[ids.roomA,ids.userB,ids.supplier]);
    for (const [room,event] of [[ids.roomA,ids.event1],[ids.roomB,ids.event2]]) {
      await db.query('insert into public.event_outbox(room_id,room_event_id) values($1,$2)',[room,event]);
    }
    await db.query("select set_config('request.jwt.claim.role','service_role',false)");
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({role:'anon'})]);
    let denied=false;
    try {await db.query('select id from public.agent_claim_scoped_outbox(array[$1]::uuid[],5)',[ids.roomA]);}
    catch(e){denied=String(e.message).includes('service_role_required');}
    assert.equal(denied,true,'modern anon claims cannot claim even with a stale legacy service-role GUC');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({role:'service_role'})]);
    const scoped=await db.query('select id,room_id from public.agent_claim_scoped_outbox(array[$1]::uuid[],5)',[ids.roomA]);
    assert.equal(scoped.rows.length,1);
    assert.equal(scoped.rows[0].room_id,ids.roomA);
    assert.equal((await row(db,'select status from public.event_outbox where room_id=$1',[ids.roomB])).status,'pending');
    console.log('SCOPED_OUTBOX_AND_ANON_DENIAL_PASS');

    const p1=await row(db,"insert into public.staging_proposals(room_id,source_event_id,proposal_type,payload,confidence,provider) values($1,$2,'quote_change','{\"summary\":\"THB 50000\"}'::jsonb,0.9,'deepseek-direct') returning id",[ids.roomA,ids.event1]);
    const p2=await row(db,"insert into public.staging_proposals(room_id,source_event_id,proposal_type,payload,confidence,provider) values($1,$2,'quote_change','{\"summary\":\"THB 60000\"}'::jsonb,0.9,'deepseek-direct') returning id",[ids.roomA,ids.event3]);
    let duplicateFailed=false;
    try {await db.query("insert into public.staging_proposals(room_id,source_event_id,proposal_type,payload,confidence,provider) values($1,$2,'risk','{}'::jsonb,0.2,'rules')",[ids.roomA,ids.event1]);}
    catch(e){duplicateFailed=String(e.message).includes('staging_one_proposal_per_event');}
    assert.equal(duplicateFailed,true,'one proposal per persisted event across providers');
    console.log('STAGING_IDEMPOTENCY_PASS');

    await db.query("insert into public.needs_you(room_id,source_event_id,proposal_id,title,priority,target_organization_id) values($1,$2,$3,'Approve quote','normal',$4)",[ids.roomA,ids.event1,p1.id,ids.supplier]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids.userA]);
    let wrongDenied=false;
    try{await db.query("select public.review_staging_proposal($1::uuid,'accept',$2::uuid,null)",[p1.id,ids.buyer]);}
    catch(e){wrongDenied=String(e.message).includes('proposal_review_not_assigned_to_your_organization');}
    assert.equal(wrongDenied,true,'buyer cannot approve an item assigned to supplier');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids.userB]);
    let missingDenied=false;
    try{await db.query("select public.review_staging_proposal($1::uuid,'accept',$2::uuid,null)",[p2.id,ids.supplier]);}
    catch(e){missingDenied=String(e.message).includes('proposal_review_assignment_missing');}
    assert.equal(missingDenied,true,'no open assigned task cannot be approved');

    const first=await row(db,"select public.review_staging_proposal($1::uuid,'accept',$2::uuid,null) as result",[p1.id,ids.supplier]);
    assert.equal(first.result.idempotent,false);
    const repeated=await row(db,"select public.review_staging_proposal($1::uuid,'accept',$2::uuid,null) as result",[p1.id,ids.supplier]);
    assert.equal(repeated.result.idempotent,true);
    assert.equal((await row(db,'select count(*)::integer as total from public.canonical_objects')).total,1);
    assert.equal((await row(db,'select status from public.needs_you where proposal_id=$1',[p1.id])).status,'done');
    console.log('HUMAN_REVIEW_ASSIGNMENT_AND_CANONICAL_IDEMPOTENCY_PASS');
    console.log('LOCAL_WASM_POSTGRES_AUTHORIZATION_TESTS_ALL_PASS');
  } finally {await db.close()}
}
main().catch(e=>{console.error('TEST_FAILURE:',e.message);process.exitCode=1});