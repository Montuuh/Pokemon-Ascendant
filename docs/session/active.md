# Session State — Pokémon Ascendant

**Date:** 2026-09-29 · **Version:** v0.7.12 shipped (*Nurse back button and technical changelog*) — v0.7 closed (*Cities & Regions 2–3*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8 Multi-enemy & the route**, starting with v0.8.1 *Multi-enemy fights* (1 lead + 1–2
supports, targeting, per-target damage preview, the intent rework). Then **v0.9 The long game** → v1.0 … v2.0.

**Since v0.7.9:** the City shops are their FRLG rooms (`npm run art:mart`, `ui/screens/shop/`), a clerk sells the
whole shop/floor (Buy/Sell), shelves light as one SVG shape; every building and the route nurse leave by `BackButton`
(v0.7.10–12). **The changelog is brief and technical, with no `## Next`**: every change ships as the next patch
(release doctrine R1/R2). `scripts/ui-audit.mjs` (shared) photographs only the store's 1F.

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
