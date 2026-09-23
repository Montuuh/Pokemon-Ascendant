# Species catalog — the rest of the 151 (77 species + Poliwrath) ✅ 2026-09-23

> Implements §6.9 (level-gated learnsets), §6.3.3 (archetype branches), §6.5.1 (`AvailableAbilities`), §6.4.3
> (tutor lists) for every Gen I species the first two Regions did not need. Same columns and shared rules as
> [`species-r1.md`](species-r1.md) §0: stats derived by §4.1.5.1, evolution at 12 and 26, learnsets under each
> threshold, two moves at Lv 1 and at most one positional card on a base form, the +25 % growth on a single stage.
> Every table below is generated from `species.json`, so it is the build.
>
> **Why all of them at once.** The user asked for the whole Pokédex to be designed and ready "whenever it is
> needed", before Region 3 (2026-09-23). None of these is in a wild pool, a roster or a Gym yet: a Region takes a
> line when it needs it, and the Pokédex already shows all 151 — as silhouettes until met (§8.9.2).
> [`species-pool-r2-r3.md`](species-pool-r2-r3.md)'s ceiling of ~30 lines is superseded by that request.
>
> **Canon rows win.** Where `species-r1.md` or `moves.md` already had a row, that row shipped: Mankey and
> Primeape, Aerodactyl, Marowak (compressed to start after Cubone's threshold), Poliwhirl's evolution into
> Poliwrath (in `species-r1.md`'s Poliwag line), and a dozen moves (Rage, Mega Punch, Hyper Beam, Fury Swipes,
> Thrash, Bone Club, Bonemerang, Bone Rush, Lick, Air Cutter, Sky Drop, Ancient Power, Signal Beam, Heavy Slam).
> A rider the sim has no effect kind for ships without it, v0.3's rule; Mankey's Seismic Toss+ (level × 3) lands
> on Seismic Toss. Unauthored abilities drop out of a pool, and nine new ones use hooks the sim already reads
> (`abilities.md`).
>
> **The legendaries** — Articuno, Zapdos, Moltres, Mewtwo, Mew — are designed and authored at rarity
> `legendary`, and placed nowhere: how a run ever meets one is still a post-launch question
> (`species-pool-r2-r3.md`).
>
> **Ditto's Transform is in the backlog** (the user likes it and wants it later, 2026-09-24; `docs/roadmap.md`).
> In the games it copies its target — types, stats, moves; the sim has no copy kind yet, so Ditto ships with a
> stand-in (`transform-d`, self Atk +1 and Def +1) and a spare card, and its two-card kit is a recorded exception
> to §6.9's four (like Magikarp's three). Until the real move exists, Ditto sits in no pool.

## 1. Routes and meadows

### `spearow` line — Normal/Flying · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `spearow` | 21 | basic | Normal/Flying | 40/60/30/31/70 | 60/31 | common | **L12** → `fearow` | 1 `peck` · 1 `growl` · 4 `leer` · 7 `fury-attack` · 10 `aerial-ace` |
| `fearow` | 22 | stage1 | Normal/Flying | 65/90/65/61/100 | 90/63 | — | — | 14 `drill-peck` · 18 `agility` · 22 `drill-run` · 28 `air-slash` · 34 `brave-bird` |

**Growth** 2/3/2/3 · **Abilities** `keen-eye` `tangled-feet` `snipe` (the last is hidden, §6.8.3) · **Tutor** Spearow: `quick-attack` `swift` · Fearow: `sky-attack` `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `fearow` | **Drill Beak** — `peck` → `drill-peck` · **+`drill-run`** | **Skyhunter** — `aerial-ace` → `air-slash` | — |

### `ekans` line — Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ekans` | 23 | basic | Poison | 35/60/44/40/55 | 60/42 | common | **L12** → `arbok` | 1 `wrap` · 1 `leer` · 4 `poison-sting` · 7 `bite` · 10 `glare` |
| `arbok` | 24 | stage1 | Poison | 60/85/69/65/80 | 85/67 | — | — | 14 `acid` · 18 `poison-fang` · 22 `crunch` · 28 `sludge-bomb` · 34 `gunk-shot` |

**Growth** 2/3/2/3 · **Abilities** `intimidate` `poison-point` `guts` (the last is hidden, §6.8.3) · **Tutor** Ekans: `acid-armor` `dig` · Arbok: `earthquake` `iron-tail`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `arbok` | **Cobra** — `bite` → `crunch` · **+`poison-fang`** | — | **Hood** — `leer` → `screech` · **+`haze`** · grants `intimidate` |

### `sandshrew` line — Ground · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `sandshrew` | 27 | basic | Ground | 50/75/85/30/40 | 75/58 | common | **L12** → `sandslash` | 1 `scratch` · 1 `defense-curl` · 4 `sand-attack` · 7 `rollout` · 10 `fury-swipes` |
| `sandslash` | 28 | stage1 | Ground | 75/100/110/55/65 | 100/83 | — | — | 14 `slash` · 18 `dig` · 24 `drill-run` · 30 `earthquake` |

**Growth** 3/3/3/2 · **Abilities** `sand-veil` `iron-shell` `tough-claws` (the last is hidden, §6.8.3) · **Tutor** Sandshrew: `mud-shot` `bulldoze` · Sandslash: `stone-edge` `x-scissor`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `sandslash` | **Claw** — `scratch` → `slash` · **+`drill-run`** | — | **Spined Ball** — `defense-curl` → `iron-defense` · grants `iron-shell` |

### `nidoran-f` line — Poison · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `nidoran-f` | 29 | basic | Poison | 55/47/52/40/41 | 47/46 | uncommon | **L12** → `nidorina` | 1 `growl` · 1 `scratch` · 4 `tail-whip` · 7 `poison-sting` · 10 `double-kick` |
| `nidorina` | 30 | stage1 | Poison | 70/62/67/55/56 | 62/61 | — | **L26** → `nidoqueen` | 13 `bite` · 16 `fury-swipes` · 20 `toxic` · 23 `crunch` |
| `nidoqueen` | 31 | stage2 | Poison/Ground | 90/82/87/75/76 | 82/81 | — | — | 27 `body-slam` · 32 `earth-power` · 38 `sludge-wave` · 44 `earthquake` |

**Growth** 3/2/3/2 · **Abilities** `poison-point` `hustle` `guts` (the last is hidden, §6.8.3) · **Tutor** Nidoran♀: `quick-attack` `poison-fang` · Nidorina: `sludge` `take-down` · Nidoqueen: `surf` `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `nidorina` | **Thorn** — `scratch` → `fury-swipes` | — | **Den Mother** — `growl` → `charm` · grants `poison-point` |
| → `nidoqueen` | **Earthshaker** — `double-kick` → `body-slam` · **+`earthquake`** | **Poison Queen** — `poison-sting` → `sludge-bomb` · **+`earth-power`** | — |

### `nidoran-m` line — Poison · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `nidoran-m` | 32 | basic | Poison | 46/57/40/40/50 | 57/40 | uncommon | **L12** → `nidorino` | 1 `leer` · 1 `peck` · 4 `focus-energy` · 7 `poison-sting` · 10 `double-kick` |
| `nidorino` | 33 | stage1 | Poison | 61/72/57/55/65 | 72/56 | — | **L26** → `nidoking` | 13 `horn-attack` · 16 `fury-attack` · 20 `poison-jab` · 23 `thrash` |
| `nidoking` | 34 | stage2 | Poison/Ground | 81/92/77/75/85 | 92/76 | — | — | 27 `earth-power` · 32 `megahorn` · 38 `earthquake` · 44 `horn-drill` |

**Growth** 2/3/2/3 · **Abilities** `poison-point` `hustle` `guts` (the last is hidden, §6.8.3) · **Tutor** Nidoran♂: `quick-attack` `poison-fang` · Nidorino: `sludge` `take-down` · Nidoking: `thunderbolt` `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `nidorino` | **Horn** — `peck` → `horn-attack` | **Venom Horn** — `poison-sting` → `poison-jab` | — |
| → `nidoking` | **Earth King** — `horn-attack` → `megahorn` · **+`earthquake`** | **Toxic King** — `poison-jab` → `sludge-wave` · **+`earth-power`** | — |

### `meowth` line — Normal · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `meowth` | 52 | basic | Normal | 40/45/35/40/90 | 45/38 | common | **L12** → `persian` | 1 `scratch` · 1 `growl` · 4 `bite` · 7 `pay-day` · 10 `fury-swipes` |
| `persian` | 53 | stage1 | Normal | 65/70/60/65/115 | 70/63 | — | — | 14 `slash` · 18 `screech` · 22 `power-gem` · 28 `agility` · 34 `hyper-voice` |

**Growth** 2/2/2/4 · **Abilities** `run-down` `tough-claws` `moxie` (the last is hidden, §6.8.3) · **Tutor** Meowth: `quick-attack` `charm` · Persian: `thunderbolt` `iron-tail`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `persian` | **Prowler** — `scratch` → `slash` · **+`sucker-punch`** | **Jewel** — `pay-day` → `power-gem` · **+`swift`** | — |

### `mankey` line — Fighting · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mankey` | 56 | basic | Fighting | 40/80/35/35/70 | 80/35 | uncommon | **L12** → `primeape` | 1 `scratch` · 1 `leer` · 4 `low-kick` · 7 `karate-chop` · 10 `focus-energy` |
| `primeape` | 57 | stage1 | Fighting | 65/105/60/60/95 | 105/60 | — | — | 14 `seismic-toss` · 18 `fury-swipes` · 22 `cross-chop` · 28 `thrash` · 34 `close-combat` |

**Growth** 2/3/1/3 · **Abilities** `vital-spirit` `guts` (the last is hidden, §6.8.3) · **Tutor** Mankey: `bulk-up` `rolling-kick` · Primeape: `brick-break` `stone-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `primeape` | **Fury** — `karate-chop` → `cross-chop` · **+`close-combat`** | **Brawler** — `low-kick` → `seismic-toss` · **+`fury-swipes`** | — |

### `doduo` line — Normal/Flying · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `doduo` | 84 | basic | Normal/Flying | 35/85/45/35/75 | 85/40 | uncommon | **L12** → `dodrio` | 1 `peck` · 1 `growl` · 4 `quick-attack` · 7 `fury-attack` · 10 `rage` |
| `dodrio` | 85 | stage1 | Normal/Flying | 60/110/70/60/100 | 110/65 | — | — | 14 `drill-peck` · 18 `agility` · 22 `tri-attack` · 28 `thrash` · 34 `brave-bird` |

**Growth** 2/3/2/3 · **Abilities** `keen-eye` `tangled-feet` `run-down` (the last is hidden, §6.8.3) · **Tutor** Doduo: `double-kick` `swift` · Dodrio: `sky-attack` `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dodrio` | **Three Heads** — `peck` → `drill-peck` · **+`brave-bird`** | **Triple Call** — `rage` → `tri-attack` | — |

### `farfetchd` — Normal/Flying · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `farfetchd` | 83 | basic | Normal/Flying | 52/65/55/58/60 | 65/57 | uncommon | — | 1 `peck` · 1 `sand-attack` · 5 `leer` · 9 `fury-attack` · 13 `aerial-ace` · 18 `swords-dance` · 24 `slash` · 30 `leaf-blade` · 36 `brave-bird` |

**Growth** 3/4/3/4 · **Abilities** `keen-eye` `inner-focus` · **Tutor** Farfetch'd: `air-cutter` `x-scissor` · **Archetype** vanguard

### `tauros` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tauros` | 128 | basic | Normal | 75/100/95/70/110 | 100/83 | rare | — | 1 `tackle` · 1 `tail-whip` · 5 `rage` · 10 `horn-attack` · 15 `stomp` · 20 `take-down` · 26 `zen-headbutt` · 32 `thrash` · 38 `giga-impact-v` |

**Growth** 3/4/3/4 · **Abilities** `intimidate` `guts` · **Tutor** Tauros: `earthquake` `body-slam` · **Archetype** vanguard

### `kangaskhan` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `kangaskhan` | 115 | basic | Normal | 105/95/80/40/90 | 95/60 | rare | — | 1 `comet-punch` · 1 `leer` · 5 `bite` · 10 `rage` · 15 `mega-punch` · 20 `dizzy-punch` · 26 `crunch` · 32 `body-slam` · 38 `giga-impact-v` |

**Growth** 4/3/3/3 · **Abilities** `inner-focus` `guts` · **Tutor** Kangaskhan: `earthquake` `fire-punch` · **Archetype** vanguard

### `lickitung` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `lickitung` | 108 | basic | Normal | 90/55/75/60/30 | 60/68 | rare | — | 1 `lick` · 1 `supersonic` · 5 `wrap` · 10 `stomp` · 15 `disable` · 20 `slam` · 26 `screech` · 32 `power-whip` |

**Growth** 4/3/3/2 · **Abilities** `own-tempo` `cloud-nine` · **Tutor** Lickitung: `ice-beam` `thunderbolt` · **Archetype** support

## 2. Forest, marsh and mountain

### `clefairy` line — Normal · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `clefairy` | 35 | basic | Normal | 70/45/48/60/35 | 60/54 | uncommon | **L12** → `clefable` | 1 `pound` · 1 `growl` · 4 `sing` · 7 `double-slap` · 10 `minimize` |
| `clefable` | 36 | stage1 | Normal | 95/70/73/85/60 | 85/79 | — | — | 14 `body-slam` · 18 `moonlight` · 22 `light-screen` · 28 `double-edge` |

**Growth** 3/2/2/2 · **Abilities** `cute-charm` `solid-rock` `healer` (the last is hidden, §6.8.3) · **Tutor** Clefairy: `charm` `swift` · Clefable: `ice-beam` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `clefable` | — | **Moon Child** — `double-slap` → `hyper-voice` · **+`light-screen`** | **Moon Dancer** — `minimize` → `moonlight` · **+`wish`** · grants `cute-charm` |

### `jigglypuff` line — Normal · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `jigglypuff` | 39 | basic | Normal | 115/45/20/25/20 | 45/23 | common | **L12** → `wigglytuff` | 1 `sing` · 1 `pound` · 4 `defense-curl` · 7 `double-slap` · 10 `rest-s` |
| `wigglytuff` | 40 | stage1 | Normal | 140/70/45/50/45 | 70/48 | — | — | 14 `body-slam` · 18 `wish` · 22 `hyper-voice` · 28 `double-edge` |

**Growth** 4/2/1/1 · **Abilities** `cute-charm` `iron-shell` `healer` (the last is hidden, §6.8.3) · **Tutor** Jigglypuff: `charm` `disable` · Wigglytuff: `ice-beam` `psychic`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `wigglytuff` | **Big Balloon** — `pound` → `body-slam` · **+`double-edge`** | — | **Encore** — `defense-curl` → `minimize` · **+`wish`** · grants `cute-charm` |

### `paras` line — Bug/Grass · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `paras` | 46 | basic | Bug/Grass | 35/70/55/55/25 | 70/55 | common | **L12** → `parasect` | 1 `scratch` · 1 `stun-spore` · 4 `absorb` · 7 `leech-life` · 10 `spore-cloud` |
| `parasect` | 47 | stage1 | Bug/Grass | 60/95/80/80/30 | 95/80 | — | — | 14 `slash` · 18 `mega-drain` · 22 `x-scissor` · 28 `giga-drain` |

**Growth** 2/3/3/1 · **Abilities** `effect-spore` `swarm` `damp` (the last is hidden, §6.8.3) · **Tutor** Paras: `growth` `fury-swipes` · Parasect: `solar-beam` `swords-dance`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `parasect` | **Cordyceps** — `scratch` → `slash` · **+`x-scissor`** | — | **Spore Host** — `absorb` → `mega-drain` · **+`sleep-powder`** · grants `effect-spore` |

### `venonat` line — Bug/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `venonat` | 48 | basic | Bug/Poison | 60/55/50/40/45 | 55/45 | common | **L12** → `venomoth` | 1 `tackle` · 1 `disable` · 4 `supersonic` · 7 `confusion` · 10 `poison-powder` |
| `venomoth` | 49 | stage1 | Bug/Poison | 70/65/60/90/90 | 90/75 | — | — | 14 `psybeam` · 18 `silver-wind` · 22 `sleep-powder` · 28 `psychic` · 34 `bug-buzz` |

**Growth** 3/2/2/2 · **Abilities** `compound-eyes` `snipe` `run-down` (the last is hidden, §6.8.3) · **Tutor** Venonat: `leech-life` `stun-spore` · Venomoth: `signal-beam` `giga-drain`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `venomoth` | — | **Dust Wings** — `confusion` → `psybeam` · **+`bug-buzz`** | **Powder Moth** — `poison-powder` → `sleep-powder` · **+`silver-wind`** · grants `compound-eyes` |

### `exeggcute` line — Grass/Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `exeggcute` | 102 | basic | Grass/Psychic | 60/40/80/60/40 | 60/70 | uncommon | **L12** → `exeggutor` | 1 `barrage` · 1 `hypnosis` · 4 `leech-seed` · 7 `confusion` · 10 `stun-spore` |
| `exeggutor` | 103 | stage1 | Grass/Psychic | 95/95/85/125/55 | 125/105 | — | — | 14 `stomp` · 18 `egg-bomb` · 24 `psychic` · 30 `solar-beam` |

**Growth** 3/2/3/1 · **Abilities** `chlorophyll` `healer` · **Tutor** Exeggcute: `absorb` `mega-drain` · Exeggutor: `giga-drain` `extrasensory`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `exeggutor` | — | **Coconut** — `barrage` → `egg-bomb` · **+`psychic`** | **Seed Bearer** — `leech-seed` → `sleep-powder` · **+`reflect`** · grants `healer` |

### `tangela` — Grass · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tangela` | 114 | basic | Grass | 65/55/115/100/60 | 100/108 | uncommon | — | 1 `vine-whip` · 1 `wrap` · 5 `absorb` · 10 `poison-powder` · 15 `stun-spore` · 20 `mega-drain` · 26 `ingrain` · 32 `giga-drain` · 38 `power-whip` |

**Growth** 3/3/4/2 · **Abilities** `chlorophyll` `healer` · **Tutor** Tangela: `sleep-powder` `ancient-power` · **Archetype** support

### `pinsir` — Bug · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `pinsir` | 127 | basic | Bug | 65/125/100/55/85 | 125/78 | rare | — | 1 `vice-grip` · 1 `focus-energy` · 5 `harden` · 10 `seismic-toss` · 15 `x-scissor` · 20 `swords-dance` · 26 `submission` · 32 `guillotine` · 38 `megahorn` |

**Growth** 3/4/3/3 · **Abilities** `moxie` `guts` · **Tutor** Pinsir: `earthquake` `stone-edge` · **Archetype** vanguard

### `scyther` — Bug/Flying · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `scyther` | 123 | basic | Bug/Flying | 70/110/80/55/105 | 110/68 | rare | — | 1 `quick-attack` · 1 `leer` · 5 `focus-energy` · 10 `wing-attack` · 15 `slash` · 20 `swords-dance` · 26 `x-scissor` · 32 `air-slash` · 38 `fly` |

**Growth** 3/4/3/4 · **Abilities** `swarm` `steadfast` · **Tutor** Scyther: `aerial-ace` `double-edge` · **Archetype** vanguard

## 3. Fire, water and sea

### `vulpix` line — Fire · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `vulpix` | 37 | basic | Fire | 38/41/40/65/65 | 65/53 | common | **L12** → `ninetales` | 1 `ember` · 1 `tail-whip` · 4 `quick-attack` · 7 `confuse-ray` · 10 `fire-spin` |
| `ninetales` | 38 | stage1 | Fire | 73/76/75/100/100 | 100/88 | — | — | 14 `flamethrower` · 18 `will-o-wisp` · 22 `extrasensory` · 28 `heat-wave` · 34 `fire-blast` |

**Growth** 2/3/2/3 · **Abilities** `flash-fire` `flame-body` `anticipation` (the last is hidden, §6.8.3) · **Tutor** Vulpix: `agility` `swift` · Ninetales: `solar-beam` `psyshock`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `ninetales` | — | **Ninefold Flame** — `ember` → `flamethrower` · **+`heat-wave`** | **Kitsune** — `confuse-ray` → `will-o-wisp` · **+`calm-mind`** · grants `flash-fire` |

### `ponyta` line — Fire · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ponyta` | 77 | basic | Fire | 50/85/55/65/90 | 85/60 | common | **L12** → `rapidash` | 1 `tackle` · 1 `growl` · 4 `ember` · 7 `stomp` · 10 `fire-spin` |
| `rapidash` | 78 | stage1 | Fire | 65/100/70/80/105 | 100/75 | — | — | 14 `flame-wheel` · 18 `agility` · 24 `flare-blitz` · 30 `megahorn` |

**Growth** 2/3/2/3 · **Abilities** `flash-fire` `flame-body` `run-down` (the last is hidden, §6.8.3) · **Tutor** Ponyta: `double-kick` `quick-attack` · Rapidash: `drill-run` `solar-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `rapidash` | **Blaze Charger** — `tackle` → `take-down` · **+`flare-blitz`** | **Sunfire Mane** — `ember` → `flamethrower` · **+`heat-wave`** | — |

### `magmar` — Fire · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `magmar` | 126 | basic | Fire | 65/95/57/85/93 | 95/71 | uncommon | — | 1 `ember` · 1 `leer` · 5 `smog` · 10 `confuse-ray` · 15 `fire-punch` · 20 `lava-plume` · 26 `flamethrower` · 32 `fire-blast` |

**Growth** 3/4/3/4 · **Abilities** `flame-body` `vital-spirit` · **Tutor** Magmar: `thunder-punch` `psychic` · **Archetype** specialist

### `slowpoke` line — Water/Psychic · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `slowpoke` | 79 | basic | Water/Psychic | 90/65/65/40/15 | 65/53 | common | **L12** → `slowbro` | 1 `tackle` · 1 `growl` · 4 `water-gun` · 7 `confusion` · 10 `disable` |
| `slowbro` | 80 | stage1 | Water/Psychic | 95/75/110/80/30 | 80/95 | — | — | 14 `withdraw` · 18 `headbutt` · 22 `amnesia` · 28 `psychic` · 34 `surf` |

**Growth** 4/2/2/1 · **Abilities** `own-tempo` `healer` `solid-rock` (the last is hidden, §6.8.3) · **Tutor** Slowpoke: `bubble-beam` `body-slam` · Slowbro: `ice-beam` `flamethrower`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `slowbro` | — | **Tide Sage** — `confusion` → `psychic` · **+`calm-mind`** | **Shell Tail** — `growl` → `amnesia` · **+`recover`** · grants `own-tempo` |

### `goldeen` line — Water · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `goldeen` | 118 | basic | Water | 45/67/60/50/63 | 67/55 | common | **L12** → `seaking` | 1 `peck` · 1 `tail-whip` · 4 `water-gun` · 7 `supersonic` · 10 `horn-attack` |
| `seaking` | 119 | stage1 | Water | 80/92/65/80/68 | 92/73 | — | — | 14 `waterfall` · 18 `agility` · 22 `aqua-ring` · 28 `megahorn` · 34 `horn-drill` |

**Growth** 2/3/2/3 · **Abilities** `water-veil` `swift-swim` `snipe` (the last is hidden, §6.8.3) · **Tutor** Goldeen: `aqua-jet` `flail` · Seaking: `ice-beam` `surf`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `seaking` | **Horn Diver** — `horn-attack` → `megahorn` | **Waterfall** — `water-gun` → `waterfall` · **+`aqua-ring`** | — |

### `omanyte` line — Rock/Water · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `omanyte` | 138 | basic | Rock/Water | 35/40/100/90/35 | 90/95 | rare | **L12** → `omastar` | 1 `water-gun` · 1 `withdraw` · 4 `bite` · 7 `ancient-power` · 10 `spike-cannon` |
| `omastar` | 139 | stage1 | Rock/Water | 70/60/125/115/55 | 115/120 | — | — | 14 `brine` · 18 `rock-blast` · 22 `power-gem` · 28 `hydro-pump` |

**Growth** 2/3/3/2 · **Abilities** `shell-armor` `swift-swim` · **Tutor** Omanyte: `mud-shot` `aurora-beam` · Omastar: `ice-beam` `earth-power`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `omastar` | **Spike Shell** — `spike-cannon` → `rock-blast` · grants `shell-armor` | **Ancient Spiral** — `water-gun` → `hydro-pump` · **+`power-gem`** | — |

### `kabuto` line — Rock/Water · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `kabuto` | 140 | basic | Rock/Water | 30/80/90/45/55 | 80/68 | rare | **L12** → `kabutops` | 1 `scratch` · 1 `harden` · 4 `absorb` · 7 `aqua-jet` · 10 `ancient-power` |
| `kabutops` | 141 | stage1 | Rock/Water | 60/115/105/70/80 | 115/88 | — | — | 14 `slash` · 18 `mega-drain` · 22 `rock-slide-m` · 28 `x-scissor` · 34 `stone-edge` |

**Growth** 2/3/3/3 · **Abilities** `battle-armor` `swift-swim` · **Tutor** Kabuto: `mud-shot` `rock-throw` · Kabutops: `swords-dance` `waterfall`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kabutops` | **Scythe** — `scratch` → `slash` · **+`x-scissor`** | **Leech Shell** — `absorb` → `mega-drain` · **+`rock-slide-m`** | — |

### `dratini` line — Dragon · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `dratini` | 147 | basic | Dragon | 41/64/45/50/50 | 64/48 | rare | **L12** → `dragonair` | 1 `wrap` · 1 `leer` · 4 `thunder-wave` · 7 `twister` · 10 `dragon-rage` |
| `dragonair` | 148 | stage1 | Dragon | 61/84/65/70/70 | 84/68 | — | **L26** → `dragonite` | 13 `slam` · 16 `agility` · 20 `aqua-tail` · 23 `dragon-pulse` |
| `dragonite` | 149 | stage2 | Dragon/Flying | 91/134/95/100/80 | 134/98 | — | — | 27 `wing-attack` · 32 `outrage` · 38 `hurricane` · 44 `hyper-beam` |

**Growth** 2/3/2/3 · **Abilities** `inner-focus` `iron-shell` `solid-rock` (the last is hidden, §6.8.3) · **Tutor** Dratini: `aqua-jet` `body-slam` · Dragonair: `ice-beam` `thunderbolt` · Dragonite: `fire-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dragonair` | **Coil** — `wrap` → `slam` | **Serpent** — `twister` → `dragon-pulse` | **Aura** — `thunder-wave` → `safeguard` · **+`aqua-ring`** · grants `inner-focus` |
| → `dragonite` | **Dragon Rush** — `slam` → `outrage` · **+`extreme-speed`** | **Storm Dragon** — `dragon-pulse` → `hurricane` · **+`hyper-beam`** | **Guardian** — `agility` → `roost` · **+`safeguard`** |

## 4. Psychic, ghost and poison

### `abra` line — Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `abra` | 63 | basic | Psychic | 25/20/15/105/90 | 105/60 | uncommon | **L12** → `kadabra` | 1 `psywave` · 1 `kinesis` · 4 `confusion` · 7 `disable` · 10 `barrier` |
| `kadabra` | 64 | stage1 | Psychic | 40/35/30/120/105 | 120/75 | — | **L26** → `alakazam` | 13 `psybeam` · 16 `recover` · 20 `reflect` · 23 `psychic` |
| `alakazam` | 65 | stage2 | Psychic | 55/50/45/135/120 | 135/90 | — | — | 27 `calm-mind` · 32 `psyshock` · 38 `shadow-ball` |

**Growth** 1/3/1/3 · **Abilities** `inner-focus` `anticipation` `adaptability` (the last is hidden, §6.8.3) · **Tutor** Abra: `swift` `thunder-wave` · Kadabra: `zen-headbutt` `thunder-punch` · Alakazam: `fire-punch` `ice-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kadabra` | — | **Spoonbender** — `psywave` → `psybeam` | **Mind Wall** — `kinesis` → `reflect` · grants `inner-focus` |
| → `alakazam` | — | **Grand Mind** — `psybeam` → `psychic` · **+`psyshock`** | **Clairvoyant** — `recover` → `calm-mind` · **+`light-screen`** |

### `drowzee` line — Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `drowzee` | 96 | basic | Psychic | 60/48/45/90/42 | 90/68 | uncommon | **L12** → `hypno` | 1 `pound` · 1 `hypnosis` · 4 `disable` · 7 `confusion` · 10 `headbutt` |
| `hypno` | 97 | stage1 | Psychic | 85/73/70/115/67 | 115/93 | — | — | 14 `psybeam` · 18 `zen-headbutt` · 22 `psychic` · 28 `calm-mind` · 34 `psyshock` |

**Growth** 3/2/2/2 · **Abilities** `insomnia` `inner-focus` `anticipation` (the last is hidden, §6.8.3) · **Tutor** Drowzee: `kinesis` `swift` · Hypno: `ice-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `hypno` | — | **Pendulum** — `confusion` → `psybeam` · **+`psyshock`** | **Sleepwalker** — `hypnosis` → `hypnosis-plus` · **+`calm-mind`** · grants `insomnia` |

### `mr-mime` — Psychic · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mr-mime` | 122 | basic | Psychic | 40/45/65/100/90 | 100/83 | rare | — | 1 `confusion` · 1 `barrier` · 5 `double-slap` · 10 `light-screen` · 15 `reflect` · 20 `psybeam` · 26 `psychic` · 32 `calm-mind` · 38 `psyshock` |

**Growth** 2/3/3/4 · **Abilities** `solid-rock` `inner-focus` · **Tutor** Mr. Mime: `thunder-wave` `hypnosis` · **Archetype** support

### `jynx` — Ice/Psychic · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `jynx` | 124 | basic | Ice/Psychic | 65/50/35/95/95 | 95/65 | rare | — | 1 `pound` · 1 `lovely-kiss` · 5 `lick` · 10 `powder-snow` · 15 `double-slap` · 20 `ice-punch` · 26 `ice-beam` · 32 `psychic` · 38 `blizzard` |

**Growth** 3/3/2/3 · **Abilities** `anticipation` `own-tempo` · **Tutor** Jynx: `psyshock` `calm-mind` · **Archetype** specialist

### `gastly` line — Ghost/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `gastly` | 92 | basic | Ghost/Poison | 30/35/30/100/80 | 100/65 | common | **L12** → `haunter` | 1 `lick` · 1 `hypnosis` · 4 `confuse-ray` · 7 `night-shade` · 10 `smog` |
| `haunter` | 93 | stage1 | Ghost/Poison | 45/50/45/115/95 | 115/80 | — | **L26** → `gengar` | 13 `shadow-punch` · 16 `disable` · 20 `shadow-ball` · 23 `toxic` |
| `gengar` | 94 | stage2 | Ghost/Poison | 60/65/60/130/110 | 130/95 | — | — | 27 `sludge-bomb` · 33 `psychic` · 40 `hyper-beam` |

**Growth** 1/3/1/3 · **Abilities** `anticipation` `snipe` `adaptability` (the last is hidden, §6.8.3) · **Tutor** Gastly: `psywave` `screech` · Haunter: `thunderbolt` `sludge-wave` · Gengar: `ice-punch` `fire-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `haunter` | — | **Nightmare** — `night-shade` → `shadow-ball` | **Hypnotist** — `hypnosis` → `hypnosis-plus` · grants `anticipation` |
| → `gengar` | **Shadow Fist** — `lick` → `shadow-punch` · **+`sucker-punch`** | **Ghastly Eye** — `smog` → `sludge-bomb` · **+`psychic`** | — |

### `grimer` line — Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `grimer` | 88 | basic | Poison | 80/80/50/40/25 | 80/45 | common | **L12** → `muk` | 1 `pound` · 1 `smog` · 4 `harden` · 7 `sludge` · 10 `minimize` |
| `muk` | 89 | stage1 | Poison | 105/105/75/65/50 | 105/70 | — | — | 14 `acid-armor` · 18 `sludge-bomb` · 22 `screech` · 28 `gunk-shot` |

**Growth** 3/3/2/1 · **Abilities** `poison-point` `guts` `iron-shell` (the last is hidden, §6.8.3) · **Tutor** Grimer: `mud-slap` `disable` · Muk: `fire-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `muk` | **Sludge Slam** — `pound` → `body-slam` · **+`gunk-shot`** | — | **Toxic Sludge** — `harden` → `acid-armor` · **+`haze`** · grants `poison-point` |

## 5. Rock and ground

### `cubone` line — Ground · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `cubone` | 104 | basic | Ground | 50/50/95/40/35 | 50/68 | rare | **L12** → `marowak` | 1 `growl` · 1 `bone-club` · 4 `tail-whip` · 7 `headbutt` · 10 `focus-energy` |
| `marowak` | 105 | stage1 | Ground | 60/80/110/50/45 | 80/80 | — | — | 14 `bonemerang` · 20 `thrash` · 26 `bone-rush` · 32 `earthquake` |

**Growth** 3/3/3/2 · **Abilities** `rock-head` `battle-armor` (the last is hidden, §6.8.3) · **Tutor** Cubone: `mud-slap` `dig` · Marowak: `swords-dance` `rock-slide-m`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `marowak` | **Bone Rush** — `headbutt` → `bone-rush` · **+`thrash`** | **Boomerang** — `bone-club` → `bonemerang` | — |

### `rhyhorn` line — Ground/Rock · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `rhyhorn` | 111 | basic | Ground/Rock | 80/85/95/30/25 | 85/63 | uncommon | **L12** → `rhydon` | 1 `horn-attack` · 1 `tail-whip` · 4 `stomp` · 7 `fury-attack` · 10 `rock-throw` |
| `rhydon` | 112 | stage1 | Ground/Rock | 105/130/120/45/40 | 130/83 | — | — | 14 `rock-slide-m` · 18 `horn-drill` · 22 `earthquake` · 28 `stone-edge` · 34 `megahorn` |

**Growth** 3/3/3/1 · **Abilities** `rock-head` `solid-rock` · **Tutor** Rhyhorn: `bulldoze` `iron-tail` · Rhydon: `surf` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `rhydon` | **Drill Horn** — `horn-attack` → `drill-run` · **+`megahorn`** | **Landslide** — `rock-throw` → `rock-slide-m` · **+`earthquake`** | — |

### `aerodactyl` — Rock/Flying · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `aerodactyl` | 142 | basic | Rock/Flying | 80/105/65/60/130 | 105/63 | rare | — | 1 `wing-attack` · 1 `supersonic` · 6 `bite` · 12 `ancient-power` · 18 `agility` · 24 `crunch` · 30 `rock-slide-m` · 36 `sky-drop` · 42 `giga-impact-v` |

**Growth** 4/4/3/5 · **Abilities** `rock-head` `tough-claws` (the last is hidden, §6.8.3) · **Tutor** Aerodactyl: `earthquake` `fire-fang` · **Archetype** vanguard

## 6. Fighters

### `hitmonlee` — Fighting · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `hitmonlee` | 106 | basic | Fighting | 50/120/53/35/87 | 120/44 | rare | — | 1 `double-kick` · 1 `focus-energy` · 6 `rolling-kick` · 12 `jump-kick` · 18 `mega-kick` · 24 `hi-jump-kick` · 30 `close-combat` |

**Growth** 3/4/3/4 · **Abilities** `limber` `rock-head` · **Tutor** Hitmonlee: `bulk-up` `low-kick` · **Archetype** vanguard

## 7. The rest of the book

### `chansey` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `chansey` | 113 | basic | Normal | 250/5/5/105/50 | 105/55 | rare | — | 1 `pound` · 1 `growl` · 5 `double-slap` · 10 `sing` · 15 `softboiled` · 20 `minimize` · 26 `egg-bomb` · 32 `light-screen` · 38 `double-edge` |

**Growth** 6/2/2/2 · **Abilities** `healer` · **Tutor** Chansey: `ice-beam` `thunderbolt` · **Archetype** support

### `ditto` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ditto` | 132 | basic | Normal | 48/48/48/48/48 | 48/48 | rare | — | 1 `transform-d` · 1 `pound` |

**Growth** 2/2/2/2 · **Abilities** `limber` · **Tutor** Ditto: — · **Archetype** support

### `porygon` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `porygon` | 137 | basic | Normal | 65/60/70/75/40 | 75/73 | rare | — | 1 `tackle` · 1 `focus-energy` · 5 `psybeam` · 10 `agility` · 15 `recover` · 20 `tri-attack` · 26 `discharge` · 32 `zap-cannon` · 38 `hyper-beam` |

**Growth** 3/3/3/2 · **Abilities** `adaptability` `anticipation` · **Tutor** Porygon: `ice-beam` `thunderbolt` · **Archetype** specialist

## 8. Legendary

### `articuno` — Ice/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `articuno` | 144 | basic | Ice/Flying | 90/85/100/125/85 | 125/113 | legendary | — | 1 `gust` · 1 `powder-snow` · 8 `mist` · 16 `ice-shard` · 24 `agility` · 32 `ice-beam` · 40 `hurricane` · 48 `blizzard` · 56 `sheer-cold-l` |

**Growth** 4/3/4/3 · **Abilities** `snipe` `inner-focus` · **Tutor** Articuno: `roost` `haze` · **Archetype** specialist

### `zapdos` — Electric/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `zapdos` | 145 | basic | Electric/Flying | 90/90/85/125/100 | 125/105 | legendary | — | 1 `peck` · 1 `thunder-shock` · 8 `thunder-wave` · 16 `agility` · 24 `drill-peck` · 32 `discharge` · 40 `thunderbolt` · 48 `zap-cannon` · 56 `thunder` |

**Growth** 4/3/3/4 · **Abilities** `static` `volt-absorb` · **Tutor** Zapdos: `roost` `charge-beam` · **Archetype** specialist

### `moltres` — Fire/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `moltres` | 146 | basic | Fire/Flying | 90/100/90/125/90 | 125/108 | legendary | — | 1 `wing-attack` · 1 `ember` · 8 `fire-spin` · 16 `agility` · 24 `flamethrower` · 32 `air-slash` · 40 `heat-wave` · 48 `sky-attack` · 56 `fire-blast` |

**Growth** 4/3/3/3 · **Abilities** `flame-body` `flash-fire` · **Tutor** Moltres: `roost` `will-o-wisp` · **Archetype** specialist

### `mewtwo` — Psychic · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mewtwo` | 150 | basic | Psychic | 106/110/90/154/130 | 154/122 | legendary | — | 1 `confusion` · 1 `disable` · 8 `swift` · 16 `barrier` · 24 `psychic` · 32 `recover` · 40 `aura-sphere` · 48 `calm-mind` · 56 `psystrike` |

**Growth** 4/4/3/4 · **Abilities** `inner-focus` `adaptability` · **Tutor** Mewtwo: `ice-beam` `thunderbolt` · **Archetype** specialist

### `mew` — Psychic · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mew` | 151 | basic | Psychic | 100/100/100/100/100 | 100/100 | legendary | — | 1 `pound` · 1 `reflect` · 10 `mega-punch` · 20 `barrier` · 30 `ancient-power` · 40 `psychic` · 50 `aura-sphere` · 60 `amnesia` |

**Growth** 4/3/3/3 · **Abilities** `inner-focus` `solid-rock` · **Tutor** Mew: `flamethrower` `thunderbolt` `ice-beam` `earthquake` · **Archetype** support
