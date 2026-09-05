// platform/util.js — tiny dependency-free utilities (game-agnostic)
// Everything here must work in both Node (tests) and the browser (app).

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function range(n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = i;
  return out;
}

// Deterministic PRNG (mulberry32). Same seed → same sequence.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _seedCounter = Date.now() & 0xffffffff;
export function randomSeed() {
  _seedCounter = (_seedCounter + 0x9e3779b9) | 0;
  const t = (Math.random() * 0x100000000) >>> 0;
  return (t ^ _seedCounter) >>> 0;
}

// 32-bit FNV-1a hash of a string — stable across platforms.
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// Fisher–Yates shuffle using a supplied rng. Returns a NEW array.
export function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Random element (gives rng) or plain Math.random (no rng) for tests.
export function pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

export function zeros(n, fill = 0) {
  return new Array(n).fill(fill);
}

export function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = deepClone(value[k]);
    return out;
  }
  return value;
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${(Math.random() * 1e9) | 0}`;
}

// Count truthy entries
export function countFilled(arr) {
  let n = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i]) n++;
  return n;
}