# Session State — Pokémon Ascendant

**Date:** 2026-09-24 · **Version:** v0.7.5 shipped (*The leftovers and the playtest nerfs*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** v0.7.6 — *The Safari Zone* (`docs/roadmap.md`): the City door already drawn (§2.11.6), an
entry fee, a fixed number of balls, species no route offers. Exit: a City visit can end with a recruit no route gives.

**The plan (2026-09-24, agreed with the user):** v0.7.6 Safari · v0.7.7 the Ring (town) and the Coliseum (city) as
buildings + Team Rocket's secret Black Market in the Game Corner · v0.7.8 every City door open → **v0.8 Multi-enemy & the route**: groups (drag-to-target
cards, per-target damage) · acting twice / calling for help · groups across the run · field effects · routes +
spent consumables · the balance pass → **v0.9 The long game**: Bond & Shiny (with Mastery Lv2/Lv3 for every line) ·
level & Mart · animated catch · Victory Road · League → v1.0 · v1.1 polish · v1.2 map · v1.3 world · v2.0 two players.

**v0.7.5 in one line:** stones, the intent queue, every relic and hidden ability live, Mastery Lv1 for 51 lines,
Sleep can't chain, drain heals half the damage, the Mart hides unmet starters. Run save v11 (migrates v10).

**Findings to act on:** map caption token, wild biome emblems and route-line contrast → v1.2 · UI review nits left:
the silhouette filter is copied in three CSS modules; two unmet starters' Buy buttons share an accessible name; TM
sprites in the Move Manager render blurry (stones fixed) · the four pending rows all wait on v0.8.4 field effects.
`AGENTS.md`, `.agents/`, `.codex/` (the Codex setup) are untracked: another session's.

**Test status:** `npm run check` green — 524 Vitest, typecheck, lint, §, catalogue and version guards. Check all
three ✅ lines, not one: a catalogue failure hides below the § line.
**Balance (v0.7.5):** 120 seeds 53/49/68 % · curve R2|R1 55 %, R3|R2 43 %, full run 13 % (720 runs).
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
