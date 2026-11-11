/**
 * Image Provenance & Synthetic Detection Utility
 * 
 * Defines standards for differentiating between genuine high-resolution on-site construction photos,
 * public sample photos (Unsplash), and synthetic/micro test assets (e.g., 1px test uploads, fixtures).
 */

export const MIN_FIELD_PHOTO_DIMENSION = 64;

/**
 * Evaluates whether an image represents a synthetic, micro-dimension, or test fixture
 * rather than an authentic on-site field photograph.
 *
 * Threshold: Any image under 64x64 px, under 512 bytes, explicitly flagged,
 * or bearing synthetic naming patterns is classified as a synthetic test asset.
 *
 * @param {Object|string} img - Image object or image URL string
 * @param {Object} [dims] - Measured natural dimensions { w, h }
 * @returns {boolean} True if classified as synthetic or low-resolution test image
 */
export function isSyntheticOrLowResImage(img, dims) {
  if (!img) return false;

  // 1. String URL heuristic
  if (typeof img === 'string') {
    const s = img.toLowerCase();
    if (
      s.includes('synthetic') ||
      s.includes('1px') ||
      s.includes('pixel') ||
      s.startsWith('data:image/png;base64,ivborw0kggo')
    ) {
      return true;
    }
  }

  // 2. Object property checks
  if (typeof img === 'object') {
    if (img.isSynthetic === true) return true;

    // Recorded pixel dimensions
    if (typeof img.width === 'number' && typeof img.height === 'number') {
      if (img.width < MIN_FIELD_PHOTO_DIMENSION || img.height < MIN_FIELD_PHOTO_DIMENSION) {
        return true;
      }
    }

    // Micro file size (< 512 bytes is typically a 1px or empty header)
    if (typeof img.size === 'number' && img.size > 0 && img.size < 512) {
      return true;
    }

    // Text patterns in filename, caption, or URL
    const str = `${img.fileName || ''} ${img.caption || ''} ${typeof img.url === 'string' ? img.url : ''}`.toLowerCase();
    if (
      str.includes('synthetic') ||
      str.includes('1px') ||
      str.includes('pixel') ||
      str.includes('data:image/png;base64,ivborw0kggo')
    ) {
      return true;
    }
  }

  // 3. Natural dimensions measured on load
  if (dims && typeof dims.w === 'number' && typeof dims.h === 'number' && dims.w > 0 && dims.h > 0) {
    if (dims.w < MIN_FIELD_PHOTO_DIMENSION || dims.h < MIN_FIELD_PHOTO_DIMENSION) {
      return true;
    }
  }

  return false;
}

/**
 * Returns structured provenance badges and metadata for rendering in templates and cards.
 *
 * @param {Object|string} img - Image object or image URL string
 * @param {Object} [dims] - Measured natural dimensions { w, h }
 * @param {string} [locale='zh'] - Active UI locale
 * @returns {Object} Provenance metadata including categoryBadge, captionBadge, and styling
 */
export function getImageProvenanceLabel(img, dims, locale = 'zh') {
  const isZh = locale === 'zh';
  const isTh = locale === 'th';

  const isSynthetic = isSyntheticOrLowResImage(img, dims);
  if (isSynthetic) {
    let dimStr = '';
    const w = dims?.w ?? (typeof img === 'object' ? img?.width : undefined);
    const h = dims?.h ?? (typeof img === 'object' ? img?.height : undefined);
    if (typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0) {
      dimStr = ` (${w}×${h})`;
    }
    return {
      isSynthetic: true,
      categoryBadge: isZh ? '测试图像 (未核验非实景)' : isTh ? 'ภาพทดสอบ (ไม่ใช่หน้างาน)' : 'Test Image (Non-Field Photo)',
      captionBadge: isZh ? `合成测试图像${dimStr} · 非现场照片` : isTh ? `ภาพจำลองทดสอบ${dimStr} · ไม่ใช่ภาพหน้างาน` : `Synthetic Test Image${dimStr} · Non-Field Photo`,
      badgeColorClass: 'text-amber-700 dark:text-amber-400 font-semibold'
    };
  }

  const isSample = Boolean(
    typeof img === 'object' && (
      img?.isSample || 
      img?.isUnsplash || 
      (typeof img?.url === 'string' && img.url.includes('unsplash.com'))
    )
  );

  if (isSample) {
    return {
      isSynthetic: false,
      isSample: true,
      categoryBadge: isZh ? '现场图志 / PHOTO ESSAY' : 'Photo Essay',
      captionBadge: isZh ? '示例照片 (Unsplash)' : isTh ? 'ภาพตัวอย่าง (Unsplash)' : 'Sample Photo (Unsplash)',
      badgeColorClass: 'text-ink-faint'
    };
  }

  return {
    isSynthetic: false,
    isSample: false,
    categoryBadge: isZh ? '现场图志 / PHOTO ESSAY' : 'Photo Essay',
    captionBadge: isZh ? '用户上传图片 (未核验实景)' : isTh ? 'รูปภาพที่ผู้ใช้อัปโหลด (ยังไม่ตรวจทาน)' : 'User-Provided Image (Unverified)',
    badgeColorClass: 'text-ink-faint'
  };
}
