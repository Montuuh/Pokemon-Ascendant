#!/usr/bin/env node
// Generate src/content/data/species.json from the Gen I source table.
//
// Two rules make this a script rather than a hand-edited file (§4.1.5.1, §6.9):
//   · the two combat stats are DERIVED — attack = max(Atk, Spc), defence = round((Def + Spc) / 2)
//   · every learnset entry must sit below its stage's evolution level, or a move is lost on evolving
// Both are easy to get wrong by hand across 35 species and impossible to get wrong here.
//
//   node scripts/gen-species.mjs         → write
//   node scripts/gen-species.mjs --check → verify the committed file matches (used by the content test)
import { readFileSync, writeFileSync } from 'node:fs';

// Growth is the per-line tuning knob. The Rock line carries defence growth 4 rather than 3 because the
// derived defence (§4.1.5.1) averages its near-zero Special away and would otherwise erase its wall identity.
//
// dex, id, Name, types, [HP, Atk, Def, Spc, Spd], stage, evolveLevel|null, evolvesTo[], rarity,
// growth [hp, atk, def, spd], learnset [[level, move]], abilities[]
const S = [
  // ── starters ──────────────────────────────────────────────────────────────
  [1, 'bulbasaur', 'Bulbasaur', ['grass'], [45, 49, 49, 65, 45], 'basic', 12, ['ivysaur'], 'common', [3, 2, 2, 2],
    [[1, 'tackle'], [1, 'growl'], [4, 'vine-whip'], [7, 'leech-seed'], [10, 'sleep-powder']], ['overgrow']],
  [2, 'ivysaur', 'Ivysaur', ['grass', 'poison'], [60, 62, 63, 80, 60], 'stage1', 26, ['venusaur'], 'common', [3, 2, 2, 2],
    [[13, 'razor-leaf'], [16, 'mega-drain'], [20, 'sweet-scent'], [23, 'vine-lash']], ['overgrow', 'healer']],
  [3, 'venusaur', 'Venusaur', ['grass', 'poison'], [80, 82, 83, 100, 80], 'stage2', null, [], 'rare', [3, 2, 2, 2],
    [[27, 'power-whip'], [32, 'petal-blizzard'], [38, 'solar-beam']], ['overgrow', 'tough-claws']],

  [4, 'charmander', 'Charmander', ['fire'], [39, 52, 43, 60, 65], 'basic', 12, ['charmeleon'], 'common', [2, 3, 2, 3],
    [[1, 'scratch'], [1, 'growl'], [4, 'ember'], [7, 'smokescreen'], [10, 'fire-fang']], ['blaze']],
  [5, 'charmeleon', 'Charmeleon', ['fire'], [58, 64, 58, 80, 80], 'stage1', 26, ['charizard'], 'common', [2, 3, 2, 3],
    [[13, 'slash'], [16, 'flame-wheel'], [20, 'dragon-claw'], [23, 'fire-spin']], ['blaze', 'tough-claws']],
  [6, 'charizard', 'Charizard', ['fire', 'flying'], [78, 84, 78, 109, 100], 'stage2', null, [], 'rare', [2, 3, 2, 3],
    [[27, 'wing-attack'], [31, 'flamethrower'], [36, 'heat-wave']], ['blaze', 'tough-claws']],

  [7, 'squirtle', 'Squirtle', ['water'], [44, 48, 65, 50, 43], 'basic', 12, ['wartortle'], 'common', [3, 2, 3, 2],
    [[1, 'tackle'], [1, 'tail-whip'], [4, 'water-gun'], [7, 'withdraw'], [10, 'bubble']], ['torrent']],
  [8, 'wartortle', 'Wartortle', ['water'], [59, 63, 80, 65, 58], 'stage1', 26, ['blastoise'], 'common', [3, 2, 3, 2],
    [[13, 'bite'], [16, 'water-pulse'], [20, 'rapid-spin'], [23, 'aqua-jet']], ['torrent', 'shell-armor']],
  [9, 'blastoise', 'Blastoise', ['water'], [79, 83, 100, 85, 78], 'stage2', null, [], 'rare', [3, 2, 3, 2],
    [[27, 'surf'], [32, 'hydro-pump'], [38, 'skull-bash']], ['torrent', 'shell-armor']],

  // ── meadow ────────────────────────────────────────────────────────────────
  [10, 'caterpie', 'Caterpie', ['bug'], [45, 30, 35, 20, 45], 'basic', 8, ['metapod'], 'common', [2, 1, 2, 2],
    [[1, 'tackle'], [1, 'string-shot'], [4, 'bug-bite'], [6, 'harden']], ['compound-eyes', 'swarm']],
  [11, 'metapod', 'Metapod', ['bug'], [50, 20, 55, 25, 30], 'stage1', 12, ['butterfree'], 'common', [2, 1, 2, 2],
    [[9, 'silk-bind'], [10, 'pin-shot'], [11, 'harden-plus']], ['iron-shell']],
  [12, 'butterfree', 'Butterfree', ['bug', 'flying'], [60, 45, 50, 90, 70], 'stage2', null, [], 'uncommon', [2, 1, 2, 2],
    [[13, 'gust'], [16, 'powder-spread'], [20, 'psybeam'], [25, 'silver-wind']], ['compound-eyes', 'swarm']],

  [13, 'weedle', 'Weedle', ['bug', 'poison'], [40, 35, 30, 20, 50], 'basic', 8, ['kakuna'], 'common', [2, 3, 1, 3],
    [[1, 'poison-sting'], [1, 'string-shot'], [4, 'bug-bite'], [6, 'harden']], ['swarm', 'poison-point']],
  [14, 'kakuna', 'Kakuna', ['bug', 'poison'], [45, 25, 50, 25, 35], 'stage1', 12, ['beedrill'], 'common', [2, 3, 1, 3],
    [[9, 'harden-plus'], [10, 'pin-shot']], ['iron-shell']],
  [15, 'beedrill', 'Beedrill', ['bug', 'poison'], [65, 80, 40, 45, 75], 'stage2', null, [], 'uncommon', [2, 3, 1, 3],
    [[13, 'fury-attack'], [17, 'twineedle'], [22, 'focus-energy'], [27, 'poison-jab']], ['swarm', 'snipe']],

  [16, 'pidgey', 'Pidgey', ['normal', 'flying'], [40, 45, 40, 35, 56], 'basic', 12, ['pidgeotto'], 'common', [2, 2, 2, 3],
    [[1, 'tackle'], [1, 'sand-attack'], [4, 'gust'], [7, 'quick-attack'], [10, 'roost']], ['keen-eye', 'tangled-feet']],
  [17, 'pidgeotto', 'Pidgeotto', ['normal', 'flying'], [63, 60, 55, 50, 71], 'stage1', 26, ['pidgeot'], 'common', [2, 2, 2, 3],
    [[13, 'wing-attack'], [16, 'tailwind'], [20, 'feather-dance'], [23, 'aerial-ace']], ['keen-eye', 'tangled-feet']],
  [18, 'pidgeot', 'Pidgeot', ['normal', 'flying'], [83, 80, 75, 70, 101], 'stage2', null, [], 'uncommon', [2, 2, 2, 3],
    [[27, 'air-slash'], [32, 'roost-plus'], [38, 'hurricane']], ['keen-eye', 'healer']],

  [19, 'rattata', 'Rattata', ['normal'], [30, 56, 35, 25, 72], 'basic', 12, ['raticate'], 'common', [2, 3, 2, 3],
    [[1, 'tackle'], [1, 'tail-whip'], [4, 'quick-attack'], [7, 'bite'], [10, 'focus-energy']], ['guts', 'run-down']],
  [20, 'raticate', 'Raticate', ['normal'], [55, 81, 60, 50, 97], 'stage1', null, [], 'common', [2, 3, 2, 3],
    [[13, 'hyper-fang'], [18, 'crunch'], [24, 'sucker-punch'], [30, 'double-edge']], ['guts', 'hustle']],

  [43, 'oddish', 'Oddish', ['grass', 'poison'], [45, 50, 55, 75, 30], 'basic', 12, ['gloom'], 'uncommon', [2, 2, 3, 1],
    [[1, 'absorb'], [1, 'sweet-scent'], [4, 'poison-powder'], [7, 'acid'], [10, 'sleep-powder']], ['chlorophyll', 'effect-spore']],
  [44, 'gloom', 'Gloom', ['grass', 'poison'], [60, 65, 70, 85, 40], 'stage1', 26, ['vileplume'], 'uncommon', [2, 2, 3, 1],
    [[13, 'mega-drain'], [16, 'stun-spore'], [20, 'moonlight'], [23, 'sludge']], ['chlorophyll', 'effect-spore']],
  [45, 'vileplume', 'Vileplume', ['grass', 'poison'], [75, 80, 85, 100, 50], 'stage2', null, [], 'rare', [2, 2, 3, 1],
    [[27, 'giga-drain'], [32, 'petal-dance'], [38, 'sludge-bomb']], ['chlorophyll', 'healer']],

  // ── cave ──────────────────────────────────────────────────────────────────
  [41, 'zubat', 'Zubat', ['poison', 'flying'], [40, 45, 35, 40, 55], 'basic', 12, ['golbat'], 'common', [3, 2, 2, 3],
    [[1, 'leech-life'], [1, 'supersonic'], [4, 'bite'], [7, 'wing-attack'], [10, 'confuse-ray']], ['inner-focus', 'snipe']],
  [42, 'golbat', 'Golbat', ['poison', 'flying'], [75, 80, 70, 75, 90], 'stage1', null, [], 'common', [3, 2, 2, 3],
    [[14, 'poison-fang'], [19, 'air-slash'], [25, 'leech-life-plus'], [31, 'cross-poison']], ['inner-focus', 'snipe']],

  [50, 'diglett', 'Diglett', ['ground'], [10, 55, 25, 45, 95], 'basic', 12, ['dugtrio'], 'common', [1, 3, 1, 4],
    [[1, 'scratch'], [1, 'sand-attack'], [4, 'mud-slap'], [7, 'magnitude'], [10, 'dig']], ['sand-veil', 'hustle']],
  [51, 'dugtrio', 'Dugtrio', ['ground'], [35, 80, 50, 70, 120], 'stage1', null, [], 'common', [1, 3, 1, 4],
    [[14, 'slash'], [20, 'earthquake'], [26, 'mud-bomb']], ['sand-veil', 'hustle']],

  [74, 'geodude', 'Geodude', ['rock', 'ground'], [40, 80, 100, 30, 20], 'basic', 12, ['graveler'], 'common', [3, 3, 4, 2],
    [[1, 'tackle'], [1, 'defense-curl'], [4, 'rock-throw'], [7, 'magnitude'], [10, 'rollout']], ['sturdy', 'rock-head']],
  [75, 'graveler', 'Graveler', ['rock', 'ground'], [55, 95, 115, 45, 35], 'stage1', 26, ['golem'], 'common', [3, 3, 4, 2],
    [[13, 'rock-blast'], [16, 'stealth-rock'], [20, 'bulldoze'], [23, 'earthquake']], ['sturdy', 'rock-head']],
  [76, 'golem', 'Golem', ['rock', 'ground'], [80, 110, 130, 55, 45], 'stage2', null, [], 'uncommon', [3, 3, 4, 2],
    [[27, 'rock-polish'], [31, 'body-press'], [36, 'stone-edge']], ['sturdy', 'tough-claws']],

  [95, 'onix', 'Onix', ['rock', 'ground'], [35, 45, 160, 30, 70], 'basic', null, [], 'uncommon', [3, 3, 5, 3],
    [[1, 'tackle'], [1, 'harden'], [4, 'bind'], [7, 'rock-throw'], [11, 'rock-slide-m'], [16, 'slam'], [22, 'iron-tail'], [28, 'stone-edge']], ['sturdy', 'rock-head']],

  [66, 'machop', 'Machop', ['fighting'], [70, 80, 50, 35, 35], 'basic', 12, ['machoke'], 'uncommon', [3, 3, 2, 1],
    [[1, 'low-kick'], [1, 'leer'], [4, 'karate-chop'], [7, 'focus-energy'], [10, 'seismic-toss']], ['guts', 'steadfast']],
  [67, 'machoke', 'Machoke', ['fighting'], [80, 100, 70, 50, 45], 'stage1', 26, ['machamp'], 'uncommon', [3, 3, 2, 1],
    [[14, 'vital-throw'], [18, 'bulk-up'], [22, 'submission'], [25, 'cross-chop']], ['guts', 'steadfast']],
  [68, 'machamp', 'Machamp', ['fighting'], [90, 130, 80, 65, 55], 'stage2', null, [], 'rare', [3, 3, 2, 1],
    [[27, 'dynamic-punch'], [33, 'close-combat']], ['guts', 'no-guard']],

  // ── river ─────────────────────────────────────────────────────────────────
  [129, 'magikarp', 'Magikarp', ['water'], [20, 10, 55, 20, 80], 'basic', 18, ['gyarados'], 'common', [1, 1, 2, 2],
    [[1, 'splash'], [1, 'tackle'], [12, 'flail']], ['swift-swim']],
  [130, 'gyarados', 'Gyarados', ['water', 'flying'], [95, 125, 79, 100, 81], 'stage1', null, [], 'rare', [3, 4, 2, 2],
    [[19, 'bite'], [22, 'dragon-rage'], [26, 'aqua-tail-g'], [30, 'crunch'], [36, 'hydro-pump']], ['intimidate', 'moxie']],

  [60, 'poliwag', 'Poliwag', ['water'], [40, 50, 40, 40, 90], 'basic', 12, ['poliwhirl'], 'common', [3, 2, 2, 3],
    [[1, 'bubble'], [1, 'hypnosis'], [4, 'water-gun'], [7, 'double-slap'], [10, 'body-slam']], ['water-absorb', 'swift-swim']],
  [61, 'poliwhirl', 'Poliwhirl', ['water'], [65, 65, 65, 50, 90], 'stage1', null, [], 'common', [3, 2, 2, 3],
    [[13, 'bubble-beam'], [17, 'belly-drum-p'], [21, 'mud-shot'], [24, 'brick-break']], ['water-absorb', 'damp']],

  [54, 'psyduck', 'Psyduck', ['water'], [50, 52, 48, 65, 55], 'basic', 12, ['golduck'], 'uncommon', [3, 2, 2, 3],
    [[1, 'water-gun'], [1, 'tail-whip'], [4, 'confusion'], [7, 'disable'], [10, 'water-pulse']], ['cloud-nine', 'damp']],
  [55, 'golduck', 'Golduck', ['water'], [80, 82, 78, 95, 85], 'stage1', null, [], 'uncommon', [3, 2, 2, 3],
    [[14, 'zen-headbutt'], [19, 'psych-up'], [25, 'psychic'], [31, 'hydro-pump']], ['cloud-nine', 'damp']],
];

const round = (n) => Math.round(n);
const species = S.map(([dex, id, name, types, [hp, atk, def, spc, spd], stage, evolveLevel, evolvesTo, rarity, g, learnset, abilities]) => {
  const entry = {
    id, dex, name, types, stage,
    // §4.1.5.1 — two combat stats derived from Gen I's four.
    baseStats: { hp, attack: Math.max(atk, spc), defense: round((def + spc) / 2), speed: spd },
    growth: { hp: g[0], attack: g[1], defense: g[2], speed: g[3] },
    learnset: learnset.map(([level, move]) => ({ level, move })),
    availableAbilities: abilities,
    evolvesTo,
    rarity,
  };
  if (evolveLevel !== null) entry.evolveLevel = evolveLevel;
  return entry;
});

// ── invariants the schema cannot express ──────────────────────────────────
const byId = new Map(species.map((s) => [s.id, s]));
const errors = [];
for (const s of species) {
  if (s.stage === 'basic' && s.learnset.filter((l) => l.level <= 1).length !== 2)
    errors.push(`${s.id}: a base form must know exactly 2 moves at level 1 (§6.9)`);
  if (s.evolveLevel !== undefined) {
    const late = s.learnset.filter((l) => l.level >= s.evolveLevel);
    if (late.length) errors.push(`${s.id}: learnset entries at or above evolveLevel ${s.evolveLevel} would be lost — ${late.map((l) => l.move).join(', ')}`);
    for (const next of s.evolvesTo) {
      const n = byId.get(next);
      if (n && n.learnset.some((l) => l.level < s.evolveLevel))
        errors.push(`${next}: learns below its pre-evolution's evolve level ${s.evolveLevel}`);
    }
  }
  for (const e of s.evolvesTo) if (!byId.has(e)) errors.push(`${s.id}: evolvesTo unknown species "${e}"`);
}
if (errors.length) { console.error('✗ species invariants failed:\n  ' + errors.join('\n  ')); process.exit(1); }

const out = JSON.stringify({
  _note: 'GENERATED by scripts/gen-species.mjs — edit the table there, not this file. Stats derive from Gen I per §4.1.5.1; learnsets per §6.9.',
  species,
}, null, 2) + '\n';

const PATH = 'src/content/data/species.json';
if (process.argv.includes('--check')) {
  const current = readFileSync(PATH, 'utf8');
  if (current !== out) { console.error('✗ species.json is stale — run `node scripts/gen-species.mjs`'); process.exit(1); }
  console.log(`✅ species.json matches the generator (${species.length} species)`);
} else {
  writeFileSync(PATH, out);
  console.log(`wrote ${species.length} species → ${PATH}`);
}
