# B04 — A still final team

## Reproduction and cause

The original hypothesis remains reproducible on the initial v0.9.42 working tree.
With system reduced motion, FinalTeam requested `charizard-shiny.gif` on victory
and defeat. Rendered captures 220ms apart changed 28,999 and 28,786 channel bytes
respectively (`before-pixels.json`, `before-*-sprite-{a,b}.png`). CSS cannot stop
GIF playback. FinalTeam did not read the motion preference.

The installed motion hook also snapshots the system preference on mount. That
would leave a mounted final team stale after a live OS setting change, so the
shared preference hook is an explicit B04 dependency. Its in-game override
precedence is retained.

## Change and ownership

- `FinalTeam.tsx` selects PNG or GIF through `useMotionPref`. Normal/shiny
  identity, the common native half-step fit and baseline are retained. Both
  formats share the same measurement key to prevent a size reset on live change.
- `useMotionPref.ts` subscribes to `matchMedia` changes through
  `useSyncExternalStore`, including cleanup. In-game reduced/full overrides win.
- `ui/art.ts` and `content/schemas/species.ts` accept an optional animation flag;
  every existing caller defaults to its original GIF URL.
- `scripts/build-battle-stills.mjs` extracts 604 normal/shiny front/back first
  frames, retaining the GIF canvas and exact RGBA pixels. All PNGs together are
  590,478 bytes. The manifest retains source/output hashes. Both helper sides
  have complete derivatives; only FinalTeam opts into them in this change.
- `e2e/run-end-motion.spec.ts` covers real rendered pixels, live settings,
  geometry, interactions and all derivatives. `run-end-art.spec.ts` changes only
  its expected reduced-motion shiny URL to PNG.
- Additive art pipeline/attribution notes document rebuilding and original
  Showdown rights. Six coordinated release files stamp v0.9.43.

`ownership.md` records the clean initial paths and B03's released ownership of
the release files. B02, A02/A03/results, their documentation and all other
agents' changes are excluded. No historical review/findings state was rewritten.

## Artistic choice

The exact first frame is the smallest intervention. The real-scene before/after
captures retain the existing composition. Generic portrait assets would change
pose, canvas and potentially shiny palette; runtime canvas freezing adds
processing and state. Static siblings preserve the established native pixels
without recolouring, trimming, resampling, new text or new controls.

## Verification

- `before-pixels.json` preserves the real initial failure; `after-pixels.json`
  gives zero changed bytes in both endings with system reduce.
- `e2e.log`: **14 passed** — all 6 B04 cases and 8 existing run-end art cases.
  Each size/outcome `*-pixels.json` records zero changes for all six sprites in
  system and in-game reduced modes, and positive changes in full motion,
  including the full override while the OS requests reduce. Live OS and store
  toggles retain the mounted screen, native geometry and shiny source.
- The actual Settings buttons are exercised with pointer and keyboard. Member
  hover, keyboard focus, Escape, Run record Enter/Escape and focus return pass.
  Eight-member/no-badge teams, four badges, exit and run-again remain covered.
  FinalTeam adds no locked control or new interaction.
- `check.log`: **918 passed / 3 skipped**, typecheck, lint, refs, catalogue and
  version guards pass in the shared tree.
- `shot.log`: **13 passed**. All ten emitted images were retained in `shot/`
  and visually inspected in `shot-contact-sheet.png`.
- `audit/report.md`: victory and defeat captured at 1920×1080 and 1280×720;
  zero measured contrast failures, unnamed controls, viewport overflow, painted
  spill or console errors. The three image/gradient-backed text blocks per
  ending remain numerically unmeasured; no complete contrast certification is
  claimed. Static findings under results are external and excluded.
- Both endings at both resolutions and 150% text were captured and read.
  `motion-contact-sheet.png` compares all four motion modes and size/outcome
  combinations. Sample `*-a.png`, `*-110.png`, `*-170.png`, `*-230.png` files
  retain the rendered frames behind the pixel reports.
- Isolated candidate exported from HEAD plus owned files only, with fresh
  dependencies: `exact-install.log`; `exact-check.log`: **899 passed / 3 skipped**,
  all guards including v0.9.43; `exact-e2e.log`: **35 passed**, adding title and
  combat/move full/reduced animation consumers of the shared hook.
- `exact-build.log`: production build with the Pages subpath passes. The
  existing bundle-size warning remains. Exact release screenshots and pixel
  reports are retained in `release-exact/`. The smaller unit count excludes
  external B02/results tests, not failures.

## Initial failures retained

`e2e-motion-initial.log`: **5 failed / 1 passed**. Four full-motion checks used
canvas `drawImage`, which reads a GIF's first frame instead of its rendered
animation; the fifth used integer `HTMLImageElement.width` to measure half-step
geometry. The corrected test compares rendered screenshot pixels and fractional
DOM rectangles. `traces/` retains the initial failure contexts and traces. These
were deterministic test defects; no intermittent product failure is inferred
resolved from a retry.

`check-initial.log` retains the typecheck failure, corrected in the test:

```text
e2e/run-end-motion.spec.ts(100,69): error TS2769: No overload matches this call.
  Overload 1 of 2, '(name: string, value: string | RegExp, options?: { ignoreCase?: boolean | undefined; signal?: AbortSignal | undefined; timeout?: number | undefined; } | undefined): Promise<...>', gave the following error.
    Argument of type 'string | null' is not assignable to parameter of type 'string | RegExp'.
      Type 'null' is not assignable to type 'string | RegExp'.
  Overload 2 of 2, '(name: string, options?: { signal?: AbortSignal | undefined; timeout?: number | undefined; } | undefined): Promise<void>', gave the following error.
    Argument of type '"reduced" | "full" | null' is not assignable to parameter of type '{ signal?: AbortSignal | undefined; timeout?: number | undefined; } | undefined'.
      Type 'null' is not assignable to type '{ signal?: AbortSignal | undefined; timeout?: number | undefined; } | undefined'.
```

An initial export attempt hit Windows Node `cpSync` ESRCH while overwriting an
archive file. No validation ran against that incomplete export. The successful
export uses direct byte reads/writes and a fresh destination.

## Literal Done when and review

- System reduce produces stable final-team pixels: satisfied on both endings
  and sizes, including live preference changes.
- In-game reduced motion produces stable final-team pixels: satisfied on both
  endings and sizes; actual Settings activation and live store updates covered.
- Full motion retains animation: satisfied on both endings and sizes, including
  explicit full override under system reduce.
- Matching shiny form, size and baseline are retained: exact asset equality,
  source assertions, invariant geometry and screenshot review pass.
- Independent UI review: **Ship — B04 only**, GPT-6.1 Sol / high. See `review.md`
  and independent `review-probe.json`. No B04 findings or garbage remain.

The global queue-clear hook was deliberately not run: the user's explicit scope
protects all 18 A02/A03/results entries. B04 has its own review stamp; the queue
bytes are checked against the initial snapshot in `queue-preservation.json`.

All B04 implementation, acceptance and mandatory verification criteria are
satisfied. Publication status and the final commit are recorded separately in
`release-result.md` after push succeeds.

## Limitations and discoveries outside scope

- Chrome emulates the OS preference; Windows Settings itself was not automated.
- Full unrelated e2e coverage was not claimed. The 35 exact UI cases cover the
  affected screen and shared hook consumers; A02/A03 remain unapproved.
- A pre-existing D8 Blocker remains outside B04: at 720p/150% the badges overlap
  the nameplates by 16.30px. `review-150-overlap.json` and its PNG retain the
  measurement. The CSS is identical to HEAD; B04 preserves source canvas and
  geometry. The independent review explicitly does not approve that existing
  layout. Its proposed correction belongs to a separate run-end layout change.
- Other GIF consumers retain their previous source selection; B04 does not claim
  to freeze every Pokémon image across the game. No other block was changed.
- Fresh dependency installation reports 6 existing audit advisories (2 moderate,
  4 high). Dependency upgrades are outside this visual accessibility patch.

The commit retains selected full-size before/after captures, exact release
captures, pixel reports, audit, review, logs and reproduction scripts. Additional
sample frames, full shot originals and trace archives remain locally in this
directory; the historical report is unchanged.
Raw CLI logs retain their emitted whitespace; the staged product/release diff
passes the whitespace check. An initial all-file whitespace check reported only
raw CLI trailing spaces and a reviewer report's final blank line, not code errors.
