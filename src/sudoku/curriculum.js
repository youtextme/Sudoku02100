// sudoku/curriculum.js - what a zero-knowledge kid is taught, when, and how.
// All kid-facing copy lives here (or in the view files), short sentences,
// no unexplained words.

import { getTier } from './generator.js';
import { rankMoves } from './coach.js';
import { generatePuzzle } from './generator.js';

export const GAME_ID = 'sudoku';

export const PUZZLE_COUNT = 100;

export function puzzleLabel(index) {
  const tier = getTier(index);
  return `Puzzle ${index} · ${tier.name}`;
}

export const MILESTONES = [
  { badge: 'first', at: 1, text: 'Your first puzzle!' },
  { badge: 'five', at: 5, text: 'Five puzzles done!' },
  { badge: 'ten', at: 10, text: 'Ten! Getting strong!' },
  { badge: 'twentyfive', at: 25, text: 'A quarter of the way!' },
  { badge: 'fifty', at: 50, text: 'Half the galaxy!' },
  { badge: 'seventyfive', at: 75, text: 'So close to the finish!' },
  { badge: 'hundred', at: 100, text: 'ALL 100 PUZZLES!' },
  { badge: 'streak7', at: -7, text: '7 days in a row!' },
];

export const celebrate = {
  solved: [
    'You did it! One more star for your sky.',
    'Fantastic! The puzzle is finished.',
    'Great work! That puzzle is done.',
    'Yay! You beat this puzzle.',
  ],
  correct: ['Yes!', 'Perfect!', 'Right!', 'Good thinking!', 'Super!'],
  keepGoing: ['Keep going, you got this!', 'So close - keep thinking!', 'Almost! Try once more.', 'Another look - you can do it.'],
};

// Long-term "Days" mirror: which puzzle a kid should do after finishing `solvedCount`.
export function nextPuzzleAfter(solvedCount) {
  return Math.min(solvedCount + 1, PUZZLE_COUNT);
}

// --- Learn lessons -------------------------------------------------------

export const LESSONS = [
  {
    id: 'numbers',
    title: 'Meet the Numbers',
    subtitle: 'The game uses 1, 2, 3, 4, 5, 6, 7, 8, 9.',
    icon: '1',
    pages: [
      { type: 'text', text: 'Sudoku is a puzzle. It uses the numbers 1, 2, 3, 4, 5, 6, 7, 8, 9.' },
      { type: 'dots', text: 'Here is how many things each number means.', title: 'How many?' },
      {
        type: 'quiz',
        q: 'How many dots is the number 6?',
        options: ['six', 'three', 'nine'],
        correct: 0,
        after: 'Six! You are counting like a champ.',
      },
      {
        type: 'quiz',
        q: 'Which number comes after 9?',
        options: ['1', '10', '0'],
        correct: 1,
        after: 'Yes - after 9 we start over at 10, but Sudoku only uses 1 to 9!',
      },
    ],
  },
  {
    id: 'lines',
    title: 'Rows, Columns, Boxes',
    subtitle: 'The big grid is made of 9 rows, 9 columns, and 9 boxes.',
    icon: '▦',
    pages: [
      { type: 'text', text: 'The board is a big square. It has 9 lines across, 9 lines down, and 9 little boxes.' },
      { type: 'demo-lines', text: 'Tap any square. Its ROW lights up blue, its COLUMN green, its BOX orange.' },
      { type: 'quiz', q: 'A ROW goes…', options: ['across', 'down', 'around'], correct: 0, after: 'Right! A row goes across.' },
      { type: 'quiz', q: 'A COLUMN goes…', options: ['down', 'across', 'in circles'], correct: 0, after: 'Right! A column goes down.' },
      { type: 'quiz', q: 'A BOX is…', options: ['a little square of 9', 'the whole board', 'a number'], correct: 0, after: 'Yes! A 3 by 3 little square.' },
    ],
  },
  {
    id: 'rules',
    title: 'The 3 Rules',
    subtitle: 'Every number appears ONE time in every row, column, and box.',
    icon: '☑',
    pages: [
      { type: 'text', text: 'Rule 1: every row shows each number ONE time. No repeats!' },
      { type: 'text', text: 'Rule 2: every column shows each number ONE time. No repeats!' },
      { type: 'text', text: 'Rule 3: every box shows each number ONE time. No repeats!' },
      { type: 'box-quiz', board: [[1, 2, 3], [4, 5, 6], [7, 8, 9]], ok: true, q: 'Is this box OK?' },
      { type: 'box-quiz', board: [[1, 2, 3], [4, 5, 9], [7, 8, 9]], ok: false, q: 'Is this box okay? Look for a repeat.' },
      { type: 'box-quiz', board: [[1, 2, 3], [4, 5, 6], [7, 8, 1]], ok: false, q: 'Now this one?' },
      { type: 'quiz', q: 'Can a row show the number 5 two times?', options: ['No!', 'Yes', 'Maybe'], correct: 0, after: 'Correct! Each number is used ONE time only.' },
    ],
  },
  {
    id: 'one-space',
    title: 'Trick 1 · One Empty Spot',
    subtitle: 'When a row, column, or box has ONE empty square, the answer is the missing number.',
    icon: '1',
    demo: 'one-space',
    pages: [
      { type: 'text', text: 'A full row shows 1, 2, 3, 4, 5, 6, 7, 8, 9. If one square is empty, you know its number!' },
      { type: 'text', text: 'The missing number is the answer. On the next page, Coach will show you one. Try it!', demo: true },
    ],
  },
  {
    id: 'one-fits',
    title: 'Trick 2 · Only One Fits',
    subtitle: 'Check a square’s row, column, and box. If only one number fits, that is the answer.',
    icon: '✓',
    demo: 'one-fits',
    pages: [
      { type: 'text', text: 'When a square looks empty, cross off every number its row, column, and box already use.' },
      { type: 'text', text: 'If ONE number is left, that is the answer! Try it with Coach.', demo: true },
    ],
  },
  {
    id: 'hunt',
    title: 'Trick 3 · Number Hunt',
    subtitle: 'Pick one number and chase it: where can it live in this row, column, or box?',
    icon: '3',
    demo: 'number-hunt',
    pages: [
      { type: 'text', text: 'Pick a number, for example 6. Now find its row, column, or box and look for its only free square.' },
      { type: 'text', text: 'If a number has just ONE free square, that square is the answer! Try it with Coach.', demo: true },
    ],
  },
];

// deterministic demo boards: scan the 100 generated puzzles for one whose best
// first move is the kind the lesson is teaching.
const demoCache = new Map();
const salt = 'lesson-demos';

export function demoPuzzleFor(kind) {
  if (demoCache.has(kind)) return demoCache.get(kind);
  // scans are deterministic and cheap; typical hit within a few indices
  for (let i = 1; i <= 100; i++) {
    const p = generatePuzzle(i, salt);
    const mv = rankMoves(p.given);
    if (mv && mv.kind === kind) {
      demoCache.set(kind, { puzzle: p, move: mv, plan: mv });
      return demoCache.get(kind);
    }
  }
  return null;
}