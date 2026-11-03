#!/usr/bin/env node
// v0.9.91 (§3.6, §6.9) — the Gen II–IV moves the progressive learnsets need: the elemental fangs and punches of each
// stage, the Ghost, Dragon, Bug and Poison moves Gen I lacked, and the stage moves that sharpen a track (Scary Face, Dragon
// Dance, Rock Polish). Only moves the sim already expresses: damage, a status or stage rider, drain, multi-hit, Cleave, a
// low-HP bonus. Power is the series' cut into the §6.3.6.4 bands (1 AP to 50, 2 AP to 80, 3 AP above). Writes the rows
// into moves.json, their generation into later-moves.json, and what each illustration shows into move-art.json.
// Idempotent: a move already there is left alone. Usage: node scripts/v0991-moves.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const path = (f) => resolve(ROOT, f);
const read = (f) => JSON.parse(readFileSync(path(f), 'utf8'));

const st = (status, chance) => ({ kind: 'status', status, chance });
const stage = (target, stat, stages) => ({ kind: 'stage', target, stat, stages });

// [id, name, type, gen, seriesPower, range, ap, power, effects, extra, art]
const ROWS = [
  ['dragon-claw', 'Dragon Claw', 'dragon', 3, 80, 'melee', 2, 75, [], {}, 'three glowing violet claw slashes tearing through the air'],
  ['dragon-pulse', 'Dragon Pulse', 'dragon', 4, 90, 'ranged', 3, 90, [], {}, 'a roaring shockwave beam of indigo dragon energy'],
  ['twister', 'Twister', 'dragon', 2, 40, 'ranged', 1, 45, [], {}, 'a small spinning violet tornado lifting leaves'],
  ['dragon-breath', 'Dragon Breath', 'dragon', 3, 60, 'ranged', 2, 65, [st('paralysis', 0.3)], {}, 'a gust of glowing blue-violet breath with sparks in it'],
  ['shadow-ball', 'Shadow Ball', 'ghost', 2, 80, 'ranged', 2, 80, [], {}, 'a dark purple orb of swirling shadow with a pale glow'],
  ['shadow-claw', 'Shadow Claw', 'ghost', 4, 70, 'melee', 2, 70, [], {}, 'a huge shadowy claw raking down with a ghostly glow'],
  ['shadow-punch', 'Shadow Punch', 'ghost', 3, 60, 'melee', 2, 60, [], {}, 'a shadowy fist bursting out of a dark portal'],
  ['shadow-sneak', 'Shadow Sneak', 'ghost', 4, 40, 'melee', 1, 40, [], {}, 'a long creeping shadow stretching across the ground'],
  ['astonish', 'Astonish', 'ghost', 3, 30, 'melee', 1, 40, [], {}, 'a sudden ghostly burst with startled exclamation sparks'],
  ['bullet-seed', 'Bullet Seed', 'grass', 3, 75, 'ranged', 2, 75, [{ kind: 'multi-hit', hits: 3 }], {}, 'a rapid volley of three hard green seeds'],
  ['seed-bomb', 'Seed Bomb', 'grass', 4, 80, 'ranged', 2, 80, [], {}, 'a big hard seed bursting on impact in a green explosion'],
  ['leaf-blade', 'Leaf Blade', 'grass', 3, 90, 'melee', 3, 90, [], {}, 'a long sharp leaf shaped like a sword with a bright edge'],
  ['energy-ball', 'Energy Ball', 'grass', 4, 80, 'ranged', 2, 80, [], {}, 'a glowing green orb of nature energy'],
  ['giga-drain', 'Giga Drain', 'grass', 2, 60, 'ranged', 2, 65, [{ kind: 'drain', percentOfDamage: 0.5 }], {}, 'green life orbs flowing along a glowing stream'],
  ['power-whip', 'Power Whip', 'grass', 4, 120, 'melee', 3, 100, [], {}, 'a thick green vine whipping in a wide arc'],
  ['mach-punch', 'Mach Punch', 'fighting', 2, 40, 'melee', 1, 40, [], {}, 'a blurred fist with speed lines'],
  ['drain-punch', 'Drain Punch', 'fighting', 4, 60, 'melee', 2, 65, [{ kind: 'drain', percentOfDamage: 0.5 }], {}, 'a glowing fist trailing green life orbs'],
  ['brick-break', 'Brick Break', 'fighting', 3, 75, 'melee', 2, 75, [], {}, 'a karate chop splitting a stack of bricks'],
  ['cross-chop', 'Cross Chop', 'fighting', 2, 100, 'melee', 3, 95, [], {}, 'two forearms crossing in an X with an impact flash'],
  ['dynamic-punch', 'Dynamic Punch', 'fighting', 2, 100, 'melee', 3, 90, [st('confusion', 0.5)], {}, 'a fist exploding in a big orange burst'],
  ['vital-throw', 'Vital Throw', 'fighting', 2, 70, 'melee', 2, 70, [], {}, 'a swirling throw arc with a dust cloud'],
  ['vacuum-wave', 'Vacuum Wave', 'fighting', 4, 40, 'ranged', 1, 45, [], {}, 'a ring-shaped wave of compressed air'],
  ['aura-sphere', 'Aura Sphere', 'fighting', 4, 90, 'ranged', 3, 90, [], {}, 'a blue sphere of aura energy with a bright core'],
  ['reversal', 'Reversal', 'fighting', 2, 0, 'melee', 1, 45, [{ kind: 'power-bonus', when: 'self-below', below: 0.34, multiplier: 2.5 }], {}, 'a desperate counter-blow with a red flash'],
  ['flail', 'Flail', 'normal', 2, 0, 'melee', 1, 40, [{ kind: 'power-bonus', when: 'self-below', below: 0.34, multiplier: 2.5 }], {}, 'wild flailing motion lines with small impact stars'],
  ['double-hit', 'Double Hit', 'normal', 4, 70, 'melee', 2, 70, [{ kind: 'multi-hit', hits: 2 }], {}, 'two quick tail strikes with twin impact stars'],
  ['crush-claw', 'Crush Claw', 'normal', 3, 75, 'melee', 2, 70, [stage('foe', 'defense', -1)], {}, 'a heavy claw cracking a stone surface'],
  ['scary-face', 'Scary Face', 'normal', 2, 0, 'ranged', 1, 0, [stage('foe', 'speed', -2)], { role: 'utility' }, 'a menacing pair of glowing eyes in the dark'],
  // Charm is Normal in Gens II–V (Fairy only from Gen VI, which the game never imports): the track Growl's −1 grows into.
  ['charm', 'Charm', 'normal', 2, 0, 'ranged', 1, 0, [stage('foe', 'attack', -2)], { role: 'utility' }, 'a cute sparkling wink with floating pink-white hearts'],
  ['tickle', 'Tickle', 'normal', 3, 0, 'ranged', 1, 0, [stage('foe', 'attack', -1), stage('foe', 'defense', -1)], { role: 'utility' }, 'a soft feather tickling with little laugh marks'],
  ['aqua-jet', 'Aqua Jet', 'water', 4, 40, 'melee', 1, 40, [], {}, 'a fast streak of water jetting forward'],
  ['aqua-tail', 'Aqua Tail', 'water', 4, 90, 'melee', 3, 90, [], {}, 'a tail swinging through a crashing wave'],
  ['water-pulse', 'Water Pulse', 'water', 3, 60, 'ranged', 2, 65, [st('confusion', 0.2)], {}, 'rings of pulsing water spreading out'],
  ['ice-shard', 'Ice Shard', 'ice', 4, 40, 'ranged', 1, 45, [], {}, 'a few sharp ice shards flying fast'],
  ['ice-fang', 'Ice Fang', 'ice', 4, 65, 'melee', 2, 65, [st('freeze', 0.1)], {}, 'frost-covered fangs biting with ice crystals'],
  ['powder-snow', 'Powder Snow', 'ice', 2, 40, 'ranged', 1, 45, [st('freeze', 0.1)], {}, 'a puff of powdery snow blowing'],
  ['fire-fang', 'Fire Fang', 'fire', 4, 65, 'melee', 2, 65, [st('burn', 0.1)], {}, 'flaming fangs biting with sparks'],
  ['flame-wheel', 'Flame Wheel', 'fire', 2, 60, 'melee', 2, 60, [st('burn', 0.1)], {}, 'a rolling wheel of fire'],
  ['lava-plume', 'Lava Plume', 'fire', 4, 80, 'ranged', 2, 70, [st('burn', 0.3)], { targeting: 'cleave' }, 'a wide eruption of lava and red smoke'],
  ['heat-wave', 'Heat Wave', 'fire', 3, 100, 'ranged', 3, 80, [st('burn', 0.1)], { targeting: 'cleave' }, 'shimmering waves of scorching hot air'],
  ['will-o-wisp', 'Will-O-Wisp', 'fire', 3, 0, 'ranged', 1, 0, [st('burn', 1)], { role: 'utility' }, 'three floating blue-white flames'],
  ['thunder-fang', 'Thunder Fang', 'electric', 4, 65, 'melee', 2, 65, [st('paralysis', 0.1)], {}, 'electrified fangs biting with yellow sparks'],
  ['spark', 'Spark', 'electric', 2, 65, 'melee', 2, 65, [st('paralysis', 0.3)], {}, 'a charged body tackle crackling with sparks'],
  ['discharge', 'Discharge', 'electric', 4, 80, 'ranged', 2, 70, [st('paralysis', 0.3)], { targeting: 'cleave' }, 'electric bolts bursting out in every direction'],
  ['zap-cannon', 'Zap Cannon', 'electric', 2, 120, 'ranged', 3, 90, [st('paralysis', 0.5)], {}, 'a big crackling electric cannonball'],
  ['poison-jab', 'Poison Jab', 'poison', 4, 80, 'melee', 2, 75, [st('poison', 0.3)], {}, 'a jabbing purple stinger dripping venom'],
  ['poison-fang', 'Poison Fang', 'poison', 3, 50, 'melee', 1, 50, [st('poison', 0.3)], {}, 'purple fangs dripping toxic venom'],
  ['cross-poison', 'Cross Poison', 'poison', 4, 70, 'melee', 2, 70, [st('poison', 0.1)], {}, 'two crossing purple poison slashes'],
  ['sludge-bomb', 'Sludge Bomb', 'poison', 2, 90, 'ranged', 3, 90, [st('poison', 0.3)], {}, 'a big glob of purple sludge splattering'],
  ['gunk-shot', 'Gunk Shot', 'poison', 4, 120, 'ranged', 3, 100, [st('poison', 0.3)], {}, 'a heavy blast of toxic garbage sludge'],
  ['earth-power', 'Earth Power', 'ground', 4, 90, 'ranged', 3, 90, [], {}, 'the ground erupting in a glowing ochre burst'],
  ['mud-shot', 'Mud Shot', 'ground', 3, 55, 'ranged', 1, 50, [stage('foe', 'speed', -1)], {}, 'a shot of thick brown mud'],
  ['mud-bomb', 'Mud Bomb', 'ground', 4, 65, 'ranged', 2, 65, [], {}, 'a round ball of mud bursting on impact'],
  ['aerial-ace', 'Aerial Ace', 'flying', 3, 60, 'melee', 2, 60, [], {}, 'a swift white slash streak through the sky'],
  ['air-slash', 'Air Slash', 'flying', 4, 75, 'ranged', 2, 75, [], {}, 'a sharp blade of air flying through the sky'],
  ['air-cutter', 'Air Cutter', 'flying', 3, 55, 'ranged', 2, 65, [], { targeting: 'cleave' }, 'several razor-like crescents of wind'],
  ['feather-dance', 'Feather Dance', 'flying', 3, 0, 'ranged', 1, 0, [stage('foe', 'attack', -2)], { role: 'utility' }, 'a flurry of soft white feathers drifting down'],
  ['zen-headbutt', 'Zen Headbutt', 'psychic', 4, 80, 'melee', 2, 75, [], {}, 'a glowing pink headbutt with psychic rings'],
  ['psycho-cut', 'Psycho Cut', 'psychic', 4, 70, 'melee', 2, 70, [], {}, 'a crescent blade of pink psychic energy'],
  ['x-scissor', 'X-Scissor', 'bug', 4, 80, 'melee', 2, 75, [], {}, 'two crossing green slashes forming an X'],
  ['bug-buzz', 'Bug Buzz', 'bug', 4, 90, 'ranged', 3, 90, [], {}, 'vibrating green sound waves from buzzing wings'],
  ['signal-beam', 'Signal Beam', 'bug', 3, 75, 'ranged', 2, 75, [st('confusion', 0.1)], {}, 'a flickering multicoloured beam of light'],
  ['megahorn', 'Megahorn', 'bug', 2, 120, 'melee', 3, 100, [], {}, 'a huge horn charging with a burst of force'],
  ['silver-wind', 'Silver Wind', 'bug', 3, 60, 'ranged', 2, 65, [], {}, 'a glittering silver gust of scales'],
  ['fury-cutter', 'Fury Cutter', 'bug', 2, 40, 'melee', 1, 40, [], {}, 'a quick green scythe slash'],
  ['ancient-power', 'Ancient Power', 'rock', 2, 60, 'ranged', 2, 65, [], {}, 'ancient glowing rocks rising and flying'],
  ['stone-edge', 'Stone Edge', 'rock', 4, 100, 'ranged', 3, 100, [], {}, 'sharp stone spires erupting from the ground'],
  ['rock-blast', 'Rock Blast', 'rock', 3, 75, 'ranged', 2, 75, [{ kind: 'multi-hit', hits: 3 }], {}, 'three round boulders hurled in a row'],
  ['power-gem', 'Power Gem', 'rock', 4, 70, 'ranged', 2, 70, [], {}, 'a beam of light refracted through a shining gem'],
  ['rock-tomb', 'Rock Tomb', 'rock', 3, 50, 'ranged', 1, 50, [stage('foe', 'speed', -1)], {}, 'boulders falling and piling into a rocky tomb'],
  ['rock-polish', 'Rock Polish', 'rock', 4, 0, 'ranged', 0, 0, [stage('self', 'speed', 2)], { role: 'utility' }, 'a gleaming polished stone surface with sparkles'],
  ['metal-sound', 'Metal Sound', 'steel', 3, 0, 'ranged', 1, 0, [stage('foe', 'defense', -2)], { role: 'utility' }, 'harsh grating sound waves from scraping metal'],
  ['dragon-dance', 'Dragon Dance', 'dragon', 3, 0, 'ranged', 1, 0, [stage('self', 'attack', 1), stage('self', 'speed', 1)], { role: 'utility' }, 'a swirling mystical violet aura dance'],
  ['nasty-plot', 'Nasty Plot', 'dark', 4, 0, 'ranged', 1, 0, [stage('self', 'attack', 2)], { role: 'utility' }, 'a scheming dark thought bubble with a sly glint'],
  ['payback', 'Payback', 'dark', 4, 50, 'melee', 1, 50, [], {}, 'a dark counter-strike with a purple flash'],
  ['sucker-punch', 'Sucker Punch', 'dark', 4, 80, 'melee', 2, 70, [], {}, 'a sneaky shadowy jab from below'],
];

const movesFile = read('src/content/data/moves.json');
const laterFile = read('src/content/data/later-moves.json');
const art = read('docs/art/prompts/move-art.json');
const have = new Set(movesFile.moves.map((m) => m.id));
let added = 0;
for (const [id, name, type, gen, seriesPower, range, apCost, power, effects, extra, prompt] of ROWS) {
  if (!art[id]) art[id] = prompt;
  if (!laterFile.moves.some((m) => m.id === id)) laterFile.moves.push({ id, name, type, power: seriesPower, gen });
  if (have.has(id)) continue;
  movesFile.moves.push({ id, name, type, role: extra.role ?? 'offensive', range, modifier: 'none', apCost, power, ...(extra.targeting ? { targeting: extra.targeting } : {}), effects });
  added++;
}
writeFileSync(path('src/content/data/moves.json'), JSON.stringify(movesFile, null, 2) + '\n');
writeFileSync(path('src/content/data/later-moves.json'), JSON.stringify(laterFile, null, 2) + '\n');
writeFileSync(path('docs/art/prompts/move-art.json'), JSON.stringify(art, null, 2) + '\n');
console.log(`${added} moves added (${ROWS.length} in the table)`);
export { ROWS };
