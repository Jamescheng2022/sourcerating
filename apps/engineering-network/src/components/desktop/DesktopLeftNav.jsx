import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, FolderKanban, Sparkles, Building2, UserCheck, 
  BookOpen, Users, ChevronRight, ChevronLeft, Globe, Search
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

export function DesktopLeftNav({ currentScheme, onSwitchScheme, activeTab, onSelectTab }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return true;
    }
    return false;
  });
  const { locale, localeMode, setLocaleMode, dict } = useI18n();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { 
      id: 'feed', 
      path: '/feed', 
      label: dict.nav?.feed || '首页动态 Feed', 
      icon: Home, 
      count: locale === 'zh' ? '最新' : 'Live' 
    },
    { 
      id: 'search', 
      path: '/search', 
      label: locale === 'zh' ? '全域检索 (Mock)' : locale === 'th' ? 'ค้นหาแบบรวม (Mock)' : 'Search (Mock)', 
      icon: Search, 
      count: 'Mock' 
    },
    { 
      id: 'network', 
      path: '/network', 
      label: dict.nav?.network || '工程人脉与网络', 
      icon: Users, 
      count: locale === 'zh' ? '人脉' : 'Net' 
    },
    { 
      id: 'projects', 
      path: '/projects', 
      label: dict.nav?.projects || '工程项目发现', 
      icon: FolderKanban, 
      count: '8' 
    },
    { 
      id: 'p001', 
      path: '/projects/p001', 
      label: dict.nav?.p001 || 'Project Atlas 档案', 
      icon: BookOpen, 
      count: 'P001' 
    },
    { 
      id: 'nearby', 
      path: '/nearby', 
      label: locale === 'zh' ? '管辖区招采存证 (Nearby)' : locale === 'th' ? 'ข้อมูลจัดซื้อจัดจ้างใกล้เคียง (Nearby)' : 'Nearby Procurement', 
      icon: Globe, 
      count: 'BMA' 
    },
    { 
      id: 'discover', 
      path: '/discover', 
      label: dict.nav?.discover || '全局关系图谱 (AI)', 
      icon: Sparkles, 
      count: locale === 'zh' ? '语义' : 'AI' 
    },
  ];

  if (isCollapsed) {
    return (
      <aside aria-label="Desktop primary navigation" className="w-16 shrink-0 bg-surface text-ink-muted border-r border-hairline p-2 hidden md:flex flex-col justify-between items-center select-none transition-all duration-200">
        <div className="w-full flex flex-col items-center space-y-4">
          {/* Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 rounded-xl bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-accent flex items-center justify-center transition-colors border border-hairline focus:outline-none focus:ring-1 focus:ring-accent"
            title={locale === 'zh' ? '展开侧边栏导航' : 'Expand sidebar'}
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Quick P001 Icon */}
          <button
            type="button"
            onClick={() => navigate('/projects/p001')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              path.includes('/projects/p001')
                ? 'bg-accent text-white font-bold shadow-xs'
                : 'bg-surface-subtle text-accent hover:bg-surface-hover border border-hairline'
            }`}
            title="DEMO P001 Wiki"
            aria-label="DEMO P001 Wiki"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Nav Icons */}
          <nav className="w-full space-y-2 flex flex-col items-center pt-2 border-t border-hairline">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = path === item.path || (item.id === 'p001' && path.includes('/projects/p001'));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-accent text-white font-bold shadow-xs'
                      : 'text-ink-muted hover:text-accent hover:bg-surface-subtle'
                  }`}
                  title={`${item.label} (${item.count})`}
                  aria-label={item.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Compact Lang Switcher */}
        <div className="w-full flex flex-col items-center pt-3 border-t border-hairline space-y-1">
          <button
            type="button"
            onClick={() => setLocaleMode(locale === 'en' ? 'zh' : 'en')}
            className="w-10 h-8 rounded-lg bg-surface-subtle hover:bg-surface-hover text-accent font-mono text-[10px] font-bold flex items-center justify-center border border-hairline"
            title={`Switch to ${locale === 'en' ? 'Chinese' : 'English'}`}
          >
            {locale.toUpperCase()}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Desktop primary navigation" className="w-60 shrink-0 bg-surface text-ink-muted border-r border-hairline p-4 hidden md:flex flex-col justify-between select-none transition-all duration-200">
      <div className="space-y-5">
        {/* Header Bar with Collapse Button */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted">
            {locale === 'zh' ? '平台导航 (Nav)' : 'PLATFORM NAVIGATION'}
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg hover:bg-surface-subtle text-ink-muted hover:text-accent transition-colors"
            title={locale === 'zh' ? '收起导航栏' : 'Collapse navigation'}
            aria-label="Collapse navigation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Core Prototype Page Section */}
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-faint mb-2 px-1">
            {locale === 'zh' ? 'Project Atlas 示范档案 (DEMO P001)' : 'Core Project Dossier (DEMO P001)'}
          </div>
          <button 
            type="button"
            onClick={() => navigate('/projects/p001')}
            className="w-full text-left bg-surface-subtle hover:bg-surface-hover border border-hairline rounded-xl p-3 space-y-2 cursor-pointer transition-colors group focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-accent">DEMO P001</span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded font-medium">
                {locale === 'zh' ? '示范厂房' : 'Smart Fab'}
              </span>
            </div>
            <div className="text-xs font-semibold text-ink line-clamp-1 group-hover:text-accent transition-colors">
              {locale === 'zh' ? '智能高端装备制造基地' : 'Smart High-End Fab Base'}
            </div>
            <div className="text-[11px] text-ink-muted">
              {locale === 'zh' ? '动态 · 参与方 · 时间轴 · 百科与证据' : 'Feed · OBS/WBS · Timeline · Audit'}
            </div>
          </button>
        </div>

        {/* Global Navigation Links */}
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-ink-faint mb-2 px-1">
            {locale === 'zh' ? '平台功能导航 (Routes)' : 'PORTAL ROUTES'}
          </div>
          <nav className="space-y-1 text-xs">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = path === item.path || (item.id === 'p001' && path.includes('/projects/p001'));
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-white font-bold shadow-xs'
                      : 'text-ink-muted hover:text-accent hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-ink-muted'}`} />
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-black/20 text-white' : 'bg-surface-subtle text-ink-muted'
                  }`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Switcher Card */}
      <div className="p-3 bg-surface-subtle rounded-xl border border-hairline space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-muted font-semibold text-[11px]">
            {locale === 'zh' ? '方案对比模式' : 'Scheme Comparison'}
          </span>
          <span className="font-mono text-[10px] text-accent bg-accent/10 px-1 rounded">
            {currentScheme === 'a' ? 'Scheme A' : 'V4.1 Light'}
          </span>
        </div>
        <p className="text-[11px] text-ink-muted leading-tight">
          {locale === 'zh' 
            ? 'V4.1 遵循 Owner 指示：国际化语言切换 + 社交化工程作品集 + 杂志化排版。'
            : 'V4.1: Multilingual i18n, social engineering portfolio, layout speaking.'}
        </p>
        <button
          type="button"
          onClick={() => onSwitchScheme(currentScheme === 'a' ? 'v2' : 'a')}
          className="w-full py-1.5 px-2 bg-surface hover:bg-surface-hover rounded-lg text-xs font-semibold text-ink hover:text-accent transition-colors border border-hairline"
        >
          {currentScheme === 'a' 
            ? (locale === 'zh' ? '切回 V4.1 动态流' : 'Back to V4.1 Feed') 
            : (locale === 'zh' ? '对照原方案 A (#/a)' : 'Compare Scheme A (#/a)')}
        </button>
      </div>
    </aside>
  );
}

export default DesktopLeftNav;
