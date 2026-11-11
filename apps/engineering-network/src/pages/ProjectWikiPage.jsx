import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, User, ShieldCheck, UserCheck, Bot, Calendar, Layers, 
  ChevronRight, ChevronDown, CheckCircle2, Clock, AlertTriangle, 
  ExternalLink, FileText, ArrowRight, Filter, Eye, Award, Check,
  BookOpen, History, Link2, Share2, Maximize2, X, Sparkles, Milestone
} from 'lucide-react';
import { 
  PROJECT_DATA, 
  PROJECTS_LIST, 
  getProjectById, 
  getProjectParticipations, 
  normalizeProjectId 
} from '../data/projectData';
import { EngineeringIllustration, IllustrationLightboxModal } from '../components/illustrations/EngineeringIllustration';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { useI18n } from '../i18n/I18nContext';
import { 
  getLocalizedProject, 
  getLocalizedStage, 
  getLocalizedBid, 
  getLocalizedUpdate 
} from '../i18n/projectsEn';
import { PEOPLE_EN, ENTITIES_EN, WORK_PACKAGES_EN } from '../i18n/entitiesEn';
import { getLocalizedField } from '../components/common/EvidenceModal';

export function ProjectWikiPage({ 
  onSelectEvidence,
  onSelectOrg,
  onSelectEngineer
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';

  const getLocalizedWorkPackage = (name) => {
    if (!name || locale === 'zh') return name;
    return WORK_PACKAGES_EN[name] || name;
  };

  const getLocalizedPeriod = (period) => {
    if (!period || locale === 'zh') return period;
    return period
      .replace('至今', 'to Present')
      .replace(/至/g, 'to')
      .replace('已完工', 'Completed')
      .replace('履约中', 'Active')
      .replace('进行中', 'In Progress')
      .replace(/远期规划/g, 'Long-term Plan')
      .replace(/已完成约\s*/g, '~')
      .replace(/已完成/g, 'Completed')
      .replace(/\s*产值/g, ' Value Completed')
      .replace(/已验收交付/g, 'Delivered & Accepted')
      .replace(/已验收/g, 'Accepted')
      .replace(/未知\/未公开\s*\(前置工序尚未完成\)/g, 'Unknown / Not Disclosed (Prerequisites in progress)')
      .replace(/未知\/未公开/g, 'Unknown / Not Disclosed')
      .replace(/未知/g, 'Unknown')
      .replace(/未公开/g, 'Not Disclosed')
      .replace(/待定/g, 'TBD')
      .replace(/延后\s*1\s*个月\s*\(长周期备件订货周期\)/g, 'Delayed 1 mo (Long-lead equipment lead time)')
      .replace(/延后\s*3\s*周\s*\(标段答疑澄清\)/g, 'Delayed 3 wks (Tender clarification)')
      .replace(/延后\s*1\s*个月/g, 'Delayed 1 mo')
      .replace(/按期达成/g, 'On Schedule')
      .replace(/关键路径受控/g, 'Critical Path Controlled')
      .replace(/归档修订版/g, 'Archived Revision');
  };

  const DELIVERABLES_EN = {
    '完成立项核准批复、规划许可申报与施工总承包招投标法定授标': 'Project approval, planning permit filing & EPC prime contract statutory award',
    '大跨度屋盖空间桁架现场加工拼装与高空液压同步提升，完成第 4 单元顶升': 'On-site fabrication, space truss assembly & synchronized hydraulic lifting of Unit 4',
    '组织编制液压提升专项施工技术方案，现场签发高空顶升安全质量监控指令': 'Formulated hydraulic lifting scheme & issued on-site aerial lifting quality directives',
    '提交全套施工图设计文件并通过数字化联合图审，交付正向 BIM 碰撞优化模型': 'Delivered complete construction drawings via joint digital review with BIM clash detection',
    '主持完成大跨度结构抗震抗风设计与施工图设计文件，签署图审交付记录': 'Led long-span seismic/wind structural design and signed engineering drawing review',
    '完成 1,420 根预应力管桩与钻孔灌注桩施工，通过桩身完整性及静载试验验收': 'Completed 1,420 prestressed & bored piles, passed integrity and static load test acceptance',
    '签署桩基承载力现场检测报告与分部工程联合质量验评表': 'Endorsed on-site pile bearing capacity inspection report & division quality sign-off',
    '完成机房深化管网碰撞优化，提交洁净空调风道与冷水主机进场安装报告': 'Completed MEP plantroom clash coordination, delivered cleanroom HVAC ductwork install report',
    '组织编制 B1 区域机电管线综合碰撞优化模型并参与专家技术答辩': 'Developed B1 zone MEP clash resolution BIM model & participated in expert defense',
    '公开采招设备候选供应商提报，完成变频起重机组技术参数预审': 'Public tender candidate vendor submission, completed crane VFD technical prequalification',
    '全过程工程监理旁站见证，签署第 4 单元钢结构提升与关键工序验收凭证': 'Full-lifecycle supervision witness, signed Unit 4 structural steel lifting sign-off',
    '审核并签发总承包专项施工组织方案与阶段性质量通报': 'Reviewed and approved EPC special construction scheme & milestone quality bulletin',
    '完成 1200mm 厚深地连墙成槽灌注与第 1、2 道伺服钢支撑受力监测': 'Completed 1200mm diaphragm wall trench pouring & servo strut stress monitoring',
    '主持深基坑自动化受力位移监控系统运行并签署阶段安全评估报告': 'Supervised deep pit automated displacement monitoring & signed safety assessment',
    '中标地下枢纽土建主体结构施工总承包并完成前期施工组织策划': 'Won civil works general contract for transit hub & finalized construction scheme',
    'EPC 施工总承包联合体中标与工程实施总策划': 'EPC consortium tender award & construction milestone execution planning',
    '组织 72 米大跨度空间桁架高空拼装吊装技术交底与进场准备': 'Organized technical briefing and site prep for 72m long-span space truss erection',
    '完成超净微环境动力管综数字化深化设计并通过技术审查': 'Completed digital detailed design for cleanroom micro-environment MEP networks',
    '主持磁悬浮冷水机组与高效净化送风单元现场进场开箱核验': 'Chaired unboxing inspection of maglev chillers & high-efficiency cleanroom AHUs',
    '按期交付全部螺栓球节点网架加工成品，通过工厂出厂检测自验': 'Delivered all bolt-sphere joint space frames on schedule with factory QA records',
    '完成 45 吨轮压重载水稳基底浇筑施工并通过质检合格鉴定': 'Completed 45-ton wheel-load cement-stabilized subbase pour with quality clearance',
    '提报压力容器安装施工资格预审并完成特种设备检验许可备案': 'Submitted pressure vessel installer prequalification & filed special equipment permits',
    '完成 260 米主塔索鞍高空就位毫米级激光测控与斜拉索挂设验收': 'Completed millimeter laser survey of 260m tower saddle placement & cable stays',
    '现场组织主塔索鞍千吨级吊装姿态调整与安全见证签认': 'Organized 1,000-ton tower saddle attitude adjustment & signed safety clearance',
    '现代化绿色智能示范厂房整体交付': 'Turnkey delivery of modern green smart manufacturing plant',
    '全套施工图设计图审报告及全生命周期数字化 BIM 模型': 'Complete approved construction drawings & full lifecycle BIM model',
    '详勘地质柱状图与承载力报告 (已归档)': 'Detailed geological column & bearing capacity report (Archived)',
    '抗震设防专项审查专家意见书': 'Special expert review opinion on seismic fortification',
    '680 根高强混凝土预应力管桩及基坑封闭止水帷幕': '680 prestressed high-strength concrete pipe piles & pit curtain wall',
    '低应变与高应变桩基承载力抽检 100% 合格记录': 'Low-strain and high-strain pile bearing capacity test records (100% pass)',
    '85米大跨度双向刚接网架、金属夹芯隔热外维护墙系统': '85m long-span space truss & insulated sandwich metal cladding envelope',
    '钢结构柱梁节点一级焊缝全长超声波探伤报告': 'Full ultrasonic testing report of Class-1 welds on structural steel nodes',
    '同步提升位移实时监控曲线与应力监测表': 'Real-time synchronized lifting displacement curves & stress logs',
    '万级/千级洁净室环境动力控制系统、工艺冷却水循环管道': 'Class 10,000/1,000 cleanroom HVAC power control & process cooling water pipes',
    '镀锌风管漏光法与漏风量试验测试记录 (待总包复核)': 'Galvanized air duct light leakage & airflow leakage test records',
    '50吨双小车变频桥式起重机及洁净物料输送轨道': '50-ton dual-trolley VFD bridge crane & clean material conveyor tracks',
    '设备公开中标技术规格备忘录 (公开标讯自动关联，待三方存证)': 'Equipment public tender technical specification memo (Public notice linked, awaiting 3-party audit)'
  };

  const getLocalizedDeliverable = (deliverable) => {
    if (!deliverable || locale === 'zh') return deliverable;
    return DELIVERABLES_EN[deliverable] || deliverable;
  };

  const REVISION_HISTORY_EN = [
    {
      version: 'v2.4',
      date: '2026-10-25 18:30',
      editor: 'Demo Engineer 01 (Archived)',
      comment: 'Updated roof long-span space truss lift completion milestone; attached NDT ultrasonic testing report dossier.',
      verified: true
    },
    {
      version: 'v2.3',
      date: '2026-09-05 14:12',
      editor: 'Demo Organization E Admin (Self-Claimed)',
      comment: 'Added cleanroom MEP detailed clash coordination review conclusions; submitted milestone performance record.',
      verified: false
    },
    {
      version: 'v2.2',
      date: '2026-07-16 04:00',
      editor: 'Atlas AI Candidate Bot (Mock Demo)',
      comment: 'Automated matching against public tender gazettes; captured crane vendor candidate Demo Organization F.',
      verified: false
    },
    {
      version: 'v2.1',
      date: '2025-05-20 16:30',
      editor: 'Demo Organization A Agent (Archived)',
      comment: 'EPC general contracting award effective; imported WBS work breakdown structure and construction permit number.',
      verified: true
    },
    {
      version: 'v1.0',
      date: '2024-06-25 10:00',
      editor: 'Demonstration Zone Filing Gateway (Archived)',
      comment: 'Project charter finalized; established DEMO Project P001 master archive and initial hash indices.',
      verified: true
    }
  ];

  const FOOTNOTES_EN = [
    {
      index: 1,
      id: 'cite-1',
      evidenceId: 'EVD-P001-A01',
      title: 'DEMO Project P001 Project Charter & Land Use Planning Permit Gazette',
      source: 'Demonstration High-Tech Zone Administrative Approval Portal (Public Demo Gazette)',
      pubDate: '2024-06-25',
      archiveCode: 'ARCH-2024-LAND-0091',
      linkText: '[Dossier 0091]'
    },
    {
      index: 2,
      id: 'cite-2',
      evidenceId: 'EVD-P001-C01',
      title: 'DEMO Project P001 Construction Drawing Review Certificate & Seismic Study Sign-off',
      source: 'Digital Engineering Survey & Design Regulatory Platform (Virtual Certification)',
      pubDate: '2025-01-22',
      archiveCode: 'ARCH-2025-DRAW-0143',
      linkText: '[Drawing Review 0143]'
    },
    {
      index: 3,
      id: 'cite-3',
      evidenceId: 'EVD-P001-B01',
      title: 'DEMO Project P001 Statutory Building Construction Permit & QA/QC Registration',
      source: 'Housing & Urban-Rural Development Authority Filing Archive',
      pubDate: '2025-05-18',
      archiveCode: 'ARCH-2025-PERMIT-0082',
      linkText: '[Permit 0082]'
    },
    {
      index: 4,
      id: 'cite-4',
      evidenceId: 'EVD-P001-089',
      title: 'DEMO Project P001 Phase Acceptance Report: Long-Span Steel Truss Lifting Witness',
      source: 'Joint Client, Prime Contractor & Supervision Milestone Record (Mock Demo)',
      pubDate: '2026-10-18',
      archiveCode: 'ARCH-2026-STEEL-0904',
      linkText: '[Milestone Record 0904]'
    }
  ];

  const FOOTNOTES_TH = [
    {
      index: 1,
      id: 'cite-1',
      evidenceId: 'EVD-P001-A01',
      title: 'DEMO Project P001 ประกาศจัดตั้งโครงการและใบอนุญาตผังเมือง',
      source: 'พอร์ทัลอนุมัติการบริหารเขตอุตสาหกรรมตัวอย่าง (ราชกิจจาฯ จำลอง)',
      pubDate: '2024-06-25',
      archiveCode: 'ARCH-2024-LAND-0091',
      linkText: '[เอกสาร 0091]'
    },
    {
      index: 2,
      id: 'cite-2',
      evidenceId: 'EVD-P001-C01',
      title: 'DEMO Project P001 ใบรับรองการตรวจพิจารณาแบบก่อสร้างและการป้องกันแผ่นดินไหว',
      source: 'แพลตฟอร์มกำกับดูแลการออกแบบวิศวกรรมดิจิทัล (การรับรองจำลอง)',
      pubDate: '2025-01-22',
      archiveCode: 'ARCH-2025-DRAW-0143',
      linkText: '[ตรวจแบบ 0143]'
    },
    {
      index: 3,
      id: 'cite-3',
      evidenceId: 'EVD-P001-B01',
      title: 'DEMO Project P001 ใบอนุญาตก่อสร้างอาคารและการลงทะเบียนควบคุมคุณภาพ',
      source: 'คลังจัดเก็บข้อมูลหน่วยงานพัฒนาเมืองและการเคหะ',
      pubDate: '2025-05-18',
      archiveCode: 'ARCH-2025-PERMIT-0082',
      linkText: '[ใบอนุญาต 0082]'
    },
    {
      index: 4,
      id: 'cite-4',
      evidenceId: 'EVD-P001-089',
      title: 'DEMO Project P001 รายงานการตรวจรับตามระยะ: การยกโครงถักเหล็กช่วงกว้าง',
      source: 'บันทึกหมุดหมายร่วมระหว่างเจ้าของโครงการ ผู้รับเหมา และผู้ควบคุมงาน (จำลอง)',
      pubDate: '2026-10-18',
      archiveCode: 'ARCH-2026-STEEL-0904',
      linkText: '[ตรวจรับ 0904]'
    }
  ];

  const getLocalizedOrgName = (orgId, defaultName) => {
    if (!orgId || locale === 'zh') return defaultName;
    return ENTITIES_EN[orgId]?.name || defaultName;
  };

  const getLocalizedPersonName = (personId, defaultName) => {
    if (!personId || locale === 'zh') return defaultName;
    return PEOPLE_EN[personId]?.name || defaultName;
  };

  const getLocalizedPersonTitle = (personId, defaultTitle) => {
    if (!personId || locale === 'zh') return defaultTitle;
    if (locale === 'th') {
      const titlesTh = {
        'ENG-01': 'วิศวกรก่อสร้าง / ผู้อำนวยการโครงการ (จำลอง)',
        'ENG-02': 'วิศวกรโครงสร้าง / ผู้อำนวยการออกแบบ (จำลอง)',
        'ENG-03': 'วิศวกรระบบเครื่องกล / ผู้จัดการโครงการ (จำลอง)',
        'ENG-04': 'วิศวกรควบคุมงาน / หัวหน้างานกำกับดูแล (จำลอง)',
        'ENG-05': 'วิศวกรปฐพีกลศาสตร์ / ผู้อำนวยการฐานราก (จำลอง)'
      };
      return titlesTh[personId] || PEOPLE_EN[personId]?.title || defaultTitle;
    }
    return PEOPLE_EN[personId]?.title || defaultTitle;
  };

  const EDGE_LABELS = {
    '建设发包与投资监管': {
      en: 'Client Awarding & Investment Oversight',
      th: 'การว่าจ้างและกำกับดูแลการลงทุน'
    },
    'EPC 施工总承包 (履约推进中)': {
      en: 'EPC Prime Construction (Active)',
      th: 'ผู้รับเหมาทั่วไป EPC (กำลังดำเนินการ)'
    },
    '工程设计与数字化咨询 (已交付完成)': {
      en: 'Engineering Design & Digital BIM (Delivered)',
      th: 'การออกแบบวิศวกรรมและที่ปรึกษา BIM (ส่งมอบแล้ว)'
    },
    '全过程工程质量监理 (监督履责中)': {
      en: 'Whole-Process Engineering Supervision (Active)',
      th: 'การควบคุมงานวิศวกรรมตลอดกระบวนการ (กำลังดำเนินงาน)'
    },
    '地基与深基础工程专业分包 (已验收交付)': {
      en: 'Foundation Engineering Subcontract (Accepted & Delivered)',
      th: 'ผู้รับเหมาช่วงงานฐานรากและโครงสร้างใต้ดิน (ตรวจรับแล้ว)'
    },
    '洁净厂房机电工程专业分包 (自述施工中)': {
      en: 'Cleanroom MEP Subcontract (Self-Claimed)',
      th: 'ผู้รับเหมาช่วงงาน MEP ห้องคลีนรูม (รายงานตนเอง)'
    },
    '起重与工艺设备公开标讯 (AI候选)': {
      en: 'Crane & Process Equipment Public Tender Notice (AI Candidate)',
      th: 'ประกาศจัดซื้ออุปกรณ์ยกและกระบวนการผลิต (AI แนะนำ)'
    },
    '派驻项目总监与现场代表': {
      en: 'Appointed Site Director & Client Representative',
      th: 'แต่งตั้งผู้อำนวยการโครงการและตัวแทนหน้างาน'
    },
    '指定工程设计项目负责人': {
      en: 'Appointed Design Project Lead',
      th: 'แต่งตั้งหัวหน้าโครงการออกแบบวิศวกรรม'
    },
    '机电现场安装技术负责人 (自述)': {
      en: 'Cleanroom MEP Site Lead (Self-Claimed)',
      th: 'หัวหน้าเทคนิคการติดตั้งระบบ MEP (รายงานตนเอง)'
    },
    '总监理工程师常驻现场': {
      en: 'Chief Supervision Engineer On-Site',
      th: 'หัวหน้าวิศวกรควบคุมงานประจำไซต์งาน'
    }
  };

  const getLocalizedEdgeLabel = (label) => {
    if (!label || locale === 'zh') return label;
    if (EDGE_LABELS[label]) {
      return EDGE_LABELS[label][locale] || EDGE_LABELS[label].en;
    }
    if (label.includes('派驻') || label.includes('总监')) return locale === 'th' ? 'แต่งตั้งผู้อำนวยการโครงการ' : 'Appointed Site Director & Client Representative';
    if (label.includes('设计负责人') || label.includes('指定')) return locale === 'th' ? 'แต่งตั้งหัวหน้างานออกแบบ' : 'Appointed Design Project Lead';
    if (label.includes('常驻现场')) return locale === 'th' ? 'หัวหน้าวิศวกรควบคุมงานประจำไซต์งาน' : 'Chief Supervision Engineer On-Site';
    if (label.includes('发包与投资')) return locale === 'th' ? 'การว่าจ้างและกำกับดูแลการลงทุน' : 'Client Awarding & Investment Oversight';
    if (label.includes('总承包')) return locale === 'th' ? 'ผู้รับเหมาทั่วไป EPC' : 'EPC Prime Contractor';
    if (label.includes('设计与数字化')) return locale === 'th' ? 'การออกแบบวิศวกรรมและ BIM' : 'Architectural Design & BIM Lead';
    if (label.includes('监理')) return locale === 'th' ? 'การควบคุมงานวิศวกรรม' : 'Whole-Process Engineering Supervision';
    if (label.includes('地基')) return locale === 'th' ? 'ผู้รับเหมาช่วงงานฐานราก' : 'Foundation Engineering Subcontract';
    if (label.includes('机电') || label.includes('净化')) return locale === 'th' ? 'ผู้รับเหมาช่วงงาน MEP คลีนรูม' : 'Cleanroom MEP Subcontract';
    if (label.includes('设备')) return locale === 'th' ? 'ผู้จัดหาอุปกรณ์วิศวกรรม' : 'Specialized Equipment Supplier';
    return label;
  };

  // Normalize project ID
  const projectId = normalizeProjectId(id || 'p001');
  const project = getProjectById(projectId);
  const localizedProject = getLocalizedProject(project, locale);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const resolveTab = (p) => {
    if (p === 'participants') return 'structure';
    if (['overview', 'structure', 'timeline', 'wiki'].includes(p)) return p;
    return 'overview';
  };

  // Active Tab: 'overview' | 'structure' | 'timeline' | 'wiki'
  const [activeTab, setActiveTab] = useState(() => resolveTab(tabParam));

  useEffect(() => {
    setActiveTab(resolveTab(tabParam));
  }, [tabParam]);

  // Timeline State
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [selectedStageId, setSelectedStageId] = useState('stage-5'); // Default Construction

  // WBS Expanded nodes state
  const [expandedNodes, setExpandedNodes] = useState({
    'WBS-1': true,
    'WBS-1.1': true,
    'WBS-1.2': false,
    'WBS-1.3': true,
    'WBS-1.4': false,
    'WBS-1.5': false,
  });

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Lightbox inspection state
  const [inspectingTemplate, setInspectingTemplate] = useState(null);

  // V4 Editorial Node Card: Explicit "查看完整 Wiki" expansion state (default: collapsed)
  const [isWikiExpanded, setIsWikiExpanded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localizedProject) {
        const titleSuffix = locale === 'zh'
          ? '· Project Atlas 知识与证据档案 - 工程行业网络 (暂称)'
          : locale === 'th'
          ? '· แฟ้มความรู้และหลักฐาน Project Atlas - เครือข่ายวิศวกรรม'
          : '· Project Atlas Knowledge & Evidence Dossier - Engineering Network';
        document.title = `${localizedProject.name} ${titleSuffix}`;
      } else {
        document.title = locale === 'zh'
          ? '未找到工程项目条目 (404) · 工程行业网络 (暂称)'
          : locale === 'th'
          ? 'ไม่พบรายการโครงการ (404)'
          : 'Project Not Found (404) · Engineering Network';
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [localizedProject, locale]);

  // If project not found, render explicit 404 view
  if (!project) {
    return (
      <div className="w-full bg-surface border border-hairline rounded-2xl p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-subtle text-ink-muted border border-hairline flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {locale === 'zh' ? '未找到对应工程条目 (404)' : locale === 'th' ? 'ไม่พบรายการโครงการ (404)' : 'Project Entry Not Found (404)'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            {locale === 'zh' 
              ? `工程项目代号“${id}”不存在于当前知识库中。请检查链接或返回探索其他重点工程。`
              : locale === 'th'
              ? `ไม่พบรหัสโครงการ "${id}" ในฐานข้อมูล กรุณาตรวจสอบลิงก์หรือกลับไปสำรวจโครงการอื่น`
              : `Project identifier "${id}" does not exist in the current knowledge repository. Please check the link or return to explore other flagship projects.`}
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/projects/p001')}
            className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-accent border border-hairline"
          >
            {locale === 'zh' ? '查看示范核心项目 (DEMO P001)' : locale === 'th' ? 'ดูโครงการตัวอย่างหลัก (DEMO P001)' : 'View Demo Core Project (DEMO P001)'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-xs font-semibold text-white"
          >
            {locale === 'zh' ? '返回项目发现列表' : locale === 'th' ? 'กลับไปยังรายการโครงการ' : 'Return to Project Directory'}
          </button>
        </div>
      </div>
    );
  }

  // Participations for this project (derived from unified contract)
  const projectParticipations = getProjectParticipations(project.id);

  // Scoped project flags, footnotes, and evidence dossiers
  const isP001 = (project.id === 'DEMO-PRJ-P001' || project.code === 'P001');
  const projectFootnotes = isP001 ? (isZh ? PROJECT_DATA.footnotes : (locale === 'th' ? FOOTNOTES_TH : FOOTNOTES_EN)) : [];
  const projectEvidenceList = Object.values(PROJECT_DATA.evidenceDb).filter(evd => {
    return evd.id.includes(project.code) || projectParticipations.some(p => p.evidenceId === evd.id);
  });

  // Dynamic template IDs: parse numeric integer first to avoid 'P002' -> '002' -> 'tpl-prj-002'
  const projectIndex = parseInt(project.code ? project.code.replace(/\D/g, '') : '1', 10) || 1;
  const padNum = String(projectIndex).padStart(2, '0');
  const coverTemplateId = project.illustrationTemplateId || `tpl-prj-${padNum}`;
  const techTemplateId = `tpl-tec-${projectIndex <= 6 ? padNum : '01'}`;

  // Selected stage details
  const selectedStage = PROJECT_DATA.timelineStages.find(s => s.id === selectedStageId) || PROJECT_DATA.timelineStages[4];
  const filteredStages = PROJECT_DATA.timelineStages.filter(stage => {
    if (timelineFilter === 'all') return true;
    return stage.category === timelineFilter;
  });

  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'overview' ? {} : { tab });
  };

  const localizedSelectedStage = getLocalizedStage(selectedStage, locale);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 font-sans text-ink">
      {/* =========================================================================
          1. V4 EDITORIAL NODE CARD (Cover + Title + Relationship Chips + Wiki Expansion)
         ========================================================================= */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden space-y-4">
        {/* Top Badges & Meta */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono bg-accent/15 text-accent border border-accent/30 px-2.5 py-0.5 rounded-md font-bold">
              {project.code || 'P001'}
            </span>
            <span className="bg-surface-subtle text-ink-muted border border-hairline px-2.5 py-0.5 rounded-md font-medium">
              {dict.projectWiki.nodeCard || (locale === 'en' ? 'V4 Project Node Card' : locale === 'th' ? 'การ์ดโหนดวิศวกรรม V4' : 'V4 工程节点卡片')}
            </span>
            <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              {localizedProject.verificationScore 
                ? `${dict.projectWiki.verifiedStatus || (locale === 'en' ? 'Audit Status: ' : locale === 'th' ? 'สถานะการตรวจสอบ: ' : '核验状态：')}${localizedProject.verificationScore}` 
                : (dict.projectWiki.archived || (locale === 'en' ? 'Evidence Dossier Archived' : locale === 'th' ? 'จัดเก็บแฟ้มหลักฐานแล้ว' : '工程核验档案已归档'))}
            </span>
          </div>

          <div className="text-ink-muted text-xs font-mono">
            {locale === 'zh' ? `最后修订：${project.lastUpdated}` : locale === 'th' ? `แก้ไขล่าสุด: ${getLocalizedPeriod(project.lastUpdated)}` : `Last Updated: ${getLocalizedPeriod(project.lastUpdated)}`}
          </div>
        </div>

        {/* Project Header Title & 1-Line Identity */}
        <div className="relative z-10 space-y-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-ink leading-tight">
            {localizedProject.name}
          </h1>
          <p className="text-ink-muted text-xs sm:text-sm flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span>{localizedProject.type}</span>
            <span className="text-ink-faint">·</span>
            <span className="text-accent font-semibold">
              {dict.projectWiki.currentPhase || (locale === 'en' ? 'Current Phase: ' : locale === 'th' ? 'ขั้นตอนปัจจุบัน: ' : '当前阶段：')}
              {localizedProject.currentPhase}
            </span>
          </p>
        </div>

        {/* Hero Visual: Cover Graphic */}
        <div className="relative z-10 pt-0.5">
          <EngineeringIllustration
            templateId={coverTemplateId}
            showBadge={true}
            showMetaBar={true}
            onInspect={(tpl) => setInspectingTemplate(tpl)}
            className="shadow-xs cursor-pointer rounded-xl overflow-hidden"
          />
        </div>

        {/* 2-3 Core Relationship Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs relative z-10">
          <span className="text-ink-muted font-medium">
            {dict.projectWiki.coreRelations || (locale === 'en' ? 'Core Relationships:' : locale === 'th' ? 'ความสัมพันธ์หลัก:' : '核心关联关系：')}
          </span>
          <button
            type="button"
            onClick={() => onSelectOrg ? onSelectOrg(project.clientOrgId || 'ORG-A') : navigate(`/companies/${(project.clientOrgId || 'org-a').toLowerCase()}`)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink border border-hairline font-medium transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-accent" />
            <span>
              {dict.projectWiki.clientOrg || (locale === 'en' ? 'Client Org: ' : locale === 'th' ? 'ผู้ว่าจ้าง: ' : '建设单位：')}
              {project.clientOrgName || (isZh ? '华东智能建造投资集团' : 'East China Smart Construction Group')}
            </span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle text-ink border border-hairline font-medium">
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>
              {dict.projectWiki.activeWbs || (locale === 'en' ? 'Active Work Packages: 5 WBS Units' : locale === 'th' ? 'สัญญาที่กำลังดำเนินการ: 5 แพ็กเกจ WBS' : '活跃工作包：5 个 WBS 分解单元')}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle text-ink border border-hairline font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            <span>
              {dict.projectWiki.totalEvidence || (locale === 'en' ? 'Total Evidence: 16 Mock Verified Dossiers' : locale === 'th' ? 'หลักฐานทั้งหมด: 16 แฟ้มตรวจสอบจำลอง' : '全量存证：16 条模拟核验档案')}
            </span>
          </span>
        </div>

        {/* Explicit Disclosure Toggle: "查看完整 Wiki" */}
        <div className="pt-2 border-t border-hairline relative z-10">
          <button
            type="button"
            onClick={() => setIsWikiExpanded(!isWikiExpanded)}
            className="w-full py-2 px-3 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-hairline text-xs font-semibold text-ink flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-accent" />
              <span>
                {isWikiExpanded 
                  ? (dict.projectWiki.collapseFullWiki || (locale === 'en' ? 'Collapse Full Wiki Dossier ▴' : locale === 'th' ? 'ย่อสารานุกรม ▴' : '收起完整 Wiki 参数档案 ▴'))
                  : (dict.projectWiki.viewFullWiki || (locale === 'en' ? 'View Full Wiki (OBS / Cycle / Investment) ▾' : locale === 'th' ? 'ดูสารานุกรมฉบับเต็ม (OBS / วงจร / การลงทุน) ▾' : '查看完整 Wiki (OBS 参建主体 / 周期 / 投资体量) ▾'))}
              </span>
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isWikiExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Collapsible Deep Reference Data (OBS/WBS/Cycle/Investment) */}
          {isWikiExpanded && (
            <div className="pt-3 space-y-3 animate-fadeIn">
              {/* Quick Metrics Bar: 4 Core Parameters */}
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="bg-surface-subtle border border-hairline rounded-xl p-2.5 sm:p-3 min-w-0">
                  <span className="text-[10px] text-ink-muted block truncate">
                    {locale === 'en' ? 'Planned Construction Cycle' : locale === 'th' ? 'วงจรก่อสร้างตามแผน' : '规划建设总周期'}
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-ink font-mono mt-0.5 break-words leading-snug">
                    {localizedProject.plannedCycle || (isZh ? '规划建设期中' : 'In Planning & Construction')}
                  </div>
                </div>
                <div className="bg-surface-subtle border border-hairline rounded-xl p-2.5 sm:p-3 min-w-0">
                  <span className="text-[10px] text-ink-muted block truncate">
                    {locale === 'en' ? 'General Contractor Progress' : locale === 'th' ? 'ความคืบหน้าผู้รับเหมาหลัก' : '总包履约进度'}
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-accent font-mono mt-0.5 break-words leading-snug">
                    {localizedProject.status || (isZh ? '在建履约中' : 'Under Active Construction')}
                  </div>
                </div>
                <div className="bg-surface-subtle border border-hairline rounded-xl p-2.5 sm:p-3 min-w-0">
                  <span className="text-[10px] text-ink-muted block truncate">
                    {locale === 'en' ? 'Participating Entities (OBS)' : locale === 'th' ? 'หน่วยงานร่วม (OBS)' : '核心参建机构 (OBS)'}
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-400 font-mono mt-0.5 break-words leading-snug">
                    {projectParticipations.length > 0 
                      ? (locale === 'en' ? `${projectParticipations.length} Entities` : locale === 'th' ? `${projectParticipations.length} หน่วยงาน` : `${projectParticipations.length} 家参与`)
                      : (isZh ? '参建联合体' : 'Consortium')}
                  </div>
                </div>
                <div className="bg-surface-subtle border border-hairline rounded-xl p-2.5 sm:p-3 min-w-0">
                  <span className="text-[10px] text-ink-muted block truncate">
                    {locale === 'en' ? 'Investment & Floor Area' : locale === 'th' ? 'ขนาดการลงทุนและอาคาร' : '投资与建筑体量'}
                  </span>
                  <div className="text-xs sm:text-sm font-bold text-amber-600 font-mono mt-0.5 break-words leading-snug">
                    {localizedProject.investmentScale || (isZh ? '多标段总投' : 'Multi-Package')} · {localizedProject.grossFloorArea || (isZh ? '规模化体量' : 'Large-Scale Facility')}
                  </div>
                </div>
              </div>

              {/* Participating Entities Quick Bar (OBS Links: Project ↔ Company ↔ Engineer) */}
              <div className="pt-2 border-t border-hairline flex flex-wrap items-center gap-2 text-xs">
                <span className="text-ink-muted font-medium">
                  {locale === 'en' ? 'Contracting Units:' : locale === 'th' ? 'หน่วยงานที่ร่วมดำเนินงาน:' : '参建履约单位：'}
                </span>
                {projectParticipations.slice(0, 5).map((part, idx) => (
                  <React.Fragment key={idx}>
                    {part.orgId && (
                      <button
                        type="button"
                        onClick={() => onSelectOrg ? onSelectOrg(part.orgId) : navigate(`/companies/${part.orgId.toLowerCase()}`)}
                        className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-hover text-ink border border-hairline font-medium transition-colors"
                      >
                        {(dict.roles?.[part.role] || part.role)} {getLocalizedOrgName(part.orgId, part.orgName)}
                      </button>
                    )}
                    {part.personId && (
                      <button
                        type="button"
                        onClick={() => onSelectEngineer ? onSelectEngineer(part.personId) : navigate(`/people/${part.personId.toLowerCase()}`)}
                        className="px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 font-medium transition-colors"
                      >
                        {getLocalizedPersonTitle(part.personId, part.personTitle)} {getLocalizedPersonName(part.personId, part.personName)}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. NAVIGATION TABS (Overview, Timeline, Structure, Wiki & Evidence)
         ========================================================================= */}
      <div className="bg-surface border border-hairline rounded-xl p-1 sm:p-1.5 shadow-sm">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {[
            { id: 'overview', short: locale === 'en' ? 'Feed' : locale === 'th' ? 'ฟีด' : '动态', label: locale === 'en' ? '1. Field Feed & Board' : locale === 'th' ? '1. ฟีดหน้างานและกระดาน' : '1. 动态与看板' },
            { id: 'structure', short: locale === 'en' ? 'OBS/WBS' : locale === 'th' ? 'โครงสร้าง' : '参与方', label: locale === 'en' ? '2. Parties & WBS Breakdown' : locale === 'th' ? '2. ผู้ร่วมและโครงสร้าง WBS' : '2. 参与方与分解' },
            { id: 'timeline', short: locale === 'en' ? 'Timeline' : locale === 'th' ? 'เส้นเวลา' : '时间轴', label: locale === 'en' ? '3. Lifecycle Timeline' : locale === 'th' ? '3. เส้นเวลาตลอดวงจร' : '3. 演进时间轴' },
            { id: 'wiki', short: locale === 'en' ? 'Wiki' : locale === 'th' ? 'วิกิ' : '百科与证据', label: locale === 'en' ? '4. Wiki & Evidence Archive' : locale === 'th' ? '4. สารานุกรมและหลักฐาน' : '4. 百科与全量证据' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`py-2 px-1 sm:px-2 rounded-lg text-center transition-all text-xs font-bold ${
                  isActive
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                }`}
              >
                <span className="md:hidden text-[11px] truncate block">{tab.short}</span>
                <span className="hidden md:inline truncate block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: OVERVIEW & RECENT DYNAMICS
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Recent Milestones & Activities */}
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                <Milestone className="w-4 h-4 text-emerald-400" />
                <span>
                  {dict.projectWiki.recentUpdates || (locale === 'en' ? 'Recent Field Dispatches & Key Milestones' : locale === 'th' ? 'ความคืบหน้าหน้างานล่าสุดและเหตุการณ์สำคัญ' : '工程最新动态与关键里程碑')}
                </span>
              </h2>
              <span className="text-xs text-ink-muted font-mono">
                {isP001 
                  ? (locale === 'en' ? `${PROJECT_DATA.recentUpdates.length} Verified Chronicles` : locale === 'th' ? `${PROJECT_DATA.recentUpdates.length} บันทึกการตรวจสอบ` : `${PROJECT_DATA.recentUpdates.length} 条核验纪事`)
                  : (locale === 'en' ? '1 Phase Milestone' : locale === 'th' ? '1 หลักหมุดตามขั้นตอน' : '1 条阶段核验')}
              </span>
            </div>

            {isP001 ? (
              <div className="space-y-3">
                {PROJECT_DATA.recentUpdates.map((update, idx) => {
                  const locUpdate = getLocalizedUpdate(update, idx, locale);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {locUpdate.title}
                        </span>
                        <span className="font-mono text-ink-faint">{update.date}</span>
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {locUpdate.summary}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-ink-muted">
                          {locale === 'zh'
                            ? `核验状态：${update.verified ? '已三方双向存证' : 'AI 候选抓取'}`
                            : locale === 'th'
                            ? `สถานะการตรวจสอบ: ${update.verified ? 'ยืนยันแบบสามฝ่ายสองทาง' : 'ข้อเสนอแนะ AI'}`
                            : `Audit Status: ${update.verified ? 'Tri-Party Dual Confirmed' : 'AI Candidate Ingestion'}`}
                        </span>
                        {update.refId && onSelectEvidence && (
                          <button
                            type="button"
                            onClick={() => onSelectEvidence(update.refId)}
                            className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-semibold hover:bg-emerald-900 transition-colors"
                          >
                            {locale === 'en' ? `Evidence Voucher ${update.refId}` : locale === 'th' ? `หลักฐานยืนยัน ${update.refId}` : `核验凭证 ${update.refId}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {localizedProject.name} · {localizedProject.currentPhase}
                  </span>
                  <span className="font-mono text-ink-faint">{getLocalizedPeriod(project.lastUpdated) || '2026-10-25'}</span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {localizedProject.summary}
                </p>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-ink-muted">
                    {locale === 'en' 
                      ? `Audit Status: ${localizedProject.verificationScore || 'Project Approved'}`
                      : locale === 'th'
                      ? `สถานะการตรวจสอบ: ${localizedProject.verificationScore || 'อนุมัติโครงการแล้ว'}`
                      : `核验状态：${project.verificationScore || '已立项核验'}`}
                  </span>
                  {project.evidenceId && onSelectEvidence && (
                    <button
                      type="button"
                      onClick={() => onSelectEvidence(project.evidenceId)}
                      className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-semibold hover:bg-emerald-900 transition-colors"
                    >
                      {locale === 'en' ? `Evidence Voucher ${project.evidenceId}` : locale === 'th' ? `หลักฐานยืนยัน ${project.evidenceId}` : `核验凭证 ${project.evidenceId}`}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Key Participating Orgs & Work Packages Grid */}
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>
                {dict.projectWiki.wbsObsTitle || (locale === 'en' ? 'Bidding Disciplines & Contracting Responsibility Matrix' : locale === 'th' ? 'สัญญาประกวดราคาและเมทริกซ์ความรับผิดชอบ' : '标段划分与参建企业责任矩阵')}
              </span>
            </h2>

            {isP001 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PROJECT_DATA.disciplinesAndBids.map((bid, i) => {
                  const locBid = getLocalizedBid(bid, locale);
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-surface-subtle border border-hairline flex items-start justify-between gap-3 hover:border-sky-500/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="font-mono text-[10px] text-sky-700 dark:text-sky-400 font-semibold">{bid.code}</div>
                        <div className="font-bold text-xs sm:text-sm text-ink break-words leading-snug">{locBid.name}</div>
                        <button
                          type="button"
                          onClick={() => onSelectOrg ? onSelectOrg(bid.orgId) : navigate(`/companies/${bid.orgId.toLowerCase()}`)}
                          className="text-xs text-ink-muted hover:text-accent flex items-center gap-1"
                        >
                          <span>{dict.projectWiki.contractor || (locale === 'en' ? 'Contractor: ' : locale === 'th' ? 'ผู้รับสัญญา: ' : '承担方：')}{bid.org}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-surface-subtle text-ink-muted border border-hairline font-mono">
                        {locBid.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectParticipations.map(part => (
                  <div
                    key={part.id}
                    className="p-3.5 rounded-xl bg-surface-subtle border border-hairline flex items-start justify-between gap-3 hover:border-sky-500/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="font-mono text-[10px] text-sky-700 dark:text-sky-400 font-semibold">{part.workPackageId}</div>
                      <div className="font-bold text-xs sm:text-sm text-ink break-words leading-snug">{getLocalizedWorkPackage(part.workPackageName)}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        {part.orgId && (
                          <button
                            type="button"
                            onClick={() => onSelectOrg ? onSelectOrg(part.orgId) : navigate(`/companies/${part.orgId.toLowerCase()}`)}
                            className="text-xs text-ink-muted hover:text-sky-700 dark:hover:text-sky-400 flex items-center gap-1"
                          >
                            <span>{dict.projectWiki.contractor || (locale === 'en' ? 'Contractor: ' : locale === 'th' ? 'ผู้รับสัญญา: ' : '承担方：')}{getLocalizedOrgName(part.orgId, part.orgName)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {part.personId && (
                          <button
                            type="button"
                            onClick={() => onSelectEngineer ? onSelectEngineer(part.personId) : navigate(`/people/${part.personId.toLowerCase()}`)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <span>({getLocalizedPersonName(part.personId, part.personName)})</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <VerificationBadge level={part.verificationLevel} size="xs" showIcon={false} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Technical Illustration Schematics Section */}
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                {dict.projectWiki.illustrationsTitle || (locale === 'en' ? 'Associated Engineering Construction Method Schematics' : locale === 'th' ? 'แผนผังและภาพจำลองวิธีปฏิบัติการทางวิศวกรรม' : '关联工程技术工法图解')}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <EngineeringIllustration
                  templateId={coverTemplateId}
                  showBadge={true}
                  showMetaBar={true}
                  onInspect={(tpl) => setInspectingTemplate(tpl)}
                  className="cursor-pointer shadow-md"
                />
                <p className="text-xs text-ink-muted mt-2 font-mono">
                  {localizedProject.name} {locale === 'en' ? 'General Scheme & Elevation Diagram' : locale === 'th' ? 'แผนผังโครงการและรูปตัดระนาบ' : '总体工程方案与立面图解'} ({project.code})
                </p>
              </div>
              <div>
                <EngineeringIllustration
                  templateId={techTemplateId}
                  showBadge={true}
                  showMetaBar={true}
                  onInspect={(tpl) => setInspectingTemplate(tpl)}
                  className="cursor-pointer shadow-md"
                />
                <p className="text-xs text-ink-muted mt-2 font-mono">
                  {locale === 'en' ? 'Core Construction Method 3D Structural Node & Stress Simulation' : locale === 'th' ? 'การจำลองโครงสร้างสามมิติและแรงเค้นข้อต่อ' : '核心技术工法三维深化节点剖透与受力分析'} ({techTemplateId})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: TIMELINE (APPROACH A INTERACTIVE TIMELINE)
         ========================================================================= */}
      {activeTab === 'timeline' && (
        <div className="space-y-5 animate-fadeIn">
          {isP001 ? (
            <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hairline">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>
                      {locale === 'en' ? '8 Lifecycle Construction Evolution Stages' : locale === 'th' ? '8 ขั้นตอนการก่อสร้างตลอดวงจรชีวิต' : '8 大全生命周期施工演进阶段'}
                    </span>
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {locale === 'en' ? 'Baseline schedule vs. actual progress variance analysis' : locale === 'th' ? 'การเปรียบเทียบตามแผนงานหลักกับผลงานจริง' : '基准工期与实际履约偏差比对分析'}
                  </p>
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-1.5 text-xs">
                  {['all', 'historical', 'current', 'future'].map(f => (
                    <button
                      key={f}
                      onClick={() => setTimelineFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        timelineFilter === f
                          ? 'bg-accent text-white font-semibold'
                          : 'bg-surface-subtle text-ink-muted hover:text-ink hover:bg-surface-hover border border-hairline'
                      }`}
                    >
                      {f === 'all' && (locale === 'en' ? 'All Stages' : locale === 'th' ? 'ทุกขั้นตอน' : '全部阶段')}
                      {f === 'historical' && (locale === 'en' ? 'Completed' : locale === 'th' ? 'เสร็จสิ้นแล้ว' : '历史已完工')}
                      {f === 'current' && (locale === 'en' ? 'In Progress' : locale === 'th' ? 'กำลังดำเนินการ' : '当前建造中')}
                      {f === 'future' && (locale === 'en' ? 'Future Planned' : locale === 'th' ? 'แผนงานในอนาคต' : '未来规划')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stages Stepper / Timeline Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {filteredStages.map((stage) => {
                  const locStage = getLocalizedStage(stage, locale);
                  const isSelected = stage.id === selectedStageId;
                  const isCompleted = stage.status === 'COMPLETED';
                  const isCurrent = stage.status === 'IN_PROGRESS';

                  return (
                    <button
                      key={stage.id}
                      onClick={() => setSelectedStageId(stage.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-surface-subtle border-hairline hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-ink-muted">
                          {stage.category === 'historical' 
                            ? (locale === 'en' ? 'Completed' : locale === 'th' ? 'เสร็จสิ้น' : '已完成')
                            : stage.category === 'current' 
                            ? (locale === 'en' ? 'In Progress' : locale === 'th' ? 'กำลังทำ' : '进行中')
                            : (locale === 'en' ? 'Planned' : locale === 'th' ? 'ตามแผน' : '未开始')}
                        </span>
                        {isCompleted && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {isCurrent && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
                      </div>
                      <div className="font-bold text-xs text-ink mt-1 truncate">
                        {locStage.name}
                      </div>
                      <div className="text-[10px] text-ink-faint font-mono mt-0.5 truncate">
                        {getLocalizedPeriod(stage.plannedTime)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Detailed Selected Stage Inspection Card */}
              {selectedStage && (
                <div className="p-4 sm:p-5 rounded-xl bg-surface-subtle border border-hairline space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-hairline">
                    <div className="space-y-0.5">
                      <span className="text-xs font-mono text-emerald-400 font-semibold">STAGE DETAIL · {selectedStage.id}</span>
                      <h3 className="text-base font-bold text-ink">{localizedSelectedStage.name} ({selectedStage.englishName})</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
                      selectedStage.variance.includes('提前') || selectedStage.variance.includes('Ahead')
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                        : 'bg-slate-800 text-ink-muted'
                    }`}>
                      {locale === 'en' ? 'Variance: ' : locale === 'th' ? 'ความคลาดเคลื่อน: ' : '工期偏差: '}
                      {localizedSelectedStage.variance}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-ink-muted block mb-0.5">
                        {locale === 'en' ? 'Planned Period:' : locale === 'th' ? 'ช่วงเวลาตามแผน:' : '计划时段：'}
                      </span>
                      <span className="text-ink font-mono">{getLocalizedPeriod(selectedStage.plannedTime)}</span>
                    </div>
                    <div>
                      <span className="text-ink-muted block mb-0.5">
                        {locale === 'en' ? 'Actual Period:' : locale === 'th' ? 'ช่วงเวลาจริง:' : '实际时段：'}
                      </span>
                      <span className="text-ink font-mono">{getLocalizedPeriod(selectedStage.actualTime)}</span>
                    </div>
                  </div>

                  {/* Milestone Evidence Link */}
                  {selectedStage.evidenceId && onSelectEvidence && (
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onSelectEvidence(selectedStage.evidenceId)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-mono text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {locale === 'en' ? `View Archived Dossier (${selectedStage.evidenceId})` : locale === 'th' ? `ดูหลักฐานที่จัดเก็บ (${selectedStage.evidenceId})` : `查看该阶段归档存证 (${selectedStage.evidenceId})`}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-surface border border-hairline rounded-2xl p-6 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-hairline">
                <div className="space-y-1">
                  <span className="font-mono text-emerald-400 text-xs font-semibold">
                    {project.code} {locale === 'en' ? 'Milestones & Construction Progress' : locale === 'th' ? 'หลักหมุดการก่อสร้างและความคืบหน้า' : '建设里程碑与阶段进度'}
                  </span>
                  <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>
                      {localizedProject.name} · {locale === 'en' ? 'Lifecycle Progress Overview' : locale === 'th' ? 'ภาพรวมความคืบหน้าตลอดวงจร' : '全周期进度概览'}
                    </span>
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                  {localizedProject.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-1">
                  <span className="text-ink-muted block text-[11px]">
                    {locale === 'en' ? 'Current Phase' : locale === 'th' ? 'ขั้นตอนปัจจุบัน' : '当前工程阶段'}
                  </span>
                  <span className="text-emerald-400 font-bold text-sm block">{localizedProject.currentPhase}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-1">
                  <span className="text-ink-muted block text-[11px]">
                    {locale === 'en' ? 'Planned Cycle' : locale === 'th' ? 'วงจรก่อสร้างตามแผน' : '规划建设总周期'}
                  </span>
                  <span className="text-ink font-mono text-sm block">{localizedProject.plannedCycle}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-1">
                  <span className="text-ink-muted block text-[11px]">
                    {locale === 'en' ? 'Investment & Scale' : locale === 'th' ? 'ขนาดการลงทุน' : '投资体量与规模'}
                  </span>
                  <span className="text-amber-300 font-mono text-sm block">{localizedProject.investmentScale}</span>
                </div>
              </div>
              <div className="p-4 bg-surface-subtle border border-hairline rounded-xl text-xs text-ink-muted space-y-2">
                <p className="leading-relaxed">
                  <strong>{locale === 'en' ? 'Phase Implementation Outline: ' : locale === 'th' ? 'สาระสำคัญของแผน: ' : '阶段实施纲要：'}</strong>
                  {localizedProject.summary}
                </p>
                <p className="text-ink-faint text-[11px] font-mono">
                  {locale === 'en' 
                    ? 'Note: DEMO P001 includes exemplary 8-stage lifecycle schedule variance charts. Detailed Gantt charts for other projects will unfold dynamically after official site coordination meetings and verified filings.'
                    : locale === 'th'
                    ? 'หมายเหตุ: DEMO P001 มีผังคานท์แสดงความแปรปรวน 8 ขั้นตอนตัวอย่าง โครงการอื่นๆ จะแสดงเพิ่มเติมหลังการประชุมประสานงาน'
                    : '提示：DEMO P001 收录了示范性 8 大全生命周期履约偏差甘特图；非 P001 项目细部阶段甘特图待后续工程例会与实测归档后动态展开。'}
                </p>
              </div>
              {project.evidenceId && onSelectEvidence && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectEvidence(project.evidenceId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-mono text-xs font-semibold flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {locale === 'en' ? `View Initial Stage Dossier (${project.evidenceId})` : locale === 'th' ? `ดูหลักฐานเริ่มต้น (${project.evidenceId})` : `查看该工程初始阶段存证 (${project.evidenceId})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: WBS STRUCTURE
         ========================================================================= */}
      {activeTab === 'structure' && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>
                    {locale === 'en' ? 'WBS Core Packages & Discipline Breakdown Tree' : locale === 'th' ? 'ผังโครงสร้างงาน WBS และสัญญางานเฉพาะทาง' : 'WBS 核心工程包与专业分部工程树'}
                  </span>
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  {locale === 'en' ? 'Bid packages, general contracting and subcontracting accountability' : locale === 'th' ? 'การจัดแบ่งสัญญา ความรับผิดชอบของผู้รับเหมาหลักและผู้รับเหมาช่วง' : '标段划分、施工总承包与分包权责归属'}
                </p>
              </div>
            </div>

            {/* WBS Root Card */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-surface-subtle border border-hairline space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                      WBS-1
                    </span>
                    <span className="font-bold text-sm text-ink">{localizedProject.name}</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{localizedProject.status || (isZh ? '履约中' : 'Active')}</span>
                </div>
                <p className="text-xs text-ink-muted">
                  {locale === 'en' 
                    ? `Client: ${project.clientOrgName || 'Demo Organization A'} · Contains ${projectParticipations.length} Core Secondary Packages`
                    : locale === 'th'
                    ? `ผู้ว่าจ้าง: ${project.clientOrgName || 'Demo Organization A'} · รวม ${projectParticipations.length} แพ็กเกจรอง`
                    : `建设单位：${project.clientOrgName || 'Demo Organization A'} · 包含 ${projectParticipations.length} 个核心二级工程包`}
                </p>
              </div>

              {/* Secondary Packages (Derived from Verified projectParticipations) */}
              {projectParticipations.map(part => {
                return (
                  <div
                    key={part.id}
                    className="ml-2 sm:ml-6 p-3.5 rounded-xl bg-surface-subtle border border-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-sky-700 dark:text-sky-400 font-semibold">{part.workPackageId}</span>
                        <span className="font-bold text-xs sm:text-sm text-ink break-words">
                          {getLocalizedWorkPackage(part.workPackageName)}
                        </span>
                      </div>
                      <div className="text-xs text-ink-muted flex items-center gap-2">
                        <span>{locale === 'en' ? 'Accountability:' : locale === 'th' ? 'ผู้รับผิดชอบ:' : '责任主体：'}</span>
                        {part.orgId && (
                          <button
                            type="button"
                            onClick={() => onSelectOrg ? onSelectOrg(part.orgId) : navigate(`/companies/${part.orgId.toLowerCase()}`)}
                            className="text-sky-700 dark:text-sky-400 hover:underline font-medium"
                          >
                            {getLocalizedOrgName(part.orgId, part.orgName || part.orgId)}
                          </button>
                        )}
                        {part.personId && (
                          <button
                            type="button"
                            onClick={() => onSelectEngineer ? onSelectEngineer(part.personId) : navigate(`/people/${part.personId.toLowerCase()}`)}
                            className="text-emerald-300 hover:underline font-medium"
                          >
                            {getLocalizedPersonName(part.personId, part.personName || part.personId)}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-ink-muted px-2 py-0.5 rounded bg-surface-subtle border border-hairline">
                        {getLocalizedPeriod(part.period)}
                      </span>
                      {part.evidenceId && onSelectEvidence && (
                        <button
                          type="button"
                          data-evidence-id={part.evidenceId}
                          onClick={() => onSelectEvidence(part.evidenceId)}
                          className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-mono font-semibold hover:bg-emerald-900 transition-colors"
                        >
                          {part.evidenceId}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: WIKI & ALL EVIDENCE DOSSIERS (PROJECT ATLAS KNOWLEDGE MODULE)
         ========================================================================= */}
      {activeTab === 'wiki' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Deep Wiki Container in Approach A's dark theme */}
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-7 shadow-xl space-y-6 leading-relaxed">
            {/* Header / Module Attribution Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-hairline gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                    {locale === 'en' ? 'Project Atlas Module' : locale === 'th' ? 'โมดูล Project Atlas' : 'Project Atlas 功能模块'}
                  </span>
                  <span className="text-xs text-ink-muted font-mono">
                    {locale === 'en' 
                      ? `Engineering Knowledge & Evidence Dossier · Entry ${project.code}`
                      : locale === 'th'
                      ? `แฟ้มความรู้และหลักฐานทางวิศวกรรม · รหัส ${project.code}`
                      : `工程知识与证据档案 · 词条编号 ${project.code}`}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-ink flex items-center gap-2 mt-1">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <span>
                    {localizedProject.name} · {locale === 'en' ? 'Technical Chronicle & Verifiable Dossier Archive' : locale === 'th' ? 'บันทึกทางเทคนิคและหลักฐานที่ตรวจสอบได้' : '全景技术纪事与链上证据档案'}
                  </span>
                </h2>
              </div>
              <span className="text-xs font-mono text-ink-muted self-start sm:self-center">
                [{locale === 'en' ? 'Version' : locale === 'th' ? 'เวอร์ชัน' : '版本'} {isP001 ? PROJECT_DATA.revisionHistory[0].version : 'v1.0'}]
              </span>
            </div>

            {/* Section 1: Encyclopedic Narrative */}
            <section className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-emerald-400 pl-2.5">
                <span>
                  {dict.projectWiki.specifications || (locale === 'en' ? '1. Project Overview & Core Technical Specifications' : locale === 'th' ? '1. ภาพรวมโครงการและข้อกำหนดทางเทคนิค' : '1. 工程概况与核心技术规范')}
                </span>
              </h3>
              <div className="text-xs sm:text-sm text-ink-muted space-y-3">
                {locale === 'zh' ? (
                  <>
                    <p>
                      <strong className="text-ink">{project.name}</strong>（项目编号：<code>{project.code}</code>；规范工程代码：<code>{project.id}</code>），
                      坐落于{project.location}，为重点示范性工程。
                      本工程由建设单位<strong className="text-ink">{project.clientOrgName || '华东智能建造投资集团'}</strong>发起发包，
                      规划总投资规模为<strong className="text-ink">{project.investmentScale}</strong>，总建筑体量约<strong className="text-ink">{project.grossFloorArea}</strong>，
                      当前实施阶段处于<strong className="text-ink">{project.currentPhase}</strong>。
                    </p>
                    <p>
                      {project.summary}
                    </p>
                    {isP001 ? (
                      <>
                        <p>
                          在主体钢结构工程实施过程中，总承包单位 Demo Organization B 连同监理单位 Demo Organization G 成功开展了大跨度钢网架第 4 单元的高空液压同步顶升作业（680t 空间桁架提升至 28.5m 标高），轴线偏差受控在 2mm 以内，全截面焊缝探伤合格率达到 100%。
                        </p>
                        <p>
                          针对超洁净高科技产业生产环境，微电子洁净车间采用华夫板现浇混凝土楼盖体系，经结构与机电团队联合仿真优化，实现纳级微振动控制（达 VC-D 标准），同时完成动力机电管线全三维综合管线排布，实现管线零碰撞进场。
                        </p>
                      </>
                    ) : (
                      <p>
                        本工程条目收录于 Project Atlas 原型系统。参建主体职责、标段划分与里程碑记录均按演示模型进行结构化组织展示。
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p>
                      <strong className="text-ink">{localizedProject.name}</strong> (Project Code: <code>{project.code}</code>; Canonical ID: <code>{project.id}</code>), 
                      located at {localizedProject.location}, is an exemplary demonstration facility. 
                      Sponsored by client <strong className="text-ink">{project.clientOrgName || 'East China Smart Construction Group'}</strong>, 
                      the total planned capital expenditure is <strong className="text-ink">{localizedProject.investmentScale}</strong> with a total floor area of <strong className="text-ink">{localizedProject.grossFloorArea}</strong>. 
                      Current progress is in the <strong className="text-ink">{localizedProject.currentPhase}</strong>.
                    </p>
                    <p>
                      {localizedProject.summary}
                    </p>
                    {isP001 ? (
                      <>
                        <p>
                          During superstructure steel construction, EPC general contractor Demo Organization B and supervising engineer Demo Organization G executed the high-altitude hydraulic synchronized lift of Unit 4 space truss (680t spatial truss elevated to +28.5m), keeping axial deviation within 2mm with a 100% non-destructive weld testing pass rate.
                        </p>
                        <p>
                          Tailored for ultra-clean industrial environments, the facility incorporates waffle-slab cast-in-place concrete flooring, engineered to control micro-vibrations to VC-D specifications, combined with full 3D MEP clash coordination to ensure zero-collision spatial installation.
                        </p>
                      </>
                    ) : (
                      <p>
                        {locale === 'th'
                          ? 'รายการโครงการนี้รวบรวมในระบบต้นแบบ Project Atlas ขอบเขตงานและบันทึกเหตุการณ์จัดโครงสร้างเพื่อการสาธิต'
                          : 'This project entry is structured in the Project Atlas engineering knowledge prototype. Participating entity roles, work package scopes, and milestone records are organized for demonstration purposes.'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Section 2: Full Lifecycle Chronicle & Timeline Table (Original Scheme B Preservation) */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-emerald-400 pl-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>
                      {dict.projectWiki.chronicleTimeline || (locale === 'en' ? '2. Engineering Chronicle & Timeline Comparison' : locale === 'th' ? '2. บันทึกเหตุการณ์และเส้นเวลาตลอดวงจร' : '2. 工程全生命周期纪事年表与计划/实际对比 (Chronicle & Timeline)')}
                    </span>
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {locale === 'en' 
                      ? 'Planning → Survey & Design → Bidding → Procurement → Superstructure → Commissioning → Handover'
                      : locale === 'th'
                      ? 'การวางแผน → สำรวจและออกแบบ → ประมูล → จัดซื้อ → โครงสร้างหลัก → ทดสอบระบบ → ส่งมอบ'
                      : '立项规划 → 勘察设计 → 招投标 → 基础采购 → 主体施工 → 联调验收 → 运营前瞻'}
                  </p>
                </div>
                {isP001 && (
                  <span className="text-xs font-mono text-emerald-400 font-semibold self-start sm:self-center">
                    {locale === 'en' ? '8 Lifecycle Evolution Stages' : locale === 'th' ? '8 ขั้นตอนตลอดวงจรชีวิต' : '全周期 8 大演进阶段'}
                  </span>
                )}
              </div>

              {isP001 ? (
                <div className="w-full max-w-full min-w-0 overflow-x-auto border border-hairline rounded-xl bg-surface-subtle">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle text-ink-muted border-b border-hairline font-semibold font-mono">
                        <th className="p-2.5 border-r border-hairline w-12 text-center">{locale === 'en' ? 'No.' : locale === 'th' ? 'ลำดับ' : '序号'}</th>
                        <th className="p-2.5 border-r border-hairline w-32">{locale === 'en' ? 'Stage Name' : locale === 'th' ? 'ชื่อขั้นตอน' : '阶段名称'}</th>
                        <th className="p-2.5 border-r border-hairline w-36">{locale === 'en' ? 'Planned Timeline' : locale === 'th' ? 'แผนงาน (Planned)' : '计划时序 (Planned)'}</th>
                        <th className="p-2.5 border-r border-hairline w-36">{locale === 'en' ? 'Actual Timeline' : locale === 'th' ? 'ผลงานจริง (Actual)' : '实际时序 (Actual)'}</th>
                        <th className="p-2.5 border-r border-hairline">{locale === 'en' ? 'Milestones & Implementation Summary' : locale === 'th' ? 'เหตุการณ์สำคัญและสรุปการดำเนินงาน' : '里程碑与实施纪事摘要'}</th>
                        <th className="p-2.5 w-24 text-right">{locale === 'en' ? 'Evidence' : locale === 'th' ? 'หลักฐาน' : '核验证据'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {PROJECT_DATA.timelineStages.map((stage, idx) => {
                        const locStage = getLocalizedStage(stage, locale);
                        const isCurrent = stage.status === 'IN_PROGRESS';
                        return (
                          <tr key={stage.id} className={`hover:bg-surface-hover transition-colors ${isCurrent ? 'bg-amber-950/20' : ''}`}>
                            <td className="p-2.5 text-center font-mono text-ink-faint border-r border-hairline">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 border-r border-hairline font-bold text-ink">
                              {locStage.name}
                              {isCurrent && (
                                <span className="block text-[10px] text-amber-400 font-mono font-normal">
                                  {locale === 'en' ? '[In Progress]' : locale === 'th' ? '[กำลังทำ]' : '[当前实施中]'}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 border-r border-hairline font-mono text-ink-muted">
                              {getLocalizedPeriod(stage.plannedTime)}
                            </td>
                            <td className="p-2.5 border-r border-hairline font-mono text-emerald-400">
                              {getLocalizedPeriod(stage.actualTime)}
                            </td>
                            <td className="p-2.5 border-r border-hairline text-ink-muted leading-relaxed">
                              {locStage.milestone}
                            </td>
                            <td className="p-2.5 text-right font-mono">
                              {stage.evidenceId && onSelectEvidence && (
                                <button
                                  type="button"
                                  data-evidence-id={stage.evidenceId}
                                  onClick={() => onSelectEvidence(stage.evidenceId)}
                                  className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold hover:bg-emerald-900 transition-colors whitespace-nowrap"
                                >
                                  {locale === 'en' ? 'Inspect →' : locale === 'th' ? 'ตรวจสอบ →' : '核查凭据 →'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="w-full max-w-full min-w-0 overflow-x-auto border border-hairline rounded-xl bg-surface-subtle">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-subtle text-ink-muted border-b border-hairline font-semibold font-mono">
                        <th className="p-2.5 border-r border-hairline w-12 text-center">{locale === 'en' ? 'No.' : locale === 'th' ? 'ลำดับ' : '序号'}</th>
                        <th className="p-2.5 border-r border-hairline w-36">{locale === 'en' ? 'Current Phase' : locale === 'th' ? 'ขั้นตอนปัจจุบัน' : '当前工程阶段'}</th>
                        <th className="p-2.5 border-r border-hairline w-40">{locale === 'en' ? 'Planned Cycle' : locale === 'th' ? 'วงจรก่อสร้างตามแผน' : '规划建设总周期'}</th>
                        <th className="p-2.5 border-r border-hairline">{locale === 'en' ? 'Implementation Outline & Key Milestones' : locale === 'th' ? 'สาระสำคัญและหมุดหมายหลัก' : '实施纲要与关键受控节点'}</th>
                        <th className="p-2.5 w-24 text-right">{locale === 'en' ? 'Evidence' : locale === 'th' ? 'หลักฐาน' : '核验证据'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-surface-hover transition-colors">
                        <td className="p-2.5 text-center font-mono text-ink-faint border-r border-hairline">
                          1
                        </td>
                        <td className="p-2.5 border-r border-hairline font-bold text-ink">
                          {localizedProject.currentPhase}
                          <span className="block text-[10px] text-emerald-400 font-mono font-normal">
                            [{localizedProject.status}]
                          </span>
                        </td>
                        <td className="p-2.5 border-r border-hairline font-mono text-ink-muted">
                          {localizedProject.plannedCycle}
                        </td>
                        <td className="p-2.5 border-r border-hairline text-ink-muted leading-relaxed">
                          {localizedProject.summary}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {project.evidenceId && onSelectEvidence && (
                            <button
                              type="button"
                              data-evidence-id={project.evidenceId}
                              onClick={() => onSelectEvidence(project.evidenceId)}
                              className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold hover:bg-emerald-900 transition-colors whitespace-nowrap"
                            >
                              {locale === 'en' ? 'Inspect →' : locale === 'th' ? 'ตรวจสอบ →' : '核查凭据 →'}
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Section 3: Knowledge Triples Network & Relationship Evidence Table (Original Scheme B Preservation) */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-sky-400 pl-2.5">
                    <Link2 className="w-4 h-4 text-sky-400" />
                    <span>
                      {locale === 'en' 
                        ? '3. Engineering Roles & Milestone Accountability Structure' 
                        : locale === 'th' 
                        ? '3. ข้อเท็จจริงบทบาทและโครงสร้างความรับผิดชอบ' 
                        : '3. 核心参建主体工程角色与权责结构 (Engineering Roles & Accountability)'}
                    </span>
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {locale === 'en'
                      ? 'Conforming to engineering knowledge graph traceability: Subject → Engineering Role / Scope → Object'
                      : locale === 'th'
                      ? 'ตามมาตรฐานการสืบย้อนความรู้ทางวิศวกรรม: ประธาน → บทบาทหน้าที่ในโครงการ → กรรม'
                      : '遵循工程知识图谱事实溯源规范：主体 (Subject) → 工程角色与分工 (Predicate) → 客体 (Object)'}
                  </p>
                </div>
                <span className="text-xs font-mono text-sky-700 dark:text-sky-400 font-semibold self-start sm:self-center">
                  {isP001 
                    ? (locale === 'en' ? `${PROJECT_DATA.network.edges.length} Graph Triples` : locale === 'th' ? `${PROJECT_DATA.network.edges.length} ความสัมพันธ์ในกราฟ` : `${PROJECT_DATA.network.edges.length} 项图谱关系`)
                    : (locale === 'en' ? `${projectParticipations.length} Graph Triples` : locale === 'th' ? `${projectParticipations.length} ความสัมพันธ์ในกราฟ` : `${projectParticipations.length} 项图谱关系`)}
                </span>
              </div>

              <div className="w-full max-w-full min-w-0 overflow-x-auto border border-hairline rounded-xl bg-surface-subtle">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-subtle text-ink-muted border-b border-hairline font-semibold font-mono">
                      <th className="p-2.5 border-r border-hairline w-44">{locale === 'en' ? 'Subject' : locale === 'th' ? 'ประธาน (Subject)' : '主体 (Subject)'}</th>
                      <th className="p-2.5 border-r border-hairline">{locale === 'en' ? 'Engineering Role / Scope (Predicate)' : locale === 'th' ? 'บทบาทหน้าที่ในโครงการ (Predicate)' : '工程角色与分工 (Predicate)'}</th>
                      <th className="p-2.5 border-r border-hairline w-44">{locale === 'en' ? 'Object' : locale === 'th' ? 'กรรม (Object)' : '客体 (Object)'}</th>
                      <th className="p-2.5 border-r border-hairline w-28 text-center">{locale === 'en' ? 'Verification' : locale === 'th' ? 'การตรวจสอบ' : '核验等级'}</th>
                      <th className="p-2.5 w-24 text-right">{locale === 'en' ? 'Source & Audit' : locale === 'th' ? 'ที่มาและการตรวจสอบ' : '出处与审计'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {isP001 ? (
                      PROJECT_DATA.network.edges.map((edge) => (
                        <tr key={edge.id} className="hover:bg-surface-hover transition-colors">
                          <td className="p-2.5 border-r border-hairline font-bold text-ink">
                            {edge.source.startsWith('ORG-') ? (
                              <button
                                type="button"
                                onClick={() => onSelectOrg ? onSelectOrg(edge.source) : navigate(`/companies/${edge.source.toLowerCase()}`)}
                                className="text-sky-700 dark:text-sky-400 hover:underline font-bold text-left"
                                title="查看机构档案"
                              >
                                {getLocalizedOrgName(edge.source, edge.source)}
                              </button>
                            ) : (
                              <span>{edge.source}</span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-hairline text-ink-muted font-medium">
                            {getLocalizedEdgeLabel(edge.label)}
                          </td>
                          <td className="p-2.5 border-r border-hairline font-bold text-ink">
                            {edge.target.startsWith('ORG-') ? (
                              <button
                                type="button"
                                onClick={() => onSelectOrg ? onSelectOrg(edge.target) : navigate(`/companies/${edge.target.toLowerCase()}`)}
                                className="text-sky-700 dark:text-sky-400 hover:underline font-bold text-left"
                                title="查看机构档案"
                              >
                                {getLocalizedOrgName(edge.target, edge.target)}
                              </button>
                            ) : edge.target.startsWith('ENG-') ? (
                              <button
                                type="button"
                                onClick={() => onSelectEngineer ? onSelectEngineer(edge.target) : navigate(`/people/${edge.target.toLowerCase()}`)}
                                className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold text-left"
                                title="查看工程师档案"
                              >
                                {getLocalizedPersonName(edge.target, edge.target)}
                              </button>
                            ) : (
                              <span>{edge.target}</span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-hairline text-center">
                            <VerificationBadge level={edge.verificationLevel} size="xs" />
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {edge.evidenceId && onSelectEvidence && (
                              <button
                                type="button"
                                data-evidence-id={edge.evidenceId}
                                onClick={() => onSelectEvidence(edge.evidenceId)}
                                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold hover:bg-emerald-900 transition-colors whitespace-nowrap"
                              >
                                {locale === 'en' ? 'Inspect →' : locale === 'th' ? 'ตรวจสอบ →' : '核查凭据 →'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      projectParticipations.map((part) => (
                        <tr key={part.id} className="hover:bg-surface-hover transition-colors">
                          <td className="p-2.5 border-r border-hairline font-bold text-ink">
                            {project.clientOrgId ? (
                              <button
                                type="button"
                                onClick={() => onSelectOrg ? onSelectOrg(project.clientOrgId) : navigate(`/companies/${project.clientOrgId.toLowerCase()}`)}
                                className="text-sky-700 dark:text-sky-400 hover:underline font-bold text-left"
                              >
                                {getLocalizedOrgName(project.clientOrgId, project.clientOrgName || project.clientOrgId)}
                              </button>
                            ) : (
                              <span>{project.clientOrgName || (isZh ? '建设单位' : 'Client Org')}</span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-hairline text-ink-muted font-medium">
                            {(dict.roles?.[part.role] || part.role)} · {getLocalizedWorkPackage(part.workPackageName)}
                          </td>
                          <td className="p-2.5 border-r border-hairline font-bold text-ink">
                            {part.orgId ? (
                              <button
                                type="button"
                                onClick={() => onSelectOrg ? onSelectOrg(part.orgId) : navigate(`/companies/${part.orgId.toLowerCase()}`)}
                                className="text-sky-700 dark:text-sky-400 hover:underline font-bold text-left"
                              >
                                {getLocalizedOrgName(part.orgId, part.orgName || part.orgId)}
                              </button>
                            ) : part.personId ? (
                              <button
                                type="button"
                                onClick={() => onSelectEngineer ? onSelectEngineer(part.personId) : navigate(`/people/${part.personId.toLowerCase()}`)}
                                className="text-emerald-400 hover:text-emerald-300 hover:underline font-bold text-left"
                              >
                                {getLocalizedPersonName(part.personId, part.personName || part.personId)}
                              </button>
                            ) : (
                              <span>{part.orgName || (isZh ? '参建单位' : 'Participant')}</span>
                            )}
                          </td>
                          <td className="p-2.5 border-r border-hairline text-center">
                            <VerificationBadge level={part.verificationLevel} size="xs" />
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {part.evidenceId && onSelectEvidence && (
                              <button
                                type="button"
                                data-evidence-id={part.evidenceId}
                                onClick={() => onSelectEvidence(part.evidenceId)}
                                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold hover:bg-emerald-900 transition-colors whitespace-nowrap"
                              >
                                {locale === 'en' ? 'Inspect →' : locale === 'th' ? 'ตรวจสอบ →' : '核查凭据 →'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4: OBS Participations Breakdown */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-sky-400 pl-2.5">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  <span>
                    {locale === 'en' 
                      ? '4. Organizational Breakdown & Discipline Packages (OBS Panorama)' 
                      : locale === 'th' 
                      ? '4. โครงสร้างองค์กรและขอบเขตงานสัญญา (OBS Panorama)' 
                      : '4. 参建主体职责与组织分解 (OBS 标段包全景)'}
                  </span>
                </h3>
                <span className="text-xs font-mono text-ink-muted">
                  {locale === 'en' 
                    ? `Total ${projectParticipations.length} Work Packages` 
                    : locale === 'th' 
                    ? `รวม ${projectParticipations.length} สัญญางาน` 
                    : `共计 ${projectParticipations.length} 项责任标段包`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {projectParticipations.map(part => (
                  <div
                    key={part.id}
                    className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-sky-700 dark:text-sky-400 font-semibold">{part.workPackageId}</span>
                      <span className="font-mono text-ink-muted">{getLocalizedPeriod(part.period)}</span>
                    </div>
                    <div className="font-bold text-sm text-ink">
                      {getLocalizedWorkPackage(part.workPackageName)}
                    </div>
                    <div className="flex items-center justify-between text-ink-muted text-xs pt-1">
                      {part.orgId ? (
                        <button
                          type="button"
                          onClick={() => onSelectOrg ? onSelectOrg(part.orgId) : navigate(`/companies/${part.orgId.toLowerCase()}`)}
                          className="hover:text-sky-700 dark:hover:text-sky-400 font-medium text-left truncate max-w-[180px]"
                        >
                          {getLocalizedOrgName(part.orgId, part.orgName)}
                        </button>
                      ) : (
                        <span className="font-medium text-ink-muted truncate max-w-[180px]">{part.orgName || (isZh ? '参建单位' : 'Participant')}</span>
                      )}
                      {part.personId && (
                        <button
                          type="button"
                          onClick={() => onSelectEngineer ? onSelectEngineer(part.personId) : navigate(`/people/${part.personId.toLowerCase()}`)}
                          className="text-emerald-400 hover:text-emerald-300 font-medium text-xs truncate max-w-[120px]"
                        >
                          {getLocalizedPersonName(part.personId, part.personName)}
                        </button>
                      )}
                      <span className="text-ink-muted font-mono">{dict.roles?.[part.role] || part.role}</span>
                    </div>
                    <div className="text-[11px] text-ink-muted truncate">
                      {locale === 'en' ? 'Core Deliverables: ' : locale === 'th' ? 'ผลงานส่งมอบหลัก: ' : '核心交付成果: '}{getLocalizedDeliverable(part.deliverable)}
                    </div>
                    {part.evidenceId && onSelectEvidence && (
                      <div className="pt-1.5 border-t border-slate-850 flex justify-end">
                        <button
                          type="button"
                          data-evidence-id={part.evidenceId}
                          onClick={() => onSelectEvidence(part.evidenceId)}
                          className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-semibold hover:bg-emerald-900 transition-colors"
                        >
                          {locale === 'en' ? `Supporting Evidence ${part.evidenceId}` : locale === 'th' ? `หลักฐานอ้างอิง ${part.evidenceId}` : `支撑存证 ${part.evidenceId}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5: Citations & Footnotes */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-amber-400 pl-2.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>
                    {locale === 'en' 
                      ? '5. Citations & Canonical Publications' 
                      : locale === 'th' 
                      ? '5. เอกสารอ้างอิงและสิ่งตีพิมพ์' 
                      : '5. 参考文献与规范出处 (Citations & Footnotes)'}
                  </span>
                </h3>
                <span className="text-xs font-mono text-ink-muted">
                  {projectFootnotes.length > 0 
                    ? (locale === 'en' ? `${projectFootnotes.length} Publications` : locale === 'th' ? `${projectFootnotes.length} รายการตีพิมพ์` : `${projectFootnotes.length} 篇出版文献`)
                    : (isZh ? '非 P001 演示项目' : 'Demo Project (Non-P001)')}
                </span>
              </div>

              {projectFootnotes.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {projectFootnotes.map(fn => (
                    <li
                      key={fn.index}
                      className="p-3 bg-surface-subtle border border-hairline rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-ink mr-1.5">{fn.index}. {fn.title}</span>
                        <span className="text-ink-muted font-mono text-[11px]">{fn.source}</span>
                        <span className="text-ink-faint text-[10px] ml-1.5">({fn.pubDate})</span>
                        <span className="text-ink-faint font-mono text-[10px] ml-1.5">[{locale === 'en' ? 'Archive Code: ' : locale === 'th' ? 'รหัสจัดเก็บ: ' : '归档号: '}{fn.archiveCode}]</span>
                      </div>
                      {onSelectEvidence && fn.evidenceId && (
                        <button
                          type="button"
                          data-evidence-id={fn.evidenceId}
                          onClick={() => onSelectEvidence(fn.evidenceId)}
                          className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-mono font-semibold transition-colors"
                        >
                          {locale === 'en' ? `Inspect Evidence ${fn.evidenceId}` : locale === 'th' ? `ตรวจหลักฐาน ${fn.evidenceId}` : `核查存证 ${fn.evidenceId}`}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 bg-surface-subtle border border-dashed border-hairline rounded-xl text-center space-y-1">
                  <p className="text-xs text-ink-muted">
                    {locale === 'en' ? 'No specific literature or public citations for this project entry' : locale === 'th' ? 'ยังไม่มีเอกสารอ้างอิงสำหรับโครงการนี้' : '暂无当前工程项目的专属文献专著或公开出版引用'}
                  </p>
                  <p className="text-[11px] text-ink-faint font-mono">
                    {locale === 'en' 
                      ? '(Publications will be linked after joint construction whitepapers are verified)' 
                      : locale === 'th' 
                      ? '(จะเชื่อมโยงเอกสารหลังการตรวจสอบรายงานร่วม)' 
                      : '（本工程为非 P001 演示项目，文献数据待后续施工联合公报提交核验归档）'}
                  </p>
                </div>
              )}
            </section>

            {/* Section 6: Project-Scoped Milestone Records (Mock Demo) */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-emerald-400 pl-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {isZh 
                      ? '6. 项目关联工程记录案卷 (Mock 原型示意)' 
                      : (locale === 'th' 
                      ? '6. แฟ้มบันทึกวิศวกรรมจำลองเฉพาะโครงการ' 
                      : '6. Project-Scoped Milestone Records (Mock Demo)')}
                  </span>
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-semibold">
                  {locale === 'en' 
                    ? `${projectEvidenceList.length} Records Linked` 
                    : locale === 'th' 
                    ? `เชื่อมโยง ${projectEvidenceList.length} รายการบันทึก` 
                    : `已关联 ${projectEvidenceList.length} 项工程记录`}
                </span>
              </div>

              {projectEvidenceList.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                  {projectEvidenceList.map(evd => (
                    <div
                      key={evd.id}
                      className="p-3 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-between gap-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-emerald-400 font-semibold text-[11px]">{evd.id}</span>
                          <VerificationBadge level={evd.verificationLevel} size="xs" />
                        </div>
                        <div className="text-ink truncate font-medium">
                          {getLocalizedField(evd.id, 'sourceType', locale, evd.sourceType || evd.summary)}
                        </div>
                        <div className="text-[10px] text-ink-muted flex items-center gap-2">
                          <span>
                            {getLocalizedField(evd.id, 'sourceOrg', locale, evd.sourceOrg)} · {locale === 'zh' ? evd.timestamp : (evd.timestamp || '').replace('计划拟定日期', locale === 'th' ? 'วันที่วางแผน' : 'Planned Date').replace('概念预留', locale === 'th' ? 'แนวคิดจำลอง' : 'Concept Reserved')}
                          </span>
                          <span className="font-mono text-ink-faint">
                            {locale === 'en' ? 'Ref ID: ' : locale === 'th' ? 'รหัสอ้างอิง: ' : '关联编号: '}MOCK-REF-{evd.id}
                          </span>
                        </div>
                      </div>
                      {onSelectEvidence && (
                        <button
                          type="button"
                          data-evidence-id={evd.id}
                          onClick={() => onSelectEvidence(evd.id)}
                          className="shrink-0 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-medium border border-slate-700/80 transition-colors"
                        >
                          {locale === 'en' ? 'Inspect' : locale === 'th' ? 'ตรวจดู' : '检视'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-surface-subtle border border-dashed border-hairline rounded-xl text-center space-y-1">
                  <p className="text-xs text-ink-muted">
                    {locale === 'en' ? 'No project-scoped milestone records yet for this project' : locale === 'th' ? 'ยังไม่มีแฟ้มหลักฐานสำหรับโครงการนี้' : '暂无当前工程项目的关联记录案卷'}
                  </p>
                  <p className="text-[11px] text-ink-faint font-mono">
                    {locale === 'en' 
                      ? '(Illustrative project records will be linked after submissions are archived)' 
                      : locale === 'th' 
                      ? '(จะเชื่อมโยงบันทึกตัวอย่างหลังการจัดเก็บข้อมูล)' 
                      : '（待参建各方经办人提交相关资质与验收凭据后自动挂接）'}
                  </p>
                </div>
              )}
            </section>

            {/* Section 7: Revision History */}
            <section className="space-y-3 pt-3 border-t border-hairline">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-ink flex items-center gap-2 border-l-2 border-sky-400 pl-2.5">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>
                    {locale === 'en' 
                      ? '7. Revision History & Immutable Archival' 
                      : locale === 'th' 
                      ? '7. ประวัติการแก้ไขและการจัดเก็บถาวร' 
                      : '7. 百科条目修订历史与版本固化'}
                  </span>
                </h3>
                <span className="text-xs font-mono text-ink-muted">
                  {isP001 
                    ? (locale === 'en' ? `${PROJECT_DATA.revisionHistory.length} Revisions` : locale === 'th' ? `${PROJECT_DATA.revisionHistory.length} เวอร์ชันแก้ไข` : `${PROJECT_DATA.revisionHistory.length} 次修订版本`)
                    : (locale === 'en' ? 'Initial Version v1.0' : locale === 'th' ? 'เวอร์ชันแรก v1.0' : '初始版本 v1.0')}
                </span>
              </div>

              <div className="space-y-2">
                {(isP001 ? (isZh ? PROJECT_DATA.revisionHistory : REVISION_HISTORY_EN) : [
                  {
                    version: 'v1.0',
                    editor: isZh ? 'Project Atlas 自动归档系统' : 'Project Atlas Archival System',
                    date: '2026-01-10',
                    verified: true,
                    comment: isZh ? '工程项目立项数据与基础事实初始录入' : 'Initial entry of project charter and canonical facts'
                  }
                ]).map((rev, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface-subtle border border-hairline text-xs flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sky-700 dark:text-sky-400">{rev.version}</span>
                        <span className="text-ink">{rev.comment}</span>
                      </div>
                      <div className="text-[10px] text-ink-muted font-mono">
                        {locale === 'en' 
                          ? `Editor: ${rev.editor} · Timestamp: ${rev.date} · Status: ${rev.verified ? 'Archived Record (Demo)' : 'Pending Review'}`
                          : locale === 'th'
                          ? `ผู้แก้ไข: ${rev.editor} · เวลา: ${rev.date} · สถานะ: ${rev.verified ? 'บันทึกตัวอย่างจำลอง' : 'รอการตรวจทาน'}`
                          : `修订人：${rev.editor} · 时间戳：${rev.date} · 状态：${rev.verified ? '原型归档记录' : '待复核'}`}
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                      {isZh ? '已归档' : locale === 'th' ? 'จัดเก็บแล้ว' : 'Archived'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Accessible Lightbox Modal for Full Illustration Inspection */}
      <IllustrationLightboxModal
        template={inspectingTemplate}
        onClose={() => setInspectingTemplate(null)}
      />
    </div>
  );
}

export default ProjectWikiPage;
