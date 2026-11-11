#!/usr/bin/env node
// Stop hook — the slop gate: a turn that wrote player-facing text does not end before that text is read once
// against the slop-remover skill (.claude/skills/slop-remover/SKILL.md).
//
// Runs the scanner on what this change wrote (vs HEAD) and only on its strongest patterns (weight 3: dev and
// roadmap leaks, narration of the interface, AI vocabulary, reassurance, a long block on a base screen). With
// findings it answers {decision: "block"} once, with the list; Claude Code sets stop_hook_active on the retry and
// that one passes, so the loop cannot spin and a finding judged a Keep costs one look, not a wall.
// Silent and fast when nothing player-facing changed.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  /* no payload */
}
if (input.stop_hook_active) process.exit(0);

const git = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
const touched = [
  ...git('diff', '--name-only', 'HEAD').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard').split('\n'),
];
const COPY = /^(src\/(ui|app|sim)\/.+\.tsx?|src\/content\/data\/.+\.json|CHANGELOG\.md)$/;
if (!touched.some((f) => COPY.test(f) && !/\.test\.tsx?$/.test(f))) process.exit(0);

const scan = spawnSync(
  process.execPath,
  ['.claude/skills/slop-remover/slop-scan.mjs', '--changed', '--min', '3', '--hook'],
  {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  },
);
const findings = (scan.stdout ?? '').split('\n').filter(Boolean);
if (scan.status !== 0 || findings.length === 0) process.exit(0);

const reason = [
  `slop-remover: this change wrote ${findings.length} player-facing string(s) that trip a strong slop pattern.`,
  'Read each where the player meets it and apply .claude/skills/slop-remover/SKILL.md (Cut / Shorten / Move / Keep).',
  'A deliberate Keep is fine: say why in the report. This gate passes on the next stop.',
  ...findings.slice(0, 20).map((f) => `- ${f}`),
  ...(findings.length > 20
    ? [
        `… and ${findings.length - 20} more (node .claude/skills/slop-remover/slop-scan.mjs --changed --min 3)`,
      ]
    : []),
].join('\n');
process.stdout.write(JSON.stringify({ decision: 'block', reason }));
process.exit(0);
