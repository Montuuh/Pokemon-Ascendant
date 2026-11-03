#!/usr/bin/env node
// v0.9.90 (§6.2.4, §6.3.7, the user's call 2026-11-03) — real evolution levels, no squish. The old compression was a
// factor of 1.4 exactly (Lv 12 → 16 and Lv 26 → 36 are Gen I's starter levels), so every authored level in the content
// moves by L' = round(1 + 1.4 × (L − 1)) and every level *gap* by ×1.4; the stat growth comes down by the same factor
// (stats.ts), so a Pokémon at the same point of the run has the same stats it had. Then each species takes its Gen I
// evolution level and method: a level, a stone, a held item it levels up with (the trades), or Friendship (Umbreon).
// One-time: a sentinel (Region 1's band) refuses a second pass. Usage: node scripts/v0990-levels.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const rd = (f) => readFileSync(resolve(ROOT, f), 'utf8');
const wr = (f, s) => writeFileSync(resolve(ROOT, f), s);
const remap = (l) => Math.max(1, Math.round(1 + 1.4 * (l - 1)));
const gap = (g) => Math.round(g * 1.4);

function edit(file, pairs) {
  let s = rd(file);
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  for (const [old, neu] of pairs) {
    if (!s.includes(old)) throw new Error(`${file}: not found: ${old.slice(0, 80)}`);
    s = s.replace(old, neu);
  }
  wr(file, crlf ? s.replace(/\n/g, '\r\n') : s);
}

// ── Sentinel.
if (!rd('src/sim/run/region.ts').includes('WILD_LEVEL_BAND: [number, number] = [5, 13];')) {
  console.log('already applied (Region 1 band is not [5, 13])');
  process.exit(0);
}

// ── Gen I evolution levels and methods (§6.3.7). `npc` is the level from which a trainer or the wild fields the evolved
// form of a line that does not evolve by level (§2.7.3): the series' own trainers, roughly.
const LEVEL = {
  bulbasaur: 16, ivysaur: 32, charmander: 16, charmeleon: 36, squirtle: 16, wartortle: 36, caterpie: 7, metapod: 10,
  weedle: 7, kakuna: 10, pidgey: 18, pidgeotto: 36, rattata: 20, spearow: 20, ekans: 22, sandshrew: 22, 'nidoran-f': 16,
  'nidoran-m': 16, zubat: 22, oddish: 21, paras: 24, venonat: 31, diglett: 26, meowth: 28, psyduck: 33, mankey: 28,
  poliwag: 25, abra: 16, machop: 28, bellsprout: 21, tentacool: 30, geodude: 25, ponyta: 40, slowpoke: 37, magnemite: 30,
  doduo: 31, seel: 34, grimer: 38, gastly: 25, drowzee: 26, krabby: 28, voltorb: 30, cubone: 28, koffing: 35, rhyhorn: 42,
  horsea: 32, goldeen: 33, magikarp: 20, omanyte: 40, kabuto: 40, dratini: 30, dragonair: 55,
};
const STONE = { pikachu: 26, nidorina: 36, nidorino: 36, clefairy: 36, vulpix: 32, jigglypuff: 36, gloom: 32, growlithe: 32, poliwhirl: 36, weepinbell: 32, shellder: 30, exeggcute: 32, staryu: 24, magneton: 40, eevee: 30 };
const HELD = { kadabra: ['twisted-spoon', 36], machoke: ['macho-brace', 40], graveler: ['hard-stone', 40], haunter: ['spell-tag', 40], scyther: ['metal-coat', 36], onix: ['metal-coat', 36] };

const spPath = 'src/content/data/species.json';
const spJson = JSON.parse(rd(spPath));
const S = spJson.species ?? spJson;
const byId = new Map(S.map((s) => [s.id, s]));
const parentOf = (id) => S.find((s) => s.evolvesTo.includes(id));
const changed = [];
for (const s of S) {
  if (!s.evolvesTo.length) continue;
  delete s.evolveBy;
  delete s.evolveItem;
  if (LEVEL[s.id] !== undefined) s.evolveLevel = LEVEL[s.id];
  else if (STONE[s.id] !== undefined) {
    s.evolveLevel = STONE[s.id];
    s.evolveBy = 'stone';
  } else if (HELD[s.id]) {
    s.evolveLevel = HELD[s.id][1];
    s.evolveBy = 'held-item';
    s.evolveItem = HELD[s.id][0];
  } else throw new Error(`no Gen I method for ${s.id}`);
  changed.push(s.id);
}
// Eevee's Umbreon is Friendship, its other three the stones (§6.3.9).
const eevee = byId.get('eevee');
for (const b of eevee.branches) if (b.id === 'eevee-dark') b.by = 'friendship';
// Learnsets: remapped, then held inside the stage — at or above the level it evolved into this form, under the one it
// leaves (the §6.9 clamp), in order.
for (const s of S) {
  if (!s.learnset?.length) continue;
  const floor = (() => {
    const p = parentOf(s.id);
    return p ? p.evolveLevel : 1;
  })();
  const ceil = s.evolvesTo.length ? s.evolveLevel - 1 : 100;
  let last = 0;
  s.learnset = s.learnset
    .map((l) => ({ ...l, level: l.level === 1 ? 1 : remap(l.level) }))
    .sort((a, b) => a.level - b.level)
    .map((l) => {
      const lv = l.level === 1 ? 1 : Math.min(ceil, Math.max(floor, l.level, last));
      last = lv;
      return { ...l, level: lv };
    });
}
wr(spPath, JSON.stringify(spJson, null, 2) + '\n');

// ── Every authored level in the run's content, and every gap between two levels.
const regionPath = 'src/sim/run/region.ts';
{
  let s = rd(regionPath);
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\blevel: (\d+)/g, (_, n) => `level: ${remap(Number(n))}`);
  wr(regionPath, crlf ? s.replace(/\n/g, '\r\n') : s);
}
edit(regionPath, [
  ['WILD_LEVEL_BAND: [number, number] = [5, 13];', 'WILD_LEVEL_BAND: [number, number] = [5, 18];'],
  ['wildBand: [14, 22]', `wildBand: [${remap(14)}, ${remap(22)}]`],
  ['wildBand: [24, 32]', `wildBand: [${remap(24)}, ${remap(32)}]`],
  ['export const PAD_LEVEL_GAP = { trainer: 3, elite: 3, gym: 2 } as const;', `export const PAD_LEVEL_GAP = { trainer: ${gap(3)}, elite: ${gap(3)}, gym: ${gap(2)} } as const;`],
  ['export const ELITE_LEVEL_PREMIUM = 2;', `export const ELITE_LEVEL_PREMIUM = ${gap(2)};`],
  ['export const GYM_LEVEL_PREMIUM = { other: 1, middle: -1, ace: 2 } as const;', `export const GYM_LEVEL_PREMIUM = { other: 1, middle: -1, ace: ${gap(2)} } as const;`],
  ['level: wildBandFor(layer, band)[1] + 3 }', `level: wildBandFor(layer, band)[1] + ${gap(3)} }`],
]);
{
  const p = 'src/sim/run/league.ts';
  let s = rd(p);
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\bover: (\d+)/g, (_, n) => `over: ${gap(Number(n))}`);
  wr(p, crlf ? s.replace(/\n/g, '\r\n') : s);
}
edit('src/sim/run/victoryRoad.ts', [
  ['  levelOver: 2,\n  gauntletOver: 4,', `  levelOver: ${gap(2)},\n  gauntletOver: ${gap(4)},`],
]);
edit('src/sim/run/legendaries.ts', [['  levelOver: 6,', `  levelOver: ${gap(6)},`]]);
edit('src/sim/run/trader.ts', [['  levelBonus: 2,', `  levelBonus: ${gap(2)},`]]);
edit('src/sim/run/safari.ts', [['  levelSpread: 2,', `  levelSpread: ${gap(2)},`]]);
edit('src/sim/run/groups.ts', [['export const COMPANION_LEVEL_GAP = 2;', `export const COMPANION_LEVEL_GAP = ${gap(2)};`]]);
// The Black Market's Rare Candy is priced by the level it gives: a level is worth less now.
edit('src/sim/run/blackMarket.ts', [['  candyPrice: 400,', '  candyPrice: 280,']]);
// The Evolution Catalyst's head start, in levels.
edit('src/content/data/relics.json', [
  ['"description": "Once per run, a Pokémon may evolve four levels early.",', '"description": "Once per run, a Pokémon may evolve six levels early.",'],
  ['        "levels": 4,', '        "levels": 6,'],
]);
// The fixtures: every combatant's level, so a fight keeps its shape.
{
  const p = 'src/content/data/scenarios.json';
  let s = rd(p);
  s = s.replace(/"level": (\d+)/g, (_, n) => `"level": ${remap(Number(n))}`);
  wr(p, s);
}
console.log(`levels remapped; ${changed.length} lines given their Gen I method`);
