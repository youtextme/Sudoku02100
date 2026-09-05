// sudoku/views/reset.js - destructive "start over" helper.

import { clearNamespace } from '../../platform/store.js';

export function sampleClear() {
  clearNamespace('progress');
  clearNamespace('sudoku');
  clearNamespace('sudoku.gen');
  clearNamespace('lessons');
}