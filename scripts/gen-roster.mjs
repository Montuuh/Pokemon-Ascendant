#!/usr/bin/env node
// roster-vs.json is the art manifest: which portraits, icons and battle sprites to fetch.
// It is derived from species.json so the two can never drift apart.
import { readFileSync, writeFileSync } from 'node:fs';

const species = JSON.parse(readFileSync('src/content/data/species.json', 'utf8')).species;
const parent = new Map();
for (const s of species) for (const c of s.evolvesTo) parent.set(c, s.id);

const lines = new Map();
for (const s of species) {
  let root = s.id;
  while (parent.has(root)) root = parent.get(root);
  if (!lines.has(root)) lines.set(root, []);
  lines.get(root).push({ dex: s.dex, id: s.id });
}

const out = {
  _note: 'GENERATED from species.json by scripts/gen-roster.mjs — the art manifest. dex numbers drive public/art/pokemon/<kind>/NNN-<id>.png; ids drive the Showdown battle sprites.',
  lines: [...lines].map(([line, list]) => ({ line, species: list.sort((a, b) => a.dex - b.dex) })),
};
writeFileSync('src/content/data/roster-vs.json', JSON.stringify(out, null, 2) + '\n');
console.log(`${out.lines.length} lines · ${species.length} species`);
