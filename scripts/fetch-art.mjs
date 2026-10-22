#!/usr/bin/env node
// Fetch the non-Pokémon art the Combat Slice needs, from public sources, into public/art:
//   - item icons        → PokéAPI sprites repo         → public/art/items/<consumable-id>.png
//   - trainer sprites   → Pokémon Showdown             → public/art/trainers/<sprite>.png
// Curated stage PNGs are checked locally, never replaced with Showdown's unrelated gen6 backgrounds.
// Idempotent (skips existing). Usage: npm run art:fetch [-- --force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const force = process.argv.includes('--force');

const consumables = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/consumables.json'), 'utf8')).consumables;
const scenarios = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/scenarios.json'), 'utf8')).scenarios;

// PokéAPI item slugs differ slightly from our ids in one case.
const ITEM_SLUG = { 'poke-ball': 'poke-ball' };
const itemUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ITEM_SLUG[id] ?? id}.png`;
const trainerUrl = (sprite) => `https://play.pokemonshowdown.com/sprites/trainers/${sprite}.png`;
async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const jobs = [];
for (const c of consumables) jobs.push({ url: itemUrl(c.id), dest: `public/art/items/${c.id}.png` });
const trainers = new Set(scenarios.map((s) => s.trainer?.sprite).filter(Boolean));
for (const t of trainers) jobs.push({ url: trainerUrl(t), dest: `public/art/trainers/${t}.png` });
let ok = 0;
let skip = 0;
let fail = 0;
// A missing curated composition is an error even with --force. Downloading an old modern battle
// background here would silently change the place and its art register. Re-export the retained source
// with normalise-stages.mjs, or explicitly review and install its replacement with install-art stage.
for (const stage of new Set(scenarios.map((s) => s.stage))) {
  if (await exists(resolve(ROOT, `public/art/stages/${stage}.png`))) skip++;
  else {
    fail++;
    console.error(`FAIL curated stage ${stage}.png is missing; restore or review its source before installation.`);
  }
}
for (const { url, dest } of jobs) {
  const abs = resolve(ROOT, dest);
  await mkdir(resolve(abs, '..'), { recursive: true });
  if (!force && (await exists(abs))) {
    skip++;
    continue;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    await writeFile(abs, Buffer.from(await res.arrayBuffer()));
    ok++;
    console.log(`ok   ${dest}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${dest} ← ${url}: ${e.message}`);
  }
}
console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);
