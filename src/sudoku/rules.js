// sudoku/rules.js - Sudoku-specific group math and candidate logic.
// board = Array(81), 0 = empty, 1..9 = value.

export const SIZE = 9;
export const NCELLS = 81;

export function cellIndexOf(r, c) {
  return r * 9 + c;
}

/** 27 groups: rows 0..8, cols 9..17, boxes 18..26 */
export function sudokuGroups() {
  const groups = [];
  for (let r = 0; r < 9; r++) groups.push(Array.from({ length: 9 }, (_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) groups.push(Array.from({ length: 9 }, (_, r) => r * 9 + c));
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3;
    const bc = (b % 3) * 3;
    const cells = [];
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++) cells.push((br + dr) * 9 + (bc + dc));
    groups.push(cells);
  }
  return groups;
}

const _GROUPS = sudokuGroups();
const _CELL_GROUPS = (() => {
  const m = new Array(NCELLS).fill(null).map(() => []);
  for (let g = 0; g < _GROUPS.length; g++)
    for (const c of _GROUPS[g]) m[c].push(g);
  return m;
})();

export const GROUPS = _GROUPS;
export const CELL_GROUPS = _CELL_GROUPS;

export function usedInCell(board, cell) {
  const used = new Set();
  for (const gid of _CELL_GROUPS[cell]) {
    for (const c of _GROUPS[gid]) {
      if (c !== cell && board[c] > 0) used.add(board[c]);
    }
  }
  return used;
}

/** symbols that can legally go into cell given current board */
export function candidates(board, cell) {
  const used = usedInCell(board, cell);
  const out = [];
  for (let v = 1; v <= 9; v++) if (!used.has(v)) out.push(v);
  return out;
}

/** cells sharing any group with cell */
export function peers(cell) {
  const set = new Set();
  for (const gid of _CELL_GROUPS[cell]) for (const c of _GROUPS[gid]) if (c !== cell) set.add(c);
  return [...set];
}