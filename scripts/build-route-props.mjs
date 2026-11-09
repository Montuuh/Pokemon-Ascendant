// §2.5.4 / §9.3 — the route's buildings, set pieces and obstacles, cut from FireRed's own maps in pret (v0.9.107):
//   · the buildings a node stands at the door of — Pewter City's Pokémon Center, Poké Mart and Gym, whole (v0.9.108: the
//     bottom three rows alone read as cut off, the user's words);
//   · set pieces for the open ground — Pewter's house, Route 25's pond and Bill's cottage, a flower bed from Route 1;
//   · a ledge from Route 1 (its two ends), for the route's one-way drop;
//   · the field moves' obstacles — the cut tree and the cracked rock (pret's object sprites) and a pool of Route 25's water.
// Every pixel is a FRLG tile pixel; nothing is resampled. The grass round a piece is keyed out to alpha, so it stands on
// any ground (the route's own tiles show through), and the screen draws it at the terrain's pixel scale.
// Usage: npm run art:route-props [-- --fetch]
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { renderGrid } from './lib/frlg-map.mjs';
import { pretTree } from './lib/frlg-room.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/map/props');
const src = pretTree(resolve(root, 'public/art/black-market/sources/pret'), process.argv.includes('--fetch'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const exists = (p) => access(p).then(() => true, () => false);
await mkdir(resolve(out, 'sources'), { recursive: true });

const maps = new Map();
async function rendered(name) {
  if (!maps.has(name)) {
    const m = await src.map(name);
    maps.set(name, renderGrid(m.grid, m.primary, m.secondary));
  }
  return maps.get(name);
}

/**
 * The grass every FRLG route shares, which a cut piece loses: the colours of plain grass metatiles in pret's own renders
 * (Route 1's open ground and Route 25's), which is the grass the towns are drawn on too.
 */
const grass = new Set();
for (const [map, cells] of [['Route1', [[3, 3], [4, 3], [5, 3], [8, 13]]], ['Route25', [[18, 4], [19, 4], [20, 2], [44, 7]]]]) {
  const img = await rendered(map);
  for (const [mx, my] of cells)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const s = ((my * 16 + y) * img.width + mx * 16 + x) * 4;
        grass.add((img.data[s] << 16) | (img.data[s + 1] << 8) | img.data[s + 2]);
      }
}

const outputs = [];
/** A piece of a map, by metatile rectangle, its grass keyed out. */
async function cut(id, map, [mx, my, mw, mh], { keyGrass = true } = {}) {
  const img = await rendered(map);
  const [W, H] = [mw * 16, mh * 16];
  const data = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const s = ((my * 16 + y) * img.width + mx * 16 + x) * 4;
      const d = (y * W + x) * 4;
      const [r, g, b] = [img.data[s], img.data[s + 1], img.data[s + 2]];
      data[d] = r; data[d + 1] = g; data[d + 2] = b;
      data[d + 3] = keyGrass && grass.has((r << 16) | (g << 8) | b) ? 0 : 255;
    }
  const bytes = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ id, map, metatiles: [mx, my, mw, mh], size: [W, H], sha256: sha(bytes) });
}

// The buildings, whole: roof, walls, sign and door.
await cut('gym', 'PewterCity', [12, 12, 7, 5]);
await cut('center', 'PewterCity', [15, 21, 5, 5]);
await cut('mart', 'PewterCity', [26, 15, 4, 4]);
// Set pieces.
await cut('house', 'PewterCity', [32, 8, 5, 4]);
await cut('pond', 'Route25', [43, 9, 6, 4]);
await cut('cottage', 'Route25', [49, 1, 5, 5]);
await cut('flowers', 'Route1', [2, 6, 6, 4]);
// The ledge: Route 1's, cut to its two ends (v0.9.108) — two tiles stand a quarter of the way down its drop, clear of the
// column it skips and of the nodes either side.
await cut('ledge', 'Route1', [2, 5, 6, 1]);
{
  const long = await readFile(resolve(out, 'ledge.png'));
  const ends = await Promise.all([0, 80].map((left) => sharp(long).extract({ left, top: 0, width: 16, height: 16 }).toBuffer()));
  const bytes = await sharp({ create: { width: 32, height: 16, channels: 4, background: '#00000000' } })
    .composite(ends.map((input, i) => ({ input, left: i * 16, top: 0 })))
    .png()
    .toBuffer();
  await writeFile(resolve(out, 'ledge.png'), bytes);
  Object.assign(outputs.find((o) => o.id === 'ledge'), { ends: [0, 5], size: [32, 16], sha256: sha(bytes) });
}

// The obstacles: pret's own object sprites (their first 16 × 16 frame, colour 0 keyed out), and a pool of Route 25's water.
const origin = 'https://raw.githubusercontent.com/pret/pokefirered/ce6406d8c2eaf46d543c8a2606de0c3cb1951982/graphics/object_events/pics/misc';
const sources = [];
for (const [id, file] of [['gate-cut', 'cut_tree'], ['gate-smash', 'rock_smash_rock']]) {
  const path = resolve(out, 'sources', `${file}.png`);
  if (!(await exists(path)) || process.argv.includes('--fetch')) {
    const res = await fetch(`${origin}/${file}.png`);
    if (!res.ok) throw new Error(`${res.status} ${origin}/${file}.png`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  const raw = await readFile(path);
  sources.push({ path: `sources/${file}.png`, url: `${origin}/${file}.png`, sha256: sha(raw) });
  const { data, info } = await sharp(raw).extract({ left: 0, top: 0, width: 16, height: 16 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const key = [data[0], data[1], data[2]];
  for (let p = 0; p < data.length; p += 4) if (data[p] === key[0] && data[p + 1] === key[1] && data[p + 2] === key[2]) data[p + 3] = 0;
  const bytes = await sharp(data, { raw: info }).png().toBuffer();
  await writeFile(resolve(out, `${id}.png`), bytes);
  outputs.push({ id, source: `sources/${file}.png`, crop: [0, 0, 16, 16], sha256: sha(bytes) });
}
// Deep water: a two-by-two pool of the route's own lake tiles, its rim all round.
{
  const parts = await Promise.all(['nw', 'ne', 'sw', 'se'].map((q) => readFile(resolve(root, `public/art/route/lake/water-${q}.png`))));
  const bytes = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#00000000' } })
    .composite(parts.map((input, i) => ({ input, left: (i % 2) * 16, top: Math.floor(i / 2) * 16 })))
    .png()
    .toBuffer();
  await writeFile(resolve(out, 'gate-surf.png'), bytes);
  outputs.push({ id: 'gate-surf', source: 'public/art/route/lake/water-{nw,ne,sw,se}.png', size: [32, 32], sha256: sha(bytes) });
}

await writeFile(
  resolve(out, 'manifest.json'),
  `${JSON.stringify({ build: 'npm run art:route-props (scripts/build-route-props.mjs)', processing: 'FRLG maps rendered from pret metatiles at a pinned commit (scripts/lib/frlg-map.mjs) and cut by metatile; the route grass round a piece keyed to alpha; object sprites keyed on colour 0. No resampling.', sources, pret: src.sources(), outputs }, null, 2)}\n`,
);
console.log(`Built ${outputs.length} route props.`);
