// sudoku/views/play.js - the game screen: board, keypad, coach, win flow.

import { h, clear, qs } from '../../platform/ui/dom.js';
import { GridEngine } from '../../platform/grid/grid-engine.js';
import { GridView } from '../../platform/grid/grid-view.js';
import { toast } from '../../platform/ui/toast.js';
import { confetti } from '../../platform/ui/confetti.js';
import { play as sfx } from '../../platform/sound.js';
import { markSolved, grantBadge, allRecords } from '../../platform/progress.js';
import { openModal, closeModal } from '../../platform/ui/modal.js';
import { sudokuGroups } from '../rules.js';
import { rankMoves, planForMove, makeStuckPlan, noteSuggestions } from '../coach.js';
import { celebrate, MILESTONES, GAME_ID } from '../curriculum.js';
import { getPuzzle, getFreePuzzle, getState, putState, baseStateFor } from '../saves.js';
import { tierChip } from './shared.js';

const GROUPS = sudokuGroups();
const TODAY = new Date().toISOString().slice(0, 10);

const ROCKET_AVATAR = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Coach" width="52" height="52"><circle cx="50" cy="50" r="46" fill="#FFD166" stroke="#1E2A5A" stroke-width="3"/><path d="M50 18 C68 30 70 52 62 74 L50 66 L38 74 C30 52 32 30 50 18 Z" fill="#FF6B35" stroke="#1E2A5A" stroke-width="3"/><circle cx="50" cy="44" r="13" fill="#FFF8EC" stroke="#1E2A5A" stroke-width="3"/><circle cx="55" cy="41" r="3.2" fill="#1E2A5A"/><path d="M36 80 L40 70 M64 80 L60 70" stroke="#1E2A5A" stroke-width="3" stroke-linecap="round"/></svg>`;

const PADLOCK_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="10" y="26" width="44" height="32" rx="8" fill="#F59E0B" stroke="#1E2A5A" stroke-width="3"/><path d="M20 26 V18 a12 12 0 0 1 24 0 v8" fill="none" stroke="#1E2A5A" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="42" r="5" fill="#1E2A5A"/></svg>`;

export function playView(nav, { index, tier } = {}) {
  const isFree = !!tier;
  const kids = !isFree; // journey play is the kid's route; free practice is a grown-ups tool
  const journeyRecords = allRecords(GAME_ID);
  if (!isFree && index > 1 && !journeyRecords[`puzzle-${index - 1}`]) {
    return lockedView(nav, index, journeyRecords);
  }
  const key = isFree ? `free:${tier}:${index}` : `puzzle-${index}`;
  const puzzle = isFree ? getFreePuzzle(tier, index) : getPuzzle(index);
  const tierInfo = puzzle.tier;
  const saved = getState(key) || baseStateFor(puzzle);

  const engine = new GridEngine({ size: 9, groups: GROUPS });
  engine.reset(puzzle.given);
  for (let c = 0; c < 81; c++) {
    const sv = saved.values[c] ?? puzzle.given[c];
    engine.values[c] = sv > 0 ? sv : -1; // 0 means "empty" in saves; engine needs -1
    engine.notes[c] = new Set(saved.notes[c] || []);
  }

  let stateHints = saved.hintsUsed || 0;
  let timeMs = saved.timeMs || 0;
  let noteMode = false;
  let lastTick = Date.now();
  let timerId = null;
  let won = saved.solved;

  const root = h('div');
  const meta = h('div', { class: 'game-meta' });
  const tierEl = tierChip(puzzle.tier);
  meta.appendChild(tierEl);

  const meterWrap = h('div', { class: 'fill-meter', 'aria-label': `Board fill` });
  const fill = h('div', { class: 'fill', style: { width: '0%' } });
  meterWrap.appendChild(fill);
  meta.appendChild(meterWrap);

  const timeEl = h('span', { class: 'timer', role: 'timer' });
  meta.appendChild(timeEl);

  const coachBtn = h('button', { class: 'btn btn-primary', 'aria-label': 'Coach, can you help me think?' }, 'Coach');
  coachBtn.addEventListener('click', () => openCoach());

  const boardEl = h('div', { class: 'board-wrap' });
  const keypadEl = h('div', { class: 'keypad' });

  const gridView = new GridView({
    engine,
    onSelect: (cell) => { controller.onGridSelect(cell); },
    noteGetter: () => noteMode,
    onInput: (cell, symbolId, isNote, isClear) => {
      return controller.onGridInput(cell, symbolId, isNote, isClear);
    },
  });

  // ---- persistence ----
  function saveNow() {
    putState(key, {
      values: Array.from(engine.values),
      notes: engine.notes,
      hintsUsed: stateHints,
      timeMs,
      solved: won,
      free: isFree,
    });
  }
  window.addEventListener('beforeunload', saveNow);

  // ---- board helpers ----
  function boardArray() {
    return Array.from(engine.values, (v) => (v < 0 ? 0 : v));
  }

  // ---- kid feedback (re-applied after every gridView.update()) ----
  const starAt = new Map(); // cell -> expiresAt
  const warnCells = new Set();
  let warnUntil = 0;

  function reapplyKidFeedback() {
    const now = Date.now();
    for (const [cell, until] of Array.from(starAt.entries())) {
      const el = gridView.cells[cell];
      if (!el) continue;
      let span = el.querySelector('.cell-star');
      if (until > now) {
        if (!span) {
          span = document.createElement('span');
          span.className = 'cell-star';
          span.setAttribute('aria-hidden', 'true');
          span.textContent = '★';
          el.appendChild(span);
        }
      } else if (span) {
        span.remove();
        starAt.delete(cell);
      }
    }
    const warnActive = now < warnUntil;
    for (let c = 0; c < gridView.cells.length; c++) {
      const el = gridView.cells[c];
      if (el) el.classList.toggle('tap-error', warnActive && warnCells.has(c));
    }
    if (warnActive) {
      const board = qs('.board-wrap', root);
      if (board) board.classList.add('board-shake');
    }
    if (starAt.size) setTimeout(reapplyKidFeedback, 80);
  }

  function popStar(cell) {
    starAt.set(cell, Date.now() + 700);
    reapplyKidFeedback();
  }

  function flashWarn(cells) {
    warnCells.clear();
    cells.forEach((c) => warnCells.add(c));
    warnUntil = Date.now() + 600;
    setTimeout(() => {
      warnUntil = 0;
      for (let c = 0; c < gridView.cells.length; c++) {
        const el = gridView.cells[c];
        if (el) el.classList.remove('tap-error');
      }
      const board = qs('.board-wrap', root);
      if (board) board.classList.remove('board-shake');
    }, 650);
  }

  function refreshUI() {
    const done = engine.n - boardArray().filter((v) => v > 0).length;
    fill.style.width = `${Math.round(((engine.n - done) / engine.n) * 100)}%`;
    timeEl.textContent = fmtTime(timeMs);
    gridView.update();
    if (kids) reapplyKidFeedback();
    if (!timerId && !won) startTimer();
  }

  function startTimer() {
    timerId = setInterval(() => {
      if (won) return;
      timeMs += Date.now() - lastTick;
      lastTick = Date.now();
      saveNow();
      timeEl.textContent = fmtTime(timeMs);
    }, 1000);
  }

  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  // ---- input handling ----
  const controller = {
    onGridSelect() {},
    onGridInput(cell, symbolId, isNote, isClear) {
      if (won) return false;
      if (isClear) {
        if (engine.isGiven(cell)) return false;
        engine.clear(cell);
        sfx('tap');
        saveNow();
        coachHint?.clear?.();
        return checkContinue();
      }
      if (isNote) {
        if (engine.isGiven(cell) || engine.valueAt(cell) >= 0) return false;
        engine.toggleNote(cell, symbolId, true);
        sfx('tap');
        saveNow();
        return true;
      }
      // normal placement
      if (engine.isGiven(cell)) { showBlocked(cell, symbolId); return false; }
      if (engine.valueAt(cell) >= 0 && engine.values[cell] === symbolId) return false;
      const ok = engine.place(cell, symbolId);
      if (!ok) {
        showBlocked(cell, symbolId);
        sfx('nudge');
        return false;
      }
      engine.values[cell] = symbolId;
      sfx('place');
      if (kids) popStar(cell);
      saveNow();
      if (coachHint && coachHint.eatInput(cell, false, symbolId)) return true;
      return checkContinue();
    },
  };

  function checkContinue() {
    refreshUI();
    if (engine.isSolved()) setTimeout(onWin, 350);
    return true;
  }

  function showBlocked(cell, symbolId) {
    if (kids) {
      const mates = [];
      for (const gid of engine.cellGroups[cell]) {
        const group = GROUPS[gid];
        const buddy = group.find((c) => c !== cell && engine.values[c] === symbolId);
        if (buddy != null) mates.push(buddy);
      }
      flashWarn([cell, ...mates]);
      return;
    }
    for (const gid of engine.cellGroups[cell]) {
      const group = GROUPS[gid];
      const mate = group.find((c) => c !== cell && engine.values[c] === symbolId);
      if (mate != null) {
        const name = gid < 9 ? 'row' : gid < 18 ? 'column' : 'box';
        const r1 = engine.rowOf(cell) + 1, c1 = engine.colOf(cell) + 1;
        const r2 = engine.rowOf(mate) + 1, c2 = engine.colOf(mate) + 1;
        toast(`A ${symbolId} is already in this ${name}. (Row ${r2}, Col ${c2}).`, 'orange');
        gridView.select(mate);
        return;
      }
    }
  }

  // ---- win ----
  function onWin() {
    if (won) return;
    won = true;
    stopTimer();
    saveNow();
    const stars = stateHints === 0 ? 3 : stateHints <= 2 ? 2 : 1;
    markSolved(GAME_ID, key, { stars, hintsUsed: stateHints, timeMs, day: TODAY });
    const count = Object.keys(allRecords(GAME_ID)).length;
    grantMilestones(count);
    sfx('win');
    confetti(110);
    const msg = celebrate.solved[Math.floor(Math.random() * celebrate.solved.length)];
    let modalBody = h('div', { class: 'win-card' },
      h('div', { class: 'win-stars' }, '★'.repeat(stars)),
      h('div', { class: 'win-title' }, kids ? 'You did it!' : 'Puzzle Done!'),
      h('div', { class: 'win-sub' }, msg),
    );
    const actions = [];
    if (kids) {
      // Kid path: the single loud next step is "play the next one".
      const nextIdx = index < 100 ? index + 1 : 100;
      actions.push({ label: 'Next puzzle', kind: 'primary', onClick: () => { closeModal(); nav(`play/${nextIdx}`); } });
    } else {
      if (!isFree && index < 100) {
        actions.push({ label: 'Next puzzle →', kind: 'primary', onClick: () => { closeModal(); nav(`play/${index + 1}`); } });
      }
      actions.push({ label: isFree ? 'Practice again' : 'My map', kind: 'secondary', onClick: () => { closeModal(); nav(isFree ? 'free' : 'progress'); } });
      actions.push({ label: 'Home', kind: 'ghost', onClick: () => { closeModal(); nav('home'); } });
    }
    openModal({ title: kids ? 'Yay!' : 'Yay!', body: modalBody, actions, dismissable: !kids });
  }

  function grantMilestones(count) {
    for (const m of MILESTONES) {
      if (m.at > 0 && count === m.at) grantBadge(GAME_ID, m.badge);
      if (m.at < 0 && count >= 1) {
        const streak = streakOf();
        if (streak >= -m.at) grantBadge(GAME_ID, m.badge);
      }
    }
  }

  function streakOf() {
    const recs = allRecords(GAME_ID);
    let streak = 0;
    const d = new Date();
    while (recs[`puzzle-${streak + 1}`]) streak++; // journey order only
    return streak;
  }

  // ---- coach ----
  let coachHint = null;
  let coachSheet = null;

  function openCoach() {
    if (won) return;
    if (coachSheet) return;
    stateHints += 1;
    saveNow();
    const board = boardArray();
    const mv = rankMoves(board);
    const plan = mv ? planForMove(mv, board) : makeStuckPlan();
    const sheet = buildCoachSheet(plan, mv, board);
    document.body.appendChild(sheet);
    coachSheet = sheet;
    sfx('think');
  }

  function closeCoach() {
    if (coachSheet) coachSheet.remove();
    coachSheet = null;
    coachHint = null;
    gridView.setHighlightCell(-1);
    gridView.setHintCells([]);
    refreshUI();
  }

  function buildCoachSheet(plan, mv, board) {
    const sheet = h('div', { class: 'coach-sheet', role: 'dialog', 'aria-label': 'Coach' });
    let stepIdx = 0;
    let wrongCount = 0;

    if (plan[0].kind === 'stuck') {
      sheet.appendChild(h('div', { class: 'coach-grip' }));
      const row = h('div', { class: 'row-between', style: { alignItems: 'flex-start' } });
      row.appendChild(avatar());
      const body = h('div', { class: 'coach-copy' },
        h('div', {}, plan[0].text),
        h('div', { class: 'coach-actions' },
          h('button', { class: 'btn btn-primary', onClick: () => { showNotes(); closeCoach(); } }, 'Yes, show me'),
          h('button', { class: 'btn btn-ghost', onClick: closeCoach }, 'Not now'),
        ),
      );
      row.appendChild(body);
      sheet.appendChild(row);
      return sheet;
    }

    function avatar() {
      const a = h('div', { class: 'coach-avatar', 'aria-hidden': 'true' });
      a.innerHTML = ROCKET_AVATAR;
      return a;
    }

    function render() {
      clear(sheet);
      sheet.appendChild(h('div', { class: 'coach-grip' }));
      const step = plan[stepIdx];
      coachHint = null;

      if (step.region) gridView.setHighlightCell(step.region.cells[0]);
      if (step.cell != null) gridView.setHintCells([step.cell]);

      const row = h('div', { class: 'row-between', style: { alignItems: 'flex-start' } });
      row.appendChild(avatar());

      const body = h('div', { class: 'coach-copy' });
      if (step.kind === 'lesson') {
        body.appendChild(h('p', { style: { fontSize: '20px', fontWeight: '800' } }, step.text));
        if (step.def) body.appendChild(h('div', { class: 'coach-def' }, step.def));
        body.appendChild(h('div', { class: 'coach-actions' },
          h('button', { class: 'btn btn-primary', onClick: () => { stepIdx++; render(); } }, 'Got it, next')));
      } else if (step.kind === 'question') {
        body.appendChild(h('p', { style: { fontSize: '20px', fontWeight: '800' } }, step.text));
        if (step.mode === 'gridpick') {
          coachHint = ptCoachListener(step, (ok) => onQuestionAnswered(ok, step));
          body.appendChild(h('p', { class: 'coach-hint-line' }, 'Tap the square on the board.'));
        } else {
          const opts = h('div', { class: 'coach-options' });
          for (const o of step.options) {
            opts.appendChild(h('button', {
              class: 'coach-opt',
              onClick: () => onQuestionAnswered(String(o.label) === String(step.correct), step),
            }, o.label));
          }
          body.appendChild(opts);
        }
        if (wrongCount > 0) {
          body.appendChild(h('p', { class: 'coach-hint-line' }, `Try again! You can do it. (${wrongCount}/2)`));
        }
      } else if (step.kind === 'action') {
        body.appendChild(h('p', { style: { fontSize: '20px', fontWeight: '800' } }, step.text));
        coachHint = ptCoachListener(step, (ok) => {
          const great = celebrate.correct[Math.floor(Math.random() * celebrate.correct.length)];
          toast(`${great}`, 'green');
          sfx('correct');
          closeCoachAfterMove(step);
        });
        body.appendChild(h('p', { class: 'coach-hint-line' }, 'Place the number yourself. The orange square is where it goes.'));
        body.appendChild(h('div', { class: 'coach-actions' },
          h('button', { class: 'btn btn-ghost', onClick: () => { stepIdx++; render(); } }, 'Show me the answer'),
        ));
      } else if (step.kind === 'reveal') {
        body.appendChild(h('p', { style: { fontSize: '20px', fontWeight: '800' } }, step.text));
        body.appendChild(h('div', { class: 'coach-actions' },
          h('button', { class: 'btn btn-primary', onClick: () => { autoPlace(step); coachHint = null; closeCoachAfterMove(step); } }, 'Place it for me'),
        ));
      }
      row.appendChild(body);
      sheet.appendChild(row);
    }

    function onQuestionAnswered(ok, step) {
      if (ok) {
        sfx('correct');
        toast(celebrate.correct[Math.floor(Math.random() * celebrate.correct.length)], 'green');
        stepIdx++;
        render();
      } else {
        wrongCount++;
        sfx('nudge');
        if (wrongCount >= 2) {
          // gentle mercy: reveal
          stepIdx = plan.length - 1;
          render();
        } else {
          toast(celebrate.keepGoing[Math.floor(Math.random() * celebrate.keepGoing.length)], 'orange');
          render();
        }
      }
    }

    function ptCoachListener(step, onDone) {
      return {
        step,
        clear() {},
        eatInput(cell, isNote, symbolId) {
          if (isNote) return false;
          if (step.mode === 'gridpick') {
            if (cell === step.cell) { onDone(true); return true; }
            if (cell !== step.cell) {
              if (this.wrongOnce) { sfx('nudge'); toast('Shh, let me show you.', 'orange'); }
              else { this.wrongOnce = true; sfx('nudge'); toast('That square has other problems. Look at the highlighted area.', 'orange'); }
              return false;
            }
            return false;
          }
          if (step.cell != null && cell === step.cell && symbolId === step.value) {
            onDone(true);
            return true;
          }
          return false;
        },
      };
    }

    function showNotes() {
      const board = boardArray();
      const notes = noteSuggestions(board);
      for (let c = 0; c < 81; c++) engine.notes[c] = new Set(notes[c]);
      noteMode = true;
      const noteBtn = qs('#note-toggle', root);
      if (noteBtn) noteBtn.setAttribute('aria-pressed', 'true');
      saveNow();
      refreshUI();
    }

    function autoPlace(step) {
      engine.place(step.cell, step.value);
      engine.values[step.cell] = step.value;
      stateHints += 1;
      saveNow();
    }

    function closeCoachAfterMove(step) {
      closeCoach();
      checkContinue();
    }

    render();
    return sheet;
  }

  // ---- build UI ----
  gridView.mount(boardEl);
  if (!kids) root.appendChild(meta);
  root.appendChild(boardEl);
  if (!kids) root.appendChild(coachBtn);

  // keypad
  const kp = h('div', { class: 'keypad-grid' });
  for (let d = 1; d <= 9; d++) {
    const btn = h('button', {
      class: 'kp-num',
      'data-v': String(d),
      'aria-label': `Number ${d}`,
      onClick: () => { placeSelected(d); },
    });
    btn.appendChild(dotCounter(d));
    btn.appendChild(h('span', { class: 'kp-digit', 'aria-hidden': 'true' }, String(d)));
    kp.appendChild(btn);
  }
  keypadEl.appendChild(kp);

  const tools = h('div', { class: 'keypad-tools' });
  const eraseBtn = h('button', {
    class: 'tool-btn', id: 'erase-btn', 'aria-label': 'Erase selected square',
    onClick: () => { clearSelected(); },
  }, kids ? '✕' : 'Erase');
  const noteBtn = h('button', {
    class: 'tool-btn', id: 'note-toggle', 'aria-pressed': 'false', 'aria-label': 'Toggle pencil notes',
    onClick: () => { toggleNotes(noteBtn); },
  }, 'Pencil');
  tools.appendChild(eraseBtn);
  if (!kids) tools.appendChild(noteBtn);
  keypadEl.appendChild(tools);

  root.appendChild(keypadEl);

  // Kid path: no pencil, keypad is just 1..9 plus a dot counter under each digit.
  if (kids) noteMode = false;

  function dotCounter(d) {
    const span = document.createElement('span');
    span.className = 'kp-dots';
    span.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < d; i++) {
      const b = document.createElement('i');
      b.className = 'kp-dot';
      span.appendChild(b);
    }
    return span;
  }

  function placeSelected(d) {
    if (gridView.selected < 0) {
      if (kids) {
        // Auto-jump to the first empty square so a number alone is enough.
        const empty = engine.values.findIndex((v) => v < 0);
        gridView.select(empty >= 0 ? empty : 0);
      } else {
        toast('Tap a square first, then a number.', 'info');
        return;
      }
    }
    if (kids && (engine.isGiven(gridView.selected) || engine.valueAt(gridView.selected) >= 0)) {
      const empty = engine.values.findIndex((v) => v < 0);
      if (empty >= 0) gridView.select(empty);
    }
    controller.onGridInput(gridView.selected, d, noteMode, false);
    refreshUI();
  }

  function clearSelected() {
    if (gridView.selected < 0) return;
    controller.onGridInput(gridView.selected, 0, false, true);
    refreshUI();
  }

  function toggleNotes(btn) {
    noteMode = !noteMode;
    btn.setAttribute('aria-pressed', String(noteMode));
    btn.style.borderColor = noteMode ? 'var(--gold)' : '';
    sfx('tap');
    refreshUI();
  }

  refreshUI();

  if (kids) {
    const firstEmpty = engine.values.findIndex((v) => v < 0);
    if (firstEmpty >= 0) gridView.select(firstEmpty);
  }

  const destroy = () => {
    stopTimer();
    window.removeEventListener('beforeunload', saveNow);
    saveNow();
    closeCoach();
    closeModal();
  };
  return { el: root, title: isFree ? `${tierInfo.name} practice` : `Puzzle ${index}`, destroy };
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}

function lockedView(nav, index, records) {
  const prev = index - 1;
  const root = h('div', { class: 'card', style: { textAlign: 'center' } });
  const lockWrap = h('div', { style: { margin: '6px auto', width: '64px', height: '64px' } });
  lockWrap.innerHTML = PADLOCK_SVG;
  root.appendChild(lockWrap);
  root.appendChild(h('h2', {}, `Puzzle ${index} is locked`));
  root.appendChild(h('p', { class: 'muted', style: { fontWeight: '700' } }, `Finish puzzle ${prev} first. Then this one opens.`));
  const prevSolved = !!records[`puzzle-${prev}`];
  root.appendChild(h('div', { class: 'two-col', style: { marginTop: '14px' } },
    h('button', { class: 'btn btn-ghost', onClick: () => nav('progress') }, 'My map'),
    h('button', { class: 'btn btn-primary', onClick: () => nav(prevSolved ? `play/${index}` : `play/${prev}`) },
      prevSolved ? 'I finished it - go!' : `Play puzzle ${prev}`)));
  return { el: root, title: `Puzzle ${index}` };
}