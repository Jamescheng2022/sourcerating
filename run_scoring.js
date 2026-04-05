/**
 * 综合打分脚本 - 直接接收 JSON stdin 或文件参�?
 * 用法: node run_scoring.js <data_file> <vix_value>
 * 
 * data_file 格式: { "CODE": { "daily_closes": [...], "weekly_closes": [...] }, ... }
 */
const fs = require('fs');
const path = require('path');

const PORTFOLIO_FILE = path.join(__dirname, 'portfolio_state.json');
const REPORT_DIR = path.join(__dirname, 'reports');

const ASSET_POOL = {
  '511260': { etf: '511260.SS', name: '十年国债ETF', type: 'hedge' },
  '518880': { etf: '518880.SH', name: '黄金ETF', type: 'hedge' },
  '159941': { etf: '159941.SZ', name: '纳指ETF', type: 'equity' },
  '510300': { etf: '510300.SS', name: '沪深300ETF', type: 'equity' },
  '159915': { etf: '159915.SZ', name: '创业板ETF', type: 'equity' },
  '159995': { etf: '159995.SZ', name: '芯片ETF', type: 'equity' },
  '561910': { etf: '561910.SH', name: '电池ETF', type: 'equity' },
  '515220': { etf: '515220.SH', name: '煤炭ETF', type: 'equity' },
  '159985': { etf: '159985.SZ', name: '豆粕ETF', type: 'commodity' },
  '512800': { etf: '512800.SH', name: '银行ETF', type: 'equity' },
  '515030': { etf: '515030.SH', name: '新能源车ETF', type: 'equity' },
};

function calcMA(c, p) { if (c.length < p) return null; return c.slice(-p).reduce((a, b) => a + b, 0) / p; }

function calcEMA(d, p) {
  if (d.length < p) return [];
  const k = 2 / (p + 1);
  let e = [d.slice(0, p).reduce((a, b) => a + b, 0) / p];
  for (let i = p; i < d.length; i++) e.push(d[i] * k + e[e.length - 1] * (1 - k));
  return e;
}

function calcMACD(c) {
  if (c.length < 35) return { macd: 0 };
  const e12 = calcEMA(c, 12), e26 = calcEMA(c, 26);
  const off = e12.length - e26.length;
  const dif = [];
  for (let i = 0; i < e26.length; i++) dif.push(e12[i + off] - e26[i]);
  const dea = calcEMA(dif, 9);
  return { dif: dif[dif.length-1], dea: dea[dea.length-1], macd: (dif[dif.length-1] - dea[dea.length-1]) * 2 };
}

function calcRSI(c, p = 14) {
  if (c.length < p + 1) return 50;
  let g = 0, l = 0;
  for (let i = c.length - p; i < c.length; i++) { const ch = c[i] - c[i-1]; if (ch > 0) g += ch; else l -= ch; }
  if (l === 0) return 100;
  return 100 - 100 / (1 + (g/p) / (l/p));
}

function score(dc, wc, type, vix) {
  if (!dc || dc.length < 260) return { score: 0, signal: '�?数据不足', detail: `数据${dc?dc.length:0}条`, components: {} };
  const cur = dc[dc.length - 1];
  const ma20 = calcMA(dc, 20), ma60 = calcMA(dc, 60), ma250 = calcMA(dc, 250);
  let inertia = 0; const id = [];
  if (ma250 && cur > ma250) { inertia += 30; id.push('MA250�?); } else id.push('MA250�?);
  if (ma60 && cur > ma60) { inertia += 20; id.push('MA60�?); } else id.push('MA60�?);
  if (ma20 && cur > ma20) { inertia += 10; id.push('MA20�?); } else id.push('MA20�?);
  
  const dm = calcMACD(dc), wm = wc && wc.length >= 35 ? calcMACD(wc) : { macd: 0 };
  let elastic = 0; const ed = [];
  if (dm.macd > 0) { elastic += 20; ed.push('日MACD红✅'); } else ed.push('日MACD绿❌');
  if (wm.macd > 0) { elastic += 20; ed.push('周MACD红✅'); } else ed.push('周MACD绿❌');
  
  let total = inertia + elastic;
  const rsi = calcRSI(dc, 14);
  const bias = ma250 ? ((cur - ma250) / ma250 * 100) : 0;
  let veto = '�?;
  if (rsi > 80 || bias > 25) { if (total > 65) total = 65; veto = `超买(RSI=${rsi.toFixed(1)},Bias=${bias.toFixed(1)}%)`; }
  if (inertia < 30 && rsi < 30) { total = 0; veto = `掉刀(惯�?${inertia},RSI=${rsi.toFixed(1)})`; }
  let vp = false;
  if (vix > 30 && type === 'equity') { total = Math.round(total * 0.5); vp = true; }
  
  const sig = total >= 78 ? '🔴 强烈买入' : total >= 66 ? '🟠 逢低买入' : total >= 52 ? '🟡 持有观测' : '🟢 离场信号';
  return { score: total, signal: sig, detail: `惯�?{inertia}/60+弹�?{elastic}/40=${inertia+elastic}${vp?' (×0.5�?+total+')':''}`, 
    components: { inertia, elastic, rsi: rsi.toFixed(1), bias: bias.toFixed(1), dailyMACD: dm.macd.toFixed(6), weeklyMACD: wm.macd.toFixed(6),
      ma20: ma20?.toFixed(3), ma60: ma60?.toFixed(3), ma250: ma250?.toFixed(3), currentPrice: cur.toFixed(3), vixPenalty: vp, veto, inertiaDetail: id.join(' '), elasticDetail: ed.join(' ') }};
}

function main() {
  const dataFile = process.argv[2] || path.join(__dirname, 'closes_data.json');
  const vix = parseFloat(process.argv[3] || '20');
  
  if (!fs.existsSync(dataFile)) { console.error('Data file not found:', dataFile); process.exit(1); }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  
  const scores = {}, prices = {};
  for (const [code, cfg] of Object.entries(ASSET_POOL)) {
    const d = data[code];
    if (!d) { console.log(`⚠️ 无数�? ${code}`); continue; }
    const dc = d.daily_closes || d.daily || [];
    const wc = d.weekly_closes || d.weekly || [];
    if (dc.length > 0) prices[code] = dc[dc.length - 1];
    scores[code] = score(dc, wc, cfg.type, vix);
    console.log(`${cfg.name}(${code}): ${scores[code].signal} ${scores[code].score}分`);
  }
  
  // 仓位管理
  let portfolio;
  try { portfolio = JSON.parse(fs.readFileSync(PORTFOLIO_FILE, 'utf-8')); }
  catch { portfolio = { account: { initial_capital: 100000, cash: 100000 }, holdings: {}, trade_history: [], daily_nav: [] }; }
  
  const ops = [];
  let hv = 0;
  for (const [c, p] of Object.entries(portfolio.holdings)) hv += p.shares * (prices[c] || p.avg_price);
  const nav = portfolio.account.cash + hv;
  const today = new Date().toISOString().slice(0, 10);
  
  for (const [code, r] of Object.entries(scores)) {
    const p = prices[code]; if (!p) continue;
    const h = portfolio.holdings[code];
    const cv = h ? h.shares * p : 0;
    
    if (r.score >= 78) {
      const tv = nav * 0.25;
      if (cv < tv * 0.95) {
        const ba = Math.min(tv - cv, portfolio.account.cash);
        if (ba > 100) {
          const s = Math.floor(ba / p / 100) * 100;
          if (s > 0) { const c2 = s * p; portfolio.account.cash -= c2;
            if (h) { const tc = h.shares*h.avg_price+c2; h.shares+=s; h.avg_price=tc/h.shares; }
            else portfolio.holdings[code] = { shares:s, avg_price:p, buy_date:today };
            ops.push({action:'买入',code,name:ASSET_POOL[code].name,shares:s,price:p,amount:c2.toFixed(2),reason:`得分${r.score}�?8`}); }}
      }
    } else if (r.score >= 66) {
      const tv = nav * 0.15;
      if (cv < tv * 0.95) {
        const ba = Math.min(tv - cv, portfolio.account.cash);
        if (ba > 100) {
          const s = Math.floor(ba / p / 100) * 100;
          if (s > 0) { const c2 = s*p; portfolio.account.cash -= c2;
            if (h) { const tc = h.shares*h.avg_price+c2; h.shares+=s; h.avg_price=tc/h.shares; }
            else portfolio.holdings[code] = { shares:s, avg_price:p, buy_date:today };
            ops.push({action:'买入',code,name:ASSET_POOL[code].name,shares:s,price:p,amount:c2.toFixed(2),reason:`得分${r.score}∈[66,78)`}); }}
      }
    } else if (r.score < 52) {
      if (h && h.shares > 0) {
        const sv = h.shares*p; const pnl = sv - h.shares*h.avg_price;
        portfolio.account.cash += sv;
        ops.push({action:'卖出',code,name:ASSET_POOL[code].name,shares:h.shares,price:p,amount:sv.toFixed(2),pnl:pnl.toFixed(2),reason:`得分${r.score}<52`});
        delete portfolio.holdings[code]; }
    }
  }
  
  // 更新NAV
  let hv2 = 0;
  for (const [c, pos] of Object.entries(portfolio.holdings)) hv2 += pos.shares * (prices[c] || pos.avg_price);
  const nav2 = portfolio.account.cash + hv2;
  portfolio.account.last_updated = today;
  if (!portfolio.daily_nav) portfolio.daily_nav = [];
  if (!portfolio.daily_nav.some(d => d.date === today)) {
    portfolio.daily_nav.push({ date: today, nav: +nav2.toFixed(2), cash: +portfolio.account.cash.toFixed(2), pnl: +(nav2-portfolio.account.initial_capital).toFixed(2), pnl_pct: +((nav2-portfolio.account.initial_capital)/portfolio.account.initial_capital*100).toFixed(2) });
  }
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
  
  // 生成报告
  const pnl = nav2 - portfolio.account.initial_capital;
  const posPct = (hv2/nav2*100).toFixed(1);
  let mm = vix > 30 ? '⚠️ 恐慌模式(VIX>30,权益×0.5)' : vix > 25 ? '⚠️ 警戒模式' : vix < 15 ? '�?贪婪模式' : '�?正常模式';
  
  let r = `═══════════════════════════════\n📊 第一性原理量化日�?${today}\n═══════════════════════════════\n\n`;
  r += `【账户概况】\n  总资�?NAV): ¥${nav2.toFixed(2)}\n  可用现金: ¥${portfolio.account.cash.toFixed(2)}\n  累计盈亏: ¥${pnl.toFixed(2)} (${(pnl/portfolio.account.initial_capital*100).toFixed(2)}%)\n  仓位占比: ${posPct}%\n\n`;
  r += `【宏观警示】\n  VIX: ${vix.toFixed(2)} �?${mm}\n\n`;
  r += `【今日操作】\n`;
  if (!ops.length) r += `  无调仓操作\n`;
  else for (const o of ops) { r += `  ${o.action==='买入'?'🟢':'🔴'} ${o.action} ${o.name}(${o.code}) ${o.shares}份×�?{o.price}=¥${o.amount} ${o.pnl?'盈亏¥'+o.pnl:''} ${o.reason}\n`; }
  r += '\n【持仓清单】\n';
  const hs = Object.entries(portfolio.holdings);
  if (!hs.length) r += '  空仓\n';
  else for (const [c, pos] of hs) { const p = prices[c]||pos.avg_price; r += `  ${ASSET_POOL[c]?.name}(${c}): ${pos.shares}�?均价¥${pos.avg_price.toFixed(3)}→现价�?{p.toFixed(3)} 浮盈¥${(pos.shares*(p-pos.avg_price)).toFixed(2)}(${((p-pos.avg_price)/pos.avg_price*100).toFixed(2)}%)\n`; }
  r += '\n【打分明细】\n';
  const sorted = Object.entries(scores).sort((a,b)=>b[1].score-a[1].score);
  for (const [c, s] of sorted) {
    r += `  ${s.signal} ${ASSET_POOL[c]?.name}(${c}): ${s.score}�?| ${s.detail}\n`;
    r += `    ${s.components.inertiaDetail} | ${s.components.elasticDetail}\n`;
    if (s.components.veto !== '�?) r += `    ⚠️ ${s.components.veto}\n`;
    r += `    RSI=${s.components.rsi} Bias=${s.components.bias}% 现价=${s.components.currentPrice}\n`;
  }
  r += `\n═══════════════════════════════\n`;
  
  console.log('\n' + r);
  
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, `report_${today}.txt`), r);
  fs.writeFileSync(path.join(REPORT_DIR, `result_${today}.json`), JSON.stringify({ date: today, vix, nav: +nav2.toFixed(2), pnl: +pnl.toFixed(2), operations: ops, scores: Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,{score:v.score,signal:v.signal}])) }, null, 2));
  
  console.log('�?完成');
}

main();

