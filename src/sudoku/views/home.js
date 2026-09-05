// sudoku/views/home.js - kid-simple cold open: one full-screen PLAY door.
// Zero reading required: rocket + one giant button. The grown-ups door
// lives in the top bar (shared.js). miniMap stays exported for progress.js.

import { h } from '../../platform/ui/dom.js';
import { allRecords } from '../../platform/progress.js';
import { isStandalone } from '../../platform/pwa.js';
import { GAME_ID, PUZZLE_COUNT } from '../curriculum.js';
import { rocketHero } from './shared.js';

export function homeView(nav) {
  const records = allRecords(GAME_ID);
  const nextIdx = (() => {
    for (let i = 1; i <= PUZZLE_COUNT; i++) if (!records[`puzzle-${i}`]) return i;
    return PUZZLE_COUNT;
  })();

  const root = h('div', { class: 'play-door-wrap' });
  root.appendChild(rocketHero());

  const door = h('button', {
    class: 'btn btn-primary btn-xl play-door',
    'aria-label': `Play puzzle ${nextIdx}`,
    onClick: () => nav(`play/${nextIdx}`),
  });
  door.appendChild(h('span', { class: 'play-door-word', 'aria-hidden': 'true' }, 'PLAY'));
  door.appendChild(h('span', { class: 'play-door-num', 'aria-hidden': 'true' }, `${nextIdx}`));
  root.appendChild(door);

  root.appendChild(h('p', { class: 'play-door-tip', 'aria-hidden': 'true' }, '★ tap to play'));

  if (!isStandalone()) {
    root.appendChild(h('p', { class: 'saved-note', style: { textAlign: 'center' } }, 'On your phone: "Add to Home Screen" makes it work offline.'));
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