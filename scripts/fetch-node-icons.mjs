#!/usr/bin/env node
// Fetch the Region map's node glyphs from game-icons.net (CC BY 3.0 — every author is credited in
// docs/art/ATTRIBUTION.md). The raw files carry a black background rect and a white shape; we drop the rect
// and switch the shape to currentColor so one file can be tinted per node state from CSS.
// Usage: npm run art:nodes [-- --force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../public/art/icons/map');
const force = process.argv.includes('--force');

// local name → [author, game-icons id]  — the author is the CC BY attribution, keep it with the file.
export const ICONS = {
  'node-wild': ['delapouite', 'grass'],
  'node-trainer': ['lorc', 'crossed-swords'],
  'node-gym': ['lorc', 'stone-tower'],
  // v0.4 nodes. The Elite is a sharper blade than a Trainer's crossed swords; the Shop is a shop; the
  // Mystery is deliberately the vaguest glyph in the set, because that is what the node is.
  'node-elite': ['lorc', 'sword-brandish'],
  'node-mystery': ['lorc', 'perspective-dice-six-faces-random'],
  'node-cleared': ['delapouite', 'check-mark'],
  'node-locked': ['lorc', 'padlock'],
  'node-current': ['delapouite', 'position-marker'],
  'biome-meadow': ['lorc', 'pine-tree'],
  'biome-cave': ['delapouite', 'cave-entrance'],
  'biome-river': ['lorc', 'water-splash'],
  badge: ['lorc', 'trophy'],
  route: ['delapouite', 'path-distance'],
};

const url = (author, id) => `https://raw.githubusercontent.com/game-icons/icons/master/${author}/${id}.svg`;
const exists = async (p) => access(p).then(() => true, () => false);

/** Strip the opaque background rect and make the glyph inherit its colour. */
function recolour(svg, author, id) {
  const out = svg
    .replace(/<path d="M0 0h512v512H0z"\s*\/>/, '')
    .replace(/fill="#fff"/g, 'fill="currentColor"')
    .replace('<svg ', '<svg fill="currentColor" ');
  return `<!-- game-icons.net — ${id} by ${author}, CC BY 3.0 -->\n${out}`;
}

await mkdir(OUT, { recursive: true });
let ok = 0, skip = 0, fail = 0;
for (const [local, [author, id]] of Object.entries(ICONS)) {
  const dest = resolve(OUT, `${local}.svg`);
  if (!force && (await exists(dest))) { skip++; console.log(`skip ${local}`); continue; }
  try {
    const res = await fetch(url(author, id));
    if (!res.ok) throw new Error(String(res.status));
    await writeFile(dest, recolour(await res.text(), author, id), 'utf8');
    ok++; console.log(`ok   ${local}  (${author}/${id})`);
  } catch (e) {
    fail++; console.log(`FAIL ${local}: ${e.message}`);
  }
}
console.log(`\n${ok} downloaded, ${skip} skipped, ${fail} failed`);
process.exit(fail ? 1 : 0);
