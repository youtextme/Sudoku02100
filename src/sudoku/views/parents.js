// sudoku/views/parents.js - grown-ups door. Arithmetic challenge gate
// (rule: adult-only, kids unlikely to pass), then a simple hub to the
// teaching/management screens. Kid route home -> play -> win never touches this.

import { h } from '../../platform/ui/dom.js';
import { parentUnlocked, setParentUnlocked } from '../../platform/session.js';
import { play } from '../../platform/sound.js';

const HUB_LINKS = [
  { route: 'learn', label: 'Learn the game', cls: 'btn-secondary' },
  { route: 'progress', label: 'My progress', cls: 'btn-ghost' },
  { route: 'settings', label: 'Settings', cls: 'btn-ghost' },
  { route: 'free', label: 'Free practice', cls: 'btn-green' },
];

function makeQuestion() {
  const a = 2 + Math.floor(Math.random() * 5); // 2..6
  const b = 2 + Math.floor(Math.random() * 5); // 2..6
  const correct = a + b;
  const options = new Set([correct]);
  while (options.size < 3) {
    const delta = 1 + Math.floor(Math.random() * 4) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = correct + delta;
    if (candidate >= 1 && candidate <= 12) options.add(candidate);
  }
  const shuffled = [...options].sort(() => Math.random() - 0.5);
  return { prompt: `${a} + ${b}`, correct, options: shuffled };
}

function gateCard(nav) {
  const root = h('div', { class: 'parents-wrap' });

  const card = h('section', { class: 'card' });
  card.appendChild(h('div', { class: 'card-kicker' }, 'Grown-ups only'));
  card.appendChild(h('p', { class: 'card-title' }, 'This door is for your grown-up.'));

  const q = makeQuestion();
  card.appendChild(h('p', { class: 'parents-ask' }, `What is ${q.prompt}?`));

  const row = h('div', { class: 'three-col', style: { marginTop: '12px' } });
  const answerBtns = q.options.map((opt) => h('button', {
    class: 'btn btn-ghost parents-opt',
    onClick: () => {
      if (opt === q.correct) {
        play('win');
        setParentUnlocked(true);
        // Already on #/parents, so a hash nav won't trigger re-render. Swap in place.
        const rootEl = document.getElementById('app');
        rootEl.innerHTML = '';
        rootEl.appendChild(hubCard(nav));
        const bar = document.getElementById('topbar');
        const t = bar.querySelector('.tb-title');
        if (t) t.textContent = 'Grown-ups';
      } else {
        play('uncover');
        root.replaceWith(gateCard(nav));
      }
    },
  }, String(opt)));
  answerBtns.forEach((b) => row.appendChild(b));
  card.appendChild(row);

  card.appendChild(h('button', {
    class: 'btn btn-ghost', style: { marginTop: '18px' },
    onClick: () => nav('play'),
  }, '← Back to play'));

  root.appendChild(card);
  return root;
}

function hubCard(nav) {
  const root = h('div', { class: 'parents-wrap' });
  const card = h('section', { class: 'card parents-hub' });
  card.appendChild(h('div', { class: 'card-kicker' }, 'Grown-ups'));

  const links = HUB_LINKS.map((l) => h('button', {
    class: `btn ${l.cls}`, style: { marginBottom: '10px' },
    onClick: () => nav(l.route),
  }, l.label));
  links.forEach((b) => card.appendChild(b));

  card.appendChild(h('button', {
    class: 'btn btn-primary', style: { marginTop: '6px' },
    onClick: () => nav('play'),
  }, '→ Back to play'));

  root.appendChild(card);
  return root;
}

export function parentsView(nav) {
  return {
    el: parentUnlocked() ? hubCard(nav) : gateCard(nav),
    title: 'Grown-ups',
  };
}