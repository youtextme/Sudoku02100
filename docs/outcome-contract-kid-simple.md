# Outcome Contract - Sudoku02100 Kid-Simple Redesign

Status: active
Branch: contract/kid-simple
Created: 2026-09-05
Supersedes: docs/outcome-contract.md (previous run reached `proven` on tech gate but the real-world North Star failed: the target kid does not play)

## Job (human outcome)
The real 7-10 year-old opens the app and can **play one puzzle alone, in under ~60 seconds, with zero reading required** - no menu decisions, no modes, no lessons standing in the way - and **wants to come back the next day**. Parent never has to explain how to start. Previous build was proven on offline/PWA/engine gates but the kid "doesn't like it, isn't using it, can't follow it, feels overwhelmed" - so this run kills everything standing between the kid and placing a number.

## North Star
The real kid completes puzzle 1 **unaided** (ledger `puzzle-1.hintsUsed === 0`, `solvedAt` present) and **returns within 24 h** (a second session), within 7 days of the simplified build landing on their device.
- Metric: puzzle1_solved_unaided + return_within_24h over 7 days (ledger + parent observation).

## Key Results (falsifiable)
- **KR1 (Zero-choice launch):** cold open - one tap anywhere starts puzzle 1 on the board. No home-map decision, no learn gate, no settings. Sales pitch < 1 s. Measure: taps from install/cold open to board ≤ 2 (Playwright).
- **KR2 (Board is the whole app):** on the board, a non-reader can act without reading: number buttons with dot-counters, auto-selected cell, single tap places, instant star when correct; no pen/pencil/candidate modes, no confirm dialogs, ≤ 4 words per caption. Measure: UI action-descendants audit + child-UX rubric in README.
- **KR3 (Everything else is parent space):** progress map, learn lessons, settings, coach grad-grade questions move behind an unmissable "grown-ups" door; kid path never shows them. Measure: DOM reachability - kid route tree has exactly home→play→win.
- **KR4 (Sourced child-UX rules):** every simplification is backed by ≥ 1 cited child-experience source (cognitive load, reading level, touch targets ≥ 44 px, instant reward, one-screen-at-a-time) in `docs/child-ux-rules.md`. Measure: rules file lists source + app-map per rule; evaluator spot-checks citations.
- **KR5 (No regression of prior proven gates):** offline play, SW v5 precache, 100-puzzle ledger, WCAG-AA contrast, import-boundary grep all still pass. Measure: `node --test tests/`, smoke-imports, contrast-check, offline reload.

## Assumptions (falsify these)
- The real kid is ~7-10, reads little/willingly, and the overwhelm is **too many words, screens, and choices** - if the overwhelm is actually the 9x9 board itself, this redesign fails and we pivot to a 4x4 warm-up track first.
- "Really really simple" = remove flows, not just restyle; a single big-tap path wins over a polished dashboard.
- Parent is the observation gate: they can hand the device to the kid and report whether puzzle 1 was completed unaided + whether the kid returned next day.
- Instant reward (star + sound + confetti on every placed correct digit) increases return; challengable, but cheap to test.
- Hiding (not deleting) learn/progress/coach satisfies both kid-simple and the prior "teaches how to think" job - parent space keeps the teaching value.

## Kill criteria (pre-registered)
1. After the simplified build lands, the kid does not complete puzzle 1 unaided within 2 supervised sessions over 7 days (parent report) → the 9x9/sudoku concept itself is the blocker; pivot to 4x4 warm-up or stop.
2. Research brief fails to produce ≥ 5 sourced child-UX rules that materially change the current design → stop; do not restyle on taste.
3. Zero-reading constraint cannot hold (board cannot be played without reading) → relax to "reads-a-few-words" and re-brief.
4. Any prior proven gate regresses (offline, installable, ledger, contrast, platform bounds) → fix before shipping.

## Baseline (bar-raiser gate)
| Alternative today | How the kid actually starts | Weakness vs ours |
|-------------------|-----------------------------|------------------|
| Sudoku02100 current build (measured, parent) | kid taps around home map / learn / play; feels overwhelmed; abandons | too many choices, too much text, no instant reward |
| Paper kids' sudoku books | adult sets the page; visual clutter | no feedback, no reward, no pacing |
| Sudoku.com / app-store sudoku | adult launches, kid watches ads / UI walls | ads, backend, pencil modes, not non-reader |
| Do nothing | kid never plays a logic puzzle | 0 engagements |

**Riskiest assumption (PoC):** *zero-choice instant-play beats the current dashboard for a non-reader.* Cheapest kill test: put the current play view behind a single "PLAY" door and measure whether the kid gets to the board unaided (parent observes). If not even the board loads into play, the problem is deeper than navigation.

## Verification plan (slice-gated)
- s1: Research brief → `docs/child-ux-rules.md` (sourced rules + app-map) → contradiction review (Researcher ≠ Builder).
- s2: Zero-choice launch + board-as-app slice; Playwright: cold-open→board ≤ 2 taps; kid-route tree = home→play→win; ≤ 4 words/caption audit.
- s3: Parent space (grown-ups door) + instant-reward polish; regression suite green.
- s4: On-device test with the REAL kid (parent gate): unaided puzzle-1 completion + return within 24 h. This is the North Star measurement window.
- s5: Fresh-context Evaluator reviews contract + artifact + citations; evidence-check --done.

## Command evidence (receipts live in evidence-<stem>.md when done)
```
$ node --test "tests/*.test.mjs"            → exit:0 (no regression)
$ node tools/smoke-imports.mjs              → exit:0
$ node tools/contrast-check.mjs             → exit:0
$ Playwright: cold open → board taps ≤2      → pass (PLAY door = 1 tap, board rendered)
$ Playwright: kid route tree home→play→win   → pass (win modal single "Next puzzle", 3 stars)
$ Playwright: kids board audit               → pass (no coach/pencil/meta, dot keypad 1..9=45 dots, cells 52px, auto-select, red-pulse w/o toast, star reward)
$ Playwright: parents gate                   → pass (wrong answer regenerates; correct swaps to hub; kid /learn blocked to PLAY door; unlocked /parents = hub)
$ ledger: puzzle-1 {hintsUsed:0, solvedAt} + session2 within 24h → gone live (real kid)  [s4, pending]
$
```

## Slice status (s2/s3 done 2026-09-05, commit 4875411 on contract/kid-simple)
- s2 Zero-choice launch + board-as-app: DONE.
  - `src/app.js` - cold open renders PLAY door; journey play always resolves to the next unsolved puzzle (no lock walls on kid path); `learn`/`free`/`progress`/`settings` render only when `parentUnlocked()`; new `parents` route.
  - `src/sudoku/views/home.js` - collapsed 6-card dashboard → single full-screen PLAY door (rocket + one giant word + puzzle number). `miniMap` export kept for `progress.js`.
  - `src/sudoku/views/play.js` kids mode (`kids = !isFree`): meta tier/fill/timer and Coach button NOT rendered; Pencil removed; keypad = 1..9 with dot-counters; auto-selects first empty cell on mount; conflicts = red-pulse on offending cells + board shake (no text toast); every correct digit pops a rising ★; win modal = single big "Next puzzle" (2 taps to clear), non-dismissable.
  - Fixed pre-existing bug: empty cells loaded as `0` and rendered as literal "0" on the board (saves 0-empty = engine -1-empty); the shipped board showed zeros. Auto-select also depended on the fix (`findIndex(v < 0)`).
- s3 Parent space + instant reward: DONE.
  - `src/sudoku/views/parents.js` (new): arithmetic-challenge gate (2..6 + 2..6, 3 options; wrong → regenerates; correct → swaps to hub in place even when hash already `#/parents`); hub links to learn/progress/settings/free + "→ Back to play".
  - `src/sudoku/views/shared.js`: `buildTopbar(title, { nav })`; when `nav` present a Grown-ups lock door button renders in the topbar → `nav('parents')`. In-app "Add to Home Screen" note kept only on the PLAY door when not standalone.
  - `src/platform/session.js` (new): `parentUnlocked()` / `setParentUnlocked()` on `sessionStorage['s2100.parent']`.
  - `sw.js`: CACHE_VERSION `sudoku2100-v5` → `sudoku2100-v6`; ASSETS += `platform/session.js`, `views/parents.js` (38 files, none missing on disk).
  - CSS: `.play-door*`, `.kp-dots/.kp-dot`, `.cell-star` + `star-pop`, `.gcell.tap-error` + `warn-pulse`, `.board-wrap.board-shake`, `.parents-*`.
- Regression (KR5): 35/35 tests, smoke-imports 29 modules/0 fail, contrast 12/12, sw assets 38/38 exist.
- Remaining: s4 (real kid on device, 7-day window, parent observation → North Star) and s5 (fresh Evaluator + evidence-check --done).