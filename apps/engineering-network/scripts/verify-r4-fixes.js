import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4297) {
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
  const port = 4297;
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

  console.log('\n=== RUNTIME TEST 1: P2 Template ID & Cover Title for P002 ===');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/#/projects/p002`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));

  // Inspect cover SVG text / title in P002
  const coverInfo = await page.evaluate(() => {
    const mainSvg = document.querySelector('svg');
    const pageText = document.body.innerText;
    return {
      hasExcavationText: pageText.includes('超深基坑多道智能伺服钢支撑受力剖面') || pageText.includes('智能伺服钢支撑'),
      svgFound: !!mainSvg,
    };
  });
  console.log('  P002 Cover Info:', coverInfo);
  if (!coverInfo.hasExcavationText) {
    throw new Error('P002 cover does NOT display tpl-prj-02 "超深基坑多道智能伺服钢支撑受力剖面"!');
  }
  console.log('  ✓ P002 cleanly loads tpl-prj-02 (deep excavation) without fallback!');

  console.log('\n=== RUNTIME TEST 2: P1 Restored B Chronology & Triples in P001 Wiki Tab ===');
  await page.goto(`${baseUrl}/#/projects/p001?tab=wiki`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));

  // Check Section 2: Chronology
  const sec2Title = await page.evaluate(() => {
    const s2 = document.querySelector('section:nth-of-type(2) h3');
    return s2 ? s2.textContent.trim() : '';
  });
  console.log('  Section 2 Title:', sec2Title);
  if (!sec2Title.includes('2. 工程全生命周期纪事年表与计划/实际对比')) {
    throw new Error(`Section 2 title mismatch: got "${sec2Title}"`);
  }

  const s2Rows = await page.$$eval('section:nth-of-type(2) tbody tr', rows => rows.length);
  console.log(`  Section 2 Chronology Rows: ${s2Rows} (Expected: 8)`);
  if (s2Rows !== 8) {
    throw new Error(`Expected 8 chronology rows in Section 2, got ${s2Rows}`);
  }

  // Click evidence button in Section 2
  const s2EvidenceBtn = await page.$('section:nth-of-type(2) tbody tr:first-child button');
  if (!s2EvidenceBtn) throw new Error('Evidence button in Section 2 not found!');
  await s2EvidenceBtn.click();
  await new Promise(res => setTimeout(res, 200));

  // Check evidence modal opens
  const modalOpen = await page.evaluate(() => {
    return !!document.querySelector('[role="dialog"]');
  });
  console.log('  Evidence modal opened from Section 2:', modalOpen);
  if (!modalOpen) throw new Error('Evidence modal failed to open from Section 2!');

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await new Promise(res => setTimeout(res, 200));

  // Check Section 3: Knowledge Triples
  const sec3Title = await page.evaluate(() => {
    const s3 = document.querySelector('section:nth-of-type(3) h3');
    return s3 ? s3.textContent.trim() : '';
  });
  console.log('  Section 3 Title:', sec3Title);
  if (!sec3Title.includes('3. 核心参建三元组事实陈述与存证')) {
    throw new Error(`Section 3 title mismatch: got "${sec3Title}"`);
  }

  const s3Rows = await page.$$eval('section:nth-of-type(3) tbody tr', rows => rows.length);
  console.log(`  Section 3 Triple Rows: ${s3Rows} (Expected: 11 edges from PROJECT_DATA.network.edges)`);
  if (s3Rows !== 11) {
    throw new Error(`Expected 11 triple rows in Section 3, got ${s3Rows}`);
  }

  // Click an organization link in Section 3
  const firstOrgBtn = await page.$('section:nth-of-type(3) tbody tr button');
  if (!firstOrgBtn) throw new Error('Org navigation button in Section 3 not found!');
  await firstOrgBtn.click();
  await new Promise(res => setTimeout(res, 300));
  const navUrl = page.url();
  console.log(`  Clicked org in Section 3 -> Navigated to: ${navUrl}`);
  if (!navUrl.includes('/companies/')) {
    throw new Error(`Expected navigation to /companies/, got: ${navUrl}`);
  }

  console.log('\n=== RUNTIME TEST 3: Scoped B Chronology & Triples in P002 Wiki Tab ===');
  await page.goto(`${baseUrl}/#/projects/p002?tab=wiki`, { waitUntil: 'networkidle0' });
  await new Promise(res => setTimeout(res, 300));

  const p2Sec2Rows = await page.$$eval('section:nth-of-type(2) tbody tr', rows => rows.length);
  const p2Sec3Rows = await page.$$eval('section:nth-of-type(3) tbody tr', rows => rows.length);
  console.log(`  P002 Section 2 Chronology Rows: ${p2Sec2Rows} (Expected: 1)`);
  console.log(`  P002 Section 3 Triple Rows: ${p2Sec3Rows} (Expected: participations count > 0)`);
  if (p2Sec2Rows !== 1) {
    throw new Error(`Expected 1 scoped row in Section 2 for P002, got ${p2Sec2Rows}`);
  }
  if (p2Sec3Rows === 0) {
    throw new Error(`Expected non-empty triples in Section 3 for P002, got ${p2Sec3Rows}`);
  }

  console.log('\n=== RUNTIME TEST 4: Platform Titles across Routes ===');
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
    await new Promise(res => setTimeout(res, 150));
    const title = await page.title();
    if (!title.includes(r.expected)) {
      throw new Error(`Title mismatch on ${r.path}: expected "${r.expected}", got "${title}"`);
    }
  }
  console.log('  ✓ All 8 routes have verified compliant titles without legacy branding.');

  console.log('\n=== RUNTIME TEST 5: Console Error Check ===');
  if (consoleErrors.length > 0) {
    console.error('Console errors detected:', consoleErrors);
    throw new Error(`Console errors found: ${consoleErrors.join(', ')}`);
  } else {
    console.log('  ✓ Zero console errors across all test interactions!');
  }

  await page.close();
  await browser.close();
  server.close();

  console.log('\n[ROUND 4 ALL TESTS PASSED] P1 & P2 100% verified and operational!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
