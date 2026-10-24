# Session State — Pokémon Ascendant

**Date:** 2026-10-24 · **Version:** v0.9.40 (*Places worth reading*) — A19–A20 and route readability.
**First, read [standing-facts.md](standing-facts.md): Working with the user and Working in a shared folder.**
**Next:** v1.0 release; user iterates the art review first. A03/results belongs to another active session.

**A19:** attribution covers45 stage backdrops,161 moves and12 A14 source/prompt pairs, with provenance gaps stated honestly. Audit asserts expected roots and asset/terrain readiness, continues after failures, deletes stale captures and returns nonzero. Daycare/Mystery/Evolution fixtures corrected; three CLI regressions pass.
**A20:** full final team (including shiny and eight-member parties), proportional native pixel scales and earned badges dominate warm victory/defeat scenes. Run record holds account progress, metrics and final condition behind a focus-managed dialog. Badge cells contain the actual80px image.
**Route:** responsive native art, separated caption lanes, equal Wild labels, useful hover cards, stable feet and corrected hit targets. Two seeded rotating habitat residents remain canon. No miniature strip; Labels stays in the lower-right corner. Terrain row spacing is presentation only; map graph/rules unchanged.
**UI review:** Ship. Initial reviewer inspected all34 captures and ending interactions; final scoped reviewer approved remaining cave/label overlap. Opaque-art collision regression passes at720p/1080p; Gym hit targets stay inside the board. Audit17/17, zero measured contrast/overflow/spill/unnamed/console failures. Evidence: playtest/a19-a20; .claude/state/ui-a19-a20-review.md.
**Release checks:** exact staged export, fresh dependencies, complete check (890 passed,3 skipped),34 focused/global UI cases and5 legacy flow cases passed. Pages-prefix production build/smoke passed. Production smoke verifies v0.9.40,161 move PNGs and42 place PNGs, no broken images/errors. Art report has20 findings and31 gallery images; A19/A20 status and original priorities/effort retained.

**Shared folder:** preserve external results/A03, sim, docs and test changes. The18-file results review queue stays pending; scoped review does not clear it. Stage only owned files and selected shared-file hunks.
**Release history:** v0.9.32–35 failed clean Pages CI because a guard required an unpublished Victory Road field; v0.9.36 fixed it. Always validate the exact release tree; the shared folder can mask missing dependencies.
**Earlier art:** A08–A18 shipped through v0.9.39. Sources/rebuild details: docs/art/pipeline.md and ATTRIBUTION.md. Review: playtest/art-review/review.html. A07 city composition remains separate.
**Gameplay preferences:** route team is informational; Team owns management. Reachable chips stay rounded/clickable. Move Manager closes independently. Evolution is a surprise on continue.
**Shipping:** follow docs/release-doctrine.md; every finished unit goes to main with its next patch, changelog and stamps.
