#!/usr/bin/env node
// §9.3 — a Wild Area's landmark: the thing that stands behind its Pokémon on the map and says which habitat it is (the
// user, 2026-10-20: "the Old Tower with the Pokémon Tower behind its sprite, the same grass under every Wild one").
//
// Every prop is FireRed / LeafGreen's own pixels ("fetch an object", docs/art/pipeline.md):
//  · the real landmarks are cut whole from the Bulbagarden Archives' map renders — the Pokémon Tower's dome (Route 10,
//    where the tower's top shows over the cliff), the Power Plant (Route 10), a Tanoby chamber, a Seafoam island
//    (Route 20), Kindle Road's rocks — their ground made transparent by a flood fill from the crop's edges through the
//    colours on those edges, and only the object's own piece kept (the largest connected one);
//  · the habitats with no building of their own are a few of the route's own tiles (`public/art/route/`, `npm run
//    art:route`) put together with their grass keyed out: tall grass, flowers, pines, a pond, sea rocks, boulders.
// A building is brought down to half its size (D9: a whole or half multiple), everything else stays at its own size.
//
// Usage: npm run art:habitats [-- --maps <dir>]   → public/art/map/habitat/<habitat>.png
//        --maps reads the map renders from a folder (named as the titles, every run of non-alphanumerics a dash)
//        instead of downloading them.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/map/habitat');
const TILES = resolve(ROOT, 'public/art/route');
const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.9 (non-commercial fan project; art pipeline)';
const mapsAt = process.argv.includes('--maps') ? process.argv[process.argv.indexOf('--maps') + 1] : null;

const SOURCES = {
  route10: 'File:Kanto Route 10 FRLG.png',
  route20: 'File:Kanto Route 20 FRLG.png',
  tanoby: 'File:Tanoby Ruins FRLG.png',
  kindle: 'File:Kindle Road FRLG.png',
};

const maps = {};
function source(key) {
  if (maps[key]) return maps[key];
  const title = SOURCES[key];
  const local = mapsAt && resolve(mapsAt, title.replace(/^File:/, '').replace(/[^A-Za-z0-9]+/g, '-'));
  if (local && existsSync(local)) return (maps[key] = readFileSync(local));
  const json = execFileSync('curl', ['-s', '-L', '-A', UA, `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`], { encoding: 'utf8' });
  const info = Object.values(JSON.parse(json).query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`not on the Archives: ${title}`);
  console.log(`fetched ${title}`);
  return (maps[key] = execFileSync('curl', ['-s', '-L', '-A', UA, info.url], { maxBuffer: 1 << 28 }));
}

/** An RGBA image in memory: `{ w, h, px }`. */
const raw = async (img) => {
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: Buffer.from(data) };
};
const rgb = (im, i) => (im.px[i * 4] << 16) | (im.px[i * 4 + 1] << 8) | im.px[i * 4 + 2];

/**
 * The object in a crop of a map: the ground round it flooded transparent from the given edges, through the colours
 * found on those edges, and then only its largest connected piece kept (a sign, a pylon or a pebble beside it goes).
 */
async function cutObject(key, { left, top, width, height }, { edges = 'tlrb', share = 0.03, drop } = {}) {
  const im = await raw(sharp(source(key)).extract({ left, top, width, height }));
  const { w, h } = im;
  const starts = [];
  if (edges.includes('t')) for (let x = 0; x < w; x++) starts.push(x);
  if (edges.includes('b')) for (let x = 0; x < w; x++) starts.push((h - 1) * w + x);
  if (edges.includes('l')) for (let y = 0; y < h; y++) starts.push(y * w);
  if (edges.includes('r')) for (let y = 0; y < h; y++) starts.push(y * w + w - 1);
  // The ground is what most of the edge is: a colour that makes up a few hundredths of it at least (`share`). A neighbour
  // cut by the crop's edge (a pebble, a cliff's corner) is too little of it to count, so the flood never runs on into the
  // object; where the edge is clean, `share: 0` takes every colour on it, the ground's rarest shades too.
  const counts = new Map();
  for (const i of starts) counts.set(rgb(im, i), (counts.get(rgb(im, i)) ?? 0) + 1);
  const ground = new Set([...counts].filter(([, n]) => n >= starts.length * share).map(([c]) => c));
  // `drop`: colours sampled from boxes of the crop that are never the object's (the rock a facade is set in, the grass
  // round a building) go wherever they are.
  const gone = new Set();
  for (const { left: dl, top: dt, width: dw, height: dh } of drop ?? []) for (let y = dt; y < dt + dh; y++) for (let x = dl; x < dl + dw; x++) gone.add(rgb(im, y * w + x));
  for (let i = 0; i < w * h; i++) if (gone.has(rgb(im, i))) im.px[i * 4 + 3] = 0;
  const seen = new Uint8Array(w * h);
  const stack = [...starts];
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (!ground.has(rgb(im, i))) continue;
    im.px[i * 4 + 3] = 0;
    const x = i % w;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (i >= w) stack.push(i - w);
    if (i < w * (h - 1)) stack.push(i + w);
  }
  return largest(im);
}

/** Keep only the largest connected piece of what is opaque. */
function largest(im) {
  const { w, h } = im;
  const label = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let i0 = 0; i0 < w * h; i0++) {
    if (label[i0] !== -1 || im.px[i0 * 4 + 3] === 0) continue;
    const id = sizes.length;
    let n = 0;
    const q = [i0];
    label[i0] = id;
    while (q.length) {
      const i = q.pop();
      n++;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || label[j] !== -1 || im.px[j * 4 + 3] === 0) continue;
        label[j] = id;
        q.push(j);
      }
    }
    sizes.push(n);
  }
  const keep = sizes.indexOf(Math.max(...sizes));
  for (let i = 0; i < w * h; i++) if (label[i] !== keep) im.px[i * 4 + 3] = 0;
  return im;
}

/** A route tile with its ground keyed out: every colour of the terrain's plain ground (both its tiles) turns transparent. */
async function tile(terrain, piece, groundOf = terrain) {
  const palette = new Set();
  for (const name of ['ground', 'ground-2']) {
    const ground = await raw(sharp(resolve(TILES, groundOf, `${name}.png`)));
    for (let i = 0; i < ground.w * ground.h; i++) palette.add(rgb(ground, i));
  }
  const im = await raw(sharp(resolve(TILES, terrain, `${piece}.png`)));
  for (let i = 0; i < im.w * im.h; i++) if (palette.has(rgb(im, i))) im.px[i * 4 + 3] = 0;
  return im;
}

/** Every colour moved by `fn([r, g, b]) → [r, g, b]`: a pond turned to a marsh, a rock to a volcano's. */
function recolour(im, fn) {
  for (let i = 0; i < im.w * im.h; i++) {
    if (im.px[i * 4 + 3] === 0) continue;
    const [r, g, b] = fn([im.px[i * 4], im.px[i * 4 + 1], im.px[i * 4 + 2]]);
    im.px[i * 4] = r;
    im.px[i * 4 + 1] = g;
    im.px[i * 4 + 2] = b;
  }
  return im;
}

/** Pieces put together on one canvas, later ones in front: `[image, x, y]`. Trimmed to what is drawn. */
async function compose(pieces) {
  const w = Math.max(...pieces.map(([im, x]) => x + im.w));
  const h = Math.max(...pieces.map(([im, , y]) => y + im.h));
  const out = { w, h, px: Buffer.alloc(w * h * 4) };
  for (const [im, ox, oy] of pieces)
    for (let y = 0; y < im.h; y++)
      for (let x = 0; x < im.w; x++) {
        const s = (y * im.w + x) * 4;
        if (im.px[s + 3] === 0) continue;
        im.px.copy(out.px, ((oy + y) * w + ox + x) * 4, s, s + 4);
      }
  return out;
}

/** A shape of `tiles` laid out on the 16-px grid: rows of piece names (null: nothing there). */
async function tiled(terrain, rows, groundOf) {
  const pieces = [];
  for (const [y, row] of rows.entries())
    for (const [x, piece] of row.entries()) if (piece) pieces.push([await tile(terrain, piece, groundOf), x * 16, y * 16]);
  return compose(pieces);
}

const double = async (im) => raw(sharp(im.px, { raw: { width: im.w, height: im.h, channels: 4 } }).resize(im.w * 2, im.h * 2, { kernel: 'nearest' }));
// Halved, a speck that hung on by one pixel can come loose: only the object's own piece is kept again.
const half = async (im) => largest(await raw(sharp(im.px, { raw: { width: im.w, height: im.h, channels: 4 } }).resize(Math.round(im.w / 2), Math.round(im.h / 2), { kernel: 'nearest' })));

// The pieces the compositions share.
const tall = () => tile('route', 'tall');
const flower = () => tile('route', 'deco');
const pine = () => tile('route', 'tree');
const seaRock = () => raw(sharp(resolve(TILES, 'coast/water-rock.png')));
const boulder = (terrain) => tile(terrain, 'fill');
const pond = () => tiled('lake', [['water-nw', 'water-n', 'water-ne'], ['water-sw', 'water-s', 'water-se']]);

/** Open water: the coast's own sea tiled and cut to an oval, rimmed with its darkest blue (the sea has no shore). */
async function openWater(w, h) {
  const t = await raw(sharp(resolve(TILES, 'coast/water-c.png')));
  let dark = 0;
  for (let i = 1; i < t.w * t.h; i++) if (t.px[i * 4] + t.px[i * 4 + 1] + t.px[i * 4 + 2] < t.px[dark * 4] + t.px[dark * 4 + 1] + t.px[dark * 4 + 2]) dark = i;
  const im = { w, h, px: Buffer.alloc(w * h * 4) };
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && ((x + 0.5 - w / 2) / (w / 2)) ** 2 + ((y + 0.5 - h / 2) / (h / 2)) ** 2 <= 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const rim = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      t.px.copy(im.px, (y * w + x) * 4, (rim ? dark : (y % t.h) * t.w + (x % t.w)) * 4, (rim ? dark : (y % t.h) * t.w + (x % t.w)) * 4 + 4);
    }
  return im;
}
const kindle = {
  peak: () => cutObject('kindle', { left: 238, top: 989, width: 34, height: 38 }),
  spire: () => cutObject('kindle', { left: 224, top: 1069, width: 33, height: 53 }),
  pebble: () => cutObject('kindle', { left: 206, top: 1086, width: 19, height: 19 }),
  mound: () => cutObject('kindle', { left: 191, top: 1103, width: 34, height: 34 }),
};

/** Pixels painted onto an image: `[x, y, [r, g, b]]`, on its own grid. */
function paint(im, dots) {
  for (const [x, y, [r, g, b]] of dots) {
    const i = (y * im.w + x) * 4;
    im.px[i] = r;
    im.px[i + 1] = g;
    im.px[i + 2] = b;
    im.px[i + 3] = 255;
  }
  return im;
}
/** A filled shape on the pixel grid from rows of characters, one colour per letter, anything else left alone. */
const shape = (ox, oy, rows, colours) => rows.flatMap((row, y) => [...row].flatMap((c, x) => (colours[c] ? [[ox + x, oy + y, colours[c]]] : [])));

/**
 * The peak with something drawn on it, on its own 1-px grid before it is doubled: a cave's mouth at its foot, or a
 * crater's glow at its tip. These are the only drawn pixels in the set, in the games' manner — a 1-px dark outline round
 * a flat fill.
 */
async function peakWith(kind) {
  const im = await kindle.peak();
  if (kind === 'cave') {
    // Find the foot of the rock, in the middle: the mouth sits on it.
    // On the right flank's foot, not the middle: the landmark stands to the Pokémon's right, and a mouth in the middle
    // would be behind any Pokémon wider than a Zubat.
    const cx = Math.round(im.w * 0.68);
    let foot = im.h - 1;
    while (foot > 0 && im.px[(foot * im.w + cx) * 4 + 3] === 0) foot--;
    const O = [40, 32, 48];
    const D = [24, 24, 32];
    return paint(im, shape(cx - 5, foot - 8, [
      '..OOOOOO..',
      '.ODDDDDDO.',
      'ODDDDDDDDO',
      'ODDDDDDDDO',
      'ODDDDDDDDO',
      'ODDDDDDDDO',
      'ODDDDDDDDO',
      'ODDDDDDDDO',
    ], { O, D }));
  }
  // The volcano: basalt, its tip glowing.
  recolour(im, ([r, g, b]) => {
    const v = Math.round((r + g + b) / 3);
    return [Math.round(v * 0.62 + 18), Math.round(v * 0.58 + 14), Math.round(v * 0.6 + 20)];
  });
  let tip = 0;
  while (tip < im.h && ![...Array(im.w).keys()].some((x) => im.px[(tip * im.w + x) * 4 + 3])) tip++;
  const xs = [...Array(im.w).keys()].filter((x) => im.px[(tip * im.w + x) * 4 + 3]);
  const cx = Math.round((xs[0] + xs[xs.length - 1]) / 2);
  const R = [224, 72, 32];
  const Y = [248, 184, 56];
  return paint(im, shape(cx - 3, tip, [
    '.RRRRR.',
    'RYYYYYR',
    '.RYYYR.',
    '..RRR..',
    '...R...',
  ], { R, Y }));
}

const PROPS = {
  // The grass every Wild Area's Pokémon stands in, whatever its habitat (not a habitat's: the tuft drawn in front).
  grass: async () => compose([[await tall(), 6, 0], [await tall(), 22, 0], [await tall(), 38, 0], [await tall(), 0, 6], [await tall(), 14, 7], [await tall(), 28, 6], [await tall(), 42, 7]]),
  // (The plain route's Tall Grass has none: the grass every Wild Area stands in is its habitat.)
  meadow: async () => compose([[await flower(), 0, 0], [await flower(), 16, 0], [await flower(), 32, 0], [await flower(), 8, 9], [await flower(), 24, 9]]),
  forest: async () => compose([[await pine(), 16, 0], [await pine(), 0, 10], [await pine(), 32, 10]]),
  // A mountain with a cave's mouth at its foot: Mt. Moon's, Rock Tunnel's, Cerulean Cave's.
  cave: async () => double(await peakWith('cave')),
  ridge: async () => compose([[await kindle.spire(), 0, 0], [await kindle.mound(), 22, 12], [await kindle.pebble(), 46, 30]]),
  river: pond,
  // A sandbank off Route 20, at half its size (the sand is texture; whole, it read as a card), and two of the sea's rocks.
  shore: async () => compose([[await half(await cutObject('route20', { left: 230, top: 198, width: 80, height: 66 })), 0, 10], [await seaRock(), 24, 0], [await seaRock(), 30, 14]]),
  // The open sea: a reef of its rocks, as Route 20 and the Sevii straits are strewn with them.
  sea: async () => compose([[await openWater(64, 30), 0, 8], [await seaRock(), 8, 0], [await seaRock(), 28, 6], [await seaRock(), 44, 2]]),
  'power-plant': async () => half(await cutObject('route10', { left: 46, top: 548, width: 146, height: 122 }, { drop: [{ left: 0, top: 110, width: 30, height: 10 }, { left: 136, top: 108, width: 10, height: 12 }] })),
  tower: async () => half(await cutObject('route10', { left: 236, top: 1146, width: 120, height: 134 }, { edges: 'tlr' })),
  swamp: async () => {
    const marsh = recolour(await pond(), ([r, g, b]) => (b > r && b > g ? [Math.round(r * 0.55 + 70), Math.round(g * 0.45 + 30), Math.round(b * 0.6 + 40)] : [r, g, b]));
    return compose([[marsh, 0, 10], [await tall(), 2, 0], [await tall(), 34, 2]]);
  },
  // Sandstone: the ridge's rocks turned the red of a mesa.
  badlands: async () => {
    const sand = ([r, g, b]) => [Math.min(255, Math.round(r * 1.08 + 16)), Math.round(g * 0.78 + 10), Math.round(b * 0.5)];
    return compose([[recolour(await kindle.mound(), sand), 0, 8], [recolour(await kindle.peak(), sand), 22, 0], [recolour(await kindle.pebble(), sand), 48, 26]]);
  },
  volcano: async () => double(await peakWith('volcano')),
  lake: async () => compose([[await pond(), 0, 6], [await boulder('ice-cave'), 16, 0]]),
  sky: async () => compose([[await kindle.spire(), 0, 0], [await kindle.spire(), 22, 10], [await kindle.pebble(), 46, 40]]),
  // A Tanoby chamber's front, out of the rock it is set in, with the grass grown up round its steps.
  ruins: async () =>
    compose([
      [await cutObject('tanoby', { left: 140, top: 28, width: 88, height: 92 }, { share: 0, drop: [{ left: 8, top: 14, width: 6, height: 40 }] }), 0, 0],
      [await tall(), 16, 66],
      [await tall(), 62, 64],
    ]),
};

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2).filter((a) => PROPS[a]);
for (const [id, make] of Object.entries(PROPS)) {
  if (only.length && !only.includes(id)) continue;
  const im = await make();
  const file = resolve(OUT, `${id}.png`);
  await sharp(im.px, { raw: { width: im.w, height: im.h, channels: 4 } }).trim({ threshold: 0 }).png({ palette: true }).toFile(file);
  const meta = await sharp(file).metadata();
  console.log(`wrote public/art/map/habitat/${id}.png (${meta.width}×${meta.height})`);
}
