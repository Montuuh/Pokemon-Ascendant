#!/usr/bin/env node
// §9.2.3 (v0.9.15) — install a generated move illustration as true pixel art for its card.
//
//   node scripts/install-move-art.mjs <src.png> <move-id> [--grid 68]   → public/art/moves/<move-id>.png
//
// A generated "pixel art" image is a picture of pixel art: big soft cells on a flat background, sometimes inside a
// frame nobody asked for. This turns it back into the real thing, on ONE grid for the whole set, so every card draws
// its art at the same whole-pixel scale (D9):
//   1. a thin outer band is cropped (a stray frame), and the flat background — the commonest colour of the band just
//      inside it — is keyed out to transparency;
//   2. the picture is cut into a fixed grid (`--grid` cells across, 68 by default: the card's art window at 2×);
//   3. every cell becomes one pixel: the commonest opaque colour inside it (a mode, so a soft edge never smears), and a
//      cell less than half covered stays clear;
//   4. the colours snap to a 20-colour palette, and the result is trimmed to what is drawn.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const [src, id] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--grid');
const GRID = Number(args[args.indexOf('--grid') + 1] || 68) || 68;
if (!src || !id) {
  console.error('usage: install-move-art <src.png> <move-id> [--grid 68]');
  process.exit(1);
}

const full = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// 1a — crop 3 % off every side: a frame, if the model drew one, lives there.
const m = Math.round(Math.min(full.info.width, full.info.height) * 0.03);
const { data, info } = await sharp(full.data, { raw: { width: full.info.width, height: full.info.height, channels: 4 } })
  .extract({ left: m, top: m, width: full.info.width - 2 * m, height: full.info.height - 2 * m })
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const at = (x, y) => (y * W + x) * 4;
const dist = (i, r, g, b) => Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);

// 1b — the background: the commonest colour (4 bits a channel) on a ring 2 % inside the crop.
const ring = new Map();
const inset = Math.round(Math.min(W, H) * 0.02);
const vote = (x, y) => {
  const i = at(x, y);
  const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
  const v = ring.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
  v.n++;
  v.r += data[i];
  v.g += data[i + 1];
  v.b += data[i + 2];
  ring.set(k, v);
};
for (let x = inset; x < W - inset; x += 2) [inset, H - 1 - inset].forEach((y) => vote(x, y));
for (let y = inset; y < H - inset; y += 2) [inset, W - 1 - inset].forEach((x) => vote(x, y));
const top = [...ring.values()].sort((a, b) => b.n - a.n)[0];
const bg = [top.r / top.n, top.g / top.n, top.b / top.n];
const TOL = 46;
for (let i = 0; i < data.length; i += 4) if (dist(i, bg[0], bg[1], bg[2]) <= TOL) data[i + 3] = 0;

// 2–3 — the fixed grid, a mode per cell.
const cell = W / GRID;
const w = GRID;
const h = Math.floor(H / cell);
const out = Buffer.alloc(w * h * 4);
for (let cy = 0; cy < h; cy++) {
  for (let cx = 0; cx < w; cx++) {
    const votes = new Map();
    let opaque = 0;
    let all = 0;
    const [x0, x1] = [Math.floor(cx * cell + cell * 0.15), Math.ceil((cx + 1) * cell - cell * 0.15)];
    const [y0, y1] = [Math.floor(cy * cell + cell * 0.15), Math.ceil((cy + 1) * cell - cell * 0.15)];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        all++;
        const i = at(x, y);
        if (data[i + 3] === 0) continue;
        opaque++;
        const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
        const v = votes.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        v.n++;
        v.r += data[i];
        v.g += data[i + 1];
        v.b += data[i + 2];
        votes.set(key, v);
      }
    }
    if (opaque < all * 0.5) continue;
    const best = [...votes.values()].sort((a, b) => b.n - a.n)[0];
    const o = (cy * w + cx) * 4;
    out[o] = Math.round(best.r / best.n);
    out[o + 1] = Math.round(best.g / best.n);
    out[o + 2] = Math.round(best.b / best.n);
    out[o + 3] = 255;
  }
}

// 4 — trim to what is drawn (a 1-px margin), and snap to a small palette.
let [x0, y0, x1, y1] = [w, h, -1, -1];
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[(y * w + x) * 4 + 3]) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
if (x1 < 0) {
  console.error(`${src}: nothing left after keying the background`);
  process.exit(2);
}
mkdirSync('public/art/moves', { recursive: true });
const dest = `public/art/moves/${id}.png`;
const left = Math.max(0, x0 - 1);
const topY = Math.max(0, y0 - 1);
await sharp(out, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left, top: topY, width: Math.min(w, x1 + 2) - left, height: Math.min(h, y1 + 2) - topY })
  .png({ palette: true, colours: 20, dither: 0 })
  .toFile(dest);
const meta = await sharp(dest).metadata();
console.log(`${dest}  ${meta.width}×${meta.height} on a ${GRID}-cell grid`);
