# Verdict

**Ship — B03 only.** Reviewed victory, defeat and Run record, including reached-versus-cleared semantics, all zones, entrance/legacy fallbacks, and 1920 × 1080 / 1280 × 720 at 100% / 150% text. Independent review: GPT-6 Astra, high; 2026-10-24. Screenshots read in this review:

- Audit: `victory.png`, `victory-720.png`, `defeat.png`, `defeat-720.png`, `victory-record.png`, `victory-record-720.png`, `defeat-record.png`, `defeat-record-720.png`.
- Baseline and actual outcomes: `before-real-league-defeat.png`, `after-real-league-defeat.png`, `after-champion-victory.png`.
- 1280 / 100%: `after-1280-100-region-3.png`, `after-1280-100-region-3-record.png`, `after-1280-100-victory-road.png`, `after-1280-100-victory-road-record.png`, `after-1280-100-champion.png`, `after-1280-100-champion-record.png`.
- 1280 / 150%: `after-1280-150-region-3.png`, `after-1280-150-region-3-record.png`, `after-1280-150-victory-road.png`, `after-1280-150-victory-road-record.png`, `after-1280-150-champion.png`, `after-1280-150-champion-record.png`.
- 1920 / 100%: `after-1920-100-region-3.png`, `after-1920-100-region-3-record.png`, `after-1920-100-victory-road.png`, `after-1920-100-victory-road-record.png`, `after-1920-100-champion.png`, `after-1920-100-champion-record.png`.
- 1920 / 150%: `after-1920-150-region-3.png`, `after-1920-150-region-3-record.png`, `after-1920-150-victory-road.png`, `after-1920-150-victory-road-record.png`, `after-1920-150-champion.png`, `after-1920-150-champion-record.png`.

# Findings

None within B03. The original D2/D10 finding is resolved: the genuine first League defeat changes from `Column 0 / 5` to `League · Bruno`; victory after all five League doors reads `League · Champion Blue`.

`runEndLocation.ts:6–16` uses a valid pending node before the cleared position. The defeat reducer retains that pending node (`run.ts:1085–1089`); `advanceFrom` updates position only when advancing, and Champion completion clears pending after that update. The unit cases also cover a later attempted opponent after an earlier cleared opponent, invalid pending IDs, missing roster identity and legacy position-only states. Entrance labels do not invent a column zero.

The nine-location e2e matrix produces distinct labels across Regions 1–3, Victory Road and all five League opponents; header and defeat record agree. At 150%, longer record values use two readable lines within their own card; no text spills or overlaps. The header remains one short line. Audit reports zero measured contrast failures, unnamed controls, overflow, spill or console errors on all four screens at both sizes.

# Garbage list (D7)

None introduced by B03. Both duplicated depth calculations and the obsolete generic depth string are removed. `run-end-distance`, `btn-run-record` and `btn-close-run-record` have e2e readers. No CSS, new controls or unexplained symbols were added. The audit's dead classes in `results/LevelUpPanel.module.css` and `results/ResultUnit.module.css` belong to excluded A02/A03 work.

# Keep

**D1/D2/D4/D10:** one concise, self-describing location marker replaces the ambiguous counter; detailed history stays behind Run record. Both consumers share one formatter and the existing string table.

**D8:** the existing Run record door retains a useful explanation and a visible focus ring in the screenshots; its close control also has a visible ring. Inspected `e2e.log`: six tests pass, including Enter opening, Tab remaining inside the dialog, Escape and close-button return of focus, and actual combat defeat after entering Bruno through the door/preview. Inspected `unit.log`: nine formatter tests pass.

# Not verified

- Independent live browser driving was unavailable: CUA returned no browsers and opening the in-app browser failed with `Browser is not available: iab`. Keyboard/closing claims above are supported by the inspected Playwright source and passing log, plus screenshots, rather than a second manual interaction run. No new B03 interaction requires a separate hover door.
- The generic audit victory fixture displays `Region 3 · Entrance` because it injects an ending without a node. It establishes layout only; the separate reducer-completed League capture establishes Champion victory semantics. The matrix injects defeat reports after entering fights; the separate Bruno case loses through combat and the existing Continue control.
- Audit leaves three existing gradient/image-backed text blocks unmeasured on each screen; no numerical contrast certification is claimed for those blocks. B03 changes no colour or typography.
- Full shared `check` was still running when inspected; `shot.log` showed 13 passing cases. This is a scoped UI verdict, not a release or whole-tree clearance. B02's region-count hunks and unrelated A02/A03/results changes are excluded. No global `ui-clear` or pending-queue mutation was performed.

# Release supplement — 2026-10-24

**Ship — final B03 state only.** Read `staged-b03.diff` and the release-exact screenshots `after-1280-150-champion-record.png`, `after-1280-150-region-3-record.png`, `after-real-league-defeat.png` and `after-champion-victory.png`. Location semantics, readability at 150% and visible focus remain correct. No new doctrine findings or garbage.

The staged product changes are limited to the reviewed location formatter, its two consumers and `RUN_END_TEXT`; tests and v0.9.42 release stamps accompany them. B02's `completedRegions` import/metric and all A02/A03 source changes are absent. The release-exact Champion defeat record still shows the known B02 `Regions cleared: 2 / 3` issue; this supplement does not approve or close B02.

The real-defeat test now clicks the exact accessible button name `See how far you got`, shared by the released overlay and concurrent results screen, instead of depending on the latter's `btn-claim` test ID. This preserves the player action and combat-produced defeat assertion without changing product code. Inspected final logs: `exact-e2e-final.log` has 17 passing cases; `e2e-final-shared.log` has 6 passing cases; shared `check.log` completes with 918 passed / 3 skipped. The full exact-export check remains a separate release gate, not certified here. Original live-browser and image-backed contrast limitations remain; no global queue was touched.
