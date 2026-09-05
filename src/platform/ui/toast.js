// platform/ui/toast.js — transient status pills. Game-agnostic.

import { h, clear } from './dom.js';

const host = h('div', { class: 'toast-host', 'aria-live': 'polite' });
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(host));

let timers = new Map();

export function toast(message, kind = 'info', ms = 2600) {
  if (!document.body.contains(host)) document.body.appendChild(host);
  const pill = h('div', { class: `toast toast-${kind}`, role: 'status' }, message);
  host.appendChild(pill);
  const t = setTimeout(() => {
    pill.classList.add('toast-out');
    setTimeout(() => pill.remove(), 300);
    timers.delete(pill);
  }, ms);
  timers.set(pill, t);
}

export function clearToasts() {
  for (const [, t] of timers) clearTimeout(t);
  clear(host);
}