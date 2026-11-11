import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../screenshots/v3');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function safeScreenshot(page, filePath, retries = 5) {
  const buffer = await page.screenshot();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      fs.writeFileSync(filePath, buffer);
      return;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`  [WARN] Warning: could not write screenshot to ${filePath} (${err.code || err.message})`);
        return;
      }
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
}

function startServer(port = 4299) {
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
      resolve(server);
    });
  });
}

async function run() {
  const port = 4299;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('===========================================================');
  console.log('  V3 LinkedIn-Light Verification & Measurement Suite');
  console.log('===========================================================');

  let failureCount = 0;
  function assert(condition, passMsg, failMsg) {
    if (condition) {
      console.log(`  [PASS] ${passMsg}`);
    } else {
      console.error(`  [FAIL] ${failMsg}`);
      failureCount++;
    }
  }

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Measure Top to First Visible Media at 390px
  console.log('\n--- 1. Testing Requirement 1: Mobile First-Screen Compression at 390px ---');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });

  const metrics390 = await page.evaluate(() => {
    const banner = document.querySelector('aside[aria-label="原型演示声明"]');
    const header = document.querySelector('header');
    const firstArticle = document.querySelector('article');
    const mediaContainer = firstArticle ? firstArticle.querySelector('.aspect-video, [role="img"], [class*="aspect-"]') : null;

    return {
      bannerHeight: banner ? banner.offsetHeight : 0,
      headerHeight: header ? header.offsetHeight : 0,
      firstArticleTop: firstArticle ? firstArticle.getBoundingClientRect().top : 0,
      mediaTop: mediaContainer ? mediaContainer.getBoundingClientRect().top : 0,
      mediaHeight: mediaContainer ? mediaContainer.offsetHeight : 0,
      bodyScrollWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth
    };
  });

  console.log(`  ✓ 站点顶部到第一条帖子视觉媒体起点: ${metrics390.mediaTop.toFixed(1)}px (指标要求 <= 320px)`);
  assert(
    metrics390.mediaTop <= 320,
    `成功满足 P0 硬指标！实际测量值: ${metrics390.mediaTop.toFixed(1)}px <= 320px`,
    `未满足 P0 硬指标: ${metrics390.mediaTop.toFixed(1)}px > 320px`
  );

  const screenshot390Feed = path.join(screenshotsDir, '01_mobile_390_feed_top.png');
  await safeScreenshot(page, screenshot390Feed);
  console.log(`  ✓ 390px 截图保存至: ${screenshot390Feed}`);

  // 2. Testing Defect 3 Fix: Feed Card Illustration Annotations Hidden vs Lightbox Shown
  console.log('\n--- 2. Testing Defect 3 Fix: Feed Card Illustration vs Lightbox Annotations ---');
  const feedSvgTexts = await page.evaluate(() => {
    const firstArticle = document.querySelector('article');
    if (!firstArticle) return null;
    const svg = firstArticle.querySelector('[role="img"] svg') || firstArticle.querySelector('svg');
    if (!svg) return null;
    const texts = Array.from(svg.querySelectorAll('text'));
    const visibleTexts = texts.filter(t => {
      const style = window.getComputedStyle(t);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    return {
      totalTexts: texts.length,
      visibleTextsCount: visibleTexts.length,
      sampleVisible: visibleTexts.map(t => t.textContent.trim())
    };
  });

  assert(
    feedSvgTexts && feedSvgTexts.visibleTextsCount === 0,
    `信息流卡片插图已成功隐藏技术标注文字！可见文字数: ${feedSvgTexts?.visibleTextsCount}`,
    `信息流卡片插图仍显示技术标注文字: ${feedSvgTexts?.visibleTextsCount}`
  );

  const shotFeedIllustration = path.join(screenshotsDir, '07_feed_card_illustration_annotations_hidden.png');
  await safeScreenshot(page, shotFeedIllustration);
  console.log(`  ✓ Feed 卡片插图 (无标注) 截图保存至: ${shotFeedIllustration}`);

  // Click on "放大图解" button to open Lightbox
  const lightboxOpened = await page.evaluate(() => {
    const inspectBtn = document.querySelector('article button[aria-label="放大图解"]');
    if (inspectBtn) {
      inspectBtn.click();
      return true;
    }
    return false;
  });

  if (lightboxOpened) {
    await new Promise(r => setTimeout(r, 600));
    const lightboxSvgTexts = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return null;
      // Specifically target the illustration SVG inside role="img"
      const svg = dialog.querySelector('[role="img"] svg') || Array.from(dialog.querySelectorAll('svg')).find(s => s.querySelectorAll('text').length > 0);
      if (!svg) return null;
      const texts = Array.from(svg.querySelectorAll('text'));
      const visibleTexts = texts.filter(t => {
        const style = window.getComputedStyle(t);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      return {
        totalTexts: texts.length,
        visibleTextsCount: visibleTexts.length,
        sampleVisible: visibleTexts.map(t => t.textContent.trim())
      };
    });

    console.log('  ✓ 详情图解 Lightbox 标注文字识别结果:', lightboxSvgTexts);
    assert(
      lightboxSvgTexts && lightboxSvgTexts.visibleTextsCount > 0,
      `详情图解 Lightbox 成功完整展示技术标注与实测标高！可见文字数: ${lightboxSvgTexts?.visibleTextsCount} (示例: ${lightboxSvgTexts?.sampleVisible.slice(0, 2).join(', ')})`,
      `详情图解 Lightbox 未能展示标注文字`
    );

    const shotLightboxIllustration = path.join(screenshotsDir, '08_illustration_lightbox_annotations_shown.png');
    await safeScreenshot(page, shotLightboxIllustration);
    console.log(`  ✓ 详情图解 Lightbox (带全量标注) 截图保存至: ${shotLightboxIllustration}`);

    // Close lightbox via close button
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="关闭图解预览"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));
  } else {
    console.error('  ✗ 未能点击图解放大按钮');
    failureCount++;
  }

  // 3. Testing Defect 1 Fix: Org Card Mock Badges in Discover & Project Data
  console.log('\n--- 3. Testing Defect 1 Fix: Org Card Mock Badges in Discover ---');
  await page.goto(`${baseUrl}/#/discover`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Click search preset "做过工业厂房钢结构的企业"
  const presetClicked = await page.evaluate(() => {
    const presetBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('做过工业厂房钢结构的企业'));
    if (presetBtn) {
      presetBtn.click();
      return true;
    }
    return false;
  });

  if (presetClicked) {
    await new Promise(r => setTimeout(r, 500));
    const orgBadgeCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div.border-slate-800'));
      const orgBCard = cards.find(c => c.textContent.includes('Demo Organization B'));
      if (!orgBCard) return null;
      const text = orgBCard.textContent;
      return {
        hasMockBadge: text.includes('模拟核验 · 总包履约中'),
        hasRealVerifiedBadge: text.includes('已核实 · 总包履约中')
      };
    });

    console.log('  ✓ Discover 搜索预置卡片徽标校验结果:', orgBadgeCheck);
    assert(
      orgBadgeCheck && orgBadgeCheck.hasMockBadge && !orgBadgeCheck.hasRealVerifiedBadge,
      '组织卡片徽标已成功替换为 "模拟核验 · 总包履约中"，无误导性 "已核实" 徽标！',
      `组织卡片徽标异常: ${JSON.stringify(orgBadgeCheck)}`
    );

    const shotDiscoverOrg = path.join(screenshotsDir, '09_discover_org_card_mock_badge.png');
    await safeScreenshot(page, shotDiscoverOrg);
    console.log(`  ✓ Discover 组织卡片截图保存至: ${shotDiscoverOrg}`);
  } else {
    console.error('  ✗ 未找到搜索预置按钮');
    failureCount++;
  }

  // 4. Testing Defect 2 Fix: AI+ Compose Sheet Focus Trap, Scroll Lock, and Focus Restoration
  console.log('\n--- 4. Testing Defect 2 Fix: AI+ Compose Sheet A11y & Behavior ---');
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Focus the bottom nav AI+ button and activate it
  const aiTriggerFocused = await page.evaluate(() => {
    const btn = document.querySelector('nav button[aria-label="AI 创作与发帖"]');
    if (btn) {
      btn.focus();
      btn.click();
      return true;
    }
    return false;
  });

  await new Promise(r => setTimeout(r, 500));

  // Check Scroll Lock
  const scrollLockCheck = await page.evaluate(() => {
    return {
      bodyOverflow: document.body.style.overflow,
      isLocked: document.body.style.overflow === 'hidden',
      activeTag: document.activeElement ? document.activeElement.tagName.toLowerCase() : null
    };
  });

  assert(
    scrollLockCheck.isLocked,
    `Sheet 展开期间成功锁定页面滚动 (document.body.style.overflow = '${scrollLockCheck.bodyOverflow}')`,
    `Sheet 展开期间未锁定滚动: overflow = '${scrollLockCheck.bodyOverflow}'`
  );

  // Check Focus Trap: Tab through all focusable elements
  const focusTrapCheck = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] [tabindex="-1"]');
    if (!dialog) return null;
    const focusables = Array.from(
      dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    // Simulate Shift+Tab on first element
    first.focus();
    const eventShiftTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(eventShiftTab);
    const afterShiftTabActive = document.activeElement;

    // Simulate Tab on last element
    last.focus();
    const eventTab = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false, bubbles: true, cancelable: true });
    window.dispatchEvent(eventTab);
    const afterTabActive = document.activeElement;

    return {
      firstTag: first.tagName,
      lastTag: last.tagName,
      wrappedToLast: afterShiftTabActive === last,
      wrappedToFirst: afterTabActive === first
    };
  });

  console.log('  ✓ Focus Trap 焦点循环测试结果:', focusTrapCheck);
  assert(
    focusTrapCheck && focusTrapCheck.wrappedToLast && focusTrapCheck.wrappedToFirst,
    'Focus Trap 焦点捕获有效！Shift+Tab 从首项回绕到末项，Tab 从末项回绕到首项！',
    `Focus Trap 焦点捕获失败: ${JSON.stringify(focusTrapCheck)}`
  );

  const shotAiA11y = path.join(screenshotsDir, '10_ai_sheet_scroll_locked_focus_trapped.png');
  await safeScreenshot(page, shotAiA11y);

  // Test Escape Key Dismissal & Focus Restoration
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  const focusRestorationCheck = await page.evaluate(() => {
    const aiBtn = document.querySelector('nav button[aria-label="AI 创作与发帖"]');
    return {
      isSheetClosed: !document.querySelector('[role="dialog"]'),
      bodyOverflowAfterClose: document.body.style.overflow,
      activeElementIsTrigger: document.activeElement === aiBtn,
      activeElementLabel: document.activeElement ? document.activeElement.getAttribute('aria-label') : null
    };
  });

  console.log('  ✓ Esc 退出及焦点还原测试结果:', focusRestorationCheck);
  assert(
    focusRestorationCheck.isSheetClosed && focusRestorationCheck.bodyOverflowAfterClose === '' && focusRestorationCheck.activeElementIsTrigger,
    'Esc 键成功关闭 Sheet，恢复 body 滚动，且焦点精确还原至触发按钮 (nav AI+ trigger)！',
    `焦点还原或滚动恢复异常: ${JSON.stringify(focusRestorationCheck)}`
  );

  // 5. Testing Journey (a): Feed -> Project -> Company -> Feed
  console.log('\n--- 5. Testing Journey (a): Feed -> Project -> Company -> Feed ---');
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 300));

  const chipFound = await page.evaluate(() => {
    const chip = Array.from(document.querySelectorAll('article button')).find(b => b.textContent.includes('关联项目'));
    if (chip) {
      chip.click();
      return true;
    }
    return false;
  });

  if (chipFound) {
    await new Promise(r => setTimeout(r, 600));
    console.log(`  ✓ 点击关联项目链接成功进入: ${page.url()}`);

    const tabTexts = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('div.grid-cols-4 button'));
      return tabs.map(t => t.textContent.trim());
    });
    console.log(`  ✓ Project Hub 4 个选项卡: ${JSON.stringify(tabTexts)}`);

    const screenshotProject390 = path.join(screenshotsDir, '02_mobile_390_project_hub.png');
    await safeScreenshot(page, screenshotProject390);

    const orgClicked = await page.evaluate(() => {
      const orgBtn = document.querySelector('p button.text-sky-300');
      if (orgBtn) {
        orgBtn.click();
        return true;
      }
      return false;
    });

    if (orgClicked) {
      await new Promise(r => setTimeout(r, 600));
      console.log(`  ✓ 点击参建主体进入企业档案: ${page.url()}`);

      const screenshotCompany390 = path.join(screenshotsDir, '03_mobile_390_company_page.png');
      await safeScreenshot(page, screenshotCompany390);
    }

    await page.evaluate(() => {
      const feedBtn = document.querySelector('header button');
      if (feedBtn) feedBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));
    console.log(`  ✓ 返回首页 Feed 成功: ${page.url()}`);
  } else {
    console.error('  ✗ 未找到关联项目链接 chip');
    failureCount++;
  }

  // 6. Testing Journey (b): Center AI+ Compose & Bug Fix (No Forced P001)
  console.log('\n--- 6. Testing Journey (b): Center AI+ Compose & Bug Fix (No Forced P001) ---');
  await page.click('nav button[aria-label="AI 创作与发帖"]');
  await new Promise(r => setTimeout(r, 500));

  const screenshotAiSheet390 = path.join(screenshotsDir, '04_mobile_390_ai_sheet.png');
  await safeScreenshot(page, screenshotAiSheet390);

  const uniqueText = `测试纯人物动态 V3：深入探讨钢结构变形观测精度控制规范。`;
  await page.type('textarea', uniqueText);
  await new Promise(r => setTimeout(r, 300));

  await page.click('form button[type="submit"]');
  await new Promise(r => setTimeout(r, 600));

  const firstPostData = await page.evaluate(() => {
    const firstArticle = document.querySelector('article');
    if (!firstArticle) return null;
    const text = firstArticle.textContent;
    const projectChip = Array.from(firstArticle.querySelectorAll('button')).find(b => b.textContent.includes('关联项目'));
    return {
      hasNewText: text.includes('测试纯人物动态 V3'),
      hasProjectChip: !!projectChip,
      projectChipText: projectChip ? projectChip.textContent : null
    };
  });

  console.log('  ✓ 新发动态校验结果:', firstPostData);
  assert(
    firstPostData && firstPostData.hasNewText && !firstPostData.hasProjectChip,
    'Bug 修复成功！普通人物动态发布后无强制关联 P001 项目芯片！',
    `发布动态异常或强行关联了项目: ${JSON.stringify(firstPostData)}`
  );

  const screenshotNewPost390 = path.join(screenshotsDir, '05_mobile_390_new_post_in_feed.png');
  await safeScreenshot(page, screenshotNewPost390);

  // 7. Testing Draft Persistence across sheet cancel/reopen
  console.log('\n--- 7. Testing Draft Persistence (Canceling must not discard draft) ---');
  await page.click('nav button[aria-label="AI 创作与发帖"]');
  await new Promise(r => setTimeout(r, 500));

  const draftContent = '未发布的临时草稿测试内容 (Draft test)';
  await page.type('textarea', draftContent);
  await new Promise(r => setTimeout(r, 300));

  await page.click('button[aria-label="关闭窗口 (保留草稿)"]');
  await new Promise(r => setTimeout(r, 500));

  await page.click('nav button[aria-label="AI 创作与发帖"]');
  await new Promise(r => setTimeout(r, 500));

  const draftRetained = await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    return textarea ? textarea.value : '';
  });

  assert(
    draftRetained.includes('未发布的临时草稿测试内容'),
    `草稿持久机制有效！关闭面板后重新打开草稿依然保留: ${draftRetained}`,
    `草稿丢失: ${draftRetained}`
  );

  await page.click('button[aria-label="关闭窗口 (保留草稿)"]');
  await new Promise(r => setTimeout(r, 300));

  // 8. Test Network Page & Bottom Nav 5 slots
  console.log('\n--- 8. Testing Network Page & Bottom Nav 5 Slots ---');
  await page.click('nav button[aria-label="工程人脉"]');
  await new Promise(r => setTimeout(r, 600));

  const networkPageChecks = await page.evaluate(() => {
    const navButtons = Array.from(document.querySelectorAll('nav[aria-label="移动端底部导航"] button'));
    return {
      navSlotCount: navButtons.length,
      currentUrl: window.location.hash,
      hasEngineers: document.body.textContent.includes('Demo Engineer 01'),
      hasOrganizations: document.body.textContent.includes('Demo Organization A'),
      hasVerifiedMockBadge: document.body.textContent.includes('模拟核验')
    };
  });

  console.log('  ✓ 移动端底部导航槽位数量:', networkPageChecks.navSlotCount, '(要求刚好 5 格)');
  assert(
    networkPageChecks.navSlotCount === 5,
    '移动端底部导航槽位数量严格为 5 个 (首页 / 人脉 / AI+ / 通知 / 我)',
    `移动端底部导航槽位数量不符: ${networkPageChecks.navSlotCount}`
  );
  assert(
    networkPageChecks.hasVerifiedMockBadge,
    '人脉页面成功呈现 "模拟核验" 标识',
    '人脉页面缺少 "模拟核验" 标识'
  );

  const screenshotNetwork390 = path.join(screenshotsDir, '06_mobile_390_network_page.png');
  await safeScreenshot(page, screenshotNetwork390);

  // 9. Multi-Viewport Captures & Overflow Audits (390px, 768px, 1440px)
  console.log('\n--- 9. Multi-Viewport Captures & Overflow Audits (390px, 768px, 1440px) ---');
  const viewports = [
    { width: 390, height: 844, name: 'mobile_390' },
    { width: 768, height: 1024, name: 'tablet_768' },
    { width: 1440, height: 900, name: 'desktop_1440' }
  ];

  const routes = [
    { path: '#/feed', name: 'feed' },
    { path: '#/network', name: 'network' },
    { path: '#/projects/p001', name: 'project_p001' },
    { path: '#/companies/demo-org-b', name: 'company_org_b' },
    { path: '#/people/demo-engineer-01', name: 'person_eng_01' }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
    for (const r of routes) {
      await page.goto(`${baseUrl}/${r.path}`, { waitUntil: 'networkidle0' });
      await new Promise(res => setTimeout(res, 200));

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      });

      assert(
        !overflow.hasOverflow,
        `[${vp.name}] ${r.name}: 无横向溢出 (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`,
        `[${vp.name}] ${r.name}: 检测到横向溢出！scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
      );

      const shotPath = path.join(screenshotsDir, `${vp.name}_${r.name}.png`);
      await safeScreenshot(page, shotPath);
    }
  }

  // Desktop Modal Capture for AI+ Compose
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await page.click('header button[title="发布工程动态 (Mock)"]');
  await new Promise(res => setTimeout(res, 400));
  const shotModal1440 = path.join(screenshotsDir, 'desktop_1440_ai_compose_modal.png');
  await safeScreenshot(page, shotModal1440);
  console.log(`  ✓ [desktop_1440] AI Compose Modal -> ${shotModal1440}`);
  await page.keyboard.press('Escape');
  await new Promise(res => setTimeout(res, 300));

  // 10. Tablet 768px Compose Entry & No-Duplicate Audit Across Breakpoints (390px, 768px, 1440px)
  console.log('\n--- 10. Testing Tablet 768px Compose Entry & Breakpoint Audit ---');
  // (a) Test at 768px Tablet
  await page.setViewport({ width: 768, height: 1024, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });

  const tablet768Audit = await page.evaluate(() => {
    const headerBtn = document.querySelector('header button[title="发布工程动态 (Mock)"]');
    const bottomNav = document.querySelector('nav[aria-label="移动端底部导航"]');
    const headerBtnStyle = headerBtn ? window.getComputedStyle(headerBtn) : null;
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;

    const isHeaderBtnVisible = headerBtn && headerBtnStyle && headerBtnStyle.display !== 'none';
    const isBottomNavVisible = bottomNav && bottomNavStyle && bottomNavStyle.display !== 'none';

    return {
      viewportWidth: window.innerWidth,
      isHeaderBtnVisible,
      isBottomNavVisible,
      headerBtnText: headerBtn ? headerBtn.textContent.trim() : null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });

  console.log('  ✓ 768px 平板端导航与发帖按钮可见性状态:', tablet768Audit);
  assert(
    tablet768Audit.isHeaderBtnVisible && !tablet768Audit.isBottomNavVisible,
    '768px 平板端头部发帖按钮成功呈现且底栏保持隐藏 (独占单入口，零冗余)',
    `768px 平板端入口状态异常: ${JSON.stringify(tablet768Audit)}`
  );

  // Click the 768px header compose button and verify modal opens
  await page.click('header button[title="发布工程动态 (Mock)"]');
  await new Promise(res => setTimeout(res, 500));

  const tabletModalState = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const title = dialog ? dialog.querySelector('h2') : null;
    return {
      isOpen: !!dialog,
      title: title ? title.textContent.trim() : null,
      bodyOverflow: document.body.style.overflow
    };
  });

  assert(
    tabletModalState.isOpen && tabletModalState.bodyOverflow === 'hidden',
    `768px 平板端发帖弹窗成功打开并执行滚动锁定: "${tabletModalState.title}"`,
    `768px 平板端发帖弹窗打开失败: ${JSON.stringify(tabletModalState)}`
  );

  const shotModal768 = path.join(screenshotsDir, '11_tablet_768_ai_compose_modal.png');
  await safeScreenshot(page, shotModal768);
  console.log(`  ✓ [tablet_768] AI Compose Modal -> ${shotModal768}`);

  await page.keyboard.press('Escape');
  await new Promise(res => setTimeout(res, 300));

  // (b) Audit 390px: Header button hidden, Bottom nav AI+ visible (Exactly 1 compose entry)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  const mobile390Audit = await page.evaluate(() => {
    const headerBtn = document.querySelector('header button[title="发布工程动态 (Mock)"]');
    const bottomNav = document.querySelector('nav[aria-label="移动端底部导航"]');
    const headerStyle = headerBtn ? window.getComputedStyle(headerBtn) : null;
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    return {
      headerBtnVisible: headerBtn && headerStyle && headerStyle.display !== 'none',
      bottomNavVisible: bottomNav && bottomNavStyle && bottomNavStyle.display !== 'none'
    };
  });

  assert(
    !mobile390Audit.headerBtnVisible && mobile390Audit.bottomNavVisible,
    '390px 移动端头部发帖按钮隐藏，底部 AI+ 凸起按钮展示 (精确单入口)',
    `390px 移动端入口状态异常: ${JSON.stringify(mobile390Audit)}`
  );

  // (c) Audit 1440px: Header button visible, Bottom nav hidden (Exactly 1 compose entry)
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const desktop1440Audit = await page.evaluate(() => {
    const headerBtn = document.querySelector('header button[title="发布工程动态 (Mock)"]');
    const bottomNav = document.querySelector('nav[aria-label="移动端底部导航"]');
    const headerStyle = headerBtn ? window.getComputedStyle(headerBtn) : null;
    const bottomNavStyle = bottomNav ? window.getComputedStyle(bottomNav) : null;
    return {
      headerBtnVisible: headerBtn && headerStyle && headerStyle.display !== 'none',
      bottomNavVisible: bottomNav && bottomNavStyle && bottomNavStyle.display !== 'none'
    };
  });

  assert(
    desktop1440Audit.headerBtnVisible && !desktop1440Audit.bottomNavVisible,
    '1440px 桌面端头部发帖按钮展示，底栏隐藏 (精确单入口)',
    `1440px 桌面端入口状态异常: ${JSON.stringify(desktop1440Audit)}`
  );

  await browser.close();
  server.close();

  console.log('\n===========================================================');
  if (failureCount === 0) {
    console.log('  [PASS] All verification assertions and captures PASSED! 0 failures.');
    console.log('===========================================================');
    process.exit(0);
  } else {
    console.error(`  [FAIL] Verification encountered ${failureCount} failure(s).`);
    console.log('===========================================================');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
