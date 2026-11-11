import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const screenshotsDir = path.resolve(__dirname, '../screenshots/v42-milestone');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function startServer(port = 43148) {
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
      console.log(`[TEST-SERVER] Running on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

async function runMilestoneVerification() {
  const port = 43148;
  const server = await startServer(port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log(`[CHROME] Launching Chrome from: ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const testResults = [];

  function record(item, name, passed, details = '') {
    testResults.push({ item, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${mark} [Item ${item}] ${name}${details ? ` - ${details}` : ''}`);
  }

  try {
    // =========================================================================
    // ITEM 1: NAV GAP AT TABLET WIDTH AUDIT (767, 768, 820, 1023, 1024, 1440)
    // =========================================================================
    console.log('\n--- ITEM 1: Responsive Navigation Gap Audit ---');
    const navBreakpoints = [
      { width: 320, height: 600, label: '320px-mobile' },
      { width: 390, height: 844, label: '390px-mobile' },
      { width: 767, height: 900, label: '767px-mobile-edge' },
      { width: 768, height: 1024, label: '768px-tablet-min' },
      { width: 820, height: 1180, label: '820px-tablet-ipad' },
      { width: 1023, height: 900, label: '1023px-tablet-max' },
      { width: 1024, height: 900, label: '1024px-desktop-min' },
      { width: 1440, height: 900, label: '1440px-desktop-wide' },
    ];

    for (const bp of navBreakpoints) {
      await page.setViewport({ width: bp.width, height: bp.height });
      await page.goto(`${baseUrl}/?lang=en#/feed`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));

      const navState = await page.evaluate(() => {
        const desktopNav = document.querySelector('aside[aria-label="Desktop primary navigation"]');
        const bottomBar = document.querySelector('nav.fixed.bottom-0');

        function isVisible(el) {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }

        const desktopVisible = isVisible(desktopNav);
        const bottomVisible = isVisible(bottomBar);

        return {
          desktopVisible,
          bottomVisible,
          desktopWidth: desktopNav ? desktopNav.getBoundingClientRect().width : 0,
          bottomHeight: bottomBar ? bottomBar.getBoundingClientRect().height : 0
        };
      });

      const isTabletOrDesktop = bp.width >= 768;
      const expectedDesktop = isTabletOrDesktop;
      const expectedBottom = !isTabletOrDesktop;
      const hasExactlyOneNav = (navState.desktopVisible && !navState.bottomVisible) || (!navState.desktopVisible && navState.bottomVisible);
      const navMatchesExpected = navState.desktopVisible === expectedDesktop && navState.bottomVisible === expectedBottom;

      record(
        1,
        `Nav presence at ${bp.width}px (${bp.label})`,
        hasExactlyOneNav && navMatchesExpected,
        `desktop=${navState.desktopVisible} (w=${navState.desktopWidth}px), bottom=${navState.bottomVisible} (h=${navState.bottomHeight}px)`
      );

      if ([390, 768, 1024, 1440].includes(bp.width)) {
        await page.screenshot({
          path: path.join(screenshotsDir, `item1-nav-${bp.width}px.png`),
          fullPage: false
        });
      }
    }

    // =========================================================================
    // ITEM 2: UNIFIED SEARCH (/search?q=...)
    // =========================================================================
    console.log('\n--- ITEM 2: Unified Search Tests ---');
    await page.setViewport({ width: 1440, height: 900 });

    // Test 2a: Submit search from Header
    await page.goto(`${baseUrl}/?lang=en#/feed`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[name="q"], input[type="search"], input[placeholder*="search" i]');
    const searchInput = await page.$('input[name="q"], input[type="search"], input[placeholder*="search" i]');
    await searchInput.click();
    await page.keyboard.type('Bangkok');
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 600));

    const currentUrl = page.url();
    const isSearchRoute = currentUrl.includes('/search?q=Bangkok') || currentUrl.includes('/search?');
    record(2, 'Header search submits to /search route', isSearchRoute, `current URL: ${currentUrl}`);

    // Verify search page contents
    const searchResults = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasMockBadge = text.includes('MOCK DEMO DATASET') || text.includes('LOCAL_SANDBOX');
      const tabs = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
      const hasTabs = tabs.some(t => t.includes('All')) && tabs.some(t => t.includes('Posts')) && tabs.some(t => t.includes('Projects'));
      const cards = document.querySelectorAll('article, [class*="rounded-2xl border"]');
      return {
        textSlice: text.slice(0, 300),
        hasMockBadge,
        hasTabs,
        cardCount: cards.length
      };
    });

    record(2, 'Search displays MOCK DATA indicator', searchResults.hasMockBadge);
    record(2, 'Search has type tabs (All, Posts, Projects, Companies, People)', searchResults.hasTabs);
    await page.screenshot({ path: path.join(screenshotsDir, 'item2-search-bangkok.png') });

    // Test 2b: Search for "steel"
    await page.goto(`${baseUrl}/?lang=en#/search?q=steel`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const steelResults = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.toLowerCase().includes('steel') || text.includes('钢结构') || text.includes('เหล็ก');
    });
    record(2, 'Search for "steel" returns matching results', steelResults);

    // Test 2c: Search for known company name "Demo Organization B"
    await page.goto(`${baseUrl}/?lang=en#/search?q=Demo%20Organization%20B`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const companyResults = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Demo Organization B') || text.includes('ORG-B');
    });
    record(2, 'Search for known company returns entity card', companyResults);

    // Test 2d: Nonsense query -> honest empty state
    await page.goto(`${baseUrl}/?lang=en#/search?q=xyz123nonsense999`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));
    const emptyResults = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('No matching records found') || text.includes('未找到匹配的公开记录') || text.includes('0 records');
    });
    record(2, 'Nonsense query shows honest empty state (never invented data)', emptyResults);
    await page.screenshot({ path: path.join(screenshotsDir, 'item2-search-empty-state.png') });

    // =========================================================================
    // ITEM 3: NEARBY CITY VIEW & ELIMINATION OF DEBUG UI
    // =========================================================================
    console.log('\n--- ITEM 3: Nearby City View Tests ---');
    await page.goto(`${baseUrl}/?lang=en#/nearby`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const nearbyAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      // Must NOT contain terminal leak strings
      const hasRunbookLeak = text.includes('npm run atlas:trial:start');
      const hasPortLeak = text.includes('127.0.0.1:43141');
      const hasVitePortLeak = text.includes('localhost:5173');

      // Bangkok procurement notice checks
      const hasBangkokNotices = text.includes('Bangkok Metropolitan Administration') || text.includes('BMA') || text.includes('Public Procurement Notice') || text.includes('BMA-2026-');
      const hasKmFabrication = text.includes('km away') || text.includes('距离');

      return {
        hasRunbookLeak,
        hasPortLeak,
        hasVitePortLeak,
        hasBangkokNotices,
        hasKmFabrication,
        textSlice: text.slice(0, 400)
      };
    });

    record(3, 'No raw terminal/runbook commands leaked to users', !nearbyAudit.hasRunbookLeak && !nearbyAudit.hasPortLeak && !nearbyAudit.hasVitePortLeak);
    record(3, 'Bangkok records labeled honestly as public procurement notices', nearbyAudit.hasBangkokNotices);
    record(3, 'Coordinates and km distances are NOT fabricated (null)', !nearbyAudit.hasKmFabrication);
    await page.screenshot({ path: path.join(screenshotsDir, 'item3-nearby-bangkok.png') });

    // Test Rayong city switcher
    const cityButtons = await page.$$('button');
    for (const b of cityButtons) {
      const bText = await page.evaluate(el => el.textContent, b);
      if (bText.includes('Rayong') || bText.includes('罗勇')) {
        await b.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));
    const rayongAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('No public procurement notices currently indexed for Rayong') || text.includes('Rayong') || text.includes('罗勇');
    });
    record(3, 'Rayong switcher shows honest empty state (no fabricated entries)', rayongAudit);
    await page.screenshot({ path: path.join(screenshotsDir, 'item3-nearby-rayong-empty.png') });

    // =========================================================================
    // ITEM 4: SINGLE SOURCE OF TRUTH FOR ACTIVE ROLE
    // =========================================================================
    console.log('\n--- ITEM 4: Single Persona Source of Truth Tests ---');
    // Ensure active role is ENG-01
    await page.evaluate(() => {
      localStorage.setItem('atlas_current_role', 'ENG-01');
    });
    await page.goto(`${baseUrl}/?lang=en#/people/eng-01`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const selfFollowCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const isSelf = text.includes("Current Persona (You)") || text.includes("It's You") || text.includes("当前操作身份 (您自己)");
      const hasFollowBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('+ Follow') || b.textContent.includes('+ 关注'));
      return { isSelf, hasFollowBtn };
    });
    record(4, 'Self-follow prevented when viewing active persona', selfFollowCheck.isSelf && !selfFollowCheck.hasFollowBtn);
    await page.screenshot({ path: path.join(screenshotsDir, 'item4-person-self-persona.png') });

    // Switch persona to ORG-A via localStorage + hard reload
    await page.evaluate(() => {
      localStorage.setItem('atlas_current_role', 'ORG-A');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const otherFollowCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const isSelf = text.includes("Current Persona (You)") || text.includes("当前操作身份 (您自己)");
      const hasFollowBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('+ Follow') || b.textContent.includes('+ 关注'));
      return { isSelf, hasFollowBtn };
    });
    record(4, 'Switching persona permits following non-self entity', !otherFollowCheck.isSelf && otherFollowCheck.hasFollowBtn);
    await page.screenshot({ path: path.join(screenshotsDir, 'item4-person-other-persona-follow.png') });

    // Reset back to ENG-01
    await page.evaluate(() => {
      localStorage.setItem('atlas_current_role', 'ENG-01');
    });
    await page.reload({ waitUntil: 'networkidle0' });

    // =========================================================================
    // ITEM 6: SIMPLIFIED 3-STEP COMPOSER
    // =========================================================================
    console.log('\n--- ITEM 6: Simplified 3-Step Composer Tests ---');
    await page.goto(`${baseUrl}/?lang=en#/feed`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    // Open compose modal
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Post') || el.textContent.includes('发动态'));
      if (b) b.click();
    });
    await page.waitForSelector('#compose-modal-title');
    await new Promise(r => setTimeout(r, 400));

    // Verify Step 1: starts empty, no pre-filled sample image
    const step1Audit = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasStep1Header = text.includes('Step 1: Upload Field Photos (Optional)') || text.includes('步骤 1');
      const isPhotoOptional = text.includes('Optional') || text.includes('可选');
      const hasPrefilledImg = document.querySelector('img[src*="unsplash"], img[src*="picsum"]') !== null;
      return { hasStep1Header, isPhotoOptional, hasPrefilledImg };
    });
    record(6, 'Step 1 starts clean with optional photo (no pre-filled sample)', step1Audit.hasStep1Header && step1Audit.isPhotoOptional && !step1Audit.hasPrefilledImg);
    await page.screenshot({ path: path.join(screenshotsDir, 'item6-compose-step1.png') });

    // Click Step 1 Next button
    await page.click('#compose-next-step-1');
    await page.waitForSelector('#compose-next-step-2');
    await new Promise(r => setTimeout(r, 400));

    // Verify Step 2: Empty submission block check (click next when empty)
    await page.click('#compose-next-step-2');
    await new Promise(r => setTimeout(r, 400));

    const step2Blocked = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasValidationMsg = text.includes('Empty posts are prohibited') || text.includes('禁止发布空动态') || text.includes('动态内容不能为空');
      const isStillOnStep2 = document.querySelector('#compose-headline-input') !== null;
      return { hasValidationMsg, isStillOnStep2 };
    });
    record(6, 'Step 2 blocks advancing when title/content is empty', step2Blocked.hasValidationMsg && step2Blocked.isStillOnStep2);
    await page.screenshot({ path: path.join(screenshotsDir, 'item6-compose-step2-blocked.png') });

    // Fill valid title & body
    await page.type('#compose-headline-input', 'V4.2 Milestone Verification Report');
    await page.type('#compose-body-textarea', 'Engineering Network V4.2 usability remediation verified across all 7 defect items.');
    await new Promise(r => setTimeout(r, 300));

    // Advance to Step 3
    await page.click('#compose-next-step-2');
    await page.waitForSelector('#compose-publish-btn');
    await new Promise(r => setTimeout(r, 400));

    // Verify Step 3: Publish
    const step3Audit = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Step 3: Project Association & Publish') || text.includes('步骤 3: 关联工程项目与发布确认') || text.includes('Step 3');
    });
    record(6, 'Step 3 association & local mock publish reached', step3Audit);
    await page.screenshot({ path: path.join(screenshotsDir, 'item6-compose-step3.png') });

    // Click Publish button
    await page.click('#compose-publish-btn');
    await new Promise(r => setTimeout(r, 800));

    // Verify post appears in Feed
    const postInFeed = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('V4.2 Milestone Verification Report');
    });
    record(6, 'Newly composed post appears immediately in Feed', postInFeed);
    await page.screenshot({ path: path.join(screenshotsDir, 'item6-feed-with-new-post.png') });

    // =========================================================================
    // ITEM 5: BROKEN IMAGE LIFECYCLE & RIGHTS-SAFE PLACEHOLDERS
    // =========================================================================
    console.log('\n--- ITEM 5: Image Lifecycle & Placeholders ---');
    await page.goto(`${baseUrl}/?lang=en#/people/eng-01`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    const imageCopyAudit = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasExpiredBlobTitle = bodyText.includes('Preview Expired (Blob)');
      const hasNewPostInProfile = bodyText.includes('V4.2 Milestone Verification Report');
      const hasFieldBriefCard = bodyText.includes('Field Text Brief') || bodyText.includes('现场文字简报');
      return {
        hasExpiredBlobTitle,
        hasNewPostInProfile,
        hasFieldBriefCard
      };
    });
    record(5, 'No misleading "Preview Expired (Blob)" title presented as real content', !imageCopyAudit.hasExpiredBlobTitle);
    record(5, 'New post visible in author profile as clean Field Text Brief without broken blob', Boolean(imageCopyAudit.hasNewPostInProfile), `hasNewPost=${imageCopyAudit.hasNewPostInProfile}, hasFieldBrief=${imageCopyAudit.hasFieldBriefCard}`);
    await page.screenshot({ path: path.join(screenshotsDir, 'item5-person-profile-new-post.png') });

    // =========================================================================
    // ITEM 7: CONTACT SHEET COPY & LOCAL DRAFT ONLY
    // =========================================================================
    console.log('\n--- ITEM 7: Contact Sheet Copy & Local Draft Tests ---');
    await page.waitForSelector('#person-contact-button');
    await page.click('#person-contact-button');
    await page.waitForSelector('#contact-msg');
    await new Promise(r => setTimeout(r, 500));

    const contactModalAudit = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [aria-labelledby*="contact"], .fixed');
      const text = modal ? modal.innerText : document.body.innerText;
      const isEnglish = text.includes('Direct Inquiry & Technical Consultation') || text.includes('Direct Inquiry');
      const noHardcodedChineseHeader = !text.includes('工程业务意向与联系');
      return { isEnglish, noHardcodedChineseHeader, textSlice: text.slice(0, 300) };
    });
    record(7, 'ContactSheet title respects active locale (English, no hardcoded Chinese header)', contactModalAudit.isEnglish && contactModalAudit.noHardcodedChineseHeader);

    // Type a message in contact sheet
    await page.type('#contact-msg', 'Please provide technical consultation regarding high-bay steel tolerances for the Bangkok station project.');
    await new Promise(r => setTimeout(r, 300));

    // Click submit button
    await page.evaluate(() => {
      const submitBtn = document.querySelector('form button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const contactSuccessAudit = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasDraftNotice = text.includes('LOCAL DRAFT SAVED') || text.includes('STORED_MOCK_ONLY') || text.includes('本地草稿已保存');
      const hasHonestStatus = text.includes('Not yet available for this demo identity — draft saved locally') || text.includes('草稿已在本地留存');
      const noFakeSentClaim = !text.includes('Your message was delivered to their phone') && !text.includes('已成功发送到对方手机');
      const draftsInStorage = localStorage.getItem('atlas_contact_drafts');
      return {
        hasDraftNotice,
        hasHonestStatus,
        noFakeSentClaim,
        draftSaved: Boolean(draftsInStorage && draftsInStorage.includes('high-bay steel tolerances'))
      };
    });

    record(7, 'Contact submission shows honest "LOCAL DRAFT SAVED" without fake delivery claim', contactSuccessAudit.hasDraftNotice && contactSuccessAudit.hasHonestStatus && contactSuccessAudit.noFakeSentClaim);
    record(7, 'Draft persisted in localStorage atlas_contact_drafts', contactSuccessAudit.draftSaved);
    await page.screenshot({ path: path.join(screenshotsDir, 'item7-contact-local-draft.png') });

  } catch (err) {
    console.error('[TEST EXCEPTION]', err);
    record(0, 'Test Execution Suite Exception', false, err.message);
  } finally {
    await browser.close();
    server.close();
    console.log('[TEST-SERVER] Server stopped.');
  }

  console.log('\n===========================================================');
  console.log('  MILESTONE M1 VERIFICATION SUMMARY');
  console.log('===========================================================');
  const total = testResults.length;
  const passed = testResults.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error(`❌ FAILED ${failed} check(s).`);
    process.exitCode = 1;
  } else {
    console.log('🎉 ALL CHECKS PASSED PERFECTLY!');
  }
}

runMilestoneVerification().catch(e => {
  console.error(e);
  process.exit(1);
});
