import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4296) {
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

async function runTests() {
  const port = 4296;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  console.log('\n=== RUNTIME TEST 1: Document Titles on Routes ===');
  const routes = [
    { path: '#/feed', expected: '工程行业网络 (暂称)' },
    { path: '#/projects/p001', expected: 'DEMO Project P001' },
    { path: '#/projects/p002', expected: 'DEMO Project P002' },
    { path: '#/projects', expected: '工程项目发现 (Project Atlas 模块) · 工程行业网络 (暂称)' },
    { path: '#/companies/demo-org-b', expected: 'Demo Organization B' },
    { path: '#/people/demo-engineer-01', expected: 'Demo Engineer 01' },
    { path: '#/discover', expected: '全局关系图谱语义检索 · 工程行业网络 (暂称)' },
    { path: '#/a', expected: '方案 A 历史对照 · 工程行业网络 (暂称)' },
  ];

  for (const r of routes) {
    await page.goto(`${baseUrl}/${r.path}`, { waitUntil: 'networkidle0' });
    await new Promise(res => setTimeout(res, 200));
    const title = await page.title();
    console.log(`  Route ${r.path} -> Title: "${title}"`);
    if (!title.includes(r.expected)) {
      throw new Error(`Title mismatch on ${r.path}: expected "${r.expected}", got "${title}"`);
    }
    if (title.includes('Project Atlas (MOCK)') || title.includes('LinkedIn')) {
      throw new Error(`Forbidden legacy branding found in title: "${title}"`);
    }
  }

  console.log('\n=== RUNTIME TEST 2: Header Subtitle at Desktop (1440px) ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  const subtitle = await page.$eval('header', el => {
    const sub = el.querySelector('button span.text-\\[11px\\]');
    return sub ? sub.textContent.trim() : '';
  });
  console.log(`  Header Subtitle: "${subtitle}"`);
  if (!subtitle.includes('Engineering Network (暂称)')) {
    throw new Error(`Expected header subtitle to contain "Engineering Network (暂称)", got "${subtitle}"`);
  }
  if (subtitle.includes('行业协同与人际网络')) {
    throw new Error(`Invented slogan still found in header: "${subtitle}"`);
  }

  console.log('\n=== RUNTIME TEST 3: Mobile Hamburger Drawer at 390px ===');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/#/feed`, { waitUntil: 'networkidle0' });
  // Click hamburger button
  const menuBtn = await page.$('header button[aria-label="打开频道与搜索"]');
  if (!menuBtn) throw new Error('Mobile menu button not found!');
  await menuBtn.click();
  await new Promise(res => setTimeout(res, 200));

  const drawerNavs = await page.$$eval('header .md\\:hidden .grid button', btns => 
    btns.map(b => b.textContent.trim())
  );
  console.log('  Mobile Drawer Items:', drawerNavs);
  if (drawerNavs.length < 6) {
    throw new Error(`Expected 6 drawer items, found ${drawerNavs.length}: ${JSON.stringify(drawerNavs)}`);
  }
  const hasPeople = drawerNavs.some(n => n.includes('执业专家人脉'));
  const hasCompany = drawerNavs.some(n => n.includes('参建企业网络'));
  const hasAtlas = drawerNavs.some(n => n.includes('Project Atlas 档案 (P001)'));
  if (!hasPeople || !hasCompany || !hasAtlas) {
    throw new Error(`Missing required parallel navigation in mobile drawer! Found: ${JSON.stringify(drawerNavs)}`);
  }

  console.log('\n=== RUNTIME TEST 4: Project P001 Tab 4 OBS Buttons & Evidence Dossiers ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/#/projects/p001?tab=wiki`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));

  // Check OBS buttons inside Section 2
  const obsCompanyBtns = await page.$$eval('section:nth-of-type(2) button', btns => 
    btns.map(b => b.textContent.trim())
  );
  console.log('  OBS Section Buttons:', obsCompanyBtns.slice(0, 6));
  if (obsCompanyBtns.length === 0) {
    throw new Error('No OBS buttons found in Section 2!');
  }

  // Click first OBS company button and verify clean navigation
  const firstObsBtn = await page.$('section:nth-of-type(2) button');
  await firstObsBtn.click();
  await new Promise(res => setTimeout(res, 300));
  const currentUrl = page.url();
  console.log(`  Clicked OBS button -> Navigated to: ${currentUrl}`);
  if (!currentUrl.includes('/companies/')) {
    throw new Error(`Expected navigation to /companies/, got: ${currentUrl}`);
  }

  console.log('\n=== RUNTIME TEST 5: Non-P001 Project P002 Scoping ===');
  await page.goto(`${baseUrl}/#/projects/p002`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));
  const p2Title = await page.$eval('h1', el => el.textContent.trim());
  console.log(`  P002 Page Title: "${p2Title}"`);
  if (!p2Title.includes('P002')) {
    throw new Error(`Expected P002 title, got: ${p2Title}`);
  }

  // Check P002 Timeline tab
  await page.goto(`${baseUrl}/#/projects/p002?tab=timeline`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));
  const timelineText = await page.$eval('main', el => el.textContent);
  if (!timelineText.includes('P002 建设里程碑与阶段进度')) {
    throw new Error('P002 timeline did not render project-scoped overview!');
  }

  console.log('\n=== RUNTIME TEST 6: Revision History (No Fake Hashes) ===');
  await page.goto(`${baseUrl}/#/projects/p001?tab=wiki`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));
  const revText = await page.$eval('section:nth-of-type(5)', el => el.textContent);
  if (revText.includes('存证哈希：') || revText.includes('HASH-INIT-ENTRY')) {
    throw new Error(`Fabricated hash row found in revision history: "${revText}"`);
  }
  if (!revText.includes('已核验固化') || !revText.includes('修订人：')) {
    throw new Error(`Expected revision history verified metadata, got: "${revText}"`);
  }
  console.log('  Revision history clean: verified editor, date, and status with NO fake hashes.');

  console.log('\n=== RUNTIME TEST 7: Console Error Check ===');
  if (consoleErrors.length > 0) {
    console.error('Console errors detected during suite:', consoleErrors);
    throw new Error(`Console errors found: ${consoleErrors.join(', ')}`);
  } else {
    console.log('  Zero console errors across all test actions!');
  }

  await page.close();
  await browser.close();
  server.close();

  console.log('\n[ALL TESTS PASSED] 100% verification of Round 2 fixes!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});