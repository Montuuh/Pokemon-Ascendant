# Session State — Pokémon Ascendant

**Date:** 2026-09-30 · **Version:** v0.8.5 shipped (*More group fights, one combat grammar*) — v0.8 in progress.
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** the user is iterating on v0.8's group fights; then **v0.8.6** routes revamped + consumables that
are spent (design pass with the user first), **v0.8.7** the balance pass (Gym at five, R3 42 % → ~50 %, the Ring).

**v0.8.1–3:** groups (§5.6: `onField`, Lead + supports with a `role`, Melee reaches only the enemy Lead), the honest
intent (`forecastTurn`, cached per state, split `byAction`), acting twice (`acts: 2`, §5.6.1), Call for Help
(`helpers`, §5.6.2), and groups across the run (`run/groups.ts`, §5.6.3: packs, callers, pairs, Elite support,
R3 Elite Wild acts twice; the preview card names the shape). v0.8.4: fields (§4.3, `combat/fields.ts`) — lane biomes
set Sun/Rain/Electric Terrain/Sandstorm, Gyms and Elites a Home Field ×1.2; Defog. v0.8.5: TEAM_SIZE (trainer 3, Elite 4,
Gym 4), trios, social callers, Elite/Gym doubles, the breather (§5.6.4), one combat grammar for one enemy or three.

**Findings to act on:** the market's prices → v0.8.7 · map caption token, wild biome emblems, route-line contrast →
v1.2 · UI nits left: the group breakdown box sits mid-arena rather than beside the aimed sprite; enemy box icons are
tiny inside their frame; at 720 p the player's Bench 2 is clipped by the stage (predates v0.8); the Ring and Safari
guides copy one nav; the silhouette filter is copied in three CSS modules; TM sprites blurry in the Move Manager;
`.trauma` in BoxPanel uses literal px · four pending rows wait on v0.8.4 field effects.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 639 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e`
100 passed, 1 skipped (the Evolution Item toast can miss under a full parallel run; alone it passes).
**Balance:** v0.8.5 (360 runs): R1 59 % · R2|R1 58 % · R3|R2 42 % · full run 15 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
