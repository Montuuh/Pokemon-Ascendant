#!/usr/bin/env node
// PostToolUse hook (Edit | Write | MultiEdit) — the cheap checks, run on the file that just changed.
//
// Each one takes well under a second, so a broken invariant is reported at the edit that broke it instead of at
// the next `npm run check`. Exit 2 hands the findings to Claude; the edit itself has already happened.
//
//   src/content/data/*.json      the file still parses
//   src/sim/**/*.ts              the sim stays pure: no ambient randomness or clock, no DOM, no import from
//                                src/ui, src/app or src/dev (.claude/rules/sim.md)
//   docs/**, src/**, CLAUDE.md,  every § citation resolves (scripts/check-refs.mjs)
//   .claude/**
//   docs/design/catalogs/**      every referenced content id is defined (scripts/check-catalogs.mjs)
//   docs/session/active.md       stays within its 30 lines (CLAUDE.md, Workflow)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const raw = input?.tool_input?.file_path ?? input?.tool_input?.path ?? '';
if (!raw) process.exit(0);
const abs = resolve(String(raw));
const rel = relative(ROOT, abs).split(sep).join('/');
if (rel.startsWith('..') || !existsSync(abs)) process.exit(0);

const findings = [];
const read = () => readFileSync(abs, 'utf8');

if (/^src\/content\/data\/.+\.json$/.test(rel)) {
  try {
    JSON.parse(read());
  } catch (e) {
    findings.push(`${rel} no longer parses as JSON: ${e.message}`);
  }
}

if (/^src\/sim\/.+\.ts$/.test(rel)) {
  const BANS = [
    [/\bMath\.random\b/, 'Math.random: use a GameRng from RngStreams'],
    [/\bDate\.now\b|\bnew Date\(|\bperformance\.now\b/, 'wall clock: time is an input to the sim'],
    [/\b(window|document|localStorage)\./, 'DOM / browser global in the sim'],
    [
      /from\s+['"](?:\.\.\/)+(?:ui|app|dev)\/|from\s+['"]@?\/?(?:src\/)?(?:ui|app|dev)\//,
      'import from ui/app/dev: the sim depends on nothing above it',
    ],
  ];
  read()
    .split('\n')
    .forEach((line, i) => {
      const code = line.trim();
      if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
      for (const [re, why] of BANS) if (re.test(code)) findings.push(`${rel}:${i + 1} ${why}`);
    });
}

const run = (script, label) => {
  const r = spawnSync(process.execPath, [`scripts/${script}`, '--strict'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0 || r.status === null) return;
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-12).join('\n');
  findings.push(
    `${label} fails after this edit (if the other half of the change is your next edit, carry on):\n${tail}`,
  );
};

const citesCanon = /^(docs\/.+\.md|CLAUDE\.md|\.claude\/.+\.md|src\/.+\.(ts|tsx))$/.test(rel);
if (citesCanon && existsSync(resolve(ROOT, 'scripts/check-refs.mjs')))
  run('check-refs.mjs', 'npm run check:refs');
if (/^docs\/design\/catalogs\/.+\.md$/.test(rel) && existsSync(resolve(ROOT, 'scripts/check-catalogs.mjs'))) {
  run('check-catalogs.mjs', 'npm run check:catalogs');
}

if (rel === 'docs/session/active.md') {
  const lines = read().trimEnd().split('\n').length;
  if (lines > 30)
    findings.push(`${rel} is ${lines} lines; the limit is 30. Fold older entries into the roadmap.`);
}

if (findings.length === 0) process.exit(0);
process.stderr.write(`post-edit checks (.claude/hooks/post-edit.mjs):\n- ${findings.join('\n- ')}\n`);
process.exit(2);
