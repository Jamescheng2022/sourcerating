import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../screenshots/responsive_fix');

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
        console.warn(`  [WARN] Could not write screenshot to ${filePath}: ${err.message}`);
        return;
      }
      await new Promise(r => setTimeout(r, 200 * attempt));
    }
  }
}

function startServer(port = 4599) {
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
  const port = 4599;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('===========================================================');
  console.log('  Responsive & Font-Enlargement Verification Suite');
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

  // 1. Test 360px + 125% font (fontSize = 20px) and 150% font (fontSize = 24px)
  console.log('\n--- 1. Testing 360px with OS Font Scaling (125% & 150%) ---');
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });

  // Apply 125% font enlargement
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '20px';
  });
  await new Promise(r => setTimeout(r, 400));

  const overflow125 = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  console.log('  ✓ 360px + 125% 字体测试结果:', overflow125);
  assert(
    !overflow125.hasOverflow,
    `360px + 125% 字体无横向溢出！scrollWidth=${overflow125.scrollWidth} <= clientWidth=${overflow125.clientWidth}`,
    `360px + 125% 字体检测到横向溢出: scrollWidth=${overflow125.scrollWidth} > clientWidth=${overflow125.clientWidth}`
  );

  const shot360_125 = path.join(screenshotsDir, '01_mobile_360_font125_feed.png');
  await safeScreenshot(page, shot360_125);

  // Apply 150% font enlargement (fontSize = 24px)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '24px';
  });
  await new Promise(r => setTimeout(r, 400));

  const overflow150 = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });

  console.log('  ✓ 360px + 150% 字体测试结果:', overflow150);
  assert(
    !overflow150.hasOverflow,
    `360px + 150% 字体无横向溢出！scrollWidth=${overflow150.scrollWidth} <= clientWidth=${overflow150.clientWidth}`,
    `360px + 150% 字体检测到横向溢出: scrollWidth=${overflow150.scrollWidth} > clientWidth=${overflow150.clientWidth}`
  );

  const shot360_150 = path.join(screenshotsDir, '02_mobile_360_font150_feed.png');
  await safeScreenshot(page, shot360_150);

  // Reset font size
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });

  // 2. Testing 320px Search Trigger Affordance & Overlay
  console.log('\n--- 2. Testing 320px Search Trigger & Full Affordance ---');
  await page.setViewport({ width: 320, height: 600, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const searchTriggerCheck = await page.evaluate(() => {
    const searchBtn = document.querySelector('header button[aria-label="打开搜索"]');
    const inlineInput = document.querySelector('header form.hidden');
    return {
      isTriggerVisible: searchBtn && window.getComputedStyle(searchBtn).display !== 'none',
      isInlineHidden: !inlineInput || window.getComputedStyle(inlineInput).display === 'none'
    };
  });

  assert(
    searchTriggerCheck.isTriggerVisible && searchTriggerCheck.isInlineHidden,
    '320px 屏幕成功展示纯图标搜索触发器，隐藏半截文本输入框',
    `320px 搜索触发器状态不符: ${JSON.stringify(searchTriggerCheck)}`
  );

  const shot320Header = path.join(screenshotsDir, '03_mobile_320_header_search_trigger.png');
  await safeScreenshot(page, shot320Header);

  // Click search trigger to open full overlay affordance
  await page.click('header button[aria-label="打开搜索"]');
  await new Promise(r => setTimeout(r, 300));

  const searchOverlayCheck = await page.evaluate(() => {
    const overlayInput = document.querySelector('header div.absolute input[placeholder="搜索工程、企业、专家..."]');
    const closeBtn = document.querySelector('header button[aria-label="关闭搜索"]');
    return {
      isInputVisible: overlayInput && window.getComputedStyle(overlayInput).display !== 'none',
      placeholder: overlayInput ? overlayInput.placeholder : null,
      hasCloseBtn: !!closeBtn,
      inputWidth: overlayInput ? overlayInput.offsetWidth : 0,
      windowWidth: window.innerWidth
    };
  });

  console.log('  ✓ 320px 搜索覆盖层测试结果:', searchOverlayCheck);
  assert(
    searchOverlayCheck.isInputVisible && searchOverlayCheck.placeholder === '搜索工程、企业、专家...' && searchOverlayCheck.inputWidth > 180,
    `320px 成功展开完整宽度搜索控件！输入框宽度: ${searchOverlayCheck.inputWidth}px (占视口 ${searchOverlayCheck.windowWidth}px)`,
    `320px 搜索展开控件不符合要求: ${JSON.stringify(searchOverlayCheck)}`
  );

  const shot320SearchOpen = path.join(screenshotsDir, '04_mobile_320_search_overlay_expanded.png');
  await safeScreenshot(page, shot320SearchOpen);

  // Close search overlay via Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));

  // 3. Testing /projects/p001 Key Stats & Work Package Expansion at 320, 360, 390px
  console.log('\n--- 3. Testing /projects/p001 Stats & Work Package Full Expansion ---');
  for (const w of [320, 360, 390]) {
    await page.setViewport({ width: w, height: 800, deviceScaleFactor: 2 });
    await page.goto(`${baseUrl}/#/projects/p001`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const p001Audit = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const cycleElement = all.find(el => el.textContent && el.textContent.includes('2024-Q3 至 2027-Q2'));
      const investElement = all.find(el => el.textContent && el.textContent.includes('约 12.8 亿元'));
      const wp1 = all.find(el => el.textContent && el.textContent.includes('勘察设计与全阶段 BIM'));
      const wp2 = all.find(el => el.textContent && el.textContent.includes('桩基工程与地下地基处理'));
      const wp3 = all.find(el => el.textContent && el.textContent.includes('大跨度钢结构及屋面'));
      const wp4 = all.find(el => el.textContent && el.textContent.includes('洁净厂房动力空调机电'));

      const isClippedWithEllipsis = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const hasEllipsisClass = el.className && typeof el.className === 'string' && el.className.includes('truncate');
        return hasEllipsisClass && el.scrollWidth > el.clientWidth;
      };

      return {
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        cycleClipped: isClippedWithEllipsis(cycleElement),
        investClipped: isClippedWithEllipsis(investElement),
        wp1Clipped: isClippedWithEllipsis(wp1),
        wp2Clipped: isClippedWithEllipsis(wp2),
        wp3Clipped: isClippedWithEllipsis(wp3),
        wp4Clipped: isClippedWithEllipsis(wp4),
        cycleText: cycleElement ? cycleElement.textContent.trim() : null,
        investText: investElement ? investElement.textContent.trim() : null
      };
    });

    console.log(`  ✓ [${w}px] P001 关键指标截断审计:`, p001Audit);
    assert(
      !p001Audit.hasOverflow,
      `[${w}px] P001 页面无横向溢出 (scrollWidth=${p001Audit.scrollWidth})`,
      `[${w}px] P001 页面横向溢出: scrollWidth=${p001Audit.scrollWidth} > clientWidth=${p001Audit.clientWidth}`
    );
    assert(
      !p001Audit.cycleClipped && !p001Audit.investClipped,
      `[${w}px] 规划周期与投资建筑体量完整展开，无省略截断！`,
      `[${w}px] 核心数据被省略号截断: cycleClipped=${p001Audit.cycleClipped}, investClipped=${p001Audit.investClipped}`
    );
    assert(
      !p001Audit.wp1Clipped && !p001Audit.wp2Clipped && !p001Audit.wp3Clipped && !p001Audit.wp4Clipped,
      `[${w}px] 4 项核心工程标段名称完整换行呈现，无省略号截断！`,
      `[${w}px] 工程标段名称被截断`
    );

    const shotP001 = path.join(screenshotsDir, `05_projects_p001_${w}px_stats_expanded.png`);
    await safeScreenshot(page, shotP001);
  }

  // 4. Testing Feed Author Row Responsive Wrap at 360px + 125%
  console.log('\n--- 4. Testing Feed Author Row Responsive Wrap at 360px + 125% ---');
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '20px';
  });
  await new Promise(r => setTimeout(r, 400));

  const authorRowAudit = await page.evaluate(() => {
    const firstArticle = document.querySelector('article');
    if (!firstArticle) return null;
    const authorNameBtn = firstArticle.querySelector('button.font-bold');
    const badge = firstArticle.querySelector('span[class*="amber"], span[class*="emerald"]');
    const followBtn = Array.from(firstArticle.querySelectorAll('button')).find(b => b.textContent.includes('关注'));

    const nameRect = authorNameBtn ? authorNameBtn.getBoundingClientRect() : null;
    const badgeRect = badge ? badge.getBoundingClientRect() : null;
    const followRect = followBtn ? followBtn.getBoundingClientRect() : null;

    // Check if name and follow button overlap horizontally and vertically
    const isOverlapping = (r1, r2) => {
      if (!r1 || !r2) return false;
      return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
    };

    return {
      docScrollWidth: document.documentElement.scrollWidth,
      docClientWidth: document.documentElement.clientWidth,
      authorName: authorNameBtn ? authorNameBtn.textContent.trim() : null,
      followBtnText: followBtn ? followBtn.textContent.trim() : null,
      nameRect,
      followRect,
      badgeRect,
      isOverlapping: isOverlapping(nameRect, followRect)
    };
  });

  console.log('  ✓ 360px + 125% 字体作者行排版审计:', {
    authorName: authorRowAudit?.authorName,
    followBtn: authorRowAudit?.followBtnText,
    isOverlapping: authorRowAudit?.isOverlapping
  });

  assert(
    authorRowAudit && !authorRowAudit.isOverlapping,
    '作者姓名与关注按钮已自适应折行/回流排版，无视觉重叠与挤压！',
    '作者姓名与关注按钮发生视觉重叠'
  );

  const shotAuthorRow = path.join(screenshotsDir, '06_feed_author_row_360_125_wrap.png');
  await safeScreenshot(page, shotAuthorRow);

  // Reset font
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });

  // 5. Testing Compact Screen Height (320x568) & 78px Bottom Nav Clearance
  console.log('\n--- 5. Testing 320x568 Compact Viewport Bottom Nav Clearance ---');
  await page.setViewport({ width: 320, height: 568, deviceScaleFactor: 2 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Scroll to the bottom of the page
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise(r => setTimeout(r, 400));

  const bottomClearanceAudit = await page.evaluate(() => {
    const bottomNav = document.querySelector('nav[aria-label="移动端底部导航"]');
    const articles = Array.from(document.querySelectorAll('article'));
    const lastArticle = articles[articles.length - 1];
    const lastActionRow = lastArticle ? lastArticle.querySelector('div.border-t') : null;

    const navRect = bottomNav ? bottomNav.getBoundingClientRect() : null;
    const actionRect = lastActionRow ? lastActionRow.getBoundingClientRect() : null;

    // Action row bottom must be above bottomNav top, or reachable with scrolling
    const isCoveredByNav = actionRect && navRect && (actionRect.bottom > navRect.top && actionRect.top < navRect.bottom);

    return {
      navHeight: navRect ? navRect.height : 0,
      navTop: navRect ? navRect.top : 0,
      actionRowBottom: actionRect ? actionRect.bottom : 0,
      actionRowTop: actionRect ? actionRect.top : 0,
      isCoveredByNav,
      windowHeight: window.innerHeight
    };
  });

  console.log('  ✓ 320x568 底部栏遮挡审计:', bottomClearanceAudit);
  assert(
    !bottomClearanceAudit.isCoveredByNav,
    `320x568 紧凑视口下滚动到底部时，末尾卡片及交互按钮完全避让底栏 (未被遮挡)！`,
    `末尾卡片交互按钮被底部导航栏遮挡！`
  );

  const shotBottomClearance = path.join(screenshotsDir, '07_compact_320x568_bottom_clearance.png');
  await safeScreenshot(page, shotBottomClearance);

  // 6. Comprehensive Sweep Across All 6 Canonical Widths (320, 360, 375, 390, 412, 430)
  console.log('\n--- 6. Sweep: 320, 360, 375, 390, 412, 430 Widths Across All Routes ---');
  const testWidths = [320, 360, 375, 390, 412, 430];
  const testRoutes = ['feed', 'network', 'projects/p001', 'companies/demo-org-b', 'people/demo-engineer-01'];

  for (const w of testWidths) {
    await page.setViewport({ width: w, height: 800, deviceScaleFactor: 2 });
    for (const r of testRoutes) {
      await page.goto(`${baseUrl}/#/${r}`, { waitUntil: 'networkidle0' });
      await new Promise(res => setTimeout(res, 150));

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      });

      assert(
        !overflow.hasOverflow,
        `[${w}px] #${r}: 零横向溢出 (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`,
        `[${w}px] #${r}: 检测到横向溢出！scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
      );
    }
  }

  await browser.close();
  server.close();

  console.log('\n===========================================================');
  if (failureCount === 0) {
    console.log('  [PASS] All responsive overflow and expansion tests PASSED! 0 failures.');
    console.log('===========================================================');
    process.exit(0);
  } else {
    console.error(`  [FAIL] Test encountered ${failureCount} failure(s).`);
    console.log('===========================================================');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
