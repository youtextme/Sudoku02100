// platform/session.js - session-scoped UI state helpers. Game-agnostic.

const PARENT_KEY = 's2100.parent';

export function parentUnlocked() {
  try {
    return sessionStorage.getItem(PARENT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setParentUnlocked(value) {
  try {
    if (value) sessionStorage.setItem(PARENT_KEY, '1');
    else sessionStorage.removeItem(PARENT_KEY);
  } catch {
    /* storage unavailable: gate stays closed */
  }
}