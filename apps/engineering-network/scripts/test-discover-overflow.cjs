const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  const port = 43293;
  const server = await startStaticServer(port);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });

  await page.goto(`http://localhost:${port}/?lang=en#/discover`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  console.log('Testing Preset 1...');
  await page.goto(`http://localhost:${port}/?lang=en#/discover`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  let overflowInfo = await page.evaluate(() => {
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    };
  });
  console.log('Preset 1: docScrollWidth =', overflowInfo.docScrollWidth);
  if (overflowInfo.docScrollWidth > 390) throw new Error('Preset 1 overflowed');

  console.log('Testing Preset 2...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('cleanroom') || text.includes('Cleanroom') || text.includes('MEP')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 300));
  overflowInfo = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  console.log('Preset 2: docScrollWidth =', overflowInfo.docScrollWidth);
  if (overflowInfo.docScrollWidth > 390) throw new Error('Preset 2 overflowed');

  console.log('Testing Preset 3...');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('industrial') || text.includes('East China') || text.includes('Active')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 300));
  overflowInfo = await page.evaluate(() => ({
    docScrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  console.log('Preset 3: docScrollWidth =', overflowInfo.docScrollWidth);
  if (overflowInfo.docScrollWidth > 390) throw new Error('Preset 3 overflowed');

  console.log('ALL PRESETS PASS: 390px scrollWidth <= 390 across all states!');

  await browser.close();
  server.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
