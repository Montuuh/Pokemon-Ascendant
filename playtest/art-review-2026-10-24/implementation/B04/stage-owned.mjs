import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const out = import.meta.dirname;
const root = join(out, '../../../..');
const candidate = readFileSync(join(out, 'exact-export-path.txt'), 'utf8').trim();
const source = JSON.parse(readFileSync(join(candidate, 'b04-owned-files.json'), 'utf8'));
const releases = ['package.json', 'package-lock.json', 'CHANGELOG.md', 'README.md', 'docs/roadmap.md', 'docs/session/active.md'];
const owned = [...source, ...releases];
for (const file of owned) {
  if (!readFileSync(file).equals(readFileSync(join(candidate, file)))) throw new Error(`Verified candidate mismatch: ${file}`);
}
const prior = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
const evidence = readdirSync(out, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => relative(root, join(entry.parentPath, entry.name)).replaceAll('\\', '/')).filter((file) => {
  const name = relative(out, join(root, file)).replaceAll('\\', '/');
  return !/^(traces|verified-traces|shot-traces|shot)\//.test(name)
    && !/-(110|170|230)\.png$/.test(name)
    && !/^staged-/.test(name);
});
const files = [...new Set([...owned, ...evidence, 'playtest/art-review-2026-10-24/implementation/B04/staged-files.json'])].sort();
if (prior.some((file) => !files.includes(file))) throw new Error('External files in shared index; coordinate ownership before staging');
writeFileSync(join(out, 'staged-files.json'), JSON.stringify(files, null, 2) + '\n');
for (let i = 0; i < files.length; i += 40) execFileSync('git', ['add', '-f', '--', ...files.slice(i, i + 40)], { stdio: 'pipe' });
const actual = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' }).trim().split(/\r?\n/).sort();
if (JSON.stringify(actual) !== JSON.stringify(files)) throw new Error('Staged boundary mismatch');
// CLI logs retain their original whitespace as evidence. Check product/release files strictly.
execFileSync('git', ['diff', '--cached', '--check', '--', ...owned.filter((file) => !file.endsWith('.png'))], { stdio: 'inherit' });
execFileSync('git', ['diff', '--cached', `--output=${join(out, 'staged-b04.patch')}`]);
console.log(`Verified and staged only ${files.length} B04 source, release and evidence files.`);
