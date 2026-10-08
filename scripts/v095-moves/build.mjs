// v0.9.5 — the one-off that rewrote every move to Gen I and every kit to 2 → 4 → 5 → 5 (docs/roadmap.md v0.9.5). It built
// moves.json, the kits in species.json and mastery.json from moves.mjs + kits.mjs, validating every evolution path, and
// docs.mjs regenerated the move catalogs. Kept as the record of how; the data is canon now — edit it, not these.
//   node scripts/v095-moves/build.mjs           dry run
//   node scripts/v095-moves/build.mjs --write   write the data
import { readFileSync, writeFileSync } from 'node:fs';
import { MOVES, PLUS_OVERRIDES } from './moves.mjs';
import { KITS } from './kits.mjs';

const ROOT = process.env.REPO ?? process.cwd();
const OLD_MASTERY = new Set(["bulbasaur","charmander","squirtle","caterpie","weedle","pidgey","rattata","oddish","zubat","geodude","diglett","onix","machop","magikarp","poliwag","psyduck","krabby","snorlax","eevee","bellsprout","mankey","aerodactyl","lapras","cubone","pikachu","tentacool","shellder","horsea","staryu","seel","voltorb","magnemite","electabuzz","koffing","growlithe","vulpix","ponyta","sandshrew","rhyhorn","magmar","abra","nidoran-f","jynx","spearow","doduo","farfetchd","scyther","gastly","drowzee","grimer","mr-mime"]);
const WRITE = process.argv.includes('--write');
const rd = (p) => JSON.parse(readFileSync(`${ROOT}/${p}`, 'utf8'));
const G1 = new Map(rd('src/content/data/gen1-moves.json').moves.map((m) => [m.id, m]));
const MODERN = { gust: 'flying', 'karate-chop': 'fighting', 'sand-attack': 'ground' };

// ── Bands (§6.3.6.4) ──
const BAND = { 1: { M: [40, 50], R: [45, 55] }, 2: { M: [60, 75], R: [65, 90] }, 3: { M: [85, 100], R: [90, 100] }, 4: { M: [110, 130], R: [115, 130] } };

const rows = new Map();
const errors = [];
const err = (m) => errors.push(m);

function row(id, type, rng, ap, power, o = {}) {
  const util = rng === 'U';
  const range = util ? (o.range === 'R' ? 'ranged' : 'melee') : rng === 'R' ? 'ranged' : 'melee';
  const effects = o.eff ?? [];
  const role = util ? (effects.some((e) => e.kind === 'stage' && e.target === 'self' && e.stat === 'defense') || effects.some((e) => e.kind === 'heal') || effects.some((e) => e.kind === 'team-guard') ? 'defensive' : 'utility') : 'offensive';
  const m = { id, name: o.name ?? G1.get(id)?.name ?? id, type, role, range, modifier: o.mod === 'sf' ? 'step-forward' : o.mod === 'sb' ? 'step-backward' : 'none', apCost: ap, power: util ? 0 : power, effects };
  if (o.tgt) m.targeting = o.tgt;
  if (o.crit) m.alwaysCrit = true;
  if (o.igdef) m.ignoresDefenseStages = true;
  if (o.cd) m.cooldown = o.cd;
  return m;
}
for (const [id, type, rng, ap, power, o] of MOVES) {
  const g = G1.get(id);
  if (!g) err(`not Gen I: ${id}`);
  else if ((MODERN[id] ?? g.type) !== type) err(`type ${id}: ${type} ≠ ${MODERN[id] ?? g.type}`);
  rows.set(id, row(id, type, rng, ap, power, o));
}

// ── + variants ──
const top = (ap, range) => BAND[ap]?.[range === 'ranged' ? 'R' : 'M']?.[1] ?? 130;
function plusOf(base) {
  const m = structuredClone(base);
  m.id = `${base.id}-plus`;
  m.name = `${base.name}+`;
  m.effects = m.effects.map((e) => ({ ...e }));
  if (m.power > 1) {
    const cap = top(m.apCost, m.range);
    const room = cap - m.power;
    if (room >= 10) m.power = Math.min(cap, m.power + 15);
    else {
      m.power = cap;
      const s = m.effects.find((e) => e.kind === 'status' && !e.self);
      const h = m.effects.find((e) => e.kind === 'multi-hit');
      if (s) s.chance = Math.min(1, +(s.chance + 0.2).toFixed(2));
      else if (h) h.hits += 1;
      else if (!m.effects.some((e) => e.kind === 'stage' && e.target === 'foe')) m.effects.push({ kind: 'stage', target: 'foe', stat: 'defense', stages: -1 });
      else m.effects.find((e) => e.kind === 'stage' && e.target === 'foe').stages -= 1;
    }
  } else if (m.power === 1) {
    const f = m.effects.find((e) => e.kind === 'fixed-damage');
    if (f) f.percentOfTargetHp = +(f.percentOfTargetHp + 0.15).toFixed(2);
  } else {
    let improved = false;
    for (const e of m.effects) {
      if (e.kind === 'stage') { e.stages += Math.sign(e.stages); improved = true; }
      else if (e.kind === 'status' && !e.self && e.chance < 1) { e.chance = Math.min(1, +(e.chance + 0.25).toFixed(2)); improved = true; }
      else if (e.kind === 'heal') { e.percentOfMaxHp = Math.min(1, +(e.percentOfMaxHp + 0.15).toFixed(2)); improved = true; }
      else if (e.kind === 'draw') { e.cards += 1; improved = true; }
      else if (e.kind === 'team-guard' && e.percent) { e.percent = Math.min(100, e.percent + 25); improved = true; }
    }
    if (!improved && m.apCost > 0) m.apCost -= 1;
  }
  return Object.assign(m, PLUS_OVERRIDES[m.id] ?? {});
}
/** §6.8.4 — a Mastery tier: Lv2 (+) at 2 AP and 100, Lv3 (++) at 3 AP and 130; its riders carry over. */
function masteryOf(base, tier) {
  const m = structuredClone(base);
  m.id = `${base.id}-${tier === 2 ? 'plus' : 'plus-plus'}`;
  m.name = `${base.name}${tier === 2 ? '+' : '++'}`;
  m.role = 'offensive';
  m.apCost = tier === 2 ? 2 : 3;
  delete m.cooldown;
  const f = m.effects.find((e) => e.kind === 'fixed-damage');
  if (f) f.percentOfTargetHp = tier === 2 ? 0.65 : 0.8;
  else m.power = tier === 2 ? 100 : 130;
  // A rampage's or a blast's drawback stays; the charge-up and the recharge are what mastery removes.
  return m;
}

// ── Kits ──
const species = rd('src/content/data/species.json');
const S = Array.isArray(species) ? species : species.species;
const byId = new Map(S.map((s) => [s.id, s]));
const need = new Set();
const masteryRows = new Map();
const parseL = (str) => str.split(/\s+/).filter(Boolean).map((t) => (t.includes(':') ? { level: +t.split(':')[0], move: t.split(':')[1] } : { level: 1, move: t }));
const parseB = (str) => {
  const ups = [], adds = [];
  for (const t of str.split(/\s+/).filter(Boolean)) if (t.startsWith('+')) adds.push(t.slice(1)); else { const [from, to] = t.split('>'); ups.push({ from, to }); }
  return { upgrades: ups, adds };
};
const stagesOf = (id) => { let n = 1, s = byId.get(id); while (s.evolvesTo.length) { n++; s = byId.get(s.evolvesTo[0]); } return n; };

const lineOf = new Map(); // species id -> base id
for (const s of S) { let b = s; while (true) { const pre = S.find((x) => x.evolvesTo.includes(b.id)); if (!pre) break; b = pre; } lineOf.set(s.id, b.id); }

const out = {}; // species id -> { learnset, branches: {archetype: {upgrades, adds}} }
for (const [base, k] of Object.entries(KITS)) {
  const sp = byId.get(base);
  if (!sp) { err(`no species ${base}`); continue; }
  const L = parseL(k.L);
  out[base] = { learnset: L, branches: {} };
  for (const l of L) need.add(l.move);
  if (k.M) for (const [arch, str] of Object.entries(k.M)) { const b = parseB(str); out[base].branches[arch] = b; b.upgrades.forEach((u) => need.add(u.to)); b.adds.forEach((a) => need.add(a)); }
  const mid = sp.evolvesTo[0] && byId.get(sp.evolvesTo[0]);
  if (k.F) {
    if (!mid || !mid.evolvesTo.length) err(`${base}: F on a two-stage line`);
    else { out[mid.id] = { learnset: [], branches: {} }; for (const [arch, str] of Object.entries(k.F)) { const b = parseB(str); out[mid.id].branches[arch] = b; b.upgrades.forEach((u) => need.add(u.to)); } }
  }
  // Mastery stays on the lines that had one: a line's rank-2 hidden ability is what the Bond ladder needs first (§6.8.3).
  if (k.mastery && OLD_MASTERY.has(base)) {
    const n = stagesOf(base);
    const tiers = [k.mastery, n >= 2 ? `${k.mastery}-plus` : null, n >= 3 ? `${k.mastery}-plus-plus` : null];
    masteryRows.set(base, tiers);
    need.add(k.mastery);
  }
}
for (const s of S) if (!lineOf.get(s.id) || !KITS[lineOf.get(s.id)]) err(`no kit for ${s.id}`);

// Materialise + rows and Mastery tiers.
for (const id of need) {
  if (rows.has(id)) continue;
  if (id.endsWith('-plus')) {
    const b = rows.get(id.slice(0, -5));
    if (!b) err(`+ of unknown ${id}`); else rows.set(id, plusOf(b));
  } else err(`unknown move ${id}`);
}
const masteryIds = new Set();
for (const [base, tiers] of masteryRows) {
  const b = rows.get(tiers[0]);
  if (!b) { err(`mastery base ${tiers[0]}`); continue; }
  [2, 3].forEach((t) => { const id = tiers[t - 1]; if (!id) return; if (rows.has(id) && !masteryIds.has(id)) err(`${base}: mastery ${id} is also a kit move`); rows.set(id, masteryOf(b, t)); masteryIds.add(id); });
}

// ── Validate every path ──
const anchors = new Set(['pinsir', 'snorlax']);
const isRanged = (id) => rows.get(id)?.range === 'ranged';
function apply(pool, b, parents) {
  const p = [...pool];
  for (const u of b.upgrades) {
    let i = p.indexOf(u.from);
    if (i < 0) i = p.findIndex((m) => { const seen = new Set(); const q = [m]; while (q.length) { const x = q.shift(); if (x === u.from) return true; for (const y of parents.get(x) ?? []) if (!seen.has(y)) { seen.add(y); q.push(y); } } return false; });
    if (i < 0) return { pool: p, bad: `slot ${u.from} not in [${p.join(' ')}]` };
    p[i] = u.to;
  }
  for (const a of b.adds) p.push(a);
  return { pool: p };
}
for (const [base, k] of Object.entries(KITS)) {
  const sp = byId.get(base);
  const o = out[base];
  const at1 = o.learnset.filter((l) => l.level === 1);
  if (at1.length !== 2) err(`${base}: ${at1.length} moves at L1`);
  for (const l of o.learnset) if (sp.evolveLevel && l.level >= sp.evolveLevel) err(`${base}: ${l.move} at ${l.level} ≥ evo ${sp.evolveLevel}`);
  const basePool = o.learnset.map((l) => l.move);
  const expect = sp.evolvesTo.length ? (base === 'magikarp' ? 2 : 4) : (base === 'ditto' ? 2 : 5);
  if (basePool.length !== expect) err(`${base}: base pool ${basePool.length} ≠ ${expect}`);
  if (new Set(basePool).size !== basePool.length) err(`${base}: dup in base`);
  if (!sp.evolvesTo.length && !basePool.some(isRanged) && !anchors.has(base) && base !== 'ditto') err(`${base}: no ranged`);
  const parents = new Map();
  for (const sid of [base, ...(sp.evolvesTo.length ? [sp.evolvesTo[0]] : [])]) for (const b of Object.values(out[sid]?.branches ?? {})) for (const u of b.upgrades) { if (!parents.has(u.to)) parents.set(u.to, new Set()); parents.get(u.to).add(u.from); }
  const archetypes = (sid) => byId.get(sid).branches.map((b) => b.archetype);
  if (!sp.evolvesTo.length) continue;
  for (const a of archetypes(base)) if (!o.branches[a]) err(`${base}: no M payload for ${a}`);
  for (const a of Object.keys(o.branches)) if (!archetypes(base).includes(a)) err(`${base}: M payload for missing archetype ${a}`);
  for (const [a, b] of Object.entries(o.branches)) {
    if (b.upgrades.length > 2 || b.adds.length !== 1) err(`${base}/${a}: M needs ≤2 upgrades and 1 add`);
    for (const u of b.upgrades) if (!basePool.includes(u.from)) err(`${base}/${a}: ${u.from} not in base`);
    const r = apply(basePool, b, parents);
    if (r.bad) { err(`${base}/${a}: ${r.bad}`); continue; }
    if (new Set(r.pool).size !== 5 && !(base === 'magikarp' && new Set(r.pool).size === 3)) err(`${base}/${a}: middle pool [${r.pool.join(' ')}]`);
    if (!r.pool.some(isRanged) && !['machop'].includes(base)) err(`${base}/${a}: middle no ranged [${r.pool.join(' ')}]`);
    const mid = byId.get(sp.evolvesTo[0]);
    for (const t of masteryRows.get(base) ?? []) if (t && r.pool.includes(t)) err(`${base}/${a}: mastery ${t} in kit`);
    // Eevee's branches go to different species.
    if (!mid.evolvesTo.length || !out[mid.id]) continue;
    for (const fa of archetypes(mid.id)) if (!out[mid.id].branches[fa]) err(`${mid.id}: no F payload for ${fa}`);
    for (const [fa, fb] of Object.entries(out[mid.id].branches)) {
      if (fb.adds.length || fb.upgrades.length > 3 || !fb.upgrades.length) err(`${mid.id}/${fa}: F needs 1–3 swaps, no add`);
      for (const u of fb.upgrades) if (!basePool.includes(u.from)) err(`${mid.id}/${fa}: slot ${u.from} not a base move`);
      const f = apply(r.pool, fb, parents);
      if (f.bad) { err(`${base}/${a}→${fa}: ${f.bad}`); continue; }
      if (new Set(f.pool).size !== f.pool.length) err(`${base}/${a}→${fa}: dup [${f.pool.join(' ')}]`);
      if (!f.pool.some(isRanged) && !['machop'].includes(base)) err(`${base}/${a}→${fa}: no ranged [${f.pool.join(' ')}]`);
      const tiers = masteryRows.get(base) ?? [];
      for (const t of tiers) if (t && f.pool.includes(t)) err(`${base}/${a}→${fa}: mastery ${t} in kit`);
    }
    const tiers = masteryRows.get(base) ?? [];
    for (const t of tiers) if (t && r.pool.includes(t)) err(`${base}/${a}: mastery ${t} in kit`);
  }
}
for (const [base, tiers] of masteryRows) if (tiers[0] && out[base].learnset.some((l) => l.move === tiers[0])) err(`${base}: mastery ${tiers[0]} in learnset`);

// Bands for kit moves (not Mastery tiers).
for (const m of rows.values()) {
  if (masteryIds.has(m.id) || m.power <= 1) continue;
  const band = BAND[m.apCost]?.[m.range === 'ranged' ? 'R' : 'M'];
  if (!band) { err(`band: ${m.id} AP ${m.apCost}`); continue; }
  const exempt = m.targeting === 'cleave' || ['self-destruct', 'explosion', 'self-destruct-plus', 'thrash', 'petal-dance'].includes(m.id) || m.effects.some((e) => e.kind === 'recoil');
  if (!exempt && (m.power < band[0] || m.power > band[1])) err(`band: ${m.id} ${m.apCost}AP ${m.range} ${m.power} ∉ ${band}`);
}

console.log(`${rows.size} moves (${masteryIds.size} mastery tiers), ${errors.length} problems`);
for (const e of errors) console.log(' ✗', e);
export { rows, out, masteryRows, masteryIds, byId, S, species };
if (WRITE && !errors.length) {
  const { write } = await import('./write.mjs');
  write({ rows, out, masteryRows, masteryIds, S, species, ROOT });
}
