const fs = require('fs');
const path = require('path');

const etfs = [
  { code: '511260', secid: '1.511260' },
  { code: '518880', secid: '1.518880' },
  { code: '159941', secid: '0.159941' },
  { code: '510300', secid: '1.510300' },
  { code: '159915', secid: '0.159915' },
  { code: '159995', secid: '0.159995' },
  { code: '561910', secid: '1.561910' },
  { code: '515220', secid: '1.515220' },
  { code: '159985', secid: '0.159985' },
  { code: '512800', secid: '1.512800' },
  { code: '515030', secid: '1.515030' }
];

async function fetchData() {
  const result = {};

  for (const etf of etfs) {
    console.log(`Fetching ${etf.code}...`);
    
    // Daily
    const dailyUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${etf.secid}&fields1=f1&fields2=f51,f52,f53,f54,f55&klt=101&fqt=0&end=20990101&lmt=300`;
    const dailyRes = await fetch(dailyUrl).then(r => r.json());
    const dailyCloses = dailyRes.data.klines.map(k => parseFloat(k.split(',')[2]));

    // Weekly
    const weeklyUrl = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${etf.secid}&fields1=f1&fields2=f51,f52,f53,f54,f55&klt=102&fqt=0&end=20990101&lmt=100`;
    const weeklyRes = await fetch(weeklyUrl).then(r => r.json());
    const weeklyCloses = weeklyRes.data.klines.map(k => parseFloat(k.split(',')[2]));

    result[etf.code] = {
      daily_closes: dailyCloses,
      weekly_closes: weeklyCloses
    };
  }

  const outputPath = path.join(__dirname, 'closes_data.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Data saved to ${outputPath}`);
}

fetchData().catch(err => {
  console.error(err);
  process.exit(1);
});

