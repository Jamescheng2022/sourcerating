import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

// Simple static server for SPA (serves files from dist, falls back to dist/index.html)
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

async function runCapture() {
  const port = 4173;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const screenshotsDir = path.resolve(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  console.log(`Launching Chrome from: ${chromePath}`);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  const schemes = [
    { code: 'a', name: 'scheme-a' },
    { code: 'b', name: 'scheme-b' }
  ];

  const views = [
    { id: 'overview', name: 'overview' },
    { id: 'timeline', name: 'timeline' },
    { id: 'structure', name: 'structure' },
    { id: 'network', name: 'network' }
  ];

  const viewports = [
    {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      label: '390'
    },
    {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      label: '1440'
    }
  ];

  const screenshotManifest = [];

  for (const scheme of schemes) {
    for (const vp of viewports) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.deviceScaleFactor,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch
      });

      for (const view of views) {
        const url = `${baseUrl}/${scheme.code}?tab=${view.id}`;
        console.log(`Navigating to ${url} with viewport ${vp.label}px...`);
        await page.goto(url, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 400));

        // Format: [scheme]_[width]_[view].png
        const filename = `${scheme.code}_${vp.label}_${view.id}.png`;
        const filePath = path.join(screenshotsDir, filename);

        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`Saved screenshot: ${filename}`);

        screenshotManifest.push({
          scheme: scheme.code.toUpperCase(),
          viewport: `${vp.label}px (${vp.isMobile ? 'Mobile Real Emulation' : 'Desktop'})`,
          view: view.id,
          filename
        });
      }
    }
  }

  // 768px Overflow Check (Requirement: document.documentElement.scrollWidth <= clientWidth)
  console.log('\n--- Running 768px Overflow Audit ---');
  await page.setViewport({
    width: 768,
    height: 1024,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false
  });

  const overflowResults = [];
  for (const scheme of schemes) {
    for (const view of views) {
      const url = `${baseUrl}/${scheme.code}?tab=${view.id}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 300));

      const { scrollWidth, clientWidth, hasOverflowXHidden } = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const docStyle = window.getComputedStyle(doc);
        const bodyStyle = window.getComputedStyle(body);
        const hasHidden = docStyle.overflowX === 'hidden' || bodyStyle.overflowX === 'hidden';

        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflowXHidden: hasHidden
        };
      });

      const passed = scrollWidth <= clientWidth && !hasOverflowXHidden;
      overflowResults.push({
        scheme: scheme.code.toUpperCase(),
        view: view.id,
        scrollWidth,
        clientWidth,
        hasOverflowXHidden,
        passed
      });

      console.log(`Scheme ${scheme.code.toUpperCase()} [${view.id}] at 768px: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}, overflow-x:hidden=${hasOverflowXHidden} -> ${passed ? 'PASS' : 'FAIL'}`);
    }
  }

  await browser.close();
  server.close();
  console.log('\nCompleted all 16 screenshots and 768px audit.');

  // Save audit results to JSON for documentation
  fs.writeFileSync(
    path.resolve(__dirname, '../screenshots/audit-results.json'),
    JSON.stringify({ screenshotManifest, overflowResults }, null, 2),
    'utf-8'
  );
}

runCapture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
