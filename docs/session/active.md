# Session State — Pokémon Ascendant

**Date:** 2026-10-04 · **Version:** v0.8.7 shipped (*Routes, revamped*) — v0.8 in progress.
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8.8** the balance pass (Gym at five, R3 → ~50 %, the Ring, the supply tables).

**v0.8.7** (§2.5, §2.5.4, §2.9.5, §9.3): the map is 20 columns left to right on an 11-row grid — tracks that drift,
split, merge and cross (pivoting takes two steps), the **Y** from column 8 (leaning tracks themed like their Gym, the
Elite on the middle track), the river at 11–13 as the point of no return, two lanes of two tracks, six **stop
columns**, the new `cache` node (a find on the ground). Terrain: `ui/screens/map/terrain.ts` → `tileset.ts` →
`RouteView.tsx`, FRLG tiles by `npm run art:route` (scorched grassland and the dank cave are tints). Save v18.

**Findings to act on:** v0.8.8 — R3|R2 ~58 % and R1 64 % after the longer route (XP ×0.9); the Ring sits at the edge
of its bands (Pallet ladder 0.23, Celadon rung 1 0.72); the harness never plays cures or X items; the market's
prices. UI nits left: locked Wild emblems hard to tell apart in grey; Region 3's tower ground has hard edges; Escape
on a preview drops focus to the body; the seed in the map header; group breakdown box mid-arena; tiny enemy icons;
Bench 2 clipped at 720 p. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs`
is shared with it (the reward and Gym-pick screens are still unmapped there).

**Test status:** `npm run check` green — 686 Vitest, typecheck, lint, §, catalogue and version guards; `e2e/run` green.
**Balance** (360 runs): R1 64 % · R2|R1 61 % · R3|R2 58 % · full run 23 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
