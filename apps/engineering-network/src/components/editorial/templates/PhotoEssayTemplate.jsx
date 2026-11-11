import React, { useState } from 'react';
import { Camera, Maximize2, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext';
import { isSyntheticOrLowResImage, getImageProvenanceLabel, MIN_FIELD_PHOTO_DIMENSION } from '../../../utils/imageProvenance';

export { isSyntheticOrLowResImage, getImageProvenanceLabel, MIN_FIELD_PHOTO_DIMENSION };

const FALLBACK_PHOTO_ESSAY_IMAGE = 'https://images.unsplash.com/photo-1748956628042-b73331e0b479?auto=format&fit=crop&w=1200&q=80';

export function PhotoEssayTemplate({ data = {}, onInspect }) {
  const { locale } = useI18n();
  const isZh = locale === 'zh';

  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [failedImages, setFailedImages] = useState({});
  const [imageDims, setImageDims] = useState({});

  // If data.images is explicitly an empty array (user selected 0 photos), render clean text brief without stock fallback
  if (Array.isArray(data.images) && data.images.length === 0) {
    return (
      <div className="w-full p-4 bg-surface border border-hairline rounded-xl text-left space-y-2">
        {data.headline && (
          <h4 className="font-bold text-sm text-ink">{data.headline}</h4>
        )}
        {data.caption && (
          <p className="text-xs text-ink-muted leading-relaxed whitespace-pre-wrap">{data.caption}</p>
        )}
        <div className="text-[10px] text-ink-faint font-mono pt-1 border-t border-hairline">
          {isZh ? '文字动态 · 0 张照片' : (locale === 'th' ? 'ข้อความล้วน · 0 รูป' : 'Text Brief · 0 Photos')}
        </div>
      </div>
    );
  }

  const images = Array.isArray(data.images) && data.images.length > 0 
    ? data.images 
    : [
        {
          url: FALLBACK_PHOTO_ESSAY_IMAGE,
          caption: isZh ? '大跨度钢结构框架高空吊装与塔吊同步作业' : (locale === 'th' ? 'การประกอบโครงสร้างเหล็กขนาดใหญ่ด้วยทาวเวอร์เครนแบบซิงโครไนซ์' : 'Heavy structural steel frame erection with synchronized tower crane hoist')
        },
        {
          url: 'https://images.unsplash.com/photo-1742278970780-5183fa6329fd?auto=format&fit=crop&w=1200&q=80',
          caption: isZh ? '大跨度空间网架门式刚架结构对齐校准' : (locale === 'th' ? 'การตรวจสอบความเที่ยงตรงของโครงสร้างโครงถักหลังคาเชิงพื้นที่' : 'Space truss roof portal frame structural alignment verification')
        },
        {
          url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
          caption: isZh ? '现场钢构与钢筋绑扎施工组节点复核' : (locale === 'th' ? 'ทีมช่างโครงสร้างและเหล็กเสริมกำลังตรวจทานจุดเชื่อมต่อหน้างาน' : 'On-site structural ironworkers and rebar assembly crew before joint pour')
        }
      ];

  const activeImage = images[activeIndex] || images[0];
  const totalCount = images.length;

  const currentDims = imageDims[activeIndex];
  const provenance = getImageProvenanceLabel(activeImage, currentDims, locale);
  const isSynthetic = provenance.isSynthetic;

  return (
    <div className="w-full bg-surface-subtle border border-hairline rounded-xl overflow-hidden select-none">
      {/* 1. Main Dominant Visual (4:5 Aspect Ratio Container) */}
      <div className="relative aspect-[4/5] sm:aspect-[4/5] bg-canvas overflow-hidden group">
        {failedImages[activeIndex] ? (() => {
          const isBlob = typeof activeImage.url === 'string' && activeImage.url.startsWith('blob:');
          return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-surface-subtle border border-dashed border-hairline space-y-2">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-ink">
                {isBlob 
                  ? (isZh ? '本地演示照片 (未存入云端)' : (locale === 'th' ? 'ภาพตัวอย่างในเครื่อง' : 'Prototype Demo Photo'))
                  : (isZh ? '图片加载失败' : (locale === 'th' ? 'โหลดภาพไม่สำเร็จ' : 'Image Unavailable'))}
              </span>
              <p className="text-[11px] text-ink-muted max-w-xs leading-relaxed">
                {isBlob
                  ? (isZh 
                    ? '本原型为无状态前端演示环境，本地上传的图片未配置云端持久化存储服务器。' 
                    : (locale === 'th' ? 'ในสภาพแวดล้อมจำลองนี้ ภาพตัวอย่างในเครื่องยังไม่ได้จัดเก็บบนคลาวด์' : 'In this stateless frontend demo, uploaded local images are not persisted to cloud storage.'))
                  : (isZh 
                    ? '示例图片或远程资源暂时无法加载，请检查网络连接或更换图片。' 
                    : (locale === 'th' ? 'ไม่สามารถโหลดภาพตัวอย่างได้ในขณะนี้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต' : 'Sample image or remote asset could not be loaded.'))}
              </p>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-hairline text-ink-faint">
                {isBlob ? 'PROTOTYPE DEMO PHOTO' : 'ASSET UNAVAILABLE'}
              </span>
            </div>
          );
        })() : (
          <img
            src={activeImage.url}
            alt={activeImage.caption || (isSynthetic 
              ? (isZh ? `测试图像第 ${activeIndex + 1} 张 (未核验)` : `Test Image #${activeIndex + 1} (Unverified)`)
              : (isZh ? `现场图志第 ${activeIndex + 1} 张` : `Photo Essay #${activeIndex + 1}`))}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            onLoad={(e) => {
              const w = e.target.naturalWidth || 0;
              const h = e.target.naturalHeight || 0;
              setImageDims(prev => ({ ...prev, [activeIndex]: { w, h } }));
            }}
            onError={() => {
              setFailedImages(prev => ({ ...prev, [activeIndex]: true }));
            }}
          />
        )}

        {/* Top Badges: Category & Counter */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          {isSynthetic ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 backdrop-blur-md text-[10px] font-mono text-amber-200 border border-amber-500/40">
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>{provenance.categoryBadge}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-mono text-white border border-white/20">
              <Camera className="w-3 h-3 text-accent" />
              <span>{provenance.categoryBadge}</span>
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-mono text-white/90 border border-white/20">
            {activeIndex + 1} / {totalCount}
          </span>
        </div>

        {/* Image Zoom / Lightbox Trigger */}
        <button
          type="button"
          onClick={() => setFullscreenImage(activeImage.url)}
          className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors"
          title={isZh ? '放大全屏查看' : (locale === 'th' ? 'ขยายเต็มหน้าจอ' : 'View full screen')}
          aria-label={isZh ? '放大全屏查看' : (locale === 'th' ? 'ขยายเต็มหน้าจอ' : 'View full screen')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Prev / Next overlay arrows if > 1 image */}
        {totalCount > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalCount - 1));
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity opacity-80 sm:opacity-0 group-hover:opacity-100"
              aria-label={isZh ? '上一张照片' : (locale === 'th' ? 'รูปก่อนหน้า' : 'Previous photo')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex((prev) => (prev < totalCount - 1 ? prev + 1 : 0));
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition-opacity opacity-80 sm:opacity-0 group-hover:opacity-100"
              aria-label={isZh ? '下一张照片' : (locale === 'th' ? 'รูปถัดไป' : 'Next photo')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* 2. Photo Sequence Strip / Thumbnail Row (if > 1 image) */}
      {totalCount > 1 && (
        <div className="p-2 border-t border-hairline flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                activeIndex === idx 
                  ? 'border-accent shadow-xs scale-105' 
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              {failedImages[idx] ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-surface-subtle text-amber-500 p-0.5 text-center">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="text-[7px] font-mono leading-none mt-0.5">{typeof img.url === 'string' && img.url.startsWith('blob:') ? 'DEMO' : 'FAILED'}</span>
                </div>
              ) : (
                <img 
                  src={img.url} 
                  alt={isZh ? `缩略图 ${idx + 1}` : (locale === 'th' ? `รูปขนาดย่อ ${idx + 1}` : `Thumbnail ${idx + 1}`)} 
                  className="w-full h-full object-cover" 
                  onError={() => {
                    setFailedImages(prev => ({ ...prev, [idx]: true }));
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* 3. Editorial Photo Caption Line & Provenance */}
      <div className="px-3 py-2 bg-surface text-ink-muted text-xs border-t border-hairline flex items-center justify-between gap-2">
        <span className="truncate">
          <span className="font-mono text-accent font-semibold mr-1.5">[{activeIndex + 1}]</span>
          {activeImage.caption || (isZh ? '（无附加图注）' : '(No caption)')}
        </span>
        <span className={`text-[10px] font-mono shrink-0 whitespace-nowrap ${provenance.badgeColorClass}`}>
          {provenance.captionBadge}
        </span>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            aria-label={isZh ? '关闭大图' : 'Close full screen image'}
          >
            <X className="w-6 h-6" />
          </button>
          {failedImages[activeIndex] ? (() => {
            const isBlob = typeof fullscreenImage === 'string' && fullscreenImage.startsWith('blob:');
            return (
              <div className="p-8 bg-surface rounded-xl border border-hairline text-center max-w-sm space-y-2 text-ink" onClick={(e) => e.stopPropagation()}>
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="font-bold text-sm">
                  {isBlob
                    ? (isZh ? '本地演示照片 (未存入云端)' : (locale === 'th' ? 'ภาพตัวอย่างในเครื่อง' : 'Prototype Demo Photo'))
                    : (isZh ? '图片加载失败' : (locale === 'th' ? 'โหลดภาพไม่สำเร็จ' : 'Image Unavailable'))}
                </div>
                <div className="text-xs text-ink-muted">
                  {isBlob
                    ? (isZh ? '本原型为无状态前端演示环境，未配置云端持久化存储。' : 'Stateless prototype demo without cloud storage.')
                    : (isZh ? '远程资源无法加载' : 'Remote asset could not be loaded.')}
                </div>
              </div>
            );
          })() : (
            <div className="relative flex flex-col items-center max-w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <img
                src={fullscreenImage}
                alt={isZh ? '全屏查看图片' : (locale === 'th' ? 'ดูภาพเต็มจอ' : 'Full screen image preview')}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onError={() => {
                  setFailedImages(prev => ({ ...prev, [activeIndex]: true }));
                }}
              />
              {isSynthetic && (
                <div className="mt-2 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-mono pointer-events-none flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{provenance.captionBadge}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PhotoEssayTemplate;
