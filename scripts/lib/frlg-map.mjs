// FireRed / LeafGreen map rendering from pret/pokefirered's own data: indexed tile sheets, JASC palettes, metatiles
// and layouts, drawn exactly as the GBA does (8 × 8 tiles, a metatile is two layers of 2 × 2 tiles, colour 0 of the
// top layer is transparent). Nothing is resampled: every pixel is a tile pixel in its tileset's palette.
import { inflateSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** include/fieldmap.h — FRLG's split between the primary and secondary tileset. */
export const NUM_TILES_IN_PRIMARY = 640;
export const NUM_METATILES_IN_PRIMARY = 640;
export const NUM_PALS_IN_PRIMARY = 7;

/** Palette indices of an indexed PNG (1/2/4/8 bpp), as one byte per pixel. */
export function decodeIndexedPng(bytes) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  const idat = [];
  while (pos < bytes.length) {
    const len = bytes.readUInt32BE(pos);
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    const data = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      if (data[9] !== 3 && data[9] !== 0) throw new Error(`not an indexed PNG (colour type ${data[9]})`);
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = Math.ceil((width * depth) / 8);
  const out = new Uint8Array(width * height);
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = Uint8Array.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    const bpp = Math.max(1, depth / 8);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      if (f === 1) line[i] = (line[i] + a) & 255;
      else if (f === 2) line[i] = (line[i] + b) & 255;
      else if (f === 3) line[i] = (line[i] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    for (let x = 0; x < width; x++) {
      const bit = x * depth;
      out[y * width + x] = (line[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    }
    prev = line;
  }
  return { width, height, index: out };
}

const readPal = (text) =>
  text
    .trim()
    .split(/\r?\n/)
    .slice(3)
    .map((l) => l.trim().split(/\s+/).map(Number));

/** A tileset as pret lays it out: `<dir>/tiles.png`, `<dir>/palettes/NN.pal`, `<metaDir>/metatiles.bin`. */
export async function loadTileset(dir, metaDir = dir) {
  const sheet = decodeIndexedPng(await readFile(join(dir, 'tiles.png')));
  const tiles = [];
  for (let ty = 0; ty < sheet.height / 8; ty++)
    for (let tx = 0; tx < sheet.width / 8; tx++) {
      const t = new Uint8Array(64);
      for (let y = 0; y < 8; y++)
        for (let x = 0; x < 8; x++) t[y * 8 + x] = sheet.index[(ty * 8 + y) * sheet.width + tx * 8 + x];
      tiles.push(t);
    }
  const palettes = [];
  for (let i = 0; i < 16; i++)
    palettes.push(
      readPal(await readFile(join(dir, 'palettes', `${String(i).padStart(2, '0')}.pal`), 'utf8')),
    );
  const meta = await readFile(join(metaDir, 'metatiles.bin'));
  const metatiles = [];
  for (let i = 0; i < meta.length / 16; i++)
    metatiles.push(Array.from({ length: 8 }, (_, k) => meta.readUInt16LE(i * 16 + k * 2)));
  return { tiles, palettes, metatiles };
}

/** Draws metatile `id` of the primary/secondary pair into an RGBA buffer at pixel (x, y). */
export function drawMetatile(rgba, width, id, x, y, primary, secondary) {
  const mt =
    id < NUM_METATILES_IN_PRIMARY
      ? primary.metatiles[id]
      : secondary.metatiles[id - NUM_METATILES_IN_PRIMARY];
  if (!mt) return;
  for (let layer = 0; layer < 2; layer++)
    for (let q = 0; q < 4; q++) {
      const e = mt[layer * 4 + q];
      const ti = e & 0x3ff;
      const hf = (e >> 10) & 1;
      const vf = (e >> 11) & 1;
      const pal = e >> 12;
      const tile = ti < NUM_TILES_IN_PRIMARY ? primary.tiles[ti] : secondary.tiles[ti - NUM_TILES_IN_PRIMARY];
      const colours = pal < NUM_PALS_IN_PRIMARY ? primary.palettes[pal] : secondary.palettes[pal];
      if (!tile || !colours) continue;
      const ox = x + (q & 1) * 8;
      const oy = y + (q >> 1) * 8;
      for (let py = 0; py < 8; py++)
        for (let px = 0; px < 8; px++) {
          const c = tile[(vf ? 7 - py : py) * 8 + (hf ? 7 - px : px)];
          if (c === 0 && layer === 1) continue;
          const [r, g, b] = colours[c];
          const o = ((oy + py) * width + ox + px) * 4;
          rgba[o] = r;
          rgba[o + 1] = g;
          rgba[o + 2] = b;
          rgba[o + 3] = 255;
        }
    }
}

/** A grid of metatile ids (rows of numbers) drawn as one RGBA image. */
export function renderGrid(grid, primary, secondary) {
  const h = grid.length;
  const w = grid[0].length;
  const rgba = new Uint8Array(w * 16 * h * 16 * 4);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++) drawMetatile(rgba, w * 16, grid[r][c], c * 16, r * 16, primary, secondary);
  return { data: rgba, width: w * 16, height: h * 16 };
}

/** pret's `map.bin`: u16 blocks, metatile id in the low 10 bits. */
export function readLayout(bytes, width) {
  const ids = [];
  for (let i = 0; i < bytes.length / 2; i++) ids.push(bytes.readUInt16LE(i * 2) & 0x3ff);
  const rows = [];
  for (let i = 0; i < ids.length; i += width) rows.push(ids.slice(i, i + width));
  return rows;
}

// ── Maps by name, fetched from pret at a pinned commit ──────────────────────────────────────────────────────────────
/** pret/pokefirered's revision every FRLG room in the game is built from. */
export const PRET_COMMIT = 'ce6406d8c2eaf46d543c8a2606de0c3cb1951982';
const RAW = `https://raw.githubusercontent.com/pret/pokefirered/${PRET_COMMIT}`;

/**
 * A pret source tree cached under `dir`: `file(path)` fetches once (or again with `refresh`) and records each file's
 * URL and hash in `sources`; `map(name)` renders a layout by its name with the tilesets pret's headers give it (a
 * tileset may draw with another one's tiles: SilphCo with the Condominiums').
 */
export function pretSource(dir, { refresh = false, onFile = () => {} } = {}) {
  const cache = new Map();
  async function file(path) {
    if (cache.has(path)) return cache.get(path);
    const { access, mkdir, writeFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    const local = join(dir, path);
    const have = await access(local).then(
      () => true,
      () => false,
    );
    if (refresh || !have) {
      const response = await fetch(`${RAW}/${path}`);
      if (!response.ok) throw new Error(`${response.status}: ${RAW}/${path}`);
      await mkdir(dirname(local), { recursive: true });
      await writeFile(local, Buffer.from(await response.arrayBuffer()));
    }
    const bytes = await readFile(local);
    onFile({ path, url: `${RAW}/${path}`, bytes });
    cache.set(path, bytes);
    return bytes;
  }
  const text = async (path) => (await file(path)).toString('utf8');
  const tilesets = new Map();
  async function tileset(symbol) {
    if (tilesets.has(symbol)) return tilesets.get(symbol);
    const headers = await text('src/data/tilesets/headers.h');
    const block = new RegExp(String.raw`${symbol}\s*=\s*\{([^}]*)\}`).exec(headers)?.[1];
    if (!block) throw new Error(`no tileset ${symbol}`);
    const field = (k) => new RegExp(String.raw`\.${k}\s*=\s*(\w+)`).exec(block)[1];
    const graphics = await text('src/data/tilesets/graphics.h');
    const metas = await text('src/data/tilesets/metatiles.h');
    // A few tilesets are declared outside graphics.h; they follow pret's folder convention (DepartmentStore →
    // secondary/department_store).
    const folder = (name) =>
      `data/tilesets/${/isSecondary\s*=\s*TRUE/.test(block) ? 'secondary' : 'primary'}/${name
        .replace(/^g\w+?_/, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([a-zA-Z])([0-9])/g, '$1_$2')
        .toLowerCase()}`;
    const tilesPath =
      new RegExp(String.raw`${field('tiles')}\[\]\s*=\s*INCBIN_U32\("([^"]+)/tiles\.4bpp`).exec(
        graphics,
      )?.[1] ?? folder(field('tiles'));
    const palBlock = new RegExp(String.raw`${field('palettes')}\[\]\[16\]\s*=\s*\{([^}]*)\}`).exec(
      graphics,
    )?.[1];
    const palPaths = palBlock
      ? [...palBlock.matchAll(/"([^"]+)\.gbapal"/g)].map((m) => `${m[1]}.pal`)
      : Array.from(
          { length: 16 },
          (_, i) => `${folder(field('palettes'))}/palettes/${String(i).padStart(2, '0')}.pal`,
        );
    const metaPath =
      new RegExp(String.raw`${field('metatiles')}\[\]\s*=\s*INCBIN_U16\("([^"]+)"`).exec(metas)?.[1] ??
      `${folder(field('metatiles'))}/metatiles.bin`;
    await file(`${tilesPath}/tiles.png`);
    for (const p of palPaths) await file(p);
    await file(metaPath);
    const ts = await loadTileset(join(dir, tilesPath), join(dir, metaPath.replace(/\/metatiles\.bin$/, '')));
    tilesets.set(symbol, ts);
    return ts;
  }
  async function map(name) {
    const layouts = JSON.parse(await text('data/layouts/layouts.json')).layouts;
    const l = layouts.find((x) => x.name === `${name}_Layout`);
    if (!l) throw new Error(`no layout ${name}`);
    const grid = readLayout(await file(l.blockdata_filepath), l.width);
    return { grid, primary: await tileset(l.primary_tileset), secondary: await tileset(l.secondary_tileset) };
  }
  return { file, tileset, map };
}
