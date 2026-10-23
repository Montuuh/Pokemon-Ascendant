// Training-room props: original FRLG Pokémon and Gen III substitute / egg, plus simple pixel-authored equipment.
// Every invented shape uses exact colours sampled from the Dojo; no antialiasing or generated creatures.
// Usage: node scripts/build-dojo-props.mjs [--force]
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/art/dojo');
const force = process.argv.includes('--force');
const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );
const sha = (b) => createHash('sha256').update(b).digest('hex');
const sources = [];
const outputs = [];
const colour = {
  ink: [80, 80, 104, 255],
  wood: [176, 88, 64, 255],
  lightWood: [232, 160, 136, 255],
  gold: [216, 208, 136, 255],
  paper: [240, 232, 200, 255],
  shade: [152, 144, 80, 255],
  grey: [120, 120, 120, 255],
  steel: [216, 224, 224, 255],
  green: [112, 160, 104, 255],
};
function canvas(w, h) {
  const bytes = Buffer.alloc(w * h * 4);
  const rect = (x, y, width, height, tone) => {
    for (let py = y; py < y + height; py++)
      for (let px = x; px < x + width; px++) bytes.set(colour[tone], (py * w + px) * 4);
  };
  return { bytes, rect, w, h };
}
async function saveCanvas(name, c) {
  const image = await sharp(c.bytes, { raw: { width: c.w, height: c.h, channels: 4 } })
    .png({ palette: true })
    .toBuffer();
  await writeFile(resolve(out, name), image);
  outputs.push({ file: name, width: c.w, height: c.h, sha256: sha(image) });
}
await mkdir(resolve(out, 'pokemon'), { recursive: true });
await mkdir(resolve(out, 'effects'), { recursive: true });
// The left rack: wooden practice staves above a pair of iron weights, on a low shelf.
{
  const c = canvas(32, 40);
  const r = c.rect;
  r(2, 34, 28, 5, 'ink');
  r(3, 34, 26, 3, 'wood');
  r(4, 34, 24, 1, 'lightWood');
  for (const [x, y] of [
    [6, 1],
    [12, 4],
    [18, 2],
  ]) {
    r(x, y, 3, 27, 'ink');
    r(x + 1, y + 1, 1, 25, 'gold');
  }
  r(3, 21, 26, 4, 'ink');
  r(4, 21, 24, 2, 'wood');
  for (const y of [28, 32]) {
    r(7, y, 18, 2, 'ink');
    r(5, y - 1, 4, 4, 'ink');
    r(23, y - 1, 4, 4, 'ink');
    r(6, y, 2, 2, 'grey');
    r(24, y, 2, 2, 'grey');
    r(9, y, 14, 1, 'steel');
  }
  await saveCanvas('equipment.png', c);
}
// The right rack: rolled parchment and open scrolls, using the room's cream paper and reddish timber.
{
  const c = canvas(32, 40);
  const r = c.rect;
  r(1, 10, 30, 28, 'ink');
  r(2, 11, 28, 25, 'wood');
  r(3, 12, 26, 22, 'shade');
  for (const x of [5, 14, 23]) {
    r(x, 2, 4, 22, 'ink');
    r(x + 1, 3, 2, 20, 'paper');
    r(x - 1, 1, 6, 3, 'wood');
    r(x - 1, 23, 6, 3, 'wood');
    r(x + 1, 9, 2, 1, 'shade');
    r(x + 1, 13, 2, 1, 'shade');
  }
  r(1, 26, 30, 4, 'ink');
  r(2, 26, 28, 2, 'lightWood');
  for (const x of [5, 13, 21]) {
    r(x, 31, 6, 3, 'ink');
    r(x, 31, 5, 2, 'paper');
  }
  r(2, 37, 3, 3, 'ink');
  r(27, 37, 3, 3, 'ink');
  await saveCanvas('scroll-rack.png', c);
}
// Low wooden practice platforms. The green cushion belongs to the egg lesson, the wider mat to the pupil.
for (const [file, w, h, inset] of [
  ['platform.png', 48, 16, 4],
  ['cushion.png', 32, 16, 3],
]) {
  const c = canvas(w, h);
  const r = c.rect;
  r(2, 3, w - 4, h - 4, 'ink');
  r(3, 3, w - 6, h - 6, 'wood');
  r(4, 3, w - 8, 2, 'lightWood');
  r(inset, 1, w - inset * 2, h - 7, 'ink');
  r(inset + 1, 2, w - inset * 2 - 2, h - 9, file === 'cushion.png' ? 'green' : 'paper');
  await saveCanvas(file, c);
}
const api = 'https://archives.bulbagarden.net/w/api.php';
for (const [file, title] of [
  ['substitute.png', 'File:SubstituteG3f.png'],
  ['egg.png', 'File:Spr 3r Egg.png'],
]) {
  const query = `${api}?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  const data = JSON.parse(execFileSync('curl', ['-fsSL', query], { encoding: 'utf8' }));
  const url = Object.values(data.query.pages)[0].imageinfo?.[0]?.url;
  if (!url) throw new Error(`Missing Archives image: ${title}`);
  const input = execFileSync('curl', ['-fsSL', url]);
  const output = await sharp(input).resize(32, 32, { kernel: 'nearest' }).png({ palette: true }).toBuffer();
  await writeFile(resolve(out, file), output);
  sources.push({ title, url, sha256: sha(input) });
  outputs.push({ file, width: 32, height: 32, sha256: sha(output) });
}
// Native 64×64 FRLG frames use one clean half-step to fit the overworld's 32×32 training cell.
// These are the real game sprites, not box icons enlarged or generated Pokémon.
const { species } = JSON.parse(await readFile(resolve(root, 'src/content/data/species.json'), 'utf8'));
const pending = species.flatMap((mon) => [
  { ...mon, shiny: false },
  { ...mon, shiny: true },
]);
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (pending.length) {
      const mon = pending.shift();
      const file = `pokemon/${mon.id}${mon.shiny ? '-shiny' : ''}.png`;
      const path = resolve(out, file);
      const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen/${mon.shiny ? 'shiny/' : ''}${mon.dex}.png`;
      if (!force && (await exists(path))) {
        const output = await readFile(path);
        outputs.push({ file, width: 32, height: 32, sha256: sha(output) });
        continue;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const output = await sharp(input)
        .resize(32, 32, { kernel: 'nearest' })
        .png({ palette: true })
        .toBuffer();
      await writeFile(path, output);
      outputs.push({ file, width: 32, height: 32, sha256: sha(output) });
    }
  }),
);
// Existing move illustrations become a short practice cue. Their aspect ratio is preserved inside one cell.
for (const name of (await readdir(resolve(root, 'public/art/moves'))).filter((f) => f.endsWith('.png'))) {
  const input = await readFile(resolve(root, 'public/art/moves', name));
  const meta = await sharp(input).metadata();
  const w = Math.floor(meta.width / 2);
  const h = Math.floor(meta.height / 2);
  const effect = await sharp(input).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  const output = await sharp({
    create: { width: 48, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: effect, left: Math.floor((48 - w) / 2), top: Math.floor((32 - h) / 2) }])
    .png({ palette: true })
    .toBuffer();
  const file = `effects/${name}`;
  await writeFile(resolve(out, file), output);
  outputs.push({
    file,
    width: 48,
    height: 32,
    source: `public/art/moves/${name}`,
    sourceSha256: sha(input),
    sha256: sha(output),
  });
}
// Install the props in empty side aisles, leaving the carpet, four pupils and exit route clear.
const room = await sharp(resolve(out, 'room.png'))
  .composite([
    { input: resolve(out, 'equipment.png'), left: 28, top: 64 },
    { input: resolve(out, 'scroll-rack.png'), left: 148, top: 64 },
    { input: resolve(out, 'platform.png'), left: 64, top: 176 },
    { input: resolve(out, 'cushion.png'), left: 108, top: 128 },
  ])
  .png({ palette: true })
  .toBuffer();
await writeFile(resolve(out, 'training-room.png'), room);
outputs.push({ file: 'training-room.png', width: 208, height: 256, sha256: sha(room) });
outputs.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(
  resolve(out, 'props-manifest.json'),
  `${JSON.stringify(
    {
      pokemonSource:
        'https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-iii/firered-leafgreen',
      sources,
      processing:
        'FRLG and Gen III 64x64 sprites sampled at exact 0.5x with nearest neighbour; equipment authored on native map pixel grid in exact FRLG room colours. No generated creatures.',
      outputs,
    },
    null,
    2,
  )}\n`,
);
console.log(`Installed ${outputs.length} Dojo assets.`);
