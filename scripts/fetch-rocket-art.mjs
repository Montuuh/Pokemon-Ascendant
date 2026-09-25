#!/usr/bin/env node
// §2.11.6 — Team Rocket's Black Market, cut from the real thing (v0.7.7).
//
// The way in is the Celadon Game Corner as FireRed / LeafGreen drew it — the whole room, the Game Corner screen
// itself (§2.11.5): the prize counter, the rows of slot machines and their players, the Rocket poster, and the
// paper poster with the switch behind it and the Grunt guarding it. Three states of the room: before the switch
// (the Grunt on guard, no stairs), after it (the Grunt gone, the stairs open), and shut (the Grunt gone, no stairs —
// the screen lays the locked hatch over the spot, `install-art pixel-sprite`). The market itself is
// the Rocket Hideout's B1F: its wall with the vents, its floor, and the stairs you came down. Everything comes
// from the Bulbagarden Archives (curl: Node's fetch gets a Cloudflare page there) and is cut on the maps' 16-px
// grid, so nothing is redrawn — "fetch an object", docs/art/pipeline.md.
//
// Usage: npm run art:rocket [-- --force]   → public/art/game-corner/*.png, public/art/black-market/*.png
// (native size; the CSS scales them by whole pixels, pixelated)
import { execFileSync } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const CORNER = resolve(ROOT, 'public/art/game-corner');
const MARKET = resolve(ROOT, 'public/art/black-market');
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
await mkdir(CORNER, { recursive: true });
await mkdir(MARKET, { recursive: true });
if (!force && (await exists(resolve(CORNER, 'room.png'))) && (await exists(resolve(MARKET, 'floor.png')))) {
  console.log('skip: the Rocket art is installed (--force to redo)');
  process.exit(0);
}

// The Game Corner's interior with its people, and the same map with nobody in it (the Archives mark its hidden
// coins with squares, none of them on the tiles taken from it here).
const inside = download('File:Celadon Game Corner Inside FRLG.png');
const empty = download('File:Rocket Game Corner hidden coins FRLG.png');
const hideout = download('File:Rocket Hideout B1F FRLG.png');

const raw = async (buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const I = await raw(inside);
const E = await raw(empty);
const W = I.info.width;

/** The room, less the map's black last row, with a list of [dx, dy, w, h, sx, sy, from] copies. */
async function room(patches, out) {
  const band = Buffer.from(I.data);
  for (const [dx, dy, w, h, sx, sy, from] of patches) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((dy + y) * W + dx + x) * 4;
      const s = ((sy + y) * W + sx + x) * 4;
      from.data.copy(band, d, s, s + 4);
    }
  }
  await sharp(band, { raw: { width: W, height: I.info.height, channels: 4 } }).extract({ left: 0, top: 0, width: 288, height: 224 }).png().toFile(out);
  console.log(out);
}

// Before the switch: the Grunt stands under the poster, and the corner where the stairs will be is plain wall and
// floor (the two tiles to its left, copied across — the wallpaper and the floor repeat every two tiles).
const noStairs = [256, 0, 32, 51, 224, 0, I];
const noGrunt = [176, 16, 16, 32, 176, 16, E];
await room([noStairs], resolve(CORNER, 'room.png'));
// After it: the Grunt's two tiles are the empty room's, and the stairs stand where they always were.
await room([noGrunt], resolve(CORNER, 'room-open.png'));
// Shut: back up the stairs, the door locked — the Grunt still gone, and the corner under the hatch plain floor.
await room([noStairs, noGrunt], resolve(CORNER, 'room-shut.png'));

// The Hideout: the entrance room's back wall with a vent, a floor tile, and the stairs up to the Game Corner.
const cut = (x, y, w, h, name) => sharp(hideout).extract({ left: x, top: y, width: w, height: h }).png().toFile(resolve(MARKET, name)).then(() => console.log(name));
await cut(208, 8, 48, 24, 'wall.png');
await cut(192, 176, 16, 16, 'floor.png');
await cut(159, 10, 36, 52, 'stairs.png');
