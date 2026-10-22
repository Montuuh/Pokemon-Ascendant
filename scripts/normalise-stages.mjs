#!/usr/bin/env node
// Re-export the existing stage compositions onto one logical pixel grid. No generation, JPEG write or
// shared palette: each scene keeps its own lighting and regional colours. D9 / §9.2.1.
// Samples never touch public/art. Review them before `install`; the source JPGs stay untouched.
//   node scripts/normalise-stages.mjs samples
//   node scripts/normalise-stages.mjs install [--grid 640x360] [--colours 256]
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STAGES = resolve(ROOT, 'public/art/stages');
const REVIEW = resolve(ROOT, 'playtest/a04-a06/stages');
const SAMPLES = ['meadow', 'gym-fire', 'apex-mewtwo'];
const GRIDS = [[480, 270], [640, 360]];
const PALETTES = [128, 256];
export const STAGE_PROFILE = Object.freeze({ width: 640, height: 360, colours: 256 });
const hash = (data) => createHash('sha256').update(data).digest('hex');

/** Export at the actual logical resolution: redundant 3× pixels cost decode memory and transfer bytes.
 * Nearest sampling preserves hard edges; no dithering adds noise to the floor behind the combatants.
 * Palette reduction is deliberate and bounded, followed by a lossless indexed PNG container.
 */
export async function normaliseStage(src, { width = 640, height = 360, colours = 256 } = {}) {
  if (!GRIDS.some(([w, h]) => width === w && height === h) || !PALETTES.includes(colours)) {
    throw new Error('Stage profile must use 480x270 or 640x360, with 128 or 256 colours.');
  }
  const indexed = await sharp(src)
    .toColourspace('srgb')
    .removeAlpha()
    .resize(width, height, { fit: 'cover', position: 'centre', kernel: 'nearest' })
    .png({ palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 })
    .toBuffer();
  if (colours === 256) return indexed;
  // libvips rounds PNG palette caps to the supported bit depths (128 becomes an 8-bit/256-colour
  // palette in sharp 0.35). Enforce the reviewed 128-colour comparison by merging its nearest weighted
  // clusters, rather than labelling a 256-colour output as 128. The final PNG adds no new colours.
  const { data, info } = await sharp(indexed).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const histogram = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    const c = histogram.get(key);
    if (c) c.count++;
    else histogram.set(key, { rgb: [data[i], data[i + 1], data[i + 2]], count: 1 });
  }
  const distance = (a, b) => (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11;
  const clusters = [...histogram.values()];
  while (clusters.length > colours) {
    let best = Infinity;
    let left = 0;
    let right = 1;
    for (let a = 0; a < clusters.length; a++) for (let b = a + 1; b < clusters.length; b++) {
      const ca = clusters[a];
      const cb = clusters[b];
      const cost = distance(ca.rgb, cb.rgb) * ca.count * cb.count / (ca.count + cb.count);
      if (cost < best) { best = cost; left = a; right = b; }
    }
    const a = clusters[left];
    const b = clusters[right];
    clusters[left] = { rgb: a.rgb.map((v, c) => (v * a.count + b.rgb[c] * b.count) / (a.count + b.count)), count: a.count + b.count };
    clusters.splice(right, 1);
  }
  const mapped = new Map([...histogram].map(([key, c]) => {
    const nearest = clusters.reduce((a, b) => distance(c.rgb, b.rgb) < distance(c.rgb, a.rgb) ? b : a);
    return [key, nearest.rgb.map(Math.round)];
  }));
  for (let i = 0; i < data.length; i += 3) {
    const rgb = mapped.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2];
  }
  return sharp(data, { raw: info }).png({ palette: true, colours: 256, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
}

async function metrics(src, output, width, height) {
  const source = await readFile(src);
  const original = await sharp(source).metadata();
  const decoded = await sharp(output).removeAlpha().raw().toBuffer();
  const sampled = await sharp(source).removeAlpha().resize(width, height, { fit: 'cover', kernel: 'nearest' }).raw().toBuffer();
  const seen = new Set();
  let error = 0;
  const meanDelta = [0, 0, 0];
  for (let i = 0; i < decoded.length; i += 3) {
    seen.add((decoded[i] << 16) | (decoded[i + 1] << 8) | decoded[i + 2]);
    for (let c = 0; c < 3; c++) {
      error += Math.abs(decoded[i + c] - sampled[i + c]);
      meanDelta[c] += decoded[i + c] - sampled[i + c];
    }
  }
  return {
    source: { path: `public/art/stages/${src.split(/[\\/]/).at(-1)}`, sha256: hash(source), width: original.width, height: original.height, bytes: source.length },
    output: { sha256: hash(output), width, height, bytes: output.length, colours: seen.size, decodedRgbBytes: decoded.length },
    paletteMeanAbsoluteErrorRgb255: Number((error / decoded.length).toFixed(3)),
    paletteMeanColourShiftRgb255: meanDelta.map((n) => Number((n / (width * height)).toFixed(3))),
  };
}

const label = (text, width, height = 36) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#221d29"/><text x="12" y="25" fill="#fff4da" font-family="sans-serif" font-size="18">${text}</text></svg>`);

async function contactSheet(id, candidates) {
  // Five views share exactly the same display size. 960 px is 2× / 1.5× the candidate grids.
  const src = resolve(STAGES, `${id}.jpg`);
  const views = [{ label: `${id}: existing JPG`, data: await readFile(src) }, ...candidates];
  const composites = [];
  for (let i = 0; i < views.length; i++) {
    const x = (i % 2) * 960;
    const y = Math.floor(i / 2) * 576;
    composites.push({ input: label(views[i].label, 960), left: x, top: y });
    composites.push({ input: await sharp(views[i].data).resize(960, 540, { kernel: 'nearest' }).png().toBuffer(), left: x, top: y + 36 });
  }
  await sharp({ create: { width: 1920, height: 1728, channels: 3, background: '#221d29' } }).composite(composites).png().toFile(resolve(REVIEW, `${id}-contact.png`));
  // A central upper detail includes Blaine's already embedded portrait in gym-fire. The source is only
  // re-exported: this script cannot establish the provenance of that portrait or undo existing JPEG loss.
  const crops = [];
  for (let i = 0; i < views.length; i++) {
    const x = i * 384;
    crops.push({ input: label(views[i].label, 384), left: x, top: 0 });
    const atSourceSize = await sharp(views[i].data).resize(1920, 1080, { kernel: 'nearest' }).png().toBuffer();
    crops.push({ input: await sharp(atSourceSize).extract({ left: 800, top: 128, width: 320, height: 320 }).resize(384, 384, { kernel: 'nearest' }).png().toBuffer(), left: x, top: 36 });
  }
  await sharp({ create: { width: 1920, height: 420, channels: 3, background: '#221d29' } }).composite(crops).png().toFile(resolve(REVIEW, `${id}-detail.png`));
}

async function installedContactSheet(records) {
  const composites = [];
  for (let i = 0; i < records.length; i++) {
    const x = (i % 5) * 320;
    const y = Math.floor(i / 5) * 216;
    composites.push({ input: label(records[i].id, 320), left: x, top: y });
    composites.push({ input: await sharp(resolve(STAGES, records[i].file)).resize(320, 180, { kernel: 'nearest' }).png().toBuffer(), left: x, top: y + 36 });
  }
  await sharp({ create: { width: 1600, height: Math.ceil(records.length / 5) * 216, channels: 3, background: '#221d29' } })
    .composite(composites).png().toFile(resolve(REVIEW, 'installed-contact.png'));
}

async function main() {
  const [command = 'samples', ...args] = process.argv.slice(2);
  if (!['samples', 'install'].includes(command)) throw new Error('Usage: normalise-stages.mjs <samples|install> [--grid 640x360] [--colours 256]');
  await mkdir(REVIEW, { recursive: true });
  const records = [];
  if (command === 'samples') {
    for (const id of SAMPLES) {
      const candidates = [];
      const src = resolve(STAGES, `${id}.jpg`);
      for (const [width, height] of GRIDS) for (const colours of PALETTES) {
        const data = await normaliseStage(src, { width, height, colours });
        const file = `${id}-${width}x${height}-${colours}.png`;
        await writeFile(resolve(REVIEW, file), data);
        // Nearest 1920×1080 proof for direct comparison at source size.
        await sharp(data).resize(1920, 1080, { kernel: 'nearest' }).png().toFile(resolve(REVIEW, `${id}-${width}x${height}-${colours}-1080.png`));
        candidates.push({ label: `${width}x${height}, ${colours} colours`, data });
        records.push({ id, file, paletteLimit: colours, ...(await metrics(src, data, width, height)) });
      }
      await contactSheet(id, candidates);
    }
  } else {
    const grid = args.includes('--grid') ? args[args.indexOf('--grid') + 1] : '640x360';
    const [width, height] = grid.split('x').map(Number);
    const colours = args.includes('--colours') ? Number(args[args.indexOf('--colours') + 1]) : 256;
    if (width !== STAGE_PROFILE.width || height !== STAGE_PROFILE.height || colours !== STAGE_PROFILE.colours) {
      throw new Error('Installed stages require the reviewed 640x360 / 256-colour profile. Use samples to compare alternatives.');
    }
    for (const file of (await readdir(STAGES)).filter((f) => f.endsWith('.jpg')).sort()) {
      const src = resolve(STAGES, file);
      const data = await normaliseStage(src, { width, height, colours });
      const dest = file.replace(/\.jpg$/, '.png');
      await writeFile(resolve(STAGES, dest), data);
      records.push({ id: file.slice(0, -4), file: dest, paletteLimit: colours, ...(await metrics(src, data, width, height)) });
    }
    await installedContactSheet(records);
  }
  const report = {
    schemaVersion: 1,
    command,
    processing: { kernel: 'nearest', fit: 'cover', colourspace: 'srgb', dithering: 0, pngEffort: 10, pngCompressionLevel: 9, quantisation: 'per-scene palette; no shared palette', versions: sharp.versions },
    provenance: 'Re-export of existing checked-in JPGs. Generated-stage lineage is documented by the existing batch scripts; no new artwork generated. Embedded portrait provenance is not established by this conversion.',
    records,
    totals: { count: records.length, sourceBytes: records.reduce((s, r) => s + r.source.bytes, 0), outputBytes: records.reduce((s, r) => s + r.output.bytes, 0) },
  };
  await writeFile(resolve(REVIEW, `${command}-metadata.json`), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${command}: ${records.length} outputs, ${(report.totals.outputBytes / 1024).toFixed(1)} KiB; metadata in playtest/a04-a06/stages/${command}-metadata.json`);
  if (command === 'install') {
    await writeFile(resolve(STAGES, 'manifest.json'), `${JSON.stringify(report, null, 2)}\n`);
    console.log('Original JPGs retained; source and output SHA256 recorded in public/art/stages/manifest.json.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
