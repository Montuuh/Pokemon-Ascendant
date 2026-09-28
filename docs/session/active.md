# Session State — Pokémon Ascendant

**Date:** 2026-09-28 · **Version:** v0.7.8 shipped (*The Game Corner, played*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** v0.7.9 — *Every door open*: the Dojo's extra-moves counter and the Center's Daycare and PC Box
(§2.11.1, §2.11.6). Then **v0.8 Multi-enemy & the route** → **v0.9 The long game** → v1.0 … v2.0 (`docs/roadmap.md`).

**v0.7.8 in one line:** the Game Corner's Roulette is the classic European wheel (37 pockets, bet a colour: red/black
×2, green ×36, EV 36/37, no cap on green — the user's call) with a ball that drops into the rolled pocket; the Slots'
reels spin in a drum window and stop left to right; the room stays pointed at, not walked (user). Run save v14.

**v0.7.7:** the Ring and the Coliseum as buildings; Team Rocket's Black Market behind the Game Corner's poster.
UI nits left: the Ring and Safari guides copy one nav (make a `Guide` shell; Tab runs right-to-left); guide "Trauma"
untipped; the Slots' InfoDot pattern now carries only the return and the house edge.

**Findings to act on:** the market's prices → the v0.8.6 pass (reflex showcase buying costs R3 twelve points) · map
caption token, wild biome emblems and route-line contrast → v1.2 · UI nits left: the silhouette filter is copied in
three CSS modules; two unmet starters' Buy buttons share an accessible name; TM sprites blurry in the Move Manager ·
four pending rows wait on v0.8.4 field effects · Safari: a pond near the top edge loses part of its shore.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 566 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e` 90 passed, 1 skipped.
**Balance:** curve unchanged (the casino is not in the harness) · the market, found: R3|R2 49 → 37 %, full run 18 → 14 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
