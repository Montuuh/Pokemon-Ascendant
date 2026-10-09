# Species catalog — Region 2, Coastal Cliffs (10 lines · 23 species) ✅ v0.7.3

> Implements §2.6.3 (biome pools), §2.6.5 (wild level bands), §6.9 (level-gated learnsets), §6.3.3 (archetype
> branches), §6.5.1 (`AvailableAbilities`), §6.4.3 (tutor lists) for the lines Region 2 needs. Same columns and
> shared rules as [`species-r1.md`](species-r1.md) §0; ids were reserved in
> [`species-pool-r2-r3.md`](species-pool-r2-r3.md). Two more lines Region 2 fields are catalogued in
> `species-r1.md` and shipped from there: `bellsprout` (the Grass Gym's slot 1, and Region 1's widened Meadow)
> and `lapras` (the Sea's rare and the Region 2 Elite Wild). Status legend in `README.md`.
>
> **Shipped state (2026-09-23).** Every table below is generated from `species.json`, so it is the build.
>
> - **Every basic evolves at 12, the uniform rule** (`species-r1.md` §0). Region 2's recruits arrive at Lv
>   14–22, so a Region 2 catch is already past its threshold. It evolves after the catch fight, and the catch is
>   where its branch is chosen (§6.3.1 queues it with the recruit).
> - **Abilities.** The pools use only authored abilities, plus two added for this Region: `static` (Pikachu's
>   line, Voltorb's, Electabuzz) and `thick-fat` (Seel's).
> - **Mastery lines** carry their Lv1 since v0.7.5 (`mastery-moves.md`); Lv2 and Lv3 arrive with the Bond revamp (v0.9.1).
>
> *(Settled while building v0.7.3, 2026-09-23. The pool file gave ids, types and biomes, not kits.)*

## 1. Sea — 5 lines

### `tentacool` line — Water/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tentacool` | 72 | basic | Water/Poison | 40/40/35/100/70 | 100/68 | common | **L12** → `tentacruel` | 1 `acid` · 1 `supersonic` · 4 `wrap` · 8 `poison-sting` |
| `tentacruel` | 73 | stage1 | Water/Poison | 80/70/65/120/100 | 120/93 | — | — | 16 `bubble-beam` · 22 `sludge` · 34 `hydro-pump` |

**Abilities** `poison-point` `water-absorb` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Tentacool: `rest` · Tentacruel: —

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `tentacruel` | — | **Man-o'-War** — `acid` → `acid-plus` · `poison-sting` → `bubble-beam` · **+`hydro-pump`** | **Stinging Veil** — `supersonic` → `supersonic-plus` · `wrap` → `barrier` · **+`screech`** · grants `poison-point` |

### `shellder` line — Water → Water/Ice · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `shellder` | 90 | basic | Water | 30/65/100/45/40 | 65/73 | common | **L12** → `cloyster` | 1 `tackle` · 1 `withdraw` · 4 `supersonic` · 8 `clamp` · 10 `water-gun` |
| `cloyster` | 91 | stage1 | Water/Ice | 50/95/180/85/70 | 95/133 | — | — | 16 `aurora-beam` · 22 `clamp` · 28 `ice-beam` · 34 `surf` |

**Abilities** `shell-armor` `iron-shell` `sturdy` (the third is hidden, §6.8.3) · **Tutor** Shellder: `bubble-beam` `harden` · Cloyster: `hydro-pump` `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `cloyster` | **Spike Shell** — `clamp` → `clamp-plus` · `tackle` → `ice-punch` · **+`spike-cannon`** | — | **Pearl Fortress** — `withdraw` → `withdraw-plus` · `supersonic` → `aurora-beam` · **+`barrier`** · grants `shell-armor` |

### `horsea` line — Water · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `horsea` | 116 | basic | Water | 30/40/70/70/60 | 70/70 | common | **L12** → `seadra` | 1 `bubble` · 1 `smokescreen` · 4 `leer` · 8 `water-gun` |
| `seadra` | 117 | stage1 | Water | 55/65/95/95/85 | 95/95 | — | — | 16 `bubble-beam` · 22 `surf` · 30 `hydro-pump` |

**Abilities** `snipe` `damp` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Horsea: `swift` · Seadra: `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `seadra` | — | **Riptide** — `water-gun` → `hydro-pump` · `bubble` → `bubble-beam` · **+`ice-beam`** · grants `snipe` | **Ink Cloud** — `smokescreen` → `smokescreen-plus` · `leer` → `agility` · **+`haze`** |

### `staryu` line — Water → Water/Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `staryu` | 120 | basic | Water | 30/45/55/70/85 | 70/63 | uncommon | **L12** → `starmie` | 1 `tackle` · 1 `harden` · 4 `water-gun` · 8 `swift` |
| `starmie` | 121 | stage1 | Water/Psychic | 60/75/85/100/115 | 100/93 | — | — | 16 `swift` · 20 `surf` · 26 `psychic` · 32 `bubble-beam-plus` |

**Abilities** `healer` `anticipation` `adaptability` (the third is hidden, §6.8.3) · **Tutor** Staryu: `agility` · Starmie: `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `starmie` | — | **Prism Core** — `swift` → `psychic` · `water-gun` → `bubble-beam` · **+`thunderbolt`** | **Mender** — `harden` → `recover` · `tackle` → `light-screen` · **+`minimize`** · grants `healer` |

### `seel` line — Water → Water/Ice · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `seel` | 86 | basic | Water | 65/45/55/70/45 | 70/63 | uncommon | **L12** → `dewgong` | 1 `headbutt` · 1 `growl` · 4 `aurora-beam` · 8 `water-gun` |
| `dewgong` | 87 | stage1 | Water/Ice | 90/70/80/95/70 | 95/88 | — | — | 16 `aurora-beam` · 24 `surf` · 30 `blizzard` |

**Abilities** `thick-fat` `iron-shell` `healer` (the third is hidden, §6.8.3) · **Tutor** Seel: — · Dewgong: `hydro-pump`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dewgong` | **Tusk** — `headbutt` → `take-down` · `water-gun` → `waterfall` · **+`rest`** | — | **Floe** — `growl` → `growl-plus` · `aurora-beam` → `aurora-beam-plus` · **+`blizzard`** · grants `thick-fat` |

## 2. Power Plant — 3 lines and a single stage

### `voltorb` line — Electric · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `voltorb` | 100 | basic | Electric | 40/30/50/55/100 | 55/53 | common | **L12** → `electrode` | 1 `tackle` · 1 `screech` · 4 `sonic-boom` · 8 `thunder-shock` |
| `electrode` | 101 | stage1 | Electric | 60/50/70/80/140 | 80/75 | — | — | 16 `thunderbolt` · 24 `swift` |

**Abilities** `static` `run-down` `speed-boost` (the third is hidden, §6.8.3) · **Tutor** Voltorb: `thunder-wave` `defense-curl` · Electrode: `thunder` `tri-attack`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `electrode` | **Ball Lightning** — `tackle` → `self-destruct` · `thunder-shock` → `thunder-shock-plus` · **+`swift`** | **Capacitor** — `thunder-shock` → `thunderbolt` · `sonic-boom` → `sonic-boom-plus` · **+`light-screen`** · grants `static` | — |

### `magnemite` line — Electric · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `magnemite` | 81 | basic | Electric | 25/35/70/95/45 | 95/83 | common | **L12** → `magneton` | 1 `tackle` · 1 `sonic-boom` · 4 `thunder-shock` · 8 `supersonic` |
| `magneton` | 82 | stage1 | Electric | 50/60/95/120/70 | 120/108 | — | — | 16 `thunderbolt` · 22 `swift` |

**Abilities** `sturdy` `static` `solid-rock` (the third is hidden, §6.8.3) · **Tutor** Magnemite: `defense-curl` `slash` · Magneton: `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `magneton` | — | **Tri-Coil** — `thunder-shock` → `thunderbolt` · `sonic-boom` → `sonic-boom-plus` · **+`swift`** | **Field Lock** — `supersonic` → `thunder-wave` · `tackle` → `screech` · **+`light-screen`** · grants `sturdy` |

### `pikachu` line — Electric · uncommon · the third meta-starter (§8.5.2)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `pikachu` | 25 | basic | Electric | 35/55/30/50/90 | 55/40 | uncommon | **L12** → `raichu` | 1 `thunder-shock` · 1 `growl` · 4 `quick-attack` · 8 `thunder-wave` |
| `raichu` | 26 | stage1 | Electric | 60/90/55/90/100 | 90/73 | — | — | 14 `thunder-punch` · 20 `thunderbolt` · 30 `swift` |

**Abilities** `static` `run-down` `volt-absorb` (the third is hidden, §6.8.3) · **Tutor** Pikachu: `surf` · Raichu: `body-slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `raichu` | **Volt Tackle** — `quick-attack` → `quick-attack-plus` · `thunder-shock` → `thunder-punch` · **+`slam`** | **Storm Cheeks** — `thunder-shock` → `thunderbolt` · `growl` → `agility` · **+`swift`** | **Static Field** — `growl` → `double-team` · `thunder-shock` → `thunder-shock-plus` · **+`light-screen`** · grants `static` |

### `electabuzz` line — Electric · single stage · the Power Plant's rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `electabuzz` | 125 | basic | Electric | 65/83/57/85/105 | 85/71 | rare | — | 1 `quick-attack` · 1 `leer` · 8 `thunder-shock` · 16 `screech` · 20 `thunderbolt` · 24 `thunder-punch` |

**Abilities** `static` `hustle` · **Tutor** Electabuzz: `fire-punch` `ice-punch`

## 3. The Gyms' lines

### `growlithe` line — Fire · uncommon (Meadow) · the Fire Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `growlithe` | 58 | basic | Fire | 55/70/45/50/60 | 70/48 | uncommon | **L12** → `arcanine` | 1 `bite` · 1 `roar` · 4 `ember` · 8 `leer` |
| `arcanine` | 59 | stage1 | Fire | 90/110/80/80/95 | 110/80 | — | — | 16 `take-down` · 22 `fire-spin` · 30 `flamethrower` |

**Abilities** `intimidate` `flash-fire` `steadfast` (the third is hidden, §6.8.3) · **Tutor** Growlithe: `confuse-ray` `agility` · Arcanine: `slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `arcanine` | **Legend Hound** — `bite` → `bite-plus` · `leer` → `take-down` · **+`quick-attack-plus`** · grants `intimidate` | **Firestorm** — `ember` → `flamethrower` · `roar` → `roar-plus` · **+`fire-spin`** | — |

### `koffing` line — Poison · common (Cave) · the Poison Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `koffing` | 109 | basic | Poison | 40/65/95/60/35 | 65/78 | common | **L12** → `weezing` | 1 `tackle` · 1 `smog` · 4 `smokescreen` · 8 `self-destruct` |
| `weezing` | 110 | stage1 | Poison | 65/90/120/85/60 | 90/103 | — | — | 16 `smog-plus` · 28 `thunderbolt` · 34 `fire-blast` |

**Abilities** `poison-point` `cloud-nine` · **Tutor** Koffing: `acid-armor` `screech` · Weezing: `flamethrower` `thunder`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `weezing` | **Detonator** — `self-destruct` → `self-destruct-plus` · `smog` → `smog-plus` · **+`explosion`** | — | **Miasma** — `smokescreen` → `smokescreen-plus` · `tackle` → `poison-gas` · **+`haze`** · grants `poison-point` |

## 4. Trainer-only

### `hitmonchan` line — Fighting · single stage · the Karate King's ace (§2.8.1)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `hitmonchan` | 107 | basic | Fighting | 50/105/79/35/76 | 105/57 | rare | — | 1 `comet-punch` · 1 `agility` · 8 `swift` · 12 `thunder-punch` · 16 `fire-punch` · 20 `mega-punch` · 24 `ice-punch` · 28 `submission` |

**Abilities** `inner-focus` `steadfast` · **Tutor** Hitmonchan: `body-slam`

## 5. What Region 2 shipped without

- **`dratini`** — the pool's Sea rare. Lapras holds that slot (and is the Elite Wild), until a later version builds
  the three-stage Dragon line.
- **Jigglypuff, Meowth, Ekans and Exeggcute** — the Meadow and Cave extras. The Rocket Grunt fields Golbat and
  Raticate instead of Ekans (`trainers.md` §3).
- **Primeape, Haunter, Drowzee and Hypno** — the Region 2 Elite and Hex Maniac rows. The Karate King fields
  Machoke, and the Hex Maniac moves to Region 3 with its Ghosts (`elites.md` §3, `trainers.md` §3).
- **`electabuzz` is the Power Plant's rare**, not its uncommon. Zapdos is locked, so the pool needed a rare.
