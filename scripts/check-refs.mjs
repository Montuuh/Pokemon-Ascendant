#!/usr/bin/env node
// Every §N.N reference anywhere in the repo must resolve to a real heading in docs/design/NN-*.md.
// § numbers are an API cited from code and tests; this is the guard that keeps them honest.
//
//   node scripts/check-refs.mjs            → report
//   node scripts/check-refs.mjs --strict   → exit 1 on any dangling reference
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CANON_DIR = 'docs/design';
const REF = /§(\d+(?:\.\d+)+)/g;

// ── every § that canon defines as a heading
const defined = new Set();
for (const f of readdirSync(CANON_DIR).filter((n) => /^\d\d-.*\.md$/.test(n))) {
  for (const line of readFileSync(join(CANON_DIR, f), 'utf8').split('\n')) {
    const m = /^#{1,6}\s+§(\d+(?:\.\d+)+)/.exec(line.trim());
    if (m) defined.add(m[1]);
  }
}
// a reference to a parent of a defined section is valid (§4.2 when §4.2.1 exists)
for (const id of [...defined]) {
  const parts = id.split('.');
  while (parts.length > 2) { parts.pop(); defined.add(parts.join('.')); }
}

// ── every § anyone cites
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', 'dist', 'playtest'].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(md|ts|tsx|mjs|json|html|css)$/.test(name)) files.push(p);
  }
};
for (const d of ['src', 'docs', 'e2e', 'scripts', '.claude']) walk(d);
files.push('CLAUDE.md', 'README.md');

const dangling = new Map(); // ref -> Set<file>
let total = 0;
for (const f of files) {
  for (const [, id] of readFileSync(f, 'utf8').matchAll(REF)) {
    total++;
    if (defined.has(id)) continue;
    if (!dangling.has(id)) dangling.set(id, new Set());
    dangling.get(id).add(f.replace(/\\/g, '/'));
  }
}

console.log(`refs: ${defined.size} sections defined · ${total} citations checked`);
if (dangling.size === 0) {
  console.log('✅ every § reference resolves');
  process.exit(0);
}
console.log(`\n⚠ ${dangling.size} dangling reference(s):\n`);
for (const [id, where] of [...dangling].sort())
  console.log(`  §${id.padEnd(10)} cited in ${[...where].slice(0, 4).join(', ')}${where.size > 4 ? ` (+${where.size - 4})` : ''}`);
process.exit(process.argv.includes('--strict') ? 1 : 0);
