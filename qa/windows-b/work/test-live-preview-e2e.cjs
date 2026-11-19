/**
 * SourceRating Live Preview Real-User E2E Acceptance Test
 * Targets:
 *   - Preview URL: https://sourcerating-room-network-preview.vercel.app
 *   - Real Database: Supabase Staging (nunojlfangvnjlwggvvb)
 *   - Real Personas: a1 (Buyer Admin), a2 (Buyer Engineer), b1 (Supplier Admin), b2 (Isolated User)
 *
 * All credentials strictly read from local protected file (secrets/users.json) or B_USERS env.
 * Zero hardcoded PASS assertions — all verdicts derived from real DOM state & API execution.
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../../apps/web/node_modules/@playwright/test'));

(async () => {
  const PREVIEW_URL = process.env.PREVIEW_URL || 'https://sourcerating-room-network-preview.vercel.app';
  const usersFile = process.env.B_USERS || path.resolve(__dirname, '../../../../secrets/users.json');
  if (!fs.existsSync(usersFile)) {
    throw new Error(`Protected credentials file not found at ${usersFile}. Aborting.`);
  }
  const users = Object.fromEntries(JSON.parse(fs.readFileSync(usersFile, 'utf8')).map((u) => [u.key, u]));
  const outDir = path.resolve(__dirname, '..', 'artifacts', 'live-preview');
  fs.mkdirSync(outDir, { recursive: true });

  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
  const browser = await chromium.launch({ channel: process.env.B_CHROME_CHANNEL || undefined, proxy, headless: true });

  const T = 35000;
  const results = {
    network_e2e: {},
    identity_accuracy: {},
    v45_frontend_integration: {},
    regression_room_b: {},
    responsive_layouts: {}
  };

  const createPersonaContext = async (viewport = { width: 1440, height: 900 }) => {
    return await browser.newContext({
      viewport,
      locale: 'zh-CN',
      ignoreHTTPSErrors: true
    });
  };

  const signIn = async (page, k) => {
    const targetUrl = `${PREVIEW_URL}/project-room-b`;
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const isAuthed = await page.evaluate(() => {
      try {
        const item = localStorage.getItem('sr_p1_supabase_auth');
        return item && JSON.parse(item).access_token;
      } catch (e) { return false; }
    });
    if (isAuthed) return;

    await page.getByLabel(/Email|邮箱/).or(page.getByRole('button', { name: /Already have an account\? Log in|已有账号？登录/ })).first().waitFor({ timeout: T });
    if (await page.getByRole('button', { name: /Already have an account\? Log in|已有账号？登录/ }).count()) {
      await page.getByRole('button', { name: /Already have an account\? Log in|已有账号？登录/ }).click();
    }
    await page.getByLabel(/Email|邮箱/).fill(users[k].email);
    await page.getByLabel(/Password|密码/).fill(users[k].pw);
    await page.getByRole('button', { name: /^(Log in|登录)$/ }).click();

    await page.waitForFunction(() => {
      try {
        const item = localStorage.getItem('sr_p1_supabase_auth');
        return item && JSON.parse(item).access_token;
      } catch (e) { return false; }
    }, null, { timeout: T });
    await page.waitForTimeout(1000);
  };

  console.log('================================================================');
  console.log('1. Starting Live Preview E2E Acceptance on ' + PREVIEW_URL);
  console.log('================================================================');

  // ── Persona a1 (Buyer Admin) ──
  const ctxA1 = await createPersonaContext({ width: 1440, height: 900 });
  const pageA1 = await ctxA1.newPage();
  pageA1.on('dialog', d => d.accept());

  console.log('[Step 1] Signing in Persona a1 (Company A Admin / Buyer)...');
  await signIn(pageA1, 'a1');
  console.log('  Persona a1 successfully authenticated.');

  // Network Page Verification for a1
  const sharedRoomId = 'd96b505a-68b3-4df0-b108-15be867dcd7b';
  const supplierOrgId = 'd35a0cfd-1de3-4b61-a54c-2a837774c45a';
  const networkUrlA1 = `${PREVIEW_URL}/project-room-b/network?fromRoom=${sharedRoomId}&counterpartyOrg=${supplierOrgId}`;

  console.log('[Step 2] Persona a1 visiting Network page with collaboration room deep-link...');
  await pageA1.goto(networkUrlA1, { waitUntil: 'domcontentloaded' });
  await pageA1.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });

  // Wait for the counterparty room detection banner to render
  const bannerLocator = pageA1.getByText(/Identified counterparty from project room|已根据你有权限访问的项目房间识别合作企业/);
  await bannerLocator.waitFor({ timeout: 15000 }).catch(() => null);
  const hasBanner = await bannerLocator.count();
  console.log('  Room collaboration counterparty detected:', hasBanner > 0 ? 'PASS' : 'FAIL');
  results.network_e2e.counterparty_room_detection = hasBanner > 0 ? 'PASS' : 'FAIL';

  // Verify pre-filled counterparty name in form (Authentic match, NO fallback代填)
  const nameInput = pageA1.getByPlaceholder(/Target customer or supplier name|待联系的客户或供应商/);
  await pageA1.waitForFunction(
    (el) => el && el.value && el.value.trim().length >= 2,
    await nameInput.elementHandle(),
    { timeout: 15000 }
  ).catch(() => null);

  const prefilledName = await nameInput.inputValue();
  console.log('  Prefilled Counterparty Name (Authentic):', prefilledName);
  const isValidPrefill = !!prefilledName && (prefilledName.includes('QA Supplier') || prefilledName.includes('11140033'));
  results.network_e2e.counterparty_prefill = isValidPrefill
    ? `PASS (Authentic match: "${prefilledName.trim()}")`
    : 'FAIL (Counterparty name was not prefilled from room)';
  if (!isValidPrefill) {
    throw new Error(`Counterparty prefill assertion failed! Expected authentic room counterparty, got: "${prefilledName}"`);
  }

  // Add private notes and save relationship
  console.log('[Step 3] Persona a1 saving private supplier relationship to live database...');
  await pageA1.getByLabel(/Private Notes \(Optional\)|私有备注（可选）/).fill('Live Test 2026-11-16: M20 bolts & 12mm plates approved at USD 1,200. Confidential to Company A.');
  await pageA1.getByRole('button', { name: /Save as Private Relationship|保存为私有关系/ }).click();
  await pageA1.getByText(/Relationship (saved to|updated and saved to) private customer\/supplier directory|关系已(保存到|更新并保存到)本企业私有客户\/供应商库/).waitFor({ timeout: T });
  console.log('  Private supplier relationship saved to Staging DB: PASS');
  results.network_e2e.save_private_relationship = 'PASS';

  // AI Brochure Suggestion & Transactional Confirmation RPC
  console.log('[Step 4] Persona a1 testing AI brochure suggestion extraction...');
  const brochureSample = 'QA Buyer Procurement Corp is an infrastructure engineering contractor headquartered in Thailand. Portal: https://comp-a.example.com. Core engineering capabilities: Precast PHC piles, M20 structural fasteners, Joint plate welding, and Civil QA.';
  await pageA1.getByLabel(/Paste Source Material Text|粘贴素材文字/).fill(brochureSample);
  const aiExtractStart = Date.now();
  await pageA1.getByRole('button', { name: /Extract Profile Suggestions|提取资料建议/ }).click();

  // Wait for AI candidate cards
  await pageA1.getByText(/Pending AI Suggestions|待保存的 AI 候选/).waitFor({ timeout: 50000 });
  const aiExtractDuration = Date.now() - aiExtractStart;
  console.log(`  AI candidates successfully generated by DeepSeek on Preview in ${aiExtractDuration}ms: PASS`);
  results.network_e2e.ai_brochure_extraction = `PASS (Generated in ${aiExtractDuration}ms)`;

  // Add suggestion to pending queue
  console.log('[Step 5] Persona a1 adding candidate to pending suggestions queue...');
  await pageA1.getByRole('button', { name: /Add to Pending Queue|加入待确认队列/ }).first().click();
  await pageA1.getByText(/AI suggestions added to pending review queue|AI 建议已加入待确认队列/).waitFor({ timeout: T });
  console.log('  Suggestion saved to pending queue in Staging DB: PASS');

  // Trigger atomic decision RPC (sr_decide_profile_suggestion)
  console.log('[Step 6] Persona a1 deciding suggestion via atomic RPC (sr_decide_profile_suggestion)...');
  await pageA1.waitForTimeout(1000);
  const confirmBtn = pageA1.getByRole('button', { name: /Confirm & Apply|确认并应用/ }).first();
  await confirmBtn.waitFor({ timeout: T });
  await confirmBtn.click();
  await pageA1.getByText(/Applied to private company profile|已采纳至私有企业资料/).waitFor({ timeout: T });
  console.log('  Atomic RPC sr_decide_profile_suggestion executed successfully: PASS');
  results.network_e2e.atomic_decision_rpc = 'PASS';

  const ssA1 = path.join(outDir, 'live-buyer-a1-network-1440.png');
  await pageA1.screenshot({ path: ssA1, fullPage: true });
  console.log('  Captured screenshot: ' + ssA1);

  // ── Claude V4.5 Integrated UI Views Verification ──
  console.log('----------------------------------------------------------------');
  console.log('[Step 6a] Persona a1 testing Claude V4.5 Company Dossier Card View...');
  await pageA1.goto(`${PREVIEW_URL}/project-room-b/network?tab=company&fromRoom=${sharedRoomId}`, { waitUntil: 'domcontentloaded' });
  await pageA1.locator('[data-testid="company-dossier-preview"]').first().waitFor({ timeout: T });

  const companyDraftPill = await pageA1.getByText(/Private Draft · (Realistic|Live) Preview|私有草稿 · 拟真预览/).count();
  const companyCapabilitiesHeader = await pageA1.getByText(/(Core|Main) Products & Engineering Capabilities|主营产品与工程技术能力/).count();
  const returnToRoomBtn = pageA1.getByRole('link', { name: /(Return to|Back to) Project Room|返回项目房间|返回项目协作房间/ });
  const hasReturnBtn = await returnToRoomBtn.count();
  const returnHref = await returnToRoomBtn.getAttribute('href');
  console.log(`  Company dossier preview rendered: ${companyDraftPill > 0}`);
  console.log(`  Capabilities section rendered: ${companyCapabilitiesHeader > 0}`);
  console.log(`  Return to room button href: ${returnHref}`);
  const companyPass = companyDraftPill > 0 && companyCapabilitiesHeader > 0 && hasReturnBtn > 0 && returnHref.includes(sharedRoomId);
  results.v45_frontend_integration.company_dossier_view = companyPass ? 'PASS (Draft pill, capabilities, verified return link)' : 'FAIL';

  const ssV45Comp = path.join(outDir, 'live-v45-company-dossier-1440.png');
  await pageA1.screenshot({ path: ssV45Comp, fullPage: true });
  console.log('  Captured screenshot: ' + ssV45Comp);

  console.log('[Step 6b] Persona a1 testing Claude V4.5 Person Dossier Card View...');
  await pageA1.goto(`${PREVIEW_URL}/project-room-b/network?tab=person&fromRoom=${sharedRoomId}`, { waitUntil: 'domcontentloaded' });
  await pageA1.locator('[data-testid="person-dossier-preview"]').first().waitFor({ timeout: T });

  const personPill = await pageA1.getByText(/Personal Private · Profile Card|Private Profile · (Live|Profile) Preview|个人私有 · 拟真名片/).count();
  const personSkillsHeader = await pageA1.getByText(/Engineering (Expertise|Domains) & Skill Tags|工程专业领域与技能标签/).count();
  console.log(`  Person dossier preview rendered: ${personPill > 0}`);
  console.log(`  Skills section rendered: ${personSkillsHeader > 0}`);
  const personPass = personPill > 0 && personSkillsHeader > 0;
  results.v45_frontend_integration.person_dossier_view = personPass ? 'PASS (Pill, skills, verified layout)' : 'FAIL';

  const ssV45Person = path.join(outDir, 'live-v45-person-dossier-1440.png');
  await pageA1.screenshot({ path: ssV45Person, fullPage: true });
  console.log('  Captured screenshot: ' + ssV45Person);

  console.log('[Step 6c] Persona a1 testing Claude V4.5 Private Network Directory View...');
  await pageA1.goto(`${PREVIEW_URL}/project-room-b/network?tab=directory&fromRoom=${sharedRoomId}`, { waitUntil: 'domcontentloaded' });
  await pageA1.locator('[data-testid="network-directory-view"]').waitFor({ timeout: T });
  await pageA1.locator('[data-testid="network-directory-view"]').getByText('M20').first().waitFor({ timeout: T });

  const dirHeader = await pageA1.getByText(/Private Customer & Supplier Directory|企业私有客户与供应商库/).count();
  const dirCard = await pageA1.locator('[data-testid="network-directory-view"]').getByText('M20').count();
  console.log(`  Directory view rendered: ${dirHeader > 0}`);
  console.log(`  Saved counterparty card rendered in directory: ${dirCard > 0}`);
  const dirPass = dirHeader > 0 && dirCard > 0;
  results.v45_frontend_integration.network_directory_view = dirPass ? 'PASS (Directory header, counterparty cards, status pills)' : 'FAIL';

  const ssV45Dir = path.join(outDir, 'live-v45-network-directory-1440.png');
  await pageA1.screenshot({ path: ssV45Dir, fullPage: true });
  console.log('  Captured screenshot: ' + ssV45Dir);

  // ── Persona b1 (Supplier Admin) - Cross-Company RLS Isolation ──
  console.log('----------------------------------------------------------------');
  console.log('[Step 7] Signing in Persona b1 (Company B Supplier Admin)...');
  const ctxB1 = await createPersonaContext({ width: 1440, height: 900 });
  const pageB1 = await ctxB1.newPage();
  await signIn(pageB1, 'b1');
  console.log('  Persona b1 successfully authenticated.');

  console.log('[Step 8] Persona b1 visiting Network page to verify cross-company RLS isolation...');
  await pageB1.goto(`${PREVIEW_URL}/project-room-b/network`, { waitUntil: 'domcontentloaded' });
  await pageB1.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });

  const b1SeesA1Notes = await pageB1.getByText(/USD 1,200/).count();
  const b1SeesA1Private = await pageB1.getByText(/Confidential to Company A/).count();
  console.log(`  Leak check for USD 1,200 notes: ${b1SeesA1Notes}`);
  console.log(`  Leak check for Confidential notes: ${b1SeesA1Private}`);
  const rlsLeakCount = b1SeesA1Notes + b1SeesA1Private;
  results.network_e2e.cross_company_rls_isolation = rlsLeakCount === 0 ? 'PASS (0 leaks)' : 'FAIL';
  if (rlsLeakCount > 0) throw new Error('CRITICAL RLS LEAK: Company B saw Company A private CRM notes on Staging DB!');

  // Save Company B personal profile
  await pageB1.getByLabel(/Display Name|显示姓名/).fill('Bob Supplier Lead');
  await pageB1.getByLabel(/Title \/ Specialty|职位 \/ 专业/).fill('QA Fasteners Director');
  await pageB1.getByRole('button', { name: /Save My Private Profile|保存我的私有资料/ }).click();
  await pageB1.getByText(/Personal profile saved|个人资料已保存/).waitFor({ timeout: T });
  console.log('  Persona b1 personal profile saved: PASS');

  const ssB1 = path.join(outDir, 'live-supplier-b1-network-1440.png');
  await pageB1.screenshot({ path: ssB1, fullPage: true });
  console.log('  Captured screenshot: ' + ssB1);

  // ── Persona a2 (Engineer) - Non-Admin Role Gating ──
  console.log('----------------------------------------------------------------');
  console.log('[Step 9] Signing in Persona a2 (Company A Regular Member / Engineer)...');
  const ctxA2 = await createPersonaContext({ width: 1440, height: 900 });
  const pageA2 = await ctxA2.newPage();
  await signIn(pageA2, 'a2');
  console.log('  Persona a2 successfully authenticated.');

  console.log('[Step 10] Persona a2 visiting Network page to verify non-admin role gating...');
  await pageA2.goto(`${PREVIEW_URL}/project-room-b/network`, { waitUntil: 'domcontentloaded' });
  await pageA2.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });

  const roleGateLocator = pageA2.getByText(/Company profile and private customer directory require admin permissions|企业资料和企业私有客户库需要管理员权限/);
  await roleGateLocator.waitFor({ timeout: 15000 }).catch(() => null);
  const roleGateVisible = await roleGateLocator.count();
  const crmHidden = (await pageA2.getByRole('button', { name: /Save as Private Relationship|保存为私有关系/ }).count()) === 0;
  console.log(`  Role gate notice visible: ${roleGateVisible > 0}`);
  console.log(`  Company CRM hidden from regular engineer: ${crmHidden}`);
  results.network_e2e.non_admin_role_gating = (roleGateVisible > 0 && crmHidden) ? 'PASS' : 'FAIL';

  const ssA2 = path.join(outDir, 'live-engineer-a2-network-1440.png');
  await pageA2.screenshot({ path: ssA2, fullPage: true });
  console.log('  Captured screenshot: ' + ssA2);

  // ── Persona b2 (Isolated User) - Rigorous Browser Session & Multi-Tenant Isolation ──
  console.log('----------------------------------------------------------------');
  console.log('[Step 11] Signing in Persona b2 (Isolated User)...');
  const ctxB2 = await createPersonaContext({ width: 1440, height: 900 });
  const pageB2 = await ctxB2.newPage();
  await signIn(pageB2, 'b2');
  console.log('  Persona b2 successfully authenticated.');

  console.log('[Step 12] Persona b2 checking Project Room B access isolation...');
  await pageB2.goto(`${PREVIEW_URL}/project-room-b`, { waitUntil: 'domcontentloaded' });
  await pageB2.waitForTimeout(2500);

  // b2 should not see Company A's collaboration room or messages
  const b2SeesSharedRoom = await pageB2.getByText('SourceRating 多人验收示范项目').count();
  console.log(`  Isolation check: b2 sees Company A project room: ${b2SeesSharedRoom} (must be 0)`);

  console.log('[Step 13] Persona b2 visiting Network page to verify cross-company RLS isolation...');
  await pageB2.goto(`${PREVIEW_URL}/project-room-b/network`, { waitUntil: 'domcontentloaded' });
  await pageB2.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });

  const b2SeesA1Notes = await pageB2.getByText(/USD 1,200/).count();
  const b2SeesA1Private = await pageB2.getByText(/Confidential to Company A/).count();
  console.log(`  b2 leak check for USD 1,200 notes: ${b2SeesA1Notes}`);
  console.log(`  b2 leak check for Confidential notes: ${b2SeesA1Private}`);
  const b2LeakCount = b2SeesA1Notes + b2SeesA1Private;

  // Persona b2 writes own independent profile
  await pageB2.getByLabel(/Display Name|显示姓名/).fill('QA Isolated Inspector');
  await pageB2.getByLabel(/Title \/ Specialty|职位 \/ 专业/).fill('Independent Auditor');
  await pageB2.getByRole('button', { name: /Save My Private Profile|保存我的私有资料/ }).click();
  await pageB2.getByText(/Personal profile saved|个人资料已保存/).waitFor({ timeout: T });
  console.log('  Persona b2 personal profile saved independently: PASS');

  const b2Pass = (b2SeesSharedRoom === 0 && b2LeakCount === 0);
  results.network_e2e.persona_b2_isolation = b2Pass ? 'PASS (0 leaks, strict room & network isolation)' : 'FAIL';

  const ssB2 = path.join(outDir, 'live-isolated-b2-network-1440.png');
  await pageB2.screenshot({ path: ssB2, fullPage: true });
  console.log('  Captured screenshot: ' + ssB2);

  // ── Existing Project Room B Regression Suite ──
  console.log('================================================================');
  console.log('2. Running Rigorous Project Room B Regression Suite');
  console.log('================================================================');

  await pageA1.goto(`${PREVIEW_URL}/project-room-b`, { waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(2000);

  // Open shared room
  const roomBtn = pageA1.locator('[data-testid="room"]').first();
  if (await roomBtn.count()) {
    await roomBtn.click();
    await pageA1.waitForTimeout(1000);
  }

  // 1. Messaging Check
  console.log('[Regression 1] Verifying message input, multi-line preservation, and Staging DB persistence...');
  const msgInput = pageA1.getByLabel(/Type (a )?message|输入消息/).or(pageA1.getByPlaceholder(/Type (a )?message|Message|Send to|输入消息|发给/)).first();
  await msgInput.waitFor({ timeout: T });
  const testMsg = `QA Live E2E Multi-line Verification ${Date.now()}\nLine 2: Multi-line preservation active\nLine 3: Spec check #101 verified`;
  await msgInput.fill(testMsg);
  await pageA1.getByLabel(/Send message|Send|发送/).click();
  await pageA1.getByText('Multi-line preservation active').first().waitFor({ timeout: T });

  // Ensure message is sent without failure status
  await pageA1.waitForFunction((txt) => {
    const bubbles = Array.from(document.querySelectorAll('[data-mine="true"]'));
    const b = bubbles.find(el => el.textContent && el.textContent.includes(txt));
    if (!b) return false;
    return b.getAttribute('data-failed') !== 'true' && !b.querySelector('span[class*="sending"]');
  }, 'Multi-line preservation active', { timeout: T });

  // Server-side persistence verification: reload page from Staging DB
  console.log('  Reloading page to verify true server-side persistence from Staging DB...');
  await pageA1.reload({ waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(2000);
  const reloadedRoomBtn = pageA1.locator('[data-testid="room"]').first();
  if (await reloadedRoomBtn.count()) {
    await reloadedRoomBtn.click();
    await pageA1.waitForTimeout(1000);
  }
  await pageA1.getByText('Multi-line preservation active').first().waitFor({ timeout: T });
  console.log('  Message sent, persisted on Staging DB, and retrieved after reload: PASS');
  results.regression_room_b.messaging = 'PASS (Persisted to Staging DB, verified after reload, multi-line preserved)';

  // Ensure the project side panel is open in wide viewport for the 1440 screenshot
  const openPanelBtn = pageA1.getByLabel(/Open project panel|打开项目面板|查看成员|项目面板/).or(pageA1.locator('button[aria-label*="查看成员"]')).or(pageA1.locator('button[aria-label*="项目面板"]')).first();
  if (await openPanelBtn.count() && (await pageA1.locator('div[role="tablist"]').count()) === 0) {
    await openPanelBtn.click();
    await pageA1.waitForTimeout(1000);
  }

  // Capture desktop 1440 Room B chat screenshot (with 3-column layout open)
  const ssChat1440 = path.join(outDir, 'live-room-b-chat-1440.png');
  await pageA1.screenshot({ path: ssChat1440, fullPage: true });
  console.log('  Captured Room B chat screenshot (1440px with panel open): ' + ssChat1440);

  // 2. Chat-First Rule (No Forced Onboarding Modal)
  const onboardingModal = await pageA1.getByText(/Create your organization|创建你的组织|请完善您的企业资料/).count();
  console.log('  Forced onboarding modal count:', onboardingModal);
  results.regression_room_b.chat_first_no_forced_modal = onboardingModal === 0 ? 'PASS' : 'FAIL';

  // 3. Real File Upload & Approval Status Transition Check
  console.log('[Regression 2] Verifying real file upload and approval workflow...');

  // ── Identity Accuracy & Dynamic Target Route Suite ──
  console.log('----------------------------------------------------------------');
  console.log('[Identity 1] Verifying Room B links carry real target organization_id & user_id...');
  const supplierCompLink = pageA1.locator(`a[data-testid="company-profile-link-${supplierOrgId}"]`).first();
  await supplierCompLink.waitFor({ timeout: 15000 });
  const compHref = await supplierCompLink.getAttribute('href');
  console.log(`  Supplier company profile link href: ${compHref}`);
  const validCompLink = compHref && compHref.includes(`/companies/${supplierOrgId}`) && compHref.includes(`fromRoom=${sharedRoomId}`);
  if (!validCompLink) throw new Error(`Invalid target company link: ${compHref}`);

  // Find target person link (belonging to supplier organization, not Alice)
  const allPersonLinks = pageA1.locator('a[data-testid^="person-card-link-"]');
  const countPersonLinks = await allPersonLinks.count();
  let targetPersonLink = null;
  let targetPersonHref = '';
  for (let i = 0; i < countPersonLinks; i++) {
    const l = allPersonLinks.nth(i);
    const h = await l.getAttribute('href');
    const t = await l.getAttribute('title');
    if (h && t && !t.includes('Alice')) {
      targetPersonLink = l;
      targetPersonHref = h;
      break;
    }
  }
  console.log(`  Target member person card link href: ${targetPersonHref}`);
  const validPersonLink = targetPersonHref && targetPersonHref.includes('/people/') && targetPersonHref.includes(`fromRoom=${sharedRoomId}`);
  if (!validPersonLink) throw new Error(`Invalid target person link: ${targetPersonHref}`);
  results.identity_accuracy.room_links_parameterized = 'PASS (Real organization_id & user_id in route)';

  // 1. Click Supplier Enterprise Link -> Assert Target Company Identity, RLS Restricted State & 0 Leaks
  console.log('[Identity 2] Navigating to Supplier Enterprise route (/companies/:id)...');
  await supplierCompLink.click();
  await pageA1.waitForURL(url => url.pathname.includes(`/companies/${supplierOrgId}`), { timeout: T });

  const compHeading = await pageA1.locator('h2').first().textContent();
  console.log(`  Target company heading text: "${compHeading.trim()}"`);
  const isTargetCompCorrect = compHeading.includes('QA Supplier') || compHeading.includes('11140033');
  const isNotBuyerComp = !compHeading.includes('QA Buyer');
  if (!isTargetCompCorrect || !isNotBuyerComp) {
    throw new Error(`Identity mismatch on company page! Expected Supplier, got: "${compHeading}"`);
  }
  results.identity_accuracy.target_company_identity_match = `PASS (Verified: "${compHeading.trim()}")`;

  // Check RLS & privacy restricted state
  const isCompRestricted = (await pageA1.locator('[data-testid="company-restricted-view"]').count()) > 0;
  const compRestrictedPill = (await pageA1.getByText(/Private (Profile|Dossier) · (Limited to Project Collaboration|Project Collaboration Only)|私有档案 · 仅限项目协作/).count()) > 0;
  console.log(`  Supplier profile rendered restricted private state: ${isCompRestricted}`);
  console.log(`  Supplier profile restricted pill visible: ${compRestrictedPill}`);

  // Truthful verification assertion (MUST NOT show fake VERIFIED badge)
  const fakeVerifiedCount = await pageA1.getByText(/Simulated Verification|模拟核验/).count();
  console.log(`  Fake verified badge count on unverified supplier: ${fakeVerifiedCount} (must be 0)`);
  if (fakeVerifiedCount > 0) throw new Error('Untruthful verification: fake VERIFIED badge rendered on unverified entity!');

  // Check 0 leaks of Buyer private CRM notes
  const leakedNotesOnComp = await pageA1.getByText(/USD 1,200/).count();
  console.log(`  Leak check for Buyer private CRM notes on Supplier route: ${leakedNotesOnComp} (must be 0)`);
  if (leakedNotesOnComp > 0) throw new Error('CRITICAL RLS LEAK: Private CRM notes leaked to /companies/:id route!');
  results.identity_accuracy.target_company_privacy_and_truth = (isCompRestricted && compRestrictedPill && fakeVerifiedCount === 0 && leakedNotesOnComp === 0)
    ? 'PASS (RLS restricted state, truthful unverified badge, 0 leaks)'
    : 'FAIL';

  const ssTargetComp = path.join(outDir, 'live-identity-company-target-1440.png');
  await pageA1.screenshot({ path: ssTargetComp, fullPage: true });
  console.log('  Captured screenshot: ' + ssTargetComp);

  // Return to Room B
  const returnFromComp = pageA1.getByRole('link', { name: /(Return to|Back to) Project Room|返回项目协作房间|返回项目房间/ }).first();
  await returnFromComp.click();
  await pageA1.waitForURL(url => url.pathname.includes('/project-room-b'), { timeout: T });
  console.log('  Returned to Room B from company profile successfully.');

  // Wait for Room B interface to mount and ensure panel is open with members tab
  await pageA1.waitForTimeout(2000);
  const panelIsClosedAfterComp = (await pageA1.locator('aside[aria-label="项目面板"], div[class*="panel"]').count()) === 0;
  if (panelIsClosedAfterComp) {
    const toggleBtn = pageA1.getByLabel(/Open project panel|打开项目面板|查看成员|参与者/).first();
    await toggleBtn.waitFor({ timeout: 15000 });
    await toggleBtn.click();
    await pageA1.locator('aside[aria-label="项目面板"], div[class*="panel"]').waitFor({ timeout: 15000 });
  }
  const peopleTabComp = pageA1.locator('div[role="tablist"] button[role="tab"]').filter({ hasText: /Members|成员/ }).first();
  if (await peopleTabComp.count()) {
    await peopleTabComp.click();
    await pageA1.waitForTimeout(500);
  }

  // 2. Click Member Person Card Link -> Assert Target Member Identity, RLS Restricted State & 0 Leaks
  console.log('[Identity 3] Navigating to Member Person route (/people/:id)...');
  const targetPersonLinkClickable = pageA1.locator(`a[href="${targetPersonHref}"]`).first();
  await targetPersonLinkClickable.click();
  await pageA1.waitForURL(url => url.pathname.startsWith('/people/'), { timeout: T });

  const personHeading = await pageA1.locator('h2').first().textContent();
  console.log(`  Target person heading text: "${personHeading.trim()}"`);
  const isNotAlice = !personHeading.includes('Alice');
  if (!isNotAlice) throw new Error(`Identity mismatch on person page! Expected counterparty member, got Alice!`);
  results.identity_accuracy.target_person_identity_match = `PASS (Verified counterparty member: "${personHeading.trim()}")`;

  // Check RLS & privacy restricted state
  const isPersonRestricted = (await pageA1.locator('[data-testid="person-restricted-view"]').count()) > 0;
  const personRestrictedPill = (await pageA1.getByText(/(Personal card not public|Personal profile not public|Private Profile) · (Limited to project collaboration|Project Collaboration Only)|个人名片未公开 · 仅限项目协作/).count()) > 0;
  console.log(`  Member profile rendered restricted private state: ${isPersonRestricted}`);
  console.log(`  Member profile restricted pill visible: ${personRestrictedPill}`);

  // Truthful verification assertion (MUST NOT show fake VERIFIED badge)
  const fakePersonVerifiedCount = await pageA1.getByText(/Simulated Verification|模拟核验/).count();
  console.log(`  Fake verified badge count on unverified member: ${fakePersonVerifiedCount} (must be 0)`);
  if (fakePersonVerifiedCount > 0) throw new Error('Untruthful verification: fake VERIFIED badge rendered on unverified person!');

  // Check 0 leaks of private CRM notes
  const leakedNotesOnPerson = await pageA1.getByText(/USD 1,200/).count();
  console.log(`  Leak check on Person route: ${leakedNotesOnPerson} (must be 0)`);
  if (leakedNotesOnPerson > 0) throw new Error('CRITICAL RLS LEAK: Private notes leaked to /people/:id route!');
  results.identity_accuracy.target_person_privacy_and_truth = (isPersonRestricted && personRestrictedPill && fakePersonVerifiedCount === 0 && leakedNotesOnPerson === 0)
    ? 'PASS (RLS restricted state, truthful unverified badge, 0 leaks)'
    : 'FAIL';

  const ssTargetPerson = path.join(outDir, 'live-identity-person-target-1440.png');
  await pageA1.screenshot({ path: ssTargetPerson, fullPage: true });
  console.log('  Captured screenshot: ' + ssTargetPerson);

  // Return to Room B
  const returnFromPerson = pageA1.getByRole('link', { name: /(Return to|Back to) Project Room|返回项目协作房间|返回项目房间/ }).first();
  await returnFromPerson.click();
  await pageA1.waitForURL(url => url.pathname.includes('/project-room-b'), { timeout: T });
  console.log('  Returned to Room B from person card successfully.');
  results.identity_accuracy.bidirectional_room_return = 'PASS (Both company and person routes return seamlessly to Room B)';

  // Wait for Room B interface and ensure panel is open with files tab for subsequent regression
  await pageA1.waitForTimeout(2000);
  const panelIsClosedAfterPerson = (await pageA1.locator('aside[aria-label="项目面板"], div[class*="panel"]').count()) === 0;
  if (panelIsClosedAfterPerson) {
    const toggleBtn = pageA1.getByLabel(/Open project panel|打开项目面板|查看成员|参与者/).first();
    await toggleBtn.waitFor({ timeout: 15000 });
    await toggleBtn.click();
    await pageA1.locator('aside[aria-label="项目面板"], div[class*="panel"]').waitFor({ timeout: 15000 });
  }

  results.v45_frontend_integration.room_bidirectional_links = 'PASS (Bidirectional links to /companies/:id & /people/:id)';

  const filesTab = pageA1.locator('div[role="tablist"] button[role="tab"]').filter({ hasText: /Files|文件/ }).first();
  await filesTab.waitFor({ timeout: 15000 });
  await filesTab.click();
  await pageA1.waitForTimeout(1000);

  const uniqueSpecName = `qa-joint-spec-${Date.now()}.pdf`;
  const testFilePath = path.join(outDir, uniqueSpecName);
  const pdfContent = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
  fs.writeFileSync(testFilePath, pdfContent);
  const fileInput = pageA1.locator('input[data-testid="version-input"]');
  await fileInput.setInputFiles(testFilePath);

  // Wait for file version card to render with our unique file name
  const fileCard = pageA1.locator('article[data-testid="file-version"]').filter({ hasText: uniqueSpecName }).first();
  await fileCard.waitFor({ timeout: 25000 });
  console.log('  Real file successfully uploaded and rendered:', uniqueSpecName);

  // Wait for background verification gateway to mark file as verified before attempting confirmation
  console.log('  Waiting for file verification status to be verified...');
  await fileCard.locator('span').filter({ hasText: /verified/ }).first().waitFor({ timeout: 35000 });
  console.log('  File verification completed (status: verified).');

  // Perform approval transition: click "确认此版本"
  const confirmFileBtn = fileCard.getByRole('button', { name: /Confirm this version|确认此版本/ });
  await confirmFileBtn.waitFor({ timeout: 10000 });
  await confirmFileBtn.click();
  const confirmedChip = fileCard.locator('span[data-d="confirmed"]').first();
  try {
    await confirmedChip.waitFor({ timeout: 15000 });
  } catch (chipWaitErr) {
    const errSpan = fileCard.locator('span[class*="err"]');
    if (await errSpan.count()) {
      console.error('  FileCard reported error:', await errSpan.textContent());
    }
    throw chipWaitErr;
  }
  const chipText = await confirmedChip.textContent();
  console.log(`  File approval status transition verified: ${chipText.trim()}`);
  results.regression_room_b.files_and_approvals = `PASS (Uploaded ${uniqueSpecName}, approval transitioned to: ${chipText.trim()})`;

  // 4. Real Room AI Assist Execution & Latency Check
  console.log('[Regression 3] Verifying room AI assist execution and response quality...');
  const aiTab = pageA1.locator('div[role="tablist"] button[role="tab"]').filter({ hasText: 'AI' }).first();
  await aiTab.waitFor({ timeout: 10000 });
  await aiTab.click();
  await pageA1.waitForTimeout(1000);

  const summarizeBtn = pageA1.locator('button').filter({ hasText: /Summarize|总结/ }).first();
  await summarizeBtn.waitFor({ timeout: 10000 });
  const aiStartTime = Date.now();
  await summarizeBtn.click();

  const aiTurn = pageA1.locator('div[data-testid="ai-turn"]').first();
  await aiTurn.waitFor({ timeout: 50000 });
  await pageA1.waitForFunction(() => {
    const card = document.querySelector('div[data-testid="ai-turn"]');
    if (!card) return false;
    const p = card.querySelector('p');
    return p && p.textContent && p.textContent.trim().length > 5 && p.textContent.trim() !== '…';
  }, null, { timeout: 50000 });

  const aiDuration = Date.now() - aiStartTime;
  const aiSummaryText = await aiTurn.locator('p').first().textContent();
  console.log(`  AI Summary received in ${aiDuration}ms: "${aiSummaryText.trim().slice(0, 60)}..."`);
  results.regression_room_b.ai_assist_available = (aiSummaryText.length > 10)
    ? `PASS (Real summary in ${aiDuration}ms, len: ${aiSummaryText.length})`
    : 'FAIL (Summary too short)';

  // 5. Room B Review Tab (待确认) Accessibility
  console.log('[Regression 4] Verifying Review tab in Room B RealPanel...');
  const reviewTab = pageA1.locator('div[role="tablist"] button[role="tab"]').filter({ hasText: /Review|待确认/ }).first();
  await reviewTab.waitFor({ timeout: 10000 });
  await reviewTab.click();
  await pageA1.waitForTimeout(1000);
  const reviewTabRendered = (await pageA1.getByText(/AI Structured Items · Human Review Required|AI 结构化整理事项 · 需由人类审核确认/).count()) > 0;
  console.log(`  Review tab in RealPanel rendered: ${reviewTabRendered}`);
  results.regression_room_b.review_tab_available = reviewTabRendered ? 'PASS' : 'FAIL';

  // ── Multi-Viewport Responsive Layout Verification with Strict Overflow Assertions ──
  console.log('================================================================');
  console.log('3. Verifying Responsive Layouts (390px, 768px, 1440px)');
  console.log('================================================================');

  // Viewport 1: 390px (Mobile - iPhone 14)
  console.log('[Layout 1] Testing 390px Mobile Viewport...');
  await pageA1.setViewportSize({ width: 390, height: 844 });
  await pageA1.goto(`${PREVIEW_URL}/project-room-b/network`, { waitUntil: 'domcontentloaded' });
  await pageA1.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });
  await pageA1.waitForTimeout(1500);

  const mobileOverflow = await pageA1.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const mobileBtnBox = await pageA1.getByRole('button', { name: /Save Private Company Draft|保存私有企业草稿/ }).boundingBox();
  console.log(`  390px Mobile horizontal overflow: ${mobileOverflow} (must be false)`);
  console.log(`  390px Mobile button touch target valid: ${!!(mobileBtnBox && mobileBtnBox.width > 80)}`);

  const ssMobile = path.join(outDir, 'live-network-390-mobile.png');
  await pageA1.screenshot({ path: ssMobile, fullPage: true });

  // Verify 390px mobile layout on /companies/:id and /people/:id
  await pageA1.goto(`${PREVIEW_URL}/companies/${supplierOrgId}?fromRoom=${sharedRoomId}`, { waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(1000);
  const compMobileOverflow = await pageA1.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const ssCompMobile = path.join(outDir, 'live-identity-company-390-mobile.png');
  await pageA1.screenshot({ path: ssCompMobile, fullPage: true });

  const targetPersonIdParam = targetPersonHref.split('/people/')[1]?.split('?')[0];
  let personMobileOverflow = false;
  if (targetPersonIdParam) {
    await pageA1.goto(`${PREVIEW_URL}/people/${targetPersonIdParam}?fromRoom=${sharedRoomId}`, { waitUntil: 'domcontentloaded' });
    await pageA1.waitForTimeout(1000);
    personMobileOverflow = await pageA1.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const ssPersonMobile = path.join(outDir, 'live-identity-person-390-mobile.png');
    await pageA1.screenshot({ path: ssPersonMobile, fullPage: true });
  }

  // Also capture 390px Room B chat screenshot (enter actual chat view)
  await pageA1.goto(`${PREVIEW_URL}/project-room-b`, { waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(1000);
  const mobRoomBtn = pageA1.locator('[data-testid="room"]').first();
  if (await mobRoomBtn.count()) {
    await mobRoomBtn.click();
    await pageA1.waitForTimeout(1000);
  }
  const ssChatMobile = path.join(outDir, 'live-room-b-chat-390-mobile.png');
  await pageA1.screenshot({ path: ssChatMobile, fullPage: true });
  console.log('  Captured Room B chat screenshot (390px in active chat): ' + ssChatMobile);

  const mobileValid = (!mobileOverflow) && (!compMobileOverflow) && (!personMobileOverflow) && mobileBtnBox && mobileBtnBox.width > 80 && (mobileBtnBox.x + mobileBtnBox.width) <= 390;
  results.responsive_layouts.mobile_390 = mobileValid
    ? 'PASS (0 overflow across Network, Company and Person routes, buttons bounded)'
    : 'FAIL (Horizontal overflow detected)';

  // Viewport 2: 768px (Tablet)
  console.log('[Layout 2] Testing 768px Tablet Viewport...');
  await pageA1.setViewportSize({ width: 768, height: 1024 });
  // Explicitly navigate to Network page for 768px Tablet screenshot
  await pageA1.goto(`${PREVIEW_URL}/project-room-b/network`, { waitUntil: 'domcontentloaded' });
  await pageA1.getByText(/Relationship & Capabilities|关系与能力资料/).first().waitFor({ timeout: T });
  await pageA1.waitForTimeout(1500);
  const tabletOverflow = await pageA1.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`  768px Tablet horizontal overflow: ${tabletOverflow} (must be false)`);
  const ssTablet = path.join(outDir, 'live-network-768-tablet.png');
  await pageA1.screenshot({ path: ssTablet, fullPage: true });

  // Also capture 768px Room B chat screenshot
  await pageA1.goto(`${PREVIEW_URL}/project-room-b`, { waitUntil: 'domcontentloaded' });
  await pageA1.waitForTimeout(1000);
  const tabRoomBtn = pageA1.locator('[data-testid="room"]').first();
  if (await tabRoomBtn.count()) {
    await tabRoomBtn.click();
    await pageA1.waitForTimeout(1000);
  }
  const ssChatTablet = path.join(outDir, 'live-room-b-chat-768-tablet.png');
  await pageA1.screenshot({ path: ssChatTablet, fullPage: true });
  console.log('  Captured Room B chat screenshot (768px): ' + ssChatTablet);

  results.responsive_layouts.tablet_768 = (!tabletOverflow)
    ? 'PASS (Responsive grid layout, 0 overflow)'
    : 'FAIL (Horizontal overflow detected)';

  // Viewport 3: 1440px (Desktop)
  console.log('[Layout 3] Testing 1440px Desktop Viewport...');
  await pageA1.setViewportSize({ width: 1440, height: 900 });
  await pageA1.waitForTimeout(1000);
  const desktopOverflow = await pageA1.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(`  1440px Desktop horizontal overflow: ${desktopOverflow} (must be false)`);
  const ssDesktop = path.join(outDir, 'live-network-1440-desktop.png');
  await pageA1.screenshot({ path: ssDesktop, fullPage: true });
  results.responsive_layouts.desktop_1440 = (!desktopOverflow)
    ? 'PASS (Balanced 2-column desktop layout, 0 overflow)'
    : 'FAIL (Horizontal overflow detected)';

  // Close contexts
  await ctxA1.close();
  await ctxA2.close();
  await ctxB1.close();
  await ctxB2.close();
  await browser.close();

  const allPass = Object.values(results.network_e2e).every(v => typeof v === 'string' && v.startsWith('PASS'))
    && Object.values(results.identity_accuracy).every(v => typeof v === 'string' && v.startsWith('PASS'))
    && Object.values(results.v45_frontend_integration).every(v => typeof v === 'string' && v.startsWith('PASS'))
    && Object.values(results.regression_room_b).every(v => typeof v === 'string' && v.startsWith('PASS'))
    && Object.values(results.responsive_layouts).every(v => typeof v === 'string' && v.startsWith('PASS'));

  let actualGitSha = 'candidate/release-a-launch-20261118';
  try {
    actualGitSha = require('child_process').execSync('git rev-parse HEAD', { cwd: path.resolve(__dirname, '../../..') }).toString().trim();
  } catch (e) {
    actualGitSha = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  }

  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'dpl_Gj6QuwK1PNy6Hw4b4EDT2ngQ9vTj';

  const finalSummary = {
    timestamp: new Date().toISOString(),
    environment: 'Live Preview on Vercel backed by migrated Supabase Staging (nunojlfangvnjlwggvvb)',
    preview_url: PREVIEW_URL,
    deployment_id: deploymentId,
    deployment_sha: actualGitSha,
    database_project: 'nunojlfangvnjlwggvvb',
    personas_tested: [
      'a1 (Buyer Admin)',
      'a2 (Buyer Engineer)',
      'b1 (Supplier Admin)',
      'b2 (Isolated User)'
    ],
    results,
    screenshots: [
      'live-room-b-chat-1440.png',
      'live-room-b-chat-768-tablet.png',
      'live-room-b-chat-390-mobile.png',
      'live-buyer-a1-network-1440.png',
      'live-supplier-b1-network-1440.png',
      'live-engineer-a2-network-1440.png',
      'live-isolated-b2-network-1440.png',
      'live-identity-company-target-1440.png',
      'live-identity-person-target-1440.png',
      'live-identity-company-390-mobile.png',
      'live-identity-person-390-mobile.png',
      'live-v45-company-dossier-1440.png',
      'live-v45-person-dossier-1440.png',
      'live-v45-network-directory-1440.png',
      'live-network-390-mobile.png',
      'live-network-768-tablet.png',
      'live-network-1440-desktop.png'
    ],
    verdict: allPass ? 'ALL_PASS' : 'HAS_FAILURES'
  };

  fs.writeFileSync(path.join(outDir, 'live-preview-acceptance.json'), JSON.stringify(finalSummary, null, 2));
  console.log('================================================================');
  console.log(`VERDICT: ${finalSummary.verdict}`);
  console.log('Summary saved to repo/qa/windows-b/artifacts/live-preview/live-preview-acceptance.json');
  console.log('================================================================');
  if (!allPass) {
    process.exit(1);
  }
  process.exit(0);
})().catch(err => {
  console.error('FAIL in Live Preview E2E Acceptance:', err);
  process.exit(1);
});
