# B01 — Readable patch labels

Date: 2026-10-24. Scope: B01 / A04 typography follow-up only.
Independent reviewer: GPT-6.1 Sol, medium. Verdict: **Ship** for the correction.
Release: v0.9.41. Product acceptance and exact-tree verification complete.

## Reproduction and cause

The problem still existed in the current source and browser. `patchNumber` used
`--brand-red-deep` (#c93a3a) on opaque `--surface-2` (#f3e7d0), measured at
4.1332177895:1. The shared `.tabular` utility correctly selected regular Tiny5,
weight 400 with font synthesis disabled. The module's 700 declaration was
ineffective. At the normal 20px size this requires 4.5:1, not the large bold
text exemption. All four initial contrast tests failed deterministically at
that assertion; retain `before-tests.log`, all `before-*.json` and
`before-traces/**/error-context.md` verbatim. No intermittent product failure
occurred in this work.

## Change and ownership

- `src/ui/screens/ChangelogScreen.module.css`: use existing `--ink-primary`
  (#3a2e22), measured at 10.7617420681:1; remove the ineffective 700 declaration.
- `e2e/changelog-contrast.spec.ts`: measure the complete history in both
  accordion states, focused and blurred, at both required resolutions and text
  scales. Exercise actual pointer and keyboard paths on the current patch.
- The six release files reserved in `ownership.md` contain only B01's next patch
  and stamps; prior session facts are preserved.

The minimum intervention is a local token substitution. Reusing primary ink
keeps pixel numerals and the warm visual register without changing global red,
numeric utilities, hierarchy, copy, art, controls or any game rule. A02/A03,
other blocks and the original review/findings/assignments are untouched.

## Evidence

`before-<width>-<height>-<scale>-{initial,focus,collapsed}.png` and corresponding
`after-*` files compare 1920x1080 and 1280x720 at 100% and 150% text. The initial
views retain the actual scene and default accordion disclosure. Focus views
show the exhaustive expansion sequence. The reviewer read all 24 captures and
both audit captures; independent interaction evidence is in
`independent-720-focus.png` and `independent-probe.json`.

`audit/report.md` and `audit/changelog{,-720}.png` record the scoped UI audit.
It reports zero measured contrast failures, unnamed controls, overflow, spill,
console errors, dead CSS, new literals or native titles. Its 28 unmeasured
gradient/image blocks do not include these opaque version pills.

`shot-contact-sheet.png` combines the ten images from the complete screen
suite: menu, scenario picker, six combat fixtures, hover preview and played
card. Inspection found their existing composition intact; it does not approve
unrelated screens or excluded results work.

## Verification and failures

- Baseline regression: **4 failed**, solely the 4.1332:1 contrast assertion.
  Each JSON records 67 patches x 4 states = 268 readings; all 1,072 fail 4.5:1.
- After correction: **5 passed**, four resolution/text-scale cases plus the
  existing changelog navigation/read-dot flow. All 1,072 readings meet 10.7617:1.
- Release-stamped shared tree: **5 passed**, including the newly added patch.
  The long-running dev server retains v0.9.40 in its startup-baked
  `__APP_VERSION__` constant while hot-reloading the 68-patch changelog. The
  exact production build below verifies v0.9.41 as the actual current patch.
- `npm run check` on the shared tree: **80 files passed, 3 skipped; 902 tests
  passed, 3 skipped**, with typecheck, lint, refs, catalogues and version guard
  green. `check-initial.log` retains the full output.
- `npm run shot`: **13 passed**; `screens.log` retains the full output.
- Scoped `npm run ui:audit -- --screens changelog --files
  src/ui/screens/ChangelogScreen.module.css`: success; `audit.log` retained.
- Independent review: **Ship**, no B01 findings or garbage. The reviewer also
  independently exercised 720p/full-motion pointer, keyboard, focus and Menu.
- Exact staged export: fresh `npm ci` succeeded; production build succeeded;
  **5 production-browser tests passed** on its isolated preview at port 4174.
  See `release-install.log`, `release-build.log`, `release-exact-tests.log`.
  The build reports PostCSS `from`, chunk-size and plugin timing warnings; npm
  reports six dependency vulnerabilities. These remain recorded, outside B01.
- Full exact-export `npm run check`: **78 files passed, 3 skipped; 890 tests
  passed, 3 skipped**, all static/document/version guards green. See
  `release-check.log`. The shared tree's additional 12 tests belong to excluded
  uncommitted work; none was included in the export or staged for this release.
  Final differences from that verified export are this task's evidence and the
  session paragraph reporting the completed checks. Code and dependency files
  are unchanged; the version guard was rerun successfully.

Interaction coverage: pointer hover/click, Space, Enter, Tab, Shift+Tab,
visible keyboard focus, Escape preserving the accordion and screen, return to
Menu/About. No disabled patch controls exist. Normal motion is exercised at
100% and reduced motion at 150% at both sizes. The browser uses the real
`--text-scale` setting (20px and 30px numerals), not visual zoom emulation.

Tooling setup failures: the first log-redirection attempt preceded directory
creation and ran no tests. The contact-sheet helper initially used a
percent-encoded URL pathname; switching to `fileURLToPath` fixed the helper.
Neither was a product failure or a retry concealing an intermittent test.

## Literal Done when

- All expanded labels reach 4.5:1: satisfied, every patch measured.
- All collapsed labels reach 4.5:1: satisfied, every patch measured.
- Normal-size text: satisfied at 20px / 400, without a bold exemption.
- Keyboard focus: satisfied by all-patch focused measurements and actual
  keyboard focus/activation on the current patch, with a visible outline.
- Current patch: satisfied before and after release stamping, including the
  exact production build's new current patch.
- Pixel numeral family: retained; browser records Tiny5 / 400 throughout.

No B01 acceptance or verification criterion remains pending. The versioned
B01 commit on main records publication; unrelated changes remain unstaged.

## Scoped review clearance and limitations

`independent-review.md` is the independent verdict. This review approves only
the owned correction, not A02/A03 or the wider screen. The 18-entry global
pending queue is preserved; `ui-clear.mjs` was deliberately not
run because it empties that unrelated queue. Scope-specific clearance is
recorded here instead. This is the user's explicit shared-work exception to
the global clear step of the UI-review skill.

Native browser zoom, assistive technology and an independent keyboard pass
on every historical patch were not tested. All historical patch focus colours
were measured programmatically, with actual keyboard coverage on the current
patch. These limits do not change B01's contrast result.

## New findings outside scope

After opening all history and sweeping focus, the minor-release heading can
be clipped horizontally by its overflow-hidden container. Matching before
and after 100% captures at both sizes reproduce it. The reviewer confirmed it
predates this change. It is recorded here for a separate composition/scroll
fix; B01 neither introduces nor claims to close it.
