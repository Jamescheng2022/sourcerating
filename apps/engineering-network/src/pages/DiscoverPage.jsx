import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, Filter, ShieldCheck, ChevronRight, 
  ExternalLink, Building2, User, Milestone, CheckCircle2,
  FolderKanban, Compass, X
} from 'lucide-react';
import { PROJECT_DATA, SEARCH_PRESETS } from '../data/projectData';
import { EngineeringIllustration } from '../components/illustrations/EngineeringIllustration';
import { Avatar } from '../components/ui/Avatar';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { useI18n } from '../i18n/I18nContext';

export function DiscoverPage({ onSelectEvidence }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  // Search input query
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeQuery, setActiveQuery] = useState(searchParams.get('q') || '');

  // Type Filter: 'all' | 'company' | 'project' | 'person'
  const [typeFilter, setTypeFilter] = useState('all');

  // Accordion details expanded map
  const [expandedDetails, setExpandedDetails] = useState({});

  // Lightbox inspection state
  const [inspectingTemplate, setInspectingTemplate] = useState(null);

  useEffect(() => {
    document.title = isZh 
      ? '工程知识图谱语义发现 (Mock AI) · 工程行业网络 (暂称)' 
      : isTh 
      ? 'การค้นพบความรู้เชิงความสัมพันธ์ (Mock AI) · Engineering Network' 
      : 'Engineering Knowledge Graph Semantic Discovery (Mock AI) · Engineering Network';
  }, [isZh, isTh]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setQuery(q);
      setActiveQuery(q);
    }
  }, [searchParams]);

  const handleRunSearch = (targetQuery) => {
    const q = targetQuery !== undefined ? targetQuery : query;
    setActiveQuery(q);
    setSearchParams(q ? { q } : {});
  };

  // Match search presets from PROJECT_DATA
  const trimmedActiveQuery = (activeQuery || '').trim();
  
  const matchedPreset = trimmedActiveQuery === ''
    ? PROJECT_DATA.searchPresets[0]
    : (PROJECT_DATA.searchPresets.find(p => {
        const uQuery = trimmedActiveQuery.toLowerCase();
        const pQuery = p.query.trim().toLowerCase();
        if (pQuery === uQuery) return true;
        if ((pQuery.includes('钢结构') || pQuery.includes('truss') || pQuery.includes('steel')) && 
            (uQuery.includes('钢结构') || uQuery.includes('厂房') || uQuery.includes('钢') || uQuery.includes('truss') || uQuery.includes('steel'))) return true;
        if ((pQuery.includes('洁净室') || pQuery.includes('cleanroom') || pQuery.includes('mep')) && 
            (uQuery.includes('洁净') || uQuery.includes('万级') || uQuery.includes('机电') || uQuery.includes('cleanroom') || uQuery.includes('mep'))) return true;
        if ((pQuery.includes('华东') || pQuery.includes('industrial') || pQuery.includes('east china')) && 
            (uQuery.includes('华东') || uQuery.includes('工业') || uQuery.includes('在建') || uQuery.includes('industrial') || uQuery.includes('east china'))) return true;
        return false;
      }) || null);

  // Localized preset query helper
  const getLocalizedPresetQuery = (p) => {
    if (!p) return '';
    if (isZh) return p.query;
    if (p.id === 'preset-1') return isTh ? 'บริษัทที่มีประสบการณ์โครงสร้างเหล็กโรงงาน' : 'Contractors with industrial space truss experience';
    if (p.id === 'preset-2') return isTh ? 'วิศวกรที่มีประสบการณ์งานระบบคลีนรูม' : 'Engineers with cleanroom MEP experience';
    if (p.id === 'preset-3') return isTh ? 'โครงการอุตสาหกรรมที่กำลังก่อสร้างในภาคตะวันออก' : 'Active industrial projects in East China';
    return p.query;
  };

  // Localized Why Matched text
  const getLocalizedWhyMatched = (p) => {
    if (!p) return '';
    if (isZh) return p.whyMatched;
    if (p.id === 'preset-1') {
      return isTh
        ? 'การอนุมานกราฟและสายหลักฐาน: Demo Organization B รับผิดชอบโครงการ DEMO Project P001 PKG-ST-02 โครงสร้างเหล็กช่วงกว้าง (กำลังดำเนินการ) ผ่านการตรวจสอบการยกชุดที่ 4 (EVD-P001-089) และ Demo Organization H มีความสามารถผลิตโครงถักเชิงพื้นที่ (ข้อมูลจำลอง)'
        : 'Graph Inference & Multi-Source Trail: Demo Organization B undertakes DEMO Project P001 PKG-ST-02 heavy spatial steel package (active), verified through unit 4 synchronized high-altitude lift (EVD-P001-089); Demo Organization H provides spatial truss fabrication capability (illustrative simulation).';
    }
    if (p.id === 'preset-2') {
      return isTh
        ? 'การอนุมานกราฟและสายหลักฐาน: Demo Engineer 03 สังกัด Demo Organization E ปฏิบัติงานเป็นผู้จัดการติดตั้งระบบคลีนรูมในโครงการ DEMO Project P001 และเสร็จสิ้นการทบทวนทางเทคนิคระบบท่อ B1 (EVD-P001-072)'
        : 'Graph Inference & Multi-Source Trail: Demo Engineer 03 with Demo Organization E executes PKG-ME-03 cleanroom precision MEP for DEMO Project P001, completed BIM coordination review for zone B1 (EVD-P001-072); and oversaw chiller unboxing for DEMO Project P004.';
    }
    if (p.id === 'preset-3') {
      return isTh
        ? 'การอนุมานกราฟและสายหลักฐาน: DEMO Project P001 ตั้งอยู่ในเขตพัฒนาอุตสาหกรรมภาคตะวันออก อยู่ในขั้นตอนก่อสร้างและปฏิบัติงาน (EVD-P001-001) และ DEMO Project P004 อยู่ในขั้นตอนงานระบบไฟฟ้าและเครื่องกล'
        : 'Graph Inference & Multi-Source Trail: DEMO Project P001 is located in the East China Demonstration High-Tech Zone under active construction (EVD-P001-001 / EVD-P001-089); DEMO Project P004 microelectronics hub is in the MEP installation stage.';
    }
    return p.whyMatched;
  };

  // Localized entity name
  const getLocalizedEntityName = (item) => {
    if (!item?.name || isZh) return item?.name;
    if (item.id === 'ORG-B') {
      return isTh ? 'Demo Organization B (กลุ่มบริษัทรับเหมาก่อสร้างทั่วไป EPC)' : 'Demo Organization B (EPC General Construction Group)';
    }
    if (item.id === 'DEMO-PRJ-P001') {
      return isTh ? 'DEMO Project P001: โครงการโรงงานผลิตอุปกรณ์อัจฉริยะ' : 'DEMO Project P001: Smart Manufacturing Industrial Plant Base';
    }
    if (item.id === 'ORG-H') {
      return isTh ? 'Demo Organization H (กลุ่มอุตสาหกรรมโครงสร้างเหล็ก)' : 'Demo Organization H (Steel Space Truss Heavy Fabrication Group)';
    }
    if (item.id === 'ENG-03') {
      return isTh ? 'Demo Engineer 03 (ผู้อำนวยการโครงการ MEP)' : 'Demo Engineer 03 (MEP Project Director)';
    }
    if (item.id === 'ORG-E') {
      return isTh ? 'Demo Organization E (บริษัทติดตั้งระบบเครื่องกลไฟฟ้าคลีนรูม)' : 'Demo Organization E (Cleanroom MEP Installation Technology Corp)';
    }
    if (item.id === 'DEMO-PRJ-P004') {
      return isTh ? 'DEMO Project P004: โรงงานไมโครอิเล็กทรอนิกส์คลีนรูม' : 'DEMO Project P004: Microelectronics Cleanroom & Power Center';
    }
    return item.name;
  };

  // Localized entity badge
  const getLocalizedEntityBadge = (badge) => {
    if (!badge || isZh) return badge;
    if (badge.includes('总包履约中') || badge.includes('EPC')) return isTh ? 'จำลองการตรวจสอบ · กำลังดำเนินงาน' : 'Mock Verified · Active EPC';
    if (badge.includes('机电专家')) return isTh ? 'ผู้เชี่ยวชาญ MEP' : 'Mock Verified · MEP Expert';
    if (badge.includes('工业建筑') && badge.includes('华东')) return isTh ? 'ภาคตะวันออก · อาคารอุตสาหกรรม · ระหว่างก่อสร้าง' : 'East China · Industrial · Active';
    if (badge.includes('动力机电') && badge.includes('华东')) return isTh ? 'ภาคตะวันออก · งานระบบ · ระหว่างก่อสร้าง' : 'East China · MEP Power · Active';
    if (badge.includes('工业建筑') || badge.includes('示范厂房')) return isTh ? 'ระหว่างก่อสร้าง · อาคารอุตสาหกรรม' : 'Under Construction · Industrial';
    if (badge.includes('专业加工')) return isTh ? 'แสดงหลักฐาน · การผลิตชิ้นส่วน' : 'Claimed · Fabrication';
    if (badge.includes('洁净机电')) return isTh ? 'วิศวกรระบบคลีนรูม' : 'Cleanroom MEP Lead';
    if (badge.includes('自述履约中')) return isTh ? 'รายงานโดยตรง · กำลังดำเนินงาน' : 'Self-Claimed · Active';
    if (badge.includes('动力机电在建') || badge.includes('动力机电')) return isTh ? 'งานระบบกำลังก่อสร้าง' : 'Active MEP Construction';
    return isTh ? 'ข้อมูลจำลอง' : 'Illustrative Mock';
  };

  // Localized entity relation snippet
  const getLocalizedRelationSnippet = (item) => {
    if (!item?.relationSnippet || isZh) return item?.relationSnippet;
    if (item.id === 'ORG-B') return isTh ? 'ผู้รับเหมาหลักโครงสร้างเหล็ก PKG-ST-02 โครงการ P001 ผ่านการตรวจสอบการยกโครงถัก' : 'EPC Prime Contractor for DEMO Project P001 PKG-ST-02 steel package, completed heavy space truss lift.';
    if (item.id === 'DEMO-PRJ-P001') {
      if (item.relationSnippet && item.relationSnippet.includes('12.8')) {
        return isTh ? 'โรงงานผลิตอุปกรณ์อัจฉริยะภาคตะวันออก งบลงทุนจำลอง 1.28 พันล้านหยวน' : 'Major East China industrial equipment manufacturing facility with 1.28B CNY mock scale.';
      }
      return isTh ? 'โครงการโรงงานตัวอย่างอุตสาหกรรม ครอบคลุมการยกโครงถักหลังคาช่วงกว้าง' : 'Flagship smart manufacturing facility with long-span portal frames and space truss lift.';
    }
    if (item.id === 'ORG-H') return isTh ? 'หน่วยผลิตโครงถักเชิงพื้นที่ โครงการ P005' : 'Spatial truss fabrication contractor for DEMO Project P005.';
    if (item.id === 'ENG-03') return isTh ? 'หัวหน้างานติดตั้งระบบคลีนรูม โครงการ P001 รับผิดชอบการประสานแบบ BIM' : 'Cleanroom MEP installation lead for DEMO Project P001, completed BIM coordination review.';
    if (item.id === 'ORG-E') return isTh ? 'ผู้รับเหมาช่วงงานระบบปรับอากาศและท่อบริสุทธิ์สูง' : 'Specialized subcontractor for high-grade cleanroom HVAC and high-purity process piping.';
    if (item.id === 'DEMO-PRJ-P004') {
      if (item.relationSnippet && item.relationSnippet.includes('31.0')) {
        return isTh ? 'โรงงานผลิตไมโครอิเล็กทรอนิกส์คลีนรูมภาคตะวันออก งบลงทุนจำลอง 3.10 พันล้านหยวน' : 'East China microelectronics cleanroom hub project with 3.10B CNY mock scale.';
      }
      return isTh ? 'โรงงานไมโครอิเล็กทรอนิกส์ขั้นสูง ออกแบบคลีนรูมระดับ 100' : 'Advanced microelectronics cleanroom facility with Class-100 environmental isolation.';
    }
    return item.relationSnippet;
  };

  const whyMatchedText = getLocalizedWhyMatched(matchedPreset);
  const filteredResults = matchedPreset
    ? matchedPreset.matchedEntities.filter(r => {
        if (typeFilter === 'all') return true;
        return r.type === typeFilter;
      })
    : [];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 font-sans text-ink">
      {/* 1. Header Banner */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 text-ink shadow-xl backdrop-blur-md space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              MOCK AI DISCOVERY
            </span>
            <span className="text-xs text-ink-muted font-mono">
              {isZh 
                ? '本地知识图谱推理引擎 · 零外部网络请求' 
                : isTh 
                ? 'เครื่องมืออนุมานกราฟความรู้ในเครื่อง · 0 คำขอเครือข่ายภายนอก' 
                : 'Local Knowledge Graph Inference Engine · 0 External Network Requests'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-ink">
            {dict.discover?.title || (isZh ? '全局图谱语义发现 (Mock AI)' : 'Global Graph Semantic Discovery (MOCK)')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
            {dict.discover?.subtitle || (isZh ? '基于工程实体与关联关系链的自然语言发现引擎（纯本地前端模拟计算，零外部网络调用）' : 'Natural language discovery engine powered by engineering knowledge graph (100% local simulation, zero external network calls)')}
          </p>
        </div>

        {/* Natural Language Search Input Box */}
        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunSearch();
            }}
            className="flex flex-col sm:flex-row items-center gap-2"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isZh 
                  ? '输入工程自然语言需求，例如：做过工业厂房钢结构的企业、有洁净室经验的工程师...' 
                  : isTh 
                  ? 'ระบุความต้องการทางวิศวกรรม เช่น บริษัทที่มีประสบการณ์โครงสร้างเหล็ก...' 
                  : 'Enter engineering query, e.g.: contractors with industrial space truss experience, cleanroom MEP engineers...'}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl bg-surface-subtle border border-hairline text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isZh ? '语义发现 (Mock)' : (isTh ? 'ค้นหาความสัมพันธ์ (Mock)' : 'Discover (Mock)')}</span>
            </button>
          </form>
        </div>

        {/* Presets Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-xs text-ink-muted font-medium">
            {dict.discover?.presetHeader || (isZh ? '预设工程检索场景（点击快速体验）：' : 'Preset Engineering Scenarios (click to test):')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SEARCH_PRESETS.map((preset) => {
              const localizedQuery = getLocalizedPresetQuery(preset);
              const isSelected = activeQuery === preset.query || activeQuery === localizedQuery;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setQuery(localizedQuery);
                    handleRunSearch(isZh ? preset.query : localizedQuery);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-sm font-semibold'
                      : 'bg-surface-subtle text-ink-muted border-hairline hover:bg-surface-hover hover:text-ink'
                  }`}
                >
                  "{localizedQuery}"
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Visual Exploration Channels */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>{isZh ? '视觉工程主题探索' : (isTh ? 'สำรวจตามหัวข้อภาพวิศวกรรม' : 'Visual Engineering Exploration')}</span>
          </h2>
          <span className="text-xs text-ink-muted font-mono">
            {isZh ? '36 个参数化图学模型库' : (isTh ? '36 คลังแบบจำลองพารามิเตอร์' : '36 Parametric Diagram Models')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => {
              const q = isZh ? '做过工业厂房钢结构的企业' : 'Contractors with industrial space truss experience';
              setQuery(q);
              handleRunSearch(q);
            }}
            className="cursor-pointer space-y-1.5 group"
          >
            <EngineeringIllustration
              templateId="tpl-prj-01"
              showBadge={true}
              showMetaBar={false}
              className="group-hover:border-sky-500/80 transition-all shadow-md"
            />
            <div className="text-xs font-semibold text-ink group-hover:text-sky-300 transition-colors">
              {isZh ? '大跨度空间网架顶升工法' : (isTh ? 'วิธีการยกโครงสร้างโครงถักเชิงพื้นที่' : 'Heavy Space Truss Synchronized Lift')}
            </div>
          </div>

          <div
            onClick={() => {
              const q = isZh ? '有洁净室机电经验的工程师' : 'Engineers with cleanroom MEP experience';
              setQuery(q);
              handleRunSearch(q);
            }}
            className="cursor-pointer space-y-1.5 group"
          >
            <EngineeringIllustration
              templateId="tpl-prj-04"
              showBadge={true}
              showMetaBar={false}
              className="group-hover:border-emerald-500/80 transition-all shadow-md"
            />
            <div className="text-xs font-semibold text-ink group-hover:text-emerald-300 transition-colors">
              {isZh ? '百级微电子洁净微振动基台' : (isTh ? 'ฐานรากลดแรงสั่นสะเทือนห้องคลีนรูม' : 'Class-100 Cleanroom Vibration Isolation Base')}
            </div>
          </div>

          <div
            onClick={() => {
              const q = isZh ? '华东在建工业项目' : 'Active industrial projects in East China';
              setQuery(q);
              handleRunSearch(q);
            }}
            className="cursor-pointer space-y-1.5 group"
          >
            <EngineeringIllustration
              templateId="tpl-prj-02"
              showBadge={true}
              showMetaBar={false}
              className="group-hover:border-amber-500/80 transition-all shadow-md"
            />
            <div className="text-xs font-semibold text-ink group-hover:text-amber-300 transition-colors">
              {isZh ? '超深基坑多道智能伺服支撑' : (isTh ? 'ระบบค้ำยันอัจฉริยะสำหรับงานขุดลึก' : 'Deep Excavation Automated Servo Strut Shoring')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content: Empty State vs Reasoning + Results */}
      {matchedPreset === null ? (
        <div className="bg-surface border border-hairline rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-950/60 border border-amber-800 flex items-center justify-center mx-auto text-amber-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="text-base font-bold text-ink">
              {isZh 
                ? `未匹配到预设工程推理样本: “${trimmedActiveQuery}”` 
                : isTh 
                ? `ไม่พบตัวอย่างการอนุมานที่ตั้งไว้: “${trimmedActiveQuery}”` 
                : `No matching preset engineering scenario for: “${trimmedActiveQuery}”`}
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              {isZh 
                ? '当前为纯前端离线原型系统 (Mock AI Discovery)，未连接外部真实大模型或在线知识库。离线原型当前收录并支持以下 3 组工程推理用例，请点击下方快捷标签进行体验：' 
                : isTh 
                ? 'ระบบนี้เป็นระบบจำลองส่วนหน้าแบบออฟไลน์ (Mock AI Discovery) ไม่ได้เชื่อมต่อกับ LLM ภายนอกหรือฐานข้อมูลออนไลน์ ระบบรองรับ 3 กรณีตัวอย่างต่อไปนี้ โปรดคลิกเพื่อทดสอบ:' 
                : 'This is an offline client-side prototype (Mock AI Discovery) without connection to external LLMs or cloud databases. The offline prototype supports the following 3 verified scenario presets. Please click a preset below to explore:'}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {SEARCH_PRESETS.map((p) => {
              const localizedPQuery = getLocalizedPresetQuery(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setQuery(localizedPQuery);
                    handleRunSearch(p.query);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-medium text-ink border border-hairline"
                >
                  "{localizedPQuery}"
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Graph Inference Reasoning Explanation Box (Why Matched) */}
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 sm:p-5 text-ink shadow-xs space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-mono">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>{dict.discover?.whyMatched || (isZh ? '图谱推理依据 (Why this matched):' : 'Why this matched (graph explanation):')}</span>
              </div>
              {trimmedActiveQuery && (
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-normal font-sans bg-emerald-100/80 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded">
                  {isZh 
                    ? `当前输入: “${trimmedActiveQuery}” → 匹配用例: “${matchedPreset.query}”` 
                    : `Query: “${getLocalizedPresetQuery(matchedPreset)}” → Matched Graph Scenario`}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100/90 leading-relaxed font-sans">
              {whyMatchedText}
            </p>
          </div>

          {/* Type Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-ink-muted font-medium mr-1">
                {isZh ? '实体类型:' : (isTh ? 'ประเภท:' : 'Entity Type:')}
              </span>
              {[
                { id: 'all', label: isZh ? '全部结果' : (isTh ? 'ทั้งหมด' : 'All Results') },
                { id: 'company', label: isZh ? '参建企业' : (isTh ? 'บริษัทผู้รับเหมา' : 'Companies') },
                { id: 'project', label: isZh ? '工程项目' : (isTh ? 'โครงการวิศวกรรม' : 'Projects') },
                { id: 'person', label: isZh ? '执业专家' : (isTh ? 'วิศวกรผู้เชี่ยวชาญ' : 'Engineers') },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    typeFilter === t.id
                      ? 'bg-accent text-white font-bold'
                      : 'bg-surface-subtle text-ink-muted hover:text-ink hover:bg-surface-hover border border-hairline'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-ink-muted font-mono shrink-0">
              {isZh ? `找到 ${filteredResults.length} 项图谱匹配` : (isTh ? `พบความสอดคล้อง ${filteredResults.length} รายการ` : `Found ${filteredResults.length} Graph Matches`)}
            </span>
          </div>

          {/* Results Cards Grid */}
          <div className="space-y-3">
            {filteredResults.length === 0 ? (
              <div className="bg-surface border border-hairline rounded-2xl p-8 text-center text-xs text-ink-muted">
                <p>{isZh ? '该分类下暂无匹配实体。请切换实体类型或重选预设用例。' : 'No matching entities under this filter. Try switching filter or selecting a preset.'}</p>
              </div>
            ) : (
              filteredResults.map(item => {
                return (
                  <div
                    key={item.id}
                    className="bg-surface border border-hairline rounded-2xl shadow-lg p-4 sm:p-5 space-y-3 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          type={item.type === 'company' ? 'company' : item.type === 'project' ? 'project' : 'user'}
                          name={getLocalizedEntityName(item)}
                          size="lg"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm sm:text-base text-ink">
                              {getLocalizedEntityName(item)}
                            </span>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-subtle text-ink-muted border border-hairline">
                              {getLocalizedEntityBadge(item.badge)}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted">
                            {getLocalizedRelationSnippet(item)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.route) {
                              navigate(item.route);
                            } else if (item.type === 'company') {
                              navigate(`/companies/${item.id.toLowerCase()}`);
                            } else if (item.type === 'project') {
                              const pId = item.id.toLowerCase().replace('demo-prj-', '');
                              navigate(`/projects/${pId}`);
                            } else {
                              navigate(`/people/${item.id.toLowerCase()}`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-xs font-medium text-accent border border-hairline flex items-center gap-1 transition-colors"
                        >
                          <span>{isZh ? '查看档案' : (isTh ? 'ดูประวัติ' : 'View Profile')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Evidence Footprint Link */}
                    {item.evidenceId && onSelectEvidence && (
                      <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs">
                        <span className="text-ink-muted">
                          {isZh ? '多源存证依据：' : (isTh ? 'หลักฐานอ้างอิง:' : 'Multi-Source Evidence:')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectEvidence(item.evidenceId)}
                          className="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[11px] font-semibold hover:bg-emerald-900 transition-colors"
                        >
                          {isZh ? `核验凭证 ${item.evidenceId}` : (isTh ? `ตรวจสอบ ${item.evidenceId}` : `Inspect ${item.evidenceId}`)}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Lightbox Modal for Full Illustration Inspection */}
      {inspectingTemplate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-surface-subtle backdrop-blur-md animate-fadeIn"
          onClick={() => setInspectingTemplate(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-surface border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                    {isZh ? '示意图 / Illustration' : isTh ? 'ภาพจำลอง / Illustration' : 'Illustration / Schematic'}
                  </span>
                  <span className="text-xs text-ink-muted font-mono">
                    ID: {inspectingTemplate.id} · {inspectingTemplate.aspectLabel}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-bold text-ink tracking-tight">
                  {inspectingTemplate.title}
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted">
                  {inspectingTemplate.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingTemplate(null)}
                className="p-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full rounded-xl overflow-hidden border border-hairline bg-surface-subtle">
              <EngineeringIllustration
                templateId={inspectingTemplate.id}
                showBadge={false}
                showMetaBar={false}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-subtle border border-hairline rounded-xl p-3.5">
              <div>
                <span className="text-ink-muted block mb-0.5">
                  {isZh ? '素材与模型来源:' : 'Source & Model:'}
                </span>
                <span className="text-ink font-medium">{inspectingTemplate.media.source}</span>
              </div>
              <div>
                <span className="text-ink-muted block mb-0.5">
                  {isZh ? '权利许可 (Licensing):' : 'Licensing:'}
                </span>
                <span className="text-ink font-medium">{inspectingTemplate.media.rights}</span>
              </div>
              <div>
                <span className="text-ink-muted block mb-0.5">
                  {isZh ? '授权用途:' : 'Permitted Usage:'}
                </span>
                <span className="text-ink font-medium">{inspectingTemplate.media.usage}</span>
              </div>
              <div>
                <span className="text-ink-muted block mb-0.5">
                  {isZh ? '无障碍替代文本 (Alt):' : 'Accessibility Alt:'}
                </span>
                <span className="text-ink-muted text-[11px]">{inspectingTemplate.media.alt}</span>
              </div>
            </div>

            <div className="text-[11px] text-amber-300/80 bg-amber-950/30 border border-amber-900/40 rounded-lg p-2.5">
              ● {isZh 
                ? '严格声明：本项目所有工程图示均为原创矢量示意图，禁止冒充真实具体现场。演示数据均用于 UX Spike 原型验证。' 
                : 'Notice: All engineering illustrations in this project are original vector schematics for UX Spike validation and do not claim real-site photographic authority.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
