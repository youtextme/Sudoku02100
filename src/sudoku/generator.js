// sudoku/generator.js — deterministic, strategy-graded Sudoku puzzles.
// Every puzzle is seeded from (index + per-device salt), so the same kid always
// sees the same 100 puzzles in the same order, generated entirely on-device.

import { hashString, mulberry32, shuffle, range, countFilled } from '../platform/util.js';
import { candidates } from './rules.js';
import { solveWithSingles, findNakedSingles } from './strategies.js';

export const TIERS = [
  { id: 'intro', name: 'Baby Steps',   givens: 42, requireSingles: true,  from: 1,  to: 10, color: '#15803D' },
  { id: 'easy', name: 'Easy',          givens: 38, requireSingles: true,  from: 11, to: 30, color: '#1D4ED8' },
  { id: 'medium', name: 'Getting Good', givens: 35, requireSingles: true, from: 31, to: 45, color: '#B45309' },
  { id: 'hard', name: 'Hard',          givens: 32, requireSingles: true,  from: 46, to: 65, color: '#BE123C' },
  { id: 'tough', name: 'Tough',        givens: 29, requireSingles: false, from: 66, to: 85, color: '#6D28D9' },
  { id: 'expert', name: 'Expert',      givens: 26, requireSingles: false, from: 86, to: 100, color: '#9F1239' },
];

export function getTier(puzzleIndex /* 1-based */) {
  const i = Math.max(1, Math.min(100, puzzleIndex | 0));
  return TIERS.find((t) => i >= t.from && i <= t.to) || TIERS[0];
}

function collectSolutions(board, rng, stopAt) {
  const solutions = [];
  const work = board.slice();
  function dfs() {
    if (solutions.length >= stopAt) return;
    let cell = -1;
    for (let i = 0; i < work.length; i++) {
      if (work[i] === 0) { cell = i; break; }
    }
    if (cell < 0) {
      solutions.push(work.slice());
      return;
    }
    const vals = shuffle(candidates(work, cell), rng);
    for (const v of vals) {
      work[cell] = v;
      dfs();
      if (solutions.length >= stopAt) { work[cell] = 0; break; }
      work[cell] = 0;
    }
  }
  dfs();
  return solutions;
}

export function completeGrid(rngOrSeed) {
  const rng = typeof rngOrSeed === 'function' ? rngOrSeed : mulberry32(rngOrSeed >>> 0);
  const empty = new Array(81).fill(0);
  const sol = collectSolutions(empty, rng, 1);
  return sol[0] || null;
}

/** number of distinct solutions (0, 1, or 2 when more than one) */
export function countSolutions(board) {
  const rng = mulberry32(0x5eed);
  return collectSolutions(board, rng, 2).length;
}

function missingNumberInUnit(board, unitCells) {
  const used = new Set();
  for (const c of unitCells) if (board[c]) used.add(board[c]);
  for (let v = 1; v <= 9; v++) if (!used.has(v)) return v;
  return -1;
}

function hasOneSpaceUnit(board, allUnits) {
  for (const unit of allUnits) {
    if (unit.filter((c) => board[c] === 0).length === 1) return true;
  }
  return false;
}

const ALL_UNITS = (() => {
  const g = [];
  for (let r = 0; r < 9; r++) g.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) g.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const cells = [];
    const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + (bc + dc));
    g.push(cells);
  }
  return g;
})();

export { missingNumberInUnit };

/**
 * Deterministically produce puzzle `index` (1..100) for this install.
 * Ensures a unique solution and, for the first four tiers, that a child who
 * only knows "Only One Fits" + "Number Hunting" can actually finish it.
 */
export function generatePuzzle(index, salt) {
  const tier = getTier(index);
  const seed = hashString(`sudoku.p${index}.v1.${salt}`);
  const rng = mulberry32(seed);
  const solution = completeGrid(rng);
  const given = solution.slice();
  const positions = shuffle(range(81), rng);

  for (const pos of positions) {
    if (countFilled(given) <= tier.givens) break;
    const save = given[pos];
    given[pos] = 0;
    if (countSolutions(given) !== 1) {
      given[pos] = save;
      continue;
    }
    if (tier.requireSingles && !solveWithSingles(given).solved) {
      given[pos] = save;
      continue;
    }
  }

  // extra-gentle guarantee for the first tier: reward a clearly visible move
  if (tier.id === 'intro') {
    let guard = 0;
    while (guard++ < 12 && (findNakedSingles(given).length === 0 || !hasOneSpaceUnit(given, ALL_UNITS))) {
      const removable = positions.filter((p) => given[p] !== 0);
      const pos = removable[Math.floor(rng() * removable.length)];
      const save = given[pos];
      given[pos] = 0;
      if (countSolutions(given) !== 1 || !solveWithSingles(given).solved) {
        given[pos] = save;
      }
      if (countFilled(given) <= 30) break;
    }
  }

  return {
    index,
    tier,
    given,
    solution,
    givens: countFilled(given),
    missing: missingNumberInUnit,
  };
}