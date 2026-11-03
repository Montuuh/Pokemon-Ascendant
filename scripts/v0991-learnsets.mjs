#!/usr/bin/env node
// v0.9.91 (§6.9, §6.9.1) — progressive learnsets: every stage learns its own moves by level, cut from the series' Gen IV
// learnsets (scripts/data/learnsets-gen4.json, `npm run`-free: node scripts/fetch-learnsets.mjs) inside the stage's own
// level window and merged with the entries the stage already had, and a learned move can **replace** an older one in
// the same slot — the track (`replaces`): a stronger attack of the same range and of its type (or over a Normal one),
// at most one AP band dearer; a stronger foe debuff or self brace over a weaker one. A line whose final form would still
// carry a level-1 filler (Tackle, Scratch, Growl, Leer, Tail Whip, Harden…) gets the upgrade the filler's role calls for.
// Idempotent from species.json's learnsets as they stand (a `replaces` already written is recomputed). Usage:
//   node scripts/v0991-learnsets.mjs            write species.json
//   node scripts/v0991-learnsets.mjs --check    print what would change, write nothing
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const check = process.argv.includes('--check');
const spJson = read('src/content/data/species.json');
const S = spJson.species;
const MOVES = new Map(read('src/content/data/moves.json').moves.map((m) => [m.id, m]));
const GEN4 = read('scripts/data/learnsets-gen4.json').species;
/** The learnsets as v0.9.90 shipped them: the authored base, so a second run writes the same thing. */
const AUTHORED = read('scripts/data/learnsets-v0990.json').species;
const byId = new Map(S.map((s) => [s.id, s]));
const parentOf = new Map(S.flatMap((s) => s.evolvesTo.map((t) => [t, s.id])));
const MASTERY = read('src/content/data/mastery.json').lines;
const baseOf = (id) => { let b = id; while (parentOf.has(b)) b = parentOf.get(b); return b; };
/**
 * What a line already gets another way, and so never by level: its Mastery tiers (the fifth slot), its branches' payloads
 * (an evolution's gift), its tutor and egg lists (the Dojo's) — the content tests hold each apart.
 */
const RESERVED = new Map();
for (const s of S) {
  const set = RESERVED.get(baseOf(s.id)) ?? new Set(MASTERY[baseOf(s.id)] ?? []);
  for (const b of s.branches ?? []) { for (const a of b.adds ?? []) set.add(a); for (const u of b.upgrades ?? []) set.add(u.to); }
  for (const t of s.tutorMoves ?? []) set.add(t);
  for (const e of s.eggMoves ?? []) set.add(e);
  RESERVED.set(baseOf(s.id), set);
}
const reserved = (id, move) => RESERVED.get(baseOf(id)).has(move);

/** §6.9.1 — the level-1 fillers no final form may keep (the content test's list). */
const FILLER = new Set(['tackle', 'scratch', 'pound', 'peck', 'wrap', 'growl', 'leer', 'tail-whip', 'sand-attack', 'string-shot', 'harden', 'defense-curl', 'withdraw']);
/** The guarantee: what a filler's role grows into when the line's own moves never replace it. */
const MELEE_BY_TYPE = { fire: 'fire-fang', water: 'waterfall', ice: 'ice-fang', electric: 'thunder-fang', grass: 'seed-bomb', fighting: 'brick-break', poison: 'poison-jab', ground: 'mud-bomb', flying: 'aerial-ace', psychic: 'zen-headbutt', bug: 'x-scissor', rock: 'rock-slide', ghost: 'shadow-claw', dragon: 'dragon-claw', dark: 'crunch', steel: 'iron-head', normal: 'headbutt' };
/** The upgrades a filler's role grows into, best first; the line takes the first it has not reserved or used. */
const FILLER_UPGRADES = (filler, types) => {
  const m = MOVES.get(filler);
  if (filler === 'peck') return ['wing-attack', 'aerial-ace', 'drill-peck'];
  // A melee filler grows into a melee hit of the line's own type, or a Normal one.
  if (m.power > 0) return [...types.map((t) => MELEE_BY_TYPE[t]).filter((id) => id && MOVES.get(id).range === m.range), 'headbutt', 'take-down', 'strength'];
  if (m.effects.some((e) => e.kind === 'guard' || (e.kind === 'stage' && e.target === 'self'))) return ['iron-defense', 'barrier', 'acid-armor'];
  const stat = m.effects.find((e) => e.kind === 'stage')?.stat;
  // Growl's −1 Attack grows by the line's look: a bird's Feather Dance, a fierce line's Scary Face, the rest Charm.
  const fierce = types.some((t) => ['fire', 'dragon', 'dark', 'ground', 'rock', 'fighting', 'steel', 'poison', 'bug', 'ghost'].includes(t));
  return stat === 'speed' ? ['scary-face'] : stat === 'defense' ? ['screech', 'tickle', 'metal-sound'] : types.includes('flying') ? ['feather-dance', 'charm'] : fierce ? ['scary-face', 'charm'] : ['charm', 'tickle'];
};

const band = (m) => m.apCost;
/** MOVE_CAP.learnset (combat/kit.ts): a stage's own entries at most. */
const CAP = 12;
const stageSum = (m, target) => m.effects.filter((e) => e.kind === 'stage' && e.target === target).reduce((a, e) => a + Math.abs(e.stages), 0) + (m.effects.some((e) => e.kind === 'guard') ? 1 : 0);
const stats = (m, target) => [...new Set(m.effects.filter((e) => e.kind === 'stage' && e.target === target).map((e) => e.stat).concat(m.effects.some((e) => e.kind === 'guard') && target === 'self' ? ['defense'] : []))];
const role = (m) => (m.power > 0 ? 'attack' : stageSum(m, 'foe') > 0 && !m.effects.some((e) => e.kind === 'status') ? 'debuff' : stageSum(m, 'self') > 0 && !m.effects.some((e) => e.kind === 'status') ? 'brace' : 'other');

/** The line from its base, in stage order (a fork's stages all count: Eevee's four). */
function lineOf(baseId) {
  const out = [];
  const walk = (id, depth) => { out.push({ s: byId.get(id), depth }); for (const t of byId.get(id).evolvesTo) walk(t, depth + 1); };
  walk(baseId, 0);
  return out;
}
const bases = S.filter((s) => !parentOf.has(s.id));

const window = (s) => ({ lo: parentOf.has(s.id) ? byId.get(parentOf.get(s.id)).evolveLevel : 1, hi: s.evolvesTo.length ? s.evolveLevel : 71 });

/** Step 1 — each stage's entries: its own, merged with the series' Gen IV ones inside its window. */
function entriesFor(s) {
  const { lo, hi } = window(s);
  const inWindow = (lv) => lv >= lo && lv < hi;
  // A move an earlier stage already learns is not learned again (lineLearnset would skip it anyway).
  const earlier = new Set();
  for (let p = parentOf.get(s.id); p; p = parentOf.get(p)) for (const l of result.get(p) ?? AUTHORED[p]) earlier.add(l.move);
  const own = new Map(AUTHORED[s.id].filter((l) => !earlier.has(l.move)).map((l) => [l.move, l.level]));
  const isBase = !parentOf.has(s.id);
  const mine = new Set(own.keys());
  let early = 3;
  for (const e of GEN4[s.id]?.learnset ?? []) {
    // A filler the stage does not already have is never added: it is what the tracks exist to grow out of.
    if (!MOVES.has(e.move) || e.level < 1 || earlier.has(e.move) || (FILLER.has(e.move) && !own.has(e.move))) continue;
    if (reserved(s.id, e.move) && !own.has(e.move)) continue;
    // An evolved form's Lv 1 rows are what it remembers from before; a base form's extra Lv 1 rows come in at 3, 5, 7….
    const lv = e.level <= 1 ? (isBase && !own.has(e.move) ? Math.min(hi - 1, (early += 2) - 2) : -1) : e.level;
    if (!inWindow(lv)) continue;
    if (!own.has(e.move)) own.set(e.move, lv);
    else if (own.get(e.move) !== 1) own.set(e.move, Math.min(own.get(e.move), lv));
  }
  let list = [...own].map(([move, level]) => ({ level, move }));
  // MOVE_CAP.learnset — past the cap, the series' additions go first: utility that sharpens nothing, then the weakest hits.
  const keep = (e) => (mine.has(e.move) ? 9 : role(MOVES.get(e.move)) === 'other' ? 0 : MOVES.get(e.move).power === 0 ? 1 : 2 + MOVES.get(e.move).power / 1000);
  while (list.length > CAP) {
    const drop = [...list].sort((a, b) => keep(a) - keep(b) || b.level - a.level)[0];
    list = list.filter((e) => e !== drop);
  }
  return list.sort((a, b) => a.level - b.level);
}

const result = new Map();
let tracked = 0, guaranteed = 0, gen4 = 0;
for (const base of bases) {
  const line = lineOf(base.id);
  for (const { s } of line) {
    const before = new Set(AUTHORED[s.id].map((l) => l.move));
    const list = entriesFor(s);
    gen4 += list.filter((l) => !before.has(l.move)).length;
    result.set(s.id, list);
  }
  // Step 2 — the tracks, along each chain from the base (a fork's branches each walk their own).
  const chains = [];
  const walk = (id, acc) => { const next = [...acc, id]; const s = byId.get(id); if (!s.evolvesTo.length) chains.push(next); else for (const t of s.evolvesTo) walk(t, next); };
  walk(base.id, []);
  const decided = new Map(); // `${species}:${move}` → replaces
  // §6.9 — a base form still holds four cards by its evolution level: its own stage's tracks spend only what it has past four.
  // One that never evolves is held to it at Lv 28 (the content test's bar).
  let baseBudget = Math.max(0, result.get(base.id).filter((e) => base.evolvesTo.length || e.level <= 28).length - 4);
  for (const chain of chains) {
    const known = []; // moves held in a slot, oldest first
    const lineMoves = new Set();
    for (const id of chain) {
      for (const e of result.get(id)) {
        if (lineMoves.has(e.move)) continue;
        lineMoves.add(e.move);
        const m = MOVES.get(e.move);
        const key = `${id}:${e.move}`;
        let pick = decided.get(key);
        if (pick === undefined) {
          const r = role(m);
          const candidates = known.filter((k) => {
            const o = MOVES.get(k);
            if (role(o) !== r || r === 'other' || o.modifier !== 'none') return false;
            // §6.3.5 — an evolved form keeps three attacks: a hit replaces a hit (not a filler) only once four stand beside it (a branch may merge two).
            if (r === 'attack') return o.range === m.range && m.power >= o.power + 10 && band(m) <= band(o) + 1 && band(m) >= band(o) && (o.type === m.type || o.type === 'normal')
              && (FILLER.has(k) || known.filter((x) => MOVES.get(x).power > 0).length >= 4);
            const side = r === 'debuff' ? 'foe' : 'self';
            if (!stats(o, side).every((x) => stats(m, side).includes(x))) return false;
            return stageSum(m, side) > stageSum(o, side) || (FILLER.has(k) && !FILLER.has(e.move) && stageSum(m, side) >= stageSum(o, side));
          });
          // Its own type first, then the weakest; a filler before anything else.
          candidates.sort((a, b) => Number(FILLER.has(b)) - Number(FILLER.has(a)) || Number(MOVES.get(b).type === m.type) - Number(MOVES.get(a).type === m.type) || MOVES.get(a).power - MOVES.get(b).power);
          pick = candidates[0] ?? null;
          if (pick && id === base.id) { if (baseBudget > 0) baseBudget--; else pick = null; }
          decided.set(key, pick);
        }
        if (pick && known.includes(pick)) known.splice(known.indexOf(pick), 1, e.move);
        else known.push(e.move);
      }
    }
    // Step 3 — the guarantee: a filler the final form still holds — learned, or handed over by a branch on this chain —
    // gets its role's upgrade, a few levels into the first evolution (the base, for a single stage).
    const final = byId.get(chain.at(-1));
    const at = byId.get(chain[1] ?? chain[0]);
    const fromBranches = chain.slice(0, -1).flatMap((id, i) => (byId.get(id).branches ?? []).filter((br) => br.to === chain[i + 1]).flatMap((br) => [...br.adds, ...br.upgrades.map((u) => u.to)]).filter((x) => FILLER.has(x)).map((x) => ({ move: x, level: byId.get(id).evolveLevel })));
    const fillers = [...known.filter((k) => FILLER.has(k)).map((k) => ({ move: k, level: Math.max(...chain.flatMap((id) => result.get(id).filter((e) => e.move === k).map((e) => e.level))) })), ...fromBranches];
    const replacedHere = new Set(chain.flatMap((id) => result.get(id).map((e) => decided.get(`${id}:${e.move}`)).filter(Boolean)));
    for (const { move: f, level: fillerLevel } of fillers) {
      if (replacedHere.has(f)) continue;
      const list = result.get(at.id);
      // The line already learns one of its upgrades after the filler, unclaimed: that row takes the filler's slot.
      let marked = false;
      for (const up of FILLER_UPGRADES(f, at.types)) {
        for (const id of chain) for (const e of result.get(id)) if (!marked && e.move === up && e.level > fillerLevel && !decided.get(`${id}:${up}`)) { decided.set(`${id}:${up}`, f); marked = true; }
      }
      if (marked) { replacedHere.add(f); continue; }
      const up = FILLER_UPGRADES(f, at.types).find((id) => !reserved(final.id, id) && !lineMoves.has(id));
      if (!up) continue;
      const { lo, hi } = window(at);
      const used = new Set(list.map((l) => l.level));
      let level = Math.min(hi - 1, Math.max(fillerLevel + 1, lo === 1 ? 24 : lo + 3));
      while (used.has(level) && level < hi - 1) level++;
      list.push({ level, move: up });
      list.sort((a, b) => a.level - b.level);
      decided.set(`${at.id}:${up}`, f);
      lineMoves.add(up);
      replacedHere.add(f);
      guaranteed++;
    }
  }
  for (const { s } of line) {
    for (const e of result.get(s.id)) {
      const rep = decided.get(`${s.id}:${e.move}`);
      if (rep) { e.replaces = rep; tracked++; } else delete e.replaces;
    }
  }
}

let changed = 0;
for (const s of S) {
  const next = result.get(s.id);
  if (JSON.stringify(next) !== JSON.stringify(s.learnset)) changed++;
  if (!check) s.learnset = next;
}
if (!check) writeFileSync(resolve(ROOT, 'src/content/data/species.json'), JSON.stringify(spJson, null, 2) + '\n');
const sizes = S.map((s) => result.get(s.id).length);
console.log(`${changed} species changed · ${gen4} entries from Gen IV · ${tracked} tracks · ${guaranteed} filler upgrades · entries per stage max ${Math.max(...sizes)}, mean ${(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(1)}`);
if (check) for (const id of ['charmander', 'charmeleon', 'charizard', 'pidgey', 'pidgeot', 'geodude', 'golem', 'eevee']) console.log(id, result.get(id).map((e) => `${e.level} ${e.move}${e.replaces ? ` (← ${e.replaces})` : ''}`).join(' · '));
if (process.argv.includes('--sizes')) for (const s of [...S].sort((a, b) => result.get(b.id).length - result.get(a.id).length).slice(0, 12)) console.log(s.id, result.get(s.id).length, result.get(s.id).map((e) => `${e.level} ${e.move}${e.replaces ? '←' + e.replaces : ''}`).join(' · '));
