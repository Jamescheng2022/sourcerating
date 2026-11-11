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
  console.log('  Comprehensive Headless Audit: /discover under ?lang=en   ');
  console.log('===========================================================');

  const port = 43292;
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

  // State 1: Initial Load (Preset 1)
  await page.goto(`http://localhost:${port}/?lang=en#/discover`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');
  const state1 = await countHanNodes();
  console.log(`\n1. Initial Load (/discover?lang=en - Preset 1):`);
  console.log(`   Total Han characters: ${state1.total}`);
  if (state1.total > 0) {
    state1.found.forEach(f => console.log(`   [FAIL] <${f.tag}>: "${f.text}"`));
  } else {
    console.log(`   ✓ PASS: 0 Han characters`);
  }

  // State 2: Click Preset 2
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('cleanroom') || text.includes('Cleanroom') || text.includes('MEP')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 400));
  const state2 = await countHanNodes();
  console.log(`\n2. Preset 2 (Engineers with cleanroom MEP experience):`);
  console.log(`   Total Han characters: ${state2.total}`);
  if (state2.total > 0) {
    state2.found.forEach(f => console.log(`   [FAIL] <${f.tag}>: "${f.text}"`));
  } else {
    console.log(`   ✓ PASS: 0 Han characters`);
  }

  // State 3: Click Preset 3
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('East China') || text.includes('east china')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 400));
  const state3 = await countHanNodes();
  console.log(`\n3. Preset 3 (Active industrial projects in East China):`);
  console.log(`   Total Han characters: ${state3.total}`);
  if (state3.total > 0) {
    state3.found.forEach(f => console.log(`   [FAIL] <${f.tag}>: "${f.text}"`));
  } else {
    console.log(`   ✓ PASS: 0 Han characters`);
  }

  await browser.close();
  await new Promise(r => server.close(r));

  const allPassed = state1.total === 0 && state2.total === 0 && state3.total === 0;
  console.log('\n===========================================================');
  if (allPassed) {
    console.log('🎉 AUDIT CONFIRMED: 0 Han characters across all /discover scenarios under ?lang=en!');
  } else {
    console.error('❌ SOME STATES STILL CONTAIN HAN CHARACTERS');
  }
  console.log('===========================================================');

  setTimeout(() => process.exit(allPassed ? 0 : 1), 50);
}

run().catch(err => {
  console.error('Audit execution error:', err);
  setTimeout(() => process.exit(1), 50);
});
