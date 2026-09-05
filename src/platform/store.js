// platform/store.js — namespaced persistence. Game-agnostic.
// Backed by localStorage when available; falls back to in-memory so the app
// still works in private / storage-blocked browsers.

const PREFIX = 's2100.';

function makeBackend() {
  try {
    const t = '__s2100_test__';
    globalThis.localStorage.setItem(t, '1');
    globalThis.localStorage.removeItem(t);
    return globalThis.localStorage;
  } catch {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
  }
}

const backend = makeBackend();

function parse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function scopedStore(namespace) {
  const keyFor = (name) => `${PREFIX}${namespace}.${name}`;

  return {
    get(name, fallback = undefined) {
      return parse(backend.getItem(keyFor(name)), fallback);
    },
    set(name, value) {
      backend.setItem(keyFor(name), JSON.stringify(value));
    },
    has(name) {
      return backend.getItem(keyFor(name)) != null;
    },
    remove(name) {
      backend.removeItem(keyFor(name));
    },
  };
}

export const appStore = scopedStore('app');