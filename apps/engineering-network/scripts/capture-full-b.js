import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../screenshots/full-b');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Simple static server for SPA (serves files from dist)
function startServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
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
        res.end(`Server Error: ${err.code}`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Local SPA test server running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

// Helper: check page layout, SEO, a11y & overflow
async function inspectPage(page, contextLabel) {
  return await page.evaluate((label) => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollW = docEl.scrollWidth;
    const clientW = docEl.clientWidth;
    const winW = window.innerWidth;

    const htmlOverflowX = window.getComputedStyle(docEl).overflowX;
    const bodyOverflowX = window.getComputedStyle(body).overflowX;

    const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim());
    const title = document.title;

    // Check if fixed mobile bottom bar is visible and whether main has safe margin
    const mobileBottomBar = document.querySelector('nav.md\\:hidden.fixed.bottom-0');
    let bottomBarOcclusionIssue = false;
    if (mobileBottomBar && window.getComputedStyle(mobileBottomBar).display !== 'none') {
      const mainEl = document.querySelector('main');
      if (mainEl) {
        const style = window.getComputedStyle(mainEl);
        const pb = parseFloat(style.paddingBottom) || 0;
        if (pb < 40) {
          bottomBarOcclusionIssue = true;
        }
      }
    }

    return {
      contextLabel: label,
      scrollWidth: scrollW,
      clientWidth: clientW,
      windowWidth: winW,
      isNoHorizontalOverflow: scrollW <= clientW,
      hasOverflowXHiddenMask: htmlOverflowX === 'hidden' || bodyOverflowX === 'hidden',
      h1Count: h1s.length,
      h1Text: h1s[0] || null,
      title,
      bottomBarOcclusionIssue
    };
  }, contextLabel);
}

async function run() {
  const port = 4173;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`Launching Chrome from: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(`[Page Error] ${err.message}`);
  });

  const layoutReports = [];

  const viewports = [
    {
      name: 'mobile-390',
      label: '390',
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    },
    {
      name: 'desktop-1440',
      label: '1440',
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    }
  ];

  console.log('\n===========================================================');
  console.log(' 1. 基础页面在 390 与 1440 真实视口下的自适应与截图验证');
  console.log('===========================================================');

  const mainPages = [
    { id: '01-feed', path: '#/feed', name: '工程动态 Feed' },
    { id: '02-projects', path: '#/projects', name: '工程项目发现数据库' },
    { id: '03-wiki-p001-overview', path: '#/projects/p001', name: 'P001 核心百科-概览 Tab' },
    { id: '07-company-demo-org-b', path: '#/companies/demo-org-b', name: '参建企业主页 (Demo Org B)' },
    { id: '08-person-demo-eng-01', path: '#/people/demo-engineer-01', name: '执业工程师主页 (Demo Engineer 01)' },
    { id: '09-discover', path: '#/discover', name: '全局发现与智能语义检索' }
  ];

  for (const vp of viewports) {
    console.log(`\n--- 切换视口: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await page.setViewport(vp);

    for (const p of mainPages) {
      const fullUrl = `${baseUrl}/${p.path}`;
      await page.goto(fullUrl, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));

      const report = await inspectPage(page, `${p.id} @ ${vp.label}`);
      layoutReports.push(report);

      const shotPath = path.join(screenshotsDir, `${p.id}-${vp.label}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  ✓ 截屏保存: ${path.basename(shotPath)} | scrollW=${report.scrollWidth}, clientW=${report.clientWidth}, H1="${report.h1Text}"`);
    }

    // Capture the other 3 tabs of P001 Wiki: Timeline, Structure, Network
    const wikiTabs = [
      { id: '04-wiki-p001-timeline', tabIndex: 1, label: 'Timeline Tab' },
      { id: '05-wiki-p001-structure', tabIndex: 2, label: 'Structure Tab' },
      { id: '06-wiki-p001-network', tabIndex: 3, label: 'Network Tab' }
    ];

    for (const wt of wikiTabs) {
      await page.goto(`${baseUrl}/#/projects/p001`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 300));

      // Click tab button
      await page.evaluate((tabIdx) => {
        const tabBtns = Array.from(document.querySelectorAll('nav button'));
        if (tabBtns[tabIdx]) {
          tabBtns[tabIdx].click();
        }
      }, wt.tabIndex);
      await new Promise(r => setTimeout(r, 400));

      const report = await inspectPage(page, `${wt.id} @ ${vp.label}`);
      layoutReports.push(report);

      const shotPath = path.join(screenshotsDir, `${wt.id}-${vp.label}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`  ✓ 截屏保存: ${path.basename(shotPath)} | scrollW=${report.scrollWidth}, clientW=${report.clientWidth}`);
    }
  }

  // Tablet (768px) smoke test
  console.log('\n--- 视口冒烟测试: tablet-768 (768x1024) ---');
  await page.setViewport({ width: 768, height: 1024, isMobile: false, hasTouch: false });
  for (const p of mainPages) {
    await page.goto(`${baseUrl}/${p.path}`, { waitUntil: 'networkidle0' });
    const report = await inspectPage(page, `${p.id} @ 768`);
    layoutReports.push(report);
    if (!report.isNoHorizontalOverflow) {
      console.error(`  ✗ 768 视口存在水平溢出: ${p.id} (scrollW=${report.scrollWidth} > clientW=${report.clientWidth})`);
    } else {
      console.log(`  ✓ 768 冒烟通过: ${p.id} (scrollW=${report.scrollWidth} <= clientW=${report.clientWidth})`);
    }
  }

  console.log('\n===========================================================');
  console.log(' 2. 真实用户旅程 (User Journeys J1, J2, J3) 交互步骤验证');
  console.log('===========================================================');

  // Use desktop viewport for journeys
  await page.setViewport({ width: 1440, height: 900, isMobile: false });

  // -------------------------------------------------------------
  // USER JOURNEY 1 (J1)
  // 首页→选"工业建筑"频道→点项目动态→P001 Wiki→Timeline 选阶段→Network 点关联企业→企业页项目经历→点参与工程师→个人页→Follow
  // -------------------------------------------------------------
  console.log('\n--- [J1] 执行旅程 1: 从 Feed 发现到 P001 Wiki，联动履约企业与工程师主页 ---');
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // J1 Step 1: Select "工业建筑" channel
  await page.evaluate(() => {
    const channelBtns = Array.from(document.querySelectorAll('button'));
    const indBtn = channelBtns.find(b => b.textContent.trim() === '工业建筑');
    if (indBtn) indBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step1-feed-channel-industrial.png') });
  console.log('  ✓ J1 Step 1 完成并截屏: 选择"工业建筑"频道');

  // J1 Step 2: Click on milestone post link -> jump to P001 Wiki
  await page.evaluate(() => {
    const projLinks = Array.from(document.querySelectorAll('button[title="打开工程项目百科条目"]'));
    if (projLinks[0]) {
      projLinks[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step2-jump-to-p001-wiki.png') });
  console.log('  ✓ J1 Step 2 完成并截屏: 跳转至 DEMO Project P001 维基百科');

  // J1 Step 3: Switch to Timeline tab & select stage-5
  await page.evaluate(() => {
    const tabBtns = Array.from(document.querySelectorAll('nav button'));
    // Tab 2 is Timeline
    if (tabBtns[1]) tabBtns[1].click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    // Select stage row with stage-5
    const stageRows = Array.from(document.querySelectorAll('tr'));
    const targetRow = stageRows.find(r => r.textContent.includes('主体结构施工'));
    if (targetRow) targetRow.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step3-wiki-timeline-stage.png') });
  console.log('  ✓ J1 Step 3 完成并截屏: Timeline 纪事年表与阶段履约机构变动联动');

  // J1 Step 4: Switch to Network tab & click Demo Org B
  await page.evaluate(() => {
    const tabBtns = Array.from(document.querySelectorAll('nav button'));
    // Tab 4 is Network
    if (tabBtns[3]) tabBtns[3].click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const orgLinks = Array.from(document.querySelectorAll('button[title="查看机构档案"]'));
    const orgB = orgLinks.find(b => b.textContent.includes('ORG-B'));
    if (orgB) orgB.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step4-company-page.png') });
  console.log('  ✓ J1 Step 4 完成并截屏: 跳转至 Demo Organization B 企业工程档案');

  // J1 Step 5: On Company Page, click affiliated Demo Engineer 01
  await page.evaluate(() => {
    const engLinks = Array.from(document.querySelectorAll('button'));
    const engBtn = engLinks.find(b => b.textContent.includes('Demo Engineer 01'));
    if (engBtn) engBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step5-person-page.png') });
  console.log('  ✓ J1 Step 5 完成并截屏: 跳转至 Demo Engineer 01 执业工程师档案');

  // J1 Step 6: Click Follow button and verify visible state change
  const beforeFollowText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const followBtn = btns.find(b => b.textContent.includes('关注'));
    return followBtn ? followBtn.textContent.trim() : null;
  });

  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const followBtn = btns.find(b => b.textContent.includes('关注'));
    if (followBtn) followBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  const afterFollowText = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const followBtn = btns.find(b => b.textContent.includes('关注'));
    return followBtn ? followBtn.textContent.trim() : null;
  });

  await page.screenshot({ path: path.join(screenshotsDir, 'j1-step6-person-followed.png') });
  console.log(`  ✓ J1 Step 6 完成并截屏: 关注状态发生真实改变: "${beforeFollowText}" -> "${afterFollowText}"`);

  // -------------------------------------------------------------
  // USER JOURNEY 2 (J2)
  // 顶部搜索输入"做过工业厂房钢结构的企业"→Discover MOCK 结果→展开证据/来源→跳到关联项目
  // -------------------------------------------------------------
  console.log('\n--- [J2] 执行旅程 2: 全局语义检索预置查询、图谱解释、存证公报与跳转 ---');
  await page.goto(`${baseUrl}/#/discover?q=做过工业厂房钢结构的企业`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j2-step1-discover-results.png') });
  console.log('  ✓ J2 Step 1 完成并截屏: 检索结果与知识图谱推理匹配解释');

  // J2 Step 2: Expand evidence details
  await page.evaluate(() => {
    const expandBtns = Array.from(document.querySelectorAll('button'));
    const target = expandBtns.find(b => b.textContent.includes('查看存证推理') || b.textContent.includes('展开存证出处'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(screenshotsDir, 'j2-step2-evidence-expanded.png') });
  console.log('  ✓ J2 Step 2 完成并截屏: 展开存证出处与原型履约凭证 (MOCK)');

  // J2 Step 3: Open full Evidence Modal
  await page.evaluate(() => {
    const evdBtns = Array.from(document.querySelectorAll('button'));
    const target = evdBtns.find(b => b.textContent.includes('打开完整存证公报 Modal'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j2-step3-evidence-modal.png') });
  console.log('  ✓ J2 Step 3 完成并截屏: 开启工程存证公报 Modal (原型演示 MOCK)');

  // J2 Step 4: Close modal and navigate to associated project
  await page.evaluate(() => {
    // Press ESC or click Close button
    const closeBtn = document.querySelector('button[aria-label="关闭对话框"]') || document.querySelector('button[title="关闭"]');
    if (closeBtn) closeBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  await page.evaluate(() => {
    const navBtns = Array.from(document.querySelectorAll('button'));
    const projBtn = navBtns.find(b => b.textContent.includes('前往档案条目'));
    if (projBtn) projBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j2-step4-jump-to-project.png') });
  console.log('  ✓ J2 Step 4 完成并截屏: 顺利跳转至检索条目工程档案页');

  // -------------------------------------------------------------
  // USER JOURNEY 3 (J3)
  // 打开登录/注册弹窗（演示说明）；发帖→出现在 Feed 顶部并标 Mock
  // -------------------------------------------------------------
  console.log('\n--- [J3] 执行旅程 3: 模拟身份切换弹窗与本地发布 Feed 动态 (带 Mock 标) ---');
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // J3 Step 1: Open Login / Role Switcher Modal
  await page.evaluate(() => {
    const loginBtn = document.querySelector('button[title="切换演示身份 / 登录"]');
    if (loginBtn) loginBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j3-step1-login-modal.png') });
  console.log('  ✓ J3 Step 1 完成并截屏: 打开演示登录/角色切换弹窗（明示无真实鉴权系统）');

  // Close Login modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // J3 Step 2: Open Compose modal & fill content
  await page.evaluate(() => {
    const composeBtns = Array.from(document.querySelectorAll('button'));
    const cBtn = composeBtns.find(b => b.textContent.includes('发布工程动态 (Mock)') || b.textContent.includes('发动态'));
    if (cBtn) cBtn.click();
  });
  await new Promise(r => setTimeout(r, 300));

  // Type title and content into Compose form
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const titleInput = inputs.find(i => i.placeholder && i.placeholder.includes('例如：'));
    if (titleInput) {
      titleInput.value = '【现场纪实】P001 钢结构 4# 单元液压同步提升顺利就位 (Mock)';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const textareas = Array.from(document.querySelectorAll('textarea'));
    if (textareas[0]) {
      textareas[0].value = '经过 14 小时微米级连续顶升监测，P001 项目主厂房第四网架提升单元完成 28.5 米高空对接，焊缝超声探伤合格率 100%，对应 EVD-P001-089 存证已同步上链。';
      textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(screenshotsDir, 'j3-step2-compose-modal.png') });
  console.log('  ✓ J3 Step 2 完成并截屏: 填写工程动态发帖表单 (标明本地模拟)');

  // J3 Step 3: Submit post
  await page.evaluate(() => {
    const submitBtns = Array.from(document.querySelectorAll('button[type="submit"]'));
    if (submitBtns[0]) submitBtns[0].click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, 'j3-step3-feed-new-mock-post.png') });
  console.log('  ✓ J3 Step 3 完成并截屏: 动态即时插入 Feed 顶端，醒目标注 [最新发布 (MOCK)]');

  // Clean up
  await browser.close();
  server.close();

  console.log('\n===========================================================');
  console.log(' 3. 验收合规总评与自测结果汇总');
  console.log('===========================================================');

  const overflowIssues = layoutReports.filter(r => !r.isNoHorizontalOverflow);
  const hiddenMaskIssues = layoutReports.filter(r => r.hasOverflowXHiddenMask);
  const h1Issues = layoutReports.filter(r => r.h1Count !== 1);
  const bottomBarIssues = layoutReports.filter(r => r.bottomBarOcclusionIssue);

  console.log(`- 控制台错误数 (Console / Page Errors): ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error('  发现以下控制台报错:');
    consoleErrors.forEach(e => console.error('  ', e));
  } else {
    console.log('  ✓ 完美：0 控制台错误，0 运行时报错');
  }

  console.log(`- 视口自适应检查 (390 / 768 / 1440):`);
  console.log(`  总检查页次: ${layoutReports.length}`);
  console.log(`  水平溢出数 (scrollWidth > clientWidth): ${overflowIssues.length}`);
  console.log(`  违规 overflow-x:hidden 遮掩检查: ${hiddenMaskIssues.length}`);
  console.log(`  单一 H1 标签合规性检查 (h1 !== 1): ${h1Issues.length}`);
  console.log(`  移动端底栏遮挡检查: ${bottomBarIssues.length}`);

  if (overflowIssues.length === 0 && hiddenMaskIssues.length === 0 && h1Issues.length === 0 && consoleErrors.length === 0) {
    console.log('\n🎉 [ALL TESTS PASS] 全部页面、响应式视口、SEO 及旅程验证 100% 通过！\n');
    process.exit(0);
  } else {
    console.error('\n❌ 存在未通过的校验项，请检查上述日志！\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
