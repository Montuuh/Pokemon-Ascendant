# Session State — Pokémon Ascendant

**Date:** 2026-09-28 · **Version:** v0.7.10 shipped (*The Poké Mart, walked in*) — v0.7 closed (*Cities & Regions 2–3*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8 Multi-enemy & the route**, starting with v0.8.1 *Multi-enemy fights* (1 lead + 1–2
supports, targeting, per-target damage preview, the intent rework). Then **v0.9 The long game** → v1.0 … v2.0.

**v0.7.10 in one line:** both City shops are their FRLG rooms (`npm run art:mart`; `ui/screens/shop/rooms.ts` places
each shelf as boxes in map pixels and says what it holds; `ShopRoom.tsx` draws the map at a whole-pixel scale); press a
shelf, its cards open beside the room; the counter sells Poké Balls and buys back. 5F is "Rare goods" now. No sim change.
`scripts/ui-audit.mjs` (shared) only photographs the store's 1F — make it walk every floor when that file is ours.

**Next:** a clerk behind every shop counter sells the whole Mart or floor (Buy tab, grouped by shelf, the default
panel) and buys back (Sell tab); shelf plates lost their counts. UI review: Ship with fixes — all fixed.

**v0.7.9:** the Center has a Daycare (200 ₽, +1 level, sits out the next fight, once a visit —
`RunState.resting`) and a PC Box (the map's Box panel indoors); the Dojo's third counter sells each line's egg moves
(§2.9.4.2, `catalogs/egg-moves.md`, 64 lines) and its counters are tabs. Run save v15. No door is in development.

**Findings to act on:** the market's prices → the v0.8.6 pass (reflex showcase buying costs R3 twelve points) · map
caption token, wild biome emblems and route-line contrast → v1.2 · UI nits left: the Ring and Safari guides copy one
nav (make a `Guide` shell); the silhouette filter is copied in three CSS modules; two unmet starters' Buy buttons share
an accessible name; TM sprites blurry in the Move Manager; `.trauma` in BoxPanel still uses literal px · four pending
rows wait on v0.8.4 field effects · Safari: a pond near the top edge loses part of its shore.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 577 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e` 92 passed, 1 skipped (the Evolution Item toast can miss under a full parallel run; alone it passes).
**Balance:** curve unchanged (the harness takes neither the Daycare nor egg moves) · the market, found: R3|R2 49 → 37 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
