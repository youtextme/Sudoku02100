import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp, range, mulberry32, hashString, shuffle, pick, zeros, countFilled,
} from '../src/platform/util.js';

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seq = Array.from({ length: 10 }, () => a());
  const seq2 = Array.from({ length: 10 }, () => b());
  assert.deepEqual(seq, seq2);
  assert.ok(seq.every((v) => v >= 0 && v < 1));
});

test('different seeds give different sequences', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  assert.notDeepEqual(Array.from({ length: 8 }, () => a()), Array.from({ length: 8 }, () => b()));
});

test('hashString is stable and non-trivial', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
  assert.equal(typeof hashString('x'), 'number');
  assert.ok(hashString('x') >= 0 && hashString('x') < 4294967296);
});

test('shuffle keeps all elements', () => {
  const src = range(20);
  const out = shuffle(src, mulberry32(7));
  assert.deepEqual([...out].sort((a, b) => a - b), src);
  assert.notDeepEqual(out, src); // (astronomically likely)
});

test('pick returns members', () => {
  const src = [3, 4];
  for (let i = 0; i < 50; i++) assert.ok(src.includes(pick(src, mulberry32(i))));
});

test('range, clamp, zeros, countFilled', () => {
  assert.deepEqual(range(3), [0, 1, 2]);
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.deepEqual(zeros(4, -1), [-1, -1, -1, -1]);
  assert.equal(countFilled([0, 3, 0, 5, 0]), 2);
});