// Real local Auth/RLS/HTTP smoke for empty-room archives. No gateway request is made.
const assert = require('node:assert/strict');
module.exports = async ({ check, signedIn, values, passwords, createClient, url }) => {
  const buyer = await signedIn('s2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD);
  const supplier = await signedIn('s2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  const admin = createClient(values.API_URL,values.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const created = await buyer.api.rpc('create_supplier_room_invite',{p_project_id:'52000000-0000-4000-8000-0000000000d1',p_supplier_organization_name:'[S2-TEST] Archive '+Date.now(),p_invited_email:'archive-fixture@s2-test.invalid',p_expires_in_hours:168});
  assert.ifError(created.error); const roomId=created.data.room_id;
  const request = (token, body = JSON.stringify({roomId})) => fetch(url+'/api/project-room/archive',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body});
  await check('Archive endpoint rejects anonymous requests without contacting the gateway',async()=>{assert.equal((await request(null)).status,401);});
  await check('Authorized empty-room archive is complete, private, and contains no invented file bytes',async()=>{
    const r=await request(buyer.token);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);
    const data=await r.json();assert.equal(data.schema,'sourcerating-room-archive-v1');assert.equal(data.complete,true);assert.equal(data.evidenceIndex.room.id,roomId);assert.deepEqual(data.contents,[]);
  });
  await check('Unrelated supplier cannot export the new buyer room',async()=>{assert.equal((await request(supplier.token)).status,403);});
  await check('Removed owner member cannot export with a live Auth session',async()=>{
    const removed=await admin.from('room_members').update({removed_at:new Date().toISOString()}).eq('room_id',roomId).eq('user_id',buyer.user.id);assert.ifError(removed.error);
    try {assert.equal((await request(buyer.token)).status,403);}
    finally {assert.ifError((await admin.from('room_members').update({removed_at:null}).eq('room_id',roomId).eq('user_id',buyer.user.id)).error);}
  });
  await check('Oversized and invalid JSON archive requests fail before snapshot reads',async()=>{
    assert.equal((await request(buyer.token,'x'.repeat(4097))).status,413);assert.equal((await request(buyer.token,'{')).status,400);
  });
};
