import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ExternalLink, ArrowLeft, FolderKanban, Building2, Database, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { atlasRecordUrl, formatAtlasMoney, loadAtlasCatalog } from '../services/atlasCatalog';
import { EngineeringVisual } from '../components/visuals/EngineeringVisual';

const UI = {
  zh: {
    name: '全球工程与公共项目数据', intro: '真实来源数据。世界银行开发项目不一定是施工项目；英国记录是已发布采购及授标信息，不是正在招标的商机。',
    search: '搜索项目名称、国家、项目编号或 OCID', category: '数据类型', all: '全部来源', worldbank: '世界银行项目', uk: '英国采购/授标',
    focus: '优先显示：工程相关或活跃记录', focusHelp: '“工程相关”基于标题关键词，仅作检索提示，尚未经专业核验。',
    country: '国家 / 地区', allCountries: '全部国家', count: '匹配记录', loading: '正在载入真实数据…',
    source: '原始资料', date: '报告日期', amount: '披露金额', status: '来源状态', details: '查看来源与关系',
    error: '真实数据暂不可用；未切换到演示数据。', retry: '重新加载', noResults: '没有符合条件的来源记录',
    more: '下一页', prev: '上一页', back: '返回数据目录', attribution: '数据来源和版权归属', caveat: '来源限制',
    buyer: '采购方（来源声明）', supplier: '获授标供应商（来源声明）', awards: '授标记录（不等于合同已签订）',
    original: '查看官方来源', demo: '查看旧版演示项目', sourceRecord: '来源档案', undisclosed: '未披露', noCoordinates: '未核实具体工地坐标；不显示地图点位。',
    noLinks: '没有可核验的关联主体资料。', unknown: '未知', licensed: '已注明来源许可'
  },
  en: {
    name: 'Global project & procurement records', intro: 'Real sourced data. World Bank development projects are not necessarily construction sites; UK award notices are not open tenders.',
    search: 'Search name, country, project code or OCID', category: 'Source', all: 'All sources', worldbank: 'World Bank projects', uk: 'UK procurement / awards',
    focus: 'Prioritize engineering-like or active records', focusHelp: 'Engineering title signals are keyword matches, not verified construction classifications.',
    country: 'Country / territory', allCountries: 'All countries', count: 'Matching records', loading: 'Loading public-source records…',
    source: 'Primary source', date: 'Reported date', amount: 'Disclosed amount', status: 'Source status', details: 'View evidence and links',
    error: 'Source records unavailable. Demo data will not be substituted.', retry: 'Retry', noResults: 'No matching source records',
    more: 'Next', prev: 'Previous', back: 'Back to data directory', attribution: 'Sources & licenses', caveat: 'Important limitations',
    buyer: 'Buyer (source-declared)', supplier: 'Awarded supplier (source-declared)', awards: 'Award notices (not proof of signed contracts)',
    original: 'Open primary source', demo: 'View historical demo examples', sourceRecord: 'Source dossier', undisclosed: 'Not disclosed', noCoordinates: 'Exact job-site coordinates not verified; no map pin is displayed.',
    noLinks: 'No verified linked entities available.', unknown: 'Unknown', licensed: 'Source attribution included'
  },
  th: {
    name: 'ข้อมูลโครงการและการจัดซื้อจัดจ้างทั่วโลก', intro: 'ข้อมูลจากแหล่งจริง โครงการธนาคารโลกไม่จำเป็นต้องเป็นงานก่อสร้าง และประกาศผลจัดซื้อของอังกฤษไม่ใช่งานเปิดประมูล',
    search: 'ค้นหาชื่อโครงการ ประเทศ หรือเลขที่อ้างอิง', category: 'แหล่งข้อมูล', all: 'ทั้งหมด', worldbank: 'โครงการธนาคารโลก', uk: 'ข้อมูลจัดซื้ออังกฤษ',
    focus: 'เน้นโครงการที่เกี่ยวข้องกับวิศวกรรมหรือยังดำเนินอยู่', focusHelp: 'การระบุงานวิศวกรรมอ้างอิงเพียงคำสำคัญในชื่อ ไม่ใช่การตรวจสอบวิชาชีพ',
    country: 'ประเทศ', allCountries: 'ทุกประเทศ', count: 'รายการที่ตรงกัน', loading: 'กำลังโหลดข้อมูลจริง…',
    source: 'แหล่งข้อมูล', date: 'วันที่', amount: 'มูลค่าที่เปิดเผย', status: 'สถานะตามแหล่งข้อมูล', details: 'ดูหลักฐาน',
    error: 'ไม่สามารถโหลดข้อมูลจริงได้ จะไม่แทนที่ด้วยข้อมูลจำลอง', retry: 'ลองอีกครั้ง', noResults: 'ไม่พบข้อมูล',
    more: 'ถัดไป', prev: 'ก่อนหน้า', back: 'กลับสู่รายการ', attribution: 'แหล่งข้อมูลและใบอนุญาต', caveat: 'ข้อจำกัด',
    buyer: 'ผู้ซื้อ (ตามแหล่งข้อมูล)', supplier: 'ผู้รับรางวัล (ตามแหล่งข้อมูล)', awards: 'ข้อมูลผลการจัดซื้อ ไม่ใช่สัญญาที่ลงนามแล้ว',
    original: 'เปิดต้นฉบับ', demo: 'ดูตัวอย่างจำลอง', sourceRecord: 'ข้อมูลอ้างอิง', undisclosed: 'ไม่ระบุ', noCoordinates: 'ยังไม่ยืนยันพิกัดสถานที่โครงการ', noLinks: 'ไม่มีข้อมูลเชื่อมโยงที่ตรวจสอบแล้ว',
    unknown: 'ไม่ทราบ', licensed: 'ระบุแหล่งข้อมูล'
  }
};

function SourceLink({ url, children }) {
  if (typeof url !== 'string' || !url.startsWith('https://')) return null;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline break-all">{children}<ExternalLink className="w-3.5 h-3.5 shrink-0" /></a>;
}

function useCatalog() {
  const [result, setResult] = useState({ loading: true, data: null, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let live = true;
    setResult({ loading: true, data: null, error: null });
    loadAtlasCatalog().then(data => live && setResult({ loading: false, data, error: null }))
      .catch(error => live && setResult({ loading: false, data: null, error: String(error?.message || error) }));
    return () => { live = false; };
  }, [version]);
  return [result, () => setVersion(x => x + 1)];
}

function SourceState({ state, retry, labels }) {
  if (state.loading) return <div role="status" className="bg-surface rounded-xl p-7 border border-hairline text-ink-muted">{labels.loading}</div>;
  if (state.error) return <div role="alert" className="border border-amber-500/40 bg-surface rounded-xl p-6 space-y-3 text-ink">
    <div className="flex gap-2 items-start"><AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" /><span>{labels.error} ({state.error})</span></div>
    <button onClick={retry} className="rounded-lg border border-hairline px-3 py-2 text-sm">{labels.retry}</button>
  </div>;
  return null;
}

const PAGE_SIZE = 32;
export function AtlasProjectsPage() {
  const { locale } = useI18n();
  const l = UI[locale] || UI.en;
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const initialQuery = urlParams.get('q') || '';
  const [state, retry] = useCatalog();
  const [q, setQ] = useState(initialQuery);
  const [source, setSource] = useState('all');
  const [country, setCountry] = useState('');
  const [onlyFocus, setOnlyFocus] = useState(true);
  const [page, setPage] = useState(0);
  useEffect(() => { setQ(initialQuery); setPage(0); }, [initialQuery]);
  const catalog = state.data;
  const countryList = useMemo(() => [...new Set((catalog?.records || []).map(r => r.country).filter(Boolean))].sort(), [catalog]);
  const records = useMemo(() => {
    if (!catalog) return [];
    const query = q.trim().toLocaleLowerCase();
    return catalog.records.filter(r => {
      if (source === 'worldbank' && r.type !== 'world_bank_project') return false;
      if (source === 'uk' && r.type !== 'uk_procurement_notice') return false;
      if (country && r.country !== country) return false;
      if (onlyFocus && r.type === 'world_bank_project' && (!r.titleEngineeringSignal || r.status !== 'Active')) return false;
      return !query || [r.title, r.country, r.region, r.recordCode, r.ocid, r.classification?.description]
        .filter(Boolean).some(x => String(x).toLocaleLowerCase().includes(query));
    });
  }, [catalog, source, country, onlyFocus, q]);
  const lastPage = Math.max(0, Math.ceil(records.length / PAGE_SIZE) - 1);
  const safePage = Math.min(page, lastPage);
  const visible = records.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const reset = (setter, value) => { setter(value); setPage(0); };

  return <div className="min-w-0 w-full max-w-6xl mx-auto space-y-5 text-ink">
    <header className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-accent"><Database className="w-4 h-4" /> PROJECT ATLAS · LIVE-SOURCE SNAPSHOT</div>
      <h1 className="text-xl sm:text-2xl font-bold">{l.name}</h1>
      <p className="text-sm text-ink-muted leading-relaxed max-w-3xl">{l.intro}</p>
      {catalog && <div className="flex flex-wrap gap-2 text-xs text-ink-muted">
        <span className="rounded-md border border-hairline px-2 py-1">{catalog.manifest.totals.worldBank.toLocaleString()} · {l.worldbank}</span>
        <span className="rounded-md border border-hairline px-2 py-1">{catalog.manifest.totals.ukProcurements.toLocaleString()} · {l.uk}</span>
        <span className="rounded-md border border-hairline px-2 py-1">{l.licensed}</span>
      </div>}
    </header>
    <SourceState state={state} retry={retry} labels={l} />
    {catalog && <>
      <section className="bg-surface rounded-2xl border border-hairline p-4 sm:p-5 space-y-4" aria-label={l.category}>
        <div className="relative">
          <Search className="w-4 h-4 absolute top-3 left-3 text-ink-muted pointer-events-none" />
          <input value={q} onChange={e => reset(setQ, e.target.value)} aria-label={l.search} placeholder={l.search}
            className="w-full min-w-0 py-2.5 pl-10 pr-3 text-sm rounded-xl bg-surface-subtle border border-hairline focus:border-accent focus:outline-none" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs text-ink-muted space-y-1">{l.category}
            <select value={source} onChange={e => reset(setSource, e.target.value)} className="block w-full rounded-lg border border-hairline bg-surface-subtle px-3 py-2 text-sm text-ink">
              <option value="all">{l.all}</option><option value="worldbank">{l.worldbank}</option><option value="uk">{l.uk}</option>
            </select>
          </label>
          <label className="text-xs text-ink-muted space-y-1">{l.country}
            <select value={country} onChange={e => reset(setCountry, e.target.value)} className="block w-full rounded-lg border border-hairline bg-surface-subtle px-3 py-2 text-sm text-ink">
              <option value="">{l.allCountries}</option>{countryList.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <label className="flex gap-2 items-center text-sm cursor-pointer"><input type="checkbox" checked={onlyFocus} onChange={e => reset(setOnlyFocus, e.target.checked)} /><SlidersHorizontal className="w-4 h-4 text-ink-muted" />{l.focus}</label>
        <p className="text-xs text-ink-muted">{l.focusHelp}</p>
      </section>
      <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-ink-muted">
        <span><strong className="text-ink text-lg">{records.length.toLocaleString()}</strong> {l.count}</span>
        <span>{new Date(catalog.manifest.generatedAt).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'th' ? 'th-TH' : 'en-GB')}</span>
      </div>
      {records.length === 0 && <p className="text-ink-muted bg-surface rounded-xl border border-hairline p-6">{l.noResults}</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {visible.map(r => <button key={r.id} type="button" onClick={() => navigate(atlasRecordUrl(r.id))}
          className="w-full text-left min-w-0 bg-surface border border-hairline hover:border-accent rounded-xl p-4 space-y-2 transition-colors">
          <EngineeringVisual record={r} className="h-36 sm:h-40 mb-3" showCategory />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] px-2 py-1 rounded-md bg-surface-subtle text-ink-muted">{r.type === 'world_bank_project' ? l.worldbank : l.uk}</span>
            <span className="text-[11px] text-ink-muted">{r.country || l.unknown}</span>
          </div>
          <h2 className="font-semibold text-sm leading-snug break-words">{r.title}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
            <span>{l.status}: {r.status || l.unknown}</span>
            <span>{formatAtlasMoney(r.amount, locale)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs text-accent"><span>{r.source}</span><span>{l.details} →</span></div>
        </button>)}
      </div>
      {records.length > PAGE_SIZE && <nav className="flex items-center justify-center gap-4 p-3" aria-label="Pagination">
        <button className="border border-hairline rounded-lg px-3 py-2 text-sm disabled:opacity-40" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>{l.prev}</button>
        <span className="text-sm text-ink-muted">{safePage + 1} / {lastPage + 1}</span>
        <button className="border border-hairline rounded-lg px-3 py-2 text-sm disabled:opacity-40" disabled={safePage >= lastPage} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>{l.more}</button>
      </nav>}
      <footer className="text-xs text-ink-muted p-4 rounded-xl bg-surface border border-hairline space-y-2">
        <p className="font-semibold text-ink">{l.attribution}</p>
        {catalog.manifest.sourceLicenses.map(s => <p key={s.name}>{s.attribution} <SourceLink url={s.licenseUrl}>{s.license}</SourceLink></p>)}
        <p>{catalog.manifest.limits.join(' ')}</p>
        <button onClick={() => navigate('/projects/demo')} className="text-accent underline">{l.demo}</button>
      </footer>
    </>}
  </div>;
}

export function AtlasRecordPage() {
  const { locale } = useI18n();
  const l = UI[locale] || UI.en;
  const navigate = useNavigate();
  const { recordId } = useParams();
  const [state, retry] = useCatalog();
  const row = useMemo(() => state.data?.records.find(x => x.id === recordId), [state.data, recordId]);
  return <div className="min-w-0 max-w-4xl mx-auto space-y-5 text-ink">
    <button onClick={() => navigate('/projects')} className="inline-flex items-center gap-2 text-sm text-accent"><ArrowLeft className="w-4 h-4" />{l.back}</button>
    <SourceState state={state} retry={retry} labels={l} />
    {state.data && !row && <div className="p-5 rounded-lg border border-hairline">{l.noResults}</div>}
    {row && <>
      <header className="bg-surface p-5 sm:p-7 border border-hairline rounded-2xl space-y-3">
        <div className="text-xs text-ink-muted flex items-center gap-2"><FolderKanban className="w-4 h-4" />{l.sourceRecord} · {row.source}</div>
        <h1 className="text-xl sm:text-2xl font-bold leading-snug">{row.title}</h1>
        <EngineeringVisual record={row} className="h-44 sm:h-64" showCategory />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[ [l.country, row.country || l.unknown], [l.status, row.status || l.unknown], [l.amount, formatAtlasMoney(row.amount, locale)], [l.date, row.approvalDate || row.awards?.[0]?.date || l.undisclosed] ].map(([title,value]) =>
            <div key={title} className="rounded-lg bg-surface-subtle p-3"><div className="text-xs text-ink-muted">{title}</div><div className="font-medium mt-1 break-words">{value}</div></div>)}
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">{row.statusCaveat}</p>
        <p className="text-xs text-ink-muted">{l.noCoordinates}</p>
        {row.description && <p className="text-sm leading-relaxed whitespace-pre-line">{row.description}</p>}
        {row.classification?.description && <p className="text-sm text-ink-muted">CPV: {row.classification.id} · {row.classification.description}</p>}
        {row.recordCode && <p className="font-mono text-xs text-ink-muted">{row.recordCode}</p>}
        {row.ocid && <p className="font-mono text-xs text-ink-muted break-all">OCID: {row.ocid}</p>}
      </header>
      {row.type === 'uk_procurement_notice' && <section className="bg-surface rounded-2xl border border-hairline p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" />{l.buyer}</h2>
        {row.buyers?.length ? row.buyers.map(o => <div key={o.id} className="text-sm rounded-lg p-2 bg-surface-subtle">{o.name}<span className="ml-2 text-xs text-ink-muted">source-declared</span></div>) : <p className="text-xs text-ink-muted">{l.noLinks}</p>}
        <h2 className="font-semibold">{l.awards}</h2>
        {row.awards?.map(a => <div key={a.id} className="space-y-2 border border-hairline rounded-lg p-3">
          <div className="text-xs text-ink-muted">{a.date || l.undisclosed} · {a.status || l.unknown} · {formatAtlasMoney(a.value, locale)}</div>
          <div className="text-xs font-medium">{l.supplier}</div>
          {a.suppliers?.length ? a.suppliers.map(s => <p key={s.id} className="text-sm">{s.name} <span className="text-xs text-ink-muted">(source-declared)</span></p>) : <p className="text-xs text-ink-muted">{l.noLinks}</p>}
          <SourceLink url={a.sourceUrl}>{l.original}</SourceLink>
        </div>)}
      </section>}
      <section className="bg-surface rounded-2xl border border-hairline p-5 space-y-3 text-sm">
        <h2 className="font-semibold flex gap-2 items-center"><ShieldCheck className="w-4 h-4" />{l.attribution}</h2>
        <p className="text-ink-muted">{row.evidenceLevel} · {row.source}</p>
        <SourceLink url={row.sourceUrl}>{l.original}</SourceLink>
        {state.data.manifest.sourceLicenses.filter(s => s.name === row.source).map(s =>
          <p key={s.name} className="text-xs text-ink-muted">{s.attribution} <SourceLink url={s.licenseUrl}>{s.license}</SourceLink></p>)}
        <p className="text-xs text-ink-muted">{l.caveat}: {row.statusCaveat}</p>
      </section>
    </>}
  </div>;
}
