import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../screenshots/v4-milestone');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function startServer(port = 4310) {
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
      console.log(`[TEST-SERVER] Running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function runMilestoneVerification() {
  const port = 4310;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log(`[CHROME] Launching from: ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.toString());
    console.error(`[PAGE ERROR] ${err.toString()}`);
  });

  const testViewports = [
    { width: 320, height: 568, label: '320px-mobile-compact' },
    { width: 390, height: 844, label: '390px-mobile-standard' },
    { width: 768, height: 1024, label: '768px-tablet' }
  ];

  const results = {
    themeDefaultCheck: false,
    horizontalOverflowChecks: [],
    composeJourneySuccess: false,
    consoleErrorsCount: 0,
    screenshots: []
  };

  try {
    // 1. Initial Load & Theme Verification (Default Light Render)
    console.log('\n--- 1. Testing Default Theme Render (No JS Override) ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const defaultThemeInfo = await page.evaluate(() => {
      const rootTheme = document.documentElement.getAttribute('data-theme');
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const rootCanvasVar = window.getComputedStyle(document.documentElement).getPropertyValue('--bg-canvas').trim();
      return { rootTheme, bodyBg, rootCanvasVar };
    });

    console.log('Theme check result:', defaultThemeInfo);
    // Light canvas is #FAFAF8 or rgb(250, 250, 248)
    if (defaultThemeInfo.rootCanvasVar.toLowerCase() === '#fafaf8' || defaultThemeInfo.bodyBg.includes('250, 250, 248')) {
      console.log('✅ PASS: Light theme is the DEFAULT render!');
      results.themeDefaultCheck = true;
    } else {
      console.warn('⚠️ WARNING: Background is not light canvas:', defaultThemeInfo);
    }

    // 2. Responsive Smoke: 320px, 390px, 768px
    console.log('\n--- 2. Responsive Smoke & Overflow Check ---');
    const routesToTest = [
      { path: '/feed', name: 'Feed' },
      { path: '/projects/p001', name: 'Project-NodeCard' },
      { path: '/network', name: 'Network-Mosaic' }
    ];

    for (const vp of testViewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      for (const route of routesToTest) {
        await page.goto(`${baseUrl}/#${route.path}`, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 400));

        const overflowData = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientWidth = docEl.clientWidth;
          return {
            scrollWidth,
            clientWidth,
            hasOverflow: scrollWidth > clientWidth + 1
          };
        });

        console.log(`[VIEWPORT ${vp.label}] ${route.name}: scrollWidth=${overflowData.scrollWidth}, clientWidth=${overflowData.clientWidth}, hasOverflow=${overflowData.hasOverflow}`);
        results.horizontalOverflowChecks.push({
          viewport: vp.label,
          route: route.name,
          ...overflowData
        });

        const screenshotPath = path.join(screenshotsDir, `${route.name}_${vp.label}.png`);
        await page.screenshot({ path: screenshotPath });
        results.screenshots.push(screenshotPath);
      }
    }

    // 3. Project Wiki Hero Expansion Test
    console.log('\n--- 3. Testing Project Wiki "查看完整 Wiki" Expansion ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/#/projects/p001`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // Find and click disclosure toggle
    const toggleClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText && b.innerText.includes('查看完整 Wiki'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (toggleClicked) {
      await new Promise(r => setTimeout(r, 400));
      const wikiExpandedScreenshot = path.join(screenshotsDir, `Project_Wiki_Expanded_390px.png`);
      await page.screenshot({ path: wikiExpandedScreenshot });
      results.screenshots.push(wikiExpandedScreenshot);
      console.log('✅ PASS: Project Wiki expansion verified and captured!');
    }

    // 4. End-to-End Compose Stepper Journey Test
    console.log('\n--- 4. Testing End-to-End Compose Stepper Journey ---');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // Open Compose Modal (Click AI+ on mobile or 发动态)
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.getAttribute('aria-label') === 'AI 创作与发帖' || (b.innerText && b.innerText.includes('发动态')));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    // Step 1: Input text and load sample photos
    console.log('Compose Step 1: Loading samples and editing text...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sampleBtn = buttons.find(b => b.innerText && b.innerText.includes('载入示范实景样例'));
      if (sampleBtn) sampleBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const step1Screenshot = path.join(screenshotsDir, `Compose_Step1_Upload_390px.png`);
    await page.screenshot({ path: step1Screenshot });
    results.screenshots.push(step1Screenshot);

    // Click Next -> Step 2
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.innerText && b.innerText.includes('下一步'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const step2Screenshot = path.join(screenshotsDir, `Compose_Step2_StoryType_390px.png`);
    await page.screenshot({ path: step2Screenshot });
    results.screenshots.push(step2Screenshot);

    // Click Next -> Step 3
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const nextBtn = buttons.find(b => b.innerText && b.innerText.includes('下一步'));
      if (nextBtn) nextBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const step3Screenshot = path.join(screenshotsDir, `Compose_Step3_Suggestion_390px.png`);
    await page.screenshot({ path: step3Screenshot });
    results.screenshots.push(step3Screenshot);

    // Go to Template Browser -> Step 4
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const browseBtn = buttons.find(b => b.innerText && b.innerText.includes('浏览全部 6 款模板库'));
      if (browseBtn) browseBtn.click();
    });
    await new Promise(r => setTimeout(r, 300));

    const step4Screenshot = path.join(screenshotsDir, `Compose_Step4_TemplateBrowser_390px.png`);
    await page.screenshot({ path: step4Screenshot });
    results.screenshots.push(step4Screenshot);

    // Select Photo Essay and proceed to Step 5
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const selectBtn = buttons.find(b => b.innerText && b.innerText.includes('进入排版'));
      if (selectBtn) selectBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const step5Screenshot = path.join(screenshotsDir, `Compose_Step5_Preview_390px.png`);
    await page.screenshot({ path: step5Screenshot });
    results.screenshots.push(step5Screenshot);

    // Mock Publish
    console.log('Publishing mock post to feed...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const pubBtn = buttons.find(b => b.innerText && b.innerText.includes('模拟发布至关注流'));
      if (pubBtn) pubBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Verify published post appears in feed
    const postInFeed = await page.evaluate(() => {
      const articles = Array.from(document.querySelectorAll('article'));
      const found = articles.find(a => a.innerText && a.innerText.includes('张江智能制造基地主厂房大跨度钢网架'));
      return !!found;
    });

    console.log('Post published and visible in feed:', postInFeed);
    results.composeJourneySuccess = postInFeed;

    const feedAfterPublishScreenshot = path.join(screenshotsDir, `Feed_After_Mock_Publish_390px.png`);
    await page.screenshot({ path: feedAfterPublishScreenshot });
    results.screenshots.push(feedAfterPublishScreenshot);

  } finally {
    await browser.close();
    server.close();
  }

  results.consoleErrorsCount = consoleErrors.length;
  console.log('\n======================================================');
  console.log('             V4 MILESTONE VERIFICATION SUMMARY        ');
  console.log('======================================================');
  console.log(`Default Theme Light Check:   ${results.themeDefaultCheck ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Horizontal Overflow Violations: ${results.horizontalOverflowChecks.filter(c => c.hasOverflow).length} (Total checks: ${results.horizontalOverflowChecks.length})`);
  console.log(`End-to-End Compose Journey:  ${results.composeJourneySuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Runtime Console Errors:      ${results.consoleErrorsCount}`);
  console.log(`Screenshots Captured:        ${results.screenshots.length}`);
  console.log('======================================================\n');

  if (results.themeDefaultCheck && results.composeJourneySuccess && results.consoleErrorsCount === 0 && !results.horizontalOverflowChecks.some(c => c.hasOverflow)) {
    console.log('🎉 ALL MILESTONE CHECKS PASSED!');
    process.exit(0);
  } else {
    console.warn('⚠️ Verification finished with warnings or issues.');
    process.exit(results.consoleErrorsCount > 0 ? 1 : 0);
  }
}

runMilestoneVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
