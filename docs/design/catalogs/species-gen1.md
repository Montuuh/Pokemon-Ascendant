# Species catalog — the rest of the 151 (77 species + Poliwrath) ✅ 2026-09-23

> Implements §6.9 (level-gated learnsets), §6.3.3 (archetype branches), §6.5.1 (`AvailableAbilities`), §6.4.3
> (tutor lists) for every Gen I species the first two Regions did not need. Same columns and shared rules as
> [`species-r1.md`](species-r1.md) §0: stats derived by §4.1.5.1, evolution at the series' levels and methods (§6.2.4, §6.3.7; 12 and 26 until v0.9.90), learnsets under each
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
| `spearow` | 21 | basic | Normal/Flying | 40/60/30/31/70 | 60/31 | common | **L20** → `fearow` | 1 `peck` · 1 `growl` · 5 `leer` · 9 `fury-attack` · 13 `pursuit` · 17 `aerial-ace` (← `peck`) |
| `fearow` | 22 | stage1 | Normal/Flying | 65/90/65/61/100 | 90/63 | — | — | 23 `feather-dance` (← `growl`) · 24 `screech` (← `leer`) · 25 `drill-peck` · 33 `swift` · 41 `roost` · 50 `double-edge` |

**Abilities** `keen-eye` `tangled-feet` `snipe` (the last is hidden, §6.8.3) · **Tutor** Spearow: `quick-attack` `swift` · Fearow: —

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `fearow` | **Drill Beak** — `peck` → `drill-peck` · `fury-attack` → `double-edge` · **+`mirror-move`** | **Skyhunter** — `peck` → `gust-plus` · `leer` → `leer-plus` · **+`agility`** | — |

### `ekans` line — Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ekans` | 23 | basic | Poison | 35/60/44/40/55 | 60/42 | common | **L22** → `arbok` | 1 `wrap` · 1 `leer` · 4 `poison-sting` · 9 `bite` |
| `arbok` | 24 | stage1 | Poison | 60/85/69/65/80 | 85/67 | — | — | 25 `tickle` (← `leer`) · 28 `sludge` · 34 `mud-bomb` · 36 `dig` (← `wrap`) · 44 `body-slam` · 56 `gunk-shot` (← `sludge`) |

**Abilities** `intimidate` `poison-point` `guts` (the last is hidden, §6.8.3) · **Tutor** Ekans: `acid-armor` `dig` · Arbok: `earthquake` `slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `arbok` | **Cobra** — `bite` → `bite-plus` · `wrap` → `wrap-plus` · **+`glare`** | — | **Hood** — `leer` → `screech` · `poison-sting` → `acid` · **+`haze`** · grants `intimidate` |

### `sandshrew` line — Ground · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `sandshrew` | 27 | basic | Ground | 50/75/85/30/40 | 75/58 | common | **L22** → `sandslash` | 1 `scratch` · 1 `defense-curl` · 5 `sand-attack` · 9 `poison-sting` · 14 `dig` (← `scratch`) |
| `sandslash` | 28 | stage1 | Ground | 75/100/110/55/65 | 100/83 | — | — | 22 `crush-claw` · 25 `iron-defense` (← `defense-curl`) · 26 `scary-face` (← `sand-attack`) · 28 `fury-cutter` · 30 `slash` · 39 `swift` · 52 `sandstorm` |

**Abilities** `sand-veil` `iron-shell` `tough-claws` (the last is hidden, §6.8.3) · **Tutor** Sandshrew: — · Sandslash: `rock-slide`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `sandslash` | **Claw** — `scratch` → `slash` · `poison-sting` → `fury-swipes` · **+`swords-dance`** | — | **Spined Ball** — `defense-curl` → `defense-curl-plus` · `sand-attack` → `sand-attack-plus` · **+`swift`** · grants `iron-shell` |

### `nidoran-f` line — Poison · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `nidoran-f` | 29 | basic | Poison | 55/47/52/40/41 | 47/46 | uncommon | **L16** → `nidorina` | 1 `growl` · 1 `scratch` · 5 `tail-whip` · 11 `poison-sting` |
| `nidorina` | 30 | stage1 | Poison | 70/62/67/55/56 | 62/61 | — | **Moon Stone** (from L25) → `nidoqueen`; trainers field it from L36 | 19 `scary-face` (← `growl`) · 20 `screech` (← `tail-whip`) · 22 `bite` (← `scratch`) · 28 `sludge` |
| `nidoqueen` | 31 | stage2 | Poison/Ground | 90/82/87/75/76 | 82/81 | — | — | 39 `body-slam` · 43 `earth-power` · 44 `earthquake` · 58 `superpower` (← `body-slam`) |

**Abilities** `poison-point` `hustle` `guts` (the last is hidden, §6.8.3) · **Tutor** Nidoran♀: `quick-attack` · Nidorina: `take-down` · Nidoqueen: `surf` `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `nidorina` | **Thorn** — `scratch` → `fury-swipes` · `poison-sting` → `poison-sting-plus` · **+`bite`** | — | **Den Mother** — `poison-sting` → `acid` · `tail-whip` → `tail-whip-plus` · **+`toxic`** · grants `poison-point` |
| → `nidoqueen` | **Earthshaker** — `scratch` → `body-slam` · `tail-whip` → `earthquake` | **Poison Queen** — `poison-sting` → `sludge` · `growl` → `thunderbolt` | — |

### `nidoran-m` line — Poison · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `nidoran-m` | 32 | basic | Poison | 46/57/40/40/50 | 57/40 | uncommon | **L16** → `nidorino` | 1 `leer` · 1 `tackle` · 5 `horn-attack` · 11 `poison-sting` |
| `nidorino` | 33 | stage1 | Poison | 61/72/57/55/65 | 72/56 | — | **Moon Stone** (from L25) → `nidoking`; trainers field it from L36 | 19 `screech` (← `leer`) · 20 `fury-attack` · 28 `sludge` (← `poison-sting`) · 33 `double-kick` (← `tackle`) |
| `nidoking` | 34 | stage2 | Poison/Ground | 81/92/77/75/85 | 92/76 | — | — | 39 `thrash` (← `fury-attack`) · 43 `earth-power` · 44 `earthquake` (← `thrash`) · 58 `megahorn` (← `horn-attack`) |

**Abilities** `poison-point` `hustle` `guts` (the last is hidden, §6.8.3) · **Tutor** Nidoran♂: `quick-attack` · Nidorino: `take-down` · Nidoking: `ice-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `nidorino` | **Horn** — `horn-attack` → `horn-attack-plus` · `tackle` → `double-kick` · **+`focus-energy`** | **Venom Horn** — `poison-sting` → `poison-sting-plus` · `leer` → `leer-plus` · **+`toxic`** | — |
| → `nidoking` | **Earth King** — `horn-attack` → `horn-drill` · `tackle` → `earthquake` | **Toxic King** — `poison-sting` → `sludge` · `leer` → `thunderbolt` | — |

### `meowth` line — Normal · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `meowth` | 52 | basic | Normal | 40/45/35/40/90 | 45/38 | common | **L28** → `persian` | 1 `scratch` · 1 `growl` · 5 `bite` (← `scratch`) · 11 `pay-day` · 14 `fury-swipes` |
| `persian` | 53 | stage1 | Normal | 65/70/60/65/115 | 70/63 | — | — | 28 `slash` · 31 `charm` (← `growl`) · 32 `power-gem` (← `pay-day`) · 36 `swift` · 44 `body-slam` (← `slash`) · 44 `nasty-plot` · 61 `night-slash` (← `bite`) |

**Abilities** `run-down` `tough-claws` `moxie` (the last is hidden, §6.8.3) · **Tutor** Meowth: `quick-attack` · Persian: `thunderbolt` `slam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `persian` | **Prowler** — `scratch` → `slash` · `bite` → `bite-plus` · **+`screech`** | **Jewel** — `pay-day` → `pay-day-plus` · `growl` → `swift` · **+`bubble-beam`** | — |

### `mankey` line — Fighting · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mankey` | 56 | basic | Fighting | 40/80/35/35/70 | 80/35 | uncommon | **L28** → `primeape` | 1 `scratch` · 1 `leer` · 3 `focus-energy` · 5 `low-kick` (← `scratch`) · 11 `karate-chop` · 21 `screech` (← `leer`) |
| `primeape` | 57 | stage1 | Fighting | 65/105/60/60/95 | 105/60 | — | — | 28 `seismic-toss` · 30 `rock-slide` · 39 `submission` (← `seismic-toss`) · 41 `cross-chop` · 47 `thrash` · 59 `close-combat` (← `submission`) |

**Abilities** `vital-spirit` `guts` (the last is hidden, §6.8.3) · **Tutor** Mankey: `meditate` `rolling-kick` · Primeape: —

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `primeape` | **Fury** — `karate-chop` → `karate-chop-plus` · `low-kick` → `submission` · **+`thrash`** | **Brawler** — `low-kick` → `seismic-toss` · `scratch` → `fury-swipes` · **+`rock-slide`** | — |

### `doduo` line — Normal/Flying · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `doduo` | 84 | basic | Normal/Flying | 35/85/45/35/75 | 85/40 | uncommon | **L31** → `dodrio` | 1 `peck` · 1 `growl` · 5 `fury-attack` · 5 `quick-attack` · 19 `pursuit` |
| `dodrio` | 85 | stage1 | Normal/Flying | 60/110/70/60/100 | 110/65 | — | — | 31 `swift` · 34 `tri-attack` · 35 `feather-dance` (← `growl`) · 36 `drill-peck` (← `peck`) |

**Abilities** `keen-eye` `tangled-feet` `run-down` (the last is hidden, §6.8.3) · **Tutor** Doduo: `double-kick` · Dodrio: `double-edge`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dodrio` | **Three Heads** — `peck` → `drill-peck` · `fury-attack` → `thrash` · **+`agility`** | **Triple Call** — `growl` → `tri-attack` · `quick-attack` → `swift` · **+`rage`** | — |

### `farfetchd` — Normal/Flying · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `farfetchd` | 83 | basic | Normal/Flying | 52/65/55/58/60 | 65/57 | uncommon | — | 1 `peck` · 1 `sand-attack` · 5 `poison-jab` · 7 `fury-attack` · 11 `leer` · 14 `gust` · 19 `slash` (← `fury-attack`) · 21 `air-cutter` (← `gust`) · 24 `feather-dance` (← `sand-attack`) · 25 `swords-dance` · 26 `screech` (← `leer`) · 30 `wing-attack` (← `peck`) · 37 `air-slash` (← `air-cutter`) · 47 `drill-peck` (← `wing-attack`) |

**Abilities** `keen-eye` `inner-focus` · **Tutor** Farfetch'd: `fly` `razor-wind` · **Archetype** vanguard

### `tauros` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tauros` | 128 | basic | Normal | 75/100/95/70/110 | 100/83 | rare | — | 1 `tackle` · 1 `tail-whip` · 8 `horn-attack` (← `tackle`) · 11 `stomp` · 22 `leer` · 24 `screech` (← `tail-whip`) · 25 `swift` · 26 `tickle` (← `leer`) · 28 `body-slam` · 29 `zen-headbutt` (← `horn-attack`) · 33 `take-down` · 39 `earthquake` (← `stomp`) · 47 `thrash` · 55 `giga-impact` |

**Abilities** `intimidate` `guts` · **Tutor** Tauros: `thunderbolt` `fire-blast` · **Archetype** vanguard

### `kangaskhan` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `kangaskhan` | 115 | basic | Normal | 105/95/80/40/90 | 95/60 | rare | — | 1 `comet-punch` · 1 `rage` · 10 `tail-whip` · 11 `bite` · 16 `swift` · 19 `mega-punch` (← `rage`) · 24 `screech` (← `tail-whip`) · 25 `dizzy-punch` (← `comet-punch`) · 28 `body-slam` (← `dizzy-punch`) · 31 `crunch` (← `mega-punch`) · 39 `earthquake` · 43 `double-hit` · 46 `sucker-punch` |

**Abilities** `inner-focus` `guts` · **Tutor** Kangaskhan: `thunderbolt` `fire-punch` · **Archetype** vanguard

### `lickitung` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `lickitung` | 108 | basic | Normal | 90/55/75/60/30 | 60/68 | rare | — | 1 `wrap` · 1 `supersonic` · 11 `stomp` (← `wrap`) · 16 `lick` · 22 `disable` · 28 `body-slam` · 29 `slam` · 39 `swift` · 45 `screech` · 47 `earthquake` (← `stomp`) · 49 `power-whip` |

**Abilities** `own-tempo` `cloud-nine` · **Tutor** Lickitung: `ice-beam` `thunderbolt` · **Archetype** support

## 2. Forest, marsh and mountain

### `clefairy` line — Normal · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `clefairy` | 35 | basic | Normal | 70/45/48/60/35 | 60/54 | uncommon | **Moon Stone** (from L11) → `clefable`; trainers field it from L36 | 1 `pound` · 1 `growl` · 5 `sing` · 10 `double-slap` |
| `clefable` | 36 | stage1 | Normal | 95/70/73/85/60 | 85/79 | — | — | 36 `swift` · 36 `body-slam` · 39 `headbutt` (← `pound`) · 40 `charm` (← `growl`) · 42 `psychic` · 50 `double-edge` (← `body-slam`) |

**Abilities** `cute-charm` `solid-rock` `healer` (the last is hidden, §6.8.3) · **Tutor** Clefairy: — · Clefable: `ice-beam` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `clefable` | — | **Moon Child** — `double-slap` → `swift` · `sing` → `sing-plus` · **+`light-screen`** | **Moon Dancer** — `growl` → `minimize` · `double-slap` → `double-slap-plus` · **+`metronome`** · grants `cute-charm` |

### `jigglypuff` line — Normal · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `jigglypuff` | 39 | basic | Normal | 115/45/20/25/20 | 45/23 | common | **Moon Stone** (from L11) → `wigglytuff`; trainers field it from L36 | 1 `sing` · 1 `pound` · 5 `defense-curl` · 11 `double-slap` |
| `wigglytuff` | 40 | stage1 | Normal | 140/70/45/50/45 | 70/48 | — | — | 36 `swift` · 36 `body-slam` · 39 `headbutt` (← `pound`) · 40 `iron-defense` (← `defense-curl`) · 42 `double-edge` (← `body-slam`) |

**Abilities** `cute-charm` `iron-shell` `healer` (the last is hidden, §6.8.3) · **Tutor** Jigglypuff: `growl` · Wigglytuff: `ice-beam` `psychic`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `wigglytuff` | **Big Balloon** — `pound` → `body-slam` · `double-slap` → `double-slap-plus` · **+`rest`** | — | **Encore** — `defense-curl` → `defense-curl-plus` · `sing` → `sing-plus` · **+`disable`** · grants `cute-charm` |

### `paras` line — Bug/Grass · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `paras` | 46 | basic | Bug/Grass | 35/70/55/55/25 | 70/55 | common | **L24** → `parasect` | 1 `scratch` · 1 `stun-spore` · 5 `leech-life` · 6 `poison-powder` · 11 `absorb` |
| `parasect` | 47 | stage1 | Bug/Grass | 60/95/80/80/30 | 95/80 | — | — | 25 `mega-drain` · 33 `pin-missile` · 39 `giga-drain` (← `absorb`) · 42 `razor-leaf` · 47 `aromatherapy` · 50 `solar-beam` (← `giga-drain`) · 55 `x-scissor` (← `scratch`) |

**Abilities** `effect-spore` `swarm` `damp` (the last is hidden, §6.8.3) · **Tutor** Paras: `fury-swipes` · Parasect: —

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `parasect` | **Cordyceps** — `scratch` → `slash` · `leech-life` → `leech-life-plus` · **+`swords-dance`** | — | **Spore Host** — `absorb` → `mega-drain` · `stun-spore` → `spore` · **+`growth`** · grants `effect-spore` |

### `venonat` line — Bug/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `venonat` | 48 | basic | Bug/Poison | 60/55/50/40/45 | 55/45 | common | **L31** → `venomoth` | 1 `tackle` · 1 `disable` · 5 `supersonic` · 8 `poison-sting` · 11 `confusion` |
| `venomoth` | 49 | stage1 | Bug/Poison | 70/65/60/90/90 | 90/75 | — | — | 31 `psybeam` · 31 `leech-life` · 31 `gust` · 36 `sludge` (← `poison-sting`) · 37 `signal-beam` · 41 `zen-headbutt` (← `tackle`) · 44 `pin-missile` · 47 `poison-fang` · 53 `psychic` (← `psybeam`) · 59 `bug-buzz` (← `signal-beam`) |

**Abilities** `compound-eyes` `snipe` `run-down` (the last is hidden, §6.8.3) · **Tutor** Venonat: — · Venomoth: `mega-drain`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `venomoth` | — | **Dust Wings** — `confusion` → `psybeam` · `tackle` → `leech-life` · **+`swift`** | **Powder Moth** — `supersonic` → `poison-powder` · `disable` → `sleep-powder` · **+`stun-spore`** · grants `compound-eyes` |

### `exeggcute` line — Grass/Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `exeggcute` | 102 | basic | Grass/Psychic | 60/40/80/60/40 | 60/70 | uncommon | **Leaf Stone** (from L11) → `exeggutor`; trainers field it from L32 | 1 `barrage` · 1 `hypnosis` · 5 `reflect` · 11 `leech-seed` · 14 `confusion` · 17 `bullet-seed` · 21 `poison-powder` |
| `exeggutor` | 103 | stage1 | Grass/Psychic | 95/95/85/125/55 | 125/105 | — | — | 32 `razor-leaf` · 36 `psychic` · 37 `wood-hammer` · 44 `solar-beam` (← `razor-leaf`) · 47 `leaf-storm` (← `bullet-seed`) |

**Abilities** `chlorophyll` `healer` · **Tutor** Exeggcute: `absorb` `mega-drain` · Exeggutor: `mega-drain` `psybeam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `exeggutor` | — | **Coconut** — `barrage` → `egg-bomb` · `reflect` → `psychic` · **+`stomp`** | **Seed Bearer** — `leech-seed` → `leech-seed-plus` · `hypnosis` → `sleep-powder` · **+`stun-spore`** · grants `healer` |

### `tangela` — Grass · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `tangela` | 114 | basic | Grass | 65/55/115/100/60 | 100/108 | uncommon | — | 1 `constrict` · 1 `bind` · 8 `absorb` · 12 `growth` · 15 `poison-powder` · 16 `vine-whip` · 26 `mega-drain` (← `absorb`) · 29 `stun-spore` · 33 `ancient-power` · 39 `slam` (← `constrict`) · 47 `solar-beam` (← `vine-whip`) · 54 `power-whip` |

**Abilities** `chlorophyll` `healer` · **Tutor** Tangela: `sleep-powder` `rock-slide` · **Archetype** support

### `pinsir` — Bug · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `pinsir` | 127 | basic | Bug | 65/125/100/55/85 | 125/78 | rare | — | 1 `vice-grip` · 1 `focus-energy` · 8 `seismic-toss` · 13 `harden` · 16 `slash` · 21 `brick-break` · 24 `iron-defense` (← `harden`) · 25 `vital-throw` (← `vice-grip`) · 28 `pin-missile` · 30 `x-scissor` (← `slash`) · 33 `guillotine` · 39 `submission` (← `vital-throw`) · 52 `superpower` (← `seismic-toss`) |

**Abilities** `moxie` `guts` · **Tutor** Pinsir: `earthquake` `rock-slide` · **Archetype** vanguard

### `scyther` line — Bug/Flying → Bug/Steel · 2 branches · rare (R1 Forest; Scizor in R3) · v0.9.84

| id | dex | Stage | Types | Gen I/II HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `scyther` | 123 | basic | Bug/Flying | 70/110/80/55/105 | 110/68 | rare | **a level-up holding `metal-coat`** (Metal Coat) → `scizor`; trainers field it from L36 | 1 `quick-attack` · 1 `leer` · 3 `vacuum-wave` · 5 `focus-energy` · 9 `pursuit` · 16 `cut` · 17 `agility` · 21 `wing-attack` (← `cut`) · 22 `swift` · 25 `fury-cutter` · 33 `razor-wind` |
| `scizor` | 212 | stage1 (final) | Bug/Steel | 70/130/100/55·80/65 | 130/90 | — | — | 37 `pin-missile` (← `swift`) · 37 `iron-defense` · 39 `screech` (← `leer`) · 41 `x-scissor` (← `fury-cutter`) · 44 `iron-tail` · 49 `double-hit` · 53 `meteor-mash` (← `double-hit`) · 57 `swords-dance` (← `focus-energy`) |

**Abilities** `swarm` `steadfast` `tough-claws` (hidden) · **Tutor** `double-edge` · **Egg** Scyther: `counter` `gust` · **Mastery** `slash` → `slash-plus`
*(Gen II splits Special in two, so Scizor's derived defence is `round((Def + SpD) / 2)` and its attack `max(Atk, SpA)`.)*

| Evolution | Vanguard | Specialist |
|---|---|---|
| → `scizor` | **Pincer** — `cut` → `metal-claw` · `quick-attack` → `bullet-punch` · **+`iron-head`** · grants `swarm` | **Gale Blade** — `wing-attack` → `steel-wing` · `swift` → `flash-cannon` · **+`night-slash`** · grants `steadfast` |

## 3. Fire, water and sea

### `vulpix` line — Fire · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `vulpix` | 37 | basic | Fire | 38/41/40/65/65 | 65/53 | common | **Fire Stone** (from L11) → `ninetales`; trainers field it from L32 | 1 `ember` · 1 `tail-whip` · 5 `quick-attack` · 7 `roar` (← `tail-whip`) · 14 `will-o-wisp` · 27 `safeguard` · 31 `payback` |
| `ninetales` | 38 | stage1 | Fire | 73/76/75/100/100 | 100/88 | — | — | 32 `fire-spin` · 32 `flamethrower` (← `fire-spin`) |

**Abilities** `flash-fire` `flame-body` `anticipation` (the last is hidden, §6.8.3) · **Tutor** Vulpix: `agility` `swift` · Ninetales: `solar-beam` `psychic`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `ninetales` | — | **Ninefold Flame** — `ember` → `flamethrower` · `tail-whip` → `tail-whip-plus` · **+`fire-spin`** | **Kitsune** — `roar` → `confuse-ray` · `ember` → `ember-plus` · **+`dig`** · grants `flash-fire` |

### `ponyta` line — Fire · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ponyta` | 77 | basic | Fire | 50/85/55/65/90 | 85/60 | common | **L40** → `rapidash` | 1 `ember` · 1 `tail-whip` · 5 `stomp` · 11 `growl` · 15 `flame-wheel` |
| `rapidash` | 78 | stage1 | Fire | 65/100/70/80/105 | 100/75 | — | — | 40 `fire-spin` · 40 `flamethrower` (← `fire-spin`) · 40 `fury-attack` · 43 `screech` (← `tail-whip`) · 44 `scary-face` (← `growl`) · 56 `flare-blitz` (← `flame-wheel`) |

**Abilities** `flash-fire` `flame-body` `run-down` (the last is hidden, §6.8.3) · **Tutor** Ponyta: `double-kick` `quick-attack` · Rapidash: `dig` `solar-beam`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `rapidash` | **Blaze Charger** — `stomp` → `stomp-plus` · `tail-whip` → `take-down` · **+`agility`** | **Sunfire Mane** — `ember` → `flamethrower` · `growl` → `fire-spin` · **+`swift`** | — |

### `magmar` — Fire · uncommon · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `magmar` | 126 | basic | Fire | 65/95/57/85/93 | 95/71 | uncommon | — | 1 `ember` · 1 `leer` · 3 `smog` · 10 `smokescreen` · 11 `confuse-ray` · 16 `fire-spin` · 16 `feint-attack` · 22 `fire-punch` · 24 `screech` (← `leer`) · 36 `lava-plume` (← `ember`) · 42 `fire-blast` (← `fire-spin`) · 49 `sunny-day` |

**Abilities** `flame-body` `vital-spirit` · **Tutor** Magmar: `thunder-punch` `psychic` · **Archetype** specialist

### `slowpoke` line — Water/Psychic · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `slowpoke` | 79 | basic | Water/Psychic | 90/65/65/40/15 | 65/53 | common | **L37** → `slowbro` | 1 `confusion` · 1 `disable` · 5 `headbutt` · 6 `growl` · 29 `water-pulse` · 34 `zen-headbutt` |
| `slowbro` | 80 | stage1 | Water/Psychic | 95/75/110/80/30 | 80/95 | — | — | 37 `water-gun` · 37 `surf` (← `water-gun`) · 37 `psychic` · 40 `charm` (← `growl`) · 44 `hydro-pump` (← `water-pulse`) · 61 `rain-dance` |

**Abilities** `own-tempo` `healer` `solid-rock` (the last is hidden, §6.8.3) · **Tutor** Slowpoke: `bubble-beam` `body-slam` · Slowbro: `ice-beam` `flamethrower`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `slowbro` | — | **Tide Sage** — `confusion` → `psychic` · `headbutt` → `water-gun` · **+`surf`** | **Shell Tail** — `growl` → `amnesia` · `disable` → `disable-plus` · **+`rest`** · grants `own-tempo` |

### `goldeen` line — Water · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `goldeen` | 118 | basic | Water | 45/67/60/50/63 | 67/55 | common | **L33** → `seaking` | 1 `peck` · 1 `tail-whip` · 5 `supersonic` · 8 `water-gun` · 11 `horn-attack` · 17 `water-pulse` · 21 `flail` · 27 `aqua-ring` |
| `seaking` | 119 | stage1 | Water | 80/92/65/80/68 | 92/73 | — | — | 33 `waterfall` (← `flail`) · 33 `bubble-beam` (← `water-gun`) · 36 `wing-attack` (← `peck`) · 37 `screech` (← `tail-whip`) · 39 `surf` · 63 `megahorn` (← `horn-attack`) |

**Abilities** `water-veil` `swift-swim` `snipe` (the last is hidden, §6.8.3) · **Tutor** Goldeen: `bubble` `rage` · Seaking: `ice-beam` `blizzard`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `seaking` | **Horn Diver** — `horn-attack` → `horn-attack-plus` · `peck` → `fury-attack` · **+`horn-drill`** | **Waterfall** — `supersonic` → `waterfall` · `tail-whip` → `agility` · **+`bubble-beam`** | — |

### `omanyte` line — Rock/Water · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `omanyte` | 138 | basic | Rock/Water | 35/40/100/90/35 | 90/95 | rare | **L40** → `omastar` | 1 `water-gun` · 1 `withdraw` · 3 `constrict` · 5 `horn-attack` · 7 `bite` · 11 `leer` · 25 `mud-shot` · 34 `protect` · 37 `ancient-power` |
| `omastar` | 139 | stage1 | Rock/Water | 70/60/125/115/55 | 115/120 | — | — | 40 `bubble-beam` (← `water-gun`) · 40 `rock-slide` (← `ancient-power`) · 40 `hydro-pump` (← `bubble-beam`) · 40 `spike-cannon` · 43 `iron-defense` (← `withdraw`) · 48 `tickle` (← `leer`) · 56 `rock-blast` (← `spike-cannon`) |

**Abilities** `shell-armor` `swift-swim` · **Tutor** Omanyte: `sand-attack` `aurora-beam` · Omastar: `earthquake`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `omastar` | **Spike Shell** — `horn-attack` → `horn-attack-plus` · `withdraw` → `withdraw-plus` · **+`rock-throw`** · grants `shell-armor` | **Ancient Spiral** — `water-gun` → `hydro-pump` · `leer` → `rock-slide` · **+`ice-beam`** | — |

### `kabuto` line — Rock/Water · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `kabuto` | 140 | basic | Rock/Water | 30/80/90/45/55 | 80/68 | rare | **L40** → `kabutops` | 1 `scratch` · 1 `harden` · 5 `absorb` · 8 `water-gun` · 11 `leer` · 14 `rock-throw` · 16 `mud-shot` · 26 `endure` · 31 `aqua-jet` |
| `kabutops` | 141 | stage1 | Rock/Water | 60/115/105/70/80 | 115/88 | — | — | 40 `slash` (← `scratch`) · 40 `rock-slide` (← `rock-throw`) · 40 `surf` (← `water-gun`) · 43 `screech` (← `leer`) · 45 `metal-sound` (← `harden`) · 47 `hydro-pump` (← `surf`) · 54 `ancient-power` |

**Abilities** `battle-armor` `swift-swim` · **Tutor** Kabuto: `sand-attack` `bubble-beam` · Kabutops: `waterfall`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kabutops` | **Scythe** — `scratch` → `scratch-plus` · `leer` → `swords-dance` · **+`rock-slide`** | **Leech Shell** — `absorb` → `mega-drain` · `harden` → `harden-plus` · **+`surf`** | — |

### `dratini` line — Dragon · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `dratini` | 147 | basic | Dragon | 41/64/45/50/50 | 64/48 | rare | **L30** → `dragonair` | 1 `wrap` · 1 `leer` · 5 `thunder-wave` · 8 `dragon-rage` · 11 `agility` · 11 `twister` |
| `dragonair` | 148 | stage1 | Dragon | 61/84/65/70/70 | 84/68 | — | **L55** → `dragonite` | 30 `slam` (← `wrap`) · 30 `bubble-beam` · 33 `aqua-tail` (← `slam`) · 34 `screech` (← `leer`) · 47 `safeguard` · 53 `dragon-dance` |
| `dragonite` | 149 | stage2 | Dragon/Flying | 91/134/95/100/80 | 134/98 | — | — | 55 `wing-attack` · 55 `fly` (← `wing-attack`) · 55 `hyper-beam` · 64 `outrage` |

**Abilities** `inner-focus` `iron-shell` `solid-rock` (the last is hidden, §6.8.3) · **Tutor** Dratini: `bubble` · Dragonair: — · Dragonite: `fire-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dragonair` | **Coil** — `wrap` → `slam` · `leer` → `leer-plus` · **+`body-slam`** | **Serpent** — `dragon-rage` → `dragon-rage-plus` · `thunder-wave` → `thunder-wave-plus` · **+`bubble-beam`** | **Aura** — `agility` → `agility-plus` · `leer` → `barrier` · **+`haze`** · grants `inner-focus` |
| → `dragonite` | **Dragon Rush** — `wrap` → `slam-plus` · `agility` → `body-slam` | **Storm Dragon** — `wrap` → `dragon-rage-plus` · `thunder-wave` → `thunderbolt` · `leer` → `ice-beam` | **Guardian** — `leer` → `barrier-plus` · `thunder-wave` → `thunder-wave-plus` · `agility` → `recover` |

## 4. Psychic, ghost and poison

### `abra` line — Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `abra` | 63 | basic | Psychic | 25/20/15/105/90 | 105/60 | uncommon | **L16** → `kadabra` | 1 `teleport` · 1 `confusion` · 5 `disable` · 11 `kinesis` |
| `kadabra` | 64 | stage1 | Psychic | 40/35/30/120/105 | 120/75 | — | **a level-up holding `twisted-spoon`** (Twisted Spoon) → `alakazam`; trainers field it from L36 | 22 `psybeam` · 28 `recover` · 30 `swift` · 33 `psychic` · 34 `psycho-cut` |
| `alakazam` | 65 | stage2 | Psychic | 55/50/45/135/120 | 135/90 | — | — | 36 `calm-mind` · 50 `seismic-toss` |

**Abilities** `inner-focus` `anticipation` `adaptability` (the last is hidden, §6.8.3) · **Tutor** Abra: `swift` · Kadabra: `headbutt` `thunder-punch` · Alakazam: `fire-punch` `ice-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kadabra` | — | **Spoonbender** — `confusion` → `psybeam` · `disable` → `disable-plus` · **+`psychic`** | **Mind Wall** — `kinesis` → `reflect` · `teleport` → `recover` · **+`barrier`** · grants `inner-focus` |
| → `alakazam` | — | **Grand Mind** — `confusion` → `psychic-plus` · `teleport` → `thunder-wave` | **Clairvoyant** — `kinesis` → `light-screen` · `disable` → `thunder-wave` |

### `drowzee` line — Psychic · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `drowzee` | 96 | basic | Psychic | 60/48/45/90/42 | 90/68 | uncommon | **L26** → `hypno` | 1 `pound` · 1 `hypnosis` · 5 `disable` · 9 `confusion` · 18 `poison-gas` |
| `hypno` | 97 | stage1 | Psychic | 85/73/70/115/67 | 115/93 | — | — | 26 `psybeam` · 33 `psychic` · 38 `headbutt` (← `pound`) · 55 `nasty-plot` · 64 `zen-headbutt` |

**Abilities** `insomnia` `inner-focus` `anticipation` (the last is hidden, §6.8.3) · **Tutor** Drowzee: `kinesis` `swift` · Hypno: `ice-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `hypno` | — | **Pendulum** — `confusion` → `psychic` · `pound` → `headbutt` · **+`psybeam`** | **Sleepwalker** — `hypnosis` → `hypnosis-plus` · `disable` → `meditate` · **+`psywave`** · grants `insomnia` |

### `mr-mime` — Psychic · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mr-mime` | 122 | basic | Psychic | 40/45/65/100/90 | 100/83 | rare | — | 1 `confusion` · 1 `barrier` · 8 `meditate` · 11 `light-screen` · 15 `double-slap` · 16 `psywave` · 22 `reflect` · 28 `psychic` · 29 `substitute` · 39 `seismic-toss` (← `double-slap`) · 46 `baton-pass` · 50 `safeguard` |

**Abilities** `solid-rock` `inner-focus` · **Tutor** Mr. Mime: `thunder-wave` `hypnosis` · **Archetype** support

### `jynx` — Ice/Psychic · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `jynx` | 124 | basic | Ice/Psychic | 65/50/35/95/95 | 95/65 | rare | — | 1 `pound` · 1 `lovely-kiss` · 3 `powder-snow` · 5 `lick` · 15 `double-slap` · 16 `confusion` · 18 `ice-punch` (← `pound`) · 28 `ice-beam` · 39 `psychic` · 39 `body-slam` |

**Abilities** `anticipation` `own-tempo` · **Tutor** Jynx: `mega-punch` `amnesia` · **Archetype** specialist

### `gastly` line — Ghost/Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `gastly` | 92 | basic | Ghost/Poison | 30/35/30/100/80 | 100/65 | common | **L25** → `haunter` | 1 `lick` · 1 `confuse-ray` · 5 `night-shade` · 11 `hypnosis` · 22 `sucker-punch` |
| `haunter` | 93 | stage1 | Ghost/Poison | 45/50/45/115/95 | 115/80 | — | **a level-up holding `spell-tag`** (Spell Tag) → `gengar`; trainers field it from L40 | 25 `shadow-punch` · 28 `sludge` · 28 `payback` · 33 `shadow-ball` (← `night-shade`) |
| `gengar` | 94 | stage2 | Ghost/Poison | 60/65/60/130/110 | 130/95 | — | — | 44 `psychic` · 44 `dark-pulse` |

**Abilities** `anticipation` `snipe` `adaptability` (the last is hidden, §6.8.3) · **Tutor** Gastly: `screech` · Haunter: `thunderbolt` `mega-punch` · Gengar: `ice-punch` `fire-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `haunter` | — | **Nightmare** — `night-shade` → `night-shade-plus` · `lick` → `lick-plus` · **+`psywave`** | **Hypnotist** — `hypnosis` → `hypnosis-plus` · `confuse-ray` → `confuse-ray-plus` · **+`haze`** · grants `anticipation` |
| → `gengar` | **Shadow Fist** — `lick` → `mega-punch` · `confuse-ray` → `lick-plus` | **Ghastly Eye** — `night-shade` → `psychic` · `hypnosis` → `hypnosis-plus` | — |

### `grimer` line — Poison · common

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `grimer` | 88 | basic | Poison | 80/80/50/40/25 | 80/45 | common | **L38** → `muk` | 1 `pound` · 1 `poison-gas` · 5 `disable` · 11 `sludge` · 23 `mud-bomb` · 36 `sludge-bomb` |
| `muk` | 89 | stage1 | Poison | 105/105/75/65/50 | 105/70 | — | — | 41 `poison-jab` (← `pound`) · 47 `thunderbolt` · 54 `gunk-shot` (← `sludge`) |

**Abilities** `poison-point` `guts` `iron-shell` (the last is hidden, §6.8.3) · **Tutor** Grimer: `sand-attack` · Muk: `fire-punch` `thunder-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `muk` | **Sludge Slam** — `pound` → `pound-plus` · `poison-gas` → `acid-plus` · **+`minimize`** | — | **Toxic Sludge** — `poison-gas` → `acid-armor` · `disable` → `disable-plus` · **+`screech`** · grants `poison-point` |

## 5. Rock and ground

### `cubone` line — Ground · rare

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `cubone` | 104 | basic | Ground | 50/50/95/40/35 | 50/68 | rare | **L28** → `marowak` | 1 `bone-club` · 1 `growl` · 3 `tail-whip` · 11 `leer` · 11 `headbutt` · 23 `rage` |
| `marowak` | 105 | stage1 | Ground | 60/80/110/50/45 | 80/80 | — | — | 31 `scary-face` (← `growl`) · 32 `screech` (← `tail-whip`) · 33 `tickle` (← `leer`) · 39 `earthquake` · 47 `rock-slide` · 53 `double-edge` (← `headbutt`) |

**Abilities** `rock-head` `battle-armor` (the last is hidden, §6.8.3) · **Tutor** Cubone: `sand-attack` · Marowak: `swords-dance`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `marowak` | **Bone Rush** — `bone-club` → `bone-club-plus` · `tail-whip` → `focus-energy` · **+`thrash`** | **Boomerang** — `bone-club` → `dig` · `leer` → `leer-plus` · **+`rock-slide`** | — |

### `rhyhorn` line — Ground/Rock · uncommon

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `rhyhorn` | 111 | basic | Ground/Rock | 80/85/95/30/25 | 85/63 | uncommon | **L42** → `rhydon` | 1 `horn-attack` · 1 `tail-whip` · 5 `stomp` · 11 `rock-throw` · 13 `fury-attack` · 21 `scary-face` · 25 `rock-blast` (← `rock-throw`) |
| `rhydon` | 112 | stage1 | Ground/Rock | 105/130/120/45/40 | 130/83 | — | — | 42 `rock-slide` · 42 `dig` (← `fury-attack`) · 45 `stone-edge` (← `rock-blast`) · 46 `screech` (← `tail-whip`) · 57 `megahorn` (← `horn-attack`) |

**Abilities** `rock-head` `solid-rock` · **Tutor** Rhyhorn: `slam` · Rhydon: `surf` `thunderbolt`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `rhydon` | **Drill Horn** — `horn-attack` → `horn-drill` · `stomp` → `stomp-plus` · **+`take-down`** | **Landslide** — `tail-whip` → `rock-slide` · `rock-throw` → `rock-throw-plus` · **+`dig`** | — |

### `aerodactyl` — Rock/Flying · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `aerodactyl` | 142 | basic | Rock/Flying | 80/105/65/60/130 | 105/63 | rare | — | 1 `wing-attack` · 1 `agility` · 3 `fire-fang` · 5 `ice-fang` · 11 `supersonic` · 16 `rock-throw` · 22 `bite` · 33 `take-down` · 33 `crunch` (← `take-down`) · 39 `fly` (← `wing-attack`) · 47 `hyper-beam` · 49 `iron-head` |

**Abilities** `rock-head` `tough-claws` (the last is hidden, §6.8.3) · **Tutor** Aerodactyl: `earthquake` `fire-punch` · **Archetype** vanguard

## 6. Fighters

### `hitmonlee` — Fighting · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `hitmonlee` | 106 | basic | Fighting | 50/120/53/35/87 | 120/44 | rare | — | 1 `double-kick` · 1 `meditate` · 9 `rolling-kick` · 11 `swift` · 13 `jump-kick` · 17 `brick-break` (← `double-kick`) · 21 `focus-energy` · 29 `high-jump-kick` (← `brick-break`) · 45 `endure` · 49 `mega-kick` · 53 `close-combat` · 57 `reversal` |

**Abilities** `limber` `rock-head` · **Tutor** Hitmonlee: `low-kick` · **Archetype** vanguard

## 7. The rest of the book

### `chansey` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `chansey` | 113 | basic | Normal | 250/5/5/105/50 | 105/55 | rare | — | 1 `pound` · 1 `double-slap` · 11 `sing` · 12 `soft-boiled` · 16 `body-slam` · 20 `minimize` · 22 `growl` · 24 `charm` (← `growl`) · 28 `egg-bomb` · 34 `light-screen` · 39 `seismic-toss` (← `pound`) · 46 `double-edge` (← `body-slam`) · 47 `psychic` |

**Abilities** `healer` · **Tutor** Chansey: `ice-beam` `thunderbolt` · **Archetype** support

### `ditto` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `ditto` | 132 | basic | Normal | 48/48/48/48/48 | 48/48 | rare | — | 1 `transform` · 1 `pound` · 24 `headbutt` (← `pound`) |

**Abilities** `limber` · **Tutor** Ditto: — · **Archetype** support

### `porygon` — Normal · rare · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `porygon` | 137 | basic | Normal | 65/60/70/75/40 | 75/73 | rare | — | 1 `tackle` · 1 `conversion` · 3 `sharpen` · 7 `psybeam` · 18 `recover` · 24 `headbutt` (← `tackle`) · 28 `tri-attack` · 29 `signal-beam` · 40 `discharge` · 62 `zap-cannon` (← `discharge`) |

**Abilities** `adaptability` `anticipation` · **Tutor** Porygon: `ice-beam` `thunderbolt` `agility` · **Archetype** specialist

*(v0.9.10, the user's call — "Porygon is badly nerfed": its kit was Tackle, Sharpen, Conversion, a Psybeam at 16 and Agility at 24 — one real attack. It learns its own two now, Recover and Tri Attack, earlier; Sharpen goes and Agility becomes a tutor move.)*

## 8. Legendary

### `articuno` — Ice/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `articuno` | 144 | basic | Ice/Flying | 90/85/100/125/85 | 125/113 | legendary | — | 1 `peck` · 1 `ice-beam` · 3 `gust` · 5 `powder-snow` · 8 `mist` · 14 `blizzard` (← `ice-beam`) · 15 `ice-shard` · 24 `wing-attack` (← `peck`) · 28 `agility` · 29 `ancient-power` · 50 `reflect` · 57 `roost` |

**Abilities** `snipe` `inner-focus` · **Tutor** Articuno: `recover` `haze` · **Archetype** specialist

### `zapdos` — Electric/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `zapdos` | 145 | basic | Electric/Flying | 90/90/85/125/100 | 125/105 | legendary | — | 1 `thunder-shock` · 1 `drill-peck` · 8 `thunder-wave` · 14 `thunder` · 15 `detect` · 28 `agility` · 29 `ancient-power` · 50 `discharge` (← `thunder-shock`) · 56 `light-screen` · 57 `roost` |

**Abilities** `static` `volt-absorb` · **Tutor** Zapdos: `recover` · **Archetype** specialist

### `moltres` — Fire/Flying · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `moltres` | 146 | basic | Fire/Flying | 90/100/90/125/90 | 125/108 | legendary | — | 1 `peck` · 1 `fire-spin` · 3 `ember` · 5 `wing-attack` (← `peck`) · 14 `leer` · 15 `agility` · 22 `endure` · 24 `screech` (← `leer`) · 29 `ancient-power` · 36 `flamethrower` (← `fire-spin`) · 50 `air-slash` · 56 `sky-attack` (← `wing-attack`) · 64 `heat-wave` |

**Abilities** `flame-body` `flash-fire` · **Tutor** Moltres: `recover` `confuse-ray` · **Archetype** specialist

### `mewtwo` — Psychic · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mewtwo` | 150 | basic | Psychic | 106/110/90/154/130 | 154/122 | legendary | — | 1 `confusion` · 1 `disable` · 8 `barrier` · 14 `swift` · 28 `psychic` · 43 `mist` · 50 `psycho-cut` · 57 `amnesia` |

**Abilities** `inner-focus` `adaptability` · **Tutor** Mewtwo: `ice-beam` `thunderbolt` · **Archetype** specialist

### `mew` — Psychic · legendary · single stage

| id | dex | Stage | Types | Gen I HP/Atk/Def/Spc/Spd | Atk/Def (derived) | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|---|
| `mew` | 151 | basic | Psychic | 100/100/100/100/100 | 100/100 | legendary | — | 1 `pound` · 1 `transform` · 10 `mega-punch` · 20 `metronome` · 24 `zen-headbutt` (← `pound`) · 30 `psychic` · 40 `barrier` · 50 `ancient-power` · 60 `amnesia` |

**Abilities** `inner-focus` `solid-rock` · **Tutor** Mew: `flamethrower` `thunderbolt` `ice-beam` · **Archetype** support
