// Real two-connection regression. Requires pg from the local test tool install.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { Client } = require(path.join(process.env.SR_LINEAGE_NODE_MODULES || '', 'pg'));
const raw = process.env.SR_LINEAGE_TEST_DATABASE_URL;
if (!raw) throw Error('SR_LINEAGE_TEST_DATABASE_URL is required');
const url = new URL(raw);
if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' ||
    !/^\/sr_lineage_test_[a-z0-9_]+$/.test(url.pathname) || url.search || url.hash)
  throw Error('Expected an IPv4 loopback URL for a disposable sr_lineage_test_* database');
const make = () => new Client({ connectionString: raw, host: '127.0.0.1' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const a = randomUUID(), b = randomUUID(), u0 = randomUUID(), u1 = randomUUID(), u2 = randomUUID();
const m0 = randomUUID(), m1 = randomUUID(), m2 = randomUUID(), tag = randomUUID().replaceAll('-', '');
const ea = 'lineage-a-' + tag + '@example.test', eb = 'lineage-b-' + tag + '@example.test';
const claim = (id, email) => JSON.stringify({ sub: id, email, role: 'authenticated' });
const app = 'lineage_b_' + tag;
async function main() {
  const ctl = make(), one = make(), two = make();
  await Promise.all([ctl.connect(), one.connect(), two.connect()]);
  try {
    const identity = await ctl.query("select current_user as usr, host(inet_server_addr()) as host");
    assert.deepEqual(identity.rows[0], {usr:'postgres', host:'127.0.0.1'});
    // Committed synthetic data allows independent sessions to observe the same room.
    await ctl.query('create temp table lineage_fixture(data jsonb)');
    await ctl.query([
      'do $$ declare oa uuid; ob uuid; room uuid; inv jsonb; first jsonb; begin',
      "insert into auth.users(id,email) values ('" + a + "','" + ea + "'),('" + b + "','" + eb + "');",
      "perform set_config('request.jwt.claims','" + claim(a,ea) + "',true);",
      "oa := (public.sr_create_organization('Lineage A','A')->>'organization_id')::uuid;",
      "room := (public.sr_create_project(oa,'Concurrency regression','buyer')->>'main_room_id')::uuid;",
      "inv := public.sr_create_invite(room,oa,'" + eb + "','organization','Lineage B','supplier');",
      "perform set_config('request.jwt.claims','" + claim(b,eb) + "',true);",
      "ob := (public.sr_create_organization('Lineage B','B')->>'organization_id')::uuid;",
      "perform public.sr_accept_invite(inv->>'token',ob,null,null);",
      "insert into storage.objects(bucket_id,name,owner_id) values",
      "('room-files',room||'/" + u0 + "/chain.pdf','" + a + "'),",
      "('room-files',room||'/" + u1 + "/chain.pdf','" + a + "'),",
      "('room-files',room||'/" + u2 + "/chain.pdf','" + b + "');",
      "perform set_config('request.jwt.claims','" + claim(a,ea) + "',true);",
      "first := public.register_room_file_version(room,room||'/" + u0 + "/chain.pdf','chain.pdf','application/pdf',10,repeat('a',64),oa,'" + m0 + "');",
      "insert into lineage_fixture values(jsonb_build_object('room',room,'oa',oa,'ob',ob,'rev0',first->'file'->>'id')); end $$;"
    ].join('\n'));
    const f = (await ctl.query('select data from lineage_fixture')).rows[0].data;
    await one.query('begin');
    await one.query("select set_config('request.jwt.claims',$1,true)", [claim(a,ea)]);
    await one.query('set local role authenticated');
    await one.query("select public.register_room_file_version($1,$2,'chain.pdf','application/pdf',11,repeat('b',64),$3,$4)", [f.room, f.room+'/'+u1+'/chain.pdf', f.oa,m1]);
    await two.query("select set_config('application_name',$1,false)", [app]);
    await two.query('begin');
    await two.query("select set_config('request.jwt.claims',$1,true)", [claim(b,eb)]);
    await two.query('set local role authenticated');
    const second = two.query("select public.register_room_file_version($1,$2,'chain.pdf','application/pdf',12,repeat('c',64),$3,$4)", [f.room,f.room+'/'+u2+'/chain.pdf',f.ob,m2]);
    // Avoid an unhandled rejection while probing for the expected lock wait.
    second.catch(() => {});
    let blocked = false;
    for (let i=0; i<100; i++) {
      const state = await ctl.query("select exists(select 1 from pg_stat_activity where application_name=$1 and wait_event_type='Lock') as blocked",[app]);
      if (state.rows[0].blocked) { blocked = true; break; }
      await delay(100);
    }
    assert.ok(blocked, 'second organization did not wait for the first transaction');
    await one.query('commit');
    await second;
    await two.query('commit');
    const versions = (await ctl.query("select id,version_no,supersedes_version_id,uploader_organization_id from public.room_file_versions where room_id=$1 and logical_name='chain.pdf' order by version_no",[f.room])).rows;
    assert.deepEqual(versions.map(x => x.version_no),[1,2,3]);
    assert.equal(versions[0].id,f.rev0);
    assert.equal(versions[0].supersedes_version_id,null);
    assert.equal(versions[1].supersedes_version_id,versions[0].id);
    assert.equal(versions[2].supersedes_version_id,versions[1].id);
    assert.equal(versions[1].uploader_organization_id,f.oa);
    assert.equal(versions[2].uploader_organization_id,f.ob);
    assert.equal((await ctl.query('select count(*)::int as n from public.room_confirmations where file_version_id=$1',[versions[2].id])).rows[0].n,0);
    console.log('PASS cross-org concurrent RPCs: observed lock wait, v1 -> v2 -> v3, no inherited confirmations');
    const reviewKey = randomUUID();
    await one.query('begin');
    await one.query("select set_config('request.jwt.claims',$1,true)", [claim(a,ea)]);
    await one.query('set local role authenticated');
    const review = await one.query("select (public.sr_request_file_review($1,$2,$3,$4)).id as id", [versions[2].id,f.oa,reviewKey,'please review']);
    await two.query('begin');
    await two.query("select set_config('request.jwt.claims',$1,true)", [claim(a,ea)]);
    await two.query('set local role authenticated');
    const retry = two.query("select (public.sr_request_file_review($1,$2,$3,$4)).id as id", [versions[2].id,f.oa,reviewKey,'please review']);
    retry.catch(() => {});
    blocked = false;
    for (let i=0; i<100; i++) {
      const state = await ctl.query("select exists(select 1 from pg_stat_activity where application_name=$1 and wait_event_type='Lock') as blocked",[app]);
      if (state.rows[0].blocked) { blocked = true; break; }
      await delay(100);
    }
    assert.ok(blocked, 'same-key review retry did not wait for the first transaction');
    await one.query('commit');
    const retried = await retry;
    await two.query('commit');
    assert.equal(retried.rows[0].id,review.rows[0].id);
    assert.equal((await ctl.query('select count(*)::int as n from public.room_events where room_id=$1 and client_msg_id=$2',[f.room,reviewKey])).rows[0].n,1);
    assert.equal((await ctl.query('select count(*)::int as n from public.needs_you where source_event_id=$1',[review.rows[0].id])).rows[0].n,1);
    console.log('PASS concurrent same-key review RPC: observed lock wait, one event and one task');

  } finally {
    await Promise.allSettled([one.end(),two.end(),ctl.end()]);
  }
}
main().catch(e => { console.error(e.stack); process.exitCode=1; });
