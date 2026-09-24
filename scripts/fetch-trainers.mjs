#!/usr/bin/env node
// Fetch trainer-class sprites for the Region 1 roster.
// Source: Pokémon Showdown trainer sprite set. Fan-project use only — see docs/art/ATTRIBUTION.md.
// Usage: npm run art:trainers [-- --force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../public/art/trainers');
const force = process.argv.includes('--force');

// local name → Showdown sprite id
const TRAINERS = {
  youngster: 'youngster',
  lass: 'lass',
  'bug-catcher': 'bugcatcher',
  hiker: 'hiker',
  brock: 'brock',
  'camper': 'camper',
  'picnicker': 'picnicker',
  // §2.8.1 — the Region 1 Elite is an Ace Trainer.
  acetrainer: 'acetrainerf',
  // v0.5 — the Gym fork needs all four Region 1 leaders, and the Water lane needs Swimmers.
  swimmer: 'swimmerf',
  misty: 'misty',
  bugsy: 'bugsy',
  whitney: 'whitney',
  // v0.7.1 — the route's two services (§2.9): the field nurse, and the travelling merchant (a Backpacker: a
  // trainer class that walks the routes with everything on its back, which is what the merchant is).
  nurse: 'nurse',
  merchant: 'backpacker',
  // v0.7.3 — Region 2: the Engineer (a Scientist), the Rocket Grunt, the Karate King Specialist, and the four
  // Region 2 Gym Leaders.
  scientist: 'scientist',
  rocketgrunt: 'rocketgrunt',
  blackbelt: 'blackbelt',
  blaine: 'blaine',
  erika: 'erika',
  ltsurge: 'ltsurge',
  koga: 'koga',
  // v0.7.4 — Region 3: the Hex Maniac, Giovanni (the Elite and the Ground Gym), and the other three Leaders.
  // Showdown has no default Hex Maniac or Lorelei, so their FireRed/LeafGreen sprites stand in (the closest
  // register to the rest); Kiyo, the Karate King who leads the Fighting Gym, is the Gen IV Black Belt, which
  // keeps him apart from Region 2's Karate King on the plain `blackbelt`.
  hexmaniac: 'hexmaniac-gen3',
  giovanni: 'giovanni',
  sabrina: 'sabrina',
  lorelei: 'lorelei-gen3',
  kiyo: 'blackbelt-gen4',
  // v0.7.6 — the player on the Safari's board (§2.11.6): Red, the Gen I protagonist.
  red: 'red',
};

const url = (id) => `https://play.pokemonshowdown.com/sprites/trainers/${id}.png`;

const exists = async (p) => access(p).then(() => true, () => false);

await mkdir(OUT, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const [local, remote] of Object.entries(TRAINERS)) {
  const dest = resolve(OUT, `${local}.png`);
  if (!force && (await exists(dest))) { skip++; console.log(`skip ${local}`); continue; }
  try {
    const res = await fetch(url(remote));
    if (!res.ok) throw new Error(`${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    ok++; console.log(`ok   ${local}`);
  } catch (e) {
    fail++; console.log(`FAIL ${local}: ${e.message}`);
  }
}
console.log(`\n${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);
