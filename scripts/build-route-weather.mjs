// §2.5.4 / §9.3 — a lane's Battlefield drawn the way FireRed draws its weather: pret's own rain, sandstorm, snow and fog,
// cut into 64-px tiles the route board repeats at the terrain's own pixel scale (v0.9.107; until then CSS dots and rings).
// Rain, sand and snow are the games' sprites with their colour 0 keyed out; fog is the games' fog layer, whose grey is
// how much it covers (the GBA blends it), so its grey becomes alpha over one tint — white mist, or a field's own colour.
// Usage: npm run art:weather [-- --fetch]
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const out = 'public/art/map/weather';
const src = `${out}/sources`;
const commit = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982';
const origin = `https://raw.githubusercontent.com/pret/pokefirered/${commit}/graphics/weather`;
const files = ['rain.png', 'sandstorm.png', 'snow0.png', 'snow1.png', 'fog_horizontal.png', 'fog_diagonal.png'];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const exists = (p) => access(p).then(() => true, () => false);

await mkdir(src, { recursive: true });
const sources = [];
for (const f of files) {
  const path = `${src}/${f}`;
  if (!(await exists(path)) || process.argv.includes('--fetch')) {
    const res = await fetch(`${origin}/${f}`);
    if (!res.ok) throw new Error(`${res.status} ${origin}/${f}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
  }
  sources.push({ path, url: `${origin}/${f}`, sha256: sha(await readFile(path)) });
}

const T = 64;
const read = async (f) => {
  const { data, info } = await sharp(`${src}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
/** Copy a sprite's region into a tile at (x, y), wrapping round its edges so the tile repeats seamlessly; black is clear. */
function stamp(tile, s, sx, sy, sw, sh, x, y) {
  for (let j = 0; j < sh; j++)
    for (let i = 0; i < sw; i++) {
      const p = ((sy + j) * s.w + sx + i) * 4;
      if (s.data[p] === 0 && s.data[p + 1] === 0 && s.data[p + 2] === 0) continue;
      const q = ((((y + j) % T) + T) % T * T + ((((x + i) % T) + T) % T)) * 4;
      tile[q] = s.data[p]; tile[q + 1] = s.data[p + 1]; tile[q + 2] = s.data[p + 2]; tile[q + 3] = 255;
    }
}
const outputs = [];
async function save(name, tile, note) {
  const bytes = await sharp(tile, { raw: { width: T, height: T, channels: 4 } }).png().toBuffer();
  await writeFile(`${out}/${name}.png`, bytes);
  outputs.push({ file: `${name}.png`, note, sha256: sha(bytes) });
}

// Rain: the falling streak (the sheet's first 16 × 32 frame), three to a tile, offset so the columns never line up.
const rain = await read('rain.png');
let tile = Buffer.alloc(T * T * 4);
for (const [x, y] of [[4, 0], [36, 20], [20, 42]]) stamp(tile, rain, 0, 0, 16, 32, x, y);
await save('rain', tile, 'rain.png frame 0 (16x32) x3');

// Sandstorm: the games' own 64-px swirl of grains (its first 64 rows).
const sand = await read('sandstorm.png');
tile = Buffer.alloc(T * T * 4);
stamp(tile, sand, 0, 0, 64, 64, 0, 0);
await save('sand', tile, 'sandstorm.png rows 0-63');

// Snow (the hail): the two flakes, three of each.
const [snow0, snow1] = [await read('snow0.png'), await read('snow1.png')];
tile = Buffer.alloc(T * T * 4);
for (const [x, y] of [[6, 4], [42, 28], [22, 50]]) stamp(tile, snow0, 0, 0, 8, 8, x, y);
for (const [x, y] of [[30, 12], [54, 46], [10, 34]]) stamp(tile, snow1, 0, 0, 8, 8, x, y);
await save('snow', tile, 'snow0.png x3, snow1.png x3');

// Fog: grey is coverage. Light grey becomes up to `most` of the tint (a third, by default); the darkest becomes clear.
async function fog(name, f, [r, g, b], note, most = 0.34) {
  const s = await read(f);
  let lo = 255, hi = 0;
  for (let p = 0; p < s.data.length; p += 4) { lo = Math.min(lo, s.data[p]); hi = Math.max(hi, s.data[p]); }
  const t = Buffer.alloc(T * T * 4);
  for (let p = 0; p < T * T * 4; p += 4) {
    const k = (s.data[p] - lo) / Math.max(1, hi - lo);
    t[p] = r; t[p + 1] = g; t[p + 2] = b; t[p + 3] = Math.round(k * k * most * 255);
  }
  await save(name, t, note);
}
await fog('fog-misty', 'fog_horizontal.png', [255, 214, 236], 'fog_horizontal.png, grey as alpha, Misty Terrain pink', 0.26);
await fog('fog-psychic', 'fog_horizontal.png', [240, 112, 176], 'fog_horizontal.png, grey as alpha, Psychic Terrain');
await fog('fog-toxic', 'fog_diagonal.png', [160, 64, 200], 'fog_diagonal.png, grey as alpha, Toxic Spikes');

await writeFile(`${out}/manifest.json`, JSON.stringify({ build: 'npm run art:weather', processing: 'Sprites copied pixel for pixel into 64x64 repeating tiles, colour 0 keyed out; fog grey mapped to alpha over one tint. No resampling.', sources, outputs }, null, 2) + '\n');
console.log(`Built ${outputs.length} weather tiles.`);
