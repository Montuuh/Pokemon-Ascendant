#!/usr/bin/env node
// One-shot: merge the v0.2 move and ability additions into the content JSON.
// Values come from docs/design/catalogs/{moves,abilities}.md. Existing entries are never touched —
// the golden-master replays depend on the 56 moves the v0.1 slice shipped.
import { readFileSync, writeFileSync } from 'node:fs';

// id, type, role, range, modifier, ap, power, [effects], extra
const M = (id, type, role, range, modifier, apCost, power, effects = [], extra = {}) =>
  ({ id, name: id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '), type, role, range, modifier, apCost, power, effects, ...extra });
const status = (s, chance, self) => ({ kind: 'status', status: s, chance, ...(self ? { self: true } : {}) });
const stage = (target, stat, stages) => ({ kind: 'stage', target, stat, stages });
const heal = (percentOfMaxHp, durationTurns) => ({ kind: 'heal', percentOfMaxHp, ...(durationTurns ? { durationTurns } : {}) });
const draw = (cards) => ({ kind: 'draw', cards });

const MOVES = [
  // ── Normal ────────────────────────────────────────────────────────────────
  M('leer', 'normal', 'utility', 'ranged', 'none', 0, 0, [stage('foe', 'defense', -1)]),
  M('bite', 'normal', 'offensive', 'melee', 'none', 1, 50),
  M('crunch', 'normal', 'offensive', 'melee', 'none', 2, 75, [stage('foe', 'defense', -1)]),
  M('hyper-fang', 'normal', 'offensive', 'melee', 'step-forward', 2, 80),
  M('sucker-punch', 'normal', 'offensive', 'melee', 'step-forward', 1, 55),
  M('double-edge', 'normal', 'offensive', 'melee', 'none', 3, 110),
  M('body-slam', 'normal', 'offensive', 'melee', 'none', 2, 75, [status('paralysis', 0.3)]),
  M('focus-energy', 'normal', 'utility', 'melee', 'none', 0, 0, [stage('self', 'attack', 1)]),
  M('slam', 'normal', 'offensive', 'melee', 'none', 2, 75),
  M('double-slap', 'normal', 'offensive', 'melee', 'none', 1, 45),
  M('disable', 'normal', 'utility', 'ranged', 'none', 1, 0, [stage('foe', 'attack', -2)]),
  M('psych-up', 'normal', 'utility', 'ranged', 'none', 1, 0, [stage('self', 'attack', 1), stage('self', 'defense', 1)]),
  M('splash', 'normal', 'utility', 'melee', 'none', 0, 0, [draw(1)]),
  M('flail', 'normal', 'offensive', 'melee', 'none', 1, 55),
  M('swift', 'normal', 'offensive', 'ranged', 'none', 1, 50),

  // ── Grass ─────────────────────────────────────────────────────────────────
  M('absorb', 'grass', 'offensive', 'ranged', 'none', 1, 40, [heal(0.15)]),
  M('razor-leaf', 'grass', 'offensive', 'ranged', 'none', 2, 70),
  M('giga-drain', 'grass', 'offensive', 'ranged', 'none', 3, 85, [heal(0.3)]),
  M('solar-beam', 'grass', 'offensive', 'ranged', 'none', 4, 120, [], { cooldown: 1 }),
  M('petal-dance', 'grass', 'offensive', 'melee', 'step-forward', 3, 100),
  M('sleep-powder', 'grass', 'utility', 'ranged', 'none', 1, 0, [status('sleep', 1)]),
  M('stun-spore', 'grass', 'utility', 'ranged', 'none', 1, 0, [status('paralysis', 1)]),
  M('moonlight', 'grass', 'utility', 'melee', 'none', 1, 0, [heal(0.3)]),

  // ── Fire ──────────────────────────────────────────────────────────────────
  M('fire-fang', 'fire', 'offensive', 'melee', 'step-forward', 1, 50, [status('burn', 0.2)]),
  M('fire-spin', 'fire', 'offensive', 'ranged', 'none', 2, 55, [status('burn', 0.4)]),
  M('heat-wave', 'fire', 'offensive', 'ranged', 'none', 3, 85, [status('burn', 0.2)], { targeting: 'cleave' }),

  // ── Water ─────────────────────────────────────────────────────────────────
  M('bubble', 'water', 'offensive', 'ranged', 'none', 1, 40, [stage('foe', 'attack', -1)]),
  M('bubble-beam', 'water', 'offensive', 'ranged', 'none', 2, 65, [stage('foe', 'attack', -1)]),
  M('water-pulse', 'water', 'offensive', 'ranged', 'none', 2, 70, [status('confusion', 0.25)]),
  M('hydro-pump', 'water', 'offensive', 'ranged', 'none', 3, 100),
  M('rapid-spin', 'water', 'offensive', 'melee', 'step-backward', 1, 45),
  M('aqua-tail-g', 'water', 'offensive', 'melee', 'step-forward', 2, 85),
  M('brine', 'water', 'offensive', 'ranged', 'none', 2, 65),

  // ── Poison ────────────────────────────────────────────────────────────────
  M('poison-sting', 'poison', 'offensive', 'melee', 'none', 1, 40, [status('poison', 0.2)]),
  M('poison-powder', 'poison', 'utility', 'ranged', 'none', 1, 0, [status('poison', 1)]),
  M('acid', 'poison', 'offensive', 'ranged', 'none', 1, 45, [stage('foe', 'defense', -1)]),
  M('sludge', 'poison', 'offensive', 'ranged', 'none', 2, 70, [status('poison', 0.25)]),
  M('sludge-bomb', 'poison', 'offensive', 'ranged', 'none', 3, 95, [status('poison', 0.3)]),
  M('poison-fang', 'poison', 'offensive', 'melee', 'none', 2, 70, [status('poison', 0.5)]),
  M('poison-jab', 'poison', 'offensive', 'melee', 'step-forward', 2, 80, [status('poison', 0.3)]),
  M('cross-poison', 'poison', 'offensive', 'melee', 'step-forward', 2, 75, [status('poison', 0.2)], { alwaysCrit: true }),

  // ── Bug ───────────────────────────────────────────────────────────────────
  M('leech-life', 'bug', 'offensive', 'melee', 'none', 1, 45, [heal(0.2)]),
  M('leech-life-plus', 'bug', 'offensive', 'melee', 'step-forward', 2, 75, [heal(0.25)]),
  M('twineedle', 'bug', 'offensive', 'melee', 'step-forward', 2, 70, [status('poison', 0.2)]),
  M('fury-attack', 'bug', 'offensive', 'melee', 'none', 1, 45),

  // ── Rock / Ground ─────────────────────────────────────────────────────────
  M('mud-slap', 'ground', 'offensive', 'ranged', 'none', 1, 40, [stage('foe', 'attack', -1)]),
  M('mud-shot', 'ground', 'offensive', 'ranged', 'none', 1, 50, [stage('foe', 'attack', -1)]),
  M('mud-bomb', 'ground', 'offensive', 'ranged', 'none', 2, 70, [stage('foe', 'defense', -1)]),
  M('dig', 'ground', 'offensive', 'melee', 'step-backward', 2, 75),
  M('bulldoze', 'ground', 'offensive', 'melee', 'none', 2, 60, [stage('foe', 'attack', -1)], { targeting: 'cleave' }),
  M('rock-slide-m', 'rock', 'offensive', 'ranged', 'none', 3, 85, [], { targeting: 'cleave' }),
  M('bind', 'rock', 'offensive', 'melee', 'none', 1, 40),
  M('iron-tail', 'rock', 'offensive', 'melee', 'step-backward', 2, 80, [stage('foe', 'defense', -1)]),

  // ── Fighting ──────────────────────────────────────────────────────────────
  M('low-kick', 'fighting', 'offensive', 'melee', 'none', 1, 45),
  M('karate-chop', 'fighting', 'offensive', 'melee', 'step-forward', 1, 50, [], { alwaysCrit: true }),
  M('seismic-toss', 'fighting', 'offensive', 'melee', 'none', 2, 60),
  M('vital-throw', 'fighting', 'offensive', 'melee', 'step-backward', 2, 70),
  M('cross-chop', 'fighting', 'offensive', 'melee', 'step-forward', 2, 80, [], { alwaysCrit: true }),
  M('submission', 'fighting', 'offensive', 'melee', 'step-forward', 3, 100),
  M('close-combat', 'fighting', 'offensive', 'melee', 'step-forward', 3, 110, [stage('self', 'defense', -2)]),
  M('dynamic-punch', 'fighting', 'offensive', 'melee', 'step-forward', 3, 100, [status('confusion', 1)]),
  M('bulk-up', 'fighting', 'utility', 'melee', 'none', 1, 0, [stage('self', 'attack', 1), stage('self', 'defense', 1)]),
  M('brick-break', 'fighting', 'offensive', 'melee', 'none', 2, 75),
  M('belly-drum-p', 'fighting', 'utility', 'melee', 'none', 2, 0, [stage('self', 'attack', 3)]),

  // ── Psychic / Flying / Dragon ─────────────────────────────────────────────
  M('confusion', 'psychic', 'offensive', 'ranged', 'none', 1, 50, [status('confusion', 0.15)]),
  M('psychic', 'psychic', 'offensive', 'ranged', 'none', 3, 95, [stage('foe', 'defense', -1)]),
  M('zen-headbutt', 'psychic', 'offensive', 'melee', 'step-forward', 2, 75, [status('confusion', 0.2)]),
  M('hypnosis', 'psychic', 'utility', 'ranged', 'none', 1, 0, [status('sleep', 1)]),
  M('supersonic', 'normal', 'utility', 'ranged', 'none', 1, 0, [status('confusion', 1)]),
  M('confuse-ray', 'ghost', 'utility', 'ranged', 'none', 1, 0, [status('confusion', 1)]),
  M('air-slash', 'flying', 'offensive', 'ranged', 'none', 3, 90),
  M('dragon-rage', 'dragon', 'offensive', 'ranged', 'none', 1, 40),
];

// id, name, category, description, hook, params, pending
const A = [
  ['swarm', 'Swarm', 'Combat', 'Bug moves deal +20 % damage while HP is below 30 %.', 'low-hp-type-boost', { type: 'bug' }],
  ['hustle', 'Hustle', 'Combat', 'Melee moves deal +25 % damage.', 'range-boost', { range: 'melee', multiplier: 1.25 }],
  ['guts', 'Guts', 'Combat', 'Attack rises while this Pokémon carries a status condition.', 'none', null, 'needs a while-statused hook (v0.3)'],
  ['poison-point', 'Poison Point', 'Status', 'A melee attacker risks being Poisoned.', 'none', null, 'needs an on-damaged hook (v0.3)'],
  ['effect-spore', 'Effect Spore', 'Status', 'A melee attacker risks being Poisoned.', 'none', null, 'needs an on-damaged hook (v0.3)'],
  ['tangled-feet', 'Tangled Feet', 'Combat', 'Takes less damage while Confused.', 'none', null, 'needs a conditional damage hook (v0.4)'],
  ['run-down', 'Run Down', 'Positional', 'The first manual swap each combat costs 0 AP.', 'none', null, 'needs a swap-discount hook (v0.4)'],
  ['chlorophyll', 'Chlorophyll', 'Combat', 'Draws an extra card on turn 1 of Sun combats.', 'none', null, 'needs field effects (v0.7)'],
  ['inner-focus', 'Inner Focus', 'Status', 'Cannot be Confused.', 'none', null, 'needs a status-immunity hook (v0.3)'],
  ['sand-veil', 'Sand Veil', 'Combat', 'Incoming Ranged attacks deal 15 % less damage.', 'none', null, 'needs a conditional damage hook (v0.4)'],
  ['rock-head', 'Rock Head', 'Survival', 'Takes no self-damage from recoil moves.', 'none', null, 'needs recoil moves (v0.4)'],
  ['steadfast', 'Steadfast', 'Positional', 'On entering Lead, its Attack rises a stage.', 'none', null, 'needs an on-enter-lead hook (v0.3)'],
  ['no-guard', 'No Guard', 'Combat', 'Status riders on both sides always apply.', 'riders-always-apply', null],
  ['intimidate', 'Intimidate', 'Positional', 'On entering Lead, every enemy loses an Attack stage.', 'none', null, 'needs an on-enter-lead hook (v0.3)'],
  ['moxie', 'Moxie', 'Combat', 'Attack rises a stage whenever it faints an enemy.', 'none', null, 'needs an on-kill hook (v0.4)'],
  ['water-absorb', 'Water Absorb', 'Type', 'Water moves heal this Pokémon instead of damaging it.', 'none', null, 'needs a type-absorb hook (v0.3)'],
  ['damp', 'Damp', 'Combat', 'Self-destructing moves fail against this Pokémon.', 'none', null, 'needs self-destruct moves (v0.4)'],
  ['cloud-nine', 'Cloud Nine', 'Combat', 'Field effects are suppressed while this Pokémon leads.', 'none', null, 'needs field effects (v0.7)'],
];

const movesPath = 'src/content/data/moves.json';
const abilitiesPath = 'src/content/data/abilities.json';

const mFile = JSON.parse(readFileSync(movesPath, 'utf8'));
const have = new Set(mFile.moves.map((m) => m.id));
const added = MOVES.filter((m) => !have.has(m.id));
mFile.moves.push(...added);
writeFileSync(movesPath, JSON.stringify(mFile, null, 2) + '\n');

const aFile = JSON.parse(readFileSync(abilitiesPath, 'utf8'));
const haveA = new Set(aFile.abilities.map((a) => a.id));
const addedA = A.filter(([id]) => !haveA.has(id)).map(([id, name, category, description, hook, params, pending]) => ({
  id, name, category, description, hook, ...(params ? { params } : {}), ...(pending ? { pending } : {}),
}));
aFile.abilities.push(...addedA);
writeFileSync(abilitiesPath, JSON.stringify(aFile, null, 2) + '\n');

console.log(`+${added.length} moves (${mFile.moves.length} total) · +${addedA.length} abilities (${aFile.abilities.length} total)`);
