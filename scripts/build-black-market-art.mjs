// A18 / §2.11.6 — Team Rocket's Black Market: the Hideout's open-plan office floor and, behind its own wall, the
// Executive's private office. node scripts/build-black-market-art.mjs [--fetch]
//
// Every tile is FireRed / LeafGreen's own, drawn from pret/pokefirered's tilesets by scripts/lib/frlg-map.mjs: the
// room is a grid of real metatiles (the Hideout's walls, floor, stairs and desks; the Rocket Warehouse's metal crates;
// Giovanni's B4F office with its Rocket machines, lifted whole as the Executive's), plus authentic pieces from two other
// tilesets (the Game Corner's stools, the Pokémon Mansion's statue plinths) and the series' own overworld sprites (the
// five Legendaries on show, Poké Balls). The only pixels drawn here are Team Rocket's red R — on wall banners and on
// the Executive's rug — in the Rocket Grunt sprite's own reds and blacks. Nothing is resampled.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { loadTileset, readLayout, renderGrid } from './lib/frlg-map.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/black-market');
const pret = resolve(out, 'sources/pret');
const commit = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982';
const RAW = `https://raw.githubusercontent.com/pret/pokefirered/${commit}`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = [];
const outputs = [];
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
/** A pret file, fetched once into sources/pret at the pinned commit. */
async function fetchPret(path) {
  const file = resolve(pret, path);
  if (process.argv.includes('--fetch') || !(await exists(file))) {
    const response = await fetch(`${RAW}/${path}`);
    if (!response.ok) throw new Error(`${response.status}: ${RAW}/${path}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await readFile(file);
  sources.push({ path: `pret/${path}`, url: `${RAW}/${path}`, sha256: sha(bytes) });
  return bytes;
}
async function tileset(dir, metaDir = dir) {
  await fetchPret(`data/tilesets/${dir}/tiles.png`);
  for (let i = 0; i < 16; i++)
    await fetchPret(`data/tilesets/${dir}/palettes/${String(i).padStart(2, '0')}.pal`);
  await fetchPret(`data/tilesets/${metaDir}/metatiles.bin`);
  return loadTileset(resolve(pret, 'data/tilesets', dir), resolve(pret, 'data/tilesets', metaDir));
}
const building = await tileset('primary/building');
// SilphCo (the Hideout, Silph Co. and the Rocket Warehouse) draws with the Condominiums' tiles and palettes.
const silph = await tileset('secondary/condominiums', 'secondary/silph_co');
const gameCorner = await tileset('secondary/game_corner');
const mansion = await tileset('secondary/pokemon_mansion');
const layout = async (name, width) => readLayout(await fetchPret(`data/layouts/${name}/map.bin`), width);
const raw = (img) =>
  sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 4 } });

// ── The people at the counters, and the things on show ─────────────────────────────────────────────────────────
/** An overworld sprite's first frame, its palette-zero backdrop keyed out. */
async function sprite(path, w, h) {
  const { data, info } = await sharp(await fetchPret(path))
    .extract({ left: 0, top: 0, width: w, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  for (let i = 0; i < data.length; i += 4)
    if (data[i] === r && data[i + 1] === g && data[i + 2] === b) data[i + 3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}
for (const [id, file] of [
  ['trader', 'rocket_f'],
  ['fence', 'rocket_m'],
  ['gambler', 'gentleman'],
  ['showcase', 'giovanni'],
]) {
  const bytes = await sprite(`graphics/object_events/pics/people/${file}.png`, 16, 32);
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ file: `${id}.png`, width: 16, height: 32, sha256: sha(bytes) });
}
const legend = {
  articuno: await sprite('graphics/object_events/pics/pokemon/articuno.png', 32, 32),
  zapdos: await sprite('graphics/object_events/pics/pokemon/zapdos.png', 32, 32),
  moltres: await sprite('graphics/object_events/pics/pokemon/moltres.png', 32, 32),
  mewtwo: await sprite('graphics/object_events/pics/pokemon/mewtwo.png', 16, 16),
  mew: await sprite('graphics/object_events/pics/pokemon/mew.png', 16, 16),
};
const ball = await sprite('graphics/object_events/pics/misc/item_ball.png', 16, 16);

// ── The map: a grid of real metatiles (16 px), column c, row g; row 0 is the void above the north wall ────────────
const COLS = 24;
const ROWS = 17;
const grid = Array.from({ length: ROWS }, (_, g) => Array.from({ length: COLS }, () => (g === 0 ? 8 : 641)));
const set = (c, g, id) => (grid[g][c] = id);
const paste = (rows, c, g) =>
  rows.forEach((row, dy) => row.forEach((id, dx) => id !== null && set(c + dx, g + dy, id)));
// The hall's walls: the north wall (border row, then the face), the west wall, the partition with the office.
for (let c = 1; c < 14; c++) {
  set(c, 1, 649);
  set(c, 2, 657);
  set(c, 3, 642);
}
for (const c of [6, 12]) set(c, 1, 650);
set(0, 1, 648);
set(14, 1, 652);
for (let g = 2; g < ROWS; g++) {
  set(0, g, 656);
  set(1, g, 642);
}
for (let g = 2; g < 12; g++) set(14, g, 660);
set(14, 12, 668);
for (let g = 13; g < ROWS; g++) set(23, g, 660);
// The office's south wall, seen from the hall, as B4F draws one room below another: the office's own bottom edge
// (row 12, pasted below), then the hall's border and face (rows 13–14), the doorway open through all three, and the
// floor's shadow row under the face.
for (let c = 14; c < 23; c++) {
  const door = c === 17 || c === 18;
  set(c, 13, door ? (c === 17 ? 642 : 641) : 649);
  set(c, 14, door ? (c === 17 ? 642 : 641) : 657);
  set(c, 15, 642);
}
set(23, 13, 652);
// The way up: the Hideout's own staircase, under its border (RocketHideout_B1F, cols 10–12, rows 0–4).
paste(
  [
    [620, 649, 649],
    [594, 595, 596],
    [602, 603, 604],
    [610, 611, 612],
    [642, 645, 646],
  ],
  1,
  1,
);
// The Fence's floor: two server cabinets on the wall and the desk with its terminal (RocketHideout_B1F, rows 14–17).
paste(
  [
    [774, 775],
    [782, 783],
  ],
  5,
  2,
);
paste(
  [
    [688, 689, 690, null],
    [699, 697, 708, 643],
    [707, 697, 698, 643],
    [704, 705, 706, 643],
  ],
  4,
  7,
);
set(3, 9, 739);
// The Trader's stock: the Rocket Warehouse's metal crates, racked on the wall and stacked on the floor, and two of
// the Hideout's cardboard crates (Warehouse rows 1–5; B1F col 7).
paste(
  [
    [1010, 1011, 1010, 1011],
    [1016, 1017, 1016, 1017],
    [645, 645, 645, 645],
  ],
  10,
  2,
);
paste(
  [
    [1008, 1009],
    [1016, 1017],
    [645, 646],
  ],
  12,
  5,
);
paste([[153], [153], [645]], 8, 3);
// A plant at each end of the floor.
paste([[768], [776]], 13, 9);
paste([[769], [777]], 1, 6);
// A second working desk in the middle of the floor, its stools either side (RocketHideout_B1F, rows 28–31).
paste(
  [
    [688, 689, 690, null],
    [814, 815, 698, 740],
    [696, 697, 708, 740],
    [704, 705, 706, 643],
  ],
  8,
  8,
);
set(7, 9, 739);
// The overflow of the Trader's stock, crated by the floor's south wall.
paste(
  [
    [1008, 1009, 1008, 1009],
    [1016, 1017, 1016, 1017],
  ],
  9,
  15,
);
// The Executive's office: Giovanni's own (RocketHideout_B4F, cols 15–23, rows 0–11) — the Rocket machines, the
// terminal, the plants and the desk — with the sofa taken out so he stands behind the desk, and the lower plants
// giving way to the plinths of the Legendaries on show.
const b4f = await layout('RocketHideout_B4F', 24);
paste(
  b4f.slice(0, 12).map((row) => row.slice(15, 24)),
  15,
  1,
);
for (const c of [18, 19, 20]) {
  set(c, 4, 641);
  set(c, 5, 641);
}
// The displays stand in the office's four corners of floor: its west plants, east plants and the stool make room.
for (const g of [5, 6, 7, 8]) {
  set(16, g, 642);
  set(22, g, 641);
}
set(21, 7, 641);
set(21, 8, 641);
// A plant either side of the office door, on the hall's side.
paste([[768], [776]], 16, 15);
paste([[768], [776]], 19, 15);

let room = raw(renderGrid(grid, building, silph));
const layers = [];
const put = (input, x, y) => layers.push({ input, left: x, top: y });

// ── Pieces from other FRLG tilesets, drawn with their own palettes ──────────────────────────────────────────────
/** A rectangle of one map, rendered with its tileset, its backdrop colours keyed out by the given floor colours. */
async function piece(name, width, ts, [x, y, w, h], keyRgb = []) {
  const img = renderGrid(await layout(name, width), building, ts);
  const { data, info } = await raw(img)
    .extract({ left: x, top: y, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4)
    if (keyRgb.some((c) => c.every((v, k) => data[i + k] === v))) data[i + 3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}
/** Every colour of a map's floor in a sample rectangle, to key it out of a piece lifted from that map. */
async function floorColours(name, width, ts, [x0, y0, w, h]) {
  const img = renderGrid(await layout(name, width), building, ts);
  const seen = new Map();
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      seen.set(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`, [
        img.data[i],
        img.data[i + 1],
        img.data[i + 2],
      ]);
    }
  return [...seen.values()];
}
// The Mansion's statue plinth (PokemonMansion_1F), below the statue's feet, its parquet keyed out.
const parquet = await floorColours('PokemonMansion_1F', 38, mansion, [100, 56, 16, 48]);
const plinth = await piece('PokemonMansion_1F', 38, mansion, [80, 85, 16, 12], parquet);
// Two of the Game Corner's stools for the Gambler's table (CeladonCity_GameCorner), its carpet keyed out.
const carpet = await floorColours('CeladonCity_GameCorner', 18, gameCorner, [32, 112, 32, 48]);
// The slot bank's shadow falls on the stool's west side: its oranges are keyed with the carpet.
const stool = await piece(
  'CeladonCity_GameCorner',
  18,
  gameCorner,
  [16, 92, 16, 20],
  [...carpet, [180, 98, 0], [197, 123, 0], [205, 139, 0]],
);
const roulette = await readFile(resolve(root, 'public/art/game-corner/roulette.png'));
sources.push({
  path: 'public/art/game-corner/roulette.png',
  url: 'docs/art/ATTRIBUTION.md',
  sha256: sha(roulette),
});

// ── Team Rocket's R, in the Rocket Grunt's own reds (graphics/trainers/front_pics/rocket_grunt_m_front_pic.png) ──
const INK = {
  k: [0, 0, 0],
  c: [57, 57, 74],
  g: [82, 82, 106],
  w: [205, 205, 222],
  r: [246, 106, 98],
  n: [213, 98, 90],
  m: [164, 74, 65],
};
const R_GLYPH = [
  'rrrrrrn.',
  'rr...rrn',
  'rr...rrn',
  'rr...rrn',
  'rrrrrrn.',
  'rr.rrm..',
  'rr..rrn.',
  'rr...rrn',
  'rr...rrn',
  'rr....rr',
];
function draw(w, h, paint) {
  const data = Buffer.alloc(w * h * 4);
  const px = (x, y, key) => {
    if (x < 0 || y < 0 || x >= w || y >= h || !INK[key]) return;
    const i = (y * w + x) * 4;
    data.set([...INK[key], 255], i);
  };
  paint(px);
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png()
    .toBuffer();
}
const glyph = (px, x0, y0, s = 1) =>
  R_GLYPH.forEach((row, y) =>
    [...row].forEach((k, x) => {
      if (k === '.') return;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) px(x0 + x * s + dx, y0 + y * s + dy, k);
    }),
  );
// A wall banner: a rod, a black cloth with a grey hem, a swallow-tail foot, the R.
const banner = await draw(16, 26, (px) => {
  for (let x = 0; x < 16; x++) {
    px(x, 0, 'k');
    px(x, 1, x === 0 || x === 15 ? 'k' : 'w');
    px(x, 2, 'k');
  }
  for (let y = 3; y < 26; y++)
    for (let x = 1; x < 15; x++) {
      const notch = y >= 22 && Math.abs(x - 7.5) < y - 21;
      if (notch) continue;
      const edge = x === 1 || x === 14 || y === 25 || (y >= 22 && Math.abs(x - 7.5) < y - 20);
      px(x, y, edge ? 'k' : x === 2 || x === 13 ? 'g' : 'c');
    }
  glyph(px, 4, 7);
});
for (const c of [3.5, 9]) put(banner, Math.round(c * 16) + 0, 18);
// The Executive's rug: black, a red double border, and the R drawn large at the room's own 1 px (not the banner's R
// doubled), shaded on its right edges as the banner's is.
const RUG_R = [
  'rrrrrrrrrrn...',
  'rrrrrrrrrrrn..',
  'rrr......rrrn.',
  'rrr.......rrn.',
  'rrr.......rrn.',
  'rrr.......rrn.',
  'rrr......rrrn.',
  'rrrrrrrrrrrn..',
  'rrrrrrrrrrn...',
  'rrr...rrrm....',
  'rrr....rrrn...',
  'rrr.....rrrn..',
  'rrr......rrrn.',
  'rrr.......rrrn',
  'rrr........rrr',
];
const rug = await draw(48, 48, (px) => {
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 48; x++) {
      const d = Math.min(x, y, 47 - x, 47 - y);
      px(x, y, d === 0 ? 'k' : d < 3 ? 'n' : d === 3 ? 'm' : d === 5 ? 'n' : 'c');
    }
  RUG_R.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && px(17 + x, 16 + y, k)));
});
put(rug, 18 * 16, 9 * 16);
// The Legendaries on show, on the Mansion's plinths either side of the office: the three birds and Mewtwo, with Mew
// on the Executive's desk beside a Poké Ball.
// Each bird spans two columns, so a plinth sits under its middle; the office is 7 columns wide inside.
const WEST = 16 * 16 + 8;
const EAST = 21 * 16 + 8;
for (const [x, y] of [
  [WEST, 8 * 16],
  [EAST, 8 * 16],
  [WEST, 11 * 16],
  [EAST, 11 * 16],
])
  put(plinth, x, y + 4);
put(legend.articuno, WEST - 8, 6 * 16 + 8);
put(legend.zapdos, EAST - 8, 6 * 16 + 8);
put(legend.moltres, WEST - 8, 9 * 16 + 8);
put(legend.mewtwo, EAST, 10 * 16 + 4);
put(legend.mew, 18 * 16 + 14, 6 * 16 + 2);
put(ball, 18 * 16 - 1, 6 * 16 + 4);
// The Trader's stock in Poké Balls, set on top of her crates (never on the floor, where FRLG puts a pickup).
for (const [x, y] of [
  [10 * 16 + 8, 2 * 16 + 2],
  [12 * 16 + 8, 2 * 16 + 2],
  [12 * 16, 15 * 16 - 2],
])
  put(ball, x, y);
// The Gambler's table in the hall's south-west corner.
put(roulette, 2 * 16, 13 * 16);
put(stool, 1 * 16, 13 * 16 + 4);
put(stool, 6 * 16, 13 * 16 + 4);

// ── Crop: inside the side walls (the frame is the border), from the void's last 8 px above the north wall ─────────
const CROP = { x: 16, y: 8, w: 22 * 16, h: ROWS * 16 - 8 };
const full = await room.composite(layers).png().toBuffer();
const bytes = await sharp(full)
  .extract({ left: CROP.x, top: CROP.y, width: CROP.w, height: CROP.h })
  .png({ palette: true, dither: 0 })
  .toBuffer();
await writeFile(resolve(out, 'room.png'), bytes);
outputs.push({ file: 'room.png', width: CROP.w, height: CROP.h, sha256: sha(bytes) });
await writeFile(
  resolve(out, 'room-manifest.json'),
  `${JSON.stringify(
    {
      description:
        "Black Market: the Rocket Hideout's office floor and the Executive's private office, composed from FRLG metatiles (pret/pokefirered), with the Legendaries on show and Team Rocket's R.",
      rights:
        'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Tiles, maps and sprites: pret/pokefirered.',
      processing: {
        script: 'scripts/build-black-market-art.mjs',
        renderer: 'scripts/lib/frlg-map.mjs',
        resampling: 'none',
        grid,
        crop: CROP,
        drawn: 'Team Rocket R on the banners and the rug, in rocket_grunt_m_front_pic.png colours',
        sharp: sharp.versions.sharp,
      },
      sources,
      outputs,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote the ${CROP.w}×${CROP.h} Black Market and four authentic FRLG people.`);
