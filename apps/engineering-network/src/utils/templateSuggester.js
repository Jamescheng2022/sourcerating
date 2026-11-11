/**
 * Local Deterministic Rule-Based Magazine Template Suggestion
 * Explicitly labeled MOCK in UI. No network calls, completely local client computation.
 */
import { normalizeCategory } from '../data/categories.js';

export function suggestTemplateLocally({ imageCount = 0, textLength = 0, category = 'site_update', storyType, locale = 'zh', hasSyntheticOnly = false }) {
  const effectiveCat = normalizeCategory(category || storyType);
  const isZh = locale === 'zh';

  // Rule 1: Before/After
  if (effectiveCat === 'before_after' || (imageCount === 2 && effectiveCat === 'site_update')) {
    return {
      templateId: 'before_after',
      templateName: isZh ? '施工前后变迁对比' : locale === 'th' ? 'ภาพเปรียบเทียบก่อน-หลัง' : 'Before / After Comparison',
      reason: isZh
        ? '检测到2张对比照片与现场变迁描述，本地规则推荐【施工前后对比】模板。'
        : locale === 'th'
        ? 'ตรวจพบรูปภาพเปรียบเทียบ 2 รูป กฎระบบแนะนำเทมเพลต [เปรียบเทียบก่อน-หลัง]'
        : 'Detected 2 comparative photos; local rules suggest the [Before / After] magazine layout.',
      isReady: false
    };
  }

  // Rule 2: Supplier Showcase
  if (effectiveCat === 'supply_chain') {
    return {
      templateId: 'supplier_showcase',
      templateName: isZh ? '设备与供应商展陈' : locale === 'th' ? 'แสดงอุปกรณ์และผู้ผลิต' : 'Equipment & Supplier Showcase',
      reason: isZh
        ? '检测到设备/构件供应相关内容，本地规则推荐【设备与供应商展陈】模板。'
        : locale === 'th'
        ? 'ตรวจพบเนื้อหาเครื่องจักรและอุปกรณ์ กฎระบบแนะนำเทมเพลต [แสดงอุปกรณ์และผู้ผลิต]'
        : 'Detected heavy machinery and component supply content; local rules suggest [Supplier Showcase].',
      isReady: false
    };
  }

  // Rule 3: Case Study
  if (effectiveCat === 'technical_case' || textLength > 180) {
    return {
      templateId: 'case_study',
      templateName: isZh ? '深度技术工法案例' : locale === 'th' ? 'กรณีศึกษาทางเทคนิคเชิงลึก' : 'Technical Case Study',
      reason: isZh
        ? '检测到较长技术分析描述 (>180字)，本地规则推荐【深度技术工法】长文模板。'
        : locale === 'th'
        ? 'ตรวจพบข้อมูลทางเทคนิคความยาวมาก กฎระบบแนะนำเทมเพลต [กรณีศึกษาทางเทคนิค]'
        : 'Detected detailed technical parameters (>180 chars); local rules suggest [Technical Case Study].',
      isReady: false
    };
  }

  // Rule 4: Interview
  if (effectiveCat === 'engineer_interview') {
    return {
      templateId: 'interview',
      templateName: isZh ? '总工访谈与金句' : locale === 'th' ? 'บทสัมภาษณ์วิศวกร' : 'Engineer Interview & Portrait',
      reason: isZh
        ? '检测到人物访谈/观点引语，本地规则推荐【总工访谈与金句】模板。'
        : locale === 'th'
        ? 'ตรวจพบข้อความสัมภาษณ์วิศวกร กฎระบบแนะนำเทมเพลต [บทสัมภาษณ์วิศวกร]'
        : 'Detected interview quotations and engineer profile; local rules suggest [Engineer Interview].',
      isReady: false
    };
  }

  // Rule 5: Milestone
  if (effectiveCat === 'project_progress') {
    return {
      templateId: 'milestone',
      templateName: isZh ? '重大工程节点 / 里程碑' : locale === 'th' ? 'หมุดหมายสำคัญของโครงการ' : 'Project Milestone Announcement',
      reason: isZh
        ? '检测到工程节点重大进展与单图，本地规则推荐【工程里程碑】模板。'
        : locale === 'th'
        ? 'ตรวจพบหมุดหมายงานสำคัญ กฎระบบแนะนำเทมเพลต [หมุดหมายโครงการ]'
        : 'Detected major milestone transition; local rules suggest [Project Milestone].',
      isReady: false
    };
  }

  // Rule 6: Synthetic / Low-Res Test Image Layout (Non-Field Photo)
  if (hasSyntheticOnly && imageCount > 0) {
    return {
      templateId: 'photo_essay',
      templateName: isZh ? '测试图像排版 / 未核验' : locale === 'th' ? 'จัดวางภาพทดสอบ (ยังไม่ตรวจทาน)' : 'Synthetic Test Image Layout',
      reason: isZh
        ? `检测到 ${imageCount} 张合成/低分辨率测试图片 (如 1×1 像素)，系统提供排版展示，但明确标识为非现场照片，不具备现场实景存证效力。`
        : locale === 'th'
        ? `ตรวจพบรูปภาพทดสอบ ${imageCount} รูป ระบบแสดงผลแบบร่างแต่ระบุชัดเจนว่าไม่ใช่ภาพหน้างานจริง`
        : `Detected ${imageCount} synthetic/low-res test image(s) (<64px); rendered in test layout with explicit Non-Field Photo disclaimers.`,
      isReady: true
    };
  }

  // Default: Photo Essay or Text-First Field Brief
  if (imageCount === 0) {
    return {
      templateId: 'photo_essay',
      templateName: isZh ? '现场图文简报 / 纯文字动态' : locale === 'th' ? 'รายงานข้อความภาคสนาม' : 'Field Text Brief',
      reason: isZh
        ? '检测到 0 张照片 · 纯文字工程纪实动态，本地规则推荐以简洁工程卡片形式排版。'
        : locale === 'th'
        ? 'ตรวจพบภาพถ่าย 0 รูป · รายงานความคืบหน้าแบบข้อความล้วน กฎระบบแนะนำจัดรูปแบบเป็นการ์ดข้อความวิศวกรรม'
        : 'Detected 0 photos · Text-first field brief; local rules recommend clean text card layout.',
      isReady: true
    };
  }

  return {
    templateId: 'photo_essay',
    templateName: isZh ? '现场图志 / 组图纪实' : locale === 'th' ? 'ภาพถ่ายชุดหน้างาน' : 'Field Photo Essay',
    reason: isZh
      ? `检测到 ${imageCount} 张图片，本地规则推荐当前已就绪的【现场图志 / 组图纪实】模板。`
      : locale === 'th'
      ? `ตรวจพบรูปภาพ ${imageCount} รูป แนะนำเทมเพลต [ภาพถ่ายชุดหน้างาน]`
      : `Detected ${imageCount} image(s); local rules recommend the ready [Field Photo Essay] magazine template.`,
    isReady: true
  };
}
