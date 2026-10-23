#!/usr/bin/env node
// §9.2.3 / D9 — rebuild the twelve selected A14 silhouettes from retained raw outputs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'public/art/moves/refresh-manifest.json'), 'utf8'));
const staging = resolve(root, 'playtest/rebuild-move-refresh');
await mkdir(staging, { recursive: true });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const item of manifest.selected) {
  const bytes = await readFile(resolve(root, item.source));
  if (sha(bytes) !== item.sourceSha256) throw new Error(`${item.id}: source hash mismatch`);
  if (sha(await readFile(resolve(root, item.prompt))) !== item.promptSha256) throw new Error(`${item.id}: prompt hash mismatch`);
  let input = resolve(root, item.source);
  if (item.margin) {
    const meta = await sharp(bytes).metadata();
    const rgb = await sharp(bytes).extract({ left: 0, top: 0, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
    input = resolve(staging, `${item.id}-framed.png`);
    await sharp(bytes).extend({ left: item.margin, right: item.margin, top: Math.round(item.margin * meta.height / meta.width), bottom: Math.round(item.margin * meta.height / meta.width), background: { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 } }).png().toFile(input);
  }
  const output = resolve(staging, `${item.id}.png`);
  execFileSync(process.execPath, [resolve(root, 'scripts/install-move-art.mjs'), input, item.id, '--out', output], { cwd: root, stdio: 'pipe' });
  const result = await readFile(output);
  if (sha(result) !== item.outputSha256) throw new Error(`${item.id}: rebuilt pixels differ from reviewed output`);
  await writeFile(resolve(root, `public/art/moves/${item.id}.png`), result);
}
console.log(`Rebuilt ${manifest.selected.length} reviewed move silhouettes; all hashes match.`);
