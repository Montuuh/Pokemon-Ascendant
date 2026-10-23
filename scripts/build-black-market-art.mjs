// A18 / §2.11.6 — an authored Rocket basement, assembled from native FRLG tiles and people.
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

const layers = [];
const put = (input, left, top) => layers.push({ input, left, top });
const floor = await crop([192, 176, 16, 16]);
for (let y = 0; y < 256; y += 16) for (let x = 0; x < 320; x += 16) put(floor, x, y);
const wall = await crop([208, 8, 48, 24]);
for (let x = 0; x < 288; x += 48) put(wall, x, 0);
put(await sharp(wall).extract({ left: 0, top: 0, width: 32, height: 24 }).png().toBuffer(), 288, 0);
// An office behind an L-shaped partition, rather than the Hub's lobby plan.
const partition = await crop([8, 336, 8, 16]);
for (let y = 24; y < 104; y += 16) put(partition, 176, y);
// A one-tile aisle stays open beside the office desk; the back room is physically connected.
put(await sharp(wall).extract({ left: 0, top: 0, width: 16, height: 24 }).png().toBuffer(), 176, 104);
for (const x of [224, 272]) put(wall, x, 104);
// The entrance is separate from all four counters and remains a usable way upstairs.
put(await crop([160, 16, 40, 48]), 16, 24);
// Cargo pens for the Trader, a working desk for the Executive, and the Fence's goods.
put(await crop([320, 224, 96, 48]), 32, 112);
put(await crop([64, 384, 80, 48]), 208, 64);
put(await crop([48, 240, 48, 32]), 224, 160);
const cabinet = await crop([112, 208, 16, 32]);
for (const [x, y] of [
  [136, 96],
  [136, 128],
  [288, 160],
  [288, 208],
])
  put(cabinet, x, y);
// The Gambler has a physical table and the Hideout's own console bank beside it.
put(await crop([16, 336, 48, 32]), 16, 192);
put(roulette.bytes, 64, 208);
const room = await sharp({ create: { width: 320, height: 256, channels: 4, background: '#00000000' } })
  .composite(layers)
  .png({ palette: true, dither: 0 })
  .toBuffer();
await writeFile(resolve(out, 'room.png'), room);
outputs.push({ file: 'room.png', width: 320, height: 256, sha256: sha(room) });
await writeFile(
  resolve(out, 'room-manifest.json'),
  `${JSON.stringify(
    {
      description:
        'A18 authored Black Market floorplan: cargo pens, a separate back office, goods counter, gambling table and stairway.',
      rights:
        'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Maps: Bulbagarden Archives. NPC extraction: pret/pokefirered.',
      processing: {
        script: 'scripts/build-black-market-art.mjs',
        resampling: 'none',
        grid: 16,
        npcAlpha: 'exact palette-zero RGB key',
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
console.log('Wrote the native 320×256 Black Market and four authentic FRLG people.');
