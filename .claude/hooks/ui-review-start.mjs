#!/usr/bin/env node
// Marks a UI review in flight: the ui-reviewer runs in the background, so the turn that launched it ends before its
// verdict lands. The Stop hook lets that turn end while this marker covers every queued edit (it was written after
// them) and is fresh (under an hour); an edit made after it is not under review, so the gate closes again.
// ui-clear.mjs removes it with the review stamp. Usage: node .claude/hooks/ui-review-start.mjs "<what is reviewed>"
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE = resolve(import.meta.dirname, '../../.claude/state');
mkdirSync(STATE, { recursive: true });
const what = process.argv.slice(2).join(' ').trim() || 'UI review';
writeFileSync(resolve(STATE, 'ui-review-running'), `${new Date().toISOString()} ${what}\n`);
console.log(`ui-review: in flight — ${what}. The Stop hook lets the turn end until the verdict, or until an edit outruns it.`);
