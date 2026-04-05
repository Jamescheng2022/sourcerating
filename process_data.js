const fs = require('fs');
const path = require('path');

function parseKline(klineStr) {
  const [date, open, close, high, low, volume, amount] = klineStr.split(',');
  return {
    date: date,
    open: parseFloat(open),
    close: parseFloat(close),
    high: parseFloat(high),
    low: parseFloat(low),
    volume: parseInt(volume)
  };
}

const etfs = [
  '511260', '518880', '159941', '510300', '159915',
  '159995', '561910', '515220', '159985', '512800', '515030'
];

// This script expects raw_data to be populated.
// I'll append the data to this file later.
// const raw_data = { "511260": { "daily": [...], "weekly": [...] }, ... };

const market_data = {};

etfs.forEach(code => {
  if (!raw_data[code]) return;
  market_data[code] = {
    daily: raw_data[code].daily.map(parseKline),
    weekly: raw_data[code].weekly.map(parseKline)
  };
});

fs.writeFileSync(
  path.join(__dirname, 'market_data.json'),
  JSON.stringify(market_data, null, 2)
);
console.log('Successfully generated market_data.json');

