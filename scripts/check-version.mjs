#!/usr/bin/env node
// The release doctrine's guard (docs/release-doctrine.md): every place the active version is written agrees
// with package.json. Run by `npm run check`, so a version cannot ship half-stamped.
//
//   package.json          "version" — the build reads it (menu pill, About, What's new)
//   package-lock.json     its two "version" fields, kept equal to package.json
//   CHANGELOG.md          the newest dated entry is this version (the What's new screen reads the file)
//   docs/roadmap.md       the version is marked ✅ with the changelog's date (a table row for vX.Y, a heading
//                         for vX.Y.Z); the About screen reads the table
//   README.md             the Status line names it
//   docs/session/active.md  the session header names it
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const pkg = JSON.parse(read('package.json')).version;
const [maj, min, pat] = pkg.split('.').map(Number);
// 0.6.0 is the roadmap's v0.6; 0.7.3 is v0.7.3.
const tag = pat === 0 ? `v${maj}.${min}` : `v${pkg}`;

// 1 — the lockfile.
const lock = JSON.parse(read('package-lock.json'));
if (lock.version !== pkg) fail('package-lock.json', `"version" is ${lock.version}, package.json says ${pkg} (run \`npm install --package-lock-only\`)`);
if (lock.packages?.['']?.version !== pkg) fail('package-lock.json', `packages[""].version is ${lock.packages?.['']?.version}, package.json says ${pkg}`);

// 2 — the changelog: the newest entry with a date is this version.
const HEADING = /^#{2,3} (v\d+\.\d+(?:\.\d+)?) — .+? · (\d{4}-\d{2}-\d{2}|in progress)\s*$/;
const key = (v) => v.replace(/^v/, '').split('.').map(Number);
const cmp = (a, b) => {
  const [x, y] = [key(a), key(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  return 0;
};
const entries = read('CHANGELOG.md')
  .split('\n')
  .map((l) => HEADING.exec(l.trimEnd()))
  .filter(Boolean)
  .map((m) => ({ version: m[1], date: m[2] === 'in progress' ? null : m[2] }));
const shipped = entries.filter((e) => e.date).sort((a, b) => cmp(a.version, b.version));
const latest = shipped[0];
if (!latest) fail('CHANGELOG.md', 'no dated entry');
else if (latest.version !== tag) fail('CHANGELOG.md', `the newest dated entry is ${latest.version}, package.json says ${tag}`);
const date = latest?.version === tag ? latest.date : null;

// 3 — the roadmap marks it shipped, on the same day.
const roadmap = read('docs/roadmap.md');
const esc = tag.replace(/\./g, '\\.');
const mark = pat === 0
  ? new RegExp(`^\\| ${esc} \\|.*\\| ✅ (\\d{4}-\\d{2}-\\d{2})`, 'm')
  : new RegExp(`^#{2,3} ${esc} — .*✅ (\\d{4}-\\d{2}-\\d{2})`, 'm');
const r = mark.exec(roadmap);
if (!r) fail('docs/roadmap.md', `${tag} is not marked ✅ with a date (${pat === 0 ? 'its summary-table row' : 'its heading'})`);
else if (date && r[1] !== date) fail('docs/roadmap.md', `${tag} shipped ${r[1]}, CHANGELOG.md says ${date}`);

// 4 — the README's status line, 5 — the session header.
if (!read('README.md').includes(`**${tag} `)) fail('README.md', `the Status line does not name **${tag}`);
if (!new RegExp(`${esc}\\b`).test(read('docs/session/active.md'))) fail('docs/session/active.md', `the header does not name ${tag}`);

if (failures.length) {
  console.error(`version: ${tag} is not stamped everywhere (docs/release-doctrine.md):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`version: ${tag} — package.json, lockfile, CHANGELOG, roadmap, README and session agree`);
console.log('✅ the active version is stamped everywhere');
