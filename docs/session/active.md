# Session State — Pokémon Ascendant

**Date:** 2026-09-23 · **Version:** v0.7.3 shipped (*Region 2, Coastal Cliffs*) + the Gen I pass.
**Sprint goal next:** v0.7.4 — *Region 3, Volcanic Highlands*: biomes `volcano` `cave` `sky` `tower`, ~10 lines
*placed* (every species exists now), the four R3 Gyms and Badges (Psychic, Ground, Fighting, Ice), a route plate.

**Gen I pass (before v0.7.4, user request):** all 151 species built — 78 new via `scripts/add-gen1-content.mjs`
(catalogue: `catalogs/species-gen1.md`), 64 moves, 9 abilities on existing hooks, Poliwrath; art for every one
(`fetch-sprites` maps hyphenated ids to Showdown's). None sits in a pool yet: balance unchanged. Legendaries
are rarity `legendary`. ⚠️ OPEN: Ditto's Transform (a stand-in ships).
**Pokédex (§8.9.2):** an unmet species is a silhouette, "???", no types, a locked Kit, "???" stages;
`isMet` (`meta/pokedex.ts`) — any trace, including a turn as Lead.

**Measured:** the curve on the real roster (720 runs) 59 % · 45 % · 15 %, tier unchanged. Region 2 plays
differently: 76 % new species, 26 % Electric/Ice (R1 0 %), ~17 % of fights send a status home (R1 ~8 %).

**Findings to act on:**
- Region 2 Mastery lines: v0.7.5. Map captions fixed (opaque pill, 14:1 on every node; "not yet" is the badge +
  dashed ring; every node opens its bubble, only a reachable one takes a click). Left: caption `font-size: 11px`
  should be `--type-caption` (§9.6 text size) once 720 has room; the tick's `#2f7d4f` has no token.
- Not built from §2.11: the Center's Daycare and PC Box services, scored shop curation (§2.11.2.1).
- Still doors in development: Safari, Black Market, the Dojo's extra-moves counter (§2.11.6).
- 13 abilities in `abilities.json` still carry 🆕 in the catalogue (stale marks, pre-existing).

**Test status:** `npm run check` green — 471 Vitest, typecheck, lint, § and catalogue guards.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill (audit D8 reports spills).

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
