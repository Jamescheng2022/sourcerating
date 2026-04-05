/**
 * 数据预处理脚�?
 * 将东方财富API的原始JSON解析为标准格�?
 * 用法：node prepare_data.js <raw_data_dir>
 */
const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, 'raw_data');
const OUTPUT = path.join(__dirname, 'market_data.json');

const ASSETS = {
  '511260': { secid: '1.511260' },
  '518880': { secid: '1.518880' },
  '159941': { secid: '0.159941' },
  '510300': { secid: '1.510300' },
  '159915': { secid: '0.159915' },
  '159995': { secid: '0.159995' },
  '561910': { secid: '1.561910' },
  '515220': { secid: '1.515220' },
  '159985': { secid: '0.159985' },
  '512800': { secid: '1.512800' },
  '515030': { secid: '1.515030' },
};

function parseKlines(jsonStr) {
  try {
    const json = JSON.parse(jsonStr);
    if (!json.data || !json.data.klines) return [];
    return json.data.klines.map(line => {
      const p = line.split(',');
      return {
        date: p[0],
        open: parseFloat(p[1]),
        close: parseFloat(p[2]),
        high: parseFloat(p[3]),
        low: parseFloat(p[4]),
        volume: parseFloat(p[5]),
      };
    });
  } catch (e) {
    console.error('JSON parse error:', e.message);
    return [];
  }
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error('raw_data/ directory not found');
    process.exit(1);
  }

  const result = {};
  for (const [code] of Object.entries(ASSETS)) {
    const dailyFile = path.join(RAW_DIR, `${code}_daily.json`);
    const weeklyFile = path.join(RAW_DIR, `${code}_weekly.json`);
    
    result[code] = {
      daily: fs.existsSync(dailyFile) ? parseKlines(fs.readFileSync(dailyFile, 'utf-8')) : [],
      weekly: fs.existsSync(weeklyFile) ? parseKlines(fs.readFileSync(weeklyFile, 'utf-8')) : [],
    };
    console.log(`${code}: daily=${result[code].daily.length} weekly=${result[code].weekly.length}`);
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n�?Saved to ${OUTPUT}`);
}

main();

