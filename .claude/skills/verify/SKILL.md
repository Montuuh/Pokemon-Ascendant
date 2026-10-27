---
name: verify
description: >
  Run the full Pokémon Ascendant verification loop after any change: typecheck + lint + unit tests, then the visual
  suite that screenshots every screen for Claude to read, and the e2e for what the change touches. Use before
  claiming anything works, before a commit, or when asked to "check", "verify", "run the tests", or "does it still
  work". Also the triage when an e2e fails: is it this change, an older failure, or the machine?
---

# Verify — Pokémon Ascendant

## 1. Static + unit

```bash
npm run check
```

Green means: `tsc` clean, `eslint` clean, Vitest all passing, and the doc/version guards. If anything fails, paste
the failing block verbatim in the report and fix it; never summarise a failure away.

## 2. Screens (only if UI/content/art changed)

```bash
npm run shot
```

Then **Read** every PNG the run wrote to `playtest/` (`menu.png`, `combat-hover.png`, …) and describe what you see
against the spec / mockup. A screen whose layout depends on content (a map's rows, a long name, Labels on) is read at
its worst case, not the fixture that happens to fit.

Live inspection alternative: `preview_start` (config `dev`) → open `http://localhost:5173/?screen=combat` in the
browser tool → `screenshot`, `read_page`, `find`, and `javascript_tool` with `window.__ascendant.dump()`.

## 3. e2e — the specs the change touches, then the suite

Run the specs that cover what changed first (`npx playwright test e2e/<a>.spec.ts e2e/<b>.spec.ts`); the whole
suite (`npm run e2e`, ~7 min) before a release or after a change that crosses screens. The config runs **four workers**
(`PW_WORKERS` overrides): more starves the one dev server and the canvas-heavy cases time out.

**One run at a time.** Two Playwright runs, an `ui:audit` or a reviewer driving the browser on the same dev server
make each other slow, and timeouts follow. Run the suite on a quiet server, and say so if it was not.

**Someone else's server.** Another project on this machine may hold :5173. The e2e (`e2e/global-setup.ts`), `ui:audit` and
`ui:film` refuse a server whose page is not Pokémon Ascendant, naming what they found; run on a free port with
`PW_PORT=5174 npx playwright test …` (`preview_start` config `dev-alt` serves :5174 for the browser). Never stop the other
server: it is not ours.

**A tired dev server lies.** After hours of hot reload, a module imported by path (`await import('/src/app/…')`, as
some specs do to reach a store) can load a second copy with empty state — `Cannot read properties of null` from a
spec that passed this morning. Before trusting a failure like that, restart the server (`preview_stop` the `dev`
server, `preview_start` it again) and re-run.

## 4. Triage a failing e2e — before blaming the change

A red case is a bug until proven otherwise, and the proof is cheap:

1. **Read the error**, not the title: `playtest/test-results/**/error-context.md` has the DOM snapshot.
2. **Alone and repeated:** `npx playwright test e2e/x.spec.ts:LINE --repeat-each=3 --workers=1`. Passes every time
   alone but fails in the suite → load (step 3), not the game.
3. **Against HEAD:** `git stash` (or `git stash push <files>`), re-run the same case, `git stash pop`. Fails on HEAD
   too → it is older than the change: say so with the evidence, and fix it or file it; never fold it silently into
   this change's report. To date an older failure, run it in a worktree at an earlier commit
   (`git worktree add --detach <scratch> <sha>`, junction `node_modules` in, run, remove the worktree).
4. **Fails sometimes, on the same code** → nondeterminism: a random seed (the tests rule: pin it), a timer, an
   animation. Find which, rather than re-running until green.
5. **A fix is proven by the test failing without it**: revert the fix (or put the old line back), watch the new or
   existing assertion fail for the right reason, restore. An `>` redirect empties a file Vite then serves: restore
   with `cp`/`mv`, never by writing it in place mid-run.

## 5. Report

- What was verified, with the command output lines that prove it (test counts, screenshot names).
- Each failure: this change, older (failing on HEAD), or the machine (passes alone) — with the run that shows which.
- Anything that could NOT be verified (no Playwright browser, the pane hidden so motion was not watched live) — say
  so explicitly.
- Never write "tests pass" or "looks right" without evidence from this session.
