#!/usr/bin/env node
// D9 — derive compact party sprites from the existing authentic box icons, without resampling a pixel.
// Trim only transparent margins so even the largest icon fits tiny 26px cells at a clean 0.5×.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const { species } = JSON.parse(await readFile(resolve(root, 'src/content/data/species.json'), 'utf8'));
const out = resolve(root, 'public/art/pokemon/compact');
const maxSide = 52;
await mkdir(out, { recursive: true });
for (const mon of species) {
  const file = `${String(mon.dex).padStart(3, '0')}-${mon.id}.png`;
  const { data, info } = await sharp(resolve(root, 'public/art/pokemon/icons', file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width; let top = info.height; let right = -1; let bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  const width = right - left + 1; const height = bottom - top + 1;
  if (width <= 0 || height <= 0 || width > maxSide || height > maxSide) throw new Error(`${file}: ${width}×${height} cannot fit the smallest 26px cell at 0.5×`);
  const trimmed = await sharp(data, { raw: info }).extract({ left, top, width, height }).png().toBuffer();
  await writeFile(resolve(out, file), trimmed);
}
console.log(`${species.length} compact icons trimmed; source pixels unchanged.`);
