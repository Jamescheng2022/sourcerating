// Real local production browser acceptance. Credentials stay outside the repo.
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '../../../..');
const { chromium } = require(process.env.S2_PLAYWRIGHT_MODULE || path.join(ROOT, 'tools/node_modules/playwright'));
const { createClient } = require('@supabase/supabase-js');
const mode = process.argv[2] || 'e2e';
const output = path.join(ROOT, 'carryover', mode === 'inquiries' ? 'B6-artifacts' : 'B5-artifacts');
fs.mkdirSync(output, { recursive: true });
const url = 'http://127.0.0.1:3000';
const values = JSON.parse(execFileSync(path.join(ROOT, 'tools/node_modules/@supabase/cli-windows-x64/bin/supabase.exe'), ['status', '-o', 'json'], { cwd: path.join(ROOT, 'repo'), stdio: ['ignore', 'pipe', 'ignore'] }));
assert.equal(values.API_URL, 'http://127.0.0.1:54321');
const passwords = JSON.parse(fs.readFileSync(path.join(ROOT, 'secrets/s2-local-passwords.json'), 'utf8'));
const results = [];
const remoteRequests = [];
const pageErrors = [];
let server, browser;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function check(label, fn) { await fn(); results.push({ label, pass: true }); console.log('PASS ' + label); }
async function startServer() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/API_KEY|SERVICE_ROLE|SECRET|PASSWORD|S2_ALLOW_REMOTE/i.test(key)) delete env[key];
  env.NEXT_PUBLIC_SUPABASE_URL = values.API_URL;
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY = values.ANON_KEY;
  env.NEXT_TELEMETRY_DISABLED = '1';
  const log = fs.openSync(path.join(output, 'server.log'), 'a');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3000'], { cwd: path.resolve(__dirname, '..'), env, windowsHide: true, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error('Production server exited: ' + server.exitCode);
    try { if ((await fetch(url + '/project-room')).ok) return; } catch {}
    await delay(250);
  }
  throw new Error('Production server did not become ready');
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise(resolve => { child.once('exit', resolve); child.kill(); });
  server = null;
}
async function context() {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  ctx.on('page', page => page.on('pageerror', error => pageErrors.push(error.message)));
  await ctx.route('**/*', route => {
    const target = new URL(route.request().url());
    if (['data:', 'about:'].includes(target.protocol) || (target.protocol === 'blob:' && target.origin === url)) return route.continue();
    // Chromium's built-in PDF viewer loads chrome: and chrome-extension: resources.
    // These are browser-internal schemes, not outbound network requests.
    if (['chrome:', 'chrome-extension:'].includes(target.protocol)) return route.continue();
    if (!['127.0.0.1', 'localhost'].includes(target.hostname)) {
      remoteRequests.push(target.protocol + ' ' + target.origin); return route.abort();
    }
    return route.continue();
  });
  return ctx;
}
async function login(page, email, password) {
  await page.goto(url + '/project-room');
  await page.getByLabel('Email', { exact: true }).fill(email, { timeout: 8000 });
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.locator('textarea').waitFor();
}
async function signedIn(email, password) {
  const api = createClient(values.API_URL, values.ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await api.auth.signInWithPassword({ email, password });
  assert.ifError(error); return { api, token: data.session.access_token, user: data.user };
}
async function chooseRoom(page, name) {
  await page.getByRole('button').filter({ hasText: name }).first().click();
  await page.locator('textarea').waitFor();
}
async function send(page, text) {
  await page.locator('textarea').fill(text);
  const persisted = page.waitForResponse(r => r.url().endsWith('/rpc/append_room_event') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send · 发送', exact: true }).click();
  const response = await persisted; assert.equal(response.status(), 200);
  const event = await response.json(); assert.equal(event.payload.text, text);
  return event;
}
async function shown(page, text) { await page.getByText(text, { exact: true }).waitFor({ timeout: 12000 }); }
function fixtures(stamp) {
  const dir = path.join(output, 'fixtures'); fs.mkdirSync(dir, { recursive: true });
  // Standard-library OOXML workbook; real PNG and a one-page PDF. No extra runtime dependency.
  execFileSync('python', ['-c', `import pathlib,zipfile,sys,base64
p=pathlib.Path(sys.argv[1]);s=sys.argv[2]
parts={'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>', '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', 'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S2-TEST" sheetId="1" r:id="rId1"/></sheets></workbook>', 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>', 'xl/worksheets/sheet1.xml':'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>[S2-TEST] quantities</t></is></c></row></sheetData></worksheet>'}
with zipfile.ZipFile(p/(s+'.xlsx'),'w',zipfile.ZIP_DEFLATED) as z:
 for name,content in parts.items():z.writestr(name,content)
(p/(s+'.png')).write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII='))
objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>',b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << >> >>',b'<< /Length 0 >>\\nstream\\n\\nendstream']
pdf=b'%PDF-1.4\\n';offsets=[0]
for i,obj in enumerate(objects,1):
 offsets.append(len(pdf));pdf+=str(i).encode()+b' 0 obj\\n'+obj+b'\\nendobj\\n'
xref=len(pdf);pdf+=b'xref\\n0 5\\n0000000000 65535 f \\n'+b''.join(('%010d 00000 n \\n'%n).encode() for n in offsets[1:])+b'trailer\\n<< /Size 5 /Root 1 0 R >>\\nstartxref\\n'+str(xref).encode()+b'\\n%%EOF\\n'
(p/(s+'.pdf')).write_bytes(pdf)
`, dir, stamp]);
  return ['pdf', 'xlsx', 'png'].map(ext => path.join(dir, stamp + '.' + ext));
}
async function main() {
  await startServer();
  browser = await chromium.launch({ executablePath: process.env.S2_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const buyerContext = await context();
  const buyer = await buyerContext.newPage();
  if (mode === 'baseline') {
    await buyer.goto(url + '/project-room');
    await buyer.getByRole('button', { name: /Enter as Buyer/ }).click();
    await buyer.getByText(/Demo auth error/).waitFor();
    await buyer.screenshot({ path: path.join(output, '00-baseline-login-blocker.png') });
    console.log('CONFIRMED: production UI calls removed p1-demo-auth; no email/password sign-in path.');
    return;
  }
  await check('Buyer signs in with seeded email/password through UI', () => login(buyer, 's2-buyer@s2-test.invalid', passwords.S2_BUYER_PASSWORD));
  const stamp = 's2-web-' + Date.now();
  await check('Buyer sees the seeded internal and shared rooms', async () => {
    await buyer.getByRole('button').filter({ hasText: '[S2-TEST] Buyer Internal' }).first().waitFor();
    await buyer.getByRole('button').filter({ hasText: '[S2-TEST] Supplier Co - Shared' }).first().waitFor();
  });
  const supplierContext = await context(); const supplier = await supplierContext.newPage();
  await check('Seeded supplier signs in and RLS hides buyer internal room', async () => {
    await login(supplier, 's2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
    await supplier.getByRole('button').filter({ hasText: '[S2-TEST] Supplier Co - Shared' }).first().waitFor();
    assert.equal(await supplier.getByRole('button').filter({ hasText: '[S2-TEST] Buyer Internal' }).count(), 0);
  });
  const company = '[S2-TEST] Internal Logistics ' + stamp;
  const inviteeEmail = stamp + '@s2-test.invalid';
  const inviteePassword = crypto.randomBytes(24).toString('hex');
  let inviteRoom, inviteUrl;
  await check('Buyer generates a bound supplier invitation through UI', async () => {
    await buyer.getByRole('button', { name: 'Create', exact: true }).click();
    await buyer.getByPlaceholder('Supplier company name').fill(company);
    await buyer.getByPlaceholder('Invitee email (optional)').fill(inviteeEmail);
    const response = buyer.waitForResponse(r => r.url().endsWith('/rpc/create_supplier_room_invite'));
    await buyer.getByRole('button', { name: 'Generate 7-day Invite Link' }).click();
    const created = await (await response).json(); assert(created.token && created.room_id); inviteRoom = created.room_id;
    await buyer.getByRole('button', { name: 'Copy Invite Link' }).waitFor();
    inviteUrl = url + '/join?token=' + encodeURIComponent(created.token);
    await buyer.getByRole('button', { name: 'Close', exact: true }).click();
  });
  const invitedContext = await context(); const invited = await invitedContext.newPage();
  await check('Invitee previews and joins the exact supplier room through UI', async () => {
    await invited.goto(inviteUrl);
    await invited.getByLabel('Your name').fill('[S2-TEST] Invited Supplier');
    await invited.getByLabel('Password', { exact: true }).fill(inviteePassword);
    await invited.getByRole('button', { name: 'Join Project Room' }).click();
    await invited.waitForURL(url + '/project-room');
    await invited.getByRole('button').filter({ hasText: company }).first().waitFor();
    assert.equal(await invited.getByRole('button').filter({ hasText: '[S2-TEST] Buyer Internal' }).count(), 0);
    assert.equal(await invited.getByRole('button').filter({ hasText: '[S2-TEST] Supplier Co - Shared' }).count(), 0);
    assert.equal(await invited.locator('aside').first().getByText('supplier', { exact: true }).count(), 1);
  });
  const roomName = company + ' - Shared';
  await chooseRoom(buyer, roomName);
  let buyerEvent, supplierEvent;
  const buyerText = '[S2-TEST] Buyer Web message ' + stamp;
  const supplierText = '[S2-TEST] Supplier Web reply ' + stamp;
  await check('Buyer sends; supplier sees the persisted message without refresh', async () => {
    buyerEvent = await send(buyer, buyerText); await shown(invited, buyerText);
  });
  await check('Supplier sends; buyer sees the persisted reply without refresh', async () => {
    supplierEvent = await send(invited, supplierText); await shown(buyer, supplierText);
  });
  await check('Both message IDs persist after browser refresh', async () => {
    await buyer.reload(); await chooseRoom(buyer, roomName); await invited.reload();
    await shown(buyer, supplierText); await shown(invited, buyerText);
    assert.equal(await buyer.locator('#event-' + supplierEvent.id).count(), 1);
    assert.equal(await invited.locator('#event-' + buyerEvent.id).count(), 1);
  });
  const invitedActor = await signedIn(inviteeEmail, inviteePassword);
  const outsider = await signedIn('s2-supplier@s2-test.invalid', passwords.S2_SUPPLIER_PASSWORD);
  const files = fixtures(stamp); const registered = [];
  for (const [index, file] of files.entries()) {
    await check(['PDF', 'XLSX', 'PNG'][index] + ' uploads and verifies through UI', async () => {
      const registration = invited.waitForResponse(r => r.url().endsWith('/rpc/register_room_file_version'));
      await invited.locator('input[type=file]').setInputFiles(file);
      const record = await (await registration).json(); assert(record.file?.id); registered.push(record.file);
      const tile = invited.getByRole('button').filter({ hasText: path.basename(file) }).last();
      await tile.getByText('Verified', { exact: true }).waitFor(); assert(await tile.isEnabled());
      await buyer.getByRole('button').filter({ hasText: path.basename(file) }).last().getByText('Verified', { exact: true }).waitFor();
    });
    await check(['PDF', 'XLSX', 'PNG'][index] + ' buyer UI download has identical SHA256', async () => {
      const signing = buyer.waitForResponse(r => r.url().includes('/functions/v1/room-file-gateway') && r.request().postDataJSON()?.action === 'sign');
      const storageRequest = buyerContext.waitForEvent('request', { predicate: req => req.url().includes('/storage/v1/object/sign/'), timeout: 12000 });
      await buyer.getByRole('button').filter({ hasText: path.basename(file) }).last().click();
      const result = await (await signing).json(); assert.equal(result.ok, true);
      assert.equal(new URL(result.signedUrl).origin, values.API_URL);
      await storageRequest;
      const downloaded = await buyerContext.request.get(result.signedUrl); assert.equal(downloaded.status(), 200);
      assert.equal(crypto.createHash('sha256').update(await downloaded.body()).digest('hex'), crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    });
    await check(['PDF', 'XLSX', 'PNG'][index] + ' non-member denied metadata, sign and direct object download', async () => {
      const record = registered[index];
      const metadata = await outsider.api.from('room_file_versions').select('*').eq('id', record.id); assert.ifError(metadata.error); assert.equal(metadata.data.length, 0);
      const denial = await fetch(values.API_URL + '/functions/v1/room-file-gateway', { method: 'POST', headers: { apikey: values.ANON_KEY, Authorization: 'Bearer ' + outsider.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sign', fileVersionId: record.id }) });
      assert.equal(denial.status, 404);
      const object = await fetch(values.API_URL + '/storage/v1/object/authenticated/room-files/' + record.object_path, { headers: { apikey: values.ANON_KEY, Authorization: 'Bearer ' + outsider.token } });
      assert.equal(object.status, 400); assert.equal((await object.json()).statusCode, '404');
    });
  }
  await check('PDF reupload creates v2 and marks v1 superseded', async () => {
    const registration = invited.waitForResponse(r => r.url().endsWith('/rpc/register_room_file_version'));
    await invited.locator('input[type=file]').setInputFiles(files[0]);
    const record = await (await registration).json(); assert.equal(record.file.version_no, 2); assert.equal(record.file.supersedes_version_id, registered[0].id);
    const tiles = invited.getByRole('button').filter({ hasText: path.basename(files[0]) });
    await tiles.last().getByText('Verified', { exact: true }).waitFor();
    await tiles.first().getByText('Superseded', { exact: true }).waitFor();
  });
  await invited.screenshot({ path: path.join(output, '01-supplier-messages-files.png') });
  await buyer.screenshot({ path: path.join(output, '02-buyer-rooms-files.png') });
  await check('Offline failed draft stays retryable; reconnect catches missed messages', async () => {
    await invitedContext.setOffline(true);
    const offlineText = '[S2-TEST] Offline retry ' + stamp;
    await invited.locator('textarea').fill(offlineText); await invited.getByRole('button', { name: 'Send · 发送', exact: true }).click();
    await invited.getByRole('button', { name: 'Retry · 重试', exact: true }).waitFor();
    await send(buyer, '[S2-TEST] While supplier offline ' + stamp);
    await invitedContext.setOffline(false);
    await shown(invited, '[S2-TEST] While supplier offline ' + stamp);
    await invited.getByRole('button', { name: 'Retry · 重试', exact: true }).click();
    await shown(buyer, offlineText); await shown(invited, '[S2-TEST] While supplier offline ' + stamp);
    const persisted = await invitedActor.api.from('room_events').select('id').eq('room_id', inviteRoom).contains('payload', { text: offlineText });
    assert.ifError(persisted.error); assert.equal(persisted.data.length, 1);
  });
  await check('Production web server restart preserves auth, messages, files and versions', async () => {
    await stopServer(); await startServer(); await buyer.reload(); await chooseRoom(buyer, roomName); await invited.reload();
    await shown(buyer, supplierText); await shown(invited, buyerText);
    const tiles = invited.getByRole('button').filter({ hasText: path.basename(files[0]) });
    await tiles.last().getByText('Verified', { exact: true }).waitFor(); await tiles.first().getByText('Superseded', { exact: true }).waitFor();
    await invited.screenshot({ path: path.join(output, '03-after-reconnect-restart.png') });
  });
  await check('AI keys are absent; rule analysis works and no browser requests leave localhost', async () => {
    const response = await fetch(url + '/api/project-room/analyze', { method: 'POST', headers: { Authorization: 'Bearer ' + invitedActor.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId: inviteRoom, latestMessage: '[S2-TEST] Confirm 20 units' }) });
    assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.ok, true);
    assert.equal(data.aiStatus.jevConfigured, false); assert.equal(data.aiStatus.openCodeGoConfigured, false); assert.equal(data.aiStatus.deepSeekConfigured, false); assert.equal(data.deepProvider, null);
    assert.equal(remoteRequests.length, 0);
    assert.deepEqual(pageErrors, []);
  });
}
main().catch(error => {
  results.push({ label: error.message, pass: false });
  console.error(error.message); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  await stopServer();
  fs.writeFileSync(path.join(output, mode + '-report.json'), JSON.stringify({ mode, results, remoteRequests, pageErrors }, null, 2));
  console.log(JSON.stringify({ checks: results.length, passed: results.filter(x => x.pass).length, remoteRequests: remoteRequests.length }));
});
