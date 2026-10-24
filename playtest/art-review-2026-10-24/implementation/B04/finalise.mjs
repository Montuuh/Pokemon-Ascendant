import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const out = import.meta.dirname;
const candidate = readFileSync(join(out, 'exact-export-path.txt'), 'utf8').trim();
const releaseFiles = ['package.json', 'package-lock.json', 'CHANGELOG.md', 'README.md', 'docs/roadmap.md', 'docs/session/active.md'];
// Clean release paths were explicitly released by B03. Refuse to overwrite new external edits.
for (const file of releaseFiles) {
  if (execFileSync('git', ['diff', 'HEAD', '--', file], { encoding: 'utf8' }).trim()) throw new Error(`Release ownership conflict: ${file}`);
}
for (const file of releaseFiles) writeFileSync(file, readFileSync(join(candidate, file)));
const queue = readFileSync('.claude/state/ui-pending.txt');
if (!queue.equals(readFileSync(join(out, 'initial-pending-queue.txt')))) throw new Error('External review queue changed; do not clear it');
const sha = createHash('sha256').update(queue).digest('hex');
writeFileSync(join(out, 'queue-preservation.json'), JSON.stringify({ sha256Before: sha, sha256After: sha, entries: queue.toString().trim().split(/\r?\n/).length, globalClearHookRun: false, scope: 'B04 only; all external A02/A03/results entries preserved' }, null, 2) + '\n');
const scoped = `B04 only: independently reviewed by GPT-6.1 Sol/high, Ship. See playtest/art-review-2026-10-24/implementation/B04/review.md. Source and exact-release checks passed. All 18 external A02/A03/results entries remain pending; no global approval or queue clearance.\n`;
writeFileSync('.claude/state/ui-b04-review.md', scoped);
writeFileSync('.claude/state/ui-b04-reviewed', new Date().toISOString() + '\n');
writeFileSync('.claude/state/ui-skip', `Deferred by explicit user scope: all 18 pending paths belong to A02/A03/results work. Do not clear or approve that queue. ${scoped}`);
const exactEvidence = join(candidate, 'playtest/art-review-2026-10-24/implementation/B04');
const exactOut = join(out, 'release-exact');
mkdirSync(exactOut, { recursive: true });
for (const file of readdirSync(exactEvidence)) {
  if (file.endsWith('-pixels.json') || file.endsWith('-150.png') || file.endsWith('-a.png')) writeFileSync(join(exactOut, file), readFileSync(join(exactEvidence, file)));
}
console.log(`Six release files copied; ${sha} external queue preserved; exact captures retained.`);
