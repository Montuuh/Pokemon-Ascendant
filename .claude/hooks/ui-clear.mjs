#!/usr/bin/env node
// Marks the UI review done: stamps .claude/state/ui-reviewed and empties the pending queue. Run by the
// ui-review skill after the reviewer's findings are fixed and re-measured — never before.
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE = resolve(import.meta.dirname, '../../.claude/state');
mkdirSync(STATE, { recursive: true });
// The review in flight (ui-review-start.mjs) has landed.
// unlinkSync, not rmSync({ force }): on this Windows checkout the latter left the file in place without an error.
const RUNNING = resolve(STATE, 'ui-review-running');
if (existsSync(RUNNING)) unlinkSync(RUNNING);
writeFileSync(resolve(STATE, 'ui-pending.txt'), '');
writeFileSync(resolve(STATE, 'ui-reviewed'), new Date().toISOString() + '\n');
console.log('ui-review: cleared — queue empty, review stamped.');
