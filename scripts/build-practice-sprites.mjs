#!/usr/bin/env node
// §2.12.3 / §2.9.4 — the Dojo's and the Training Grounds' 32×32 practice sprites for species the FireRed/LeafGreen set carries but
// `build-dojo-props.mjs` has already been run without (v0.9.84: Umbreon, Steelix, Scizor, Magnezone). Same recipe as that script —
// the real game sprite, one clean half-step to 32×32 — and where FRLG has no frame (Magnezone is Generation IV) the Showdown
// battle sprite's first frame, trimmed and fitted in the same cell.
//
//   node scripts/build-practice-sprites.mjs umbreon steelix scizor magnezone
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const { species } = JSON.parse(readFileSync(resolve(root, 'src/content/data/species.json'), 'utf8'));
const FRLG = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iii/firered-leafgreen';

for (const id of process.argv.slice(2)) {
  const mon = species.find((s) => s.id === id);
  if (!mon) throw new Error(`no species ${id}`);
  for (const shiny of [false, true]) {
    const dest = resolve(root, 'public/art/dojo/pokemon', `${id}${shiny ? '-shiny' : ''}.png`);
    const res = await fetch(`${FRLG}/${shiny ? 'shiny/' : ''}${mon.dex}.png`);
    let output;
    if (res.ok) {
      output = await sharp(Buffer.from(await res.arrayBuffer())).resize(32, 32, { kernel: 'nearest' }).png({ palette: true }).toBuffer();
    } else {
      const still = readFileSync(resolve(root, 'public/art/pokemon/battle', `${id}${shiny ? '-shiny' : ''}.png`));
      const trimmed = await sharp(still).trim().png().toBuffer();
      const meta = await sharp(trimmed).metadata();
      const scale = Math.min(1, 32 / Math.max(meta.width, meta.height));
      const fitted = await sharp(trimmed).resize({ width: Math.max(1, Math.round(meta.width * scale)), kernel: 'nearest' }).png().toBuffer();
      const fm = await sharp(fitted).metadata();
      output = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: fitted, left: Math.floor((32 - fm.width) / 2), top: Math.floor((32 - fm.height) / 2) }])
        .png({ palette: true }).toBuffer();
    }
    await writeFile(dest, output);
    console.log(`${id}${shiny ? ' shiny' : ''}: ${res.ok ? 'FRLG' : 'Showdown still'}`);
  }
}
