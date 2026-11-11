import puppeteer from 'puppeteer-core';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

function startServer(port = 4174) {
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

async function verifyInteractions() {
  const server = await startServer(4174);
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = {};

  // 1. Test Timeline Interaction on Scheme A
  await page.goto('http://127.0.0.1:4174/a?tab=timeline', { waitUntil: 'networkidle0' });
  // Click Stage 2 (Design)
  const stageButtons = await page.$$('button');
  let clickedStage = false;
  for (const btn of stageButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('工程设计')) {
      await btn.click();
      clickedStage = true;
      break;
    }
  }
  await new Promise(r => setTimeout(r, 300));
  const stageParticipantContent = await page.evaluate(() => {
    return document.body.innerText.includes('Demo Organization C') &&
           document.body.innerText.includes('工程设计');
  });
  results.timelineInteraction = {
    clickedStage,
    participantUpdated: stageParticipantContent
  };

  // 2. Test WBS Package Expand on Scheme A
  await page.goto('http://127.0.0.1:4174/a?tab=structure', { waitUntil: 'networkidle0' });
  const wbsInitialText = await page.evaluate(() => document.body.innerText);
  // Find package 1.1 and click to expand
  const pkg11El = await page.evaluateHandle(() => {
    const divs = Array.from(document.querySelectorAll('div'));
    return divs.find(d => d.textContent.includes('1.1') && d.textContent.includes('勘察设计与方案深化工程包'));
  });
  if (pkg11El) {
    await pkg11El.click();
    await new Promise(r => setTimeout(r, 300));
  }
  const wbsExpandedText = await page.evaluate(() => document.body.innerText);
  results.wbsExpand = {
    expandedSuccess: wbsExpandedText.includes('Demo Engineer 02') && wbsExpandedText.includes('全套施工图设计图审报告')
  };

  // 3. Test Evidence Modal on Scheme A
  await page.goto('http://127.0.0.1:4174/a?tab=network', { waitUntil: 'networkidle0' });
  // Click EVD-P001-A01 in evidence table
  const evdRow = await page.evaluateHandle(() => {
    const tds = Array.from(document.querySelectorAll('td'));
    return tds.find(td => td.textContent.includes('EVD-P001-A01'));
  });
  if (evdRow) {
    await evdRow.click();
    await new Promise(r => setTimeout(r, 400));
  }
  const modalText = await page.evaluate(() => document.body.innerText);
  results.evidenceModal = {
    modalOpened: modalText.includes('工程参建与履约证据核验面板'),
    hasTimestamp: modalText.includes('2024-06-20'),
    hasVerificationBadge: modalText.includes('已双向核实'),
    hasErrataLog: modalText.includes('纠错审计记录')
  };

  // 4. Test Entity Drawer
  await page.goto('http://127.0.0.1:4174/a?tab=overview', { waitUntil: 'networkidle0' });
  // Click Demo Organization A
  const orgBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.find(b => b.textContent.includes('Demo Organization A'));
  });
  if (orgBtn) {
    await orgBtn.click();
    await new Promise(r => setTimeout(r, 400));
  }
  const drawerText = await page.evaluate(() => document.body.innerText);
  results.entityDrawer = {
    drawerOpened: drawerText.includes('参建机构履约信誉档案'),
    hasLicense: drawerText.includes('FAKE-USCC-91330000A12345678'),
    hasTrackRecord: drawerText.includes('真实存证业绩链')
  };

  // 5. Test MOCK AI Assistant Banner & Fictional Banner
  const hasFictionalBanner = drawerText.includes('FICTIONAL DEMO DATA');
  const hasMockAiLabel = drawerText.includes('MOCK 演示数据');
  results.compliance = {
    hasFictionalBanner,
    hasMockAiLabel
  };

  console.log('Interaction test results:', JSON.stringify(results, null, 2));

  await browser.close();
  server.close();
}

verifyInteractions().catch(console.error);
