import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Sparkles, Image as ImageIcon, X, Check, ArrowRight,
  ArrowLeft, Upload, Trash2, Save, AlertCircle, Camera, 
  Building2, CheckCircle2, Milestone, User, FileText, ChevronDown, ChevronRight
} from 'lucide-react';
import { resolveAuthorProfile, PROJECTS_LIST } from '../../data/projectData';
import { getLocalizedProject } from '../../i18n/projectsEn';
import { isSyntheticOrLowResImage, MIN_FIELD_PHOTO_DIMENSION } from '../../utils/imageProvenance';
import { ARTICLE_CATEGORIES, normalizeCategory, getCategoryLabel } from '../../data/categories';
import { useI18n } from '../../i18n/I18nContext';
import { EngineeringPublisherWizard } from './EngineeringPublisherWizard';

export function ComposeModal({ isOpen, onClose, onPostCreated, activeRole = 'ENG-01' }) {
  const { locale, dict } = useI18n();
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  // 3-Step Flow: 1: Media (Optional) -> 2: Title & Caption (Required) -> 3: Project & Publish
  const [step, setStep] = useState(1);
  const [smartOpen, setSmartOpen] = useState(false);
  const [linkedSourceRecord, setLinkedSourceRecord] = useState(null);

  // Content state
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [images, setImages] = useState([]); // Default empty! Do not pre-fill sample images
  const [category, setCategory] = useState('site_update');
  const [selectedProjectId, setSelectedProjectId] = useState('DEMO-PRJ-P001');
  const [showAdvancedLayout, setShowAdvancedLayout] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [storageWarning, setStorageWarning] = useState(null);

  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);

  // Restore draft from localStorage on initial open
  useEffect(() => {
    if (isOpen) {
      try {
        const savedDraft = localStorage.getItem('atlas_compose_draft_v42');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.headline) setHeadline(parsed.headline);
          if (parsed.bodyText) setBodyText(parsed.bodyText);
          if (parsed.category) setCategory(normalizeCategory(parsed.category));
          if (parsed.selectedProjectId) setSelectedProjectId(parsed.selectedProjectId);
          if (Array.isArray(parsed.images) && parsed.images.length > 0) {
            setImages(parsed.images);
          }
        }
      } catch (e) {}
    }
  }, [isOpen]);

  // Auto-save draft changes to localStorage
  useEffect(() => {
    if (!isOpen) return;
    try {
      if (headline.trim() || bodyText.trim() || images.length > 0) {
        localStorage.setItem('atlas_compose_draft_v42', JSON.stringify({
          headline,
          bodyText,
          category,
          selectedProjectId,
          images: images.filter(img => typeof img.url === 'string' && img.url.startsWith('data:')),
          updatedAt: new Date().toISOString()
        }));
        setStorageWarning(null);
      }
    } catch (e) {
      setStorageWarning(
        isZh
          ? '浏览器本地存储已满或写入失败：草稿仅保存在临时内存中，刷新页面将丢失。'
          : isTh
          ? 'หน่วยความจำเบราว์เซอร์เต็ม: ร่างจะถูกเก็บในหน่วยความจำชั่วคราวเท่านั้น'
          : 'Browser storage full or write failed: draft is held in temporary memory only and will not survive reload.'
      );
    }
  }, [isOpen, headline, bodyText, category, selectedProjectId, images, isZh, isTh]);

  if (!isOpen) return null;

  // Resolve active author profile
  const profile = resolveAuthorProfile(activeRole, locale);
  const authorId = profile.authorId;
  const authorName = profile.authorName;
  const authorTitle = profile.authorTitle;
  const authorType = profile.authorType;

  const showNotice = (msg) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  // Convert uploaded image file to durable data URL (downscaled via canvas to ~50KB)
  // FAIL CLOSED: if canvas or decode fails, returns null rather than falling back to un-sanitized raw bytes
  const processImageFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target.result;
        if (typeof window === 'undefined') {
          resolve(null);
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
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

            resolve({
              url: optimizedDataUrl,
              fileName: file.name,
              caption: file.name.replace(/\.[^/.]+$/, ''),
              isCustomUpload: true,
              isSynthetic: (width < MIN_FIELD_PHOTO_DIMENSION || height < MIN_FIELD_PHOTO_DIMENSION)
            });
          } catch (err) {
            // FAIL CLOSED: do not fall back to raw Data URL containing original EXIF
            resolve(null);
          }
        };
        img.onerror = () => {
          // FAIL CLOSED: do not fall back to raw Data URL containing original EXIF
          resolve(null);
        };
        img.src = rawDataUrl;
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle local file upload
  const handleFileUpload = async (e) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const validFiles = rawFiles.filter(file => {
      const isImg = file.type && file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return isImg && isValidSize;
    });

    if (validFiles.length === 0) {
      showNotice(isZh ? '请上传有效的图片文件 (PNG/JPG/WebP, ≤10MB)' : 'Please select a valid image file (PNG/JPG/WebP, ≤10MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const remainingSlots = 6 - images.length;
    const filesToProcess = validFiles.slice(0, remainingSlots);

    const processedRaw = await Promise.all(filesToProcess.map(processImageFile));
    const processed = processedRaw.filter(Boolean);
    const failedCount = filesToProcess.length - processed.length;

    if (processed.length > 0) {
      setImages(prev => [...prev, ...processed]);
      showNotice(
        isZh 
          ? `已载入 ${processed.length} 张现场照片至草稿${failedCount > 0 ? ` (已跳过 ${failedCount} 张无效或解码失败文件)` : ''}`
          : `Loaded ${processed.length} photo(s) into draft editor${failedCount > 0 ? ` (skipped ${failedCount} invalid/un-decodable files)` : ''}`
      );
    } else {
      showNotice(
        isZh 
          ? '所选文件无法安全解码或重编码，操作已中止。' 
          : 'Selected file(s) could not be safely decoded or processed.'
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Explicit Sample Photo Loader (Only if user intentionally asks for demonstration sample)
  const handleLoadSamplePhoto = () => {
    const sampleImg = {
      url: 'https://images.unsplash.com/photo-1748956628042-b73331e0b479?auto=format&fit=crop&w=1200&q=80',
      caption: isZh ? '大跨度钢结构框架高空吊装' : 'Heavy structural steel frame erection',
      isSample: true
    };
    setImages([sampleImg]);
    showNotice(isZh ? '已加载示范样图（仅用于测试）' : 'Loaded sample demo photo');
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Step 2 Validation: Block next step on empty title/caption
  const handleProceedToStep3 = () => {
    const hasHeadline = headline.trim().length > 0;
    const hasBody = bodyText.trim().length > 0;

    if (!hasHeadline && !hasBody) {
      setValidationError(
        isZh 
          ? '请输入动态标题或正文描述。系统严格禁止发布空动态。' 
          : isTh 
          ? 'กรุณากรอกหัวข้อหรือเนื้อหารายงาน ระบบไม่อนุญาตให้โพสต์ข้อความว่างเปล่า' 
          : 'Please enter a title or caption. Empty posts are prohibited.'
      );
      return;
    }

    setValidationError(null);
    setStep(3);
  };

  const applyStructuredDraft = ({ headline: title, bodyText: article, images: authorImages, category: articleCategory, linkedRecord }) => {
    setHeadline(title);
    setBodyText(article);
    setImages(authorImages || []);
    setCategory(normalizeCategory(articleCategory));
    setLinkedSourceRecord(linkedRecord || null);
    setSelectedProjectId('independent');
    setStep(2);
    setValidationError(null);
    setSmartOpen(false);
    showNotice(isZh ? '结构化文章已载入原编辑器；请再核对并确认' : 'Structured draft loaded; review before local preview');
  };

  // Handle Mock Publish
  const handleMockPublish = () => {
    const hasHeadline = headline.trim().length > 0;
    const hasBody = bodyText.trim().length > 0;

    if (!hasHeadline && !hasBody) {
      setValidationError(isZh ? '动态内容不能为空' : 'Post content cannot be empty');
      setStep(2);
      return;
    }

    const isIndependent = selectedProjectId === 'independent';
    let finalProjectId = null;
    let finalProjectName = '';

    if (isIndependent) {
      finalProjectId = 'independent';
      finalProjectName = isZh
        ? '独立工程动态 (无关联特定工程)'
        : isTh
        ? 'การปฏิบัติงานอิสระ (ไม่เชื่อมโยงโครงการ)'
        : 'Independent Site Update (Unaffiliated)';
    } else {
      const rawSel = (selectedProjectId || 'DEMO-PRJ-P001').toUpperCase();
      const chosenRawProject = PROJECTS_LIST.find(p => {
        const pid = p.id.toUpperCase();
        return pid === rawSel || pid.endsWith(`-${rawSel}`) || pid === `DEMO-PRJ-${rawSel}`;
      }) || PROJECTS_LIST[0];
      const chosenProject = getLocalizedProject(chosenRawProject, locale);
      finalProjectId = chosenRawProject.id;
      finalProjectName = chosenProject?.name || chosenRawProject.name;
    }

    const postTitle = headline.trim() || bodyText.trim().slice(0, 40);
    const postBody = bodyText.trim() || (images[0]?.caption || postTitle);

    if (linkedSourceRecord) {
      finalProjectId = 'atlas:' + linkedSourceRecord.id;
      finalProjectName = linkedSourceRecord.title;
    }
    const hasSyntheticImages = images.some(img => isSyntheticOrLowResImage(img));

    const newPost = {
      id: `POST-LOCAL-${Date.now()}`,
      type: images.length > 0 ? 'SITE_PHOTO' : 'MAGAZINE_EDITORIAL',
      authorType,
      authorId,
      authorName,
      authorTitle,
      projectId: finalProjectId,
      projectName: finalProjectName,
      timeAgo: locale === 'en' ? 'Just now' : locale === 'th' ? 'เมื่อสักครู่' : '刚刚',
      title: postTitle,
      content: postBody,
      likes: 1,
      isLiked: false,
      isSaved: false,
      isLocalNew: true,
      isEditorialDraft: true,
      sourceRecordId: linkedSourceRecord?.id || null,
      sourceUrl: linkedSourceRecord?.sourceUrl || null,
      isSynthetic: hasSyntheticImages,
      category,
      magazineTemplate: images.length > 0 ? 'photo_essay' : null,
      templateData: {
        images: images,
        headline: postTitle,
        caption: postBody,
      },
      comments: []
    };

    if (onPostCreated) {
      onPostCreated(newPost);
    }

    // Clear saved draft and reset composer state so next post starts clean
    try {
      localStorage.removeItem('atlas_compose_draft_v42');
    } catch (e) {}

    setHeadline('');
    setBodyText('');
    setImages([]);
    setSelectedProjectId('DEMO-PRJ-P001');
    setLinkedSourceRecord(null);
    setCategory('site_update');
    setStep(1);
    setValidationError(null);

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-modal-title"
        tabIndex={-1}
        className="w-full max-w-xl bg-surface border border-hairline rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-ink select-none animate-fadeIn focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-surface-subtle border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent text-white flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="compose-modal-title" className="font-bold text-sm text-ink truncate">
                {isZh ? '发布工程动态' : isTh ? 'โพสต์ความคืบหน้างานวิศวกรรม' : 'Create Engineering Post'}
              </h2>
              <div className="text-[10px] text-ink-muted truncate">
                {isZh ? `发布者身份: ${authorName} (${authorTitle})` : `Author: ${authorName}`}
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setSmartOpen(true)}
            className="inline-flex items-center gap-1.5 bg-accent text-white rounded-lg px-2.5 sm:px-3 py-2 text-[11px] font-semibold shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            {isZh ? 'AI 辅助文章' : 'AI-assisted article'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Progress Bar */}
        <div className="px-4 py-2.5 bg-surface border-b border-hairline flex items-center justify-between text-xs">
          {[
            { stepNum: 1, labelZh: '1. 照片 (可选)', labelEn: '1. Photo (Optional)' },
            { stepNum: 2, labelZh: '2. 标题与正文', labelEn: '2. Title & Content' },
            { stepNum: 3, labelZh: '3. 关联与发布', labelEn: '3. Project & Publish' }
          ].map(s => {
            const isActive = step === s.stepNum;
            const isDone = step > s.stepNum;
            return (
              <div key={s.stepNum} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[11px] font-bold ${
                  isActive 
                    ? 'bg-accent text-white shadow-xs' 
                    : isDone 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-surface-subtle border border-hairline text-ink-muted'
                }`}>
                  {isDone ? <Check className="w-3 h-3" /> : s.stepNum}
                </span>
                <span className={`font-medium hidden sm:inline ${
                  isActive ? 'text-accent font-bold' : isDone ? 'text-ink' : 'text-ink-muted'
                }`}>
                  {isZh ? s.labelZh : s.labelEn}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status Notice Toast */}
        {statusNotice && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* Validation Error Toast */}
        {validationError && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Storage Failure / Quota Error Toast */}
        {storageWarning && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>{storageWarning}</span>
          </div>
        )}

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STEP 1: OPTIONAL PHOTO */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-ink">
                  {isZh ? '步骤 1: 上传施工现场照片 (可选)' : 'Step 1: Upload Field Photos (Optional)'}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {isZh
                    ? '照片为非必填项。如果您仅发布现场技术简报、工程通知或管理日志，可直接点击下一步跳过。'
                    : 'Photos are optional. For text-only updates, technical briefs, or site announcements, click Next to skip.'}
                </p>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-hairline hover:border-accent rounded-2xl bg-surface-subtle flex flex-col items-center justify-center text-center cursor-pointer transition-colors group space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-xl bg-surface border border-hairline flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-semibold text-xs sm:text-sm text-ink">
                    {isZh ? '点击选择现场施工照片' : 'Click to select construction photos'}
                  </span>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {isZh ? '支持 PNG/JPG/WebP (≤10MB) · 浏览器本地沙盒处理' : 'PNG/JPG/WebP (≤10MB) · Processed locally in client sandbox'}
                  </p>
                </div>
              </div>

              {/* Uploaded Images Preview Grid */}
              {images.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink">
                      {isZh ? `已选择 ${images.length} 张照片` : `Selected ${images.length} photo(s)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-ink-muted hover:text-rose-500 text-[11px]"
                    >
                      {isZh ? '清空全部' : 'Remove all'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-hairline bg-surface group">
                        <img 
                          src={img.url} 
                          alt={img.caption || `Uploaded #${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-rose-600 transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Photo Button (Clearly distinguished from user-uploaded) */}
              {images.length === 0 && (
                <div className="pt-2 border-t border-hairline flex items-center justify-between text-xs">
                  <span className="text-ink-faint text-[11px]">
                    {isZh ? '仅作原型测试用途:' : 'For prototype demonstration:'}
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadSamplePhoto}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    {isZh ? '载入一张示范样图' : 'Load sample demo photo'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TITLE & CAPTION (REQUIRED) */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-ink">
                  {isZh ? '步骤 2: 填写动态标题与内容 (必填)' : 'Step 2: Enter Title & Content (Required)'}
                </h3>
                <p className="text-xs text-ink-muted">
                  {isZh 
                    ? '请真实陈述施工现场进展、技术要点或工序质量记录。禁止发布空内容。' 
                    : 'Describe site progress, engineering methods, or milestone observations. Empty posts are blocked.'}
                </p>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">
                  {isZh ? '动态标题 (必填)' : 'Title (Required)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  id="compose-headline-input"
                  type="text"
                  value={headline}
                  onChange={(e) => {
                    setHeadline(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={isZh ? '例如：大跨度钢网架结构顺利完成顶升节点' : 'e.g., Heavy space truss synchronized lift successfully completed'}
                  className="w-full bg-surface-subtle text-xs sm:text-sm text-ink px-3 py-2 rounded-xl border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Caption / Content Textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">
                  {isZh ? '现场内容与工序简述' : 'Field Notes & Description'}
                </label>
                <textarea
                  id="compose-body-textarea"
                  rows={4}
                  value={bodyText}
                  onChange={(e) => {
                    setBodyText(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder={isZh ? '记录测控参数、协作标段、质量抽检情况或技术要点...' : 'Record surveying tolerances, package coordination, or quality inspection details...'}
                  className="w-full bg-surface-subtle text-xs sm:text-sm text-ink px-3 py-2 rounded-xl border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              {/* Thumbnail indicator if images were uploaded */}
              {images.length > 0 && (
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-hairline flex items-center gap-2 text-xs text-ink-muted">
                  <Camera className="w-4 h-4 text-accent shrink-0" />
                  <span>{isZh ? `已附带 ${images.length} 张现场照片` : `${images.length} photo(s) attached`}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PROJECT ASSOCIATION & PUBLISH */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-ink">
                  {isZh ? '步骤 3: 关联工程项目与发布确认' : 'Step 3: Project Association & Publish'}
                </h3>
                <p className="text-xs text-ink-muted">
                  {isZh 
                    ? '选择本条动态所属的工程项目与分类标签。确认后将在本地模拟流中发布。' 
                    : 'Associate your post with an engineering project dossier and publish locally.'}
                </p>
              </div>

              {/* Project Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">
                  {isZh ? '关联工程项目' : 'Associated Project'}
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-surface-subtle text-xs sm:text-sm text-ink px-3 py-2 rounded-xl border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="DEMO-PRJ-P001">{isZh ? 'DEMO-PRJ-P001: 智能高端装备制造基地' : 'DEMO-PRJ-P001: Smart High-End Fab Base'}</option>
                  <option value="DEMO-PRJ-P002">{isZh ? 'DEMO-PRJ-P002: 轨道交通超深基坑支护工程' : 'DEMO-PRJ-P002: Deep Metro Station Pit Shoring'}</option>
                  <option value="DEMO-PRJ-P003">{isZh ? 'DEMO-PRJ-P003: 重大装备总装总承包示范区' : 'DEMO-PRJ-P003: Heavy Equipment Assembly Plant'}</option>
                  <option value="independent">{isZh ? '独立工程动态 (不关联特定项目)' : 'Independent Site Update (No project link)'}</option>
                </select>
              </div>

              {/* Category Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink">
                  {isZh ? '工序分类标签' : 'Process Category'}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-subtle text-xs sm:text-sm text-ink px-3 py-2 rounded-xl border border-hairline focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="site_update">{isZh ? '现场施工进展 (Site Update)' : 'Site Update'}</option>
                  <option value="technical_note">{isZh ? '技术工法与质检 (Technical Note)' : 'Technical Note'}</option>
                  <option value="milestone">{isZh ? '重大节点与验收 (Milestone)' : 'Milestone'}</option>
                  <option value="safety_brief">{isZh ? '安全巡查与规范 (Safety Brief)' : 'Safety Brief'}</option>
                </select>
              </div>

              {/* Optional Advanced Layout Accordion (Not forced on user!) */}
              <div className="border border-hairline rounded-xl overflow-hidden bg-surface-subtle">
                <button
                  type="button"
                  onClick={() => setShowAdvancedLayout(!showAdvancedLayout)}
                  className="w-full p-3 flex items-center justify-between text-xs font-medium text-ink-muted hover:text-ink transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>{isZh ? '高级排版设置 (可选 / Optional Layout)' : 'Advanced Editorial Layout (Optional)'}</span>
                  </div>
                  {showAdvancedLayout ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showAdvancedLayout && (
                  <div className="p-3 pt-0 border-t border-hairline text-xs space-y-2 bg-surface text-ink-muted">
                    <p className="text-[11px] leading-relaxed">
                      {isZh 
                        ? '当前已默认适配现场实录极简图志排版。多栏杂志、全景对比与技术蓝图等进阶排版模板目前为「开发中 (Coming Soon)」，不会强制介入简易发布流程。' 
                        : 'Default editorial layout is applied. Magazine multi-column and split-blueprint templates are coming soon and are not forced on routine posts.'}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-accent">
                      <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20">Photo Essay Standard</span>
                      <span className="px-2 py-0.5 rounded bg-surface-subtle border border-hairline text-ink-faint">Split Blueprint (Coming Soon)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Honest Local Demo Notice */}
              <div className="p-3 rounded-xl bg-surface-subtle border border-hairline text-xs text-ink-muted flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {isZh
                    ? '本地模拟发布说明：发布后动态将呈现在首页关注流与您的工程师个人主页中。本原型为纯前端本地沙盒环境，未接入远程服务器或云对象存储。'
                    : 'Mock publish note: Post will appear in the home feed and your personal portfolio. This is an offline client sandbox without remote cloud storage.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions Bar */}
        <div className="px-4 py-3 bg-surface-subtle border-t border-hairline flex items-center justify-between gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setValidationError(null);
                setStep(step - 1);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-surface hover:bg-surface-hover text-ink text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isZh ? '上一步' : 'Back'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-hairline bg-surface hover:bg-surface-hover text-ink text-xs font-medium transition-colors"
            >
              {isZh ? '取消' : 'Cancel'}
            </button>
          )}

          {step === 1 && (
            <button
              id="compose-next-step-1"
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <span>{isZh ? '下一步: 填写内容 →' : 'Next: Content →'}</span>
            </button>
          )}

          {step === 2 && (
            <button
              id="compose-next-step-2"
              type="button"
              onClick={handleProceedToStep3}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <span>{isZh ? '下一步: 关联项目 →' : 'Next: Project →'}</span>
            </button>
          )}

          {step === 3 && (
            <button
              id="compose-publish-btn"
              type="button"
              onClick={handleMockPublish}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isZh ? '立即模拟发布 (Mock Publish)' : 'Publish Mock Post'}</span>
            </button>
          )}
        </div>
      </div>
      <EngineeringPublisherWizard
        isOpen={smartOpen}
        onClose={() => setSmartOpen(false)}
        onUseDraft={applyStructuredDraft}
        locale={locale}
      />
    </div>
  );
}

export default ComposeModal;
