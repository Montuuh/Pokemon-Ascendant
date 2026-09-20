#!/usr/bin/env node
// Fetch official-artwork portraits (475×475) and Gen VIII box icons (68×56) from the PokéAPI sprite repo for
// any dex numbers not yet present. Filenames follow public/art/pokemon/<kind>/NNN-<id>.png.
// Usage: npm run art:portraits -- 25 133 447          (dex numbers)
//        npm run art:portraits                        (everything in roster-vs.json)
// Species ids come from PokéAPI (/api/v2/pokemon/<dex>) when not in the roster.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const roster = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/roster-vs.json'), 'utf8'));
const known = new Map(roster.lines.flatMap((l) => l.species).map((s) => [s.dex, s.id]));
const args = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const dexes = args.length ? args : [...known.keys()];

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const KINDS = {
  portraits: (dex) => `${BASE}/other/official-artwork/${dex}.png`,
  icons: (dex) => `${BASE}/versions/generation-viii/icons/${dex}.png`,
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
async function idFor(dex) {
  if (known.has(dex)) return known.get(dex);
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${dex}`);
  if (!res.ok) throw new Error(`pokeapi ${res.status} for dex ${dex}`);
  return (await res.json()).name;
}

let ok = 0;
let skip = 0;
let fail = 0;
for (const dex of dexes) {
  const id = await idFor(dex);
  const n = String(dex).padStart(3, '0');
  for (const [kind, make] of Object.entries(KINDS)) {
    const dir = resolve(ROOT, 'public/art/pokemon', kind);
    await mkdir(dir, { recursive: true });
    const dest = resolve(dir, `${n}-${id}.png`);
    if (await exists(dest)) {
      skip++;
      continue;
    }
    try {
      const res = await fetch(make(dex));
      if (!res.ok) throw new Error(`${res.status}`);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      ok++;
      console.log(`ok   ${n}-${id} ${kind}`);
    } catch (e) {
      fail++;
      console.log(`FAIL ${n}-${id} ${kind}: ${e.message}`);
    }
  }
}
console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);
