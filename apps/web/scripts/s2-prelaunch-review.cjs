// B8 acceptance against the local production build and real local Auth/database.
// Recovery links/passwords and invite tokens are never written to evidence.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
module.exports = async function suite(d) {
  const { buyer, context, check, login, signedIn, values, passwords, output, url, createClient, remoteRequests, pageErrors } = d;
  const room = '52000000-0000-4000-8000-0000000000e2';
  const project = '52000000-0000-4000-8000-0000000000d1';
  const buyerOrg = '52000000-0000-4000-8000-0000000000b1';
  const supplierOrg = '52000000-0000-4000-8000-0000000000c1';
  const root = path.resolve(__dirname, '../../../..');
  const stamp = 's2-b8-' + Date.now();
  const admin = createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(values.API_URL, values.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const ba = await signedIn('s2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD);
  const sc = await context(), supplier = await sc.newPage();
  await login(supplier, 's2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  const forbidden = /AI Verified|Before You Pay|\bPricing\b|\bpayments?\b|\bpay\b|Huntkey|Anker|Ugreen|Baseus|Belkin/i;
  // Names only: regression sentinels for every removed seed row, no rating data.
  const retiredNames = [
    'Shenzhen Huntkey Electric Co., Ltd.', '深圳航嘉驰源电气股份有限公司',
    'Anker Innovations Co., Ltd.', '安克创新科技股份有限公司',
    'Ugreen Group Ltd', '深圳市绿联科技股份有限公司',
    'Baseus Technology', '深圳市倍思科技有限公司',
    'Delta Electronics (China) Co., Ltd.', '台达电子工业股份有限公司',
    'Mean Well (Guangzhou) Electronics Co., Ltd.', '明纬（广州）电子有限公司',
    'Shenzhen SOY Technology Co., Ltd.', '深圳市索源科技有限公司',
    'Shenzhen Honor Electronic Co., Ltd.', '深圳欧陆通电子股份有限公司',
    'Shenzhen MOSO Power Supply Technology Co., Ltd.', '茂硕电源科技股份有限公司',
    'Phihong (Dongguan) Electronics Co., Ltd.', '飞宏科技',
  ];
  for (const route of ['/', '/demo', '/game']) await check('L-1 retired ' + route + ' has no marketing claims', async () => {
    const ctx = await context(), page = await ctx.newPage();
    await page.goto(url + route); assert.equal(new URL(page.url()).pathname, '/project-room');
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
    assert(!forbidden.test(await page.locator('body').innerText()));
    for (const name of retiredNames) assert(!(await page.locator('body').innerText()).includes(name));
    assert.equal(await page.title(), 'SourceRating project rooms');
    await ctx.close();
  });
  for (const query of ['', '?q=charger', '?q=Anker']) await check('L-1 supplier search retired ' + (query || 'empty query'), async () => {
    const response = await fetch(url + '/api/suppliers/search' + query); assert.equal(response.status, 410);
    assert.deepEqual(await response.json(), { error: 'Supplier search is unavailable in this pilot.' });
  });
  await check('L-1 production static assets contain no removed ratings, names or marketing', async () => {
    function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
    for (const file of files(path.resolve(__dirname, '../.next/static')).filter(p => /\.(js|html|json)$/.test(p))) {
      const content = fs.readFileSync(file, 'utf8');
      assert(!/AI Verified|Before You Pay|Huntkey|Anker|Ugreen|Baseus|Belkin|"Pricing"/.test(content), path.basename(file));
      for (const name of retiredNames) assert(!content.includes(name), path.basename(file) + ': ' + name);
    }
    assert(!fs.existsSync(path.resolve(__dirname, '../src/data/seed_data.json')));
    assert(!fs.existsSync(path.resolve(__dirname, '../src/components/SupplierProfile.tsx')));
  });
  const email = stamp + '@s2-test.invalid', oldPassword = crypto.randomBytes(24).toString('hex');
  const created = await admin.auth.admin.createUser({ email, password: oldPassword, email_confirm: true, user_metadata: { display_name: 'Forged administrator' } }); assert.ifError(created.error);
  const uid = created.data.user.id, memberName = '[S2-TEST] Buyer colleague ' + stamp;
  assert.ifError((await admin.from('organization_memberships').insert({ organization_id: buyerOrg, user_id: uid, role: 'member' })).error);
  assert.ifError((await admin.from('room_members').insert({ room_id: room, user_id: uid, acting_organization_id: buyerOrg, room_role: 'member', member_display_name: memberName })).error);
  const colleague = await signedIn(email, oldPassword);
  const args = payload => ({ p_room_id: room, p_actor_organization_id: buyerOrg, p_client_msg_id: crypto.randomUUID(), p_event_type: 'message.posted', p_payload: payload });
  let event;
  await check('L-2 sender snapshot derives from authenticated active membership, not Auth metadata', async () => {
    const reply = await colleague.api.rpc('append_room_event', args({text:'[S2-TEST] Authoritative sender '+stamp})); assert.ifError(reply.error); event = reply.data;
    assert.equal(event.actor_user_id, uid); assert.equal(event.actor_display_name, memberName); assert.equal(event.actor_organization_name, '[S2-TEST] Buyer Co');
  });
  for (const field of ['who','org','actor_display_name','actor_organization_name']) await check('L-2 RPC spoofed ' + field + ' denied', async () => {
    const reply = await colleague.api.rpc('append_room_event', args({text:'[S2-TEST] spoof '+stamp,[field]:'Administrator'})); assert.equal(reply.error?.code, '42501');
  });
  await check('L-2 RPC spoofed organization denied', async () => {
    const reply = await colleague.api.rpc('append_room_event', {...args({text:'spoof'}),p_actor_organization_id:supplierOrg}); assert.equal(reply.error?.code, '42501');
  });
  await check('L-2 direct table sender-label spoof denied', async () => {
    const reply = await colleague.api.from('room_events').insert({room_id:room,actor_user_id:uid,actor_organization_id:buyerOrg,client_msg_id:crypto.randomUUID(),event_type:'message.posted',payload:{text:'spoof',who:'Administrator'}});
    assert.equal(reply.error?.code, '42501');
  });
  for (const table of ['room_members','room_events']) await check('L-2 client cannot edit server-owned ' + table + ' identity', async () => {
    const reply = table === 'room_members' ? await colleague.api.from(table).update({member_display_name:'Administrator'}).eq('room_id',room).eq('user_id',uid).select('user_id') : await colleague.api.from(table).update({actor_display_name:'Administrator'}).eq('id',event.id).select('id');
    assert(reply.error?.code==='42501' || (!reply.error && reply.data.length===0));
    const actual = await admin.from(table).select(table==='room_members'?'member_display_name':'actor_display_name').eq(table==='room_members'?'user_id':'id',table==='room_members'?uid:event.id).single(); assert.ifError(actual.error);
    assert.equal(actual.data[table==='room_members'?'member_display_name':'actor_display_name'],memberName);
  });
  await check('L-2 UI shows buyer colleague correctly and keeps label after refresh', async () => {
    await supplier.getByRole('navigation', {name:'Room selection'}).getByRole('button',{name:'[S2-TEST] Supplier Co - Shared',exact:true}).click();
    await supplier.getByText(event.payload.text,{exact:true}).waitFor();
    const card = supplier.locator('#event-'+event.id);
    await card.waitFor();
    assert((await card.innerText()).includes(memberName), 'sender card: '+await card.innerText());
    assert.equal(await supplier.getByText('Forged administrator',{exact:true}).count(),0);
    await supplier.reload();
    await supplier.getByRole('navigation', {name:'Room selection'}).getByRole('button',{name:'[S2-TEST] Supplier Co - Shared',exact:true}).click();
    await supplier.getByText(memberName,{exact:true}).waitFor();
    await card.scrollIntoViewIfNeeded();
    const labelBox = await card.getByText(memberName,{exact:true}).boundingBox();
    assert(labelBox && labelBox.y >= 0 && labelBox.y + labelBox.height <= supplier.viewportSize().height);
    await supplier.screenshot({path:path.join(output,'01-membership-sender.png')});
  });
  await check('L-2 trigger snapshot cannot be rewritten even by direct privileged update', async () => {
    assert.equal((await admin.from('room_events').update({actor_display_name:'Administrator'}).eq('id',event.id)).error?.code,'42501');
  });
  for (const value of [undefined,null,'','bad','other@invalid']) await check('L-4 missing/invalid bound email rejected: ' + String(value), async () => {
    const company = '[S2-TEST] Rejected '+stamp+' '+String(value);
    const response = await ba.api.rpc('create_supplier_room_invite',{p_project_id:project,p_supplier_organization_name:company,...(value===undefined?{}:{p_invited_email:value})});
    assert.equal(response.error?.code,'22023');
    const rows = await admin.from('organizations').select('id').eq('name',company); assert.ifError(rows.error); assert.equal(rows.data.length,0);
  });
  const token = crypto.randomBytes(32).toString('hex');
  const legacy = await admin.from('project_invites').insert({token_hash:crypto.createHash('sha256').update(token).digest('hex'),project_id:project,room_id:room,target_organization_id:supplierOrg,invited_role:'supplier',invited_email:null,created_by_user_id:ba.user.id,created_by_organization_id:buyerOrg,expires_at:new Date(Date.now()+3600000).toISOString()}).select('id').single(); assert.ifError(legacy.error);
  await check('L-4 legacy unbound preview denied, with recoverable join UI', async () => {
    const jc = await context(), page = await jc.newPage(); await page.goto(url+'/join?token='+token);
    await page.getByText(/Email-bound invitation required/).waitFor(); await page.getByRole('link',{name:'Go to project sign in'}).waitFor();
    await page.screenshot({path:path.join(output,'02-unbound-denial.png')}); await jc.close();
  });
  await check('L-4 legacy unbound claim denied to authenticated member', async () => {assert.equal((await colleague.api.rpc('claim_project_invite',{p_token:token})).error?.code,'42501');});
  await check('L-4 live public signup remains disabled', async () => {
    const response = await anon.auth.signUp({email:stamp+'-signup@s2-test.invalid',password:oldPassword}); assert.equal(response.error?.code,'signup_disabled');
  });
  await check('Preview invite requires email and never propagates protection bypass', async () => {
    await buyer.goto(url+'/project-room?_vercel_share=synthetic-review-value'); await buyer.getByRole('textbox',{name:'Room message',exact:true}).waitFor();
    await buyer.getByRole('button',{name:'Create',exact:true}).click(); await buyer.getByPlaceholder('Supplier company name').fill('[S2-TEST] Preview '+stamp);
    assert(await buyer.getByRole('button',{name:'Generate 7-day Invite Link'}).isDisabled());
    await buyer.getByPlaceholder('Invitee email (required)').fill(stamp+'-invite@s2-test.invalid');
    await buyer.getByRole('button',{name:'Generate 7-day Invite Link'}).click(); await buyer.getByRole('button',{name:'Copy Invite Link'}).waitFor();
    const text = await buyer.locator('div.font-mono').filter({hasText:'/join?token='}).innerText(); const inviteUrl = new URL(text);
    assert.equal(inviteUrl.origin,url); assert.deepEqual([...inviteUrl.searchParams.keys()],['token']);
    await buyer.getByRole('button',{name:'Close',exact:true}).click();
  });
  await check('Preview desired hosted signup-off and required environment contract explicit', async () => {
    const policy = fs.readFileSync(path.resolve(__dirname,'../../../supabase/hosted-auth-policy.toml'),'utf8'); assert(/\[auth\][\s\S]*?enable_signup = false/.test(policy)); assert(policy.includes('minimum_password_length = 10'));
    const doc = fs.readFileSync(path.resolve(__dirname,'../../../supabase/README-preview.md'),'utf8');
    for(const name of ['SR_ALLOWED_ORIGINS','SR_PUBLIC_SUPABASE_URL','SR_AUTH_REDIRECT_URL','SR_TRUSTED_PROXY_IPS']) assert(doc.includes(name));
    assert(!/https?:\/\//.test(doc));
  });
  await check('Preview Web build configuration excludes existing production backend without network', async () => {
    const ts = require('typescript'); const source = fs.readFileSync(path.resolve(__dirname,'../src/lib/supabase-config.ts'),'utf8');
    const script = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
    const env = {NEXT_PUBLIC_SUPABASE_URL:'https://qnozpurjtgkmwtvsrjoi.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'public-test-input'};
    assert.throws(()=>vm.runInNewContext(script,{exports:{},process:{env},URL}),/existing production backend/);
    vm.runInNewContext(script,{exports:{},process:{env:{...env,NEXT_PUBLIC_SUPABASE_URL:values.API_URL}},URL});
  });
  await check('Preview native builder excludes existing production backend before key read/build', async () => {
    const response = spawnSync('python',[path.resolve(__dirname,'../../android-native/build.py'),'--supabase-url','https://qnozpurjtgkmwtvsrjoi.supabase.co','--supabase-anon-key-file',path.join(root,'secrets/does-not-exist')],{encoding:'utf8'});
    assert.equal(response.status,2); assert(response.stderr.includes('existing production backend'));
  });
  await require('./s2-recovery-review.cjs')({ context, check, url, values, output, signedIn, anon, remoteRequests, pageErrors, email, oldPassword, stamp });
  await sc.close();
};
