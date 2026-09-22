# Session State — Pokémon Ascendant

**Date:** 2026-09-22 · **Version:** v0.7.1 shipped (*The seam and the town*). v0.7 has five subversions.
**Sprint goal next:** v0.7.2 — *The city*: Celadon's Department Store by floors, the wider Dojo, the Game
Corner's two machines (§2.11.5) and the Challenge Ring ladder (§2.9.4.1) behind the doors already drawn.

**What v0.7.1 built:**
- **The seam** (§2.1.4): Gym → Legendary → City (`arriveAtCity`) → the gate's Reflection (`depart-city`) →
  next Region. The third Gym wins. Regions 2–3 = Region 1's generator + `REGION_LEVEL_OFFSET` (+7/+16), beaten
  Gyms excluded; the Gym scenario now reads its levels off the preview so the shift reaches it.
- **Towns** (`ui/screens/city/`): Pallet Town and Celadon City as generated pixel-art lobbies
  (`public/art/towns/`, prompts in `docs/art/prompts/`), doors as % boxes in `towns.ts`. Open: Center, shop
  (8 + Poké Balls, ×1.3, 3 re-rolls, sells held items at 30 %), Dojo (+30 % in Celadon). In development:
  Ring, Safari, Game Corner, Black Market. Dev hook: `__ascendant.run.city(0|1)`.
- **Route**: field nurse (`aid`) and travelling merchant; third Mystery at L6. Badges from Showdown sprites.
- **Statuses carry between fights** with their clocks (§4.2.7.1); the Box panel shows them.
- Trauma Salve Cache Hub upgrade sold and live (first City's shelf).

**Findings to act on:**
- Placeholder Regions are too gentle: every autoplayed run that beat Gym 1 beat Gyms 2 and 3 (60 runs).
  v0.7.3's own content has to carry the difficulty — don't just raise the offset.
- Not built from §2.11: the Center's Daycare and PC Box services, scored shop curation (§2.11.2.1).
- The v1.2 map revamp should rebuild the towns from tilesets; the door boxes are measured off the PNGs.

**Open for the user:** the reviewer asks whether the doctrine should require 4.5:1 on text a player reads to plan
even on a disabled control (unaffordable shop cards fade to 3.9:1 today) — a D5 amendment, not yet made.

**Test status:** `npm run check` green — 417 Vitest, typecheck, lint, § (368) and catalogue guards. 63/63 e2e.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill (v0.7.1: Ship after one round of fixes).

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
