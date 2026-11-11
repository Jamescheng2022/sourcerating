import React from 'react';
import { X } from 'lucide-react';
import { useDialogA11y } from '../../utils/useDialogA11y';
import { useI18n } from '../../i18n/I18nContext';

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = ''
}) {
  const dialogRef = useDialogA11y(onClose, isOpen);
  const { locale, dict } = useI18n();
  const closeLabel = dict?.common?.closeDialog || (locale === 'zh' ? '关闭对话框' : locale === 'th' ? 'ปิดกล่องโต้ตอบ' : 'Close dialog');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-fadeIn"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.36)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-surface rounded-2xl shadow-2xl border border-hairline overflow-hidden flex flex-col max-h-[90vh] text-ink focus:outline-none ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-hairline bg-surface-subtle shrink-0">
          <div>
            {title && (
              <h2 id="dialog-title" className="text-base sm:text-lg font-bold text-ink tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p id="dialog-description" className="text-xs text-ink-muted mt-0.5">
                {description}
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs sm:text-sm text-ink space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Dialog;
