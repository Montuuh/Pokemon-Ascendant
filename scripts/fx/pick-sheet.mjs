#!/usr/bin/env node
// A sheet of chosen moves, four moments each across the beat (from their animated films): node scripts/fx/pick-sheet.mjs
// <out.png> id,id,…  → for eyeballing a set of moves after a change.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve(import.meta.dirname, '../../playtest/fx-report');
const films = JSON.parse(readFileSync(resolve(dir, 'films.json'), 'utf8'));
const [out, list] = process.argv.slice(2);
const W = 420, LABEL = 130;
const L = [];
let y = 0;
for (const id of list.split(',')) {
  const f = films.find((x) => x.id === id);
  const file = resolve(dir, 'film', `${id}.webp`);
  const m = await sharp(file).metadata();
  const h = Math.round(((m.pageHeight ?? m.height) / m.width) * W);
  L.push({ input: Buffer.from(`<svg width="${LABEL}" height="${h}"><rect width="100%" height="100%" fill="#222"/><text x="5" y="20" font-size="15" font-family="Arial" fill="#fff">${id}</text><text x="5" y="40" font-size="12" font-family="Arial" fill="#bbb">${f?.kind ?? ''}</text></svg>`), left: 0, top: y });
  let x = LABEL;
  for (const fr of [0.25, 0.5, 0.75, 1.0]) {
    const t = (f?.impactMs ?? 400) * fr + (fr === 1 ? 120 : 0);
    const p = Math.min(m.pages - 1, Math.round((t + 80) / 40));
    L.push({ input: await sharp(file, { page: p }).resize(W, h).png().toBuffer(), left: x, top: y });
    x += W + 3;
  }
  y += h + 3;
}
await sharp({ create: { width: LABEL + 4 * (W + 3), height: y, channels: 3, background: '#000' } }).composite(L).png().toFile(out);
