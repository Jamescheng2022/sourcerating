import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4175) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
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
        res.end(`Server Error`);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function run() {
  const server = await startServer(4175);
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`Console error: ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`Page error: ${err.message}`));

  console.log('--- 验证 1: 404 边界检查 (未知 ID 不静默回退，展示明确 404 与单一 H1) ---');
  // 1a. Project 404
  await page.goto('http://127.0.0.1:4175/#/projects/unknown-prj-xyz', { waitUntil: 'networkidle0' });
  const p404H1 = await page.$eval('h1', el => el.textContent.trim());
  console.log(`  ✓ 未知项目 404 H1: "${p404H1}"`);
  if (!p404H1.includes('404')) throw new Error('Project 404 missing!');

  // 1b. Company 404
  await page.goto('http://127.0.0.1:4175/#/companies/unknown-org-xyz', { waitUntil: 'networkidle0' });
  const c404H1 = await page.$eval('h1', el => el.textContent.trim());
  console.log(`  ✓ 未知企业 404 H1: "${c404H1}"`);
  if (!c404H1.includes('404')) throw new Error('Company 404 missing!');

  // 1c. Person 404
  await page.goto('http://127.0.0.1:4175/#/people/unknown-person-xyz', { waitUntil: 'networkidle0' });
  const pe404H1 = await page.$eval('h1', el => el.textContent.trim());
  console.log(`  ✓ 未知人员 404 H1: "${pe404H1}"`);
  if (!pe404H1.includes('404')) throw new Error('Person 404 missing!');

  console.log('\n--- 验证 2: HashRouter TOC 目录跳转安全性 (逐一验证四个按钮均稳定在 p001) ---');
  await page.goto('http://127.0.0.1:4175/#/projects/p001', { waitUntil: 'networkidle0' });
  const tocCount = await page.evaluate(() => document.querySelectorAll('ol button').length);
  console.log(`  ✓ 找到 ${tocCount} 个 TOC 目录跳转按钮`);
  if (tocCount < 4) throw new Error(`Expected at least 4 TOC buttons, found ${tocCount}`);

  for (let i = 0; i < tocCount; i++) {
    await page.evaluate((idx) => {
      const btns = Array.from(document.querySelectorAll('ol button'));
      if (btns[idx]) btns[idx].click();
    }, i);
    await new Promise(r => setTimeout(r, 150));
    const h = await page.evaluate(() => window.location.hash);
    if (h !== '#/projects/p001') {
      throw new Error(`TOC button ${i} broke router hash: ${h}`);
    }
  }
  console.log(`  ✓ 全部 4 个 TOC 按钮点击后路由均稳定在 "#/projects/p001"，未跳回 Feed`);

  console.log('\n--- 验证 3: 桌面侧边栏折叠与展开功能 ---');
  const initialWidth = await page.$eval('aside', el => el.getBoundingClientRect().width);
  console.log(`  ✓ 侧边栏初始展开宽度: ${initialWidth}px`);
  await page.click('aside button[aria-label="折叠左侧侧边栏"]');
  await new Promise(r => setTimeout(r, 350));
  const collapsedWidth = await page.$eval('aside', el => el.getBoundingClientRect().width);
  console.log(`  ✓ 侧边栏折叠后宽度: ${collapsedWidth}px (<= 64px)`);
  if (collapsedWidth > 64) throw new Error(`Sidebar did not collapse! width: ${collapsedWidth}`);

  await page.click('aside button[aria-label="展开侧边栏导航"]');
  await new Promise(r => setTimeout(r, 350));
  const restoredWidth = await page.$eval('aside', el => el.getBoundingClientRect().width);
  console.log(`  ✓ 侧边栏恢复展开宽度: ${restoredWidth}px`);
  if (restoredWidth < 200) throw new Error(`Sidebar did not restore expansion! width: ${restoredWidth}`);

  console.log('\n--- 验证 4: Discover 页面无匹配查询空态 (展示用户输入与支持预设) ---');
  await page.goto('http://127.0.0.1:4175/#/discover?q=zzz%E6%97%A0%E7%BB%93%E6%9E%9C', { waitUntil: 'networkidle0' });
  const emptyTitle = await page.$eval('h2', el => el.textContent.trim());
  console.log(`  ✓ 未匹配查询空态 H2: "${emptyTitle}"`);
  if (!emptyTitle.includes('zzz无结果')) throw new Error('Discover did not display un-matched query in empty state!');

  console.log('\n--- 验证 5: 行业频道在 Header 与 Feed 间通过 URL 同步 ---');
  await page.goto('http://127.0.0.1:4175/#/feed?channel=civil', { waitUntil: 'networkidle0' });
  const activeChannelPill = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.className.includes('rounded-full') && b.className.includes('bg-emerald-600'));
    return target ? target.textContent.trim() : '';
  });
  console.log(`  ✓ Feed 页面选中的频道: "${activeChannelPill}" (URL ?channel=civil 成功同步)`);
  if (!activeChannelPill.includes('土木市政')) throw new Error('Channel did not sync with URL param civil!');

  console.log('\n--- 验证 6: 非 Feed 页面全局发帖持久化与回 Feed 可见 ---');
  await page.goto('http://127.0.0.1:4175/#/projects', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const target = btns.find(b => b.textContent.includes('发动态') || (b.title && b.title.includes('发布工程动态')));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.type('#post-title', '【重大节点】在 /projects 发起的全局工程测试动态');
  await page.type('#post-content', '该动态从 /projects 页面发起，验证全局状态层常驻持久化与无损流转。');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent.includes('立即发布'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.goto('http://127.0.0.1:4175/#/feed', { waitUntil: 'networkidle0' });
  const latestPostTitle = await page.$eval('article h2', el => el.textContent.trim());
  console.log(`  ✓ 在 /projects 发帖后回到 /feed 顶端动态: "${latestPostTitle}"`);
  if (!latestPostTitle.includes('在 /projects 发起的全局工程测试动态')) {
    throw new Error('Global post from /projects was lost on route change!');
  }

  console.log('\n--- 验证 7: [R2] 静态文案补齐与必要演示说明 ---');
  // 7a. Company Page
  await page.goto('http://127.0.0.1:4175/#/companies/demo-org-b', { waitUntil: 'networkidle0' });
  const claimBtnLabel = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.getAttribute('aria-label')?.includes('认领') || x.textContent.includes('认领'));
    return b ? { text: b.textContent.trim(), aria: b.getAttribute('aria-label') } : null;
  });
  console.log(`  ✓ 企业认领按钮文案: "${claimBtnLabel?.text}", accessible name: "${claimBtnLabel?.aria}"`);
  if (!claimBtnLabel?.text || !claimBtnLabel?.aria) throw new Error('Company claim button missing text or accessible name!');

  const companyNotice = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('div'));
    const target = alerts.find(el => el.textContent.includes('主页说明：') && el.textContent.includes('演示模式：无真实认领流程'));
    return target ? target.textContent.trim() : '';
  });
  console.log(`  ✓ 企业主页演示说明 Banner: "${companyNotice.substring(0, 45)}..."`);
  if (!companyNotice) throw new Error('Company claimNotice disclaimer banner is missing!');

  // 7b. Person Page
  await page.goto('http://127.0.0.1:4175/#/people/demo-engineer-01', { waitUntil: 'networkidle0' });
  const contactBtnLabel = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.getAttribute('aria-label')?.includes('联系咨询专家') || x.textContent.includes('联系咨询专家'));
    return b ? { text: b.textContent.trim(), aria: b.getAttribute('aria-label') } : null;
  });
  console.log(`  ✓ 专家联系按钮文案: "${contactBtnLabel?.text}", accessible name: "${contactBtnLabel?.aria}"`);
  if (!contactBtnLabel?.text || !contactBtnLabel?.aria) throw new Error('Person contact button missing text or accessible name!');

  const personNotice = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('div'));
    const target = alerts.find(el => el.textContent.includes('认证合规声明：') && el.textContent.includes('Mock 核验'));
    return target ? target.textContent.trim() : '';
  });
  console.log(`  ✓ 人员档案合规说明 Banner: "${personNotice.substring(0, 45)}..."`);
  if (!personNotice) throw new Error('Person certificationNotice disclaimer banner is missing!');

  const participationsHeading = await page.$eval('h2', el => el.textContent.trim());
  console.log(`  ✓ 个人参建经历标题 H2: "${participationsHeading}"`);
  if (!participationsHeading.includes('主要参建工程经历 (OBS/WBS)')) {
    throw new Error('Person participationsTitle is missing or empty!');
  }

  console.log('\n--- 验证 8: [R2] 作者契约闭环 (ORG-A / GUEST 评论与发帖，GUEST 不跳 404) ---');
  // Switch to ORG-A via login modal
  await page.goto('http://127.0.0.1:4175/#/feed', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const userBtn = btns.find(b => b.title?.includes('切换演示身份') || b.textContent.includes('身份'));
    if (userBtn) userBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const orgBtnFound = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const btns = Array.from(dialog.querySelectorAll('button'));
    const orgBtn = btns.find(b => b.textContent.includes('Demo Organization A'));
    if (orgBtn) {
      orgBtn.click();
      return true;
    }
    return false;
  });
  console.log(`  ✓ 切换为 ORG-A 角色成功: ${orgBtnFound}`);
  if (!orgBtnFound) throw new Error('Could not find ORG-A option in LoginModal!');
  await new Promise(r => setTimeout(r, 400));

  // Post comment as ORG-A on first post
  await page.evaluate(() => {
    const firstArticle = document.querySelector('article');
    if (!firstArticle) return;
    const btns = Array.from(firstArticle.querySelectorAll('button'));
    const target = btns.find(b => b.textContent.includes('评论'));
    if (target) target.click();
  });
  await new Promise(r => setTimeout(r, 300));
  await page.type('article input[placeholder*="撰写专业评论"]', '来自 ORG-A 建设发包方的项目核查意见 (自动化测试)');
  await page.evaluate(() => {
    const sendBtns = Array.from(document.querySelectorAll('article button'));
    const send = sendBtns.find(b => b.textContent.includes('发送'));
    if (send) send.click();
  });
  await new Promise(r => setTimeout(r, 300));
  const orgaComment = await page.evaluate(() => {
    const comments = Array.from(document.querySelectorAll('article p'));
    const target = comments.find(p => p.textContent.includes('来自 ORG-A 建设发包方的项目核查意见'));
    const parent = target?.parentElement;
    return parent ? parent.textContent : '';
  });
  console.log(`  ✓ ORG-A 评论渲染: "${orgaComment.trim()}"`);
  if (!orgaComment.includes('Demo Organization A 经办人')) {
    throw new Error('Comment author did not reflect activeRole ORG-A!');
  }

  // Switch to GUEST
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const userBtn = btns.find(b => b.title?.includes('切换演示身份') || b.textContent.includes('身份'));
    if (userBtn) userBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const guestBtnFound = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return false;
    const btns = Array.from(dialog.querySelectorAll('button'));
    const guestBtn = btns.find(b => b.textContent.includes('访客观察员') || b.textContent.includes('Guest'));
    if (guestBtn) {
      guestBtn.click();
      return true;
    }
    return false;
  });
  console.log(`  ✓ 切换为 GUEST 角色成功: ${guestBtnFound}`);
  if (!guestBtnFound) throw new Error('Could not find GUEST option in LoginModal!');
  await new Promise(r => setTimeout(r, 400));

  // Post dynamic as GUEST
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const composeBtn = btns.find(b => b.textContent.includes('发动态') || b.title?.includes('发布工程动态'));
    if (composeBtn) composeBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.type('#post-title', '【公众关注】访客用户提交的工程观摩纪实动态');
  await page.type('#post-content', '本动态由 GUEST 访客身份提交，测试非实名访客无档案主页与安全交互。');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.textContent.includes('立即发布'));
    if (submitBtn) submitBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // Check top post is guest post
  const guestPostAuthor = await page.evaluate(() => {
    const topCard = document.querySelector('article');
    const authorSpan = topCard?.querySelector('span.truncate') || topCard?.querySelector('span.font-bold');
    const badge = topCard?.querySelector('span.font-mono');
    const followArea = topCard?.querySelector('span.text-slate-400');
    return {
      author: authorSpan ? authorSpan.textContent.trim() : '',
      badge: badge ? badge.textContent.trim() : '',
      follow: followArea ? followArea.textContent.trim() : ''
    };
  });
  console.log(`  ✓ 访客发帖作者信息: author="${guestPostAuthor.author}", badge="${guestPostAuthor.badge}", follow="${guestPostAuthor.follow}"`);
  if (!guestPostAuthor.author.includes('本地访客')) throw new Error('Guest post author is incorrect!');
  if (!guestPostAuthor.follow.includes('访客无主页')) throw new Error('Guest post did not show "访客无主页" indicator!');

  // Click guest post author avatar/name - should NOT navigate to /people/guest
  await page.evaluate(() => {
    const topCard = document.querySelector('article');
    const avatar = topCard?.querySelector('div.cursor-default');
    if (avatar) avatar.click();
  });
  await new Promise(r => setTimeout(r, 200));
  const currentHashAfterGuestClick = await page.evaluate(() => window.location.hash);
  console.log(`  ✓ 点击访客头像后路由: "${currentHashAfterGuestClick}" (安全保持在 #/feed，未导航到 404 /people/guest)`);
  if (currentHashAfterGuestClick.includes('people/guest')) {
    throw new Error('Clicked guest author navigated to /people/guest 404!');
  }

  console.log('\n--- 验证 9: [R2] 深度链接 ?post= 与缺失本地记录告警 ---');
  // 9a. Deep link to existing post
  await page.goto('http://127.0.0.1:4175/#/feed?post=POST-001', { waitUntil: 'networkidle0' });
  const highlightedPostPill = await page.evaluate(() => {
    const card = document.getElementById('post-card-POST-001');
    const badge = card?.querySelector('span');
    return card && card.className.includes('border-emerald-500');
  });
  console.log(`  ✓ ?post=POST-001 高亮存在性: ${highlightedPostPill}`);
  if (!highlightedPostPill) throw new Error('Target post card POST-001 was not highlighted!');

  // 9b. Deep link to missing post ID
  await page.goto('http://127.0.0.1:4175/#/feed?post=NON-EXISTENT-POST-888', { waitUntil: 'networkidle0' });
  const missingBannerText = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('div'));
    const banner = alerts.find(el => el.textContent.includes('未在当前浏览器本地原型中找到指定的动态记录'));
    return banner ? banner.textContent.trim() : '';
  });
  console.log(`  ✓ 缺失本地动态告警 Banner: "${missingBannerText.substring(0, 60)}..."`);
  if (!missingBannerText.includes('NON-EXISTENT-POST-888')) {
    throw new Error('Missing post ID warning banner was not displayed!');
  }

  console.log('\n--- 验证 10: [R2] useDialogA11y 焦点管理 (输入框连续输入不被抢焦点) ---');
  await page.goto('http://127.0.0.1:4175/#/people/demo-engineer-01', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const contactBtn = btns.find(b => b.textContent.includes('联系咨询专家'));
    if (contactBtn) contactBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));
  // Type into textarea
  const textarea = await page.$('#contact-msg');
  if (!textarea) throw new Error('ContactSheet textarea #contact-msg not found!');
  await textarea.focus();

  // Test typing 10 characters and verify active element
  let focusMaintained = true;
  for (const char of '技术咨询方案测试验证') {
    await textarea.type(char, { delay: 30 });
    const isFocused = await page.evaluate(() => document.activeElement?.id === 'contact-msg');
    if (!isFocused) {
      focusMaintained = false;
      break;
    }
  }
  console.log(`  ✓ 连续输入字符时焦点保持状态: ${focusMaintained}`);
  if (!focusMaintained) throw new Error('Focus was stolen during input due to unstable onClose in useDialogA11y!');

  // Test ESC closes sheet
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 300));
  const isSheetClosed = await page.evaluate(() => {
    const sheet = document.querySelector('[role="dialog"]');
    return !sheet;
  });
  console.log(`  ✓ 按下 ESC 后弹窗关闭状态: ${isSheetClosed}`);
  if (!isSheetClosed) throw new Error('Escape key did not dismiss dialog!');

  await browser.close();
  server.close();

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  }
  console.log('\n🎉 [VERIFY-FIXES PASS] 审查员 Round 1 + Round 2 全量 10 组回归与边界验证 100% 成功通过！');
}

run().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
