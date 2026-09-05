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
      get length() { return mem.size; },
      key: (i) => { const keys = [...mem.keys()]; return keys[i] ?? null; },
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

/** wipe every key in a namespace (used by "start over") */
export function clearNamespace(namespace) {
  const prefix = `${PREFIX}${namespace}.`;
  const doomed = [];
  for (let i = 0; i < backend.length; i++) {
    const k = backend.key(i);
    if (k && k.startsWith(prefix)) doomed.push(k);
  }
  for (const k of doomed) backend.removeItem(k);
}

/** wipe the entire app store (all namespaces) */
export function clearAllStore() {
  const doomed = [];
  for (let i = 0; i < backend.length; i++) {
    const k = backend.key(i);
    if (k && k.startsWith(PREFIX)) doomed.push(k);
  }
  for (const k of doomed) backend.removeItem(k);
}