#!/usr/bin/env node
// PreToolUse hook (Edit | Write | MultiEdit | NotebookEdit | Bash | PowerShell) — the guard rail.
//
// Refuses the handful of actions this project has already paid for, before they run. Exit 2 blocks the call and
// hands the reason back to Claude; anything else passes.
//
//   Files   .env (secrets — the user edits it) · package-lock.json (npm writes it) · ../ProjectAscendant (the
//           Unity project is a read-only reference, CLAUDE.md).
//   Git     the folder is shared with other sessions (docs/session/standing-facts.md, "Working in a shared
//           folder"): no blind staging (`git add -A`, `git add .`, `git commit -a`), nothing that throws away or
//           hides a working tree other agents are editing (`reset --hard`, `clean -f`, `checkout/restore .`,
//           `stash`), never force, never `--no-verify`, and no attribution lines in a commit message.
import { readFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const tool = input.tool_name ?? '';
const ti = input.tool_input ?? {};

const deny = (why) => {
  process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${why}\n`);
  process.exit(2);
};

if (tool === 'Bash' || tool === 'PowerShell') {
  const raw = String(ti.command ?? '');
  if (!/\bgit\b/.test(raw)) process.exit(0);
  // Flags are read with quoted strings blanked, so a commit message that mentions "-a" is not a flag.
  const cmd = raw.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
  const END = '(?=\\s|$|;|&|\\|)';
  const SEG = '[^\\n;&|]*';
  const rules = [
    [
      new RegExp(`\\bgit\\s+add\\b${SEG}\\s(-A|--all|-u|--update|\\.)${END}`),
      'stage by path. Other sessions edit this tree; `git add -A` / `git add .` sweeps their files into your commit.',
    ],
    [
      new RegExp(`\\bgit\\s+commit\\b${SEG}\\s(-[a-zA-Z]*a[a-zA-Z]*|--all)${END}`),
      '`git commit -a` commits files you did not stage. Stage by path, read `git diff --cached --stat`, then commit.',
    ],
    [
      new RegExp(`\\bgit\\s+(commit|push|merge)\\b${SEG}\\s--no-verify${END}`),
      'never skip hooks with --no-verify.',
    ],
    [
      new RegExp(`\\bgit\\s+push\\b${SEG}\\s(--force\\S*|-[a-zA-Z]*f[a-zA-Z]*)${END}`),
      'never force-push (CLAUDE.md, Workflow).',
    ],
    [
      new RegExp(`\\bgit\\s+reset\\b${SEG}\\s--hard${END}`),
      "`git reset --hard` discards other sessions' uncommitted work. Unstage with `git reset -- <path>` instead.",
    ],
    [
      new RegExp(`\\bgit\\s+clean\\b${SEG}\\s-[a-zA-Z]*f`),
      '`git clean -f` deletes untracked files that belong to other sessions.',
    ],
    [
      new RegExp(`\\bgit\\s+(checkout|restore)\\b${SEG}\\s\\.${END}`),
      "restoring the whole tree discards other sessions' work. Name the file(s) that are yours.",
    ],
    [
      new RegExp(`\\bgit\\s+stash\\b(?!\\s+(list|show|pop|apply)\\b)`),
      "`git stash` takes other sessions' edits out of the working tree. Commit your own hunk by path instead.",
    ],
  ];
  for (const [re, why] of rules) if (re.test(cmd)) deny(why);
  if (/\bgit\s+commit\b/.test(cmd) && /co-authored-by|generated with\s+\[?claude|🤖/i.test(raw)) {
    deny(
      'no attribution lines in commit messages (CLAUDE.md, Workflow). Remove the trailer and commit again.',
    );
  }
  process.exit(0);
}

const file = ti.file_path ?? ti.path ?? ti.notebook_path ?? '';
if (!file) process.exit(0);
const rel = relative(ROOT, resolve(String(file)))
  .split(sep)
  .join('/');
const name = basename(rel);

if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
  deny(`${rel} holds secrets. Ask the user to edit it; only .env.example is yours to change.`);
}
if (rel === 'package-lock.json') {
  deny(
    'package-lock.json is written by npm (`npm install`, `npm version X.Y.Z --no-git-tag-version`), never by hand.',
  );
}
if (/^\.\.\/ProjectAscendant(\/|$)/.test(rel)) {
  deny(
    '../ProjectAscendant is the read-only Unity reference (docs/migration/from-unity.md). Port it, do not edit it.',
  );
}
process.exit(0);
