// sudoku/views/progress.js — the milestone / journey map screen.

import { h } from '../../platform/ui/dom.js';
import { summarize, perGameState, allRecords } from '../../platform/progress.js';
import { GAME_ID, PUZZLE_COUNT, MILESTONES } from '../curriculum.js';
import { miniMap } from './home.js';

const JOURNEY_KEYS = Array.from({ length: PUZZLE_COUNT }, (_, i) => `puzzle-${i + 1}`);

export function progressView(nav) {
  const sum = summarize(GAME_ID, JOURNEY_KEYS);
  const state = perGameState(GAME_ID);
  const records = allRecords(GAME_ID);

  const root = h('div');

  const stats = h('div', { class: 'stat-row' });
  stats.appendChild(stat('Solved', String(sum.solved)));
  stats.appendChild(stat('Stars', String(sum.stars)));
  root.appendChild(stats);

  root.appendChild(h('section', { class: 'card' },
    h('div', { class: 'card-title' }, 'The 100-day map'),
    h('p', { class: 'muted', style: { fontWeight: '700' } }, `Puzzle ${sum.solved + 1} is next. It gets a little harder every day.`),
    h('div', { style: { marginTop: '10px' } }, miniMap(records))));

  root.appendChild(h('section', { class: 'card' },
    h('div', { class: 'card-title' }, 'Milestone badges'),
    h('div', { class: 'badge-row' }, ...MILESTONES.map((m) => badge(m, state)))));

  if (sum.solved >= PUZZLE_COUNT) {
    root.appendChild(h('section', { class: 'card', style: { textAlign: 'center' } },
      h('p', { style: { fontSize: '24px', fontWeight: '900', color: 'var(--navy)' } }, 'You did all 100!'),
      h('p', { class: 'muted' }, 'You are a real Sudoku master now.')));
  }

  root.appendChild(h('button', { class: 'btn btn-secondary', style: { marginTop: '8px' }, onClick: () => nav('home') }, '← Back home'));

  return { el: root, title: 'My progress' };
}

function stat(label, num) {
  return h('div', { class: 'stat-card' }, h('div', { class: 'num' }, num), h('div', { class: 'lbl' }, label));
}

function badge(m, state) {
  const unlocked = (state.badgeCounts[m.badge] || 0) > 0;
  return h('div', { class: `badge${unlocked ? ' unlocked' : ''}`, role: 'img', 'aria-label': m.text },
    h('span', { class: 'b-icon' }, glyph(m)),
    h('span', {}, m.text));
}

/** badge glyphs per milestone */
function glyph(m) {
  if (m.at >= 1) return '★';
  return '7';
}