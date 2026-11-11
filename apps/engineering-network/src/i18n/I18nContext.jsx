import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { zh } from './zh';
import { en } from './en';
import { th } from './th';

const DICTIONARIES = {
  zh,
  en,
  th
};

export const I18nContext = createContext(null);

/**
 * Resolves browser/device preferred language to supported 'zh' | 'en' | 'th'
 */
export function getDeviceLocale() {
  try {
    const langs = navigator.languages && navigator.languages.length > 0 
      ? navigator.languages 
      : [navigator.language || 'en'];
    
    for (const lang of langs) {
      if (!lang) continue;
      const lower = lang.toLowerCase();
      if (lower.startsWith('zh')) return 'zh';
      if (lower.startsWith('th')) return 'th';
      if (lower.startsWith('en')) return 'en';
    }
  } catch (e) {}
  return 'en'; // default fallback for unsupported locales
}

/**
 * Extracts ?lang= override from URL (checks both standard window.location.search and hash query)
 */
export function getUrlLangOverride() {
  try {
    // 1. Check window.location.search (?lang=en)
    const searchParams = new URLSearchParams(window.location.search);
    const searchLang = searchParams.get('lang');
    if (searchLang && ['zh', 'en', 'th'].includes(searchLang.toLowerCase())) {
      return searchLang.toLowerCase();
    }

    // 2. Check hash query, e.g. #/feed?lang=en or #/projects?lang=en
    const hash = window.location.hash || '';
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      const hashParams = new URLSearchParams(hash.slice(queryIdx));
      const hashLang = hashParams.get('lang');
      if (hashLang && ['zh', 'en', 'th'].includes(hashLang.toLowerCase())) {
        return hashLang.toLowerCase();
      }
    }
  } catch (e) {}
  return null;
}

export function I18nProvider({ children }) {
  // Locale mode: 'auto' | 'zh' | 'en' | 'th'
  // Initial resolution: URL ?lang= override has absolute precedence on landing and PERSISTS as user choice
  const [localeMode, setLocaleModeState] = useState(() => {
    const urlOverride = getUrlLangOverride();
    if (urlOverride) {
      try {
        localStorage.setItem('atlas_locale_mode', urlOverride);
      } catch (e) {}
      return urlOverride;
    }
    try {
      const saved = localStorage.getItem('atlas_locale_mode');
      if (saved && ['auto', 'zh', 'en', 'th'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'auto';
  });

  // Track device locale dynamically for 'auto' mode
  const [deviceLocale, setDeviceLocale] = useState(getDeviceLocale);

  // Listen to browser languagechange event when in 'auto' mode
  useEffect(() => {
    const handleLanguageChange = () => {
      setDeviceLocale(getDeviceLocale());
    };
    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, []);

  // Watch URL hash / search changes for any incoming ?lang= deep links during SPA navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const urlOverride = getUrlLangOverride();
      if (urlOverride && urlOverride !== localeMode) {
        setLocaleModeState(urlOverride);
        try {
          localStorage.setItem('atlas_locale_mode', urlOverride);
        } catch (e) {}
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [localeMode]);

  // Set manual mode and persist to localStorage, keeping URL search parameter in sync
  const setLocaleMode = useCallback((mode) => {
    if (!['auto', 'zh', 'en', 'th'].includes(mode)) return;
    setLocaleModeState(mode);
    try {
      localStorage.setItem('atlas_locale_mode', mode);
    } catch (e) {}

    // Synchronize URL ?lang= parameter so that page reloads preserve user's explicit choice
    try {
      if (typeof window !== 'undefined' && window.location) {
        const url = new URL(window.location.href);
        if (mode === 'auto') {
          url.searchParams.delete('lang');
        } else {
          url.searchParams.set('lang', mode);
        }
        // Also strip any stale ?lang= from hash if present
        if (url.hash && url.hash.includes('lang=')) {
          const hashParts = url.hash.split('?');
          if (hashParts.length > 1) {
            const hashParams = new URLSearchParams(hashParts[1]);
            hashParams.delete('lang');
            const newQuery = hashParams.toString();
            url.hash = newQuery ? `${hashParts[0]}?${newQuery}` : hashParts[0];
          }
        }
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {}
  }, []);

  // Compute effective active locale
  const effectiveLocale = useMemo(() => {
    if (localeMode !== 'auto') {
      return localeMode;
    }
    return deviceLocale;
  }, [localeMode, deviceLocale]);

  // Sync document.documentElement.lang
  useEffect(() => {
    const langCode = effectiveLocale === 'zh' ? 'zh-CN' : effectiveLocale === 'th' ? 'th' : 'en';
    document.documentElement.lang = langCode;
  }, [effectiveLocale]);

  // Current active dictionary
  const dict = useMemo(() => {
    return DICTIONARIES[effectiveLocale] || DICTIONARIES.en;
  }, [effectiveLocale]);

  // Helper t function for dot-notation access with graceful fallback to en and then zh
  const t = useCallback((path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');
    
    // 1. Try current dictionary
    let curr = dict;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        curr = undefined;
        break;
      }
    }
    if (curr !== undefined && typeof curr === 'string') return curr;

    // 2. Try English dictionary
    curr = DICTIONARIES.en;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        curr = undefined;
        break;
      }
    }
    if (curr !== undefined && typeof curr === 'string') return curr;

    // 3. Try Chinese dictionary
    curr = DICTIONARIES.zh;
    for (const part of parts) {
      if (curr && typeof curr === 'object' && part in curr) {
        curr = curr[part];
      } else {
        curr = undefined;
        break;
      }
    }
    if (curr !== undefined && typeof curr === 'string') return curr;

    return fallback || path;
  }, [dict]);

  const value = useMemo(() => ({
    locale: effectiveLocale,
    localeMode,
    setLocaleMode,
    t,
    dict,
    isAuto: localeMode === 'auto',
  }), [effectiveLocale, localeMode, setLocaleMode, t, dict]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      locale: 'zh',
      localeMode: 'auto',
      setLocaleMode: () => {},
      t: (key, fallback) => fallback || key,
      dict: zh,
      isAuto: true,
    };
  }
  return context;
}
