#!/usr/bin/env node
// One-shot: bring src/content/data/consumables.json in line with catalogs/consumables.md §1–§3.
//
// Three canon divergences closed and the healing chain completed (§7.2.2, §7.2.3, §7.2.6):
//   · healing is a percentage of Effective Max HP, not a flat number
//   · Full Heal costs 1 AP, which is what keeps the five single cures worth carrying
//   · Ether costs 1 AP, so it is a net +1 rather than a free +2
//
// Kept as a script rather than a hand edit so the diff is explainable and the catalogue row for every new
// entry is copied, not invented. Run once; the JSON is the source afterwards.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const FILE = resolve(import.meta.dirname, '../src/content/data/consumables.json');
const file = JSON.parse(await readFile(FILE, 'utf8'));

/** Edits to rows that already exist, keyed by id. */
const PATCH = {
  potion: { effect: { kind: 'heal-percent', percent: 25 }, description: 'Restore 25 % of one Pokémon’s Max HP.' },
  'super-potion': {
    effect: { kind: 'heal-percent', percent: 45 },
    description: 'Restore 45 % of one Pokémon’s Max HP.',
    upgradeTo: 'hyper-potion',
  },
  // §7.2.3 — the AP is the whole reason to still carry an Antidote.
  'full-heal': { apCost: 1 },
  // §7.2.4 — the AP-economy release valve is a net +1, not a free +2.
  ether: { apCost: 1, description: 'Gain 2 AP this turn. It costs 1, so the net is +1.' },
};

/** Rows the catalogue authors that the build did not have. Prices live in run/economy.ts by tier. */
const ADD = [
  {
    id: 'hyper-potion', name: 'Hyper Potion', apCost: 1, tier: 3, target: 'ally',
    effect: { kind: 'heal-percent', percent: 70 },
    description: 'Restore 70 % of one Pokémon’s Max HP.', gdd: '§7.2.1', upgradeTo: 'max-potion',
  },
  {
    id: 'max-potion', name: 'Max Potion', apCost: 1, tier: 4, target: 'ally',
    effect: { kind: 'heal-percent', percent: 100 },
    description: 'Restore one Pokémon to its full Max HP.', gdd: '§7.2.1',
  },
  {
    id: 'revive', name: 'Revive', apCost: 2, tier: 4, target: 'ally',
    effect: { kind: 'revive', percent: 50 },
    description: 'Bring a fainted Pokémon back at half HP. The only revival there is inside a fight.',
    gdd: '§2.4.3',
  },
  {
    id: 'x-defense', name: 'X Defense', apCost: 1, tier: 2, target: 'ally',
    effect: { kind: 'stage', stat: 'defense', stages: 1 },
    description: 'Raise one Pokémon’s Defense by one stage for the rest of the combat.', gdd: '§7.2.4',
  },
];

for (const c of file.consumables) {
  const patch = PATCH[c.id];
  if (patch) Object.assign(c, patch);
}
const have = new Set(file.consumables.map((c) => c.id));
for (const row of ADD) if (!have.has(row.id)) file.consumables.push(row);

await writeFile(FILE, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
console.log(`consumables: ${file.consumables.length} rows`);
