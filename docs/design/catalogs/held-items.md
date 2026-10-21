# Held Item catalog — 32

> Implements §7.4. One slot per Pokémon, always-on, swapped only in the Map View, persists to run end
> (§7.4.1). Distinct from the party-wide **Elemental Gem relics** (+10 % to the whole party, §7.3.3): a
> unique type-boost Held Item is wearer-only and stronger (+20 %, §7.4.2), while a Type Plate grants
> +10 % to the wearer and a Lead Aura (+5 % for the bench while the wearer leads, §7.4.3).

## 1. Unique Type-boost items (11) — +20 % wearer-only (§7.4.2)

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
| `soft-sand` | Soft Sand | Wearer's Ground moves +20 % | same |
| `hard-stone` | Hard Stone | Wearer's Rock moves +20 % | same |
| `silk-scarf` | Silk Scarf | Wearer's Normal moves +20 % | same |

## 2. Type Plates — +10 % wearer, +5 % Lead Aura for the bench (14) 🆕 authored, canon §7.4.3 / §6.5.4

The wearer deals +10 % with moves of that type. While the wearer is **Lead**, every bench Pokémon's moves of that type deal +5 %. Auras stack additively with an
ability-granted aura on the same Pokémon.

| id | Name | Aura type | Effect | Sources |
|---|---|---|---|---|
| `splash-plate` | Splash Plate | Water | Wearer Water +10 %; while Lead, bench Water +5 % | Rare drop, Mystery `mysterious-stone` |
| `flame-plate` | Flame Plate | Fire | Wearer Fire +10 %; while Lead, bench Fire +5 % | same |
| `zap-plate` | Zap Plate | Electric | Wearer Electric +10 %; while Lead, bench Electric +5 % | same |
| `meadow-plate` | Meadow Plate | Grass | Wearer Grass +10 %; while Lead, bench Grass +5 % | same |
| `mind-plate` | Mind Plate | Psychic | Wearer Psychic +10 %; while Lead, bench Psychic +5 % | same |
| `icicle-plate` | Icicle Plate | Ice | Wearer Ice +10 %; while Lead, bench Ice +5 % | same |
| `fist-plate` | Fist Plate | Fighting | Wearer Fighting +10 %; while Lead, bench Fighting +5 % | same |
| `earth-plate` | Earth Plate | Ground | Wearer Ground +10 %; while Lead, bench Ground +5 % | same |
| `sky-plate` | Sky Plate | Flying | Wearer Flying +10 %; while Lead, bench Flying +5 % | same |
| `stone-plate` | Stone Plate | Rock | Wearer Rock +10 %; while Lead, bench Rock +5 % | same |
| `toxic-plate` | Toxic Plate | Poison | Wearer Poison +10 %; while Lead, bench Poison +5 % | same |
| `insect-plate` | Insect Plate | Bug | Wearer Bug +10 %; while Lead, bench Bug +5 % | same |
| `spooky-plate` | Spooky Plate | Ghost | Wearer Ghost +10 %; while Lead, bench Ghost +5 % | same |
| `draco-plate` | Draco Plate | Dragon | Wearer Dragon +10 %; while Lead, bench Dragon +5 % | same |

## 3. Sustain & defence (3)

| id | Name | Effect |
|---|---|---|
| `leftovers` | Leftovers | Restore `floor(EffectiveMaxHP/16)` (min 1) at the end of each Resolution Phase |
| `eviolite` | Eviolite | If the wearer is **not** fully evolved: Def +20 % |
| `focus-sash` | Focus Sash | Once per combat: survive a lethal hit at 1 HP. Re-arms at combat end |

## 4. Tempo (2)

| id | Name | Effect |
|---|---|---|
| `power-bracer` | Power Bracer | Melee +25 %; the wearer's Ranged moves are unplayable |
| `choice-scarf` | Choice Scarf | The wearer's moves cost −1 AP (min 0); only one of the wearer's moves may be played per turn |

## 5. Signature (2)

| id | Name | Effect | Notes |
|---|---|---|---|
| `thick-club` | Thick Club | Marowak-only: Melee +50 % | Auto-equipped on the Marowak recruited by catching `marowak-spirit` |
| `light-ball` | Light Ball | Pikachu-only: Electric moves +25 % | ✅ v0.7.3. A Pikachu run starts holding it (§8.5.3); a Raichu keeps it and it stops working |

## 6. Rules

- **Acquisition** (§7.4.6): Trainer battles drop one 20 % of the time (uniform across the generic items);
  the Elite Trainer has a guaranteed slot; City Shop slot 7 is curated to the team; Mystery rewards.
  Wild loot never contains Held Items. `thick-club` is not in any random pool.
- **Box transfer**: releasing a Pokémon drops its item back to the inventory — never lost.
- **Faint prevention order:** Sturdy (ability) → `last-stand` (Legendary) → `focus-sash` (held item) →
  `phoenix-feather` (relic). Ability, then the run-long pick, then the equipped item, then the consumed relic
  as the true last resort (§7.3.6).
- **No mid-combat changes.** The loadout is locked on node entry like the Active Team (§2.3).
