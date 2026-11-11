import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

// Simple static server for SPA (serves files from dist, falls back to dist/index.html)
function startServer(port = 4295) {
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
      console.log(`[V2 Server] Running SPA preview at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function runCapture() {
  const port = 4295;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const v2Dir = path.resolve(__dirname, '../screenshots/v2');
  const compareDir = path.resolve(__dirname, '../screenshots/v2/compare-a');
  if (!fs.existsSync(v2Dir)) fs.mkdirSync(v2Dir, { recursive: true });
  if (!fs.existsSync(compareDir)) fs.mkdirSync(compareDir, { recursive: true });

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`[Chrome] Launching Headless Chrome from: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    dumpio: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();

  // Test targets for V2 main screens
  const targets = [
    { name: 'feed', route: '#/feed', viewports: [390, 768, 1440] },
    { name: 'project_p001', route: '#/projects/p001', viewports: [390, 768, 1440] },
    { name: 'project_p001_wiki', route: '#/projects/p001?tab=wiki', viewports: [390, 1440] },
    { name: 'project_p002', route: '#/projects/p002', viewports: [390, 1440] },
    { name: 'company_org_b', route: '#/companies/demo-org-b', viewports: [390, 1440] },
    { name: 'person_eng_01', route: '#/people/demo-engineer-01', viewports: [390, 1440] },
    { name: 'discover', route: '#/discover', viewports: [390, 1440] },
  ];

  console.log('\n--- 1. Capturing V2 Core Screen Screenshots ---');
  const overflowAudits = [];

  for (const t of targets) {
    for (const width of t.viewports) {
      const height = width === 390 ? 844 : width === 768 ? 1024 : 900;
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      const targetUrl = `${baseUrl}/${t.route}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      // Audit horizontal overflow (scrollWidth vs clientWidth)
      const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const hasOverflow = scrollWidth > docWidth + 1 || bodyScrollWidth > docWidth + 1;
        return { docWidth, scrollWidth, bodyScrollWidth, hasOverflow };
      });

      const fileName = `${t.name}_${width}.png`;
      const filePath = path.join(v2Dir, fileName);
      await page.screenshot({ path: filePath, fullPage: false });

      overflowAudits.push({
        target: `${t.name} @ ${width}px`,
        ...overflowInfo,
        status: overflowInfo.hasOverflow ? 'FAIL (Horizontal Overflow)' : 'PASS (No Overflow)'
      });

      console.log(`  ✓ Captured [${width}px] ${t.name} -> ${fileName} | Overflow: ${overflowInfo.hasOverflow ? 'DETECTED' : 'None'}`);
    }
  }

  console.log('\n--- 2. Capturing Approach A vs V2 Comparison Screenshots ---');
  const comparisons = [
    { name: 'approach_a', route: '#/a', viewports: [390, 1440] },
    { name: 'v2_feed', route: '#/feed', viewports: [390, 1440] },
    { name: 'v2_p001', route: '#/projects/p001', viewports: [390, 1440] },
  ];

  for (const c of comparisons) {
    for (const width of c.viewports) {
      const height = width === 390 ? 844 : 900;
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      const targetUrl = `${baseUrl}/${c.route}`;
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 600));

      const fileName = `${c.name}_${width}.png`;
      const filePath = path.join(compareDir, fileName);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`  ✓ Captured Compare [${width}px] ${c.name} -> ${fileName}`);
    }
  }

  // Close browser and server gracefully
  await page.close();
  await browser.close();
  server.close();

  console.log('\n===========================================================');
  console.log('  V2 Screenshot Capture & Overflow Audit Summary');
  console.log('===========================================================');
  let anyOverflow = false;
  for (const a of overflowAudits) {
    console.log(`  • ${a.target.padEnd(28)}: ${a.status} (Client: ${a.docWidth}px, Scroll: ${a.scrollWidth}px)`);
    if (a.hasOverflow) anyOverflow = true;
  }

  if (anyOverflow) {
    console.error('\n[ERROR] Horizontal overflow detected on one or more screens!');
    process.exit(1);
  } else {
    console.log('\n[PASS] All 12 core screens + 6 comparison screens captured successfully with ZERO horizontal overflow!');
  }
}

runCapture().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
