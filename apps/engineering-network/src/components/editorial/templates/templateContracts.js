/**
 * Engineering Network V4 Magazine Template Contracts
 * JSON contracts defining layout types, blocks, aspect ratios, and editable fields
 */

export const MAGAZINE_TEMPLATES = [
  {
    id: 'photo_essay',
    name: '现场图志 / 组图纪实',
    englishName: 'Photo Essay',
    aspectRatio: '4:5',
    isReady: true,
    tag: '已就绪 (Ready)',
    description: '多张工程现场高清组图序列，每图配单行图注，视觉主导，强调施工真实质感。',
    suitableFor: '关键构件吊装、大型设备进场、全景施工进展',
    editableFields: ['images', 'headline', 'caption']
  },
  {
    id: 'milestone',
    name: '重大工程节点 / 里程碑',
    englishName: 'Milestone',
    aspectRatio: '16:9',
    isReady: false,
    tag: '即将推出 (Coming Soon)',
    description: '单张震撼主图搭配超大数字标高/日期与核心指标关系芯片。',
    suitableFor: '封顶合龙、贯通验收、重大阶段交接',
    editableFields: ['heroImage', 'milestoneNumber', 'milestoneLabel', 'stats', 'headline']
  },
  {
    id: 'supplier_showcase',
    name: '设备与供应商展陈',
    englishName: 'Supplier Showcase',
    aspectRatio: '4:5',
    isReady: false,
    tag: '即将推出 (Coming Soon)',
    description: '工业设备或材料网格实物图 + 结构化参数规约表与资质标签。',
    suitableFor: '构件出厂质检、特种装备进场、材料批次溯源',
    editableFields: ['productImages', 'supplierName', 'specs', 'headline']
  },
  {
    id: 'case_study',
    name: '深度技术工法案例',
    englishName: 'Technical Case Study',
    aspectRatio: '16:9',
    isReady: false,
    tag: '即将推出 (Coming Soon)',
    description: '长文排版：醒目标题、引言大图与图文交替深度工法剖析。',
    suitableFor: '复杂技术攻关、微振动控制、深基坑变形监测论文',
    editableFields: ['leadImage', 'headline', 'sections']
  },
  {
    id: 'interview',
    name: '总工访谈与金句',
    englishName: 'Interview / Portrait',
    aspectRatio: '4:5',
    isReady: false,
    tag: '即将推出 (Coming Soon)',
    description: '人物竖构图肖像、特色宋体大号引语金句与执业工程师履历小传。',
    suitableFor: '项目总监观点、匠心技艺专访、技术决策复盘',
    editableFields: ['portraitImage', 'quote', 'intervieweeName', 'intervieweeBio']
  },
  {
    id: 'before_after',
    name: '施工前后变迁对比',
    englishName: 'Before & After',
    aspectRatio: '16:9',
    isReady: false,
    tag: '即将推出 (Coming Soon)',
    description: '双图对比排版，附带施工前/顶升后标签与共享演进说明。',
    suitableFor: '改造前后对比、结构顶升到位对照、深基坑开挖至封底',
    editableFields: ['beforeImage', 'afterImage', 'beforeLabel', 'afterLabel', 'caption']
  }
];

export const TEMPLATES_I18N = {
  photo_essay: {
    nameEn: 'Field Photo Essay',
    descEn: 'Sequence of high-definition on-site photos with concise captions, highlighting physical construction texture.',
    nameTh: 'ชุดภาพถ่ายหน้างาน',
    descTh: 'ภาพถ่ายหน้างานความคมชัดสูงพร้อมคำบรรยายภาพ เน้นเนื้อหาสภาพหน้างานจริง'
  },
  milestone: {
    nameEn: 'Project Milestone Announcement',
    descEn: 'Single impactful hero photo paired with prominent elevation/date figures and core indicator relationship chips.',
    nameTh: 'ประกาศหมุดหมายสำคัญของโครงการ',
    descTh: 'ภาพหลักสำคัญพร้อมตัวเลขและวันที่เชื่อมโยงกับหมุดหมายโครงการ'
  },
  supplier_showcase: {
    nameEn: 'Equipment & Supplier Showcase',
    descEn: 'Industrial equipment or material grid photos with structured specification tables and qualification labels.',
    nameTh: 'แสดงอุปกรณ์และผู้ผลิต',
    descTh: 'ภาพอุปกรณ์เครื่องจักรหรือวัสดุอุตสาหกรรมพร้อมตารางสเปกและฉลากรับรอง'
  },
  case_study: {
    nameEn: 'Technical Case Study',
    descEn: 'Long-form editorial layout: bold headline, opening hero image, and deep method analysis alternating between text and figures.',
    nameTh: 'กรณีศึกษาทางเทคนิคเชิงลึก',
    descTh: 'การจัดหน้าแบบบทความยาว พาดหัวตัวหนา ภาพหลัก และการวิเคราะห์วิธีการทางเทคนิค'
  },
  interview: {
    nameEn: 'Engineer Interview & Portrait',
    descEn: 'Vertical portrait layout featuring prominent quote callouts and licensed engineer biographical summary.',
    nameTh: 'บทสัมภาษณ์วิศวกร',
    descTh: 'ภาพบุคคลแนวตั้งพร้อมข้อความคำพูดสำคัญและประวัติวิศวกรวิชาชีพ'
  },
  before_after: {
    nameEn: 'Before & After Comparison',
    descEn: 'Side-by-side comparative layout with before/after stage badges and shared evolutionary narrative.',
    nameTh: 'ภาพเปรียบเทียบก่อน-หลัง',
    descTh: 'การจัดวางภาพคู่เปรียบเทียบก่อน-หลังพร้อมคำบรรยายพัฒนาการ'
  }
};

export function getTemplateById(templateId) {
  return MAGAZINE_TEMPLATES.find(t => t.id === templateId) || MAGAZINE_TEMPLATES[0];
}

export function getLocalizedTemplateContract(tpl, locale) {
  if (!tpl) return tpl;
  if (locale === 'zh') return tpl;
  const i18n = TEMPLATES_I18N[tpl.id];
  if (!i18n) return tpl;
  return {
    ...tpl,
    name: locale === 'en' ? (tpl.englishName || i18n.nameEn) : (i18n.nameTh || tpl.englishName),
    description: locale === 'en' ? i18n.descEn : (i18n.descTh || i18n.descEn)
  };
}
