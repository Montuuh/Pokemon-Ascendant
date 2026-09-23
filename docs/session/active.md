# Session State — Pokémon Ascendant

**Date:** 2026-09-23 · **Version:** v0.7.2 shipped (*The city*).
**Sprint goal next:** v0.7.3 — *Region 2, Coastal Cliffs*: biomes `sea` + `power-plant`, ~10 authored lines,
trainer rosters, the four R2 Gyms and Badges; then re-measure the §2.2.1 curve on the real roster.

**v0.7.2:** Celadon is the bigger City — Department Store as five floor tabs (21 slots, a re-roll restocks one
floor), a Dojo teaching every reached stage (`tutorListFor`), the Game Corner (Wheel + Slots, tables printed,
outcome rolled first on `CasinoRNG`). The Challenge Ring behind both Dojos (`RING`, `rollRing`/`resolveRing`,
`RingScreen`, `RingPrizeScreen`): Elite-class rivals at evolved forms, no heal between rungs, cash out or climb,
no XP. Tuned per City by `playRing` (Pallet +7/+3, 3 mons; Celadon +16/+4, 4 mons); `ring.test` holds the bands.
Top prize tops up from the rarity below when the account has < 3 Rares open (`rarePickOpen` keeps the label honest).
Save version 9. Dev hooks: `run.city(0|1)`, `run.jump(kind)`, `run.afflict(kind)`, `run.heal()`.

**Difficulty curve** (v0.7.1 pass): R2|R1 ~60 %, R3|R2 ~50 %, full ~17 % (§2.2.1). **Re-measure when R2/R3 get
real rosters (v0.7.3/4)** — the stat tier and the Ring offsets were tuned on Region 1 species evolved up.

**Findings to act on:**
- Not built from §2.11: the Center's Daycare and PC Box services, scored shop curation (§2.11.2.1).
- Still doors in development: Safari, Black Market, the Dojo's extra-moves counter (§2.11.6).
- The v1.2 map revamp should rebuild the towns from tilesets; the door boxes are measured off the PNGs.

**Test status:** `npm run check` green — 450 Vitest, typecheck, lint, § (369) and catalogue guards. 70/70 e2e.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
