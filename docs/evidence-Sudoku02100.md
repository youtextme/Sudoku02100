# Evidence - Sudoku02100 (independent evaluation)

**Evaluator:** fresh-context reviewer (did NOT author the implementation; no product code modified)
**Repo:** `C:\Users\youte\OneDrive\Documents\effortless\Sudoku02100`
**Contract:** `docs/outcome-contract.md`
**Verdict:** **not yet** - strong architecture and evidence, but (a) a confirmed logic bug in the Learn quiz, (b) KR3's advertised grep fails on its own words, and (c) WCAG-AA contrast failures on tier chips contradict the README claim. No kill criterion is hit; none of these are architectural.

**Date:** 2026-09-05

---

## 1. Commands actually run (receipts)

| # | Command | Result | Exit |
|---|---------|--------|------|
| 1 | `node --test "tests/*.test.mjs"` | 35 pass / 0 fail (incl. "gen <10s" 2565 ms, "puzzles 1–55 singles-solvable", "exactly one solution", "no banned words", determinism) | 0 |
| 2 | `node tools/smoke-imports.mjs` | `imported 27 modules, 0 failed` | 0 |
| 3 | grep `box\|candidate\|puzzle\|sudoku` in `src/platform` | 12 matches - see §4 KR3 flag | 1 (found) |
| 4 | grep (imports) in `src/platform` for sudoku imports | 0 matches - platform never imports sudoku | clean |
| 5 | `git log --all --oneline` / `remote -v` / `ls-files` | 3 commits; origin `https://github.com/youtextme/Sudoku02100.git`; tracked list has no `.env/.pem/.key` | 0 |
| 6 | secret scan `git log -p --all` (`api[_-]?key|secret|password|bearer|ghp_|AIza|BEGIN PRIVATE`) | 0 hits | 0 |
| 7 | `Invoke-WebRequest https://youtextme.github.io/Sudoku02100/` (+ sw.js, manifest) | 200; `CACHE_VERSION = 'sudoku2100-v5'`; valid manifest (standalone, icons, shortcuts) | 0 |
| 8 | byte compare live vs local `src/sudoku/views/shared.js` | LIVE_BYTES 3581 = LOCAL_BYTES 3581, `IDENTICAL:True` | 0 |
| 9 | offline multi-salt sweep (Node) | 330 puzzles (6 salts × 1–55) singles-solvable: 0 fail; 200 puzzles (2 salts × 1–100) unique: 0 fail; min givens 26 (Expert target 26/27) | 0 |
| 10 | local static server `http://127.0.0.1:4179/` + MCP Playwright flows | see §3 | 0 |

## 2. Grading against the rubric

### Outcome truth / North Star
- `puzzles_solved → 100` ledger: verified end-to-end. Solving puzzle 1 wrote `s2100.progress.ledger` → `records["puzzle-1"] = {stars:3, hintsUsed:0, solvedAt,…}`, badge `first`, `bestStreak:1`, `lastSolvedDay:"2026-09-05"` (browser, real clicks). Puzzle 2 unlocked (renders, not locked).
- Installable + fully offline: manifest valid; SW `sudoku2100-v5` precaches shell + 35 modules; offline reload (context offline, `page.goto`) rendered 81 cells + 9-key keypad with progress intact from cache. Kill criterion 3 not hit.
- Kill criteria 1–4: none triggered. Gen 2565 ms < 10 s; 1–55 singles-solvable across 6 random salts; coach never prints the answer before a question is posed (plan order lesson→question→action→reveal, confirmed in code `src/sudoku/coach.js:137-246` and in browser); reveal reachable only after kid fails twice or skips the action step (`src/sudoku/views/play.js:333-351`).

### Bar-raiser
- Baseline table: present with 4 rows incl. "Do nothing" (`docs/outcome-contract.md:54-60`), but **unsourced, qualitative** - no cited numbers. Partial.
- PoC commit before UI: yes - `9347297 engine: … + 35 tests green` predates `37752a1 ui: …` (git log).
- A/B commitment: contract does not state an A/B-only-one decision; riskiest assumption (ask-then-guide coach) is pre-registered with a cheap PoC instead. Acceptable but should be stated.

### UI quality / AI-slop
- Design tokens: `css/tokens.css` - full palette hexes (`--paper #fff8ec`, `--ink #2b2440`, `--orange #ff6b35`, navy/gold/green accents), type scale 15–42 px, radii 12–24, shadows, font stack.
- No `linear-gradient`/`radial-gradient`/`backdrop-filter` anywhere in `css/` (grep: 0). Purple `--purple #8b5cf6` is 1 of 12 accents (`tokens.css:15`), not the brand default (navy-ink + cream-paper + orange primary). No `rounded-2xl` uniform pill-ification (radii 12–28 varied by component). **Zero** fake testimonials / review / "trusted-by" strings in `src/`.
- Custom identity: "Space Numbers" theme, rocket mascot SVG (`shared.js:9-17`), chunky `--font-num` digits. Not templated.
- A11y skeleton is strong: keyboard grid (arrows + digits + Backspace/Delete, `grid-view.js:76-95`), `role=grid/gridcell` with readable labels (`grid-view.js:57-58`, `:170-176`), `:focus-visible` ring (`base.css:40-44`), `aria-pressed`/`aria-checked`/`aria-selected` states, `visually-hidden` utility, `role=timer`, tap targets ≥44 px.
- **A11y fails (measured, NFR "Any shipped UI → contrast"):** WCAG-AA contrast ratios computed: white tier-chip text on `#22c55e` = 2.28, on `#ec4899` = 3.53, on `#8b5cf6` = 4.23, on `#f59e0b` = 2.15 (all < 4.5 for the 13 px chip, `app.css:477-485`); `.muted` `#7a7392` on `#fff8ec` = 4.24 (< 4.5 for ≤18 px text used in `.map-cell` 12 px and captions). This **contradicts the README checklist claim "high contrast (WCAG AA)"** (`README.md:64`).

### Non-negotiables
- No secrets in git: tracked files list clean; `git log -p --all` secret scan = 0; repo is public but contains only code/assets/contract. Data is all `localStorage`, retention is named in the Settings "A note for grown-ups" (`settings.js:71-73`).

## 3. Browser flows independently re-verified (MCP Playwright, `http://127.0.0.1:4179/`, real clicks on real buttons)
1. Home renders; 100-cell map; sound + install buttons in topbar; **0 console errors across the whole session**.
2. `#/play/1`: 42 givens (intro target 42), 39 empty cells; solver completes by singles. Full solve via 39 cell+keypad clicks (0 blocked) → win modal `★★★ Puzzle Done!` → ledger record `puzzle-1 {stars:3, hintsUsed:0}` → `Next puzzle →` opens `#/play/2` (unlocked, 33 givens rendered).
3. Coach flow on `#/play/2`: lesson step "New trick! … spy on the row, column, box" + definition, then graded question (`Only 8 can fit…` / options 3·5·8); clicking a **wrong** option → toast "So close - keep thinking!" + "Try again! (1/2)". Answer not shown until after question/action.
4. Sound toggle in topbar flips label and persists `s2100.app.sound.muted` true/false.
5. SW: 1 registration, controller active, cache `sudoku2100-v5`; **offline reload** renders 81 cells + keypad, progress survives.
6. Live URL serves build (shared.js byte-identical, SW v5, manifest 200).

## 4. Confirmed findings (blockers to "proven")

### F1 - Learn multiple-choice quiz cannot register a wrong answer (logic bug, verified) 
`src/sudoku/views/learn.js:105-112`: the `quiz` handler unconditionally does `play('correct'); toast('Right answer!'); b.dataset.state = 'right'` and never reads the page's `correct` index. **Browser proof:** in lesson `numbers`, on "How many dots is the number 6?", clicking the wrong option **"three"** produced toast `Right answer!`, `data-state="right"`, and the "Six! You are counting like a champ." after-text. `box-quiz` grades correctly (`learn.js:130-138`), and the coach grades correctly - only this widget is broken. A learning product that tells a kid a wrong answer is right is a truth defect (NFR: "learning/health product - no self-graded 'it works'"; bar-raiser impossibility standard).

### F2 - KR3 letter-of-rule failure ("zero Sudoku concepts" grep does not hold)
Contract KR3: *"`src/platform/**` contains zero Sudoku concepts (no box, no candidate, no puzzle)"* with evidence *"import-boundary grep"*. The builder's own grep returns **12 matches**:
- `src/platform/grid/grid-engine.js:5` - comment contains "…9 rows + 9 columns + 9 **boxes**" (also line 6: "This file contains zero Sudoku concepts").
- `src/platform/progress.js` - public API uses `puzzleKey`/`puzzleKeys` (lines 33, 44-45, 66, 73-74, 111-119).
The **spirit is met**: platform never imports sudoku (0 import matches), `GridEngine` is generic N×N+groups+symbols, `progress` is keyed by `gameId`. But the advertised falsifiable grep is factually false on its own terms, and the repo's README repeats "★ GAME-AGNOSTIC LAYER (zero Sudoku terms)" (`README.md:35`). Either purge the strings (rename `puzzleKey`→`levelKey`, reword the comment) or amend the contract wording - the builder decides; I do not rewrite the contract.

### F3 - WCAG-AA contrast fails on tier chips and muted small text (measured)
See §2. White text on `--gold`, `--green`, `--pink`, `--purple` chips is 2.15–4.23:1 at 13 px; `.muted` is 4.24:1. README's "high contrast (WCAG AA)" checklist is therefore not yet true.

### F4 - Win modal survives route change
`playView`'s `destroy()` (`play.js:462-467`) closes the coach but not the modal; navigating via hash (§3 step 2 then `goto '#/play/2'`) left the modal overlay intercepting pointer events. `app.js:42-43` destroys views without closing modals. Minor but real interaction wart on the app's own router.

### F5 - Design tension (not a blocker)
With a per-install random salt the puzzle sequence differs per device - acceptable, but KR1's "proven" wording should note the enforcement is by-construction (generator keeps singles-solvability on every removal, `generator.js:104-131`), not by exhaustive test of the actual device salt. Also the `one-fits` question text embeds the value when `cands.length===1` ("Only 8 can fit this square - can you see why?") - reframed as a *why*-question, so the kid is still asked first, but it is the one spot where the coach comes closest to answering before asking. And opening the coach costs a star (`hintsUsed` must be 0 for ★★★), which weakly nudges a *learning* app's target away from the coach.

## 5. Verdict
**not yet.** The engine, generator guarantees, coach pipeline, PWA/offline, and progress ledger are real and verified (this is a strong `proven` candidate). Remediation before re-evaluation is bounded:
1. Grade the Learn quiz against `p.correct` (right → proceed; wrong → "try again", mark option wrong).
2. Make the KR3 grep true (rename `puzzleKey`→`levelKey` in `src/platform/progress.js`; reword `grid-engine.js:5` comment) **or** tighten contract KR3 wording.
3. Fix tier-chip + `.muted` contrast to ≥4.5:1.
4. Close open modals on view destroy/route change.
5. (Honesty) Update README/contract claims only after 1–4 pass, and source the baseline numbers or label them qualitative.