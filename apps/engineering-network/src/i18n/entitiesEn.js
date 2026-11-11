import { ORGANIZATIONS, PERSONS } from '../data/canonicalEntities.js';
/**
 * English localization data for people, companies, and work package entities
 * Ensures high-visibility role, organization, and bio descriptions localize cleanly in English view
 */

export const PEOPLE_EN = {
  'ENG-01': {
    name: 'Demo Engineer 01 (Zhang Jianhua)',
    title: 'Licensed Master Builder · Construction Site Director (Mock)',
    orgName: 'East China Smart Construction Group (EPC General Contractor)',
    bio: 'Specializes in high-altitude hydraulic synchronized lifting of heavy long-span spatial trusses, prefabricated heavy industrial facilities coordination, and on-site construction safety management.',
    skills: ['Long-Span Steel Trusses', 'Hydraulic Synchronized Lifting', 'BIM 4D Construction', 'EPC Site Management', 'Safety Production'],
  },
  'ENG-02': {
    name: 'Demo Engineer 02 (Li Mingxuan)',
    title: 'Licensed Class-1 Structural Engineer · Design Director (Mock)',
    orgName: 'Tongji Architectural Design & Research Institute (Class-A)',
    bio: 'Specializes in dynamic structural performance analysis of complex long-span spatial space trusses, wind tunnel response modeling, and lifecycle digital BIM statutory review.',
    skills: ['Seismic & Wind Design', 'Spatial Space Truss Analysis', 'BIM Forward Detailing', 'Digital Twin Structural Modeling'],
  },
  'ENG-03': {
    name: 'Demo Engineer 03 (Wang Hongwei)',
    title: 'MEP Installation Director · Cleanroom Project Manager (Mock)',
    orgName: 'Electromechanical Power & Installation Technology Corp',
    bio: 'Long engaged in cleanroom HVAC environmental construction, ultrapure gas & water piping, and magnetic levitation energy-saving central plant commissioning.',
    skills: ['Cleanroom MEP Installation', 'Navisworks Clash Resolution', 'Precision Constant Temp/Humidity HVAC', 'Cleanroom Orbital Welding'],
  },
  'ENG-04': {
    name: 'Demo Engineer 04 (Demo Supervisor)',
    title: 'Licensed Chief Supervision Engineer · Quality Lead (Mock)',
    orgName: 'National Engineering Supervision & Advisory Consulting',
    bio: 'Supervises whole-process construction quality, full-time station witness stamping, and multi-party contract compliance.',
    skills: ['Quality Station Supervision', 'Statutory Witness Stamping', 'Safety Risk Control', 'Multi-Party Contract Oversight'],
  },
  'ENG-05': {
    name: 'Demo Engineer 05 (Zhao Guodong)',
    title: 'Licensed Geotechnical Engineer · Deep Foundation Director (Mock)',
    orgName: 'Specialized Deep Foundation Engineering Corp',
    bio: 'Specializes in coastal soft-soil deep excavation diaphragm walls, pile-raft composite foundation testing, and micro-deformation monitoring.',
    skills: ['Deep Excavation Enclosures', 'Diaphragm Wall Quality Control', 'Micro-Deformation Monitoring', 'Foundation Load Testing'],
  }
};

export const COMPANIES_EN = {
  'ORG-A': {
    name: 'East China Smart Manufacturing Investment Group',
    fullName: 'East China Smart Manufacturing Investment & Development Co., Ltd.',
    sector: 'Industrial Infrastructure Investment & Client Project Management',
    role: 'Owner / Client Project Dept',
    region: 'East China',
    description: 'Major state-backed industrial infrastructure investor and client management entity for smart manufacturing bases.',
    services: ['Industrial Infrastructure Investment', 'Owner Project Management', 'EPC Tendering & Procurement', 'Statutory Registration & Handover'],
  },
  'ORG-B': {
    name: 'East China Smart Construction EPC General Contractor',
    fullName: 'East China Smart Construction Engineering General Contracting Group',
    sector: 'EPC General Contracting · Special Grade Qualification',
    role: 'EPC Prime Contractor · Special Class',
    region: 'East China',
    description: 'Special grade prime contractor specializing in heavy industrial plants, long-span steel structures, and digital site management.',
    services: ['EPC General Contracting', 'Long-Span Steel Space Truss Erection', 'Prefabricated Heavy Industrial Plants', 'BIM 4D Digital Construction Delivery'],
  },
  'ORG-C': {
    name: 'Tongji Architectural Design & Research Institute',
    fullName: 'Tongji Architectural Design & Engineering Survey Institute Co., Ltd.',
    sector: 'Survey & Design · National Class-A Design Institute',
    role: 'Design & BIM Forward Engineering',
    region: 'East China',
    description: 'Premier national design institute leading digital BIM forward design, structural optimization, and statutory review coordination.',
    services: ['Architectural Survey & Design', 'BIM Forward Detailing', 'Structural Optimization & Analysis', 'Digital Drawing Review'],
  },
  'ORG-D': {
    name: 'Shanghai Specialized Deep Foundation Subcontractor',
    fullName: 'Demo Organization D (Deep Foundations & Underground Engineering Co., Ltd.)',
    sector: 'Specialized Subcontracting · Geotechnical & Foundations',
    role: 'Specialized Subcontractor · Foundations',
    region: 'East China / Coastal Geological Zone',
    description: 'Specialized geotechnical contractor focusing on deep excavation enclosures, diaphragm walls, and automated servo strut systems (Illustrative Mock Data).',
    services: ['Deep Excavation Enclosures', 'Diaphragm Wall Construction', 'Servo Steel Strut Installation', 'Geotechnical Load Testing'],
  },
  'ORG-E': {
    name: 'Cleanroom Precision MEP Installation Subcontractor',
    fullName: 'Demo Organization E (Cleanroom MEP & Power Installation Engineering Co., Ltd.)',
    sector: 'Specialized Subcontracting · Cleanroom MEP & Power',
    role: 'Specialized Subcontractor · MEP',
    region: 'National High-Tech Industrial Zone',
    description: 'Specialized contractor for microelectronics and semiconductor cleanroom HVAC, high-purity process piping, and vibration isolation (Illustrative Mock Data).',
    services: ['Cleanroom HVAC Systems', 'High-Purity Process Piping', 'Magnetic Bearing Chiller Integration', 'Vibration Damping Systems'],
  },
  'ORG-G': {
    name: 'Zhongzi Engineering Quality & Safety Supervision Consulting',
    fullName: 'Demo Organization G (Engineering Quality & Safety Supervision Consulting Co., Ltd.)',
    sector: 'Engineering Supervision · Comprehensive Qualification',
    role: 'Supervision & Quality Advisory',
    region: 'Major National Engineering Regions',
    description: 'Engineering quality and safety supervision advisory firm performing on-site inspection, witness testing, and compliance auditing (Illustrative Mock Data).',
    services: ['Full-Process Quality Supervision', 'Safety Risk Assessment', 'Station Witness Testing', 'Statutory Milestone Acceptance'],
  },
  'ORG-F': {
    name: 'Demo Organization F (Equipment Integration)',
    fullName: 'Demo Organization F (Automated Industrial Equipment Integration Corp)',
    sector: 'Industrial Equipment Manufacturer · Special Grade',
    role: 'Equipment Vendor · Crane & Automation',
    region: 'East China / Central China Industrial Zone',
    description: 'Manufacturer of industrial cranes, automated logistics tracks, and cleanroom material hoists (Illustrative Mock Data).',
    services: ['Industrial VFD Bridge Cranes', 'Cleanroom Hoist Systems', 'Automated Logistics Conveyors'],
  },
  'ORG-H': {
    name: 'Demo Organization H (Steel Fabrication)',
    fullName: 'Demo Organization H (Steel Structure Technology & Fabrication Group)',
    sector: 'Specialized Subcontracting · Spatial Steel Structures',
    role: 'Specialized Subcontractor · Steel Fabrication',
    region: 'East China / North China Industrial Zone',
    description: 'Specialized steel manufacturer for spatial space trusses, bolt-sphere joints, and curved pipe trusses (Illustrative Mock Data).',
    services: ['Space Truss CNC Fabrication', 'Prefabricated Steel Structures', 'Bolt-Sphere Joint Manufacturing'],
  }
};

export const ENTITIES_EN = COMPANIES_EN;

export const WORK_PACKAGES_EN = {
  '建设单位项目立项与法定发包统筹': 'Project Charter & Statutory Procurement Coordination',
  '大跨度钢结构及屋面围护主体工程': 'Long-Span Steel Space Truss & Roofing Enclosure Package',
  '大跨度钢结构标段项目总监兼建造师': 'Long-Span Steel Package Director & Master Builder',
  '勘察设计与全阶段 BIM 数字化咨询': 'Geotechnical Survey, Design & Lifecycle BIM Advisory',
  '勘察设计总监兼结构专业负责人': 'Design Director & Lead Structural Engineer',
  '桩基工程与地下地基处理标段': 'Foundation Piling & Ground Improvement Package',
  '桩基工程地基技术负责人': 'Piling & Geotechnical Technical Lead',
  '洁净厂房动力空调机电及管道安装': 'Cleanroom Precision HVAC & Process Piping Installation',
  '洁净机电专业项目经理': 'Cleanroom MEP Project Manager',
  '自动化工艺生产线机组供应与集成': 'Automated Assembly Line Equipment Supply & Integration',
  '全过程质量安全监督与工程监理': 'Whole-Process Quality & Safety Supervision Consulting',
  '总监理工程师': 'Chief Supervision Engineer',
  '地下连续墙与基坑围护工程标段': 'Diaphragm Wall & Excavation Shoring Package',
  '深基坑技术总监': 'Deep Excavation Technical Director',
  '地下主体结构土建总承包标段': 'Underground Civil Substructure Prime Contract Package',
  '临港总装车间与配套码头总承包': 'Harbor Assembly Hall & Heavy Wharf Prime EPC Contract',
  '临港项目部执行总监': 'Harbor Project Site Executive Director',
  '微电子超净车间动力机电工程': 'Microelectronics Cleanroom MEP Infrastructure Package',
  '超净机电执行技术经理': 'Cleanroom MEP Executive Technical Manager',
  '装配式双曲面空间钢网架制作安装': 'Prefabricated Curved Space Truss Fabrication & Erection',
  '智慧堆场重载道路与轨道施工标段': 'Smart Yard Heavy Pavement & Rail Construction Package',
  '绿电氢能深冷储运压力管道标段': 'Green Hydrogen Cryogenic Piping & Pressure Vessel Package',
  '特大跨径斜拉桥主塔与钢箱梁标段': 'Long-Span Cable-Stayed Bridge Tower & Steel Box Girder',
  '桥梁高空结构施工指挥长': 'Bridge Superstructure Construction Director'
};

export function getLocalizedWorkPackage(name, locale) {
  if (!name || locale === 'zh') return name;
  return WORK_PACKAGES_EN[name] || name;
}

export function getLocalizedPerson(person, locale) {
  if (!person) return person;
  if (locale === 'zh') return person;
  const enData = PEOPLE_EN[person.id];
  if (!enData) return person;
  return {
    ...person,
    name: enData.name || person.name,
    title: enData.title || person.title,
    orgName: enData.orgName || person.orgName,
    bio: enData.bio || person.bio,
    skills: enData.skills || person.skills,
  };
}

export function getLocalizedCompany(company, locale) {
  if (!company) return company;
  if (locale === 'zh') return company;
  const enData = COMPANIES_EN[company.id];
  if (!enData) return company;
  return {
    ...company,
    name: enData.name || company.name,
    fullName: enData.fullName || company.fullName,
    sector: enData.sector || company.sector,
    description: enData.description || company.description,
    services: enData.services || company.services,
  };
}

// Localization cannot rename an entity or change its legal identity/affiliation.
for (const [id, entity] of Object.entries(ORGANIZATIONS)) Object.assign(COMPANIES_EN[id] ||= {}, entity);
for (const [id, entity] of Object.entries(PERSONS)) Object.assign(PEOPLE_EN[id] ||= {}, entity);
