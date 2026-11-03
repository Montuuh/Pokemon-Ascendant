#!/usr/bin/env node
// v0.9.91 (§6.9) — the series' level-up learnsets of Generation IV (HeartGold and SoulSilver, Platinum where HGSS has
// none), the source the progressive learnsets are cut from (`scripts/v0991-learnsets.mjs`). Reference data: the game never
// reads it. Writes scripts/data/learnsets-gen4.json. Usage: node scripts/fetch-learnsets.mjs [--force]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'scripts/data/learnsets-gen4.json');
const force = process.argv.includes('--force');
const species = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/species.json'), 'utf8')).species;
const have = existsSync(OUT) && !force ? JSON.parse(readFileSync(OUT, 'utf8')) : { _note: '', species: {} };
const GROUPS = ['heartgold-soulsilver', 'platinum', 'diamond-pearl'];

for (const s of species) {
  if (have.species[s.id]) continue;
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${s.id}`);
  if (!res.ok) { console.log(`skip ${s.id}: ${res.status}`); continue; }
  const data = await res.json();
  const by = new Map(GROUPS.map((g) => [g, []]));
  for (const m of data.moves) for (const v of m.version_group_details) {
    if (v.move_learn_method.name === 'level-up' && by.has(v.version_group.name)) by.get(v.version_group.name).push({ level: v.level_learned_at, move: m.move.name });
  }
  const group = GROUPS.find((g) => by.get(g).length);
  have.species[s.id] = { group, learnset: (by.get(group) ?? []).sort((a, b) => a.level - b.level || a.move.localeCompare(b.move)) };
  console.log(`${s.id}: ${have.species[s.id].learnset.length} (${group})`);
}
have._note = 'Gen IV level-up learnsets (HeartGold/SoulSilver, else Platinum, else Diamond/Pearl) from PokéAPI, by species id. Reference data for scripts/v0991-learnsets.mjs (§6.9); the game never reads it.';
mkdirSync(resolve(ROOT, 'scripts/data'), { recursive: true });
writeFileSync(OUT, JSON.stringify(have, null, 1) + '\n');
console.log(`${Object.keys(have.species).length} species written`);
