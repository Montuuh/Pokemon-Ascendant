#!/usr/bin/env node
// One-shot: the content v0.7.3 (Region 2, Coastal Cliffs) needs — eleven lines and three single-stage
// Pokémon, the moves their kits use, two abilities, the four Region 2 Badges and Pikachu's Light Ball.
// Rows mirror docs/design/catalogs/{species-r2,moves,abilities,modifiers,held-items}.md.
//
// Existing entries are never touched: the golden-master replays depend on every move that shipped before.
//
//   node scripts/add-v073-content.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const M = (id, name, type, role, range, modifier, apCost, power, effects = [], extra = {}) =>
  ({ id, name, type, role, range, modifier, apCost, power, effects, ...extra });
const stage = (target, stat, stages) => ({ kind: 'stage', target, stat, stages });
const status = (s, chance) => ({ kind: 'status', status: s, chance });

/**
 * catalogs/moves.md §v0.7.3 — Region 2's kits. Ice had no moves at all before this batch and Electric had four.
 * Every one is expressible with the effect kinds the sim already has; the calibration is the existing table's
 * (1 AP ≈ 40–50, 2 AP ≈ 65–90, 3 AP ≈ 80–130, 4 AP ≈ 120–170 with a cooldown).
 */
const MOVES = [
  // Ice
  M('powder-snow', 'Powder Snow', 'ice', 'offensive', 'ranged', 'none', 1, 40, [status('freeze', 0.1)]),
  M('ice-shard', 'Ice Shard', 'ice', 'offensive', 'ranged', 'none', 1, 45),
  M('icy-wind', 'Icy Wind', 'ice', 'offensive', 'ranged', 'none', 2, 60, [stage('foe', 'attack', -1)], { targeting: 'cleave' }),
  M('aurora-beam', 'Aurora Beam', 'ice', 'offensive', 'ranged', 'none', 2, 65, [stage('foe', 'attack', -1)]),
  M('icicle-spear', 'Icicle Spear', 'ice', 'offensive', 'melee', 'none', 2, 25, [{ kind: 'multi-hit', hits: 3 }]),
  M('ice-punch', 'Ice Punch', 'ice', 'offensive', 'melee', 'none', 2, 75, [status('freeze', 0.1)]),
  M('ice-beam', 'Ice Beam', 'ice', 'offensive', 'ranged', 'none', 3, 95, [status('freeze', 0.2)]),
  M('blizzard', 'Blizzard', 'ice', 'offensive', 'ranged', 'none', 4, 120, [status('freeze', 0.2)], { targeting: 'cleave', cooldown: 1 }),
  // Electric
  M('spark', 'Spark', 'electric', 'offensive', 'melee', 'step-forward', 1, 50, [status('paralysis', 0.2)]),
  M('charge-beam', 'Charge Beam', 'electric', 'offensive', 'ranged', 'none', 2, 50, [stage('self', 'attack', 1)]),
  M('thunder-punch', 'Thunder Punch', 'electric', 'offensive', 'melee', 'none', 2, 75, [status('paralysis', 0.1)]),
  M('discharge', 'Discharge', 'electric', 'offensive', 'ranged', 'none', 3, 80, [status('paralysis', 0.3)], { targeting: 'cleave' }),
  M('volt-tackle', 'Volt Tackle', 'electric', 'offensive', 'melee', 'step-forward', 3, 110, [{ kind: 'recoil', percentOfDamage: 0.33 }]),
  M('zap-cannon', 'Zap Cannon', 'electric', 'offensive', 'ranged', 'none', 4, 120, [status('paralysis', 1)], { cooldown: 1 }),
  // Normal
  M('sing', 'Sing', 'normal', 'utility', 'ranged', 'none', 1, 0, [status('sleep', 1)]),
  M('growth', 'Growth', 'normal', 'utility', 'melee', 'none', 0, 0, [stage('self', 'attack', 1)]),
  // The catalogue's '10 dmg/turn x 2' needs a bind DoT kind the sim does not have; it ships without the rider (v0.3's rule).
  M('wrap', 'Wrap', 'normal', 'offensive', 'melee', 'none', 1, 40),
  M('take-down', 'Take Down', 'normal', 'offensive', 'melee', 'none', 2, 90, [{ kind: 'recoil', percentOfDamage: 0.25 }]),
  M('extreme-speed', 'Extreme Speed', 'normal', 'offensive', 'melee', 'step-forward', 2, 80),
  M('self-destruct', 'Self-Destruct', 'normal', 'offensive', 'melee', 'none', 3, 130, [{ kind: 'recoil', percentOfDamage: 0.5 }]),
  M('explosion', 'Explosion', 'normal', 'offensive', 'melee', 'none', 4, 170, [{ kind: 'recoil', percentOfDamage: 0.75 }], { cooldown: 2 }),
  M('recover', 'Recover', 'normal', 'defensive', 'melee', 'none', 1, 0, [{ kind: 'heal', percentOfMaxHp: 0.4 }], { cooldown: 2 }),
  M('tri-attack', 'Tri Attack', 'normal', 'offensive', 'ranged', 'none', 3, 80, [status('burn', 0.07), status('paralysis', 0.07), status('freeze', 0.07)]),
  // The catalogue rows the Lapras and Bellsprout lines name. Mist's "team immune to stat-lowering" needs a kind the
  // sim does not have, so it ships as self Def +1 — the substitute v0.3 used for Safeguard and Wide Guard.
  M('mist', 'Mist', 'water', 'defensive', 'melee', 'none', 1, 0, [stage('self', 'defense', 1)]),
  M('sheer-cold-l', 'Sheer Cold', 'ice', 'offensive', 'ranged', 'none', 4, 120, [status('freeze', 0.4)], { cooldown: 2 }),
  M('leaf-storm-s', 'Leaf Storm', 'grass', 'offensive', 'ranged', 'none', 3, 100, [stage('self', 'attack', -2)]),
  // Poison · Water · Dragon · Fire · Fighting · Grass
  M('smog', 'Smog', 'poison', 'offensive', 'ranged', 'none', 1, 30, [status('poison', 0.4)]),
  M('sludge-wave', 'Sludge Wave', 'poison', 'offensive', 'ranged', 'none', 3, 90, [status('poison', 0.1)], { targeting: 'cleave' }),
  M('clamp', 'Clamp', 'water', 'offensive', 'melee', 'none', 1, 45, [stage('foe', 'speed', -1)]),
  M('dragon-pulse', 'Dragon Pulse', 'dragon', 'offensive', 'ranged', 'none', 3, 90),
  M('fire-punch', 'Fire Punch', 'fire', 'offensive', 'melee', 'none', 2, 75, [status('burn', 0.1)]),
  M('mach-punch', 'Mach Punch', 'fighting', 'offensive', 'melee', 'step-forward', 1, 40),
  M('sky-uppercut', 'Sky Uppercut', 'fighting', 'offensive', 'melee', 'none', 2, 85),
  // catalogs/moves.md's row: "high critical-hit ratio" in the games, certain here, on a Step-Forward.
  M('leaf-blade', 'Leaf Blade', 'grass', 'offensive', 'melee', 'step-forward', 3, 90, [], { alwaysCrit: true }),
];

/**
 * catalogs/abilities.md §v0.7.3 — two passives on hooks the sim already has. `thick-fat`'s `when: 'type'`
 * clause is the one line of code this batch adds to abilities.ts.
 */
const ABILITIES = [
  { id: 'static', name: 'Static', category: 'Status', description: 'A melee attacker risks being Paralysed.', hook: 'on-damaged', params: { range: 'melee', status: 'paralysis', chance: 0.3 } },
  { id: 'thick-fat', name: 'Thick Fat', category: 'Type', description: 'Fire and Ice moves deal half damage to this Pokémon.', hook: 'conditional-reduction', params: { when: 'type', types: 'fire,ice', multiplier: 0.5 } },
];

/** §5.10.2 — the Region 2 Badges, on the same hook vocabulary as the Region 1 four (catalogs/modifiers.md). */
const BADGES = [
  { id: 'volcano-badge', name: 'Volcano Badge', type: 'fire', region: 2, description: 'Offensive cards costing 3 or more AP deal +20 % damage.', flavour: 'Proof of a temper worth the wait.', hook: 'damage-dealt', params: { minApCost: 3, multiplier: 1.2 } },
  { id: 'rainbow-badge', name: 'Rainbow Badge', type: 'grass', region: 2, description: 'At turn start, a Lead with a status condition restores 3 HP.', flavour: 'Proof that a garden grows through anything.', hook: 'turn-end-heal', params: { atTurnStart: true, leadOnly: true, whileStatused: true, amount: 3 } },
  { id: 'thunder-badge', name: 'Thunder Badge', type: 'electric', region: 2, description: 'The first Ranged move you play each turn costs 1 less AP.', flavour: 'Proof of a spark that arrives before the thunder.', hook: 'ap-cost', params: { firstOfRange: 'ranged', delta: -1 } },
  { id: 'marsh-badge', name: 'Marsh Badge', type: 'poison', region: 2, description: 'Applying a status condition to an enemy draws you a card.', flavour: 'Proof of patience with a slow poison.', hook: 'draw', params: { onStatusApplied: true, cards: 1 } },
];

/** §8.5.3 — Pikachu's starter flourish. Pikachu only: an evolved Raichu keeps holding it and it stops working. */
const HELD_ITEMS = [
  { id: 'light-ball', name: 'Light Ball', description: 'Pikachu only: its Electric moves deal +25 %. Evolving into Raichu leaves it inert.', hook: 'damage-dealt', params: { type: 'electric', multiplier: 1.25 }, speciesLock: 'pikachu' },
];

// ── Species ─────────────────────────────────────────────────────────────────────────────────────────────────
// catalogs/species-r2.md. Stats are the Gen I line; the two combat stats are derived by §4.1.5.1's rule:
// attack = max(Atk, Spc), defence = round((Def + Spc) / 2). Evolution at 12 (26 for a three-stage line's second
// step), the catalogue's uniform rule — so a Region 2 basic caught at its Lv 12–20 band evolves after the catch
// fight and asks for its branch then.
const derive = ([hp, atk, def, spc, spd]) => ({ hp, attack: Math.max(atk, spc), defense: Math.round((def + spc) / 2), speed: spd });
const growth = ([hp, attack, defense, speed]) => ({ hp, attack, defense, speed });
const ls = (...pairs) => pairs.map(([level, move]) => ({ level, move }));
const branch = (id, archetype, to, label, description, upgrades, adds = [], abilityId) => ({
  id, archetype, label, description, to, upgrades: upgrades.map(([from, t]) => ({ from, to: t })), adds, ...(abilityId ? { abilityId } : {}),
});

const SPECIES = [
  // ── Sea ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    dex: 72, id: 'tentacool', name: 'Tentacool', types: ['water', 'poison'], stage: 'basic', gen1: [40, 40, 35, 100, 70], growth: [2, 3, 2, 3],
    learnset: ls([1, 'poison-sting'], [1, 'supersonic'], [4, 'water-gun'], [7, 'acid'], [10, 'bubble-beam']),
    availableAbilities: ['poison-point', 'water-absorb'], hiddenAbility: 'swift-swim', tutorMoves: ['aqua-ring', 'screech'],
    evolveLevel: 12, evolvesTo: ['tentacruel'], rarity: 'common',
    branches: [
      branch('tentacruel-specialist', 'specialist', 'tentacruel', 'Man-o\'-War', 'The acid turns to sludge and the jet to a pulse: a long reach that poisons what it touches.', [['acid', 'sludge-bomb'], ['water-gun', 'water-pulse']]),
      branch('tentacruel-support', 'support', 'tentacruel', 'Stinging Veil', 'Confusion becomes a poison that worsens every turn, and the body goes to jelly.', [['supersonic', 'toxic']], ['acid-armor'], 'poison-point'),
    ],
  },
  {
    dex: 73, id: 'tentacruel', name: 'Tentacruel', types: ['water', 'poison'], stage: 'stage1', gen1: [80, 70, 65, 120, 100], growth: [2, 3, 2, 3],
    learnset: ls([14, 'poison-jab'], [18, 'toxic'], [22, 'sludge-wave'], [28, 'hydro-pump']),
    availableAbilities: ['poison-point', 'water-absorb'], tutorMoves: ['surf', 'brine'], evolvesTo: [], rarity: 'common',
  },
  {
    dex: 90, id: 'shellder', name: 'Shellder', types: ['water'], stage: 'basic', gen1: [30, 65, 100, 45, 40], growth: [2, 3, 4, 2],
    learnset: ls([1, 'tackle'], [1, 'withdraw'], [4, 'clamp'], [7, 'supersonic'], [10, 'ice-shard']),
    availableAbilities: ['shell-armor', 'iron-shell'], hiddenAbility: 'sturdy', tutorMoves: ['water-gun', 'harden'],
    evolveLevel: 12, evolvesTo: ['cloyster'], rarity: 'common',
    branches: [
      branch('cloyster-vanguard', 'vanguard', 'cloyster', 'Spike Shell', 'The shell opens to fire its spikes: three icicles a card, and a punch behind the shard.', [['tackle', 'icicle-spear'], ['ice-shard', 'ice-punch']]),
      branch('cloyster-support', 'support', 'cloyster', 'Pearl Fortress', 'Withdraw hardens into Iron Defense, and the aurora it sheds saps the hitter.', [['withdraw', 'iron-defense']], ['aurora-beam'], 'shell-armor'),
    ],
  },
  {
    dex: 91, id: 'cloyster', name: 'Cloyster', types: ['water', 'ice'], stage: 'stage1', gen1: [50, 95, 180, 85, 70], growth: [2, 3, 4, 2],
    learnset: ls([14, 'aurora-beam'], [18, 'icicle-spear'], [22, 'iron-defense'], [28, 'ice-beam'], [34, 'blizzard']),
    availableAbilities: ['shell-armor', 'iron-shell'], tutorMoves: ['hydro-pump', 'surf'], evolvesTo: [], rarity: 'common',
  },
  {
    dex: 116, id: 'horsea', name: 'Horsea', types: ['water'], stage: 'basic', gen1: [30, 40, 70, 70, 60], growth: [2, 3, 2, 3],
    learnset: ls([1, 'bubble'], [1, 'smokescreen'], [4, 'water-gun'], [7, 'focus-energy'], [10, 'dragon-rage']),
    availableAbilities: ['snipe', 'damp'], hiddenAbility: 'swift-swim', tutorMoves: ['aqua-jet', 'swift'],
    evolveLevel: 12, evolvesTo: ['seadra'], rarity: 'common',
    branches: [
      branch('seadra-specialist', 'specialist', 'seadra', 'Riptide', 'A sniper from the deep: the jet becomes a pulse and the dragon in it wakes up.', [['water-gun', 'water-pulse']], ['dragon-pulse'], 'snipe'),
      branch('seadra-support', 'support', 'seadra', 'Ink Cloud', 'The ink blinds harder, and the tide quickens its shooters.', [['smokescreen', 'screech']], ['agility']),
    ],
  },
  {
    dex: 117, id: 'seadra', name: 'Seadra', types: ['water'], stage: 'stage1', gen1: [55, 65, 95, 95, 85], growth: [2, 3, 2, 3],
    learnset: ls([14, 'bubble-beam'], [18, 'agility'], [22, 'dragon-pulse'], [28, 'hydro-pump']),
    availableAbilities: ['snipe', 'damp'], tutorMoves: ['surf', 'ice-beam'], evolvesTo: [], rarity: 'common',
  },
  {
    dex: 120, id: 'staryu', name: 'Staryu', types: ['water'], stage: 'basic', gen1: [30, 45, 55, 70, 85], growth: [2, 3, 2, 4],
    learnset: ls([1, 'tackle'], [1, 'harden'], [4, 'water-gun'], [7, 'rapid-spin'], [10, 'swift']),
    availableAbilities: ['healer', 'anticipation'], hiddenAbility: 'adaptability', tutorMoves: ['bubble-beam', 'agility'],
    evolveLevel: 12, evolvesTo: ['starmie'], rarity: 'uncommon',
    branches: [
      branch('starmie-specialist', 'specialist', 'starmie', 'Prism Core', 'The core lights up: Swift becomes a psybeam, and a full Psychic follows it.', [['swift', 'psybeam']], ['psychic']),
      branch('starmie-support', 'support', 'starmie', 'Mender', 'Harden becomes Recover, and the gem learns to confuse what it cannot outlast.', [['harden', 'recover']], ['confuse-ray'], 'healer'),
    ],
  },
  {
    dex: 121, id: 'starmie', name: 'Starmie', types: ['water', 'psychic'], stage: 'stage1', gen1: [60, 75, 85, 100, 115], growth: [2, 3, 2, 4],
    learnset: ls([14, 'psybeam'], [18, 'recover'], [22, 'confuse-ray'], [26, 'psychic'], [32, 'hydro-pump']),
    availableAbilities: ['healer', 'anticipation'], tutorMoves: ['surf', 'thunderbolt'], evolvesTo: [], rarity: 'uncommon',
  },
  {
    dex: 86, id: 'seel', name: 'Seel', types: ['water'], stage: 'basic', gen1: [65, 45, 55, 70, 45], growth: [3, 2, 3, 2],
    learnset: ls([1, 'tackle'], [1, 'growl'], [4, 'powder-snow'], [7, 'aqua-jet'], [10, 'icy-wind']),
    availableAbilities: ['thick-fat', 'iron-shell'], hiddenAbility: 'healer', tutorMoves: ['water-gun', 'headbutt'],
    evolveLevel: 12, evolvesTo: ['dewgong'], rarity: 'uncommon',
    branches: [
      branch('dewgong-vanguard', 'vanguard', 'dewgong', 'Tusk', 'All the weight goes forward: a charge that costs it a little, and a tail that follows through.', [['tackle', 'take-down'], ['aqua-jet', 'aqua-tail']]),
      branch('dewgong-support', 'support', 'dewgong', 'Floe', 'The growl softens into a lullaby, and a nap on the ice puts it back together.', [['growl', 'sing']], ['rest-s'], 'thick-fat'),
    ],
  },
  {
    dex: 87, id: 'dewgong', name: 'Dewgong', types: ['water', 'ice'], stage: 'stage1', gen1: [90, 70, 80, 95, 70], growth: [3, 2, 3, 2],
    learnset: ls([14, 'aurora-beam'], [18, 'rest-s'], [22, 'take-down'], [26, 'ice-beam'], [32, 'surf']),
    availableAbilities: ['thick-fat', 'iron-shell'], tutorMoves: ['hydro-pump', 'blizzard'], evolvesTo: [], rarity: 'uncommon',
  },
  {
    // §2.8.2 — Region 2's Elite Wild, and the sea's rare: the catalogs/species-r1.md row. Growth is the row's
    // 4/2/3/2 with the single-stage +25 %, rounded up (Onix's convention); Hydration is not authored yet.
    dex: 131, id: 'lapras', name: 'Lapras', types: ['water', 'ice'], stage: 'basic', gen1: [130, 85, 80, 95, 60], growth: [5, 3, 4, 3],
    learnset: ls([1, 'water-gun'], [1, 'sing'], [6, 'mist'], [12, 'ice-shard'], [18, 'body-slam'], [24, 'confuse-ray'], [30, 'ice-beam'], [36, 'surf'], [42, 'sheer-cold-l']),
    availableAbilities: ['water-absorb', 'shell-armor'], tutorMoves: ['hydro-pump', 'thunderbolt'],
    evolvesTo: [], rarity: 'rare', archetype: 'support',
  },
  // ── Power Plant ────────────────────────────────────────────────────────────────────────────────────────
  {
    dex: 100, id: 'voltorb', name: 'Voltorb', types: ['electric'], stage: 'basic', gen1: [40, 30, 50, 55, 100], growth: [2, 2, 2, 4],
    learnset: ls([1, 'tackle'], [1, 'screech'], [4, 'thunder-shock'], [7, 'spark'], [10, 'self-destruct']),
    availableAbilities: ['static', 'run-down'], hiddenAbility: 'speed-boost', tutorMoves: ['thunder-wave', 'rollout'],
    evolveLevel: 12, evolvesTo: ['electrode'], rarity: 'common',
    branches: [
      branch('electrode-vanguard', 'vanguard', 'electrode', 'Ball Lightning', 'Everything it has, all at once: the blast gets bigger and the tackle heavier.', [['self-destruct', 'explosion'], ['tackle', 'take-down']]),
      branch('electrode-specialist', 'specialist', 'electrode', 'Capacitor', 'It learns to hold the charge instead of spending it, and to let it go at everything in front of it.', [['thunder-shock', 'charge-beam']], ['discharge'], 'static'),
    ],
  },
  {
    dex: 101, id: 'electrode', name: 'Electrode', types: ['electric'], stage: 'stage1', gen1: [60, 50, 70, 80, 140], growth: [2, 2, 2, 4],
    learnset: ls([14, 'charge-beam'], [18, 'swift'], [22, 'discharge'], [26, 'thunderbolt'], [32, 'explosion']),
    availableAbilities: ['static', 'run-down'], tutorMoves: ['thunder', 'tri-attack'], evolvesTo: [], rarity: 'common',
  },
  {
    dex: 81, id: 'magnemite', name: 'Magnemite', types: ['electric'], stage: 'basic', gen1: [25, 35, 70, 95, 45], growth: [2, 3, 3, 2],
    learnset: ls([1, 'tackle'], [1, 'supersonic'], [4, 'thunder-shock'], [7, 'thunder-wave'], [10, 'charge-beam']),
    availableAbilities: ['sturdy', 'static'], hiddenAbility: 'solid-rock', tutorMoves: ['rollout', 'metal-claw'],
    evolveLevel: 12, evolvesTo: ['magneton'], rarity: 'common',
    branches: [
      branch('magneton-specialist', 'specialist', 'magneton', 'Tri-Coil', 'Three magnets, three elements: the shock becomes a bolt and the Tri Attack comes with it.', [['thunder-shock', 'thunderbolt']], ['tri-attack']),
      branch('magneton-support', 'support', 'magneton', 'Field Lock', 'The hum grinds armour down, and the body locks itself into a wall.', [['supersonic', 'screech']], ['iron-defense'], 'sturdy'),
    ],
  },
  {
    dex: 82, id: 'magneton', name: 'Magneton', types: ['electric'], stage: 'stage1', gen1: [50, 60, 95, 120, 70], growth: [2, 3, 3, 2],
    learnset: ls([14, 'swift'], [18, 'screech'], [22, 'tri-attack'], [26, 'thunderbolt'], [34, 'zap-cannon']),
    availableAbilities: ['sturdy', 'static'], tutorMoves: ['thunder', 'double-edge'], evolvesTo: [], rarity: 'common',
  },
  {
    // §8.5.2 — the third meta-starter, and a power-plant uncommon. Three archetypes, as a starter has.
    dex: 25, id: 'pikachu', name: 'Pikachu', types: ['electric'], stage: 'basic', gen1: [35, 55, 30, 50, 90], growth: [2, 3, 2, 4],
    learnset: ls([1, 'thunder-shock'], [1, 'growl'], [4, 'quick-attack'], [7, 'thunder-wave'], [10, 'agility']),
    availableAbilities: ['static', 'run-down'], hiddenAbility: 'volt-absorb', tutorMoves: ['swift', 'surf'],
    evolveLevel: 12, evolvesTo: ['raichu'], rarity: 'uncommon',
    branches: [
      branch('raichu-vanguard', 'vanguard', 'raichu', 'Volt Tackle', 'The quick jab becomes a full-body charge that burns some of its own tail on the way in.', [['quick-attack', 'volt-tackle']]),
      branch('raichu-specialist', 'specialist', 'raichu', 'Storm Cheeks', 'The shock grows into a bolt, and a thunderhead gathers behind it.', [['thunder-shock', 'thunderbolt']], ['thunder']),
      branch('raichu-support', 'support', 'raichu', 'Static Field', 'The growl turns charming, and a discharge crackles over everything in front of it.', [['growl', 'charm']], ['discharge'], 'static'),
    ],
  },
  {
    dex: 26, id: 'raichu', name: 'Raichu', types: ['electric'], stage: 'stage1', gen1: [60, 90, 55, 90, 100], growth: [2, 3, 2, 4],
    learnset: ls([14, 'slam'], [18, 'thunderbolt'], [22, 'iron-tail'], [28, 'thunder'], [34, 'volt-tackle']),
    availableAbilities: ['static', 'run-down'], tutorMoves: ['thunder-punch', 'body-slam'], evolvesTo: [], rarity: 'uncommon',
  },
  {
    dex: 125, id: 'electabuzz', name: 'Electabuzz', types: ['electric'], stage: 'basic', gen1: [65, 83, 57, 85, 105], growth: [3, 4, 3, 4],
    learnset: ls([1, 'quick-attack'], [1, 'leer'], [5, 'thunder-shock'], [9, 'low-kick'], [13, 'thunder-punch'], [18, 'screech'], [24, 'thunderbolt'], [30, 'thunder']),
    availableAbilities: ['static', 'hustle'], tutorMoves: ['fire-punch', 'ice-punch'],
    evolvesTo: [], rarity: 'rare', archetype: 'vanguard',
  },
  // ── The Gyms' lines ────────────────────────────────────────────────────────────────────────────────────
  {
    dex: 58, id: 'growlithe', name: 'Growlithe', types: ['fire'], stage: 'basic', gen1: [55, 70, 45, 50, 60], growth: [3, 3, 2, 3],
    learnset: ls([1, 'bite'], [1, 'leer'], [4, 'ember'], [7, 'fire-fang'], [10, 'take-down']),
    availableAbilities: ['intimidate', 'flash-fire'], hiddenAbility: 'steadfast', tutorMoves: ['will-o-wisp', 'agility'],
    evolveLevel: 12, evolvesTo: ['arcanine'], rarity: 'uncommon',
    branches: [
      branch('arcanine-vanguard', 'vanguard', 'arcanine', 'Legend Hound', 'The bite hardens into a crunch, and it learns the speed the old stories gave it.', [['bite', 'crunch']], ['extreme-speed'], 'intimidate'),
      branch('arcanine-specialist', 'specialist', 'arcanine', 'Firestorm', 'The embers become a flamethrower, and the heat rolls over everything in front of it.', [['ember', 'flamethrower']], ['heat-wave']),
    ],
  },
  {
    dex: 59, id: 'arcanine', name: 'Arcanine', types: ['fire'], stage: 'stage1', gen1: [90, 110, 80, 80, 95], growth: [3, 3, 2, 3],
    learnset: ls([14, 'flame-wheel'], [18, 'crunch'], [22, 'extreme-speed'], [26, 'flamethrower'], [32, 'flare-blitz']),
    availableAbilities: ['intimidate', 'flash-fire'], tutorMoves: ['fire-blast', 'iron-tail'], evolvesTo: [], rarity: 'uncommon',
  },
  {
    dex: 109, id: 'koffing', name: 'Koffing', types: ['poison'], stage: 'basic', gen1: [40, 65, 95, 60, 35], growth: [2, 2, 4, 1],
    learnset: ls([1, 'tackle'], [1, 'smog'], [4, 'smokescreen'], [7, 'sludge'], [10, 'self-destruct']),
    availableAbilities: ['poison-point', 'cloud-nine'], tutorMoves: ['acid-armor', 'screech'],
    evolveLevel: 12, evolvesTo: ['weezing'], rarity: 'common',
    branches: [
      branch('weezing-support', 'support', 'weezing', 'Miasma', 'The smoke turns to poison, and the gas learns to burn as well.', [['smokescreen', 'poison-powder']], ['will-o-wisp'], 'poison-point'),
      branch('weezing-vanguard', 'vanguard', 'weezing', 'Detonator', 'Two heads, one fuse: the blast gets bigger and the body behind it heavier.', [['self-destruct', 'explosion'], ['tackle', 'take-down']]),
    ],
  },
  {
    dex: 110, id: 'weezing', name: 'Weezing', types: ['poison'], stage: 'stage1', gen1: [65, 90, 120, 85, 60], growth: [2, 2, 4, 1],
    learnset: ls([14, 'toxic'], [18, 'sludge-bomb'], [24, 'sludge-wave'], [30, 'explosion']),
    availableAbilities: ['poison-point', 'cloud-nine'], tutorMoves: ['flamethrower', 'thunderbolt'], evolvesTo: [], rarity: 'common',
  },
  {
    // The catalogs/species-r1.md row, learnset compressed under its thresholds as Region 1's were (§6.9); Gluttony
    // is not authored, so the pool is Chlorophyll with Snipe as the hidden third. Region 1's Meadow gains it too
    // (§2.6.1's widening), and it is the Grass Gym's slot 1.
    dex: 69, id: 'bellsprout', name: 'Bellsprout', types: ['grass', 'poison'], stage: 'basic', gen1: [50, 75, 35, 70, 40], growth: [2, 3, 2, 2],
    learnset: ls([1, 'vine-whip'], [1, 'growth'], [4, 'wrap'], [7, 'poison-powder'], [10, 'acid']),
    availableAbilities: ['chlorophyll'], hiddenAbility: 'snipe', tutorMoves: ['leech-seed', 'mega-drain'],
    evolveLevel: 12, evolvesTo: ['weepinbell'], rarity: 'uncommon',
    branches: [
      branch('weepinbell-vanguard', 'vanguard', 'weepinbell', 'Snapjaw', 'The wrap becomes a slam: it stops holding on and starts swinging.', [['wrap', 'slam']]),
      branch('weepinbell-specialist', 'specialist', 'weepinbell', 'Cutting Leaves', 'The vine sharpens into leaves it can throw from anywhere.', [['vine-whip', 'razor-leaf']]),
    ],
  },
  {
    dex: 70, id: 'weepinbell', name: 'Weepinbell', types: ['grass', 'poison'], stage: 'stage1', gen1: [65, 90, 50, 85, 55], growth: [2, 3, 2, 2],
    learnset: ls([13, 'razor-leaf'], [16, 'stun-spore'], [20, 'sludge'], [23, 'slam']),
    availableAbilities: ['chlorophyll'], tutorMoves: ['giga-drain', 'toxic'],
    evolveLevel: 26, evolvesTo: ['victreebel'], rarity: 'uncommon',
    branches: [
      branch('victreebel-vanguard', 'vanguard', 'victreebel', 'Flytrap', 'The slam becomes a whip, and a blade that always finds the soft part comes with it.', [['slam', 'power-whip']], ['leaf-blade']),
      branch('victreebel-specialist', 'specialist', 'victreebel', 'Acid Pitcher', 'The acid concentrates into sludge, and a storm of leaves it pays for afterwards.', [['acid', 'sludge-bomb']], ['leaf-storm-s']),
    ],
  },
  {
    dex: 71, id: 'victreebel', name: 'Victreebel', types: ['grass', 'poison'], stage: 'stage2', gen1: [80, 105, 65, 100, 70], growth: [2, 3, 2, 2],
    learnset: ls([27, 'power-whip'], [32, 'leaf-blade'], [38, 'sludge-bomb']),
    availableAbilities: ['chlorophyll'], tutorMoves: ['solar-beam', 'double-edge'], evolvesTo: [], rarity: 'uncommon',
  },
  {
    // §2.8.1 — the Region 2 Specialist's ace: trainer-only, never in a wild pool. The three elemental punches
    // are the line's coverage and the reason a Karate King is not a type check.
    dex: 107, id: 'hitmonchan', name: 'Hitmonchan', types: ['fighting'], stage: 'basic', gen1: [50, 105, 79, 35, 76], growth: [3, 4, 3, 3],
    learnset: ls([1, 'mach-punch'], [1, 'bulk-up'], [6, 'fire-punch'], [12, 'ice-punch'], [18, 'thunder-punch'], [24, 'sky-uppercut'], [30, 'close-combat']),
    availableAbilities: ['inner-focus', 'steadfast'], tutorMoves: ['agility', 'body-slam'],
    evolvesTo: [], rarity: 'rare', archetype: 'vanguard',
  },
];

// ── Write ───────────────────────────────────────────────────────────────────────────────────────────────────
function append(file, key, rows, map = (x) => x) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const have = new Set(data[key].map((r) => r.id));
  let n = 0;
  for (const r of rows) if (!have.has(r.id)) { data[key].push(map(r)); n++; }
  if (key === 'species') data[key].sort((a, b) => a.dex - b.dex);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return `${file.split('/').pop()}: +${n} (${data[key].length} total)`;
}

const species = (s) => {
  const { gen1, growth: g, ...rest } = s;
  return {
    dex: rest.dex, id: rest.id, name: rest.name, types: rest.types, stage: rest.stage,
    baseStats: derive(gen1), growth: growth(g), learnset: rest.learnset, availableAbilities: rest.availableAbilities,
    ...(rest.hiddenAbility ? { hiddenAbility: rest.hiddenAbility } : {}),
    tutorMoves: rest.tutorMoves, ...(rest.evolveLevel ? { evolveLevel: rest.evolveLevel } : {}), evolvesTo: rest.evolvesTo,
    rarity: rest.rarity, branches: rest.branches ?? [], ...(rest.archetype ? { archetype: rest.archetype } : {}),
  };
};

console.log(append('src/content/data/moves.json', 'moves', MOVES));
console.log(append('src/content/data/abilities.json', 'abilities', ABILITIES));
console.log(append('src/content/data/badges.json', 'badges', BADGES));
console.log(append('src/content/data/held-items.json', 'items', HELD_ITEMS));
console.log(append('src/content/data/species.json', 'species', SPECIES, species));
