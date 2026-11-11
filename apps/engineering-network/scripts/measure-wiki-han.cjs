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
  console.log('===========================================================');
  console.log('  Comprehensive Headless Audit: /projects/p001 under ?lang=en');
  console.log('===========================================================');

  const port = 43294;
  const server = await startStaticServer(port);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  function countHanNodes() {
    return page.evaluate(() => {
      const hanRegex = /[\u4e00-\u9fff]/g;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      const found = [];
      let total = 0;
      while ((node = walker.nextNode())) {
        const val = node.nodeValue || '';
        const hans = val.match(hanRegex);
        if (hans) {
          total += hans.length;
          found.push({ tag: node.parentElement?.tagName, text: val.trim(), count: hans.length, chars: hans });
        }
      }
      return { total, found };
    });
  }

  // Tab 1: Overview
  await page.goto(`http://localhost:${port}/?lang=en#/projects/p001`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  const t1 = await countHanNodes();
  console.log(`\n1. ProjectWikiPage default tab:`);
  console.log(`   Total Han: ${t1.total}`);
  if (t1.total > 0) t1.found.forEach(f => console.log(`   <${f.tag}>: "${f.text}"`));

  // Tab 2: Structure
  await page.goto(`http://localhost:${port}/?lang=en#/projects/p001?tab=structure`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  const t2 = await countHanNodes();
  console.log(`\n2. ProjectWikiPage tab=structure:`);
  console.log(`   Total Han: ${t2.total}`);
  if (t2.total > 0) t2.found.forEach(f => console.log(`   <${f.tag}>: "${f.text}"`));

  // Tab 3: Timeline
  await page.goto(`http://localhost:${port}/?lang=en#/projects/p001?tab=timeline`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  const t3 = await countHanNodes();
  console.log(`\n3. ProjectWikiPage tab=timeline:`);
  console.log(`   Total Han: ${t3.total}`);
  if (t3.total > 0) t3.found.forEach(f => console.log(`   <${f.tag}>: "${f.text}"`));

  // Tab 4: Participations (Section 4)
  await page.goto(`http://localhost:${port}/?lang=en#/projects/p001?tab=participations`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  const t4 = await countHanNodes();
  console.log(`\n4. ProjectWikiPage tab=participations:`);
  console.log(`   Total Han: ${t4.total}`);
  if (t4.total > 0) t4.found.forEach(f => console.log(`   <${f.tag}>: "${f.text}"`));

  // Click on evidence modal if available
  const inspectBtn = await page.$('button');
  // Check EvidenceModal under ?lang=en
  await page.goto(`http://localhost:${port}/?lang=en#/projects/p001`, { waitUntil: 'networkidle0' });
  const evButtons = await page.$$('button');
  let openedEvidence = false;
  for (const b of evButtons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('EVD-') || text.includes('Inspect') || text.includes('Supporting Evidence')) {
      await b.click();
      openedEvidence = true;
      break;
    }
  }
  if (openedEvidence) {
    await new Promise(r => setTimeout(r, 400));
    const evHan = await countHanNodes();
    console.log(`\n5. EvidenceModal under ?lang=en:`);
    console.log(`   Total Han: ${evHan.total}`);
    if (evHan.total > 0) evHan.found.forEach(f => console.log(`   <${f.tag}>: "${f.text}"`));
  }

  await browser.close();
  server.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
