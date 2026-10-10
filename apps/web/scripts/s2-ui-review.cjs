// Accepted U1 remediation, exercised against the local production build.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
module.exports = async function suite(d) {
  const { buyer, context, check, login, signedIn, fixtures, values, passwords, output, url, createClient, remoteRequests, pageErrors } = d;
  const shared = '52000000-0000-4000-8000-0000000000e2';
  const project = '52000000-0000-4000-8000-0000000000d1';
  const buyerOrg = '52000000-0000-4000-8000-0000000000b1';
  const supplierOrg = '52000000-0000-4000-8000-0000000000c1';
  const stamp = 's2-u1-' + Date.now();
  const admin = createClient(values.API_URL, values.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(values.API_URL, values.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const ba = await signedIn('s2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD);
  const sa = await signedIn('s2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  const extraRoom = crypto.randomUUID(), extraName = '[S2-TEST] Second partner ' + stamp;
  assert.ifError((await admin.from('rooms').insert({ id: extraRoom, project_id: project, owner_organization_id: buyerOrg, counterpart_organization_id: supplierOrg, name: extraName, kind: 'supplier_external' })).error);
  assert.ifError((await admin.from('room_members').insert([
    { room_id: extraRoom, user_id: ba.user.id, acting_organization_id: buyerOrg, room_role: 'member' },
    { room_id: extraRoom, user_id: sa.user.id, acting_organization_id: supplierOrg, room_role: 'member' },
  ])).error);
  await buyer.reload(); await buyer.getByRole('textbox', { name: 'Room message', exact: true }).waitFor();
  const tabs = page => page.getByRole('navigation', { name: 'Room selection', exact: true });
  async function select(page, name) { await tabs(page).getByRole('button', { name, exact: true }).click(); }
  await check('P1-01 buyer room tabs carry distinct full room names and selected state', async () => {
    const names = await tabs(buyer).getByRole('button').allTextContents();
    assert.equal(new Set(names).size, names.length); assert(names.some(n => n.includes(extraName)));
    await select(buyer, extraName); assert.equal(await tabs(buyer).getByRole('button', { name: extraName, exact: true }).getAttribute('aria-pressed'), 'true');
    await select(buyer, '[S2-TEST] Supplier Co - Shared');
  });
  const sc = await context(), supplier = await sc.newPage();
  await login(supplier, 's2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  await check('P1-01 supplier can switch between its shared rooms at 390px, with internal room absent', async () => {
    await supplier.setViewportSize({ width: 390, height: 844 });
    await select(supplier, extraName);
    assert.equal(await tabs(supplier).getByRole('button', { name: extraName, exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await tabs(supplier).getByRole('button', { name: '[S2-TEST] Buyer Internal', exact: true }).count(), 0);
    await select(supplier, '[S2-TEST] Supplier Co - Shared');
    await supplier.screenshot({ path: path.join(output, '01-supplier-tabs-390.png') });
  });
  const subject = '[S2-TEST] UI review inquiry ' + stamp;
  let inquiry, task;
  await check('P2-02 supplier form remains available and records organization, author, time and status', async () => {
    await supplier.locator('summary').filter({ hasText: 'Inquiries' }).click();
    await supplier.getByLabel('Inquiry subject', { exact: true }).fill(subject);
    await supplier.getByLabel('Inquiry details', { exact: true }).fill('[S2-TEST] Confirm lead time.');
    const response = supplier.waitForResponse(r => r.url().endsWith('/rpc/submit_project_inquiry'));
    await supplier.getByRole('button', { name: 'Submit inquiry', exact: true }).click();
    const saved = await response; assert.equal(saved.status(), 200); inquiry = await saved.json();
    assert.equal(inquiry.submitted_by_user_id, sa.user.id); assert(inquiry.submitter_organization_name); assert(inquiry.created_at);
    const card = supplier.getByRole('article').filter({ has: supplier.getByRole('heading', { name: subject, exact: true }) });
    await card.getByText('Awaiting buyer review', { exact: false }).waitFor();
    assert((await card.innerText()).includes(inquiry.submitter_organization_name)); assert((await card.innerText()).includes(sa.user.id.slice(0, 8)));
  });
  await check('P2-02 buyer sees a collection and review guidance rather than its own submission form', async () => {
    await buyer.locator('summary').filter({ hasText: 'Inquiries' }).click();
    await buyer.getByRole('heading', { name: subject, exact: true }).waitFor();
    assert.equal(await buyer.getByLabel('Inquiry subject', { exact: true }).count(), 0);
    await buyer.getByText(/Review partner inquiries in Needs You/).waitFor();
  });
  const draft = '[S2-TEST] preserve mobile draft ' + stamp;
  await check('P1-02 390px persistent Needs You / Specs navigation works and return keeps chat draft', async () => {
    await buyer.setViewportSize({ width: 390, height: 844 });
    await buyer.getByRole('textbox', { name: 'Room message', exact: true }).fill(draft);
    await buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: /Needs You/ }).click();
    await buyer.getByRole('heading', { name: 'Inquiry: ' + subject, exact: true }).waitFor();
    await buyer.getByText('Canonical State', { exact: true }).waitFor();
    await buyer.screenshot({ path: path.join(output, '02-needs-you-390.png') });
    await buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: 'Chat', exact: true }).click();
    assert.equal(await buyer.getByRole('textbox', { name: 'Room message', exact: true }).inputValue(), draft);
  });
  await check('P2-04 saved state availability never claims AI active with AI off', async () => {
    await buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: /Needs You/ }).click();
    const panel = buyer.getByRole('complementary', { name: 'Project context' });
    await panel.getByText('Saved project state: available', { exact: true }).waitFor();
    await panel.getByText('Unavailable', { exact: true }).waitFor();
    assert.equal(await panel.getByText('Active', { exact: true }).count(), 0);
    assert.equal(await panel.getByText(/Bangkok buyer/).count(), 0);
  });
  await check('P1-02 at 390px proposal source opens Chat, accept/dismiss persist and accepted specs are visible', async () => {
    const proposals = [];
    for (const action of ['accept', 'dismiss']) {
      const summary = '[S2-TEST] mobile specification ' + action + ' ' + stamp;
      const event = await ba.api.rpc('append_room_event', { p_room_id: extraRoom, p_actor_organization_id: buyerOrg, p_client_msg_id: crypto.randomUUID(), p_event_type: 'message.posted', p_payload: { text: summary } }); assert.ifError(event.error);
      const proposal = await admin.from('staging_proposals').insert({ room_id: extraRoom, source_event_id: event.data.id, proposal_type: 'requirement', provider: '[S2-TEST] UI fixture', payload: { summary, specifications: { quantity: '20 units' } } }).select('id').single(); assert.ifError(proposal.error);
      const task = await admin.from('needs_you').insert({ room_id: extraRoom, proposal_id: proposal.data.id, source_event_id: event.data.id, title: summary, target_organization_id: buyerOrg }).select('id').single(); assert.ifError(task.error);
      proposals.push({ action, summary, event: event.data, id: proposal.data.id, task: task.data.id });
    }
    const mobile = buyer.getByRole('navigation', { name: 'Mobile project views' });
    await mobile.getByRole('button', { name: 'Chat', exact: true }).click(); await select(buyer, extraName);
    await mobile.getByRole('button', { name: /Needs You/ }).click();
    await buyer.getByTestId('needs-you-' + proposals[0].task).getByRole('button', { name: 'Source ↗', exact: true }).click();
    assert.equal(await mobile.getByRole('button', { name: 'Chat', exact: true }).getAttribute('aria-pressed'), 'true');
    assert(await buyer.locator('#event-' + proposals[0].event.id).isVisible());
    await mobile.getByRole('button', { name: /Needs You/ }).click();
    for (const proposal of proposals) {
      const card = buyer.getByTestId('needs-you-' + proposal.task);
      await card.getByRole('button', { name: /^Review · 审核/ }).click();
      const response = buyer.waitForResponse(r => r.url().endsWith('/rpc/review_staging_proposal'));
      await card.getByRole('button', { name: proposal.action === 'accept' ? '✓ Accept · 采纳' : 'Dismiss · 忽略', exact: true }).click();
      assert.equal((await response).status(), 200); await card.waitFor({ state: 'detached' });
      assert.equal((await admin.from('staging_proposals').select('status').eq('id', proposal.id).single()).data.status, proposal.action === 'accept' ? 'accepted' : 'dismissed');
    }
    await buyer.locator('#room-context').getByText(proposals[0].summary, { exact: true }).waitFor();
    await buyer.locator('#room-context').getByText('20 units', { exact: true }).waitFor();
    await buyer.screenshot({ path: path.join(output, '07-mobile-accepted-specs.png') });
    await mobile.getByRole('button', { name: 'Chat', exact: true }).click(); await select(buyer, '[S2-TEST] Supplier Co - Shared');
    await mobile.getByRole('button', { name: /Needs You/ }).click();
  });
  task = (await admin.from('needs_you').select('*').eq('inquiry_id', inquiry.id).single()).data;
  assert(task);
  // All negative checks use a populated target. Every RPC denial must be 42501.
  for (const [label, api, id] of [['anonymous', anon, task.id], ['submitter supplier', sa.api, task.id], ['unknown task', ba.api, crypto.randomUUID()]]) {
    await check('P2-05 denial: ' + label + ' cannot acknowledge inquiry (42501)', async () => {
      assert.equal((await api.rpc('acknowledge_project_inquiry', { p_needs_you_id: id })).error?.code, '42501');
    });
  }
  async function actor(label, orgMembership, roomMembership, removedOrg = false, removedRoom = false) {
    const password = crypto.randomBytes(24).toString('hex'), email = `${stamp}-${label}@s2-test.invalid`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true }); assert.ifError(created.error);
    const id = created.data.user.id;
    if (orgMembership) assert.ifError((await admin.from('organization_memberships').insert({ organization_id: orgMembership, user_id: id, role: 'member', removed_at: removedOrg ? new Date().toISOString() : null })).error);
    if (roomMembership) assert.ifError((await admin.from('room_members').insert({ room_id: shared, user_id: id, acting_organization_id: roomMembership, room_role: 'member', removed_at: removedRoom ? new Date().toISOString() : null })).error);
    return (await signedIn(email, password)).api;
  }
  const actors = [
    ['nonmember', await actor('nonmember', null, null)],
    ['buyer org without room membership', await actor('org-only', buyerOrg, null)],
    ['wrong acting organization', await actor('wrong-binding', buyerOrg, supplierOrg)],
    ['removed buyer org member', await actor('removed-org', buyerOrg, buyerOrg, true)],
    ['removed buyer room member', await actor('removed-room', buyerOrg, buyerOrg, false, true)],
    ['room binding without org membership', await actor('room-only', null, buyerOrg)],
  ];
  for (const [label, api] of actors) await check('P2-05 denial: ' + label + ' (42501)', async () => {
    assert.equal((await api.rpc('acknowledge_project_inquiry', { p_needs_you_id: task.id })).error?.code, '42501');
  });
  const ordinary = crypto.randomUUID();
  assert.ifError((await admin.from('needs_you').insert({ id: ordinary, room_id: shared, title: '[S2-TEST] ordinary task ' + stamp, target_organization_id: buyerOrg })).error);
  await check('P2-05 denial: acknowledgement cannot resolve an ordinary proposal/task (42501)', async () => {
    assert.equal((await ba.api.rpc('acknowledge_project_inquiry', { p_needs_you_id: ordinary })).error?.code, '42501');
  });
  for (const [label, api] of [['buyer', ba.api], ['supplier', sa.api]]) await check('P2-05 denial: ' + label + ' cannot directly update inquiry or Needs You status', async () => {
    assert.equal((await api.from('project_inquiries').update({ acknowledged_at: new Date().toISOString() }).eq('id', inquiry.id)).error?.code, '42501');
    const update = await api.from('needs_you').update({ status: 'done' }).eq('id', task.id).select();
    if (!update.error) assert.deepEqual(update.data, []); else assert.equal(update.error.code, '42501');
    assert.equal((await admin.from('needs_you').select('status').eq('id', task.id).single()).data.status, 'open');
  });
  await check('P2-05 mobile acknowledgement persists, removes action, decrements count and retains inquiry', async () => {
    await buyer.getByText('[S2-TEST] ordinary task ' + stamp, { exact: true }).first().waitFor();
    const navButton = buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: /Needs You/ });
    const count = Number((await navButton.innerText()).match(/\((\d+)\)/)[1]);
    const card = buyer.getByRole('article').filter({ has: buyer.getByRole('heading', { name: 'Inquiry: ' + subject, exact: true }) });
    const response = buyer.waitForResponse(r => r.url().endsWith('/rpc/acknowledge_project_inquiry'));
    await card.getByRole('button', { name: 'Acknowledge inquiry', exact: true }).click(); assert.equal((await response).status(), 200);
    await card.waitFor({ state: 'detached' });
    assert.equal(Number((await navButton.innerText()).match(/\((\d+)\)/)[1]), count - 1);
    const row = (await admin.from('project_inquiries').select('*').eq('id', inquiry.id).single()).data; assert(row.acknowledged_at);
    await buyer.reload(); await buyer.getByRole('textbox', { name: 'Room message', exact: true }).waitFor(); await select(buyer, '[S2-TEST] Supplier Co - Shared');
    await buyer.locator('summary').filter({ hasText: 'Inquiries' }).click();
    await buyer.getByRole('article').filter({ has: buyer.getByRole('heading', { name: subject, exact: true }) }).getByText('Acknowledged', { exact: false }).waitFor();
    await supplier.reload(); await supplier.getByRole('textbox', { name: 'Room message', exact: true }).waitFor(); await select(supplier, '[S2-TEST] Supplier Co - Shared');
    await supplier.locator('summary').filter({ hasText: 'Inquiries' }).click();
    await supplier.getByRole('article').filter({ has: supplier.getByRole('heading', { name: subject, exact: true }) }).getByText('Acknowledged', { exact: false }).waitFor();
    const before = (await admin.from('needs_you').select('*').eq('id', task.id).single()).data;
    const retries = await Promise.all(Array.from({ length: 8 }, () => ba.api.rpc('acknowledge_project_inquiry', { p_needs_you_id: task.id })));
    for (const retry of retries) assert.ifError(retry.error);
    const after = (await admin.from('needs_you').select('*').eq('id', task.id).single()).data;
    assert.equal(before.resolved_at, after.resolved_at); assert.equal(before.resolved_by_user_id, after.resolved_by_user_id);
  });
  await check('P2-05 eight concurrent first acknowledgements commit one stable task/inquiry timestamp', async () => {
    const saved = await sa.api.rpc('submit_project_inquiry', { p_room_id: shared, p_client_request_id: crypto.randomUUID(), p_subject: '[S2-TEST] concurrent acknowledgement ' + stamp, p_detail: '[S2-TEST] retained for audit' }); assert.ifError(saved.error);
    const control = (await admin.from('needs_you').select('*').eq('inquiry_id', saved.data.id).single()).data; assert.equal(control.status, 'open');
    const calls = await Promise.all(Array.from({ length: 8 }, () => ba.api.rpc('acknowledge_project_inquiry', { p_needs_you_id: control.id })));
    for (const call of calls) { assert.ifError(call.error); assert.equal(call.data.ok, true); }
    const completed = (await admin.from('needs_you').select('*').eq('id', control.id).single()).data;
    const retained = (await admin.from('project_inquiries').select('*').eq('id', saved.data.id).single()).data;
    assert.equal(completed.status, 'done'); assert.equal(completed.resolved_by_user_id, ba.user.id); assert.equal(completed.resolved_at, retained.acknowledged_at);
    assert.ifError((await ba.api.rpc('acknowledge_project_inquiry', { p_needs_you_id: control.id })).error);
    assert.equal((await admin.from('needs_you').select('resolved_at').eq('id', control.id).single()).data.resolved_at, completed.resolved_at);
  });
  await check('P2-01 file badge explains size/hash/type checks and explicitly excludes malware/authenticity claims', async () => {
    await buyer.setViewportSize({ width: 1600, height: 1000 });
    const file = fixtures(stamp)[0]; await buyer.locator('input[type=file]').setInputFiles(file);
    const tile = buyer.getByRole('button').filter({ hasText: path.basename(file) }).last();
    await tile.getByText('Byte checks passed', { exact: true }).waitFor();
    await tile.getByText('Size, SHA256 and detected type checked. No malware scan or authenticity check.', { exact: true }).waitFor();
    assert.equal(await tile.getByText('Verified', { exact: true }).count(), 0);
    await buyer.screenshot({ path: path.join(output, '03-byte-checks-desktop.png') });
  });
  await check('P3-03 invite copy reports success and offers manual recovery on clipboard failure', async () => {
    await buyer.getByRole('button', { name: 'Create', exact: true }).click();
    await buyer.getByPlaceholder('Supplier company name').fill('[S2-TEST] Copy feedback ' + stamp);
    await buyer.getByPlaceholder('Invitee email (required)').fill(stamp + '-copy@s2-test.invalid');
    await buyer.getByRole('button', { name: 'Generate 7-day Invite Link' }).click();
    await buyer.getByRole('button', { name: 'Copy Invite Link', exact: true }).waitFor();
    await buyer.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } }));
    await buyer.getByRole('button', { name: 'Copy Invite Link', exact: true }).click();
    await buyer.getByRole('status').filter({ hasText: 'Invite link copied.' }).waitFor();
    await buyer.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('test clipboard unavailable'); } } }));
    await buyer.getByRole('button', { name: 'Copied', exact: true }).click();
    await buyer.getByRole('status').filter({ hasText: 'Unable to copy. Select the link and copy it manually.' }).waitFor();
    await buyer.getByRole('button', { name: 'Close', exact: true }).click();
  });
  await check('P3-02 390px composer has visible Attach/Send, described formats and no horizontal overflow', async () => {
    await buyer.setViewportSize({ width: 390, height: 844 });
    await buyer.getByRole('textbox', { name: 'Room message', exact: true }).fill('');
    const attach = buyer.getByRole('button', { name: 'Attach · 附件', exact: true });
    assert(await attach.isVisible()); assert.equal(await attach.getAttribute('aria-describedby'), 'attachment-formats');
    assert(await buyer.getByRole('button', { name: 'Send · 发送', exact: true }).isVisible());
    assert(await buyer.getByText('PDF / Excel / image · max 50 MB', { exact: true }).isVisible());
    assert(await buyer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await buyer.screenshot({ path: path.join(output, '04-chat-composer-390.png') });
  });
  const jc = await context(), join = await jc.newPage();
  async function contrast(locator, background) {
    return locator.evaluate((element, bg) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = getComputedStyle(element).color; ctx.fillRect(0, 0, 1, 1);
      const foreground = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
      const luminance = rgb => rgb.map(c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
      const a = luminance(foreground), b = luminance(bg); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    }, background);
  }
  for (const [label, suffix] of [['missing', ''], ['invalid', '?token=' + crypto.randomBytes(32).toString('hex')]]) {
    await check('P1-03 ' + label + ' join link offers sign-in and fresh-invite guidance', async () => {
      await join.goto(url + '/join' + suffix); await join.getByRole('alert').filter({ hasText: /\S/ }).waitFor();
      assert.equal(await join.getByRole('link', { name: 'Go to project sign in' }).getAttribute('href'), '/project-room');
      await join.getByText(/Ask the project buyer for a fresh invitation/).waitFor();
    });
  }
  const token = crypto.randomBytes(32).toString('hex'), expiredToken = crypto.randomBytes(32).toString('hex');
  for (const [raw, expires] of [[token, Date.now() + 3600000], [expiredToken, Date.now() - 3600000]]) {
    assert.ifError((await admin.from('project_invites').insert({ token_hash: crypto.createHash('sha256').update(raw).digest('hex'), project_id: project, room_id: shared, target_organization_id: supplierOrg, invited_role: 'supplier', invited_email: stamp + '@s2-test.invalid', created_by_user_id: ba.user.id, created_by_organization_id: buyerOrg, expires_at: new Date(expires).toISOString() })).error);
  }
  await check('P1-03 expired join link has a recoverable sign-in path and new-invite instruction', async () => {
    await join.goto(url + '/join?token=' + expiredToken); await join.getByRole('alert').filter({ hasText: /\S/ }).waitFor();
    await join.getByRole('link', { name: 'Go to project sign in' }).waitFor(); await join.getByText(/fresh invitation/).waitFor();
    await join.screenshot({ path: path.join(output, '05-join-expired.png') });
  });
  await check('P1-03 transient invitation failure can be retried to recover the actual valid form', async () => {
    let fail = true;
    await join.route('**/functions/v1/project-invite', route => {
      if (fail && route.request().postDataJSON()?.action === 'preview') { fail = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'Temporary test outage' }) }); }
      return route.continue();
    });
    await join.goto(url + '/join?token=' + token); await join.getByRole('alert').filter({ hasText: /\S/ }).waitFor();
    await join.getByRole('button', { name: 'Retry invitation check' }).click(); await join.getByLabel('Your name').waitFor();
    await join.getByText('Joining as: ' + inquiry.submitter_organization_name, { exact: true }).waitFor();
  });
  await check('P1-03 failed join submit preserves name/email/password and enables retry', async () => {
    await join.getByLabel('Your name').fill('[S2-TEST] retained join draft'); assert.equal(await join.getByLabel('Email', { exact: true }).inputValue(), stamp + '@s2-test.invalid'); assert(await join.getByLabel('Email', { exact: true }).isDisabled());
    const password = crypto.randomBytes(24).toString('hex'); await join.getByLabel('Password', { exact: true }).fill(password);
    await join.route('**/functions/v1/project-invite', route => route.request().postDataJSON()?.action === 'bootstrap' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"Temporary test outage"}' }) : route.continue());
    await join.getByRole('button', { name: 'Join Project Room' }).click(); await join.getByRole('alert').filter({ hasText: /\S/ }).waitFor();
    assert.equal(await join.getByLabel('Your name').inputValue(), '[S2-TEST] retained join draft'); assert.equal(await join.getByLabel('Password', { exact: true }).inputValue(), password);
    assert.equal(await join.getByLabel('Email', { exact: true }).inputValue(), stamp + '@s2-test.invalid'); assert(await join.getByRole('button', { name: 'Join Project Room' }).isEnabled());
    await join.screenshot({ path: path.join(output, '06-join-retry-draft.png') });
  });
  await check('P3-01 join disclaimer and project-state metadata meet 4.5:1 contrast on their surfaces', async () => {
    assert(await contrast(join.getByText(/This invitation grants access only/), [15, 23, 42]) >= 4.5);
    await buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: /Needs You/ }).click();
    assert(await contrast(buyer.locator('#room-context .font-mono.text-slate-600').first(), [255, 255, 255]) >= 4.5);
    await buyer.getByRole('navigation', { name: 'Mobile project views' }).getByRole('button', { name: 'Chat', exact: true }).click();
  });
  await check('P2-03 explicit Sign out confirmation cancel retains session/draft; accept returns to login', async () => {
    await buyer.getByRole('textbox', { name: 'Room message', exact: true }).fill(draft);
    const button = buyer.getByRole('button', { name: 'Sign out · 退出', exact: true });
    buyer.once('dialog', dialog => dialog.dismiss()); await button.click();
    assert.equal(await buyer.getByRole('textbox', { name: 'Room message', exact: true }).inputValue(), draft);
    buyer.once('dialog', dialog => dialog.accept()); await button.click(); await buyer.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  });
  await check('Local-only UI review has no outbound requests or browser page errors', async () => {
    assert.deepEqual(remoteRequests, []); assert.deepEqual(pageErrors, []);
  });
};
