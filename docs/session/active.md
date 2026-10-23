# Session State — Pokémon Ascendant

**Date:** 2026-10-23 · **Version:** v0.9.39 (*Grounded places*) — A16–A18 complete.
**First, read [standing-facts.md](standing-facts.md): Working with the user and Working in a shared folder.**
**Sprint goal next:** v1.0 Release; the user reviews the art pack first. A03/results belongs to another active session.

**A16:** fixed 90px move window fits the complete 68×45 native cell at 2×. All 161 images checked in real cards at 720p and 1080p; ten combat formations retain their space.
**A17:** 36 authentic FRLG overworld NPC frames, native item ball, common feet, quieter labels/shadows, no idle bob. Preserve the later v0.9.29 choice of two seeded rotating habitat residents; full battle portraits remain in previews. Three regions and Victory Road checked at both viewports.
**A18:** authored 320×256 Rocket room with four physical counters and focus-managed transaction dialogs. Existing economy, risks, held-item returns, secret entry and nested confirmations retained. Sources/crops/hashes and rebuild scripts shipped.
**UI review:** Ship, no remaining findings. Twenty-two final audit captures read; zero measured contrast, overflow, spill, unnamed-control or console failures. Sixteen image-backed move-card blocks remain unmeasured. Removed orphan nodeBob/token, stale glow comment and unused market helpers. Audit waits for terrain paint.
**Verification:** exact release export + fresh npm ci: 889 unit cases passed initially; the single merchant-balance timeout passed in isolation, covering all 890 cases (3 skipped). Initial shared check had four timeouts under load; art/terrain and Mystery reruns passed, shared merchant still exceeded its budget. The release copy excludes the foreign sim/results changes. Clean UI suite 37/37, including all maps, every move, all market contracts and 13 global screen cases. Pages-prefix production smoke: v0.9.39, 161 moves + 42 place assets decode, no errors. Final build/guards green. Evidence: playtest/a16-a18; .claude/state/ui-a16-a18-review.md.

**Shared folder:** preserve all uncommitted external results/A03, sim, docs and test changes. The 18-file results review queue stays pending; scoped review does not clear it. Stage only owned paths and selected hunks in tips.tsx/ui-audit.mjs.
**Release verification:** v0.9.32–35 failed clean Pages CI because a guard required an unpublished Victory Road field. v0.9.36 fixed it. Always validate the exact release tree with fresh dependencies; a green shared folder alone is insufficient.
**Earlier art:** A08–A15 are shipped through v0.9.38; provenance/rebuild details live in docs/art/pipeline.md and ATTRIBUTION.md. Art report: playtest/art-review/review.html. A07 city composition and A19–A20 remain separate; original ratings/priorities are retained in report-data.json.

**Gameplay preferences:** route team is informational; Team screen owns management. Reachable map chips stay rounded/clickable and hover at z-index 2. Move Manager closes independently of Team. Evolution is a surprise on continue, without a ready-to-evolve cue.
**Balance baseline (v0.9.25):** R1 53%; R2|R1 59–62%; R3|R2 50–51%; League|R3 43–56%; whole run 7–9%. Use 720 runs on two seed blocks before tuning.
**Known separate UI nits:** locked Wild emblems in grey, preview Escape focus, group breakdown placement; audit cannot measure every image-backed contrast and dynamic CSS classes can be false positives. Review those in their owning tasks.
**Shipping:** docs/release-doctrine.md and the ship-version skill. Every finished unit goes to main, scoped staging, changelog and version stamps. UI changes use the ui-review skill.

## Standing facts

In [standing-facts.md](standing-facts.md). This header is rewritten every version; the facts are not.
