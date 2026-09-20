#!/usr/bin/env node
// Fetch the non-Pokémon art the Combat Slice needs, from public sources, into public/art:
//   - item icons        → PokéAPI sprites repo         → public/art/items/<consumable-id>.png
//   - trainer sprites   → Pokémon Showdown             → public/art/trainers/<sprite>.png
//   - stage backdrops   → Pokémon Showdown gen6 bgs    → public/art/stages/<stage>.jpg
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
// Showdown background names → our stage keys.
//
// These are the **real battle backgrounds**, ripped from the games: a flat arena floor with the scene behind
// it, which is the composition that makes a screen read as a Pokémon battle at all. v0.4 replaced the four
// in-use ones with generated illustrations; v0.5 put them back, because a generated backdrop behind a real
// sprite is the one place the seam always shows.
//
// A stage key names a *place*, not a node kind, and §2.5's lanes are what spend them: a lane's fights happen
// in its Gym's biome, and the Gym itself is that same biome at depth or at dusk.
const STAGE_SOURCES = {
  meadow: 'bg-meadow.jpg',
  forest: 'bg-forest.jpg',
  cave: 'bg-earthycave.jpg',
  river: 'bg-beach.jpg',
  'damp-cave': 'bg-dampcave.jpg',
  'night-meadow': 'bg-darkmeadow.jpg',
  gym: 'bg-elite4drake.jpg',
  city: 'bg-city.jpg',
  desert: 'bg-desert.jpg',
  sea: 'bg-deepsea.jpg',
  'ice-cave': 'bg-icecave.jpg',
  library: 'bg-library.jpg',
  'sky-pillar': 'bg-skypillar.jpg',
};
const stageUrl = (file) => `https://play.pokemonshowdown.com/sprites/gen6bgs/${file}`;

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
const stages = new Set([...scenarios.map((s) => s.stage), ...Object.keys(STAGE_SOURCES)]);
for (const s of stages) {
  const file = STAGE_SOURCES[s];
  if (!file) {
    console.log(`WARN no source mapped for stage "${s}"`);
    continue;
  }
  jobs.push({ url: stageUrl(file), dest: `public/art/stages/${s}.jpg` });
}

let ok = 0;
let skip = 0;
let fail = 0;
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
