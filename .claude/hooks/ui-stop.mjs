#!/usr/bin/env node
// Stop hook — the gate: the turn does not end with UI files changed and unreviewed.
//
// If .claude/state/ui-pending.txt lists files newer than the last review stamp, answer {decision: "block"} with
// the list, once (Claude Code sets stop_hook_active on the retry, and we let that one through so the loop
// cannot spin). A deliberate deferral is a non-empty .claude/state/ui-skip, which passes once and is consumed.
import { existsSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const STATE = resolve(ROOT, '.claude/state');
const QUEUE = resolve(STATE, 'ui-pending.txt');
const STAMP = resolve(STATE, 'ui-reviewed');
const SKIP = resolve(STATE, 'ui-skip');

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  /* no payload: allow */
}
if (input.stop_hook_active) process.exit(0);
if (!existsSync(QUEUE)) process.exit(0);
const pending = readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean);
if (pending.length === 0) process.exit(0);
const queuedAt = statSync(QUEUE).mtimeMs;
const reviewedAt = existsSync(STAMP) ? statSync(STAMP).mtimeMs : 0;
if (reviewedAt >= queuedAt) process.exit(0);
if (existsSync(SKIP) && readFileSync(SKIP, 'utf8').trim()) {
  // Deferred on purpose, once.
  unlinkSync(SKIP);
  process.exit(0);
}
const reason = [
  `UI review pending: ${pending.length} UI file${pending.length === 1 ? '' : 's'} changed since the last review —`,
  pending.map((f) => `  · ${f}`).join('\n'),
  'Run the ui-review skill now (npm run ui:audit → ui-reviewer agent → fix → node .claude/hooks/ui-clear.mjs),',
  'or defer on purpose with a reason: echo "<why>" > .claude/state/ui-skip — and tell the user.',
].join('\n');
process.stdout.write(JSON.stringify({ decision: 'block', reason }));
