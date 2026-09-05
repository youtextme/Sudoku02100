import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeGrid, countSolutions, generatePuzzle } from '../src/sudoku/generator.js';
import {
  findNakedSingles, findHiddenSingles, solveWithSingles, firstMoveKind, isComplete,
} from '../src/sudoku/strategies.js';
import { candidates } from '../src/sudoku/rules.js';

const SALT = 'test-salt';

function allPuzzles() {
  return Array.from({ length: 100 }, (_, i) => generatePuzzle(i + 1, SALT));
}

test('every puzzle 1–55 is solvable using ONLY the two taught strategies', () => {
  for (let i = 1; i <= 55; i++) {
    const p = generatePuzzle(i, SALT);
    const res = solveWithSingles(p.given);
    assert.equal(res.solved, true, `puzzle ${i} (${p.tier.id}) must be single-solvable`);
  }
});

test('every puzzle has exactly one solution', () => {
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, SALT);
    assert.equal(countSolutions(p.given), 1, `puzzle ${i} must be unique`);
  }
});

test('givens strictly decrease with puzzle number (same salt)', () => {
  const minus = (a, b) => b.givens - a.givens;
  const p1 = generatePuzzle(1, SALT);
  const p25 = generatePuzzle(25, SALT);
  const p50 = generatePuzzle(50, SALT);
  const p100 = generatePuzzle(100, SALT);
  assert.ok(p25.givens <= p1.givens, 'puzzle25 ≤ puzzle1 givens');
  assert.ok(p50.givens <= p25.givens, 'puzzle50 ≤ puzzle25 givens');
  // expert hidden cells: expect clearly fewer givens
  assert.ok(p100.givens < p1.givens - 5, `expected expert to remove lots, got ${p1.givens} vs ${p100.givens}`);
});

test('generation is deterministic for a fixed (index, salt)', () => {
  const a = generatePuzzle(17, SALT);
  const b = generatePuzzle(17, SALT);
  assert.deepEqual(a.given, b.given);
  assert.deepEqual(a.solution, b.solution);
});

test('early puzzles start with an easy-looking move (naked single or one-space)', () => {
  for (let i = 1; i <= 10; i++) {
    const p = generatePuzzle(i, SALT);
    assert.ok(findNakedSingles(p.given).length > 0, `puzzle ${i} should offer a naked single at the start`);
  }
});

test('findHiddenSingles only returns legal single-spot placements', () => {
  const p = generatePuzzle(20, SALT);
  const hs = findHiddenSingles(p.given);
  assert.ok(hs.length > 0, 'puzzle 20 should contain a hidden single');
  for (const h of hs) {
    assert.ok(candidates(p.given, h.cell).includes(h.value), 'hidden single value must be a legal candidate');
  }
});

test('complete grid + strategies agree: solveWithSingles on full solution = solved', () => {
  const full = completeGrid(0xabcd);
  const res = solveWithSingles(full);
  assert.equal(res.empties, 0);
  assert.equal(res.solved, true);
  assert.equal(isComplete(full), true);
});

function solOf(i) {
  return generatePuzzle(i, SALT).solution;
}

test('firstMoveKind returns one of our known kinds for 100 puzzles', () => {
  for (let i = 1; i <= 100; i++) {
    const mk = firstMoveKind(generatePuzzle(i, SALT).given);
    assert.ok(['naked', 'hidden', 'hard'].includes(mk), `puzzle ${i} kind=${mk}`);
  }
});