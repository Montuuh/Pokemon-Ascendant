#!/usr/bin/env node
// Build crisp Gen III–V pixel-art portraits (public/art/pokemon/portraits/NNN-<id>.png) and Gen VIII box icons
// (public/art/pokemon/icons/NNN-<id>.png) for every species in src/content/data/species.json.
//
// Per docs/design/ui-doctrine.md §D9 & docs/art/pipeline.md — every Pokémon depiction across the game uses
// authentic pixel art. Static portraits are extracted from frame 0 of the canonical battle sprite
// (public/art/pokemon/battle/<id>.gif), trimmed to their pixel bounding box, and centred on an integer square
// canvas so every MonIcon, Pokédex card, Center/Dojo row, and evolution preview renders razor-sharp pixels.
//
// Usage:
//   node scripts/fetch-portraits.mjs            (rebuild all pixel-art portraits; fetch missing box icons)
//   node scripts/fetch-portraits.mjs --force    (also re-fetch box icons)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = resolve(import.meta.dirname, '..');
const speciesData = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/species.json'), 'utf8'));
const allSpecies = speciesData.species;
const force = process.argv.includes('--force');

const ICON_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-viii/icons';
// The Gen VIII set the repo mirrors stops at Generation I's Pokémon; the four Dark and Steel evolutions (v0.9.84) come from the
// Gen VII set (40×30), centred unscaled on the same 68×56 canvas — the same pixel art, a little smaller.
const ICON_FALLBACK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons';

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const portraitsDir = resolve(ROOT, 'public/art/pokemon/portraits');
const iconsDir = resolve(ROOT, 'public/art/pokemon/icons');
await mkdir(portraitsDir, { recursive: true });
await mkdir(iconsDir, { recursive: true });

let builtPortraits = 0;
let fetchedIcons = 0;
let skippedIcons = 0;
let failed = 0;

for (const s of allSpecies) {
  const n = String(s.dex).padStart(3, '0');
  const portraitDest = resolve(portraitsDir, `${n}-${s.id}.png`);
  const battleSrc = resolve(ROOT, 'public/art/pokemon/battle', `${s.id}.gif`);

  try {
    const trimmedBuf = await sharp(battleSrc, { page: 0 }).trim().png().toBuffer();
    const meta = await sharp(trimmedBuf).metadata();
    const w = meta.width ?? 32;
    const h = meta.height ?? 32;
    const maxDim = Math.max(w, h);
    // Keep natural pixel-art scale for small species while filling at least ~60% of the frame.
    const rawSide = Math.max(52, maxDim + 4);
    const side = rawSide % 2 === 0 ? rawSide : rawSide + 1;
    const left = Math.floor((side - w) / 2);
    const top = Math.floor((side - h) / 2);

    const outBuf = await sharp({
      create: {
        width: side,
        height: side,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: trimmedBuf, left, top }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    await writeFile(portraitDest, outBuf);
    builtPortraits++;
  } catch (e) {
    failed++;
    console.error(`FAIL portrait ${n}-${s.id}: ${e.message}`);
  }

  const iconDest = resolve(iconsDir, `${n}-${s.id}.png`);
  if (!force && (await exists(iconDest))) {
    skippedIcons++;
    continue;
  }
  try {
    const res = await fetch(`${ICON_BASE}/${s.dex}.png`);
    if (res.ok) await writeFile(iconDest, Buffer.from(await res.arrayBuffer()));
    else {
      const old = await fetch(`${ICON_FALLBACK}/${s.dex}.png`);
      if (!old.ok) throw new Error(`${res.status} / ${old.status}`);
      const src = Buffer.from(await old.arrayBuffer());
      const meta = await sharp(src).metadata();
      await writeFile(iconDest, await sharp({ create: { width: 68, height: 56, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: src, left: Math.floor((68 - meta.width) / 2), top: Math.floor((56 - meta.height) / 2) }]).png().toBuffer());
    }
    fetchedIcons++;
  } catch (e) {
    failed++;
    console.error(`FAIL icon ${n}-${s.id}: ${e.message}`);
  }
}

console.log(
  `Done: ${builtPortraits} pixel portraits built, ${fetchedIcons} icons fetched (${skippedIcons} skipped), ${failed} failed`,
);
process.exit(failed ? 1 : 0);
