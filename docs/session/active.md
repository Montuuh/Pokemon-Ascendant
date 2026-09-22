# Session State — Pokémon Ascendant

**Date:** 2026-09-22
**Version in progress:** **v0.7 — Cities & Regions 2–3**, in five subversions. v0.1–v0.6 complete; v0.6.5 is
the shipped build. Nothing of v0.7 is coded yet: the design was re-planned first.
**Sprint goal:** v0.7.1 — the seam and the town. The run must stop ending at the Region 1 Gym (`run.ts:238`).

**Decided 2026-09-22 (canon rewritten, no code yet):**
- **Cities are lobbies** (§2.1.4, §2.11): a drawn town, buildings as doors, no visit budget — money, HP and
  Trauma are the budget. Open doors (Center, shop, Dojo) are re-enterable; committing ones (Challenge Ring,
  Game Corner) resolve once per visit. The gate opens the Reflection (§2.11.3) and leaves.
- **Pallet Town** after Gym 1 (Center · Poké Mart · Dojo · Safari closed) and **Celadon City** after Gym 2
  (Center · Department Store by floors · wider Dojo · Game Corner with the Black Market closed beneath ·
  Safari closed). Was "Pallet Plaza / Vermilion Harbor".
- **Routes lose the Center, the Shop and the Dojo** (§2.9): a nurse who heals 50 % and never touches Trauma
  (§2.9.1 — statuses need no curing, §4.2.7 clears them at combat end) and a travelling merchant with four
  basic slots (§2.9.2). The freed L6 node becomes a third Mystery Event (§2.5.1).
- **The City Gym is gone**; the Dojo's **Challenge Ring** (§2.9.4.1) is the "bet your team" fight — a fee, 2–3
  fights with no heal between, the prize on the way out, never a run loss.
- **The Game Corner** (§2.11.5) bets ₽ on a wheel with the payout table printed, EV below 1: variance, not income.
- **Biomes stay** (§2.6.1): pools widen as R2/R3 author their lines, and biomes will carry a field effect in
  v0.8. Multi-enemy + field effects moved out of v0.7 into **v0.8**; the League assumes them, so they precede
  Victory Road (now v0.9). v1.0 Release · v1.1 Polish · v1.2 the map revamp (horizontal, tileset).
- **Backlog** (roadmap tail): fossils and the Laboratory, role events (Fan Club, Rocket, the Magikarp
  swindle, Silph Co.), the Safari and Black Market designs, the fourth Badge, ₽ surplus, spent consumables.

**Also decided 2026-09-22 (second pass):** Burn and Poison carry over between fights (§4.2.7.1), the timed
conditions clear; the nurse cures Burn/Poison + 50 % HP. The Game Corner is an open door (no cap, EV < 1); the
Black Market commits once it opens. Celadon has a Center. Safari, Black Market and the Dojo's extra-move counter
are drawn and enterable, marked **in development**. HMs → backlog.

**Design questions, one at a time (the user asked for them explained singly):** 1 the Challenge Ring's format ·
2 its fee and prize · 3 whether a City can pay a bonus Badge (§2.12.6) · 4 the Game Corner's wheel. Asked: #1.
Biome field effects (§2.6.1) wait for v0.8.

**Next action:** v0.7.1. Order: the seam in `run/run.ts` (Gym victory → City → next Region, `regionIndex + 1`),
then the City screen as a lobby, then strip the route nodes. Placeholder R2/R3 = R1's generator at a higher band.
**Blocked on:** nothing for the seam and the town; the four questions above shape v0.7.2 (the city). The user
wants the version's bases settled before development starts.
**Last commit:** see `git log -1`.
**Test status:** `npm run check` green — 396 Vitest, typecheck, lint, § (367 sections) and catalogue guards.
55/55 Playwright.
**UI review loop:** after every `src/ui`/`src/app` change run the `ui-review` skill (`npm run ui:audit` → the
`ui-reviewer` agent → fix → `node .claude/hooks/ui-clear.mjs`). Doctrine: `docs/design/ui-doctrine.md`.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
