# Session State — Pokémon Ascendant

**Date:** 2026-09-21
**Version in progress:** **v0.6.x — closing the pending design points before v0.7.** v0.1–v0.6 complete.
**Sprint goal:** the Hub redrawn (v0.6.1: level dial, the road, the Pokédex legend and tier bars, the Mart shelf) and the open design points closed. v0.6 Meta shipped on 2026-09-21 — the account, the Hub's four kiosks, relic tiers, the Pokédex
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
**Blocked on:** nothing. The two v0.6 design flags were decided on 2026-09-21 (§8.3.5 → three more "Relic pool +1" rows; §8.4.2 → a first-meeting peek). Two bigger design changes are drafted for approval: a probabilistic catch (§2.6.4) and a costly flee (§3.1).
**Last commit:** see `git log -1` — v0.6 Meta.
**Test status:** `npm run check` green — 367/367 Vitest, typecheck, lint, § and catalogue guards. 53/53
Playwright. Production build clean.
**Balance (30 seeds):** 63 / 70 / 80 — the harness is account-less, so unchanged from v0.5 within noise.
**Open questions:** (a) §3.1 flee — direction decided by the user (yes, with escalating costs; never from a Gym), numbers awaiting approval. (b) §2.6.4 catch — direction decided (a per-species %, floor at full HP, rising with damage and status), numbers awaiting approval. (c) end-of-run ₽ surplus — parked until the full run exists. Toxic was never open: the escalating DoT shipped; TM10 is just unported content.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
