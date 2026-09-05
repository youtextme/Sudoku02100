// tools/make-icons.mjs — rasterizes icons/icon.svg shapes to PNG in pure Node (no browser).
// Draws the rocket mascot at 512 and 192, writes icons/icon-<size>.png.

import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const ICON_DIR = path.resolve('icons');

// ---------- tiny PNG encoder ----------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter none
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- tiny rasterizer ----------
const NAVY = [30, 42, 90];
const GOLD = [255, 209, 102];
const ORANGE = [255, 107, 53];
const CREAM = [255, 248, 236];
const BLUE = [59, 130, 246];
const DARK = [15, 27, 61];
const NONE = null;

function clampf(v, a, b) { return v < a ? a : v > b ? b : v; }
function inRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const cx = clampf(x, r, w - r);
  const cy = clampf(y, r, h - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? clampf(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1) : 0;
  const qx = ax + t * dx, qy = ay + t * dy;
  return Math.hypot(px - qx, py - qy);
}
function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polyDist(x, y, pts) {
  let d = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    d = Math.min(d, distToSeg(x, y, a[0], a[1], b[0], b[1]));
  }
  return d;
}
function cubic(ax, ay, bx, by, cx, cy, dx, dy, samples) {
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const mt = 1 - t;
    pts.push([
      mt ** 3 * ax + 3 * mt * mt * t * bx + 3 * mt * t * t * cx + t ** 3 * dx,
      mt ** 3 * ay + 3 * mt * mt * t * by + 3 * mt * t * t * cy + t ** 3 * dy,
    ]);
  }
  return pts;
}

function pointColor(x, y, k) {
  // returns [r,g,b,a] in 0..255 as float coverage handled by caller alpha blending.
  // Background: rounded navy square (scaled to canvas size k).
  const s = k / 512;
  let col = NONE;
  if (inRoundRect(x / s, y / s, 512, 512, 112)) col = NAVY;

  // Star (sx, sy, pts) helper defined in 512-space, scaled by s.
  const S = (fn) => fn(x / s, y / s);

  const star = (pts) => {
    if (col === NONE && inPoly(x / s, y / s, pts)) col = GOLD;
  };
  star([[96, 76], [110, 110], [144, 110], [117, 132], [125, 166], [96, 145], [67, 166], [75, 132], [48, 110], [82, 110]]);
  star([[402, 66], [414, 96], [444, 96], [420, 115], [427, 144], [402, 126], [377, 144], [384, 115], [360, 96], [390, 96]]);
  star([[420, 338], [430, 360], [452, 360], [434, 375], [440, 396], [420, 383], [400, 396], [406, 375], [388, 360], [410, 360]]);
  if (col === NONE && Math.hypot(x / s - 120, y / s - 344) <= 10) col = GOLD;
  if (col === NONE && Math.hypot(x / s - 392, y / s - 288) <= 8) col = GOLD;

  // Rocket group (rotated 45° around center)
  const cx = 256, cy = 256, ang = -Math.PI / 4;
  const rx = cx + (x - cx) * Math.cos(ang) - (y - cy) * Math.sin(ang);
  const ry = cy + (x - cx) * Math.sin(ang) + (y - cy) * Math.cos(ang);

  const bodyTop = [256, 120];
  const notchL = [220, 392], notchC = [256, 348], notchR = [292, 392];
  const sideR = cubic(256, 120, 322, 176, 342, 300, 292, 392, 10); // right bulge from tip to bottomRight
  const sideL = cubic(256, 120, 190, 176, 170, 300, 220, 392, 10).reverse(); // left bulge from tip to bottomLeft
  const bodyPoly = [bodyTop, ...sideR, notchR, notchC, notchL, ...sideL];
  if (polyDist(rx / s, ry / s, bodyPoly) <= 5) col = ORANGE; // stroke 10 => 5
  else if (inPoly(rx / s, ry / s, bodyPoly)) col = ORANGE;

  // head circle: stroke 10 gold, fill gold
  const hd = Math.hypot(rx / s - 256, ry / s - 200);
  if (Math.abs(hd - 86) <= 5) col = GOLD;
  else if (hd <= 86) col = GOLD;

  // window: stroke 10 navy, fill cream, dot navy
  const wd = Math.hypot(rx / s - 256, ry / s - 230);
  if (Math.abs(wd - 40) <= 5) col = DARK;
  else if (wd <= 40) col = CREAM;
  if (Math.hypot(rx / s - 256, ry / s - 230) <= 14) col = NAVY;

  // arms (strokes)
  if (distToSeg(rx / s, ry / s, 214, 400, 238, 356) <= 6) col = DARK;
  if (distToSeg(rx / s, ry / s, 298, 400, 274, 356) <= 6) col = DARK;

  // fin triangle
  const fin = [[220, 416], [256, 452], [292, 416]];
  if (polyDist(rx / s, ry / s, fin) <= 5) col = DARK;
  else if (inPoly(rx / s, ry / s, fin)) col = BLUE;

  if (!col) return [0, 0, 0, 0];
  return [col[0], col[1], col[2], 255];
}

function render(size) {
  const k = 512; // render full-res once, downsample for smaller sizes
  const rgba = Buffer.alloc(k * k * 4);
  const ss = 3; // supersample
  for (let y = 0; y < k; y++) {
    for (let x = 0; x < k; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x + (sx + 0.5) / ss;
          const py = y + (sy + 0.5) / ss;
          const [cr, cg, cb, ca] = pointColor(px, py, k);
          r += cr; g += cg; b += cb; a += ca;
        }
      }
      const n = ss * ss;
      const i = (y * k + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  if (size === k) return encodePNG(size, rgba);
  // box downsample to target size
  const out = Buffer.alloc(size * size * 4);
  const f = k / size;
  for (let y = 0; y < size; y++) {
    const y0 = Math.floor(y * f), y1 = Math.min(k, Math.ceil((y + 1) * f));
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor(x * f), x1 = Math.min(k, Math.ceil((x + 1) * f));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const i = (py * k + px) * 4;
          r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; a += rgba[i + 3]; n++;
        }
      }
      const o = (y * size + x) * 4;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, out);
}

for (const size of [512, 192]) {
  const png = render(size);
  fs.writeFileSync(path.join(ICON_DIR, `icon-${size}.png`), png);
  console.log(`written icon-${size}.png (${png.length} bytes)`);
}