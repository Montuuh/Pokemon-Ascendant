#!/usr/bin/env node
// §2.5.4 — the route's terrain, cut from the real thing.
//
// The Region map is painted from tiles (src/ui/screens/map/terrain.ts says what each tile is, tileset.ts how it is
// drawn). Every tile here is FireRed / LeafGreen's own, cut on its 16-px grid from the full map renders on the
// Bulbagarden Archives — Route 1's grass and sand, Viridian Forest's canopy, Mt. Moon's floor, Route 24's water
// and Nugget Bridge, and so on — so nothing is redrawn ("fetch an object", docs/art/pipeline.md). A few pieces the
// maps never draw (a pond's bottom rim, a bridge that runs east–west) are the drawn ones turned over or round, as
// the Safari board's are.
//
// Usage: npm run art:route [-- --force]   → public/art/route/<terrain>/<piece>.png (native size; drawn pixelated)
//        and playtest/artgen/emblem-wild-<biome>.png — each Wild biome's map badge, a 2 × 2 patch of its own
//        terrain, mounted on the badge disc with `install-art badge … node-wild-<biome>`.
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/route');
const force = process.argv.includes('--force');
const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.8 (non-commercial fan project; art pipeline)';
const T = 16;

/** The maps the tiles are cut from (Bulbagarden Archives file titles). */
const SOURCES = {
  route1: 'File:Kanto Route 1 FRLG.png',
  route24: 'File:Kanto Route 24 FRLG.png',
  route19: 'File:Kanto Route 19 FRLG.png',
  forest: 'File:Viridian Forest FRLG.png',
  moon: 'File:Mt Moon 1F FRLG.png',
  rocktunnel: 'File:Rock Tunnel 1F FRLG.png',
  seafoam: 'File:Seafoam Islands B3F FRLG.png',
  plant: 'File:Power Plant interior FRLG.png',
  ruby: 'File:Ruby Path B3F FRLG.png',
  ember: 'File:Mt Ember FRLG.png',
  kindle: 'File:Kindle Road FRLG.png',
  tower: 'File:Pokémon Tower 3F FRLG.png',
};

/**
 * Each terrain's pieces: `[source, x, y, w?, h?, transform?]` on the 16-px grid. The names are the ones tileset.ts
 * reads: `ground*`, `deco*`, `tall`, `path` (a plain floor) or `path-<c|n|s|e|w|nw|ne|sw|se|ine|inw|ise|isw>` (a
 * sand road with its grass fringe), `fill-block` (scenery that tiles as a block — a tree wall, a canopy), `fill*`
 * (scenery one tile at a time — rocks, graves) or `water-*` (scenery that is water, with its rim).
 */
const SAND_ROUTE1 = {
  'path-c': ['route1', 11, 1], 'path-n': ['route1', 5, 29], 'path-s': ['route1', 15, 4], 'path-w': ['route1', 10, 1],
  'path-e': ['route1', 13, 1], 'path-nw': ['route1', 2, 29], 'path-ne': ['route1', 21, 3], 'path-se': ['route1', 21, 5],
  'path-sw': ['route1', 10, 4], 'path-ine': ['route1', 13, 3], 'path-isw': ['route1', 18, 4],
  'path-inw': ['route1', 13, 3, 1, 1, 'flop'], 'path-ise': ['route1', 18, 4, 1, 1, 'flop'],
};
const WATER_ROUTE24 = {
  'water-c': ['route24', 7, 18], 'water-n': ['route24', 7, 16], 'water-w': ['route24', 6, 17], 'water-e': ['route24', 8, 17],
  'water-nw': ['route24', 6, 16], 'water-ne': ['route24', 8, 16],
  'water-s': ['route24', 7, 16, 1, 1, 'flip'], 'water-sw': ['route24', 6, 16, 1, 1, 'flip'], 'water-se': ['route24', 8, 16, 1, 1, 'flip'],
};
const GRASS_ROUTE1 = { ground: ['route1', 7, 23], 'ground-2': ['route1', 3, 2], deco: ['route1', 3, 6] };

const TERRAINS = {
  route: { ...GRASS_ROUTE1, ...SAND_ROUTE1, tree: ['route1', 2, 24, 2, 3, 'key', ['route1', [[7, 23], [3, 2]]]], tall: ['route1', 10, 6] },
  meadow: { ...GRASS_ROUTE1, ...SAND_ROUTE1, fill: ['route1', 3, 6], 'fill-2': ['route24', 3, 19], 'fill-3': ['route1', 2, 7], tall: ['route24', 3, 19] },
  lake: { ...GRASS_ROUTE1, ...SAND_ROUTE1, ...WATER_ROUTE24, tall: ['route24', 3, 19] },
  forest: {
    ground: ['forest', 19, 5], 'ground-2': ['forest', 4, 12], tall: ['forest', 4, 14],
    'path-c': ['forest', 16, 7], 'path-n': ['forest', 15, 6], 'path-s': ['forest', 13, 10], 'path-w': ['forest', 12, 8],
    'path-e': ['forest', 22, 8], 'path-nw': ['forest', 12, 6], 'path-ne': ['forest', 22, 6], 'path-se': ['forest', 14, 10],
    'path-sw': ['forest', 12, 10], 'path-ise': ['forest', 14, 8], 'path-isw': ['forest', 20, 8],
    'path-ine': ['forest', 20, 8, 1, 1, 'flip'], 'path-inw': ['forest', 14, 8, 1, 1, 'flip'],
    tree: ['forest', 28, 54, 3, 4, 'key', ['forest', [[19, 5], [4, 12], [28, 52], [29, 53], [31, 57]]]],
  },
  cave: { ground: ['moon', 8, 7], 'ground-2': ['moon', 6, 8], path: ['moon', 3, 3], fill: ['moon', 11, 2], 'fill-2': ['moon', 12, 2], 'fill-3': ['moon', 12, 3] },
  // Seafoam's ice: the cave floor, a white snow road through it, and its ice boulders.
  // (9,18) is one of Seafoam's holes, not floor: the second floor is (10,16).
  'ice-cave': { ground: ['seafoam', 8, 17], 'ground-2': ['seafoam', 10, 16], path: ['seafoam', 5, 22], fill: ['seafoam', 13, 18], 'fill-2': ['seafoam', 7, 17], 'fill-3': ['seafoam', 11, 16] },
  // The Poison lane's cave is Rock Tunnel: its cobbled floor and grey boulders, with Mt. Moon's sand for a road that
  // reads against the olive (Rock Tunnel's own worn track is olive on olive).
  'dank-cave': { ground: ['rocktunnel', 10, 16], 'ground-2': ['rocktunnel', 19, 13], path: ['moon', 3, 3], fill: ['rocktunnel', 24, 14], 'fill-2': ['rocktunnel', 25, 15], 'fill-3': ['rocktunnel', 27, 15] },
  // The Power Plant: its floor, the steel grating by its doors for the road, and the rubble piled in its rooms.
  plant: { ground: ['plant', 15, 5], 'ground-2': ['plant', 15, 4], path: ['plant', 3, 37], fill: ['plant', 36, 3], 'fill-2': ['plant', 37, 4], 'fill-3': ['plant', 44, 3] },
  // Ruby Path, inside Mt. Ember: red rock, the moss floor between it, its boulders, and ash.
  volcano: { ground: ['ruby', 8, 8], 'ground-2': ['ruby', 7, 0], path: ['ruby', 10, 3], fill: ['ruby', 7, 4], 'fill-2': ['ruby', 10, 5], 'fill-3': ['ruby', 9, 3] },
  // A tower's grounds: grass, the tower's own floor as the walkways, and its graves.
  tower: { ...GRASS_ROUTE1, path: ['tower', 6, 7], fill: ['tower', 4, 6], 'fill-2': ['tower', 8, 9], 'fill-3': ['tower', 14, 9] },
  // Region 2's cliff coast: grass, a sand road, and water with Route 24's rim, Kindle Road's sea rocks in it.
  coast: {
    ...GRASS_ROUTE1, ...SAND_ROUTE1, tall: ['route24', 3, 19],
    ...WATER_ROUTE24,
    'water-rock': ['route19', 88, 152, 16, 16, 'keypx', ['route19', [[2, 12], [1, 11], [3, 14], [7, 10], [0, 9]]]],
  },
  // Region 3's highland: Mt. Ember's slopes — its grass, a sand road, its boulders and its tall grass.
  highland: { ground: ['ember', 13, 37], 'ground-2': ['ember', 10, 40], deco: ['route1', 3, 6], ...SAND_ROUTE1, tall: ['ember', 7, 40], fill: ['ember', 7, 32], 'fill-2': ['ember', 11, 39], 'fill-3': ['ember', 6, 35] },
};

/** §2.5.4 — the point of no return: Route 24's water, and Nugget Bridge turned to run east–west. */
const RIVER = {
  ...WATER_ROUTE24,
  bridge: ['route24', 11, 30, 1, 1, 'rot'],
  'bridge-n': ['route24', 10, 30, 1, 1, 'rot'],
  'bridge-s': ['route24', 10, 30, 1, 1, 'rotflip'],
};

function download(title) {
  const json = execFileSync('curl', ['-s', '-L', '-A', UA, `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`], { encoding: 'utf8' });
  const info = Object.values(JSON.parse(json).query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`not on the Archives: ${title}`);
  return execFileSync('curl', ['-s', '-L', '-A', UA, info.url], { maxBuffer: 1 << 28 });
}

const exists = async (p) => access(p).then(() => true, () => false);
if (!force && (await exists(resolve(OUT, 'route/path-c.png')))) {
  console.log('skip: public/art/route is installed (--force to redo)');
  process.exit(0);
}

const maps = {};
const need = new Set([...Object.values(TERRAINS).flatMap((t) => Object.values(t).map((p) => p[0])), ...Object.values(RIVER).map((p) => p[0])]);
for (const key of need) {
  maps[key] = download(SOURCES[key]);
  console.log(`fetched ${SOURCES[key]}`);
}

/**
 * A sprite with its ground keyed out: every pixel whose colour appears in the given ground tiles turns transparent.
 * The FRLG tree is drawn on grass; keyed, it can stand on any ground and overlap the tree above it, as trees do in
 * the games' woods. The tree's own shadow and outline are colours the grass never uses, so they stay.
 */
async function keyed(src, x, y, w, h, [groundSrc, grounds], px = false) {
  const palette = new Set();
  for (const [gx, gy] of grounds) {
    const { data } = await sharp(maps[groundSrc]).extract({ left: gx * T, top: gy * T, width: T, height: T }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) palette.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
  }
  const box = px ? { left: x, top: y, width: w, height: h } : { left: x * T, top: y * T, width: w * T, height: h * T };
  const { data, info } = await sharp(maps[src]).extract(box).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (palette.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) data[i + 3] = 0;
  // Viridian's lone tree has a Bug Catcher's hat poking into its last rows: anything warm and bright down there goes.
  for (let i = (info.height - 6) * info.width * 4; i < data.length; i += 4) if (data[i] > 180 && data[i] > data[i + 1]) data[i + 3] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

async function cut([src, x, y, w = 1, h = 1, how, extra]) {
  if (how === 'key') return keyed(src, x, y, w, h, extra);
  if (how === 'keypx') return keyed(src, x, y, w, h, extra, true);
  let img = sharp(maps[src]).extract({ left: x * T, top: y * T, width: w * T, height: h * T });
  if (how === 'flip') img = sharp(await img.png().toBuffer()).flip();
  if (how === 'flop') img = sharp(await img.png().toBuffer()).flop();
  if (how === 'rot') img = sharp(await img.png().toBuffer()).rotate(90);
  if (how === 'flipflop') img = sharp(await img.png().toBuffer()).flip().flop();
  if (how === 'rotflip') img = sharp(await sharp(await img.png().toBuffer()).rotate(90).png().toBuffer()).flip();
  return img.png();
}

for (const [terrain, pieces] of [...Object.entries(TERRAINS), ['river', RIVER]]) {
  await mkdir(resolve(OUT, terrain), { recursive: true });
  for (const [name, spec] of Object.entries(pieces)) await writeFile(resolve(OUT, terrain, `${name}.png`), await (await cut(spec)).toBuffer());
  console.log(`cut ${terrain}: ${Object.keys(pieces).length} pieces`);
}

// §9.4.1 — a Wild node wears its biome's emblem: a 2 × 2 patch of the terrain it is found in, cut from the tiles
// above, so the badge and the ground under it are the same pixels.
const EMBLEMS = {
  meadow: [['route', 'tall'], ['route', 'tall'], ['route', 'tall'], ['route', 'tall']],
  cave: [['cave', 'fill'], ['cave', 'fill-2'], ['cave', 'ground'], ['cave', 'fill-3']],
  river: [['lake', 'water-nw'], ['lake', 'water-ne'], ['lake', 'water-sw'], ['lake', 'water-se']],
  sea: [['coast', 'water-c'], ['coast', 'water-c'], ['coast', 'water-rock'], ['coast', 'water-c']],
  'power-plant': [['plant', 'fill'], ['plant', 'fill-2'], ['plant', 'fill-3'], ['plant', 'ground']],
  volcano: [['volcano', 'ground'], ['volcano', 'fill'], ['volcano', 'fill-2'], ['volcano', 'ground']],
  sky: [['highland', 'tall'], ['highland', 'fill'], ['highland', 'fill-2'], ['highland', 'tall']],
  tower: [['tower', 'fill'], ['tower', 'fill-2'], ['tower', 'ground'], ['tower', 'fill-3']],
};
const ART = resolve(ROOT, 'playtest/artgen');
await mkdir(ART, { recursive: true });
for (const [biome, quad] of Object.entries(EMBLEMS)) {
  const tiles = quad.map(([t, piece]) => resolve(OUT, t, `${piece}.png`));
  await sharp({ create: { width: 2 * T, height: 2 * T, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(tiles.map((input, i) => ({ input, left: (i % 2) * T, top: Math.floor(i / 2) * T })))
    .png()
    .toFile(resolve(ART, `emblem-wild-${biome}.png`));
}
console.log(`emblems: ${Object.keys(EMBLEMS).length} → playtest/artgen/emblem-wild-*.png (install-art badge … node-wild-<biome>)`);
