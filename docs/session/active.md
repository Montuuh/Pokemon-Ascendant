# Session State — Pokémon Ascendant

**Date:** 2026-09-24 · **Version:** v0.7.6 shipped (*The Safari Zone*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** v0.7.7 — *The Ring, the Coliseum, and Team Rocket's Black Market* (`docs/roadmap.md`): both Rings
out of the Dojo as buildings, and the Black Market a secret behind a Game Corner poster. Exit: a player never told finds it.

**The plan (2026-09-24, agreed with the user):** v0.7.6 Safari · v0.7.7 the Ring (town) and the Coliseum (city) as
buildings + Team Rocket's secret Black Market in the Game Corner · v0.7.8 every City door open → **v0.8 Multi-enemy & the route**: groups (drag-to-target
cards, per-target damage) · acting twice / calling for help · groups across the run · field effects · routes +
spent consumables · the balance pass → **v0.9 The long game**: Bond & Shiny (with Mastery Lv2/Lv3 for every line) ·
level & Mart · animated catch · Victory Road · League → v1.0 · v1.1 polish · v1.2 map · v1.3 world · v2.0 two players.

**v0.7.6 in one line:** the Safari Zone opens in both Cities as a stalking minigame on a tile board (path and look
shown, bait, rock, a throw is the whole turn); species no route offers, Dratini in Celadon. Run save v12 (migrates v11).

**Findings to act on:** map caption token, wild biome emblems and route-line contrast → v1.2 · UI review nits left:
the silhouette filter is copied in three CSS modules; two unmet starters' Buy buttons share an accessible name; TM
sprites in the Move Manager render blurry (stones fixed) · the four pending rows all wait on v0.8.4 field effects ·
Safari: a pond near the top edge loses part of its shore off the board; Region 2 given 1 at 67 % → the v0.8.6 pass. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's.

**Test status:** `npm run check` green — 541 Vitest, typecheck, lint, §, catalogue and version guards; `e2e/safari` 5.
Check all three ✅ lines: a catalogue failure hides below the § line.
**Balance (v0.7.6):** 120 seeds 53/49/68 % · curve R2|R1 67 %, R3|R2 49 %, full run 18 % (720 runs) · Safari 1.5–1.9 a visit.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
