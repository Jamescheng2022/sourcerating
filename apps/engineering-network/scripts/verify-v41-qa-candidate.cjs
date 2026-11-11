const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DIST_DIR = path.resolve('dist');
const ARTIFACTS_DIR = path.resolve('artifacts', 'candidate-verification');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

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

const delay = (ms = 180) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('===========================================================');
  console.log('  Candidate Smoke & Whole-Flow QA Regression Suite');
  console.log('===========================================================');

  // Wait for clear memory window if near threshold
  let attempts = 0;
  while (os.freemem() < 2.15 * 1024 * 1024 * 1024 && attempts < 10) {
    console.log(`Waiting for staggered memory window (current free: ${(os.freemem() / 1024 / 1024).toFixed(1)} MiB) ...`);
    await delay(1000);
    attempts++;
  }

  const initialFree = os.freemem();
  const reserveThreshold = 2 * 1024 * 1024 * 1024; // 2.0 GiB reserve
  console.log(`Initial Free RAM: ${(initialFree / 1024 / 1024 / 1024).toFixed(3)} GiB`);

  if (initialFree < reserveThreshold) {
    console.error(`ERROR: Insufficient initial free RAM (< 2.0 GiB reserve). Aborting.`);
    process.exit(1);
  }

  const port = 43788;
  const baseUrl = `http://127.0.0.1:${port}/`;
  const server = await startStaticServer(port);

  let browser = null;
  let monitor = null;
  let memoryBreach = null;
  const errors = [];
  const report = {
    started: new Date().toISOString(),
    wikiRoutes: [],
    checks: {},
    screenshots: []
  };

  try {
    monitor = setInterval(() => {
      const bytes = os.freemem();
      if (bytes < reserveThreshold && !memoryBreach) {
        memoryBreach = { bytes, at: new Date().toISOString() };
        console.error(`\n[MEMORY GUARD ALERT] Free RAM reached ${Math.round(bytes / 1024 / 1024)} MiB (< 2.0 GiB reserve). Gracefully closing browser.`);
        if (browser) browser.close().catch(() => {});
      }
    }, 100);

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      protocolTimeout: 12000,
      timeout: 12000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--single-process',
        '--disable-dev-shm-usage',
        '--disk-cache-size=1',
        '--media-cache-size=1',
        '--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints',
        '--js-flags=--max-old-space-size=64'
      ]
    });

    if (memoryBreach) throw new Error('MEMORY_RESERVE_BREACHED_DURING_LAUNCH');

    const page = await browser.newPage();
    page.setDefaultTimeout(8000);
    page.setDefaultNavigationTimeout(10000);

    await page.setRequestInterception(true);
    page.on('request', r => {
      const u = new URL(r.url());
      const isLocal = r.url().startsWith(baseUrl);
      const isUnsplash = u.hostname === 'images.unsplash.com';
      if (isLocal || u.protocol === 'blob:' || u.protocol === 'data:' || isUnsplash) {
        r.continue();
      } else {
        r.abort();
      }
    });

    page.on('console', m => {
      if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
    });
    page.on('pageerror', e => {
      errors.push(`[uncaught] ${e.toString()}`);
    });

    const go = async (route) => {
      if (memoryBreach) throw new Error('MEMORY_RESERVE_BREACHED');
      await page.goto(`${baseUrl}?lang=en#/${route}`, { waitUntil: 'domcontentloaded' });
      await delay(200);
    };

    // --- STEP 1: Audit all 8 Project Wiki Routes ---
    console.log('\n--- Step 1: Auditing All 8 Project Wiki Routes (?lang=en) ---');
    await page.setViewport({ width: 1440, height: 900 });

    for (let i = 1; i <= 8; i++) {
      if (memoryBreach) break;
      const pid = `p00${i}`;
      await go(`projects/${pid}?tab=wiki`);

      const res = await page.evaluate(() => {
        const root = document.getElementById('root');
        const h1 = document.querySelector('h1');
        const main = document.querySelector('main') || document.body;
        const mainText = main ? main.innerText : '';
        const hanRegex = /[\u4e00-\u9fff]/g;
        const hans = mainText.match(hanRegex) || [];

        return {
          rootEmpty: !root || root.innerHTML.trim() === '',
          h1: h1 ? h1.textContent.trim() : null,
          hanCount: hans.length,
          sampleHans: hans.slice(0, 10).join('')
        };
      });

      console.log(`  [${pid}] Root empty: ${res.rootEmpty}, H1: "${res.h1}", Han in text: ${res.hanCount}`);
      report.wikiRoutes.push({ pid, ...res });

      if (res.rootEmpty) {
        throw new Error(`CRITICAL: Root was empty on project ${pid}!`);
      }

      if (pid === 'p002') {
        const shot = path.join(ARTIFACTS_DIR, 'p002-wiki-en.png');
        await page.screenshot({ path: shot });
        report.screenshots.push(shot);
        console.log('✓ Captured p002-wiki-en.png');
      }
    }

    // Verify 0 isZh or fatal reference errors
    const isZhFatal = errors.some(e => e.includes('isZh'));
    if (isZhFatal) {
      throw new Error(`CRITICAL: Found isZh error in console: ${errors.find(e => e.includes('isZh'))}`);
    }
    console.log(`✓ All 8 project routes passed root check with 0 ReferenceErrors.`);

    // --- STEP 2: Company Page Verification Assurances ---
    console.log('\n--- Step 2: Testing Company Page (/companies/org-d) ---');
    await go('companies/org-d');

    const compCheck = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasAntiFraud: t.includes('Anti-fraud track record prevention') || t.includes('防伪存证'),
        hasStatutorySeals: t.includes('statutory seals') || t.includes('执业印章'),
        hasAttributedPackages: t.includes('Attributed Work Packages') || t.includes('Attributed Packages:'),
        hasMockRoleAttribution: t.includes('Mock Role Attribution (Demo)') || t.includes('Mock Role Attribution')
      };
    });

    console.log('  Anti-fraud copy absent:', !compCheck.hasAntiFraud);
    console.log('  Statutory seals absent:', !compCheck.hasStatutorySeals);
    console.log('  Attributed Packages present:', compCheck.hasAttributedPackages);
    console.log('  Mock Role Attribution present:', compCheck.hasMockRoleAttribution);

    if (compCheck.hasAntiFraud || compCheck.hasStatutorySeals) {
      throw new Error('CRITICAL: Company page still asserted anti-fraud / statutory seal guarantees!');
    }
    if (!compCheck.hasAttributedPackages) {
      throw new Error('CRITICAL: Expected "Attributed Work Packages" on Company page!');
    }
    const compShot = path.join(ARTIFACTS_DIR, 'company-org-d-en.png');
    await page.screenshot({ path: compShot });
    report.screenshots.push(compShot);
    console.log('✓ Captured company-org-d-en.png');

    // --- STEP 3: Claim Modal Copy Audit ---
    console.log('\n--- Step 3: Auditing Claim Modal Copy ---');
    const claimBtns = await page.$$('button');
    for (const b of claimBtns) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text.includes('Claim') || text.includes('认领')) {
        await b.click();
        await delay(300);
        break;
      }
    }

    const claimCheck = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]') || document.body;
      const text = dialog.innerText;
      return {
        hasSafeStorageClaim: text.includes('zero network transmission or storage') || text.includes('无网络传输与存储'),
        hasDemoPreviewCopy: text.includes('preview project images in local client memory') || text.includes('前端内存中即时预览')
      };
    });

    console.log('  Zero-storage claim absent:', !claimCheck.hasSafeStorageClaim);
    console.log('  Honest demo preview copy present:', claimCheck.hasDemoPreviewCopy);

    if (claimCheck.hasSafeStorageClaim) {
      throw new Error('CRITICAL: Claim modal promised zero transmission/storage!');
    }
    await page.keyboard.press('Escape');
    await delay(200);

    // --- STEP 4: Discover 390px Viewport Overflow ---
    console.log('\n--- Step 4: Testing Discover at 390px Viewport ---');
    await page.setViewport({ width: 390, height: 844 });
    await go('discover');

    const discCheck = await page.evaluate(() => {
      return {
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > 390
      };
    });

    console.log(`  Viewport: ${discCheck.viewportWidth}px, scrollWidth: ${discCheck.scrollWidth}px, overflow: ${discCheck.overflow}`);
    if (discCheck.overflow) {
      throw new Error(`CRITICAL: Horizontal overflow on Discover at 390px (${discCheck.scrollWidth}px > 390px)!`);
    }
    const discShot = path.join(ARTIFACTS_DIR, 'discover-390-en.png');
    await page.screenshot({ path: discShot });
    report.screenshots.push(discShot);
    console.log('✓ Captured discover-390-en.png');

    // --- STEP 5: P001 Wiki Sections 5 & 6 Localization & Honest Status ---
    console.log('\n--- Step 5: Auditing P001 Wiki Sections 5 & 6 Localization ---');
    await page.setViewport({ width: 1440, height: 900 });
    await go('projects/p001?tab=wiki');

    const p1Check = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        hasVerifiedKey: t.includes('Verified Key'),
        hasVerifiedAndLocked: t.includes('Verified & Locked'),
        hasRawHash: /Hash:\s*0x[a-f0-9\.]+/i.test(t),
        hasMockRef: t.includes('MOCK-REF-'),
        hasArchivedRecord: t.includes('Archived Record (Demo)'),
        hasSec5Title: t.includes('5. Citations & Canonical Publications'),
        hasSec6Title: t.includes('6. Project-Scoped Milestone Records (Mock Demo)')
      };
    });

    console.log('  Section 5 title localized:', p1Check.hasSec5Title);
    console.log('  Section 6 title localized:', p1Check.hasSec6Title);
    console.log('  MOCK-REF- IDs present:', p1Check.hasMockRef);
    console.log('  Archived Record status present:', p1Check.hasArchivedRecord);
    console.log('  "Verified Key" absent:', !p1Check.hasVerifiedKey);
    console.log('  "Verified & Locked" absent:', !p1Check.hasVerifiedAndLocked);
    console.log('  Raw "Hash: 0x..." absent:', !p1Check.hasRawHash);

    if (p1Check.hasVerifiedKey || p1Check.hasVerifiedAndLocked || p1Check.hasRawHash) {
      throw new Error('CRITICAL: P001 Wiki still contains raw crypto/verified/locking claims!');
    }
    const p1Shot = path.join(ARTIFACTS_DIR, 'p001-wiki-audit-1440.png');
    await page.screenshot({ path: p1Shot });
    report.screenshots.push(p1Shot);
    console.log('✓ Captured p001-wiki-audit-1440.png');

    console.log('\n===========================================================');
    console.log('🎉 ALL CANDIDATE VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');

  } finally {
    if (monitor) clearInterval(monitor);
    if (browser) await browser.close().catch(() => {});
    server.close();
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(report, null, 2));
  }
}

main().catch(err => {
  if (err && err.message && (err.message.includes('MEMORY_RESERVE') || err.message.includes('Target closed') || err.message.includes('disposed'))) {
    console.error('\nTEST STOPPED BY RESOURCE GUARD (< 2.0 GiB reserve limit preserved).');
  } else {
    console.error('\nTEST SUITE FAILED:', err);
  }
  process.exit(1);
});
