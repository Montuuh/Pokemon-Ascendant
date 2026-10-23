// §9.2.3 / D9 — the palette cap concerns decoded opaque RGB, not PNG palette metadata.
import sharp from 'sharp';

export const MOVE_PALETTE_LIMIT = 20;

const keyOf = (data, i) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
const rgbOf = (key) => [key >> 16, (key >> 8) & 255, key & 255];

// OKLab's perceptual distance keeps dark outlines, bright highlights and hue families distinct.
function lab(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
const distance = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

// Stable minimum heap: Ward merging needs only O(n²) candidate distances, not repeated cubic scans.
class Pairs {
  values = [];
  before(a, b) {
    return a.cost < b.cost || (a.cost === b.cost && (a.a < b.a || (a.a === b.a && a.b < b.b)));
  }
  push(value) {
    let i = this.values.length;
    this.values.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(value, this.values[p])) break;
      this.values[i] = this.values[p];
      i = p;
    }
    this.values[i] = value;
  }
  pop() {
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length) {
      let i = 0;
      while (i * 2 + 1 < this.values.length) {
        let child = i * 2 + 1;
        if (child + 1 < this.values.length && this.before(this.values[child + 1], this.values[child]))
          child++;
        if (!this.before(this.values[child], last)) break;
        this.values[i] = this.values[child];
        i = child;
      }
      this.values[i] = last;
    }
    return first;
  }
}

export async function normaliseMovePalette(input) {
  const { data: original, info } = await sharp(input)
    .toColourspace('srgb')
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 3; i < original.length; i += 4)
    if (original[i] !== 0 && original[i] !== 255)
      throw new Error('Move art requires binary alpha before palette reduction.');

  // libvips rounds colours:20 up to an 8-bit/256-entry palette. Use its perceptual quantizer
  // as a bounded first pass, then explicitly reduce/remap the actual decoded colours.
  const indexed = await sharp(original, { raw: info })
    .png({ palette: true, colours: 256, quality: 100, dither: 0 })
    .toBuffer();
  const sampled = await sharp(indexed).ensureAlpha().raw().toBuffer();
  const histogram = new Map();
  for (let i = 0; i < sampled.length; i += 4)
    if (original[i + 3]) {
      const key = keyOf(sampled, i);
      histogram.set(key, (histogram.get(key) ?? 0) + 1);
    }
  if (histogram.size === 0) throw new Error('Move art must contain an opaque pixel.');
  const points = [...histogram]
    .sort(([a], [b]) => a - b)
    .map(([key, count]) => ({ key, count, lab: lab(rgbOf(key)) }));
  const clusters = points.map((p) => ({ count: p.count, lab: p.lab, active: true, members: [p] }));
  const pairs = new Pairs();
  const pair = (a, b) => {
    const x = clusters[a];
    const y = clusters[b];
    pairs.push({ a, b, cost: (distance(x.lab, y.lab) * x.count * y.count) / (x.count + y.count) });
  };
  for (let a = 0; a < clusters.length; a++) for (let b = a + 1; b < clusters.length; b++) pair(a, b);
  let remaining = clusters.length;
  while (remaining > MOVE_PALETTE_LIMIT) {
    const { a, b } = pairs.pop();
    const x = clusters[a];
    const y = clusters[b];
    if (!x.active || !y.active) continue;
    x.active = false;
    y.active = false;
    const count = x.count + y.count;
    const merged = {
      count,
      lab: x.lab.map((c, i) => (c * x.count + y.lab[i] * y.count) / count),
      active: true,
      members: [...x.members, ...y.members],
    };
    const index = clusters.push(merged) - 1;
    for (let i = 0; i < index; i++) if (clusters[i].active) pair(i, index);
    remaining--;
  }
  // A medoid uses an existing first-pass palette colour, preserving each image's colour register.
  const palette = clusters
    .filter((c) => c.active)
    .map((c) => c.members.reduce((a, b) => (distance(a.lab, c.lab) <= distance(b.lab, c.lab) ? a : b)));
  const mapped = new Map(
    points.map((p) => [
      p.key,
      rgbOf(palette.reduce((a, b) => (distance(p.lab, a.lab) <= distance(p.lab, b.lab) ? a : b)).key),
    ]),
  );
  for (let i = 0; i < sampled.length; i += 4) {
    if (original[i + 3]) sampled.set(mapped.get(keyOf(sampled, i)), i);
    else sampled.fill(0, i, i + 3);
    sampled[i + 3] = original[i + 3];
  }
  // No second lossy quantization: this lossless container cannot invent colours or change the alpha mask.
  return sharp(sampled, { raw: info }).png({ palette: false, compressionLevel: 9 }).toBuffer();
}

/** Perceptual change on opaque native pixels, in OKLab Euclidean distance ×100. */
export async function measureMovePaletteChange(input, output) {
  const before = await sharp(input).ensureAlpha().raw().toBuffer();
  const after = await sharp(output).ensureAlpha().raw().toBuffer();
  if (before.length !== after.length) throw new Error('Cannot compare different pixel grids.');
  const errors = [];
  for (let i = 0; i < before.length; i += 4) if (before[i + 3]) errors.push(Math.sqrt(distance(lab([...before.subarray(i, i + 3)]), lab([...after.subarray(i, i + 3)]))) * 100);
  errors.sort((a, b) => a - b);
  const round = (n) => Math.round(n * 10000) / 10000;
  return { mean: round(errors.reduce((a, b) => a + b, 0) / errors.length), p95: round(errors[Math.floor((errors.length - 1) * 0.95)]), max: round(errors.at(-1)) };
}
