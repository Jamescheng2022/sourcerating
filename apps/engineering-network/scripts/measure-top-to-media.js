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
  const server = await startServer(4296);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:4296/#/feed', { waitUntil: 'networkidle0' });

  const res = await page.evaluate(() => {
    const banner = document.querySelector('.bg-amber-500');
    const header = document.querySelector('header');
    const firstArticle = document.querySelector('article');
    const mediaContainer = firstArticle ? firstArticle.querySelector('.aspect-video, [role="img"], [class*="aspect-"]') : null;

    return {
      bannerHeight: banner ? banner.offsetHeight : 0,
      headerHeight: header ? header.offsetHeight : 0,
      firstArticleTop: firstArticle ? firstArticle.getBoundingClientRect().top : 0,
      mediaTop: mediaContainer ? mediaContainer.getBoundingClientRect().top : 0,
      mediaHeight: mediaContainer ? mediaContainer.offsetHeight : 0,
      windowScrollY: window.scrollY
    };
  });

  console.log('Baseline measurements at 390px viewport:');
  console.log(JSON.stringify(res, null, 2));

  await browser.close();
  server.close();
}

run();
