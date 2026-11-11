import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, User, Heart, MessageSquare, Bookmark, Share2, 
  Send, ShieldCheck, ChevronRight, X, Check, Filter, MoreHorizontal,
  Compass, Plus, Sparkles
} from 'lucide-react';
import { PROJECT_DATA, resolveAuthorProfile } from '../data/projectData';
import { EngineeringIllustration, IllustrationLightboxModal } from '../components/illustrations/EngineeringIllustration';
import { Avatar } from '../components/ui/Avatar';
import { VerificationBadge } from '../components/ui/VerificationBadge';
import { MagazineTemplateRenderer } from '../components/editorial/templates/MagazineTemplateRenderer';
import { PhotoEssayTemplate } from '../components/editorial/templates/PhotoEssayTemplate';
import { getLocalizedPost } from '../i18n/postsEn';
import { getCategoryLabel } from '../data/categories';
import { useI18n } from '../i18n/I18nContext';
import { EngineeringVisual } from '../components/visuals/EngineeringVisual';

export function FeedPage({ 
  onSelectEvidence, 
  onOpenCompose,
  posts = PROJECT_DATA.posts,
  setPosts,
  followingIds,
  onToggleFollow,
  activeRole
}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { locale, dict, t } = useI18n();
  const demoFeed = searchParams.get('demo') === '1';
  const [sourceFeed, setSourceFeed] = useState({ loading: true, records: [], error: null });
  useEffect(() => {
    let active = true;
    fetch((import.meta.env.BASE_URL || '/') + 'data/atlas/feed-snapshot.json')
      .then(resp => { if (!resp.ok) throw new Error('HTTP ' + resp.status); return resp.json(); })
      .then(data => {
        if (data.schemaVersion !== 'atlas-source-feed/1.0' || !Array.isArray(data.records)) throw new Error('Unexpected dataset');
        if (active) setSourceFeed({ loading: false, records: data.records, error: null });
      })
      .catch(err => { if (active) setSourceFeed({ loading: false, records: [], error: String(err) }); });
    return () => { active = false; };
  }, []);
  const displayedPosts = demoFeed ? posts : [...posts.filter(p => p.isLocalNew), ...sourceFeed.records];
  const selectedCountry = searchParams.get('country') || '';
  const setCountry = (country) => {
    const next = new URLSearchParams(searchParams);
    if (country) next.set('country', country); else next.delete('country');
    setSearchParams(next);
  };


  // Channel Filter: 'all' | 'site' | 'project' | 'people' | 'technical' | 'news'
  const activeChannel = searchParams.get('channel') || 'all';
  const searchQuery = searchParams.get('q') || '';

  // Deep linking to post via ?post=POST_ID
  const targetPostId = searchParams.get('post');

  // Track expanded text for long posts: { [postId]: boolean }
  const [expandedText, setExpandedText] = useState({});
  // Active comment inputs: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState({});
  // Expanded comments section: { [postId]: boolean }
  const [expandedComments, setExpandedComments] = useState({});
  // Overflow menu open for posts: { [postId]: boolean }
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  // Copied post ID for real copy feedback
  const [copiedPostId, setCopiedPostId] = useState(null);
  // Manual share modal for fallback
  const [shareFallback, setShareFallback] = useState({ isOpen: false, url: '', postTitle: '' });

  // Lightbox Inspection Modal for Illustration Cards
  const [inspectingTemplate, setInspectingTemplate] = useState(null);

  useEffect(() => {
    document.title = locale === 'en'
      ? 'Engineering Network · Editorial Feed (V4.1)'
      : locale === 'th'
      ? 'เครือข่ายวิศวกรรม · ฟีดหน้าแรก (V4.1)'
      : '工程行业网络 (暂称) · 行业动态与关注流 (V4.1)';
  }, [locale]);

  // Deep linking scroll effect
  useEffect(() => {
    if (targetPostId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`post-card-${targetPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetPostId]);

  // Channel filters (Bilingual)
  const CHANNELS = locale === 'en' ? [
    { id: 'all', label: 'All Updates' },
    { id: 'site', label: 'On-site' },
    { id: 'project', label: 'Milestones' },
    { id: 'people', label: 'People' },
    { id: 'technical', label: 'Technical' },
    { id: 'news', label: 'Dispatches' }
  ] : locale === 'th' ? [
    { id: 'all', label: 'ทั้งหมด' },
    { id: 'site', label: 'หน้างาน' },
    { id: 'project', label: 'โครงการ' },
    { id: 'people', label: 'บุคคล' },
    { id: 'technical', label: 'เทคนิค' },
    { id: 'news', label: 'ข่าวสาร' }
  ] : [
    { id: 'all', label: '全部' },
    { id: 'site', label: '现场' },
    { id: 'project', label: '项目' },
    { id: 'people', label: '人物' },
    { id: 'technical', label: '技术' },
    { id: 'news', label: '新闻' }
  ];

  const handleSelectChannel = (channelId) => {
    const nextParams = new URLSearchParams(searchParams);
    if (channelId === 'all') {
      nextParams.delete('channel');
    } else {
      nextParams.set('channel', channelId);
    }
    setSearchParams(nextParams);
  };

  const handleClearSearch = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);
  };

  const handleClearAllFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    nextParams.delete('channel');
    setSearchParams(nextParams);
  };

  // Filter posts
  const filteredPosts = displayedPosts.filter(post => {
    if (!demoFeed && selectedCountry && post.country !== selectedCountry) return false;
    if (activeChannel !== 'all') {
      if (activeChannel === 'site') {
        const isSite = post.feedCategory === 'site' || post.category === 'site_update' || post.tags?.includes('现场') || post.type === 'SITE_PHOTO' || post.magazineTemplate === 'photo_essay';
        if (!isSite) return false;
      } else if (activeChannel === 'project') {
        const isPrj = post.feedCategory === 'project' || post.category === 'project_progress' || post.type === 'MILESTONE' || (post.projectId && post.feedCategory !== 'people');
        if (!isPrj) return false;
      } else if (activeChannel === 'people') {
        const isPeople = post.feedCategory === 'people' || post.category === 'engineer_interview' || post.authorType === 'person' || post.tags?.includes('人物');
        if (!isPeople) return false;
      } else if (activeChannel === 'technical') {
        const isTech = post.feedCategory === 'technical' || post.category === 'technical_case' || post.type === 'TECHNICAL' || post.type === 'EXPERT_INSIGHT' || post.tags?.includes('技术');
        if (!isTech) return false;
      } else if (activeChannel === 'news') {
        const isNews = post.feedCategory === 'news' || post.category === 'industry_news' || post.type === 'NEWS' || post.tags?.includes('新闻');
        if (!isNews) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const localized = getLocalizedPost(post, locale);
      const matchTitle = (localized.title || '').toLowerCase().includes(q);
      const matchContent = (localized.content || '').toLowerCase().includes(q);
      const matchAuthor = (localized.authorName || '').toLowerCase().includes(q);
      const matchProject = (localized.projectName || '').toLowerCase().includes(q);
      const matchTag = post.tags && post.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchAuthor && !matchProject && !matchTag) {
        return false;
      }
    }

    return true;
  });

  // Toggle Like
  const handleToggleLike = (postId) => {
    if (!setPosts) return;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLiked;
        return {
          ...p,
          isLiked,
          likes: isLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 1) - 1)
        };
      }
      return p;
    }));
  };

  // Toggle Save / Bookmark
  const handleToggleSave = (postId) => {
    if (!setPosts) return;
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          isSaved: !p.isSaved
        };
      }
      return p;
    }));
  };

  // Add Comment
  const handleAddComment = (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text || !setPosts) return;

    const profile = resolveAuthorProfile(activeRole, locale);
    const newComment = {
      id: `c_${Date.now()}`,
      authorName: profile.authorName,
      authorTitle: profile.authorTitle,
      text,
      timeAgo: locale === 'zh' ? '刚刚' : 'Just now'
    };

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), newComment]
        };
      }
      return p;
    }));

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
  };

  // Share post helper
  const handleSharePost = async (post) => {
    const url = `${window.location.origin}${window.location.pathname}#/feed?post=${post.id}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedPostId(post.id);
        setTimeout(() => setCopiedPostId(null), 2500);
        return;
      } catch (e) {}
    }
    setShareFallback({ isOpen: true, url, postTitle: post.title });
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 font-sans text-ink">
      {/* 1. Filter Chips Header Bar */}
      <div className="bg-surface border border-hairline rounded-2xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
          {CHANNELS.map(ch => {
            const isActive = activeChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleSelectChannel(ch.id)}
                className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition-all text-xs flex items-center gap-1 ${
                  isActive
                    ? 'bg-accent text-white font-semibold shadow-xs'
                    : 'bg-surface text-ink-muted hover:text-ink hover:bg-surface-hover border border-hairline'
                }`}
              >
                <span>{ch.label}</span>
                {ch.id === 'all' && <span className="text-[10px] opacity-75">({displayedPosts.length})</span>}
              </button>
            );
          })}
        </div>

        {/* Active Search Filter Badge */}
        {searchQuery && (
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-subtle border border-hairline text-ink text-[11px] shrink-0">
            <span className="text-ink-muted">{dict.common?.filter || '搜索'}:</span>
            <span className="font-semibold text-accent truncate max-w-[100px]">"{searchQuery}"</span>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-ink-muted hover:text-ink ml-0.5"
              aria-label={dict.common?.close || '清空搜索'}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {!demoFeed && (
        <div className="bg-surface border border-hairline rounded-2xl p-3 sm:p-4 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-accent">{locale === 'zh' ? '真实公开来源 · 已核实档案记录' : 'OFFICIAL-SOURCE RECORDS · PUBLIC DATA'}</span>
            <a className="text-accent underline" href="#/projects">{locale === 'zh' ? '搜索全部 17,337 条记录 →' : 'Explore all 17,337 records →'}</a>
          </div>
          <div className="flex flex-wrap gap-2">
            {[['', locale === 'zh' ? '英国 + 泰国' : 'UK + Thailand'], ['United Kingdom',locale === 'zh' ? '英国' : 'United Kingdom'], ['Thailand',locale === 'zh' ? '泰国' : 'Thailand']].map(([country,label]) => (
              <button key={country} type="button" onClick={() => setCountry(country)}
                className={'px-3 py-1.5 border rounded-full ' + (selectedCountry === country ? 'bg-accent text-white border-accent' : 'border-hairline text-ink-muted')}>
                {label}
              </button>
            ))}
            <button type="button" onClick={() => navigate('/feed?demo=1')} className="px-3 py-1.5 border border-hairline rounded-full text-ink-muted">
              {locale === 'zh' ? '查看旧版演示流' : 'Original demo feed'}
            </button>
          </div>
          <p className="text-ink-muted">{locale === 'zh'
            ? '这版沿用原信息流布局，展示 50 条真实来源记录；未核实现场照片、人员身份和施工阶段不予编造。世界银行历史项目不等于在建工程，英国授标不等于可投标订单。'
            : 'Original editorial feed with 50 source-backed examples; no invented site photos, people or construction phases. World Bank records are not live construction sites; UK awards are not open tenders.'}</p>
          {sourceFeed.loading && <p role="status">{locale === 'zh' ? '正在加载来源记录…' : 'Loading source records…'}</p>}
          {sourceFeed.error && <p role="alert" className="text-amber-700">{locale === 'zh' ? '数据加载失败：' : 'Data unavailable: '}{sourceFeed.error}</p>}
        </div>
      )}
      {demoFeed && (
        <button type="button" className="text-xs text-accent underline" onClick={() => navigate('/feed')}>
          {locale === 'zh' ? '返回真实数据流' : 'Back to source-backed feed'}
        </button>
      )}
      {/* 2. Feed Stream (Media-First Order: 1-line Author -> Headline -> Dominant Media -> Caption -> Project Chip -> Actions) */}
      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="bg-surface border border-hairline rounded-2xl p-8 text-center text-ink-muted">
            <Filter className="w-8 h-8 text-ink-faint mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {locale === 'zh' ? '暂无匹配的工程动态' : 'No matching engineering updates found'}
            </p>
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="mt-3 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-xs text-accent font-semibold border border-hairline"
            >
              {locale === 'zh' ? '清空筛选条件' : 'Clear Filters'}
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            // Apply English localization to mock post text when locale === 'en'
            const localized = getLocalizedPost(post, locale);
            const isFollowing = followingIds ? followingIds.has(post.authorId) : false;
            const commentsList = post.comments || [];
            const isCommentsExpanded = expandedComments[post.id];
            const isTextExpanded = expandedText[post.id];
            const isMenuOpen = openMenuPostId === post.id;
            const tplId = post.illustrationTemplateId;
            const categoryLabel = getCategoryLabel(post.category || post.channel, locale);

            return (
              <article
                key={post.id}
                id={`post-card-${post.id}`}
                className="bg-surface border border-hairline rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs transition-all duration-200 hover:border-border-subtle space-y-2.5"
              >
                {post.isLocalNew && <div className="rounded-lg border border-amber-300/70 bg-amber-50/80 text-amber-900 text-[11px] p-2.5 flex flex-wrap items-center gap-2">
                  <span>{locale === 'zh' ? '本地文章预览 · 未发布到服务器 · 作者身份未核验' : 'Local draft preview · not published · author unverified'}</span>
                  {post.sourceRecordId && <button type="button" className="text-accent underline font-semibold" onClick={() => navigate('/projects/record/' + encodeURIComponent(post.sourceRecordId))}>
                    {locale === 'zh' ? '关联的官方项目档案 →' : 'Related official record →'}
                  </button>}
                </div>}
                {/* 1. Strict 1-Line Author Row: 28px avatar, name, relative time, overflow menu button */}
                <div className="flex items-center justify-between gap-2 relative">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (post.isLocalNew) return;
                        if (post.officialSource) { navigate('/projects/record/' + encodeURIComponent(post.sourceRecordId)); return; }
                        if (post.authorType === 'org') {
                          navigate(`/companies/${post.authorId.toLowerCase()}`);
                        } else {
                          navigate(`/people/${post.authorId.toLowerCase()}`);
                        }
                      }}
                      className="shrink-0 rounded-full hover:opacity-85 transition-opacity"
                      aria-label={`${dict.common?.details || '查看'} ${localized.authorName}`}
                    >
                      <Avatar
                        name={localized.authorName}
                        type={post.authorType === 'org' ? 'company' : 'user'}
                        size="xs"
                      />
                    </button>

                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <button
                        type="button"
                        onClick={() => {
                          if (post.isLocalNew) return;
                        if (post.officialSource) { navigate('/projects/record/' + encodeURIComponent(post.sourceRecordId)); return; }
                        if (post.authorType === 'org') {
                            navigate(`/companies/${post.authorId.toLowerCase()}`);
                          } else {
                            navigate(`/people/${post.authorId.toLowerCase()}`);
                          }
                        }}
                        className="font-semibold text-xs sm:text-sm text-ink hover:text-accent transition-colors truncate"
                      >
                        {localized.authorName}
                      </button>
                      <span className="text-ink-faint text-xs">·</span>
                      <span className="text-xs text-ink-muted whitespace-nowrap shrink-0">
                        {localized.timeAgo}
                      </span>
                      {categoryLabel && (
                        <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.2 rounded font-sans border border-accent/20 shrink-0 hidden sm:inline">
                          {categoryLabel}
                        </span>
                      )}
                      {post.isLocalNew && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded font-mono border border-amber-500/30 shrink-0">
                          {locale === 'zh' ? '本地Mock' : 'Local MOCK'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Secondary Actions Overflow Menu Trigger */}
                  {!post.officialSource && <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenMenuPostId(isMenuOpen ? null : post.id)}
                      className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
                      title={dict.common?.more || '更多操作'}
                      aria-label={dict.common?.more || '更多操作'}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Popover Dropdown for Secondary Actions */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-hairline rounded-xl shadow-lg p-1.5 z-20 space-y-1 text-xs animate-fadeIn">
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleFollow) onToggleFollow(post.authorId);
                            setOpenMenuPostId(null);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-ink flex items-center justify-between"
                        >
                          <span>{isFollowing ? (dict.common?.following || '已关注') : (locale === 'zh' ? '+ 关注此作者' : '+ Follow Author')}</span>
                          {isFollowing && <Check className="w-3.5 h-3.5 text-accent" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (post.isLocalNew) return;
                        if (post.officialSource) { navigate('/projects/record/' + encodeURIComponent(post.sourceRecordId)); return; }
                        if (post.authorType === 'org') {
                              navigate(`/companies/${post.authorId.toLowerCase()}`);
                            } else {
                              navigate(`/people/${post.authorId.toLowerCase()}`);
                            }
                            setOpenMenuPostId(null);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface-hover text-ink flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-ink-muted" />
                          <span>{locale === 'zh' ? '查看作者主页档案' : 'View Author Profile'}</span>
                        </button>

                        <div className="pt-1 border-t border-hairline px-2 py-1 flex items-center justify-between text-[10px] text-ink-muted">
                          <span>{dict.common?.evidence || '核验状态'}</span>
                          {post.officialSource
                            ? <span className="text-ink-muted">Source record · not a verified member</span>
                            : <VerificationBadge level="VERIFIED" isPerson={post.authorType !== 'org'} size="xs" />}
                        </div>
                      </div>
                    )}
                  </div>}
                </div>

                {/* 2. 1-2 Line Dominant Headline */}
                {localized.title && (
                  <h3 className="font-bold text-sm sm:text-base text-ink leading-snug line-clamp-2">
                    {localized.title}
                  </h3>
                )}

                {/* 3. Dominant Media (4:5 / 16:9 Editorial Magazine Presentation) */}
                {post.officialSource ? (
                  <div className="space-y-2">
                    <EngineeringVisual record={post} className="h-40 sm:h-56" showCategory />
                    <div className="rounded-xl border border-hairline bg-surface-subtle p-4 sm:p-5 space-y-2">
                    <div className="text-[10px] tracking-widest uppercase text-accent font-semibold">{post.sourceName} · SOURCE RECORD</div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-semibold text-ink text-lg">{post.amount && Number.isFinite(post.amount.value)
                        ? new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', { style: 'currency', currency: post.amount.currency || 'USD', maximumFractionDigits: 0 }).format(post.amount.value)
                        : (locale === 'zh' ? '未披露金额' : 'Amount not disclosed')}</span>
                      <span className="text-xs text-ink-muted">{post.country} · {post.status || 'Not stated'}</span>
                    </div>
                    <div className="text-xs text-ink-muted">{post.sourceDate || 'Date not reported'} · {locale === 'zh' ? '公开来源档案' : 'Public-source dossier'}</div>
                    </div>
                  </div>
                ) : post.magazineTemplate ? (
                  <div className="pt-0.5">
                    <MagazineTemplateRenderer
                      templateId={post.magazineTemplate}
                      data={post.templateData || { images: post.images }}
                      onInspect={(tpl) => setInspectingTemplate(tpl)}
                    />
                  </div>
                ) : post.images && post.images.length > 0 ? (
                  <div className="pt-0.5">
                    <PhotoEssayTemplate data={{ images: post.images }} />
                  </div>
                ) : tplId ? (
                  <div className="pt-0.5">
                    <EngineeringIllustration
                      templateId={tplId}
                      showBadge={true}
                      showMetaBar={false}
                      showAnnotations={false}
                      onInspect={(tpl) => setInspectingTemplate(tpl)}
                      className="cursor-pointer shadow-xs rounded-lg"
                    />
                  </div>
                ) : null}

                {/* 4. One-Line Editorial Caption */}
                {localized.content && (
                  <div className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                    <p className={isTextExpanded ? '' : 'line-clamp-1 sm:line-clamp-2'}>
                      {localized.content}
                    </p>
                    {localized.content.length > 50 && (
                      <button
                        type="button"
                        onClick={() => setExpandedText(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="text-accent hover:underline font-medium text-xs mt-0.5 inline-block"
                      >
                        {isTextExpanded 
                          ? (locale === 'zh' ? '收起 ▴' : 'Collapse ▴') 
                          : (locale === 'zh' ? '展开阅读 ▾' : 'Read More ▾')}
                      </button>
                    )}
                  </div>
                )}

                {/* 5. Project Association Small Chip */}
                {post.projectId && post.projectId !== 'independent' ? (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${post.projectId.toLowerCase()}`)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle hover:bg-surface-hover text-ink-muted hover:text-accent border border-hairline text-xs font-medium transition-colors max-w-full"
                    >
                      <Building2 className="w-3.5 h-3.5 text-accent shrink-0" />
                      <span className="truncate max-w-[220px] sm:max-w-md">
                        {locale === 'zh' ? '关联项目' : 'Project'} · {localized.projectName ? (localized.projectName.length > 28 ? localized.projectName.slice(0, 28) + '...' : localized.projectName) : post.projectId} ›
                      </span>
                    </button>
                  </div>
                ) : (post.projectId === 'independent' || post.projectName) ? (
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-subtle text-ink-muted border border-hairline text-xs font-medium max-w-full">
                      <Building2 className="w-3.5 h-3.5 text-ink-faint shrink-0" />
                      <span className="truncate max-w-[220px] sm:max-w-md">
                        {localized.projectName || (locale === 'zh' ? '独立工程动态 (无关联项目)' : locale === 'th' ? 'การปฏิบัติงานอิสระ (ไม่เชื่อมโยงโครงการ)' : 'Independent Site Update (Unaffiliated)')}
                      </span>
                    </span>
                  </div>
                ) : null}

                {/* 6. Compact Action Row: Like, Comment, Save, Share */}
                {post.officialSource ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-hairline text-xs">
                    <button type="button" className="font-semibold text-accent hover:underline"
                      onClick={() => navigate('/projects/record/' + encodeURIComponent(post.sourceRecordId))}>
                      {locale === 'zh' ? '查看来源档案 →' : 'Open source dossier →'}
                    </button>
                    <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                      {locale === 'zh' ? '官方原文 ↗' : 'Official source ↗'}
                    </a>
                    <span className="text-ink-muted">{locale === 'zh' ? '只读 · 无模拟点赞' : 'Read-only · no simulated engagement'}</span>
                  </div>
                ) : (
                <>
                <div className="flex items-center justify-between pt-2 border-t border-hairline text-xs text-ink-muted">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Like */}
                    <button
                      type="button"
                      onClick={() => handleToggleLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.isLiked ? 'text-rose-600 font-semibold' : 'hover:text-ink'
                      }`}
                      aria-label={dict.common?.like || '点赞'}
                    >
                      <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes}</span>
                    </button>

                    {/* Comments toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex items-center gap-1.5 hover:text-ink transition-colors"
                      aria-label={dict.common?.comment || '查看评论'}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{commentsList.length}</span>
                    </button>

                    {/* Bookmark / Save */}
                    <button
                      type="button"
                      onClick={() => handleToggleSave(post.id)}
                      className={`flex items-center gap-1.5 transition-colors ${
                        post.isSaved ? 'text-amber-600 font-semibold' : 'hover:text-ink'
                      }`}
                      aria-label={dict.common?.save || '收藏动态'}
                    >
                      <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-amber-500 text-amber-500' : ''}`} />
                      <span>{post.isSaved ? (dict.common?.saved || '已收藏') : (dict.common?.save || '收藏')}</span>
                    </button>
                  </div>

                  {/* Share & Evidence */}
                  <div className="flex items-center gap-2">
                    {post.evidenceId && onSelectEvidence && (
                      <button
                        type="button"
                        onClick={() => onSelectEvidence(post.evidenceId)}
                        className="px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/30 font-mono text-[11px] font-semibold hover:bg-accent/20 transition-colors hidden sm:inline"
                      >
                        {dict.common?.evidence || '存证'} {post.evidenceId}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSharePost(post)}
                      className="flex items-center gap-1 hover:text-accent transition-colors"
                      title={locale === 'zh' ? '复制链接分享' : 'Copy link to share'}
                      aria-label={dict.common?.share || '分享动态'}
                    >
                      {copiedPostId === post.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-accent" />
                          <span className="text-accent font-medium">{locale === 'zh' ? '已复制链接' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{dict.common?.share || '分享'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable Comments Section */}
                {isCommentsExpanded && (
                  <div className="pt-2 border-t border-hairline space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder={locale === 'zh' ? '发表工程专业评论 (回车发送)...' : 'Write an engineering comment (Press Enter)...'}
                        className="flex-1 bg-surface-subtle border border-hairline rounded-xl px-3 py-1.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        disabled={!(commentInputs[post.id] || '').trim()}
                        className="px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>{dict.common?.comment || '评论'}</span>
                      </button>
                    </div>

                    {commentsList.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {commentsList.map(cmt => (
                          <div
                            key={cmt.id}
                            className="p-2 rounded-lg bg-surface-subtle border border-hairline text-xs space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-ink-muted">
                              <span className="font-semibold text-ink">{cmt.authorName}</span>
                              <span className="text-[10px] font-mono text-ink-faint">{cmt.timeAgo}</span>
                            </div>
                            {cmt.authorTitle && (
                              <div className="text-[10px] text-ink-muted">{cmt.authorTitle}</div>
                            )}
                            <p className="text-ink leading-relaxed pt-0.5">{cmt.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Lightbox Modal */}
      {inspectingTemplate && (
        <IllustrationLightboxModal
          template={inspectingTemplate}
          onClose={() => setInspectingTemplate(null)}
        />
      )}
    </div>
  );
}

export default FeedPage;
