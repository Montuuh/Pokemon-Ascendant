# B03 — Where the run ended

Implementation, independent UI review and isolated release verification pass.
Publication is not claimed until the final release result is added.

## Reproduced problem and cause

Both the ending and defeat record independently formatted `position` as
`Column n / total`, without a zone. Regions 1–3 produced the same label.
The original report's League arrival fixture was not evidence about a real
defeat; a fresh entered League fight was therefore played to defeat as well.
That actual Bruno defeat also produced `Column 0 / 5` (see
`before-real-league-defeat.png` and JSON).

`position` is the last **cleared** node. The real defeat reducer retains the
attempted fight in `pendingNodeId`, which both displays ignored. No simulation
or progression change is needed: format the existing reached node first.

## Change and owned files

- `src/ui/screens/run-end/runEndLocation.ts`: one shared UI formatter, valid
  pending node before valid cleared position. Region and Victory Road name
  their zone and column; League names the opponent, including Champion Blue.
  Arrival snapshots without a node say Entrance instead of inventing column 0.
  Legacy position-only states and unknown League roster identities retain a
  useful zone/column fallback.
- `RunEndScreen.tsx`: use the marker in the existing distance line on defeat
  and victory. `run-end/RunRecord.tsx`: use the same marker for Depth reached.
- `src/ui/strings.ts`: only the `RUN_END_TEXT` location-formatting hunk.
- New `runEndLocation.test.ts` and `e2e/run-end-location.spec.ts`.
- Six coordinated release files: package/lock, changelog, README, roadmap and
  active session, for v0.9.42. B02 confirmed no incompatible release ownership.

The staged RunRecord and strings are reconstructed from HEAD plus only B03
hunks. B02's completedRegions import/metric and unrelated results strings stay
in the shared working tree and are excluded from publication. `staged-b03.diff`
is the reviewable source/release boundary. No historical review/findings status
or evidence was rewritten. No other block was marked resolved.

The minimum intervention keeps the existing line and portrait. A separate zone
panel/chip or breadcrumb would duplicate the same fact and compete with the
team; replacing its label solves the ambiguity without new art, controls,
panels, paragraphs, CSS or gameplay changes. All history remains in Run record.

## Before and after evidence

`before-{1920,1280}-{100,150}.json` records the baseline labels for all nine
locations. The matching `before-*` PNGs capture Region 3, Victory Road and Blue,
both the ending and opened record. `before-real-league-defeat.*` is the real
combat defeat.

`after-*` captures the same locations at 1920×1080 and 1280×720, at 100% and
150% text. At 150% the longer record values wrap within their own card; the
existing body scroll keeps them readable and the close action stays visible.
`after-real-league-defeat.*` shows **League · Bruno** after an actual enemy
turn; `after-champion-victory.png` shows **League · Champion Blue** after all
five doors complete through the run reducer. `release-exact/` repeats these
captures from HEAD plus B03 only, without B02 or A02/A03.

The baseline record capture could show only part of the bottom metric at150%
because the initial screenshot helper scrolled just enough to intersect it.
The final helper centres the metric's card before capture. This is a capture
framing correction; no product layout change or hidden clipping fix is claimed.

## Verification and preserved failures

- `unit.log`: 9 formatter tests pass. Includes pending-vs-cleared precedence,
  later League opponent, final Champion, legacy state, invalid pending id,
  unknown roster and each zone's arrival fallback.
- `e2e-final-shared.log`: all 6 B03 cases pass. Four matrix configurations
  cover nine labels each; header and record match; every label is distinct;
  attempted nodes are not visited. Enter opens the record, Tab stays inside,
  Escape and pointer close return focus. Both reduced and normal motion are
  exercised. No new locked control is introduced.
- `check.log`: full shared check passes, **918 passed / 3 skipped**; typecheck,
  lint, references, catalogues and version stamps pass. This includes external
  results/B02 tests, so its count is not the release-only count.
- `shot.log`: **13 passed**. All ten written screenshots were inspected through
  `shot-contact-sheet.png`; menu, scenario picker, combat formations, hand and
  hover preview remain visible. This does not approve the unrelated rework.
- `audit/report.md`: **4/4 captured**, each at both resolutions; zero measured
  contrast, unnamed-control, viewport/spill or console failures. All eight
  captures were inspected. Static dead classes listed in results belong to
  A02/A03 and are excluded.
- `exact-build.log`: fresh dependency install and production build pass.
- `exact-check.log`: full **release-only** check passes, **899 passed / 3
  skipped**, with typecheck, lint, references, catalogues and v0.9.42 stamps.
  The 19 fewer tests are excluded external B02/results tests, not test failures.
- `exact-e2e-final.log`: **17 passed** from the exact release export: all six
  B03 tests, eight ending/record cases, three League cases.
- `exact-lint-final.log`: lint rerun after the final harness correction.

Initial failures were retained, with no retries masking an intermittent bug:

1. `before.log`: four cases wrongly asserted that `position` must be set on
   defeat. Reading the reducer established the actual contract: reached fight
   is pending; position advances only after clearing. The fifth case expected
   the ending before pressing the existing results Continue action.
2. `before-corrected.log`: four cases assumed a Gauntlet in Victory Road's
   first column. Gauntlets live in the middle columns. Use an existing first
   column trainer/wild fight instead; the generated map has five columns
   including Summit. The actual League defeat passed.
3. `before-final.log`: five observational capture cases pass while preserving
   the original ambiguous labels. This baseline mode was removed from the
   final regression; the final tests always assert the corrected labels.
4. `exact-e2e.log`: 16 passed, one test failed because it looked for the new
   results testid from A02/A03, while the released overlay exposes a different
   testid. The DOM/trace showed a legitimate **See how far you got** button.
   The regression now clicks that shared player-facing action. The same final
   test passes against both shared and isolated code, without injecting combat
   outcome. Original failure trace is retained in `exact-first-traces/`.

These are identified state-contract, fixture-selection and harness-integration
errors. No product failure was dismissed as flakiness. Full raw failing blocks
remain in the named logs and error-context/trace directories.

## Literal Done when

- **Two runs ending in different zones cannot present an indistinguishable
  depth label:** satisfied. Regions 1–3, Victory Road and all five League
  opponents produce nine distinct labels in every matrix configuration.
- **Exercise a real defeat after entering a League battle:** satisfied. The
  browser enters Bruno through the League door and preview, starts a real
  combat with a seeded 1HP starter, ends the turn, loses to the enemy, and
  follows the real ending action. The resulting state and screenshot are saved.
- Observation and recommended change: both header and defeat record now show
  the same concise, location-aware reached marker from existing data. Reached
  and cleared remain separate; complete metrics remain behind Run record.

## Independent review and limits

**Ship — B03 only**, GPT-6 Astra / high. `review.md` records 35 inspected
screenshots, no findings and no garbage. Its release supplement covers the
isolated snapshots and final test correction. Independent manual browser
driving was unavailable; the reviewer explicitly relies on inspected passing
Playwright coverage and screenshots for interactions. Existing image/gradient
blocks are partly unmeasured by the generic audit; no new numerical contrast
certification is claimed. B03 changes no colour or typography.

The generic audit's injected victory-without-node snapshot says Region 3 ·
Entrance. It is layout evidence only; the reducer-completed Champion capture
is the evidence for real victory semantics. No full three-region manual run,
audio assessment, screen-reader session or accessibility claim beyond the
named checks is made.

Scoped clearance lives in `.claude/state/ui-b03-review.md`. Global ui-clear
would empty the unrelated queue and is deliberately not run, following the
user's explicit exclusion. Its 18 paths and SHA256 remain unchanged:
`432AAE78EF0018C2155D7D3164199D1AB6068A692A30215CEA92ED0EB429D237`.

No B03 acceptance or mandatory verification criterion remains pending. The
reviewer's release supplement was written before `exact-check.log` completed;
that now-green check is recorded above without changing its independent words.

## Additional findings outside scope

No new B03-adjacent product defect was established. B02's completed-region
count remains intentionally unpublished; B04/B05 sprite issues and A02/A03
results remain separate. Existing npm dependency audit advisories and the
build's large-chunk advisory are recorded in installation/build logs without
changing dependencies or bundling in this task.
