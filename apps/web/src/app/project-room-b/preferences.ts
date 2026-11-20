/**
 * Preferences & Local Client Storage Manager
 *
 * Provides SSR-safe, exception-safe (private browsing, localStorage disabled,
 * storage quota exceeded) access to client-side preferences and hidden messages.
 */

export type UndoDelaySetting = "0" | "5" | "10";
export type MobileEnterSetting = "newline" | "send";

const UNDO_DELAY_KEY = "sr_pref_undo_delay";
const MOBILE_ENTER_KEY = "sr_pref_mobile_enter";

export function getSafeLocalStorage(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Gracefully handle SecurityError / private browsing restriction
  }
  return null;
}

export function setSafeLocalStorage(key: string, val: string): boolean {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, val);
      return true;
    }
  } catch {
    // Gracefully handle QuotaExceededError or security restrictions
  }
  return false;
}

export function getUndoDelayPref(): UndoDelaySetting {
  const val = getSafeLocalStorage(UNDO_DELAY_KEY);
  if (val === "0" || val === "5" || val === "10") {
    return val;
  }
  return "5"; // default 5 seconds
}

export function setUndoDelayPref(val: string): boolean {
  if (val === "0" || val === "5" || val === "10") {
    return setSafeLocalStorage(UNDO_DELAY_KEY, val);
  }
  return false;
}

export function getMobileEnterPref(): MobileEnterSetting {
  const val = getSafeLocalStorage(MOBILE_ENTER_KEY);
  if (val === "newline" || val === "send") {
    return val;
  }
  return "newline"; // default touch behavior
}

export function setMobileEnterPref(val: string): boolean {
  if (val === "newline" || val === "send") {
    return setSafeLocalStorage(MOBILE_ENTER_KEY, val);
  }
  return false;
}

/**
 * Local-only hidden messages ("Hide for me" persistence across reloads)
 */
export function getHiddenEventIds(orgId: string, userId: string): Set<string> {
  if (!orgId || !userId) return new Set();
  const key = `sr_hidden_${orgId}_${userId}`;
  const raw = getSafeLocalStorage(key);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

export function hideEventId(orgId: string, userId: string, eventId: string): void {
  if (!orgId || !userId || !eventId) return;
  const set = getHiddenEventIds(orgId, userId);
  set.add(eventId);
  const key = `sr_hidden_${orgId}_${userId}`;
  setSafeLocalStorage(key, JSON.stringify(Array.from(set)));
}
