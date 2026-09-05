// sudoku/views/home.js - landing page: hero, next puzzle, way-finding.

import { h } from '../../platform/ui/dom.js';
import { summarize } from '../../platform/progress.js';
import { isStandalone } from '../../platform/pwa.js';
import { allRecords } from '../../platform/progress.js';
import { GAME_ID, PUZZLE_COUNT } from '../curriculum.js';
import { rocketHero, tierChip } from './shared.js';
import { getPuzzle } from '../saves.js';

const JOURNEY_KEYS = Array.from({ length: PUZZLE_COUNT }, (_, i) => `puzzle-${i + 1}`);

export function homeView(nav) {
  const records = allRecords(GAME_ID);
  const nextIdx = (() => {
    for (let i = 1; i <= PUZZLE_COUNT; i++) if (!records[`puzzle-${i}`]) return i;
    return PUZZLE_COUNT;
  })();
  const sum = summarize(GAME_ID, JOURNEY_KEYS);
  const puzzle = getPuzzle(nextIdx);

  const root = h('div');

  const hero = h('section', { class: 'hero' });
  hero.appendChild(rocketHero());
  hero.appendChild(h('h1', {}, 'Sudoku 02100'));
  hero.appendChild(h('p', { class: 'sub' }, '100 puzzles. One a day. Coach teaches you to think.'));

  const nextCard = h('section', { class: 'card next-puzzle' });
  nextCard.appendChild(h('div', { class: 'card-kicker' }, 'Next in your space journey'));
  nextCard.appendChild(h('div', { class: 'row-between' }, tierChip(puzzle.tier), h('span', { class: 'muted', style: { fontWeight: '800' } }, `${nextIdx} of 100`)));
  nextCard.appendChild(h('div', { class: 'big', style: { marginTop: '6px' } }, `Puzzle ${nextIdx}`));
  nextCard.appendChild(h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Go slow. Use the Coach. Every puzzle teaches a new idea.'));
  nextCard.appendChild(h('button', { class: 'btn btn-primary btn-xl', style: { marginTop: '12px' }, onClick: () => nav(`play/${nextIdx}`) }, '▶ Play it now'));

  const map = h('section', { class: 'card' });
  map.appendChild(h('div', { class: 'card-title' }, 'Your map'));
  map.appendChild(h('p', { class: 'muted', style: { fontWeight: '700' } }, `Solved: ${sum.solved} of ${PUZZLE_COUNT} puzzles. Best streak: ${sum.bestStreak} days.`));
  map.appendChild(h('div', { class: 'fill-meter', style: { marginTop: '8px' }, 'aria-label': `${Math.round(sum.pct)} percent done` },
    h('div', { class: 'fill', style: { width: `${Math.max(2, sum.pct)}%` } })));
  map.appendChild(miniMap(records));

  const learn = h('section', { class: 'card' });
  learn.appendChild(h('div', { class: 'card-title' }, 'Never played Sudoku?'));
  learn.appendChild(h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Start here. We teach every little thing first.'));
  learn.appendChild(h('button', { class: 'btn btn-secondary', style: { marginTop: '10px' }, onClick: () => nav('learn') }, 'Learn the game'));

  const free = h('section', { class: 'card' });
  free.appendChild(h('div', { class: 'card-title' }, 'Free practice'));
  free.appendChild(h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Pick a level and play forever. No day counter here.'));
  free.appendChild(h('button', { class: 'btn btn-green', style: { marginTop: '10px' }, onClick: () => nav('free') }, 'Practice any level'));

  const more = h('section', { class: 'card' });
  const colA = h('div');
  colA.appendChild(h('button', { class: 'btn btn-ghost', onClick: () => nav('progress') }, 'My progress'));
  const colB = h('div');
  colB.appendChild(h('button', { class: 'btn btn-ghost', onClick: () => nav('settings') }, 'Settings'));
  const two = h('div', { class: 'two-col' });
  two.appendChild(colA);
  two.appendChild(colB);
  more.appendChild(two);

  root.append(hero, nextCard, map, learn, free, more);

  if (!isStandalone()) {
    root.appendChild(h('p', { class: 'saved-note', style: { textAlign: 'center' } }, 'Tip: on your phone, use "Add to Home Screen" to install this app. Then it works with no internet!'));
  }

  return { el: root, title: 'Sudoku 02100' };
}

export function miniMap(records, opts = {}) {
  const wrap = h('div', { class: 'map-grid', 'aria-label': '100-puzzle map', role: 'img' });
  for (let i = 1; i <= 100; i++) {
    const solved = !!records[`puzzle-${i}`];
    const current = !solved && !records[`puzzle-${i - 1}`];
    const cell = h('div', {
      class: `map-cell ${solved ? 'solved' : ''} ${current ? 'current' : ''}`,
      'aria-label': `Puzzle ${i}${solved ? ', done' : ''}`,
    }, solved ? '★' : i);
    wrap.appendChild(cell);
  }
  return wrap;
}