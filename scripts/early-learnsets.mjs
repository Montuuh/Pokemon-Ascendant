#!/usr/bin/env node
// §6.9 — a base form learns its moves at the series' levels (the user, 2026-11-03: "at first most Pokémon only have
// Normal moves"). Every learnset row of a basic-stage species whose move the species learns by level in Gen IV
// (scripts/data/learnsets-gen4.json) takes that level, clamped below its evolution level. Then the level-1 pair is
// rebuilt — the move the series teaches first and the first of the other kind (a hit and a trick) — and it always holds an attack: the series' own level-1 hit (Tackle,
// Scratch…) is added where the kit lacks it, else the earliest hit the line has comes down — so a move of the Pokémon's
// type sits at Lv 1 only where the series puts it there (Pikachu's Thunder Shock, Vulpix's Ember) or the line has no
// other hit (Cubone's Bone Club). A row the series does not teach keeps its authored level. A species that never
// evolves keeps its authored rows past Lv 25, and the Legendaries are left as authored: both are met high, with the
// kit their encounter was tuned for. Idempotent. Usage: node scripts/early-learnsets.mjs [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const check = process.argv.includes('--check');
const spJson = read('src/content/data/species.json');
const S = spJson.species;
const MOVES = new Map([...read('src/content/data/moves.json').moves, ...(read('src/content/data/later-moves.json').moves ?? [])].map((m) => [m.id, m]));
const GEN4 = read('scripts/data/learnsets-gen4.json').species;
const MASTERY = read('src/content/data/mastery.json').lines;
const parentOf = new Map(S.flatMap((s) => s.evolvesTo.map((t) => [t, s.id])));
const byId = new Map(S.map((s) => [s.id, s]));
const lineOf = (id) => { const out = []; const walk = (x) => { out.push(byId.get(x)); for (const t of byId.get(x).evolvesTo) walk(t); }; walk(id); return out; };
/** What the line gets another way (Mastery, branch payloads, tutor and egg lists) is never added by level. */
const reservedFor = (id) => {
  const set = new Set(MASTERY[id] ?? []);
  for (const s of lineOf(id)) {
    for (const b of s.branches ?? []) { for (const a of b.adds ?? []) set.add(a); for (const u of b.upgrades ?? []) set.add(u.to); }
    for (const t of s.tutorMoves ?? []) set.add(t);
    for (const e of s.eggMoves ?? []) set.add(e);
  }
  return set;
};
const hit = (id) => (MOVES.get(id)?.power ?? 0) > 0;
const NON_EVOLVER_CAP = 25;

const report = [];
for (const s of S) {
  if (s.stage !== 'basic' || parentOf.has(s.id) || s.rarity === 'legendary' || !GEN4[s.id]) continue;
  const series = new Map();
  for (const e of GEN4[s.id].learnset) if (!series.has(e.move) || series.get(e.move) > e.level) series.set(e.move, e.level);
  const evolves = s.evolveLevel !== undefined;
  const hi = evolves ? s.evolveLevel - 1 : 100;
  const target = (move, from) => {
    if (!series.has(move)) return from;
    const lv = Math.min(series.get(move), hi);
    return !evolves && (lv > NON_EVOLVER_CAP || from > NON_EVOLVER_CAP) ? from : lv;
  };
  const before = new Map(s.learnset.map((e) => [e.move, e.level]));
  const rows = s.learnset.map((e) => ({ e, from: e.level, to: target(e.move, e.level) }));
  const firstAt = (r) => (series.has(r.e.move) ? r.to : r.from);
  // The pair: the move the series teaches first, and the first of the other kind beside it — a hit and a trick, the
  // series' Tackle and Growl (an authored row keeps its authored level as its rank).
  const ranked = [...rows].sort((a, b) => firstAt(a) - firstAt(b) || a.from - b.from);
  const pair = [ranked[0], ranked.slice(1).find((r) => hit(r.e.move) !== hit(ranked[0].e.move)) ?? ranked[1]];
  // The series' own level-1 hit (Tackle, Scratch…) where the pair's hit would be one it teaches later.
  const pairHit = pair.find((r) => hit(r.e.move));
  if (!pairHit || firstAt(pairHit) > 1) {
    const reserved = reservedFor(s.id);
    const own = GEN4[s.id].learnset.find((e) => e.level === 1 && hit(e.move) && MOVES.has(e.move) && !before.has(e.move) && !reserved.has(e.move) && MOVES.get(e.move).type === 'normal');
    const added = own && s.learnset.length < 12 ? { e: { level: 1, move: own.move }, from: 0, to: 1 } : null;
    if (added) {
      rows.push(added);
      // §6.9.1 — no final form keeps a filler: the stage's first later hit of its range, of Normal type or its own, at
      // least 10 power stronger and free of a track, grows it (Ponyta's Stomp, Slowpoke's Headbutt).
      const m = MOVES.get(own.move);
      const grow = rows.filter((r) => r !== added && !r.e.replaces && hit(r.e.move)).map((r) => [r, MOVES.get(r.e.move)])
        .filter(([, n]) => n.range === m.range && n.power >= m.power + 10 && (n.type === 'normal' || s.types.includes(n.type)))
        .sort(([a], [b]) => a.to - b.to)[0];
      if (grow) grow[0].e.replaces = own.move;
    }
    const incoming = added ?? pairHit ?? ranked.find((r) => hit(r.e.move));
    if (incoming) pair[pairHit ? pair.indexOf(pairHit) : pair.length - 1] = incoming;
  }
  for (const r of rows) {
    if (pair.includes(r)) r.to = 1;
    else if (r.to === 1) r.to = Math.max(2, firstAt(r) === 1 ? (r.from > 1 ? r.from : 2) : firstAt(r));
  }
  // A track still comes after the move it replaces.
  for (const r of rows) {
    const old = r.e.replaces && rows.find((o) => o.e.move === r.e.replaces);
    if (old && r.to <= old.to) r.to = Math.min(hi, old.to + 1);
  }
  const changed = rows.filter((r) => r.to !== r.from);
  if (!changed.length) continue;
  report.push(`${s.id.padEnd(11)} ${changed.map((r) => (r.from ? `${r.e.move} ${r.from}→${r.to}` : `+${r.e.move} @1`)).join(' · ')}`);
  for (const r of rows) r.e.level = r.to;
  s.learnset = rows.map((r) => r.e).sort((a, b) => a.level - b.level);
}
console.log(report.join('\n'));
console.log(`${report.length} species retimed`);
if (!check) writeFileSync(resolve(ROOT, 'src/content/data/species.json'), JSON.stringify(spJson, null, 2) + '\n');
