// §8.4.6 — the Hub's career props, the four things FireRed / LeafGreen never drew: the Badge Case, the Journal's
// trophy, the League banner and the Ladder board. Each is generated (`npm run art:gen`, prompts in
// docs/art/prompts/hub-*.txt, two variants each kept in docs/art/sources/hub, the one named below chosen by eye), then
// made the rooms' own here: keyed off its magenta ground, cut to a 16 × 32 overworld cell (one tile wide, two tall,
// like a person), every pixel snapped to a colour the Hub's rooms already use, and ringed with a one-pixel outline in
// the tiles' slate. The later forms (the platinum trophy, the Elite and Master banners) are recolours of the first, and
// each prop's silhouette is its own shape in each place's floor tone, as the rooms' are (scripts/lib/hub-lock.mjs):
// `<place>/<prop>-locked.png`, written here because `npm run art:hub` clears and redraws the places first.
// Rooms and Pokémon are never generated. node scripts/build-hub-props.mjs   (after `npm run art:hub`)
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { flatLock, lockTones } from './lib/hub-lock.mjs';

const root = resolve(import.meta.dirname, '..');
const from = resolve(root, 'docs/art/sources/hub');
const out = resolve(root, 'public/art/hub/props');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const W = 16, H = 32;
const FLATS = 12;

/** The chosen variant of each prop. */
const CHOSEN = { ladder: 'ladder-board-2.png', trophies: 'trophy-2.png', banner: 'banner-2.png' };

// The rooms' own colours: every opaque colour of the four places.
const palette = [];
{
  const seen = new Set();
  for (const place of ['bedroom', 'lab', 'center', 'plateau']) {
    const { data } = await sharp(resolve(root, `public/art/hub/${place}/room.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      if (!seen.has(key)) seen.add(key), palette.push([data[i], data[i + 1], data[i + 2]]);
    }
  }
}
const snap = ([r, g, b]) => {
  let best = palette[0], d = Infinity;
  for (const c of palette) {
    const e = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (e < d) (d = e), (best = c);
  }
  return best;
};
const OUTLINE = snap([72, 72, 96]);

const toHsv = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, max ? d / max : 0, max / 255];
};
const fromHsv = ([h, s, v]) => {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
};

/** The generated picture as a 16 × 32 cell: keyed, cut, shrunk, snapped, outlined. Returns RGBA. */
async function cell(file) {
  const { data, info } = await sharp(resolve(from, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const magenta = (i) => data[i] > 180 && data[i + 1] < 110 && data[i + 2] > 180;
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (magenta(i)) data[i + 3] = 0;
      else (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
    }
  // One pixel is kept free all round for the outline.
  const shrunk = await sharp(data, { raw: info })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(W - 2, H - 2, { fit: 'inside', kernel: 'lanczos3' })
    .png()
    .toBuffer();
  // A sprite of this size holds a dozen flats, not a gradient: the shrink's in-between colours are folded away
  // before anything is snapped to the rooms' palette.
  const flat = await sharp(await sharp(shrunk).png({ palette: true, colours: FLATS, dither: 0 }).toBuffer()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const small = flat;
  const px = new Uint8Array(W * H * 4);
  const ox = Math.floor((W - small.info.width) / 2), oy = H - 1 - small.info.height;
  for (let y = 0; y < small.info.height; y++)
    for (let x = 0; x < small.info.width; x++) {
      const i = (y * small.info.width + x) * 4;
      if (small.data[i + 3] < 128) continue;
      const c = [small.data[i], small.data[i + 1], small.data[i + 2]];
      px.set([...snap(c), 255], ((y + oy) * W + x + ox) * 4);
    }
  return px;
}

/** A one-pixel outline round the shape, in the tiles' slate; the generated outline inside it is snapped already. */
function outlined(px) {
  const o = new Uint8Array(px);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && px[((y + dy) * W + x + dx) * 4 + 3]);
      if (near) o.set([...OUTLINE, 255], (y * W + x) * 4);
    }
  return o;
}

/** The same sprite with every pixel in a hue band turned to another colour, then snapped again. */
function recoloured(px, [from0, from1], turn) {
  const o = new Uint8Array(px);
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const [h, s, v] = toHsv([px[i], px[i + 1], px[i + 2]]);
    if (s < 0.25 || h < from0 || h > from1) continue;
    o.set(snap(fromHsv(turn([h, s, v]))), i);
  }
  return o;
}

/** The prop's silhouette: its shape, flat (scripts/lib/hub-lock.mjs). */
const shapes = {};

/**
 * The Badge Case, drawn here rather than generated (both generated variants read as a red box with a hole): an open
 * case on a stand, its lid up behind a velvet tray, and the twelve Badges of the Case (§8.14) as twelve pips, each
 * the strongest colour of that Leader's own Gym icon. The case's own colours are the rooms'.
 */
async function badgeCase() {
  const px = new Uint8Array(W * H * 4);
  const rect = (x, y, w, h, c) => {
    for (let py = y; py < y + h; py++) for (let qx = x; qx < x + w; qx++) px.set([...c, 255], (py * W + qx) * 4);
  };
  const wood = snap([176, 88, 64]), woodLight = snap([232, 160, 136]), cream = snap([248, 240, 200]), creamShade = snap([208, 192, 136]), velvet = snap([56, 56, 96]), socket = snap([88, 88, 136]);
  // The lid, standing open behind the tray.
  rect(2, 2, 12, 3, wood);
  rect(2, 2, 12, 1, woodLight);
  // The tray: three rows of four sockets, each three pixels square, empty until its Badge is won.
  rect(1, 5, 14, 14, cream);
  rect(2, 6, 12, 12, velvet);
  const { badges } = JSON.parse(await readFile(resolve(root, 'src/content/data/badges.json'), 'utf8'));
  // Five little badge shapes, so a row is four different things and not a colour chart.
  const SHAPES = ['.#.###.#.', '###.#..#.', '#.####.#.', '.#.#####.', '######.#.'];
  const pips = {};
  const made = [];
  for (const [i, badge] of badges.slice(0, 12).entries()) {
    const x = 2 + (i % 4) * 3, y = 6 + Math.floor(i / 4) * 4;
    px.set([...socket, 255], ((y + 1) * W + x + 1) * 4);
    const { data } = await sharp(resolve(root, `public/art/icons/map/node-gym-${badge.type}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // The icon's strongest colour: the most saturated of its common ones.
    const seen = new Map();
    for (let k = 0; k < data.length; k += 4) {
      if (data[k + 3] < 200) continue;
      const key = `${data[k] >> 4},${data[k + 1] >> 4},${data[k + 2] >> 4}`;
      const at = seen.get(key) ?? { n: 0, c: [data[k], data[k + 1], data[k + 2]] };
      at.n++;
      seen.set(key, at);
    }
    const best = [...seen.values()].filter((v) => v.n >= 6).sort((a, b) => toHsv(b.c)[1] * toHsv(b.c)[2] - toHsv(a.c)[1] * toHsv(a.c)[2])[0];
    const c = best?.c ?? [200, 200, 200];
    // The Badge itself, a 3 × 3 sprite of its own: the screen lays it in its socket once the account has won it.
    const pip = new Uint8Array(9 * 4);
    [...SHAPES[i % SHAPES.length]].forEach((ch, k) => ch === '#' && pip.set([...c, 255], k * 4));
    const bytes = await sharp(Buffer.from(pip), { raw: { width: 3, height: 3, channels: 4 } }).png().toBuffer();
    await writeFile(resolve(out, `pip-${badge.id}.png`), bytes);
    pips[badge.id] = [x, y, 3, 3];
    made.push({ badge: badge.id, colour: c, at: [x, y] });
  }
  // The case's front rim, then the stand.
  rect(1, 19, 14, 2, cream);
  rect(1, 20, 14, 1, creamShade);
  rect(4, 21, 8, 8, wood);
  rect(4, 21, 2, 8, woodLight);
  rect(3, 29, 10, 2, wood);
  rect(3, 29, 10, 1, woodLight);
  await writeFile(resolve(root, 'src/ui/screens/hub/badge-case.json'), `${JSON.stringify({ cell: [W, H], pips })}\n`);
  return { px, pips: made };
}

await mkdir(out, { recursive: true });
for (const old of await readdir(out)) if (old.endsWith('-locked.png') || old.startsWith('pip-')) await rm(resolve(out, old));
const outputs = [];
async function save(name, px) {
  const bytes = await sharp(Buffer.from(px), { raw: { width: W, height: H, channels: 4 } }).png({ palette: true, colours: 64, dither: 0 }).toBuffer();
  await writeFile(resolve(out, `${name}.png`), bytes);
  outputs.push({ file: `${name}.png`, width: W, height: H, sha256: sha(bytes) });
}

const sources = [];
for (const [id, file] of Object.entries(CHOSEN)) {
  sources.push({ prop: id, file: `docs/art/sources/hub/${file}`, prompt: `docs/art/prompts/hub-${file.replace(/-\d\.png$/, '')}.txt`, sha256: sha(await readFile(resolve(from, file))) });
  const px = outlined(await cell(file));
  await save(id, px);
  shapes[id] = px;
  // §8.4.6 — the trophy turns platinum with the first platinum medal: its golds go pale and cool.
  if (id === 'trophies') await save('trophies-2', recoloured(px, [25, 70], ([, s, v]) => [205, s * 0.22, Math.min(1, v * 1.08)]));
  // The banner is blue for a Veteran, red for an Elite, gold for a Master.
  if (id === 'banner') {
    await save('banner-2', recoloured(px, [190, 270], ([, s, v]) => [4, s, v]));
    await save('banner-3', recoloured(px, [190, 270], ([, s, v]) => [46, s, Math.min(1, v * 1.25)]));
  }
}
// The Badge Case is drawn, not generated.
const drawn = await badgeCase();
{
  const px = outlined(drawn.px);
  await save('badges', px);
  shapes.badges = px;
}
// Each prop's silhouette, a place each: its shape in that place's floor tone.
{
  const places = JSON.parse(await readFile(resolve(root, 'src/ui/screens/hub/places.json'), 'utf8'));
  shapes.dex = await sharp(resolve(out, 'dex.png')).ensureAlpha().raw().toBuffer();
  for (const [place, layout] of Object.entries(places)) {
    if (!layout.floor) continue;
    for (const [id, px] of Object.entries(shapes)) {
      if (!layout.features[id]) continue;
      const bytes = await sharp(flatLock(W, H, (x, y) => px[(y * W + x) * 4 + 3] > 0, lockTones(layout.floor)), { raw: { width: W, height: H, channels: 4 } }).png({ palette: true, colours: 8, dither: 0 }).toBuffer();
      await writeFile(resolve(root, `public/art/hub/${place}/${id}-locked.png`), bytes);
      outputs.push({ file: `../${place}/${id}-locked.png`, width: W, height: H, sha256: sha(bytes) });
    }
  }
}
await writeFile(
  resolve(out, 'manifest.json'),
  `${JSON.stringify({ rights: 'Original props, generated (Gemini image model via scripts/gen-image.mjs) and redrawn onto the rooms\' palette; no Nintendo asset.', script: 'scripts/build-hub-props.mjs', cell: [W, H], palette: `${palette.length} colours of the four Hub rooms`, sources, drawn: { badges: { how: 'drawn by this script; the pips are the strongest colour of each Leader\'s Gym icon (public/art/icons/map)', pips: drawn.pips, rejected: ['docs/art/sources/hub/badge-case-1.png', 'docs/art/sources/hub/badge-case-2.png'] } }, real: 'dex.png is pret pixels (its black outline repainted slate), written by scripts/lib/hub-places.mjs', outputs }, null, 2)}\n`,
);
console.log(`Built ${outputs.length} prop sprites.`);
