#!/usr/bin/env node
// §6.4.1 / §7.5 — the TM set (v0.9.10, the user's call: "many TMs"). Gen I's own fifty, less the three moves the game
// does not have (Mimic, Bide, Substitute) and the three numbers the first TMs already took (TM04 Flamethrower, TM05
// Surf, TM07 Earthquake keep their ids: saves name them). Compatibility is a rule per TM, not a hand list per species,
// so a new species is covered the day it ships: the move's type among the species' types, a family that is the
// move's own (Chansey and Soft-Boiled), the universal ones every trainable species takes, Hyper Beam for final forms,
// and Mew for all. Writes src/content/data/tms.json; the catalogue (docs/design/catalogs/tms.md) states the rules.
// Usage: node scripts/gen-tms.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const species = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/species.json'), 'utf8'));
const S = species.species ?? species;
const movesJson = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/moves.json'), 'utf8'));
const MOVES = new Map((movesJson.moves ?? movesJson).map((m) => [m.id, m]));
const tmsJson = JSON.parse(readFileSync(resolve(ROOT, 'src/content/data/tms.json'), 'utf8'));
const KEEP = tmsJson.tms.filter((t) => ['tm04-flamethrower', 'tm05-surf', 'tm07-earthquake'].includes(t.id));

/** Gen I: these learn no TM at all. */
const NO_TM = new Set(['caterpie', 'metapod', 'weedle', 'kakuna', 'magikarp', 'ditto']);
const lineOf = (id) => {
  let base = id;
  for (;;) {
    const parent = S.find((s) => s.evolvesTo.includes(base));
    if (!parent) return base;
    base = parent.id;
  }
};
const inLines = (...bases) => (s) => bases.includes(lineOf(s.id));
const hasType = (...types) => (s) => s.types.some((t) => types.includes(t));
const final = (s) => s.evolvesTo.length === 0;
const any = (...preds) => (s) => preds.some((p) => p(s));
const not = (pred) => (s) => !pred(s);
const all = () => true;

/** Pokémon that stand on two legs and throw a punch: the Mega Punch / Counter crowd. */
const BIPEDS = inLines('charmander', 'squirtle', 'nidoran-f', 'nidoran-m', 'clefairy', 'jigglypuff', 'mankey', 'poliwag', 'abra', 'machop', 'geodude', 'drowzee', 'cubone', 'hitmonlee', 'hitmonchan', 'lickitung', 'kangaskhan', 'jynx', 'electabuzz', 'magmar', 'mr-mime', 'snorlax', 'mewtwo', 'psyduck', 'sandshrew', 'rhyhorn', 'gastly', 'slowpoke');

// [number, move, rule]
const TMS = [
  [1, 'mega-punch', BIPEDS],
  [2, 'razor-wind', hasType('flying')],
  [3, 'swords-dance', any(inLines('scyther', 'pinsir', 'farfetchd', 'sandshrew', 'paras', 'krabby', 'kabuto', 'oddish', 'bellsprout', 'bulbasaur', 'cubone', 'charmander'))],
  [6, 'toxic', all],
  [8, 'body-slam', not(hasType('bug', 'ghost'))],
  [9, 'take-down', all],
  [10, 'double-edge', all],
  [11, 'bubble-beam', hasType('water')],
  [12, 'water-gun', hasType('water')],
  [13, 'ice-beam', any(hasType('water', 'ice'), inLines('nidoran-f', 'nidoran-m', 'clefairy', 'jigglypuff', 'snorlax', 'lickitung', 'kangaskhan', 'chansey', 'porygon', 'mewtwo'))],
  [14, 'blizzard', any(hasType('water', 'ice'), inLines('nidoran-f', 'nidoran-m', 'snorlax', 'mewtwo'))],
  [15, 'hyper-beam', final],
  [16, 'pay-day', inLines('meowth')],
  [17, 'submission', any(hasType('fighting'), BIPEDS)],
  [18, 'counter', any(hasType('fighting'), BIPEDS)],
  [19, 'seismic-toss', any(hasType('fighting'), BIPEDS)],
  [20, 'rage', all],
  [21, 'mega-drain', hasType('grass')],
  [22, 'solar-beam', any(hasType('grass'), inLines('charmander', 'tauros'))],
  [23, 'dragon-rage', any(hasType('dragon'), inLines('magikarp', 'charmander'))],
  [24, 'thunderbolt', any(hasType('electric'), inLines('nidoran-f', 'nidoran-m', 'clefairy', 'jigglypuff', 'chansey', 'porygon', 'lapras', 'gyarados', 'mewtwo', 'dratini', 'snorlax', 'kangaskhan', 'tauros'))],
  [25, 'thunder', any(hasType('electric'), inLines('nidoran-f', 'nidoran-m', 'clefairy', 'chansey', 'lapras', 'gyarados', 'mewtwo', 'dratini', 'kangaskhan'))],
  [27, 'fissure', hasType('ground', 'rock')],
  [28, 'dig', any(hasType('ground'), inLines('sandshrew', 'diglett', 'nidoran-f', 'nidoran-m', 'meowth', 'rattata', 'charmander', 'squirtle', 'bulbasaur', 'paras', 'kabuto', 'omanyte'))],
  [29, 'psychic', any(hasType('psychic'), inLines('gastly', 'clefairy', 'jigglypuff', 'psyduck', 'chansey', 'porygon', 'lapras', 'mewtwo', 'venonat', 'exeggcute'))],
  [30, 'teleport', hasType('psychic')],
  [32, 'double-team', all],
  [33, 'reflect', any(hasType('psychic'), inLines('clefairy', 'jigglypuff', 'chansey', 'porygon', 'exeggcute', 'staryu', 'squirtle', 'lapras'))],
  [35, 'metronome', inLines('clefairy', 'jigglypuff', 'chansey', 'mr-mime', 'mewtwo', 'machop')],
  [36, 'self-destruct', inLines('geodude', 'onix', 'voltorb', 'koffing', 'gastly', 'snorlax', 'exeggcute', 'grimer', 'shellder')],
  [37, 'egg-bomb', inLines('exeggcute', 'chansey', 'snorlax', 'lickitung')],
  [38, 'fire-blast', any(hasType('fire'), inLines('nidoran-f', 'nidoran-m', 'snorlax', 'kangaskhan', 'tauros', 'gyarados', 'dratini', 'mewtwo'))],
  [39, 'swift', not(hasType('bug', 'rock', 'ground'))],
  [40, 'skull-bash', any(hasType('water'), BIPEDS, inLines('rattata', 'tauros', 'rhyhorn', 'onix', 'lapras', 'dratini'))],
  [41, 'soft-boiled', inLines('chansey')],
  [42, 'dream-eater', any(hasType('psychic', 'ghost'))],
  [43, 'sky-attack', hasType('flying')],
  [44, 'rest', all],
  [45, 'thunder-wave', any(hasType('electric'), inLines('clefairy', 'jigglypuff', 'chansey', 'porygon', 'mewtwo', 'dratini', 'mr-mime', 'kangaskhan', 'lickitung', 'snorlax'))],
  [46, 'psywave', any(hasType('psychic'), inLines('gastly', 'jynx'))],
  [47, 'explosion', inLines('geodude', 'onix', 'voltorb', 'koffing', 'gastly', 'snorlax', 'shellder', 'grimer')],
  [48, 'rock-slide', any(hasType('rock', 'ground'), inLines('machop', 'mankey', 'kangaskhan', 'snorlax', 'tauros', 'dratini', 'nidoran-f', 'nidoran-m', 'mewtwo'))],
  [49, 'tri-attack', inLines('porygon', 'doduo', 'mewtwo')],
];

/** The three the game shipped first keep their ids and take rules too (they had hand lists of 3, 9 and 6). */
const KEEP_RULE = {
  'tm04-flamethrower': any(hasType('fire'), inLines('nidoran-f', 'nidoran-m', 'snorlax', 'kangaskhan', 'tauros', 'gyarados', 'dratini', 'mewtwo')),
  'tm05-surf': any(hasType('water'), inLines('nidoran-f', 'nidoran-m', 'slowpoke', 'kangaskhan', 'tauros', 'dratini', 'lapras', 'snorlax')),
  'tm07-earthquake': any(hasType('ground', 'rock'), inLines('nidoran-f', 'nidoran-m', 'machop', 'snorlax', 'kangaskhan', 'tauros', 'mewtwo', 'dratini', 'charmander', 'squirtle', 'gyarados')),
};
const tms = KEEP.map((t) => ({ ...t, compatibleSpecies: S.filter((s) => !NO_TM.has(s.id) && (s.id === 'mew' || KEEP_RULE[t.id](s))).map((s) => s.id) }));
for (const [n, move, rule] of TMS) {
  const m = MOVES.get(move);
  if (!m) throw new Error(`no move ${move}`);
  const compatible = S.filter((s) => !NO_TM.has(s.id) && (s.id === 'mew' || rule(s))).map((s) => s.id);
  tms.push({
    id: `tm${String(n).padStart(2, '0')}-${move}`,
    name: `TM${String(n).padStart(2, '0')} ${m.name}`,
    move,
    compatibleSpecies: compatible,
    description: `Teaches ${m.name}: a ${m.type} ${m.power > 0 ? `${m.range} hit of ${m.power} power` : 'technique'} for ${m.apCost} AP.`,
  });
}
tms.sort((a, b) => a.id.localeCompare(b.id));
tmsJson._note = 'TM catalog (§6.4.1, §7.5, docs/design/catalogs/tms.md). Generated by scripts/gen-tms.mjs (v0.9.10): Gen I\'s set, compatibility by rule. A TM is applied from the Map View and permanently adds its move to a compatible Pokémon\'s Learned Move Pool. Single use.';
tmsJson.tms = tms;
writeFileSync(resolve(ROOT, 'src/content/data/tms.json'), JSON.stringify(tmsJson, null, 2) + '\n');
console.log(`${tms.length} TMs`, tms.map((t) => `${t.id}(${t.compatibleSpecies.length})`).join(' '));
