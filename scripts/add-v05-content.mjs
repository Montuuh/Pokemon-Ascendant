#!/usr/bin/env node
// One-shot: the content v0.5's Gym fork needs — the Krabby line for the Water Gym, and the moves those two
// carry. Values come from docs/design/catalogs/{species-r1,moves,gyms}.md and are ported, not invented.
//
// Existing entries are never touched: the golden-master replays depend on every move that shipped before.
import { readFileSync, writeFileSync } from 'node:fs';

const M = (id, name, type, role, range, modifier, apCost, power, effects = [], extra = {}) =>
  ({ id, name, type, role, range, modifier, apCost, power, effects, ...extra });
const stage = (target, stat, stages) => ({ kind: 'stage', target, stat, stages });

/**
 * catalogs/moves.md — the Krabby line's kit. Every one of these is expressible with the effect kinds the sim
 * already has, which is why this batch is content and not a code change (§7.7's rule, applied to moves).
 *
 * Steel is not one of the fifteen types (§4.1.2), so Metal Claw is typed Rock — the catalogue says so, and it
 * is what makes the Water Gym's slot-1 able to answer a Flying party.
 */
const MOVES = [
  M('vice-grip', 'Vice Grip', 'normal', 'offensive', 'melee', 'none', 1, 50),
  M('metal-claw', 'Metal Claw', 'rock', 'offensive', 'melee', 'step-forward', 1, 50, [stage('self', 'attack', 1)]),
  M('stomp', 'Stomp', 'normal', 'offensive', 'melee', 'step-forward', 2, 70),
  // "always-crit" is a flag the damage formula already reads (§4.1.3), same as Fissure's Def-stage bypass.
  M('crabhammer', 'Crabhammer', 'water', 'offensive', 'melee', 'none', 2, 80, [], { alwaysCrit: true }),
  M('guillotine-k', 'Guillotine', 'water', 'offensive', 'melee', 'none', 4, 130, [], { cooldown: 2, ignoresDefenseStages: true }),
  // §2.8.2's Elite Wild. 'rest-s' is heal + self-Sleep, which are two effect kinds the sim already has —
  // it is the one move on the Snorlax script that needed nothing new. 'amnesia' is a plain self-buff.
  M('rest-s', 'Rest', 'normal', 'defensive', 'melee', 'none', 1, 0, [
    { kind: 'heal', percentOfMaxHp: 0.5 },
    { kind: 'status', status: 'sleep', chance: 1, self: true },
  ]),
  M('amnesia', 'Amnesia', 'normal', 'utility', 'melee', 'none', 1, 0, [stage('self', 'defense', 2)]),
];

/**
 * catalogs/species-r1.md §`krabby` line — Water, 2 archetypes, uncommon. Stats are the Gen I line; the two
 * combat stats are derived by gen-species.mjs' own rule, so they are written here already derived:
 * attack = max(Atk, Spc), defence = round((Def + Spc) / 2).
 *
 *   krabby  30/105/90/25/50 → attack 105, defence round((90+25)/2) = 58
 *   kingler 55/130/115/50/75 → attack 130, defence round((115+50)/2) = 83
 */
const SPECIES = [
  {
    dex: 98, id: 'krabby', name: 'Krabby', types: ['water'], stage: 'basic',
    baseStats: { hp: 30, attack: 105, defense: 58, speed: 50 },
    growth: { hp: 3, attack: 3, defense: 3, speed: 2 },
    // §6.9 — every entry must sit BELOW the stage's evolve level or the move is lost on evolving, and the
    // content test enforces it. The catalogue lists mud-shot 13 / metal-claw 17 / stomp 21 against an
    // evolveLevel of 12, which is a catalogue slip: those three are unreachable as written. They move onto
    // Kingler at the same levels instead, so the *line* keeps every move the catalogue gave it.
    learnset: [
      { level: 1, move: 'bubble' }, { level: 1, move: 'leer' }, { level: 5, move: 'vice-grip' },
      { level: 9, move: 'harden' }, { level: 11, move: 'mud-shot' },
    ],
    availableAbilities: ['shell-armor', 'sturdy'],
    tutorMoves: ['brine', 'iron-defense'],
    evolveLevel: 12, evolvesTo: ['kingler'], rarity: 'uncommon',
    branches: [
      {
        id: 'krabby-vanguard', archetype: 'vanguard', to: 'kingler',
        label: 'The Pincer', description: 'Trade the grip for the hammer. Crabhammer always crits, and Guillotine ignores a braced stance.',
        upgrades: [{ from: 'vice-grip', to: 'crabhammer' }], adds: ['guillotine-k'],
      },
      {
        id: 'krabby-support', archetype: 'support', to: 'kingler',
        label: 'The Bulwark', description: 'Harden becomes Iron Defense, and Wide Guard softens the next Cleave for the whole team.',
        upgrades: [{ from: 'harden', to: 'iron-defense' }], adds: ['wide-guard'], abilityId: 'shell-armor',
      },
    ],
  },
  {
    dex: 99, id: 'kingler', name: 'Kingler', types: ['water'], stage: 'stage1',
    baseStats: { hp: 55, attack: 130, defense: 83, speed: 75 },
    growth: { hp: 3, attack: 3, defense: 3, speed: 2 },
    learnset: [
      { level: 13, move: 'metal-claw' }, { level: 17, move: 'stomp' },
      { level: 26, move: 'crabhammer' }, { level: 32, move: 'guillotine-k' }, { level: 38, move: 'brine' },
    ],
    availableAbilities: ['shell-armor', 'sturdy'],
    tutorMoves: ['body-slam'],
    evolvesTo: [], rarity: 'uncommon', archetype: 'vanguard',
  },
  {
    // catalogs/species-r1.md — the R1 boss-wild. 160/110/65/65/30 → attack max(110,65)=110,
    // defence round((65+65)/2)=65. Its identity is the HP bar: ~2x an Elite Pokemon, which is why the
    // catalogue gives the line +25 % growth and why the fight is a war of attrition rather than a race.
    dex: 143, id: 'snorlax', name: 'Snorlax', types: ['normal'], stage: 'basic',
    baseStats: { hp: 160, attack: 110, defense: 65, speed: 30 },
    growth: { hp: 5, attack: 3, defense: 3, speed: 1 },
    learnset: [
      { level: 1, move: 'tackle' }, { level: 1, move: 'amnesia' }, { level: 6, move: 'rest-s' },
      { level: 10, move: 'body-slam' }, { level: 14, move: 'crunch' },
    ],
    availableAbilities: ['sturdy'],
    tutorMoves: ['double-edge'],
    evolvesTo: [], rarity: 'rare', archetype: 'vanguard',
  },
];

const moveFile = JSON.parse(readFileSync('src/content/data/moves.json', 'utf8'));
const haveMove = new Set(moveFile.moves.map((m) => m.id));
let added = 0;
for (const m of MOVES) if (!haveMove.has(m.id)) { moveFile.moves.push(m); added++; }
writeFileSync('src/content/data/moves.json', `${JSON.stringify(moveFile, null, 2)}\n`);

const speciesFile = JSON.parse(readFileSync('src/content/data/species.json', 'utf8'));
const haveSpecies = new Set(speciesFile.species.map((s) => s.id));
let species = 0;
for (const s of SPECIES) if (!haveSpecies.has(s.id)) { speciesFile.species.push(s); species++; }
speciesFile.species.sort((a, b) => a.dex - b.dex);
writeFileSync('src/content/data/species.json', `${JSON.stringify(speciesFile, null, 2)}\n`);

console.log(`+${added} moves (${moveFile.moves.length} total) · +${species} species (${speciesFile.species.length} total)`);
