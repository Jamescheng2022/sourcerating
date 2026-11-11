/**
 * Professional Article Categories Taxonomy
 * 规范化工程文章专业分类体系 (严格区别于视觉杂志版式模板)
 */

export const ARTICLE_CATEGORIES = [
  {
    id: 'site_update',
    labelZh: '现场纪实与进展',
    labelEn: 'On-site Update',
    labelTh: 'อัปเดตหน้างาน',
    descZh: '施工一线进场、工序穿插、机械装配与当日实况组图',
    descEn: 'On-site construction progress, equipment mobilization, and daily logs',
    descTh: 'ความคืบหน้าการก่อสร้างหน้างาน การระดมเครื่องจักร และบันทึกประจำวัน',
    iconName: 'Camera',
    suggestedLayout: 'photo_essay',
  },
  {
    id: 'project_progress',
    labelZh: '重大工程里程碑',
    labelEn: 'Project Progress',
    labelTh: 'ความคืบหน้าโครงการ',
    descZh: '结构封顶、主跨合龙、隧洞贯通与阶段验收节点公报',
    descEn: 'Structural topping out, closure milestones, tunnel breakthroughs, and statutory acceptance',
    descTh: 'การขึ้นโครงสร้างสูงสุด การเชื่อมคานหลัก และการตรวจรับงานสำคัญ',
    iconName: 'Milestone',
    suggestedLayout: 'milestone',
  },
  {
    id: 'technical_case',
    labelZh: '技术攻关与工法',
    labelEn: 'Technical Case',
    labelTh: 'กรณีศึกษาทางเทคนิค',
    descZh: '复杂地质基坑控制、深冷绝热、微振动台基等技术验算复盘',
    descEn: 'Engineering calculations, deep foundation analysis, micro-vibration mitigation, and construction innovations',
    descTh: 'การคำนวณทางวิศวกรรม การวิเคราะห์ฐานรากลึก และนวัตกรรมการก่อสร้าง',
    iconName: 'Sparkles',
    suggestedLayout: 'case_study',
  },
  {
    id: 'supply_chain',
    labelZh: '装备与供应链',
    labelEn: 'Equipment & Supply Chain',
    labelTh: 'อุปกรณ์และห่วงโซ่อุปทาน',
    descZh: '重载起重设备、特种构件出厂见证检验与物资供应链调度',
    descEn: 'Heavy machinery mobilization, factory inspection witnessed records, and procurement delivery',
    descTh: 'เครื่องจักรกลหนัก การตรวจรับชิ้นงานพิเศษจากโรงงาน และการส่งมอบอุปกรณ์',
    iconName: 'Building2',
    suggestedLayout: 'supplier',
  },
  {
    id: 'engineer_interview',
    labelZh: '工程师访谈与专栏',
    labelEn: 'Engineer Interview',
    labelTh: 'บทสัมภาษณ์วิศวกร',
    descZh: '项目总工深度述评、现场工长经验之谈与执业观点纪要',
    descEn: 'Chief engineer perspectives, site director interviews, and licensed practitioner insights',
    descTh: 'มุมมองหัวหน้าวิศวกร บทสัมภาษณ์ผู้ควบคุมงาน และความเห็นจากผู้เชี่ยวชาญ',
    iconName: 'User',
    suggestedLayout: 'interview',
  },
  {
    id: 'before_after',
    labelZh: '施工前后对比',
    labelEn: 'Before / After',
    labelTh: 'ภาพเปรียบเทียบก่อน-หลัง',
    descZh: '施工前后地貌演进、关键工序节点同机位演进对比',
    descEn: 'Site transformation, fixed-angle time-lapse comparisons, and stage transitions',
    descTh: 'การเปลี่ยนแปลงของพื้นที่หน้างาน การเปรียบเทียบภาพถ่ายมุมเดิมตามช่วงเวลา',
    iconName: 'Layout',
    suggestedLayout: 'before_after',
  },
  {
    id: 'industry_news',
    labelZh: '行业观察与公报',
    labelEn: 'Industry News',
    labelTh: 'ข่าวสารอุตสาหกรรม',
    descZh: '法定采招公示、图审新规、住建规范颁行与市场宏观速递',
    descEn: 'Procurement announcements, engineering standards updates, and official public notices',
    descTh: 'ประกาศจัดซื้อจัดจ้าง มาตรฐานวิศวกรรมใหม่ และข่าวสารข้อบังคับราชการ',
    iconName: 'FileText',
    suggestedLayout: 'photo_essay',
  },
];

/**
 * Adapter ensuring backward compatibility with legacy drafts or posts using storyType
 */
export function normalizeCategory(val) {
  if (!val) return 'site_update';
  const v = String(val).toLowerCase().trim();
  switch (v) {
    case 'site':
    case 'site_update':
      return 'site_update';
    case 'milestone':
    case 'project_progress':
      return 'project_progress';
    case 'technical':
    case 'case_study':
    case 'technical_case':
      return 'technical_case';
    case 'supplier':
    case 'supply_chain':
      return 'supply_chain';
    case 'interview':
    case 'engineer_interview':
      return 'engineer_interview';
    case 'before_after':
      return 'before_after';
    case 'news':
    case 'industry_news':
      return 'industry_news';
    default:
      return 'site_update';
  }
}

/**
 * Helper to get localized category name
 */
export function getCategoryLabel(categoryId, locale = 'zh') {
  const cat = ARTICLE_CATEGORIES.find(c => c.id === normalizeCategory(categoryId));
  if (!cat) return categoryId;
  if (locale === 'zh') return cat.labelZh;
  if (locale === 'th') return cat.labelTh || cat.labelEn;
  return cat.labelEn;
}
