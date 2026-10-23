// A13 — grounded route services, using the same native tiles as the A10 event family.
// Usage: node scripts/build-route-stop-art.mjs [--fetch]. No resampling or generated imagery.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/route-stops');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sources = [];
const cuts = [];
const outputs = [];
await mkdir(resolve(out, 'sources'), { recursive: true });

async function local(file, box) {
  const bytes = await readFile(resolve(root, 'public/art', file));
  if (!sources.some((s) => s.file === `../${file}`))
    sources.push({ file: `../${file}`, sha256: hash(bytes), attribution: 'docs/art/ATTRIBUTION.md' });
  if (box) cuts.push({ source: `../${file}`, box });
  return box
    ? sharp(bytes).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer()
    : bytes;
}

async function person(id, file) {
  const url = `https://raw.githubusercontent.com/pret/pokeemerald/731ad5bfd6e6f265508d0efcca0ba42f9dcf5881/graphics/object_events/pics/people/${file}.png`;
  const path = resolve(out, `sources/${id}.png`);
  if (
    process.argv.includes('--fetch') ||
    !(await access(path).then(
      () => true,
      () => false,
    ))
  ) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await readFile(path);
  sources.push({ file: `sources/${id}.png`, url, sha256: hash(bytes) });
  cuts.push({ source: `sources/${id}.png`, box: [0, 0, 16, 32] });
  return keyed(bytes, 16, 32);
}

async function keyed(bytes, width, height) {
  const { data } = await sharp(bytes)
    .extract({ left: 0, top: 0, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  for (let i = 0; i < data.length; i += 4)
    if (data[i] === r && data[i + 1] === g && data[i + 2] === b) data[i + 3] = 0;
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
}

const nurse = await person('nurse', 'nurse');
const trainer = await person('black-belt', 'black_belt');
const trader = await keyed(await local('events/sources/trader.png'), 16, 32);
const box = await keyed(await local('events/sources/box.png'), 16, 16);
const bag = await keyed(await local('events/sources/bag.png'), 16, 16);
const counter = await local('mart/mart.png', [16, 94, 32, 16]);
const tree = await local('route/route/tree.png');
const equipment = await local('dojo/equipment.png');
const platform = await local('dojo/platform.png');
const scrolls = await local('dojo/scroll-rack.png');

async function scene(id, terrain, decorate) {
  const layers = [];
  const put = (input, left, top) => layers.push({ input, left, top });
  const ground = await local(`route/${terrain}/ground.png`);
  for (let y = 0; y < 112; y += 16) for (let x = 0; x < 256; x += 16) put(ground, x, y);
  if (terrain === 'route') {
    for (const [suffix, y] of [
      ['n', 64],
      ['c', 80],
      ['s', 96],
    ]) {
      const path = await local(`route/route/path-${suffix}.png`);
      for (let x = 0; x < 256; x += 16) put(path, x, y);
    }
    for (const [x, y] of [
      [0, 0],
      [32, 0],
      [192, 0],
      [224, 0],
      [0, 32],
      [224, 32],
    ])
      put(tree, x, y);
    const flowers = await local('route/meadow/deco.png');
    put(flowers, 64, 16);
    put(flowers, 192, 48);
  } else {
    const wall = await local('route/cave/fill.png');
    for (let x = 0; x < 256; x += 16) put(wall, x, 0);
    const boulder = await keyed(await local('events/sources/boulder.png'), 16, 16);
    put(boulder, 16, 64);
    put(boulder, 224, 48);
  }
  await decorate(put);
  const bytes = await sharp({ create: { width: 256, height: 112, channels: 4, background: '#00000000' } })
    .composite(layers)
    .png({ palette: true, dither: 0 })
    .toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ file: `${id}.png`, width: 256, height: 112, sha256: hash(bytes) });
}

await scene('merchant', 'route', (put) => {
  put(trader, 120, 32);
  put(counter, 112, 64);
  put(box, 80, 64);
  put(box, 88, 48);
  put(bag, 160, 64);
});
await scene('aid', 'route', (put) => {
  put(nurse, 120, 32);
  put(counter, 112, 64);
  put(bag, 152, 64);
  put(box, 88, 64);
});
await scene('training', 'cave', (put) => {
  put(equipment, 64, 40);
  put(scrolls, 160, 40);
  put(trainer, 120, 40);
  put(platform, 104, 80);
});

await writeFile(
  resolve(out, 'manifest.json'),
  `${JSON.stringify(
    {
      description:
        'A13 route service vignettes. Native FRLG terrain and furniture, Emerald people, and existing palette-matched Dojo props.',
      rights:
        'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Map renders: Bulbagarden Archives. Emerald extraction: pret/pokeemerald.',
      processing: {
        script: 'scripts/build-route-stop-art.mjs',
        grid: [256, 112],
        resampling: 'none',
        alpha: 'exact palette-zero key on opaque Emerald sheets',
        dithering: false,
        sharp: sharp.versions.sharp,
      },
      sources,
      cuts,
      outputs,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${outputs.length} route-stop scenes.`);
