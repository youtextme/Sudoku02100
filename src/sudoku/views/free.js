// sudoku/views/free.js - free-practice tier picker.

import { h } from '../../platform/ui/dom.js';
import { TIERS } from '../generator.js';
import { nextFreeN } from '../saves.js';

export function freeView(nav) {
  const root = h('div');
  root.appendChild(h('section', { class: 'card' },
    h('p', { style: { fontSize: '22px', fontWeight: '800' } }, 'Free practice'),
    h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Pick a level. These do not count in your 100-puzzle journey. Practice anything, any time.'),
  ));
  const grid = h('div', {});
  for (const tier of TIERS) {
    const card = h('button', {
      class: 'card',
      style: { width: '100%', textAlign: 'left', cursor: 'pointer', display: 'block' },
      onClick: () => nav(`play/free/${tier.id}/${nextFreeN()}`),
    });
    card.appendChild(h('div', { class: 'row-between' },
      h('span', { style: { fontWeight: '900', fontSize: '22px' } }, tier.name),
      h('span', { class: 'tier-chip', style: { background: tier.color } }, `Puzzles ${tier.from}–${tier.to}`)));
    card.appendChild(h('p', { class: 'muted', style: { fontWeight: '700', marginTop: '4px' } }, tierBlurb(tier)));
    grid.appendChild(card);
  }
  root.appendChild(grid);
  return { el: root, title: 'Free practice' };
}

function tierBlurb(tier) {
  switch (tier.id) {
    case 'intro': return 'Very gentle. Almost every move is an empty-spot trick.';
    case 'easy': return 'Easy rows and columns. Good for new players.';
    case 'medium': return 'Mix of tricks. You will use Number Hunting.';
    case 'hard': return 'More thinking. Check every row, column, and box.';
    case 'tough': return 'You will need the pencil notes sometimes.';
    case 'expert': return 'Spicy! For puzzle masters.';
    default: return '';
  }
}