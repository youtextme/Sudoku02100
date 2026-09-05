// app.js - boot: router, shell wiring, PWA. The single entry point.
// Kid-simple: cold open = PLAY door; journey play always resolves to the
// next unsolved puzzle; learn/progress/settings/free live behind a gate.

import { clear, scrollTop } from './platform/ui/dom.js';
import { buildTopbar } from './sudoku/views/shared.js';
import { homeView } from './sudoku/views/home.js';
import { playView } from './sudoku/views/play.js';
import { freeView } from './sudoku/views/free.js';
import { learnIndexView, learnLessonView } from './sudoku/views/learn.js';
import { progressView } from './sudoku/views/progress.js';
import { settingsView } from './sudoku/views/settings.js';
import { parentsView } from './sudoku/views/parents.js';
import { parentUnlocked } from './platform/session.js';
import { allRecords } from './platform/progress.js';
import { GAME_ID, PUZZLE_COUNT } from './sudoku/curriculum.js';
import {
  captureInstallPrompt, handleAppInstalled, monitorConnection, registerServiceWorker,
} from './platform/pwa.js';

let current = null;

/** First journey puzzle with no completion record - the kid always lands here. */
function nextUnsolvedIndex() {
  const records = allRecords(GAME_ID);
  for (let i = 1; i <= PUZZLE_COUNT; i++) if (!records[`puzzle-${i}`]) return i;
  return PUZZLE_COUNT;
}

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
  const parent = parentUnlocked();
  let view;

  if (head === 'home') {
    view = homeView(navigate);
  } else if (head === 'play') {
    if (parts[1] === 'free' && parts[2]) {
      view = parent ? playView(navigate, { tier: parts[2], index: Number(parts[3] || 1) }) : homeView(navigate);
    } else {
      // Kids always land on the next unsolved puzzle - no lock walls on the kid path.
      const requested = Number(parts[1]) || nextUnsolvedIndex();
      view = playView(navigate, { index: requested });
    }
  } else if (head === 'free') view = parent ? freeView(navigate) : homeView(navigate);
  else if (head === 'learn') view = parent ? (parts[1] ? learnLessonView(navigate, parts[1]) : learnIndexView(navigate)) : homeView(navigate);
  else if (head === 'progress') view = parent ? progressView(navigate) : homeView(navigate);
  else if (head === 'settings') view = parent ? settingsView(navigate) : homeView(navigate);
  else if (head === 'parents') view = parentsView(navigate);
  else view = homeView(navigate);

  if (current && typeof current.destroy === 'function') current.destroy();
  current = view;

  const host = document.getElementById('app');
  clear(host);
  host.appendChild(view.el);
  buildTopbar(view.title || 'Sudoku 02100', { nav: navigate });
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