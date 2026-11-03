#!/usr/bin/env node
// v0.9.92 (§5.2.3, §5.5.2) — the utility that hurts and the finishers a combo sets up. Re-cuts the Gen I moves whose
// series effect the sim can now say (Disable, Roar, Whirlwind, Haze, Leech Seed, Growl, Leer, Tail Whip, Dream Eater), and
// adds the Gen II–IV disruption moves and conditional finishers. Writes the rows into moves.json, their generation into
// later-moves.json, and what each new illustration shows into move-art.json. Idempotent: a new move already there is left
// alone; a re-cut is written every time. Usage: node scripts/v0992-moves.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const path = (f) => resolve(ROOT, f);
const read = (f) => JSON.parse(readFileSync(path(f), 'utf8'));

const bonus = (when, multiplier, extra = {}) => ({ kind: 'power-bonus', when, multiplier, ...extra });

// id → the fields that change. The series' effect, where Gen I had been given a stand-in.
const RECUTS = {
  disable: { range: 'ranged', apCost: 1, effects: [{ kind: 'disable', turns: 2 }] },
  // A drag every turn would be a loop, not a read: an enemy's Roar waits a turn after it (§5.3's cooldown gate).
  roar: { range: 'ranged', apCost: 1, cooldown: 2, effects: [{ kind: 'force-swap' }] },
  whirlwind: { range: 'ranged', apCost: 1, cooldown: 2, effects: [{ kind: 'force-swap' }] },
  haze: { range: 'ranged', apCost: 1, effects: [{ kind: 'haze' }] },
  'leech-seed': { range: 'ranged', apCost: 1, effects: [{ kind: 'seed', percent: 0.125, heal: true }] },
  growl: { effects: [{ kind: 'stage', target: 'foe-side', stat: 'attack', stages: -1 }] },
  leer: { effects: [{ kind: 'stage', target: 'foe-side', stat: 'defense', stages: -1 }] },
  'tail-whip': { effects: [{ kind: 'stage', target: 'foe-side', stat: 'defense', stages: -1 }] },
  // Only a sleeper can be eaten in the series; here the dream doubles it.
  'dream-eater': { power: 45, effects: [{ kind: 'drain', percentOfDamage: 0.5 }, bonus('target-asleep', 2.2)] },
};

// [id, name, type, gen, seriesPower, range, ap, power, effects, extra, art]
const ROWS = [
  ['taunt', 'Taunt', 'dark', 3, 0, 'ranged', 1, 0, [{ kind: 'taunt', turns: 1 }], { role: 'utility' }, 'a mocking grin with a beckoning gesture and angry sparks'],
  ['yawn', 'Yawn', 'normal', 3, 0, 'ranged', 1, 0, [{ kind: 'drowsy' }], { role: 'utility' }, 'a huge sleepy yawn bubble drifting with little z marks'],
  ['perish-song', 'Perish Song', 'normal', 2, 0, 'ranged', 1, 0, [{ kind: 'perish', turns: 3 }], { role: 'utility' }, 'eerie pale music notes spiralling in a dark haze'],
  ['mean-look', 'Mean Look', 'normal', 2, 0, 'ranged', 1, 0, [{ kind: 'trap', turns: 2 }], { role: 'utility' }, 'a pair of piercing dark eyes staring out of black shadow'],
  ['spikes', 'Spikes', 'ground', 2, 0, 'ranged', 1, 0, [{ kind: 'hazard', hazard: 'spikes' }], { role: 'utility' }, 'a scatter of sharp metal caltrops on the ground'],
  ['stealth-rock', 'Stealth Rock', 'rock', 4, 0, 'ranged', 1, 0, [{ kind: 'hazard', hazard: 'stealth-rock' }], { role: 'utility' }, 'jagged pointed stones floating in a ring above the ground'],
  ['knock-off', 'Knock Off', 'dark', 3, 20, 'melee', 1, 40, [{ kind: 'knock-off' }, bonus('target-holds-item', 1.5)], {}, 'a dark swiping arm knocking a small item flying'],
  ['helping-hand', 'Helping Hand', 'normal', 3, 0, 'ranged', 1, 0, [{ kind: 'helping-hand', multiplier: 1.5 }], { role: 'utility' }, 'two hands clasping with a warm glow and sparkles'],
  // The Ghost-type's Curse: half its own HP for a quarter of the foe's every turn, until the foe leaves.
  ['curse', 'Curse', 'ghost', 2, 0, 'ranged', 1, 0, [{ kind: 'self-damage', percentOfMaxHp: 0.5 }, { kind: 'seed', percent: 0.25, heal: false }], { role: 'utility' }, 'a nail driven through a straw doll wreathed in purple shadow'],
  ['wake-up-slap', 'Wake-Up Slap', 'fighting', 4, 60, 'melee', 1, 40, [bonus('target-asleep', 1.8)], {}, 'an open palm slap with a sharp impact star and flying z marks'],
  ['smelling-salts', 'Smelling Salts', 'normal', 3, 60, 'melee', 1, 40, [bonus('target-paralyzed', 1.8)], {}, 'a small bottle of pungent salts with sharp yellow fumes'],
  ['brine', 'Brine', 'water', 4, 65, 'ranged', 2, 55, [bonus('target-below', 1.6, { below: 0.5 })], {}, 'a heavy spray of salty seawater with white crystals'],
  ['revenge', 'Revenge', 'fighting', 3, 60, 'melee', 2, 50, [bonus('hurt-this-turn', 2)], {}, 'a fierce counter-punch with a red vengeful flash'],
  ['avalanche', 'Avalanche', 'ice', 4, 60, 'melee', 2, 50, [bonus('hurt-this-turn', 2)], {}, 'a crashing wall of snow and ice boulders'],
];

const movesFile = read('src/content/data/moves.json');
const laterFile = read('src/content/data/later-moves.json');
const art = read('docs/art/prompts/move-art.json');
const have = new Set(movesFile.moves.map((m) => m.id));
let recut = 0;
for (const [id, fields] of Object.entries(RECUTS)) {
  const m = movesFile.moves.find((x) => x.id === id);
  if (!m) throw new Error(`re-cut of a move that is not there: ${id}`);
  Object.assign(m, fields);
  recut++;
}
let added = 0;
for (const [id, name, type, gen, seriesPower, range, apCost, power, effects, extra, prompt] of ROWS) {
  if (!art[id]) art[id] = prompt;
  if (!laterFile.moves.some((m) => m.id === id)) laterFile.moves.push({ id, name, type, power: seriesPower, gen });
  if (have.has(id)) continue;
  movesFile.moves.push({ id, name, type, role: extra.role ?? 'offensive', range, modifier: 'none', apCost, power, effects });
  added++;
}
writeFileSync(path('src/content/data/moves.json'), JSON.stringify(movesFile, null, 2) + '\n');
writeFileSync(path('src/content/data/later-moves.json'), JSON.stringify(laterFile, null, 2) + '\n');
writeFileSync(path('docs/art/prompts/move-art.json'), JSON.stringify(art, null, 2) + '\n');
console.log(`${recut} moves re-cut, ${added} moves added (${ROWS.length} in the table)`);
export { ROWS, RECUTS };
