# Session State — Pokémon Ascendant

**Date:** 2026-09-25 · **Version:** v0.7.7 shipped (*The Ring, the Coliseum, and Team Rocket's Black Market*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** v0.7.8 — *The Game Corner, walked* (`docs/roadmap.md`): the FRLG room walked with the keys or the
mouse, the Slots' reels animated, and the poster to the Black Market found by walking up to it. The back wall v0.7.7
drew (`GameCornerRoom.tsx`, `npm run art:rocket`) is the start of that room. Then v0.7.9 every City door open.

**The plan (agreed with the user):** v0.7.8 the Game Corner walked · v0.7.9 every City door open → **v0.8 Multi-enemy &
the route** (groups, drag-to-target, per-target damage and the intent rework · acting twice / calling for help ·
groups across the run · field effects · routes + spent consumables · the balance pass) → **v0.9 The long game** →
v1.0 · v1.1 polish · v1.2 map · v1.3 world · v2.0 two players.

**v0.7.7 in one line:** the Challenge Ring (Pallet's square) and the Pokémon Coliseum (Celadon's plaza) are buildings
drawn into the towns; committing doors warn before they close; Team Rocket's Black Market is a secret behind the Game
Corner's poster — Trader, Fence (Rare Candy), Gambler, and a Legendary for three Pokémon, off the books to 3. Run save v13.

**Findings to act on:** the market's prices → the v0.8.6 pass (reflex showcase buying costs R3 twelve points) · map
caption token, wild biome emblems and route-line contrast → v1.2 · UI nits left: the silhouette filter is copied in
three CSS modules; two unmet starters' Buy buttons share an accessible name; TM sprites blurry in the Move Manager ·
four pending rows wait on v0.8.4 field effects · Safari: a pond near the top edge loses part of its shore.
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 562 Vitest, typecheck, lint, §, catalogue and version guards; `npm run e2e` 89.
**Balance:** curve unchanged (the market is off in the harness) · with it found: R3|R2 49 → 37 %, full run 18 → 14 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
