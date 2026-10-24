#!/usr/bin/env node
// §9.6 / B04 — retain the first native frame, including GIF canvas and transparency.
// No trimming, resampling, recolouring or generation. Existing Showdown credits apply.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, 'public/art/pokemon/battle');
const roster = JSON.parse(readFileSync(resolve(root, 'src/content/data/roster-vs.json'), 'utf8'));
const entries = [];
for (const { id } of roster.lines.flatMap((line) => line.species)) {
  for (const suffix of ['', '-shiny', '-back', '-shiny-back']) {
    const name = `${id}${suffix}`;
    const source = readFileSync(resolve(folder, `${name}.gif`));
    const { data, info } = await sharp(source, { page: 0, pages: 1 }).png().toBuffer({ resolveWithObject: true });
    writeFileSync(resolve(folder, `${name}.png`), data);
    entries.push({ name, width: info.width, height: info.height, sourceSha256: createHash('sha256').update(source).digest('hex'), outputSha256: createHash('sha256').update(data).digest('hex') });
  }
}
writeFileSync(resolve(folder, 'stills-manifest.json'), JSON.stringify({ source: 'Local Showdown gen5ani GIFs; see docs/art/ATTRIBUTION.md', method: 'First frame; original canvas and RGBA pixels; no resampling', entries }, null, 2) + '\n');
console.log(`${entries.length} still sprites rebuilt from local GIFs.`);
