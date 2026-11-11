import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, ShieldCheck, Briefcase, Award, MessageSquare, 
  Send, ExternalLink, Calendar, Building2, Check, Plus,
  FileText, Milestone, AlertCircle, Sparkles, X, Heart, Eye,
  Layers, Download, Camera, Share2, Compass, CheckCircle2
} from 'lucide-react';
import { 
  PEOPLE_LIST, 
  getPersonById, 
  getPersonParticipations, 
  normalizePersonId,
  PROJECT_DATA,
  getProjectById
} from '../data/projectData';
import { EngineeringIllustration, IllustrationLightboxModal } from '../components/illustrations/EngineeringIllustration';
import { Avatar } from '../components/ui/Avatar';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { ContactSheet } from '../components/modals/ContactSheet';
import { getCategoryLabel } from '../data/categories';
import { useI18n } from '../i18n/I18nContext';
import { getLocalizedPerson, getLocalizedWorkPackage } from '../i18n/entitiesEn';
import { getLocalizedProject } from '../i18n/projectsEn';
import { getLocalizedPost } from '../i18n/postsEn';
import { isSyntheticOrLowResImage } from '../utils/imageProvenance';

export function PersonPage({ 
  onSelectEvidence, 
  followingIds, 
  onToggleFollow,
  posts = PROJECT_DATA.posts,
  onOpenCompose,
  onUpdatePost,
  activeRole = 'ENG-01'
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { locale, dict, t } = useI18n();
  const isZh = locale === 'zh';

  const personId = normalizePersonId(id || 'ENG-01');
  const person = getPersonById(personId);
  const localizedPerson = getLocalizedPerson(person, locale) || person;
  const isSelf = activeRole === person.id || (activeRole === 'ENG-01' && person.id === 'ENG-01');

  // Active Profile Tab: 'works' (default Xiaohongshu/TikTok grid) | 'updates' | 'projects' | 'about'
  const [activeTab, setActiveTab] = useState('works');

  // Contact modal state
  const [isContactOpen, setIsContactOpen] = useState(false);
  // Full illustration lightbox inspection state
  const [inspectingTemplate, setInspectingTemplate] = useState(null);
  // Post detail preview modal state
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);
  const [detailImageFailed, setDetailImageFailed] = useState(false);
  const [repairError, setRepairError] = useState(null);
  // Export portfolio toast feedback
  const [exportNotice, setExportNotice] = useState(false);
  // Apply updated image URL to selected post and propagate to parent App & localStorage
  const applyUpdatedImageUrl = (newUrl) => {
    if (!selectedPostDetail || !newUrl) return;
    const currentImages = selectedPostDetail.templateData?.images || [];
    const updatedImages = currentImages.map((img, i) => i === 0 ? { ...img, url: newUrl } : img);
    if (updatedImages.length === 0) {
      updatedImages.push({ url: newUrl, fileName: 're-uploaded.jpg', isCustomUpload: true });
    }

    const updatedPost = {
      ...selectedPostDetail,
      templateData: {
        ...selectedPostDetail.templateData,
        images: updatedImages
      }
    };

    setSelectedPostDetail(updatedPost);
    setDetailImageFailed(false);
    setRepairError(null);

    if (onUpdatePost) {
      onUpdatePost(updatedPost);
    }
  };

  // Handle re-upload field photo with <=10MB budget, dimension bounding, and FAIL CLOSED on error
  const handleRepairImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRepairError(null);

    if (!file.type || !file.type.startsWith('image/')) {
      setRepairError(isZh ? '请选择有效的图片文件 (PNG/JPG/WebP)' : 'Please select a valid image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setRepairError(isZh ? '图片文件大小不能超过 10MB' : 'Image file size cannot exceed 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result;
      if (!rawDataUrl) {
        setRepairError(isZh ? '读取图片文件失败' : 'Failed to read image file');
        return;
      }

      if (typeof window === 'undefined') {
        setRepairError('Window/DOM environment unavailable');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 960;
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          applyUpdatedImageUrl(optimizedDataUrl);
        } catch (err) {
          // FAIL CLOSED: do NOT fall back to raw Data URL containing original unstripped EXIF
          setRepairError(
            isZh
              ? '画布重编码失败：无法在本地安全转换像素，已中止操作。'
              : 'Canvas processing failed: Unable to safely re-encode pixels locally. Operation aborted.'
          );
        }
      };
      img.onerror = () => {
        // FAIL CLOSED: do NOT fall back to raw Data URL containing original unstripped EXIF
        setRepairError(
          isZh
            ? '图片解码失败：文件格式不受支持或数据损坏，无法本地处理。'
            : 'Image decode failed: Unsupported or corrupted format. File rejected.'
        );
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setRepairError(isZh ? '文件读取错误' : 'File read error');
    };
    reader.readAsDataURL(file);
  };


  useEffect(() => {
    setDetailImageFailed(false);
  }, [selectedPostDetail]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localizedPerson) {
        document.title = `${localizedPerson.name} (${localizedPerson.title}) · ${dict.person?.title || '执业工程师主页'}`;
      } else {
        document.title = '404 · Not Found';
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [localizedPerson, dict]);

  // If person not found, render explicit 404 view
  if (!person) {
    return (
      <div className="w-full bg-surface border border-hairline rounded-2xl p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-surface-subtle text-ink-muted border border-hairline flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            {isZh ? '未找到对应专家档案 (404)' : 'Engineer Profile Not Found (404)'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            {isZh 
              ? `人员标识“${id}”不存在于当前工程知识库中。请检查链接或返回探索其他执业专家。`
              : `Identifier "${id}" does not exist in the engineering registry.`}
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/people/demo-engineer-01')}
            className="px-3.5 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-accent border border-hairline transition-colors"
          >
            Demo Engineer 01
          </button>
          <button
            type="button"
            onClick={() => navigate('/network')}
            className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-xs font-semibold text-white transition-colors"
          >
            {dict.nav?.network || '返回人脉网络'}
          </button>
        </div>
      </div>
    );
  }

  // Participations dynamically derived from unified contract
  const personParticipations = getPersonParticipations(person.id);

  // Authored posts: Filters BOTH pre-existing posts AND user's newly published posts!
  const authoredPosts = posts.filter(p => {
    if (!p) return false;
    const authorId = p.authorId || '';
    return authorId === person.id || normalizePersonId(authorId) === person.id;
  });

  // Follow state synced with resident state
  const isFollowed = followingIds ? followingIds.has(person.id) : false;
  const followersCount = (person.followersCount || 830) + (isFollowed ? 1 : 0);

  // Map person to illustration template
  const personTemplateMap = {
    'ENG-01': 'tpl-peo-01',
    'ENG-02': 'tpl-peo-02',
    'ENG-03': 'tpl-peo-05',
    'ENG-04': 'tpl-peo-04',
    'ENG-05': 'tpl-peo-03'
  };
  const templateId = personTemplateMap[person.id] || 'tpl-peo-01';

  // Handle Export Portfolio Brief with real clipboard write and file download
  const handleExportPortfolio = () => {
    try {
      const briefText = `================================================
ENGINEERING NETWORK PORTFOLIO BRIEF (MOCK)
================================================
Name: ${localizedPerson.name}
Role: ${localizedPerson.title}
Organization: ${localizedPerson.orgName || person.orgId}
Registration No: ${person.regNumber || 'N/A'}
Experience: ${person.yearsOfExperience || 16} years
Verification: VERIFIED (Mock Registry)

[EXPERTISE & SKILLS]
${(localizedPerson.skills || []).map(s => `- ${s}`).join('\n')}

[CAREER PARTICIPATIONS (${personParticipations.length})]
${personParticipations.map(p => `- [${p.workPackageId}] ${p.projectName} | ${p.workPackageName} (${p.period}) | Evidence: ${p.evidenceId}`).join('\n')}

[AUTHORED WORKS & POSTS (${authoredPosts.length})]
${authoredPosts.map(p => {
  const lp = getLocalizedPost(p, locale);
  return `- [${getCategoryLabel(p.category || p.channel, locale)}] ${lp.title} (${p.timeAgo || 'Recent'})`;
}).join('\n')}

================================================
Generated: ${new Date().toISOString()}
Data Notice: MOCK DEMO DATA ONLY · NO REAL USERS
================================================`;

      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(briefText).catch(() => {});
      }

      if (typeof window !== 'undefined' && window.Blob && window.URL) {
        const blob = new Blob([briefText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfolio-brief-${person.id.toLowerCase()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setExportNotice(true);
      setTimeout(() => setExportNotice(false), 4000);
    } catch (err) {
      console.warn('Export portfolio error', err);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-5 font-sans text-ink animate-fadeIn">
      {/* 1. Compact Profile Identity Header Card */}
      <div className="bg-surface border border-hairline rounded-2xl overflow-hidden shadow-xs">
        {/* Subtle decorative cover banner strip */}
        <div className="h-16 sm:h-24 bg-gradient-to-r from-accent/15 via-emerald-500/10 to-teal-500/15 border-b border-hairline relative">
          <div className="absolute right-3 top-2 flex items-center gap-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface/80 backdrop-blur-xs text-ink-muted border border-hairline">
              MOCK REGISTRY
            </span>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
              <div className="-mt-10 sm:-mt-14 ring-4 ring-surface rounded-full shrink-0 shadow-sm bg-surface">
                <Avatar type="user" name={localizedPerson.name} size="xl" />
              </div>
              <div className="space-y-1 min-w-0 pt-0.5 sm:pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-ink tracking-tight truncate">
                    {localizedPerson.name}
                  </h1>
                  <VerificationBadge level="VERIFIED" isPerson={true} size="sm" />
                </div>

                <p className="text-xs sm:text-sm text-ink-muted font-medium">
                  {localizedPerson.title}
                </p>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted font-mono pt-0.5">
                  <span>{isZh ? '任职机构:' : 'Company:'}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/companies/${person.orgId.toLowerCase()}`)}
                    className="text-sky-700 dark:text-sky-400 hover:underline font-semibold truncate max-w-[220px]"
                  >
                    {localizedPerson.orgName || person.orgId}
                  </button>
                  <span className="text-ink-faint hidden sm:inline">|</span>
                  <span className="hidden sm:inline">
                    {isZh ? '执业号:' : 'License No:'} {person.regNumber}
                  </span>
                  <span className="text-ink-faint hidden sm:inline">|</span>
                  <span>{person.yearsOfExperience || 16} {isZh ? '年从业' : 'yrs exp'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: Follow, Contact & Real Export */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
              {isSelf ? (
                <span className="px-3 py-1.5 rounded-xl bg-surface-subtle text-ink-muted text-xs font-semibold border border-hairline select-none">
                  {isZh ? '当前操作身份 (您自己)' : (locale === 'th' ? 'ข้อมูลประจำตัวปัจจุบันของคุณ' : "Current Persona (You)")}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleFollow && onToggleFollow(person.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-all ${
                    isFollowed
                      ? 'bg-surface-subtle text-ink hover:bg-surface-hover border border-hairline'
                      : 'bg-accent hover:bg-accent-hover text-white font-semibold shadow-xs'
                  }`}
                >
                  {isFollowed 
                    ? (dict.common?.following || '已关注') 
                    : (isZh ? '+ 关注专家' : '+ Follow')}
                </button>
              )}

              <button
                type="button"
                id="person-contact-button"
                onClick={() => setIsContactOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-accent border border-hairline transition-colors"
              >
                {dict.common?.contact || '联系专家'}
              </button>

              <button
                type="button"
                onClick={handleExportPortfolio}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-ink border border-hairline text-xs font-medium transition-colors"
                title={dict.portfolio?.exportSummary || '导出作品集业绩单'}
              >
                <Download className="w-3.5 h-3.5 text-ink-muted" />
                <span className="hidden md:inline ml-1">{dict.common?.share || '业绩'}</span>
              </button>
            </div>
          </div>

          {/* Bio text */}
          {localizedPerson.bio && (
            <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 pt-1 border-t border-hairline">
              {localizedPerson.bio}
            </p>
          )}

          {/* Specialty Tags */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs text-ink-muted font-medium mr-1">
              {isZh ? '专业方向:' : 'Specialties:'}
            </span>
            {(localizedPerson.skills || []).map((skill, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-md bg-surface-subtle text-ink-muted border border-hairline text-[11px] font-medium"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Metric Stats Row (MOCK Counters) */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-hairline text-center">
            <div className="bg-surface-subtle/60 rounded-xl p-2 border border-hairline">
              <div className="text-sm sm:text-base font-bold font-mono text-ink">
                {authoredPosts.length}
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {dict.portfolio?.worksCount || '工程作品'}
              </div>
            </div>
            <div className="bg-surface-subtle/60 rounded-xl p-2 border border-hairline">
              <div className="text-sm sm:text-base font-bold font-mono text-accent">
                {personParticipations.length}
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {dict.portfolio?.tabProjects || '主导工程'}
              </div>
            </div>
            <div className="bg-surface-subtle/60 rounded-xl p-2 border border-hairline">
              <div className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                100%
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {dict.common?.verified || '核验证据'}
              </div>
            </div>
            <div className="bg-surface-subtle/60 rounded-xl p-2 border border-hairline">
              <div className="text-sm sm:text-base font-bold font-mono text-ink">
                {followersCount}
              </div>
              <div className="text-[10px] text-ink-muted mt-0.5">
                {dict.portfolio?.followersCount || '同行关注'}
              </div>
            </div>
          </div>
        </div>

        {/* Real Export Toast Notification */}
        {exportNotice && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/80 border-t border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {isZh
                  ? `[MOCK] 已复制履约简报至剪贴板，并下载 portfolio-brief-${person.id.toLowerCase()}.txt`
                  : `[MOCK] Copied brief to clipboard & downloaded portfolio-brief-${person.id.toLowerCase()}.txt`}
              </span>
            </div>
            <span className="text-[10px] font-mono opacity-80 shrink-0">LOCAL EXPORT</span>
          </div>
        )}
      </div>

      {/* 2. Four Meaningful Navigation Tabs */}
      <div className="bg-surface border border-hairline rounded-2xl p-1.5 shadow-xs flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          {[
            { id: 'works', label: dict.portfolio?.tabWorks || '作品与纪实', icon: Camera, count: authoredPosts.length },
            { id: 'updates', label: dict.portfolio?.tabUpdates || '现场动态', icon: MessageSquare, count: authoredPosts.length },
            { id: 'projects', label: dict.portfolio?.tabProjects || '参建经历', icon: Building2, count: personParticipations.length },
            { id: 'about', label: dict.portfolio?.tabAbout || '资质与专长', icon: Award, count: null },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-subtle'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`text-[10px] font-mono px-1 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-surface-subtle text-ink-faint'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Post CTA in Header Bar */}
        {onOpenCompose && (
          <button
            type="button"
            onClick={onOpenCompose}
            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{dict.portfolio?.postNow || '发新作品'}</span>
          </button>
        )}
      </div>

      {/* 3. TAB 1: XIAOHONGSHU / TIKTOK STYLE IMAGE-LED MEDIA WORKS GRID */}
      {activeTab === 'works' && (
        <div className="space-y-4">
          {authoredPosts.length === 0 ? (
            <div className="bg-surface border border-hairline rounded-2xl p-8 sm:p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-subtle text-ink-muted border border-hairline flex items-center justify-center mx-auto">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-ink">
                {dict.portfolio?.emptyWorks || '暂无发布的作品集内容'}
              </h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto">
                {isZh
                  ? '点击顶部“发布动态”分享您的第一份工程现场组图或技术成果！'
                  : 'Click "Post" above to publish your first on-site photo essay or engineering milestone!'}
              </p>
              {onOpenCompose && (
                <button
                  type="button"
                  onClick={onOpenCompose}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs transition-colors"
                >
                  {dict.portfolio?.postNow || '发布新现场作品'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {authoredPosts.map((post) => {
                const localizedPost = getLocalizedPost(post, locale);
                const templateData = post.templateData || {};
                const firstImg = templateData.images && templateData.images.length > 0
                  ? templateData.images[0]
                  : null;
                const coverUrl = firstImg?.url || post.imageUrl || null;
                const categoryLabel = getCategoryLabel(post.category || post.channel, locale);

                const hasIllustration = Boolean(post.illustrationTemplateId);
                const isTrulyCustomUpload = Boolean(post.isLocalNew || firstImg?.isCustomUpload || firstImg?.url?.startsWith('blob:'));
                const isSyntheticUpload = Boolean(
                  post.isSynthetic ||
                  firstImg?.isSynthetic ||
                  (firstImg && isSyntheticOrLowResImage(firstImg)) ||
                  (post.title && post.title.toLowerCase().includes('synthetic') && coverUrl)
                );

                return (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPostDetail(post)}
                    className="bg-surface border border-hairline hover:border-accent rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group select-none"
                  >
                    {/* Visual Media Thumbnail (Aspect 4:5 / 4:3) */}
                    <div className="relative aspect-[4/5] bg-surface-subtle overflow-hidden">
                      {hasIllustration ? (
                        <div className="w-full h-full pointer-events-none bg-surface">
                          <EngineeringIllustration
                            templateId={post.illustrationTemplateId}
                            showBadge={false}
                            showMetaBar={false}
                            showAnnotations={false}
                            className="w-full h-full"
                          />
                        </div>
                      ) : coverUrl ? (
                        <>
                          <img
                            src={coverUrl}
                            alt={localizedPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // Fallback for expired local blob URLs after reload
                              e.target.style.display = 'none';
                              const fallbackEl = e.target.parentElement.querySelector('.image-fallback-badge');
                              if (fallbackEl) fallbackEl.style.display = 'flex';
                            }}
                          />
                          {/* Honest fallback container ONLY if image failed to load or blob expired */}
                          <div 
                            className="image-fallback-badge absolute inset-0 bg-gradient-to-br from-surface-subtle to-surface p-3 flex flex-col justify-between items-center text-center"
                            style={{ display: 'none' }}
                          >
                            <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center mt-2">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold px-2 py-0.5 bg-surface border border-hairline rounded-md">
                              {isZh ? '现场工程记录 (未配图或未同步)' : (locale === 'th' ? 'บันทึกภาพถ่ายภาคสนาม (ยังไม่ได้ซิงค์)' : 'Field Record (Unsynced / Placeholder)')}
                            </span>
                            <span className="text-[9px] text-ink-faint font-mono">
                              {localizedPost.timeAgo || post.timeAgo || (isZh ? '刚刚' : 'Just now')}
                            </span>
                          </div>
                        </>
                      ) : (
                        /* Text-only field brief card */
                        <div className="w-full h-full p-4 bg-gradient-to-br from-surface-subtle via-surface to-surface-subtle flex flex-col justify-between text-left">
                          <div className="space-y-1.5">
                            <div className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span className="inline-block text-[10px] font-medium text-accent font-mono uppercase tracking-wider">
                              {isZh ? '现场文字简报' : (locale === 'th' ? 'รายงานข้อความภาคสนาม' : 'Field Text Brief')}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-4 font-sans">
                            {localizedPost.content || post.content || localizedPost.title}
                          </p>
                          <span className="text-[9px] text-ink-faint font-mono">
                            {localizedPost.timeAgo || post.timeAgo || (isZh ? '刚刚' : 'Just now')}
                          </span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium font-sans">
                          {categoryLabel}
                        </span>
                        {post.isLocalNew && (
                          <span className={`px-1.5 py-0.5 rounded text-white font-mono text-[9px] font-bold ${
                            isSyntheticUpload ? 'bg-amber-600' : 'bg-emerald-500'
                          }`}>
                            {isSyntheticUpload ? 'SYNTHETIC' : 'NEW'}
                          </span>
                        )}
                      </div>

                      {/* Photo Count Chip if multi-photo */}
                      {templateData.images && templateData.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          <span>{templateData.images.length}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Narrative Footer */}
                    <div className="p-2.5 sm:p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                      <h3 className="font-bold text-xs sm:text-sm text-ink group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                        {localizedPost.title}
                      </h3>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-ink-muted">
                        <span className="font-mono text-ink-faint text-[10px]">
                          {localizedPost.timeAgo || post.timeAgo || (isZh ? '近期' : 'Recent')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                            <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20" />
                            <span>{post.likes || 1}</span>
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-ink-muted">
                            <MessageSquare className="w-3 h-3" />
                            <span>{(post.comments || []).length}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB 2: FIELD UPDATES & TEXT NOTES */}
      {activeTab === 'updates' && (
        <div className="space-y-3">
          {authoredPosts.length === 0 ? (
            <div className="bg-surface border border-hairline rounded-2xl p-8 text-center text-xs text-ink-muted">
              {dict.portfolio?.emptyUpdates || '暂无发布的现场动态'}
            </div>
          ) : (
            authoredPosts.map((post) => {
              const localizedPost = getLocalizedPost(post, locale);
              return (
                <div
                  key={post.id}
                  className="bg-surface border border-hairline rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 hover:border-accent/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">{localizedPost.title}</span>
                      <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-semibold">
                        {getCategoryLabel(post.category || post.channel, locale)}
                      </span>
                    </div>
                    <span className="font-mono text-ink-faint text-xs">{localizedPost.timeAgo || post.timeAgo}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    {localizedPost.content}
                  </p>

                  <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-ink-muted">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>{post.likes || 1} {dict.common?.like || '点赞'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{(post.comments || []).length} {dict.common?.comment || '评论'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.evidenceId && onSelectEvidence && (
                        <button
                          type="button"
                          onClick={() => onSelectEvidence(post.evidenceId)}
                          className="px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 font-mono text-[11px] font-semibold hover:bg-accent/20 transition-colors"
                        >
                          {dict.common?.evidence || '存证'} {post.evidenceId}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPostDetail(post)}
                        className="text-xs text-accent hover:underline font-semibold"
                      >
                        {dict.common?.details || '查看详情'} →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. TAB 3: VERIFIABLE ENGINEERING PARTICIPATIONS (Project ↔ Company ↔ Engineer) */}
      {activeTab === 'projects' && (
        <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-hairline">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              <span>
                {dict.person?.participationsTitle || '主要参建工程经历'} ({personParticipations.length})
              </span>
            </h2>
            <span className="text-xs text-ink-muted font-mono">
              OBS/WBS · {isZh ? '统一参与关系推导' : 'Unified Contract Derived'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {personParticipations.map(part => {
              const rawProj = getProjectById(part.projectId || 'p001');
              const localizedProj = getLocalizedProject(rawProj, locale);
              const projName = localizedProj?.name || part.projectName;
              const wpName = getLocalizedWorkPackage(part.workPackageName, locale);
              const period = (part.period || '').replace('至', isZh ? '至' : locale === 'th' ? 'ถึง' : 'to');
              return (
                <div
                  key={part.id}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-hairline space-y-2 hover:border-accent transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-accent font-semibold">{part.workPackageId}</span>
                    <span className="font-mono text-ink-muted">{period}</span>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-ink">
                    {wpName}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${(part.projectId || 'p001').toLowerCase()}`)}
                      className="text-ink-muted hover:text-accent truncate max-w-[200px]"
                    >
                      {isZh ? '关联项目:' : 'Project:'} {projName}
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
      )}

      {/* 6. TAB 4: CREDENTIALS, LICENSES & PARAMETRIC RADAR */}
      {activeTab === 'about' && (
        <div className="space-y-4">
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2 pb-2 border-b border-hairline">
              <ShieldCheck className="w-5 h-5 text-accent" />
              <span>{isZh ? '注册执业资质与专长体系' : 'Professional Registration & Credentials'}</span>
            </h2>

            <div className="divide-y divide-hairline text-xs sm:text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">{isZh ? '注册类别:' : 'Registration Type:'}</span>
                <span className="font-semibold text-ink">{person.role || localizedPerson.title || (isZh ? '注册执业工程师' : 'Licensed Engineer')}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">{isZh ? '国家注册证号:' : 'Statutory Reg No:'}</span>
                <span className="font-mono text-accent font-semibold">{person.regNumber}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">{isZh ? '执业职称:' : 'Current Title:'}</span>
                <span className="font-semibold text-ink">{localizedPerson.title}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">{isZh ? '注册单位:' : 'Licensed Entity:'}</span>
                <span className="text-accent font-semibold">{localizedPerson.orgName || person.orgName}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-ink-muted">{isZh ? '执业经历:' : 'Experience Duration:'}</span>
                <span className="font-mono text-ink">{person.yearsOfExperience || 16} {isZh ? '年' : 'Years'}</span>
              </div>
            </div>
          </div>

          {/* Parametric Capability Radar Illustration */}
          <div className="bg-surface border border-hairline rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-ink flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>{isZh ? '工程履约技术能力雷达与专业验算' : 'Capability Radar & Calculations'}</span>
                </h2>
                <p className="text-xs text-ink-muted font-mono">
                  {isZh ? '原创图学模型 · 标注“示意图 / Illustration”' : 'Original Vector Illustration Model · MOCK'}
                </p>
              </div>
            </div>

            <div className="max-w-xl mx-auto">
              <EngineeringIllustration
                templateId={templateId}
                showBadge={true}
                showMetaBar={true}
                onInspect={(tpl) => setInspectingTemplate(tpl)}
                className="cursor-pointer shadow-xs rounded-xl overflow-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* Accessible Post Detail Modal */}
      {selectedPostDetail && (
        <div 
          className="fixed inset-0 z-50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.48)' }}
          onClick={() => setSelectedPostDetail(null)}
          role="presentation"
        >
          <div 
            className="w-full max-w-lg bg-surface border border-hairline rounded-2xl shadow-2xl overflow-hidden space-y-4 p-4 sm:p-6 text-ink animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-hairline">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[11px] font-semibold">
                  {getCategoryLabel(selectedPostDetail.category || selectedPostDetail.channel, locale)}
                </span>
                <h3 className="font-bold text-base text-ink">
                  {getLocalizedPost(selectedPostDetail, locale).title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPostDetail(null)}
                className="p-1 rounded-lg hover:bg-surface-hover text-ink-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Gallery / Single photo / Illustration */}
            {selectedPostDetail.templateData?.images && selectedPostDetail.templateData.images.length > 0 ? (
              detailImageFailed ? (
                <div className="w-full py-6 px-4 flex flex-col items-center justify-center text-center bg-surface-subtle border border-dashed border-hairline rounded-xl space-y-2">
                  <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-ink">
                    {isZh ? '现场工程照片未配置云存储' : (locale === 'th' ? 'ไม่มีการจัดเก็บรูปภาพภาคสนามบนคลาวด์' : 'Field Photo Not Persisted in Cloud')}
                  </span>
                  <p className="text-[11px] text-ink-muted max-w-xs leading-relaxed">
                    {isZh 
                      ? '本系统为前端独立沙箱演示环境。本地上传的照片未接入云存储对象库，可通过下方按钮重新选择照片。' 
                      : (locale === 'th' ? 'สภาพแวดล้อมจำลองฟรอนต์เอนด์นี้ไม่ได้เชื่อมต่อกับระบบคลาวด์ สามารถเลือกรูปภาพใหม่ได้ด้านล่าง' : 'This is a client sandbox prototype. Uploaded images are not synced to cloud storage. You can select a field photo below.')}
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors shadow-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isZh ? '重新选择现场照片' : (locale === 'th' ? 'อัปโหลดรูปภาพใหม่' : 'Re-upload Field Photo')}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleRepairImage}
                    />
                  </label>
                  {repairError && (
                    <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
                      {repairError}
                    </div>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-hairline text-ink-faint">
                    CLIENT_SANDBOX · LOCAL_STORAGE_ATTEMPTED · NO_CLOUD_STORAGE
                  </span>
                </div>
              ) : (() => {
                const detailImg = selectedPostDetail.templateData.images[0];
                const isSyntheticDetail = Boolean(
                  selectedPostDetail.isSynthetic ||
                  detailImg?.isSynthetic ||
                  (detailImg && isSyntheticOrLowResImage(detailImg)) ||
                  (selectedPostDetail.title && selectedPostDetail.title.toLowerCase().includes('synthetic'))
                );
                return (
                  <div className="rounded-xl overflow-hidden border border-hairline bg-surface-subtle">
                    <div className="max-h-72 flex items-center justify-center bg-black/5">
                      <img
                        src={detailImg.url}
                        alt={selectedPostDetail.title}
                        className="w-full h-full object-contain"
                        onError={() => setDetailImageFailed(true)}
                      />
                    </div>
                    {isSyntheticDetail && (
                      <div className="px-3 py-1.5 bg-amber-500/10 border-t border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-1.5 font-mono">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>{isZh ? '测试图像 (未核验) · 非施工现场照片' : 'Test Image (Unverified) · Non-Field Photo'}</span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : selectedPostDetail.illustrationTemplateId ? (
              <div className="rounded-xl overflow-hidden border border-hairline bg-surface-subtle">
                <EngineeringIllustration
                  templateId={selectedPostDetail.illustrationTemplateId}
                  showBadge={true}
                  showMetaBar={true}
                  className="w-full"
                />
              </div>
            ) : null}

            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {getLocalizedPost(selectedPostDetail, locale).content}
            </p>

            <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs">
              <span className="text-ink-faint font-mono">
                {getLocalizedPost(selectedPostDetail, locale)?.timeAgo || selectedPostDetail.timeAgo || (isZh ? '刚刚' : 'Just now')} · {localizedPerson.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPostDetail(null);
                    navigate(`/feed?q=${encodeURIComponent(selectedPostDetail.title)}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-accent text-white font-semibold text-xs transition-colors"
                >
                  {isZh ? '在关注流中查看' : 'Open in Feed'} →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Lightbox Modal for Full Illustration Inspection */}
      <IllustrationLightboxModal
        template={inspectingTemplate}
        onClose={() => setInspectingTemplate(null)}
      />

      {/* Contact Sheet */}
      <ContactSheet
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        person={person}
      />
    </div>
  );
}

export default PersonPage;
