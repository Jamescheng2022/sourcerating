import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, Sparkles, Filter, Building2, User, FolderKanban, 
  FileText, ArrowRight, X, AlertCircle, Database, CheckCircle2
} from 'lucide-react';
import { PROJECTS_LIST, COMPANIES_LIST, PEOPLE_LIST, PROJECT_DATA, getProjectById } from '../data/projectData';
import { canonicalEntity } from '../data/canonicalEntities';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedProject } from '../i18n/projectsEn';
import { getLocalizedCompany, getLocalizedPerson } from '../i18n/entitiesEn';
import { getLocalizedPost } from '../i18n/postsEn';

export function SearchPage({ posts = [] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const queryParam = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(queryParam);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'post' | 'project' | 'company' | 'person'

  useEffect(() => {
    setInputValue(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const site = isZh ? '工程行业网络' : isTh ? 'Project Atlas เครือข่ายวิศวกรรม' : 'Project Atlas';
    document.title = queryParam 
      ? `${queryParam} · ${isZh ? '全域检索 (Mock)' : isTh ? 'ผลการค้นหา (Mock)' : 'Search Results (Mock)'} · ${site}`
      : `${isZh ? '全域检索 (Mock)' : isTh ? 'ค้นหา (Mock)' : 'Unified Search (Mock)'} · ${site}`;
  }, [queryParam, isZh, isTh]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = inputValue.trim();
    setSearchParams(q ? { q } : {});
  };

  const handleClear = () => {
    setInputValue('');
    setSearchParams({});
  };

  // Perform search across all 4 entity classes
  const searchResults = useMemo(() => {
    const q = queryParam.trim().toLowerCase();
    if (!q) {
      return { all: [], post: [], project: [], company: [], person: [] };
    }

    // 1. Posts (from live resident state and base data)
    const allPosts = posts && posts.length > 0 ? posts : (PROJECT_DATA.posts || []);
    const matchedPosts = allPosts.map(post => {
      const locPost = getLocalizedPost(post, locale) || post;
      const title = locPost.title || post.title || '';
      const content = locPost.content || post.content || '';
      const authorName = locPost.authorName || post.authorName || '';
      const authorTitle = locPost.authorTitle || post.authorTitle || '';
      const projectName = locPost.projectName || post.projectName || '';
      const searchable = [
        post.id, title, content, authorName, authorTitle, projectName,
        post.category, post.tags ? post.tags.join(' ') : ''
      ].join(' ').toLowerCase();

      if (!searchable.includes(q)) return null;

      return {
        id: post.id,
        type: 'post',
        title: title || (isZh ? '工程动态' : 'Engineering Update'),
        subtitle: `${authorName} · ${authorTitle}`,
        snippet: content.length > 120 ? content.slice(0, 120) + '...' : content,
        route: `/feed?post=${post.id}`,
        badge: isZh ? '动态' : isTh ? 'โพสต์' : 'Post',
        badgeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      };
    }).filter(Boolean);

    // 2. Projects
    const matchedProjects = PROJECTS_LIST.map(proj => {
      const locProj = getLocalizedProject(proj, locale) || proj;
      const name = locProj.name || proj.name || '';
      const nameEn = proj.nameEn || '';
      const code = proj.code || proj.id || '';
      const desc = locProj.description || proj.description || '';
      const location = locProj.location || proj.location || '';
      const client = locProj.client || proj.client || '';
      const searchable = [
        proj.id, code, name, nameEn, desc, location, client, proj.type, proj.currentPhase
      ].join(' ').toLowerCase();

      if (!searchable.includes(q)) return null;

      return {
        id: proj.id,
        type: 'project',
        title: `${code}: ${name}`,
        subtitle: `${location} · ${client}`,
        snippet: desc.length > 120 ? desc.slice(0, 120) + '...' : desc,
        route: `/projects/${code.toLowerCase()}`,
        badge: isZh ? '工程项目' : isTh ? 'โครงการ' : 'Project',
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
      };
    }).filter(Boolean);

    // 3. Companies / Contractors
    const matchedCompanies = COMPANIES_LIST.map(comp => {
      const locComp = getLocalizedCompany(comp, locale) || comp;
      const name = locComp.name || comp.name || '';
      const fullName = locComp.fullName || comp.fullName || '';
      const specialty = locComp.specialty || comp.specialty || '';
      const desc = locComp.description || comp.description || '';
      const searchable = [
        comp.id, comp.slug, name, fullName, specialty, desc, comp.tier, comp.certs ? comp.certs.join(' ') : ''
      ].join(' ').toLowerCase();

      if (!searchable.includes(q)) return null;

      return {
        id: comp.id,
        type: 'company',
        title: name,
        subtitle: fullName || specialty,
        snippet: specialty ? `${isZh ? '专业资质 / 特长: ' : 'Specialty: '}${specialty}` : desc,
        route: `/companies/${comp.id.toLowerCase()}`,
        badge: isZh ? '参建企业' : isTh ? 'องค์กร' : 'Company',
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
      };
    }).filter(Boolean);

    // 4. People / Engineers
    const matchedPeople = PEOPLE_LIST.map(person => {
      const locPerson = getLocalizedPerson(person, locale) || person;
      const name = locPerson.name || person.name || '';
      const title = locPerson.title || person.title || '';
      const discipline = locPerson.discipline || person.discipline || '';
      const bio = locPerson.bio || person.bio || '';
      const searchable = [
        person.id, person.slug, name, title, discipline, bio, person.company, person.experience
      ].join(' ').toLowerCase();

      if (!searchable.includes(q)) return null;

      return {
        id: person.id,
        type: 'person',
        title: name,
        subtitle: `${title} · ${discipline || person.company || ''}`,
        snippet: bio ? (bio.length > 120 ? bio.slice(0, 120) + '...' : bio) : title,
        route: `/people/${person.id.toLowerCase()}`,
        badge: isZh ? '执业专家' : isTh ? 'ผู้เชี่ยวชาญ' : 'Person',
        badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
      };
    }).filter(Boolean);

    const all = [...matchedPosts, ...matchedProjects, ...matchedCompanies, ...matchedPeople];

    return {
      all,
      post: matchedPosts,
      project: matchedProjects,
      company: matchedCompanies,
      person: matchedPeople
    };
  }, [queryParam, posts, locale, isZh, isTh]);

  const activeResults = searchResults[activeTab] || [];
  const totalCount = searchResults.all.length;

  return (
    <div className="w-full max-w-5xl mx-auto p-3 sm:p-6 space-y-5 animate-fadeIn text-ink">
      {/* 1. Header & Search Input Box */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
                {isZh ? '全域检索 (统一搜索)' : isTh ? 'ค้นหาแบบรวม (Unified Search)' : 'Unified Search'}
              </h1>
              <div className="text-[11px] text-ink-muted">
                {isZh ? '检索动态、项目百科、参建企业与执业专家' : 'Search across posts, projects, companies, and licensed engineers'}
              </div>
            </div>
          </div>

          {/* Prominent MOCK indicator pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-mono text-[11px] font-bold self-start sm:self-auto">
            <Database className="w-3.5 h-3.5" />
            <span>{isZh ? 'MOCK DEMO DATASET · 原型模拟库' : isTh ? 'MOCK DEMO DATASET · ชุดข้อมูลจำลอง' : 'MOCK DEMO DATASET · LOCAL_SANDBOX'}</span>
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isZh ? '输入关键词检索（如：Bangkok、steel、Demo Organization B、P001...）' : isTh ? 'ค้นหาด้วยคำสำคัญ (เช่น Bangkok, steel, Demo Organization B, P001...)' : 'Search keywords (e.g., Bangkok, steel, Demo Organization B, P001...)'}
              className="w-full bg-surface-subtle text-xs sm:text-sm text-ink placeholder-ink-muted pl-9 pr-9 py-2 rounded-xl border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink rounded-lg"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
          >
            {isZh ? '搜索' : isTh ? 'ค้นหา' : 'Search'}
          </button>
        </form>

        {/* Query Suggestion Pills */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-muted">
          <span className="font-semibold">{isZh ? '建议检索词:' : 'Suggestions:'}</span>
          {[
            { label: 'Bangkok', q: 'Bangkok' },
            { label: 'steel', q: 'steel' },
            { label: 'Demo Organization B', q: 'Demo Organization B' },
            { label: 'DEMO P001', q: 'P001' },
            { label: isZh ? '洁净室' : 'cleanroom', q: 'cleanroom' }
          ].map(s => (
            <button
              key={s.label}
              type="button"
              onClick={() => {
                setInputValue(s.q);
                setSearchParams({ q: s.q });
              }}
              className="px-2 py-0.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-hairline text-ink transition-colors font-mono"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Tabs Row (when query exists) */}
      {queryParam && (
        <div className="flex items-center justify-between border-b border-hairline pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'all', label: isZh ? '全部' : isTh ? 'ทั้งหมด' : 'All', count: searchResults.all.length },
              { id: 'post', label: isZh ? '动态' : isTh ? 'โพสต์' : 'Posts', count: searchResults.post.length },
              { id: 'project', label: isZh ? '项目' : isTh ? 'โครงการ' : 'Projects', count: searchResults.project.length },
              { id: 'company', label: isZh ? '企业' : isTh ? 'องค์กร' : 'Companies', count: searchResults.company.length },
              { id: 'person', label: isZh ? '人员' : isTh ? 'บุคคล' : 'People', count: searchResults.person.length },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-subtle'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.id ? 'bg-black/20 text-white' : 'bg-surface-subtle border border-hairline'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <span className="text-xs text-ink-muted">
            {isZh 
              ? `共检索到 ${totalCount} 条结果` 
              : isTh 
              ? `พบ ${totalCount} รายการ` 
              : `${totalCount} results found`}
          </span>
        </div>
      )}

      {/* 3. Results List / Honest Empty State */}
      {!queryParam ? (
        /* Zero state before any query */
        <div className="p-8 sm:p-12 text-center bg-surface border border-dashed border-hairline rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-hairline text-accent flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-ink">
              {isZh ? '请输入关键词开始全域检索' : isTh ? 'ป้อนคำสำคัญเพื่อเริ่มต้นค้นหา' : 'Enter keywords to search the engineering network'}
            </h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              {isZh 
                ? '支持统一检索动态更新、工程项目百科、参建企业与执业专家。检索范围严格限于本地模拟演示数据。' 
                : 'Search across posts, project wikis, contractors, and engineers within the local mock demonstration dataset.'}
            </p>
          </div>
        </div>
      ) : activeResults.length === 0 ? (
        /* Honest Empty State for queries that match nothing */
        <div className="p-8 sm:p-12 text-center bg-surface border border-hairline rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-ink">
              {isZh 
                ? `未检索到关于 "${queryParam}" 的匹配结果` 
                : isTh 
                ? `ไม่พบผลการค้นหาสำหรับ "${queryParam}"` 
                : `No matching records found for "${queryParam}"`}
            </h3>
            <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
              {isZh 
                ? '已检索本地模拟库中的动态、工程项目、参建企业与执业专家，无相关记录。系统绝不捏造虚假结果。您可以尝试检索 "Bangkok"、"steel"、"Demo Organization B" 或 "P001"。' 
                : isTh 
                ? 'ระบบค้นหาในฐานข้อมูลจำลอง (โพสต์ โครงการ องค์กร บุคคล) ไม่พบข้อมูลที่ตรงกัน ไม่มีการสร้างข้อมูลปลอมขึ้นมา แนะนำให้ลองค้นหา "Bangkok", "steel", "Demo Organization B" หรือ "P001"' 
                : 'Searched across all mock posts, projects, companies, and people without match. Honest empty state: no fake results are fabricated. Try searching for "Bangkok", "steel", "Demo Organization B", or "P001".'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 rounded-xl border border-hairline bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-ink"
          >
            {isZh ? '清空搜索词' : 'Clear Query'}
          </button>
        </div>
      ) : (
        /* Result Items */
        <div className="space-y-3">
          {activeResults.map(item => {
            const Icon = item.type === 'project' 
              ? FolderKanban 
              : item.type === 'company' 
              ? Building2 
              : item.type === 'person' 
              ? User 
              : FileText;

            return (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => navigate(item.route)}
                className="p-4 bg-surface border border-hairline hover:border-accent rounded-2xl shadow-xs hover:shadow-md transition-all cursor-pointer group select-none space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-surface-subtle border border-hairline flex items-center justify-center shrink-0 mt-0.5 text-accent group-hover:scale-105 transition-transform">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] font-bold ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                        <span className="font-mono text-[10px] text-ink-faint">
                          {item.id}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-ink group-hover:text-accent transition-colors truncate">
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className="text-xs text-ink-muted truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                </div>

                {item.snippet && (
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 pl-12">
                    {item.snippet}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
