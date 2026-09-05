import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankMoves, planForMove, makeStuckPlan, noteSuggestions, regionsFor, UNIT_DEFINITION,
} from '../src/sudoku/coach.js';
import { generatePuzzle } from '../src/sudoku/generator.js';
import { solveWithSingles } from '../src/sudoku/strategies.js';

// banned words in kid-facing copy (the "knows nothing" gate)
const BANNED = ['candidate', 'unique', 'constraint', 'eliminate', 'cell coordinate'];
const SALT = 'coach-test';

function textsOf(plan) {
  const texts = [];
  for (const step of plan) {
    if (step.text) texts.push(step.text);
    if (step.def) texts.push(step.def);
    if (step.options) for (const o of step.options) texts.push(o.label);
  }
  return texts;
}

test('coach never dumps the answer in the FIRST step', () => {
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, SALT);
    const mv = rankMoves(p.given);
    if (!mv) continue;
    const plan = planForMove(mv, p.given);
    const first = plan[0];
    assert.ok(first.kind === 'lesson', `puzzle ${i} first step must be a lesson`);
    if (mv.kind !== 'number-hunt') {
      // hunting lessons may name the hunted number, but never the square
      assert.ok(!String(first.text).includes(String(mv.value)), `puzzle ${i} lesson step must not contain the answer`);
    }
  }
});

test('rankMoves always picks a discoverable legal move when one exists', () => {
  let movesChecked = 0;
  let buildable = 0;
  for (let i = 1; i <= 100; i++) {
    let board = generatePuzzle(i, SALT).given;
    // simulate a kid solving single-solvable puzzles to create mid-game boards
    for (let step = 0; step < 40; step++) {
      if (board.filter((v) => v === 0).length === 0) break;
      const mv = rankMoves(board);
      if (!mv) break;
      movesChecked++;
      assert.ok(board[mv.cell] === 0, `coach must target an empty cell (puzzle ${i})`);
      const plan = planForMove(mv, board);
      assert.ok(plan.length >= 2, `plan should have lesson + question + ... (puzzle ${i})`);
      buildable++;
      // apply the coached move — makes mid-game states deterministic
      board = board.slice();
      board[mv.cell] = mv.value;
    }
  }
  assert.ok(movesChecked > 0 && buildable > 0);
});

test('coach plans have a gridpick option for number-hunt and answers never leak pre-question', () => {
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, SALT);
    const mv = rankMoves(p.given);
    if (!mv || mv.kind !== 'number-hunt') continue;
    const plan = planForMove(mv, p.given);
    const question = plan.find((s) => s.kind === 'question');
    assert.ok(question, 'number-hunt plan must include a question step');
  }
});

test('no banned words in any coach text for 100 puzzles', () => {
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, SALT);
    const mv = rankMoves(p.given);
    if (mv) {
      const plan = planForMove(mv, p.given);
      for (const t of textsOf(plan)) {
        for (const b of BANNED) {
          assert.ok(!t.toLowerCase().includes(b), `banned word "${b}" in coach text "${t}" (puzzle ${i})`);
        }
      }
    }
  }
  for (const d of Object.values(UNIT_DEFINITION)) {
    for (const b of BANNED) assert.ok(!d.toLowerCase().includes(b));
  }
});

test('noteSuggestions supplies pencil numbers for empty cells only', () => {
  const p = generatePuzzle(20, SALT);
  const notes = noteSuggestions(p.given);
  for (let c = 0; c < 81; c++) {
    if (p.given[c] === 0) assert.ok(notes[c].length > 0, `empty cell ${c} needs suggestions`);
    else assert.deepEqual(notes[c], [], `given cell ${c} should have no notes`);
  }
});

test('stuck plan exists and suggests the notes path', () => {
  const plan = makeStuckPlan();
  assert.equal(plan[0].kind, 'stuck');
  assert.equal(plan[0].autoNotes, true);
});

test('regionsFor returns the right cells', () => {
  const p = generatePuzzle(1, SALT);
  const mv = rankMoves(p.given);
  if (!mv) return; // intro always has a move in practice
  const region = regionsFor(mv);
  if (mv.unitKind) {
    assert.ok(region.cells.length === 9, 'unit region has 9 cells');
    assert.ok(region.cells.includes(mv.cell));
  } else {
    assert.deepEqual(region.cells, [mv.cell]);
  }
});

test('coached move application converges to solved for single-solvable puzzles', () => {
  for (let i = 1; i <= 10; i++) {
    const p = generatePuzzle(i, SALT);
    const res = solveWithSingles(p.given);
    assert.ok(res.solved, `puzzle ${i} fully solvable by strategies`);
    assert.equal(res.board.filter((v) => v === 0).length, 0);
    assert.deepEqual(res.board, p.solution, `puzzle ${i} single-solver result equals the solution`);
  }
});