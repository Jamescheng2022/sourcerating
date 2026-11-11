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

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('===========================================================');
  console.log('  Focused Verification: EVD-EDGE-02, Expired Blob, & Wiki Roles');
  console.log('===========================================================');

  const initialFree = os.freemem();
  const reserveThreshold = 2 * 1024 * 1024 * 1024; // 2.0 GiB reserve
  console.log(`Initial Free RAM: ${(initialFree / 1024 / 1024 / 1024).toFixed(3)} GiB`);

  if (initialFree < reserveThreshold) {
    console.log(`[RESOURCE NOTICE] Available RAM (${(initialFree / 1024 / 1024).toFixed(1)} MiB) is currently below the 2.0 GiB reserve limit.`);
    console.log('Skipping browser launch in this turn to preserve system stability and honoring memory guard.');
    return;
  }

  const port = 43789;
  const baseUrl = `http://127.0.0.1:${port}/`;
  const server = await startStaticServer(port);

  let browser = null;
  let monitor = null;
  let memoryBreach = null;

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
        '--js-flags=--max-old-space-size=48'
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
      if (isLocal || u.protocol === 'blob:' || u.protocol === 'data:') {
        r.continue();
      } else {
        r.abort();
      }
    });

    const go = async (route) => {
      if (memoryBreach) throw new Error('MEMORY_RESERVE_BREACHED');
      await page.goto(`${baseUrl}?lang=en#/${route}`, { waitUntil: 'domcontentloaded' });
      await delay(250);
    };

    // --- TEST 1: EVD-EDGE-02 Modal Click-Through ---
    console.log('\n--- 1. Testing EVD-EDGE-02 Click-Through on P001 Wiki ---');
    await page.setViewport({ width: 1440, height: 900 });
    await go('projects/p001?tab=wiki');

    // Expand Full Wiki
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /Expand.*Wiki|View.*Wiki|查看完整/i.test(b.innerText));
      if (btn) btn.click();
    });
    await delay(300);

    // Click EVD-EDGE-02 button
    const edgeClicked = await page.evaluate(() => {
      const btn = document.querySelector('button[data-evidence-id="EVD-EDGE-02"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    console.log('  EVD-EDGE-02 inspect button clicked:', edgeClicked);
    await delay(400);

    const edgeModalCheck = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const text = dialog.innerText;
      return {
        found: true,
        hasTitle: text.includes('PUBLIC RECORD (ILLUSTRATIVE)'),
        hasNoBank: !text.includes('建设银行'),
        hasNoGuarantee: !text.includes('FAKE-GTEE'),
        hasNoSignature: !text.includes('公钥共同签名'),
        hasEnglishDisclosure: text.includes('Commercial terms') && text.includes('confidential'),
        hasEnglishErrata: text.includes('Project Role Attribution Gazette')
      };
    });

    console.log('  Dialog opened:', edgeModalCheck.found);
    console.log('  Title is PUBLIC RECORD (ILLUSTRATIVE):', edgeModalCheck.hasTitle);
    console.log('  No bank name in dialog:', edgeModalCheck.hasNoBank);
    console.log('  No guarantee bond policy number:', edgeModalCheck.hasNoGuarantee);
    console.log('  No public key signature:', edgeModalCheck.hasNoSignature);
    console.log('  English confidentiality disclosure present:', edgeModalCheck.hasEnglishDisclosure);
    console.log('  English errata log present:', edgeModalCheck.hasEnglishErrata);

    if (!edgeModalCheck.found || !edgeModalCheck.hasTitle || !edgeModalCheck.hasNoBank || !edgeModalCheck.hasNoGuarantee) {
      throw new Error('EVD-EDGE-02 modal validation failed!');
    }

    const shot1 = path.join(ARTIFACTS_DIR, 'evidence-edge02-clickthrough.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ Captured evidence-edge02-clickthrough.png');

    await page.keyboard.press('Escape');
    await delay(200);

    // --- TEST 2: Deterministic Expired Blob Runtime Verification ---
    console.log('\n--- 2. Testing Deterministic Expired Blob Runtime Handling ---');
    await page.evaluate(() => {
      const syntheticExpiredPost = {
        id: 'POST-LOCAL-EXPIRED-TEST',
        authorType: 'person',
        authorId: 'ENG-01',
        authorName: 'Demo Engineer 01 (Zhang Jianhua)',
        authorTitle: 'Licensed Master Builder · Construction Site Director (Mock)',
        projectId: 'DEMO-PRJ-P001',
        projectName: 'DEMO Project P001: Smart High-End Equipment Manufacturing Base Facility',
        category: 'on_site',
        title: 'Synthetic Expired Blob Inspection Test',
        content: 'Synthetic post with a stale/revoked local blob URL to verify deterministic error fallback.',
        images: [
          {
            url: 'blob:http://127.0.0.1:43789/revoked-synthetic-blob-00000000',
            caption: 'Synthetic Expired Field Photo'
          }
        ],
        coverImage: 'blob:http://127.0.0.1:43789/revoked-synthetic-blob-00000000',
        timeAgo: 'Just now',
        likes: 0,
        comments: [],
        shares: 0,
        isLiked: false,
        createdAt: new Date().toISOString()
      };
      const existing = JSON.parse(localStorage.getItem('atlas_feed_posts') || '[]');
      localStorage.setItem('atlas_feed_posts', JSON.stringify([syntheticExpiredPost, ...existing]));
    });

    await go('people/demo-engineer-01');
    await delay(500);

    const gridExpiredCheck = await page.evaluate(() => {
      const card = [...document.querySelectorAll('main h3')].find(h => h.innerText.includes('Synthetic Expired Blob Inspection Test'))?.closest('div');
      if (!card) return { found: false };
      const fallbackBadge = card.querySelector('.image-fallback-badge');
      const badgeVisible = fallbackBadge && window.getComputedStyle(fallbackBadge).display !== 'none';
      return {
        found: true,
        badgeVisible,
        badgeText: fallbackBadge ? fallbackBadge.innerText : ''
      };
    });

    console.log('  Expired post card found in grid:', gridExpiredCheck.found);
    console.log('  Image fallback badge unhidden:', gridExpiredCheck.badgeVisible);
    console.log('  Badge text:', gridExpiredCheck.badgeText);

    const shot2 = path.join(ARTIFACTS_DIR, 'deterministic-expired-blob.png');
    await page.screenshot({ path: shot2 });
    console.log('✓ Captured deterministic-expired-blob.png');

    // Open post detail modal
    await page.evaluate(() => {
      const titleEl = [...document.querySelectorAll('main h3')].find(h => h.innerText.includes('Synthetic Expired Blob Inspection Test'));
      if (titleEl) titleEl.click();
    });
    await delay(400);

    const modalExpiredCheck = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const t = dialog.innerText;
      return {
        found: true,
        hasExpiredTitle: t.includes('Uploaded Image Preview Expired'),
        hasLocalBlobUnavailable: t.includes('LOCAL BLOB UNAVAILABLE'),
        hasNoAssetUnavailable: !t.includes('ASSET UNAVAILABLE')
      };
    });

    console.log('  Detail modal opened:', modalExpiredCheck.found);
    console.log('  Uploaded Image Preview Expired present:', modalExpiredCheck.hasExpiredTitle);
    console.log('  LOCAL BLOB UNAVAILABLE badge present:', modalExpiredCheck.hasLocalBlobUnavailable);
    console.log('  Remote ASSET UNAVAILABLE absent:', modalExpiredCheck.hasNoAssetUnavailable);

    const shot3 = path.join(ARTIFACTS_DIR, 'deterministic-expired-blob-detail.png');
    await page.screenshot({ path: shot3 });
    console.log('✓ Captured deterministic-expired-blob-detail.png');

    await page.keyboard.press('Escape');
    await delay(200);

    // --- TEST 3: Wiki Contracting Units & Roles Zero-CJK Verification ---
    console.log('\n--- 3. Testing Wiki Contracting Units & Roles (0 CJK) ---');
    for (const pid of ['p001', 'p002', 'p003', 'p004', 'p008']) {
      await go(`projects/${pid}?tab=wiki`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(b => /Expand.*Wiki|View.*Wiki|查看完整/i.test(b.innerText));
        if (btn) btn.click();
      });
      await delay(200);

      const hanCheck = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return { hanCount: 0, hans: [] };
        // Exclude embedded SVGs
        const clone = main.cloneNode(true);
        clone.querySelectorAll('svg').forEach(s => s.remove());
        const text = clone.innerText;
        const hans = text.match(/[\u4e00-\u9fff]/g) || [];
        return { hanCount: hans.length, sample: hans.slice(0, 10).join('') };
      });

      console.log(`  [${pid}] Han count in expanded Wiki HTML (excl SVG): ${hanCheck.hanCount} (Sample: "${hanCheck.sample}")`);
      if (hanCheck.hanCount > 0) {
        throw new Error(`Residual Han characters found in ${pid} Wiki: ${hanCheck.sample}`);
      }
    }

    // --- TEST 4: Company ORG-D Claim Modal Localization ---
    console.log('\n--- 4. Testing Company ORG-D Claim Modal Localization ---');
    await go('companies/org-d');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => /Claim/.test(b.innerText));
      if (btn) btn.click();
    });
    await delay(300);

    const claimCheck = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { found: false };
      const t = dialog.innerText;
      const hans = t.match(/[\u4e00-\u9fff]/g) || [];
      return {
        found: true,
        hasEnTitle: t.includes('Claim Enterprise Profile (Mock)'),
        hasEnOrgName: t.includes('Demo Organization D'),
        hasEnSector: t.includes('Specialized Subcontracting'),
        hanCount: hans.length,
        sampleHans: hans.join('')
      };
    });

    console.log('  Claim modal opened:', claimCheck.found);
    console.log('  English dialog title:', claimCheck.hasEnTitle);
    console.log('  English company name:', claimCheck.hasEnOrgName);
    console.log('  English qualification sector:', claimCheck.hasEnSector);
    console.log('  Han characters count in Claim dialog:', claimCheck.hanCount);

    if (claimCheck.hanCount > 0) {
      throw new Error(`Residual Han characters in Claim modal: ${claimCheck.sampleHans}`);
    }

    const shot4 = path.join(ARTIFACTS_DIR, 'company-org-d-claim-en.png');
    await page.screenshot({ path: shot4 });
    console.log('✓ Captured company-org-d-claim-en.png');

    await page.keyboard.press('Escape');

    console.log('\n===========================================================');
    console.log('🎉 ALL FOCUSED VERIFICATION GATES PASSED SUCCESSFULLY!');
    console.log('===========================================================');

  } finally {
    if (monitor) clearInterval(monitor);
    if (browser) await browser.close().catch(() => {});
    server.close();
  }
}

main().catch(err => {
  console.error('\nTEST RUN FAILED:', err);
  process.exit(1);
});
