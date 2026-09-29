# Session State — Pokémon Ascendant

**Date:** 2026-09-29 · **Version:** v0.8.3 shipped (*Groups across the run*) — v0.8 in progress (*Multi-enemy & the route*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8.4** field effects (§4.3, the four weather abilities), then v0.8.5 routes (design with
the user), v0.8.6 the balance pass. The user (2026-09-29): build a large playable v0.8, then iterate together.

**v0.8.1–3:** groups (§5.6: `onField`, Lead + supports with a `role`, Melee reaches only the enemy Lead), the honest
intent (`forecastTurn`, cached per state, split `byAction`), acting twice (`acts: 2`, §5.6.1), Call for Help
(`helpers`, §5.6.2), and groups across the run (`run/groups.ts`, §5.6.3: packs, callers, pairs, Elite support,
R3 Elite Wild acts twice; the preview card names the shape). Gym supports wait on v0.8.6 (R3 52 → 35 %).

**Findings to act on:** the market's prices → v0.8.6 · map caption token, wild biome emblems, route-line contrast →
v1.2 · UI nits left: the group breakdown box sits mid-arena rather than beside the aimed sprite; enemy box icons are
tiny inside their frame; at 720 p the player's Bench 2 is clipped by the stage (predates v0.8); the Ring and Safari
guides copy one nav; the silhouette filter is copied in three CSS modules; TM sprites blurry in the Move Manager;
`.trauma` in BoxPanel uses literal px · four pending rows wait on v0.8.4 field effects.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 622 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e`
100 passed, 1 skipped (the Evolution Item toast can miss under a full parallel run; alone it passes).
**Balance:** with groups in the run (120 seeds a starter): R1 60 % · R2|R1 57 % · R3|R2 52 % · full run 18 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
