import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GridEngine } from '../src/platform/grid/grid-engine.js';
import { sudokuGroups } from '../src/sudoku/rules.js';
import { completeGrid, countSolutions, generatePuzzle, getTier } from '../src/sudoku/generator.js';

const GROUPS = sudokuGroups();
const sol = completeGrid(0x5eed);
assert.equal(!!sol, true, 'completeGrid must produce a solution');
assert.equal(sol.filter((v) => v === 0).length, 0, 'solution is full');
assert.equal(countSolutions(sol), 1, 'solution is a valid single solution');

function engineWith(given) {
  const e = new GridEngine({ size: 9, groups: GROUPS });
  e.reset(given);
  return e;
}

test('GridEngine reports solved + conflicts on a filled valid solution', () => {
  const e = engineWith(sol);
  assert.equal(e.isSolved(), true);
  assert.deepEqual(e.conflicts(), []);
});

test('GridEngine detects a duplicate in a group', () => {
  const bad = sol.slice();
  // duplicate the value of cell 0 into cell 9 (same column)
  bad[9] = bad[0];
  const e = engineWith(bad);
  assert.equal(e.isSolved(), false);
  const c = e.conflicts();
  assert.ok(c.length >= 2, `conflicts should include both cells, got ${c}`);
  assert.ok(c.includes(0) && c.includes(9));
});

test('GridEngine place() respects group rules and givens', () => {
  const e = engineWith(sol.slice());
  const freeValue = sol[40]; // the only number still missing in row 4
  // revert cell 40 to empty, then test blocking
  e.given[40] = 0;
  e.values[40] = -1;
  const blockColor = sol[39]; // same row, different cell → must be blocked
  assert.equal(e.place(40, blockColor), false, 'place into a group that already uses the number must fail');
  assert.equal(e.place(40, freeValue), true, 'the genuinely missing number must be placeable');
});

test('GridEngine notes do not write values', () => {
  const e = engineWith(sol.slice());
  e.given[40] = 0;
  e.values[40] = -1;
  e.setNote(40, 3, true);
  assert.equal(e.valueAt(40), -1);
  assert.deepEqual(e.notesAt(40), [3]);
  e.setNote(40, 3, false);
  assert.deepEqual(e.notesAt(40), []);
});

test('GridEngine isSolved false with empties', () => {
  const e = engineWith(sol.slice());
  e.given[40] = 0;
  e.values[40] = -1;
  assert.equal(e.isSolved(), false);
});

test('opening a generated puzzle keeps groups >= 27 and givens vs empties', () => {
  const p = generatePuzzle(1, 'test-salt');
  assert.equal(p.given.length, 81);
  assert.equal(p.givens, p.given.filter(Boolean).length);
  assert.ok(p.givens >= 36 && p.givens <= 50, `intro givens in range, got ${p.givens}`);
  assert.equal(countSolutions(p.given), 1, 'unique solution');
});

test('tier boundaries cover 1..100', () => {
  assert.equal(getTier(1).id, 'intro');
  assert.equal(getTier(10).id, 'intro');
  assert.equal(getTier(11).id, 'easy');
  assert.equal(getTier(100).id, 'expert');
  assert.equal(getTier(0).id, 'intro');
  assert.equal(getTier(999).id, 'expert');
});