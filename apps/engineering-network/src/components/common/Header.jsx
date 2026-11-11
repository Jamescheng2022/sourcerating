import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Search, HardHat, PlusCircle, Bell, UserCheck, 
  Menu, X, Sparkles, FolderKanban, Users, Building2, BookOpen,
  Sun, Moon, Globe, Check
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { resolveAuthorProfile } from '../../data/projectData';

export function Header({ 
  currentScheme, 
  onSwitchScheme,
  onOpenCompose,
  onOpenNotifications,
  onOpenLogin,
  activeRole = 'ENG-01'
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, localeMode, setLocaleMode, dict, t, hasUrlOverride } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const langMenuRef = useRef(null);

  // Theme state: 'light' | 'dark'
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('atlas_theme_mode');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  });

  const handleToggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    try {
      localStorage.setItem('atlas_theme_mode', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (e) {}
  };

  // Close lang menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile search on Escape
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileSearchOpen]);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim();
    navigate(`/projects?q=${encodeURIComponent(q)}`);
  };

  const currentLangLabel = localeMode === 'auto'
    ? `Auto (${locale.toUpperCase()})`
    : locale.toUpperCase();

  const activeProfile = resolveAuthorProfile(activeRole, locale);
  const roleDisplayLabel = activeRole === 'GUEST'
    ? (isZh ? '访客' : isTh ? 'ผู้สังเกตการณ์' : 'Guest')
    : activeRole === 'ORG-A'
    ? (isZh ? 'Demo Org A 业主' : isTh ? 'Demo Org A' : 'Demo Org A')
    : (isZh ? 'Demo 建造师 01' : isTh ? 'Demo Engineer 01' : 'Demo Eng 01');

  return (
    <header className="bg-surface text-ink border-b border-hairline sticky top-0 z-30 w-full select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6">
        <div className="flex items-center justify-between h-11 sm:h-14 gap-1.5 sm:gap-4 relative">
          {/* 1. Logo & Brand */}
          <button 
            type="button"
            onClick={() => navigate('/feed')}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-left cursor-pointer group focus:outline-none focus:ring-1 focus:ring-accent rounded-lg p-0.5"
            title={locale === 'zh' ? '返回首页 Feed' : 'Back to Home Feed'}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <HardHat className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs sm:text-sm leading-tight tracking-tight text-ink flex items-center gap-1">
                <span className="truncate">
                  {locale === 'zh' ? 'SourceRating 工程人脉' : 'SourceRating Network'}
                </span>
                <span className="text-[9px] font-mono font-semibold text-accent bg-accent/10 border border-accent/30 rounded px-1 shrink-0">
                  V4.2
                </span>
              </span>
              <span className="text-[10px] text-ink-muted hidden lg:inline">
                {dict.common?.siteTagline || 'Engineering Network · Editorial Edition'}
              </span>
            </div>
          </button>

          {/* 2. Desktop & Tablet Inline Search Bar (>= sm) */}
          <form 
            onSubmit={handleSearchSubmit}
            className="hidden sm:block flex-1 max-w-md mx-2 relative min-w-0"
          >
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder={isZh ? '搜索真实项目和采购记录...' : isTh ? 'ค้นหาโครงการและข้อมูลจัดซื้อ...' : 'Search public projects and procurement records...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-subtle text-xs text-ink placeholder-ink-muted pl-8 pr-3 py-1 sm:py-1.5 rounded-full border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              />
            </div>
          </form>

          {/* 3. Header Action Buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Mobile Icon-Only Search Trigger (< sm) */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="sm:hidden p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline transition-colors"
              title={isZh ? "打开搜索" : isTh ? "เปิดการค้นหา" : "Open Search"}
              aria-label={isZh ? "打开搜索" : isTh ? "เปิดการค้นหา" : "Open Search"}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Quick Compose Button (Desktop & Tablet md+ >=768px) */}
            <button
              type="button"
              onClick={onOpenCompose}
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs shadow-xs transition-colors"
              title={dict.common?.composeFull || '发布工程动态 (Mock)'}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{dict.common?.compose || '发动态'}</span>
            </button>

            {/* Language Switcher Dropdown (Accessible on all screens 320/390/696/1440) */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink border border-hairline text-xs font-semibold transition-colors"
                title={dict.lang?.label || '选择界面语言'}
                aria-label="Language Selector"
                aria-expanded={langMenuOpen}
              >
                <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="font-mono text-[11px] font-bold">{currentLangLabel}</span>
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-surface border border-hairline rounded-xl shadow-xl z-50 p-1 text-xs space-y-0.5 animate-fadeIn">
                  <div className="px-2 py-1 text-[10px] font-bold text-ink-faint uppercase tracking-wider border-b border-hairline">
                    {dict.lang?.label || 'Language / 语言'}
                    {hasUrlOverride && (
                      <span className="text-accent ml-1 lowercase font-mono">(?lang active)</span>
                    )}
                  </div>
                  {[
                    { id: 'auto', label: dict.lang?.auto || 'Auto (自动)' },
                    { id: 'en', label: 'English (US)' },
                    { id: 'zh', label: '中文 (简体)' },
                    { id: 'th', label: 'ไทย (Thai)' },
                  ].map((item) => {
                    const isSelected = localeMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setLocaleMode(item.id);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors text-xs font-medium ${
                          isSelected 
                            ? 'bg-accent/10 text-accent font-bold' 
                            : 'hover:bg-surface-hover text-ink'
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="p-1.5 sm:p-2 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline transition-colors"
              title={themeMode === 'dark' ? (isZh ? '切换为浅色明亮模式' : isTh ? 'สลับเป็นโหมดสว่าง' : 'Switch to Light Mode') : (isZh ? '切换为深色模式' : isTh ? 'สลับเป็นโหมดมืด' : 'Switch to Dark Mode')}
              aria-label={isZh ? '切换明暗色彩主题' : isTh ? 'สลับชุดสีธีมสว่าง/มืด' : 'Toggle Color Theme'}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ink-muted" />
              )}
            </button>

            {/* Notifications Bell */}
            <button
              type="button"
              onClick={onOpenNotifications}
              className="p-1.5 sm:p-2 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline transition-colors relative"
              title={dict.nav?.notifications || '打开消息通知'}
              aria-label={dict.nav?.notifications || '消息通知'}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent"></span>
            </button>

            {/* Login / Persona Switcher */}
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover text-ink border border-hairline text-xs font-medium transition-colors"
              title={locale === 'zh' ? `当前演示身份: ${roleDisplayLabel} (点击切换)` : `Active Persona: ${roleDisplayLabel} (Click to switch)`}
              aria-label={locale === 'zh' ? '切换演示身份 / 登录' : 'Switch Persona / Login'}
            >
              <UserCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="hidden sm:inline font-semibold">
                {roleDisplayLabel}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover md:hidden border border-hairline"
              aria-label={isZh ? "打开快速导航菜单" : isTh ? "เปิดเมนูนำทางด่วน" : "Open Quick Navigation Menu"}
            >
              {mobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 4. Full Mobile Search Overlay Affordance (< sm) */}
          {mobileSearchOpen && (
            <div className="sm:hidden absolute inset-0 bg-surface z-40 px-2.5 flex items-center gap-1.5 animate-fadeIn">
              <form 
                onSubmit={(e) => {
                  handleSearchSubmit(e);
                  setMobileSearchOpen(false);
                }}
                className="flex-1 flex items-center gap-1.5 min-w-0"
              >
                <div className="relative flex-1 min-w-0 flex items-center">
                  <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={isZh ? '搜索真实项目和采购记录...' : isTh ? 'ค้นหาโครงการและข้อมูลจัดซื้อ...' : 'Search public projects and procurement records...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full bg-surface-subtle text-xs text-ink placeholder-ink-muted pl-8 pr-7 py-1.5 rounded-full border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 p-0.5 text-ink-muted hover:text-ink"
                      aria-label={isZh ? '清空搜索词' : isTh ? 'ล้างการค้นหา' : 'Clear search'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-2.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white font-semibold text-xs shrink-0"
                >
                  {dict.common?.filter || '搜索'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors shrink-0"
                aria-label={isZh ? '关闭搜索' : isTh ? 'ปิดการค้นหา' : 'Close search'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-subtle border-b border-hairline px-3 py-2.5 text-xs space-y-2.5 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted font-semibold uppercase tracking-wider text-[10px]">
              {locale === 'zh' ? '快速导航与项目档案' : 'Quick Navigation'}
            </span>
            <div className="flex items-center gap-1">
              {['en', 'zh', 'th'].map(l => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocaleMode(l)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    locale === l ? 'bg-accent text-white' : 'bg-surface text-ink border border-hairline'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                navigate('/feed');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{dict.nav?.feed || '首页动态 Feed'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/projects');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-accent" />
              <span>{isZh ? '真实项目与采购搜索' : isTh ? 'ค้นหาโครงการและจัดซื้อ' : 'Search public project records'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/network');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-sky-600" />
              <span>{dict.nav?.network || '工程行业人脉'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/projects');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
              <span>{dict.nav?.projects || '工程项目发现'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/projects/p001');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-accent" />
              <span>{dict.nav?.p001 || 'DEMO P001 档案'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/companies/demo-org-b');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{locale === 'zh' ? '参建企业 (Org B)' : 'Company (Org B)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/nearby');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>{locale === 'zh' ? '管辖存证 (Nearby)' : locale === 'th' ? 'ข้อมูล BMA' : 'Nearby (BMA)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate('/discover');
                setMobileMenuOpen(false);
              }}
              className="p-2 bg-surface rounded-lg border border-hairline text-left text-ink font-medium hover:border-accent flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>{dict.nav?.discover || '图谱语义发现'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
