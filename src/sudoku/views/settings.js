// sudoku/views/settings.js — sound, install, data, and a tiny parent guide.

import { h } from '../../platform/ui/dom.js';
import { isMuted, setMuted } from '../../platform/sound.js';
import { isStandalone, triggerInstall } from '../../platform/pwa.js';
import { openModal, closeModal } from '../../platform/ui/modal.js';
import { toast } from '../../platform/ui/toast.js';
import { scopedStore, clearNamespace } from '../../platform/store.js';
import { sampleClear } from './reset.js';

export function settingsView(nav) {
  const root = h('div');
  const soundStore = scopedStore('settings');

  const soundRow = h('div', { class: 'settings-row' });
  soundRow.appendChild(h('div', {},
    h('div', { style: { fontWeight: '800', fontSize: '20px' } }, 'Sound'),
    h('div', { class: 'muted', style: { fontWeight: '600' } }, 'Chimes and happy sounds')));
  const soundSwitch = h('button', { class: 'switch', role: 'switch', 'aria-label': 'Sound', 'aria-checked': String(!isMuted()) });
  soundSwitch.addEventListener('click', () => {
    setMuted(!isMuted());
    soundSwitch.setAttribute('aria-checked', String(!isMuted()));
  });
  soundRow.appendChild(soundSwitch);

  root.appendChild(h('section', { class: 'card' }, soundRow));

  const installRow = h('div', { class: 'settings-row' });
  installRow.appendChild(h('div', {},
    h('div', { style: { fontWeight: '800', fontSize: '20px' } }, 'Install on your phone'),
    h('div', { class: 'muted', style: { fontWeight: '600' } }, isStandalone() ? 'This app is already installed.' : 'Save it to your home screen. Then it works offline.')));
  installRow.appendChild(h('button', {
    class: 'btn btn-primary', style: { width: 'auto', minHeight: '44px', padding: '8px 18px' },
    onClick: () => {
      if (isStandalone()) {
        toast('Already installed! ✓', 'green');
      } else if ('serviceWorker' in navigator) {
        triggerInstall().catch(() => toast('Use your browser menu: "Add to Home screen".', 'orange'));
      }
    },
  }, 'Install'));
  root.appendChild(h('section', { class: 'card' }, installRow));

  const resetRow = h('div', { class: 'settings-row' });
  resetRow.appendChild(h('div', {},
    h('div', { style: { fontWeight: '800', fontSize: '20px' } }, 'Start over'),
    h('div', { class: 'muted', style: { fontWeight: '600' } }, 'Clear all progress. Lock all puzzles again.')));
  resetRow.appendChild(h('button', {
    class: 'btn btn-secondary', style: { width: 'auto', minHeight: '44px', padding: '8px 18px' },
    onClick: () => {
      openModal({
        title: 'Reset everything?',
        body: h('p', {}, 'This clears all your stars, badges, and finished puzzles. There is no undo.'),
        actions: [
          { label: 'Cancel', kind: 'ghost', onClick: closeModal },
          {
            label: 'Yes, reset', kind: 'primary',
            onClick: () => {
              sampleClear();
              closeModal();
              toast('All progress cleared.', 'orange');
              nav('home');
            },
          },
        ],
      });
    },
  }, 'Reset'));
  root.appendChild(h('section', { class: 'card' }, resetRow));

  root.appendChild(h('section', { class: 'card' },
    h('div', { class: 'card-title' }, 'A note for grown-ups'),
    h('p', { class: 'muted' }, 'This app is 100% on the device. No account, no internet needed after install, no ads. The Coach never just tells the answer: it asks questions and lets the child place the number. Difficulty grows across 100 puzzles, one per day, but a child may replay or practice free any time.')));

  root.appendChild(h('button', { class: 'btn btn-ghost', style: { marginTop: '8px' }, onClick: () => nav('home') }, '← Back home'));

  return { el: root, title: 'Settings' };
}