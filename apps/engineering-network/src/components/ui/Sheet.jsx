import React from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../utils/useDialogA11y';
import { useI18n } from '../../i18n/I18nContext';

export function Sheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  position = 'right', // 'right' | 'bottom'
  width = 'max-w-md',
  className = ''
}) {
  const dialogRef = useDialogA11y(onClose, isOpen);
  const { locale, dict } = useI18n();
  const closeLabel = dict?.common?.closePanel || (locale === 'zh' ? '关闭面板' : locale === 'th' ? 'ปิดแผง' : 'Close panel');

  if (!isOpen) return null;

  const isBottom = position === 'bottom';

  // For right-side sheet: full-width on mobile/phablet (< 768px), restrained max-w-md at >= 768px
  const widthClasses = isBottom
    ? 'w-full rounded-t-2xl max-h-[85vh] border-t border-hairline'
    : `w-full max-w-full md:max-w-md h-full border-l border-hairline`;

  return (
    <div
      className="fixed inset-0 z-50 flex backdrop-blur-xs transition-opacity animate-fadeIn"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.36)',
        alignItems: isBottom ? 'flex-end' : 'stretch',
        justifyContent: isBottom ? 'center' : 'flex-end'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        tabIndex={-1}
        className={`bg-surface shadow-2xl flex flex-col focus:outline-none text-ink ${widthClasses} ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-hairline bg-surface-subtle shrink-0">
          <div>
            {title && (
              <h2 id="sheet-title" className="text-base sm:text-lg font-bold text-ink tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-ink-muted mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm text-ink space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Sheet;
