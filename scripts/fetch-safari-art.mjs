#!/usr/bin/env node
// §2.11.6 — the Safari Zone's art, cut from the real thing.
//
// The Safari board is a patch of the FireRed/LeafGreen Safari Zone, so its tiles are that map's tiles: the tall
// grass, the short grass, the pond and its rocky rim, the forest that walls the park in, the Strength boulder, and
// Red walking in. The entrance screen stands on the map of the Safari's entrance area itself. Everything comes from
// the Bulbagarden Archives (curl: Node's fetch gets a Cloudflare page there) and is cut on the map's 16-px grid, so
// nothing is redrawn — "fetch an object", docs/art/pipeline.md.
//
// Usage: npm run art:safari [-- --force]    → public/art/safari/*.png (native size; the CSS scales them pixelated)
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/safari');
const force = process.argv.includes('--force');
const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.7 (non-commercial fan project; art pipeline)';

function download(title) {
  const json = execFileSync('curl', ['-s', '-L', '-A', UA, `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`], { encoding: 'utf8' });
  const info = Object.values(JSON.parse(json).query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`not on the Archives: ${title}`);
  return execFileSync('curl', ['-s', '-L', '-A', UA, info.url]);
}

const exists = async (p) => access(p).then(() => true, () => false);
await mkdir(OUT, { recursive: true });
if (!force && (await exists(resolve(OUT, 'grass-tall.png')))) {
  console.log('skip: public/art/safari is installed (--force to redo)');
  process.exit(0);
}

const map = download('File:Safari Zone entrance FRLG.png');
const boulder = download('File:FRLG Strength.png');
const red = download('File:Red FRLG OD.png');

const T = 16;
const cut = (x, y, w = 1, h = 1) => sharp(map).extract({ left: x * T, top: y * T, width: w * T, height: h * T });

// The grid positions on the entrance map (51 × 36 tiles). Measured by cutting candidates and looking at them.
const tiles = {
  'grass-tall': cut(13, 8),
  grass: cut(10, 7),
  'grass-tuft': cut(12, 7),
  water: cut(20, 16),
  'water-n': cut(19, 13),
  'water-w': cut(18, 14),
  'water-e': cut(33, 14),
  'water-nw': cut(18, 13),
  'water-ne': cut(33, 13),
  // The map draws the pond's bottom rim on the grass tile below it; the board has no such tile, so the bottom
  // edges are the top ones turned over.
  'water-s': cut(19, 13).flip(),
  'water-sw': cut(18, 13).flip(),
  'water-se': cut(33, 13).flip(),
  // The forest that walls the park: one period of its repeat (48 × 32), tiled round the board.
  forest: sharp(map).extract({ left: 0, top: 0, width: 48, height: 32 }),
};
for (const [name, img] of Object.entries(tiles)) {
  await img.png().toFile(resolve(OUT, `${name}.png`));
  console.log(`cut ${name}`);
}

// The Strength boulder stands on the short grass.
const grass = await cut(10, 7).png().toBuffer();
await sharp(grass).composite([{ input: boulder }]).png().toFile(resolve(OUT, 'boulder.png'));
console.log('cut boulder');

await writeFile(resolve(OUT, 'player.png'), red);
await writeFile(resolve(OUT, 'entrance.png'), map);
console.log('saved player, entrance');
