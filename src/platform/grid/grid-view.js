// platform/grid/grid-view.js - DOM rendering + input for a GridEngine.
// Game-agnostic. Uses CSS vars (--grid-size) set by the theme.

import { h, clear } from '../ui/dom.js';

export class GridView {
  constructor({ engine, onInput = null, onSelect = null, readOnly = false, noteGetter = null }) {
    this.engine = engine;
    this.onInput = onInput;
    this.onSelect = onSelect;
    this.readOnly = readOnly;
    this.noteGetter = noteGetter;
    this.selected = -1;
    this.highlightCell = -1; // draws the whole group of this cell
    this.hintCells = new Set(); // coach target highlight
    this.cells = [];
    this.root = null;
  }

  mount(container) {
    this.root = h('div', {
      class: 'grid-view',
      role: 'grid',
      'aria-label': 'Game board',
      tabindex: '0',
      dataset: { size: this.engine.size || 9 },
    });
    const size = Math.round(this.engine.size) || 9;
    this.root.style.setProperty('--board-n', size);
    this.root.style.setProperty('--board-px', 'min(88vw, 480px)');

    for (let cell = 0; cell < this.engine.n; cell++) {
      const r = this.engine.rowOf(cell);
      const c = this.engine.colOf(cell);
      const btn = h('button', {
        class: 'gcell',
        role: 'gridcell',
        tabindex: '-1',
        'aria-label': this.label(r, c),
        dataset: { cell },
        onClick: (e) => {
          e.stopPropagation();
          this.select(cell);
          this.onSelect?.(cell);
        },
      });
      this.cells[cell] = btn;
      this.root.appendChild(btn);
    }
    this.root.addEventListener('keydown', (e) => this.handleKey(e));
    clear(container);
    container.appendChild(this.root);
    this.update();
    return this.root;
  }

  label(r, c) {
    return `Row ${r + 1}, Column ${c + 1}`;
  }

  select(cell) {
    this.selected = cell;
    this.update();
    if (cell >= 0) this.cells[cell].focus({ preventScroll: true });
  }

  move(dr, dc) {
    if (this.selected < 0) return this.select(0);
    const r = this.engine.rowOf(this.selected) + dr;
    const c = this.engine.colOf(this.selected) + dc;
    if (r < 0 || c < 0 || r >= this.engine.size || c >= this.engine.size) return;
    this.select(this.engine.index(r, c));
    this.onSelect?.(this.selected);
  }

  handleKey(e) {
    const map = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (map[e.key]) {
      e.preventDefault();
      this.move(map[e.key][0], map[e.key][1]);
      return;
    }
    if (this.readOnly) return;
    if (/^[1-9]$/.test(e.key)) {
      const symbolId = Number(e.key);
      const noteMode = this.noteGetter ? this.noteGetter() : false;
      e.preventDefault();
      this.inputAt(this.selected, symbolId, noteMode);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      this.inputClear(this.selected);
    }
  }

  inputAt(cell, symbolId, noteMode) {
    if (cell < 0) return;
    const ok = this.onInput ? this.onInput(cell, symbolId, noteMode) : true;
    if (ok) this.update();
  }

  inputClear(cell) {
    if (cell < 0) return;
    const ok = this.onInput ? this.onInput(cell, 0, false, true) : true;
    if (ok) this.update();
  }

  setHighlightCell(cell) {
    this.highlightCell = cell;
    this.update();
  }

  setHintCells(cells) {
    this.hintCells = new Set(cells);
    this.update();
  }

  update() {
    const eng = this.engine;
    const sel = this.selected;
    const noteMode = this.noteGetter ? this.noteGetter() : false;
    const highlightGroup = this.highlightCell >= 0 ? eng.cellGroups[this.highlightCell] : [];
    const selValue = sel >= 0 ? eng.valueAt(sel) : -1;

    for (let cell = 0; cell < eng.n; cell++) {
      const btn = this.cells[cell];
      const v = eng.valueAt(cell);
      const given = eng.isGiven(cell);
      const notes = eng.notesAt(cell);

      // band border classes derived from grid geometry (works for any N×N)
      const S = Math.round(Math.sqrt(eng.size)) || 3;
      const br = eng.rowOf(cell), bc = eng.colOf(cell);
      const cls = ['gcell'];
      cls.push(bc % S === 0 ? 'cband-l' : '', bc + 1 === eng.size || (bc + 1) % S === 0 ? 'cband-r' : '');
      cls.push(br % S === 0 ? 'cband-t' : '', br + 1 === eng.size || (br + 1) % S === 0 ? 'cband-b' : '');

      btn.textContent = '';
      if (v >= 0) {
        btn.textContent = String(v);
      } else if (notes.length && noteMode) {
        // small notes grid: mini slots for each symbol
        cls.push('in-notes');
        for (const s of notes) {
          const n = h('span', { class: 'gnote', 'aria-hidden': 'true' }, String(s));
          n.style.setProperty('--ncols', S);
          btn.appendChild(n);
        }
      }

      if (given) cls.push('given');
      if (!given && v >= 0) cls.push('placed');
      if (this.hintCells.has(cell)) {
        cls.push('hint-target');
        cls.push(v >= 0 ? 'hint-target-set' : 'hint-target-empty');
      }
      if (highlightGroup.includes(cell)) cls.push('region-hi');
      const inSelRowCol = sel >= 0 && (eng.rowOf(cell) === eng.rowOf(sel) || eng.colOf(cell) === eng.colOf(sel));
      if (inSelRowCol) cls.push('same-row-col');
      if (selValue >= 1 && v === selValue && !given) cls.push('same-value');
      if (cell === sel) cls.push('selected');
      btn.className = cls.join(' ');
      btn.setAttribute('aria-label', this.labelFor(cell, v, notes));
      btn.setAttribute('aria-disabled', given ? 'true' : 'false');
      btn.setAttribute('aria-selected', cell === sel ? 'true' : 'false');
    }
  }

  labelFor(cell, v, notes) {
    const r = this.engine.rowOf(cell);
    const c = this.engine.colOf(cell);
    if (v >= 0) return `Row ${r + 1}, Column ${c + 1}, number ${v}`;
    if (notes.length) return `Row ${r + 1}, Column ${c + 1}, empty, notes ${notes.join(', ')}`;
    return `Row ${r + 1}, Column ${c + 1}, empty`;
  }
}