#!/usr/bin/env node
// Turn a generated PNG into the web asset the game actually loads.
//
// The image models return 2K/4K PNGs of 3–6 MB. Shipping those would make the first paint of every fight a
// multi-megabyte download, so generation and installation are two steps: generate into playtest/artgen/,
// look at the candidates, then install the one you picked at the size and format the loader expects.
//
// Usage:
//   node scripts/install-art.mjs stage <src.png> <name>    → public/art/stages/<name>.jpg   1920×1080 q82
//   node scripts/install-art.mjs map <src.png> <name>      → public/art/map/<name>.jpg      1920×1080 q82
//   node scripts/install-art.mjs vista <src.png> <name>    → public/art/ui/<name>.jpg       1920×1080 q86
//   node scripts/install-art.mjs pixel-vista <src> <name>  → public/art/ui/<name>.png       1920×1080 nearest
//   node scripts/install-art.mjs icon <src.png> <name> [px]→ public/art/items/<name>.png    128×128
//
// Every profile is lossy on purpose except `icon`. Backdrops sit behind a scrim and a blur, so q82 is
// invisible; an icon sits at 100 % on a card, so it stays PNG.
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PROFILES = {
  stage: { dir: 'public/art/stages', ext: 'jpg', w: 1920, h: 1080, quality: 82, fit: 'cover' },
  map: { dir: 'public/art/map', ext: 'jpg', w: 1920, h: 1080, quality: 82, fit: 'cover' },
  // Pixel art has to be scaled with nearest-neighbour or the hard edges turn to mush, which defeats the point
  // of asking for pixel art. Generate small, blow it up in whole-ish steps, and keep it lossless.
  pixel: { dir: 'public/art/map', ext: 'png', w: 1920, h: 1080, fit: 'cover', kernel: 'nearest', palette: true },
  vista: { dir: 'public/art/ui', ext: 'jpg', w: 1920, h: 1080, quality: 86, fit: 'cover' },
  // The menu vista is pixel art too as of v0.5, so it needs `pixel`'s treatment in `vista`'s directory.
  // JPEG is the wrong container for it twice over: the ringing lands exactly on the hard edges that make it
  // read as pixel art, and a 16-colour tile palette compresses smaller as a PNG than as a photo.
  'pixel-vista': { dir: 'public/art/ui', ext: 'png', w: 1920, h: 1080, fit: 'cover', kernel: 'nearest', palette: true },
  // §2.11 — a City's lobby background: the same generated top-down pixel register as the route plate.
  town: { dir: 'public/art/towns', ext: 'png', w: 1920, h: 1080, fit: 'cover', kernel: 'nearest', palette: true },
  icon: { dir: 'public/art/items', ext: 'png', w: 128, h: 128, fit: 'contain', cut: 42 },
  // An official render already carries its own alpha, so cutting a background out of it would only chew
  // into the artwork. Resize and ship.
  item: { dir: 'public/art/items', ext: 'png', w: 128, h: 128, fit: 'contain' },
  // A node badge is a cream disc on a white field, and cream is closer to white than a Potion is to its
  // background. A tight tolerance takes the white and leaves the disc.
  node: { dir: 'public/art/icons/map', ext: 'png', w: 160, h: 160, fit: 'contain', cut: 16 },
  // A real emblem (an official badge, a building sprite, a trainer sprite) mounted on the map's cream disc.
  // No cutout: these assets already have their own alpha.
  badge: { dir: 'public/art/icons/map', ext: 'png', w: 160, h: 160, disc: true },
};

const [kind, src, name, sizeArg] = process.argv.slice(2);
const profile = PROFILES[kind];
if (!profile || !src || !name) {
  console.error('usage: install-art <stage|map|pixel|vista|town|icon|item|node|badge> <src.png> <name> [px]');
  console.error(`profiles: ${Object.keys(PROFILES).join(', ')}`);
  process.exit(2);
}

const px = Number(sizeArg) || 0;
const width = px || profile.w;
const height = px || profile.h;
const dest = `${profile.dir}/${name}.${profile.ext}`;

await mkdir(dirname(resolve(dest)), { recursive: true });

/**
 * Knock a flat studio background out of an icon.
 *
 * The prompt asks for the object on a plain cream field, so the background is one near-uniform colour and a
 * distance threshold against the corner pixel is enough — no chroma key, no model. Anything within
 * `tolerance` of that colour becomes transparent, so the icon can sit on a card of any colour. Runs only for
 * the `icon` profile: a backdrop is meant to be opaque edge to edge.
 */
async function cutout(image, tolerance) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = info;
  const at = (x, y) => (y * w + x) * channels;
  // Average the four corners: one stray pixel should not decide what the background is.
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const bg = [0, 1, 2].map((c) => Math.round(corners.reduce((s, i) => s + data[i + c], 0) / corners.length));

  for (let i = 0; i < data.length; i += channels) {
    const d = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]);
    if (d < tolerance) data[i + 3] = 0;
    // Feather the rim so the cutout does not read as a sticker with a hard jagged edge.
    else if (d < tolerance * 2) data[i + 3] = Math.round(((d - tolerance) / tolerance) * 255);
  }
  return sharp(data, { raw: { width: w, height: h, channels } }).png();
}

let input = sharp(src);
const meta = await input.metadata();
if (profile.cut) input = await cutout(input, profile.cut);

/**
 * Mount an emblem on the map's cream disc.
 *
 * The emblems come from different worlds — a 1280² badge render, an 89×84 overworld building, a 17×23 tile,
 * an 80×80 trainer sprite — so each is fitted to the same inner square and centred. A small pixel-art source
 * is scaled nearest-neighbour so it stays pixel art; a large smooth one is scaled normally.
 */
async function mountOnDisc(image, size) {
  const inner = Math.round(size * 0.66);
  const pixelSource = Math.max(meta.width ?? 0, meta.height ?? 0) <= 128;
  const emblem = await image
    .resize({
      width: inner,
      height: inner,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      ...(pixelSource ? { kernel: 'nearest' } : {}),
    })
    .png()
    .toBuffer();

  const r = size / 2;
  const disc = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <circle cx="${r}" cy="${r}" r="${r - 7}" fill="#fffdf8" stroke="#c9a86a" stroke-width="7"/>
     </svg>`,
  );

  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: disc },
      { input: emblem, gravity: 'centre' },
    ])
    .png();
}

if (profile.disc) {
  await mkdir(dirname(resolve(dest)), { recursive: true });
  await (await mountOnDisc(input, width)).png({ compressionLevel: 9 }).toFile(dest);
  const b = (await stat(src)).size;
  const a = (await stat(dest)).size;
  console.log(`${dest}  ${meta.width}×${meta.height} → ${width}×${height} on disc  ${Math.round(b / 1024)}KB → ${Math.round(a / 1024)}KB`);
  process.exit(0);
}

let pipeline = input.resize({
  width,
  height,
  fit: profile.fit,
  position: 'centre',
  ...(profile.kernel ? { kernel: profile.kernel } : {}),
  // An icon keeps whatever transparency it has; a backdrop is opaque anyway.
  background: profile.ext === 'png' ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255 },
});

pipeline =
  profile.ext === 'jpg'
    ? pipeline.jpeg({ quality: profile.quality, mozjpeg: true })
    : // Pixel art is a handful of flat colours, so an indexed palette is both smaller and lossless enough.
      pipeline.png({ compressionLevel: 9, ...(profile.palette ? { palette: true, colours: 128 } : {}) });

await pipeline.toFile(dest);

const before = (await stat(src)).size;
const after = (await stat(dest)).size;
const kb = (n) => `${Math.round(n / 1024)}KB`;
console.log(`${dest}  ${meta.width}×${meta.height} → ${width}×${height}  ${kb(before)} → ${kb(after)}`);
