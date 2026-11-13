/**
 * A/B harness: captures the EXISTING /project-room (A) on the same DEMO fixture as the lab (B),
 * served by scripts/project-room-ab-mock-supabase.cjs. Measures only; asserts nothing about A.
 *   AB_URL=http://localhost:3100 node scripts/project-room-ab-capture.cjs [label]
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const base = process.env.AB_URL || 'http://localhost:3100';
const out = process.env.LAB_QA_OUTPUT || '/tmp/project-room-lab-qa';
const label = process.argv[2] || 'A';
const channel = process.env.LAB_CHROME_CHANNEL || undefined;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel });
  const report = { label, sizes: {} };
  for (const [w, h] of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [320, 720]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const t0 = Date.now();
    await page.goto(`${base}/project-room`);
    await page.getByLabel('Email', { exact: true }).fill('narin@demo.invalid');
    await page.getByLabel('Password', { exact: true }).fill('demo-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('确认，11 月 28 日前首批 1,200 件发运。').first().waitFor({ timeout: 30000 });
    const ready = Date.now() - t0;
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${label}-${w}-chat.png` });
    const m = await page.evaluate(async () => {
      const w = window.innerWidth;
      const scroller = [...document.querySelectorAll('*')].filter((e) => /auto|scroll/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 50).sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      const past = [...document.querySelectorAll('button,input,textarea,[id^="event-"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.right > w + 0.5; }).length;
      let frames = 0, long = 0;
      if (scroller) {
        let last = performance.now(); const stop = last + 2000;
        await new Promise((res) => { const tick = (t) => { frames++; if (t - last > 50) long++; last = t; scroller.scrollBy(0, -900); t < stop ? requestAnimationFrame(tick) : res(); }; requestAnimationFrame(tick); });
      }
      const box = document.querySelector('textarea');
      return {
        documentOverflowPx: Math.max(0, document.documentElement.scrollWidth - w), controlsPastEdge: past,
        domNodes: document.querySelectorAll('*').length, renderedMessages: document.querySelectorAll('[id^="event-"]').length,
        scrollFrames: frames, framesOver50ms: long,
        composerBottom: box ? Math.round(box.getBoundingClientRect().bottom) : null, viewportHeight: window.innerHeight,
        chatWidth: scroller ? Math.round(scroller.getBoundingClientRect().width) : null,
      };
    });
    report.sizes[w] = { readyMs: ready, ...m, errors };
    await ctx.close();
  }
  fs.writeFileSync(`${out}/${label}-capture.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
