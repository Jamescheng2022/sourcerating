// Real local Auth/RLS/UI for empty archives; explicit browser fixtures for faults/file rendering.
// Never invokes the denied file gateway. Full uploaded-file chain stays in e2e mode.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
module.exports = async ({ buyer, check, signedIn, passwords, output, login, remoteRequests, pageErrors }) => {
  const actor = await signedIn('s2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD);
  const name = '[S2-TEST] Download ' + Date.now();
  const created = await actor.api.rpc('create_supplier_room_invite', { p_project_id:'52000000-0000-4000-8000-0000000000d1',p_supplier_organization_name:name,p_invited_email:'download@s2-test.invalid',p_expires_in_hours:168 });
  assert.ifError(created.error); const roomId = created.data.room_id;
  const select = async () => { await buyer.getByRole('button').filter({ hasText:name }).first().click(); };
  await buyer.reload(); await select();
  const button = () => buyer.getByRole('button', { name:'Download room archive with files', exact:true });
  const statuses = text => buyer.getByRole('status').filter({hasText:text});
  const downloads = []; buyer.on('download', d => downloads.push(d));
  const endpoint = '**/api/project-room/archive';
  const read = async d => JSON.parse(fs.readFileSync(await d.path(),'utf8'));
  let empty;
  await check('Real local empty-room archive downloads through desktop UI with caller Auth/RLS', async () => {
    const next = buyer.waitForEvent('download'); await button().click(); const download = await next;
    empty = await read(download); assert.equal(empty.complete,true); assert.equal(empty.evidenceIndex.room.id,roomId); assert.deepEqual(empty.contents,[]);
    assert.equal(download.suggestedFilename(), `room-${roomId}-archive.json`);
    await statuses('Archive download started.').waitFor();
  });
  await check('Real local archive downloads at 390px with scope/size limits and no horizontal overflow', async () => {
    await buyer.setViewportSize({width:390,height:844}); await buyer.getByRole('button',{name:/Needs You.*Specs/}).click();
    const next=buyer.waitForEvent('download'); await button().click(); assert.equal((await read(await next)).evidenceIndex.room.id,roomId);
    await buyer.getByText('Archive: up to 50 file versions, 2 MiB total.',{exact:false}).filter({visible:true}).waitFor();
    assert(await buyer.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await buyer.screenshot({path:path.join(output,'archive-mobile-390.png')});
  });
  await check('Isolated unavailable-service response gives retry, no partial download or automatic index fallback',async()=>{
    const before=downloads.length; let indexes=0;
    const count=r=>{if(r.url().endsWith('/rpc/export_room_evidence'))indexes++;}; buyer.on('request',count);
    await buyer.route(endpoint,r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture-unavailable"}'}));
    await button().click(); await statuses('No partial archive was downloaded.').waitFor();
    assert.equal(downloads.length,before); assert.equal(indexes,0); assert(await button().isEnabled());
    await buyer.screenshot({path:path.join(output,'archive-unavailable-390.png')});
    await buyer.unroute(endpoint); buyer.off('request',count);
    const next=buyer.waitForEvent('download');await button().click();assert.equal((await read(await next)).complete,true);
  });
  await check('Isolated quota refusal clearly distinguishes optional metadata index from full archive',async()=>{
    const before=downloads.length;
    await buyer.route(endpoint,r=>r.fulfill({status:413,body:'too large'})); await button().click();await statuses('exceeds the archive limit').waitFor();
    assert.equal(downloads.length,before);assert(await button().isEnabled());await buyer.unroute(endpoint);
  });
  await check('Isolated partial and cross-room success-shaped responses are refused without download',async()=>{
    for(const bad of [{...empty,complete:false},{...empty,evidenceIndex:{...empty.evidenceIndex,room:{id:'wrong-room'}}}]){
      const before=downloads.length;await buyer.route(endpoint,r=>r.fulfill({status:200,json:bad}));await button().click();
      await statuses('No download was created.').waitFor();assert.equal(downloads.length,before);await buyer.unroute(endpoint);
    }
  });
  await check('Isolated file-bearing UI fixture preserves downloaded bytes; this does not test the gateway',async()=>{
    const bytes=Buffer.from('%PDF isolated UI fixture, not live storage');const sha=crypto.createHash('sha256').update(bytes).digest('hex');
    const id='52000000-0000-4000-8000-0000000000f8';
    const fixture={...empty,evidenceIndex:{...empty.evidenceIndex,files:[{id,room_id:roomId,sha256:sha,size_bytes:bytes.length}]},contents:[{fileVersionId:id,sha256:sha,sizeBytes:bytes.length,encoding:'base64',content:bytes.toString('base64')}]};
    await buyer.route(endpoint,r=>r.fulfill({status:200,json:fixture}));const next=buyer.waitForEvent('download');await button().click();
    const data=await read(await next);assert.deepEqual(Buffer.from(data.contents[0].content,'base64'),bytes);await buyer.unroute(endpoint);
  });
  await check('Isolated oversized response is bounded and never saved as a successful archive',async()=>{
    const before=downloads.length;await buyer.route(endpoint,r=>r.fulfill({status:200,body:' '.repeat(4*1024*1024+1)}));await button().click();
    await statuses('exceeds the download limit').waitFor();assert.equal(downloads.length,before);await buyer.unroute(endpoint);
  });
  async function hold() {
    let release, started;const waiting=new Promise(resolve=>{release=resolve;});const entered=new Promise(resolve=>{started=resolve;});
    await buyer.route(endpoint,async r=>{started();await waiting;await r.fulfill({status:200,json:empty}).catch(()=>{});});
    await button().click();await entered;return async()=>{release();await buyer.unroute(endpoint);await buyer.waitForTimeout(150);};
  }
  await check('Cancel stops an in-flight archive and a late response cannot trigger download',async()=>{
    const before=downloads.length;const release=await hold();await buyer.getByRole('button',{name:'Cancel export',exact:true}).click();
    await statuses('Export cancelled.').waitFor();await release();assert.equal(downloads.length,before);assert(await button().isEnabled());
  });
  await check('A stalled archive times out, recovers controls, and refuses a late successful response',async()=>{
    await buyer.clock.install();const before=downloads.length;const release=await hold();
    await buyer.clock.fastForward('00:31');await statuses('Export timed out.').waitFor();
    await release();assert.equal(downloads.length,before);assert(await button().isEnabled());await buyer.clock.resume();
  });
  await check('Changing rooms cancels an in-flight archive and clears the prior room status',async()=>{
    await buyer.setViewportSize({width:1280,height:900});const before=downloads.length;const release=await hold();
    await buyer.getByRole('button').filter({hasText:'[S2-TEST] Buyer Internal'}).first().click();await release();
    assert.equal(downloads.length,before);assert.equal(await statuses('Archive download started.').count(),0);await select();assert(await button().isEnabled());
  });
  await check('Failed remote sign-out clears local private UI but does not claim server session revocation',async()=>{
    await buyer.route('**/auth/v1/logout**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"isolated temporary failure"}'}));
    buyer.once('dialog',d=>d.accept());await buyer.getByRole('button',{name:/^Sign out/}).first().click();
    await buyer.getByText('Signed out on this browser.',{exact:false}).waitFor();
    assert.equal(await buyer.getByRole('textbox',{name:'Room message',exact:true}).count(),0);
    await buyer.getByLabel('Email',{exact:true}).waitFor();
    await buyer.unroute('**/auth/v1/logout**');await buyer.reload();await buyer.getByLabel('Email',{exact:true}).waitFor();
    await login(buyer,'s2-buyer@s2-test.invalid',passwords.S2_BUYER_PASSWORD);await select();
  });
  await check('Sign-out prevents an in-flight private archive from downloading after logout',async()=>{
    const before=downloads.length;const release=await hold();buyer.once('dialog',d=>d.accept());
    await buyer.getByRole('button',{name:/^Sign out/}).first().click();await buyer.getByLabel('Email',{exact:true}).waitFor();await release();assert.equal(downloads.length,before);
    await login(buyer,'s2-buyer@s2-test.invalid',passwords.S2_BUYER_PASSWORD);
  });
  await check('Cross-tab sign-out clears private page state and cancels an in-flight archive',async()=>{
    await select();const other=await buyer.context().newPage();await other.goto(buyer.url());
    await other.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
    const before=downloads.length;const release=await hold();other.once('dialog',d=>d.accept());
    await other.getByRole('button',{name:/^Sign out/}).first().click();
    await buyer.getByLabel('Email',{exact:true}).waitFor();await release();
    assert.equal(downloads.length,before);assert.equal(await buyer.getByRole('textbox',{name:'Room message',exact:true}).count(),0);await other.close();
  });
  await check('Download acceptance remains local and has no uncaught page errors',async()=>{
    assert.deepEqual(remoteRequests,[]);assert.deepEqual(pageErrors,[]);
  });
};
