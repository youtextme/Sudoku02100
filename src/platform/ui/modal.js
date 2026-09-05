// platform/ui/modal.js — accessible modal shell. Game-agnostic.

import { h, clear } from './dom.js';

let current = null;

export function openModal({ title, body, actions = [], dismissable = true, top = 'center' }) {
  closeModal();

  const overlay = h('div', { class: 'modal-overlay', role: 'presentation' });
  const card = h('div', {
    class: 'modal-card',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': title || 'Dialog',
  });

  const head = h('div', { class: 'modal-head' });
  if (title) head.appendChild(h('h2', { class: 'modal-title' }, title));
  if (dismissable) {
    head.appendChild(
      h('button', {
        class: 'icon-btn',
        'aria-label': 'Close',
        onClick: closeModal,
      }, '×'),
    );
  }
  card.appendChild(head);

  const bodyEl = h('div', { class: 'modal-body' });
  if (body) bodyEl.appendChild(body);
  card.appendChild(bodyEl);

  if (actions.length) {
    const foot = h('div', { class: 'modal-foot' });
    for (const a of actions) {
      foot.appendChild(
        h('button', { class: `btn btn-${a.kind || 'ghost'}`, onClick: a.onClick, 'aria-label': a.label }, a.label),
      );
    }
    card.appendChild(foot);
  }

  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => {
    if (dismissable && e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  current = overlay;
  return overlay;
}

export function closeModal() {
  if (current) {
    current.remove();
    current = null;
  }
}