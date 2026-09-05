// app.js - boot: router, shell wiring, PWA. The single entry point.

import { clear, scrollTop } from './platform/ui/dom.js';
import { buildTopbar } from './sudoku/views/shared.js';
import { homeView } from './sudoku/views/home.js';
import { playView } from './sudoku/views/play.js';
import { freeView } from './sudoku/views/free.js';
import { learnIndexView, learnLessonView } from './sudoku/views/learn.js';
import { progressView } from './sudoku/views/progress.js';
import { settingsView } from './sudoku/views/settings.js';
import {
  captureInstallPrompt, handleAppInstalled, monitorConnection, registerServiceWorker,
} from './platform/pwa.js';

let current = null;

export function parseHash() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '');
  return raw === '' ? ['home'] : raw.split('/').map((s) => decodeURIComponent(s));
}

export function navigate(route) {
  const clean = String(route).replace(/^#\/?/, '');
  location.hash = `#/${clean}`;
}

export function render() {
  const parts = parseHash();
  const head = parts[0] || 'home';
  let view;

  if (head === 'home') view = homeView(navigate);
  else if (head === 'play') {
    if (parts[1] === 'free' && parts[2]) view = playView(navigate, { tier: parts[2], index: Number(parts[3] || 1) });
    else view = playView(navigate, { index: Number(parts[1]) || 1 });
  } else if (head === 'free') view = freeView(navigate);
  else if (head === 'learn') view = parts[1] ? learnLessonView(navigate, parts[1]) : learnIndexView(navigate);
  else if (head === 'progress') view = progressView(navigate);
  else if (head === 'settings') view = settingsView(navigate);
  else view = homeView(navigate);

  if (current && typeof current.destroy === 'function') current.destroy();
  current = view;

  const host = document.getElementById('app');
  clear(host);
  host.appendChild(view.el);
  buildTopbar(view.title || 'Sudoku 02100');
  scrollTop();
}

window.addEventListener('hashchange', render);

// boot
document.addEventListener('DOMContentLoaded', () => {
  captureInstallPrompt();
  handleAppInstalled();
  monitorConnection();
  registerServiceWorker('sudoku2100-v1');
  render();
});