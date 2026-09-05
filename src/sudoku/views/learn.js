// sudoku/views/learn.js — the "knows nothing" curriculum.
// Teaches numbers, lines, rules, and the three thinking tricks with demos.

import { h, clear } from '../../platform/ui/dom.js';
import { GridEngine } from '../../platform/grid/grid-engine.js';
import { GridView } from '../../platform/grid/grid-view.js';
import { toast } from '../../platform/ui/toast.js';
import { play } from '../../platform/sound.js';
import { LESSONS, demoPuzzleFor, celebrate } from '../curriculum.js';
import { rankMoves, planForMove } from '../coach.js';
import { sudokuGroups } from '../rules.js';
import { scopedStore } from '../../platform/store.js';

const GROUPS = sudokuGroups();
const lessonStore = scopedStore('lessons');

export function learnIndexView(nav) {
  const done = lessonStore.get('done', []);
  const root = h('div');

  root.appendChild(h('section', { class: 'card' },
    h('p', { style: { fontSize: '22px', fontWeight: '800' } }, 'Welcome to Sudoku School!'),
    h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Do the lessons in order. Each one teaches one small thing.'),
  ));

  for (const lesson of LESSONS) {
    const isDone = done.includes(lesson.id);
    const card = h('button', {
      class: 'card',
      style: { width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' },
      onClick: () => nav(`learn/${lesson.id}`),
    });
    card.appendChild(h('div', { class: 'lesson-icon', style: { width: '56px', height: '56px', flex: '0 0 56px', fontSize: '28px' } }, lesson.icon));
    const txt = h('div', { style: { flex: '1' } });
    txt.appendChild(h('div', { style: { fontWeight: '900', fontSize: '20px' } }, lesson.title));
    txt.appendChild(h('div', { class: 'muted', style: { fontWeight: '600', fontSize: '15px' } }, lesson.subtitle));
    card.appendChild(txt);
    if (isDone) card.appendChild(h('span', { class: 'pill pill-gold' }, 'Done'));
    root.appendChild(card);
  }
  return { el: root, title: 'Learn' };
}

export function learnLessonView(nav, lessonId) {
  const lesson = LESSONS.find((l) => l.id === lessonId);
  if (!lesson) return { el: h('p', {}, 'Lesson not found'), title: 'Learn' };

  let pageIdx = 0;
  const pageEl = h('div');
  const stepsEl = h('div', { class: 'page-progress' });
  const fill = h('div', { class: 'fill', style: { width: '0%' } });
  stepsEl.appendChild(fill);

  const root = h('div');
  const hero = h('div', { class: 'lesson-hero' });
  hero.appendChild(h('div', { class: 'lesson-icon' }, lesson.icon));
  hero.appendChild(h('div', {},
    h('div', { style: { fontWeight: '900', fontSize: '26px' } }, lesson.title),
    h('div', { class: 'muted', style: { fontWeight: '700' } }, lesson.subtitle)));
  root.appendChild(hero);
  root.appendChild(stepsEl);
  root.appendChild(pageEl);

  function renderPage() {
    clear(pageEl);
    const p = lesson.pages[pageIdx];
    fill.style.width = `${Math.round(((pageIdx + 1) / lesson.pages.length) * 100)}%`;

    if (p.demo) {
      pageEl.appendChild(h('div', { class: 'card' }, h('p', { class: 'big-text' }, p.text)));
      pageEl.appendChild(demoBoard());
      navRow();
    } else if (p.type === 'text') {
      pageEl.appendChild(h('div', { class: 'card' }, h('p', { class: 'big-text' }, p.text)));
      navRow();
    } else if (p.type === 'dots') {
      pageEl.appendChild(h('div', { class: 'card' }, h('p', { class: 'big-text' }, p.text)));
      const grid = h('div', { class: 'dots-demo' });
      const colors = ['#FF6B35', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899'];
      for (let d = 1; d <= 9; d++) {
        const card = h('div', { class: 'dots-card' });
        card.appendChild(h('div', { class: 'dots-num' }, String(d)));
        const group = h('div', { class: 'dots-group' });
        for (let k = 0; k < d; k++) group.appendChild(h('span', { class: 'dot', style: { background: colors[(d - 1) % 5] } }));
        card.appendChild(group);
        grid.appendChild(card);
      }
      pageEl.appendChild(grid);
      navRow();
    } else if (p.type === 'quiz') {
      renderQuiz(p);
    } else if (p.type === 'box-quiz') {
      renderBoxQuiz(p);
    } else if (p.type === 'demo-lines') {
      pageEl.appendChild(demoLines());
      navRow();
    }
  }

  function renderQuiz(p) {
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'big-text' }, p.q));
    const opts = h('div', { class: 'quiz-options' });
    p.options.forEach((label, i) => {
      const b = h('button', { class: 'quiz-opt', onClick: () => {
        if (b.dataset.state) return;
        play('correct');
        toast('Right answer!', 'green');
        b.dataset.state = 'right';
        card.appendChild(h('p', { class: 'muted', style: { fontWeight: '800', marginTop: '10px' } }, p.after));
        navRow();
      } }, label);
      opts.appendChild(b);
    });
    card.appendChild(opts);
    pageEl.appendChild(card);
  }

  function renderBoxQuiz(p) {
    const card = h('div', { class: 'card' });
    card.appendChild(h('p', { class: 'big-text' }, p.q));
    const board = h('div', { class: 'box-quiz-board' });
    p.board.flat().forEach((v, i) => {
      const dup = p.board.flat().filter((x) => x === v).length > 1;
      board.appendChild(h('div', { class: `bq-cell${dup ? ' bad' : ''}` }, String(v)));
    });
    card.appendChild(board);
    const opts = h('div', { class: 'quiz-options' });
    [['It is OK', true], ['Not OK', false]].forEach(([label, okVal]) => {
      const b = h('button', { class: 'quiz-opt', onClick: () => {
        if (b.dataset.state) return;
        const correct = okVal === p.ok;
        play(correct ? 'correct' : 'nudge');
        toast(correct ? 'Right!' : 'Almost — remember: no repeats inside a box!', correct ? 'green' : 'orange');
        b.dataset.state = correct ? 'right' : 'wrong';
        if (p.ok && !correct) card.appendChild(h('p', { class: 'muted', style: { fontWeight: '800', marginTop: '10px' } }, 'Every number appears once. This box is fine.'));
        if (!p.ok && correct) card.appendChild(h('p', { class: 'muted', style: { fontWeight: '800', marginTop: '10px' } }, 'A number is in twice. That is the problem.'));
        if (correct) navRow();
      } }, label);
      opts.appendChild(b);
    });
    card.appendChild(opts);
    pageEl.appendChild(card);
  }

  function navRow() {
    const row = h('div', { class: 'two-col', style: { marginTop: '14px' } });
    if (pageIdx > 0) {
      row.appendChild(h('button', { class: 'btn btn-ghost', onClick: () => { pageIdx--; renderPage(); } }, '← Back'));
    } else {
      row.appendChild(h('div'));
    }
    const isLast = pageIdx === lesson.pages.length - 1;
    row.appendChild(h('button', {
      class: 'btn btn-primary',
      onClick: () => {
        if (isLast) finishLesson();
        else { pageIdx++; renderPage(); }
      },
    }, isLast ? 'Finish lesson' : 'Next →'));
    pageEl.appendChild(row);
  }

  function finishLesson() {
    const done = lessonStore.get('done', []);
    if (!done.includes(lesson.id)) {
      done.push(lesson.id);
      lessonStore.set('done', done);
      play('correct');
      toast('Lesson done! One star for you.', 'green');
    }
    nav('learn');
  }

  function demoBoard() {
    const need = { 'one-space': 'one-space', 'one-fits': 'one-fits', hunt: 'number-hunt' }[lesson.id];
    const demo = need ? demoPuzzleFor(need) : null;
    if (!demo) {
      return h('p', { class: 'muted', style: { fontWeight: '700' } }, 'Demo is warming up — go straight to your puzzle instead!');
    }
    const host = h('div', { class: 'board-wrap' });
    const eng = new GridEngine({ size: 9, groups: GROUPS });
    eng.reset(demo.puzzle.given);
    const gv = new GridView({ engine: eng, readOnly: true });
    gv.mount(host);

    const mv = rankMoves(demo.puzzle.given) || demo.move;
    const plan = planForMove(mv, demo.puzzle.given);
    gv.setHighlightCell(plan[0].region.cells[0]);

    const qBox = h('div', { class: 'card', style: { marginTop: '12px' } });
    let stepIdx = 0;

    function stepUI() {
      clear(qBox);
      const step = plan[Math.min(stepIdx, plan.length - 1)];
      if (step.kind === 'lesson') {
        qBox.appendChild(h('p', { style: { fontWeight: '800', fontSize: '20px' } }, step.text));
        if (step.def) qBox.appendChild(h('div', { class: 'coach-def' }, step.def));
        qBox.appendChild(h('button', { class: 'btn btn-primary', style: { marginTop: '12px' }, onClick: () => { stepIdx++; stepUI(); } }, 'Next'));
      } else if (step.kind === 'question' && step.options) {
        qBox.appendChild(h('p', { style: { fontWeight: '800', fontSize: '20px' } }, step.text));
        const opts = h('div', { class: 'coach-options' });
        for (const o of step.options) {
          opts.appendChild(h('button', {
            class: 'coach-opt',
            onClick: () => {
              const ok = String(o.label) === String(step.correct);
              play(ok ? 'correct' : 'nudge');
              toast(ok ? celebrate.correct[Math.floor(Math.random() * celebrate.correct.length)] : 'Try again!', ok ? 'green' : 'orange');
              if (ok) { stepIdx++; stepUI(); }
            },
          }, o.label));
        }
        qBox.appendChild(opts);
      } else {
        // reveal: perform the move visually on the read-only board
        const cells = demo.puzzle.given.slice();
        cells[step.cell] = step.value;
        gv.engine.reset(cells);
        gv.setHintCells([]);
        gv.setHighlightCell(-1);
        qBox.appendChild(h('p', { style: { fontWeight: '800', fontSize: '20px' } }, `See! ${step.value} goes in the orange square. Find moves like this in your own puzzles!`));
        qBox.appendChild(h('button', {
          class: 'btn btn-green', style: { marginTop: '12px' },
          onClick: () => { finishLesson(); nav(`play/${demo.puzzle.index}`); },
        }, `Practice: Puzzle ${demo.puzzle.index} →`));
      }
    }
    stepUI();
    host.appendChild(qBox);
    return host;
  }

  function demoLines() {
    const wrap = h('div', { class: 'board-wrap' });
    const eng = new GridEngine({ size: 9, groups: GROUPS });
    eng.reset(new Array(81).fill(0));
    const gv = new GridView({ engine: eng, readOnly: true, onSelect: () => {} });
    gv.mount(wrap);
    const legend = h('div', { class: 'demo-legend' }, 'Tap any square.');
    wrap.appendChild(legend);

    const origSelect = gv.select.bind(gv);
    gv.select = (cell) => {
      origSelect(cell);
      const cells = wrap.querySelectorAll('.gcell');
      const myR = Math.floor(cell / 9), myC = cell % 9;
      const box = Math.floor(myR / 3) * 3 + Math.floor(myC / 3);
      cells.forEach((btn, idx) => {
        const r = Math.floor(idx / 9), c = idx % 9;
        btn.classList.remove('dl-row', 'dl-col', 'dl-box', 'dl-sel');
        if (r === myR) btn.classList.add('dl-row');
        if (c === myC) btn.classList.add('dl-col');
        if (Math.floor(r / 3) * 3 + Math.floor(c / 3) === box) btn.classList.add('dl-box');
        if (idx === cell) btn.classList.add('dl-sel');
      });
      legend.textContent = 'Blue = row (across) · Green = column (down) · Orange = box';
    };
    return wrap;
  }

  renderPage();
  return { el: root, title: lesson.title };
}