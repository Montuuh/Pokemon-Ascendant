# Session State — Pokémon Ascendant

**Date:** 2026-09-29 · **Version:** v0.8.2 shipped (*Acting twice and calling for help*) — v0.8 in progress (*Multi-enemy & the route*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8.3** groups, two-action Pokémon and callers placed across the run, then v0.8.4 field
effects, v0.8.5 routes (design with the user), v0.8.6 the balance pass. The user (2026-09-29): build a large playable
v0.8 first, then iterate on it together — design calls inside v0.8 are delegated and recorded in canon.

**v0.8.2:** `acts: 2` (§5.6.1) — two intents, both shown ("Also" chip), back to back; `call-for-help` (§5.6.2) brings
the caller's next `helpers` entry in as a support (max 3 on the field), counted in XP via `report.fielded`. The
forecast splits per action (`byAction`) and is cached per settled state; the log no longer prints intent damage.

**v0.8.1:** `onField` 1–3 puts a group on the field (§5.6): the enemy Lead + supports with a `role`. A single-target
Melee card reaches only the enemy Lead; the player's Cleave hits every enemy; the strongest steps up when the Lead
falls; a catch scatters the pack. Every intent number is `forecastTurn` (the Resolution run dry) — old chip 63 %
(Cleave 34 %) → 100 % over harness runs (`balance/intentAccuracy.test`). UI: compact panels, per-target numbers,
Out-of-reach lock, pointer drag (`ui/hooks/useCardDrag.ts`), incoming chips on portraits, the intent card (§9.2.6).
Groups exist only in the four `group-*` fixtures until v0.8.3. Support numbers (60 % HP, +1 Atk from turn 4, role
×1.5) are first values for v0.8.6.

**Findings to act on:** the market's prices → v0.8.6 · map caption token, wild biome emblems, route-line contrast →
v1.2 · UI nits left: the group breakdown box sits mid-arena rather than beside the aimed sprite; enemy box icons are
tiny inside their frame; at 720 p the player's Bench 2 is clipped by the stage (predates v0.8); the Ring and Safari
guides copy one nav; the silhouette filter is copied in three CSS modules; TM sprites blurry in the Move Manager;
`.trauma` in BoxPanel uses literal px · four pending rows wait on v0.8.4 field effects.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 603 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e`
100 passed, 1 skipped (the Evolution Item toast can miss under a full parallel run; alone it passes).
**Balance:** run curve unchanged (groups are not in the run yet); group fixtures won 75–100 % in 6–12 turns.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
