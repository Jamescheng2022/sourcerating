/**
 * Browser acceptance for /project-room-lab (DEMO data only, no backend).
 *   LAB_URL=http://localhost:3100 node scripts/project-room-lab-acceptance.cjs
 * Optional: LAB_QA_OUTPUT=<dir>  LAB_CHROME_CHANNEL=chrome
 */
const { chromium, expect } = require('@playwright/test');
const fs = require('fs');

const base = process.env.LAB_URL || 'http://localhost:3100';
const out = process.env.LAB_QA_OUTPUT || '/tmp/project-room-lab-qa';
const channel = process.env.LAB_CHROME_CHANNEL || undefined;
fs.mkdirSync(out, { recursive: true });
const results = [];
const errors = [];
const metrics = {};
let failed = 0;

async function check(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log('PASS', name); }
  catch (e) { failed++; results.push({ name, passed: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', name, '—', String(e.message).split('\n').slice(0, 6).join(' | ')); }
}
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const msg = (page, id) => page.locator(`[data-msg="${id}"]`);
/** Anything laid out past the viewport edge, plus document-level scroll. */
const overflow = async (page) => { await page.waitForTimeout(300); return page.evaluate(() => {
  const w = window.innerWidth, bad = [];
  if (document.documentElement.scrollWidth > w) bad.push(`document ${document.documentElement.scrollWidth}>${w}`);
  for (const el of document.querySelectorAll('[class*="bubble"],[class*="composer"],[class*="chatHead"] button,[class*="evChip"],[class*="room"],[class*="card"],[class*="tabs"],[class*="viewerBar"] button,[class*="sheet"],[class*="drawer"]')) {
    const r = el.getBoundingClientRect();
    if (r.width && (r.right > w + 0.5 || r.left < -0.5)) bad.push(`${el.className.toString().split('__').pop()} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return bad.slice(0, 6);
}); };
async function open(browser, width, height, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: !!opts.touch, isMobile: !!opts.touch, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${width}: ${e.message}`));
  await page.goto(`${base}/project-room-lab${opts.query || ''}`);
  await expect(page.getByRole('navigation', { name: '组织与聊天房间' })).toBeAttached();
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel });

  /* ───────── Desktop 1440 × 900: the 18 required interactions ───────── */
  const { ctx, page } = await open(browser, 1440, 900);
  const nav = page.getByRole('navigation', { name: '组织与聊天房间' });
  const box = page.getByRole('textbox', { name: '输入消息' });
  const chat = page.getByRole('region', { name: '聊天' });

  await check('desktop: list + chat visible, panel closed by default, no overflow', async () => {
    await expect(nav).toBeVisible();
    await expect(box).toBeVisible();
    await expect(page.getByRole('complementary', { name: '项目面板' })).toHaveCount(0);
    expect(await overflow(page)).toEqual([]);
  });
  await shot(page, 'B-1440-chat');

  await check('01 switch organisation (internal rooms follow the org)', async () => {
    await expect(nav.getByRole('button', { name: /报价评估/ })).toBeVisible();
    await nav.getByRole('button', { name: /切换组织/ }).click();
    await page.getByRole('menuitem', { name: /冀工精密制造/ }).click();
    await expect(nav.getByRole('button', { name: /排产与发货/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /报价评估/ })).toHaveCount(0);
    await nav.getByRole('button', { name: /切换组织/ }).click();
    await page.getByRole('menuitem', { name: /Siam Infra Engineering/ }).click();
    await expect(nav.getByRole('button', { name: /报价评估/ })).toBeVisible();
  });
  await check('02 switch room', async () => {
    await nav.getByRole('button', { name: /林查班清关/ }).click();
    await expect(page.getByRole('button', { name: /林查班清关 · 首批，查看成员/ })).toBeVisible();
    await nav.getByRole('button', { name: /报价评估/ }).click();
    await expect(page.getByText('内部房间 · 外部组织看不到这里的内容')).toBeVisible();
  });
  await shot(page, 'B-1440-internal-room');
  await check('03 search rooms', async () => {
    await nav.getByRole('textbox', { name: '搜索房间' }).fill('静载');
    await expect(nav.getByRole('button', { name: /P12 静载检测/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /林查班清关/ })).toHaveCount(0);
    await nav.getByRole('button', { name: '清除搜索' }).click();
  });
  await check('04 open chat', async () => {
    await nav.getByRole('button', { name: /端板采购/ }).click();
    await expect(msg(page, 'm15')).toBeVisible();
    await expect(box).toBeVisible();
  });
  await check('05 send a demo message (optimistic → sent, composer keeps focus)', async () => {
    await box.fill('[LAB] 请确认 25 日检验安排。');
    await box.press('Enter');
    await expect(chat.getByText('[LAB] 请确认 25 日检验安排。')).toBeVisible();
    await expect(page.getByText('发送中…')).toBeVisible();
    await expect(page.getByText('发送中…')).toHaveCount(0, { timeout: 5000 });
    await expect(chat.getByText(/正在输入/)).toBeVisible({ timeout: 4000 });
    await expect(chat.getByText('收到，稍后回复。（演示自动回复）')).toBeVisible({ timeout: 6000 });
    await expect(box).toHaveValue('');
  });
  await check('06 reply to a message (quote is kept and jumps back)', async () => {
    await msg(page, 'm11').hover();
    await msg(page, 'm11').getByRole('button', { name: '回复', exact: true }).click();
    await expect(page.getByText('回复 Somchai P.')).toBeVisible();
    await box.fill('[LAB] 25–26 日可以。');
    await box.press('Enter');
    const mine = page.locator('[data-msg]').filter({ hasText: '[LAB] 25–26 日可以。' });
    await expect(mine.getByRole('button', { name: /Somchai P\./ })).toBeVisible();
  });
  await check('07 message context menu (right-click)', async () => {
    await msg(page, 'm9').locator('[class*="bubble"]').first().click({ button: 'right' });
    for (const label of ['回复', '问 AI', '翻译', '复制消息链接']) await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  });
  await check('08 Ask AI on a message: private panel, sources, nothing posted to the room', async () => {
    const before = await page.locator('[data-msg]').count();
    await msg(page, 'm9').hover();
    await msg(page, 'm9').getByRole('button', { name: '问 AI', exact: true }).click();
    const panel = page.getByRole('complementary', { name: '项目面板' });
    await expect(panel.getByText('仅你可见 · 不会发到群里')).toBeVisible();
    await expect(panel.getByText(/USD 72,720\.00/)).toBeVisible({ timeout: 5000 });
    await expect(panel.getByLabel('来源').getByRole('button').first()).toBeVisible();
    expect(await page.locator('[data-msg]').count()).toBe(before);
    expect(await overflow(page)).toEqual([]);
  });
  await shot(page, 'B-1440-ask-ai');
  await check('09 translate a message inline (private)', async () => {
    await msg(page, 'm3').scrollIntoViewIfNeeded().catch(() => {});
    await page.getByRole('complementary', { name: '项目面板' }).getByLabel('来源').getByRole('button', { name: /Narin S\./ }).first().click();
    await expect(msg(page, 'm3')).toBeVisible();
    await msg(page, 'm3').hover();
    await msg(page, 'm3').getByRole('button', { name: '翻译', exact: true }).click();
    await expect(msg(page, 'm3').getByText('译文 · 仅你可见')).toBeVisible();
    await expect(msg(page, 'm3').getByText(/We will check the drawing today/)).toBeVisible();
  });
  await check('10 pick an attachment and send it', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    await page.getByTestId('file-input').setInputFiles({ name: 'site-photo.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByText('演示：仅保存在本页，不上传')).toBeVisible();
    await page.getByRole('button', { name: '发送', exact: true }).click();
    await expect(page.getByRole('button', { name: '预览文件 site-photo.png' })).toBeVisible();
  });
  await check('11 file preview → compare versions → related messages → back to source', async () => {
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.getByRole('button', { name: '搜索消息' }).click();
    await page.getByRole('textbox', { name: '搜索当前房间消息' }).fill('Revised drawing');
    await expect(msg(page, 'm7')).toBeVisible();
    await page.getByRole('button', { name: '关闭搜索' }).click();
    await msg(page, 'm7').getByRole('button', { name: /预览文件 EP-600/ }).click();
    const dlg = page.getByRole('dialog', { name: 'EP-600 End Plate Drawing.pdf' });
    await expect(dlg.getByRole('img', { name: /Rev B，厚度 20 mm/ })).toBeVisible();
    await shot(page, 'B-1440-file-preview');
    await dlg.getByRole('tab', { name: '比较版本' }).click();
    await expect(dlg.getByRole('cell', { name: '18 mm' })).toBeVisible();
    await expect(dlg.getByRole('cell', { name: '20 mm' })).toBeVisible();
    await shot(page, 'B-1440-file-compare');
    await dlg.getByRole('tab', { name: /相关消息/ }).click();
    await dlg.getByRole('button', { name: /王工/ }).click();
    await expect(dlg).toHaveCount(0);
    await expect(msg(page, 'm4').locator('[data-hl="true"]')).toBeVisible();
  });
  await check('12 toggle panel: files ↔ overview', async () => {
    await page.getByRole('button', { name: '打开项目面板' }).click();
    const panel = page.getByRole('complementary', { name: '项目面板' });
    await panel.getByRole('tab', { name: '文件' }).click();
    await expect(panel.getByRole('button', { name: /Quotation JG-2611-018\.xlsx/ })).toBeVisible();
    await panel.getByRole('tab', { name: '概览' }).click();
    await expect(panel.getByText('谁能看到这里')).toBeVisible();
    await shot(page, 'B-1440-overview');
  });
  await check('13 participants grouped by organisation', async () => {
    await page.getByRole('button', { name: '参与者' }).click();
    const panel = page.getByRole('complementary', { name: '项目面板' });
    for (const o of ['Siam Infra Engineering', '冀工精密制造', 'Lanna Testing Lab']) await expect(panel.getByRole('heading', { name: new RegExp(o) })).toBeVisible();
  });
  await check('14 AI-extracted items awaiting confirmation', async () => {
    await page.getByRole('button', { name: '3 项待确认' }).click();
    for (const id of ['p2', 'p3', 'p4']) await expect(page.getByTestId(`proposal-${id}`)).toBeVisible();
  });
  await check('15 item → source message (evidence traceability)', async () => {
    await page.getByTestId('proposal-p4').getByRole('button', { name: /Somchai P\./ }).click();
    await expect(msg(page, 'm11').locator('[data-hl="true"]')).toBeVisible();
    await shot(page, 'B-1440-evidence-trace');
  });
  await check('16 confirm and reject (demo, local only)', async () => {
    await page.getByTestId('proposal-p2').getByRole('button', { name: '确认' }).click();
    await expect(page.getByTestId('proposal-p2')).toContainText('已确认 · Narin S.');
    await page.getByTestId('proposal-p4').getByRole('button', { name: '驳回' }).click();
    await expect(page.getByTestId('proposal-p4')).toContainText('已驳回');
    await expect(page.getByRole('button', { name: '1 项待确认' })).toBeVisible();
    await page.getByTestId('proposal-p2').getByRole('button', { name: /Narin S\.|陈立/ }).last().click();
    await expect(msg(page, 'm15').getByRole('button', { name: /已记录：首批 1,200 件/ })).toBeVisible();
  });
  await check('send failure → visible state → resend', async () => {
    await page.getByRole('button', { name: '关闭面板' }).click();
    await page.getByRole('button', { name: '演示控制' }).click();
    await page.getByRole('menuitemcheckbox', { name: '模拟发送失败' }).click();
    await box.fill('[LAB] 这条会失败');
    await box.press('Enter');
    const retry = page.getByRole('button', { name: /未发出 · 点击重发/ });
    await expect(retry).toBeVisible({ timeout: 5000 });
    await shot(page, 'B-1440-send-failed');
    await page.getByRole('button', { name: '演示控制' }).click();
    await page.getByRole('menuitemcheckbox', { name: '模拟发送失败' }).click();
    await retry.click();
    await expect(retry).toHaveCount(0, { timeout: 5000 });
  });
  await check('message search with result stepping', async () => {
    await page.getByRole('button', { name: '搜索消息' }).click();
    await page.getByRole('textbox', { name: '搜索当前房间消息' }).fill('28');
    await expect(page.getByText(/^\d+\/\d+$/)).toBeVisible();
    await page.getByRole('button', { name: '上一条结果' }).click();
    await expect(page.locator('[data-hl="true"]')).toBeVisible();
    await page.getByRole('button', { name: '关闭搜索' }).click();
  });
  await check('history paging keeps reading position; new-message pill when scrolled up', async () => {
    const list = page.locator('[data-virtuoso-scroller="true"]');
    await list.evaluate((el) => el.scrollTo({ top: 0 }));
    const more = chat.getByRole('button', { name: '加载更早消息' });
    if (await more.isVisible().catch(() => false)) await more.click();
    await expect(chat.getByText(/历史 #\d+/).first()).toBeAttached({ timeout: 5000 });
    await page.waitForTimeout(400);
    expect(await list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight)).toBeGreaterThan(200);
    await page.getByRole('button', { name: '演示控制' }).click();
    await page.getByRole('menuitem', { name: '模拟对方来消息' }).click();
    await expect(page.getByRole('button', { name: /1 条新消息/ })).toBeVisible({ timeout: 6000 });
    await page.getByRole('button', { name: /1 条新消息/ }).click();
    await expect(chat.getByText('Any update on this? （演示来消息）')).toBeVisible();
  });
  await check('2,000 generated messages stay virtualised', async () => {
    await page.getByRole('button', { name: '演示控制' }).click();
    const t0 = Date.now();
    await page.getByRole('menuitem', { name: '载入 2,000 条历史' }).click();
    await expect(page.getByText('已载入 2,000 条生成的历史消息')).toBeVisible();
    await page.waitForTimeout(400);
    metrics.loadMs = Date.now() - t0;
    metrics.renderedItems = await page.locator('[data-msg]').count();
    metrics.domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    const list = page.locator('[data-virtuoso-scroller="true"]');
    metrics.scrollFrames = await list.evaluate(async (el) => {
      let frames = 0, long = 0, last = performance.now();
      const stop = last + 2000;
      await new Promise((res) => { const tick = (t) => { frames++; if (t - last > 50) long++; last = t; el.scrollBy(0, -900); t < stop ? requestAnimationFrame(tick) : res(); }; requestAnimationFrame(tick); });
      return { frames, framesOver50ms: long };
    });
    expect(metrics.renderedItems).toBeLessThan(120);
  });
  await check('copy message link + deep link opens and highlights the message', async () => {
    await page.getByRole('button', { name: '搜索消息' }).click();
    await page.getByRole('textbox', { name: '搜索当前房间消息' }).fill('18 mm');
    await page.getByRole('button', { name: '关闭搜索' }).click();
    await msg(page, 'm4').locator('[class*="bubble"]').first().click({ button: 'right' });
    await page.getByRole('menuitem', { name: '复制消息链接' }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/project-room-lab\?room=r1&msg=m4$/);
    const deep = await open(browser, 1280, 800, { query: new URL(link).search });
    await expect(msg(deep.page, 'm4').locator('[data-hl="true"]')).toBeVisible({ timeout: 5000 });
    expect(await overflow(deep.page)).toEqual([]);
    await shot(deep.page, 'B-1280-deeplink');
    await deep.ctx.close();
  });
  await check('new room (demo, local only)', async () => {
    await nav.getByRole('button', { name: '新建房间' }).click();
    const dlg = page.getByRole('dialog', { name: '新建房间' });
    await dlg.getByRole('textbox', { name: '房间名称' }).fill('检测报告审查');
    await dlg.getByRole('button', { name: /Lanna Testing Lab/ }).click();
    await dlg.getByRole('button', { name: '创建' }).click();
    await expect(page.getByRole('button', { name: /检测报告审查，查看成员/ })).toBeVisible();
    await expect(page.getByText('发第一条消息开始协作')).toBeVisible();
  });
  await ctx.close();

  /* ───────── Laptop 1280 × 800 ───────── */
  {
    const { ctx, page } = await open(browser, 1280, 800);
    await check('1280: scrolling to the top auto-loads history and keeps the reading position', async () => {
      const list = page.locator('[data-virtuoso-scroller="true"]');
      await expect(msg(page, 'm15')).toBeVisible();
      await list.evaluate((el) => el.scrollTo({ top: 0 }));
      await expect(page.getByText(/历史 #1$/)).toBeVisible({ timeout: 5000 });
      await expect(msg(page, 'm1')).toBeVisible();
    });
    await check('1280: three columns fit with the panel open', async () => {
      await page.getByRole('button', { name: '3 项待确认' }).click();
      await expect(page.getByRole('complementary', { name: '项目面板' })).toBeVisible();
      const chatW = await page.getByRole('region', { name: '聊天' }).evaluate((el) => el.getBoundingClientRect().width);
      expect(chatW).toBeGreaterThan(560);
      expect(await overflow(page)).toEqual([]);
    });
    await shot(page, 'B-1280-panel');
    await ctx.close();
  }

  /* ───────── Tablet 768 × 1024 ───────── */
  {
    const { ctx, page } = await open(browser, 768, 1024, { touch: true });
    await check('768: list and chat stay side by side; panel is a drawer that does not squeeze chat', async () => {
      await expect(page.getByRole('navigation', { name: '组织与聊天房间' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: '输入消息' })).toBeVisible();
      const before = await page.getByRole('region', { name: '聊天' }).evaluate((el) => el.getBoundingClientRect().width);
      expect(before).toBeGreaterThan(440);
      expect(await overflow(page)).toEqual([]);
      await shot(page, 'B-768-chat');
      await page.getByRole('button', { name: '3 项待确认' }).click();
      await expect(page.getByTestId('drawer')).toBeVisible();
      const after = await page.getByRole('region', { name: '聊天', includeHidden: true }).evaluate((el) => el.getBoundingClientRect().width);
      expect(after).toBe(before);
      expect(await overflow(page)).toEqual([]);
      await shot(page, 'B-768-drawer');
      await page.getByTestId('proposal-p2').getByRole('button', { name: /陈立/ }).first().click();
      await expect(page.getByTestId('drawer')).toHaveCount(0);
      await expect(msg(page, 'm9').locator('[data-hl="true"]')).toBeVisible();
    });
    await check('768: file preview usable', async () => {
      await msg(page, 'm8').getByRole('button', { name: /预览文件 Quotation/ }).click();
      await expect(page.getByRole('dialog', { name: 'Quotation JG-2611-018.xlsx' }).getByRole('cell', { name: '72,720.00' })).toBeVisible();
      expect(await overflow(page)).toEqual([]);
      await shot(page, 'B-768-file');
      await page.getByRole('button', { name: '关闭预览' }).click();
    });
    await ctx.close();
  }

  /* ───────── Phones 390 × 844 and 320 × 720 ───────── */
  for (const [w, h] of [[390, 844], [320, 720]]) {
    const { ctx, page } = await open(browser, w, h, { touch: true });
    const nav = page.getByRole('navigation', { name: '组织与聊天房间' });
    const box = page.getByRole('textbox', { name: '输入消息' });
    await check(`${w}: starts on the room list, full screen, no overflow`, async () => {
      await expect(nav).toBeVisible();
      await expect(box).toBeHidden();
      expect(await overflow(page)).toEqual([]);
    });
    await shot(page, `B-${w}-list`);
    await check(`${w}: open chat full screen; composer inside the viewport`, async () => {
      await nav.getByRole('button', { name: /端板采购/ }).tap();
      await expect(box).toBeVisible();
      await expect(nav).toBeHidden();
      const bottom = await page.locator('footer[class*="composer"]').evaluate((el) => el.getBoundingClientRect().bottom);
      expect(bottom).toBeLessThanOrEqual(h + 0.5);
      expect(await overflow(page)).toEqual([]);
    });
    await shot(page, `B-${w}-chat`);
    await check(`${w}: composer follows a shrinking viewport (keyboard stand-in)`, async () => {
      await page.setViewportSize({ width: w, height: Math.round(h * 0.55) });
      await box.tap();
      const r = await page.locator('footer[class*="composer"]').evaluate((el) => el.getBoundingClientRect().bottom);
      expect(r).toBeLessThanOrEqual(Math.round(h * 0.55) + 0.5);
      await expect(box).toBeInViewport();
      await page.setViewportSize({ width: w, height: h });
    });
    await check(`${w}: touch message menu → Ask AI lands in a bottom sheet`, async () => {
      await msg(page, 'm15').getByRole('button', { name: '更多操作' }).tap();
      await page.getByRole('menuitem', { name: '问 AI', exact: true }).tap();
      const sheet = page.getByTestId('bottom-sheet');
      await expect(sheet.getByText('仅你可见 · 不会发到群里')).toBeVisible();
      expect(await overflow(page)).toEqual([]);
      await shot(page, `B-${w}-sheet-ai`);
    });
    await check(`${w}: 17 bottom sheet tabs, then close; chat header stays reachable above it`, async () => {
      const sheet = page.getByTestId('bottom-sheet');
      await sheet.getByRole('tab', { name: /待确认/ }).tap();
      await expect(page.getByTestId('proposal-p3')).toBeVisible();
      const top = await sheet.evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(52);
      expect(await overflow(page)).toEqual([]);
      await shot(page, `B-${w}-sheet-review`);
      await sheet.getByRole('button', { name: '关闭面板' }).tap();
      await expect(sheet).toHaveCount(0);
      await expect(box).toBeVisible();
    });
    await check(`${w}: source chip closes the sheet and reveals the message`, async () => {
      await page.getByRole('button', { name: '3 项待确认' }).tap();
      await page.getByTestId('proposal-p2').getByRole('button', { name: /陈立/ }).first().tap();
      await expect(page.getByTestId('bottom-sheet')).toHaveCount(0);
      await expect(msg(page, 'm9').locator('[data-hl="true"]')).toBeVisible();
    });
    await check(`${w}: file preview full screen, compare stacks vertically`, async () => {
      await msg(page, 'm8').getByRole('button', { name: /预览文件 Quotation/ }).tap();
      const dlg = page.getByRole('dialog', { name: 'Quotation JG-2611-018.xlsx' });
      await expect(dlg.getByRole('cell', { name: '72,720.00' })).toBeAttached();
      expect(await overflow(page)).toEqual([]);
      await shot(page, `B-${w}-file`);
      await dlg.getByRole('button', { name: '关闭预览' }).tap();
      await expect(dlg).toHaveCount(0);
    });
    await check(`${w}: 18 back returns to the room list (button and browser back)`, async () => {
      await page.getByRole('button', { name: '返回聊天列表' }).tap();
      await expect(nav).toBeVisible();
      await nav.getByRole('button', { name: /林查班清关/ }).tap();
      await expect(box).toBeVisible();
      await page.goBack();
      await expect(nav).toBeVisible();
      await expect(page).toHaveURL(/project-room-lab/);
    });
    await ctx.close();
  }

  await check('no unhandled browser exceptions', async () => expect(errors).toEqual([]));
  fs.writeFileSync(`${out}/acceptance.json`, JSON.stringify({ base, results, metrics, errors }, null, 2));
  console.log(`\n${results.filter((r) => r.passed).length}/${results.length} passed`, JSON.stringify(metrics));
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
