#!/usr/bin/env node
// PostToolUse hook (Edit | Write | MultiEdit) — queues every edited UI file for the UI review.
//
// Reads the hook payload on stdin, and if the file is under src/ui or src/app (tsx, ts or css), appends it to
// .claude/state/ui-pending.txt (deduplicated) and prints a one-line reminder. The Stop hook (ui-stop.mjs)
// reads the same queue; the ui-review skill clears it (ui-clear.mjs). See docs/design/ui-doctrine.md.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const STATE = resolve(ROOT, '.claude/state');
const QUEUE = resolve(STATE, 'ui-pending.txt');

let payload = '';
try {
  payload = readFileSync(0, 'utf8');
} catch {
  process.exit(0);
}
let input = {};
try {
  input = JSON.parse(payload || '{}');
} catch {
  process.exit(0);
}
const raw = input?.tool_input?.file_path ?? input?.tool_input?.path ?? '';
if (!raw) process.exit(0);
const rel = relative(ROOT, resolve(raw)).split(sep).join('/');
const isUi = /^src\/(ui|app)\/.+\.(tsx|ts|css)$/.test(rel) && !/\.test\.tsx?$/.test(rel);
if (!isUi) process.exit(0);

mkdirSync(STATE, { recursive: true });
const have = existsSync(QUEUE) ? readFileSync(QUEUE, 'utf8').split('\n').filter(Boolean) : [];
if (!have.includes(rel)) appendFileSync(QUEUE, rel + '\n');
// A new UI change supersedes any earlier deferral.
if (existsSync(resolve(STATE, 'ui-skip'))) writeFileSync(resolve(STATE, 'ui-skip'), '');
const n = have.includes(rel) ? have.length : have.length + 1;
console.log(`ui-review: ${rel} queued (${n} UI file${n === 1 ? '' : 's'} pending). Run the ui-review skill before closing the task.`);
