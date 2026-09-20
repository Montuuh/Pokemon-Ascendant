# Held Item catalog — 19

> Implements §8.4. One slot per Pokémon, always-on, swapped only in the Map View, persists to run end
> (§7.4.1). Distinct from the same-named **relics** (party-wide, weaker): the Held Item is wearer-only and
> stronger. Ids differ so the rot-guard can tell them apart (`charcoal` item vs `charcoal-charm` relic).

## 1. Type-boost (8) — +20 % wearer-only (§7.4.2)

| id | Name | Effect | Sources |
|---|---|---|---|
| `charcoal` | Charcoal | Wearer's Fire moves +20 % | Trainer drop, City Shop slot 7 |
| `mystic-water` | Mystic Water | Wearer's Water moves +20 % | same |
| `magnet` | Magnet | Wearer's Electric moves +20 % | same |
| `miracle-seed` | Miracle Seed | Wearer's Grass moves +20 % | same |
| `nevermeltice` | NeverMeltIce | Wearer's Ice moves +20 % | same |
| `black-belt` | Black Belt | Wearer's Fighting moves +20 % | same |
| `sharp-beak` | Sharp Beak | Wearer's Flying moves +20 % | same |
| `twisted-spoon` | Twisted Spoon | Wearer's Psychic moves +20 % | same |

## 2. Type Plates — Lead Aura source (5) 🆕 authored, canon §7.4.3 / §6.5.4

While the wearer is **Lead**, every bench Pokémon's moves of that type deal +5 %. Auras stack additively with an
ability-granted aura on the same Pokémon.

| id | Name | Aura type | Sources |
|---|---|---|---|
| `splash-plate` | Splash Plate | Water | Rare drop, Mystery `mysterious-stone` |
| `flame-plate` | Flame Plate | Fire | same |
| `zap-plate` | Zap Plate | Electric | same |
| `meadow-plate` | Meadow Plate | Grass | same |
| `mind-plate` | Mind Plate | Psychic | same |

## 3. Sustain & defence (3)

| id | Name | Effect |
|---|---|---|
| `leftovers` | Leftovers | Restore `floor(EffectiveMaxHP/16)` (min 1) at the end of each Resolution Phase |
| `eviolite` | Eviolite | If the wearer is **not** fully evolved: Def +20 % |
| `focus-sash` | Focus Sash | Once per combat: survive a lethal hit at 1 HP. Re-arms at combat end |

## 4. Tempo (2)

| id | Name | Effect |
|---|---|---|
| `choice-band` | Choice Band | Melee +25 %; the wearer's Ranged moves are unplayable |
| `choice-scarf` | Choice Scarf | The wearer's moves cost −1 AP (min 0); only one of the wearer's moves may be played per turn |

## 5. Signature (1)

| id | Name | Effect | Notes |
|---|---|---|---|
| `thick-club` | Thick Club | Marowak-only: Melee +50 % | Auto-equipped on the Marowak recruited by catching `marowak-spirit` |

## 6. Rules

- **Acquisition** (§7.4.6): Trainer battles drop one 20 % of the time (uniform across the 18 generic items);
  the Elite Trainer has a guaranteed slot; City Shop slot 7 is curated to the team; Mystery rewards.
  Wild loot never contains Held Items. `thick-club` is not in any random pool.
- **Box transfer**: releasing a Pokémon drops its item back to the inventory — never lost.
- **Faint prevention order:** Sturdy (ability) → `last-stand` (Legendary) → `focus-sash` (held item) →
  `phoenix-feather` (relic). Ability, then the run-long pick, then the equipped item, then the consumed relic
  as the true last resort (§7.3.6).
- **No mid-combat changes.** The loadout is locked on node entry like the Active Team (§2.3).
