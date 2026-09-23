#!/usr/bin/env node
// One-shot: the rest of the 151 (2026-09-23, asked for by the user: "import all 151, design them, and have them
// ready whenever a Region needs them"). Seventy-eight species, the moves their kits use, nine abilities on hooks
// the sim already has, and Poliwhirl's evolution into Poliwrath. Nothing here is placed in a wild pool, a roster or
// a Gym — a Region takes a line when it needs it (v0.7.4 on). Rows mirror docs/design/catalogs/species-gen1.md,
// and where catalogs/species-r1.md or catalogs/moves.md already had a row (Mankey, Aerodactyl, Marowak, Poliwrath,
// and a dozen moves), that row is the one shipped.
//
// Existing entries are never touched, except Poliwhirl, which gains the evolution its catalogue row always had.
//
//   node scripts/add-gen1-content.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const M = (id, name, type, role, range, modifier, apCost, power, effects = [], extra = {}) =>
  ({ id, name, type, role, range, modifier, apCost, power, effects, ...extra });
const stage = (target, stat, stages) => ({ kind: 'stage', target, stat, stages });
const status = (s, chance, extra = {}) => ({ kind: 'status', status: s, chance, ...extra });
const hits = (n) => ({ kind: 'multi-hit', hits: n });
const recoil = (p) => ({ kind: 'recoil', percentOfDamage: p });
const heal = (p, extra = {}) => ({ kind: 'heal', percentOfMaxHp: p, ...extra });

/**
 * catalogs/moves.md. The first block is the catalogue's own rows, shipped as written — a rider the sim has no
 * effect kind for ships without it, v0.3's rule (Rage's "when damaged", Hyper Beam's recharge, Thrash's
 * repeat, Sky Drop's cancel, Heavy Slam's weight). The second block is new rows, inside the power budget
 * (1 AP 40–55, 2 AP 60–90, 3 AP 85–100, 4 AP 110–130; a drawback buys a little over).
 */
const MOVES = [
  // ── Catalogue rows ─────────────────────────────────────────────────────────────────────────────────────
  M('rage', 'Rage', 'normal', 'offensive', 'melee', 'none', 1, 45),
  M('mega-punch', 'Mega Punch', 'normal', 'offensive', 'melee', 'step-forward', 2, 80),
  M('hyper-beam', 'Hyper Beam', 'normal', 'offensive', 'ranged', 'none', 4, 130, [], { cooldown: 2 }),
  M('giga-impact-v', 'Giga Impact', 'normal', 'offensive', 'melee', 'none', 4, 130, [], { cooldown: 2 }),
  M('fury-swipes', 'Fury Swipes', 'normal', 'offensive', 'melee', 'none', 2, 20, [hits(3)]),
  M('thrash', 'Thrash', 'normal', 'offensive', 'melee', 'none', 2, 85),
  M('signal-beam', 'Signal Beam', 'bug', 'offensive', 'ranged', 'none', 2, 70, [status('confusion', 0.2)]),
  M('ancient-power', 'Ancient Power', 'rock', 'offensive', 'ranged', 'none', 2, 65, [stage('self', 'attack', 1), stage('self', 'defense', 1)]),
  M('heavy-slam', 'Heavy Slam', 'rock', 'offensive', 'melee', 'none', 3, 100),
  M('bone-club', 'Bone Club', 'ground', 'offensive', 'melee', 'none', 1, 50),
  M('bonemerang', 'Bonemerang', 'ground', 'offensive', 'ranged', 'none', 2, 35, [hits(2)]),
  M('bone-rush', 'Bone Rush', 'ground', 'offensive', 'melee', 'step-forward', 3, 30, [hits(3)]),
  M('lick', 'Lick', 'ghost', 'offensive', 'melee', 'none', 1, 40, [status('paralysis', 0.3)]),
  M('air-cutter', 'Air Cutter', 'flying', 'offensive', 'ranged', 'none', 2, 60, [], { targeting: 'cleave' }),
  M('sky-drop', 'Sky Drop', 'flying', 'offensive', 'melee', 'step-backward', 3, 95),
  // ── New rows ───────────────────────────────────────────────────────────────────────────────────────────
  // Ghost — Gen I had one Ghost move in the build (Confuse Ray).
  M('night-shade', 'Night Shade', 'ghost', 'offensive', 'ranged', 'none', 2, 70),
  M('shadow-punch', 'Shadow Punch', 'ghost', 'offensive', 'melee', 'step-forward', 2, 70),
  M('shadow-ball', 'Shadow Ball', 'ghost', 'offensive', 'ranged', 'none', 3, 95),
  // Psychic
  M('kinesis', 'Kinesis', 'psychic', 'utility', 'ranged', 'none', 0, 0, [stage('foe', 'attack', -1)]),
  M('psywave', 'Psywave', 'psychic', 'offensive', 'ranged', 'none', 1, 50),
  M('extrasensory', 'Extrasensory', 'psychic', 'offensive', 'ranged', 'none', 2, 80),
  M('barrier', 'Barrier', 'psychic', 'defensive', 'melee', 'none', 1, 0, [stage('self', 'defense', 2)]),
  M('reflect', 'Reflect', 'psychic', 'defensive', 'melee', 'none', 1, 0, [stage('self', 'defense', 1), stage('bench', 'defense', 1)]),
  M('light-screen', 'Light Screen', 'psychic', 'defensive', 'melee', 'none', 1, 0, [{ kind: 'team-guard', guard: 'cleave', percent: 50 }]),
  M('calm-mind', 'Calm Mind', 'psychic', 'utility', 'melee', 'none', 1, 0, [stage('self', 'attack', 1), stage('self', 'defense', 1)]),
  M('psystrike', 'Psystrike', 'psychic', 'offensive', 'ranged', 'none', 4, 130, [], { cooldown: 2, ignoresDefenseStages: true }),
  // Normal
  M('pound', 'Pound', 'normal', 'offensive', 'melee', 'none', 1, 40),
  M('pay-day', 'Pay Day', 'normal', 'offensive', 'ranged', 'none', 1, 45),
  M('horn-attack', 'Horn Attack', 'normal', 'offensive', 'melee', 'none', 2, 65),
  M('horn-drill', 'Horn Drill', 'normal', 'offensive', 'melee', 'none', 4, 130, [], { cooldown: 2, ignoresDefenseStages: true }),
  M('guillotine', 'Guillotine', 'normal', 'offensive', 'melee', 'none', 4, 130, [], { cooldown: 2, ignoresDefenseStages: true }),
  M('glare', 'Glare', 'normal', 'utility', 'ranged', 'none', 1, 0, [status('paralysis', 1)]),
  M('lovely-kiss', 'Lovely Kiss', 'normal', 'utility', 'ranged', 'none', 1, 0, [status('sleep', 1)]),
  M('egg-bomb', 'Egg Bomb', 'normal', 'offensive', 'ranged', 'none', 3, 100),
  M('softboiled', 'Soft-Boiled', 'normal', 'defensive', 'melee', 'none', 1, 0, [heal(0.5)], { cooldown: 2 }),
  M('dizzy-punch', 'Dizzy Punch', 'normal', 'offensive', 'melee', 'none', 2, 70, [status('confusion', 0.2)]),
  M('mega-kick', 'Mega Kick', 'normal', 'offensive', 'melee', 'none', 3, 100),
  M('barrage', 'Barrage', 'normal', 'offensive', 'ranged', 'none', 1, 18, [hits(3)]),
  M('comet-punch', 'Comet Punch', 'normal', 'offensive', 'melee', 'none', 1, 18, [hits(3)]),
  M('spike-cannon', 'Spike Cannon', 'normal', 'offensive', 'ranged', 'none', 1, 18, [hits(3)]),
  M('minimize', 'Minimize', 'normal', 'defensive', 'melee', 'none', 1, 0, [stage('self', 'defense', 2)]),
  M('swords-dance', 'Swords Dance', 'normal', 'utility', 'melee', 'none', 1, 0, [stage('self', 'attack', 2)]),
  M('hyper-voice', 'Hyper Voice', 'normal', 'offensive', 'ranged', 'none', 3, 80, [], { targeting: 'cleave' }),
  // ⚠ Ditto's Transform copies its target in the games; the sim has no copy kind, so this is a stand-in (species-gen1.md).
  M('transform-d', 'Transform', 'normal', 'utility', 'melee', 'none', 1, 0, [stage('self', 'attack', 1), stage('self', 'defense', 1)]),
  // Flying · Fighting · Ground · Rock · Water · Dragon · Fire · Bug · Poison · Grass · Ice
  M('peck', 'Peck', 'flying', 'offensive', 'melee', 'none', 1, 40),
  M('drill-peck', 'Drill Peck', 'flying', 'offensive', 'melee', 'none', 2, 75),
  M('fly', 'Fly', 'flying', 'offensive', 'melee', 'step-forward', 3, 90),
  M('double-kick', 'Double Kick', 'fighting', 'offensive', 'melee', 'none', 1, 25, [hits(2)]),
  M('rolling-kick', 'Rolling Kick', 'fighting', 'offensive', 'melee', 'none', 1, 50),
  M('jump-kick', 'Jump Kick', 'fighting', 'offensive', 'melee', 'step-forward', 2, 80, [recoil(0.2)]),
  M('hi-jump-kick', 'High Jump Kick', 'fighting', 'offensive', 'melee', 'step-forward', 3, 110, [recoil(0.25)]),
  M('aura-sphere', 'Aura Sphere', 'fighting', 'offensive', 'ranged', 'none', 3, 90),
  M('earth-power', 'Earth Power', 'ground', 'offensive', 'ranged', 'none', 3, 90, [stage('foe', 'defense', -1)]),
  M('drill-run', 'Drill Run', 'ground', 'offensive', 'melee', 'none', 2, 70, [], { alwaysCrit: true }),
  M('power-gem', 'Power Gem', 'rock', 'offensive', 'ranged', 'none', 2, 80),
  M('waterfall', 'Waterfall', 'water', 'offensive', 'melee', 'none', 2, 75),
  M('twister', 'Twister', 'dragon', 'offensive', 'ranged', 'none', 1, 40, [], { targeting: 'cleave' }),
  M('outrage', 'Outrage', 'dragon', 'offensive', 'melee', 'none', 3, 110, [status('confusion', 1, { self: true })]),
  M('lava-plume', 'Lava Plume', 'fire', 'offensive', 'ranged', 'none', 2, 60, [status('burn', 0.3)], { targeting: 'cleave' }),
  M('x-scissor', 'X-Scissor', 'bug', 'offensive', 'melee', 'none', 2, 75),
  M('megahorn', 'Megahorn', 'bug', 'offensive', 'melee', 'none', 3, 100),
  M('gunk-shot', 'Gunk Shot', 'poison', 'offensive', 'ranged', 'none', 4, 120, [status('poison', 0.3)], { cooldown: 1 }),
  M('ingrain', 'Ingrain', 'grass', 'defensive', 'melee', 'none', 1, 0, [heal(0.125, { durationTurns: 3 })]),
  M('haze', 'Haze', 'ice', 'utility', 'ranged', 'none', 1, 0, [{ kind: 'team-cure' }]),
];

/** catalogs/abilities.md — nine passives on hooks the sim already reads. No new hook. */
const ABILITIES = [
  { id: 'flame-body', name: 'Flame Body', category: 'Status', description: 'A melee attacker risks being Burned.', hook: 'on-damaged', params: { range: 'melee', status: 'burn', chance: 0.3 } },
  { id: 'cute-charm', name: 'Cute Charm', category: 'Status', description: 'A melee attacker risks being Confused.', hook: 'on-damaged', params: { range: 'melee', status: 'confusion', chance: 0.3 } },
  { id: 'battle-armor', name: 'Battle Armor', category: 'Positional', description: 'While Lead, incoming hits deal 2 less damage.', hook: 'lead-flat-reduction', params: { amount: 2 } },
  { id: 'insomnia', name: 'Insomnia', category: 'Status', description: 'Cannot fall asleep.', hook: 'status-immunity', params: { status: 'sleep' } },
  { id: 'vital-spirit', name: 'Vital Spirit', category: 'Status', description: 'Cannot fall asleep.', hook: 'status-immunity', params: { status: 'sleep' } },
  { id: 'limber', name: 'Limber', category: 'Status', description: 'Cannot be Paralysed.', hook: 'status-immunity', params: { status: 'paralysis' } },
  { id: 'water-veil', name: 'Water Veil', category: 'Status', description: 'Cannot be Burned.', hook: 'status-immunity', params: { status: 'burn' } },
  { id: 'immunity', name: 'Immunity', category: 'Status', description: 'Cannot be Poisoned.', hook: 'status-immunity', params: { status: 'poison' } },
  { id: 'own-tempo', name: 'Own Tempo', category: 'Status', description: 'Cannot be Confused.', hook: 'status-immunity', params: { status: 'confusion' } },
];

// ── Species ─────────────────────────────────────────────────────────────────────────────────────────────────
// Stats are the Gen I line, derived by §4.1.5.1: attack = max(Atk, Spc), defence = round((Def + Spc) / 2).
// Evolution at 12 and 26, the uniform rule; learnsets under each threshold (§6.9); a base form knows two moves at
// Lv 1 and at most one positional card. A single stage carries the +25 % growth single stages get.
const derive = ([hp, atk, def, spc, spd]) => ({ hp, attack: Math.max(atk, spc), defense: Math.round((def + spc) / 2), speed: spd });
const ls = (...pairs) => pairs.map(([level, move]) => ({ level, move }));
const b = (id, archetype, to, label, description, upgrades, adds = [], abilityId) => ({
  id, archetype, label, description, to, upgrades: upgrades.map(([from, t]) => ({ from, to: t })), adds, ...(abilityId ? { abilityId } : {}),
});
/** One species row. `evo` is [level, into] on a form that evolves. */
const S = (dex, id, name, types, stage, gen1, growth, learnset, abilities, tutors, rarity, opts = {}) => ({
  dex, id, name, types, stage, gen1, growth, learnset, abilities, tutors, rarity, ...opts,
});

const SPECIES = [
  // Spearow
  S(21, 'spearow', 'Spearow', ['normal', 'flying'], 'basic', [40, 60, 30, 31, 70], [2, 3, 2, 3],
    ls([1, 'peck'], [1, 'growl'], [4, 'leer'], [7, 'fury-attack'], [10, 'aerial-ace']), ['keen-eye', 'tangled-feet', 'snipe'], ['quick-attack', 'swift'], 'common',
    { evo: [12, 'fearow'], branches: [
      b('fearow-vanguard', 'vanguard', 'fearow', 'Drill Beak', 'The peck becomes a drill, and it learns to dive beak-first into the ground as well.', [['peck', 'drill-peck']], ['drill-run']),
      b('fearow-specialist', 'specialist', 'fearow', 'Skyhunter', 'It stops pecking and starts cutting the air itself.', [['aerial-ace', 'air-slash']]),
    ] }),
  S(22, 'fearow', 'Fearow', ['normal', 'flying'], 'stage1', [65, 90, 65, 61, 100], [2, 3, 2, 3],
    ls([14, 'drill-peck'], [18, 'agility'], [22, 'drill-run'], [28, 'air-slash'], [34, 'brave-bird']), ['keen-eye', 'tangled-feet'], ['sky-attack', 'double-edge'], 'common'),
  // Ekans
  S(23, 'ekans', 'Ekans', ['poison'], 'basic', [35, 60, 44, 40, 55], [2, 3, 2, 3],
    ls([1, 'wrap'], [1, 'leer'], [4, 'poison-sting'], [7, 'bite'], [10, 'glare']), ['intimidate', 'poison-point', 'guts'], ['acid-armor', 'dig'], 'common',
    { evo: [12, 'arbok'], branches: [
      b('arbok-vanguard', 'vanguard', 'arbok', 'Cobra', 'The bite hardens into a crunch, and the fangs start carrying venom.', [['bite', 'crunch']], ['poison-fang']),
      b('arbok-support', 'support', 'arbok', 'Hood', 'The hood flares: the glare turns into a screech, and it sheds every status in the air.', [['leer', 'screech']], ['haze'], 'intimidate'),
    ] }),
  S(24, 'arbok', 'Arbok', ['poison'], 'stage1', [60, 85, 69, 65, 80], [2, 3, 2, 3],
    ls([14, 'acid'], [18, 'poison-fang'], [22, 'crunch'], [28, 'sludge-bomb'], [34, 'gunk-shot']), ['intimidate', 'poison-point'], ['earthquake', 'iron-tail'], 'common'),
  // Sandshrew
  S(27, 'sandshrew', 'Sandshrew', ['ground'], 'basic', [50, 75, 85, 30, 40], [3, 3, 3, 2],
    ls([1, 'scratch'], [1, 'defense-curl'], [4, 'sand-attack'], [7, 'rollout'], [10, 'fury-swipes']), ['sand-veil', 'iron-shell', 'tough-claws'], ['mud-shot', 'bulldoze'], 'common',
    { evo: [12, 'sandslash'], branches: [
      b('sandslash-vanguard', 'vanguard', 'sandslash', 'Claw', 'The scratch grows into a slash, and the claws learn to drill.', [['scratch', 'slash']], ['drill-run']),
      b('sandslash-support', 'support', 'sandslash', 'Spined Ball', 'It curls tighter, and the spines along its back lock into armour.', [['defense-curl', 'iron-defense']], [], 'iron-shell'),
    ] }),
  S(28, 'sandslash', 'Sandslash', ['ground'], 'stage1', [75, 100, 110, 55, 65], [3, 3, 3, 2],
    ls([14, 'slash'], [18, 'dig'], [24, 'drill-run'], [30, 'earthquake']), ['sand-veil', 'iron-shell'], ['stone-edge', 'x-scissor'], 'common'),
  // Nidoran♀
  S(29, 'nidoran-f', 'Nidoran♀', ['poison'], 'basic', [55, 47, 52, 40, 41], [3, 2, 3, 2],
    ls([1, 'growl'], [1, 'scratch'], [4, 'tail-whip'], [7, 'poison-sting'], [10, 'double-kick']), ['poison-point', 'hustle', 'guts'], ['quick-attack', 'poison-fang'], 'uncommon',
    { evo: [12, 'nidorina'], branches: [
      b('nidorina-vanguard', 'vanguard', 'nidorina', 'Thorn', 'The scratch becomes a flurry of swipes.', [['scratch', 'fury-swipes']]),
      b('nidorina-support', 'support', 'nidorina', 'Den Mother', 'The growl softens into a charm that takes the fight out of whatever comes near.', [['growl', 'charm']], [], 'poison-point'),
    ] }),
  S(30, 'nidorina', 'Nidorina', ['poison'], 'stage1', [70, 62, 67, 55, 56], [3, 2, 3, 2],
    ls([13, 'bite'], [16, 'fury-swipes'], [20, 'toxic'], [23, 'crunch']), ['poison-point', 'hustle'], ['sludge', 'take-down'], 'uncommon',
    { evo: [26, 'nidoqueen'], branches: [
      b('nidoqueen-vanguard', 'vanguard', 'nidoqueen', 'Earthshaker', 'The kicks give way to its whole weight, and the ground answers when it lands.', [['double-kick', 'body-slam']], ['earthquake']),
      b('nidoqueen-specialist', 'specialist', 'nidoqueen', 'Poison Queen', 'The sting becomes a sludge bomb, and the earth itself turns against her enemies.', [['poison-sting', 'sludge-bomb']], ['earth-power']),
    ] }),
  S(31, 'nidoqueen', 'Nidoqueen', ['poison', 'ground'], 'stage2', [90, 82, 87, 75, 76], [3, 2, 3, 2],
    ls([27, 'body-slam'], [32, 'earth-power'], [38, 'sludge-wave'], [44, 'earthquake']), ['poison-point', 'hustle'], ['surf', 'ice-beam'], 'uncommon'),
  // Nidoran♂
  S(32, 'nidoran-m', 'Nidoran♂', ['poison'], 'basic', [46, 57, 40, 40, 50], [2, 3, 2, 3],
    ls([1, 'leer'], [1, 'peck'], [4, 'focus-energy'], [7, 'poison-sting'], [10, 'double-kick']), ['poison-point', 'hustle', 'guts'], ['quick-attack', 'poison-fang'], 'uncommon',
    { evo: [12, 'nidorino'], branches: [
      b('nidorino-vanguard', 'vanguard', 'nidorino', 'Horn', 'The peck becomes a horn thrust.', [['peck', 'horn-attack']]),
      b('nidorino-specialist', 'specialist', 'nidorino', 'Venom Horn', 'The sting grows into a jab that poisons what it pierces.', [['poison-sting', 'poison-jab']]),
    ] }),
  S(33, 'nidorino', 'Nidorino', ['poison'], 'stage1', [61, 72, 57, 55, 65], [2, 3, 2, 3],
    ls([13, 'horn-attack'], [16, 'fury-attack'], [20, 'poison-jab'], [23, 'thrash']), ['poison-point', 'hustle'], ['sludge', 'take-down'], 'uncommon',
    { evo: [26, 'nidoking'], branches: [
      b('nidoking-vanguard', 'vanguard', 'nidoking', 'Earth King', 'The horn becomes a megahorn, and it learns to shake the ground it stands on.', [['horn-attack', 'megahorn']], ['earthquake']),
      b('nidoking-specialist', 'specialist', 'nidoking', 'Toxic King', 'The jab floods into a wave of sludge, and the earth rises with it.', [['poison-jab', 'sludge-wave']], ['earth-power']),
    ] }),
  S(34, 'nidoking', 'Nidoking', ['poison', 'ground'], 'stage2', [81, 92, 77, 75, 85], [2, 3, 2, 3],
    ls([27, 'earth-power'], [32, 'megahorn'], [38, 'earthquake'], [44, 'horn-drill']), ['poison-point', 'hustle'], ['thunderbolt', 'ice-beam'], 'uncommon'),
  // Clefairy
  S(35, 'clefairy', 'Clefairy', ['normal'], 'basic', [70, 45, 48, 60, 35], [3, 2, 2, 2],
    ls([1, 'pound'], [1, 'growl'], [4, 'sing'], [7, 'double-slap'], [10, 'minimize']), ['cute-charm', 'solid-rock', 'healer'], ['charm', 'swift'], 'uncommon',
    { evo: [12, 'clefable'], branches: [
      b('clefable-support', 'support', 'clefable', 'Moon Dancer', 'It shrinks away from harm into moonlight, and makes wishes for whoever needs them.', [['minimize', 'moonlight']], ['wish'], 'cute-charm'),
      b('clefable-specialist', 'specialist', 'clefable', 'Moon Child', 'The slaps become a voice that fills the arena, and a screen of light goes up behind it.', [['double-slap', 'hyper-voice']], ['light-screen']),
    ] }),
  S(36, 'clefable', 'Clefable', ['normal'], 'stage1', [95, 70, 73, 85, 60], [3, 2, 2, 2],
    ls([14, 'body-slam'], [18, 'moonlight'], [22, 'light-screen'], [28, 'double-edge']), ['cute-charm', 'solid-rock'], ['ice-beam', 'thunderbolt'], 'uncommon'),
  // Vulpix
  S(37, 'vulpix', 'Vulpix', ['fire'], 'basic', [38, 41, 40, 65, 65], [2, 3, 2, 3],
    ls([1, 'ember'], [1, 'tail-whip'], [4, 'quick-attack'], [7, 'confuse-ray'], [10, 'fire-spin']), ['flash-fire', 'flame-body', 'anticipation'], ['agility', 'swift'], 'common',
    { evo: [12, 'ninetales'], branches: [
      b('ninetales-specialist', 'specialist', 'ninetales', 'Ninefold Flame', 'The embers become a flamethrower, and nine tails of heat roll out behind it.', [['ember', 'flamethrower']], ['heat-wave']),
      b('ninetales-support', 'support', 'ninetales', 'Kitsune', 'The confusing light turns to a burning one, and the fox learns to wait.', [['confuse-ray', 'will-o-wisp']], ['calm-mind'], 'flash-fire'),
    ] }),
  S(38, 'ninetales', 'Ninetales', ['fire'], 'stage1', [73, 76, 75, 100, 100], [2, 3, 2, 3],
    ls([14, 'flamethrower'], [18, 'will-o-wisp'], [22, 'extrasensory'], [28, 'heat-wave'], [34, 'fire-blast']), ['flash-fire', 'flame-body'], ['solar-beam', 'psyshock'], 'common'),
  // Jigglypuff
  S(39, 'jigglypuff', 'Jigglypuff', ['normal'], 'basic', [115, 45, 20, 25, 20], [4, 2, 1, 1],
    ls([1, 'sing'], [1, 'pound'], [4, 'defense-curl'], [7, 'double-slap'], [10, 'rest-s']), ['cute-charm', 'iron-shell', 'healer'], ['charm', 'disable'], 'common',
    { evo: [12, 'wigglytuff'], branches: [
      b('wigglytuff-vanguard', 'vanguard', 'wigglytuff', 'Big Balloon', 'All that air goes behind the body: the pound becomes a body slam, and a heavier one follows.', [['pound', 'body-slam']], ['double-edge']),
      b('wigglytuff-support', 'support', 'wigglytuff', 'Encore', 'It puffs up out of reach and sings its wishes to the team.', [['defense-curl', 'minimize']], ['wish'], 'cute-charm'),
    ] }),
  S(40, 'wigglytuff', 'Wigglytuff', ['normal'], 'stage1', [140, 70, 45, 50, 45], [4, 2, 1, 1],
    ls([14, 'body-slam'], [18, 'wish'], [22, 'hyper-voice'], [28, 'double-edge']), ['cute-charm', 'iron-shell'], ['ice-beam', 'psychic'], 'common'),
  // Paras
  S(46, 'paras', 'Paras', ['bug', 'grass'], 'basic', [35, 70, 55, 55, 25], [2, 3, 3, 1],
    ls([1, 'scratch'], [1, 'stun-spore'], [4, 'absorb'], [7, 'leech-life'], [10, 'spore-cloud']), ['effect-spore', 'swarm', 'damp'], ['growth', 'fury-swipes'], 'common',
    { evo: [12, 'parasect'], branches: [
      b('parasect-vanguard', 'vanguard', 'parasect', 'Cordyceps', 'The mushroom takes over: the scratch becomes a slash, and a scissor cut follows.', [['scratch', 'slash']], ['x-scissor']),
      b('parasect-support', 'support', 'parasect', 'Spore Host', 'It drinks deeper, and the spores learn to put things to sleep.', [['absorb', 'mega-drain']], ['sleep-powder'], 'effect-spore'),
    ] }),
  S(47, 'parasect', 'Parasect', ['bug', 'grass'], 'stage1', [60, 95, 80, 80, 30], [2, 3, 3, 1],
    ls([14, 'slash'], [18, 'mega-drain'], [22, 'x-scissor'], [28, 'giga-drain']), ['effect-spore', 'swarm'], ['solar-beam', 'swords-dance'], 'common'),
  // Venonat
  S(48, 'venonat', 'Venonat', ['bug', 'poison'], 'basic', [60, 55, 50, 40, 45], [3, 2, 2, 2],
    ls([1, 'tackle'], [1, 'disable'], [4, 'supersonic'], [7, 'confusion'], [10, 'poison-powder']), ['compound-eyes', 'snipe', 'run-down'], ['leech-life', 'stun-spore'], 'common',
    { evo: [12, 'venomoth'], branches: [
      b('venomoth-specialist', 'specialist', 'venomoth', 'Dust Wings', 'The confusion sharpens into a beam, and the wings start to buzz.', [['confusion', 'psybeam']], ['bug-buzz']),
      b('venomoth-support', 'support', 'venomoth', 'Powder Moth', 'The poison dust turns to a sleeping one, and the wind off its wings carries it.', [['poison-powder', 'sleep-powder']], ['silver-wind'], 'compound-eyes'),
    ] }),
  S(49, 'venomoth', 'Venomoth', ['bug', 'poison'], 'stage1', [70, 65, 60, 90, 90], [3, 2, 2, 2],
    ls([14, 'psybeam'], [18, 'silver-wind'], [22, 'sleep-powder'], [28, 'psychic'], [34, 'bug-buzz']), ['compound-eyes', 'snipe'], ['signal-beam', 'giga-drain'], 'common'),
  // Meowth
  S(52, 'meowth', 'Meowth', ['normal'], 'basic', [40, 45, 35, 40, 90], [2, 2, 2, 4],
    ls([1, 'scratch'], [1, 'growl'], [4, 'bite'], [7, 'pay-day'], [10, 'fury-swipes']), ['run-down', 'tough-claws', 'moxie'], ['quick-attack', 'charm'], 'common',
    { evo: [12, 'persian'], branches: [
      b('persian-vanguard', 'vanguard', 'persian', 'Prowler', 'The scratch becomes a slash, and it learns to strike first.', [['scratch', 'slash']], ['sucker-punch']),
      b('persian-specialist', 'specialist', 'persian', 'Jewel', 'The coin on its brow becomes a gem it can fire.', [['pay-day', 'power-gem']], ['swift']),
    ] }),
  S(53, 'persian', 'Persian', ['normal'], 'stage1', [65, 70, 60, 65, 115], [2, 2, 2, 4],
    ls([14, 'slash'], [18, 'screech'], [22, 'power-gem'], [28, 'agility'], [34, 'hyper-voice']), ['run-down', 'tough-claws'], ['thunderbolt', 'iron-tail'], 'common'),
  // Mankey — catalogs/species-r1.md's row, compressed under its threshold; Seismic Toss+ (level × 3) has no kind, so
  // its Specialist upgrade lands on Seismic Toss.
  S(56, 'mankey', 'Mankey', ['fighting'], 'basic', [40, 80, 35, 35, 70], [2, 3, 1, 3],
    ls([1, 'scratch'], [1, 'leer'], [4, 'low-kick'], [7, 'karate-chop'], [10, 'focus-energy']), ['vital-spirit', null, 'guts'], ['bulk-up', 'rolling-kick'], 'uncommon',
    { evo: [12, 'primeape'], branches: [
      b('primeape-vanguard', 'vanguard', 'primeape', 'Fury', 'The chop becomes a cross chop, and nothing holds it back after.', [['karate-chop', 'cross-chop']], ['close-combat']),
      b('primeape-specialist', 'specialist', 'primeape', 'Brawler', 'The kick turns into a throw, and the claws into a flurry.', [['low-kick', 'seismic-toss']], ['fury-swipes']),
    ] }),
  S(57, 'primeape', 'Primeape', ['fighting'], 'stage1', [65, 105, 60, 60, 95], [2, 3, 1, 3],
    ls([14, 'seismic-toss'], [18, 'fury-swipes'], [22, 'cross-chop'], [28, 'thrash'], [34, 'close-combat']), ['vital-spirit'], ['brick-break', 'stone-edge'], 'uncommon'),
  // Poliwrath — the stage its catalogue row always had (species-r1.md), learnset compressed like Venusaur's.
  S(62, 'poliwrath', 'Poliwrath', ['water', 'fighting'], 'stage2', [90, 85, 95, 70, 70], [3, 2, 2, 3],
    ls([27, 'submission'], [32, 'hydro-pump'], [38, 'dynamic-punch']), ['water-absorb', 'damp', 'swift-swim'], ['ice-punch', 'earthquake'], 'common'),
  // Abra
  S(63, 'abra', 'Abra', ['psychic'], 'basic', [25, 20, 15, 105, 90], [1, 3, 1, 3],
    ls([1, 'psywave'], [1, 'kinesis'], [4, 'confusion'], [7, 'disable'], [10, 'barrier']), ['inner-focus', 'anticipation', 'adaptability'], ['swift', 'thunder-wave'], 'uncommon',
    { evo: [12, 'kadabra'], branches: [
      b('kadabra-specialist', 'specialist', 'kadabra', 'Spoonbender', 'The wave of force focuses into a beam.', [['psywave', 'psybeam']]),
      b('kadabra-support', 'support', 'kadabra', 'Mind Wall', 'Kinesis turns outward: a reflecting wall for the whole team.', [['kinesis', 'reflect']], [], 'inner-focus'),
    ] }),
  S(64, 'kadabra', 'Kadabra', ['psychic'], 'stage1', [40, 35, 30, 120, 105], [1, 3, 1, 3],
    ls([13, 'psybeam'], [16, 'recover'], [20, 'reflect'], [23, 'psychic']), ['inner-focus', 'anticipation'], ['zen-headbutt', 'thunder-punch'], 'uncommon',
    { evo: [26, 'alakazam'], branches: [
      b('alakazam-specialist', 'specialist', 'alakazam', 'Grand Mind', 'The beam becomes the full weight of its mind, and a shock that goes through armour.', [['psybeam', 'psychic']], ['psyshock']),
      b('alakazam-support', 'support', 'alakazam', 'Clairvoyant', 'It stops mending and starts preparing: a calmer mind, and a screen of light.', [['recover', 'calm-mind']], ['light-screen']),
    ] }),
  S(65, 'alakazam', 'Alakazam', ['psychic'], 'stage2', [55, 50, 45, 135, 120], [1, 3, 1, 3],
    ls([27, 'calm-mind'], [32, 'psyshock'], [38, 'shadow-ball']), ['inner-focus', 'anticipation'], ['fire-punch', 'ice-punch'], 'uncommon'),
  // Ponyta
  S(77, 'ponyta', 'Ponyta', ['fire'], 'basic', [50, 85, 55, 65, 90], [2, 3, 2, 3],
    ls([1, 'tackle'], [1, 'growl'], [4, 'ember'], [7, 'stomp'], [10, 'fire-spin']), ['flash-fire', 'flame-body', 'run-down'], ['double-kick', 'quick-attack'], 'common',
    { evo: [12, 'rapidash'], branches: [
      b('rapidash-vanguard', 'vanguard', 'rapidash', 'Blaze Charger', 'The tackle becomes a full gallop, and the mane follows it in.', [['tackle', 'take-down']], ['flare-blitz']),
      b('rapidash-specialist', 'specialist', 'rapidash', 'Sunfire Mane', 'The embers become a flamethrower, and the heat of its mane rolls outward.', [['ember', 'flamethrower']], ['heat-wave']),
    ] }),
  S(78, 'rapidash', 'Rapidash', ['fire'], 'stage1', [65, 100, 70, 80, 105], [2, 3, 2, 3],
    ls([14, 'flame-wheel'], [18, 'agility'], [24, 'flare-blitz'], [30, 'megahorn']), ['flash-fire', 'flame-body'], ['drill-run', 'solar-beam'], 'common'),
  // Slowpoke
  S(79, 'slowpoke', 'Slowpoke', ['water', 'psychic'], 'basic', [90, 65, 65, 40, 15], [4, 2, 2, 1],
    ls([1, 'tackle'], [1, 'growl'], [4, 'water-gun'], [7, 'confusion'], [10, 'disable']), ['own-tempo', 'healer', 'solid-rock'], ['bubble-beam', 'body-slam'], 'common',
    { evo: [12, 'slowbro'], branches: [
      b('slowbro-specialist', 'specialist', 'slowbro', 'Tide Sage', 'Whatever bit its tail woke something up: the confusion becomes a full Psychic.', [['confusion', 'psychic']], ['calm-mind']),
      b('slowbro-support', 'support', 'slowbro', 'Shell Tail', 'It forgets everything but how to last: amnesia, and a slow recovery.', [['growl', 'amnesia']], ['recover'], 'own-tempo'),
    ] }),
  S(80, 'slowbro', 'Slowbro', ['water', 'psychic'], 'stage1', [95, 75, 110, 80, 30], [4, 2, 2, 1],
    ls([14, 'withdraw'], [18, 'headbutt'], [22, 'amnesia'], [28, 'psychic'], [34, 'surf']), ['own-tempo', 'healer'], ['ice-beam', 'flamethrower'], 'common'),
  // Farfetch'd
  S(83, 'farfetchd', 'Farfetch\'d', ['normal', 'flying'], 'basic', [52, 65, 55, 58, 60], [3, 4, 3, 4],
    ls([1, 'peck'], [1, 'sand-attack'], [5, 'leer'], [9, 'fury-attack'], [13, 'aerial-ace'], [18, 'swords-dance'], [24, 'slash'], [30, 'leaf-blade'], [36, 'brave-bird']), ['keen-eye', 'inner-focus'], ['air-cutter', 'x-scissor'], 'uncommon', { archetype: 'vanguard' }),
  // Doduo
  S(84, 'doduo', 'Doduo', ['normal', 'flying'], 'basic', [35, 85, 45, 35, 75], [2, 3, 2, 3],
    ls([1, 'peck'], [1, 'growl'], [4, 'quick-attack'], [7, 'fury-attack'], [10, 'rage']), ['keen-eye', 'tangled-feet', 'run-down'], ['double-kick', 'swift'], 'uncommon',
    { evo: [12, 'dodrio'], branches: [
      b('dodrio-vanguard', 'vanguard', 'dodrio', 'Three Heads', 'Three beaks, one drill, and a dive none of them can stop.', [['peck', 'drill-peck']], ['brave-bird']),
      b('dodrio-specialist', 'specialist', 'dodrio', 'Triple Call', 'The rage splits three ways into a tri-attack.', [['rage', 'tri-attack']]),
    ] }),
  S(85, 'dodrio', 'Dodrio', ['normal', 'flying'], 'stage1', [60, 110, 70, 60, 100], [2, 3, 2, 3],
    ls([14, 'drill-peck'], [18, 'agility'], [22, 'tri-attack'], [28, 'thrash'], [34, 'brave-bird']), ['keen-eye', 'tangled-feet'], ['sky-attack', 'double-edge'], 'uncommon'),
  // Grimer
  S(88, 'grimer', 'Grimer', ['poison'], 'basic', [80, 80, 50, 40, 25], [3, 3, 2, 1],
    ls([1, 'pound'], [1, 'smog'], [4, 'harden'], [7, 'sludge'], [10, 'minimize']), ['poison-point', 'guts', 'iron-shell'], ['mud-slap', 'disable'], 'common',
    { evo: [12, 'muk'], branches: [
      b('muk-vanguard', 'vanguard', 'muk', 'Sludge Slam', 'All that sludge goes behind the blow, and the rest is thrown.', [['pound', 'body-slam']], ['gunk-shot']),
      b('muk-support', 'support', 'muk', 'Toxic Sludge', 'It hardens into acid armour and breathes out a haze that clears the field.', [['harden', 'acid-armor']], ['haze'], 'poison-point'),
    ] }),
  S(89, 'muk', 'Muk', ['poison'], 'stage1', [105, 105, 75, 65, 50], [3, 3, 2, 1],
    ls([14, 'acid-armor'], [18, 'sludge-bomb'], [22, 'screech'], [28, 'gunk-shot']), ['poison-point', 'guts'], ['fire-punch', 'thunder-punch'], 'common'),
  // Gastly
  S(92, 'gastly', 'Gastly', ['ghost', 'poison'], 'basic', [30, 35, 30, 100, 80], [1, 3, 1, 3],
    ls([1, 'lick'], [1, 'hypnosis'], [4, 'confuse-ray'], [7, 'night-shade'], [10, 'smog']), ['anticipation', 'snipe', 'adaptability'], ['psywave', 'screech'], 'common',
    { evo: [12, 'haunter'], branches: [
      b('haunter-specialist', 'specialist', 'haunter', 'Nightmare', 'The night shade condenses into a ball of shadow.', [['night-shade', 'shadow-ball']]),
      b('haunter-support', 'support', 'haunter', 'Hypnotist', 'The hypnosis deepens and takes the guard down with it.', [['hypnosis', 'hypnosis-plus']], [], 'anticipation'),
    ] }),
  S(93, 'haunter', 'Haunter', ['ghost', 'poison'], 'stage1', [45, 50, 45, 115, 95], [1, 3, 1, 3],
    ls([13, 'shadow-punch'], [16, 'disable'], [20, 'shadow-ball'], [23, 'toxic']), ['anticipation', 'snipe'], ['thunderbolt', 'sludge-wave'], 'common',
    { evo: [26, 'gengar'], branches: [
      b('gengar-vanguard', 'vanguard', 'gengar', 'Shadow Fist', 'The lick becomes a punch from the shadows, and it learns to strike before you do.', [['lick', 'shadow-punch']], ['sucker-punch']),
      b('gengar-specialist', 'specialist', 'gengar', 'Ghastly Eye', 'The smog thickens into sludge, and the mind behind it wakes.', [['smog', 'sludge-bomb']], ['psychic']),
    ] }),
  S(94, 'gengar', 'Gengar', ['ghost', 'poison'], 'stage2', [60, 65, 60, 130, 110], [1, 3, 1, 3],
    ls([27, 'sludge-bomb'], [33, 'psychic'], [40, 'hyper-beam']), ['anticipation', 'snipe'], ['ice-punch', 'fire-punch'], 'common'),
  // Drowzee
  S(96, 'drowzee', 'Drowzee', ['psychic'], 'basic', [60, 48, 45, 90, 42], [3, 2, 2, 2],
    ls([1, 'pound'], [1, 'hypnosis'], [4, 'disable'], [7, 'confusion'], [10, 'headbutt']), ['insomnia', 'inner-focus', 'anticipation'], ['kinesis', 'swift'], 'uncommon',
    { evo: [12, 'hypno'], branches: [
      b('hypno-specialist', 'specialist', 'hypno', 'Pendulum', 'The confusion swings into a beam, and a shock that finds the soft spot.', [['confusion', 'psybeam']], ['psyshock']),
      b('hypno-support', 'support', 'hypno', 'Sleepwalker', 'Its hypnosis deepens, and it learns to wait out a fight with a calm mind.', [['hypnosis', 'hypnosis-plus']], ['calm-mind'], 'insomnia'),
    ] }),
  S(97, 'hypno', 'Hypno', ['psychic'], 'stage1', [85, 73, 70, 115, 67], [3, 2, 2, 2],
    ls([14, 'psybeam'], [18, 'zen-headbutt'], [22, 'psychic'], [28, 'calm-mind'], [34, 'psyshock']), ['insomnia', 'inner-focus'], ['ice-punch', 'thunder-punch'], 'uncommon'),
  // Exeggcute
  S(102, 'exeggcute', 'Exeggcute', ['grass', 'psychic'], 'basic', [60, 40, 80, 60, 40], [3, 2, 3, 1],
    ls([1, 'barrage'], [1, 'hypnosis'], [4, 'leech-seed'], [7, 'confusion'], [10, 'stun-spore']), ['chlorophyll', 'healer'], ['absorb', 'mega-drain'], 'uncommon',
    { evo: [12, 'exeggutor'], branches: [
      b('exeggutor-specialist', 'specialist', 'exeggutor', 'Coconut', 'The eggs stop bouncing and start exploding, and the heads above them think as one.', [['barrage', 'egg-bomb']], ['psychic']),
      b('exeggutor-support', 'support', 'exeggutor', 'Seed Bearer', 'The seed turns to a sleeping powder, and a wall of light goes up for the team.', [['leech-seed', 'sleep-powder']], ['reflect'], 'healer'),
    ] }),
  S(103, 'exeggutor', 'Exeggutor', ['grass', 'psychic'], 'stage1', [95, 95, 85, 125, 55], [3, 2, 3, 1],
    ls([14, 'stomp'], [18, 'egg-bomb'], [24, 'psychic'], [30, 'solar-beam']), ['chlorophyll', 'healer'], ['giga-drain', 'extrasensory'], 'uncommon'),
  // Cubone → Marowak (catalogs/species-r1.md's Marowak row, compressed to start after Cubone's threshold)
  S(104, 'cubone', 'Cubone', ['ground'], 'basic', [50, 50, 95, 40, 35], [3, 3, 3, 2],
    ls([1, 'growl'], [1, 'bone-club'], [4, 'tail-whip'], [7, 'headbutt'], [10, 'focus-energy']), ['rock-head', null, 'battle-armor'], ['mud-slap', 'dig'], 'rare',
    { evo: [12, 'marowak'], branches: [
      b('marowak-vanguard', 'vanguard', 'marowak', 'Bone Rush', 'The headbutt gives way to the bone, swung three times, and a rage it will not put down.', [['headbutt', 'bone-rush']], ['thrash']),
      b('marowak-specialist', 'specialist', 'marowak', 'Boomerang', 'It learns to throw the club and catch it again.', [['bone-club', 'bonemerang']]),
    ] }),
  S(105, 'marowak', 'Marowak', ['ground'], 'stage1', [60, 80, 110, 50, 45], [3, 3, 3, 2],
    ls([14, 'bonemerang'], [20, 'thrash'], [26, 'bone-rush'], [32, 'earthquake']), ['rock-head'], ['swords-dance', 'rock-slide-m'], 'rare'),
  // Hitmonlee
  S(106, 'hitmonlee', 'Hitmonlee', ['fighting'], 'basic', [50, 120, 53, 35, 87], [3, 4, 3, 4],
    ls([1, 'double-kick'], [1, 'focus-energy'], [6, 'rolling-kick'], [12, 'jump-kick'], [18, 'mega-kick'], [24, 'hi-jump-kick'], [30, 'close-combat']), ['limber', 'rock-head'], ['bulk-up', 'low-kick'], 'rare', { archetype: 'vanguard' }),
  // Lickitung
  S(108, 'lickitung', 'Lickitung', ['normal'], 'basic', [90, 55, 75, 60, 30], [4, 3, 3, 2],
    ls([1, 'lick'], [1, 'supersonic'], [5, 'wrap'], [10, 'stomp'], [15, 'disable'], [20, 'slam'], [26, 'screech'], [32, 'power-whip']), ['own-tempo', 'cloud-nine'], ['ice-beam', 'thunderbolt'], 'rare', { archetype: 'support' }),
  // Rhyhorn
  S(111, 'rhyhorn', 'Rhyhorn', ['ground', 'rock'], 'basic', [80, 85, 95, 30, 25], [3, 3, 3, 1],
    ls([1, 'horn-attack'], [1, 'tail-whip'], [4, 'stomp'], [7, 'fury-attack'], [10, 'rock-throw']), ['rock-head', 'solid-rock'], ['bulldoze', 'iron-tail'], 'uncommon',
    { evo: [12, 'rhydon'], branches: [
      b('rhydon-vanguard', 'vanguard', 'rhydon', 'Drill Horn', 'The horn starts to spin, and a megahorn comes after it.', [['horn-attack', 'drill-run']], ['megahorn']),
      b('rhydon-specialist', 'specialist', 'rhydon', 'Landslide', 'It stops throwing rocks and starts bringing the hillside down, then the ground under it.', [['rock-throw', 'rock-slide-m']], ['earthquake']),
    ] }),
  S(112, 'rhydon', 'Rhydon', ['ground', 'rock'], 'stage1', [105, 130, 120, 45, 40], [3, 3, 3, 1],
    ls([14, 'rock-slide-m'], [18, 'horn-drill'], [22, 'earthquake'], [28, 'stone-edge'], [34, 'megahorn']), ['rock-head', 'solid-rock'], ['surf', 'thunderbolt'], 'uncommon'),
  // Chansey — §2.12 names it Victory Road's Apex recruit.
  S(113, 'chansey', 'Chansey', ['normal'], 'basic', [250, 5, 5, 105, 50], [6, 2, 2, 2],
    ls([1, 'pound'], [1, 'growl'], [5, 'double-slap'], [10, 'sing'], [15, 'softboiled'], [20, 'minimize'], [26, 'egg-bomb'], [32, 'light-screen'], [38, 'double-edge']), ['healer'], ['ice-beam', 'thunderbolt'], 'rare', { archetype: 'support' }),
  // Tangela
  S(114, 'tangela', 'Tangela', ['grass'], 'basic', [65, 55, 115, 100, 60], [3, 3, 4, 2],
    ls([1, 'vine-whip'], [1, 'wrap'], [5, 'absorb'], [10, 'poison-powder'], [15, 'stun-spore'], [20, 'mega-drain'], [26, 'ingrain'], [32, 'giga-drain'], [38, 'power-whip']), ['chlorophyll', 'healer'], ['sleep-powder', 'ancient-power'], 'uncommon', { archetype: 'support' }),
  // Kangaskhan — §2.12 names it Victory Road's Apex recruit.
  S(115, 'kangaskhan', 'Kangaskhan', ['normal'], 'basic', [105, 95, 80, 40, 90], [4, 3, 3, 3],
    ls([1, 'comet-punch'], [1, 'leer'], [5, 'bite'], [10, 'rage'], [15, 'mega-punch'], [20, 'dizzy-punch'], [26, 'crunch'], [32, 'body-slam'], [38, 'giga-impact-v']), ['inner-focus', 'guts'], ['earthquake', 'fire-punch'], 'rare', { archetype: 'vanguard' }),
  // Goldeen
  S(118, 'goldeen', 'Goldeen', ['water'], 'basic', [45, 67, 60, 50, 63], [2, 3, 2, 3],
    ls([1, 'peck'], [1, 'tail-whip'], [4, 'water-gun'], [7, 'supersonic'], [10, 'horn-attack']), ['water-veil', 'swift-swim', 'snipe'], ['aqua-jet', 'flail'], 'common',
    { evo: [12, 'seaking'], branches: [
      b('seaking-vanguard', 'vanguard', 'seaking', 'Horn Diver', 'The horn grows into a megahorn and it charges up the falls with it.', [['horn-attack', 'megahorn']]),
      b('seaking-specialist', 'specialist', 'seaking', 'Waterfall', 'The jet becomes a waterfall, and a ring of water keeps it going.', [['water-gun', 'waterfall']], ['aqua-ring']),
    ] }),
  S(119, 'seaking', 'Seaking', ['water'], 'stage1', [80, 92, 65, 80, 68], [2, 3, 2, 3],
    ls([14, 'waterfall'], [18, 'agility'], [22, 'aqua-ring'], [28, 'megahorn'], [34, 'horn-drill']), ['water-veil', 'swift-swim'], ['ice-beam', 'surf'], 'common'),
  // Mr. Mime
  S(122, 'mr-mime', 'Mr. Mime', ['psychic'], 'basic', [40, 45, 65, 100, 90], [2, 3, 3, 4],
    ls([1, 'confusion'], [1, 'barrier'], [5, 'double-slap'], [10, 'light-screen'], [15, 'reflect'], [20, 'psybeam'], [26, 'psychic'], [32, 'calm-mind'], [38, 'psyshock']), ['solid-rock', 'inner-focus'], ['thunder-wave', 'hypnosis'], 'rare', { archetype: 'support' }),
  // Scyther
  S(123, 'scyther', 'Scyther', ['bug', 'flying'], 'basic', [70, 110, 80, 55, 105], [3, 4, 3, 4],
    ls([1, 'quick-attack'], [1, 'leer'], [5, 'focus-energy'], [10, 'wing-attack'], [15, 'slash'], [20, 'swords-dance'], [26, 'x-scissor'], [32, 'air-slash'], [38, 'fly']), ['swarm', 'steadfast'], ['aerial-ace', 'double-edge'], 'rare', { archetype: 'vanguard' }),
  // Jynx
  S(124, 'jynx', 'Jynx', ['ice', 'psychic'], 'basic', [65, 50, 35, 95, 95], [3, 3, 2, 3],
    ls([1, 'pound'], [1, 'lovely-kiss'], [5, 'lick'], [10, 'powder-snow'], [15, 'double-slap'], [20, 'ice-punch'], [26, 'ice-beam'], [32, 'psychic'], [38, 'blizzard']), ['anticipation', 'own-tempo'], ['psyshock', 'calm-mind'], 'rare', { archetype: 'specialist' }),
  // Magmar
  S(126, 'magmar', 'Magmar', ['fire'], 'basic', [65, 95, 57, 85, 93], [3, 4, 3, 4],
    ls([1, 'ember'], [1, 'leer'], [5, 'smog'], [10, 'confuse-ray'], [15, 'fire-punch'], [20, 'lava-plume'], [26, 'flamethrower'], [32, 'fire-blast']), ['flame-body', 'vital-spirit'], ['thunder-punch', 'psychic'], 'uncommon', { archetype: 'specialist' }),
  // Pinsir
  S(127, 'pinsir', 'Pinsir', ['bug'], 'basic', [65, 125, 100, 55, 85], [3, 4, 3, 3],
    ls([1, 'vice-grip'], [1, 'focus-energy'], [5, 'harden'], [10, 'seismic-toss'], [15, 'x-scissor'], [20, 'swords-dance'], [26, 'submission'], [32, 'guillotine'], [38, 'megahorn']), ['moxie', 'guts'], ['earthquake', 'stone-edge'], 'rare', { archetype: 'vanguard' }),
  // Tauros
  S(128, 'tauros', 'Tauros', ['normal'], 'basic', [75, 100, 95, 70, 110], [3, 4, 3, 4],
    ls([1, 'tackle'], [1, 'tail-whip'], [5, 'rage'], [10, 'horn-attack'], [15, 'stomp'], [20, 'take-down'], [26, 'zen-headbutt'], [32, 'thrash'], [38, 'giga-impact-v']), ['intimidate', 'guts'], ['earthquake', 'body-slam'], 'rare', { archetype: 'vanguard' }),
  // Ditto — ⚠ OPEN: Transform (species-gen1.md). Two cards, like the games' one move and a spare.
  S(132, 'ditto', 'Ditto', ['normal'], 'basic', [48, 48, 48, 48, 48], [2, 2, 2, 2],
    ls([1, 'transform-d'], [1, 'pound']), ['limber'], [], 'rare', { archetype: 'support' }),
  // Porygon
  S(137, 'porygon', 'Porygon', ['normal'], 'basic', [65, 60, 70, 75, 40], [3, 3, 3, 2],
    ls([1, 'tackle'], [1, 'focus-energy'], [5, 'psybeam'], [10, 'agility'], [15, 'recover'], [20, 'tri-attack'], [26, 'discharge'], [32, 'zap-cannon'], [38, 'hyper-beam']), ['adaptability', 'anticipation'], ['ice-beam', 'thunderbolt'], 'rare', { archetype: 'specialist' }),
  // Omanyte
  S(138, 'omanyte', 'Omanyte', ['rock', 'water'], 'basic', [35, 40, 100, 90, 35], [2, 3, 3, 2],
    ls([1, 'water-gun'], [1, 'withdraw'], [4, 'bite'], [7, 'ancient-power'], [10, 'spike-cannon']), ['shell-armor', 'swift-swim'], ['mud-shot', 'aurora-beam'], 'rare',
    { evo: [12, 'omastar'], branches: [
      b('omastar-specialist', 'specialist', 'omastar', 'Ancient Spiral', 'The jet becomes a hydro pump, and the old shell starts to shine.', [['water-gun', 'hydro-pump']], ['power-gem']),
      b('omastar-vanguard', 'vanguard', 'omastar', 'Spike Shell', 'The spikes stop flying and start hammering.', [['spike-cannon', 'rock-blast']], [], 'shell-armor'),
    ] }),
  S(139, 'omastar', 'Omastar', ['rock', 'water'], 'stage1', [70, 60, 125, 115, 55], [2, 3, 3, 2],
    ls([14, 'brine'], [18, 'rock-blast'], [22, 'power-gem'], [28, 'hydro-pump']), ['shell-armor', 'swift-swim'], ['ice-beam', 'earth-power'], 'rare'),
  // Kabuto
  S(140, 'kabuto', 'Kabuto', ['rock', 'water'], 'basic', [30, 80, 90, 45, 55], [2, 3, 3, 3],
    ls([1, 'scratch'], [1, 'harden'], [4, 'absorb'], [7, 'aqua-jet'], [10, 'ancient-power']), ['battle-armor', 'swift-swim'], ['mud-shot', 'rock-throw'], 'rare',
    { evo: [12, 'kabutops'], branches: [
      b('kabutops-vanguard', 'vanguard', 'kabutops', 'Scythe', 'The claws lengthen into blades.', [['scratch', 'slash']], ['x-scissor']),
      b('kabutops-specialist', 'specialist', 'kabutops', 'Leech Shell', 'It drinks harder, and the cliffs come down on whatever it points at.', [['absorb', 'mega-drain']], ['rock-slide-m']),
    ] }),
  S(141, 'kabutops', 'Kabutops', ['rock', 'water'], 'stage1', [60, 115, 105, 70, 80], [2, 3, 3, 3],
    ls([14, 'slash'], [18, 'mega-drain'], [22, 'rock-slide-m'], [28, 'x-scissor'], [34, 'stone-edge']), ['battle-armor', 'swift-swim'], ['swords-dance', 'waterfall'], 'rare'),
  // Aerodactyl — catalogs/species-r1.md's row as written; Pressure is not authored.
  S(142, 'aerodactyl', 'Aerodactyl', ['rock', 'flying'], 'basic', [80, 105, 65, 60, 130], [4, 4, 3, 5],
    ls([1, 'wing-attack'], [1, 'supersonic'], [6, 'bite'], [12, 'ancient-power'], [18, 'agility'], [24, 'crunch'], [30, 'rock-slide-m'], [36, 'sky-drop'], [42, 'giga-impact-v']), ['rock-head', null, 'tough-claws'], ['earthquake', 'fire-fang'], 'rare', { archetype: 'vanguard' }),
  // The legendary birds, Mewtwo and Mew — authored, and in no pool: canon reserves them (species-pool-r2-r3.md).
  S(144, 'articuno', 'Articuno', ['ice', 'flying'], 'basic', [90, 85, 100, 125, 85], [4, 3, 4, 3],
    ls([1, 'gust'], [1, 'powder-snow'], [8, 'mist'], [16, 'ice-shard'], [24, 'agility'], [32, 'ice-beam'], [40, 'hurricane'], [48, 'blizzard'], [56, 'sheer-cold-l']), ['snipe', 'inner-focus'], ['roost', 'haze'], 'legendary', { archetype: 'specialist' }),
  S(145, 'zapdos', 'Zapdos', ['electric', 'flying'], 'basic', [90, 90, 85, 125, 100], [4, 3, 3, 4],
    ls([1, 'peck'], [1, 'thunder-shock'], [8, 'thunder-wave'], [16, 'agility'], [24, 'drill-peck'], [32, 'discharge'], [40, 'thunderbolt'], [48, 'zap-cannon'], [56, 'thunder']), ['static', 'volt-absorb'], ['roost', 'charge-beam'], 'legendary', { archetype: 'specialist' }),
  S(146, 'moltres', 'Moltres', ['fire', 'flying'], 'basic', [90, 100, 90, 125, 90], [4, 3, 3, 3],
    ls([1, 'wing-attack'], [1, 'ember'], [8, 'fire-spin'], [16, 'agility'], [24, 'flamethrower'], [32, 'air-slash'], [40, 'heat-wave'], [48, 'sky-attack'], [56, 'fire-blast']), ['flame-body', 'flash-fire'], ['roost', 'will-o-wisp'], 'legendary', { archetype: 'specialist' }),
  // Dratini
  S(147, 'dratini', 'Dratini', ['dragon'], 'basic', [41, 64, 45, 50, 50], [2, 3, 2, 3],
    ls([1, 'wrap'], [1, 'leer'], [4, 'thunder-wave'], [7, 'twister'], [10, 'dragon-rage']), ['inner-focus', 'iron-shell', 'solid-rock'], ['aqua-jet', 'body-slam'], 'rare',
    { evo: [12, 'dragonair'], branches: [
      b('dragonair-vanguard', 'vanguard', 'dragonair', 'Coil', 'The wrap becomes a slam: the whole serpent, swung.', [['wrap', 'slam']]),
      b('dragonair-specialist', 'specialist', 'dragonair', 'Serpent', 'The twister gathers into a pulse of dragon energy.', [['twister', 'dragon-pulse']]),
      b('dragonair-support', 'support', 'dragonair', 'Aura', 'The crystals on its neck calm the air: a guard against status, and a ring of water.', [['thunder-wave', 'safeguard']], ['aqua-ring'], 'inner-focus'),
    ] }),
  S(148, 'dragonair', 'Dragonair', ['dragon'], 'stage1', [61, 84, 65, 70, 70], [2, 3, 2, 3],
    ls([13, 'slam'], [16, 'agility'], [20, 'aqua-tail'], [23, 'dragon-pulse']), ['inner-focus', 'iron-shell'], ['ice-beam', 'thunderbolt'], 'rare',
    { evo: [26, 'dragonite'], branches: [
      b('dragonite-vanguard', 'vanguard', 'dragonite', 'Dragon Rush', 'The slam becomes an outrage, and it learns a speed no dragon should have.', [['slam', 'outrage']], ['extreme-speed']),
      b('dragonite-specialist', 'specialist', 'dragonite', 'Storm Dragon', 'The pulse becomes a hurricane, and a beam it pays for after.', [['dragon-pulse', 'hurricane']], ['hyper-beam']),
      b('dragonite-support', 'support', 'dragonite', 'Guardian', 'It trades speed for staying power: rest on the wing, and a guard for the team.', [['agility', 'roost']], ['safeguard']),
    ] }),
  S(149, 'dragonite', 'Dragonite', ['dragon', 'flying'], 'stage2', [91, 134, 95, 100, 80], [2, 3, 2, 3],
    ls([27, 'wing-attack'], [32, 'outrage'], [38, 'hurricane'], [44, 'hyper-beam']), ['inner-focus', 'iron-shell'], ['fire-punch', 'thunder-punch'], 'rare'),
  S(150, 'mewtwo', 'Mewtwo', ['psychic'], 'basic', [106, 110, 90, 154, 130], [4, 4, 3, 4],
    ls([1, 'confusion'], [1, 'disable'], [8, 'swift'], [16, 'barrier'], [24, 'psychic'], [32, 'recover'], [40, 'aura-sphere'], [48, 'calm-mind'], [56, 'psystrike']), ['inner-focus', 'adaptability'], ['ice-beam', 'thunderbolt'], 'legendary', { archetype: 'specialist' }),
  S(151, 'mew', 'Mew', ['psychic'], 'basic', [100, 100, 100, 100, 100], [4, 3, 3, 3],
    ls([1, 'pound'], [1, 'reflect'], [10, 'mega-punch'], [20, 'barrier'], [30, 'ancient-power'], [40, 'psychic'], [50, 'aura-sphere'], [60, 'amnesia']), ['inner-focus', 'solid-rock'], ['flamethrower', 'thunderbolt', 'ice-beam', 'earthquake'], 'legendary', { archetype: 'support' }),
];

/** Poliwhirl's evolution into Poliwrath — catalogs/species-r1.md's table. Rain Dance+ is a field (§4.3) the
 *  sim does not have, so the Specialist's addition waits; Rest+ is Rest. */
const POLIWHIRL = {
  evolveLevel: 26,
  evolvesTo: ['poliwrath'],
  branches: [
    b('poliwrath-vanguard', 'vanguard', 'poliwrath', 'Fighting Tadpole', 'The body slam becomes a submission, and a dizzying punch comes after it.', [['body-slam', 'submission']], ['dynamic-punch']),
    b('poliwrath-specialist', 'specialist', 'poliwrath', 'Torrent Fist', 'The bubbles become a hydro pump.', [['bubble-beam', 'hydro-pump']]),
    b('poliwrath-support', 'support', 'poliwrath', 'Spiral Sleep', 'The spiral puts itself to sleep to mend, and it guards the team while it does.', [['hypnosis-plus', 'rest-s']], ['wide-guard']),
  ],
};

// ── Write ───────────────────────────────────────────────────────────────────────────────────────────────────
const species = (s) => {
  const [first, second, hidden] = s.abilities;
  return {
    dex: s.dex, id: s.id, name: s.name, types: s.types, stage: s.stage,
    baseStats: derive(s.gen1),
    growth: { hp: s.growth[0], attack: s.growth[1], defense: s.growth[2], speed: s.growth[3] },
    learnset: s.learnset,
    availableAbilities: [first, second].filter(Boolean),
    ...(hidden ? { hiddenAbility: hidden } : {}),
    tutorMoves: s.tutors,
    ...(s.evo ? { evolveLevel: s.evo[0] } : {}),
    evolvesTo: s.evo ? [s.evo[1]] : [],
    rarity: s.rarity,
    branches: s.branches ?? [],
    ...(s.archetype ? { archetype: s.archetype } : {}),
  };
};

function append(file, key, rows, map = (x) => x) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const have = new Set(data[key].map((r) => r.id));
  let n = 0;
  for (const r of rows) if (!have.has(r.id)) { data[key].push(map(r)); n++; }
  if (key === 'species') {
    // Poliwhirl gains the evolution its catalogue row always had — the one edit to an existing entry.
    const pw = data.species.find((x) => x.id === 'poliwhirl');
    if (pw && !pw.evolvesTo.length) Object.assign(pw, POLIWHIRL);
    data[key].sort((a, c) => a.dex - c.dex);
  }
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return `${file.split('/').pop()}: +${n} (${data[key].length} total)`;
}

console.log(append('src/content/data/moves.json', 'moves', MOVES));
console.log(append('src/content/data/abilities.json', 'abilities', ABILITIES));
console.log(append('src/content/data/species.json', 'species', SPECIES, species));
