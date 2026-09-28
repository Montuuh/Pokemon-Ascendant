// §2.11.2 — the Poké Mart and the Department Store, as FireRed / LeafGreen drew them (v0.7.10). The real maps come
// from the Bulbagarden Archives (curl: Node's fetch gets a Cloudflare page there), are shown at a whole-pixel scale,
// and are left as the games drew them, with two touches:
//
//   - the map's black outside the room becomes transparent, so the room sits on the screen's own background;
//   - the Department Store's five floors are built from the three FRLG floors that have shop furniture (2F, 4F, 5F):
//     1F Medicine is the drugstore (FRLG 5F), 2F TMs is FRLG's own TM floor, 3F Held items and 5F Rare counter are
//     FRLG 4F and 2F mirrored, so no two floors look alike, and each floor wears its own number on the mat under the
//     lift, copied from the FRLG floor with that number. The mat is symmetric about the lift, so a mirrored floor
//     takes it back at the same place.
//
// The maps have nobody in them, so the clerk who stands behind every counter is the games' own Gen III clerk
// overworld sprite, placed by the screen (`clerk.png`).
//
// Usage: npm run art:mart [-- --force]

import { execFileSync } from 'node:child_process';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/mart');
const force = process.argv.includes('--force');
const API = 'https://archives.bulbagarden.net/w/api.php';
const UA = 'PokemonAscendant/0.7 (non-commercial fan project; art pipeline)';

function download(title) {
  const json = execFileSync('curl', ['-s', '-L', '-A', UA, `${API}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`], { encoding: 'utf8' });
  const info = Object.values(JSON.parse(json).query.pages)[0].imageinfo?.[0];
  if (!info) throw new Error(`not on the Archives: ${title}`);
  return execFileSync('curl', ['-s', '-L', '-A', UA, info.url]);
}

const exists = async (p) => access(p).then(() => true, () => false);
await mkdir(OUT, { recursive: true });
if (!force && (await exists(resolve(OUT, 'mart.png'))) && (await exists(resolve(OUT, 'floor-5.png'))) && (await exists(resolve(OUT, 'clerk.png')))) {
  console.log('skip: the Mart art is installed (--force to redo)');
  process.exit(0);
}

const raw = async (buf) => sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const floorOf = async (n) => raw(download(`File:Celadon Department Store ${n}F FRLG.png`));

/** The number mat under the lift, in every floor's map: left, top, width, height. */
const MAT = [88, 32, 32, 14];

/** A room: optionally mirrored, the mat taken from another floor, and the outside made transparent. */
async function build({ data, info }, out, { mirror = false, mat = null, height = null } = {}) {
  const { width: W, height: H } = info;
  const px = Buffer.from(data);
  if (mirror) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W / 2; x++) {
        const a = (y * W + x) * 4;
        const b = (y * W + (W - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) [px[a + k], px[b + k]] = [px[b + k], px[a + k]];
      }
  }
  if (mat) {
    const [mx, my, mw, mh] = MAT;
    for (let y = my; y < my + mh; y++) mat.data.copy(px, (y * W + mx) * 4, (y * W + mx) * 4, (y * W + mx + mw) * 4);
  }
  // The map's black surround, and only pure black: the games' outlines are a dark slate, never #000.
  for (let i = 0; i < px.length; i += 4) if (px[i] === 0 && px[i + 1] === 0 && px[i + 2] === 0) px[i + 3] = 0;
  const img = sharp(px, { raw: { width: W, height: H, channels: 4 } });
  if (height) img.extract({ left: 0, top: 0, width: W, height });
  await img.png({ palette: true }).toFile(resolve(OUT, out));
  console.log(`wrote public/art/mart/${out} (${W}×${height ?? H})`);
}

// The Mart's map ends in a band of black under the doormat; the room stops at the mat.
await build(await raw(download('File:Poké Mart interior FRLG.png')), 'mart.png', { height: 132 });

const [f1, f2, f3, f4, f5] = [await floorOf(1), await floorOf(2), await floorOf(3), await floorOf(4), await floorOf(5)];
await build(f5, 'floor-1.png', { mat: f1 });
await build(f2, 'floor-2.png');
await build(f4, 'floor-3.png', { mirror: true, mat: f3 });
await build(f4, 'floor-4.png');
await build(f2, 'floor-5.png', { mirror: true, mat: f5 });

// The clerk: the games' own sprite, facing you across the counter.
await sharp(download('File:Clerk III OD.png')).png({ palette: true }).toFile(resolve(OUT, 'clerk.png'));
console.log('wrote public/art/mart/clerk.png');
