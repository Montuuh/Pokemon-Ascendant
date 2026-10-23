// §2.9.4 — the Fighting Dojo as FRLG drew it, including its master and pupils.
// No resampling or generated characters: only the black outside the room is keyed out.
// Usage: node scripts/fetch-dojo-art.mjs [--force]
import { execFileSync } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const out = resolve(import.meta.dirname, '../public/art/dojo');
const title = 'File:Fighting Dojo FRLG.png';
const api = 'https://archives.bulbagarden.net/w/api.php';
const ua = 'PokemonAscendant/0.9 (non-commercial fan project; art pipeline)';
await mkdir(out, { recursive: true });
if (
  !process.argv.includes('--force') &&
  (await access(resolve(out, 'room.png')).then(
    () => true,
    () => false,
  ))
) {
  console.log('skip: Dojo art installed (--force to redo)');
  process.exit(0);
}
const query = `${api}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
const info = Object.values(
  JSON.parse(execFileSync('curl', ['-fsSL', '-A', ua, query], { encoding: 'utf8' })).query.pages,
)[0].imageinfo?.[0];
if (!info) throw new Error(`Missing Archives image: ${title}`);
const source = execFileSync('curl', ['-fsSL', '-A', ua, info.url]);
const { data, info: dimensions } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
// Flood only edge-connected black, preserving black detail inside the game art.
const pending = [0];
const visited = new Set();
while (pending.length) {
  const p = pending.pop();
  if (visited.has(p)) continue;
  visited.add(p);
  const i = p * 4;
  if (data[i] || data[i + 1] || data[i + 2]) continue;
  data[i + 3] = 0;
  const x = p % dimensions.width;
  const y = Math.floor(p / dimensions.width);
  if (x > 0) pending.push(p - 1);
  if (x < dimensions.width - 1) pending.push(p + 1);
  if (y > 0) pending.push(p - dimensions.width);
  if (y < dimensions.height - 1) pending.push(p + dimensions.width);
}
const output = await sharp(data, { raw: { width: dimensions.width, height: dimensions.height, channels: 4 } })
  .png({ palette: true })
  .toBuffer();
await writeFile(resolve(out, 'room.png'), output);
await writeFile(
  resolve(out, 'manifest.json'),
  `${JSON.stringify(
    {
      source: {
        title,
        page: `https://archives.bulbagarden.net/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        url: info.url,
        sha256: createHash('sha256').update(source).digest('hex'),
      },
      output: {
        file: 'room.png',
        width: dimensions.width,
        height: dimensions.height,
        sha256: createHash('sha256').update(output).digest('hex'),
      },
      processing: 'Original pixels and NPCs; flood-fill edge-connected black to alpha. No resampling.',
    },
    null,
    2,
  )}\n`,
);
console.log(`wrote public/art/dojo/room.png (${dimensions.width}×${dimensions.height})`);
