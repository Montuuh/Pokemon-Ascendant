#!/usr/bin/env node
// A15 / §9.2.3 — palette-only re-export: no keying, cropping, resizing or movement of native pixels.
// node scripts/normalise-move-art.mjs samples|stage|install [--out <directory>]
// samples: eight comparisons; stage: all current PNGs in playtest; install: explicit runtime write.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { normaliseMovePalette, measureMovePaletteChange, MOVE_PALETTE_LIMIT } from './lib/move-palette.mjs';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'public/art/moves');
const args = process.argv.slice(2);
const mode = args[0] ?? 'samples';
if (!['samples', 'stage', 'install'].includes(mode)) throw new Error('Use samples, stage or install.');
const outIndex = args.indexOf('--out');
if (outIndex >= 0 && !args[outIndex + 1]) throw new Error('--out requires a directory.');
const out =
  mode === 'install'
    ? source
    : resolve(root, outIndex >= 0 ? args[outIndex + 1] : 'playtest/a14-a15/normalised');
if (mode !== 'install' && out === source) throw new Error('Use install to write runtime assets.');
await mkdir(out, { recursive: true });
const samples = [
  'absorb',
  'flamethrower',
  'blizzard',
  'thunderbolt',
  'night-shade',
  'rock-slide',
  'psychic',
  'barrier',
];
const files = (await readdir(source))
  .filter((file) => file.endsWith('.png'))
  .sort()
  .filter((file) => mode !== 'samples' || samples.includes(file.slice(0, -4)));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function decoded(bytes) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const colours = new Set();
  const alpha = Buffer.alloc(info.width * info.height);
  for (let p = 0; p < alpha.length; p++) {
    const i = p * 4;
    alpha[p] = data[i + 3];
    if (data[i + 3]) colours.add(data.subarray(i, i + 3).toString('hex'));
  }
  return { width: info.width, height: info.height, colours: colours.size, alphaSha256: sha(alpha) };
}
const outputs = [];
const comparisons = [];
for (const file of files) {
  const input = await readFile(resolve(source, file));
  const output = await normaliseMovePalette(input);
  const before = await decoded(input);
  const after = await decoded(output);
  if (
    before.width !== after.width ||
    before.height !== after.height ||
    before.alphaSha256 !== after.alphaSha256 ||
    after.colours > MOVE_PALETTE_LIMIT
  )
    throw new Error(`${file}: palette/mask contract failed`);
  await writeFile(resolve(out, file), output);
  outputs.push({ file, inputSha256: sha(input), outputSha256: sha(output), before, after, perceptualError: await measureMovePaletteChange(input, output) });
  comparisons.push({ file, input, output });
}
await writeFile(
  resolve(out, 'palette-manifest.json'),
  `${JSON.stringify(
    {
      description:
        'A15 effective per-image move palettes; original dimensions and alpha masks retained exactly.',
      originalRuntimeCommit: '02af49b709cbb14ff0a8ae8bd36927c9e5919a54',
      processing: {
        script: 'scripts/normalise-move-art.mjs',
        utility: 'scripts/lib/move-palette.mjs',
        opaqueRgbLimit: MOVE_PALETTE_LIMIT,
        palette:
          'per-image libimagequant first pass; weighted OKLab Ward merges and first-pass palette medoids; lossless RGBA PNG',
        resampling: 'none',
        alpha: 'binary source mask restored byte-for-byte',
        sharp: sharp.versions.sharp,
        vips: sharp.versions.vips,
      },
      outputs,
    },
    null,
    2,
  )}\n`,
);

// Review sheets are always staging artifacts, including when the parent explicitly installs runtime PNGs.
const review = resolve(root, 'playtest/a14-a15');
await mkdir(review, { recursive: true });
for (const [theme, background, ink] of [
  ['light', '#fff1d6', '#3a2e22'],
  ['dark', '#302735', '#fff1d6'],
]) {
  const layers = [];
  for (let i = 0; i < comparisons.length; i++) {
    const item = comparisons[i];
    const x = (i % 2) * 400;
    const y = Math.floor(i / 2) * 122;
    for (const [index, bytes] of [item.input, item.output].entries()) {
      const meta = await sharp(bytes).metadata();
      const width = meta.width * 2; const height = meta.height * 2;
      const png = await sharp(bytes)
        .resize(width, height, { kernel: 'nearest' })
        .png()
        .toBuffer();
      layers.push({ input: png, left: x + index * 200 + Math.floor((200 - width) / 2), top: y + 28 + Math.floor((90 - height) / 2) });
      const caption = `${item.file.slice(0, -4)} · ${index ? '20 colours' : 'before'}`;
      layers.push({
        input: Buffer.from(
          `<svg width="200" height="24"><text x="10" y="18" fill="${ink}" font-family="sans-serif" font-size="13">${caption}</text></svg>`,
        ),
        left: x + index * 200,
        top: y,
      });
    }
  }
  await sharp({
    create: {
      width: 800,
      height: Math.max(122, Math.ceil(comparisons.length / 2) * 122),
      channels: 4,
      background,
    },
  })
    .composite(layers)
    .png()
    .toFile(resolve(review, `palette-${theme}.png`));
}
console.log(
  `${mode}: ${outputs.length} move PNGs → ${out}; decoded colours ≤${MOVE_PALETTE_LIMIT}; dimensions and alpha masks unchanged.`,
);
