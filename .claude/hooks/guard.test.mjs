// The guard rail's own spec:  node --test .claude/hooks/
// Each case feeds guard.mjs the payload Claude Code sends a PreToolUse hook and reads the exit code (2 = blocked).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const GUARD = resolve(import.meta.dirname, 'guard.mjs');
const ROOT = resolve(import.meta.dirname, '../..');
const exit = (tool_name, tool_input) =>
  spawnSync(process.execPath, [GUARD], { input: JSON.stringify({ tool_name, tool_input }), encoding: 'utf8' })
    .status;
const bash = (command) => exit('Bash', { command });
const edit = (file_path) => exit('Edit', { file_path });

const BLOCKED = [
  'git add -A',
  'git add .',
  'git add --all && git commit -m "x"',
  'git add -u',
  'git commit -am "feat: x"',
  'git commit -a -m "feat: x"',
  'git commit --all -m "x"',
  'git commit -m "x" --no-verify',
  'git push --force',
  'git push -f origin main',
  'git push --force-with-lease',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git checkout -- .',
  'git restore .',
  'git stash',
  'git stash push -u',
  'git commit -m "feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>"',
];
const ALLOWED = [
  'git add src/sim/combat/turn.ts docs/design/03-combat.md',
  'git add .claude/hooks/guard.mjs',
  'git commit -m "feat(sim): the -a flag, explained"',
  'git commit --amend --no-edit',
  'git commit -m "fix: add . to the path"',
  'git push',
  'git push origin main',
  'git reset -- docs/roadmap.md',
  'git checkout -- src/ui/screens/CombatScreen.tsx',
  'git stash list',
  'git status --short',
  'git diff --cached --stat',
  'npm run check',
];

for (const c of BLOCKED) test(`Bash_${JSON.stringify(c)}_Blocked`, () => assert.equal(bash(c), 2));
for (const c of ALLOWED) test(`Bash_${JSON.stringify(c)}_Allowed`, () => assert.equal(bash(c), 0));

test('PowerShell_GitAddAll_Blocked', () => assert.equal(exit('PowerShell', { command: 'git add -A' }), 2));
test('Edit_DotEnv_Blocked', () => assert.equal(edit(resolve(ROOT, '.env')), 2));
test('Edit_DotEnvLocal_Blocked', () => assert.equal(edit(resolve(ROOT, '.env.local')), 2));
test('Edit_DotEnvExample_Allowed', () => assert.equal(edit(resolve(ROOT, '.env.example')), 0));
test('Edit_PackageLock_Blocked', () => assert.equal(edit(resolve(ROOT, 'package-lock.json')), 2));
test('Edit_UnityProject_Blocked', () =>
  assert.equal(edit(resolve(ROOT, '../ProjectAscendant/Assets/Foo.cs')), 2));
test('Edit_SimFile_Allowed', () => assert.equal(edit(resolve(ROOT, 'src/sim/combat/turn.ts')), 0));
test('NoPayload_Allowed', () => assert.equal(spawnSync(process.execPath, [GUARD], { input: '' }).status, 0));
