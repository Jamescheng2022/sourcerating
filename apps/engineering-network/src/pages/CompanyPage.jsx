import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, ShieldCheck, MapPin, Award, CheckCircle2, 
  ExternalLink, FileText, ChevronRight, Share2, Layers,
  Calendar, Briefcase, Plus, Check, User, AlertCircle, Sparkles, X, Image as ImageIcon
} from 'lucide-react';
import { 
  COMPANIES_LIST, 
  getCompanyById, 
  getCompanyParticipations, 
  normalizeOrgId,
  PEOPLE_LIST,
  getProjectById
} from '../data/projectData';
import { EngineeringIllustration, IllustrationLightboxModal } from '../components/illustrations/EngineeringIllustration';
import { Avatar } from '../components/ui/Avatar';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { ClaimModal } from '../components/modals/ClaimModal';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedCompany, getLocalizedPerson, getLocalizedWorkPackage } from '../i18n/entitiesEn';
import { getLocalizedProject } from '../i18n/projectsEn';

export function CompanyPage({ 
  onSelectEvidence, 
  followingIds, 
  onToggleFollow,
  activeRole = 'ENG-01',
  posts = []
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, dict } = useI18n();

  const orgId = normalizeOrgId(id || 'ORG-B');
  const company = getCompanyById(orgId);
  const localizedCompany = getLocalizedCompany(company, locale) || company;

  // Claim modal state & local replacement preview
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isClaimed, setIsClaimed] = useState(company?.isClaimed || false);
  const [customCoverImage, setCustomCoverImage] = useState(null);

  // Lightbox inspection state
  const [inspectingTemplate, setInspectingTemplate] = useState(null);

  const isZh = locale === 'zh';
  const c = dict.company || {};

  useEffect(() => {
    if (company) {
      setIsClaimed(company.isClaimed);
    }
    const timer = setTimeout(() => {
      if (localizedCompany) {
        document.title = `${localizedCompany.name} · ${c.title || (isZh ? '企业工程档案' : 'Contractor Dossier')}`;
      } else {
        document.title = isZh ? '未找到机构档案 (404)' : 'Company Not Found (404)';
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [company, localizedCompany, isZh, c]);

  // If company not found, render explicit 404 view
  if (!company) {
    return (
      <div className="w-full bg-surface border border-hairline rounded-2xl p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-subtle text-ink-muted border border-hairline flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {c.notFoundTitle || (isZh ? '未找到对应企业档案 (404)' : 'Enterprise Profile Not Found (404)')}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            {c.notFoundDesc 
              ? c.notFoundDesc.replace('{id}', id) 
              : (isZh 
                ? `企业标识“${id}”不存在于当前工程知识库中。请检查链接或返回探索其他参建企业。`
                : `Identifier "${id}" does not exist in the engineering registry.`)}
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/companies/demo-org-b')}
            className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-accent border border-hairline"
          >
            {c.demoOrgB || (isZh ? '查看示例企业 (Demo Org B)' : 'View Demo Org B')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-xs font-semibold text-white"
          >
            {c.backToProjects || (isZh ? '返回项目发现' : 'Back to Project Discovery')}
          </button>
        </div>
      </div>
    );
  }

  // Participations dynamically derived from unified contract
  const companyParticipations = getCompanyParticipations(company.id);

  // Key engineers associated with this company
  const affiliatedEngineers = PEOPLE_LIST.filter(p => p.orgId === company.id);

  // Follow state synced with resident state
  const isSelfOrg = activeRole === company.id;
  const isFollowed = followingIds ? followingIds.has(company.id) : false;
  const followersCount = (company.followersCount || 1200) + (isFollowed ? 1 : 0);

  // Illustration template assigned based on company
  const companyTemplateMap = {
    'ORG-A': 'tpl-com-01',
    'ORG-B': 'tpl-com-01',
    'ORG-C': 'tpl-com-02',
    'ORG-D': 'tpl-com-03',
    'ORG-E': 'tpl-com-04',
    'ORG-F': 'tpl-com-04',
    'ORG-G': 'tpl-com-06',
    'ORG-H': 'tpl-com-05'
  };
  const templateId = companyTemplateMap[company.id] || 'tpl-com-01';

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 font-sans text-ink">
      {/* 1. Company Profile Header Banner */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar type="company" name={localizedCompany.name} size="xl" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  {localizedCompany.fullName || company.fullName}
                </h1>
                <VerificationBadge level={company.verificationLevel} size="sm" />
                {isClaimed && (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    {c.claimedBadge || (isZh ? '已认领托管 (Mock)' : 'Claimed & Managed (Mock)')}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-ink-muted font-medium">
                {localizedCompany.tagline || `${localizedCompany.sector || company.sector} · ${c.taglineSuffix || (isZh ? '国家重点工程参建主体' : 'National Key Engineering Contributor')}`}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted pt-1 font-mono">
                <span>{c.licenseCode || (isZh ? '资质代码:' : 'License Code:')} {company.licenseNo}</span>
                <span className="text-ink-faint hidden sm:inline">|</span>
                <span>{c.sectorLabel || (isZh ? '所属行业:' : 'Sector:')} {localizedCompany.sector || company.sector}</span>
                <span className="text-ink-faint hidden sm:inline">|</span>
                <span>{c.verifiedRecords || (isZh ? '关联工程标段:' : 'Attributed Packages:')} {companyParticipations.length} {c.itemsUnit || (isZh ? '项' : 'packages')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Follow & Claim */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
            {isSelfOrg ? (
              <span className="px-3.5 py-1.5 rounded-xl bg-surface-subtle text-ink-muted border border-hairline text-xs font-medium">
                {isZh ? '当前所属机构' : locale === 'th' ? 'องค์กรปัจจุบันของคุณ' : 'Your Organization'}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onToggleFollow && onToggleFollow(company.id)}
                className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-all ${
                  isFollowed
                    ? 'bg-surface-subtle text-ink-muted hover:bg-surface-hover border border-hairline'
                    : 'bg-accent hover:bg-accent-hover text-white font-semibold'
                }`}
              >
                {isFollowed ? (c.following || (isZh ? '已关注' : 'Following')) : (c.follow || (isZh ? '+ 关注企业' : '+ Follow Company'))}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsClaimModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-accent border border-hairline transition-colors"
            >
              {isClaimed ? (c.manageProfile || (isZh ? '管理机构主页' : 'Manage Entity Profile')) : (c.claimProfile || (isZh ? '认领企业档案' : 'Claim Entity Profile'))}
            </button>
          </div>
        </div>

        {/* Professional Services Tags */}
        <div className="pt-2 border-t border-hairline flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-muted font-medium mr-1">
            {c.specialties || (isZh ? '执业能力与服务专业:' : 'Engineering Capabilities & Specialties:')}
          </span>
          {(localizedCompany.services || company.services || []).map((svc, i) => (
            <span
              key={i}
              className="px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-hairline text-xs font-medium"
            >
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Media Portfolio: Parametric Engineering Illustration */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>{c.illustrationTitle || (isZh ? '企业履约架构与工程智造全景' : 'Corporate Delivery Architecture & Manufacturing Panorama')}</span>
            </h2>
            <p className="text-xs text-ink-muted font-mono">
              {c.illustrationSubtitle || (isZh ? '原创矢量图学模型 · 标注“示意图 / Illustration”' : 'Original Vector Illustration Model · Labeled "Illustration / Schematic"')}
            </p>
          </div>
        </div>

        <div>
          {customCoverImage ? (
            <div className="relative rounded-xl overflow-hidden border border-hairline aspect-[4/3] max-h-96 bg-surface-subtle">
              <img
                src={customCoverImage}
                alt="企业自定义封面 (本地预览)"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-surface/80 backdrop-blur-md border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-mono">
                ● {isZh ? '本地演示封面替换 (未联网/待审核)' : 'Local Demo Cover Replacement (Offline/Pending Review)'}
              </div>
              <button
                type="button"
                onClick={() => setCustomCoverImage(null)}
                className="absolute top-3 right-3 px-2 py-1 rounded bg-surface hover:bg-surface-hover text-ink-muted hover:text-ink text-xs border border-hairline"
              >
                {isZh ? '还原为原创矢量图学模型' : 'Restore Vector Illustration'}
              </button>
            </div>
          ) : (
            <EngineeringIllustration
              templateId={templateId}
              showBadge={true}
              showMetaBar={true}
              onInspect={(tpl) => setInspectingTemplate(tpl)}
              className="cursor-pointer shadow-sm rounded-xl overflow-hidden"
            />
          )}
        </div>
      </div>

      {/* 3. Verifiable Engineering Track Record Grid */}
      <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-hairline">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>
                {c.participationsTitle 
                  ? c.participationsTitle.replace('{count}', companyParticipations.length) 
                  : (isZh ? `结构化关联工程标段 (${companyParticipations.length} 项)` : `Attributed Work Packages (${companyParticipations.length})`)}
              </span>
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {c.participationsSubtitle || (isZh ? 'WBS/OBS 标段职责结构化关联 · 原型演示参建分工' : 'Structured WBS/OBS project scopes · Prototype demonstration of organizational responsibilities')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {companyParticipations.map(part => {
            const rawProj = getProjectById(part.projectId || 'p001');
            const localizedProj = getLocalizedProject(rawProj, locale);
            const projName = localizedProj?.name || part.projectName;

            return (
              <div
                key={part.id}
                className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-2 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-accent font-semibold">{part.workPackageId}</span>
                  <span className="font-mono text-ink-muted">{part.period.replace('至', isZh ? '至' : locale === 'th' ? 'ถึง' : 'to')}</span>
                </div>
                <div className="font-bold text-xs sm:text-sm text-ink">
                  {getLocalizedWorkPackage(part.workPackageName, locale)}
                </div>
                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${(part.projectId || 'p001').toLowerCase()}`)}
                    className="text-ink-muted hover:text-accent truncate max-w-[200px]"
                  >
                    {isZh ? '关联项目：' : 'Project: '} {projName}
                  </button>
                  {part.evidenceId && onSelectEvidence && (
                    <button
                      type="button"
                      onClick={() => onSelectEvidence(part.evidenceId)}
                      className="px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 font-mono text-[11px] font-semibold hover:bg-accent/20 transition-colors"
                    >
                      {dict.common?.evidence || (isZh ? '存证' : 'Evidence')} {part.evidenceId}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Affiliated Certified Engineers */}
      {affiliatedEngineers.length > 0 && (
        <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <span>
              {c.personnelTitle 
                ? c.personnelTitle.replace('{count}', affiliatedEngineers.length) 
                : (isZh ? `参建执业注册工程师 (${affiliatedEngineers.length} 位)` : `Attributed Licensed Engineers (${affiliatedEngineers.length})`)}
            </span>
          </h2>
          <p className="text-xs text-ink-muted -mt-2">
            {c.personnelSubtitle || (isZh ? '工程角色与技术骨干结构化关联 · 原型示意' : 'Technical personnel and project roles structured for prototype demonstration')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {affiliatedEngineers.map(eng => {
              const localizedEng = getLocalizedPerson(eng, locale) || eng;
              return (
                <div
                  key={eng.id}
                  onClick={() => navigate(`/people/${eng.id.toLowerCase()}`)}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-hairline flex items-center gap-3 cursor-pointer hover:border-accent/40 transition-all"
                >
                  <Avatar type="user" name={localizedEng.name} size="md" />
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-ink truncate">{localizedEng.name}</div>
                    <div className="text-xs text-ink-muted truncate">{localizedEng.title}</div>
                    <div className="text-[10px] text-accent font-mono mt-0.5">● {isZh ? '模拟执业角色 (原型演示)' : 'Mock Role Attribution (Demo)'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accessible Lightbox Modal for Full Illustration Inspection */}
      <IllustrationLightboxModal
        template={inspectingTemplate}
        onClose={() => setInspectingTemplate(null)}
      />

      {/* Mock Claim Modal with Local Image Replacement Preview */}
      <ClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        company={localizedCompany}
        onClaimed={(cId, newImage) => {
          setIsClaimed(true);
          if (newImage) {
            setCustomCoverImage(newImage);
          }
          setIsClaimModalOpen(false);
        }}
      />
    </div>
  );
}

export default CompanyPage;
