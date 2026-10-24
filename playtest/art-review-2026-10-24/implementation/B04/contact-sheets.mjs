import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = import.meta.dirname;
const shot = ['menu', 'scenarios', ...['wild-basic', 'wild-catch-ready', 'trainer-2enemy', 'status-showcase', 'full-hand-3mon', 'wild-boss-3phase'].map((id) => `combat-${id}`), 'combat-hover', 'combat-after-play'];
mkdirSync(join(out, 'shot'), { recursive: true });
for (const name of shot) writeFileSync(join(out, 'shot', `${name}.png`), readFileSync(`playtest/${name}.png`));
async function sheet(files, dest, width = 640, columns = 2) {
  const cell = Math.round(width * 9 / 16) + 24;
  const pieces = [];
  for (const [i, file] of files.entries()) {
    const top = Math.floor(i / columns) * cell;
    const left = (i % columns) * width;
    const pic = await sharp(join(out, file)).resize({ width, height: cell - 24, fit: 'contain', background: '#ffffff' }).png().toBuffer();
    pieces.push({ input: pic, top, left });
    const caption = Buffer.from(`<svg width="${width}" height="24"><rect width="100%" height="100%" fill="white"/><text x="8" y="17" font-size="12" font-family="sans-serif">${file}</text></svg>`);
    pieces.push({ input: caption, top: top + cell - 24, left });
  }
  await sharp({ create: { width: width * columns, height: Math.ceil(files.length / columns) * cell, channels: 4, background: '#ffffff' } }).composite(pieces).png().toFile(join(out, dest));
}
await sheet(shot.map((name) => `shot/${name}.png`), 'shot-contact-sheet.png');
await sheet(['victory', 'defeat'].flatMap((outcome) => [1920, 1280].flatMap((width) => ['system-reduced', 'system-full', 'setting-reduced', 'setting-full'].map((mode) => `after-${outcome}-${width}-${mode}-a.png`))), 'motion-contact-sheet.png', 480, 4);
