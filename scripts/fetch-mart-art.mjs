// §2.11.2 — the clerk behind every counter: the games' own Gen III clerk overworld. The Mart and the Department
// Store's floors are built from pret by scripts/build-rooms.mjs (mart).
//
// Usage: npm run art:people [-- --force]

import { execFileSync } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/mart');
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
if (!force && (await exists(resolve(OUT, 'clerk.png')))) {
  console.log('skip: the Mart art is installed (--force to redo)');
  process.exit(0);
}

// The clerk: the games' own sprite, facing you across the counter.
await sharp(download('File:Clerk III OD.png')).png({ palette: true }).toFile(resolve(OUT, 'clerk.png'));
console.log('wrote public/art/mart/clerk.png');
