#!/usr/bin/env node
// v0.9.89 (§3.11, the user's call 2026-11-03) — the special moves. Re-cuts the Gen I rows the keywords were written for
// (Reflect, Light Screen, Mist, Hyper Beam, Solar Beam, Thrash, Fly, Counter, Recover…, every 4-AP move to 3 AP with a
// drawback), and adds the Gen II–IV moves the keywords need (Protect, the weather dances, the starter ultimates, the
// self-drop and recoil finishers, Outrage). Idempotent: every row is written whole by id. The later moves also go to
// later-moves.json, the reference list the §3.6 content test reads, with the generation that introduced them.
// Usage: node scripts/v0989-keywords.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const MOVES = resolve(ROOT, 'src/content/data/moves.json');
const LATER = resolve(ROOT, 'src/content/data/later-moves.json');
const movesJson = JSON.parse(readFileSync(MOVES, 'utf8'));
const laterJson = JSON.parse(readFileSync(LATER, 'utf8'));

const row = (id, name, type, role, range, apCost, power, effects, extra = {}) => ({ id, name, type, role, range, modifier: extra.modifier ?? 'none', apCost, power, effects, ...omit(extra, 'modifier') });
const omit = (o, k) => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k));
const side = (condition) => [{ kind: 'side-condition', condition, turns: 3 }];
const field = (f) => [{ kind: 'set-field', field: f, turns: 3 }];
const heal = (p, extra = {}) => ({ kind: 'heal', percentOfMaxHp: p, ...extra });
const self = (stat, stages) => ({ kind: 'stage', target: 'self', stat, stages });

/** Gen I rows, re-cut for the keywords. Each keeps its id, name and type; what changes is what it does. */
const RECUT = [
  row('reflect', 'Reflect', 'psychic', 'defensive', 'ranged', 1, 0, side('reflect')),
  row('light-screen', 'Light Screen', 'psychic', 'defensive', 'ranged', 1, 0, side('light-screen')),
  row('mist', 'Mist', 'ice', 'defensive', 'ranged', 1, 0, side('mist')),
  row('hyper-beam', 'Hyper Beam', 'normal', 'offensive', 'ranged', 3, 150, [{ kind: 'recharge' }]),
  // §6.3.6.4 — a charge sits about a fifth over its 2-AP band: the turn of warning is its cost (measured: Skull Bash at 100
  // ended the Graveler fixture in under two turns).
  row('solar-beam', 'Solar Beam', 'grass', 'offensive', 'ranged', 2, 100, [{ kind: 'charge', skipIn: 'sunny-day' }, { kind: 'power-bonus', when: 'in-field', field: 'rain-dance', multiplier: 0.5 }]),
  row('thrash', 'Thrash', 'normal', 'offensive', 'melee', 2, 60, [{ kind: 'rampage', turns: 2 }]),
  row('petal-dance', 'Petal Dance', 'grass', 'offensive', 'melee', 2, 60, [{ kind: 'rampage', turns: 2 }]),
  row('fly', 'Fly', 'flying', 'offensive', 'melee', 2, 75, [{ kind: 'charge', outOfReach: true }]),
  row('dig', 'Dig', 'ground', 'offensive', 'melee', 2, 75, [{ kind: 'charge', outOfReach: true }]),
  row('sky-attack', 'Sky Attack', 'flying', 'offensive', 'melee', 2, 80, [{ kind: 'charge' }]),
  row('skull-bash', 'Skull Bash', 'normal', 'offensive', 'melee', 2, 85, [{ kind: 'charge' }, self('defense', 1)]),
  row('counter', 'Counter', 'fighting', 'defensive', 'ranged', 1, 0, [{ kind: 'counter', range: 'melee', multiplier: 1.5 }], { pp: 2 }),
  row('recover', 'Recover', 'normal', 'defensive', 'melee', 1, 0, [heal(0.5)], { pp: 1 }),
  row('soft-boiled', 'Soft-Boiled', 'normal', 'defensive', 'melee', 1, 0, [heal(0.5)], { pp: 1 }),
  row('rest', 'Rest', 'psychic', 'defensive', 'melee', 1, 0, [heal(1), { kind: 'status', status: 'sleep', chance: 1, self: true }], { pp: 1 }),
  // Gen I's +1 Defence kept, the Guard on top: a wall that braces still grows harder (the Rock fights measured it).
  row('withdraw', 'Withdraw', 'water', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 60 }, self('defense', 1)]),
  row('harden', 'Harden', 'normal', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 50 }, self('defense', 1)]),
  row('defense-curl', 'Defense Curl', 'normal', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 40 }, self('defense', 1)]),
  // The evolution upgrades of the three (§6.3.5) stay a step above them.
  row('withdraw-plus', 'Withdraw+', 'water', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 80 }, self('defense', 1)]),
  row('harden-plus', 'Harden+', 'normal', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 70 }, self('defense', 1)]),
  row('defense-curl-plus', 'Defense Curl+', 'normal', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 60 }, self('defense', 1)]),
  // §3.7 — no card above 3 AP: the series' inaccurate nukes pay with Fatigue, its one-hit KOs and Explosion recharge.
  row('thunder', 'Thunder', 'electric', 'offensive', 'ranged', 3, 120, [{ kind: 'status', status: 'paralysis', chance: 0.1 }, { kind: 'field-cost', field: 'rain-dance', delta: -1 }, { kind: 'field-cost', field: 'sunny-day', delta: 1 }, { kind: 'fatigue', ap: 1 }]),
  row('blizzard', 'Blizzard', 'ice', 'offensive', 'ranged', 3, 120, [{ kind: 'status', status: 'freeze', chance: 0.1 }, { kind: 'field-cost', field: 'hail', delta: -1 }, { kind: 'fatigue', ap: 1 }]),
  row('fire-blast', 'Fire Blast', 'fire', 'offensive', 'ranged', 3, 120, [{ kind: 'status', status: 'burn', chance: 0.3 }, { kind: 'fatigue', ap: 1 }]),
  row('hydro-pump', 'Hydro Pump', 'water', 'offensive', 'ranged', 3, 120, [{ kind: 'fatigue', ap: 1 }]),
  row('mega-kick', 'Mega Kick', 'normal', 'offensive', 'melee', 3, 120, [{ kind: 'fatigue', ap: 1 }]),
  row('guillotine', 'Guillotine', 'normal', 'offensive', 'melee', 3, 130, [{ kind: 'recharge' }]),
  row('horn-drill', 'Horn Drill', 'normal', 'offensive', 'melee', 3, 130, [{ kind: 'recharge' }]),
  row('fissure', 'Fissure', 'ground', 'offensive', 'melee', 3, 130, [{ kind: 'recharge' }], { ignoresDefenseStages: true }),
  row('double-edge', 'Double-Edge', 'normal', 'offensive', 'melee', 3, 120, [{ kind: 'recoil', percentOfDamage: 0.33 }]),
  row('explosion', 'Explosion', 'normal', 'offensive', 'melee', 3, 170, [{ kind: 'recoil', percentOfDamage: 0.75 }, { kind: 'recharge' }]),
];

/** Gen I's own moves the game could not express until the keywords (§3.6 had kept them out). */
const GEN1_NEW = [row('substitute', 'Substitute', 'normal', 'defensive', 'ranged', 1, 0, [{ kind: 'substitute', percentOfMaxHp: 0.25 }])];

/** Gen II–IV moves the keywords need, with the generation that introduced them (the §3.6 reference list). */
const LATER_ROWS = [
  [2, row('protect', 'Protect', 'normal', 'defensive', 'ranged', 1, 0, [{ kind: 'protect' }], { pp: 2 })],
  [2, row('detect', 'Detect', 'fighting', 'defensive', 'ranged', 1, 0, [{ kind: 'protect' }], { pp: 2 })],
  [2, row('endure', 'Endure', 'normal', 'defensive', 'ranged', 0, 0, [{ kind: 'endure' }], { pp: 1 })],
  [2, row('rain-dance', 'Rain Dance', 'water', 'utility', 'ranged', 1, 0, field('rain-dance'))],
  [2, row('sunny-day', 'Sunny Day', 'fire', 'utility', 'ranged', 1, 0, field('sunny-day'))],
  [2, row('sandstorm', 'Sandstorm', 'rock', 'utility', 'ranged', 1, 0, field('sandstorm'))],
  [3, row('hail', 'Hail', 'ice', 'utility', 'ranged', 1, 0, field('hail'))],
  [2, row('safeguard', 'Safeguard', 'normal', 'defensive', 'ranged', 1, 0, side('safeguard'))],
  [3, row('wish', 'Wish', 'normal', 'defensive', 'ranged', 1, 0, [{ kind: 'wish', percentOfMaxHp: 0.5 }], { pp: 1 })],
  [2, row('heal-bell', 'Heal Bell', 'normal', 'utility', 'ranged', 1, 0, [{ kind: 'team-cure' }])],
  [3, row('aromatherapy', 'Aromatherapy', 'grass', 'utility', 'ranged', 1, 0, [{ kind: 'team-cure' }])],
  [3, row('ingrain', 'Ingrain', 'grass', 'defensive', 'melee', 1, 0, [heal(0.0625, { durationTurns: 20 }), { kind: 'root' }], { pp: 1 })],
  [4, row('aqua-ring', 'Aqua Ring', 'water', 'defensive', 'melee', 1, 0, [heal(0.0625, { durationTurns: 20 })], { pp: 1 })],
  [2, row('synthesis', 'Synthesis', 'grass', 'defensive', 'melee', 1, 0, [heal(0.25, { weatherScaled: true })], { pp: 2 })],
  [2, row('moonlight', 'Moonlight', 'normal', 'defensive', 'melee', 1, 0, [heal(0.25, { weatherScaled: true })], { pp: 2 })],
  [2, row('morning-sun', 'Morning Sun', 'normal', 'defensive', 'melee', 1, 0, [heal(0.25, { weatherScaled: true })], { pp: 2 })],
  [2, row('milk-drink', 'Milk Drink', 'normal', 'defensive', 'melee', 1, 0, [heal(0.5)], { pp: 1 })],
  [4, row('roost', 'Roost', 'flying', 'defensive', 'melee', 1, 0, [heal(0.5)], { pp: 1 })],
  [2, row('mirror-coat', 'Mirror Coat', 'psychic', 'defensive', 'ranged', 1, 0, [{ kind: 'counter', range: 'ranged', multiplier: 1.5 }], { pp: 2 })],
  [2, row('baton-pass', 'Baton Pass', 'normal', 'utility', 'melee', 1, 0, [{ kind: 'baton-pass' }], { modifier: 'step-backward' })],
  [4, row('u-turn', 'U-turn', 'bug', 'offensive', 'melee', 2, 60, [], { modifier: 'step-backward' })],
  [3, row('iron-defense', 'Iron Defense', 'steel', 'defensive', 'melee', 1, 0, [{ kind: 'guard', power: 60 }, self('defense', 1)])],
  [3, row('calm-mind', 'Calm Mind', 'psychic', 'utility', 'melee', 1, 0, [self('attack', 1), self('defense', 1)])],
  [3, row('bulk-up', 'Bulk Up', 'fighting', 'utility', 'melee', 1, 0, [self('attack', 1), self('defense', 1)])],
  [4, row('giga-impact', 'Giga Impact', 'normal', 'offensive', 'melee', 3, 150, [{ kind: 'recharge' }])],
  [3, row('blast-burn', 'Blast Burn', 'fire', 'offensive', 'ranged', 3, 150, [{ kind: 'recharge' }])],
  [3, row('hydro-cannon', 'Hydro Cannon', 'water', 'offensive', 'ranged', 3, 150, [{ kind: 'recharge' }])],
  [3, row('frenzy-plant', 'Frenzy Plant', 'grass', 'offensive', 'ranged', 3, 150, [{ kind: 'recharge' }])],
  [3, row('overheat', 'Overheat', 'fire', 'offensive', 'ranged', 3, 130, [self('attack', -2)])],
  [4, row('draco-meteor', 'Draco Meteor', 'dragon', 'offensive', 'ranged', 3, 130, [self('attack', -2)])],
  [4, row('leaf-storm', 'Leaf Storm', 'grass', 'offensive', 'ranged', 3, 130, [self('attack', -2)])],
  [4, row('close-combat', 'Close Combat', 'fighting', 'offensive', 'melee', 3, 120, [self('defense', -2)])],
  [3, row('superpower', 'Superpower', 'fighting', 'offensive', 'melee', 3, 120, [self('attack', -1), self('defense', -1)])],
  [4, row('flare-blitz', 'Flare Blitz', 'fire', 'offensive', 'melee', 3, 120, [{ kind: 'recoil', percentOfDamage: 0.33 }, { kind: 'status', status: 'burn', chance: 0.1 }])],
  [3, row('volt-tackle', 'Volt Tackle', 'electric', 'offensive', 'melee', 3, 120, [{ kind: 'recoil', percentOfDamage: 0.33 }, { kind: 'status', status: 'paralysis', chance: 0.1 }])],
  [4, row('wood-hammer', 'Wood Hammer', 'grass', 'offensive', 'melee', 3, 120, [{ kind: 'recoil', percentOfDamage: 0.33 }])],
  [4, row('brave-bird', 'Brave Bird', 'flying', 'offensive', 'melee', 3, 120, [{ kind: 'recoil', percentOfDamage: 0.33 }])],
  [2, row('outrage', 'Outrage', 'dragon', 'offensive', 'melee', 2, 60, [{ kind: 'rampage', turns: 2 }])],
];

const list = movesJson.moves;
const put = (m) => {
  const at = list.findIndex((x) => x.id === m.id);
  if (at >= 0) list[at] = m;
  else list.push(m);
};
// A re-cut keeps what the row had that the keywords do not touch — its positional modifier, its crit, its stance
// through Defence stages — and loses its enemy cooldown: PP, a recharge or a charge does that job now (§3.11).
const RECUT_FINAL = RECUT.map((m) => {
  const orig = list.find((x) => x.id === m.id);
  if (!orig) throw new Error(`re-cut of a move that is not there: ${m.id}`);
  const merged = { ...orig, ...m, modifier: orig.modifier };
  delete merged.cooldown;
  return merged;
});
for (const m of RECUT_FINAL) put(m);
for (const m of GEN1_NEW) put(m);
for (const [, m] of LATER_ROWS) put(m);
writeFileSync(MOVES, JSON.stringify(movesJson, null, 2) + '\n');

for (const [gen, m] of LATER_ROWS) {
  const ref = { id: m.id, name: m.name, type: m.type, power: m.power, gen };
  const at = laterJson.moves.findIndex((x) => x.id === m.id);
  if (at >= 0) laterJson.moves[at] = ref;
  else laterJson.moves.push(ref);
}
laterJson._note = 'The moves of later generations the game carries (§3.6): the 14 Dark and Steel moves of v0.9.84, and from v0.9.89 the Gen II–IV moves the keywords need (§3.11). Reference data for the content test that keeps every move in moves.json either a Gen I move (gen1-moves.json) or one of these, with `gen` the generation that introduced it; the game never reads it.';
writeFileSync(LATER, JSON.stringify(laterJson, null, 2) + '\n');
console.log(`moves: ${RECUT.length} re-cut, ${LATER_ROWS.length} later — ${list.length} rows`);

// ── The catalogue (docs/design/catalogs/moves.md): the re-cut rows rewritten in place, the later ones as §1c.
const CATALOG = resolve(ROOT, 'docs/design/catalogs/moves.md');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pct = (x) => `${Math.round(x * 100)} %`;
const STAT = { attack: 'Atk', defense: 'Def', speed: 'Spd' };
const FIELD = { 'rain-dance': 'Rain', 'sunny-day': 'Sun', hail: 'Hail', sandstorm: 'Sandstorm' };
const effect = (m) => {
  const out = m.effects.map((e) => {
    switch (e.kind) {
      case 'status': return `${e.self ? 'self ' : ''}${cap(e.status)} ${e.chance >= 1 ? '' : pct(e.chance)}`.trim();
      case 'stage': return `${e.target} ${STAT[e.stat]} ${e.stages > 0 ? '+' : '−'}${Math.abs(e.stages)}`;
      case 'heal': return `heal ${pct(e.percentOfMaxHp)}${e.durationTurns ? ` × ${e.durationTurns} turns` : ''}${e.weatherScaled ? ' (×2 Sun, ×0.5 other weather)' : ''}`;
      case 'recoil': return `recoil ${pct(e.percentOfDamage)}`;
      case 'power-bonus': return e.when === 'in-field' ? `×${e.multiplier} in ${FIELD[e.field] ?? e.field}` : e.kind;
      case 'team-cure': return 'cure the team';
      case 'protect': return 'Protect';
      case 'endure': return 'Endure';
      case 'guard': return `Guard ${e.power}`;
      case 'substitute': return `Substitute ${pct(e.percentOfMaxHp)}`;
      case 'side-condition': return `${{ reflect: 'Reflect', 'light-screen': 'Light Screen', safeguard: 'Safeguard', mist: 'Mist' }[e.condition]} ${e.turns} turns`;
      case 'set-field': return `${FIELD[e.field] ?? e.field} ${e.turns} turns`;
      case 'field-cost': return `${e.delta < 0 ? '−' : '+'}${Math.abs(e.delta)} AP in ${FIELD[e.field] ?? e.field}`;
      case 'recharge': return 'Recharge';
      case 'fatigue': return `Fatigue ${e.ap}`;
      case 'rampage': return `Rampage ${e.turns}`;
      case 'charge': return e.outOfReach ? 'Charge, out of reach' : e.skipIn ? `Charge (none in ${FIELD[e.skipIn] ?? e.skipIn})` : 'Charge';
      case 'counter': return `Counter ${e.range === 'melee' ? 'Melee' : 'Ranged'} ×${e.multiplier}`;
      case 'wish': return `Wish ${pct(e.percentOfMaxHp)}`;
      case 'root': return 'rooted';
      case 'baton-pass': return 'Baton Pass';
      default: return e.kind;
    }
  });
  if (m.pp) out.push(`PP ${m.pp}`);
  if (m.alwaysCrit) out.push('always crit');
  if (m.ignoresDefenseStages) out.push('ignores Def stages');
  return out.join(' · ') || '—';
};
const catRow = (m) =>
  `| \`${m.id}\` | ${m.name} | ${cap(m.type)} | ${m.role === 'offensive' ? 'Off' : m.role === 'defensive' ? 'Def' : 'Util'} | ${m.range === 'ranged' ? 'Ranged' : 'Melee'} | ${m.modifier === 'step-forward' ? 'SF' : m.modifier === 'step-backward' ? 'SB' : '—'} | ${m.apCost} | ${m.power > 1 ? m.power : '—'} | ${[m.targeting && m.targeting !== 'single' ? m.targeting : '', m.cooldown ? `cd ${m.cooldown}` : ''].filter(Boolean).join(' ') || '—'} | ${effect(m)} |`;

let doc = readFileSync(CATALOG, 'utf8');
for (const m of RECUT_FINAL) {
  const re = new RegExp(`^\\| \`${m.id}\` \\| [^\`|][^\\n]*$`, 'm');
  if (!re.test(doc)) throw new Error(`no catalogue row for ${m.id}`);
  doc = doc.replace(re, catRow(m));
}
const SECTION = `## 1c. Later moves — the keywords' Gen II–IV moves (v0.9.89)

The moves of Generations II–IV the move keywords (§3.11) were written for (the user's call, 2026-11-03: "import more moves
where Gen I has few"): Protect and Detect, the weather dances, the heals and screens, the starter ultimates, the finishers
that pay with a stat drop or recoil, Outrage. Reference data for the content test: \`src/content/data/later-moves.json\`,
with each move's generation. A new row here needs one there, and an illustration (\`docs/art/prompts/move-art.json\`).

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
${LATER_ROWS.map(([, m]) => catRow(m)).join('\n')}

`;
for (const m of GEN1_NEW) {
  const re = new RegExp(`^\\| \`${m.id}\` \\| [^\`|][^\\n]*$`, 'm');
  if (re.test(doc)) doc = doc.replace(re, catRow(m));
  else doc = doc.replace(/^(\| `hyper-beam` \|[^\n]*)$/m, `$1\n${catRow(m)}`);
}
const start = doc.indexOf('## 1c.');
const end = doc.indexOf('## 2. Made better');
doc = start >= 0 ? doc.slice(0, start) + SECTION + doc.slice(end) : doc.slice(0, end) + SECTION + doc.slice(end);
writeFileSync(CATALOG, doc);
console.log('catalogue: rows rewritten and §1c written');
