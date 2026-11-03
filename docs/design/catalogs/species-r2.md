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
> - **Evolution at the series' levels** (v0.9.90, §6.2.4). Region 2's recruits arrive at Lv 19–30, mostly below their
>   threshold; one caught past it (a Geodude at 26) evolves after the catch fight, and the catch is where its branch is
>   chosen (§6.3.1 queues it with the recruit). *(Until v0.9.90 every basic evolved at 12, so every catch did.)*
> - **Abilities.** The pools use only authored abilities, plus two added for this Region: `static` (Pikachu's
>   line, Voltorb's, Electabuzz) and `thick-fat` (Seel's).
> - **Mastery lines** carry their Lv1 since v0.7.5 (`mastery-moves.md`); Lv2 and Lv3 arrive with the Bond revamp (v0.9.1).
>
> *(Settled while building v0.7.3, 2026-09-23. The pool file gave ids, types and biomes, not kits.)*

## 1. Sea — 5 lines

### `tentacool` line — Water/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tentacool` | 72 | basic | Water/Poison | 40/40/35/100/70 | 100/68 | common | **L30** → `tentacruel` | 1 `acid` · 1 `supersonic` · 5 `wrap` · 8 `constrict` · 11 `poison-sting` · 29 `water-pulse` |
| `tentacruel` | 73 | stage1 | Water/Poison | 80/70/65/120/100 | 120/93 | — | — | 30 `bubble-beam` · 30 `sludge` (← `acid`) · 36 `poison-jab` (← `wrap`) · 47 `hydro-pump` (← `water-pulse`) |

**Abilities** `poison-point` `water-absorb` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Tentacool: `rest` · Tentacruel: —

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `tentacruel` | — | **Man-o'-War** — `acid` → `acid-plus` · `poison-sting` → `bubble-beam` · **+`hydro-pump`** | **Stinging Veil** — `supersonic` → `supersonic-plus` · `wrap` → `barrier` · **+`screech`** · grants `poison-point` |

### `shellder` line — Water → Water/Ice · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `shellder` | 90 | basic | Water | 30/65/100/45/40 | 65/73 | common | **Water Stone** (from L11) → `cloyster`; trainers field it from L30 | 1 `tackle` · 1 `withdraw` · 5 `supersonic` · 11 `clamp` · 14 `water-gun` · 16 `protect` · 28 `ice-shard` |
| `cloyster` | 91 | stage1 | Water/Ice | 50/95/180/85/70 | 95/133 | — | — | 30 `aurora-beam` (← `ice-shard`) · 33 `waterfall` (← `tackle`) · 34 `iron-defense` (← `withdraw`) · 39 `ice-beam` (← `aurora-beam`) · 47 `surf` (← `water-gun`) |

**Abilities** `shell-armor` `iron-shell` `sturdy` (the third is hidden, §6.8.3) · **Tutor** Shellder: `bubble-beam` `harden` · Cloyster: `hydro-pump` `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `cloyster` | **Spike Shell** — `clamp` → `clamp-plus` · `tackle` → `ice-punch` · **+`spike-cannon`** | — | **Pearl Fortress** — `withdraw` → `withdraw-plus` · `supersonic` → `aurora-beam` · **+`barrier`** · grants `shell-armor` |

### `horsea` line — Water · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `horsea` | 116 | basic | Water | 30/40/70/70/60 | 70/70 | common | **L32** → `seadra` | 1 `bubble` · 1 `smokescreen` · 5 `leer` · 11 `water-gun` · 14 `focus-energy` · 26 `twister` |
| `seadra` | 117 | stage1 | Water | 55/65/95/95/85 | 95/95 | — | — | 32 `bubble-beam` · 32 `surf` (← `bubble`) · 35 `screech` (← `leer`) · 40 `hydro-pump` (← `bubble-beam`) · 48 `dragon-dance` (← `focus-energy`) · 57 `dragon-pulse` |

**Abilities** `snipe` `damp` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Horsea: `swift` · Seadra: `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `seadra` | — | **Riptide** — `water-gun` → `hydro-pump` · `bubble` → `bubble-beam` · **+`ice-beam`** · grants `snipe` | **Ink Cloud** — `smokescreen` → `smokescreen-plus` · `leer` → `agility` · **+`haze`** |

### `staryu` line — Water → Water/Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `staryu` | 120 | basic | Water | 30/45/55/70/85 | 70/63 | uncommon | **Water Stone** (from L11) → `starmie`; trainers field it from L24 | 1 `tackle` · 1 `harden` · 5 `water-gun` · 11 `swift` |
| `starmie` | 121 | stage1 | Water/Psychic | 60/75/85/100/115 | 100/93 | — | — | 27 `waterfall` (← `tackle`) · 28 `surf` · 28 `confuse-ray` · 29 `iron-defense` (← `harden`) · 36 `psychic` · 44 `bubble-beam-plus` (← `water-gun`) |

**Abilities** `healer` `anticipation` `adaptability` (the third is hidden, §6.8.3) · **Tutor** Staryu: `agility` · Starmie: `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `starmie` | — | **Prism Core** — `swift` → `psychic` · `water-gun` → `bubble-beam` · **+`thunderbolt`** | **Mender** — `harden` → `recover` · `tackle` → `light-screen` · **+`minimize`** · grants `healer` |

### `seel` line — Water → Water/Ice · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `seel` | 86 | basic | Water | 65/45/55/70/45 | 70/63 | uncommon | **L34** → `dewgong` | 1 `headbutt` · 1 `growl` · 5 `aurora-beam` · 11 `water-gun` · 17 `ice-shard` · 23 `aqua-ring` · 31 `aqua-jet` |
| `dewgong` | 87 | stage1 | Water/Ice | 90/70/80/95/70 | 95/88 | — | — | 34 `surf` (← `water-gun`) · 37 `charm` (← `growl`) · 42 `blizzard` (← `aurora-beam`) · 43 `aqua-tail` (← `headbutt`) · 51 `safeguard` |

**Abilities** `thick-fat` `iron-shell` `healer` (the third is hidden, §6.8.3) · **Tutor** Seel: — · Dewgong: `hydro-pump`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dewgong` | **Tusk** — `headbutt` → `take-down` · `water-gun` → `waterfall` · **+`rest`** | — | **Floe** — `growl` → `growl-plus` · `aurora-beam` → `aurora-beam-plus` · **+`blizzard`** · grants `thick-fat` |

## 2. Power Plant — 3 lines and a single stage

### `voltorb` line — Electric · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `voltorb` | 100 | basic | Electric | 40/30/50/55/100 | 55/53 | common | **L30** → `electrode` | 1 `tackle` · 1 `screech` · 5 `sonic-boom` · 11 `thunder-shock` · 12 `spark` (← `tackle`) |
| `electrode` | 101 | stage1 | Electric | 60/50/70/80/140 | 80/75 | — | — | 30 `thunderbolt` · 33 `swift` · 57 `mirror-coat` |

**Abilities** `static` `run-down` `speed-boost` (the third is hidden, §6.8.3) · **Tutor** Voltorb: `thunder-wave` `defense-curl` · Electrode: `thunder` `tri-attack`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `electrode` | **Ball Lightning** — `tackle` → `self-destruct` · `thunder-shock` → `thunder-shock-plus` · **+`swift`** | **Capacitor** — `thunder-shock` → `thunderbolt` · `sonic-boom` → `sonic-boom-plus` · **+`light-screen`** · grants `static` | — |

### `magnemite` line — Electric/Steel · common · v0.9.84: Steel from Gen II, and a third stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `magnemite` | 81 | basic | Electric/Steel | 25/35/70/95/45 | 95/83 | common | **L30** → `magneton` | 1 `tackle` · 1 `sonic-boom` · 3 `metal-sound` · 5 `thunder-shock` · 11 `supersonic` · 22 `spark` (← `tackle`) |
| `magneton` | 82 | stage1 | Electric/Steel | 50/60/95/120/70 | 120/108 | — | **Thunder Stone** (from L25) → `magnezone`; trainers field it from L40 | 30 `thunderbolt` · 30 `swift` |
| `magnezone` | 462 | stage2 (final) | Electric/Steel | 70/70/115/130·90/60 | 130/103 | rare | — | 40 `magnet-bomb` · 40 `discharge` (← `thunder-shock`) · 46 `iron-head` · 54 `flash-cannon` (← `magnet-bomb`) · 60 `zap-cannon` (← `discharge`) |

**Abilities** `sturdy` `static` `solid-rock` (the third is hidden, §6.8.3) · **Tutor** Magnemite: `defense-curl` `slash` · Magneton: `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `magnezone` | **Gunmetal** — `tackle` → `meteor-mash` · `supersonic` → `metal-claw` · grants `sturdy` | **Mag Cannon** — `sonic-boom` → `magnet-bomb` · `supersonic` → `flash-cannon` · grants `static` | — |
| → `magneton` | — | **Tri-Coil** — `thunder-shock` → `thunderbolt` · `sonic-boom` → `sonic-boom-plus` · **+`swift`** | **Field Lock** — `supersonic` → `thunder-wave` · `tackle` → `screech` · **+`light-screen`** · grants `sturdy` |

### `pikachu` line — Electric · uncommon · the third meta-starter (§8.5.2)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `pikachu` | 25 | basic | Electric | 35/55/30/50/90 | 55/40 | uncommon | **Thunder Stone** (from L11) → `raichu`; trainers field it from L26 | 1 `thunder-shock` · 1 `growl` · 5 `quick-attack` · 10 `thunder-wave` |
| `raichu` | 26 | stage1 | Electric | 60/90/55/90/100 | 90/73 | — | — | 26 `thunder-punch` · 28 `thunderbolt` · 29 `charm` (← `growl`) · 42 `swift` |

**Abilities** `static` `run-down` `volt-absorb` (the third is hidden, §6.8.3) · **Tutor** Pikachu: `surf` · Raichu: `body-slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `raichu` | **Volt Tackle** — `quick-attack` → `quick-attack-plus` · `thunder-shock` → `thunder-punch` · **+`slam`** | **Storm Cheeks** — `thunder-shock` → `thunderbolt` · `growl` → `agility` · **+`swift`** | **Static Field** — `growl` → `double-team` · `thunder-shock` → `thunder-shock-plus` · **+`light-screen`** · grants `static` |

### `electabuzz` line — Electric · single stage · the Power Plant's rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `electabuzz` | 125 | basic | Electric | 65/83/57/85/105 | 85/71 | rare | — | 1 `quick-attack` · 1 `leer` · 7 `thunder-shock` · 10 `low-kick` · 16 `swift` · 22 `screech` (← `leer`) · 25 `light-screen` · 28 `thunderbolt` · 28 `thunder-punch` · 37 `discharge` (← `thunder-shock`) |

**Abilities** `static` `hustle` · **Tutor** Electabuzz: `fire-punch` `ice-punch`

## 3. The Gyms' lines

### `growlithe` line — Fire · uncommon (Meadow) · the Fire Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `growlithe` | 58 | basic | Fire | 55/70/45/50/60 | 70/48 | uncommon | **Fire Stone** (from L11) → `arcanine`; trainers field it from L32 | 1 `bite` · 1 `roar` · 5 `ember` · 9 `leer` · 20 `flame-wheel` · 25 `reversal` · 28 `fire-fang` |
| `arcanine` | 59 | stage1 | Fire | 90/110/80/80/95 | 110/80 | — | — | 32 `take-down` · 32 `fire-spin` (← `ember`) · 35 `screech` (← `leer`) · 42 `flamethrower` (← `fire-spin`) |

**Abilities** `intimidate` `flash-fire` `steadfast` (the third is hidden, §6.8.3) · **Tutor** Growlithe: `confuse-ray` `agility` · Arcanine: `slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `arcanine` | **Legend Hound** — `bite` → `bite-plus` · `leer` → `take-down` · **+`quick-attack-plus`** · grants `intimidate` | **Firestorm** — `ember` → `flamethrower` · `roar` → `roar-plus` · **+`fire-spin`** | — |

### `koffing` line — Poison · common (Cave) · the Poison Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `koffing` | 109 | basic | Poison | 40/65/95/60/35 | 65/78 | common | **L35** → `weezing` | 1 `tackle` · 1 `smog` · 5 `smokescreen` · 11 `self-destruct` |
| `weezing` | 110 | stage1 | Poison | 65/90/120/85/60 | 90/103 | — | — | 35 `smog-plus` · 38 `poison-jab` (← `tackle`) · 39 `thunderbolt` · 47 `fire-blast` · 48 `sludge-bomb` |

**Abilities** `poison-point` `cloud-nine` · **Tutor** Koffing: `acid-armor` `screech` · Weezing: `flamethrower` `thunder`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `weezing` | **Detonator** — `self-destruct` → `self-destruct-plus` · `smog` → `smog-plus` · **+`explosion`** | — | **Miasma** — `smokescreen` → `smokescreen-plus` · `tackle` → `poison-gas` · **+`haze`** · grants `poison-point` |

## 4. Trainer-only

### `hitmonchan` line — Fighting · single stage · the Karate King's ace (§2.8.1)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `hitmonchan` | 107 | basic | Fighting | 50/105/79/35/76 | 105/57 | rare | — | 1 `comet-punch` · 1 `agility` · 11 `swift` · 11 `pursuit` · 16 `thunder-punch` · 16 `mach-punch` · 22 `fire-punch` (← `comet-punch`) · 26 `vacuum-wave` · 28 `mega-punch` · 31 `ice-punch` · 39 `submission` (← `mega-punch`) · 56 `close-combat` (← `submission`) |

**Abilities** `inner-focus` `steadfast` · **Tutor** Hitmonchan: `body-slam`

## 5. What Region 2 shipped without

- **`dratini`** — the pool's Sea rare. Lapras holds that slot (and is the Elite Wild), until a later version builds
  the three-stage Dragon line.
- **Jigglypuff, Meowth, Ekans and Exeggcute** — the Meadow and Cave extras. The Rocket Grunt fields Golbat and
  Raticate instead of Ekans (`trainers.md` §3).
- **Primeape, Haunter, Drowzee and Hypno** — the Region 2 Elite and Hex Maniac rows. The Karate King fields
  Machoke, and the Hex Maniac moves to Region 3 with its Ghosts (`elites.md` §3, `trainers.md` §3).
- **`electabuzz` is the Power Plant's rare**, not its uncommon. Zapdos is locked, so the pool needed a rare.
