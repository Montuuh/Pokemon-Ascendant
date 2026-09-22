---
name: ui-review
description: >
  The UI/UX review loop that follows every visual change: measure the changed screens (npm run ui:audit), hand
  the report and screenshots to the ui-reviewer agent, act on its findings, and clear the pending-review state.
  Use after any edit under src/ui or src/app, when the Stop hook says a review is pending, when the user asks
  to "review the screen" or "run the UI review", or as /ui-review [screen,...|--all].
---

# UI review — Pokémon Ascendant

A visual change is not done until the reviewer has seen it. The loop is: **measure → review → fix → re-measure
→ clear**. Doctrine: `docs/design/ui-doctrine.md`. Agent: `.claude/agents/ui-reviewer.md`.

## 0. When this runs

- The `PostToolUse` hook queues every edited file under `src/ui/**` or `src/app/**` in
  `.claude/state/ui-pending.txt` and says so. The `Stop` hook refuses to end the turn while that queue is
  non-empty and newer than the last review — once — so the review is never forgotten, only deferred on purpose.
- Deferring on purpose: `echo "<reason>" > .claude/state/ui-skip` and tell the user why (a mid-refactor
  state, a screen that cannot render yet). The skip is consumed by the next review.

## 1. Measure

The dev server must be up on :5173 (`preview_start` name `dev`, or `npm run dev` in the background).

```bash
npm run ui:audit                      # screens for the files changed since HEAD (+ untracked)
npm run ui:audit -- --screens hub,combat
npm run ui:audit -- --all
```

It writes `playtest/ui-audit/<screen>.png`, `<screen>-720.png`, `<screen>.json` and `report.md`, and prints the
report: text volume and the long blocks (D1), doors (D2), tables and text-only grids (D3), contrast failures
(D5), unnamed controls, overflow and console errors (D8), plus dead CSS, hex literals and `title=` in the
changed files (D6, D7, D2). If no screen maps to the changed files, add the mapping in
`scripts/ui-audit.mjs` (`SCREENS[*].match`) — a screen the audit cannot reach is a screen nobody reviews.

## 2. Review

Launch the **`ui-reviewer`** agent (the Agent tool, `subagent_type: ui-reviewer`, run in the foreground — the
next step depends on it). Agent definitions load at session start: if the type is not listed yet, use
`general-purpose` and tell it to read and obey `.claude/agents/ui-reviewer.md` first. Give it: the screens audited, the changed files, the one-paragraph intent of the
change (what the screen is *for* and what moved), and where the report is. It returns a verdict, ranked
findings with doctrine ids, a garbage checklist, what to keep, and what it could not verify.

Relay the verdict and the findings to the user in the report; the agent's output is not shown to them.

## 3. Fix

- **Blockers**: fix now, in the same change. No exceptions.
- **Should**: fix now unless the user has said otherwise for that screen; if you leave one, say which and why.
- **Nits**: fix if cheap; otherwise list them.
- **Garbage list**: delete every item. Dead CSS, unused testids and stale copy do not ship.
- A finding you disagree with: say so with the doctrine id and the reason; the user decides. Do not silently
  drop it.

Then re-run step 1 on the same screens and read the new screenshots; a Blocker fixed is a screenshot read, not
a diff read. Run the screen's e2e (`npx playwright test e2e/<spec>.spec.ts`) and `npm run check`.

## 4. Clear

The review is complete when the fixes are in and verified:

```bash
node .claude/hooks/ui-clear.mjs
```

It stamps `.claude/state/ui-reviewed` and empties the queue, which is what the Stop hook checks. Note the
verdict in the task's closing report: `UI review: Ship with fixes — 2 Should fixed, 1 Nit left (…)`.

## Guardrails

- Never mark reviewed without the agent having run on the current state of the screen.
- Never answer a finding with more text on the screen; the fix for a mystery is a door.
- The audit measures; the agent judges; you fix. Keep the three apart — an audit number is evidence, not a
  verdict, and a verdict without a screenshot read is an opinion.
