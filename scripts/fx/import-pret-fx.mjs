// Move animations from FireRed / LeafGreen's own battle-animation graphics (pret/pokefirered, pinned like the rooms):
// every sprite tag the move scripts load, in the palette its tag gives it, cut into the frames its sprite templates
// draw it at; every animation background, rendered from its tiles, tilemap and palette; and, per move script, which
// sprites and backgrounds it uses. Nothing is resampled: every pixel is a pret pixel. Re-palettes (`VARIANTS`) swap a
// sprite's colours for another ramp the way the GBA's own blends do (Ice Punch is Fire Punch's fist, tinted).
//
//   node scripts/fx/import-pret-fx.mjs [--fetch]
//
// Writes public/art/fx/pret/<tag>.png (frames stacked downward, as pret stores them), public/art/fx/bg/<bg>.png and
// src/ui/fx/pret-anims.json. Sources are cached under docs/art/sources/pret-battle-anims (with their hashes in
// public/art/fx/manifest.json).
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { PRET_COMMIT, pretSource } from '../lib/frlg-map.mjs';
import { VARIANTS } from './variants.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sources = new Map();
const src = pretSource(resolve(root, 'docs/art/sources/pret-battle-anims'), {
  refresh: process.argv.includes('--fetch'),
  onFile: ({ path, url, bytes }) => sources.set(path, { path, url, sha256: createHash('sha256').update(bytes).digest('hex') }),
});
const text = async (p) => (await src.file(p)).toString('utf8');
const maybe = async (p) => src.file(p).catch(() => null);

const ANIM_C = ['battle_anim', 'bug', 'dark', 'dragon', 'effects_1', 'effects_2', 'effects_3', 'electric', 'fight', 'fire', 'flying', 'ghost', 'ground', 'ice', 'mon_movement', 'mons', 'normal', 'poison', 'psychic', 'rock', 'smokescreen', 'special', 'status_effects', 'utility_funcs', 'water'].map(
  (n) => `src/${n === 'battle_anim' ? n : `battle_anim_${n}`}.c`,
);

/** An indexed PNG: its palette indices and its own PLTE. */
function readPng(bytes) {
  let pos = 8;
  let width = 0, height = 0, depth = 0, ctype = 0;
  const idat = [];
  let plte = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ((width = data.readUInt32BE(0)), (height = data.readUInt32BE(4)), (depth = data[8]), (ctype = data[9]));
    else if (type === 'PLTE') for (let i = 0; i < data.length; i += 3) plte.push([data[i], data[i + 1], data[i + 2]]);
    else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  if (ctype !== 3 && ctype !== 0) throw new Error(`not indexed (colour type ${ctype})`);
  if (ctype === 0) plte = Array.from({ length: 1 << depth }, (_, i) => Array(3).fill(Math.round((i * 255) / ((1 << depth) - 1))));
  const raw = inflateSync(Buffer.concat(idat));
  const stride = Math.ceil((width * depth) / 8);
  const bpp = Math.max(1, depth / 8);
  const index = new Uint8Array(width * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      if (f === 1) line[i] = (line[i] + a) & 255;
      else if (f === 2) line[i] = (line[i] + b) & 255;
      else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < width; x++) {
      const bit = x * depth;
      index[y * width + x] = (line[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    }
    prev = line;
  }
  return { width, height, index, plte };
}

/** A JASC palette file's colours, rounded to the GBA's 15-bit colour as the game shows them. */
const jasc = (t) =>
  t.trim().split(/\r?\n/).slice(3).map((l) => l.trim().split(/\s+/).map(Number));
const gba = ([r, g, b]) => [r, g, b].map((v) => ((v >> 3) << 3) | (v >> 5));

const key = (tag) => tag.replace(/^ANIM_TAG_/, '').toLowerCase().replace(/_/g, '-');
const bgKey = (bg) => bg.replace(/^BG_/, '').replace(/_(OPPONENT|PLAYER|CONTESTS)$/, '').toLowerCase().replace(/_/g, '-');

const graphics = await text('src/graphics.c');
const table = await text('src/data/battle_anim.h');
const incbin = {};
for (const m of graphics.matchAll(/const u(?:32|16|8) (\w+)\[\]\s*=\s*INCBIN_U(?:32|16|8)\("([^"]+)"/g)) incbin[m[1]] = m[2];
const tagGfx = {}, tagPal = {};
for (const m of table.matchAll(/\{(gBattleAnimSpriteGfx_\w+),\s*0x\w+,\s*(ANIM_TAG_\w+)\}/g)) tagGfx[m[2]] = incbin[m[1]];
for (const m of table.matchAll(/\{(gBattleAnimSpritePal_\w+),\s*(ANIM_TAG_\w+)\}/g)) tagPal[m[2]] = incbin[m[1]];

// Frame sizes: the OAM shape each tag's sprite templates draw it at (the commonest, if several).
const sizes = {};
// The C callback that moves each sprite template: a script that creates one of the attacker-moving ones lunges.
const callbackOf = {};
const blended = {};
for (const file of ANIM_C) {
  const c = await text(file);
  for (const m of c.matchAll(/struct\s+SpriteTemplate\s+(\w+)\s*=\s*\{[\s\S]*?\.callback\s*=\s*(\w+)/g)) callbackOf[m[1]] = m[2];
  for (const m of c.matchAll(/\.tileTag\s*=\s*(ANIM_TAG_\w+)[\s\S]{0,200}?\.oam\s*=\s*&gOamData_(\w+?)_(\d+)x(\d+)/g)) {
    const s = (sizes[m[1]] ??= {});
    const k = `${m[3]}x${m[4]}`;
    s[k] = (s[k] ?? 0) + 1;
    // An ObjBlend OAM is drawn alpha-blended over the stage (a barrier, a sunbeam): see-through, never opaque.
    if (/Blend/.test(m[2])) blended[m[1]] = (blended[m[1]] ?? 0) + 1;
    else blended[m[1]] = (blended[m[1]] ?? 0) - 1;
  }
}

// Which tags and backgrounds each move script uses, following its calls and gotos.
const script = (await text('data/battle_anim_scripts.s')).split(/\r?\n/);
const labels = {};
let cur = null;
for (const l of script) {
  const m = /^(\w+):{1,2}\s*$/.exec(l);
  if (m) labels[(cur = m[1])] = [];
  else if (cur) labels[cur].push(l.trim());
}
/**
 * §9.9.2 — what moves the attacker itself across the field in pret: a lunge, a slide, a dip, a jump. A Melee move
 * whose script runs none of these lands its sprite on the target while its user stays in its card (Bite, Cut).
 */
const LUNGE = /DoHorizontalLunge|SlideMon|WindUpLunge|TranslateMon|AttackerPunchWithTrace|DoVerticalDip|AnimBowMon|SlideOffScreen|VoltTackle|FlyBallUp|BounceBall|RapidSpin|AnimJumpKick|SlidingKick|DiveBall|SkullBash/;
function walk(label, seen = new Set(), out = { sprites: new Set(), bgs: new Set(), lunge: false }) {
  if (seen.has(label) || !labels[label]) return out;
  seen.add(label);
  for (const l of labels[label]) {
    const t = /loadspritegfx (ANIM_TAG_\w+)/.exec(l);
    if (t) out.sprites.add(t[1]);
    const made = /^create(?:sprite|visualtask) (\w+)/.exec(l);
    if (made && LUNGE.test(`${made[1]} ${callbackOf[made[1]] ?? ''}`)) out.lunge = true;
    for (const b of l.matchAll(/\b(BG_\w+)/g)) if (b[1] !== 'BG_NONE') out.bgs.add(b[1]);
    for (const w of l.split(/[\s,]+/).slice(1)) if (labels[w] && (!w.startsWith('Move_') || l.startsWith('goto'))) walk(w, seen, out);
  }
  return out;
}
const moves = {};
const usedTags = new Set(), usedBgs = new Set();
for (const label of Object.keys(labels)) {
  if (!label.startsWith('Move_') || label === 'Move_NONE') continue;
  const { sprites, bgs, lunge } = walk(label);
  const id = label.slice(5).toLowerCase().replace(/_/g, '-');
  moves[id] = { sprites: [...sprites].filter((t) => tagGfx[t]?.includes('/sprites/')).map(key), bgs: [...bgs].map(bgKey), ...(lunge ? { lunge } : {}) };
  sprites.forEach((t) => usedTags.add(t));
  bgs.forEach((b) => b !== 'BG_NONE' && usedBgs.add(b));
}
// Every sprite pret has, not only those FRLG's scripts load: the Gen IV moves are composed from the rest.
for (const tag of Object.keys(tagGfx)) usedTags.add(tag);

const outDir = resolve(root, 'public/art/fx');
await rm(resolve(outDir, 'pret'), { recursive: true, force: true });
await rm(resolve(outDir, 'bg'), { recursive: true, force: true });
await mkdir(resolve(outDir, 'pret'), { recursive: true });
await mkdir(resolve(outDir, 'bg'), { recursive: true });

async function palette(gbapal, fallback) {
  const base = gbapal.replace(/\.gbapal(\.lz)?$/, '');
  const pal = await maybe(`${base}.pal`);
  if (pal) return jasc(pal.toString('utf8')).map(gba);
  const png = await maybe(`${base}.png`);
  return (png ? readPng(png).plte : fallback).map(gba);
}

const write = (rgba, w, h, path) => sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path);

const sprites = {};
const decoded = {};
for (const tag of [...usedTags].sort()) {
  const gfx = tagGfx[tag];
  if (!gfx || !gfx.includes('/sprites/')) continue;
  // A sheet is one PNG, or several pret's graphics rules `cat` together (ice_crystals_0…4 → ice_crystals).
  const stem = gfx.replace(/\.4bpp(\.lz)?$/, '');
  const parts = [];
  const whole = await maybe(`${stem}.png`);
  if (whole) parts.push(readPng(whole));
  else for (let n = 0; ; n++) {
    const p = await maybe(`${stem}_${n}.png`);
    if (!p) break;
    parts.push(readPng(p));
  }
  if (!parts.length) continue;
  // The GBA reads a sprite's tiles in order (1-D mapping): gbagfx stores them row by row across each sheet, and each
  // frame is the next run of (fw/8 × fh/8) tiles, laid out row by row inside the frame. Re-tile into a strip of frames.
  const tiles = [];
  for (const p of parts)
    for (let ty = 0; ty < p.height / 8; ty++)
      for (let tx = 0; tx < p.width / 8; tx++) {
        const t = new Uint8Array(64);
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) t[y * 8 + x] = p.index[(ty * 8 + y) * p.width + tx * 8 + x];
        tiles.push(t);
      }
  const sheet = parts[0];
  const pal = tagPal[tag] ? await palette(tagPal[tag], sheet.plte) : sheet.plte.map(gba);
  const s = sizes[tag];
  const [fw, fh] = s ? Object.entries(s).sort((a, b) => b[1] - a[1])[0][0].split('x').map(Number) : [sheet.width, sheet.height % sheet.width ? sheet.height : sheet.width];
  const per = (fw / 8) * (fh / 8);
  let frames = Math.max(1, Math.floor(tiles.length / per));
  // A sheet padded with blank frames at its end (Amnesia's): they are dropped, so a strip played through and held
  // stops on its last drawn frame, never on nothing.
  const blank = (f) => tiles.slice(f * per, (f + 1) * per).every((t) => t.every((ix) => ix % 16 === 0));
  while (frames > 1 && blank(frames - 1)) frames--;
  const index = new Uint8Array(fw * fh * frames);
  for (let t = 0; t < Math.min(tiles.length, frames * per); t++) {
    const f = Math.floor(t / per), i = t % per;
    const dx = (i % (fw / 8)) * 8, dy = f * fh + Math.floor(i / (fw / 8)) * 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) index[(dy + y) * fw + dx + x] = tiles[t][y * 8 + x];
  }
  const img = { width: fw, height: fh * frames, index };
  decoded[key(tag)] = { img, pal };
  sprites[key(tag)] = { w: fw, h: fh, frames, ...(blended[tag] > 0 ? { blend: true } : {}) };
}

/** The sprite's pixels in a palette: colour 0 is transparent, as on the GBA. */
function paint({ img }, pal) {
  const rgba = new Uint8Array(img.width * img.height * 4);
  for (let i = 0; i < img.index.length; i++) {
    const ix = img.index[i];
    if (ix % 16 === 0) continue;
    const [r, g, b] = pal[ix] ?? pal[ix % 16] ?? [255, 0, 255];
    rgba.set([r, g, b, 255], i * 4);
  }
  return rgba;
}

for (const [k, d] of Object.entries(decoded)) await write(paint(d, d.pal), d.img.width, d.img.height, resolve(outDir, 'pret', `${k}.png`));

// Re-palettes: each colour keeps its lightness and takes the variant's hue and chroma (OKLCh), so the ramp stays a ramp.
const toLin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
function oklab([r, g, b]) {
  [r, g, b] = [r, g, b].map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function rgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map(toSrgb);
}
for (const [name, v] of Object.entries(VARIANTS)) {
  const d = decoded[v.base];
  if (!d) throw new Error(`variant ${name}: no sprite ${v.base}`);
  const pal = d.pal.map((c) => {
    const [L, a, b] = oklab(c);
    const chroma = Math.hypot(a, b) * (v.chroma ?? 1) + (v.minChroma ?? 0);
    const h = (v.hue * Math.PI) / 180;
    return gba(rgb([Math.min(0.98, Math.max(0.05, L * (v.light ?? 1) + (v.lift ?? 0))), chroma * Math.cos(h), chroma * Math.sin(h)]));
  });
  await write(paint(d, pal), d.img.width, d.img.height, resolve(outDir, 'pret', `${name.replace('@', '_')}.png`));
  sprites[name] = { ...sprites[v.base] };
}

// Backgrounds: tiles × tilemap × the one 16-colour palette the game loads for them (into BG bank 2), cropped to the
// GBA's 240 × 160 screen (the map's last columns are off-screen and hold other data).
const bgs = {};
for (const m of table.matchAll(/\[(BG_\w+)\]\s*=\s*\{(\w+),\s*(\w+),\s*(\w+)\}/g)) {
  const [, bg, image, pal, map] = m;
  const k = bgKey(bg);
  if (bgs[k] || !usedBgs.has(bg) || bg === 'BG_NONE') continue;
  const tilesPng = await maybe(incbin[image].replace(/\.4bpp(\.lz)?$/, '.png'));
  const mapBin = await maybe(incbin[map].replace(/\.bin\.lz$/, '.bin'));
  if (!tilesPng || !mapBin) continue;
  const tiles = readPng(tilesPng);
  const colours = await palette(incbin[pal], tiles.plte);
  const n = mapBin.length / 2;
  const cols = 32, rows = Math.min(20, Math.floor(n / cols));
  const W = 240, H = 160, rgba = new Uint8Array(W * H * 4);
  const perRow = tiles.width / 8;
  for (let t = 0; t < cols * rows; t++) {
    const e = mapBin.readUInt16LE(t * 2);
    const id = e & 0x3ff, hf = e & 0x400, vf = e & 0x800;
    const tx = (id % perRow) * 8, ty = Math.floor(id / perRow) * 8;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const sx = tx + (hf ? 7 - x : x), sy = ty + (vf ? 7 - y : y);
        if (sy >= tiles.height) continue;
        const ix = tiles.index[sy * tiles.width + sx] & 15;
        if (!ix) continue;
        const c = colours[ix];
        const px = (t % cols) * 8 + x, py = ((t / cols) | 0) * 8 + y;
        if (px >= W || py >= H) continue;
        const o = py * W + px;
        rgba.set([...c, 255], o * 4);
      }
  }
  await write(rgba, W, H, resolve(outDir, 'bg', `${k}.png`));
  bgs[k] = { w: W, h: H };
}
for (const mv of Object.values(moves)) mv.bgs = mv.bgs.filter((b) => bgs[b]);

await writeFile(
  resolve(root, 'src/ui/fx/pret-anims.json'),
  `${JSON.stringify({ commit: PRET_COMMIT, sprites, bgs, moves }, null, 1)}\n`,
);
await writeFile(
  resolve(outDir, 'manifest.json'),
  `${JSON.stringify({ rights: 'Pokémon artwork © Nintendo / Creatures / GAME FREAK; non-commercial fan use. Battle-animation graphics: pret/pokefirered.', script: 'scripts/fx/import-pret-fx.mjs', resampling: 'none', commit: PRET_COMMIT, sources: [...sources.values()].sort((a, b) => a.path.localeCompare(b.path)) }, null, 1)}\n`,
);
console.log(`${Object.keys(sprites).length} sprites (${Object.keys(VARIANTS).length} re-palettes), ${Object.keys(bgs).length} backgrounds, ${Object.keys(moves).length} move scripts`);
