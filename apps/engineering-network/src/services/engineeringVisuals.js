export const ENGINEERING_VISUAL_CATEGORIES = [
  { id: 'building', en: 'Buildings & housing', zh: '建筑住宅', th: 'อาคารและที่อยู่อาศัย', terms: ['residential','housing','school','schools','hospital','hospitals','police station','office building','apartment','tower','resort','hotel','住宅','学校','医院','写字楼','办公楼','大楼','อาคาร','โรงพยาบาล'] },
  { id: 'industrial', en: 'Industrial buildings', zh: '工业厂房', th: 'โรงงานอุตสาหกรรม', terms: ['factory','factories','manufacturing plant','manufacturing facility','industrial estate','warehouse','production hall','workshop','industrial building','cleanroom','厂房','工厂','车间','仓库','โรงงาน'] },
  { id: 'bridge', en: 'Bridge & viaduct', zh: '桥梁高架', th: 'สะพาน', terms: ['bridge','bridges','viaduct','viaducts','overpass','flyover','cable-stayed','悬索桥','桥梁','高架','สะพาน'] },
  { id: 'tunnel', en: 'Tunnel & underground', zh: '隧道地下', th: 'อุโมงค์', terms: ['tunnel','tunnels','underground','metro excavation','tbm','diaphragm wall','隧道','地铁','地连墙','อุโมงค์'] },
  { id: 'dam', en: 'Dam & hydropower', zh: '大坝水电', th: 'เขื่อนและไฟฟ้าพลังน้ำ', terms: ['dam','dams','hydropower','hydroelectric','reservoir','水坝','大坝','水电','เขื่อน'] },
  { id: 'energy', en: 'Power & energy', zh: '电力能源', th: 'พลังงานไฟฟ้า', terms: ['power plant','power station','solar farm','wind farm','substation','transmission line','thermal power','electricity','电厂','变电站','电力','โรงไฟฟ้า'] },
  { id: 'road', en: 'Road & highway', zh: '道路公路', th: 'ถนนทางหลวง', terms: ['highway','highways','roads','road upgrade','road works','carriageway','motorway','pavement','resurfacing','道路','高速','公路','ถนน'] },
  { id: 'rail', en: 'Rail & transit', zh: '铁路轨道', th: 'รถไฟ', terms: ['railway','railways','rail track','rail line','train depot','rail station','tramway','rail strategy','铁路','轨道交通','รถไฟ'] },
  { id: 'port', en: 'Ports & marine', zh: '港口码头', th: 'ท่าเรือ', terms: ['harbour','harbor','port expansion','marine terminal','breakwater','dockyard','jetty','码头','港口','ท่าเรือ'] },
  { id: 'water', en: 'Water & wastewater', zh: '给排水环保', th: 'น้ำและน้ำเสีย', terms: ['water supply','wastewater','sewage','treatment works','stormwater','flood management','desalination','给排水','污水','供水','น้ำเสีย'] },
  { id: 'precast', en: 'Precast concrete', zh: '预制混凝土', th: 'คอนกรีตสำเร็จรูป', terms: ['precast','prefabricated concrete','segmental concrete','hollowcore','concrete piles','预制混凝土','预制桩','管片','คอนกรีตสำเร็จรูป'] },
  { id: 'geotech', en: 'Ground & foundations', zh: '岩土基础', th: 'ธรณีเทคนิค', terms: ['geotechnical','foundation','borehole','soil investigation','pile testing','ground improvement','drilling','岩土','地勘','桩基','地基','เจาะสำรวจ'] },
  { id: 'general', en: 'Engineering', zh: '工程项目', th: 'วิศวกรรม', terms: [] }
];
export const ENGINEERING_VISUAL_STYLES = ['field','blueprint','editorial','dusk'];
function normalize(input) { return String(input || '').toLocaleLowerCase().normalize('NFKC'); }
function containsTerm(hay, term) {
  const word=normalize(term);
  if (!word || !hay) return false;
  if (/^[a-z0-9 -]+$/.test(word)) {
    let start=0;
    while((start=hay.indexOf(word,start))!==-1) {
      const before=start===0?' ':hay[start-1], after=hay[start+word.length]||' ';
      if(!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
      start++;
    }
    return false;
  }
  return hay.includes(word);
}
export function matchEngineeringCategory(record) {
  const hay = normalize([record?.title,record?.projectName,record?.classification?.description,record?.description].filter(Boolean).join(' '));
  // Specific engineering keywords take priority over broad labels; no inferred site coordinates or project status.
  const order=['precast','tunnel','geotech','dam','bridge','port','rail','road','water','energy','industrial','building'];
  for (const key of order) {
    const category=ENGINEERING_VISUAL_CATEGORIES.find(x=>x.id===key);
    if(category.terms.some(term=>containsTerm(hay,term))) return category;
  }
  return ENGINEERING_VISUAL_CATEGORIES.find(x=>x.id==='general');
}
function safeVariant(key) {
  let hash=2166136261;
  for (const ch of String(key||'')) hash=Math.imul(hash ^ ch.charCodeAt(0),16777619);
  return ENGINEERING_VISUAL_STYLES[(hash>>>0)%ENGINEERING_VISUAL_STYLES.length];
}
export function pickEngineeringVisual(record, options={}) {
  if(record?.verifiedMediaUrl && record?.mediaProvenance==='confirmed-owner-upload') {
    return {src:record.verifiedMediaUrl,illustrativeOnly:false,category:null,style:null};
  }
  const category=matchEngineeringCategory(record);
  const style=options.style && ENGINEERING_VISUAL_STYLES.includes(options.style)
    ? options.style : safeVariant(record?.id || record?.sourceRecordId || record?.title);
  return {src:'/visual-templates/'+category.id+'-'+style+'.svg',illustrativeOnly:true,category,style,license:'AI-assisted generic vector illustration'};
}
export function visualDisclosure(locale='en') {
  return locale==='zh'?'AI 通用工程示意 · 非本项目现场照片':locale==='th'?'ภาพประกอบทั่วไป ไม่ใช่ภาพถ่ายสถานที่จริง':'AI-assisted generic illustration · not this project’s site photo';
}

