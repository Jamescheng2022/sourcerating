import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { FictionalBanner } from './components/common/FictionalBanner';
import { Header } from './components/common/Header';
import { DesktopLeftNav } from './components/desktop/DesktopLeftNav';
import { DesktopRightBar } from './components/desktop/DesktopRightBar';
import { MobileBottomBar } from './components/mobile/MobileBottomBar';
import { ApproachAPage } from './components/approachA/ApproachAPage';
import { FeedPage } from './pages/FeedPage';
import { NetworkPage } from './pages/NetworkPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { AtlasProjectsPage, AtlasRecordPage } from './pages/AtlasProjectsPage';
import { ProjectWikiPage } from './pages/ProjectWikiPage';
import { CompanyPage } from './pages/CompanyPage';
import { PersonPage } from './pages/PersonPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { SearchPage } from './pages/SearchPage';
import { NearbyCityView } from './components/nearby/NearbyCityView';
import { EvidenceModal } from './components/common/EvidenceModal';
import { EntityDrawer } from './components/common/EntityDrawer';
import { ComposeModal } from './components/modals/ComposeModal';
import { LoginModal } from './components/modals/LoginModal';
import { NotificationsSheet } from './components/modals/NotificationsSheet';
import { UserSheet } from './components/modals/UserSheet';
import { PROJECT_DATA } from './data/projectData';
import { I18nProvider, useI18n } from './i18n/I18nContext';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.toLowerCase();
  const isRealAtlasDataPath = path === '/projects' || path.startsWith('/projects/record/') || (path === '/feed' && !new URLSearchParams(location.search).has('demo'));
  const { locale, dict } = useI18n();

  // Active scheme: 'v2' / 'v3' is default, 'a' is comparison
  const currentScheme = path === '/a' ? 'a' : 'v2';

  // Selected Evidence for Modal
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);

  // Selected Entity for Drawer (backward compatibility)
  const [selectedEntityId, setSelectedEntityId] = useState(null);

  // Modals & Sheets
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserSheetOpen, setIsUserSheetOpen] = useState(false);

  // Current Role (Persona) - Single persistent source of truth
  const [currentRole, setCurrentRole] = useState(() => {
    try {
      const saved = localStorage.getItem('atlas_current_role');
      if (saved && ['ENG-01', 'ORG-A', 'GUEST'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'ENG-01';
  });

  // Sync role to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('atlas_current_role', currentRole);
    } catch (e) {}
  }, [currentRole]);

  // Active Tab for Scheme A / Scheme B Timeline sync
  const [activeTab, setActiveTab] = useState('overview');

  // Dynamic Document Title SEO (Bilingual)
  useEffect(() => {
    const isEn = locale === 'en';
    const isTh = locale === 'th';
    const site = isEn ? 'SourceRating Engineering Network' : isTh ? 'SourceRating เครือข่ายวิศวกรรม' : 'SourceRating 工程人脉网络';

    if (path.includes('/feed') || path === '/') {
      document.title = isEn ? `Home Feed · ${site}` : isTh ? `ฟีดหน้าแรก · ${site}` : `动态关注流 · ${site}`;
    } else if (path.includes('/search')) {
      document.title = isEn ? `Search Results (Mock) · ${site}` : isTh ? `ผลการค้นหา (Mock) · ${site}` : `全域检索 · ${site}`;
    } else if (path.includes('/network')) {
      document.title = isEn ? `Professional Network · ${site}` : isTh ? `เครือข่ายวิศวกรรม · ${site}` : `工程人脉与组织网络 · ${site}`;
    } else if (path.includes('/projects/')) {
      document.title = isEn ? `Project Dossier & Evidence · ${site}` : isTh ? `แฟ้มข้อมูลโครงการและหลักฐาน · ${site}` : `Project Atlas 工程知识与证据档案 · ${site}`;
    } else if (path.includes('/projects')) {
      document.title = isEn ? `Project Discovery · ${site}` : isTh ? `ค้นหาโครงการ · ${site}` : `工程项目发现 · ${site}`;
    } else if (path.includes('/companies/')) {
      document.title = isEn ? `Contractor Profile · ${site}` : isTh ? `ข้อมูลองค์กร · ${site}` : `参建企业档案 · ${site}`;
    } else if (path.includes('/people/')) {
      document.title = isEn ? `Engineer Portfolio · ${site}` : isTh ? `แฟ้มผลงานวิศวกร · ${site}` : `执业工程师主页与作品集 · ${site}`;
    } else if (path.includes('/nearby')) {
      document.title = isEn ? `Nearby Procurement Records (BMA) · ${site}` : isTh ? `ข้อมูลจัดซื้อจัดจ้างใกล้เคียง (BMA) · ${site}` : `管辖区工程采招公示 (曼谷BMA) · ${site}`;
    } else if (path.includes('/discover')) {
      document.title = isEn ? `Knowledge Graph Discovery (AI) · ${site}` : isTh ? `ค้นพบเชิงความสัมพันธ์ (AI) · ${site}` : `全局关系图谱语义检索 · ${site}`;
    } else if (path === '/a') {
      document.title = isEn ? `Approach A Historical Comparison · ${site}` : `方案 A 历史对照 · ${site}`;
    } else {
      document.title = site;
    }
  }, [path, locale]);

  // Resident Persistent Posts State
  const [posts, setPosts] = useState(() => {
    try {
      const saved = localStorage.getItem('atlas_feed_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return PROJECT_DATA.posts;
  });

  const [storageWarning, setStorageWarning] = useState(null);

  // Sync posts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('atlas_feed_posts', JSON.stringify(posts));
      setStorageWarning(null);
    } catch (e) {
      console.warn('Storage sync failed', e);
      setStorageWarning('LOCAL_STORAGE_FAILED');
    }
  }, [posts]);

  // Update existing post (e.g. image re-upload in PersonPage)
  const handleUpdatePost = (updatedPost) => {
    if (!updatedPost || !updatedPost.id) return;
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  // Resident Following Set
  const [followingIds, setFollowingIds] = useState(() => {
    try {
      const saved = localStorage.getItem('atlas_following_ids');
      if (saved) return new Set(JSON.parse(saved));
    } catch (e) {}
    return new Set(['ORG-B']);
  });

  // Sync following to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('atlas_following_ids', JSON.stringify(Array.from(followingIds)));
    } catch (e) {}
  }, [followingIds]);

  const handleToggleFollow = (entityId) => {
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) next.delete(entityId);
      else next.add(entityId);
      return next;
    });
  };

  const handleSwitchScheme = (scheme) => {
    if (scheme === 'a') {
      navigate('/a');
    } else {
      navigate('/feed');
    }
  };

  const handlePostCreated = (newPost) => {
    setPosts(prev => {
      if (prev.some(p => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  const activeEvidence = selectedEvidenceId ? PROJECT_DATA.evidenceDb[selectedEvidenceId] : null;
  const activeEntity = selectedEntityId ? PROJECT_DATA.entityDossiers[selectedEntityId] : null;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink font-sans w-full max-w-full min-w-0">
      {/* 1. Top Fictional Warning Banner (Slim & Compact) */}
      {!isRealAtlasDataPath && <FictionalBanner
        currentScheme={currentScheme}
        onSwitchScheme={handleSwitchScheme}
      />}

      {/* Storage Quota / Write Failure Warning Banner */}
      {storageWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {locale === 'zh'
                ? '本地存储写入受阻（配额超限或权限被禁）：新发布的动态仅保存在当前会话内存中，刷新后将无法恢复。'
                : locale === 'th'
                ? 'การจัดเก็บข้อมูลในเบราว์เซอร์ล้มเหลว: ข้อมูลใหม่จะถูกเก็บในหน่วยความจำชั่วคราวเท่านั้น'
                : 'Browser storage write failed (quota exceeded or disabled): posts are held in session memory only and will not survive reload.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStorageWarning(null)}
            className="text-amber-700 dark:text-amber-300 hover:underline text-[11px] font-medium ml-2 shrink-0"
          >
            {locale === 'zh' ? '已知晓' : 'Dismiss'}
          </button>
        </div>
      )}

      {/* 2. Top Header Shell (Brand, Global Search & Actions) */}
      <Header
        currentScheme={currentScheme}
        onSwitchScheme={handleSwitchScheme}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        activeRole={currentRole}
      />

      {/* 3. Main Shell Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Nav (Desktop & Tablet md+ >=768px, collapses to rail on tablet) */}
        <DesktopLeftNav
          currentScheme={currentScheme}
          onSwitchScheme={handleSwitchScheme}
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
        />

        {/* Center Main Content Area */}
        <main className="flex-1 w-full max-w-full min-w-0 p-2 sm:p-5 lg:p-6 pb-24 sm:pb-20 md:pb-6">
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route
              path="/feed"
              element={
                <FeedPage
                  posts={posts}
                  setPosts={setPosts}
                  followingIds={followingIds}
                  onToggleFollow={handleToggleFollow}
                  activeRole={currentRole}
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                  onOpenCompose={() => setIsComposeOpen(true)}
                />
              }
            />
            <Route
              path="/search"
              element={
                <SearchPage
                  posts={posts}
                />
              }
            />
            <Route
              path="/network"
              element={
                <NetworkPage
                  followingIds={followingIds}
                  onToggleFollow={handleToggleFollow}
                />
              }
            />
            <Route path="/projects" element={<AtlasProjectsPage />} />
            <Route path="/projects/record/:recordId" element={<AtlasRecordPage />} />
            <Route
              path="/projects/demo"
              element={
                <ProjectsPage onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)} />
              }
            />
            <Route
              path="/projects/:id"
              element={
                <ProjectWikiPage
                  key={location.pathname}
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                  onSelectOrg={(orgId) => navigate(`/companies/${orgId.toLowerCase()}`)}
                  onSelectEngineer={(engId) => navigate(`/people/${engId.toLowerCase()}`)}
                />
              }
            />
            <Route
              path="/companies/:id"
              element={
                <CompanyPage
                  key={location.pathname}
                  followingIds={followingIds}
                  onToggleFollow={handleToggleFollow}
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                  activeRole={currentRole}
                  posts={posts}
                />
              }
            />
            <Route
              path="/people/:id"
              element={
                <PersonPage
                  key={location.pathname}
                  posts={posts}
                  onUpdatePost={handleUpdatePost}
                  onOpenCompose={() => setIsComposeOpen(true)}
                  followingIds={followingIds}
                  onToggleFollow={handleToggleFollow}
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                  activeRole={currentRole}
                />
              }
            />
            <Route
              path="/discover"
              element={
                <DiscoverPage
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                />
              }
            />
            <Route
              path="/nearby"
              element={<NearbyCityView />}
            />
            {/* Scheme A Comparison Page */}
            <Route
              path="/a"
              element={
                <ApproachAPage
                  activeTab={activeTab}
                  onSelectTab={(tab) => setActiveTab(tab)}
                  onSelectOrg={(orgId) => navigate(`/companies/${orgId.toLowerCase()}`)}
                  onSelectEngineer={(engId) => navigate(`/people/${engId.toLowerCase()}`)}
                  onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
                />
              }
            />
            {/* Scheme B comparison alias */}
            <Route path="/b" element={<Navigate to="/projects/p001" replace />} />
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
        </main>

        {/* Right Nav (Desktop xl+ only) */}
        <DesktopRightBar
          onSelectOrg={(orgId) => navigate(`/companies/${orgId.toLowerCase()}`)}
          onSelectEngineer={(engId) => navigate(`/people/${engId.toLowerCase()}`)}
          onSelectEvidence={(evdId) => setSelectedEvidenceId(evdId)}
        />
      </div>

      {/* 4. Mobile Bottom Tab Bar (<768px viewports) */}
      <MobileBottomBar
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenUser={() => setIsUserSheetOpen(true)}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      {/* 5. Modals & Drawers */}
      {selectedEvidenceId && (
        <EvidenceModal
          evidence={activeEvidence}
          evidenceId={selectedEvidenceId}
          onClose={() => setSelectedEvidenceId(null)}
          onSelectEntity={(entId) => {
            setSelectedEvidenceId(null);
            if (entId.startsWith('ORG-')) {
              navigate(`/companies/${entId.toLowerCase()}`);
            } else if (entId.startsWith('ENG-')) {
              navigate(`/people/${entId.toLowerCase()}`);
            }
          }}
        />
      )}

      {activeEntity && (
        <EntityDrawer
          entity={activeEntity}
          onClose={() => setSelectedEntityId(null)}
        />
      )}

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onPostCreated={handlePostCreated}
        activeRole={currentRole}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        currentRole={currentRole}
        onSelectRole={(r) => setCurrentRole(r)}
      />

      <NotificationsSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <UserSheet
        isOpen={isUserSheetOpen}
        onClose={() => setIsUserSheetOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentRole={currentRole}
        onSelectRole={(r) => setCurrentRole(r)}
      />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </HashRouter>
  );
}

export default App;
