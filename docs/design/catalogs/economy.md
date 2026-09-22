# Economy catalog — currencies, prices, XP, run budget

> Consolidates the numbers scattered across §2.14 (reward tables), §2.9.2/§2.11.2 (shops), §2.9.4 (Dojo), §6.2 (XP),
> §8.2.4 (Therapy), §8.3 (Trainer XP/Tokens). **This is the file a balance pass edits.** Every number names the
> config field that owns it. Values marked *tuned* survived a playtest; the rest are placeholders.

## 1. Currencies

| Currency | Scope | Earned | Spent on |
|---|---|---|---|
| **Poké Dollars ₽** | per run | combats, Mystery events, selling | Shops, Dojo, Therapy, Black Market |
| **Pokéballs ◓** | per run | start 3, +1 per Region, shops | catch attempts (1 per throw, success or fail) |
| **Trainer XP ⭐** | account | every run, won or lost | nothing — it drives Trainer Level automatically |
| **Trainer Tokens 🪙** | account | Battle Pass milestones (every 5th level) + Gold/Platinum achievements | Tier-3 Mastery relics, 5 each |

## 2. Poké Dollar income per Region (the budget)

| Source | Count in R1 | ₽ each | Subtotal |
|---|---|---|---|
| Trainer nodes | 4 | 50–150 | 200–600 |
| Elite Trainer | 1 | 300 | 300 |
| Wild nodes | 2 | 0–25 | 0–50 |
| Mystery (money branches) | ~1 | 100–250 | 0–250 |
| Gym | 1 | 500 | 500 |
| **Region total** | | | **≈1 000–1 700 ₽** |

With `coin-pouch` (×1.25) or the `coin-purse` modifier (×1.5) a Region can reach ~2 500 ₽.

## 3. Prices

> Since 2026-09-22 a route has no Shop: its travelling merchant stocks basics only (§2.9.2), and the Region
> Shop column reads as the merchant's price where it stocks the item. The City Shop column is the Poké Mart and
> the Department Store (§2.11.2). Numbers are re-tuned in v0.7.1 against the new flow.

| Item class | Region Shop | City Shop (+30 %) | Notes |
|---|---|---|---|
| Consumable T1 | 25–50 ₽ | 35–65 ₽ | 3 randomised slots |
| Consumable T2 | 70–150 ₽ | 90–195 ₽ | City slot 3 |
| Pokéball | 50 ₽ | 65 ₽ | always stocked |
| Common relic | 150 ₽ | 195 ₽ | |
| Uncommon relic | 300 ₽ | 390 ₽ | |
| Rare relic | — | 600 ₽ | City slot 6, 50 % present |
| Held Item | 250–400 ₽ | 325–520 ₽ | curated to the team |
| TM | 250–500 ₽ | 325–650 ₽ | curated to `compatibleSpecies` |
| Evolution stone | 250 ₽ | 325 ₽ | |
| **Shop re-roll** | 25 → 50 → 100 ₽ | — | up to 3 per visit (§2.9.3) |
| **Sell** | — | 30 % of buy | City only; the run's single ₽ exit valve |

## 4. Services

| Service | Cost | Where |
|---|---|---|
| Heal | free | City Center (full, every status) · the route's nurse (50 %, every status) |
| Therapy (−1 Trauma stack) | `100 × (1 + stacks)` ₽ | City Center only |
| Daycare (+1 level, skips the next combat) | 200 ₽ | City Center |
| Dojo: off-learnset move | 150 ₽ (`EconomyConfig.dojoMoveCost`) | Town Dojo · City Dojo (+30 %) |
| Dojo: ability (set or swap) | 200 ₽ (`EconomyConfig.dojoAbilityCost`) | same |

The Dojo is the intended main ₽ sink: a Region's income buys roughly 3–5 Dojo services *or* a relic and a TM.
That is the tension the economy exists to create (Pillar 3 — you sculpt, you cannot buy everything).

## 5. In-run XP (§6.2, `ProgressionConfig`)

| Source | XP | Field |
|---|---|---|
| Wild | 48 | `wildXp` |
| Trainer | 72 | `trainerXp` |
| Elite | 110 | `eliteXp` |
| Gym | 200 | `gymXp` |
| Distribution | Active 100 % / benched Box 75 %; `exp-share` lifts the bench to 100 % | |
| Level curve | `xpToNext(L) = 12 + (L − 1) × 4` | `levelUpBaseXp`, `levelUpSlopeXp` |
| Single-stage bonus | +25 % stat growth per level (§6.2.4) | `singleStageGrowthBonusPercent` |
| Multipliers | `lucky-egg-token` ×1.15 · `quick-study` ×1.15 · `living-legend` ×1.3 | |

Each figure is **per enemy**, so a two-Pokémon trainer pays double.

**Target arc** (§6.2.4): first evolution around the end of Region 1, final evolution around the end of
Region 2, which is why the thresholds were compressed to a uniform 12 and 26.

**Measured, 2026-09-19.** The seven-node Region 1 route takes a Lv 5 starter to **Lv 14–17** and fires 2–4
evolutions per run (`src/sim/balance/runBalance.test.ts`, 18 seeds per starter). The first values tried
(30/45/80/140) landed the team at Lv 11 and the Gym was unwinnable for two of the three starters. Re-run the
harness after touching any number in this section.

## 6. Trainer XP (meta, §8.3.2)

| Source | XP |
|---|---|
| Combat node cleared | 5 |
| Recruitment (first of a species this run) | 10 |
| Evolution | 15 |
| Gym Leader | 50 |
| Victory Road Gauntlet | 75 |
| Elite Four member | 100 |
| Champion | 250 |
| Failed run | `floor(layersCleared × 50)`, cap 400 |
| Pokédex tier promotion | 25 / 75 / 200 |
| Achievement | 50–500 (medal tier) |

Level curve: `cumulativeXp(N) = floor(500 × N^1.6)`. Difficulty modifiers multiply the run's total.
Expected per run: 80–150 (R1 wipe) · 400–600 (R3 wipe) · 900–1 200 (win) · up to 2 000 (achievement-heavy).

## 7. Sanity checks a balance pass should run

1. **Can the player afford the Dojo at all?** A Region's income (~1 300 ₽) minus one relic (300) and two
   consumables (100) leaves ~900 — six move teaches. If the Dojo is the main sink, it should absorb roughly
   half the income, not all of it.
2. **Does Therapy stay payable at high stacks?** `100 × (1 + stacks)` is 600 ₽ at 5 stacks — a whole Region's
   surplus for one Pokémon. That is the intended "rest or retire" pressure, but verify it does not lock a run.
3. **Is the healing consumable still relevant at R3?** It is now — healing is a percentage of Effective Max HP (§7.2.2).
4. **Do balls run out?** Start 3 + 1/Region + purchases; a player catching at every Wild node needs ~6 per run.
