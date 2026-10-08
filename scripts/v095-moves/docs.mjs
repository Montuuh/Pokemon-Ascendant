// v0.9.5 — regenerates the move catalogs from the data, and rewrites the kit columns of the species catalogs.
import { readFileSync, writeFileSync } from 'node:fs';
import { REMAP } from './remap.mjs';

const ROOT = process.env.REPO ?? process.cwd();
const rd = (f) => JSON.parse(readFileSync(`${ROOT}/${f}`, 'utf8'));
const moves = rd('src/content/data/moves.json').moves;
const M = new Map(moves.map((m) => [m.id, m]));
const sp = rd('src/content/data/species.json');
const S = Array.isArray(sp) ? sp : sp.species;
const byId = new Map(S.map((s) => [s.id, s]));
const mastery = rd('src/content/data/mastery.json').lines;
const masteryIds = new Set(Object.values(mastery).flatMap((t) => t.slice(1)).filter(Boolean));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const pct = (x) => `${Math.round(x * 100)} %`;
const STAT = { attack: 'Atk', defense: 'Def', speed: 'Spd' };

function effect(m) {
  const out = m.effects.map((e) => {
    switch (e.kind) {
      case 'status': return `${e.self ? 'self ' : ''}${cap(e.status)} ${e.chance >= 1 ? '' : pct(e.chance)}${e.escalating ? ' (escalating)' : ''}`.trim();
      case 'stage': return `${e.target} ${STAT[e.stat]} ${e.stages > 0 ? '+' : '−'}${Math.abs(e.stages)}`;
      case 'heal': return `heal ${pct(e.percentOfMaxHp)}${e.durationTurns ? ` × ${e.durationTurns} turns` : ''}`;
      case 'drain': return `drain ${pct(e.percentOfDamage)}`;
      case 'recoil': return `recoil ${pct(e.percentOfDamage)}`;
      case 'multi-hit': return `${e.hits} hits`;
      case 'draw': return `draw ${e.cards}`;
      case 'fixed-damage': return `${pct(e.percentOfTargetHp)} of current HP`;
      case 'power-bonus': return `×${e.multiplier} below ${pct(e.below)} HP`;
      case 'team-guard': return e.guard === 'status' ? 'team guard: next status' : `team guard: next Cleave −${e.percent} %`;
      case 'team-cure': return 'cure the team';
      default: return e.kind;
    }
  });
  if (m.alwaysCrit) out.push('always crit');
  if (m.ignoresDefenseStages) out.push('ignores Def stages');
  return out.join(' · ') || '—';
}
const row = (m) =>
  `| \`${m.id}\` | ${m.name} | ${cap(m.type)} | ${m.role === 'offensive' ? 'Off' : m.role === 'defensive' ? 'Def' : 'Util'} | ${m.range === 'ranged' ? 'Ranged' : 'Melee'} | ${m.modifier === 'step-forward' ? 'SF' : m.modifier === 'step-backward' ? 'SB' : '—'} | ${m.apCost} | ${m.power > 1 ? m.power : '—'} | ${[m.targeting && m.targeting !== 'single' ? m.targeting : '', m.cooldown ? `cd ${m.cooldown}` : ''].filter(Boolean).join(' ') || '—'} | ${effect(m)} |`;
const HEAD = '| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |\n|---|---|---|---|---|---|---|---|---|---|';

const base = moves.filter((m) => !m.id.endsWith('-plus') && m.id !== 'call-for-help' && m.id !== 'cover');
const plus = moves.filter((m) => m.id.endsWith('-plus') && !masteryIds.has(m.id));
const tiers = moves.filter((m) => masteryIds.has(m.id));
const types = [...new Set(base.map((m) => m.type))];

const doc = `# Move catalog

> Implements §3.6 (taxonomy), §4.1.1 (power and range), §6.3.6 (kit rules), §4.2 (status riders). Columns map 1:1 to
> \`MoveDef\` (\`src/sim/content/defs.ts\`); every table below is generated from \`moves.json\`, so it is the build.
>
> **Every move is a Gen I move (v0.9.5, the user's call, 2026-10-08).** Its name is the Gen I name; its type is the
> modern one where the game has that type — Gust is Flying, Karate Chop Fighting, Sand Attack Ground — and Bite stays
> Normal, as there is no Dark. A **+** is that move made better, the card an evolution upgrades into when its type has
> no stronger Gen I move to climb to (Lick → Lick+); a Mastery tier is the line's Lv1 move's **+** and **++**
> (§6.8.4). A content test holds every row to the 165 moves of Generation I (\`gen1-moves.json\`). The enemy-only
> \`call-for-help\` and \`cover\` are actions, not moves anyone learns.
>
> **Reading the columns.** \`Role\` Off/Def/Util (Def drives the §3.3.1 defensive-swap discount). \`Rng\` Melee
> (Lead-only unless Step-Forward) / Ranged (any slot, ×0.75). \`Mod\` SF/SB (Melee only). \`Tgt\` cleave (every
> slot, never fizzles) / backstrike (a declared bench slot, fizzles if empty). \`cd\` an enemy-side cooldown (§5.3).
>
> **Power budget — a contract, enforced by a content test (§6.3.6.4).**
>
> | AP | Melee power | Ranged power | Notes |
> |---|---|---|---|
> | 0 | — | — | utility only |
> | 1 | 40–50 | 45–55 | the workhorse |
> | 2 | 60–75 | 65–90 | a rider or a modifier costs ~10 power |
> | 3 | 85–100 | 90–100 | |
> | 4 | 110–130 | 115–130 | the ultimate |
>
> A move with both a modifier and a rider sits at the foot of its band; Gen I's high-critical moves (Karate Chop,
> Razor Leaf, Crabhammer, Slash) crit every time and pay for it there. Cleave (×~1.6), recoil, a rampage's
> self-Confusion and a sacrifice are budgeted apart; Mastery tiers have their own bands (\`mastery-moves.md\`).
>
> **Accuracy is a rider.** The sim never misses, so a Gen I status move's accuracy is its chance: Sing and
> Supersonic 55 %, Hypnosis 60 %, the powders and Glare 75 %, Toxic 85 %, Thunder Wave and Confuse Ray certain.
> Sand Attack, Smokescreen, Kinesis and Flash, which lowered accuracy, lower Attack.

## 0. What is in the build

| Set | Moves |
|---|---|
| Gen I moves | ${base.length} of the 165 |
| Made better (+) | ${plus.length} |
| Mastery tiers (+, ++) | ${tiers.length} |
| Enemy actions | 2 |
| **Total in \`moves.json\`** | **${moves.length}** |

Not in the game: the Gen I moves no rule here can express — Whirlwind and Roar's escape, Bide, Counter's exact
return, Mimic, Metronome's lottery, Mirror Move's copy, Substitute, Conversion's retype, Teleport, Struggle — keep
their names on simpler cards where one fits the line (Metronome draws two, Mirror Move raises Attack and draws,
Conversion raises both stats, Whirlwind and Teleport draw), and the rest are absent.

## 1. Gen I moves

${types.map((t) => `### ${cap(t)}\n\n${HEAD}\n${base.filter((m) => m.type === t).map(row).join('\n')}\n`).join('\n')}
## 2. Made better (+)

What a first or final evolution upgrades a card into, derived from its move: more power within its band, or a
stronger rider when the band is full; a utility's stage, chance, heal or draw one step further.

${HEAD}
${plus.map(row).join('\n')}

## 3. Mastery tiers

The Lv2 (+) and Lv3 (++) of each line's Mastery (\`mastery-moves.md\`): 2 AP and 100, 3 AP and 130, the Lv1 move's
riders kept.

${HEAD}
${tiers.map(row).join('\n')}

## 4. Enemy-only actions (v0.8.2, §5.6.2)

${HEAD}
${moves.filter((m) => m.id === 'call-for-help' || m.id === 'cover').map(row).join('\n')}

## 5. Retired in v0.9.5

Every move that was not Gen I, and what took its place wherever it was named — a tutor list, an egg move, a trainer's
kit. The kits themselves were rewritten line by line (\`species-r1.md\`, \`species-r2.md\`, \`species-gen1.md\`).

| id | Became |
|---|---|
${Object.entries(REMAP).map(([a, b]) => `| \`${a}\` | \`${b}\` |`).join('\n')}

## 6. Design rules for authoring a new move

1. **It is a Gen I move, or one of them made better.** A line whose type runs out of Gen I moves climbs by **+**.
2. **Every kit is playable from its likely position.** At least one Ranged card unless the species is a Lead
   anchor (\`machop\`'s line, \`pinsir\`, \`snorlax\`) — a content test walks every branch path.
3. **A 0-AP move is never strictly better than doing nothing**: stat stages decay, a draw costs the card it is.
4. **A rider chance is a number the player sees** (§9.2.3); a Gen I accuracy becomes that number.
5. **Multi-hit is deterministic**: it states its hit count, never rolls it.
6. **Cooldowns are enemy-side only.**
`;
writeFileSync(`${ROOT}/docs/design/catalogs/moves.md`, doc);

// ── mastery-moves.md: the table and the head ──
let mm = readFileSync(`${ROOT}/docs/design/catalogs/mastery-moves.md`, 'utf8');
const tableStart = mm.indexOf('| Line | Lv1 (base)');
const tableEnd = mm.indexOf('\n\n', tableStart);
const table = `| Line | Lv1 (base) | Lv2 (stage 1 / final of 2-stage) | Lv3 (3-stage final) |\n|---|---|---|---|\n${Object.entries(mastery).map(([l, t]) => `| \`${l}\` | ${t.map((x) => (x ? `\`${x}\`` : '—')).join(' | ')} |`).join('\n')}`;
mm = mm.slice(0, tableStart) + table + mm.slice(tableEnd);
mm = mm.replace(/^# Mastery Move catalog — \d+ lines/m, `# Mastery Move catalog — ${Object.keys(mastery).length} lines`);
mm = mm.replace(
  /> \*\*Power targets \(§6\.8\.4\):\*\*[^\n]*\n> [^\n]*\n/,
  `> **Every tier is a Gen I move (v0.9.5).** Lv1 is the move itself, at its own numbers; Lv2 is its **+** at 2 AP and\n> 100 power, Lv3 its **++** at 3 AP and 130, the riders kept (a Super Fang tier takes 65 % and 80 % of HP). A line's\n> Mastery is never a card its kit can otherwise hold — a content test walks every branch path.\n`,
);
writeFileSync(`${ROOT}/docs/design/catalogs/mastery-moves.md`, mm);

// ── species catalogs: the learnset cell, the evolution rows, the tutor and Mastery segments ──
const ARCH = { Vanguard: 'vanguard', Specialist: 'specialist', Support: 'support' };
const learn = (s) => (s.learnset.length ? s.learnset.map((l) => `${l.level} \`${l.move}\``).join(' · ') : '— *(its base form\'s kit, rewritten by evolution)*');
const payload = (b) =>
  `**${b.label}** — ${[...b.upgrades.map((u) => `\`${u.from}\` → \`${u.to}\``), ...b.adds.map((a) => `**+\`${a}\`**`)].join(' · ')}${b.abilityId ? ` · grants \`${b.abilityId}\`` : ''}`;
for (const f of ['species-r1.md', 'species-r2.md', 'species-gen1.md', 'species-pool-r2-r3.md']) {
  const path = `${ROOT}/docs/design/catalogs/${f}`;
  const lines = readFileSync(path, 'utf8').split('\n');
  let header = null;
  let base = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const h = l.match(/^\| Evolution \|(.*)\|$/);
    if (h) { header = h[1].split('|').map((x) => x.trim()); continue; }
    const ev = l.match(/^\| → `([a-z-]+)` \|/);
    if (ev && header) {
      const to = ev[1];
      const from = S.find((s) => (s.branches ?? []).some((b) => b.to === to) && (!base || lineOf(s.id) === base)) ?? S.find((s) => (s.branches ?? []).some((b) => b.to === to));
      if (from) lines[i] = `| → \`${to}\` | ${header.map((a) => { const b = from.branches.find((x) => x.to === to && x.archetype === ARCH[a]); return b ? payload(b) : '—'; }).join(' | ')} |`;
      continue;
    }
    const sr = l.match(/^\| `([a-z-]+)` \| \d+ \|/);
    if (sr && byId.has(sr[1]) && l.split('|').length > 8) {
      const s = byId.get(sr[1]);
      base = lineOf(s.id);
      const cells = l.split('|');
      cells[cells.length - 2] = ` ${learn(s)} `;
      lines[i] = cells.join('|');
      continue;
    }
    if (/\*\*(Tutor|Mastery)\*\*/.test(l) && base) {
      const stages = S.filter((s) => lineOf(s.id) === base);
      let t = l.replace(/\*\*Tutor\*\* .*?(?= · \*\*[A-Z]|$)/, `**Tutor** ${stages.map((s) => `${s.name}: ${s.tutorMoves.map((x) => `\`${x}\``).join(' ') || '—'}`).join(' · ')}`);
      t = t.replace(/\*\*Mastery\*\* .*?(?= · \*\*[A-Z]|$)/, `**Mastery** ${(mastery[base] ?? []).filter(Boolean).map((x) => `\`${x}\``).join(' → ') || '—'}`);
      lines[i] = t;
    }
  }
  writeFileSync(path, lines.join('\n'));
}
function lineOf(id) {
  let cur = id;
  for (;;) {
    const pre = S.find((s) => s.evolvesTo.includes(cur));
    if (!pre) return cur;
    cur = pre.id;
  }
}
console.log('docs written');
