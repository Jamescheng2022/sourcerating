import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Search, Filter, Compass, ShieldCheck, 
  MapPin, ExternalLink, Calendar, Grid, Map as MapIcon, ChevronRight
} from 'lucide-react';
import { PROJECTS_LIST } from '../data/projectData';
import { EngineeringIllustration } from '../components/illustrations/EngineeringIllustration';
import { zh } from '../i18n/zh';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedProject } from '../i18n/projectsEn';

export function ProjectsPage({ onSelectEvidence }) {
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Filtered projects
  const filteredProjects = PROJECTS_LIST.filter(proj => {
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const localized = getLocalizedProject(proj, locale);
      const matchName = (localized.name || '').toLowerCase().includes(q) || proj.name.toLowerCase().includes(q);
      const matchCode = (proj.code || '').toLowerCase().includes(q);
      const matchSummary = (localized.summary || '').toLowerCase().includes(q) || proj.summary.toLowerCase().includes(q);
      const matchLoc = (localized.location || '').toLowerCase().includes(q) || proj.location.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchSummary && !matchLoc) {
        return false;
      }
    }

    // Sector
    if (sectorFilter !== 'all' && proj.sector !== sectorFilter) {
      return false;
    }

    // Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !proj.status.includes('在建') && !proj.status.includes('施工')) return false;
      if (statusFilter === 'completed' && !proj.status.includes('竣工') && !proj.status.includes('验收')) return false;
      if (statusFilter === 'bidding' && !proj.status.includes('招标') && !proj.status.includes('立项')) return false;
    }

    // Region
    if (regionFilter !== 'all' && proj.region !== regionFilter) {
      return false;
    }

    return true;
  });

  // Map project code to illustration template ID
  const projectIllustrationMap = {
    'P001': 'tpl-prj-01',
    'P002': 'tpl-prj-02',
    'P003': 'tpl-prj-03',
    'P004': 'tpl-prj-04',
    'P005': 'tpl-prj-05',
    'P006': 'tpl-prj-07',
    'P007': 'tpl-prj-08',
    'P008': 'tpl-prj-06',
  };

  const sectorOptions = isZh ? [
    { id: 'all', label: '全部行业' },
    { id: '工业建筑', label: '工业建筑' },
    { id: '土木市政', label: '土木市政' },
    { id: '动力机电', label: '动力机电' },
    { id: '新能源工程', label: '新能源工程' },
    { id: '港口航道', label: '港口航道' }
  ] : [
    { id: 'all', label: 'All Sectors' },
    { id: '工业建筑', label: 'Industrial Facilities' },
    { id: '土木市政', label: 'Civil Infrastructure' },
    { id: '动力机电', label: 'MEP Systems' },
    { id: '新能源工程', label: 'Renewables & Energy' },
    { id: '港口航道', label: 'Harbor & Marine' }
  ];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 font-sans text-ink">
      {/* 1. Header Banner */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 text-ink shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded font-bold">
                PROJECT DATABASE
              </span>
              <span className="text-xs text-ink-muted font-mono">
                {isZh ? '8 个示范工程条目 (DEMO) · 方案 A 视觉' : '8 Model Engineering Projects (DEMO)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-ink">
              {dict.projects?.title || zh.projects.title}
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">
              {dict.projects?.subtitle || '全过程记录立项、规划、招投标、施工履约至验收交付之全生命周期事实链。'}
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-hairline shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>{dict.projects?.viewModeList || zh.projects.viewModeList}</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>{dict.projects?.viewModeMap || zh.projects.viewModeMap}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="pt-2 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isZh ? '全局检索项目名称、标段、编号 (如 P001, 洁净车间)...' : 'Search project name, bid, code (e.g. P001, Cleanroom)...'}
              className="w-full bg-surface-subtle border border-hairline focus:border-accent rounded-xl pl-10 pr-4 py-2 text-xs text-ink placeholder-ink-muted focus:outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sector Filter */}
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-surface-subtle border border-hairline text-ink text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
            >
              {sectorOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-subtle border border-hairline text-ink text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
            >
              <option value="all">{isZh ? '全部阶段' : 'All Phases'}</option>
              <option value="active">{isZh ? '在建施工中' : 'Under Construction'}</option>
              <option value="completed">{isZh ? '已验收/已竣工' : 'Completed / Delivered'}</option>
              <option value="bidding">{isZh ? '招投标/规划中' : 'Tendering / Mobilizing'}</option>
            </select>

            {/* Region Filter */}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-surface-subtle border border-hairline text-ink text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-accent"
            >
              <option value="all">{isZh ? '全部区域' : 'All Regions'}</option>
              <option value="华东">{isZh ? '华东区域' : 'East China'}</option>
              <option value="华中">{isZh ? '华中区域' : 'Central China'}</option>
              <option value="华北">{isZh ? '华北区域' : 'North China'}</option>
              <option value="华南">{isZh ? '华南区域' : 'South China'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Projects Grid / Map */}
      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((proj) => {
            const localizedProj = getLocalizedProject(proj, locale);
            const isP001 = proj.code === 'P001';
            const tplId = projectIllustrationMap[proj.code] || 'tpl-prj-01';

            return (
              <div
                key={proj.id}
                onClick={() => navigate(isP001 ? '/projects/p001' : `/projects/${proj.code.toLowerCase()}`)}
                className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 cursor-pointer hover:border-accent transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                        {proj.code}
                      </span>
                      <span className="text-ink-muted font-medium">
                        {localizedProj.sector || proj.sector}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-subtle text-ink-muted border border-hairline font-mono">
                      {localizedProj.status || proj.status}
                    </span>
                  </div>

                  {/* Thumbnail Illustration */}
                  <div className="rounded-xl overflow-hidden border border-hairline">
                    <EngineeringIllustration
                      templateId={tplId}
                      showBadge={true}
                      showMetaBar={false}
                      className="group-hover:scale-[1.01] transition-transform"
                    />
                  </div>

                  {/* Project Title */}
                  <h2 className="text-sm sm:text-base font-bold text-ink group-hover:text-accent transition-colors leading-snug">
                    {localizedProj.name}
                  </h2>

                  {/* Summary */}
                  <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {localizedProj.summary}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="pt-3 border-t border-hairline space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-ink-faint block">{isZh ? '投资规模' : 'Investment Scale'}</span>
                      <span className="font-mono text-ink font-semibold">{localizedProj.investmentScale}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint block">{isZh ? '建筑体量 / 规模' : 'Floor Area'}</span>
                      <span className="font-mono text-ink font-semibold">{localizedProj.grossFloorArea}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint block">{isZh ? '地理区位' : 'Region'}</span>
                      <span className="text-ink-muted font-medium truncate block">{localizedProj.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-ink-faint block">{isZh ? '存证核验完整度' : 'Audit Score'}</span>
                      <span className="font-mono text-accent font-bold">{localizedProj.verificationScore}</span>
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="pt-2 flex items-center justify-between text-xs text-ink-muted">
                    <span className="text-[11px] font-mono text-ink-faint">
                      {dict.common?.lastUpdated || (isZh ? '最后修订:' : 'Updated:')} {proj.lastUpdated}
                    </span>
                    <span className="text-accent font-bold group-hover:underline flex items-center gap-0.5">
                      {isP001 
                        ? (isZh ? '查阅示范核心项目 →' : 'Explore Model Wiki →') 
                        : (isZh ? '查阅工程条目 →' : 'View Project Dossier →')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Schematic Map View */
        <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 text-ink space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>{isZh ? '工程项目网格地理分布图 (MOCK SCHEMATIC MAP)' : 'Geospatial Grid Schematic Map (MOCK MAP)'}</span>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {isZh 
                  ? '基于假定基准坐标网格渲染示意分布，不产生任何商业外部地图瓦片请求。'
                  : 'Schematic coordinate distribution for demonstration; zero commercial external tile requests.'}
              </p>
            </div>
            <span className="text-xs text-accent font-mono">
              {isZh ? `已定位 ${filteredProjects.length} / 8 个工程` : `Mapped ${filteredProjects.length} / 8 projects`}
            </span>
          </div>

          <div className="relative w-full h-[380px] bg-surface-subtle rounded-xl border border-hairline overflow-hidden select-none p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
              {filteredProjects.map(p => {
                const localized = getLocalizedProject(p, locale);
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(p.code === 'P001' ? '/projects/p001' : `/projects/${p.code.toLowerCase()}`)}
                    className="p-3 rounded-xl bg-surface border border-hairline flex flex-col justify-between hover:border-accent cursor-pointer transition-all"
                  >
                    <div className="space-y-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        {p.code}
                      </span>
                      <div className="font-bold text-xs text-ink line-clamp-2 mt-1">{localized.name}</div>
                    </div>
                    <div className="text-[10px] text-ink-muted font-mono">{p.coordinates}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
