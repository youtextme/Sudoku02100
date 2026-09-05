// platform/progress.js — game-agnostic progress ledger.
// Any game can record completions, stars, hints used, streaks and badges
// without Sudoku knowing anything about it.

import { scopedStore } from './store.js';

const store = scopedStore('progress');

function root() {
  const r = store.get('ledger', { games: {} });
  if (!r.games) r.games = {};
  return r;
}

function save(r) {
  store.set('ledger', r);
}

function game(gameId) {
  const r = root();
  if (!r.games[gameId]) {
    r.games[gameId] = {
      records: {},
      badges: {},
      bestStreak: 0,
      lastSolvedDay: null,
    };
    save(r);
  }
  return r.games[gameId];
}

export function markSolved(gameId, puzzleKey, { stars = 1, hintsUsed = 0, timeMs = 0, day = null } = {}) {
  const g = game(gameId);
  const prev = g.records[puzzleKey];
  g.records[puzzleKey] = {
    stars: Math.max(stars, prev ? prev.stars : 0),
    hintsUsed: prev ? Math.min(hintsUsed, prev.hintsUsed) : hintsUsed,
    timeMs: prev ? Math.min(timeMs, prev.timeMs) || prev.timeMs : timeMs,
    solvedAt: Date.now(),
  };

  // Streak on the "one per day" calendar
  const todayKey = new Date().toISOString().slice(0, 10);
  if (day === todayKey) {
    let current = 1;
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 1);
    while (g.records[dayKeyOf(cursor)]) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }
    g.lastSolvedDay = todayKey;
    g.bestStreak = Math.max(g.bestStreak, current);
  }
  save(root());
  return getRecord(gameId, puzzleKey);
}

function dayKeyOf(date) {
  return date.toISOString().slice(0, 10);
}

export function getRecord(gameId, puzzleKey) {
  return game(gameId).records[puzzleKey] || null;
}

export function solvedCount(gameId) {
  return Object.keys(game(gameId).records).length;
}

export function allRecords(gameId) {
  return game(gameId).records;
}

export function grantBadge(gameId, badgeId) {
  const g = game(gameId);
  g.badges[badgeId] = (g.badges[badgeId] || 0) + 1;
  save(root());
}

export function perGameState(gameId) {
  const g = game(gameId);
  return {
    records: g.records,
    badgeCounts: { ...g.badges },
    bestStreak: g.bestStreak,
    lastSolvedDay: g.lastSolvedDay,
  };
}

// Generic stats row usable by any game's milestone screen.
export function summarize(gameId, puzzleKeys) {
  const g = game(gameId);
  const solved = Object.keys(g.records).length;
  const total = Math.max(puzzleKeys.length, 1);
  const stars = Object.values(g.records).reduce((s, r) => s + r.stars, 0);
  return { solved, total, stars, bestStreak: g.bestStreak, pct: (solved / total) * 100 };
}