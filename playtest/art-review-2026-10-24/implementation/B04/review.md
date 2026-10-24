# Verdict

**Ship — B04 only.** Victory and defeat reviewed at 1920×1080 and 1280×720, default and 150% text. GPT-6.1 Sol / high, as assigned. Screenshots read: `audit/victory.png`, `audit/victory-720.png`, `audit/defeat.png`, `audit/defeat-720.png`; `after-victory-1920-150.png`, `after-victory-1280-150.png`, `after-defeat-1920-150.png`, `after-defeat-1280-150.png`; independent `review-victory-reduced-a.png`, `review-defeat-reduced-a.png`, `review-victory-keyboard-door.png`, `review-defeat-keyboard-door.png`. Original `independent/reduced-motion-sprite-a.png` and `reduced-motion-sprite-b.png` were also read.

# Findings

No B04 findings. Its literal Done when is satisfied: both endings have stable pixels with system reduce and the in-game reduced option; full motion visibly animates, including shiny Charizard. All four size/outcome pixel reports show zero changes for every reduced sprite and positive full-motion changes. Source changes preserve dimensions, half-step scale and baseline without navigation. The focused log records 14 passing cases, including exact RGBA/canvas equality for all 604 normal/shiny front/back derivatives; the shot log records 13 passing cases.

My independent Playwright probe (`review-probe.mjs` / `review-probe.json`) confirmed six zero-change sprites per ending at 720p; live OS PNG→GIF→PNG changes with identical geometry; Tab-visible focus; Charizard keyboard tooltip; Boulder hover tooltip; Escape; and Run record Enter/Escape focus return, with no page errors. The supplied focused tests additionally exercise live in-game store changes without remount and actual Settings keyboard activation.

# Garbage list (D7)

None introduced by B04. FinalTeam's existing test IDs have readers in e2e. No CSS or visible copy was added. The audit's dead CSS under `src/ui/screens/results/` belongs to excluded work and is **not approved or cleared** by this review.

# Keep

D6/D9: use the exact first GIF frame, native canvas, transparency and palette. It keeps the existing scene, shiny identity and shared baseline; a generic portrait changes pose/trim, while runtime canvas adds unnecessary processing. D1/D2/D4: the change adds no visible text or new explanation burden; existing detail doors remain usable.

# Not verified

This is a B04 review, not approval of A02/A03/results, the global pending queue, unrelated screens, or release metadata. I did not clear the queue. I reviewed the current scoped audit (newer than both UI edits); the global audit is older and outside this scope. The audit leaves three image/gradient-backed text blocks per ending numerically unmeasured, so no claim of complete screen-wide contrast measurement is made. I saw no new contrast or overflow regression in B04. OS changes were emulated in Chrome, not toggled through the Windows settings UI. Full `check.log` was still running when reviewed, so this verdict does not claim the full check or release gate passed. Initial failed test/check logs remain preserved; current tests use rendered screenshots, fractional DOM rectangles and the corrected non-null matcher.

# Independent release supplement — v0.9.43

## Verdict

**Ship — B04 only; its Done when remains satisfied.** Reviewed the isolated HEAD + owned-file export at `C:/Users/dmont/AppData/Local/Temp/ascendant-b04-release-p6uLFI`. Read its eight screenshots: `after-victory-1280-system-reduced-a.png`, `after-defeat-1280-system-reduced-a.png`, `after-victory-1920-system-reduced-a.png`, `after-defeat-1920-system-reduced-a.png`, and `after-victory-1280-150.png`, `after-defeat-1280-150.png`, `after-victory-1920-150.png`, `after-defeat-1920-150.png`. This is not approval of the existing whole-screen layout at 150%.

## Findings

No new B04 finding. Source hashes match the reviewed shared files for FinalTeam, useMotionPref, both sprite helpers and the unchanged FinalTeam CSS. Current completed logs supersede the earlier pending-check limitation: shared check **918 passed / 3 skipped**, isolated check **899 passed / 3 skipped**, all reference/catalogue/version guards passed, isolated focused e2e **35 passed** including other hook consumers, production build passed. Fresh npm ci completed. Build retains PostCSS and chunk-size warnings; these are not new B04 UI failures.

**[D8 · Blocker · pre-existing / outside B04] Badges overlap final-team nameplates at 1280×720, 150% text** — `src/ui/screens/run-end/FinalTeam.module.css:7`, `:15`, `:65`; `run-end-badge-*` against the nameplates. Both isolated ending captures show the lower plate edges being painted over. Independent geometry in `review-150-overlap.json` confirms **16.30 px** vertical intersection (badge top 501.59; plate bottom 517.89), with Boulder crossing Venusaur/Pikachu, Thunder crossing Pikachu, and Marsh crossing Lapras; `review-150-overlap.png` was read. Give the team row enough minimum content height and allow the scene to grow at increased text scale, so badge and nameplate painted bounds do not intersect; verify both endings and keyboard focus at 720p/150%. The CSS is identical to HEAD and B04 preserves sprite canvas and geometry, so this is an existing composition defect, not a motion regression. Record/fix it in the run-end layout scope; this review does **not** waive or approve it.

## Garbage list (D7)

None added by B04. No source, global queue or external findings were changed or cleared.

## Keep

The exact-frame PNG approach preserves palette, shiny identity, common scale and baseline while satisfying both reduced-motion paths; the default GIF API remains compatible.

## Not verified

Publication/remote deployment, Windows UI preference toggling, and resolution of the separately recorded 720p/150% overlap. The production-build log alone does not establish a deployed Pages smoke test. Existing image-backed text measurement limits remain. Release metadata guards are now verified for v0.9.43.


