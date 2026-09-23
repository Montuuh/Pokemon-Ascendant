# Session State — Pokémon Ascendant

**Date:** 2026-09-23 · **Version:** v0.7.1 shipped (*The seam and the town*) + its difficulty pass.
**Sprint goal next:** v0.7.2 — *The city*: Celadon's Department Store by floors, the wider Dojo, the Game
Corner's two machines (§2.11.5) and the Challenge Ring ladder (§2.9.4.1) behind the doors already drawn.

**v0.7.1:** Gym → Legendary → City → the gate's Reflection → next Region; the third Gym wins. Pallet Town and
Celadon City as generated pixel-art lobbies (`ui/screens/city/`, doors as % boxes in `towns.ts`); open doors
Center, shop (sells held items), Dojo; Ring, Safari, Game Corner, Black Market in development. Route: field
nurse + travelling merchant, third Mystery. Statuses carry between fights. Trauma Salve Cache live.
Dev hooks: `run.city(0|1)`, `run.jump(kind)`, `run.afflict(kind)`.

**Difficulty pass** (user-requested, method delegated): XP scaled by level gap (§6.2.1), enemies evolved to
their levels from R2 (`evolvedAt`), R2 status accent, Attack-weighted stat tier (R2 Atk ×1.6, R3 HP ×1.15 Atk
×2.3). 720-run targets: R2|R1 ~60 %, R3|R2 ~50 %, full ~17 % (§2.2.1), fights 4–5 turns; Greater Threats live.
**Re-measure when R2/R3 get real rosters (v0.7.3/4)** — the tier was tuned on Region 1 species evolved up.
D5 amended (user delegated): offers you can't afford keep full contrast; only sold/known rows fade.

**Findings to act on:**
- Not built from §2.11: the Center's Daycare and PC Box services, scored shop curation (§2.11.2.1).
- The v1.2 map revamp should rebuild the towns from tilesets; the door boxes are measured off the PNGs.

**Test status:** `npm run check` green — 428 Vitest, typecheck, lint, § (369) and catalogue guards. 63/63 e2e.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
