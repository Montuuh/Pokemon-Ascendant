#!/usr/bin/env node
// Fetch the classic pixel type labels — the "FIRE" / "WATER" boxes the games drew from Gen III on — for the
// fifteen Gen I types. Source: the PokéAPI sprites mirror. Fan-project use only — see docs/art/pipeline.md.
// Usage: npm run art:types                                        (FireRed/LeafGreen, 32×12; skips existing)
//        npm run art:types -- --force                             (re-download)
//        npm run art:types -- --set generation-iv/heartgold-soulsilver   (another game's set, 48×16)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/icons/type');
const args = process.argv.slice(2);
const force = args.includes('--force');
const set = args.includes('--set') ? args[args.indexOf('--set') + 1] : 'generation-iii/firered-leafgreen';

// PokéAPI's type ids. Dark, Steel and Fairy are not Gen I and are not fetched (§1.6.2).
const TYPES = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6, bug: 7, ghost: 8,
  fire: 10, water: 11, grass: 12, electric: 13, psychic: 14, ice: 15, dragon: 16,
};
const url = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/${set}/${id}.png`;

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await mkdir(OUT, { recursive: true });
let ok = 0, skipped = 0;
for (const [type, id] of Object.entries(TYPES)) {
  const dest = resolve(OUT, `icon-type-${type}.png`);
  if (!force && (await exists(dest))) { skipped++; continue; }
  const res = await fetch(url(id));
  if (!res.ok) throw new Error(`${res.status} ${url(id)}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  ok++;
}
console.log(`type labels (${set}): ${ok} fetched, ${skipped} already there → ${OUT}`);
