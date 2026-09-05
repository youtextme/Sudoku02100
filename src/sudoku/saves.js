// sudoku/saves.js - per-install persistence for the Sudoku game.
// Salt + generated puzzles + live solve-state all live locally, never on a server.

import { scopedStore } from '../platform/store.js';
import { randomSeed } from '../platform/util.js';
import { generatePuzzle } from './generator.js';
import { GAME_ID } from './curriculum.js';

const saves = scopedStore(GAME_ID);
const genCache = scopedStore(`${GAME_ID}.gen`);
const FREE = 'free';

function getSalt() {
  let salt = saves.get('salt', null);
  if (!salt) {
    salt = `dev-${randomSeed().toString(36)}`;
    saves.set('salt', salt);
  }
  return salt;
}

/** deterministic journey puzzle by index (1..100) */
export function getPuzzle(index) {
  const key = `p.${index}`;
  let cached = genCache.get(key, null);
  if (!cached) {
    cached = generatePuzzle(index, getSalt());
    genCache.set(key, cached);
  }
  return cached;
}

/** free-practice puzzle for a tier, uncounted in the journey */
export function getFreePuzzle(tierId, n) {
  const key = `fp.${tierId}.${n}`;
  let cached = genCache.get(key, null);
  if (!cached) {
    const salt = `${getSalt()}|free|${tierId}|${n}`;
    cached = generatePuzzle(freeIndexFor(tierId), salt);
    genCache.set(key, cached);
  }
  return cached;
}

export function nextFreeN() {
  const n = saves.get('freeN', 0) + 1;
  saves.set('freeN', n);
  return n;
}

function freeIndexFor(tierId) {
  const map = { intro: 3, easy: 18, medium: 40, hard: 55, tough: 75, expert: 98 };
  return map[tierId] || 3;
}

export function baseStateFor(puzzle) {
  return {
    values: puzzle.given.slice(),
    notes: new Array(81).fill(null).map(() => new Set()),
    hintsUsed: 0,
    timeMs: 0,
    solved: false,
    free: false,
  };
}

export function getState(key) {
  const raw = saves.get(`state.${key}`, null);
  if (!raw) return null;
  return {
    values: raw.values,
    notes: new Array(81).fill(null).map((_, i) => new Set(raw.noteCells?.[i] || [])),
    hintsUsed: raw.hintsUsed || 0,
    timeMs: raw.timeMs || 0,
    solved: !!raw.solved,
    free: !!raw.free,
  };
}

export function putState(key, state) {
  saves.set(`state.${key}`, {
    values: state.values,
    noteCells: state.notes.map((s) => [...s]),
    hintsUsed: state.hintsUsed || 0,
    timeMs: state.timeMs || 0,
    solved: !!state.solved,
    free: !!state.free,
  });
}

export function deleteState(key) {
  saves.remove(`state.${key}`);
}

export { FREE, getSalt };