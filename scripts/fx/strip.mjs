#!/usr/bin/env node
// Filmstrips of chosen moves: every `step` ms of each move's animated film, one row a move.
// node scripts/fx/strip.mjs <out.png> id,id,… [stepMs=80] [frames=10]
import sharp from 'sharp';
import { resolve } from 'node:path';
const dir = resolve(import.meta.dirname, '../../playtest/fx-report/film');
const [out, list, step = '80', count = '10'] = process.argv.slice(2);
const W = 300, L = [];
let y = 0;
for (const id of list.split(',')) {
  const f = resolve(dir, `${id}.webp`);
  const m = await sharp(f).metadata();
  const h = Math.round(((m.pageHeight ?? m.height) / m.width) * W);
  L.push({ input: Buffer.from(`<svg width="${W}" height="16"><text x="2" y="13" font-size="13" font-family="Arial" fill="#fff">${id}</text></svg>`), left: 0, top: y });
  y += 16;
  for (let k = 0; k < Number(count); k++) {
    const p = Math.min(m.pages - 1, 2 + Math.round((k * Number(step)) / 40));
    L.push({ input: await sharp(f, { page: p }).resize(W, h).png().toBuffer(), left: k * (W + 2), top: y });
  }
  y += h + 4;
}
await sharp({ create: { width: Number(count) * (W + 2), height: y, channels: 3, background: '#000' } }).composite(L).png().toFile(out);
