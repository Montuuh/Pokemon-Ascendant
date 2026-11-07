#!/usr/bin/env node
// Zoomed review sheets: per move, the cast on the user, the flight mid-field, and the target at and after the impact,
// cut from its animated film (40 ms a frame from -80 ms). node scripts/fx/zoom-sheets.mjs → playtest/fx-report/zoom/NN.png
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const dir = resolve(import.meta.dirname, '../../playtest/fx-report');
const only = process.argv[2];
const films = JSON.parse(readFileSync(resolve(dir, 'films.json'), 'utf8')).filter((f) => !only || f.kind === only);
const outDir = only ? `zoom-${only}` : 'zoom';
mkdirSync(resolve(dir, outDir), { recursive: true });
const PER = 7, CELL_H = 150, LABEL = 170;
const idx = (t) => Math.max(0, Math.round((t + 80) / 40));
for (let s = 0; s * PER < films.length; s++) {
  const layers = []; let y = 0, W = 0;
  for (const f of films.slice(s * PER, (s + 1) * PER)) {
    const file = resolve(dir, 'film', `${f.id}.webp`);
    const meta = await sharp(file).metadata();
    const n = meta.pages, w = meta.width, h = meta.pageHeight ?? meta.height;
    const frame = (t) => sharp(file, { page: Math.min(n - 1, idx(t)) });
    // An aura plays on its user: every shot on the user, across the beat.
    const shots = f.kind === 'aura' ? [120, 260, 400, 540].map((t) => ({ t, x: 0, cw: 0.3 })) : [
      { t: f.impactMs * 0.35, x: 0, cw: 0.35 },
      { t: f.impactMs * 0.75, x: 0.15, cw: 0.7 },
      { t: f.impactMs + 40, x: 0.62, cw: 0.38 },
      { t: f.impactMs + 200, x: 0.62, cw: 0.38 },
    ];
    let x = LABEL;
    layers.push({ input: Buffer.from(`<svg width="${LABEL}" height="${CELL_H}"><rect width="100%" height="100%" fill="#222"/><text x="6" y="22" font-size="16" font-family="Arial" fill="#fff">${f.id}</text><text x="6" y="44" font-size="12" font-family="Arial" fill="#bbb">${f.kind}${f.style ? '/' + f.style : ''} ${f.totalMs}ms</text><text x="6" y="62" font-size="12" font-family="Arial" fill="#bbb">${f.recipe?.main?.sprite ?? '—'}</text><text x="6" y="80" font-size="12" font-family="Arial" fill="#bbb">${f.recipe?.impact?.sprite ?? ''}</text></svg>`), left: 0, top: y });
    for (const sh of shots) {
      const ext = { left: Math.round(sh.x * w), top: 0, width: Math.round(sh.cw * w), height: h };
      const cw = Math.round((ext.width / h) * CELL_H);
      layers.push({ input: await frame(sh.t).extract(ext).resize(cw, CELL_H).png().toBuffer(), left: x, top: y });
      x += cw + 3;
    }
    W = Math.max(W, x); y += CELL_H + 3;
  }
  await sharp({ create: { width: W, height: y, channels: 3, background: '#000' } }).composite(layers).png().toFile(resolve(dir, outDir, `${String(s).padStart(2, '0')}.png`));
}
console.log('zoom sheets', Math.ceil(films.length / PER));
