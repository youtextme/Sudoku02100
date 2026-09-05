import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, PUZZLE_COUNT, MILESTONES, demoPuzzleFor, nextPuzzleAfter } from '../src/sudoku/curriculum.js';

const BANNED = ['candidate', 'unique', 'constraint', 'eliminate'];

test('lesson pages exist and contain no banned words', () => {
  assert.equal(LESSONS.length, 6);
  for (const lesson of LESSONS) {
    assert.ok(lesson.pages.length >= 2, `${lesson.id} needs real pages`);
    const texts = [];
    for (const p of lesson.pages) {
      if (p.text) texts.push(p.text);
      if (p.q) texts.push(p.q);
      if (p.options) texts.push(...p.options);
      if (p.after) texts.push(p.after);
    }
    for (const t of texts) {
      for (const b of BANNED) assert.ok(!t.toLowerCase().includes(b), `${lesson.id}: banned "${b}" in "${t}"`);
    }
  }
});

test('lesson demo puzzles exist for the three strategies', () => {
  const oneSpace = demoPuzzleFor('one-space');
  const oneFits = demoPuzzleFor('one-fits');
  const hunt = demoPuzzleFor('number-hunt');
  assert.ok(oneSpace, 'one-space demo puzzle exists');
  assert.ok(oneFits, 'one-fits demo puzzle exists');
  assert.ok(hunt, 'number-hunt demo puzzle exists');
  assert.equal(oneSpace.move.kind, 'one-space');
  assert.equal(oneFits.move.kind, 'one-fits');
  assert.equal(hunt.move.kind, 'number-hunt');
});

test('milestones cover the natural stopping points', () => {
  const ats = MILESTONES.map((m) => m.at);
  assert.ok(ats.includes(1) && ats.includes(100));
  assert.ok(ats.includes(10) && ats.includes(50));
});

test('next puzzle after N is N+1 capped at 100', () => {
  assert.equal(nextPuzzleAfter(0), 1);
  assert.equal(nextPuzzleAfter(41), 42);
  assert.equal(nextPuzzleAfter(100), 100);
  assert.equal(PUZZLE_COUNT, 100);
});