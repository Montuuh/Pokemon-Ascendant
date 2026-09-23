# Species pool — Regions 2 and 3 (ids reserved)

> Reserves ids, types, biomes and rarities so that R2/R3 trainers, gyms and elites in the other catalogs
> resolve today, without authoring full kits before they are needed. Stat blocks, learnsets, archetype payloads
> and Mastery lines are filled in when v0.7 starts — the columns are the same as `species-r1.md`.
>
> §1.6 targeted ~30 fully-implemented evolution lines at launch. Since 2026-09-23 every Gen I species is built
> (`species-gen1.md` holds the 78 this file and `species-r1.md` did not): this file now says which Region *uses*
> a species, not which ones exist.

## Region 2 — Coastal Cliffs (sea primary; river, power-plant secondary)

> ✅ **v0.7.3 built** `tentacool` `shellder` `horsea` `staryu` `seel` `voltorb` `magnemite` `pikachu` `electabuzz`
> `growlithe` `koffing` `hitmonchan` — full rows in [`species-r2.md`](species-r2.md) — and, from `species-r1.md`,
> `bellsprout` and `lapras`. The rest of this table (`dratini`, `jigglypuff`, `meowth`, `ekans`, `exeggcute`) is
> still reserved; `species-r2.md` §5 says what stands in for each.

| Line | Species (dex) | Types | Biome | Rarity |
|---|---|---|---|---|
| `tentacool` | `tentacool` 72 → `tentacruel` 73 | Water/Poison | sea | common |
| `shellder` | `shellder` 90 → `cloyster` 91 | Water (→ Water/Ice) | sea | common |
| `horsea` | `horsea` 116 → `seadra` 117 | Water | sea | common |
| `staryu` | `staryu` 120 → `starmie` 121 | Water (→ Water/Psychic) | sea | uncommon |
| `seel` | `seel` 86 → `dewgong` 87 | Water (→ Water/Ice) | sea | uncommon |
| `dratini` | `dratini` 147 → `dragonair` 148 → `dragonite` 149 | Dragon (→ Dragon/Flying) | sea | rare |
| `voltorb` | `voltorb` 100 → `electrode` 101 | Electric | power-plant | common |
| `magnemite` | `magnemite` 81 → `magneton` 82 | Electric | power-plant | common |
| `pikachu` | `pikachu` 25 → `raichu` 26 | Electric | power-plant | uncommon · meta-starter §8.5.2 |
| `electabuzz` | `electabuzz` 125 | Electric | power-plant | uncommon (single stage) |
| `jigglypuff` | `jigglypuff` 39 → `wigglytuff` 40 | Normal | meadow | common |
| `meowth` | `meowth` 52 → `persian` 53 | Normal | meadow | common |
| `growlithe` | `growlithe` 58 → `arcanine` 59 | Fire | volcano/meadow | uncommon |
| `koffing` | `koffing` 109 → `weezing` 110 | Poison | cave | common |
| `ekans` | `ekans` 23 → `arbok` 24 | Poison | meadow | common |
| `hitmonchan` | `hitmonchan` 107 | Fighting | — (trainer only) | — |
| `exeggcute` | `exeggcute` 102 → `exeggutor` 103 | Grass/Psychic | meadow | uncommon |

## Region 3 — Volcanic Highlands (volcano primary; cave, sky, tower secondary)

| Line | Species (dex) | Types | Biome | Rarity |
|---|---|---|---|---|
| `vulpix` | `vulpix` 37 → `ninetales` 38 | Fire | volcano | common |
| `ponyta` | `ponyta` 77 → `rapidash` 78 | Fire | volcano | common |
| `magmar` | `magmar` 126 | Fire | volcano | uncommon (single stage) |
| `spearow` | `spearow` 21 → `fearow` 22 | Normal/Flying | sky | common |
| `doduo` | `doduo` 84 → `dodrio` 85 | Normal/Flying | sky | uncommon |
| `farfetchd` | `farfetchd` 83 | Normal/Flying | sky | uncommon (single stage) |
| `gastly` | `gastly` 92 → `haunter` 93 → `gengar` 94 | Ghost/Poison | tower | common |
| `drowzee` | `drowzee` 96 → `hypno` 97 | Psychic | tower | uncommon |
| `cubone` | `cubone` 104 → `marowak` 105 | Ground | tower | rare |
| `mr-mime` | `mr-mime` 122 | Psychic | tower | rare (single stage) |
| `abra` | `abra` 63 → `kadabra` 64 → `alakazam` 65 | Psychic | cave | uncommon |
| `rhyhorn` | `rhyhorn` 111 → `rhydon` 112 | Ground/Rock | volcano | uncommon |
| `nidoran-f` | `nidoran-f` 29 → `nidorina` 30 → `nidoqueen` 31 | Poison (→ Poison/Ground) | cave | uncommon |
| `sandshrew` | `sandshrew` 27 → `sandslash` 28 | Ground | volcano | common |
| `chansey` | `chansey` 113 | Normal | — (Victory Road Apex) | rare |
| `kangaskhan` | `kangaskhan` 115 | Normal | — (Victory Road Apex) | rare |
| `articuno` `zapdos` `moltres` `mewtwo` | 144–146, 150 | — | — | 🔒 post-launch; ids reserved only |

## Notes

- The three meta-unlocked starters are `pikachu`, `eevee` and **`magikarp`** (§8.5.2). Riolu was the original
  third pick, but it is Gen IV in a Gen I project, and the "weak early, devastating later" fantasy it existed
  for is exactly what the Magikarp line already delivers — with a three-card deck for the first stretch of a
  run, which is a far more interesting cost.
- `marowak` appears in both files: R1 as the Elite Wild recruit, R3 as the natural `cubone` evolution.
  One species entry, two acquisition routes — do not duplicate the id.
- Single-stage species get +25 % stat growth per level (§6.2.4) to compensate for never evolving.
