# Consumable catalog — 28 entries (24 canon + balls + Evolution Items)

> Implements §7.2 (24 launch consumables), §3.5 (per-combat roster, returned at combat end), §2.6.4 (Pokéballs
> as counted scarcity), §7.2.6 (upgrade chains), §6.3.2 (Evolution Items). Status legend in `README.md`.
>
> **The consumable contract (§3.5).** The Consumable Pile is built at combat start from the inventory; 2 cards
> are drawn per turn; each consumable may be used **once per combat**; at combat end everything returns to the
> inventory. They are a *per-combat roster*, not ammunition — except under the No Refunds difficulty modifier
> and for the two genuinely expendable classes below (Pokéballs, Evolution Items).

## 1. Healing (5)

| id | Tier | AP | Target | Effect | Price ₽ | Status |
|---|---|---|---|---|---|---|
| `potion` | 1 | 1 | ally | heal **20 HP** | 30 | ✅ v0.4 |
| `super-potion` | 2 | 1 | ally | heal **60 HP** | 70 | ✅ v0.4 |
| `hyper-potion` | 3 | 1 | ally | heal **120 HP** | 150 | ✅ v0.4 |
| `max-potion` | 4 | 1 | ally | heal to full Effective Max HP | 300 | ✅ v0.4 |
| `revive` | — | 2 | fainted ally | revive at 50 % Effective Max HP — the **only** in-combat revival (§2.4.3) | 400 · rare stock | ✅ v0.4 |

**Chain:** `potion` → `super-potion` → `hyper-potion` → `max-potion` (§7.2.6). An upgrade **replaces** the lower
tier in the inventory; the City Shop sells the upgrade at the price difference + 20 %.

> **Healing is flat, in the franchise's own numbers** (§7.2.2, decided 2026-09-20, reversing 2026-09-19).
> A Potion is 20 HP because everyone already knows what a Potion is worth and can read a health bar against
> it. The scaling the percentage version was trying to fix is the upgrade chain's job: 20 → 60 → 120 → full.

## 2. Status cures (6)

| id | AP | Target | Cures | Price ₽ | Status |
|---|---|---|---|---|---|
| `antidote` | 0 | ally | Poison | 25 | ✅ v0.1 |
| `burn-heal` | 0 | ally | Burn | 25 | ✅ v0.1 |
| `paralyze-heal` | 0 | ally | Paralysis | 25 | ✅ v0.1 |
| `awakening` | 0 | ally | Sleep | 25 | ✅ v0.1 |
| `ice-heal` | 0 | ally | Freeze | 25 | ✅ v0.1 |
| `full-heal` | **1** | ally | any primary status **+ Confusion** | 90 | ✅ v0.4 |

> **Full Heal costs 1 AP** (§7.2.3), which is what keeps the five single cures worth carrying.

## 3. Combat utility (9)

| id | AP | Target | Effect | Price ₽ | Status |
|---|---|---|---|---|---|
| `ether` | **1** | none | +2 AP this turn (net +1) | 80 | ✅ v0.4 |
| `x-attack` | 1 | ally | Atk +1 stage for this combat | 60 | ✅ v0.1 |
| `x-defense` | 1 | ally | Def +1 stage for this combat | 60 | ✅ v0.4 |
| `guard-spec` | 1 | ally | block the next status applied to that Pokémon | 70 | 🆕 |
| `sharp-lens` | 1 | none | +20 % crit chance on all moves this combat | 120 | 🆕 |
| `radar-scope` | 0 | none | reveal every Unknown intent this combat | 100 | 🆕 |
| `smoke-bomb` | 1 | enemy | cancel one enemy's declared intent this turn | 110 | 🆕 |
| `card-pocket` | 0 | none | keep up to 2 skill cards for next turn | 90 | 🆕 |
| `quick-claw` | 2 | none | the first card played this turn costs 0 AP | 100 | 🆕 |
| `defog` | 1 | none | clear the active field, Battlefield or Home Field (§4.3.6) | 80 | 🆕 (Unity-authored) |

`ether` is the AP-economy release valve and the reason a 4-AP ultimate is playable at all; `quick-claw` is its
combo partner. Both are deliberately the priciest utilities.

## 4. Catching (3) — **expendable**, counted outside the pile (§2.6.4 + Option 1)

| id | AP | Effect | Threshold | Price ₽ | Status |
|---|---|---|---|---|---|
| `poke-ball` | 1 | catch attempt | `ballMultiplier` 1 on the §2.6.4.1 chance | 50 | ✅ v0.1 · roll since 2026-09-21 |
| `great-ball` | 1 | catch attempt | ×1.5 | 120 | 🔒 post-launch (§2.6.4.2) |
| `ultra-ball` | 1 | catch attempt | ×2 | 250 | 🔒 post-launch |

Balls are a **counted run resource**: start 3 (`EconomyConfig.startingPokeballs`), +1 per Region, buyable. A
throw spends one whether it succeeds or fails. The catch card appears in a wild combat only while the count > 0.

## 5. Evolution Items (5) — **expendable, Move Manager only** (§6.3.2) ✅ v0.7.5

Not combat cards: they never enter the Consumable Pile. Applying one is a between-nodes action like a TM.

| id | Effect | Source | Price ₽ |
|---|---|---|---|
| `fire-stone` | Eevee → Flareon; Vulpix, Growlithe — from L8 | Mystery `mysterious-stone`, Eevee's Stone Cache, City shops | 250 |
| `water-stone` | Eevee → Vaporeon; Shellder, Staryu from L8; Poliwhirl from L18 | same | 250 |
| `thunder-stone` | Eevee → Jolteon; Pikachu — from L8 | same | 250 |
| `leaf-stone` | Exeggcute from L8; Gloom, Weepinbell from L18 | Mystery, City shops | 250 |
| `moon-stone` | Clefairy, Jigglypuff from L8; Nidorina, Nidorino from L18 | same | 250 |

> **A stone buys time** (§6.3.2, v0.7.5): the line evolves earlier than its level threshold, on the ordinary
> Evolution screen; Eevee's stone also picks its Eeveelution. The level path always remains.

## 6. Inventory & economy rules

- **No inventory cap** (§7.1). Duplicate consumables stack as a count; the pile draws distinct entries first so
  a stack of 5 Potions never floods the 2-card consumable hand.
- **Sell value** = 30 % of buy price, City Shop only (§2.11.2.4).
- **Region Shop** stocks 3 random consumables (30–100 ₽ band); the **City Shop** stocks 2 tier-1 + 1 tier-2
  (§2.11.2.2) at +30 % price.
- **Drop table**: Trainer nodes drop a Common item 50 % of the time (§2.7.2); `berry-bush` and `lost-backpack`
  Mystery events grant 3 at once.
