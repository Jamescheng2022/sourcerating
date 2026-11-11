import React from 'react';
import { X, ShieldCheck, UserCheck, Bot, Clock, FileText, CheckCircle2, AlertCircle, Hash, History, AlertTriangle } from 'lucide-react';
import { useDialogA11y } from '../../utils/useDialogA11y';
import { useI18n } from '../../i18n/I18nContext';

// Localized custom overrides for key project evidence dossiers (ensures 0 Chinese in EN/TH mode)
export const EVIDENCE_LOCALIZATIONS = {
  'EVD-P001-B01': {
    en: {
      sourceType: 'Public Tender Notice & Statutory Construction Permit Gazette',
      sourceOrg: 'Municipal Housing & Construction Authority · Project Office (Demo)',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Statutory construction permit obtained (FAKE-BUILD-PERMIT-2025-019), advancing project into superstructure steel assembly. Commercial contracts, guarantee bonds, and financial disbursement details are confidential and excluded from public display.',
      errataLog: [
        { date: '2025-05-12', action: 'Permit Gazette Archived', user: 'Demo Organization A', note: 'Statutory building permit gazette verified' },
        { date: '2025-08-01', action: 'Site Key Personnel Filed', user: 'Demo Org G Supervision Team', note: 'Project director and site command team roster recorded' }
      ]
    },
    th: {
      sourceType: 'ประกาศผลการประกวดราคาและใบอนุญาตก่อสร้างสาธารณะ',
      sourceOrg: 'สำนักงานกำกับดูแลการก่อสร้างเทศบาล (ตัวอย่างจำลอง)',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'ได้รับใบอนุญาตก่อสร้างอย่างถูกต้อง (FAKE-BUILD-PERMIT-2025-019) กำลังดำเนินการประกอบโครงสร้างเหล็ก สัญญาการค้าและข้อมูลการเงินถือเป็นความลับและไม่เผยแพร่ต่อสาธารณะ',
      errataLog: [
        { date: '2025-05-12', action: 'บันทึกใบอนุญาตก่อสร้าง', user: 'Demo Organization A', note: 'ตรวจสอบใบอนุญาตก่อสร้างถูกต้อง' },
        { date: '2025-08-01', action: 'บันทึกรายชื่อบุคลากรหลัก', user: 'ทีมกำกับดูแล Demo Org G', note: 'บันทึกรายชื่อผู้อำนวยการโครงการและทีมงาน' }
      ]
    }
  },
  'EVD-EDGE-02': {
    en: {
      sourceType: 'EPC Prime Contractor Role Appointment (Public Disclosure)',
      sourceOrg: 'Joint Disclosure by Demo Org A & Demo Org B',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Authorized Demo Organization B to undertake EPC prime contracting responsibilities for superstructure and MEP. Commercial terms, bank guarantee bond numbers, and private corporate agreements are confidential and deferred to private enterprise systems.',
      errataLog: [
        { date: '2025-05-20', action: 'Project Role Attribution Gazette', user: 'Demo Organization A Representative', note: 'Established prime contracting project role and responsibilities' }
      ]
    },
    th: {
      sourceType: 'การแต่งตั้งบทบาทผู้รับเหมาทั่วไป EPC (ประกาศสาธารณะ)',
      sourceOrg: 'ประกาศร่วมโดย Demo Org A และ Demo Org B',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'มอบหมาย Demo Organization B รับผิดชอบงานวิศวกรรมหลัก สัญญาการค้า หนังสือค้ำประกัน และข้อมูลทางการเงินถือเป็นความลับ ไม่แสดงต่อสาธารณะ',
      errataLog: [
        { date: '2025-05-20', action: 'ประกาศรับรองบทบาทในโครงการ', user: 'ตัวแทน Demo Organization A', note: 'กำหนดบทบาทและหน้าที่ผู้รับเหมาหลัก' }
      ]
    }
  },
  'EVD-EDGE-03': {
    en: {
      sourceType: 'Engineering Design & BIM Deepening (Public Disclosure)',
      sourceOrg: 'Joint Filing: Demo Org A & Demo Org C',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Demo Organization C completed full-stage architectural design and digital BIM review. Proprietary design contracts and billing records are confidential and excluded from public display.',
      errataLog: [
        { date: '2025-01-22', action: 'Design BIM Review Approved', user: 'Demo Org A Lead', note: 'BIM drawings reviewed and transitioned to deepening phase' }
      ]
    },
    th: {
      sourceType: 'การออกแบบวิศวกรรมและการพัฒนา BIM (ประกาศสาธารณะ)',
      sourceOrg: 'บันทึกร่วม Demo Org A และ Demo Org C',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'Demo Organization C ดำเนินการออกแบบและทบทวน BIM ครบทุกขั้นตอน ข้อตกลงการออกแบบถือเป็นความลับทางการค้า',
      errataLog: [
        { date: '2025-01-22', action: 'อนุมัติการตรวจสอบ BIM', user: 'หัวหน้างาน Demo Org A', note: 'ตรวจสอบแบบก่อสร้างผ่านและเข้าสู่การส่งมอบ' }
      ]
    }
  },
  'EVD-EDGE-04': {
    en: {
      sourceType: 'Statutory Engineering Supervision Appointment (Public Gazette)',
      sourceOrg: 'Demo Organization A Joint Filing',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Demo Organization G appointed as resident independent supervision engineer for site safety and structural quality. Internal fee agreements and contracts are confidential and excluded from public display.',
      errataLog: []
    },
    th: {
      sourceType: 'การแต่งตั้งผู้ควบคุมงานวิศวกรรมตามกฎหมาย (ประกาศราชกิจจาฯ)',
      sourceOrg: 'บันทึกร่วมโดย Demo Org A',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'Demo Organization G ได้รับการแต่งตั้งเป็นผู้ควบคุมงานอิสระประจำไซต์งาน ข้อตกลงค่าจ้างและสัญญาถือเป็นความลับ',
      errataLog: []
    }
  },
  'EVD-EDGE-05': {
    en: {
      sourceType: 'Deep Foundation Subcontracting & Sub-phase Acceptance',
      sourceOrg: 'Joint Field Record: Demo Org B & Demo Org D',
      wbsPackage: '1.2 Deep Foundation & Substructure (PKG-CV-01)',
      summary: 'Foundation piling completed in 2025-10 with joint quality acceptance signed off. Commercial subcontract terms and billing claims are confidential and excluded from public display.',
      errataLog: [
        { date: '2025-10-20', action: 'Deep Foundation Sub-phase Accepted', user: 'EPC General Project Division', note: 'Concealed work quality inspected and passed' }
      ]
    },
    th: {
      sourceType: 'งานรับเหมาช่วงฐานรากและการตรวจรับย่อย',
      sourceOrg: 'บันทึกร่วม Demo Org B และ Demo Org D',
      wbsPackage: '1.2 งานฐานรากและชั้นใต้ดิน (PKG-CV-01)',
      summary: 'งานตอกเสาเข็มและฐานรากเสร็จสิ้นในเดือน 10/2025 พร้อมตรวจรับคุณภาพ สัญญาจ้างช่วงถือเป็นความลับ',
      errataLog: [
        { date: '2025-10-20', action: 'ตรวจรับงานฐานรากเสร็จสิ้น', user: 'ฝ่ายจัดการโครงการ EPC', note: 'งานโครงสร้างใต้ดินผ่านการตรวจสอบ' }
      ]
    }
  },
  'EVD-EDGE-06': {
    en: {
      sourceType: 'Cleanroom MEP Subcontract Mobilization Filing (Self-Claimed)',
      sourceOrg: 'Demo Organization E Self-Claimed Report',
      wbsPackage: '1.4 Cleanroom MEP & HVAC Power Systems (PKG-ME-03)',
      summary: 'Self-reported cleanroom MEP installation subcontract scope with site mobilization underway. Commercial contract details and claims are confidential and excluded from public display.',
      errataLog: [
        { date: '2026-03-01', action: 'Site Mobilization Reported', user: 'Demo Organization E', note: 'Self-reported construction organization plan preparation' }
      ]
    },
    th: {
      sourceType: 'การเตรียมงานติดตั้งระบบ MEP สำหรับห้องคลีนรูม (รายงานโดยตรง)',
      sourceOrg: 'รายงานโดย Demo Organization E',
      wbsPackage: '1.4 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม (PKG-ME-03)',
      summary: 'รายงานการเตรียมงานติดตั้งระบบ MEP สำหรับห้องคลีนรูม ข้อตกลงทางการค้าถือเป็นความลับ',
      errataLog: [
        { date: '2026-03-01', action: 'รายงานการเข้าพื้นที่งาน', user: 'Demo Organization E', note: 'จัดทำแผนการดำเนินงานก่อสร้าง' }
      ]
    }
  },
  'EVD-P001-C01': {
    en: {
      sourceType: 'Design Review Approval & BIM Delivery Sign-off',
      sourceOrg: 'Independent Design Quality Review Bureau (Fictional)',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Digital engineering models and structural seismic analysis approved by expert review panel. Milestone completed with formal delivery sign-off.',
      errataLog: [
        { date: '2025-01-20', action: 'Delivery Sign-off Recorded', user: 'Demo Organization C', note: 'All engineering disciplines finalized and stamped' }
      ]
    },
    th: {
      sourceType: 'การอนุมัติแบบและการส่งมอบ BIM',
      sourceOrg: 'ศูนย์ตรวจรับรองแบบวิศวกรรม (จำลอง)',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'แบบจำลองดิจิทัลและการคำนวณโครงสร้างผ่านการตรวจสอบจากผู้เชี่ยวชาญ ส่งมอบงานเรียบร้อย',
      errataLog: [
        { date: '2025-01-20', action: 'ยืนยันการส่งมอบงาน', user: 'Demo Organization C', note: 'แบบก่อสร้างทุกระบบพร้อมลงนาม' }
      ]
    }
  },
  'EVD-P001-D01': {
    en: {
      sourceType: 'Deep Foundation Sub-phase Acceptance Certificate',
      sourceOrg: 'Demo Org B (EPC) & Demo Org G (Supervision) Joint Certificate',
      wbsPackage: '1.2 Deep Foundation & Substructure (PKG-CV-01)',
      summary: 'Static and dynamic load testing for all structural foundation piles met grade-A specifications. Concealed work inspection fully verified.',
      errataLog: [
        { date: '2025-10-15', action: 'Sub-phase Acceptance Signed', user: 'Demo Engineer 04 (Lead Supervisor)', note: 'On-site pile testing sample inspection passed 100%' }
      ]
    },
    th: {
      sourceType: 'บันทึกการตรวจรับงานฐานรากและเสาเข็ม',
      sourceOrg: 'ออกร่วมกันโดย Demo Org B และ Org G',
      wbsPackage: '1.2 งานฐานรากและชั้นใต้ดิน (PKG-CV-01)',
      summary: 'ผลการทดสอบการรับน้ำหนักเสาเข็มผ่านมาตรฐานระดับสูง การตรวจสอบงานโครงสร้างใต้ดินสมบูรณ์',
      errataLog: [
        { date: '2025-10-15', action: 'ยืนยันการตรวจรับงานย่อย', user: 'Demo Engineer 04 (ผู้ควบคุมงานหลัก)', note: 'ผลการทดสอบเสาเข็มผ่าน 100%' }
      ]
    }
  },
  'EVD-P001-E01': {
    en: {
      sourceType: 'Contractor Public Track Record Statement & Field Log',
      sourceOrg: 'Demo Organization E (Self-Declared Filing)',
      wbsPackage: '1.4 Cleanroom MEP & HVAC Power Systems (PKG-ME-03)',
      summary: 'Self-reported cleanroom MEP installation scope. Site engineering mobilization and coordination underway. Commercial contracts and disbursement ledgers are confidential and excluded from public display.',
      errataLog: [
        { date: '2026-04-10', action: 'Field Brief Submitted', user: 'Demo Organization E Admin', note: 'Self-claimed progress filed; awaiting multi-party sign-off' }
      ]
    },
    th: {
      sourceType: 'บันทึกผลงานสาธารณะและบันทึกภาคสนาม',
      sourceOrg: 'Demo Organization E (รายงานโดยตรง)',
      wbsPackage: '1.4 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม (PKG-ME-03)',
      summary: 'รายงานการดำเนินการติดตั้งระบบ MEP สำหรับคลีนรูม สัญญาการค้าและบันทึกการเบิกจ่ายถือเป็นความลับ',
      errataLog: [
        { date: '2026-04-10', action: 'ส่งรายงานภาคสนาม', user: 'ผู้ดูแลระบบ Demo Organization E', note: 'ส่งข้อมูลความคืบหน้ารอการยืนยัน' }
      ]
    }
  },
  'EVD-P001-F01': {
    en: {
      sourceType: 'Public Procurement Service Portal Notice (NLP Extraction)',
      sourceOrg: 'Automated Procurement Gazette Matcher (Mock Demo)',
      wbsPackage: '1.5 Fab Process Production Equipment & Tool Hookup (PKG-EQ-04)',
      summary: 'Public tender award notice FAKE-TENDER-NOTICE-2026-788 indexed with 87.5% match confidence. Serves as unconfirmed candidate record only; does not constitute commercial contracts or binding instruments.',
      errataLog: [
        { date: '2026-07-15', action: 'NLP Notice Extracted', user: 'System NLP Bot', note: 'Candidate milestone extracted from municipal gazette' }
      ]
    },
    th: {
      sourceType: 'ข้อมูลสกัดจากประกาศจัดซื้อจัดจ้างสาธารณะ (NLP)',
      sourceOrg: 'ระบบสกัดข้อมูลประกาศสาธารณะ (จำลอง)',
      wbsPackage: '1.5 ระบบอุปกรณ์การผลิตหลัก (PKG-EQ-04)',
      summary: 'จับคู่ประกาศผลการประกวดราคา FAKE-TENDER-NOTICE-2026-788 ความมั่นใจ 87.5% ใช้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ไม่ใช่สัญญาการค้า',
      errataLog: [
        { date: '2026-07-15', action: 'สกัดข้อมูลประกาศ', user: 'ระบบอัตโนมัติ NLP', note: 'สกัดข้อมูลจากประกาศจัดซื้อจัดจ้าง' }
      ]
    }
  },
  'EVD-P001-G01': {
    en: {
      sourceType: 'Statutory Engineering Supervision Appointment & Filing',
      sourceOrg: 'Municipal Housing & Construction Authority Filing Archive',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Statutory supervisory appointment confirmed Demo Organization G to exercise quality and safety oversight. Internal fee structures and service contracts are confidential and excluded from public display.',
      errataLog: [
        { date: '2025-03-10', action: 'Supervision Authority Filed', user: 'Demo Organization A', note: 'Statutory supervision authority filing completed' }
      ]
    },
    th: {
      sourceType: 'การแต่งตั้งผู้ควบคุมงานตามกฎหมายและการจดทะเบียน',
      sourceOrg: 'บันทึกการจดทะเบียนหน่วยงานกำกับดูแล',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'แต่งตั้ง Demo Organization G ปฏิบัติหน้าที่กำกับดูแลความปลอดภัยและคุณภาพงาน สัญญาค่าจ้างถือเป็นความลับ',
      errataLog: [
        { date: '2025-03-10', action: 'จดทะเบียนผู้ควบคุมงาน', user: 'Demo Organization A', note: 'จดทะเบียนผู้ควบคุมงานตามกฎหมายเรียบร้อย' }
      ]
    }
  },
  'EVD-P001-A01': {
    en: {
      sourceType: 'Official Project Charter & Statutory Land Use Gazette (Demo)',
      sourceOrg: 'Administrative Approval Bureau & Urban Planning Department (Mock Demo)',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Statutory project approval and land use planning permit granted. Commercial details, investment funds, and corporate contracts are confidential and excluded from public display.',
      errataLog: [
        { date: '2024-06-25', action: 'Project Charter Gazette Filed', user: 'Administrative Approval Window', note: 'Statutory approval record archived' }
      ]
    },
    th: {
      sourceType: 'ประกาศจัดตั้งโครงการและใบอนุญาตใช้ที่ดินตามกฎหมาย (จำลอง)',
      sourceOrg: 'สำนักงานบริหารการอนุมัติและวางผังเมือง (ตัวอย่างจำลอง)',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'ได้รับอนุมัติโครงการและใบอนุญาตใช้ที่ดิน ข้อมูลทางการเงินและสัญญาการค้าถือเป็นความลับและไม่เผยแพร่ต่อสาธารณะ',
      errataLog: [
        { date: '2024-06-25', action: 'บันทึกประกาศจัดตั้งโครงการ', user: 'ฝ่ายบริหารการอนุมัติ', note: 'จัดเก็บข้อมูลการอนุมัติตามกฎหมาย' }
      ]
    }
  },
  'EVD-P001-001': {
    en: {
      sourceType: 'Land Use Planning Permit & Statutory Approval',
      sourceOrg: 'High-Tech Zone Administrative Approval & Planning Bureau',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Official land planning permit and statutory project feasibility approval archived.',
      errataLog: []
    },
    th: {
      sourceType: 'ใบอนุญาตใช้ที่ดินและการอนุมัติโครงการตามกฎหมาย',
      sourceOrg: 'สำนักงานวางผังและอนุมัติโครงการเขตไฮเทค',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'จัดเก็บใบอนุญาตการใช้ที่ดินและการอนุมัติตามกฎหมาย',
      errataLog: []
    }
  },
  'EVD-P001-012': {
    en: {
      sourceType: 'Digital Construction Drawing Review Certificate',
      sourceOrg: 'Provincial Joint Construction Drawing Digital Review Center',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Full architectural and structural drawing sets passed statutory digital review.',
      errataLog: []
    },
    th: {
      sourceType: 'ใบรับรองการตรวจพิจารณาแบบก่อสร้างดิจิทัล',
      sourceOrg: 'ศูนย์ตรวจพิจารณาแบบก่อสร้างร่วมระดับมณฑล',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'แบบก่อสร้างทั้งหมดผ่านการตรวจรับรองดิจิทัลตามมาตรฐาน',
      errataLog: []
    }
  },
  'EVD-P001-028': {
    en: {
      sourceType: 'EPC Prime Construction Tender Award Notice',
      sourceOrg: 'Public Resources Trading Center & Demo Organization A',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Official public award announcement confirming Demo Organization B as EPC prime contractor.',
      errataLog: []
    },
    th: {
      sourceType: 'ประกาศผลการประกวดราคาก่อสร้างทั่วไป EPC',
      sourceOrg: 'ศูนย์ซื้อขายทรัพยากรสาธารณะและ Demo Organization A',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'ประกาศผลการคัดเลือกผู้รับเหมาทั่วไป EPC สำหรับการก่อสร้าง',
      errataLog: []
    }
  },
  'EVD-P001-042': {
    en: {
      sourceType: 'Long-Lead Process Equipment Factory Test Witness Report',
      sourceOrg: 'National Industrial Equipment Quality Inspection Center',
      wbsPackage: '1.5 Fab Process Production Equipment & Tool Hookup (PKG-EQ-04)',
      summary: 'Critical process equipment factory acceptance test witnessed and certified.',
      errataLog: []
    },
    th: {
      sourceType: 'รายงานการทดสอบอุปกรณ์กระบวนการผลิต ณ โรงงาน',
      sourceOrg: 'ศูนย์ตรวจสอบคุณภาพอุปกรณ์อุตสาหกรรมแห่งชาติ',
      wbsPackage: '1.5 ระบบอุปกรณ์การผลิตหลัก (PKG-EQ-04)',
      summary: 'การทดสอบอุปกรณ์กระบวนการผลิตหลักผ่านเกณฑ์มาตรฐานโรงงาน',
      errataLog: []
    }
  },
  'EVD-P001-077': {
    en: {
      sourceType: 'Superstructure Phase Quality Acceptance Record',
      sourceOrg: 'Joint Sign-off: Demo Org A, B, C, G',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Phase quality appraisal signed off for primary structural steel assemblies.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการตรวจรับคุณภาพโครงสร้างหลักตามระยะ',
      sourceOrg: 'ลงนามร่วม: Demo Org A, B, C, G',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'ตรวจรับคุณภาพโครงสร้างเหล็กหลักตามระยะเรียบร้อยแล้ว',
      errataLog: []
    }
  },
  'EVD-P001-PLAN-01': {
    en: {
      sourceType: 'Master Construction Schedule Control Plan',
      sourceOrg: 'General Contractor Plan Audited by Supervision Advisory',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Overall baseline master schedule established for project milestones.',
      errataLog: []
    },
    th: {
      sourceType: 'แผนควบคุมกำหนดการก่อสร้างหลัก',
      sourceOrg: 'จัดทำโดยผู้รับเหมาทั่วไป ตรวจสอบโดยผู้ควบคุมงาน',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'กำหนดเส้นฐานกำหนดการก่อสร้างหลักสำหรับหมุดหมายโครงการ',
      errataLog: []
    }
  },
  'EVD-P001-PLAN-02': {
    en: {
      sourceType: 'Completion Joint Acceptance & Handover Memorandum',
      sourceOrg: 'Client Project Management Manual (Planning)',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Planning memo outlining handover standards and multi-party sign-off procedures.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการตรวจรับร่วมและการส่งมอบงาน',
      sourceOrg: 'คู่มือการจัดการโครงการของเจ้าของโครงการ (การวางแผน)',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'บันทึกการวางแผนขั้นตอนการตรวจรับงานและการส่งมอบ',
      errataLog: []
    }
  },
  'EVD-P001-PLAN-03': {
    en: {
      sourceType: 'Industrial Park Long-Term Concept Plan',
      sourceOrg: 'High-Tech Zone Administrative Committee (Mock Concept)',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Conceptual long-range strategic plan reserved for Phase II development.',
      errataLog: []
    },
    th: {
      sourceType: 'แผนผังแนวคิดระยะยาวของนิคมอุตสาหกรรม',
      sourceOrg: 'คณะกรรมการบริหารเขตไฮเทค (แนวคิดจำลอง)',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'แผนผังเชิงยุทธศาสตร์ระยะยาวสำหรับการพัฒนาโครงการระยะที่ 2',
      errataLog: []
    }
  },
  'EVD-P001-055': {
    en: {
      sourceType: 'Public Procurement Equipment Notice (AI Match)',
      sourceOrg: 'Automated Procurement Matcher (Mock Demo)',
      wbsPackage: '1.5 Fab Process Production Equipment & Tool Hookup (PKG-EQ-04)',
      summary: 'AI candidate record indexed from public bidding announcements for process equipment.',
      errataLog: []
    },
    th: {
      sourceType: 'ประกาศจัดซื้ออุปกรณ์สาธารณะ (AI แนะนำ)',
      sourceOrg: 'ระบบจับคู่ข้อมูลจัดซื้อจัดจ้างอัตโนมัติ (จำลอง)',
      wbsPackage: '1.5 ระบบอุปกรณ์การผลิตหลัก (PKG-EQ-04)',
      summary: 'ข้อมูลผู้จำหน่ายอุปกรณ์ที่ได้จากการจับคู่อัตโนมัติจากประกาศสาธารณะ',
      errataLog: []
    }
  },
  'EVD-P001-072': {
    en: {
      sourceType: 'Cleanroom MEP Clash Optimization Review Opinion',
      sourceOrg: 'Demo Organization C Design Institute & Review Panel',
      wbsPackage: '1.4 Cleanroom MEP & HVAC Power Systems (PKG-ME-03)',
      summary: 'Technical review panel endorsed 3D clash optimization scheme for cleanroom MEP routing.',
      errataLog: []
    },
    th: {
      sourceType: 'ความเห็นทางเทคนิคการแก้ปัญหาการชนกันของท่อ MEP คลีนรูม',
      sourceOrg: 'สถาบันออกแบบ Demo Organization C และคณะผู้เชี่ยวชาญ',
      wbsPackage: '1.4 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม (PKG-ME-03)',
      summary: 'คณะผู้เชี่ยวชาญรับรองแผนการแก้ไขการชนกันของท่อ MEP 3D สำหรับคลีนรูม',
      errataLog: []
    }
  },
  'EVD-P001-089': {
    en: {
      sourceType: 'Space Truss Unit 4 Aerial Lift & Weld Inspection Record',
      sourceOrg: 'Joint Sign-off: Demo Org B (EPC) & Demo Org G (Supervision)',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Hydraulic synchronized lifting of Unit 4 space truss (+28.5m) and weld NDT testing verified.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการยกโครงถักชุดที่ 4 และผลการตรวจรอยเชื่อม',
      sourceOrg: 'ลงนามร่วม: Demo Org B (EPC) และ Demo Org G (ควบคุมงาน)',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'การยกโครงถักยูนิตที่ 4 ด้วยไฮดรอลิกและการตรวจรอยเชื่อมผ่านการรับรอง',
      errataLog: []
    }
  },
  'EVD-ENG-01': {
    en: {
      sourceType: 'Constructor & Project Directorate Role Attribution (Mock)',
      sourceOrg: 'Demo Organization B Prime Project Division',
      wbsPackage: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
      summary: 'Demo Engineer 01 assigned as project site director for long-span steel erection (Demonstration prototype).',
      errataLog: []
    },
    th: {
      sourceType: 'บทบาทผู้อำนวยการโครงการและผู้ควบคุมการก่อสร้าง (จำลอง)',
      sourceOrg: 'ฝ่ายโครงการ Demo Organization B',
      wbsPackage: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)',
      summary: 'กำหนดบทบาท Demo Engineer 01 เป็นผู้อำนวยการหน้างาน (ข้อมูลจำลอง)',
      errataLog: []
    }
  },
  'EVD-ENG-02': {
    en: {
      sourceType: 'Structural Engineer Drawing Sign-off Attribution (Mock)',
      sourceOrg: 'Demo Organization C Design Institute',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Demo Engineer 02 endorsed structural design calculations and BIM drawings (Demonstration prototype).',
      errataLog: []
    },
    th: {
      sourceType: 'บทบาทวิศวกรโครงสร้างลงนามแบบ (จำลอง)',
      sourceOrg: 'สถาบันออกแบบ Demo Organization C',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'กำหนดบทบาท Demo Engineer 02 ลงนามแบบการคำนวณโครงสร้าง (ข้อมูลจำลอง)',
      errataLog: []
    }
  },
  'EVD-ENG-03': {
    en: {
      sourceType: 'Engineer Portfolio Self-Filing Record (Mock)',
      sourceOrg: 'Demo Engineer 03 Self-Claimed Filing',
      wbsPackage: '1.4 Cleanroom MEP & HVAC Power Systems (PKG-ME-03)',
      summary: 'Demo Engineer 03 self-reported cleanroom MEP installation track record (Demonstration prototype).',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกประวัติการทำงานรายงานตนเอง (จำลอง)',
      sourceOrg: 'รายงานตนเองโดย Demo Engineer 03',
      wbsPackage: '1.4 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม (PKG-ME-03)',
      summary: 'Demo Engineer 03 รายงานผลงานการติดตั้ง MEP คลีนรูมด้วยตนเอง (ข้อมูลจำลอง)',
      errataLog: []
    }
  },
  'EVD-ENG-04': {
    en: {
      sourceType: 'Supervising Engineer Monthly Briefing Record (Mock)',
      sourceOrg: 'Demo Organization G Supervision Advisory',
      wbsPackage: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
      summary: 'Demo Engineer 04 issued monthly supervision safety and quality oversight summary (Demonstration prototype).',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกรายงานประจำเดือนของผู้ควบคุมงาน (จำลอง)',
      sourceOrg: 'ที่ปรึกษาควบคุมงาน Demo Organization G',
      wbsPackage: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ',
      summary: 'Demo Engineer 04 ออกรายงานสรุปการควบคุมงานรายเดือน (ข้อมูลจำลอง)',
      errataLog: []
    }
  },
  'EVD-ENG-05': {
    en: {
      sourceType: 'Geotechnical Engineer Foundation Acceptance Note (Mock)',
      sourceOrg: 'Construction Administrative Authority (Mock Demo)',
      wbsPackage: '1.2 Deep Foundation & Substructure (PKG-CV-01)',
      summary: 'Demo Engineer 05 certified pile bearing capacity test records for deep foundation phase (Demonstration prototype).',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการตรวจรับงานฐานรากโดยวิศวกรปฐพี (จำลอง)',
      sourceOrg: 'หน่วยงานกำกับดูแลการก่อสร้าง (ตัวอย่างจำลอง)',
      wbsPackage: '1.2 งานฐานรากและชั้นใต้ดิน (PKG-CV-01)',
      summary: 'Demo Engineer 05 รับรองผลการทดสอบการรับน้ำหนักเสาเข็ม (ข้อมูลจำลอง)',
      errataLog: []
    }
  },
  'EVD-EDGE-01': {
    en: {
      sourceType: 'Project Charter & Statutory Procurement Filing',
      sourceOrg: 'Public Construction Authority Data Gateway',
      wbsPackage: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
      summary: 'Official project registration and procurement filing record published.',
      errataLog: []
    },
    th: {
      sourceType: 'เอกสารการจัดตั้งโครงการและการประกวดราคา',
      sourceOrg: 'เกตเวย์ข้อมูลหน่วยงานก่อสร้างสาธารณะ',
      wbsPackage: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)',
      summary: 'บันทึกการลงทะเบียนโครงการและการจัดซื้อจัดจ้างสาธารณะ',
      errataLog: []
    }
  },
  'EVD-EDGE-07': {
    en: {
      sourceType: 'Public Procurement Tender Match Result (NLP AI)',
      sourceOrg: 'Automated Procurement Matcher (Mock Demo)',
      wbsPackage: '1.5 Fab Process Production Equipment & Tool Hookup (PKG-EQ-04)',
      summary: 'NLP crawler indexed public equipment supplier candidate Demo Organization F.',
      errataLog: []
    },
    th: {
      sourceType: 'ผลการจับคู่ข้อมูลประกวดราคาจัดซื้อจัดจ้าง (AI NLP)',
      sourceOrg: 'ระบบจับคู่ข้อมูลจัดซื้อจัดจ้างอัตโนมัติ (จำลอง)',
      wbsPackage: '1.5 ระบบอุปกรณ์การผลิตหลัก (PKG-EQ-04)',
      summary: 'ระบบสกัดข้อมูลจับคู่ผู้จำหน่ายอุปกรณ์ Demo Organization F จากประกาศสาธารณะ',
      errataLog: []
    }
  },
  'EVD-P002-001': {
    en: {
      sourceType: 'Deep Excavation Support Permit & Quality Supervision Filing',
      sourceOrg: 'Housing & Urban-Rural Development Bureau',
      wbsPackage: 'PKG-CV-01 Deep Foundation & Substructure',
      summary: 'Excavation permit approved for deep transit underground structure.',
      errataLog: []
    },
    th: {
      sourceType: 'ใบอนุญาตงานค้ำยันหลุมลึกและการจดทะเบียนควบคุมคุณภาพ',
      sourceOrg: 'สำนักการเคหะและพัฒนาเมือง',
      wbsPackage: 'PKG-CV-01 งานฐานรากและชั้นใต้ดิน',
      summary: 'อนุมัติใบอนุญาตงานขุดหลุมลึกสำหรับโครงสร้างใต้ดิน',
      errataLog: []
    }
  },
  'EVD-P002-002': {
    en: {
      sourceType: 'Diaphragm Wall & Steel Bracing Monitoring Report',
      sourceOrg: 'Safety Monitoring Center & Demo Org D',
      wbsPackage: 'PKG-CV-01 Deep Foundation & Substructure',
      summary: 'Displacement and load monitoring of diaphragm wall showed stable deformation well within tolerances.',
      errataLog: []
    },
    th: {
      sourceType: 'รายงานการตรวจสอบกำแพงกันดินและค้ำยันเหล็ก',
      sourceOrg: 'ศูนย์ตรวจสอบความปลอดภัยและ Demo Org D',
      wbsPackage: 'PKG-CV-01 งานฐานรากและชั้นใต้ดิน',
      summary: 'การตรวจวัดการเคลื่อนตัวของกำแพงกันดินอยู่ในเกณฑ์ปลอดภัย',
      errataLog: []
    }
  },
  'EVD-P003-001': {
    en: {
      sourceType: 'Heavy Equipment Assembly Plant EPC Tender Award',
      sourceOrg: 'Public Resources Trading Center & Port Group',
      wbsPackage: 'PKG-ST-02 Superstructure Steel & Building Envelope',
      summary: 'Award notice published for harbor assembly plant construction.',
      errataLog: []
    },
    th: {
      sourceType: 'ประกาศผลการประกวดราคา EPC โรงงานประกอบอุปกรณ์หนัก',
      sourceOrg: 'ศูนย์ซื้อขายทรัพยากรสาธารณะและกลุ่มท่าเรือ',
      wbsPackage: 'PKG-ST-02 โครงสร้างเหล็กหลักและเปลือกอาคาร',
      summary: 'ประกาศผลการประกวดราคาก่อสร้างโรงงานประกอบเครื่องจักรอุตสาหกรรม',
      errataLog: []
    }
  },
  'EVD-P003-002': {
    en: {
      sourceType: 'Berth Foundation Dynamic Compaction Acceptance Record',
      sourceOrg: 'Water Transportation Quality Inspection Station',
      wbsPackage: 'PKG-CV-01 Deep Foundation & Substructure',
      summary: 'Soil dynamic compaction bearing capacity met heavy cargo wharf standards.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการตรวจรับการบดอัดดินบริเวณท่าเทียบเรือ',
      sourceOrg: 'สถานีตรวจคุณภาพงานวิศวกรรมการขนส่งทางน้ำ',
      wbsPackage: 'PKG-CV-01 งานฐานรากและชั้นใต้ดิน',
      summary: 'การรับน้ำหนักดินผ่านเกณฑ์มาตรฐานสำหรับท่าเทียบเรือหนัก',
      errataLog: []
    }
  },
  'EVD-P004-001': {
    en: {
      sourceType: 'Microelectronics Cleanroom MEP Drawing Approval Notice',
      sourceOrg: 'Electronic Engineering Quality Digital Review Bureau',
      wbsPackage: 'PKG-ME-03 Cleanroom MEP & HVAC Power Systems',
      summary: 'Approved digital drawings for ultra-clean microelectronics MEP distribution.',
      errataLog: []
    },
    th: {
      sourceType: 'หนังสือแจ้งอนุมัติแบบระบบ MEP สำหรับห้องคลีนรูมไมโครอิเล็กทรอนิกส์',
      sourceOrg: 'สำนักตรวจแบบดิจิทัลวิศวกรรมอิเล็กทรอนิกส์',
      wbsPackage: 'PKG-ME-03 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม',
      summary: 'อนุมัติแบบดิจิทัลระบบเครื่องกลไฟฟ้าคลีนรูม',
      errataLog: []
    }
  },
  'EVD-P004-002': {
    en: {
      sourceType: 'Cleanroom Chiller Equipment On-Site Unboxing Inspection',
      sourceOrg: 'Joint Inspection: Client & Demo Org G Supervision',
      wbsPackage: 'PKG-ME-03 Cleanroom MEP & HVAC Power Systems',
      summary: 'Magnetic bearing chiller units inspected on site with no transit damage.',
      errataLog: []
    },
    th: {
      sourceType: 'การตรวจรับการเปิดกล่องเครื่องทำความเย็นสำหรับห้องคลีนรูม',
      sourceOrg: 'ตรวจร่วม: เจ้าของโครงการและ Demo Org G',
      wbsPackage: 'PKG-ME-03 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม',
      summary: 'ตรวจสภาพเครื่องชิลเลอร์ระบบแม่เหล็ก ไม่พบความเสียหาย',
      errataLog: []
    }
  },
  'EVD-P005-001': {
    en: {
      sourceType: 'Prefabricated Truss Factory Quality Certificate',
      sourceOrg: 'Demo Organization H Quality Inspection Division',
      wbsPackage: 'PKG-ST-02 Superstructure Steel & Building Envelope',
      summary: 'Factory QA/QC records for bolt-sphere joints and curved spatial steel trusses.',
      errataLog: []
    },
    th: {
      sourceType: 'ใบรับรองคุณภาพโรงงานโครงถักสำเร็จรูป',
      sourceOrg: 'ฝ่ายตรวจคุณภาพ Demo Organization H',
      wbsPackage: 'PKG-ST-02 โครงสร้างเหล็กหลักและเปลือกอาคาร',
      summary: 'บันทึกการตรวจสอบคุณภาพชิ้นส่วนโครงถักสำเร็จรูปจากโรงงาน',
      errataLog: []
    }
  },
  'EVD-P006-001': {
    en: {
      sourceType: 'Automated Container Yard Subgrade Acceptance Record',
      sourceOrg: 'Port Construction Quality Inspection Station',
      wbsPackage: 'PKG-CV-01 Deep Foundation & Substructure',
      summary: '45-ton axle-load subbase concrete inspection passed.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการตรวจรับชั้นรองพื้นลานตู้คอนเทนเนอร์อัตโนมัติ',
      sourceOrg: 'สถานีตรวจสอบคุณภาพการก่อสร้างท่าเรือ',
      wbsPackage: 'PKG-CV-01 งานฐานรากและชั้นใต้ดิน',
      summary: 'การตรวจสอบชั้นพื้นผิวรองรับน้ำหนัก 45 ตันผ่านเกณฑ์',
      errataLog: []
    }
  },
  'EVD-P007-001': {
    en: {
      sourceType: 'Green Hydrogen Storage Pressure Vessel Inspection Permit',
      sourceOrg: 'Special Equipment Safety Inspection Institute',
      wbsPackage: 'PKG-EQ-04 Fab Process Production Equipment & Tool Hookup',
      summary: 'Cryogenic pressure vessel certified for safe operational commissioning.',
      errataLog: []
    },
    th: {
      sourceType: 'ใบอนุญาตตรวจรับรองภาชนะรับแรงดันเก็บไฮโดรเจนเขียว',
      sourceOrg: 'สถาบันตรวจสอบความปลอดภัยอุปกรณ์พิเศษ',
      wbsPackage: 'PKG-EQ-04 ระบบอุปกรณ์การผลิตหลัก',
      summary: 'ถังรับแรงดันผ่านการรับรองความปลอดภัยพร้อมใช้งาน',
      errataLog: []
    }
  },
  'EVD-P008-001': {
    en: {
      sourceType: 'Cable-Stayed Bridge Tower Saddle Survey Record',
      sourceOrg: 'Bridge Quality National Key Lab & Demo Org G',
      wbsPackage: 'PKG-ST-02 Superstructure Steel & Building Envelope',
      summary: 'Tower saddle laser placement tolerance confirmed within +/-1.5mm.',
      errataLog: []
    },
    th: {
      sourceType: 'บันทึกการสำรวจอานรองสายเคเบิลสะพานขึง',
      sourceOrg: 'ห้องปฏิบัติการสะพานแห่งชาติและ Demo Org G',
      wbsPackage: 'PKG-ST-02 โครงสร้างเหล็กหลักและเปลือกอาคาร',
      summary: 'การติดตั้งอานสายเคเบิลผ่านเกณฑ์ความแม่นยำระดับเลเซอร์',
      errataLog: []
    }
  }
};

// Generic WBS package code mapper
const WBS_TRANSLATIONS = {
  'PKG-DS-01': {
    en: '1.1 Architectural Design & BIM Deepening (PKG-DS-01)',
    th: '1.1 การออกแบบและพัฒนาแบบจำลอง BIM (PKG-DS-01)'
  },
  'PKG-CV-01': {
    en: '1.2 Deep Foundation & Substructure (PKG-CV-01)',
    th: '1.2 งานฐานรากและชั้นใต้ดิน (PKG-CV-01)'
  },
  'PKG-ST-02': {
    en: '1.3 Superstructure Steel & Building Envelope (PKG-ST-02)',
    th: '1.3 โครงสร้างเหล็กหลักและเปลือกอาคาร (PKG-ST-02)'
  },
  'PKG-ME-03': {
    en: '1.4 Cleanroom MEP & HVAC Power Systems (PKG-ME-03)',
    th: '1.4 ระบบเครื่องกลไฟฟ้าและระบบปรับอากาศคลีนรูม (PKG-ME-03)'
  },
  'PKG-EQ-04': {
    en: '1.5 Fab Process Production Equipment & Tool Hookup (PKG-EQ-04)',
    th: '1.5 ระบบอุปกรณ์การผลิตหลัก (PKG-EQ-04)'
  },
  'PKG-SV-01': {
    en: 'PKG-SV-01 Full-Process Supervision & QA/QC Package',
    th: 'PKG-SV-01 แพ็กเกจการควบคุมงานและควบคุมคุณภาพ'
  },
  'PKG-QC-01': {
    en: 'PKG-QC-01 Concrete Quality Testing & Specimen Acceptance',
    th: 'PKG-QC-01 การทดสอบคุณภาพคอนกรีตและการตรวจรับ'
  },
  'PKG-LOG-01': {
    en: 'PKG-LOG-01 Site Staging & Heavy Component Logistics Package',
    th: 'PKG-LOG-01 แพ็กเกจโลจิสติกส์และการจัดวางชิ้นส่วนหนัก'
  }
};

export function getLocalizedField(evidenceId, field, locale, fallback) {
  if (locale === 'zh') return fallback;
  const item = EVIDENCE_LOCALIZATIONS[evidenceId];
  if (item && item[locale] && item[locale][field]) {
    return item[locale][field];
  }
  if (item && item.en && item.en[field]) {
    return item.en[field]; // English fallback for Thai
  }

  // WBS Package generic code matching
  if (field === 'wbsPackage') {
    for (const [code, trans] of Object.entries(WBS_TRANSLATIONS)) {
      if (fallback && fallback.includes(code)) {
        return trans[locale] || trans.en;
      }
    }
  }

  // Generic sanitization for English/Thai when no explicit record exists
  if (field === 'sourceType') {
    if (fallback && fallback.includes('施工许可')) return locale === 'th' ? 'ใบอนุญาตก่อสร้าง' : 'Statutory Construction Permit Notice';
    if (fallback && fallback.includes('设计')) return locale === 'th' ? 'เอกสารการออกแบบ' : 'Engineering Design & Review Sign-off';
    if (fallback && fallback.includes('地基') || (fallback && fallback.includes('桩基'))) return locale === 'th' ? 'การตรวจรับงานฐานราก' : 'Deep Foundation Acceptance Certificate';
    if (fallback && fallback.includes('机电')) return locale === 'th' ? 'งานระบบเครื่องกลไฟฟ้า' : 'MEP Installation Engineering Record';
    if (fallback && fallback.includes('设备')) return locale === 'th' ? 'การตรวจรับอุปกรณ์' : 'Equipment Witness & Factory Test Certificate';
    if (fallback && fallback.includes('规划')) return locale === 'th' ? 'แผนงานโครงการ' : 'Master Project Schedule Baseline';
    return locale === 'th' ? 'บันทึกวิศวกรรมสาธารณะ' : 'Public Engineering Milestone Record';
  }

  if (field === 'sourceOrg') {
    if (fallback && fallback.includes('Demo Organization A')) return 'Demo Organization A (Project Client)';
    if (fallback && fallback.includes('Demo Organization B')) return 'Demo Organization B (EPC Contractor)';
    if (fallback && fallback.includes('Demo Organization C')) return 'Demo Organization C (Design Consultant)';
    if (fallback && fallback.includes('Demo Organization D')) return 'Demo Organization D (Foundation Subcontractor)';
    if (fallback && fallback.includes('Demo Organization E')) return 'Demo Organization E (MEP Subcontractor)';
    if (fallback && fallback.includes('Demo Organization G')) return 'Demo Organization G (Supervision Consultant)';
    return locale === 'th' ? 'องค์กรวิศวกรรมที่เกี่ยวข้อง (จำลอง)' : 'Participating Engineering Entity (Mock Demo)';
  }

  if (field === 'errataLog') {
    if (!Array.isArray(fallback)) return [];
    const ACTION_MAP = {
      '初始存证建档': 'Initial Dossier Archiving',
      '施工许可公示归档': 'Construction Permit Gazette Filing',
      '现场主要管理人员备案': 'Site Management Personnel Filing',
      '竣工交付确认': 'Completion & Handover Sign-off',
      '分部工程验收确认': 'Subdivision Acceptance Sign-off',
      '自述凭据提报': 'Self-Claimed Credential Submission',
      'AI 候选解析入库': 'AI Candidate Parsing & Ingestion',
      '监理备案登记': 'Supervision Filing Registration',
      '任职提报记录': 'Role Assignment Filing Record',
      '施工图图纸示意签署': 'Construction Drawing Mock Sign-off',
      '个人业绩认领申请': 'Personal Portfolio Claim Application',
      '监理人员资质备案': 'Supervision Qualification Filing',
      '施工图审定合格': 'Construction Drawing Approval',
      '桩基分部验收记录': 'Pile Foundation Division Acceptance',
      '进场准备提报': 'Site Mobilization Submission',
      '主体分部工程联合签章': 'Main Structure Division Joint Sign-off',
      '编制排程基准线': 'Schedule Baseline Establishment',
      '网络抓取候选入库': 'Web Ingestion Candidate Import',
      '专家评审意见归档': 'Expert Review Opinion Archiving',
      '现场提升联合见证': 'Joint Aerial Lifting Witness'
    };
    const USER_MAP = {
      '经开区数据网关': 'Development Zone Data Gateway',
      'Demo Organization A': 'Demo Organization A',
      'Demo Organization G 监理组': 'Demo Organization G (Supervision Team)',
      'Demo Organization C': 'Demo Organization C',
      'Demo Engineer 04 (总监)': 'Demo Engineer 04 (Director)',
      'Demo Organization E 管理员': 'Demo Organization E (Admin)',
      'Atlas 智能爬虫 v3.1': 'Atlas Crawler v3.1',
      '住建行政审批窗口': 'Housing & Construction Administrative Window',
      'Demo Engineer 01': 'Demo Engineer 01',
      'Demo Engineer 02': 'Demo Engineer 02',
      'Demo Engineer 03': 'Demo Engineer 03',
      'Demo Engineer 04': 'Demo Engineer 04',
      'Demo Organization A 经办人': 'Demo Organization A (Agent)',
      '总承包工程管理部': 'General Contractor Project Management Dept',
      'Demo Organization E': 'Demo Organization E',
      '四方代表密钥': 'Four-Party Representative Keys',
      '总包项目计划工程师': 'General Contractor Planning Engineer',
      'Atlas 智能爬虫': 'Atlas Crawler',
      '评审组秘书处': 'Expert Panel Secretariat',
      '总监 Demo Engineer 04': 'Director Demo Engineer 04'
    };
    const NOTE_MAP = {
      '原始登记通过核验': 'Original registration verified',
      '施工许可证法定公报核对一致': 'Construction permit gazette matched',
      '项目总监及现场指挥团队履责公示': 'Site director and command team duty disclosure',
      '各专业图纸全部就绪并盖章': 'All discipline drawings finalized and endorsed',
      '现场桩基实测抽检合格率 100%': 'On-site pile foundation testing pass rate 100%',
      '提报阶段履约申述，等待总包与业主确权': 'Submitted milestone self-claim, awaiting client sign-off',
      '自动发现中标候选人名单，等待人工或数字公钥确认': 'Candidate vendor detected, awaiting confirmation',
      '法定监理资质核验无误': 'Statutory supervision qualifications confirmed',
      '原型演示确认，无真实执业资格': 'Prototype demo confirmation, non-statutory mock',
      '原型演示设计责任签署，无真实执业资格': 'Prototype demo design endorsement, mock credential',
      '提报履约履历，等待机构确认': 'Submitted milestone experience, awaiting confirmation',
      '原型比对示意一致，无真实技术验证': 'Prototype comparison consistent, illustrative demo',
      '施工图审查通过，转入深化交付': 'Drawings approved, proceeding to detailed fabrication',
      '隐蔽工程质量验收记录合格': 'Concealed works quality inspection passed',
      '自述施工组织方案编制中': 'Self-reported construction scheme in preparation',
      '阶段验收通过': 'Milestone acceptance approved',
      '基准工期计划导入': 'Baseline schedule imported',
      '标讯文本语义抽取': 'Tender semantic entity extraction completed',
      '深化方案核准': 'Detailed design scheme approved',
      '旁站监理验收通过': 'Station supervision acceptance approved'
    };
    return fallback.map(log => ({
      ...log,
      action: ACTION_MAP[log.action] || log.action,
      user: USER_MAP[log.user] || log.user,
      note: NOTE_MAP[log.note] || log.note
    }));
  }

  if (field === 'summary') {
    return locale === 'th'
      ? 'บันทึกหมุดหมายวิศวกรรมโครงการ สัญญาการค้าและเอกสารภายในบริษัทถือเป็นความลับและไม่แสดงต่อสาธารณะ'
      : 'Public engineering project milestone record. Commercial contracts, guarantee bonds, and internal documents are confidential and excluded from public display.';
  }

  return fallback;
}

export function EvidenceModal({ evidence, evidenceId, onClose, onSelectEntity }) {
  const dialogRef = useDialogA11y(onClose);
  const { locale = 'zh' } = useI18n();

  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  // Fallback modal if evidence object is missing
  if (!evidence) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-subtle backdrop-blur-sm animate-fadeIn">
        <div 
          ref={dialogRef}
          tabIndex={-1}
          className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-md w-full p-6 text-slate-800 space-y-4 focus:outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-missing-title"
        >
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 id="evidence-missing-title" className="font-bold text-base text-ink">
                {isZh ? '证据记录缺失' : isTh ? 'ไม่พบข้อมูลหลักฐาน' : 'Evidence Record Missing'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400"
              aria-label={isZh ? '关闭' : isTh ? 'ปิด' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-900 space-y-2">
            <p className="font-semibold">
              {isZh ? '未能定位到存证编号：' : isTh ? 'ไม่สามารถค้นหารหัสหลักฐาน: ' : 'Unable to locate record ID: '}
              <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-slate-800">
                {evidenceId || 'UNKNOWN'}
              </code>
            </p>
            <p className="text-amber-800 leading-relaxed">
              {isZh 
                ? '该存证凭据尚未录入当前工程存证库或存证哈希正在同步中。系统已自动记录此次查询日志，杜绝静默失败。'
                : isTh
                ? 'หลักฐานนี้ยังไม่ได้ลงทะเบียนในระบบ หรืออยู่ระหว่างการประมวลผล ระบบได้บันทึกประวัติการสืบค้นนี้แล้ว'
                : 'This evidence record has not been indexed in the active engineering dossier archive. The query log has been preserved.'}
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {isZh ? '关闭提示' : isTh ? 'ปิดข้อความ' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = evidence.verificationLevel === 'VERIFIED';
  const isSelfClaimed = evidence.verificationLevel === 'SELF_CLAIMED';
  const isAiCandidate = evidence.verificationLevel === 'AI_CANDIDATE';
  const isPlanned = evidence.verificationLevel === 'PLANNED' || evidence.verificationLevel === 'PROSPECTIVE';

  // Localized verification level label
  const getLevelLabel = () => {
    if (isVerified) {
      return isZh ? '公共工程记录 (原型示意)' : isTh ? 'บันทึกวิศวกรรมสาธารณะ (ตัวอย่างจำลอง)' : 'PUBLIC RECORD (ILLUSTRATIVE)';
    }
    if (isSelfClaimed) {
      return isZh ? '参建方单方申报 (FIELD BRIEF)' : isTh ? 'บันทึกโดยตรงจากผู้เข้าร่วม (FIELD BRIEF)' : 'SELF-CLAIMED (FIELD BRIEF)';
    }
    if (isAiCandidate) {
      return isZh ? '公开采招公示提取 (NOTICE)' : isTh ? 'ข้อมูลประกาศสาธารณะ (EXTRACTED)' : 'PUBLIC NOTICE (EXTRACTED)';
    }
    return isZh ? '规划里程碑基准 (PLANNED)' : isTh ? 'หมุดหมายตามแผนงาน (PLANNED)' : 'PROSPECTIVE MILESTONE (PLANNED)';
  };

  // Localized fields
  const localizedSourceType = getLocalizedField(evidence.id, 'sourceType', locale, evidence.sourceType);
  const localizedSourceOrg = getLocalizedField(evidence.id, 'sourceOrg', locale, evidence.sourceOrg);
  const localizedWbsPackage = getLocalizedField(evidence.id, 'wbsPackage', locale, evidence.wbsPackage);
  const localizedSummary = getLocalizedField(evidence.id, 'summary', locale, evidence.summary);
  const localizedErrata = getLocalizedField(evidence.id, 'errataLog', locale, evidence.errataLog) || [];

  // Record Reference ID (Never show misleading cryptographic hash / signatures)
  const recordRefId = evidence.hashSignature && !evidence.hashSignature.startsWith('0x')
    ? evidence.hashSignature
    : `MOCK-RECORD-REF-${evidence.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-subtle backdrop-blur-sm animate-fadeIn">
      <div 
        ref={dialogRef}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800 focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-modal-title"
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-start justify-between ${
          isVerified 
            ? 'bg-emerald-50 border-emerald-200' 
            : isSelfClaimed 
            ? 'bg-blue-50 border-blue-200' 
            : isPlanned
            ? 'bg-slate-100 border-slate-300'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isVerified 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                : isSelfClaimed 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : isPlanned
                ? 'bg-slate-600 text-white shadow-md shadow-slate-200'
                : 'bg-amber-500 text-white shadow-md shadow-amber-200'
            }`}>
              {isVerified && <ShieldCheck className="w-6 h-6" />}
              {isSelfClaimed && <UserCheck className="w-6 h-6" />}
              {isAiCandidate && <Bot className="w-6 h-6" />}
              {isPlanned && <Clock className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/80 border text-slate-700">
                  {evidence.id}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isVerified 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : isSelfClaimed 
                    ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                    : isPlanned
                    ? 'bg-slate-200 text-slate-800 border border-slate-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {getLevelLabel()}
                </span>
              </div>
              <h3 id="evidence-modal-title" className="text-base sm:text-lg font-bold text-ink mt-1">
                {isZh 
                  ? '工程参建角色与里程碑事实核验面板' 
                  : isTh 
                  ? 'แฟ้มประวัติหมุดหมายและบทบาทในโครงการวิศวกรรม' 
                  : 'Engineering Milestone & Role Attribution Dossier'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label={isZh ? '关闭证据弹窗' : isTh ? 'ปิดหน้าต่างหลักฐาน' : 'Close evidence dialog'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Status Note Warning & Confidentiality Policy Notice */}
          {isPlanned && (
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 text-xs flex gap-2">
              <Clock className="w-4 h-4 shrink-0 text-slate-600 mt-0.5" />
              <div>
                <strong className="font-semibold">
                  {isZh ? '未来排程与基准线规划说明：' : isTh ? 'แผนงานและเกณฑ์มาตรฐานในอนาคต: ' : 'Prospective Master Schedule Baseline: '}
                </strong>
                {isZh 
                  ? '本项系工程总体排程基准线预置规划。当前处于施工实施阶段，系统调试及竣工验收尚未发生，实际执行数据明确标注为“未发生/未公开”，严禁编造完成百分比。'
                  : isTh
                  ? 'หมุดหมายตามแผนงานหลักของโครงการ เนื่องจากอยู่ระหว่างการก่อสร้าง การทดสอบระบบและการส่งมอบยังไม่เกิดขึ้น ข้อมูลแสดงตามแผนงานจริงโดยไม่คาดเดาความคืบหน้า'
                  : 'This record represents the master project schedule baseline. As the project is currently in the construction phase, subsequent commissioning and final handover have not yet occurred. Actual execution is honestly reported as prospective without fabricated percentages.'}
              </div>
            </div>
          )}

          {isAiCandidate && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong className="font-semibold">
                  {isZh ? '公开采招公报候选事实声明：' : isTh ? 'ข้อมูลสกัดจากประกาศจัดซื้อจัดจ้างสาธารณะ (ตัวอย่างจำลอง): ' : 'Public Procurement Notice Extraction (Candidate Demo): '}
                </strong>
                {isZh 
                  ? '该证据系通过公开招标公示利用 NLP 结构化提取，尚未获得业主或总包单位密钥双向签认，置信度仅作为候选提示，不得作为商业与法律凭证。'
                  : isTh
                  ? 'สกัดจากประกาศการจัดซื้อจัดจ้างภาครัฐด้วย NLP ใช้เป็นข้อมูลอ้างอิงเบื้องต้นเท่านั้น ไม่ใช่สัญญาการค้าหรือเอกสารที่มีผลผูกพันทางกฎหมาย'
                  : 'This entry was extracted from public procurement notices via automated NLP. It serves as an unconfirmed candidate indicator and does not constitute a legally binding commercial contract.'}
              </div>
            </div>
          )}

          {isSelfClaimed && (
            <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg text-blue-900 text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
              <div>
                <strong className="font-semibold">
                  {isZh ? '参建方自述工程纪要说明：' : isTh ? 'บันทึกความคืบหน้าภาคสนามโดยผู้เข้าร่วม: ' : 'Self-Claimed Engineering Field Brief Note: '}
                </strong>
                {isZh 
                  ? '该记录系参建单位或现场工程师单方提报的工程施工动态。内部商业合同细节与财务工程款结算凭证属企业机密，不予公开展示。'
                  : isTh
                  ? 'รายการนี้รายงานโดยตรงจากหน่วยงานผู้เข้าร่วมหรือวิศวกรภาคสนาม ข้อตกลงทางการค้าและข้อมูลการเงินภายในถือเป็นความลับ ไม่มีการเผยแพร่ต่อสาธารณะ'
                  : 'This record is self-reported by participating contractors or site engineers. Proprietary commercial contracts, financial disbursements, and internal corporate files are confidential and excluded from public display.'}
              </div>
            </div>
          )}

          {isVerified && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <strong className="font-semibold">
                  {isZh ? '公共工程里程碑与履约角色核验说明 (MOCK 演示)：' : isTh ? 'บันทึกการยืนยันหมุดหมายวิศวกรรมและบทบาทขององค์กร (ตัวอย่างจำลอง): ' : 'Public Engineering Milestone & Role Attribution Note (Mock Demo): '}
                </strong>
                {isZh 
                  ? '商业合同、履约保函、财务结算与企业内部涉密文件严格保密，禁止公开上传展示，后续归入私有企业平台。本记录仅用于公开工程里程碑、法定施工许可公示及参建组织履责分工的事实核对，不含真实私有合同或数字签名。'
                  : isTh
                  ? 'สัญญาการค้า หนังสือค้ำประกัน การเงิน และเอกสารลับภายในบริษัทถือเป็นความลับ ไม่อนุญาตให้อัปโหลดหรือแสดงต่อสาธารณะ แผงนี้ใช้สำหรับการยืนยันหมุดหมายสาธารณะ ใบอนุญาตก่อสร้าง และบทบาทขององค์กรเท่านั้น'
                  : 'Commercial contracts, guarantee bonds, financial settlements, and proprietary corporate documents are confidential, strictly excluded from public display, and deferred to private enterprise systems. This record attributes only public engineering milestones, statutory permits, and organizational roles without private contracts or digital signatures.'}
              </div>
            </div>
          )}

          {/* Core Evidence Metadata Table */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">
                {isZh ? '来源文件类别:' : isTh ? 'หมวดหมู่เอกสาร:' : 'Source Category:'}
              </span>
              <span className="sm:col-span-2 font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                {localizedSourceType}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">
                {isZh ? '存证出处主体:' : isTh ? 'องค์กรที่เกี่ยวข้อง:' : 'Attribution Entity:'}
              </span>
              <span className="sm:col-span-2 text-slate-800 font-medium">
                {localizedSourceOrg}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">
                {isZh ? '声明存证时间:' : isTh ? 'วันที่บันทึก:' : 'Milestone Date:'}
              </span>
              <span className="sm:col-span-2 font-mono text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                {evidence.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">
                {isZh ? '关联工程包 (WBS):' : isTh ? 'แพ็กเกจงานที่เกี่ยวข้อง (WBS):' : 'Associated Package (WBS):'}
              </span>
              <span className="sm:col-span-2 font-semibold text-emerald-700">
                {localizedWbsPackage}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
              <span className="text-slate-500 font-medium">
                {isZh ? '存证备案编号:' : isTh ? 'รหัสอ้างอิงบันทึก:' : 'Record Reference ID:'}
              </span>
              <span className="sm:col-span-2 font-mono text-xs text-slate-600 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                {recordRefId}
              </span>
            </div>
          </div>

          {/* Evidence Summary Content */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              {isZh ? '存证事实与内容摘要' : isTh ? 'สรุปสาระสำคัญของหมุดหมายและขอบเขต' : 'Milestone & Scope Summary'}
            </h4>
            <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
              {localizedSummary}
            </p>
          </div>

          {/* Errata & Correction Log */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                {isZh 
                  ? '纠错审计记录 (Errata & Audit Log)' 
                  : isTh 
                  ? 'บันทึกการแก้ไขและการตรวจสอบ (Errata Log)' 
                  : 'Revision & Errata Audit Log'}
              </h4>
              <span className="text-[11px] text-slate-400">
                {isZh ? '原型演示修订记录' : isTh ? 'ประวัติการแก้ไขจำลอง' : 'Prototype Demo Audit Trail'}
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
              {localizedErrata && localizedErrata.length > 0 ? (
                localizedErrata.map((log, index) => (
                  <div key={index} className="p-2.5 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-500">{log.date}</span>
                      <span className="font-semibold text-slate-800">{log.action}</span>
                      <span className="text-slate-600">({log.user})</span>
                    </div>
                    <span className="text-slate-500 italic text-[11px]">{log.note}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-slate-400 text-center italic">
                  {isZh 
                    ? '暂无争议或纠错修订记录，原始存证状态稳定。' 
                    : isTh 
                    ? 'ไม่มีข้อพิพาทหรือการแก้ไข บันทึกมีความเสถียร' 
                    : 'No active disputes or errata. Baseline record is stable.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isZh 
              ? 'DEMO Project P001 · 里程碑事实核验中心' 
              : isTh 
              ? 'DEMO Project P001 · ศูนย์ตรวจสอบย้อนกลับ' 
              : 'DEMO Project P001 · Milestone Traceability'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            {isZh ? '完成查看' : isTh ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
