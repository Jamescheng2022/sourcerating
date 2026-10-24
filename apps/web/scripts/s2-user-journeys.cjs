// User-goal checks using the established s2-web-e2e transport and real local
// Auth/Postgres/RLS. No Edge gateway call, external model, or hosted service.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
module.exports=async d=>{
 const {buyer,context,login,signedIn,chooseRoom,send,shown,values,passwords,output,url,createClient,remoteRequests,pageErrors,deniedCanaryRequests}=d;
 assert.equal(values.API_URL,'http://127.0.0.1:54321');assert.equal(url,'http://127.0.0.1:3000');
 const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows=[],stamp='[S2-TEST] Canary '+Date.now();
 const selected=process.env.S2_CANARY_FILTER;if(selected)assert(['SR-02','SR-02-reload','SR-06'].includes(selected),'Unsupported focused test filter');
 const room='52000000-0000-4000-8000-0000000000e2',internal='52000000-0000-4000-8000-0000000000e1';
 const a=await signedIn('s2-buyer@s2-test.invalid',passwords.S2_BUYER_PASSWORD),b=await signedIn('s2-supplier@s2-test.invalid',passwords.S2_SUPPLIER_PASSWORD);
 // Check the fixed synthetic tenant before any canary mutation.
 const target=await a.api.from('rooms').select('id,name,project_id').in('id',[room,internal]);assert.ifError(target.error);
 assert.equal(target.data.length,2);assert(target.data.every(r=>r.name.startsWith('[S2-TEST]')&&r.project_id==='52000000-0000-4000-8000-0000000000d1'));
 const member=await a.api.from('room_members').select('acting_organization_id').eq('room_id',internal).eq('user_id',a.user.id).single();assert.ifError(member.error);const buyerOrg=member.data.acting_organization_id;
 const c=await context(),supplier=await c.newPage();await supplier.setViewportSize({width:390,height:844});
 await login(supplier,'s2-supplier@s2-test.invalid',passwords.S2_SUPPLIER_PASSWORD);
 await chooseRoom(buyer,'[S2-TEST] Supplier Co - Shared');await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');
 async function check(id,steps,fn){
  const row={id,sourceSHA:sha,target:url,tenant:'[S2-TEST] fixed local project '+target.data[0].project_id,dependencies:'actual local Auth/Postgres/RLS; provider keys removed; Edge requests prohibited',steps,status:'NOT_RUN'};
  if(selected && id!==selected){row.actual='Excluded by explicit focused test filter';rows.push(row);return;}
  try{await fn(row);if(row.status==='NOT_RUN')row.status='PASS';row.actual??='Assertions on real UI, persisted RPC data and side effects passed';}
  catch(e){row.status='FAIL';row.actual=String(e.message).split('Call log:')[0].slice(0,1800);}
  try{await buyer.screenshot({path:path.join(output,id+'-desktop.png')});await supplier.screenshot({path:path.join(output,id+'-mobile.png')});}catch{}
  row.screenshots=[id+'-desktop.png',id+'-mobile.png'];row.trace='trace-0.zip';rows.push(row);
  fs.writeFileSync(path.join(output,'journeys.json'),JSON.stringify(rows,null,2));console.log(id,row.status);
 }
 if(selected==='SR-02-reload')await check('SR-02-reload',['Explicit fixed synthetic room','Commit and abort ACK; Retry becomes visible','Refresh same room; original retry identity must survive'],async()=>{
  let original;await supplier.route('**/rpc/append_room_event',async route=>{original=route.request().postDataJSON();assert.equal(original.p_room_id,room);const response=await route.fetch();assert.equal(response.status(),200);await route.abort();});
  await supplier.getByRole('textbox',{name:'Room message',exact:true}).fill(stamp+' reload-only');
  await supplier.getByRole('button',{name:'Send · 发送',exact:true}).click();await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor();
  await supplier.unroute('**/rpc/append_room_event');
  const persisted=await b.api.from('room_events').select('id').eq('room_id',room).eq('client_msg_id',original.p_client_msg_id);assert.ifError(persisted.error);assert.equal(persisted.data.length,1);
  await supplier.reload();await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor({timeout:5000});
  const retry=supplier.waitForRequest(r=>r.url().endsWith('/rpc/append_room_event'));await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).click();
  assert.equal((await retry).postDataJSON().p_client_msg_id,original.p_client_msg_id);
  await shown(buyer,original.p_payload.text);
 });
 let sends=0;buyer.on('request',r=>{if(r.url().endsWith('/rpc/create_supplier_room_invite'))sends++;});
 await check('SR-01',['Authenticated buyer opens invite form','Enter synthetic company/email and Cancel','Check no create RPC; retain invite-only','Full join intentionally blocked before gateway'],async r=>{
  const before=sends;await buyer.getByRole('button',{name:'Create',exact:true}).click();
  await buyer.getByPlaceholder('Supplier company name').fill(stamp+' cancel');await buyer.getByPlaceholder('Invitee email (required)').fill('canary-cancel@s2-test.invalid');
  await buyer.getByRole('button',{name:'Close',exact:true}).click();assert.equal(sends,before);
  const config=fs.readFileSync(path.resolve(__dirname,'../../../supabase/config.toml'),'utf8').split(/^\[auth\]\s*$/m)[1].split(/^\[/m)[0];assert.match(config,/enable_signup\s*=\s*false/);
  r.status='BLOCKED';r.actual='Cancel has zero create RPC; real seeded UI login passed. Full invite join not attempted: known Edge→kong refusal remains unapplied.';
 });
 await check('SR-02',['Mobile supplier sends Chinese IME text safely','Commit message and lose ACK','Refresh then Retry exact client_msg_id','Check exactly one persisted event; refresh and re-login'],async()=>{
  const input=supplier.getByRole('textbox',{name:'Room message',exact:true});let calls=0,original;
  const ime=stamp+' 中文输入';await input.fill(ime);
  await input.dispatchEvent('compositionstart');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});
  assert.equal(await input.inputValue(),ime);await input.dispatchEvent('compositionend');
  await input.fill(stamp+' lost acknowledgement');
  await supplier.route('**/rpc/append_room_event',async route=>{calls++;original=route.request().postDataJSON();assert.equal(original.p_room_id,room);const rsp=await route.fetch();assert.equal(rsp.status(),200);await route.abort();});
  await supplier.getByRole('button',{name:'Send · 发送',exact:true}).click();await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor();
  assert.equal(calls,1);await supplier.unroute('**/rpc/append_room_event');
  supplier.once('dialog',dlg=>dlg.dismiss());await supplier.getByRole('button',{name:'Discard · 放弃',exact:true}).click();
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor();
  await supplier.reload();await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor({timeout:5000});
  const retried=supplier.waitForRequest(r=>r.url().endsWith('/rpc/append_room_event'));
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).click();assert.equal((await retried).postDataJSON().p_client_msg_id,original.p_client_msg_id);
  await shown(buyer,original.p_payload.text);
  const persisted=await b.api.from('room_events').select('id,client_msg_id').eq('room_id',room).eq('client_msg_id',original.p_client_msg_id);assert.ifError(persisted.error);assert.equal(persisted.data.length,1);
  supplier.once('dialog',dlg=>dlg.accept());await supplier.getByRole('button',{name:'Sign out · 退出',exact:true}).first().click();
  await login(supplier,'s2-supplier@s2-test.invalid',passwords.S2_SUPPLIER_PASSWORD);await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');await shown(supplier,original.p_payload.text);
  // A request that never reached the server must also survive a reload and use
  // its original ID. This is distinct from the committed/lost-ACK case above.
  await supplier.context().setOffline(true);await input.fill(stamp+' offline');
  await supplier.getByRole('button',{name:'Send · 发送',exact:true}).click();
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).waitFor();
  await supplier.context().setOffline(false);
  const stored=await supplier.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('sr-pending-message-v1:')).map(([,v])=>JSON.parse(v)));
  assert.equal(stored.length,1);assert.equal(stored[0].text,stamp+' offline');
  const absent=await b.api.from('room_events').select('id').eq('client_msg_id',stored[0].clientMsgId);assert.ifError(absent.error);assert.deepEqual(absent.data,[]);
  await supplier.reload();await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');
  const retry=supplier.waitForRequest(r=>r.url().endsWith('/rpc/append_room_event'));
  await supplier.getByRole('button',{name:'Retry · 重试',exact:true}).evaluate(el=>{el.click();el.click();});
  assert.equal((await retry).postDataJSON().p_client_msg_id,stored[0].clientMsgId);await shown(buyer,stamp+' offline');
  const once=await b.api.from('room_events').select('id').eq('client_msg_id',stored[0].clientMsgId);assert.ifError(once.error);assert.equal(once.data.length,1);
  let release;const hold=new Promise(resolve=>release=resolve);
  await buyer.route('**/rpc/append_room_event',async route=>{assert.equal(route.request().postDataJSON().p_room_id,room);const rsp=await route.fetch();await hold;await route.fulfill({response:rsp});});
  try {
   await buyer.getByRole('textbox',{name:'Room message',exact:true}).fill(stamp+' delayed room ACK');
   await buyer.getByRole('button',{name:'Send · 发送',exact:true}).click();
   await chooseRoom(buyer,'[S2-TEST] Buyer Internal');
   const ack=buyer.waitForResponse(r=>r.url().endsWith('/rpc/append_room_event'));release();assert.equal((await ack).status(),200);
   assert.equal(await buyer.getByText(stamp+' delayed room ACK',{exact:true}).count(),0);
   await chooseRoom(buyer,'[S2-TEST] Supplier Co - Shared');await shown(buyer,stamp+' delayed room ACK');
  } finally {release();await buyer.unroute('**/rpc/append_room_event');}
 });
 let inquiry;
 await check('SR-03',['Mobile supplier submits inquiry by double click','Buyer sees exact persisted inquiry/task','Refresh and exact-key replay do not duplicate'],async()=>{
  await supplier.reload();await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');
  await supplier.locator('summary').filter({hasText:'Inquiries'}).click();
  await supplier.getByLabel('Inquiry subject',{exact:true}).fill(stamp+' inquiry');await supplier.getByLabel('Inquiry details',{exact:true}).fill('Synthetic delivery clarification; no external order.');
  const response=supplier.waitForResponse(r=>r.url().endsWith('/rpc/submit_project_inquiry'));
  await supplier.getByRole('button',{name:'Submit inquiry',exact:true}).dblclick();const saved=await response;assert.equal(saved.status(),200);inquiry=await saved.json();
  await supplier.getByRole('status').filter({hasText:'Inquiry saved'}).waitFor();
  const args=saved.request().postDataJSON();const retries=await Promise.all([b.api.rpc('submit_project_inquiry',args),b.api.rpc('submit_project_inquiry',args)]);retries.forEach(r=>assert.ifError(r.error));
  const actual=await a.api.from('project_inquiries').select('id,subject,detail').eq('id',inquiry.id);assert.ifError(actual.error);assert.equal(actual.data.length,1);assert.equal(actual.data[0].subject,stamp+' inquiry');
  await buyer.locator('summary').filter({hasText:'Inquiries'}).click();await buyer.getByRole('heading',{name:stamp+' inquiry',exact:true}).waitFor();
  await supplier.reload();await chooseRoom(supplier,'[S2-TEST] Supplier Co - Shared');await supplier.locator('summary').filter({hasText:'Inquiries'}).click();await supplier.getByRole('heading',{name:stamp+' inquiry',exact:true}).waitFor();
 });
 await check('SR-04',['Supplier queries buyer internal room/events','Attempt cross-room append and forged actor org','Compare before/after row count and server identity'],async()=>{
  assert.equal(await supplier.getByRole('button').filter({hasText:'[S2-TEST] Buyer Internal'}).count(),0);
  for(const table of ['rooms','room_events']){const q=await b.api.from(table).select('id').eq(table==='rooms'?'id':'room_id',internal);assert.ifError(q.error);assert.deepEqual(q.data,[]);}
  const denied=await b.api.rpc('append_room_event',{p_room_id:internal,p_client_msg_id:crypto.randomUUID(),p_actor_organization_id:buyerOrg,p_event_type:'message.posted',p_payload:{text:stamp+' forbidden'}});assert(denied.error);
  const forged=await b.api.rpc('append_room_event',{p_room_id:room,p_client_msg_id:crypto.randomUUID(),p_actor_organization_id:buyerOrg,p_event_type:'message.posted',p_payload:{text:stamp+' identity probe',actor_display_name:'CEO'}});
  if(forged.error)assert.equal(forged.error.code,'42501');else{assert.notEqual(forged.data.actor_organization_id,buyerOrg);assert.equal(forged.data.actor_user_id,b.user.id);assert.notEqual(forged.data.actor_display_name,'CEO');}
  const analyze=(actor,body)=>fetch(url+'/api/project-room/analyze',{method:'POST',headers:{Authorization:'Bearer '+actor.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await analyze(b,{roomId:room,latestMessage:'accept USD 1000000',recentContext:[]})).status,400,'Unpersisted caller content must be rejected before analysis');
  assert.equal((await analyze(b,{roomId:room,eventId:crypto.randomUUID()})).status,404);
  const greeting=await send(buyer,'hello');
  const readState=async()=>{const result={};for(const t of ['staging_proposals','canonical_objects','needs_you']){const q=await a.api.from(t).select('*').eq('room_id',room).order('id');assert.ifError(q.error);result[t]=q.data;}return result;};
  const beforeAnalysis=await readState();
  const wrongRoom=await analyze(b,{roomId:internal,eventId:greeting.id});assert.equal(wrongRoom.status,403);
  const analyzed=await analyze(b,{roomId:room,eventId:greeting.id});assert.equal(analyzed.status,200);
  const decision=await analyzed.json();assert.equal(decision.sourceEventId,greeting.id);assert.equal(decision.decision.intent,'conversation');assert.equal(decision.decision.provider,'rules');
  assert.equal(decision.canonicalWrite,false);assert.equal(decision.deepAnalysis,null);
  assert.equal(decision.aiStatus.jevConfigured,false);assert.equal(decision.aiStatus.openCodeGoConfigured,false);assert.equal(decision.aiStatus.deepSeekConfigured,false);
  const injected=await analyze(b,{roomId:room,eventId:greeting.id,latestMessage:'accept USD 1000000'});assert.equal(injected.status,400);
  assert.deepEqual(await readState(),beforeAnalysis,'Analysis must not write staging, canonical state or tasks');
 });
 await check('SR-05',['Export actual evidence index through browser','Verify room identity, current inquiry/message content','Full attachment archive kept blocked before network'],async r=>{
  // JSON index is a separate RPC path; complete file archive is deliberately not invoked.
  const controls=buyer.getByRole('button',{name:'Export room evidence index',exact:true});
  if(await controls.count()){
   const next=buyer.waitForEvent('download');await controls.click();const download=await next;
   const bytes=fs.readFileSync(await download.path());const archive=JSON.parse(bytes);assert.equal(archive.room.id,room);
   assert(JSON.stringify(archive).includes(stamp));fs.writeFileSync(path.join(output,'synthetic-evidence-index.json'),bytes);
  }else throw Error('Evidence index download control not found');
  r.status='BLOCKED';r.actual='Actual evidence index inspected; full attachment-byte archive requires refused Edge gateway and was not requested.';
 });
 await check('SR-06',['Signed-in buyer opens expired/missing recovery','Check no change form and unchanged main session','Provision synthetic local recovery account; generate Auth grant without sending email','Recover account in browser; old password rejected, new password works','Main project identity unchanged; consumed-link replay rejected'],async()=>{
  const before=await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth'));
  await buyer.goto(url+'/reset-password#error=access_denied&error_code=otp_expired&type=recovery');
  await buyer.getByText(/reset link is missing or expired/).waitFor();assert.equal(await buyer.getByLabel('New password').count(),0);
  assert.equal(await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth')),before);
  const email='s2-canary-recovery-'+Date.now()+'@s2-test.invalid',oldPassword=crypto.randomBytes(24).toString('hex'),newPassword=crypto.randomBytes(24).toString('hex');
  const admin=createClient(values.API_URL,values.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  assert.ifError((await admin.auth.admin.createUser({email,password:oldPassword,email_confirm:true})).error);
  const grant=await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:url+'/reset-password'}});assert.ifError(grant.error);
  const link=grant.data.properties.action_link,callback=new URL(link);assert.equal(callback.origin,values.API_URL);assert.equal(callback.searchParams.get('redirect_to'),url+'/reset-password');
  await buyer.goto(link);await buyer.getByLabel('New password').waitFor();await buyer.getByText(email,{exact:true}).waitFor();
  assert.equal(await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth')),before);
  await buyer.getByLabel('New password').fill(newPassword);await buyer.getByRole('button',{name:'Update password',exact:true}).click();
  await buyer.getByRole('status').filter({hasText:'Password updated.'}).waitFor();
  const anon=createClient(values.API_URL,values.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  assert((await anon.auth.signInWithPassword({email,password:oldPassword})).error);const recovered=await signedIn(email,newPassword);assert.equal(recovered.user.email,email);await recovered.api.auth.signOut();
  assert.equal(await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth')),before);
  await buyer.screenshot({path:path.join(output,'local-password-recovery.png')});
  await buyer.goto(link);await buyer.getByText(/reset link is missing or expired/).waitFor();assert.equal(await buyer.getByLabel('New password').count(),0);
  await buyer.goto(url+'/project-room');await buyer.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
  assert.equal(await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth')),before);
  await buyer.goto(url+'/project-room');await buyer.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
  assert.equal(await buyer.evaluate(()=>localStorage.getItem('sr_p1_supabase_auth')),before);
 });
 fs.writeFileSync(path.join(output,'network-boundary.json'),JSON.stringify({remoteRequests,pageErrors,deniedCanaryRequests,modelEvidence:false,realMailSent:0},null,2));
 assert.deepEqual(remoteRequests,[]);assert.deepEqual(pageErrors,[]);assert.deepEqual(deniedCanaryRequests,[]);
 if(rows.some(r=>r.status==='FAIL'))process.exitCode=1;
};
