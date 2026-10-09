#!/usr/bin/env node
// v0.9.11 — the move review (the user's call: "prefer too many moves to a Pokémon with bad ones"). Until now an evolved
// form learned nothing by level: its kit was its base's four moves rewritten by the branch payloads, five cards for
// life. Some paths ended with no move of the Pokémon's own type worth playing (a Charizard on Scratch and Ember, a
// Butterfree with no Bug or Flying attack, a Beedrill with one attack). Every form below now learns its line's
// signature moves as it levels — Gen I's own where the series gives one, a Gen I move that fits its type where it does
// not — so every path, whatever the branches, ends with a real attack of its type, three attacks at least and one
// that reaches from the bench. The payloads are untouched: the branches still choose, the learnset fills the gaps.
//
// Idempotent: a [level, move] already in a learnset is left alone. Run once: node scripts/v0911-learnsets.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILE = resolve(import.meta.dirname, '../src/content/data/species.json');

/** speciesId → [level, moveId][]. Levels sit inside the form's own stretch of the run (§6.2: basics to 11, a first
 *  evolution 12–25, a final 26 on; a single stage across the whole run). */
const LEARN = {
  // ── basics with a hole: a second attack of the type, or the only one they lacked
  dratini: [[6, 'dragon-rage']],
  eevee: [[10, 'swift']],
  exeggcute: [[10, 'confusion']],
  goldeen: [[6, 'water-gun']],
  kabuto: [[6, 'water-gun'], [10, 'rock-throw']],
  sandshrew: [[10, 'dig']],
  venonat: [[6, 'poison-sting']],
  shellder: [[10, 'water-gun']],

  // ── Kanto's starters
  ivysaur: [[20, 'sludge']],
  venusaur: [[30, 'razor-leaf'], [34, 'petal-dance'], [38, 'body-slam']],
  charmeleon: [[16, 'fire-spin'], [22, 'slash']],
  charizard: [[28, 'wing-attack'], [33, 'flamethrower'], [38, 'fly']],
  wartortle: [[18, 'bubble-beam'], [22, 'bite']],
  blastoise: [[28, 'surf'], [32, 'skull-bash'], [36, 'hydro-pump']],

  // ── bugs and birds
  butterfree: [[14, 'confusion'], [24, 'wing-attack'], [30, 'pin-missile']],
  beedrill: [[18, 'twineedle'], [30, 'pin-missile'], [34, 'sludge']],
  pidgeotto: [[16, 'wing-attack'], [20, 'swift']],
  pidgeot: [[30, 'fly'], [36, 'drill-peck']],
  raticate: [[18, 'hyper-fang'], [30, 'swift'], [36, 'double-edge']],
  fearow: [[18, 'drill-peck'], [24, 'swift'], [36, 'double-edge']],
  parasect: [[18, 'mega-drain'], [24, 'pin-missile'], [30, 'razor-leaf'], [36, 'solar-beam']],
  venomoth: [[16, 'psybeam'], [20, 'leech-life'], [26, 'sludge'], [32, 'pin-missile'], [38, 'psychic']],
  scyther: [[12, 'cut'], [28, 'pin-missile']],
  pinsir: [[12, 'slash'], [20, 'pin-missile'], [28, 'submission']],
  farfetchd: [[10, 'gust'], [22, 'wing-attack'], [28, 'slash'], [34, 'drill-peck']],
  dodrio: [[20, 'swift'], [26, 'drill-peck'], [32, 'tri-attack']],

  // ── poison, the Nidos and the bats
  arbok: [[20, 'sludge'], [26, 'dig'], [32, 'body-slam']],
  nidorina: [[16, 'bite'], [20, 'sludge']],
  nidoqueen: [[28, 'body-slam'], [32, 'earthquake'], [36, 'sludge']],
  nidorino: [[16, 'horn-attack'], [20, 'sludge'], [24, 'double-kick']],
  nidoking: [[28, 'thrash'], [32, 'earthquake'], [36, 'sludge']],
  golbat: [[16, 'wing-attack'], [20, 'swift'], [24, 'sludge'], [30, 'fly']],
  gloom: [[16, 'mega-drain'], [22, 'sludge']],
  vileplume: [[28, 'petal-dance'], [32, 'razor-leaf'], [36, 'sludge']],
  victreebel: [[28, 'razor-leaf'], [32, 'sludge'], [36, 'petal-dance']],
  tentacruel: [[16, 'bubble-beam'], [22, 'sludge'], [34, 'hydro-pump']],
  muk: [[16, 'sludge'], [34, 'thunderbolt']],
  weezing: [[16, 'smog-plus'], [28, 'thunderbolt'], [34, 'fire-blast']],
  haunter: [[16, 'night-shade'], [20, 'sludge']],
  gengar: [[28, 'night-shade'], [32, 'psychic']],

  // ── normal
  clefable: [[16, 'swift'], [22, 'body-slam'], [30, 'psychic'], [36, 'double-edge']],
  wigglytuff: [[16, 'swift'], [22, 'body-slam'], [30, 'double-edge']],
  persian: [[16, 'fury-swipes'], [20, 'slash'], [26, 'swift'], [32, 'body-slam']],
  lickitung: [[12, 'lick'], [20, 'body-slam'], [28, 'swift'], [34, 'earthquake']],
  chansey: [[12, 'body-slam'], [20, 'egg-bomb'], [28, 'seismic-toss'], [34, 'psychic']],
  kangaskhan: [[12, 'swift'], [20, 'body-slam'], [28, 'earthquake'], [34, 'dizzy-punch']],
  tauros: [[12, 'horn-attack'], [18, 'swift'], [20, 'body-slam'], [28, 'earthquake'], [34, 'thrash']],
  snorlax: [[20, 'earthquake'], [24, 'ice-beam'], [30, 'hyper-beam']],

  // ── electric and fire
  raichu: [[14, 'thunder-punch'], [20, 'thunderbolt'], [30, 'swift']],
  magneton: [[16, 'thunderbolt'], [22, 'swift']],
  electrode: [[16, 'thunderbolt'], [24, 'swift']],
  electabuzz: [[20, 'thunderbolt']],
  ninetales: [[16, 'fire-spin'], [22, 'flamethrower']],
  arcanine: [[16, 'take-down'], [22, 'fire-spin'], [30, 'flamethrower']],
  rapidash: [[16, 'stomp'], [20, 'fire-spin'], [26, 'flamethrower']],
  magmar: [[12, 'fire-spin'], [30, 'fire-blast']],

  // ── ground, rock and fighting
  sandslash: [[16, 'dig'], [22, 'slash'], [28, 'swift']],
  dugtrio: [[16, 'dig'], [22, 'slash'], [28, 'earthquake'], [32, 'rock-slide']],
  marowak: [[22, 'headbutt'], [28, 'earthquake'], [34, 'rock-slide']],
  golem: [[28, 'earthquake'], [32, 'rock-slide']],
  onix: [[20, 'dig'], [34, 'earthquake']],
  rhydon: [[16, 'rock-slide'], [22, 'stomp'], [28, 'dig']],
  primeape: [[16, 'seismic-toss'], [22, 'rock-slide'], [28, 'submission'], [34, 'thrash']],
  machoke: [[20, 'rock-throw'], [24, 'submission']],
  machamp: [[28, 'submission'], [32, 'rock-slide'], [36, 'earthquake']],
  hitmonchan: [[12, 'thunder-punch'], [20, 'mega-punch'], [28, 'submission']],
  aerodactyl: [[12, 'rock-throw'], [28, 'fly'], [34, 'hyper-beam']],
  omastar: [[16, 'bubble-beam'], [22, 'rock-slide'], [28, 'hydro-pump']],
  kabutops: [[16, 'slash'], [22, 'rock-slide'], [28, 'surf'], [34, 'hydro-pump']],

  // ── water and ice
  golduck: [[16, 'confusion'], [20, 'surf'], [30, 'hydro-pump']],
  poliwhirl: [[16, 'bubble-beam'], [22, 'body-slam']],
  poliwrath: [[28, 'submission'], [32, 'surf'], [36, 'hydro-pump']],
  slowbro: [[16, 'water-gun'], [20, 'surf'], [26, 'psychic'], [32, 'hydro-pump']],
  dewgong: [[16, 'aurora-beam'], [24, 'surf'], [30, 'blizzard']],
  cloyster: [[16, 'aurora-beam'], [22, 'clamp'], [28, 'ice-beam'], [34, 'surf']],
  kingler: [[16, 'waterfall'], [22, 'bubble-beam'], [28, 'stomp'], [34, 'surf']],
  seadra: [[16, 'bubble-beam'], [22, 'surf'], [30, 'hydro-pump']],
  seaking: [[16, 'waterfall'], [22, 'bubble-beam'], [28, 'surf']],
  starmie: [[16, 'swift'], [20, 'surf'], [26, 'psychic'], [32, 'bubble-beam-plus']],
  gyarados: [[20, 'bite'], [24, 'dragon-rage'], [28, 'surf'], [32, 'hydro-pump']],
  lapras: [[12, 'aurora-beam'], [20, 'surf'], [28, 'blizzard'], [34, 'hydro-pump']],
  vaporeon: [[16, 'bite'], [20, 'bubble-beam'], [26, 'surf'], [32, 'hydro-pump']],
  jynx: [[12, 'confusion'], [20, 'ice-beam'], [28, 'psychic']],

  // ── psychic and grass
  kadabra: [[16, 'psybeam'], [20, 'recover'], [22, 'swift'], [24, 'psychic']],
  alakazam: [[28, 'psybeam'], [32, 'psychic'], [36, 'seismic-toss']],
  hypno: [[16, 'psybeam'], [24, 'psychic'], [30, 'headbutt']],
  'mr-mime': [[12, 'psywave'], [20, 'psychic'], [28, 'seismic-toss']],
  exeggutor: [[16, 'confusion'], [20, 'razor-leaf'], [26, 'psychic'], [32, 'solar-beam']],
  tangela: [[12, 'vine-whip'], [20, 'mega-drain'], [28, 'slam'], [34, 'solar-beam']],

  // ── dragons
  dragonair: [[14, 'dragon-rage'], [18, 'slam'], [22, 'bubble-beam']],
  dragonite: [[28, 'dragon-rage'], [30, 'wing-attack'], [34, 'fly'], [38, 'hyper-beam']],
};

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const byId = new Map(data.species.map((s) => [s.id, s]));
const moves = new Set(JSON.parse(readFileSync(resolve(import.meta.dirname, '../src/content/data/moves.json'), 'utf8')).moves.map((m) => m.id));
let added = 0;
for (const [id, entries] of Object.entries(LEARN)) {
  const s = byId.get(id);
  if (!s) throw new Error(`no species ${id}`);
  for (const [level, move] of entries) {
    if (!moves.has(move)) throw new Error(`${id}: no move ${move}`);
    if (s.learnset.some((l) => l.move === move)) continue;
    s.learnset.push({ level, move });
    added++;
  }
  s.learnset.sort((a, b) => a.level - b.level);
}
writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${added} learnset entries added across ${Object.keys(LEARN).length} species`);

// A tutor or egg move the line now learns by level is replaced by another the Dojo can teach — a Gen I TM the
// species could take, or its Gen II egg move — so the Dojo still offers something new (§2.9.4: a tutor move is one
// nature would not give).
const SWAP = {
  tutor: {
    ivysaur: { sludge: 'body-slam' },
    butterfree: { 'wing-attack': 'psychic' },
    beedrill: { sludge: 'swords-dance' },
    golbat: { sludge: 'double-edge' },
    golduck: { surf: 'ice-beam' },
    machamp: { earthquake: 'strength' },
    farfetchd: { gust: 'fly', slash: 'razor-wind' },
    shellder: { 'water-gun': 'bubble-beam' },
    cloyster: { surf: 'blizzard' },
    haunter: { sludge: 'mega-punch' },
    onix: { dig: 'strength', earthquake: 'explosion' },
    weezing: { thunderbolt: 'thunder' },
    kangaskhan: { earthquake: 'thunderbolt' },
    seadra: { surf: 'blizzard' },
    seaking: { surf: 'blizzard' },
    starmie: { surf: 'ice-beam' },
    jynx: { psychic: 'mega-punch' },
    tauros: { earthquake: 'thunderbolt', 'body-slam': 'fire-blast' },
    gyarados: { surf: 'ice-beam' },
    lapras: { 'hydro-pump': 'psychic' },
    vaporeon: { surf: 'ice-beam', 'bubble-beam': 'blizzard' },
    kabuto: { 'rock-throw': 'bubble-beam' },
  },
  egg: {
    lickitung: { 'body-slam': 'double-edge' },
    scyther: { 'pin-missile': 'counter' },
    magmar: { 'fire-blast': 'mega-punch' },
    pinsir: { 'submission': 'fury-attack' },
    omanyte: { 'bubble-beam': 'haze' },
  },
};
const data2 = JSON.parse(readFileSync(FILE, 'utf8'));
const by2 = new Map(data2.species.map((s) => [s.id, s]));
let swapped = 0;
for (const [kind, table] of Object.entries(SWAP)) {
  for (const [id, pairs] of Object.entries(table)) {
    const s = by2.get(id);
    const key = kind === 'tutor' ? 'tutorMoves' : 'eggMoves';
    for (const [from, to] of Object.entries(pairs)) {
      if (!moves.has(to)) throw new Error(`${id}: no move ${to}`);
      const i = s[key].indexOf(from);
      if (i < 0) continue;
      if (s[key].includes(to) || s.learnset.some((l) => l.move === to)) throw new Error(`${id}: ${to} already offered`);
      s[key][i] = to;
      swapped++;
    }
  }
}
writeFileSync(FILE, `${JSON.stringify(data2, null, 2)}\n`);
console.log(`${swapped} tutor and egg moves swapped`);
