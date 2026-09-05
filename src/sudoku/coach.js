// sudoku/coach.js — thinks like a patient helper for a kid.
// Picks the single best next move and builds a scripted teaching plan with
// escalating questions. The plan is DATA (pure, testable); the view walks it.

import { GROUPS, candidates } from './rules.js';
import {
  findNakedSingles, findHiddenSingles, emptyCellsOf, unitName, isComplete,
} from './strategies.js';
import { missingNumberInUnit } from './generator.js';

export const UNIT_KIND_INDEX = { row: 0, col: 1, box: 2 };
export const UNIT_DEFINITION = {
  row: 'A row is a line that goes ACROSS.',
  col: 'A column is a line that goes DOWN.',
  box: 'A box is the little square of 9 cells.',
};

function unitOf(kind, index) {
  return GROUPS[UNIT_KIND_INDEX[kind] * 9 + index];
}

export function regionsFor(move) {
  if (move.unitKind != null) {
    return { kind: 'unit', unitKind: move.unitKind, unitIndex: move.unit, cells: unitOf(move.unitKind, move.unit) };
  }
  return { kind: 'cell', cells: [move.cell] };
}

function filledList(board, unitCells) {
  return unitCells.map((c) => board[c]).filter((v) => v > 0).join(', ');
}

function pickOptions(answer, pool) {
  const opts = [answer];
  const poolValues = [...pool].filter((v) => v !== answer);
  for (const v of poolValues) {
    if (opts.length >= 3) break;
    opts.push(v);
  }
  return shuffleOptions(opts).map((label) => ({ label: String(label) }));
}

// stable-ish decode: pickOptions used Math.random before; now use a local rng
import { mulberry32 } from '../platform/util.js';
function shuffleOptions(arr) {
  const rng = mulberry32(0xc0a6);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Best next move. Priority:
 *   1. a row/col/box with exactly one empty square (trivial win)
 *   2. a square where only one number fits (naked single)
 *   3. a number that fits in only one square of a unit (hidden single)
 *   4. null → needs look-ahead; caller shows possible numbers.
 */
export function rankMoves(board) {
  if (isComplete(board)) return null;

  const trivials = [];
  for (const kind of ['row', 'col', 'box']) {
    for (let u = 0; u < 9; u++) {
      const empties = emptyCellsOf(board, kind, u);
      if (empties.length === 1) {
        const value = missingNumberInUnit(board, unitOf(kind, u));
        if (value > 0) trivials.push({ kind: 'one-space', unitKind: kind, unit: u, cell: empties[0], value });
      }
    }
  }
  if (trivials.length) {
    const prefer = { row: 0, col: 1, box: 2 };
    trivials.sort((a, b) => prefer[a.unitKind] - prefer[b.unitKind]);
    return trivials[0];
  }

  const naked = findNakedSingles(board);
  if (naked.length) {
    let best = null;
    let bestScore = -1;
    for (const n of naked) {
      const context = filledUnits(board, n.cell);
      if (context.score > bestScore) {
        bestScore = context.score;
        best = { kind: 'one-fits', cell: n.cell, value: n.value, ...context };
      }
    }
    return best;
  }

  const hidden = findHiddenSingles(board);
  if (hidden.length) {
    let best = null;
    let bestFilled = -1;
    for (const h of hidden) {
      const filled = unitOf(h.kind, h.unit).filter((c) => board[c] > 0).length;
      if (filled > bestFilled) {
        bestFilled = filled;
        best = { kind: 'number-hunt', cell: h.cell, value: h.value, unitKind: h.kind, unit: h.unit };
      }
    }
    return best;
  }

  return null;
}

function filledUnits(board, cell) {
  let score = 0;
  let bestUnit = { kind: 'row', unit: Math.floor(cell / 9), filled: 0 };
  const r = Math.floor(cell / 9), c = cell % 9;
  for (const kind of ['row', 'col', 'box']) {
    let u;
    if (kind === 'row') u = r;
    else if (kind === 'col') u = c;
    else u = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    const cells = unitOf(kind, u);
    const f = cells.filter((x) => board[x] > 0).length;
    score += f;
    if (f > bestUnit.filled) bestUnit = { kind, unit: u, filled: f };
  }
  return { score, unitKind: bestUnit.kind, unit: bestUnit.unit };
}

/**
 * Build a runnable teaching script from a move.
 * step.kind:
 *   lesson   — info + region to highlight
 *   question — (a) multiple choice: options[] with .label + correct number
 *              (b) gridpick: mode='gridpick', the kid taps the board
 *   action   — the kid makes the move themselves
 *   reveal   — last resort (contains the answer, only after kid tried)
 */
export function planForMove(move, board) {
  if (!move) return makeStuckPlan();
  const def = UNIT_DEFINITION[move.unitKind];
  const region = regionsFor(move);
  const steps = [];
  const kindName = unitName(move.unitKind);

  if (move.kind === 'one-space') {
    const inUnit = unitOf(move.unitKind, move.unit);
    const used = inUnit.filter((c) => board[c] > 0);
    steps.push({
      kind: 'lesson',
      text: `This ${kindName} has only ONE empty square left!`,
      def,
      unitKind: move.unitKind,
      unitIndex: move.unit,
      region,
    });
    steps.push({
      kind: 'question',
      text: `${used.length} numbers are already in this ${kindName} (${filledList(board, inUnit)}). Which number is missing?`,
      options: pickOptions(move.value, nearbyPool(board, inUnit, move.value)),
      correct: move.value,
      cell: move.cell,
      region,
    });
    steps.push({
      kind: 'action',
      text: `That empty square can only be ${move.value}. Now YOU tap it and put a ${move.value} in!`,
      cell: move.cell,
      value: move.value,
      region,
    });
    steps.push({
      kind: 'reveal',
      text: `Want me to do it? It's a ${move.value}. Watch!`,
      cell: move.cell,
      value: move.value,
      region,
    });
  } else if (move.kind === 'one-fits') {
    const c = move.cell;
    const r = Math.floor(c / 9), col = c % 9;
    const cands = candidates(board, c);
    const ctx = unitOf('row', r).concat(unitOf('col', col)).concat(unitOf('box', Math.floor(r / 3) * 3 + Math.floor(col / 3)));
    steps.push({
      kind: 'lesson',
      text: 'New trick! To fill a square, we spy on the row, the column, and the box around it.',
      def,
      cell: c,
      region,
    });
    steps.push({
      kind: 'question',
      text:
        cands.length === 1
          ? `Only ${move.value} can fit this square — the others are used nearby. Can you see why?`
          : `Which one number CAN fit this square? The others are used in this row, column, or box.`,
      options: pickOptions(move.value, nearbyPool(board, ctx, move.value)),
      correct: move.value,
      cell: c,
      region,
    });
    steps.push({
      kind: 'action',
      text: `Only ${move.value} can fit there. Tap the square and put a ${move.value} in!`,
      cell: c,
      value: move.value,
      region,
    });
    steps.push({
      kind: 'reveal',
      text: `Watch! This square gets a ${move.value}.`,
      cell: c,
      value: move.value,
      region,
    });
  } else if (move.kind === 'number-hunt') {
    steps.push({
      kind: 'lesson',
      text: `Number Hunting! Pick the number ${move.value} and hunt for where it can go in this ${kindName}.`,
      def,
      unitKind: move.unitKind,
      unitIndex: move.unit,
      region,
    });
    steps.push({
      kind: 'question',
      mode: 'gridpick',
      text: `${move.value} is used in most squares of this ${kindName}. Tap the ONE square where ${move.value} can still go.`,
      cell: move.cell,
      region,
    });
    steps.push({
      kind: 'action',
      text: `${move.value} can only live here. Tap the square and put a ${move.value} in!`,
      cell: move.cell,
      value: move.value,
      region,
    });
    steps.push({
      kind: 'reveal',
      text: `Watch! ${move.value} goes here.`,
      cell: move.cell,
      value: move.value,
      region,
    });
  }
  return steps;
}

function nearbyPool(board, unitCells, answer) {
  const pool = new Set();
  for (const c of unitCells) if (board[c] > 0) pool.add(board[c]);
  pool.add(answer === 9 ? 8 : answer + 1);
  return pool;
}

export function makeStuckPlan() {
  return [{
    kind: 'stuck',
    text: 'Hmm, this puzzle needs a careful eye. I will show you the possible numbers as little pencils. Then YOU find the square where only ONE number fits.',
    autoNotes: true,
    region: null,
  }];
}

/** possible-numbers (pencil notes) for all empty squares — a teaching aid */
export function noteSuggestions(board) {
  const out = new Array(81).fill(null).map(() => []);
  for (let c = 0; c < 81; c++) if (board[c] === 0) out[c] = candidates(board, c);
  return out;
}