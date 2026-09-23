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
>   12–20, so a Region 2 catch is already past its threshold. It evolves after the catch fight, and the catch is
>   where its branch is chosen (§6.3.1 queues it with the recruit).
> - **Abilities.** The pools use only authored abilities, plus two added for this Region: `static` (Pikachu's
>   line, Voltorb's, Electabuzz) and `thick-fat` (Seel's).
> - **Mastery lines are not written** for Region 2 (v0.7.5's leftovers), so these lines have no fifth card yet.
>
> *(Settled while building v0.7.3, 2026-09-23. The pool file gave ids, types and biomes, not kits.)*

## 1. Sea — 5 lines

### `tentacool` line — Water/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tentacool` | 72 | basic | Water/Poison | 40/40/35/100/70 | 100/68 | common | **L12** → `tentacruel` | 1 `poison-sting` · 1 `supersonic` · 4 `water-gun` · 7 `acid` · 10 `bubble-beam` |
| `tentacruel` | 73 | stage1 | Water/Poison | 80/70/65/120/100 | 120/93 | — | — | 14 `poison-jab` · 18 `toxic` · 22 `sludge-wave` · 28 `hydro-pump` |

**Growth** 2/3/2/3 · **Abilities** `poison-point` `water-absorb` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Tentacool: `aqua-ring` `screech` · Tentacruel: `surf` `brine`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `tentacruel` | — | **Man-o'-War** — `acid` → `sludge-bomb` · `water-gun` → `water-pulse` | **Stinging Veil** — `supersonic` → `toxic` · **+`acid-armor`** · grants `poison-point` |

### `shellder` line — Water → Water/Ice · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `shellder` | 90 | basic | Water | 30/65/100/45/40 | 65/73 | common | **L12** → `cloyster` | 1 `tackle` · 1 `withdraw` · 4 `clamp` · 7 `supersonic` · 10 `ice-shard` |
| `cloyster` | 91 | stage1 | Water/Ice | 50/95/180/85/70 | 95/133 | — | — | 14 `aurora-beam` · 18 `icicle-spear` · 22 `iron-defense` · 28 `ice-beam` · 34 `blizzard` |

**Growth** 2/3/4/2 · **Abilities** `shell-armor` `iron-shell` `sturdy` (the third is hidden, §6.8.3) · **Tutor** Shellder: `water-gun` `harden` · Cloyster: `hydro-pump` `surf`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `cloyster` | **Spike Shell** — `tackle` → `icicle-spear` · `ice-shard` → `ice-punch` | — | **Pearl Fortress** — `withdraw` → `iron-defense` · **+`aurora-beam`** · grants `shell-armor` |

### `horsea` line — Water · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `horsea` | 116 | basic | Water | 30/40/70/70/60 | 70/70 | common | **L12** → `seadra` | 1 `bubble` · 1 `smokescreen` · 4 `water-gun` · 7 `focus-energy` · 10 `dragon-rage` |
| `seadra` | 117 | stage1 | Water | 55/65/95/95/85 | 95/95 | — | — | 14 `bubble-beam` · 18 `agility` · 22 `dragon-pulse` · 28 `hydro-pump` |

**Growth** 2/3/2/3 · **Abilities** `snipe` `damp` `swift-swim` (the third is hidden, §6.8.3) · **Tutor** Horsea: `aqua-jet` `swift` · Seadra: `surf` `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `seadra` | — | **Riptide** — `water-gun` → `water-pulse` · **+`dragon-pulse`** · grants `snipe` | **Ink Cloud** — `smokescreen` → `screech` · **+`agility`** |

### `staryu` line — Water → Water/Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `staryu` | 120 | basic | Water | 30/45/55/70/85 | 70/63 | uncommon | **L12** → `starmie` | 1 `tackle` · 1 `harden` · 4 `water-gun` · 7 `rapid-spin` · 10 `swift` |
| `starmie` | 121 | stage1 | Water/Psychic | 60/75/85/100/115 | 100/93 | — | — | 14 `psybeam` · 18 `recover` · 22 `confuse-ray` · 26 `psychic` · 32 `hydro-pump` |

**Growth** 2/3/2/4 · **Abilities** `healer` `anticipation` `adaptability` (the third is hidden, §6.8.3) · **Tutor** Staryu: `bubble-beam` `agility` · Starmie: `surf` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `starmie` | — | **Prism Core** — `swift` → `psybeam` · **+`psychic`** | **Mender** — `harden` → `recover` · **+`confuse-ray`** · grants `healer` |

### `seel` line — Water → Water/Ice · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `seel` | 86 | basic | Water | 65/45/55/70/45 | 70/63 | uncommon | **L12** → `dewgong` | 1 `tackle` · 1 `growl` · 4 `powder-snow` · 7 `aqua-jet` · 10 `icy-wind` |
| `dewgong` | 87 | stage1 | Water/Ice | 90/70/80/95/70 | 95/88 | — | — | 14 `aurora-beam` · 18 `rest-s` · 22 `take-down` · 26 `ice-beam` · 32 `surf` |

**Growth** 3/2/3/2 · **Abilities** `thick-fat` `iron-shell` `healer` (the third is hidden, §6.8.3) · **Tutor** Seel: `water-gun` `headbutt` · Dewgong: `hydro-pump` `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dewgong` | **Tusk** — `tackle` → `take-down` · `aqua-jet` → `aqua-tail` | — | **Floe** — `growl` → `sing` · **+`rest-s`** · grants `thick-fat` |

## 2. Power Plant — 3 lines and a single stage

### `voltorb` line — Electric · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `voltorb` | 100 | basic | Electric | 40/30/50/55/100 | 55/53 | common | **L12** → `electrode` | 1 `tackle` · 1 `screech` · 4 `thunder-shock` · 7 `spark` · 10 `self-destruct` |
| `electrode` | 101 | stage1 | Electric | 60/50/70/80/140 | 80/75 | — | — | 14 `charge-beam` · 18 `swift` · 22 `discharge` · 26 `thunderbolt` · 32 `explosion` |

**Growth** 2/2/2/4 · **Abilities** `static` `run-down` `speed-boost` (the third is hidden, §6.8.3) · **Tutor** Voltorb: `thunder-wave` `rollout` · Electrode: `thunder` `tri-attack`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `electrode` | **Ball Lightning** — `self-destruct` → `explosion` · `tackle` → `take-down` | **Capacitor** — `thunder-shock` → `charge-beam` · **+`discharge`** · grants `static` | — |

### `magnemite` line — Electric · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `magnemite` | 81 | basic | Electric | 25/35/70/95/45 | 95/83 | common | **L12** → `magneton` | 1 `tackle` · 1 `supersonic` · 4 `thunder-shock` · 7 `thunder-wave` · 10 `charge-beam` |
| `magneton` | 82 | stage1 | Electric | 50/60/95/120/70 | 120/108 | — | — | 14 `swift` · 18 `screech` · 22 `tri-attack` · 26 `thunderbolt` · 34 `zap-cannon` |

**Growth** 2/3/3/2 · **Abilities** `sturdy` `static` `solid-rock` (the third is hidden, §6.8.3) · **Tutor** Magnemite: `rollout` `metal-claw` · Magneton: `thunder` `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `magneton` | — | **Tri-Coil** — `thunder-shock` → `thunderbolt` · **+`tri-attack`** | **Field Lock** — `supersonic` → `screech` · **+`iron-defense`** · grants `sturdy` |

### `pikachu` line — Electric · uncommon · the third meta-starter (§8.5.2)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `pikachu` | 25 | basic | Electric | 35/55/30/50/90 | 55/40 | uncommon | **L12** → `raichu` | 1 `thunder-shock` · 1 `growl` · 4 `quick-attack` · 7 `thunder-wave` · 10 `agility` |
| `raichu` | 26 | stage1 | Electric | 60/90/55/90/100 | 90/73 | — | — | 14 `slam` · 18 `thunderbolt` · 22 `iron-tail` · 28 `thunder` · 34 `volt-tackle` |

**Growth** 2/3/2/4 · **Abilities** `static` `run-down` `volt-absorb` (the third is hidden, §6.8.3) · **Tutor** Pikachu: `swift` `surf` · Raichu: `thunder-punch` `body-slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `raichu` | **Volt Tackle** — `quick-attack` → `volt-tackle` | **Storm Cheeks** — `thunder-shock` → `thunderbolt` · **+`thunder`** | **Static Field** — `growl` → `charm` · **+`discharge`** · grants `static` |

### `electabuzz` line — Electric · single stage · the Power Plant's rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `electabuzz` | 125 | basic | Electric | 65/83/57/85/105 | 85/71 | rare | — | 1 `quick-attack` · 1 `leer` · 5 `thunder-shock` · 9 `low-kick` · 13 `thunder-punch` · 18 `screech` · 24 `thunderbolt` · 30 `thunder` |

**Growth** 3/4/3/4 · **Abilities** `static` `hustle` · **Tutor** Electabuzz: `fire-punch` `ice-punch`

## 3. The Gyms' lines

### `growlithe` line — Fire · uncommon (Meadow) · the Fire Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `growlithe` | 58 | basic | Fire | 55/70/45/50/60 | 70/48 | uncommon | **L12** → `arcanine` | 1 `bite` · 1 `leer` · 4 `ember` · 7 `fire-fang` · 10 `take-down` |
| `arcanine` | 59 | stage1 | Fire | 90/110/80/80/95 | 110/80 | — | — | 14 `flame-wheel` · 18 `crunch` · 22 `extreme-speed` · 26 `flamethrower` · 32 `flare-blitz` |

**Growth** 3/3/2/3 · **Abilities** `intimidate` `flash-fire` `steadfast` (the third is hidden, §6.8.3) · **Tutor** Growlithe: `will-o-wisp` `agility` · Arcanine: `fire-blast` `iron-tail`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `arcanine` | **Legend Hound** — `bite` → `crunch` · **+`extreme-speed`** · grants `intimidate` | **Firestorm** — `ember` → `flamethrower` · **+`heat-wave`** | — |

### `koffing` line — Poison · common (Cave) · the Poison Gym

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `koffing` | 109 | basic | Poison | 40/65/95/60/35 | 65/78 | common | **L12** → `weezing` | 1 `tackle` · 1 `smog` · 4 `smokescreen` · 7 `sludge` · 10 `self-destruct` |
| `weezing` | 110 | stage1 | Poison | 65/90/120/85/60 | 90/103 | — | — | 14 `toxic` · 18 `sludge-bomb` · 24 `sludge-wave` · 30 `explosion` |

**Growth** 2/2/4/1 · **Abilities** `poison-point` `cloud-nine` · **Tutor** Koffing: `acid-armor` `screech` · Weezing: `flamethrower` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `weezing` | **Detonator** — `self-destruct` → `explosion` · `tackle` → `take-down` | — | **Miasma** — `smokescreen` → `poison-powder` · **+`will-o-wisp`** · grants `poison-point` |

## 4. Trainer-only

### `hitmonchan` line — Fighting · single stage · the Karate King's ace (§2.8.1)

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `hitmonchan` | 107 | basic | Fighting | 50/105/79/35/76 | 105/57 | rare | — | 1 `mach-punch` · 1 `bulk-up` · 6 `fire-punch` · 12 `ice-punch` · 18 `thunder-punch` · 24 `sky-uppercut` · 30 `close-combat` |

**Growth** 3/4/3/3 · **Abilities** `inner-focus` `steadfast` · **Tutor** Hitmonchan: `agility` `body-slam`

## 5. What Region 2 shipped without

- **`dratini`** — the pool's Sea rare. Lapras holds that slot (and is the Elite Wild), until a later version builds
  the three-stage Dragon line.
- **Jigglypuff, Meowth, Ekans and Exeggcute** — the Meadow and Cave extras. The Rocket Grunt fields Golbat and
  Raticate instead of Ekans (`trainers.md` §3).
- **Primeape, Haunter, Drowzee and Hypno** — the Region 2 Elite and Hex Maniac rows. The Karate King fields
  Machoke, and the Hex Maniac moves to Region 3 with its Ghosts (`elites.md` §3, `trainers.md` §3).
- **`electabuzz` is the Power Plant's rare**, not its uncommon. Zapdos is locked, so the pool needed a rare.
