#!/usr/bin/env node
'use strict';
// Restricted Playwright tool server (MCP over stdio, no dependencies) for the Test Director.
// It exposes browser actions for synthetic personas ONLY. There is no shell, no arbitrary JavaScript,
// no arbitrary URL, no file access outside runs/, and typed e-mail addresses must be synthetic personas.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const guard = require('../lib/guard.cjs');
const { ROOT, profile } = guard;
const QA = path.join(ROOT, 'qa', 'windows-b');
const { chromium } = require(require.resolve('@playwright/test', { paths: [path.join(ROOT, 'apps', 'web')] }));

try { guard.assertEnv(process.env); } catch (e) { process.stderr.write('tool server refuses to start: ' + e.message + '\n'); process.exit(3); }
const BASE = new URL(process.env.B_URL);
const users = Object.fromEntries(JSON.parse(fs.readFileSync(process.env.B_USERS, 'utf8')).map((u) => [u.key, u]));
const emails = new Set(Object.values(users).map((u) => u.email.toLowerCase()));
const RUN = process.env.QA_RUN_DIR || path.join(QA, 'runs', 'director-' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15));
for (const d of ['screenshots', 'traces', 'logs']) fs.mkdirSync(path.join(RUN, d), { recursive: true });
const log = (o) => fs.appendFileSync(path.join(RUN, 'logs', 'director-actions.jsonl'), JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');
let browser; const S = {}; const T = 20000; let blocked = 0;

const pdf = (label) => Buffer.from(`%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\n% ${label}\ntrailer<</Root 1 0 R>>\n%%EOF\n`);
const FIXTURES = { 'pdf-a': () => ({ name: 'qa-drawing.pdf', mimeType: 'application/pdf', buffer: pdf('synthetic A') }), 'pdf-b': () => ({ name: 'qa-drawing.pdf', mimeType: 'application/pdf', buffer: pdf('synthetic B') }) };

const ensureBrowser = async () => {
  if (browser) return browser;
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
  browser = await chromium.launch({ channel: process.env.B_CHROME_CHANNEL || undefined, proxy }); return browser;
};
const sess = (p) => { if (!S[p]) throw new Error(`no open session for persona ${p} — call open_session first`); return S[p].page; };
const persona = (p) => { if (!users[p]) throw new Error('unknown persona'); return p; };
const checkTyped = (v) => {
  if (String(v).length > 2000) throw new Error('value too long');
  const found = String(v).match(/[^\s@]+@[^\s@]+\.[^\s@]+/g) || [];
  for (const e of found) if (!emails.has(e.toLowerCase())) throw new Error('refusing to type an e-mail address that is not a synthetic persona');
};

const tools = {
  list_personas: { d: 'List synthetic personas (no credentials).', p: {}, run: async () => Object.values(users).map((u) => ({ key: u.key, email: u.email })) },
  open_session: { d: 'Open an isolated browser context for a persona and sign in at the Project Room B page.', p: { persona: 's', width: 'n?', height: 'n?' }, run: async ({ persona: k, width = 1440, height = 900 }) => {
    persona(k); if (S[k]) return 'already open';
    const b = await ensureBrowser(); const ctx = await b.newContext({ viewport: { width, height }, acceptDownloads: true });
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url()); if (['data:', 'blob:', 'about:'].includes(u.protocol)) return route.continue();
      const c = guard.classifyHost(u.hostname); if (c.ok) return route.continue();
      blocked++; log({ blocked: route.request().url().split('?')[0], why: c.why, boundary: !!c.boundary }); return route.abort('blockedbyclient');
    });
    await ctx.tracing.start({ screenshots: true, snapshots: true, sources: false });
    const page = await ctx.newPage(); S[k] = { ctx, page };
    await page.goto(new URL('/project-room-b', BASE).href);
    await page.getByLabel('邮箱').or(page.getByText('STAGING · 真实后端')).first().waitFor({ timeout: T });
    if (await page.getByLabel('邮箱').count()) {
      if (await page.getByRole('button', { name: '已有账号？登录' }).count()) await page.getByRole('button', { name: '已有账号？登录' }).click();
      await page.getByLabel('邮箱').fill(users[k].email); await page.getByLabel('密码').fill(users[k].pw);
      await page.getByRole('button', { name: '登录', exact: true }).click();
    }
    return 'signed in as ' + k; } },
  goto: { d: 'Navigate to a path on the target app (must start with "/"; other hosts are refused).', p: { persona: 's', path: 's' }, run: async ({ persona: k, path: p }) => { if (!/^\/[^/]/.test(p) && p !== '/') throw new Error('path must start with /'); const u = new URL(p, BASE); if (u.origin !== BASE.origin) throw new Error('other origins are refused'); await sess(k).goto(u.href); return u.pathname + u.search; } },
  snapshot: { d: 'Accessibility snapshot (text) of the current page, max 9000 chars.', p: { persona: 's' }, run: async ({ persona: k }) => (await sess(k).locator('body').ariaSnapshot()).slice(0, 9000) },
  click: { d: 'Click an element by ARIA role and accessible name.', p: { persona: 's', role: 's', name: 's', exact: 'b?' }, run: async ({ persona: k, role, name, exact }) => { await sess(k).getByRole(role, { name, exact: !!exact }).first().click({ timeout: T }); return 'clicked'; } },
  click_text: { d: 'Click the first element containing the given visible text.', p: { persona: 's', text: 's' }, run: async ({ persona: k, text }) => { await sess(k).getByText(text).first().click({ timeout: T }); return 'clicked'; } },
  click_testid: { d: 'Click an element by data-testid.', p: { persona: 's', testid: 's', hasText: 's?' }, run: async ({ persona: k, testid, hasText }) => { let l = sess(k).getByTestId(testid); if (hasText) l = l.filter({ hasText }); await l.first().click({ timeout: T }); return 'clicked'; } },
  fill: { d: 'Fill an input found by its label.', p: { persona: 's', label: 's', value: 's' }, run: async ({ persona: k, label, value }) => { checkTyped(value); await sess(k).getByLabel(label).first().fill(value, { timeout: T }); return 'filled'; } },
  press: { d: 'Press a key (Enter, Escape, Tab ...).', p: { persona: 's', key: 's' }, run: async ({ persona: k, key }) => { await sess(k).keyboard.press(key); return 'ok'; } },
  wait_for_text: { d: 'Wait until text is visible (timeout ms, default 20000, max 60000).', p: { persona: 's', text: 's', timeout_ms: 'n?' }, run: async ({ persona: k, text, timeout_ms = T }) => { await sess(k).getByText(text).first().waitFor({ timeout: Math.min(timeout_ms, 60000) }); return 'visible'; } },
  upload_fixture: { d: 'Attach a generated synthetic file (pdf-a or pdf-b) through the app file input.', p: { persona: 's', fixture: 's' }, run: async ({ persona: k, fixture }) => { if (!FIXTURES[fixture]) throw new Error('unknown fixture'); await sess(k).getByTestId('file-input').setInputFiles(FIXTURES[fixture]()); return 'attached (press send to deliver)'; } },
  set_offline: { d: 'Simulate network loss/recovery for a persona.', p: { persona: 's', offline: 'b' }, run: async ({ persona: k, offline }) => { await S[persona(k)].ctx.setOffline(!!offline); return offline ? 'offline' : 'online'; } },
  reload: { d: 'Reload the page.', p: { persona: 's' }, run: async ({ persona: k }) => { await sess(k).reload(); return 'reloaded'; } },
  screenshot: { d: 'Save a screenshot under the run evidence folder.', p: { persona: 's', name: 's' }, run: async ({ persona: k, name }) => { const f = path.join(RUN, 'screenshots', `director-${k}-${String(name).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60)}.png`); await sess(k).screenshot({ path: f }); return path.relative(QA, f); } },
  close_session: { d: 'Close a persona session and save its trace.', p: { persona: 's' }, run: async ({ persona: k }) => { const s = S[persona(k)]; if (!s) return 'not open'; await s.ctx.tracing.stop({ path: path.join(RUN, 'traces', `director-${k}.zip`) }); await s.ctx.close(); delete S[k]; return 'closed, trace saved'; } },
  list_suites: { d: 'List the approved test entrypoints.', p: {}, run: async () => profile.entrypoints },
  run_suites: { d: 'Run approved suites through the pinned runner (never any other command).', p: { suites: 's' }, run: async ({ suites }) => { const list = String(suites).split(',').map((x) => x.trim()); for (const s of list) if (!profile.entrypoints[s]) throw new Error('not an approved suite: ' + s); const r = cp.spawnSync(process.execPath, [path.join(QA, 'runner', 'run.cjs'), '--suites', list.join(',')], { env: process.env, encoding: 'utf8', timeout: 1800000, maxBuffer: 32 * 1024 * 1024 }); return (r.stdout + r.stderr).slice(-6000); } },
  read_evidence: { d: 'Read a text evidence file under runs/ (max 20000 chars).', p: { relpath: 's' }, run: async ({ relpath }) => { const f = path.resolve(QA, 'runs', relpath); if (!f.startsWith(path.join(QA, 'runs') + path.sep) || !fs.existsSync(f) || /\.(zip|png|jpg)$/.test(f)) throw new Error('not readable'); return fs.readFileSync(f, 'utf8').slice(0, 20000); } },
};

const schema = (p) => ({ type: 'object', properties: Object.fromEntries(Object.entries(p).map(([k, v]) => [k, { type: v[0] === 'n' ? 'number' : v[0] === 'b' ? 'boolean' : 'string' }])), required: Object.entries(p).filter(([, v]) => !v.endsWith('?')).map(([k]) => k) });
const send = (o) => process.stdout.write(JSON.stringify(o) + '\n');
let buf = '';
process.stdin.on('data', async (c) => {
  buf += c; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.method === 'initialize') send({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'sourcerating-playwright-restricted', version: '1' } } });
    else if (m.method === 'tools/list') send({ jsonrpc: '2.0', id: m.id, result: { tools: Object.entries(tools).map(([name, t]) => ({ name, description: t.d, inputSchema: schema(t.p) })) } });
    else if (m.method === 'tools/call') {
      const t = tools[m.params.name]; const a = m.params.arguments || {};
      if (!t) { send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'unknown tool' } }); continue; }
      try { const r = await t.run(a); log({ tool: m.params.name, args: { ...a, value: a.value ? '[typed]' : undefined }, ok: true }); send({ jsonrpc: '2.0', id: m.id, result: { content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 2) }] } }); }
      catch (e) { log({ tool: m.params.name, ok: false, error: String(e.message).split('\n')[0] }); send({ jsonrpc: '2.0', id: m.id, result: { isError: true, content: [{ type: 'text', text: String(e.message).split('\n')[0] }] } }); }
    } else if (m.id !== undefined) send({ jsonrpc: '2.0', id: m.id, result: {} });
  }
});
process.on('SIGTERM', async () => { for (const k of Object.keys(S)) try { await S[k].ctx.tracing.stop({ path: path.join(RUN, 'traces', `director-${k}.zip`) }); } catch {} process.exit(0); });
