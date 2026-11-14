/**
 * REAL-BACKEND acceptance for /project-room-b (not DEMO). Drives four synthetic accounts
 * in four browser contexts against a staging Supabase project.
 *   B_URL=http://localhost:3100 B_USERS=/path/users.json node scripts/project-room-b-real-e2e.cjs
 * users.json: [{key:"a1"|"a2"|"b1"|"b2", email, pw}] – kept outside the repo.
 */
const { chromium } = require('@playwright/test');
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const base = (process.env.B_URL || 'http://localhost:3100') + '/project-room-b';
const out = process.env.B_QA_OUTPUT || '/tmp/project-room-b-qa';
const users = Object.fromEntries(JSON.parse(fs.readFileSync(process.env.B_USERS, 'utf8')).map((u) => [u.key, u]));
const stamp = new Date().toISOString().slice(5, 16).replace(/[-:T]/g, '');
fs.mkdirSync(out, { recursive: true });
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', name, '—', String(e.message).split('\n')[0]); }
};
const notRun = (name, why) => { results.push({ name, ok: null, error: why }); console.log('NOT RUN', name, '—', why); };
const pdf = (label) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n% ${label} ${stamp}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const T = 30000;

(async () => {
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
  const browser = await chromium.launch({ channel: process.env.B_CHROME_CHANNEL || undefined, proxy });
  const P = {};
  for (const k of ['a1', 'a2', 'b1', 'b2']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    P[k] = await ctx.newPage();
    P[k].on('pageerror', (e) => console.log(`[${k}] pageerror`, e.message));
  }
  const signIn = async (k, url = base) => {
    const p = P[k];
    await p.goto(url);
    await p.getByLabel('邮箱').or(p.getByLabel('你的姓名')).or(p.getByText('STAGING · 真实后端')).first().waitFor({ timeout: T });
    if (!(await p.getByLabel('邮箱').count())) return; // already signed in (rerun)
    if (await p.getByRole('button', { name: '已有账号？登录' }).count()) await p.getByRole('button', { name: '已有账号？登录' }).click();
    await p.getByLabel('邮箱').fill(users[k].email);
    await p.getByLabel('密码').fill(users[k].pw);
    await p.getByRole('button', { name: '登录', exact: true }).click();
  };
  const room = (p, name) => p.getByTestId('room').filter({ hasText: name });
  const openRoom = async (p, name) => { await room(p, name).first().click(); await p.getByRole('region', { name: '聊天' }).getByText(name).first().waitFor({ timeout: T }); };
  const chat = (p) => p.getByRole('region', { name: '聊天' });
  const say = async (p, text) => { await p.getByLabel('输入消息').fill(text); await p.getByLabel('发送').click(); await chat(p).getByText(text).first().waitFor({ timeout: T }); };
  const sees = (p, text, timeout = T) => chat(p).getByText(text).first().waitFor({ timeout });
  const panel = async (p, tab) => {
    if (!(await p.getByRole('tab', { name: new RegExp(tab) }).count())) await p.getByLabel('打开项目面板').click();
    await p.getByRole('tab', { name: new RegExp(tab) }).click();
  };
  const invite = async (p, email, kind, orgName) => {
    await panel(p, '成员');
    await p.getByRole('button', { name: '邀请', exact: true }).click();
    if (kind === 'colleague') await p.getByRole('button', { name: /我方同事/ }).click();
    await p.getByLabel('对方邮箱').fill(email);
    if (orgName) await p.getByLabel('对方企业名称').fill(orgName);
    await p.getByRole('button', { name: '生成邀请链接' }).click();
    const link = (await p.getByTestId('invite-link').innerText({ timeout: T })).trim();
    await p.keyboard.press('Escape');
    return link;
  };
  const newProject = async (p, name) => {
    await p.getByLabel('新建', { exact: true }).click();
    await p.getByRole('menuitem', { name: '新建项目' }).click();
    await p.getByLabel('项目名称').fill(name);
    await p.getByRole('button', { name: '创建', exact: true }).click();
    await chat(p).getByText(name).first().waitFor({ timeout: T });
  };
  const subRoom = async (p, name, kind, people) => {
    await p.getByLabel('新建', { exact: true }).click();
    await p.getByRole('menuitem', { name: '新建子房间' }).click();
    await p.getByLabel('子房间名称').fill(name);
    if (kind === 'internal') await p.getByRole('button', { name: /^内部/ }).click();
    for (const n of people) await p.getByRole('dialog').getByRole('button', { name: n }).click();
    await p.getByRole('button', { name: '创建', exact: true }).click();
    await chat(p).getByText(name).first().waitFor({ timeout: T });
  };
  const proj = `QA Factory ${stamp}`, rev = `QA Reverse ${stamp}`, orgA = `QA Buyer ${stamp}`, orgB = `QA Supplier ${stamp}`;
  const { a1, a2, b1, b2 } = P;
  const v1 = pdf('rev A t=20'), v2 = pdf('rev B t=22'), v3 = pdf('rev C t=24');
  let evidence = null;

  await check('T1 A signs in and creates an organisation', async () => {
    await signIn('a1');
    await a1.getByLabel('组织名称').or(a1.getByText('STAGING · 真实后端')).first().waitFor({ timeout: T });
    if (await a1.getByLabel('组织名称').count()) { // first run on a clean database; reruns reuse the organisation
      await a1.getByLabel('组织名称').fill(orgA); await a1.getByLabel('你的姓名').fill('Alice');
      await a1.getByRole('button', { name: '创建', exact: true }).click();
    }
    await a1.getByText('STAGING · 真实后端').waitFor({ timeout: T });
  });
  await check('T1 A creates a project (main room appears)', () => newProject(a1, proj));
  let link;
  await check('T1 A invites company B by e-mail', async () => { link = await invite(a1, users.b1.email, 'org', orgB); if (!/invite=[0-9a-f]{64}/.test(link)) throw new Error('no token'); });
  await check('T1 a different e-mail cannot use the invitation', async () => {
    await signIn('b2', link);
    await b2.getByText(/invite_not_found/).waitFor({ timeout: T });
    await b2.evaluate(() => localStorage.removeItem('sr_b_invite'));
    await b2.getByRole('button', { name: /^(退出|稍后)/ }).click();
  });
  await check('T1 B accepts with its own new organisation and enters the room', async () => {
    await signIn('b1', link);
    await b1.getByText(proj).first().waitFor({ timeout: T });
    const own = b1.getByRole('button', { name: /^以 .* 加入$/ });
    if (await own.count()) await own.first().click(); else await b1.getByLabel('你的姓名').fill('Bob');
    await b1.getByRole('button', { name: '加入', exact: true }).click();
    await chat(b1).getByText(proj).first().waitFor({ timeout: T });
  });
  await check('T1 both sides exchange real messages', async () => {
    await say(b1, `hello from B ${stamp}`); await sees(a1, `hello from B ${stamp}`);
    await say(a1, `hello from A ${stamp}`); await sees(b1, `hello from A ${stamp}`);
  });
  await check('T1 history survives reload and a fresh sign-in', async () => {
    await a1.reload(); await openRoom(a1, proj); await sees(a1, `hello from B ${stamp}`); await sees(a1, `hello from A ${stamp}`);
    await b1.context().clearCookies(); await b1.evaluate(() => localStorage.clear());
    await signIn('b1'); await openRoom(b1, proj); await sees(b1, `hello from A ${stamp}`);
  });
  await check('T1 reverse: B creates a project, invites A, A joins with its existing organisation', async () => {
    await newProject(b1, rev);
    const l2 = await invite(b1, users.a1.email, 'org', '');
    await a1.goto(l2);
    await a1.getByRole('button', { name: /^以 .* 加入$/ }).first().click({ timeout: T });
    await a1.getByRole('button', { name: '加入', exact: true }).click();
    await chat(a1).getByText(rev).first().waitFor({ timeout: T });
    await say(a1, `A in B's project ${stamp}`); await sees(b1, `A in B's project ${stamp}`);
  });
  await check('colleagues join their own organisations by invitation', async () => {
    await openRoom(a1, proj); const la = await invite(a1, users.a2.email, 'colleague');
    await signIn('a2', la); await a2.getByLabel('你的姓名').fill('Amy'); await a2.getByRole('button', { name: '加入', exact: true }).click(); await chat(a2).getByText(proj).first().waitFor({ timeout: T });
    await openRoom(b1, proj); const lb = await invite(b1, users.b2.email, 'colleague');
    await signIn('b2', lb); await b2.getByLabel('你的姓名').fill('Ben'); await b2.getByRole('button', { name: '加入', exact: true }).click(); await chat(b2).getByText(proj).first().waitFor({ timeout: T });
  });

  notRun('T2 AI proposes the split', 'no AI provider key is configured on staging; sub rooms were created manually');
  await check('T2 A creates a cross-company sub room with chosen members only', async () => {
    await a1.reload(); await openRoom(a1, proj);
    await subRoom(a1, `Logistics ${stamp}`, 'external', ['Bob']);
    await say(a1, `vessel booked ${stamp}`);
  });
  await check('T2 invited member talks in the sub room; uninvited colleague cannot see it', async () => {
    await b1.reload(); await openRoom(b1, `Logistics ${stamp}`); await sees(b1, `vessel booked ${stamp}`);
    await say(b1, `ETA 28 Nov ${stamp}`); await sees(a1, `ETA 28 Nov ${stamp}`);
    await b2.reload(); await room(b2, proj).first().waitFor({ timeout: T });
    if (await room(b2, `Logistics ${stamp}`).count()) throw new Error('B2 sees the sub room');
  });
  await check('T2/T5 sub room messages do not leak into the main room', async () => {
    await openRoom(b2, proj); await sees(b2, `hello from A ${stamp}`);
    if (await chat(b2).getByText(`vessel booked ${stamp}`).count()) throw new Error('leak');
  });
  await check('T2 a summary is sent back to the main room on purpose', async () => {
    await panel(a1, '成员');
    await a1.getByLabel('发回主房间的内容').fill(`Logistics summary ${stamp}: vessel booked, ETA 28 Nov`);
    await a1.getByRole('button', { name: '发送到主房间' }).click();
    await sees(b2, `Logistics summary ${stamp}`, 40000);
  });
  await check('T5 internal sub room is invisible to the other organisation', async () => {
    await a1.keyboard.press('Escape'); await openRoom(a1, proj);
    await subRoom(a1, `A internal ${stamp}`, 'internal', ['Amy']);
    await say(a1, `floor price 14.2 ${stamp}`);
    await a2.reload(); await openRoom(a2, `A internal ${stamp}`); await sees(a2, `floor price 14.2 ${stamp}`);
    await b1.reload(); await room(b1, proj).first().waitFor({ timeout: T });
    if (await room(b1, `A internal ${stamp}`).count()) throw new Error('B sees A internal room');
  });

  const fileTab = async (p) => { await openRoom(p, proj); await panel(p, '文件与确认'); };
  const cards = (p) => p.getByTestId('file-version');
  const newVersion = async (p, name, buffer) => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: T }), p.getByRole('button', { name: '上传新版本' }).first().click()]);
    await fc.setFiles({ name, mimeType: 'application/pdf', buffer });
  };
  await check('T3 B uploads v1 then v2 of the same file', async () => {
    await openRoom(b1, proj);
    await b1.getByTestId('file-input').setInputFiles({ name: 'ep600.pdf', mimeType: 'application/pdf', buffer: v1 });
    await b1.getByLabel('发送').click();
    await fileTab(b1); await cards(b1).first().waitFor({ timeout: 60000 });
    await newVersion(b1, 'ep600-revB.pdf', v2);
    await b1.waitForFunction(() => document.querySelectorAll('[data-testid="file-version"]').length === 2, null, { timeout: 60000 });
    const top = await cards(b1).first().innerText();
    if (!top.includes('v2') || !top.includes(sha(v2).slice(0, 16))) throw new Error('v2 hash not shown: ' + top.slice(0, 80));
  });
  await check('T3 organisation A confirms v2; B is still unconfirmed', async () => {
    await a1.reload(); await fileTab(a1);
    const c = cards(a1).first(); await c.getByRole('button', { name: '确认此版本' }).click();
    await c.getByText(/已确认/).first().waitFor({ timeout: T });
    const chips = await c.locator('[data-d]').evaluateAll((n) => n.map((x) => x.getAttribute('data-d')));
    if (chips.filter((x) => x === 'confirmed').length !== 1) throw new Error('expected exactly one confirmation, got ' + JSON.stringify(chips));
  });
  await check('T3 organisation B confirms v2 independently', async () => {
    await b1.reload(); await fileTab(b1);
    const c = cards(b1).first(); await c.getByRole('button', { name: '确认此版本' }).click();
    await b1.waitForFunction(() => document.querySelectorAll('[data-testid="file-version"]')[0].querySelectorAll('[data-d="confirmed"]').length === 2, null, { timeout: T });
  });
  await check('T3 v3 starts unconfirmed; v2 keeps both confirmations', async () => {
    await newVersion(b1, 'ep600-revC.pdf', v3);
    await b1.waitForFunction(() => document.querySelectorAll('[data-testid="file-version"]').length === 3, null, { timeout: 60000 });
    const n = await b1.evaluate(() => Array.from(document.querySelectorAll('[data-testid="file-version"]')).map((c) => c.querySelectorAll('[data-d="confirmed"]').length));
    if (n[0] !== 0 || n[1] !== 2) throw new Error('confirmations per version (v3,v2,v1) = ' + JSON.stringify(n));
  });
  notRun('T3 side-by-side version diff and original download', 'file gateway (verify/sign) is not deployed to staging yet');

  await check('T4 evidence export matches messages, hashes, organisations and people', async () => {
    await a1.reload(); await openRoom(a1, proj); await panel(a1, '成员');
    const [dl] = await Promise.all([a1.waitForEvent('download', { timeout: T }), a1.getByRole('button', { name: /导出证据/ }).click()]);
    const file = path.join(out, 'evidence.json'); await dl.saveAs(file);
    evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cf = evidence.confirmations, f = evidence.files, ev = evidence.events;
    if (cf.length !== 2) throw new Error('confirmations ' + cf.length);
    if (!cf.every((c) => c.file_sha256 === sha(v2) && c.decision === 'confirmed')) throw new Error('confirmation hash mismatch');
    if (new Set(cf.map((c) => c.organization_name)).size !== 2) throw new Error('organisations');
    if (f.length !== 3 || f.map((x) => x.sha256).join() !== [sha(v1), sha(v2), sha(v3)].join()) throw new Error('file hashes ' + f.map((x) => x.version_no + ':' + String(x.sha256).slice(0, 8)));
    if (!cf.every((c) => f.some((x) => x.id === c.file_version_id && x.version_no === 2))) throw new Error('confirmation not bound to v2');
    if (!ev.some((e) => e.payload && e.payload.text === `hello from B ${stamp}`)) throw new Error('raw message missing');
    if (!cf.every((c) => ev.some((e) => e.id === c.source_event_id && e.actor_user_id === c.user_id))) throw new Error('confirmation events inconsistent');
  });

  const rest = (p, q) => p.evaluate(async ([q, key, url]) => {
    const tok = JSON.parse(localStorage.getItem('sr_p1_supabase_auth')).access_token;
    const r = await fetch(`${url}/${q}`, { headers: { Authorization: `Bearer ${tok}`, apikey: key } });
    return { status: r.status, body: await r.text() };
  }, [q, process.env.B_ANON_KEY, process.env.B_SUPABASE_URL]);
  await check('T5 removed room member loses the room', async () => {
    await openRoom(a1, `Logistics ${stamp}`); await panel(a1, '成员');
    await a1.getByRole('button', { name: '移出', exact: true }).first().click();
    await a1.waitForTimeout(1500); await b1.reload(); await room(b1, proj).first().waitFor({ timeout: T });
    if (await room(b1, `Logistics ${stamp}`).count()) throw new Error('still visible');
  });
  await check('T5 member removed from the organisation loses every room, file row and file object', async () => {
    const objectPath = evidence.files[0].object_path;
    const before = await rest(b2, 'rest/v1/room_file_versions?select=id');
    if (JSON.parse(before.body).length < 3) throw new Error('precondition: B2 should see at least 3 versions, got ' + before.body.slice(0, 80));
    await openRoom(b1, proj); await panel(b1, '成员');
    await b1.getByRole('button', { name: '移出组织' }).first().click();
    await b1.waitForTimeout(1500);
    const rows = await rest(b2, 'rest/v1/room_file_versions?select=id');
    const evs = await rest(b2, 'rest/v1/room_events?select=id&limit=5');
    const obj = await rest(b2, `storage/v1/object/authenticated/room-files/${objectPath}`);
    if (rows.body !== '[]' || evs.body !== '[]') throw new Error('rows still readable ' + rows.body.slice(0, 60));
    if (obj.status < 400) throw new Error('object still downloadable ' + obj.status);
    await b2.reload(); await b2.getByText(/创建你的组织|还没有项目/).first().waitFor({ timeout: T });
  });
  notRun('T5 AI cannot read rooms the user cannot access', 'AI not configured on staging; the analyze API resolves events under the caller RLS (code path unchanged from A)');

  await check('T6 history paging on real data (70 extra messages)', async () => {
    await openRoom(a1, rev);
    for (let i = 1; i <= 70; i++) { await a1.getByLabel('输入消息').fill(`page ${i} ${stamp}`); await a1.getByLabel('发送').click(); }
    await sees(a1, `page 70 ${stamp}`);
    await a1.reload(); await openRoom(a1, rev); await sees(a1, `page 70 ${stamp}`);
    const first = chat(a1).getByText(`page 1 ${stamp}`, { exact: true });
    for (let i = 0; i < 25 && !(await first.count()); i++) {
      await chat(a1).locator('[data-virtuoso-scroller]').evaluate((el) => { el.scrollTop = 0; });
      await a1.waitForTimeout(700);
    }
    await first.waitFor({ timeout: T });
    const n = JSON.parse((await rest(a1, 'rest/v1/room_events?select=seq&order=seq.desc&limit=1&event_type=eq.message.posted')).body)[0].seq;
    if (n < 70) throw new Error('expected more than one page of real history, last seq ' + n);
  });
  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]]) {
    await check(`T6 ${w}px: no horizontal overflow, composer usable, panel opens`, async () => {
      await a1.setViewportSize({ width: w, height: h }); await a1.goto(base); await room(a1, proj).first().waitFor({ timeout: T });
      if (w < 700) { await a1.screenshot({ path: path.join(out, `b-real-${w}-list.png`) }); }
      await openRoom(a1, proj);
      await say(a1, `at ${w}px ${stamp}`);
      const over = await a1.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 0) throw new Error('overflow ' + over);
      await a1.screenshot({ path: path.join(out, `b-real-${w}-chat.png`) });
      await a1.getByLabel('打开项目面板').click();
      if (w < 700) await a1.getByTestId('bottom-sheet').waitFor({ timeout: T }); else if (w < 1100) await a1.getByTestId('drawer').waitFor({ timeout: T });
      await a1.getByRole('tab', { name: /文件与确认/ }).click(); await cards(a1).first().waitFor({ timeout: T });
      await a1.screenshot({ path: path.join(out, `b-real-${w}-files.png`) });
      await a1.keyboard.press('Escape');
      if (w < 700) {
        await a1.setViewportSize({ width: w, height: 480 }); // soft keyboard stand-in
        const box = await a1.getByLabel('输入消息').boundingBox();
        if (!box || box.y + box.height > 480) throw new Error('composer hidden when the viewport shrinks');
        await a1.setViewportSize({ width: w, height: h });
        await a1.getByLabel('返回聊天列表').click(); await room(a1, proj).first().waitFor({ state: 'visible', timeout: T });
      }
    });
  }
  notRun('T6 soft keyboard on a physical phone', 'only simulated by shrinking the viewport');

  const summary = { kind: 'REAL BACKEND (staging Supabase), not DEMO', base, stamp, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => r.ok === false).length, notRun: results.filter((r) => r.ok === null).length, results };
  fs.writeFileSync(path.join(out, 'real-acceptance.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed} passed, ${summary.failed} failed, ${summary.notRun} not run`);
  await browser.close();
  process.exit(summary.failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
