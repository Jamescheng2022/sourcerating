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

async function auditTruncation() {
  let server = null;
  let browser = null;

  try {
    server = await startServer(4175);
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    const schemes = ['a', 'b'];
    const viewports = [
      { width: 390, height: 844, isMobile: true, label: '390' },
      { width: 768, height: 1024, isMobile: false, label: '768' },
      { width: 1440, height: 900, isMobile: false, label: '1440' }
    ];
    const views = ['overview', 'timeline', 'structure', 'network'];

    const results = [];
    let totalTruncatedCount = 0;
    let criticalClipErrors = [];
    let boundaryViolations = [];

    console.log('=== 文本截断、容器裁剪(clip/clamp)与响应式边界自动化深度审计 ===');

    for (const scheme of schemes) {
      for (const vp of viewports) {
        await page.setViewport({
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: vp.isMobile ? 3 : 1,
          isMobile: vp.isMobile,
          hasTouch: vp.isMobile
        });

        for (const view of views) {
          const url = `http://127.0.0.1:4175/${scheme}?tab=${view}`;
          await page.goto(url, { waitUntil: 'networkidle0' });
          await new Promise(r => setTimeout(r, 200));

          // 1. Audit text-overflow ellipsis with real overflow (scrollWidth > clientWidth)
          const truncatedElements = await page.evaluate(() => {
            const all = document.querySelectorAll('*');
            const truncated = [];

            for (const el of all) {
              const style = window.getComputedStyle(el);
              if (style.textOverflow === 'ellipsis') {
                if (el.scrollWidth > el.clientWidth) {
                  // Ignore if self or parent is intentionally horizontally scrollable
                  let parent = el.parentElement;
                  let insideHorizontalScroll = false;
                  while (parent) {
                    const pStyle = window.getComputedStyle(parent);
                    if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                      insideHorizontalScroll = true;
                      break;
                    }
                    parent = parent.parentElement;
                  }
                  if (!insideHorizontalScroll) {
                    truncated.push({
                      tagName: el.tagName,
                      className: el.className,
                      text: el.textContent?.trim().slice(0, 40),
                      scrollWidth: el.scrollWidth,
                      clientWidth: el.clientWidth
                    });
                  }
                }
              }
            }
            return truncated;
          });

          // 2. Audit unintended overflow: clip / -webkit-line-clamp hiding critical header or main text
          const clipAudit = await page.evaluate(() => {
            const issues = [];
            // Check critical headings, tab titles, and WBS deliverables
            const criticalEls = document.querySelectorAll('h1, h2, h3, h4, header, nav, [role="tab"], .wbs-deliverable');
            for (const el of criticalEls) {
              const style = window.getComputedStyle(el);
              const isClipped = style.overflow === 'clip' || style.overflowX === 'clip' || style.overflowY === 'clip';
              const isClamped = style.webkitLineClamp && style.webkitLineClamp !== 'none';
              if ((isClipped || isClamped) && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) {
                issues.push({
                  tag: el.tagName,
                  text: el.textContent?.trim().slice(0, 30),
                  isClipped,
                  isClamped,
                  scrollHeight: el.scrollHeight,
                  clientHeight: el.clientHeight
                });
              }
            }
            return issues;
          });

          if (clipAudit.length > 0) {
            clipAudit.forEach(item => {
              criticalClipErrors.push({
                scheme: scheme.toUpperCase(),
                viewport: vp.label,
                view,
                ...item
              });
            });
          }

          // 3. Scheme A Mobile 390 Hero & Tabs First Screen Fold Check
          let tabsFoldCheck = null;
          if (scheme === 'a' && vp.label === '390' && view === 'overview') {
            tabsFoldCheck = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const tabBtn = buttons.find(b => b.textContent && b.textContent.includes('时间轴'));
              if (tabBtn) {
                const rect = tabBtn.getBoundingClientRect();
                return {
                  tabTop: Math.round(rect.top),
                  tabBottom: Math.round(rect.bottom),
                  viewportHeight: window.innerHeight,
                  isInFold: rect.bottom <= window.innerHeight
                };
              }
              return null;
            });

            if (tabsFoldCheck && !tabsFoldCheck.isInFold) {
              boundaryViolations.push(
                `[Fold Violation] 方案 A 移动端 390 选项卡底部位置 (${tabsFoldCheck.tabBottom}px) 超出首屏视口高度 (${tabsFoldCheck.viewportHeight}px)`
              );
            }
          }

          // 4. Check 768px and all viewports horizontal page overflow (root scrollWidth <= clientWidth)
          const pageOverflowCheck = await page.evaluate(() => {
            const root = document.documentElement;
            return {
              scrollWidth: root.scrollWidth,
              clientWidth: root.clientWidth,
              hasHorizontalOverflow: root.scrollWidth > root.clientWidth
            };
          });

          if (pageOverflowCheck.hasHorizontalOverflow) {
            boundaryViolations.push(
              `[Horizontal Scroll Violation] 方案 ${scheme.toUpperCase()} [${view}] 在 ${vp.label}px 产生页面级水平横向滚动 (scrollWidth: ${pageOverflowCheck.scrollWidth} > clientWidth: ${pageOverflowCheck.clientWidth})`
            );
          }

          totalTruncatedCount += truncatedElements.length;
          results.push({
            scheme: scheme.toUpperCase(),
            viewport: `${vp.label}px`,
            view,
            truncatedCount: truncatedElements.length,
            truncatedElements,
            clipIssuesCount: clipAudit.length,
            tabsFoldCheck,
            pageOverflowCheck
          });

          console.log(`Scheme ${scheme.toUpperCase()} [${view.padEnd(9)}] @ ${vp.label.padEnd(4)}px: Ellipsis = ${truncatedElements.length}, Clip Issues = ${clipAudit.length}, Root Overflow = ${pageOverflowCheck.hasHorizontalOverflow ? 'FAIL' : 'PASS'}`);
          if (tabsFoldCheck) {
            console.log(`  -> Mobile 390 Hero Check: Tab Bottom = ${tabsFoldCheck.tabBottom}px, Viewport = ${tabsFoldCheck.viewportHeight}px (First Screen Fold: ${tabsFoldCheck.isInFold ? 'PASS' : 'FAIL'})`);
          }
        }
      }
    }

    console.log(`\n================ 审计汇总 ================`);
    console.log(`1. text-overflow: ellipsis 截断元素总数: ${totalTruncatedCount}`);
    console.log(`2. 关键区域 overflow clip / clamp 隐匿数: ${criticalClipErrors.length}`);
    console.log(`3. 页面视口边界违规数 (首屏/横向溢出): ${boundaryViolations.length}`);

    fs.writeFileSync(
      path.resolve(__dirname, '../screenshots/truncation-audit.json'),
      JSON.stringify({ totalTruncatedCount, criticalClipErrors, boundaryViolations, results }, null, 2),
      'utf-8'
    );

    let hasFailures = false;
    if (totalTruncatedCount > 0) {
      console.error(`❌ 发现 ${totalTruncatedCount} 处文本无意截断！`);
      hasFailures = true;
    }
    if (criticalClipErrors.length > 0) {
      console.error(`❌ 发现关键区域裁剪隐匿违规:`, criticalClipErrors);
      hasFailures = true;
    }
    if (boundaryViolations.length > 0) {
      console.error(`❌ 发现响应式视口边界违规:`, boundaryViolations);
      hasFailures = true;
    }

    if (hasFailures) {
      console.error('❌ auditTruncation 存在审计违规项！');
      process.exitCode = 1;
    } else {
      console.log('✅ 全部视口 (390/768/1440) 与四大视图文本未截断、无关键信息隐藏、首屏和页面边界均 100% 达标！');
    }
  } catch (err) {
    console.error('❌ auditTruncation 执行异常:', err);
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
    console.log('auditTruncation 资源清理完成。');
  }
}

auditTruncation();
