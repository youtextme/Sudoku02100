// tools/contrast-check.mjs — re-runs the WCAG-AA pair checks for shipped UI colors.
// Reads values from css/tokens.css + src/sudoku/generator.js so it stays truthful.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function lum(hex) {
  const h = hex.replace('#', '');
  const cs = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * cs[0] + 0.7152 * cs[1] + 0.0722 * cs[2];
}

function contrast(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const tokens = readFileSync(join(root, 'css/tokens.css'), 'utf8');
const tok = (name) => (tokens.match(new RegExp(`--${name}:\\s*([^;]+);`)) || [])[1]?.trim();
const generator = readFileSync(join(root, 'src/sudoku/generator.js'), 'utf8');

const tierColors = [...generator.matchAll(/color:\s*'([#'\w]+)'/g)].map((m) => m[1]);

const navy = tok('navy');
const paper = tok('paper');
const card = tok('card');
const green = tok('green');
const orange = tok('orange');
const blue = tok('blue');
const muted = tok('muted');
const white = '#ffffff';

const checks = [
  ...tierColors.map((c) => [`tier chip: white on ${c}`, contrast(white, c), 4.5]),
  ['muted on paper', contrast(muted, paper), 4.5],
  ['muted on card', contrast(muted, card), 4.5],
  ['btn-primary: navy on orange', contrast(navy, orange), 4.5],
  ['btn-secondary: paper on blue', contrast(paper, blue), 4.5],
  ['map-cell.solved: navy on green', contrast(navy, green), 4.5],
  ['btn-green: navy on green', contrast(navy, green), 4.5],
];

let failed = 0;
for (const [label, ratio, min] of checks) {
  const ok = ratio >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label} = ${ratio.toFixed(2)} (need ≥ ${min})`);
}
if (failed > 0) {
  console.error(`${failed} contrast check(s) FAILED`);
  process.exit(1);
}
console.log('All contrast checks pass (WCAG AA).');