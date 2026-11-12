// §8.4 — the Trainer Hub's places, the Road to the Plateau: the player's bedroom, Professor Oak's Lab, Viridian City's
// Pokémon Center, the Indigo Plateau's Pokémon Center and the Hall of Fame, each the real FRLG interior rendered from
// pret's metatiles and furnished for what the Hub does there. Called by scripts/build-rooms.mjs (`npm run art:hub`).
//
// One room image a place, every feature in it. A feature the account has not earned is drawn *over* the room as a
// silhouette: its own shape in one flat slate (`<place>/<feature>-locked.png`), so the screen needs no filter and a
// silhouette can never drift from the thing it hides (the props' silhouettes, a place each, are build-hub-props.mjs's). A feature a place can neither hold locked nor see arrive (Viridian, reached after every door's rank) gets none; the
// Lab's aide and Item Guide are never locked there, and keep theirs for the arrival, which lifts it. The four career props FRLG never drew (the Badge
// Case, the trophy, the League banner, the Ladder board) are separate sprites (scripts/build-hub-props.mjs).
//
// The geometry the screen needs — the room's size, each feature's boxes, where people stand — is written to
// src/ui/screens/hub/places.json, so the picture and its hit boxes come from one table: this file's.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { colours, gridPiece, piece, room, sha } from './frlg-room.mjs';
import { flatLock, lockTones } from './hub-lock.mjs';

const raw = async (input) => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const canvas = (w, h, layers) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();

/**
 * A feature's silhouette out of the finished room: the shape under `mask` in one flat slate (scripts/lib/hub-lock.mjs),
 * cropped to the mask's bounds. Returns the PNG and where it goes.
 */
async function silhouette(roomPng, mask, tones) {
  const { data, info } = await raw(roomPng);
  const on = (x, y) => mask[y * info.width + x] && data[(y * info.width + x) * 4 + 3];
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (on(x, y)) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  if (x1 < 0) throw new Error('an empty silhouette');
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = flatLock(w, h, (x, y) => on(x + x0, y + y0), tones);
  return { png: await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ palette: true, colours: 8, dither: 0 }).toBuffer(), at: [x0, y0, w, h] };
}

/** A mask of a sprite's own pixels, laid at a point of a `w × h` room. */
async function spriteMask(w, h, input, x, y, into = new Uint8Array(w * h)) {
  const { data, info } = await raw(input);
  for (let py = 0; py < info.height; py++)
    for (let px = 0; px < info.width; px++)
      if (data[(py * info.width + px) * 4 + 3] && x + px >= 0 && x + px < w && y + py >= 0 && y + py < h) into[(y + py) * w + x + px] = 1;
  return into;
}

/**
 * A mask of furniture the map drew itself: its boxes, less the floor that shows round it — every floor-coloured
 * pixel reachable from a box's edge, so a cream highlight inside the furniture is never a hole.
 */
async function furnitureMask(roomPng, boxes, floor, into) {
  const { data, info } = await raw(roomPng);
  const mask = into ?? new Uint8Array(info.width * info.height);
  const isFloor = (x, y) => {
    const i = (y * info.width + x) * 4;
    return floor.some((c) => c[0] === data[i] && c[1] === data[i + 1] && c[2] === data[i + 2]);
  };
  for (const [bx, by, bw, bh] of boxes) {
    const inside = (x, y) => x >= bx && x < bx + bw && y >= by && y < by + bh;
    const out = new Set();
    const stack = [];
    for (let x = bx; x < bx + bw; x++) stack.push([x, by], [x, by + bh - 1]);
    for (let y = by; y < by + bh; y++) stack.push([bx, y], [bx + bw - 1, y]);
    while (stack.length) {
      const [x, y] = stack.pop();
      const key = y * info.width + x;
      if (!inside(x, y) || out.has(key) || !isFloor(x, y)) continue;
      out.add(key);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) if (!out.has(y * info.width + x)) mask[y * info.width + x] = 1;
  }
  return mask;
}

export async function buildHub({ src, root, people, misc, manifest }) {
  const out = resolve(root, 'public/art/hub');
  const flop = async (bytes) => sharp(await bytes).flop().png().toBuffer();

  // ── Pieces the rooms share ─────────────────────────────────────────────────────────────────────────────────
  // The Poké Mart's corner where a room has no counter of its own: the Mart's glass counter (Mart, tiles 1–2 of
  // row 4), its clerk behind it.
  const martFloor = await colours(src, 'Mart', [64, 48, 48, 32]);
  const counter = await piece(src, 'Mart', [16, 64, 32, 24], martFloor);
  const clerk = await people('clerk');
  const martCorner = await canvas(32, 50, [{ input: clerk, left: 8, top: 0 }, { input: counter, left: 0, top: 26 }]);
  // The Trainer Kit's table: the Pokémon Center's glass table, a Poké Ball packed on it.
  const centerFloor = await colours(src, 'PokemonCenter_1F', [16, 64, 48, 16]);
  const glass = await gridPiece(src, 'PokemonCenter_1F', [[668, 669], [676, 677]], centerFloor);
  const ball = await misc('item_ball');
  const kitTable = await canvas(32, 32, [{ input: glass, left: 0, top: 0 }, { input: ball, left: 8, top: 1 }]);
  const aide = await people('scientist');
  // §8.4.6 — the Pokédex award, the one career prop the games did draw the parts of: their Pokédex on the plinth of
  // the Indigo Plateau's statues (the metatile under each statue, its floor keyed out).
  {
    const plateauFloor = await colours(src, 'IndigoPlateau_PokemonCenter_1F', [64, 96, 48, 16]);
    const plinth = await gridPiece(src, 'IndigoPlateau_PokemonCenter_1F', [[866]], plateauFloor);
    const dex = await canvas(16, 32, [{ input: plinth, left: 0, top: 16 }, { input: await misc('pokedex'), left: 0, top: 4 }]);
    // The object sprite outlines in pure black, the tiles and the other props in slate: the outline alone is
    // repainted, so the award stands in the room like the plinth under it.
    const { data, info } = await raw(dex);
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] && data[i] < 24 && data[i + 1] < 24 && data[i + 2] < 24) data.set([80, 80, 104], i);
    const props = resolve(out, 'props');
    await mkdir(props, { recursive: true });
    await writeFile(resolve(props, 'dex.png'), await sharp(data, { raw: info }).png({ palette: true, colours: 64, dither: 0 }).toBuffer());
  }
  const player = await people('red_normal', 1);

  const places = {};
  const records = [];

  /**
   * Writes one place: the room, each lockable feature's silhouette, and its row of the layout table.
   * `features[id] = { boxes, lock?: { sprites: [[png, x, y]…], furniture: boxes, solid: boxes } }`.
   */
  async function place(id, r, { crop, pad = 0, floor, features, ...layout }) {
    const dir = resolve(out, id);
    await mkdir(dir, { recursive: true });
    for (const old of await readdir(dir)) if (old.endsWith('-locked.png')) await rm(resolve(dir, old));
    const tmp = resolve(dir, '.room.png');
    const record = await r.write(tmp, crop);
    const bytes = pad
      ? await sharp(await readFile(tmp)).extend({ left: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ palette: true, colours: 256, dither: 0 }).toBuffer()
      : await readFile(tmp);
    await rm(tmp);
    await writeFile(resolve(dir, 'room.png'), bytes);
    const { width: w, height: h } = await sharp(bytes).metadata();
    // The floor's commonest colour: what this place's silhouettes are toned from (scripts/lib/hub-lock.mjs).
    let tone = null;
    if (floor) {
      const { data } = await raw(bytes);
      const seen = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (!data[i + 3] || !floor.some((c) => c[0] === data[i] && c[1] === data[i + 1] && c[2] === data[i + 2])) continue;
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const [top] = [...seen].sort((a, b) => b[1] - a[1])[0];
      tone = [top >> 16, (top >> 8) & 255, top & 255];
    }
    const table = {};
    const locks = [];
    for (const [fid, f] of Object.entries(features)) {
      table[fid] = { boxes: f.boxes };
      if (!f.lock) continue;
      let mask = new Uint8Array(w * h);
      for (const [png, x, y] of f.lock.sprites ?? []) mask = await spriteMask(w, h, png, x, y, mask);
      if (f.lock.furniture) mask = await furnitureMask(bytes, f.lock.furniture, floor, mask);
      // Furniture that encloses floor of its own (the Mart's L-shaped counter): the whole box.
      for (const [bx, by, bw, bh] of f.lock.solid ?? []) for (let y = by; y < by + bh; y++) mask.fill(1, y * w + bx, y * w + bx + bw);
      const s = await silhouette(bytes, mask, lockTones(tone));
      await writeFile(resolve(dir, `${fid}-locked.png`), s.png);
      table[fid].lock = s.at;
      locks.push({ file: `${id}/${fid}-locked.png`, at: s.at, sha256: sha(s.png) });
    }
    places[id] = { w, h, ...(tone ? { floor: tone } : {}), features: table, ...layout };
    records.push({ place: id, room: { file: `${id}/room.png`, width: w, height: h, colours: record.colours, sha256: sha(bytes) }, silhouettes: locks, used: r.used, grid: record.grid });
  }

  // ── The bedroom (run 0) ────────────────────────────────────────────────────────────────────────────────────
  // PalletTown_PlayersHouse_2F as the game drew it, less its black west column. The stairs are the way into a run,
  // the PC and its desk are the PC, the Trainer Card is the notice pinned to the wall, the bed is the way back to the title. Everything the road
  // will bring stands where it will be, as a silhouette.
  {
    const r = await room(src, { base: 'PalletTown_PlayersHouse_2F', keyBlack: true });
    const X = 16; // the crop's left edge, in the map's pixels
    const at = (x, y) => [x + X, y];
    r.put(player, ...at(104, 72), 'red_normal');
    r.put(aide, ...at(152, 58), 'scientist');
    r.put(martCorner, ...at(140, 92), 'mart corner');
    r.put(kitTable, ...at(100, 110), 'kit table');
    await place('bedroom', r, {
      crop: { x: X, y: 0, w: 176, h: 144 },
      floor: await colours(src, 'PalletTown_PlayersHouse_2F', [32, 128, 128, 16]),
      features: {
        run: { boxes: [[112, 20, 48, 42]] },
        card: { boxes: [[158, 8, 18, 18]] },
        pc: { boxes: [[0, 12, 32, 36]] },
        aide: { boxes: [[152, 58, 16, 32]], lock: { sprites: [[aide, 152, 58]] } },
        guide: { boxes: [[48, 8, 32, 34]], lock: { furniture: [[48, 8, 32, 34]] } },
        mart: { boxes: [[140, 92, 32, 50]], lock: { sprites: [[martCorner, 140, 92]] } },
        kit: { boxes: [[100, 110, 32, 32]], lock: { sprites: [[kitTable, 100, 110]] } },
        // The career has no row of its own: the banner and the board hang by the wall, the trophy stands by the
        // desk, the award by the stairs, the Badge Case at the foot of the rug.
        badges: { boxes: [[60, 110, 16, 32]] },
        trophies: { boxes: [[32, 48, 16, 32]] },
        dex: { boxes: [[128, 60, 16, 32]] },
        banner: { boxes: [[82, 16, 16, 32]] },
        ladder: { boxes: [[98, 16, 16, 32]] },
      },
      exit: [12, 76, 24, 38],
      name: 'bedroom',
      leaders: [],
      partners: [[122, 90, 16, 16], [86, 92, 16, 16]],
    });
  }

  // ── Professor Oak's Lab (from Rookie) ──────────────────────────────────────────────────────────────────────
  // PalletTown_ProfessorOaksLab with the Professor by his table, the three Poké Balls on it (the way into a run),
  // his aide at the machine, his books (the Item Guide), and room on the south floor for the Mart's corner and the
  // Kit table when the rank brings them.
  {
    const r = await room(src, { base: 'PalletTown_ProfessorOaksLab', keyBlack: true });
    const oak = await people('prof_oak');
    for (const x of [132, 148, 164]) r.put(ball, x, 58, 'item_ball');
    r.put(oak, 112, 30, 'prof_oak');
    r.put(aide, 64, 52, 'scientist');
    r.put(martCorner, 24, 140, 'mart corner');
    r.put(kitTable, 148, 156, 'kit table');
    r.put(player, 96, 152, 'red_normal');
    await place('lab', r, {
      floor: await colours(src, 'PalletTown_ProfessorOaksLab', [64, 96, 64, 16]),
      features: {
        run: { boxes: [[128, 56, 48, 40]] },
        card: { boxes: [[112, 30, 16, 32]] },
        pc: { boxes: [[32, 12, 32, 36]] },
        aide: { boxes: [[64, 52, 16, 32], [16, 44, 34, 48]], lock: { sprites: [[aide, 64, 52]] } },
        guide: { boxes: [[144, 12, 64, 34]], lock: { furniture: [[144, 12, 64, 32]] } },
        mart: { boxes: [[24, 140, 32, 50]], lock: { sprites: [[martCorner, 24, 140]] } },
        kit: { boxes: [[148, 156, 32, 32]], lock: { sprites: [[kitTable, 148, 156]] } },
        badges: { boxes: [[84, 80, 16, 32]] },
        trophies: { boxes: [[104, 80, 16, 32]] },
        dex: { boxes: [[88, 30, 16, 32]] },
        banner: { boxes: [[60, 80, 16, 32]] },
        ladder: { boxes: [[184, 62, 16, 32]] },
      },
      exit: [88, 194, 32, 16],
      leaders: [[72, 136, 16, 32], [120, 136, 16, 32], [60, 160, 16, 32], [132, 164, 16, 32], [184, 104, 16, 32], [8, 96, 16, 32]],
      partners: [[114, 168, 16, 16], [80, 168, 16, 16], [116, 150, 16, 16]],
    });
  }

  // ── Viridian City's Pokémon Center (from Ace) ──────────────────────────────────────────────────────────────
  // PokemonCenter_1F's own counter, machine, PC, shelf, poster, stairs and lounge, on a floor four tiles wider and
  // two deeper so the road's people have somewhere to stand. The nurse keeps the Trainer Card, the stairs lead out to
  // a run, the magazine shelf is the Item Guide, the lounge's glass table is the Kit's.
  {
    const W = 19, R = 12;
    const r = await room(src, { cols: W, rows: R, fill: 641, tilesetsOf: 'PokemonCenter_1F', keyBlack: true });
    r.fill(1, 0, W - 2, 1, 644);
    r.fill(1, 1, W - 2, 1, 652);
    r.fill(1, 2, W - 2, 1, 643);
    r.paste([[672], [680], [688]], 0, 0);
    r.paste([[678], [686], [694], [702]], W - 1, 0);
    for (let g = 3; g < R - 2; g++) r.set(0, g, 696);
    r.set(0, R - 2, 673);
    r.set(W - 1, R - 2, 674);
    r.fill(0, R - 1, W, 1, 8);
    r.paste([[706, 707, 708]], 8, R - 2);
    r.paste([[26, 27, 28]], 8, R - 1);
    await r.lift('PokemonCenter_1F', 1, 0, 3, 3, 1, 0);
    await r.lift('PokemonCenter_1F', 4, 0, 7, 5, 6, 0);
    await r.lift('PokemonCenter_1F', 11, 0, 1, 5, 13, 0);
    await r.lift('PokemonCenter_1F', 12, 0, 2, 3, 15, 0);
    await r.lift('PokemonCenter_1F', 6, 5, 3, 3, 8, 6);
    await r.lift('PokemonCenter_1F', 0, 5, 2, 3, 0, 5);
    await r.lift('PokemonCenter_1F', 11, 5, 3, 3, 15, 6);
    for (const [c, g] of [[1, 8], [17, 8]]) r.paste([[768], [769]], c, g);
    r.put(await people('nurse'), 144, 14, 'nurse');
    r.put(ball, 248, 114, 'item_ball');
    r.put(aide, 254, 34, 'scientist');
    r.put(martCorner, 48, 118, 'mart corner');
    r.put(player, 144, 128, 'red_normal');
    await place('center', r, {
      floor: centerFloor,
      features: {
        run: { boxes: [[0, 80, 32, 48]] },
        card: { boxes: [[100, 12, 104, 54]] },
        pc: { boxes: [[208, 14, 16, 34]] },
        aide: { boxes: [[254, 34, 16, 32], [240, 8, 32, 24]] },
        guide: { boxes: [[32, 8, 32, 34]] },
        mart: { boxes: [[48, 118, 32, 50]] },
        kit: { boxes: [[240, 96, 32, 48]] },
        badges: { boxes: [[68, 34, 16, 32]] },
        trophies: { boxes: [[232, 34, 16, 32]] },
        dex: { boxes: [[280, 92, 16, 32]] },
        banner: { boxes: [[84, 34, 16, 32]] },
        ladder: { boxes: [[276, 34, 16, 32]] },
      },
      exit: [136, 163, 32, 18],
      leaders: [[104, 76, 16, 32], [184, 76, 16, 32], [64, 84, 16, 32], [216, 84, 16, 32], [96, 128, 16, 32], [192, 132, 16, 32], [224, 144, 16, 32], [100, 140, 16, 32]],
      partners: [[164, 144, 16, 16], [124, 144, 16, 16], [168, 124, 16, 16], [120, 124, 16, 16]],
    });
  }

  // ── The Indigo Plateau (four Badges, or a Champion) ────────────────────────────────────────────────────────
  // IndigoPlateau_PokemonCenter_1F — the League's own front room — with its regulars where the map puts them, the
  // Item Guide on the shelf by the east wall, the League's register on the nurse's counter, the Mart's clerk and
  // Oak's aide at their posts. Two transparent columns on the left keep the screen's outline round the Mart's counter.
  {
    const r = await room(src, { base: 'IndigoPlateau_PokemonCenter_1F', keyBlack: true });
    for (const [name, x, y, frame, east] of [
      ['cooltrainer_f', 5, 3, 0],
      ['gym_guy', 7, 14, 2, true],
      ['black_belt', 23, 13, 2],
      ['cooltrainer_m', 16, 15, 0],
    ]) {
      const img = await people(name, frame);
      r.put(east ? await flop(img) : img, x * 16, y * 16 - 16, name);
    }
    r.put(await misc('clipboard'), 232, 152, 'clipboard');
    for (const [c, g] of [[23, 15], [9, 15]]) r.paste([[768], [769]], c, g);
    r.put(clerk, 2, 70, 'clerk');
    r.put(await people('nurse'), 184, 136, 'nurse');
    r.put(aide, 318, 164, 'scientist');
    r.put(ball, 300, 209, 'item_ball');
    r.put(player, 176, 222, 'red_normal');
    const P = 2;
    await place('plateau', r, {
      crop: { x: 0, y: 0, w: 400, h: 276 },
      pad: P,
      floor: await colours(src, 'IndigoPlateau_PokemonCenter_1F', [64, 96, 48, 16]),
      features: {
        run: { boxes: [[61, 8, 26, 24]] },
        card: { boxes: [[162, 140, 112, 50]] },
        pc: { boxes: [[274, 135, 17, 32]] },
        // As in Viridian: the shelf is the Item Guide, and the aide is the aide.
        aide: { boxes: [[318 + P, 164, 16, 32]], lock: { sprites: [[aide, 318 + P, 164]] } },
        guide: { boxes: [[356, 138, 30, 34]], lock: { furniture: [[354, 136, 32, 36]] } },
        mart: { boxes: [[2, 76, 32, 64]], lock: { sprites: [[clerk, 2 + P, 70]], solid: [[2, 78, 34, 60]] } },
        kit: { boxes: [[289, 207, 38, 36]], lock: { furniture: [[290, 208, 32, 32], [290, 240, 32, 16]] } },
        hall: { boxes: [[2, 204, 32, 44]], lock: { furniture: [[2, 207, 32, 41]] } },
        badges: { boxes: [[20, 30, 16, 32]] },
        trophies: { boxes: [[246, 200, 16, 32]] },
        dex: { boxes: [[226, 200, 16, 32]] },
        banner: { boxes: [[116, 30, 16, 32]] },
        ladder: { boxes: [[266, 200, 16, 32]] },
      },
      exit: [174, 260, 25, 16],
      leaders: [[104, 62, 16, 32], [44, 58, 16, 32], [112, 98, 16, 32], [66, 92, 16, 32], [70, 148, 16, 32], [132, 150, 16, 32], [100, 180, 16, 32], [140, 204, 16, 32], [84, 216, 16, 32], [204, 190, 16, 32], [190, 226, 16, 32], [296, 178, 16, 32]],
      partners: [[198, 236, 16, 16], [158, 236, 16, 16], [218, 238, 16, 16], [160, 216, 16, 16]],
    });
  }

  // ── The Hall of Fame (a Champion's) ────────────────────────────────────────────────────────────────────────
  // PokemonLeague_HallOfFame as the game drew it. The screen stands the winning team before the machine.
  {
    const r = await room(src, { base: 'PokemonLeague_HallOfFame', keyBlack: true });
    r.put(player, 80, 104, 'red_normal');
    await place('hall', r, {
      features: {},
      exit: [64, 190, 48, 18],
      team: [[80, 146, 16, 16], [58, 154, 16, 16], [102, 154, 16, 16], [58, 174, 16, 16], [102, 174, 16, 16], [80, 170, 16, 16]],
    });
  }

  await writeFile(resolve(root, 'src/ui/screens/hub/places.json'), `${JSON.stringify(places)}\n`);
  await manifest(out, { room: 'hub', layout: 'src/ui/screens/hub/places.json', places: records });
}
