#!/usr/bin/env node
// v0.9.90 (§6.2.4, §6.3.7) — the species catalogues' Evolves and Learnset cells, written from species.json now that the
// levels are the series' and a line evolves by its method: a level, a stone, a held item it levels up with, Friendship.
// Idempotent: every run rewrites the same cells from the data. Usage: node scripts/v0990-catalogs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (f) => JSON.parse(readFileSync(resolve(ROOT, f), 'utf8'));
const S = read('src/content/data/species.json').species;
const ITEMS = read('src/content/data/evolution-items.json').items;
const HELD = read('src/content/data/held-items.json').items;
const byId = new Map(S.map((s) => [s.id, s]));
const heldName = (id) => HELD.find((h) => h.id === id)?.name ?? id;

/** The Evolves cell: how and when, then where. */
function evolves(s) {
  const to = s.evolvesTo.length > 1 ? `one of ${s.evolvesTo.map((t) => `\`${t}\``).join(' / ')}` : `\`${s.evolvesTo[0]}\``;
  const methods = new Set(s.branches.map((b) => b.by ?? s.evolveBy ?? 'level'));
  const parts = [];
  if (methods.has('level')) parts.push(`**L${s.evolveLevel}**`);
  if (methods.has('stone')) {
    const uses = ITEMS.flatMap((i) => i.uses.filter((u) => u.species === s.id).map((u) => ({ name: i.name, from: u.fromLevel })));
    const names = uses.map((u) => u.name.replace(/ Stone$/, ''));
    parts.push(`**${names.join(' / ')} Stone** (from L${Math.min(...uses.map((u) => u.from))})`);
  }
  if (methods.has('held-item')) parts.push(`**a level-up holding \`${s.evolveItem}\`** (${heldName(s.evolveItem)})`);
  if (methods.has('friendship')) parts.push('**a level-up at Friendship 220** (`umbreon`)');
  const npc = methods.has('level') ? '' : `; trainers field it from L${s.evolveLevel}`;
  return `${parts.join(', or ')} → ${to}${npc}`;
}

// v0.9.91 (§6.9.1) — a track's row names the move whose slot it takes.
const learnset = (s) => (s.learnset.length ? s.learnset.map((l) => `${l.level} \`${l.move}\`${l.replaces ? ` (← \`${l.replaces}\`)` : ''}`).join(' · ') : '—');

let changed = 0;
for (const file of ['docs/design/catalogs/species-gen1.md', 'docs/design/catalogs/species-r1.md', 'docs/design/catalogs/species-r2.md']) {
  const path = resolve(ROOT, file);
  const text = readFileSync(path, 'utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  let cols = null;
  const out = text.split(/\r?\n/).map((line) => {
    if (!line.startsWith('|')) { cols = line.trim() === '' ? cols : cols; return line; }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const ev = cells.findIndex((c) => /^evolves$/i.test(c));
    const ls = cells.findIndex((c) => /^learnset$/i.test(c));
    if (ev >= 0 || ls >= 0) { cols = { ev, ls }; return line; }
    const id = /^`([a-z0-9-]+)`$/.exec(cells[0] ?? '')?.[1];
    const s = id && byId.get(id);
    if (!s || !cols) return line;
    const next = [...cells];
    if (cols.ev >= 0 && s.evolvesTo.length) next[cols.ev] = evolves(s);
    if (cols.ls >= 0) next[cols.ls] = learnset(s);
    if (next.join('|') === cells.join('|')) return line;
    changed++;
    return `| ${next.join(' | ')} |`;
  });
  writeFileSync(path, out.join(nl));
}
console.log(`${changed} catalogue rows rewritten`);
