# Verdict

**Ship — B01 correction only, What's new.** Read `audit/changelog.png`, `audit/changelog-720.png`, `independent-720-focus.png` and all 24 before/after captures: `before-1920-1080-100-{initial,focus,collapsed}.png`, `after-1920-1080-100-{initial,focus,collapsed}.png`, `before-1920-1080-150-{initial,focus,collapsed}.png`, `after-1920-1080-150-{initial,focus,collapsed}.png`, `before-1280-720-100-{initial,focus,collapsed}.png`, `after-1280-720-100-{initial,focus,collapsed}.png`, `before-1280-720-150-{initial,focus,collapsed}.png`, `after-1280-720-150-{initial,focus,collapsed}.png` (brace groups name the individual files read).

# Findings

None within B01. The literal Done when in `review.md:85` matches `findings.json` acceptance: all expanded/collapsed version labels meet 4.5:1 at normal text size, including keyboard focus and the current patch. All four after JSON files each contain 67 distinct patches across 268 states (open/closed x focused/blurred), including the current patch; all 1,072 readings reach 10.7617:1 against the opaque pill background, versus 4.1332:1 before. Tiny5 remains weight 400 at 20px/30px. The normal-size threshold is satisfied without a bold exemption (D5, D9).

`before-tests.log` contains four expected failures at the contrast assertion; `after-tests.log` contains five passes, including the existing menu/About/read-dot flow. Audit is newer than the CSS and reports zero measured contrast failures, unnamed controls, overflow/spill and console errors. Its static check reports no dead CSS, new literals or native titles (D5-D8).

Independent system-Chrome Playwright probe at 1280 x 720 with full motion verifies pointer collapse, Tab/Shift+Tab focus, Enter expansion, Escape preserving the accordion and return to Menu. Focus is visibly outlined at 3px in `independent-720-focus.png`; computed label is Tiny5 400/20px with rgb(58,46,34) on rgb(243,231,208). Results saved in `independent-probe.json`. No new controls, facts, explanatory copy or unexplained symbols were added (D1, D2, D4, D8).

# Garbage list (D7)

None in the owned change. Removing `patchNumber`'s ineffective 700 declaration eliminates misleading CSS; the replacement comment explains a current constraint. No testids were added.

# Keep

Keep the existing ink token and Tiny5 numeric family, the compact version pills, and the release/patch accordion hierarchy. The test covers the complete 67-patch history rather than the audit's capped sample and retains keyboard/pointer checks.

# Not verified

This is approval of B01's correction and evidence, not release completion; release stamps and final repository checks remain the implementer's responsibility. A02/A03 and other blocks are excluded; the global review queue was not cleared.

Existing heading clipping after the exhaustive expand/focus sequence is present in matching before and after 100% captures at both sizes; it is not introduced by this token change and is not cleared by this review. The 150% focus capture is vertically scrolled. Audit leaves 28 gradient/image blocks unmeasured; the changed patch labels have an opaque measured background. The new test records font family/weight rather than asserting them and measures focus on every patch programmatically; actual keyboard interaction is exercised on the current patch. Independent probing used 720p/100%; 1080p/150% coverage was read from the supplied captures and test evidence. Native browser zoom and assistive technology were not tested.

# Release-content UI addendum — v0.9.41

**Verdict: Ship — B01 and its new current-patch content.** Read `release-exact/release-exact-1920-1080-100-initial.png`, `release-exact/release-exact-1280-720-100-initial.png` and `release-exact/release-exact-1280-720-100-focus.png`. Both initial captures show v0.9.41 in the page version pill and on the current patch, with the current marker and compact release text intact. The 720p focus capture shows the current patch's visible blue focus ring; the previously documented exhaustive-expansion heading clipping remains outside B01.

**Findings:** none in this scoped addendum (D5, D8, D9). Read `release-exact-1920-1080-100.json` and summarised all four release-exact JSON files: each has 68 patches / 272 readings, minimum 10.7617:1. In every file v0.9.41 is current in all four expanded/collapsed and focused/blurred combinations, at Tiny5 weight 400 and 20px/30px. No recorded viewport/screen overflow or page errors. The exact production evidence satisfies the same literal B01 acceptance for the newly added patch.

**Garbage list:** none added. **Keep:** existing ink token, numeric family and accordion hierarchy.

**Not verified:** final full-export check and publication. This addendum reads the isolated production evidence; it does not use the shared dev server's stale baked v0.9.40 constant to assess the release. CSS and test are unchanged from the reviewed correction per the task handoff; no code or global queue was changed by this addendum. Other release-exact screenshots were not read in this follow-up.
