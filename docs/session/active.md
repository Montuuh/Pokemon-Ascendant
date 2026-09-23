# Session State — Pokémon Ascendant

**Date:** 2026-09-23 · **Version:** v0.7.3 shipped (*Region 2, Coastal Cliffs*).
**Sprint goal next:** v0.7.4 — *Region 3, Volcanic Highlands*: biomes `volcano` `cave` `sky` `tower`, ~10 lines,
the four R3 Gyms and Badges (Psychic, Ground, Fighting, Ice), a route plate; retire Region 3's +16 placeholder.

**v0.7.3:** every Region is a `RegionContent` (`REGIONS`, `regionContent`, `regionName` in `run/region.ts`).
Region 2 has its own biomes (Sea 5 · Power Plant 3 · River 2 · Cave 2 · Meadow 1), 12 rosters (lanes: Fire →
Youngster, Grass → Lass, Electric → Engineer, Poison → Rocket Grunt), Karate King Elite, Lapras Elite Wild (scripted
kit), Blaine/Erika/Surge/Koga with four live Badges (`items.ts`). 26 species / 34 moves via
`scripts/add-v073-content.mjs` (catalogue rows won over first drafts). A recruit past its threshold evolves at the
catch (§6.3.1). Pikachu sold, starts with a Light Ball. Trainer nodes carry `rosterId`. R1 pools widened. Region 3
= Region 1 at +16, unnamed on the map. Celadon Ring retuned (+10/+2, rivals of 3).

**Measured:** the curve on the real roster (720 runs) 59 % · 45 % · 15 %, tier unchanged. Region 2 plays
differently: 76 % new species, 26 % Electric/Ice (R1 0 %), ~17 % of fights send a status home (R1 ~8 %).

**Findings to act on:**
- Map captions on locked nodes are under 4.5:1 (pre-existing, task filed). Region 2 Mastery lines: v0.7.5.
- Not built from §2.11: the Center's Daycare and PC Box services, scored shop curation (§2.11.2.1).
- Still doors in development: Safari, Black Market, the Dojo's extra-moves counter (§2.11.6).

**Test status:** `npm run check` green — 468 Vitest, typecheck, lint, § and catalogue guards.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill. The audit's D8 now also
reports *spills* (content escaping its card without scrolling the page) at 1080p and 720p — `--all` is clean.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
