// tools/smoke-imports.mjs — imports every browser module in a jsdom-less node context
// only if a module is DOM-free; otherwise renders through the browser (see smoke-browser).
// Here: verify every module parses & imports cleanly (static errors caught, DOM used at call time).
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const roots = ['src'];

// Minimal DOM/Window stubs so browser-only module-scope code (e.g. toast's
// DOMContentLoaded listener registration) does not mask real import errors.
const dummyEl = () => ({
  appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
  setAttribute() {}, getAttribute() { return null; }, contains() { return true; },
  style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, dataset: {}, innerHTML: '',
});
globalThis.document = {
  addEventListener() {}, removeEventListener() {}, createElement: dummyEl,
  createTextNode() { return {}; }, getElementById() { return dummyEl(); },
  body: { appendChild() {}, removeChild() {}, contains() { return true; }, addEventListener() {} },
};
globalThis.window = {
  addEventListener() {}, removeEventListener() {}, scrollTo() {},
  location: { hash: '' }, navigator: { serviceWorker: undefined },
};
globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {}, key() { return null; }, length: 0 };
globalThis.location = { hash: '' };

const files = [];
for (const root of roots) {
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) files.push(p);
    }
  };
  walk(root);
}

let bad = 0;
for (const f of files) {
  try {
    await import(pathToFileURL(f).href);
  } catch (e) {
    bad++;
    console.log(`FAIL ${f}: ${e.message}`);
  }
}
console.log(`imported ${files.length} modules, ${bad} failed`);
process.exit(bad ? 1 : 0);