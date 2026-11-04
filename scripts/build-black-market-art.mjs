// A18 / §2.11.6 — the Rocket basement: a real FRLG Hideout room and its people.
// node scripts/build-black-market-art.mjs [--fetch]
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/black-market');
const commit = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = [];
const crops = [];
const outputs = [];
await mkdir(resolve(out, 'sources'), { recursive: true });
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );
const mapPath = resolve(out, 'sources/rocket-hideout-b1f.png');
if (process.argv.includes('--fetch') || !(await exists(mapPath))) {
  const title = 'File:Rocket Hideout B1F FRLG.png';
  const response = JSON.parse(
    execFileSync(
      'curl',
      [
        '-fsSL',
        `https://archives.bulbagarden.net/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`,
      ],
      { encoding: 'utf8' },
    ),
  );
  const url = Object.values(response.query.pages)[0].imageinfo[0].url;
  await writeFile(mapPath, execFileSync('curl', ['-fsSL', url]));
}
async function source(path, url) {
  const bytes = await readFile(resolve(root, path));
  sources.push({ path, url, sha256: sha(bytes) });
  return { path, bytes };
}
const hideout = await source(
  'public/art/black-market/sources/rocket-hideout-b1f.png',
  'https://archives.bulbagarden.net/wiki/File:Rocket_Hideout_B1F_FRLG.png',
);
const roulette = await source(
  'public/art/game-corner/roulette.png',
  'docs/art/ATTRIBUTION.md — authentic FRLG Game Corner table',
);
async function crop(box) {
  crops.push({ source: hideout.path, box });
  return sharp(hideout.bytes)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .png()
    .toBuffer();
}
for (const [id, file] of [
  ['trader', 'rocket_f'],
  ['fence', 'rocket_m'],
  ['gambler', 'gentleman'],
  ['showcase', 'giovanni'],
]) {
  const path = resolve(out, `sources/${id}.png`);
  const url = `https://raw.githubusercontent.com/pret/pokefirered/${commit}/graphics/object_events/pics/people/${file}.png`;
  if (process.argv.includes('--fetch') || !(await exists(path))) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }
  const sheet = await source(`public/art/black-market/sources/${id}.png`, url);
  crops.push({ source: sheet.path, box: [0, 0, 16, 32] });
  const { data, info } = await sharp(sheet.bytes)
    .extract({ left: 0, top: 0, width: 16, height: 32 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  for (let i = 0; i < data.length; i += 4)
    if (data[i] === r && data[i + 1] === g && data[i + 2] === b) data[i + 3] = 0;
  const bytes = await sharp(data, { raw: info }).png().toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ file: `${id}.png`, width: 16, height: 32, sha256: sha(bytes) });
}

// The room is the Hideout's own: B1F's south-west office, cropped whole (walls, authentic floor, trim). Four native
// pieces are moved in on the 16 px grid (same floor phase, no keying): the stairwell's up-staircase over the console
// bank, two crate stacks beside the office's orange shutters (the Trader), the Game Corner's table in the nook in
// place of its down-staircase (the Gambler), and a corridor plant by the boss's desk.
// x 16–288: inside the office's west and east walls, so the screen's frame is the only border; y from 312, so the north
// wall shows the same black top above its cap as the nook's wall does (the frame is never a wall's cap).
const ROOM = { x: 16, y: 312, w: 272, h: 232 };
const layers = [];
const put = (input, left, top) => layers.push({ input, left: left - ROOM.x, top: top - ROOM.y });
const floorRgb = [
  [160, 160, 96],
  [192, 192, 152],
  [128, 128, 80],
];
async function keyed(box) {
  // A piece lifted from a differently shaded floor row keeps only its own pixels.
  const { data, info } = await sharp(await crop(box)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4)
    if (floorRgb.some((c) => c.every((v, k) => data[i + k] === v))) data[i + 3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}
put(await crop([ROOM.x, ROOM.y, ROOM.w, ROOM.h]), ROOM.x, ROOM.y);
// The way up: the console bank's wall is repainted with the plain wall beside it, then the stairwell's staircase
// (hall wall top y 0 = office wall top y 320, hall left wall x 160 = office x 16).
put(await crop([176, 320, 80, 32]), 16, 320);
// The bank's feet stand on the floor's top row: that row, outside the shaded west column, is repainted too.
put(await crop([192, 352, 64, 16]), 32, 352);
put(await crop([160, 0, 40, 64]), 16, 320);
// The Trader's stock: two crate stacks from the west room, against the wall beside the orange shutters.
const crates = await crop([112, 208, 16, 32]);
for (const x of [224, 240]) put(crates, x, 352);
// The Gambler's den: the nook's stairs are covered by the nook's own wall and floor, and the table goes in.
const nook = await crop([224, 448, 16, 96]);
for (const x of [240, 256, 272]) put(nook, x, 448);
put(roulette.bytes, 208, 496);
// The boss's end of the room.
put(await keyed([256, 192, 16, 32]), 176, 352);
const room = await sharp({
  create: { width: ROOM.w, height: ROOM.h, channels: 4, background: '#000000ff' },
})
  .composite(layers)
  .png({ palette: true, dither: 0 })
  .toBuffer();
await writeFile(resolve(out, 'room.png'), room);
outputs.push({ file: 'room.png', width: ROOM.w, height: ROOM.h, sha256: sha(room) });
await writeFile(
  resolve(out, 'room-manifest.json'),
  `${JSON.stringify(
    {
      description:
        'Black Market: the Rocket Hideout B1F south-west office cropped whole, with the up-staircase, crate stock, a plant and the Game Corner table moved in on the 16 px grid.',
      rights:
        'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Maps: Bulbagarden Archives. NPC extraction: pret/pokefirered.',
      processing: {
        script: 'scripts/build-black-market-art.mjs',
        resampling: 'none',
        grid: 16,
        room: ROOM,
        npcAlpha: 'exact palette-zero RGB key',
        plantAlpha: 'exact source floor RGB key',
        sharp: sharp.versions.sharp,
      },
      sources,
      crops,
      outputs,
    },
    null,
    2,
  )}\n`,
);
console.log('Wrote the native 272×232 Black Market and four authentic FRLG people.');
