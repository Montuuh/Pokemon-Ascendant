import { readFileSync, writeFileSync } from 'node:fs';
import { REMAP, remap } from './remap.mjs';

const json = (v) => JSON.stringify(v, null, 2) + '\n';

export function write({ rows, out, masteryRows, masteryIds, S, species, ROOT }) {
  const p = (f) => `${ROOT}/${f}`;
  const rd = (f) => JSON.parse(readFileSync(p(f), 'utf8'));

  // ── moves.json ──
  const oldMoves = rd('src/content/data/moves.json');
  const enemyOnly = oldMoves.moves.filter((m) => m.id === 'call-for-help' || m.id === 'cover');
  const all = [...rows.values(), ...enemyOnly];
  const known = new Set(all.map((m) => m.id));
  writeFileSync(
    p('src/content/data/moves.json'),
    json({
      _note:
        'v0.9.5 (§3.6, §6.3.6, catalogs/moves.md): every move is a Gen I move at its Gen I name, its type the modern one where the game has it (Gust Flying, Karate Chop Fighting, Sand Attack Ground; Bite stays Normal, there is no Dark). An `-plus` row is that move made better — what an evolution upgrades a card into when its type has no stronger Gen I move — and a Mastery tier (§6.8.4) is the Lv1 move\'s + and ++. AP and power sit in §6.3.6.4\'s bands, enforced by a content test. `call-for-help` and `cover` are enemy actions (§5.6), never learned. `targeting`: single (default) | cleave | backstrike (§4.3.4); `cooldown` gates enemy re-use (§5.3).',
      moves: all,
    }),
  );

  // ── species.json ──
  const lineBase = new Map();
  for (const s of S) {
    let b = s;
    for (;;) {
      const pre = S.find((x) => x.evolvesTo.includes(b.id));
      if (!pre) break;
      b = pre;
    }
    lineBase.set(s.id, b.id);
  }
  const reach = new Map(); // base -> every move its kits, branches and Mastery can hold
  for (const s of S) {
    const base = lineBase.get(s.id);
    if (!reach.has(base)) reach.set(base, new Set());
    const set = reach.get(base);
    const o = out[s.id];
    if (o) {
      o.learnset.forEach((l) => set.add(l.move));
      for (const b of Object.values(o.branches)) { b.upgrades.forEach((u) => { set.add(u.from); set.add(u.to); }); b.adds.forEach((a) => set.add(a)); }
    }
    for (const t of masteryRows.get(base) ?? []) if (t) set.add(t);
  }
  const unmapped = new Set();
  const fix = (ids, banned, cap) => {
    const res = [];
    for (const id of ids) {
      const n = remap(id, known);
      if (!n) { unmapped.add(id); continue; }
      if (masteryIds.has(n) || n.endsWith('-plus') || banned.has(n) || res.includes(n) || n === 'call-for-help' || n === 'cover') continue;
      res.push(n);
    }
    return res.slice(0, cap);
  };
  for (const s of S) {
    const o = out[s.id];
    s.learnset = o ? o.learnset.map((l) => ({ level: l.level, move: l.move })) : [];
    for (const b of s.branches ?? []) {
      const payload = o?.branches[b.archetype];
      if (!payload) throw new Error(`no payload ${s.id}/${b.archetype}`);
      b.upgrades = payload.upgrades.map((u) => ({ ...u }));
      b.adds = [...payload.adds];
    }
  }
  // Tutors and egg moves: remapped to Gen I, never something the line already holds, never twice.
  for (const s of S) {
    const base = lineBase.get(s.id);
    const banned = new Set(reach.get(base));
    s.tutorMoves = fix(s.tutorMoves ?? [], banned, 3);
  }
  for (const s of S) {
    if (!s.eggMoves?.length) continue;
    const base = lineBase.get(s.id);
    const banned = new Set(reach.get(base));
    for (const x of S) if (lineBase.get(x.id) === base) x.tutorMoves.forEach((t) => banned.add(t));
    s.eggMoves = fix(s.eggMoves, banned, 3);
  }
  writeFileSync(p('src/content/data/species.json'), json(species));

  // ── mastery.json ──
  const mastery = rd('src/content/data/mastery.json');
  const lines = {};
  for (const [base, tiers] of masteryRows) lines[base] = tiers;
  mastery._note =
    'Mastery Moves per line (§5.13.2, §6.8; catalogs/mastery-moves.md). v0.9.5: every tier is a Gen I move — Lv1 the move itself on the base form, Lv2 its + on the middle stage or a two-stage line\'s final form, Lv3 its ++ on a three-stage final — and never a card the line can otherwise hold. Lv2 sits at 2 AP and 100, Lv3 at 3 AP and 130 (a Super Fang tier takes 65 % and 80 % of HP instead). Single-stage species carry Lv1 only; the legendaries and Ditto none.';
  mastery.lines = lines;
  writeFileSync(p('src/content/data/mastery.json'), json(mastery));

  // ── scenarios.json: a remapped kit, never a repeated card ──
  const sc = readFileSync(p('src/content/data/scenarios.json'), 'utf8');
  const scenarios = JSON.parse(sc);
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === 'object') {
      if (Array.isArray(v.moves)) v.moves = [...new Set(v.moves.map((m) => remap(m, known) ?? (unmapped.add(m), m)))];
      Object.values(v).forEach(walk);
    }
  };
  walk(scenarios);
  writeFileSync(p('src/content/data/scenarios.json'), json(scenarios));

  console.log('written; unmapped:', [...unmapped].join(' ') || 'none');
}
export { REMAP };
