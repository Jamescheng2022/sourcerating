import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4176) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
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
        res.end(`Error: ${err.code}`);
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

/**
 * 辅助：在页面中查找包含指定文本或属性的真实可见按钮 ElementHandle
 */
async function findButton(page, predicate) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const isMatch = await btn.evaluate(predicate);
    if (isMatch) {
      return btn;
    }
  }
  return null;
}

async function verifyWbsClicks() {
  let server = null;
  let browser = null;
  let hasFailures = false;

  try {
    server = await startServer(4176);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('=== WBS 机构/工程师真实用户点击抽屉响应专项测试 (Puppeteer Trusted Click) ===');

    // Test 1: Scheme A on Mobile 390 (No right sidebar) - Click WBS Org
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:4176/a?tab=structure', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // Expand WBS 1.1 if needed using real user click
    const toggleA = await findButton(page, el => el.getAttribute('aria-label')?.includes('1.1') || el.parentElement?.textContent?.includes('1.1'));
    if (toggleA) {
      await toggleA.click();
      await new Promise(r => setTimeout(r, 200));
    }

    // Real Puppeteer User Click: Demo Organization C in WBS 1.1
    const orgBtnA = await findButton(page, el => el.textContent && el.textContent.includes('Demo Organization C'));
    if (orgBtnA) {
      await orgBtnA.click(); // Trusted user click
      await new Promise(r => setTimeout(r, 300));
    } else {
      console.error('未找到方案 A 中的 Demo Organization C 按钮！');
      hasFailures = true;
    }

    const textA = await page.evaluate(() => document.body.innerText);
    const orgDrawerOpenedA = textA.includes('Demo Organization C') && textA.includes('FAKE-USCC-91310000C33445566');
    console.log(`方案 A (移动端 390px) WBS 真实点击企业 -> 抽屉打开: ${orgDrawerOpenedA ? 'PASS' : 'FAIL'}`);
    if (!orgDrawerOpenedA) hasFailures = true;

    // Close drawer via real Puppeteer click
    const closeBtnA = await findButton(page, el => el.getAttribute('aria-label')?.includes('关闭') || el.textContent?.includes('关闭'));
    if (closeBtnA) {
      await closeBtnA.click();
      await new Promise(r => setTimeout(r, 200));
    }

    // Real Puppeteer User Click: Demo Engineer 02 in WBS 1.1
    const engBtnA = await findButton(page, el => el.textContent && el.textContent.includes('Demo Engineer 02'));
    if (engBtnA) {
      await engBtnA.click(); // Trusted user click
      await new Promise(r => setTimeout(r, 300));
    } else {
      console.error('未找到方案 A 中的 Demo Engineer 02 按钮！');
      hasFailures = true;
    }

    const engTextA = await page.evaluate(() => document.body.innerText);
    const engDrawerOpenedA = engTextA.includes('Demo Engineer 02') && engTextA.includes('FAKE-REG-STR-008819');
    console.log(`方案 A (移动端 390px) WBS 真实点击工程师 -> 抽屉打开: ${engDrawerOpenedA ? 'PASS' : 'FAIL'}`);
    if (!engDrawerOpenedA) hasFailures = true;

    // Test 2: Scheme B on Desktop 1440 - Click WBS Org & Engineer
    await page.setViewport({ width: 1440, height: 900, isMobile: false });
    await page.goto('http://127.0.0.1:4176/b?tab=structure', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // Real Puppeteer User Click: Demo Organization C in WBS 1.1 on Scheme B
    const orgBtnB = await findButton(page, el => el.textContent && el.textContent.includes('Demo Organization C'));
    if (orgBtnB) {
      await orgBtnB.click();
      await new Promise(r => setTimeout(r, 300));
    } else {
      console.error('未找到方案 B 中的 Demo Organization C 按钮！');
      hasFailures = true;
    }

    const textB = await page.evaluate(() => document.body.innerText);
    const orgDrawerOpenedB = textB.includes('Demo Organization C') && textB.includes('FAKE-USCC-91310000C33445566');
    console.log(`方案 B (桌面端 1440px) WBS 真实点击企业 -> 抽屉打开: ${orgDrawerOpenedB ? 'PASS' : 'FAIL'}`);
    if (!orgDrawerOpenedB) hasFailures = true;

    // Close drawer in Scheme B
    const closeBtnB = await findButton(page, el => el.getAttribute('aria-label')?.includes('关闭') || el.textContent?.includes('关闭'));
    if (closeBtnB) {
      await closeBtnB.click();
      await new Promise(r => setTimeout(r, 200));
    }

    // Real Puppeteer User Click: Demo Engineer 02 in WBS 1.1 on Scheme B
    const engBtnB = await findButton(page, el => el.textContent && el.textContent.includes('Demo Engineer 02'));
    if (engBtnB) {
      await engBtnB.click();
      await new Promise(r => setTimeout(r, 300));
    } else {
      console.error('未找到方案 B 中的 Demo Engineer 02 按钮！');
      hasFailures = true;
    }

    const engTextB = await page.evaluate(() => document.body.innerText);
    const engDrawerOpenedB = engTextB.includes('Demo Engineer 02') && engTextB.includes('FAKE-REG-STR-008819');
    console.log(`方案 B (桌面端 1440px) WBS 真实点击工程师 -> 抽屉打开: ${engDrawerOpenedB ? 'PASS' : 'FAIL'}`);
    if (!engDrawerOpenedB) hasFailures = true;

    // Test 3: Scheme A Network View on Mobile 390 - Click entity button
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://127.0.0.1:4176/a?tab=network', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 300));

    // Real Puppeteer User Click: Demo Organization D in Network View
    const networkOrgBtn = await findButton(page, el => el.textContent && el.textContent.includes('Demo Organization D'));
    if (networkOrgBtn) {
      await networkOrgBtn.click();
      await new Promise(r => setTimeout(r, 300));
    } else {
      console.error('未找到 Network 视图中的 Demo Organization D 按钮！');
      hasFailures = true;
    }

    const netText = await page.evaluate(() => document.body.innerText);
    const netDrawerOpened = netText.includes('Demo Organization D') && netText.includes('FAKE-USCC-91440000D99887766');
    console.log(`方案 A (移动端 390px) Network 拓扑真实点击企业 -> 抽屉打开: ${netDrawerOpened ? 'PASS' : 'FAIL'}`);
    if (!netDrawerOpened) hasFailures = true;

    const allPassed = !hasFailures;
    console.log(`\n最终结论: ${allPassed ? 'ALL PASS ✅' : 'FAIL ❌'}`);

    if (!allPassed) {
      console.error('❌ One or more WBS click assertions failed!');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Error executing verifyWbsClicks:', err);
    process.exitCode = 1;
  } finally {
    // 保证无头浏览器与本地 HTTP 服务必然被优雅清理关闭
    if (browser) {
      console.log('正在关闭无头浏览器...');
      await browser.close().catch(() => {});
    }
    if (server) {
      console.log('正在关闭本地临时测试 HTTP Server...');
      await new Promise(resolve => server.close(resolve));
    }
    console.log('verifyWbsClicks 资源清理完成。');
  }
}

verifyWbsClicks();
