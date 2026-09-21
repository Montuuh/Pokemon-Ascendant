# Session State — Pokémon Ascendant

**Date:** 2026-09-21
**Version in progress:** **v0.7 Regions 2 & 3 — not started.** v0.1–v0.6 complete; v0.6.0 is the shipped build.
**Sprint goal:** v0.6 Meta shipped on 2026-09-21 — the account, the Hub's four kiosks, relic tiers, the Pokédex
and the Mastery slot, the Eevee line, level-gated modifiers, 24 achievements, the run-end account summary.
**Shipped this session (v0.6):**
- **The account** (`src/sim/meta/account.ts`): XP on the §8.3.3 formula (table recomputed — it had drifted),
  the 30-row track settled idempotently, Tokens, lifetime stats; `accountStore` persists it after every fold and
  folds v0.5's medal case in on first load, back-paying medal XP.
- **RunPerks** frozen into the run save (v6): box bonus, relic pool, Mastery tiers, Familiar species, Insight.
  The sim never reads the account — a replay on another machine would differ otherwise.
- **Relic tiers**: `tier` / `discovery` on every row; 18 of 20 Tier-2 criteria tracked via a per-fight
  `CombatTally` (counted in `emit()`, one site) plus run-end facts; 4 new Tier-3 rows (Trainer's Instinct inert).
- **Pokédex + Mastery**: Familiar reveals intents; Veteran uses the *official shiny* Showdown sprite (fetched);
  Master opens the fifth card. `mastery.json` per line; Lv1 for 13 lines. Deck 12–15, faint purges five.
- **Eevee line** (4 species, 7 moves, 5 abilities incl. two new hooks `stab-multiplier`, `turn-start-ap`),
  Twin Run, Magikarp's relic lean, One Path enabled, 14 new achievements (Mastery category via `dex-tier-up`).
**Next action:** v0.7 — Regions 2 & 3 (§2.2 escalation, multi-enemy, field effects, Cities), and the v0.6
carry-overs: Pikachu's kit, Evolution Items, the intent queue, Greater Threats, Trauma Salve Cache.
**Blocked on:** two design calls flagged ⚠️ OPEN in §8.3.5 (track modifier rows vs level gates) and §8.4.2
(Pokédex Insight wording). Neither blocks play.
**Last commit:** see `git log -1` — v0.6 Meta.
**Test status:** `npm run check` green — 367/367 Vitest, typecheck, lint, § and catalogue guards. 53/53
Playwright. Production build clean.
**Balance (30 seeds):** 63 / 70 / 80 — the harness is account-less, so unchanged from v0.5 within noise.
**Open questions:** (a) §3.1 costly disengage. (b) Toxic's `⚠ OPEN` in `catalogs/tms.md`. (c) end-of-run ₽
surplus — still to re-measure once Region 2 exists to carry into. (d) the two v0.6 flags above.


## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
