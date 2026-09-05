# Sudoku02100

A 100% client-side PWA that teaches a kid (who knows **nothing**) Sudoku through 100
puzzles of rising difficulty over up to 100 days, with a Socratic **Coach** that asks
questions and guides how to *think* — never just reveals the answer.

- **No backend.** All puzzles, progress, coaching, and persistence live in the browser.
- **Installable + offline** (PWA manifest + service worker).
- Built on a reusable **game platform** (`src/platform/**`) that future games can import
  without touching any Sudoku code.

## Run it

```bash
npx http-server . -p 8080
# open http://localhost:8080
```

Tests (no deps, Node ≥ 18):

```bash
node --test tests/
```

Production URL: https://youtextme.github.io/Sudoku02100/

## Lives here

```
┌─ index.html                 single-page app shell
├─ manifest.webmanifest       PWA metadata (icons, standalone, theme)
├─ sw.js                      service worker (offline-first app shell)
├─ css/                       design tokens + components
├─ src/
│  ├─ platform/               ★ GAME-AGNOSTIC LAYER (zero Sudoku terms)
│  │  ├─ util.js              rng, shuffle, pick, clamp, hash
│  │  ├─ store.js             namespaced persistence (started, saved, never lost)
│  │  ├─ events.js            tiny pub/sub
│  │  ├─ sound.js             WebAudio chimes (no assets)
│  │  ├─ pwa.js               install prompt + online/offline + update
│  │  ├─ progress.js          game-agnostic progress ledger (stars, streaks, badges)
│  │  ├─ ui/                  dom, modal, toast, confetti, bar, hero buttons
│  │  └─ grid/                GridEngine (N×N, symbols) + GridView (render/input)
│  └─ sudoku/                 ★ SUDOKU-SPECIFIC (imports platform, never reversed)
│     ├─ rules.js             candidates, validate, parse
│     ├─ generator.js         deterministic 100-puzzle ramp, uniqueness+strategy proof
│     ├─ strategies.js        naked single / hidden single solver (what the kid learns)
│     ├─ coach.js             hint ranking + question-escalation scripts
│     ├─ curriculum.js        day-by-day 100 puzzle map + lesson data
│     └─ views/               home, play+keypad, coach panel, learn, milestones, settings
└─ tests/                     node --test suites for util, rules, generator, strategies, coach
```

## Copy-review checklist (kids-reads-simple-English gate)

Every sentence in `src/sudoku/views/*` and `curriculum.js` must pass:

- [ ] ≤ ~8 words per sentence.
- [ ] No unexplained term: "candidate", "unique", "constraint", "eliminate", "cell"
      are banned in kid-facing copy. Replaced by: "can only fit", "one time only",
      "the little box", "empty square".
- [ ] Numbers 1–9 shown as digits **and** dot-counters in lesson 1.
- [ ] Row / column / box each get a picture + one-line definition before first use.
- [ ] Every screen has one primary action, big tap targets (≥44 px), high contrast (WCAG AA).
- [ ] Feedback is always encouraging; incorrect answers never say "wrong", they say "try again".