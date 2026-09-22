# Session State — Pokémon Ascendant

**Date:** 2026-09-22 · **Version:** v0.7 — Cities & Regions 2–3, five subversions. v0.6.5 is the shipped build.
Nothing of v0.7 is coded: the user wants the version's bases settled first.
**Sprint goal:** v0.7.1 — the seam and the town. The run must stop ending at the Region 1 Gym (`run.ts:238`).

**Decided 2026-09-22 (canon rewritten, `docs/roadmap.md` renumbered):**
- **Cities are lobbies** (§2.1.4, §2.11): a drawn town, buildings as doors, no visit budget. Open doors
  (Center, shop, Dojo, Game Corner) re-enterable; the Challenge Ring (and the Black Market, once open) commit
  once per visit. The gate opens the Reflection (§2.11.3) and leaves.
- **Pallet Town** (Center · Poké Mart · Dojo · Safari 🚧) then **Celadon City** (Center · Department Store ·
  Dojo · Game Corner · Black Market 🚧 beneath it · Safari 🚧). 🚧 = drawn, enterable, "in development".
- **Routes** keep only a nurse (+50 % HP, cures Burn/Poison, never Trauma) and a travelling merchant (§2.9);
  the Shop and the Dojo live in the Cities; the freed L6 node is a third Mystery Event.
- **Burn and Poison carry over between fights** (§4.2.7.1); timed conditions and stat stages clear.
- **The City Gym is gone** → the Dojo's Challenge Ring (§2.9.4.1). The Game Corner: printed odds, EV < 1.
- **Roadmap:** v0.8 multi-enemy + field effects · v0.9 Victory Road & League · v1.0 Release · v1.1 Polish ·
  v1.2 map revamp. Backlog at the roadmap's tail (fossils, role events, Safari, Black Market, extra moves, HMs…).

**Design questions, one at a time (asked for singly):** 1 the Challenge Ring's format ← asked · 2 its fee and
prize · 3 can a City pay a bonus Badge (§2.12.6) · 4 the Game Corner's wheel. Biome field effects wait for v0.8.

**Next action:** answer the queue, then v0.7.1 — the seam in `run/run.ts` (Gym → City → `regionIndex + 1`),
the City lobby screen, strip the route nodes, carry Burn/Poison (`run/report.ts` hard-sets `status: null`).
**Blocked on:** nothing for the seam and the town; the four questions shape v0.7.2 (the city).
**Test status:** `npm run check` green — 396 Vitest, typecheck, lint, § (368) and catalogue guards. 55/55 e2e.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill. Doctrine:
`docs/design/ui-doctrine.md`.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
