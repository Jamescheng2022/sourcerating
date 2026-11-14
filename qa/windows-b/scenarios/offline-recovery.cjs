/**
 * Approved entrypoint: network loss and recovery during a two-party chat (REAL backend).
 * Needs the project "QA Factory <stamp>" that baseline_real_e2e created in the same run
 * (stamp passed in B_BASELINE_STAMP). Uses the same four synthetic accounts.
 */
const { chromium } = require(require.resolve('@playwright/test', { paths: [require('path').resolve(__dirname, '../../../apps/web')] }));
const fs = require('fs'), path = require('path');
const base = (process.env.B_URL || 'http://localhost:3100') + '/project-room-b';
const out = process.env.B_QA_OUTPUT || '/tmp/project-room-b-qa';
const stamp = process.env.B_BASELINE_STAMP;
const users = Object.fromEntries(JSON.parse(fs.readFileSync(process.env.B_USERS, 'utf8')).map((u) => [u.key, u]));
fs.mkdirSync(out, { recursive: true });
const results = []; const T = 30000;
const check = async (name, fn) => {
  try { await fn(); results.push({ name, ok: true }); console.log('PASS', name); }
  catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', name, '—', String(e.message).split('\n')[0]); }
};
(async () => {
  if (!stamp) { console.log('FAIL O0 precondition — B_BASELINE_STAMP missing (baseline suite must run first)'); process.exit(1); }
  const proj = `QA Factory ${stamp}`;
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
  const browser = await chromium.launch({ channel: process.env.B_CHROME_CHANNEL || undefined, proxy });
  const C = {}, P = {};
  for (const k of ['a1', 'b1']) { C[k] = await browser.newContext({ viewport: { width: 1440, height: 900 } }); P[k] = await C[k].newPage(); }
  const chat = (p) => p.getByRole('region', { name: '聊天' });
  const sees = (p, text, t = T) => chat(p).getByText(text).first().waitFor({ timeout: t });
  const signIn = async (k) => {
    const p = P[k]; await p.goto(base);
    await p.getByLabel('邮箱').or(p.getByText('STAGING · 真实后端')).first().waitFor({ timeout: T });
    if (await p.getByLabel('邮箱').count()) {
      if (await p.getByRole('button', { name: '已有账号？登录' }).count()) await p.getByRole('button', { name: '已有账号？登录' }).click();
      await p.getByLabel('邮箱').fill(users[k].email); await p.getByLabel('密码').fill(users[k].pw);
      await p.getByRole('button', { name: '登录', exact: true }).click();
    }
    await p.getByText('STAGING · 真实后端').waitFor({ timeout: T });
  };
  const open = async (p) => { await p.getByTestId('room').filter({ hasText: proj }).first().click(); await chat(p).getByText(proj).first().waitFor({ timeout: T }); };
  const m1 = `offline-m1 ${stamp}`, m2 = `offline-m2 ${stamp}`, m3 = `offline-m3 ${stamp}`;

  await check('O1 both parties are online in the same room', async () => { await signIn('a1'); await signIn('b1'); await open(P.a1); await open(P.b1); });
  await check('O2 while A is offline the message is kept and marked as not sent', async () => {
    await C.a1.setOffline(true);
    await P.a1.getByLabel('输入消息').fill(m1); await P.a1.getByLabel('发送').click();
    await sees(P.a1, m1);
    await P.a1.getByRole('button', { name: /重新发送/ }).first().waitFor({ timeout: T });
  });
  await check('O3 B keeps talking meanwhile and does not see the unsent message', async () => {
    await P.b1.getByLabel('输入消息').fill(m2); await P.b1.getByLabel('发送').click(); await sees(P.b1, m2);
    if (await chat(P.b1).getByText(m1).count()) throw new Error('unsent message leaked to B');
  });
  await check('O4 back online: A resends once, B receives it, A catches up with B without reload', async () => {
    await C.a1.setOffline(false);
    await P.a1.getByRole('button', { name: /重新发送/ }).first().click();
    await sees(P.b1, m1, 45000); await sees(P.a1, m2, 45000);
    if (await P.a1.getByRole('button', { name: /重新发送/ }).count()) throw new Error('still shows not-sent after delivery');
  });
  await check('O5 B offline then online: B reload shows the full ordered history', async () => {
    await C.b1.setOffline(true); await C.b1.setOffline(false);
    await P.a1.getByLabel('输入消息').fill(m3); await P.a1.getByLabel('发送').click(); await sees(P.a1, m3);
    await P.b1.reload(); await open(P.b1); await sees(P.b1, m3, 45000);
    const t = await chat(P.b1).innerText(); const i = [m1, m2, m3].map((m) => t.indexOf(m));
    if (i.some((x) => x < 0)) throw new Error('missing message after reload');
    if (!(i[1] < i[2])) throw new Error('order broken');
  });
  const summary = { stamp, base, passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  fs.writeFileSync(path.join(out, 'offline-acceptance.json'), JSON.stringify(summary, null, 2));
  console.log(`\n${summary.passed} passed, ${summary.failed} failed, 0 not run`);
  await browser.close(); process.exit(summary.failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
