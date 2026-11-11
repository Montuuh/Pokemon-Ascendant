---
name: bugfix
description: >
  Fix a bug the way this project requires: reproduce it from a seed, decide whether the code, the content or the
  design doc is the wrong one, write the test that fails, fix the cause, and prove the test fails without the
  fix. Use for "this is broken", "X does not work", a playtest finding, a failing or flaky e2e, a soft-lock, a
  wrong number on screen, or a user report with a screenshot. Covers sim, content and UI bugs.
---

# Fix a bug — Pokémon Ascendant

## 1. Reproduce, pinned

- Get to the state by deep link with a seed, never by chance: `/?scenario=<id>&seed=<n>`, `/?screen=<id>`,
  `/?screen=menu&seed=<n>`, or `__ascendant.run.new(starter, n)` then `__ascendant.run.goto(kind)`.
- Read the state, do not infer it: `__ascendant.dump()`, `.state()`, `.run.state()`. `__ascendant.replay()`
  exports the recorded fight (seed plus input log): that is the reproduction, and it replays identically.
- From a user report: ask for nothing you can find yourself. The version is on the menu and in the changelog;
  the screen and the party are usually in the screenshot.
- Cannot reproduce after three honest attempts across seeds: say so with what you tried. Do not fix a guess.

## 2. Which side is wrong

Read the § the behaviour belongs to. Then it is one of:

| What you find | What it is |
|---|---|
| The § says the build is wrong | a code or content bug: carry on |
| The § says what the build does, and it plays badly | a design issue: taste call, decide it and rewrite the §; direction call, `design-change` |
| The § is silent | a gap: write the rule into the §, then implement it |
| Right outcome, shown wrongly | a UI bug: the fix is in `src/ui`, and the UI review follows |

## 3. The failing test is the bug report

- Sim or content: Vitest beside the code, `Method_Scenario_Expected`, headed by its §, seeded, built from the
  smallest state that shows it (the replay tells you which actions matter).
- Screen: Playwright in `e2e/`, `data-testid` assertions, the worst case named (longest name, tallest map,
  720p), images awaited before any geometry is measured.
- Run it and watch it fail for the reason you expect. A test that fails for another reason is not the test.

## 4. Fix the cause

The smallest change at the place the wrong value is produced, not where it is noticed. Look for the same mistake
in the sibling paths (the other slot, the enemy side, the doubles case) and fix them in the same change with
their own tests. No special case keyed on an id or a fixture.

## 5. Prove it

1. The new test passes.
2. Put the old line back: the test fails. Restore the fix. (`.claude/rules/tests.md`: a fix's test fails without
   the fix.)
3. `npm run check`. A golden that moved: is the recorded behaviour the bug, or did the fix reach further than
   intended?
4. UI: `npm run shot`, read the PNG, then the `ui-review` skill.
5. An e2e failure that is not yours: the `verify` skill's triage (this change, an older failure, or the machine)
   before touching it.

## 6. Record

Commit `fix(sim|ui|content|test): <what was wrong, in the player's terms>`. Update `implementation-status.md` if
a divergence closed. A finding you are not fixing now goes to `docs/qa/YYYY-MM-DD-<slug>.md` in the `qa` agent's
format, with its failing test marked `it.fails` or skipped with the reason, never left red.
