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
  console.log('  Testing Text-Only Post on PersonPage Grid                ');
  console.log('===========================================================');

  const port = 43295;
  const server = await startStaticServer(port);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Open compose modal from header
  await page.goto(`http://localhost:${port}/?lang=en#/people/eng-01`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('h1');

  // Check existing cards on eng-01
  const initialCards = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasExpiredBlob: text.includes('Preview Expired (Blob)')
    };
  });
  console.log('Initial PersonPage (eng-01): hasExpiredBlob =', initialCards.hasExpiredBlob);

  // Click Post button to open Composer
  const allBtns = await page.$$('button');
  for (const b of allBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.trim() === 'Post' || text.trim() === '发布动态' || text.includes('Post Now') || text.includes('发布新现场作品')) {
      await b.click();
      break;
    }
  }

  await page.waitForSelector('#compose-modal-title');
  console.log('Composer modal opened.');

  // Type headline and body (zero images selected)
  await page.type('input[placeholder*="headline"], input[type="text"]', 'Synthetic Foundation Integrity Brief');
  const textareas = await page.$$('textarea');
  if (textareas.length > 0) {
    await textareas[0].type('Completed low strain pile integrity testing across Grid B with 100% compliance.');
  }

  // Click step 5 to go to Preview & Publish
  const stepBtns = await page.$$('div[class*="overflow-x-auto"] button');
  if (stepBtns.length >= 5) {
    await stepBtns[4].click();
  } else {
    // Click Next 4 times
    for (let i = 0; i < 4; i++) {
      const nextBtn = await page.$('button:has(svg.lucide-arrow-right), button:last-child');
      const allNexts = await page.$$('button');
      for (const b of allNexts) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Next') || text.includes('下一步')) {
          await b.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  await new Promise(r => setTimeout(r, 400));

  // Click Publish
  const modalBtns = await page.$$('button');
  for (const b of modalBtns) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text.includes('Publish') || text.includes('确认发布') || text.includes('发布至 Feed')) {
      await b.click();
      break;
    }
  }

  await new Promise(r => setTimeout(r, 600));

  // Verify on PersonPage
  const result = await page.evaluate(() => {
    const text = document.body.innerText;
    const briefCards = Array.from(document.querySelectorAll('*')).filter(el => 
      (el.textContent || '').includes('Field Text Brief') || (el.textContent || '').includes('现场文字简报')
    );
    const expiredBadges = Array.from(document.querySelectorAll('*')).filter(el =>
      (el.textContent || '').includes('Preview Expired (Blob)') && window.getComputedStyle(el).display !== 'none'
    );
    return {
      hasNewPostTitle: text.includes('Synthetic Foundation Integrity Brief'),
      hasFieldTextBrief: briefCards.length > 0,
      visibleExpiredBadges: expiredBadges.length,
      pageTextSample: text.slice(0, 300)
    };
  });

  console.log('Publish result:');
  console.log('  New post visible:', result.hasNewPostTitle);
  console.log('  Field Text Brief card rendered:', result.hasFieldTextBrief);
  console.log('  Visible expired blob badges:', result.visibleExpiredBadges);

  if (result.visibleExpiredBadges > 0) {
    console.error('FAIL: Still showing visible expired blob badge for text-only post!');
    process.exitCode = 1;
  } else if (!result.hasFieldTextBrief) {
    console.error('FAIL: Field Text Brief card was not rendered!');
    process.exitCode = 1;
  } else {
    console.log('SUCCESS: Text-only post renders clean Field Text Brief without false expired blob!');
  }

  await browser.close();
  server.close();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
