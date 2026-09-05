# Evidence - Sudoku02100 Kid-Simple Redesign (contract/kid-simple)

Status: active (s1-s3 done; s4 North-Star measurement on the real kid pending)

Companion: docs/outcome-contract-kid-simple.md
Commits: 63ffde2 (contract + child-UX rules), 4875411 (s2 + s3 build)

## Command evidence

```
$ node --test "tests/*.test.mjs"     → exit:0 (35/35; coach, strategies, grid-engine, generator, curriculum, util)
$ node tools/smoke-imports.mjs       → exit:0 (imported 29 modules, 0 failed)
$ node tools/contrast-check.mjs      → exit:0 (12/12 WCAG AA)
$ sw asset check (node)              → exit:0 (38 ASSETS listed, 0 missing; CACHE_VERSION sudoku2100-v6)
```

## Playwright receipts (local static server, fresh origins)

- Cold open (http://127.0.0.1:PORT/): single `.play-door` = rocket + "PLAY" + puzzle number; topbar shows
  Grown-ups door + sound + install. Title "Sudoku 02100". Taps to board: 1.
- Tap PLAY → `#/play/1`: 81 cells, 39 empties all blank (no "0" placeholders); auto-selected first empty
  cell; keypad 1..9 with dot-counters (1+2+...+9 = 45 `.kp-dot`); `.game-meta` count 0; Coach button 0;
  Pencil absent (`#note-toggle` null); keypad-tools = ["✕"] only; cells 52 px (>= 44 px target).
- Wrong digit on empty cell: `.gcell.tap-error` = 3 (target + 2 mates), `.board-wrap.board-shake` true,
  `.toast` count 0, clears after ~0.65 s. (Before the empty=-1 fix the same test carried through a full
  10-store flow; after the fix a clean run solved puzzle 1 in 39 two-tap placements → win modal.)
- Correct digit: cell shows digit, star `.cell-star` rises and removes itself.
- Full solve (explicit cell click + keypad click, digits from an in-page backtracking solver):
  puzzle 1 → win modal `actions:["Next puzzle"]` (single primary), `stars:"★★★"`, `title:"You did it!"`.
  Clicking it navigates `#/play/2` (title "Puzzle 2"); solved again → same single-action modal.
- Parents gate: fresh origin `#/parents` shows arithmetic ask + 3 options; wrong option → question
  regenerated, still gated; correct option → hub swaps in place (`hubShown` true) with links
  [Learn the game, My progress, Settings, Free practice, → Back to play].
- Route gating: with no parent flag, `#/learn` renders the PLAY door (title "Sudoku 02100"), not learn.
  With `sessionStorage['s2100.parent']='1'`, `#/parents` renders the hub and `#/learn` renders learn.
- Banned-words audit (kid surface): matches only in comments / parent-gated views / internal variable
  names (candidate, pencil, sudoku, strategy); none on the kid route (home door, play, topbar).

## Notes / deviations

- `getSalt()` is per-install random (calls `randomSeed()`), so each installation's 100-puzzle journey
  differs; puzzle givens used in testing were read from the live DOM, not assumed. Referenced from saves.js.
- Pre-existing bug fixed during s2: save/given arrays use 0 for "empty", GridEngine uses -1; copies leaked
  0 into `engine.values` so empty cells rendered as "0" (and auto-select couldn't find empties). Fixed in
  `play.js` init (`sv > 0 ? sv : -1`). The previously-deployed site had this display bug.
- Win modal reached: `onWin` fires 350 ms after `engine.isSolved()`; first probe sampled before the delay
  and saw no modal (confirmed present 1.2 s later).

## Pending for s4/s5

- s4 on-device with the REAL kid (parent observation): puzzle 1 unaided (`hintsUsed:0`, `solvedAt`) +
  return within 24 h, within 7 days. North Star metric.
- s5 fresh-context Evaluator over contract + artifact + citations, then `evidence-check.mjs --done`.
  Only then `Status: proven`.