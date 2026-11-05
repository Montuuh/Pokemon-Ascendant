// §8.4 — the Hub's people: the Gen IV nurse overworld (Gen III drew none the Archives keep), trimmed to her pixels,
// and FireRed's Red. The lobby itself is built from pret by scripts/build-rooms.mjs (hub).
//
// Usage: npm run art:people [-- --force]

import { execFileSync } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/hub');
const force = process.argv.includes('--force');
const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.9 (non-commercial fan project; art pipeline)';

function download(title) {
  const json = execFileSync('curl', ['-s', '-L', '-A', UA, `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`], { encoding: 'utf8' });
  const info = Object.values(JSON.parse(json).query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`not on the Archives: ${title}`);
  return execFileSync('curl', ['-s', '-L', '-A', UA, info.url]);
}

const exists = async (p) => access(p).then(() => true, () => false);
await mkdir(OUT, { recursive: true });
if (!force && (await exists(resolve(OUT, 'nurse.png'))) && (await exists(resolve(OUT, 'player.png')))) {
  console.log('skip: the Hub art is installed (--force to redo)');
  process.exit(0);
}

// The nurse, trimmed to her pixels; the player as the game drew him.
await sharp(download('File:Nurse OD.png')).trim().png({ palette: true }).toFile(resolve(OUT, 'nurse.png'));
console.log('wrote public/art/hub/nurse.png');
await sharp(download('File:Red FRLG OD.png')).png({ palette: true }).toFile(resolve(OUT, 'player.png'));
console.log('wrote public/art/hub/player.png');
