// sudoku/strategies.js — the ONLY two techniques the kid is taught:
//   1. "Only One Fits"  (naked single: a cell with exactly one possible number)
//   2. "Number Hunting" (hidden single: a number that fits in only one cell
//                        of a row / column / box)
// These two, repeated, solve every puzzle in the Intro→Medium ramp.

import { candidates, GROUPS, NCELLS, SIZE } from './rules.js';

export const UNIT_TYPES = { row: { start: 0, count: 9 }, col: { start: 9, count: 9 }, box: { start: 18, count: 9 } };
export const UNIT_KIND_INDEX = { row: 0, col: 1, box: 2 };

export function unitName(kind) {
  return { row: 'row', col: 'column', box: 'box' }[kind] || kind;
}

export function unitCells(kind, index) {
  return GROUPS[UNIT_KIND_INDEX[kind] * 9 + index];
}

export function emptyCellsOf(board, kind, index) {
  return unitCells(kind, index).filter((c) => board[c] === 0);
}

/** cells with exactly one candidate */
export function findNakedSingles(board) {
  const out = [];
  for (let c = 0; c < NCELLS; c++) {
    if (board[c] !== 0) continue;
    const cand = candidates(board, c);
    if (cand.length === 1) out.push({ cell: c, value: cand[0] });
  }
  return out;
}

/** numbers that fit in exactly one cell of a unit */
export function findHiddenSingles(board) {
  const out = [];
  for (const kind of Object.keys(UNIT_TYPES)) {
    for (let u = 0; u < 9; u++) {
      const cells = emptyCellsOf(board, kind, u);
      if (cells.length < 2) continue; // naked trivials handled elsewhere
      const slots = new Map(); // value -> [cells]
      for (const c of cells) {
        for (const v of candidates(board, c)) {
          if (!slots.has(v)) slots.set(v, [c]);
          else slots.get(v).push(c);
        }
      }
      for (const [v, cs] of slots) {
        if (cs.length === 1) out.push({ kind, unit: u, cell: cs[0], value: v });
      }
    }
  }
  return out;
}

/**
 * Attempt to solve a board using only the two taught strategies.
 * Returns { solved, board } where board has the found cells filled.
 */
export function solveWithSingles(board) {
  const work = board.slice();
  const steps = [];
  let guard = 0;
  while (guard++ < 200) {
    const naked = findNakedSingles(work);
    if (naked.length) {
      const first = naked[0];
      work[first.cell] = first.value;
      steps.push({ ...first, by: 'naked' });
      continue;
    }
    const hidden = findHiddenSingles(work);
    if (hidden.length) {
      const first = hidden[0];
      work[first.cell] = first.value;
      steps.push({ ...first, by: 'hidden' });
      continue;
    }
    break;
  }
  const empties = work.filter((v) => v === 0).length;
  return { solved: empties === 0, empties, board: work, steps };
}

/** ranks the puzzle by how hard its first strategy move is (for labels) */
export function firstMoveKind(board) {
  const naked = findNakedSingles(board);
  if (naked.length) return 'naked';
  const hidden = findHiddenSingles(board);
  if (hidden.length) return 'hidden';
  return 'hard';
}

export function isComplete(board) {
  for (let c = 0; c < NCELLS; c++) if (board[c] === 0) return false;
  return true;
}