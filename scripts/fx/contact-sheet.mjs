// A contact sheet of the imported move-animation sprites (every frame, 2×, on the stage's dark plum and on cream), to
// look at after an import: node scripts/fx/contact-sheet.mjs [filter] → playtest/fx-contact.png
import { resolve } from 'node:path';
import sharp from 'sharp';
import anims from '../../src/ui/fx/pret-anims.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '../..');
const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
const S = 2, COLW = 560, LABEL = 150;
const entries = Object.entries(anims.sprites).filter(([k]) => !filter || filter.test(k));
const rows = [];
let y = 0;
for (const [k, s] of entries) {
  const h = Math.min(s.h, 64) * S + 6;
  rows.push({ k, s, y });
  y += h;
}
const cols = 2, perCol = Math.ceil(rows.length / cols);
const colH = (c) => rows.slice(c * perCol, (c + 1) * perCol).reduce((a, r) => a + Math.min(r.s.h, 64) * S + 6, 0);
const H = Math.max(colH(0), colH(1)) + 8;
const layers = [];
for (let c = 0; c < cols; c++) {
  let yy = 4;
  for (const { k, s } of rows.slice(c * perCol, (c + 1) * perCol)) {
    const fh = Math.min(s.h, 64);
    const img = sharp(resolve(root, 'public/art/fx/pret', `${k.replace('@', '_')}.png`));
    const n = Math.min(s.frames, Math.floor((COLW - LABEL) / (s.w * S + 2)));
    for (let f = 0; f < n; f++) {
      const frame = await img.clone().extract({ left: 0, top: f * s.h, width: s.w, height: fh }).resize(s.w * S, fh * S, { kernel: 'nearest' }).png().toBuffer();
      layers.push({ input: frame, left: c * COLW + LABEL + f * (s.w * S + 2), top: yy });
    }
    layers.push({ input: Buffer.from(`<svg width="${LABEL}" height="14"><text x="2" y="11" font-family="Arial" font-size="11" fill="#eee">${k} ${s.w}x${s.h}x${s.frames}</text></svg>`), left: c * COLW, top: yy });
    yy += fh * S + 6;
  }
}
await sharp({ create: { width: COLW * cols, height: H, channels: 4, background: '#2a2230' } }).composite(layers).png().toFile(resolve(root, 'playtest/fx-contact.png'));
console.log(`${rows.length} sprites → playtest/fx-contact.png (${COLW * cols}×${H})`);
