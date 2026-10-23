// Review all installed A10 vignette compositions at an exact 2× scale.
// Usage: node scripts/event-art-gallery.mjs → playtest/a10-events/gallery.png
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'public/art/events/manifest.json'), 'utf8'));
const layers = [];
const columns = 3;
const cellWidth = 528;
const cellHeight = 264;
for (const [index, output] of manifest.outputs.entries()) {
  const left = (index % columns) * cellWidth;
  const top = Math.floor(index / columns) * cellHeight;
  const label = output.file.replace('.png', '');
  const heading = Buffer.from(
    `<svg width="528" height="32"><text x="8" y="22" font-family="monospace" font-size="18" fill="#3a2e22">${label}</text></svg>`,
  );
  const art = await sharp(resolve(root, 'public/art/events', output.file))
    .resize(512, 224, { kernel: 'nearest' })
    .png()
    .toBuffer();
  layers.push({ input: heading, left, top }, { input: art, left: left + 8, top: top + 32 });
}
await mkdir(resolve(root, 'playtest/a10-events'), { recursive: true });
await sharp({
  create: {
    width: columns * cellWidth,
    height: Math.ceil(manifest.outputs.length / columns) * cellHeight,
    channels: 4,
    background: '#fbf4e6',
  },
})
  .composite(layers)
  .png()
  .toFile(resolve(root, 'playtest/a10-events/gallery.png'));
console.log('Wrote playtest/a10-events/gallery.png');
