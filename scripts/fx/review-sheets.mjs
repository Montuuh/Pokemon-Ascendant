#!/usr/bin/env node
// Review sheets of the filmed moves: 8 moves a sheet, one row each (its name, then 6 of its 8 frames), for reading the
// whole roster's animations a sheet at a time. node scripts/fx/review-sheets.mjs → playtest/fx-report/review/NN.png
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '../../playtest/fx-report');
const films = JSON.parse(readFileSync(resolve(dir, 'films.json'), 'utf8')).filter((f) => existsSync(resolve(dir, 'film', `${f.id}.jpg`)));
mkdirSync(resolve(dir, 'review'), { recursive: true });
const PER = 8, CELL = 270, LABEL = 150, FRAMES = [1, 2, 3, 4, 5, 6];
for (let s = 0; s * PER < films.length; s++) {
  const chunk = films.slice(s * PER, (s + 1) * PER);
  const layers = [];
  let y = 0;
  for (const f of chunk) {
    const img = sharp(resolve(dir, 'film', `${f.id}.jpg`));
    const { width, height } = await img.metadata();
    const cw = (width - 12) / 4, chh = (height - 4) / 2;
    const rowH = Math.round((chh / cw) * CELL);
    const label = `<svg width="${LABEL}" height="${rowH}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="20" font-size="15" font-family="Arial" fill="#fff">${f.id}</text><text x="6" y="40" font-size="12" font-family="Arial" fill="#bbb">${f.kind}${f.style ? '/' + f.style : ''}</text><text x="6" y="58" font-size="12" font-family="Arial" fill="#bbb">${f.recipe?.main?.sprite ?? (f.recipe?.impact?.sprite ?? 'dibujado')}</text></svg>`;
    layers.push({ input: Buffer.from(label), left: 0, top: y });
    for (const [k, i] of FRAMES.entries()) {
      const cell = await img.clone().extract({ left: Math.round((i % 4) * (cw + 4)), top: Math.round(Math.floor(i / 4) * (chh + 4)), width: Math.floor(cw), height: Math.floor(chh) }).resize(CELL, rowH).toBuffer();
      layers.push({ input: cell, left: LABEL + k * (CELL + 2), top: y });
    }
    y += rowH + 3;
  }
  for (const l of layers) if (typeof l.input !== 'object' || !Buffer.isBuffer(l.input)) l.input = Buffer.from(l.input);
  await sharp({ create: { width: LABEL + FRAMES.length * (CELL + 2), height: y, channels: 3, background: '#000' } })
    .composite(layers)
    .png()
    .toFile(resolve(dir, 'review', `${String(s).padStart(2, '0')}.png`));
}
console.log(`review sheets: ${Math.ceil(films.length / PER)}`);
