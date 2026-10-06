// §8.4 — the Trainer Hub as a place (v0.9.2): the Indigo Plateau's Pokémon Center lobby as FireRed / LeafGreen drew it —
// the League's own front room, the place a run is meant to end, with the Poké Mart counter, the nurse's counter, the
// PC and the door to the Elite Four all in one room. The real map comes from the Bulbagarden Archives (curl: Node's
// fetch gets a Cloudflare page there), shown at a whole-pixel scale and left as the games drew it, with one touch:
// the map's black outside the room becomes transparent, so the room sits on the screen's own background, and two
// transparent columns are added on the left, where the Archives' map is cut, so an outline drawn round the Mart's
// counter there is not cut with it.
//
// The map has nobody in it, so the screen places the people: the Mart's clerk (`public/art/mart/clerk.png`), the nurse
// behind her counter, and the player at the door. Gen III drew no nurse overworld the Archives keep, so she is the
// Gen IV one, trimmed to her pixels; the player is FireRed's Red.
//
// Usage: npm run art:hub [-- --force]

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
if (!force && (await exists(resolve(OUT, 'lobby.png'))) && (await exists(resolve(OUT, 'nurse.png'))) && (await exists(resolve(OUT, 'player.png')))) {
  console.log('skip: the Hub art is installed (--force to redo)');
  process.exit(0);
}

// The lobby: only pure black is the outside; the games' outlines are a dark slate, never #000.
{
  const { data, info } = await sharp(download('File:Indigo Plateau Center FRLG.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) if (px[i] === 0 && px[i + 1] === 0 && px[i + 2] === 0) px[i + 3] = 0;
  await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({ left: 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true })
    .toFile(resolve(OUT, 'lobby.png'));
  console.log(`wrote public/art/hub/lobby.png (${info.width + 2}×${info.height})`);
}

// The nurse, trimmed to her pixels; the player as the game drew him.
await sharp(download('File:Nurse OD.png')).trim().png({ palette: true }).toFile(resolve(OUT, 'nurse.png'));
console.log('wrote public/art/hub/nurse.png');
await sharp(download('File:Red FRLG OD.png')).png({ palette: true }).toFile(resolve(OUT, 'player.png'));
console.log('wrote public/art/hub/player.png');
