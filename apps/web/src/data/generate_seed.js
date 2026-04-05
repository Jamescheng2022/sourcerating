const fs = require('fs');
const path = require('path');

const suppliers = [
  {
    "company_name_en": "Shenzhen Huntkey Electric Co., Ltd.",
    "company_name_zh": "深圳航嘉驰源电气股份有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 1995,
    "product_categories": ["Power Adapters", "PD Chargers", "Power Strips"],
    "paid_in_capital_rmb": 150000000,
    "employee_count": 850,
    "patents": { "invention": 45, "utility": 120, "design": 30 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.98,
    "hs_codes": ["8504.40", "8504.90"],
    "certifications": ["CE", "UL", "RoHS", "ISO 9001"],
    "tier": "Top 10"
  },
  {
    "company_name_en": "Anker Innovations Co., Ltd.",
    "company_name_zh": "安克创新科技股份有限公司",
    "location": "Changsha, Hunan / Shenzhen",
    "established_year": 2011,
    "product_categories": ["GaN Chargers", "Power Banks", "USB-C Adapters"],
    "paid_in_capital_rmb": 406000000,
    "employee_count": 3500,
    "patents": { "invention": 200, "utility": 450, "design": 100 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.95,
    "hs_codes": ["8504.40", "8507.60"],
    "certifications": ["CE", "UL", "FCC", "ISO 9001"],
    "tier": "Global Leader"
  },
  {
    "company_name_en": "Ugreen Group Ltd",
    "company_name_zh": "深圳市绿联科技股份有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 2012,
    "product_categories": ["Nexode GaN Chargers", "Laptop Adapters"],
    "paid_in_capital_rmb": 350000000,
    "employee_count": 1200,
    "patents": { "invention": 50, "utility": 150, "design": 80 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.92,
    "hs_codes": ["8504.40", "8517.70"],
    "certifications": ["CE", "UL", "RoHS", "ISO 9001"],
    "tier": "Top 5"
  },
  {
    "company_name_en": "Baseus Technology",
    "company_name_zh": "深圳市倍思科技有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 2011,
    "product_categories": ["GaN Chargers", "Car Chargers", "Multi-port Adapters"],
    "paid_in_capital_rmb": 100000000,
    "employee_count": 900,
    "patents": { "invention": 30, "utility": 100, "design": 60 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.90,
    "hs_codes": ["8504.40"],
    "certifications": ["CE", "FCC", "RoHS", "ISO 9001"],
    "tier": "Global Brand"
  },
  {
    "company_name_en": "Delta Electronics (China) Co., Ltd.",
    "company_name_zh": "台达电子工业股份有限公司",
    "location": "Shanghai / Dongguan",
    "established_year": 1992,
    "product_categories": ["Laptop Adapters", "Industrial Power Supplies"],
    "paid_in_capital_rmb": 500000000,
    "employee_count": 15000,
    "patents": { "invention": 1000, "utility": 3000, "design": 500 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 1.0,
    "hs_codes": ["8504.40", "8504.50"],
    "certifications": ["CE", "UL", "ISO 14001", "ISO 9001"],
    "tier": "World Largest"
  },
  {
    "company_name_en": "Mean Well (Guangzhou) Electronics Co., Ltd.",
    "company_name_zh": "明纬（广州）电子有限公司",
    "location": "Guangzhou, Guangdong",
    "established_year": 1993,
    "product_categories": ["Standard Switching Power Supplies"],
    "paid_in_capital_rmb": 200000000,
    "employee_count": 2500,
    "patents": { "invention": 20, "utility": 80, "design": 10 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.99,
    "hs_codes": ["8504.40"],
    "certifications": ["CE", "UL", "RoHS", "ISO 9001"],
    "tier": "Global Top 5"
  },
  {
    "company_name_en": "Shenzhen SOY Technology Co., Ltd.",
    "company_name_zh": "深圳市索源科技有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 2010,
    "product_categories": ["Medical & ITE Power Adapters"],
    "paid_in_capital_rmb": 20000000,
    "employee_count": 450,
    "patents": { "invention": 5, "utility": 25, "design": 10 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.94,
    "hs_codes": ["8504.40"],
    "certifications": ["CE", "UL", "ISO 13485", "ISO 9001"],
    "tier": "Medical Leader"
  },
  {
    "company_name_en": "Shenzhen Honor Electronic Co., Ltd.",
    "company_name_zh": "深圳欧陆通电子股份有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 2006,
    "product_categories": ["Server Power Supplies", "High-power Adapters"],
    "paid_in_capital_rmb": 150000000,
    "employee_count": 1800,
    "patents": { "invention": 15, "utility": 60, "design": 20 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.95,
    "hs_codes": ["8504.40"],
    "certifications": ["CE", "UL", "RoHS", "ISO 9001"],
    "tier": "Top 5"
  },
  {
    "company_name_en": "Shenzhen MOSO Power Supply Technology Co., Ltd.",
    "company_name_zh": "茂硕电源科技股份有限公司",
    "location": "Shenzhen, Guangdong",
    "established_year": 2006,
    "product_categories": ["LED Drivers", "Consumer Electronics Adapters"],
    "paid_in_capital_rmb": 320000000,
    "employee_count": 2200,
    "patents": { "invention": 25, "utility": 110, "design": 40 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.93,
    "hs_codes": ["8504.40", "8504.10"],
    "certifications": ["CE", "UL", "ISO 9001"],
    "tier": "Listed Company"
  },
  {
    "company_name_en": "Phihong (Dongguan) Electronics Co., Ltd.",
    "company_name_zh": "飞宏科技",
    "location": "Dongguan, Guangdong",
    "established_year": 1972,
    "product_categories": ["PoE Adapters", "EV Charging Piles"],
    "paid_in_capital_rmb": 300000000,
    "employee_count": 3500,
    "patents": { "invention": 40, "utility": 150, "design": 30 },
    "has_lawsuits": false,
    "is_dishonest": false,
    "monthly_export_consistency": 0.97,
    "hs_codes": ["8504.40", "8517.62"],
    "certifications": ["CE", "UL", "PoE", "ISO 9001"],
    "tier": "Top Global"
  }
];

function calculateScore(supplier) {
  const currentYear = new Date().getFullYear();
  const age = Math.min(5, currentYear - supplier.established_year);
  
  // A. Business Foundation (35%)
  // A1. Operational Stability (Age) - max 5
  const a1 = age;

  // A2. Financial Commitment (Paid-in) - max 10
  let a2 = 0;
  const capital = supplier.paid_in_capital_rmb / 1000000; // to Million RMB
  if (capital > 10) a2 = 10;
  else if (capital >= 5) a2 = 8;
  else if (capital >= 1) a2 = 5;
  else a2 = 2;

  // A3. Scale & Capacity - max 10
  let a3 = 0;
  const emp = supplier.employee_count;
  if (emp > 150) a3 = 8;
  else if (emp >= 50) a3 = 6;
  else if (emp >= 20) a3 = 3;
  else a3 = 1;
  // Bonus for "Real Factory" (Manufacturing + 100+ emp + 5+ years)
  if (emp >= 100 && (currentYear - supplier.established_year) >= 5) {
    a3 = Math.min(10, a3 + 2);
  }

  // A4. Innovation & IP - max 5
  let a4 = 0;
  if (supplier.patents) {
    a4 += (supplier.patents.invention || 0) * 2;
    a4 += (supplier.patents.utility || 0) * 1;
    a4 += (supplier.patents.design || 0) * 0.5;
  }
  a4 = Math.min(5, a4);

  // A5. Compliance & Risk - max 5
  let a5 = 5;
  if (supplier.is_dishonest) a5 = 0;
  else if (supplier.has_lawsuits) a5 -= 2;

  const foundationTotal = a1 + a2 + a3 + a4 + a5; // max 35

  // B. Trade Footprint (45%)
  const consistencyScore = supplier.monthly_export_consistency * 20; // max 20
  const buyerProfileScore = 15; // Placeholder
  const specializationScore = supplier.hs_codes.length <= 2 ? 10 : 7; // max 10
  const tradeTotal = consistencyScore + buyerProfileScore + specializationScore; // max 45

  // C. Digital Signals (20%)
  const certScore = Math.min(10, supplier.certifications.length * 2.5); // 2.5 per cert, cap 10
  const digitalFootprintScore = 10; // Placeholder
  const digitalTotal = certScore + digitalFootprintScore; // max 20

  const totalScore = Math.round(foundationTotal + tradeTotal + digitalTotal);
  
  return {
    totalScore,
    categories: [
      { name: 'Identity', score: Math.round(foundationTotal), max: 35, color: 'bg-blue-600' },
      { name: 'Compliance', score: Math.round(digitalTotal), max: 20, color: 'bg-purple-500' },
      { name: 'Trade', score: Math.round(tradeTotal), max: 45, color: 'bg-amber-500' },
      { name: 'Reputation', score: 10, max: 15, color: 'bg-emerald-500' },
    ]
  };
}

const enrichedSuppliers = suppliers.map(s => {
  const scoreData = calculateScore(s);
  return {
    ...s,
    ...scoreData
  };
});

// Save to file if running in Node
const dataPath = path.join(__dirname, 'seed_data.json');
fs.writeFileSync(dataPath, JSON.stringify(enrichedSuppliers, null, 2));
console.log('Seed data saved successfully to:', dataPath);
