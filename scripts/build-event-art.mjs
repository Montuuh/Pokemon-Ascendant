// §2.10.1 — one illustrated beat for every implemented Mystery Event, on a native 256×112 GBA grid.
// Reuses credited FRLG tiles and furniture; new NPC/object cuts are authentic Pokémon Emerald pixels.
// No random reward is depicted: closed crates and the shrine conceal their contents.
// Usage: node scripts/build-event-art.mjs [--fetch] (cached, pinned sources are retained alongside outputs).
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/events');
const commit = '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881';
const origin = `https://raw.githubusercontent.com/pret/pokeemerald/${commit}/graphics/object_events/pics`;
const sources = [];
const outputs = [];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir(resolve(out, 'sources'), { recursive: true });
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function external(name, file) {
  const path = resolve(out, `sources/${name}.png`);
  const url = `${origin}/${file}.png`;
  if (process.argv.includes('--fetch') || !(await exists(path))) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await readFile(path);
  const meta = await sharp(bytes).metadata();
  sources.push({
    file: `sources/${name}.png`,
    url,
    sha256: sha(bytes),
    width: meta.width,
    height: meta.height,
  });
  return bytes;
}

async function mapSource(name, title) {
  const path = resolve(out, `sources/${name}.png`);
  const api = `https://archives.bulbagarden.net/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  if (process.argv.includes('--fetch') || !(await exists(path))) {
    // Bulbagarden serves its map files to curl, while Node fetch may receive the Cloudflare challenge.
    const { execFileSync } = await import('node:child_process');
    const json = JSON.parse(execFileSync('curl', ['-s', '-L', api], { encoding: 'utf8' }));
    const url = Object.values(json.query.pages)[0].imageinfo[0].url;
    await writeFile(path, execFileSync('curl', ['-s', '-L', url], { maxBuffer: 1 << 26 }));
  }
  const bytes = await readFile(path);
  const meta = await sharp(bytes).metadata();
  sources.push({
    file: `sources/${name}.png`,
    url: `https://archives.bulbagarden.net/wiki/${encodeURIComponent(title)}`,
    sha256: sha(bytes),
    width: meta.width,
    height: meta.height,
  });
  return bytes;
}

const routeMap = await mapSource('route1-frlg', 'File:Kanto Route 1 FRLG.png');
const spaMap = await mapSource('lavaridge-emerald', 'File:Lavaridge Town E.png');
const cuts = [];
async function crop(source, file, box) {
  cuts.push({ source: file, box });
  return sharp(source).extract({ left: box[0], top: box[1], width: box[2], height: box[3] }).png().toBuffer();
}

const usedLocal = new Map();
async function local(path, crop) {
  const bytes = await readFile(resolve(root, `public/art/${path}`));
  usedLocal.set(path, { file: `../${path}`, sha256: sha(bytes), attribution: 'docs/art/ATTRIBUTION.md' });
  if (crop) cuts.push({ source: `../${path}`, box: crop });
  return crop
    ? sharp(bytes).extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] }).png().toBuffer()
    : bytes;
}

// Emerald sheets have an opaque palette-zero background. Key only that exact colour, never a fuzzy edge.
async function frame(bytes, width, height, left = 0, top = 0) {
  const { data, info } = await sharp(bytes)
    .extract({ left, top, width, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const key = data.subarray(0, 3);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] === key[0] && data[i + 1] === key[1] && data[i + 2] === key[2]) data[i + 3] = 0;
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

const npc = {};
for (const [name, file] of Object.entries({
  apothecary: 'old_woman',
  grandfather: 'old_man',
  grandmother: 'old_woman',
  courier: 'mystery_event_deliveryman',
  trader: 'man_3',
  ranger: 'picnicker',
  carny: 'man_4',
}))
  npc[name] = await frame(await external(name, `people/${file}`), 16, 32);
const bag = await frame(await external('bag', 'misc/birchs_bag'), 16, 16);
const ball = await frame(await external('ball', 'misc/item_ball'), 16, 16);
const box = await frame(await external('box', 'misc/moving_box'), 16, 16);
const truck = await external('truck', 'misc/truck');
const berrySource = await external('berries', 'berry_trees/oran');
const berryMeta = await sharp(berrySource).metadata();
// The last two columns are the two fruit-bearing frames, following seed/sprout/growing/flowering.
const berry = await frame(berrySource, 16, 32, berryMeta.width - 32, 0);
const tree = await local('route/route/tree.png');
const shelf = await local('mart/mart.png', [112, 16, 48, 24]);
const counter = await local('mart/mart.png', [16, 94, 32, 16]);
const bush = await local('route/route/tall.png');
const boulder = await frame(await external('boulder', 'misc/pushable_boulder'), 16, 16);
const sign = await crop(routeMap, 'sources/route1-frlg.png', [144, 496, 16, 16]);
const fence = await crop(routeMap, 'sources/route1-frlg.png', [128, 576, 16, 16]);
const stones = await Promise.all(
  ['fire-stone', 'water-stone', 'thunder-stone'].map((id) => local(`items/${id}.png`)),
);

async function scene(id, build, terrain = 'route') {
  const layers = [];
  const put = (input, left, top) => layers.push({ input, left, top });
  const tile = await local(`route/${terrain}/ground.png`);
  for (let y = 0; y < 112; y += 16) for (let x = 0; x < 256; x += 16) put(tile, x, y);
  if (terrain === 'route') {
    const path = await local('route/route/path-c.png');
    const north = await local('route/route/path-n.png');
    const south = await local('route/route/path-s.png');
    for (let x = 0; x < 256; x += 16) {
      put(north, x, 64);
      put(path, x, 80);
      put(south, x, 96);
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
    const flower = await local('route/meadow/deco.png');
    put(flower, 64, 16);
    put(flower, 192, 48);
  }
  await build(put);
  const bytes = await sharp({ create: { width: 256, height: 112, channels: 4, background: '#00000000' } })
    .composite(layers)
    .png({ palette: true, dither: 0 })
    .toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ file: `${id}.png`, width: 256, height: 112, sha256: sha(bytes) });
}

await scene('traveling-apothecary', (put) => {
  put(shelf, 64, 32);
  put(shelf, 144, 32);
  put(npc.apothecary, 120, 32);
  put(counter, 112, 64);
  put(box, 160, 72);
  put(box, 176, 64);
});
await scene('roadside-trader', (put) => {
  put(npc.trader, 112, 40);
  put(box, 136, 64);
  put(counter, 104, 72);
});
await scene('field-medic', (put) => {
  put(npc.ranger, 120, 40);
  put(bag, 140, 64);
});
await scene('lost-backpack', (put) => {
  put(sign, 120, 42);
  put(bag, 136, 58);
});
await scene('fallen-crate', (put) => {
  put(box, 112, 64);
  put(box, 128, 68);
  put(ball, 112, 48);
  put(ball, 132, 52);
});
await scene('abandoned-pokeball', (put) => {
  put(bush, 112, 48);
  put(ball, 124, 56);
  put(bush, 136, 56);
});
await scene('berry-bush', (put) => {
  put(berry, 104, 32);
  put(berry, 120, 40);
  put(berry, 136, 32);
});
await scene('moving-truck', async (put) => {
  // The full truck sheet is a single authentic 48×48 object, with its palette background keyed out.
  const meta = await sharp(truck).metadata();
  put(await frame(truck, meta.width, meta.height), 96, 16);
  put(npc.courier, 152, 48);
  put(box, 80, 64);
  put(box, 96, 72);
  put(box, 80, 48);
});
await scene('daycare-recovery', async (put) => {
  // The pen stays empty: the event never asks the player to choose or forfeit a Pokémon.
  for (const x of [96, 112, 128, 144]) put(fence, x, 32);
  put(fence, 80, 48);
  put(fence, 160, 48);
  put(npc.grandfather, 96, 48);
  put(npc.grandmother, 144, 48);
  put(tree, 176, 16);
});
await scene('hot-spring', async (put) => {
  // Emerald's actual bathhouse pool and entrance: no generic pond standing in for the story's hot spring.
  put(await crop(spaMap, 'sources/lavaridge-emerald.png', [0, 16, 256, 112]), 0, 0);
  put(npc.grandmother, 112, 80);
});
await scene('slot-booth', async (put) => {
  put(npc.carny, 120, 40);
  put(counter, 112, 72);
  // A single coin is a scene prop, never a preview of the flip's outcome.
  const coin = await local('items/tacticians-coin.png');
  const small = await sharp(coin).resize({ width: 15, height: 15, kernel: 'nearest' }).png().toBuffer();
  put(small, 122, 68);
});
await scene('cursed-trinket', async (put) => {
  // Closed shrine: showing a particular relic would promise a random outcome before it is rolled.
  const grave = await local('route/tower/fill.png');
  const paving = await local('route/tower/path.png');
  for (let y = 32; y <= 64; y += 16) for (let x = 104; x <= 136; x += 16) put(paving, x, y);
  put(grave, 120, 40);
  put(bush, 96, 48);
  put(bush, 144, 48);
});
await scene('mysterious-stone', (put) => {
  put(boulder, 120, 48);
  put(bush, 112, 56);
  put(bush, 136, 56);
});
await scene('stone-cache', async (put) => {
  for (let i = 0; i < stones.length; i++) {
    const small = await sharp(stones[i])
      .resize(15, 15, { kernel: 'nearest', fit: 'contain' })
      .png()
      .toBuffer();
    put(small, 96 + i * 24, 48);
  }
  put(bush, 80, 48);
  put(bush, 168, 48);
});
await scene('unmarked-cave', async (put) => {
  const cave = await local('map/habitat/cave.png');
  put(cave, 100, 24);
  put(boulder, 80, 64);
  put(boulder, 168, 56);
});

await writeFile(
  resolve(out, 'manifest.json'),
  `${JSON.stringify(
    {
      description:
        'A10 Mystery Event vignettes. Authentic Gen III objects and people on native FRLG tile compositions.',
      rights:
        'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Map renders: Bulbagarden Archives. Emerald extraction: pret/pokeemerald.',
      processing: {
        script: 'scripts/build-event-art.mjs',
        grid: [256, 112],
        resampling: 'none for tiles and NPCs; exact half-scale for named stone/coin props',
        dithering: false,
        alpha: 'palette-zero exact RGB key on opaque sprite sheets',
        sharp: sharp.versions.sharp,
      },
      sources,
      localSources: [...usedLocal.values()],
      cuts,
      outputs,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${outputs.length} event vignettes and provenance manifest.`);
