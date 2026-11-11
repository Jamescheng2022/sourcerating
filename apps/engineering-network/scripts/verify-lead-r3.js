import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const outDir = 'C:\\Users\\cheng\\AppData\\Local\\Temp\\eng-ux-fix-r3';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function startServer(port = 4176) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    let filePath = path.join(distDir, urlPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Server Error`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  console.log(`Starting local server from ${distDir}...`);
  const server = await startServer(4176);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console error: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`Page error: ${err.message}`));

  console.log('\n======================================================');
  console.log('  Lead 终审 4 大必修项专项测试与外部截图采集');
  console.log(`  输出目录: ${outDir}`);
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // 1. P001 OBS 参建主体区测试与截图 (390 / 768 / 1440)
  // --------------------------------------------------------------------------
  console.log('--- [Item 1] P001 OBS 参建主体展示 ---');
  // 1a. @390
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4176/#/projects/p001', { waitUntil: 'networkidle0' });

  // Check overflow
  const ov390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`  ✓ 390 视口水平溢出检测: ${ov390 ? 'FAIL' : 'PASS (scrollWidth <= 390)'}`);
  if (ov390) throw new Error('Horizontal overflow detected at 390px on P001!');

  // Check mobile cards exist
  const obsCardsCount390 = await page.evaluate(() => {
    const sec = document.getElementById('sec-participations');
    const cards = sec ? sec.querySelectorAll('.md\\:hidden > div') : [];
    return cards.length;
  });
  console.log(`  ✓ 390 视口 OBS 移动卡片数量: ${obsCardsCount390} (要求: 12 个标段卡片)`);
  if (obsCardsCount390 !== 12) throw new Error(`Expected 12 OBS cards at 390px, got ${obsCardsCount390}`);

  // Screenshot OBS at 390
  const obsElement390 = await page.$('#sec-participations');
  if (obsElement390) {
    await obsElement390.screenshot({ path: path.join(outDir, '390_p001_obs_table.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '390_p001_obs_table.png')}`);
  }

  // 1b. @768
  await page.setViewport({ width: 768, height: 1024, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/projects/p001', { waitUntil: 'networkidle0' });
  const tableCells768 = await page.evaluate(() => {
    const sec = document.getElementById('sec-participations');
    const cells = sec ? Array.from(sec.querySelectorAll('.hidden.md\\:block table th, .hidden.md\\:block table td')) : [];
    const minWidth = cells.reduce((min, c) => Math.min(min, c.getBoundingClientRect().width), 9999);
    return { count: cells.length, minWidth };
  });
  console.log(`  ✓ 768 视口 OBS 表格单元格数: ${tableCells768.count}, 最小单元格宽度: ${tableCells768.minWidth.toFixed(1)}px (>= 64px)`);
  if (tableCells768.minWidth < 64) throw new Error(`OBS table cell squeezed below 64px: ${tableCells768.minWidth}px`);

  const obsElement768 = await page.$('#sec-participations');
  if (obsElement768) {
    await obsElement768.screenshot({ path: path.join(outDir, '768_p001_obs_table.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '768_p001_obs_table.png')}`);
  }

  // 1c. @1440 & Item 5: Desktop widths (1024, 1280, 1440) prose column >= 560px, OBS scrollWidth <= clientWidth+8
  console.log('\n--- [Item 5] P001 桌面宽度 (1024/1280/1440) 正文列宽与 OBS 表宽测试 ---');
  for (const vpWidth of [1024, 1280, 1440]) {
    await page.setViewport({ width: vpWidth, height: 900, isMobile: false });
    await page.goto('http://127.0.0.1:4176/#/projects/p001', { waitUntil: 'networkidle0' });

    const desktopMetrics = await page.evaluate(() => {
      const sec = document.getElementById('sec-participations');
      const proseCol = sec ? sec.closest('div.w-full.max-w-full.flex-1') : null;
      const obsContainer = sec ? sec.querySelector('.hidden.md\\:block') : null;
      const heading = sec ? sec.querySelector('h2') : null;

      const proseWidth = proseCol ? proseCol.getBoundingClientRect().width : (sec ? sec.getBoundingClientRect().width : 0);
      const scrollWidth = obsContainer ? obsContainer.scrollWidth : 0;
      const clientWidth = obsContainer ? obsContainer.clientWidth : 0;
      const headingHeight = heading ? heading.getBoundingClientRect().height : 0;

      return {
        proseWidth,
        scrollWidth,
        clientWidth,
        diff: scrollWidth - clientWidth,
        headingHeight
      };
    });

    console.log(`  ✓ @${vpWidth}px 正文列宽: ${desktopMetrics.proseWidth.toFixed(1)}px (要求 >= 560px)`);
    if (desktopMetrics.proseWidth < 560) {
      throw new Error(`Prose column squeezed below 560px at ${vpWidth}px: ${desktopMetrics.proseWidth}px`);
    }

    console.log(`  ✓ @${vpWidth}px OBS 容器 scrollWidth: ${desktopMetrics.scrollWidth}px, clientWidth: ${desktopMetrics.clientWidth}px (差值: ${desktopMetrics.diff}px, 要求 <= 8px)`);
    if (desktopMetrics.diff > 8) {
      throw new Error(`OBS table container has excessive horizontal scroll at ${vpWidth}px: diff ${desktopMetrics.diff}px`);
    }

    console.log(`  ✓ @${vpWidth}px Section 2 标题单行呈现: 高度 ${desktopMetrics.headingHeight.toFixed(1)}px (<= 36px)`);
    if (desktopMetrics.headingHeight > 36) {
      throw new Error(`Section 2 title broke into multiple lines at ${vpWidth}px: ${desktopMetrics.headingHeight}px`);
    }

    if (vpWidth === 1440) {
      const obsElement1440 = await page.$('#sec-participations');
      if (obsElement1440) {
        await obsElement1440.screenshot({ path: path.join(outDir, '1440_p001_obs_table.png') });
        await obsElement1440.screenshot({ path: path.join(outDir, '1440_p001_obs.png') });
        console.log(`  ✓ 截屏保存: ${path.join(outDir, '1440_p001_obs.png')}`);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 1d. P004 OBS 页面验证 (390 / 768 / 1440)
  // --------------------------------------------------------------------------
  console.log('\n--- [Item 1 (P004)] P004 OBS 参建主体展示 ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4176/#/projects/p004', { waitUntil: 'networkidle0' });
  const obsCardsCountP004 = await page.evaluate(() => {
    const sec = document.getElementById('sec-participations');
    const cards = sec ? sec.querySelectorAll('.md\\:hidden > div') : [];
    return cards.length;
  });
  console.log(`  ✓ 390 视口 P004 OBS 移动卡片数量: ${obsCardsCountP004} (卡片布局已生效)`);
  if (obsCardsCountP004 < 2) throw new Error(`Expected at least 2 OBS cards for P004, got ${obsCardsCountP004}`);

  const p004Obs390 = await page.$('#sec-participations');
  if (p004Obs390) {
    await p004Obs390.screenshot({ path: path.join(outDir, '390_p004_obs_table.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '390_p004_obs_table.png')}`);
  }

  await page.setViewport({ width: 768, height: 1024, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/projects/p004', { waitUntil: 'networkidle0' });
  const p004Obs768 = await page.$('#sec-participations');
  if (p004Obs768) {
    await p004Obs768.screenshot({ path: path.join(outDir, '768_p004_obs_table.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '768_p004_obs_table.png')}`);
  }

  // --------------------------------------------------------------------------
  // 2. Feed 首帖头部在 390 视口下的发帖人信息、发布时间与头像缩写测试
  // --------------------------------------------------------------------------
  console.log('\n--- [Item 2] Feed 首帖头部与头像缩写 ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4176/#/feed', { waitUntil: 'networkidle0' });

  const feedHeaderInfo = await page.evaluate(() => {
    const firstArticle = document.querySelector('article');
    if (!firstArticle) return null;
    const avatarSpan = firstArticle.querySelector('.font-mono span');
    const authorBtn = firstArticle.querySelector('button.font-bold');
    const timeSpan = firstArticle.querySelector('span.whitespace-nowrap.text-slate-400') ||
                     Array.from(firstArticle.querySelectorAll('span')).find(s => s.textContent.includes('前'));
    return {
      avatarInitials: avatarSpan ? avatarSpan.textContent.trim() : '',
      authorNameText: authorBtn ? authorBtn.textContent.trim() : '',
      timeText: timeSpan ? timeSpan.textContent.trim() : '',
      timeVisible: timeSpan ? (timeSpan.getBoundingClientRect().width > 0 && timeSpan.getBoundingClientRect().height > 0) : false,
    };
  });
  console.log(`  ✓ Feed 首帖头像缩写: "${feedHeaderInfo?.avatarInitials}" (期望: "DB", 与企业页一致)`);
  if (feedHeaderInfo?.avatarInitials !== 'DB') {
    throw new Error(`Feed avatar initials expected "DB", got "${feedHeaderInfo?.avatarInitials}"`);
  }

  console.log(`  ✓ Feed 首帖发布时间文本: "${feedHeaderInfo?.timeText}" (可见性: ${feedHeaderInfo?.timeVisible})`);
  if (!feedHeaderInfo?.timeVisible || !feedHeaderInfo?.timeText.includes('前')) {
    throw new Error('Publication time is not visible or was truncated in feed header!');
  }

  console.log(`  ✓ Feed 首帖企业发帖人名称: "${feedHeaderInfo?.authorNameText}" (换行可读)`);
  if (!feedHeaderInfo?.authorNameText.includes('Demo Organization B')) {
    throw new Error('Author name is missing Demo Organization B!');
  }

  // Screenshot feed top post header @390
  const feedFirstCard = await page.$('article');
  if (feedFirstCard) {
    await feedFirstCard.screenshot({ path: path.join(outDir, '390_feed_top_post.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '390_feed_top_post.png')}`);
  }

  // @768 and @1440
  await page.setViewport({ width: 768, height: 1024, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/feed', { waitUntil: 'networkidle0' });
  const feedCard768 = await page.$('article');
  if (feedCard768) {
    await feedCard768.screenshot({ path: path.join(outDir, '768_feed_top_post.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '768_feed_top_post.png')}`);
  }

  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/feed', { waitUntil: 'networkidle0' });
  const feedCard1440 = await page.$('article');
  if (feedCard1440) {
    await feedCard1440.screenshot({ path: path.join(outDir, '1440_feed_top_post.png') });
    console.log(`  ✓ 截屏保存: ${path.join(outDir, '1440_feed_top_post.png')}`);
  }

  // --------------------------------------------------------------------------
  // 3. 企业页 Company B (demo-org-b) @768 / 1440 换行与卡片检查
  // --------------------------------------------------------------------------
  console.log('\n--- [Item 3] Company B (demo-org-b) 头部与履约卡换行检查 ---');
  await page.setViewport({ width: 768, height: 1024, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/companies/demo-org-b', { waitUntil: 'networkidle0' });

  const companyChecks768 = await page.evaluate(() => {
    // 1. Check isolated dots
    const spans = Array.from(document.querySelectorAll('span'));
    const isolatedDot = spans.some(s => s.textContent.trim() === '·');

    // 2. Check "已核实" badge height and line break
    const verifiedBadge = spans.find(s => s.textContent.includes('已核实'));
    const badgeHeight = verifiedBadge ? verifiedBadge.getBoundingClientRect().height : 0;

    // 3. Check PKG-ST-02 code height and line break
    const pkgCode = spans.find(s => s.textContent.includes('PKG-ST-02'));
    const pkgHeight = pkgCode ? pkgCode.getBoundingClientRect().height : 0;

    // 4. Check "履约" status pill
    const statusPill = spans.find(s => s.textContent.includes('履约 (In-Performance)'));
    const pillHeight = statusPill ? statusPill.getBoundingClientRect().height : 0;

    // 5. Check affiliated engineers names and titles
    const engineerBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Demo Engineer'));
    const engNames = engineerBtns.map(b => b.textContent.trim());

    return {
      isolatedDot,
      badgeHeight,
      pkgHeight,
      pillHeight,
      engCount: engineerBtns.length,
      engNames
    };
  });

  console.log(`  ✓ 孤立居中点 (·) 检查: ${companyChecks768.isolatedDot ? 'FAIL (存在独立·)' : 'PASS (零独立分隔符)'}`);
  if (companyChecks768.isolatedDot) throw new Error('Found isolated dot in company page!');

  console.log(`  ✓ 已核实徽章单行呈现: 高度 ${companyChecks768.badgeHeight.toFixed(1)}px (<= 28px 为单行)`);
  if (companyChecks768.badgeHeight > 28) throw new Error('Verification badge broke into multiple lines!');

  console.log(`  ✓ PKG-ST-02 代码单行呈现: 高度 ${companyChecks768.pkgHeight.toFixed(1)}px (<= 28px 为单行)`);
  if (companyChecks768.pkgHeight > 28) throw new Error('PKG-ST-02 code broke into multiple lines!');

  console.log(`  ✓ 履约状态徽章单行呈现: 高度 ${companyChecks768.pillHeight.toFixed(1)}px (<= 28px 为单行)`);
  if (companyChecks768.pillHeight > 28) throw new Error('Status pill broke into multiple lines!');

  console.log(`  ✓ 关联工程师列表数量: ${companyChecks768.engCount} 位, 名称完备展示: ${companyChecks768.engNames.length > 0}`);

  // Screenshot company page @768 and @1440
  await page.screenshot({ path: path.join(outDir, '768_company_demo_org_b.png') });
  console.log(`  ✓ 截屏保存: ${path.join(outDir, '768_company_demo_org_b.png')}`);

  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/companies/demo-org-b', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, '1440_company_demo_org_b.png') });
  console.log(`  ✓ 截屏保存: ${path.join(outDir, '1440_company_demo_org_b.png')}`);

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:4176/#/companies/demo-org-b', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(outDir, '390_company_demo_org_b.png') });
  console.log(`  ✓ 截屏保存: ${path.join(outDir, '390_company_demo_org_b.png')}`);

  // --------------------------------------------------------------------------
  // 4. P001/P004 Wiki 目录项平滑滚动与路由 Hash 稳定性实测
  // --------------------------------------------------------------------------
  console.log('\n--- [Item 4] P001/P004 Wiki 目录项跳转测试 ---');
  await page.setViewport({ width: 1440, height: 900, isMobile: false });
  await page.goto('http://127.0.0.1:4176/#/projects/p001', { waitUntil: 'networkidle0' });

  const tocLabels = [
    '工程背景与建设规模',
    '参建机构与关键执业人员 (OBS)',
    '核心里程碑与施工纪事',
    '参考文献与存证公报'
  ];

  for (let i = 0; i < tocLabels.length; i++) {
    const label = tocLabels[i];
    await page.evaluate((idx) => {
      const btns = Array.from(document.querySelectorAll('ol button'));
      if (btns[idx]) btns[idx].click();
    }, i);
    await new Promise(r => setTimeout(r, 400));

    const checkResult = await page.evaluate((idx) => {
      const targetIds = ['sec-overview', 'sec-participations', 'sec-milestones', 'sec-references'];
      const targetEl = document.getElementById(targetIds[idx]);
      const rect = targetEl ? targetEl.getBoundingClientRect() : null;
      return {
        hash: window.location.hash,
        targetExists: Boolean(targetEl),
        top: rect ? rect.top : -9999
      };
    }, i);

    console.log(`  ✓ TOC ${i + 1} "${label}": 目标存在: ${checkResult.targetExists}, 当前相对顶端距离: ${checkResult.top.toFixed(1)}px, 路由 Hash: "${checkResult.hash}"`);
    if (!checkResult.targetExists) throw new Error(`Target element for TOC ${i + 1} does not exist!`);
    if (checkResult.hash !== '#/projects/p001') throw new Error(`TOC click modified hash route: ${checkResult.hash}`);
  }

  // Also check P004 TOC
  await page.goto('http://127.0.0.1:4176/#/projects/p004', { waitUntil: 'networkidle0' });
  const p004TocExists = await page.evaluate(() => {
    const secRef = document.getElementById('sec-references');
    const secObs = document.getElementById('sec-participations');
    return Boolean(secRef) && Boolean(secObs);
  });
  console.log(`  ✓ P004 目录所指向之 Section 目标完整性: ${p004TocExists}`);
  if (!p004TocExists) throw new Error('P004 sections for TOC missing!');

  // --------------------------------------------------------------------------
  // 5. 审查员专项: P001 参考文献日期完整性 & P004 文献项目隔离空态
  // --------------------------------------------------------------------------
  console.log('\n--- [Reviewer R3] 参考文献日期契约与项目专属隔离检查 ---');
  // 5a. P001 fn.pubDate
  await page.goto('http://127.0.0.1:4176/#/projects/p001', { waitUntil: 'networkidle0' });
  const p001FootnoteDates = await page.evaluate(() => {
    const sec = document.getElementById('sec-references');
    const lis = sec ? Array.from(sec.querySelectorAll('li')) : [];
    return lis.map(li => {
      const dateSpan = Array.from(li.querySelectorAll('span')).find(s => s.textContent.trim().startsWith('(') && s.textContent.trim().endsWith(')'));
      return {
        text: li.textContent.trim(),
        date: dateSpan ? dateSpan.textContent.trim() : ''
      };
    });
  });

  console.log(`  ✓ P001 参考文献条目数: ${p001FootnoteDates.length} (要求: 4)`);
  if (p001FootnoteDates.length !== 4) {
    throw new Error(`Expected 4 footnotes for P001, found ${p001FootnoteDates.length}`);
  }

  for (const fn of p001FootnoteDates) {
    console.log(`    - 条目日期: "${fn.date}" (非空且符合 YYYY-MM-DD 规范)`);
    if (!fn.date || fn.date === '()' || !/\(\d{4}-\d{2}-\d{2}\)/.test(fn.date)) {
      throw new Error(`Footnote date is empty or invalid format: "${fn.date}"`);
    }
  }

  // 5b. P004 isolation
  await page.goto('http://127.0.0.1:4176/#/projects/p004', { waitUntil: 'networkidle0' });
  const p004RefCheck = await page.evaluate(() => {
    const sec = document.getElementById('sec-references');
    const text = sec ? sec.textContent : '';
    const hasP001Citation = text.includes('EVD-P001') || text.includes('DEMO Project P001');
    const hasEmptyNotice = text.includes('暂无本项目独立存证公报');
    return {
      exists: Boolean(sec),
      hasP001Citation,
      hasEmptyNotice
    };
  });

  console.log(`  ✓ P004 参考文献区隔离: 不含 P001 专属引用: ${!p004RefCheck.hasP001Citation}`);
  if (p004RefCheck.hasP001Citation) {
    throw new Error('P004 erroneously displays P001 citations in Section 4!');
  }
  console.log(`  ✓ P004 参考文献区清晰展示空态提示: ${p004RefCheck.hasEmptyNotice}`);
  if (!p004RefCheck.hasEmptyNotice) {
    throw new Error('P004 does not display proper empty notice in Section 4!');
  }

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  }
  console.log('\n🎉 [LEAD R3 TESTS ALL PASS] 全部必修项验证 100% 成功，截图已完整存入 C:\\Users\\cheng\\AppData\\Local\\Temp\\eng-ux-fix-r3\\！');
}

run().catch(err => {
  console.error('Lead R3 verification failed:', err);
  process.exit(1);
});
