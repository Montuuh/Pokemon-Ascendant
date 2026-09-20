#!/usr/bin/env node
// Fetch animated battle sprites (front + back) for every species in the roster.
// Source: Pokémon Showdown sprite CDN (gen5ani). Fan-project use only — see docs/art/pipeline.md §Licences.
// Usage: npm run art:sprites            (skips files that already exist)
//        npm run art:sprites -- --force (re-download)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/pokemon/battle');
const roster = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/roster-vs.json'), 'utf8'));
const force = process.argv.includes('--force');

const SOURCES = {
  front: (id) => `https://play.pokemonshowdown.com/sprites/gen5ani/${id}.gif`,
  back: (id) => `https://play.pokemonshowdown.com/sprites/gen5ani-back/${id}.gif`,
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchOne(url, dest) {
  if (!force && (await exists(dest))) return 'skip';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return 'ok';
}

await mkdir(OUT, { recursive: true });
const species = roster.lines.flatMap((l) => l.species);
let ok = 0;
let skip = 0;
let fail = 0;
for (const s of species) {
  for (const [side, make] of Object.entries(SOURCES)) {
    const dest = resolve(OUT, `${s.id}${side === 'back' ? '-back' : ''}.gif`);
    try {
      const r = await fetchOne(make(s.id), dest);
      r === 'ok' ? ok++ : skip++;
      process.stdout.write(`${r.padEnd(4)} ${s.id} ${side}\n`);
    } catch (e) {
      fail++;
      process.stdout.write(`FAIL ${s.id} ${side}: ${e.message}\n`);
    }
  }
}
console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed → ${OUT}`);
process.exit(fail ? 1 : 0);
