'use strict';
// Loaded with `node -r` into every approved suite. It does not change test logic. It adds:
//  * network allow-list on every browser context (production hosts can never be reached),
//  * a Playwright trace per context, saved when the browser closes,
//  * a screenshot of every open page the moment a check prints FAIL,
//  * console / page errors and blocked requests to jsonl files.
const fs = require('fs'), path = require('path');
const guard = require('./guard.cjs');
const runDir = process.env.QA_RUN_DIR; if (!runDir) throw new Error('QA_RUN_DIR missing');
const dirs = { traces: path.join(runDir, 'traces'), shots: path.join(runDir, 'screenshots'), logs: path.join(runDir, 'logs') };
for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });
const tag = process.env.QA_PRELOAD_PROFILE || 'suite';
const jl = (f, o) => fs.appendFileSync(path.join(dirs.logs, f), JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');

const webDir = path.join(guard.ROOT, 'apps', 'web');
const { chromium } = require(require.resolve('@playwright/test', { paths: [webDir] }));
const contexts = []; let n = 0, failShots = 0;

const origLaunch = chromium.launch.bind(chromium);
chromium.launch = async (...a) => {
  const browser = await origLaunch(...a);
  const origNew = browser.newContext.bind(browser);
  browser.newContext = async (...b) => {
    const ctx = await origNew(...b); const id = ++n;
    await ctx.route('**/*', (route) => {
      const u = new URL(route.request().url());
      if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return route.continue();
      const c = guard.classifyHost(u.hostname);
      if (c.ok) return route.continue();
      jl('blocked-requests.jsonl', { ctx: id, url: route.request().url().split('?')[0], why: c.why, boundary: !!c.boundary });
      return route.abort('blockedbyclient');
    });
    await ctx.tracing.start({ screenshots: true, snapshots: true, sources: false, title: `${tag}-ctx${id}` });
    ctx.on('page', (p) => {
      p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) jl('console.jsonl', { ctx: id, type: m.type(), text: m.text().slice(0, 500) }); });
      p.on('pageerror', (e) => jl('console.jsonl', { ctx: id, type: 'pageerror', text: String(e.message).slice(0, 500) }));
    });
    contexts.push({ id, ctx });
    return ctx;
  };
  const origClose = browser.close.bind(browser);
  browser.close = async (...c) => {
    for (const { id, ctx } of contexts) { try { await ctx.tracing.stop({ path: path.join(dirs.traces, `${tag}-ctx${id}.zip`) }); } catch (e) { jl('preload-errors.jsonl', { where: 'trace', id, e: String(e.message) }); } }
    return origClose(...c);
  };
  return browser;
};

// screenshot all open pages when a check fails (best effort, never throws)
const origLog = console.log.bind(console);
console.log = (...args) => {
  origLog(...args);
  const line = args.map(String).join(' ');
  if (line.startsWith('FAIL ') && failShots < 40) {
    const k = ++failShots;
    for (const { id, ctx } of contexts) for (const [i, p] of ctx.pages().entries()) {
      p.screenshot({ path: path.join(dirs.shots, `${tag}-fail${String(k).padStart(2, '0')}-ctx${id}-p${i}.png`), timeout: 5000 }).catch(() => {});
    }
  }
};
