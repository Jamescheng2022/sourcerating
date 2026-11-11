import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4178) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
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
        res.end(`Error: ${err.code}`);
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

async function verifyKeyboard() {
  let server = null;
  let browser = null;
  let hasFailures = false;

  try {
    server = await startServer(4178);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    console.log('=== 键盘无障碍深度专项测试 (Keyboard Navigation & Target Guard) ===\n');

    // =========================================================================
    // Test 1: 方案 A 时间轴内部证据按钮 Space 打开证据 & Escape 关闭
    // =========================================================================
    console.log('--- 测试 1: 方案 A 时间轴内部证据按钮按 Space 键打开证据弹窗 ---');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:4178/a?tab=timeline', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    // 定位第 1 阶段内部的 "存证凭据 →" 按钮
    const stage1EvidenceBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('存证凭据'));
    });
    const evdBtnA = stage1EvidenceBtn.asElement();
    if (!evdBtnA) throw new Error('未找到方案 A 第 1 阶段内部存证凭据按钮');

    await evdBtnA.focus();
    // 模拟真实用户按 Space 键
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 250));

    let bodyText = await page.evaluate(() => document.body.innerText);
    const modalOpenedA = bodyText.includes('EVD-P001-001') && bodyText.includes('工程参建与履约证据核验面板');
    console.log(`  ✓ 方案 A 内部按钮按 Space -> 证据弹窗打开: ${modalOpenedA ? 'PASS' : 'FAIL'}`);
    if (!modalOpenedA) hasFailures = true;

    // 按 Escape 键关闭弹窗
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));
    bodyText = await page.evaluate(() => document.body.innerText);
    const modalClosedA = !bodyText.includes('工程参建与履约证据核验面板');
    console.log(`  ✓ 方案 A 证据弹窗按 Escape -> 弹窗关闭: ${modalClosedA ? 'PASS' : 'FAIL'}`);
    if (!modalClosedA) hasFailures = true;

    // =========================================================================
    // Test 2: 方案 A 父级时间轴阶段卡片 Enter/Space 键选中切换
    // =========================================================================
    console.log('\n--- 测试 2: 方案 A 父级阶段卡片按 Enter / Space 键切换阶段 ---');
    const stageCards = await page.$$('div[role="button"][aria-label*="阶段"]');
    if (stageCards.length < 2) throw new Error('未找到方案 A 阶段卡片列表');

    // 聚焦第 2 阶段卡片并按 Enter
    await stageCards[1].focus();
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 200));

    bodyText = await page.evaluate(() => document.body.innerText);
    const stage2SelectedEnter = bodyText.includes('施工图设计审图及 BIM 全生命周期建模');
    console.log(`  ✓ 方案 A 第 2 阶段卡片按 Enter -> 阶段成功切换: ${stage2SelectedEnter ? 'PASS' : 'FAIL'}`);
    if (!stage2SelectedEnter) hasFailures = true;

    // 聚焦第 1 阶段卡片并按 Space
    await stageCards[0].focus();
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 200));

    bodyText = await page.evaluate(() => document.body.innerText);
    const stage1SelectedSpace = bodyText.includes('完成项目用地审批、节能审查与立项核准登记');
    console.log(`  ✓ 方案 A 第 1 阶段卡片按 Space -> 阶段成功切换: ${stage1SelectedSpace ? 'PASS' : 'FAIL'}`);
    if (!stage1SelectedSpace) hasFailures = true;

    // =========================================================================
    // Test 3: 方案 A WBS 图标按钮 Enter/Space 单次精准切换（无二次双击）
    // =========================================================================
    console.log('\n--- 测试 3: 方案 A WBS 图标按钮 Enter/Space 每次只触发单次切换 ---');
    await page.goto('http://127.0.0.1:4178/a?tab=structure', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    // 定位 WBS 1.1 的折叠/展开图标按钮
    const wbs11BtnHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.getAttribute('aria-label')?.includes('1.1') || b.getAttribute('aria-label')?.includes('地勘'));
    });
    const wbsBtn = wbs11BtnHandle.asElement();
    if (!wbsBtn) throw new Error('未找到 WBS 1.1 图标折叠按钮');

    // 检查初始状态
    let isExpanded = await wbsBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    console.log(`  - WBS 1.1 初始展开状态: ${isExpanded ? '展开' : '折叠'}`);

    // 按 Enter: 应精准展开 (1 次)
    await wbsBtn.focus();
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 150));
    isExpanded = await wbsBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    console.log(`  ✓ 按 Enter -> 展开状态切换为: ${isExpanded ? '展开 (PASS)' : '折叠 (FAIL: 重复切换)'}`);
    if (!isExpanded) hasFailures = true;

    // 再次按 Enter: 应精准折叠 (1 次)
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 150));
    isExpanded = await wbsBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    console.log(`  ✓ 再次按 Enter -> 展开状态切换为: ${!isExpanded ? '折叠 (PASS)' : '展开 (FAIL: 重复切换)'}`);
    if (isExpanded) hasFailures = true;

    // 按 Space: 应精准展开 (1 次)
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 150));
    isExpanded = await wbsBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    console.log(`  ✓ 按 Space -> 展开状态切换为: ${isExpanded ? '展开 (PASS)' : '折叠 (FAIL: 重复切换)'}`);
    if (!isExpanded) hasFailures = true;

    // 再次按 Space: 应精准折叠 (1 次)
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 150));
    isExpanded = await wbsBtn.evaluate(el => el.getAttribute('aria-expanded') === 'true');
    console.log(`  ✓ 再次按 Space -> 展开状态切换为: ${!isExpanded ? '折叠 (PASS)' : '展开 (FAIL: 重复切换)'}`);
    if (isExpanded) hasFailures = true;

    // =========================================================================
    // Test 4: 方案 B 时间轴内部证据按钮 Space 打开证据 & 阶段行键盘切换
    // =========================================================================
    console.log('\n--- 测试 4: 方案 B (Wiki) 时间轴内部存证按钮按 Space & 表格行切换 ---');
    await page.goto('http://127.0.0.1:4178/b?tab=timeline', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    // 定位表格内第 1 行内部的 "[存证]" 按钮
    const stage1BtnBHandle = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('[存证]'));
    });
    const evdBtnB = stage1BtnBHandle.asElement();
    if (!evdBtnB) throw new Error('未找到方案 B 中的 [存证] 按钮');

    await evdBtnB.focus();
    await page.keyboard.press('Space');
    await new Promise(r => setTimeout(r, 250));

    bodyText = await page.evaluate(() => document.body.innerText);
    const modalOpenedB = bodyText.includes('EVD-P001-001') && bodyText.includes('工程参建与履约证据核验面板');
    console.log(`  ✓ 方案 B 内部 [存证] 按钮按 Space -> 证据弹窗打开: ${modalOpenedB ? 'PASS' : 'FAIL'}`);
    if (!modalOpenedB) hasFailures = true;

    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 200));

    // 测试阶段表格行自身 Enter 切换
    const stageRowsB = await page.$$('tr[role="button"][aria-label*="阶段"]');
    if (stageRowsB.length < 2) throw new Error('未找到方案 B 时间轴表格行');

    await stageRowsB[1].focus();
    await page.keyboard.press('Enter');
    await new Promise(r => setTimeout(r, 200));

    bodyText = await page.evaluate(() => document.body.innerText);
    const stage2SelectedB = bodyText.includes('方案规划、地勘报告、施工图设计审图') || bodyText.includes('选中阶段：“工程设计”');
    console.log(`  ✓ 方案 B 表格行按 Enter -> 阶段成功切换: ${stage2SelectedB ? 'PASS' : 'FAIL'}`);
    if (!stage2SelectedB) hasFailures = true;

    const allPassed = !hasFailures;
    console.log(`\n最终结论: ${allPassed ? 'ALL PASS ✅' : 'FAIL ❌'}`);

    if (!allPassed) {
      console.error('❌ One or more keyboard interaction assertions failed!');
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Error executing verifyKeyboard:', err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      console.log('正在关闭无头浏览器...');
      await browser.close().catch(() => {});
    }
    if (server) {
      console.log('正在关闭本地临时测试 HTTP Server...');
      await new Promise(resolve => server.close(resolve));
    }
    console.log('verifyKeyboard 资源清理完成。');
  }
}

verifyKeyboard();
