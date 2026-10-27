---
name: ui-review
description: >
  The UI/UX review loop that follows every visual change: measure the changed screens (npm run ui:audit), hand
  the report and screenshots to the ui-reviewer agent, act on its findings, and clear the pending-review state.
  Use after any edit under src/ui or src/app, when the Stop hook says a review is pending, when the user asks
  to "review the screen" or "run the UI review", or as /ui-review [screen,...|--all]. Also the motion sweep
  (/ui-review --motion): "audit the animations", "make it feel better", "is the combat juicy enough".
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
(D5), unnamed controls, overflow and console errors (D8) — overflow is both the viewport and a *spill*: an
element poking past a bordered or painted ancestor that does not clip it, reported with the pixels, at 1080p and
720p — and *hidden*: content cut off inside a box that scrolls only the other way (a route that pans sideways and
hides what overflows its height). A preset shows one seed and one state: when a layout depends on content (a map's
rows, a long name, Labels on), audit the preset that holds the worst case — `map-labels` is seed 2, the tallest map —
plus dead CSS, hex literals and `title=` in the
changed files (D6, D7, D2), and the motion lint over them (D11 motion: `transition: all`, `ease-in`, layout
properties, `scale(0)`, durations that are not tokens, Motion code that never asks `useMotionPref`). The screenshots
are taken at reduced motion: they show where a screen lands, never how it moves. If no screen maps to the changed files, add the mapping in
`scripts/ui-audit.mjs` (`SCREENS[*].match`) — a screen the audit cannot reach is a screen nobody reviews.

### 1b. Before you ask — the pre-review checklist

A review round costs ten minutes and a large brief; a round spent on what you could have measured is wasted. Before
launching the agent, and for every round after a fix:

- **The worst case, measured.** A layout that depends on content is measured at its worst: the tallest map (the
  `map-labels` preset, seed 2), the longest name, 150 % text, Labels on, 720p — and at both ends of a scroller. A fix
  that moves a problem (heads cut at the top → captions cut at the bottom) is found here, not by the reviewer.
- **Drawn things, not boxes.** Pictures, captions and tags inside their bounds; nothing *hidden* (the audit's line).
- **The pointer.** Every control and tooltip trigger the change moved owns the point at its centre (the audit's
  *pointer* line; `elementFromPoint` by hand for one off-screen in a scroller). Drawing order decides it: a label
  painted before a node's transparent hit box loses its clicks.
- **Both motion switches** for anything that moves: Settings → Reduced and the system preference.
- **The test that fails without the fix** — written and seen red.

Then say in the brief what you already measured, so the agent spends its round on what you could not.

## 2. Review

Launch the **`ui-reviewer`** agent (the Agent tool, `subagent_type: ui-reviewer`). The Agent tool runs it in the
background: right after launching it, run `node .claude/hooks/ui-review-start.mjs "<what is under review>"`, which
lets this turn end while the verdict is on its way (the Stop hook accepts it for an hour, and only for the edits made
before it — an edit after it reopens the gate). Its verdict wakes the session; act on it, then clear (step 4). Agent definitions load at session start: if the type is not listed yet, use
`general-purpose` and tell it to read and obey `.claude/agents/ui-reviewer.md` first. Give it: the screens audited, the changed files, the one-paragraph intent of the
change (what the screen is *for* and what moved), and where the report is. When the change touches motion, add
for each animation: the event, its register (chrome or world), how often the player meets it or what weight it
carries (`docs/design/ui/motion-review.md` §2–§3), its deep-link, and the § that times it if one does. It returns a
verdict, ranked findings with doctrine ids, a garbage checklist, what to keep, and what it could not verify.

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

**Seeing motion.** The browser pane throttles a hidden page; for a beat in real time use `npm run ui:film` (motion-review.md §5) and give the reviewer the sheet. The audit also reports *pointer*: a control or a tooltip trigger whose centre belongs to something else.

## Motion sweep (`/ui-review --motion`)

On request ("audit the motion", "make it feel better"), a read-only pass over the whole UI instead of one change:
`npm run ui:motion` for the evidence, then the `ui-reviewer` agent follows `docs/design/ui/motion-review.md` §7 —
fixes ranked by leverage, at most five opportunities that pass the gate, and the candidates it rejected and why. It
edits nothing. The fixes go to the roadmap's next subversion and the opportunities to its backlog; each fix then
goes through the normal loop above when it is built.

## Guardrails

- Never mark reviewed without the agent having run on the current state of the screen.
- Never answer a finding with more text on the screen; the fix for a mystery is a door.
- The audit measures; the agent judges; you fix. Keep the three apart — an audit number is evidence, not a
  verdict, and a verdict without a screenshot read is an opinion.
