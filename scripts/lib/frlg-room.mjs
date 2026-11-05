// Composing an FRLG room: a grid of real metatiles (one map's tilesets), plus pieces lifted from other maps with their
// own palettes, plus the series' sprites, all at native pixels. Every room built by scripts/build-rooms.mjs and the
// Black Market use this. Nothing is resampled, and a room that needs more than 256 colours is refused rather than
// quantised (its pixels would stop being the games').
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { pretSource, renderGrid } from './frlg-map.mjs';

export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const rawImage = (img) =>
  sharp(Buffer.from(img.data), { raw: { width: img.width, height: img.height, channels: 4 } });

/** The shared pret tree, every file it reads recorded for the manifests. */
export function pretTree(dir, refresh = false) {
  const sources = new Map();
  const src = pretSource(dir, {
    refresh,
    onFile: ({ path, url, bytes }) => sources.set(path, { path: `pret/${path}`, url, sha256: sha(bytes) }),
  });
  return { ...src, sources: () => [...sources.values()] };
}

/**
 * A room on one map's tilesets. `grid` starts as a copy of `base` (a map name) or a `cols × rows` fill; `edit` helpers
 * write metatile ids, `put` lays an image over the render at a pixel.
 */
export async function room(src, { base, cols, rows, fill = 0, tilesetsOf = base, keyBlack = false }) {
  const tiles = await src.map(tilesetsOf);
  const grid = base
    ? (await src.map(base)).grid.map((r) => [...r])
    : Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
  const layers = [];
  const used = [];
  return {
    grid,
    set: (c, r, id) => (grid[r][c] = id),
    fill: (c, r, w, h, id) => {
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y][x] = id;
    },
    paste: (rowsOf, c, r) =>
      rowsOf.forEach((row, dy) => row.forEach((id, dx) => id !== null && (grid[r + dy][c + dx] = id))),
    /** A rectangle of metatiles from another map on the same tilesets. */
    lift: async (name, c0, r0, w, h, c, r) => {
      const g = (await src.map(name)).grid;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) grid[r + y][c + x] = g[r0 + y][c0 + x];
      used.push({ lift: name, from: [c0, r0, w, h], to: [c, r] });
    },
    put: (input, x, y, note) => {
      layers.push({ input, left: x, top: y });
      if (note) used.push({ put: note, at: [x, y] });
    },
    used,
    /** Renders, composites the layers, crops, and writes `file`; returns its record. */
    async write(file, crop) {
      const tilesImg = renderGrid(grid, tiles.primary, tiles.secondary);
      // `keyBlack`: the map's black surround becomes the screen's own background. Only the tiles are keyed, before
      // anything is laid on them: the tiles outline in slate, but the overworld sprites outline in pure black.
      if (keyBlack)
        for (let i = 0; i < tilesImg.data.length; i += 4)
          if (tilesImg.data[i] === 0 && tilesImg.data[i + 1] === 0 && tilesImg.data[i + 2] === 0) tilesImg.data[i + 3] = 0;
      const full = await rawImage(tilesImg)
        .composite(layers)
        .png()
        .toBuffer();
      const c = crop ?? { x: 0, y: 0, w: grid[0].length * 16, h: grid.length * 16 };
      const { data, info } = await sharp(full)
        .extract({ left: c.x, top: c.y, width: c.w, height: c.h })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const colours = new Set();
      for (let i = 0; i < data.length; i += 4)
        colours.add(`${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
      if (colours.size > 256)
        throw new Error(`${file}: ${colours.size} colours — refusing to quantise authentic pixels`);
      const bytes = await sharp(data, { raw: info })
        .png({ palette: true, colours: 256, dither: 0 })
        .toBuffer();
      await writeFile(file, bytes);
      return { width: c.w, height: c.h, colours: colours.size, sha256: sha(bytes), crop: c, grid };
    },
  };
}

/** Every colour inside a rectangle of a map's render: a floor to key out of a piece lifted from that map. */
export async function colours(src, name, [x0, y0, w, h]) {
  const m = await src.map(name);
  const img = renderGrid(m.grid, m.primary, m.secondary);
  const seen = new Map();
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * img.width + x) * 4;
      seen.set(`${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`, [
        img.data[i],
        img.data[i + 1],
        img.data[i + 2],
      ]);
    }
  return [...seen.values()];
}

/** A rectangle of a map's render as a PNG, `key` colours made transparent. */
export async function piece(src, name, [x, y, w, h], key = []) {
  const m = await src.map(name);
  const { data, info } = await rawImage(renderGrid(m.grid, m.primary, m.secondary))
    .extract({ left: x, top: y, width: w, height: h })
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4)
    if (key.some((c) => c.every((v, k) => data[i + k] === v))) data[i + 3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

/** An overworld sprite's frame `frame` (left to right), its palette-zero backdrop keyed out. */
export async function sprite(src, path, w, h, frame = 0) {
  const bytes = await src.file(path);
  // A sheet's frames are its height square-ish: 16 × 16 for the small people, 16 × 32 for most, as tall as the sheet.
  if (h === undefined) h = (await sharp(bytes).metadata()).height;
  if (w === undefined) w = h === 32 && path.includes('/pokemon/') ? 32 : 16;
  const { data, info } = await sharp(bytes)
    .extract({ left: frame * w, top: 0, width: w, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  for (let i = 0; i < data.length; i += 4)
    if (data[i] === r && data[i + 1] === g && data[i + 2] === b) data[i + 3] = 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

/** One of the game's own item icons (public/art/items, already credited), as bytes. */
export const icon = (root, id) => readFile(`${root}/public/art/items/${id}.png`);

/** A small grid of metatiles on another map's tilesets, rendered on its own, `key` colours made transparent. */
export async function gridPiece(src, tilesetsOf, rows, key = []) {
  const m = await src.map(tilesetsOf);
  const img = renderGrid(rows, m.primary, m.secondary);
  for (let i = 0; i < img.data.length; i += 4)
    if (key.some((c) => c.every((v, k) => img.data[i + k] === v))) img.data[i + 3] = 0;
  return rawImage(img).png().toBuffer();
}
