// platform/grid/grid-engine.js — generic N×N puzzle grid. Game-agnostic.
//
// The Sudoku rules are expressed as "groups": each cell belongs to one or more
// groups, and each symbol may appear at most once per group. Sudoku gives us
// 27 groups (9 rows + 9 columns + 9 boxes). Any other game just supplies its
// own groups. This file contains zero Sudoku concepts.

export class GridEngine {
  constructor({ size = 9, symbols = null, groups = null }) {
    this.size = size;
    this.n = size * size;
    this.symbols = symbols || range1based(size);
    this.groups = groups || [];
    this.cellGroups = buildMembership(this.groups, this.n);
    this.reset(null);
  }

  /** @param given array|Uint8Array length n, 0 = empty, else symbol id (1..size) */
  reset(given = null) {
    this.given = new Uint8Array(this.n);
    this.values = new Int8Array(this.n).fill(-1);
    this.notes = new Array(this.n).fill(null).map(() => new Set());
    this.selected = -1;
    if (given) {
      for (let i = 0; i < this.n; i++) {
        if (given[i]) this.setGiven(i, given[i]);
      }
    }
  }

  setGiven(cell, symbolId) {
    this.given[cell] = symbolId;
    this.values[cell] = symbolId;
    this.notes[cell].clear();
  }

  isGiven(cell) {
    return this.given[cell] > 0;
  }

  valueAt(cell) {
    return this.values[cell];
  }

  /** true when symbolId is not yet used in any of the cell's groups */
  symbolOpen(cell, symbolId) {
    for (const gid of this.cellGroups[cell]) {
      const group = this.groups[gid];
      for (const c of group) {
        if (c !== cell && this.values[c] === symbolId) return false;
      }
    }
    return true;
  }

  place(cell, symbolId) {
    if (this.isGiven(cell)) return false;
    if (!this.symbolOpen(cell, symbolId)) return false;
    this.values[cell] = symbolId;
    this.notes[cell].clear();
    return true;
  }

  setNote(cell, symbolId, on = true) {
    if (this.isGiven(cell)) return;
    if (this.values[cell] >= 0) return;
    const s = this.notes[cell];
    if (on) s.add(symbolId);
    else s.delete(symbolId);
  }

  notesAt(cell) {
    return [...this.notes[cell]];
  }

  toggleNote(cell, symbolId, noteMode) {
    if (noteMode) this.setNote(cell, symbolId, !this.notes[cell].has(symbolId));
    else this.place(cell, symbolId);
  }

  clear(cell) {
    if (this.isGiven(cell)) return;
    this.values[cell] = -1;
  }

  clearNotes(cell) {
    if (this.isGiven(cell)) return;
    this.notes[cell].clear();
  }

  isFilled(cell) {
    return this.values[cell] >= 0;
  }

  /** cells (indices) that currently duplicate a symbol inside a group */
  conflicts() {
    const bad = new Set();
    for (const group of this.groups) {
      const seen = new Map();
      for (const c of group) {
        const v = this.values[c];
        if (v < 0) continue;
        if (seen.has(v)) {
          bad.add(c);
          bad.add(seen.get(v));
        } else {
          seen.set(v, c);
        }
      }
    }
    return [...bad];
  }

  hasConflicts() {
    return this.conflicts().length > 0;
  }

  isSolved() {
    if (this.given.every((_, i) => this.values[i] >= 0) === false) return false;
    for (let i = 0; i < this.n; i++) if (this.values[i] < 0) return false;
    return !this.hasConflicts();
  }

  /** array of cell indices (row-major r*size+c) */
  index(r, c) {
    return r * this.size + c;
  }

  rowOf(cell) {
    return Math.floor(cell / this.size);
  }

  colOf(cell) {
    return cell % this.size;
  }
}

function buildMembership(groups, n) {
  const members = new Array(n).fill(null).map(() => []);
  for (let gid = 0; gid < groups.length; gid++) {
    for (const cell of groups[gid]) members[cell].push(gid);
  }
  return members;
}

function range1based(n) {
  const out = [];
  for (let i = 1; i <= n; i++) out.push(String(i));
  return out;
}