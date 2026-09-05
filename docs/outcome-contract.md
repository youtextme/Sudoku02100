# Outcome Contract — Sudoku02100

**Status:** active
**Branch:** main
**Created:** 2026-09-05

## Job (human outcome)
A 7–10 year-old with **zero knowledge** (no Sudoku, no grid logic, no strategy concepts;
reads only simple English) can install the app on her Android phone and, over up to 100
days, solve **100 puzzles that ramp in difficulty**, each time being *taught how to think*
by a Socratic hint mode — not just handed the answer. The app is 100% client-side
(no backend, no network needed after install) and its reusable game-parts live in a
platform layer usable by future games, not just Sudoku.

## North Star
`puzzles_solved` reaches **100** in the on-device progress ledger, with difficulty
strictly non-decreasing across puzzles, and the app is **installable + fully offline**
(service worker + manifest) and reachable at a free public URL.

## Key Results (falsifiable)
- **KR1:** Deterministic generator produces 100 unique puzzles; puzzles 1–55 (Intro→Medium)
  are **proven single-solvable** (naked/hidden single solver completes them); Hard/Expert
  proven unique-solution. Evidence: `node --test tests/generator.test.mjs`.
- **KR2:** Coach = ask-then-guide, never answer-dumps: hint pipeline ranks moves
  (trivial unit → naked single → hidden single), asks the kid a question with answer
  choices, escalates through 4 levels, and the **kid places the number**. Evidence:
  strategy + coach unit tests and a Playwright coached-click flow.
- **KR3:** `src/platform/**` contains **zero Sudoku concepts** (no "box", no "candidate",
  no puzzle). Sudoku imports platform; platform never imports sudoku. A new game can be
  dropped in beside `src/sudoku`. Evidence: import-boundary grep + tests run in Node.
- **KR4:** The onboarding teaches absolutely everything: numbers 1–9, rows, columns,
  boxes, and the three rules, with interactive demos, before puzzle 1 requires them.
  No unexplained term anywhere. Evidence: copy review checklist in README + eval agent pass.

## Difficulty ramp (puzzle index → tier)
| Index | Tier | Target givens | Strategy proof |
|-------|------|---------------|----------------|
| 1–10 | Intro (Baby Steps) | 42 | single-solvable |
| 11–30 | Easy | 38 | single-solvable |
| 31–45 | Easy-Medium | 35 | single-solvable |
| 46–65 | Medium | 33 | single-solvable |
| 66–85 | Hard | 30 | unique-solution |
| 86–100 | Expert | 27 | unique-solution |

Givens are a target; actual = max(target, cells required to stay unique/solvable).

## Kill criteria (pre-registered)
1. Generation of all 100 puzzles takes >10 s on-device or fails ≥1/kill for any tier.
2. Any puzzle in 1–55 is NOT solvable by naked+hidden singles (the taught strategies)
   → downgrade that tier's target givens until proven, else stop.
3. App fails to install/run standalone offline on Android WebView/Chrome.
4. The coach ever prints the answer before the kid has had a question to answer.

## Baseline (bar-raiser gate)
| Alternative today | How a kid solves it | Weakness vs ours |
|-------------------|---------------------|------------------|
| Paper books (Easy Sudoku for Kids) | static, no feedback | no coaching, no progress, no ramp tracking |
| Sudoku.com / others apps | pencil-and-candidates, hard UI | answer-heavy hints, ads+backend, not made for non-readers |
| Parent teaches | best, but not scalable | parent burnout, inconsistent difficulty |
| Do nothing | kid never learns the game | 0 puzzles solved |

**Differentiating PoC (riskiest assumption):** the *ask-then-guide coach* is teachable by a
non-reader-ish kid. Cheap test: strategy tests + a 4-step coached flow in Playwright (s2→s3).
If a kid cannot be *asked a question* about the next move, the coach architecture changes.

## Verification plan (slice-gated)
- s1/s2: `node --test tests/` — engine, generator, strategies, coach rankings.
- s3: `node --test tests/strategies.test.mjs` + Playwright smoke: load index.html locally,
  no console errors, open coach, complete a coached move, place a number, win small puzzle.
- s4: manifest + SW registration assertions; offline reload test (browser context offline).
- s5: `https://youtextme.github.io/Sudoku02100/` loads, SW installs, manifest valid
  (curl + Playwright on live URL).
- Independent Evaluator (fresh context) reviews contract + artifact; flags kill/security/metric issues.
- Final gate: `evidence-check` style — command receipts + live behavior + metric movement.

## Compute & autonomy
All client-side. Build tooling: node --test. No paid services. Hosting: GitHub Pages (free).

## Glossary guards (anti-assumption)
Numbers are taught as symbols with dot-counters. "Row", "column", "box" are defined with
pictures before use. Every strategy name has a kid-name ("The One-Space Trick",
"Only One Fits", "Number Hunting"). Coach prose ≤ ~8 words/sentence. Blacklist words the
kid can't know: "candidate", "unique", "constraint", "cell coordinate".