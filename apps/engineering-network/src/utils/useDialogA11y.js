import { useEffect, useRef } from 'react';

/**
 * Hook for managing dialog/modal accessibility:
 * - Only binds events and manages focus when isOpen === true
 * - Uses ref for onClose so component re-renders (e.g. typing into inputs) never restart effect or steal focus
 * - Focus entrance: moves focus into dialog only if focus is not already inside
 * - Focus trap: cycles Tab / Shift+Tab inside dialog
 * - Escape key dismisses
 * - Focus restoration: returns focus to trigger element on close
 */
export function useDialogA11y(onClose, isOpen = true) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated without re-running the main a11y effect
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the element that had focus before opening dialog
    previousFocus.current = document.activeElement;

    // Move focus inside dialog only if focus is not already inside dialog
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        if (!dialogRef.current.contains(document.activeElement)) {
          const focusables = dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      }
    }, 20);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (onCloseRef.current) onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === dialogRef.current) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, [isOpen]);

  return dialogRef;
}
