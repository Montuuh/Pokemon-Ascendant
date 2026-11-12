#!/usr/bin/env node
// §9.13.1 — the title screen's summit, on the stages' 640×360 logical grid (D9):
//   summit.png       the generated dawn vista (docs/art/prompts/title-summit.txt), nearest-sampled and indexed as a
//                    stage backdrop is (normalise-stages), from the chosen variant in docs/art/sources/title/.
//   clouds-far.png   640×96, a seamless strip of flat cloud streaks that drift over the cloud sea.
//   clouds-near.png  640×60, a seamless scalloped bank that drifts along the bottom edge, past the ledge's foot.
//   dusk.png         640×360, the night side: twelve bands of the night sky's indigo, each one flat, stepping down
//                    in rings around the sun the way the vista bands its own sky. Laid over the vista AND the strips (a strip
//                    painted into the vista would leave the drifting clouds lit in the dark).
//   forms/<id>.png, forms/<id>-light.png, forms/<id>-flash.png   every Pokémon of the title's parties (src/ui/title/parties.json) as the
//                    party shows it: the roster's own still back sprite, cut to its pixels, a flat contact shadow
//                    under its feet — and the same shape in cream, the light an evolution turns it into, and in white, its flash. The sprite's
//                    colours are untouched. Sizes go to src/ui/title/forms.json, which the scene places them by.
// The strips, the dusk and the shadows are drawn here, in the vista's own colours where they have one, so they are its
// pixels and its palette; deterministic (a seeded generator), so a rebuild is byte-identical.
//   node scripts/build-title-art.mjs [variant=3]
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliseStage, STAGE_PROFILE } from './normalise-stages.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'public/art/title');
const variant = process.argv[2] ?? '3';
const W = STAGE_PROFILE.width;

await mkdir(OUT, { recursive: true });
const vista = await normaliseStage(resolve(ROOT, `docs/art/sources/title/summit-${variant}.png`), STAGE_PROFILE);
await writeFile(resolve(OUT, 'summit.png'), vista);

const { data: px, info } = await sharp(vista).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (x, y) => [...px.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)];
// The vista's own cloud colours: the near bank's white, the peach behind it, the lit cream by the sun.
const WHITE = at(20, 340);
const PEACH = at(100, 270);
const CREAM = at(350, 220);
console.log('palette', { WHITE, PEACH, CREAM });

/** mulberry32 — a small seeded generator, so the strips never change between builds. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(h) {
  const buf = Buffer.alloc(W * h * 4);
  const set = (x, y, c) => {
    if (y < 0 || y >= h) return;
    const i = (y * W + (((x % W) + W) % W)) * 4;
    buf[i] = c[0];
    buf[i + 1] = c[1];
    buf[i + 2] = c[2];
    buf[i + 3] = 255;
  };
  return { buf, set, h };
}
const save = (c, name) => sharp(c.buf, { raw: { width: W, height: c.h, channels: 4 } }).png({ palette: true, colours: 16, dither: 0, compressionLevel: 9 }).toFile(resolve(OUT, name));

// ── Far: flat streaks, the way the vista draws its cloud sea — a long run of rows, each shorter than the one under
// its middle, their ends stepped in two-pixel treads. Wraps at the strip's width.
{
  const c = canvas(96);
  const r = rng(913);
  for (let i = 0; i < 6; i++) {
    const cx = Math.round((i * W) / 6 + r() * 50);
    const cy = 6 + Math.round(r() * 76);
    const len = 90 + Math.round(r() * 130);
    const rows = 5 + Math.round(r() * 4);
    const colour = r() < 0.35 ? CREAM : PEACH;
    const lean = r() < 0.5 ? -1 : 1;
    for (let row = 0; row < rows; row++) {
      const d = Math.abs(row - (rows - 1) / 2) / rows;
      const half = Math.round(((len / 2) * (1 - d * 1.5)) / 2) * 2;
      const shift = lean * (row - Math.floor(rows / 2)) * 8;
      for (let x = -half; x <= half; x++) c.set(cx + shift + x, cy + row, colour);
    }
  }
  await save(c, 'clouds-far.png');
}

// ── Near: a scalloped bank — the tops of a row of round clouds in the vista's white, solid below.
{
  const c = canvas(60);
  const bank = (seed, colour, base, rMin, rMax) => {
    const r = rng(seed);
    const top = new Array(W).fill(c.h);
    for (let x = 0; x < W; ) {
      const rad = rMin + Math.round(r() * (rMax - rMin));
      const cy = base + Math.round(r() * 6);
      for (let dx = -rad; dx <= rad; dx++) {
        const y = Math.round(cy - Math.sqrt(rad * rad - dx * dx));
        const xi = (((x + dx) % W) + W) % W;
        if (y < top[xi]) top[xi] = y;
      }
      x += Math.round(rad * (1.1 + r() * 0.5));
    }
    for (let x = 0; x < W; x++) for (let y = Math.max(0, top[x]); y < c.h; y++) c.set(x, y, colour);
  };
  bank(402, WHITE, 64, 26, 46);
  await save(c, 'clouds-near.png');
}
// ── The dusk: rings around the sun, each a flat step of the night sky's indigo; nothing right of the sun's column.
{
  const NIGHT = [29, 26, 61];
  const SUN = { x: 500, y: 200 };
  // Twelve steps of about seven points each, sixteen pixels apart: no single edge is stronger than the sky's own bands.
  const STEPS = Array.from({ length: 12 }, (_, i) => [316 - i * 16, Math.round((0.86 - i * 0.072) * 100) / 100]);
  const H = STAGE_PROFILE.height;
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // On a two-pixel tread, with the slow wobble a hand-placed band has (the vista's are not circles either).
      const tx = x & ~1;
      const ty = y & ~1;
      const d = tx < SUN.x ? Math.hypot(SUN.x - tx, (ty - SUN.y) * 0.6) + 4 * Math.sin(ty / 13 + tx / 41) + 2 * Math.sin(ty / 5.5) : 0;
      const step = STEPS.find(([from]) => d >= from);
      const i = (y * W + x) * 4;
      buf[i] = NIGHT[0];
      buf[i + 1] = NIGHT[1];
      buf[i + 2] = NIGHT[2];
      buf[i + 3] = step ? Math.round(step[1] * 255) : 0;
    }
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(resolve(OUT, 'dusk.png'));
}

// ── The parties' forms: the still back sprite cut to its pixels, its shadow, and its shape in light.
{
  const LIGHT = [255, 241, 214]; // --brand-cream
  const SHADOW = [38, 30, 48, 120];
  const FOOT = 2; // rows the shadow reaches below the feet
  const parties = JSON.parse(await readFile(resolve(ROOT, 'src/ui/title/parties.json'), 'utf8'));
  await mkdir(resolve(OUT, 'forms'), { recursive: true });
  const sizes = {};
  for (const id of parties.flatMap((p) => p.lines.flat())) {
    const { data, info } = await sharp(resolve(ROOT, `public/art/pokemon/battle/${id}-back.png`)).ensureAlpha().trim({ threshold: 0 }).raw().toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height + FOOT;
    const draw = (fill) => {
      const out = Buffer.alloc(w * h * 4);
      // The shadow first: a flat ellipse on the ground, as wide as most of the body.
      const rx = Math.max(6, Math.round(w * 0.42));
      const ry = 3;
      const cy = info.height - 1;
      for (let y = cy - ry; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x - (w - 1) / 2) / rx;
          const dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) out.set(SHADOW, (y * w + x) * 4);
        }
      }
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (data[i + 3] < 128) continue;
          out.set(fill ? [...fill, 255] : [data[i], data[i + 1], data[i + 2], 255], i);
        }
      }
      return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 });
    };
    await draw(null).toFile(resolve(OUT, `forms/${id}.png`));
    await draw(LIGHT).toFile(resolve(OUT, `forms/${id}-light.png`));
    // The flash: the same shape in pure white, shown for a tenth of a second as the new form holds.
    await draw([255, 255, 255]).toFile(resolve(OUT, `forms/${id}-flash.png`));
    sizes[id] = [w, h];
  }
  await writeFile(resolve(ROOT, 'src/ui/title/forms.json'), `${JSON.stringify({ foot: FOOT, sizes }, null, 2)}
`);
  console.log(`forms: ${Object.keys(sizes).length} × 3`);
}
console.log(`public/art/title: summit.png (variant ${variant}), clouds-far.png, clouds-near.png, dusk.png, forms/`);
