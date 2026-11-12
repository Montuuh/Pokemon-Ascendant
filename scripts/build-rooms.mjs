// The FRLG interiors, recomposed from the games' own metatiles (pret/pokefirered, rendered by scripts/lib/frlg-map.mjs):
// each room is the real interior it is named after, furnished for what the room does here, and peopled. Black Market
// has its own script (scripts/build-black-market-art.mjs). node scripts/build-rooms.mjs [room…] [--fetch]
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { colours, gridPiece, piece, pretTree, room, sprite } from './lib/frlg-room.mjs';
import { buildHub } from './lib/hub-places.mjs';

const root = resolve(import.meta.dirname, '..');
const src = pretTree(resolve(root, 'public/art/black-market/sources/pret'), process.argv.includes('--fetch'));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
/** An overworld person or Pokémon, frame 0 south, 1 north, 2 west (east is 2 mirrored). */
const people = (name, frame = 0) =>
  sprite(src, `graphics/object_events/pics/people/${name}.png`, undefined, undefined, frame);
const mon = (name, frame = 0) =>
  sprite(src, `graphics/object_events/pics/pokemon/${name}.png`, undefined, undefined, frame);
const manifests = {};
async function manifest(dir, record) {
  await writeFile(
    resolve(dir, 'manifest.json'),
    `${JSON.stringify({ rights: 'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Tiles, maps and sprites: pret/pokefirered.', script: 'scripts/build-rooms.mjs', resampling: 'none', ...record, sources: src.sources() }, null, 2)}\n`,
  );
}

// ── The Pokémon Center ──────────────────────────────────────────────────────────────────────────────────────────
// PokemonCenter_1F's own counter, machine, PC and lounge, widened to a 19 × 14 room: the Therapy corner on the
// player's-room green rug with two beds and Chansey at work, the PC Box at its terminal, the grooming lounge with a
// Pikachu being brushed, plants and the floor's Poké Ball leading to the door.
manifests.center = async () => {
  const r = await room(src, { cols: 19, rows: 14, fill: 641, tilesetsOf: 'PokemonCenter_1F', keyBlack: true });
  const W = 19;
  // Walls: the border row, the face, the shadow row; the diagonal corners and the void row with the door mat.
  r.fill(1, 0, W - 2, 1, 644);
  r.fill(1, 1, W - 2, 1, 652);
  r.fill(1, 2, W - 2, 1, 643);
  r.paste([[672], [680], [688]], 0, 0);
  r.paste([[678], [686], [694], [702]], W - 1, 0);
  for (let g = 3; g < 12; g++) r.set(0, g, 696);
  r.set(0, 12, 673);
  r.set(W - 1, 12, 674);
  r.fill(0, 13, W, 1, 8);
  r.paste([[26, 27, 28]], 8, 13);
  // The magazine shelf and the plant in the north-west corner, the counter, the PC, the map poster (PokemonCenter_1F).
  await r.lift('PokemonCenter_1F', 1, 0, 3, 3, 1, 0);
  await r.lift('PokemonCenter_1F', 4, 0, 7, 5, 6, 0);
  await r.lift('PokemonCenter_1F', 11, 0, 1, 5, 13, 0);
  await r.lift('PokemonCenter_1F', 12, 0, 2, 3, 15, 0);
  // The floor's Poké Ball, leading to the door.
  await r.lift('PokemonCenter_1F', 6, 5, 3, 4, 8, 9);
  // The grooming lounge: the glass table and its stools (PokemonCenter_1F, east). Only one: a second, identical set
  // would read as a second door that does not open.
  await r.lift('PokemonCenter_1F', 11, 5, 3, 4, 14, 5);
  // Waiting seats along the east side, without a table (One Island's row of stools), and a woman waiting on one.
  r.paste([[757, 765, 757]], 14, 11);
  // The Therapy corner: the green rug from the player's room (primary metatiles), five by four.
  const rug = [
    [67, 68, 68, 68, 70],
    [83, 69, 69, 69, 86],
    [83, 69, 69, 69, 86],
    [91, 92, 92, 92, 94],
  ];
  const parquet = await colours(src, 'PalletTown_PlayersHouse_2F', [32, 128, 128, 16]);
  r.put(await gridPiece(src, 'PalletTown_PlayersHouse_2F', rug, parquet), 16, 80, 'rug');
  // Plants: either side of the counter's ends and by the door (PokemonCenter_2F's pot).
  for (const [c, g] of [
    [5, 3],
    [13, 5],
    [1, 10],
    [6, 11],
    [17, 3],
  ])
    r.paste([[768], [769]], c, g);
  // Beds from the player's room (PalletTown_PlayersHouse_2F), the parquet keyed out.
  const bed = await piece(src, 'PalletTown_PlayersHouse_2F', [24, 72, 32, 44], parquet);
  r.put(bed, 20, 80, 'bed');
  r.put(bed, 52, 80, 'bed');
  // Chansey tends the Therapy beds; a Pikachu waits at the grooming table with a girl; a man reads by the shelf.
  r.put(await mon('chansey'), 80, 98, 'chansey');
  r.put(await mon('pikachu'), 250, 102, 'pikachu');
  r.put(await people('little_girl', 2), 262, 94, 'little_girl');
  r.put(await people('old_man_1', 1), 40, 30, 'old_man_1');
  r.put(await people('woman_3', 0), 240, 158, 'woman_3');
  const out = resolve(root, 'public/art/center');
  await mkdir(out, { recursive: true });
  const record = await r.write(resolve(out, 'room.png'));
  await manifest(out, { room: 'center', output: record, used: r.used });
};

// ── The Poké Mart and the Department Store ───────────────────────────────────────────────────────────────────────
// The real Mart and the Celadon floors, re-rendered from pret (their floor plans are the screen's shelves), each
// stocked with what its shelves sell, one prop to one service in every room (fossils, amber and gems on relic glass,
// Poké Balls on held-item shelves), and customers at every section.
// The floors that reuse another floor's plan are mirrored pixel for pixel, and then wear their own number sign.
const misc = (name) => sprite(src, `graphics/object_events/pics/misc/${name}.png`);
const flop = async (bytes) => (await import('sharp')).default(bytes).flop().png().toBuffer();
async function martRoom(base, { label, mirror = false, height, decor }) {
  const r = await room(src, { base, keyBlack: true });
  if (label) r.set(6, 2, label);
  const out = resolve(root, 'public/art/mart');
  await mkdir(out, { recursive: true });
  return { r, out, mirror, height, decor };
}
async function finishMart({ r, out, mirror, height, decor }, file) {
  const sharp = (await import('sharp')).default;
  const tmp = resolve(out, `.${file}`);
  const rec = await r.write(tmp);
  let img = sharp(tmp);
  if (mirror) {
    // Mirror the floor, then put its own number sign back the right way round (the sign sits on the axis).
    const flipped = await img.flop().png().toBuffer();
    const sign = await sharp(tmp).extract({ left: 80, top: 32, width: 48, height: 16 }).png().toBuffer();
    img = sharp(
      await sharp(flipped)
        .composite([{ input: sign, left: 80, top: 32 }])
        .png()
        .toBuffer(),
    );
  }
  const layers = [];
  for (const d of decor)
    layers.push({ input: d.flip ? await flop(await d.img) : await d.img, left: d.x, top: d.y });
  const { data, info } = await sharp(await img.composite(layers).png().toBuffer())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const h = height ?? info.height;
  const bytes = await sharp(data, { raw: info })
    .extract({ left: 0, top: 0, width: info.width, height: h })
    .png({ palette: true, colours: 256, dither: 0 })
    .toBuffer();
  await (await import('node:fs/promises')).writeFile(resolve(out, file), bytes);
  await (await import('node:fs/promises')).rm(tmp);
  return {
    file,
    width: info.width,
    height: h,
    mirror,
    decor: decor.map((d) => ({ what: d.what, at: [d.x, d.y] })),
    grid: rec.grid,
  };
}
manifests.mart = async () => {
  const D = (what, img, x, y, flip = false) => ({ what, img, x, y, flip });
  const files = [];
  const m = await martRoom('Mart', {
    height: 132,
    decor: [
      D('old_amber', misc('old_amber'), 18, 88),
      D('fossil', misc('fossil'), 32, 90),
      D('item_ball', misc('item_ball'), 114, 56),
      D('item_ball', misc('item_ball'), 128, 56),
      D('lass', people('lass', 2), 144, 62, true),
      D('youngster', people('youngster', 2), 92, 68),
    ],
  });
  files.push(await finishMart(m, 'mart.png'));
  const floors = [
    [
      'floor-1.png',
      'CeladonCity_DepartmentStore_5F',
      661,
      false,
      [
        D('woman_1', people('woman_1', 2), 144, 128),
        D('old_man_2', people('old_man_2', 2), 96, 184),
        D('scientist', people('scientist', 0), 64, 128),
      ],
    ],
    [
      'floor-2.png',
      'CeladonCity_DepartmentStore_2F',
      null,
      false,
      [
        D('cooltrainer_m', people('cooltrainer_m', 2), 144, 132),
        D('youngster', people('youngster', 2), 72, 172),
        D('poke_maniac', people('poke_maniac', 2), 144, 196, true),
      ],
    ],
    [
      'floor-3.png',
      'CeladonCity_DepartmentStore_4F',
      657,
      true,
      [
        D('item_ball', misc('item_ball'), 88, 102),
        D('item_ball', misc('item_ball'), 104, 134),
        D('little_girl', people('little_girl', 2), 136, 142),
        D('beauty', people('beauty', 2), 64, 120),
      ],
    ],
    [
      'floor-4.png',
      'CeladonCity_DepartmentStore_4F',
      null,
      false,
      [
        D('old_amber', misc('old_amber'), 88, 104),
        D('fossil', misc('fossil'), 104, 104),
        D('ruby', misc('ruby'), 152, 136),
        D('sapphire', misc('sapphire'), 168, 136),
        D('gentleman', people('gentleman', 1), 112, 156),
        D('poke_maniac', people('poke_maniac', 2), 48, 128, true),
      ],
    ],
    [
      'floor-5.png',
      'CeladonCity_DepartmentStore_2F',
      659,
      true,
      [
        D('ruby', misc('ruby'), 152, 168),
        D('sapphire', misc('sapphire'), 168, 200),
        D('rich_boy', people('rich_boy', 2), 48, 140, true),
        D('beauty', people('beauty', 2), 48, 196),
      ],
    ],
  ];
  for (const [file, base, label, mirror, decor] of floors)
    files.push(await finishMart(await martRoom(base, { label, mirror, decor }), file));
  await manifest(resolve(root, 'public/art/mart'), { room: 'mart', outputs: files });
};

// ── The Dojo ────────────────────────────────────────────────────────────────────────────────────────────────
// Saffron's Fighting Dojo from pret, with its people where the map's object events put them (the master on his dais,
// four Black Belts facing in, the two Poké Balls of his prize Pokémon) and the Dojo's own Fighting types at work: a
// Machop sparring with the west pupil, a Machoke with the east, a Poliwrath by the east statue. The practice props
// (scripts/build-dojo-props.mjs) are laid on top as before.
manifests.dojo = async () => {
  const sharp = (await import('sharp')).default;
  const r = await room(src, { base: 'SaffronCity_Dojo', keyBlack: true });
  // An object event at tile (x, y) stands with its feet on that tile.
  const at = (x, y, h = 32) => [x * 16, y * 16 + 16 - h];
  r.put(await misc('item_ball'), 80, 48, 'item_ball');
  r.put(await misc('item_ball'), 112, 48, 'item_ball');
  r.put(await people('black_belt', 0), ...at(6, 5), 'master');
  r.put(await flop(await people('black_belt', 2)), ...at(1, 8), 'black_belt');
  r.put(await flop(await people('black_belt', 2)), ...at(1, 10), 'black_belt');
  r.put(await people('black_belt', 2), ...at(11, 8), 'black_belt');
  r.put(await people('black_belt', 2), ...at(11, 10), 'black_belt');
  r.put(await mon('machop', 2), ...at(2, 10, 16), 'machop');
  r.put(await flop(await mon('machoke', 2)), ...at(10, 8, 16), 'machoke');
  r.put(await mon('poliwrath', 2), ...at(10, 12, 16), 'poliwrath');
  const out = resolve(root, 'public/art/dojo');
  const record = await r.write(resolve(out, 'room.png'));
  const fs = await import('node:fs/promises');
  const base = await fs.readFile(resolve(out, 'room.png'));
  const training = await sharp(base)
    .composite([
      { input: resolve(out, 'equipment.png'), left: 28, top: 64 },
      { input: resolve(out, 'scroll-rack.png'), left: 148, top: 64 },
      { input: resolve(out, 'platform.png'), left: 64, top: 176 },
      { input: resolve(out, 'cushion.png'), left: 108, top: 128 },
    ])
    .png({ palette: true, colours: 256, dither: 0 })
    .toBuffer();
  await fs.writeFile(resolve(out, 'training-room.png'), training);
  await manifest(out, {
    room: 'dojo',
    output: { ...record, file: 'room.png' },
    training: 'training-room.png = room.png + the practice props at their spots',
    used: r.used,
  });
};

// ── The Game Corner ─────────────────────────────────────────────────────────────────────────────────────────────
// Celadon's Game Corner from pret with its regulars where the map's object events put them, in three states the room
// screen swaps: the poster guarded by the Grunt (`room`), the switch pushed and the stairs revealed by the map script's
// own metatiles (`room-open`), and back up the stairs with them covered again (`room-shut`, the hatch is the screen's).
// Two of the prize corner's Pokémon sit on show on the counter.
manifests['game-corner'] = async () => {
  const out = resolve(root, 'public/art/game-corner');
  const files = [];
  // data/maps/CeladonCity_GameCorner/scripts.inc: the floor over the stairs, and the stairs.
  const CLOSED = [
    [15, 2, 0x292],
    [16, 2, 0x292],
    [17, 2, 0x292],
    [16, 3, 0x2cf],
    [17, 3, 0x2cf],
  ];
  const OPEN = [
    [15, 2, 0x29d],
    [16, 2, 0x29e],
    [17, 2, 0x29f],
    [16, 3, 0x2a6],
    [17, 3, 0x2a7],
  ];
  const regulars = [
    ['worker_f', 4, 2, 0],
    ['worker_m', 6, 2, 0],
    ['balding_man', 1, 6, 2],
    ['woman_2', 1, 8, 2],
    ['fisher', 4, 7, 2, true],
    ['gym_guy', 7, 10, 2],
    ['woman_1', 7, 8, 2],
    ['old_man_2', 10, 9, 2, true],
    ['scientist', 13, 7, 2],
    ['gentleman', 16, 10, 2, true],
  ];
  for (const [file, tiles, grunt] of [
    ['room.png', CLOSED, true],
    ['room-open.png', OPEN, false],
    ['room-shut.png', CLOSED, false],
  ]) {
    const r = await room(src, { base: 'CeladonCity_GameCorner' });
    for (const [c, g, id] of tiles) r.set(c, g, id);
    for (const [name, x, y, frame, east] of regulars) {
      const img = await people(name, frame);
      r.put(east ? await flop(img) : img, x * 16, y * 16 - 16, name);
    }
    if (grunt) r.put(await people('rocket_m', 1), 11 * 16, 2 * 16 - 16, 'rocket_m');
    r.put(await mon('clefairy', 0), 40, 26, 'clefairy');
    r.put(await mon('pikachu', 0), 136, 26, 'pikachu');
    const rec = await r.write(resolve(out, file), { x: 0, y: 0, w: 288, h: 224 });
    files.push({ file, ...rec });
  }
  await manifest(out, { room: 'game-corner', outputs: files });
};

// ── The Trainer Hub ─────────────────────────────────────────────────────────────────────────────────────────────
// §8.4, the Road to the Plateau: the player's bedroom, Professor Oak's Lab, Viridian City's Pokémon Center, the Indigo
// Plateau's Pokémon Center and the Hall of Fame, each from pret, with the silhouette of every feature a career has yet
// to earn and the layout table the screen reads (scripts/lib/hub-places.mjs).
manifests.hub = async () => {
  const misc = (name) => sprite(src, `graphics/object_events/pics/misc/${name}.png`);
  await buildHub({ src, root, people, misc, manifest });
};

for (const [name, build] of Object.entries(manifests))
  if (!wanted.length || wanted.includes(name)) await build();
console.log(`Built ${wanted.length ? wanted.join(', ') : Object.keys(manifests).join(', ')}.`);
