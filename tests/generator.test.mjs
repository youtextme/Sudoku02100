import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, completeGrid } from '../src/sudoku/generator.js';

// Kill criterion from the contract: generating all 100 puzzles must be fast
// enough for an on-device, on-demand generation (lazy, cached per puzzle).
test('generating all 100 puzzles takes < 10s (contract kill criterion)', { timeout: 20000 }, () => {
  const t0 = performance.now();
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, 'timing');
    assert.ok(p.given.length === 81 && p.givens >= 20);
  }
  const ms = performance.now() - t0;
  console.log(`[timing] 100 puzzles generated in ${ms.toFixed(0)} ms`);
  assert.ok(ms < 10000, `generation took ${ms.toFixed(0)} ms — too slow`);
});

test('completeGrid never returns null (seeded)', () => {
  for (const seed of [1, 2, 3, 99, 12345, 0xdeadbeef]) {
    assert.ok(completeGrid(seed), `seed ${seed} should produce a grid`);
  }
});