// §2.10.1 — one illustrated beat for every implemented Mystery Event, on a native 256×112 GBA grid.
// Reuses credited FRLG tiles and furniture; new NPC/object cuts are authentic Pokémon Emerald pixels.
// No random reward is depicted: closed crates and the shrine conceal their contents.
// B19 — the event's identifying prop is the largest, brightest thing in its frame: an item the choice names is
// drawn from its own icon at 1× (its own size, never resampled), a person or object from its native sprite, and nothing
// else is allowed to share its row of pixels.
// Usage: node scripts/build-event-art.mjs [--fetch] (cached, pinned sources are retained alongside outputs).
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/events');
const commit = '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881';
const origin = `https://raw.githubusercontent.com/pret/pokeemerald/${commit}/graphics`;
const sources = [];
const outputs = [];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
await mkdir(resolve(out, 'sources'), { recursive: true });
const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  );

async function external(name, file, base = 'object_events/pics') {
  const path = resolve(out, `sources/${name}.png`);
  const url = `${origin}/${base}/${file}.png`;
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
  salesman: 'devon_employee',
  springWoman: 'hot_springs_old_woman',
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
// Emerald's field-effect glint (the bright four-point star) and shrine statue, and its overworld Pikachu (facing down).
const glintSheet = await external('glint', 'small_sparkle', 'field_effects/pics');
const glint = await frame(glintSheet, 16, 16, 16, 0);
const glintSmall = await frame(glintSheet, 16, 16, 0, 0);
const question = await frame(await external('question', 'emotion_question', 'field_effects/pics'), 16, 16);
const statue = await frame(await external('statue', 'misc/statue'), 16, 32);
const pikachu = await frame(await external('pikachu', 'pikachu', 'object_events/pics/pokemon'), 16, 16);
const sign = await crop(routeMap, 'sources/route1-frlg.png', [144, 496, 16, 16]);
const fence = await crop(routeMap, 'sources/route1-frlg.png', [128, 576, 16, 16]);
const stones = await Promise.all(
  ['fire-stone', 'water-stone', 'thunder-stone'].map((id) => local(`items/${id}.png`)),
);

async function scene(id, build, terrain = 'route') {
  const layers = [];
  const put = (input, left, top) => layers.push({ input, left, top });
  if (terrain !== 'none') {
    const tile = await local(`route/${terrain}/ground.png`);
    for (let y = 0; y < 112; y += 16) for (let x = 0; x < 256; x += 16) put(tile, x, y);
  }
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
  // A salesman in his red suit, out on the road with the last crate: no counter (that is the carny's and the
  // apothecary's picture) and no sign (the lost pack's).
  put(npc.salesman, 108, 40);
  put(box, 130, 66);
});
await scene('field-medic', async (put) => {
  // The kit is laid out on the path — exactly what the choice hands over (two Super Potions, a Full Heal) — and
  // nothing else: no bag, so it cannot be mistaken for the lost pack's. Items are drawn at their own size (1×).
  put(npc.ranger, 104, 40);
  put(await local('items/super-potion.png'), 128, 64);
  put(await local('items/super-potion.png'), 158, 64);
  put(await local('items/full-heal.png'), 188, 64);
});
await scene('lost-backpack', (put) => {
  // Nobody in sight: the pack alone on the grass, where its brown stands out, under Emerald's question bubble.
  put(bag, 120, 44);
  put(question, 120, 28);
});
await scene('fallen-crate', (put) => {
  put(box, 112, 64);
  put(box, 128, 68);
  put(ball, 112, 48);
  put(ball, 132, 52);
});
await scene('abandoned-pokeball', (put) => {
  // The overworld item ball (the one every Poké Ball on the ground is in the games), alone in the grass with a glint:
  // the dent and the hum are the title's. No bush: the tile's grass backing shows as a square.
  put(ball, 120, 44);
  put(glint, 134, 36);
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
  // A fenced pen with one Pokémon resting in it, the couple at either side. Pikachu is scenery, not a stand-in for
  // the player's own; the event never asks the player to choose or forfeit one. The pen stands on the grass, where
  // the fence tile's backing does not show.
  for (const x of [88, 104, 120, 136]) {
    put(fence, x, 12);
    put(fence, x, 44);
  }
  for (const y of [28]) {
    put(fence, 72, y);
    put(fence, 152, y);
  }
  put(pikachu, 112, 28);
  put(npc.grandfather, 60, 40);
  put(npc.grandmother, 166, 40);
});
await scene('hot-spring', async (put) => {
  // Emerald's actual bathhouse pool, cut out of the Lavaridge map and set on the route like every other scene: the
  // pool is the picture (the Pokémon Centre beside it used to be the loudest thing in the frame). The map's wooden
  // steps over the rim's top right are covered with a copy of the rim and water 36 px to their left, and what lies
  // outside the rim's rounded rectangle is keyed out.
  const box = [30, 26, 100, 90];
  const { data, info } = await sharp(spaMap)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  cuts.push({ source: 'sources/lavaridge-emerald.png', box });
  const W = info.width;
  for (let y = 5; y < 23; y++) for (let x = 66; x < 85; x++) for (let c = 0; c < 4; c++) data[(y * W + x) * 4 + c] = data[(y * W + x - 36) * 4 + c];
  const [x0, y0, x1, y1, r] = [7, 8, 93, 83, 6];
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < W; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
      const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
      if (x < x0 || x > x1 || y < y0 || y > y1 || dx * dx + dy * dy > r * r) data[(y * W + x) * 4 + 3] = 0;
      const i = (y * W + x) * 4;
      if (data[i] > data[i + 1] + 40 && data[i] > data[i + 2] + 40 && data[i + 1] < 110) data[i + 3] = 0; // the map's red cliff
    }
  put(await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer(), 85, 8);
  put(npc.springWoman, 122, 34); // Emerald's bathing sprite: head and shoulders above the water
});
await scene('slot-booth', async (put) => {
  put(npc.carny, 120, 40);
  put(counter, 112, 72);
  // A single coin is a scene prop, never a preview of the flip's outcome. It is the one thing in the scene drawn at
  // the item's own size (1×, never resampled) and sits at the carny's hand, so it is the brightest thing in the frame.
  put(await local('items/tacticians-coin.png'), 138, 46);
});
await scene('cursed-trinket', async (put) => {
  // A shrine: a stone statue on old paving, one bright glint where the trinket sits and two small ones. The trinket
  // itself is not drawn, because which relic it is gets rolled when it is taken.
  const paving = await local('route/tower/path.png');
  for (let y = 48; y <= 64; y += 16) for (let x = 104; x <= 136; x += 16) put(paving, x, y);
  put(statue, 120, 32);
  put(glint, 118, 22);
  put(glintSmall, 98, 56);
  put(glintSmall, 140, 52);
});
await scene('mysterious-stone', (put) => {
  // Alone on the sand, where it is the darkest thing in the frame, with the faint glints of its hum. No bush (the
  // tile's grass backing shows as a square on sand) and no particular stone: which Evolution Item it turns out to be
  // is rolled when it is taken.
  put(boulder, 120, 64);
  put(glint, 100, 58);
  put(glint, 138, 52);
});
await scene('stone-cache', async (put) => {
  // The three stones the choices name, each at its item's own size.
  for (let i = 0; i < stones.length; i++) put(stones[i], 77 + i * 36, 52);
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
        resampling: 'none: tiles, people and named item icons are placed at their native size',
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
