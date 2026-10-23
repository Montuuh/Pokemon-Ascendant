// A09 / D9 — a new Center, assembled from original FRLG map tiles at native resolution.
// Sources stay beside the output. No complete source map is reused as a room; every tile and prop is listed below.
// Run: node scripts/build-center-art.mjs [--fetch]. Fetch only refreshes the two credited source maps.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/center');
const SOURCES = {
  center: {
    file: 'source/center-frlg.png',
    title: 'File:Pokémon Center inside FRLG.png',
    page: 'https://archives.bulbagarden.net/wiki/File:Pok%C3%A9mon_Center_inside_FRLG.png',
  },
  bedroom: {
    file: 'source/bedroom-frlg.png',
    title: 'File:Player Bedroom FRLG.png',
    page: 'https://archives.bulbagarden.net/wiki/File:Player_Bedroom_FRLG.png',
  },
};
await mkdir(resolve(OUT, 'source'), { recursive: true });
for (const source of Object.values(SOURCES)) {
  if (process.argv.includes('--fetch')) {
    const query = `https://archives.bulbagarden.net/w/api.php?action=query&titles=${encodeURIComponent(source.title)}&prop=imageinfo&iiprop=url&format=json`;
    const json = JSON.parse(
      execFileSync('curl', ['-s', '-L', '-A', 'PokemonAscendant/0.9 non-commercial fan art', query], {
        encoding: 'utf8',
      }),
    );
    const url = Object.values(json.query.pages)[0].imageinfo[0].url;
    await writeFile(
      resolve(OUT, source.file),
      execFileSync('curl', ['-s', '-L', '-A', 'PokemonAscendant/0.9 non-commercial fan art', url]),
    );
  }
  source.sha256 = createHash('sha256')
    .update(await readFile(resolve(OUT, source.file)))
    .digest('hex');
}

const cuts = {
  floor: { source: 'center', box: [48, 64, 16, 16] },
  wall: { source: 'center', box: [144, 0, 16, 24] },
  corner: { source: 'center', box: [0, 0, 16, 32] },
  lowerCorner: { source: 'center', box: [0, 128, 16, 16] },
  counter: { source: 'center', box: [64, 16, 112, 48] },
  plant: { source: 'center', box: [16, 12, 16, 32] },
  picture: { source: 'center', box: [196, 12, 24, 16] },
  chairYellow: { source: 'center', box: [176, 80, 16, 16] },
  chairBlue: { source: 'center', box: [192, 80, 16, 16] },
  table: { source: 'center', box: [176, 96, 32, 32] },
  floorEmblem: { source: 'center', box: [96, 80, 48, 48] },
  mat: { source: 'center', box: [107, 132, 26, 18] },
  bed: { source: 'bedroom', box: [28, 78, 24, 34], keyFloor: true },
  pcDesk: { source: 'bedroom', box: [16, 8, 32, 40], keyFloor: true },
};
// The green rug is reconstructed from its nine authentic border/centre tiles: the source's consoles are omitted.
for (const [row, y] of [64, 80, 112].entries())
  for (const [col, x] of [64, 80, 128].entries())
    cuts[`rug-${col}-${row}`] = { source: 'bedroom', box: [x, y, 16, 16], keyFloor: true };

const floorKeys = new Set();
const keyData = await sharp(resolve(OUT, SOURCES.bedroom.file))
  .extract({ left: 32, top: 48, width: 16, height: 16 })
  .removeAlpha()
  .raw()
  .toBuffer();
for (let i = 0; i < keyData.length; i += 3)
  floorKeys.add(`${keyData[i]},${keyData[i + 1]},${keyData[i + 2]}`);
const sprites = {};
for (const [id, cut] of Object.entries(cuts)) {
  const [left, top, width, height] = cut.box;
  const { data, info } = await sharp(resolve(OUT, SOURCES[cut.source].file))
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4)
    if (
      (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) ||
      (cut.keyFloor && floorKeys.has(`${data[i]},${data[i + 1]},${data[i + 2]}`))
    )
      data[i + 3] = 0;
  sprites[id] = await sharp(data, { raw: info }).png().toBuffer();
}
const placed = [];
const layers = [];
async function place(id, x, y, mirror = false) {
  placed.push({ id, at: [x, y], ...(mirror ? { mirror: true } : {}) });
  layers.push({ input: mirror ? await sharp(sprites[id]).flop().toBuffer() : sprites[id], left: x, top: y });
}
for (let y = 0; y < 208; y += 16) for (let x = 0; x < 320; x += 16) await place('floor', x, y);
for (let x = 16; x < 304; x += 16) await place('wall', x, 0);
await place('corner', 0, 0);
await place('corner', 304, 0, true);
await place('lowerCorner', 0, 192);
await place('lowerCorner', 304, 192, true);
await place('counter', 96, 16);
// Daycare alcove: five by five rug tiles, two proper beds, a plant between the alcove and the central aisle.
for (let row = 0; row < 5; row++)
  for (let col = 0; col < 5; col++)
    await place(
      `rug-${col === 0 ? 0 : col === 4 ? 2 : 1}-${row === 0 ? 0 : row === 4 ? 2 : 1}`,
      32 + col * 16,
      80 + row * 16,
    );
await place('bed', 40, 96);
await place('bed', 72, 96);
await place('plant', 112, 112);
// The right-hand terminal is its own desk; the waiting area sits below it, away from the entrance aisle.
await place('picture', 256, 8);
await place('pcDesk', 256, 48);
await place('plant', 224, 96);
await place('chairYellow', 240, 144);
await place('chairBlue', 256, 144);
await place('table', 240, 160);
await place('plant', 16, 24);
await place('plant', 288, 24);
await place('floorEmblem', 144, 112);
await place('mat', 147, 206);
const raw = await sharp({
  create: { width: 320, height: 224, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(layers)
  .raw()
  .toBuffer();
// The source corners carry the room's silhouette: clear the base floor beneath their transparent outside too.
for (const {
  id,
  at: [x, y],
  mirror,
} of placed.filter((p) => p.id === 'corner' || p.id === 'lowerCorner')) {
  const { data, info } = await sharp(mirror ? await sharp(sprites[id]).flop().toBuffer() : sprites[id])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let sy = 0; sy < info.height; sy++)
    for (let sx = 0; sx < info.width; sx++)
      if (data[(sy * info.width + sx) * 4 + 3] === 0) raw[((y + sy) * 320 + x + sx) * 4 + 3] = 0;
}
const colours = new Set();
for (let i = 0; i < raw.length; i += 4) if (raw[i + 3]) colours.add(`${raw[i]},${raw[i + 1]},${raw[i + 2]}`);
if (colours.size > 256)
  throw new Error(
    `The composition needs ${colours.size} colours: do not quantise authentic pixels silently.`,
  );
const output = await sharp(raw, { raw: { width: 320, height: 224, channels: 4 } })
  .png({ palette: true, colours: 256, dither: 0 })
  .toBuffer();
await writeFile(resolve(OUT, 'room.png'), output);
await writeFile(
  resolve(OUT, 'manifest.json'),
  `${JSON.stringify({ sources: SOURCES, output: { file: 'room.png', width: 320, height: 224, colours: colours.size, sha256: createHash('sha256').update(output).digest('hex') }, processing: '16px floor/rug tiles; furniture placed at native pixel offsets. Edge black made transparent; bedroom floor colours keyed off bed, rug and desk. No resampling or recolouring.', cuts, placed }, null, 2)}\n`,
);
await mkdir(resolve(ROOT, 'playtest/a08-a09/center-v2'), { recursive: true });
await sharp(output)
  .resize(960, 672, { kernel: 'nearest' })
  .png()
  .toFile(resolve(ROOT, 'playtest/a08-a09/center-v2/composition-3x.png'));
console.log('Built public/art/center/room.png (320×224), manifest and 3× composition preview.');
