# Species catalog — Region 1 launch pool (24 lines · 57 species)

> Implements §2.6.3 (biome pools), §2.6.5 (wild level bands), §6.9 (level-gated learnsets, start with 2),
> §6.3.3 (free archetype per stage, light payload), §6.5.1 (`AvailableAbilities` pool), §5.13.2 (Mastery
> line), §6.3.6 (kit templates). Move ids resolve in `moves.md`, ability ids in `abilities.md`, Mastery ids in
> `mastery-moves.md`. Status legend in `README.md`.
>
> **Settled 2026-09-19:** stats derive by `max(Atk, Spc)` / `round((Def+Spc)/2)` (§4.1.5.1) · evolution levels
> are compressed to **12 / 26** uniformly, with a few bespoke exceptions kept deliberately (§6.2.4) · a stone
> lets a line evolve earlier **and** opens its branch, never blocking the level path (§6.3.2) · Eevee has three
> branches (§8.5.2) · the learnset schema lands at **v0.2** (§6.9).
>
> **Shipped state (2026-09-19).** v0.2 ported the learnsets; v0.3 ported the **evolution tables** below —
> 63 branches over the 24 species the build carries, with their upgrade pairs, additions and archetype
> availability exactly as the rows state. Three deviations, all recorded where they live: learnset *levels* are
> compressed relative to these rows so every entry sits under its stage's threshold (§6.9's own rule, which
> some rows here break — Bulbasaur cannot learn Sleep Powder at 13 and evolve at 12); ten branch additions ship
> with their effect clause omitted pending v0.4 effect kinds (`moves.md` section 0). The four abilities once
> dropped from the pools (`rain-dish`, `infiltrator`, `weak-armor`, `arena-trap`) are every line's hidden third
> since v0.7.5 (§6.8.3). Lines not in the build — Bellsprout, Mankey, Aerodactyl, Lapras, Marowak — keep their
> tables for the version that needs them. *(Krabby and Snorlax joined in v0.5; Eevee in v0.6 as the Level-8
> meta-starter, with its three branches and the five abilities its line needed.)*

## 0. Shared rules (data, not prose)

| Field | Rule | Knob |
|---|---|---|
| Stats | Listed as Gen I `HP/Atk/Def/Spc/Spd`. Derived into the two stats the game uses: **`attack = max(Atk, Spc)`**, **`defence = round((Def + Spc) / 2)`** (§4.1.5.1). `★` marks the ~10 species the conversion changes most; those are hand-tuned after conversion. | `species.baseStats` |
| Growth | flat per level `hp/atk/def/spd`, shared by the line (v0.1 convention: `base + growth × (level − 1)`) | `species.growth` |
| Learnset | `level → move`; a Pokémon knows every entry with `level ≤ current`. Every entry of a stage is `< evolveLevel` of that stage (content test). Base forms list exactly **2 moves at L1**. | `species.learnset[]` |
| Deck contribution | `min(known, 4)` active moves; Mastery is the immutable 5th (§5.13.2) | — |
| Wild band | R1 recruits spawn at **L5–10** (§2.6.5); Elite Wild boss-wilds at L14–16 | `WildEncounterConfig.levelBand` |
| Evolution payload | per stage the player picks one **archetype** from the line's available set; payload = stat upscale (the new species' stats) + the listed **upgrades** (in place, pool dedups) + the listed **addition** (final stage = signature). One archetype row may be `—` (species has only 2 archetypes). | `species.evolutions[]` |
| Abilities | `availableAbilities` = the species pool (1–4). The **first entry is granted at the first evolution**; the Dojo sets or swaps it thereafter (§6.5.1). Pool order therefore matters. | `species.availableAbilities` |
| Mastery | Lv1 on base, Lv2 on stage1 (or final of 2-stage lines), Lv3 on 3-stage finals (§5.13.2). Ids in `mastery-moves.md`. | `species.masteryMove` |
| Rarity | `starter` (never wild), `common`, `uncommon`, `rare` (§2.6.2 weights) | `species.rarity` |
| Biomes | where the **base form** spawns; evolved forms appear only as trainer/elite/gym Pokémon or via evolution | `species.spawnBiomes` |

---

## 1. Starters (3 lines · 9 species) — never wild

### `bulbasaur` line — Grass → Grass/Poison · 3 archetypes · ✅ (kits ✅ v0.1 as 4-move baselines; learnsets 🆕)

| id | dex | Stage | Types | HP/Atk/Def/Spc/Spd | Rarity | Evolves | Learnset (level → move) |
|---|---|---|---|---|---|---|---|
| `bulbasaur` | 1 | basic | Grass | 45/49/49/65/45 | starter | **L12** → `ivysaur` | 1 `tackle` · 1 `growl` · 4 `vine-whip` · 8 `leech-seed` |
| `ivysaur` | 2 | stage1 | Grass/Poison | 60/62/63/80/60 | — | **L26** → `venusaur` | — *(its base form's kit, rewritten by evolution)* |
| `venusaur` | 3 | stage2 | Grass/Poison | 80/82/83/100/80 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/2/2 · **Abilities** `overgrow` `chlorophyll` `healer` · **Mastery** `solar-beam` → `solar-beam-plus` → `solar-beam-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `ivysaur` | **Thornguard** — `tackle` → `headbutt` · `vine-whip` → `razor-leaf` · **+`take-down`** | **Spore Weaver** — `vine-whip` → `razor-leaf` · `growl` → `poison-powder` · **+`sleep-powder`** | **Grove Keeper** — `leech-seed` → `mega-drain` · `growl` → `growth` · **+`stun-spore`** · grants `healer` |
| → `venusaur` | **Titanvine** — `tackle` → `body-slam` · `vine-whip` → `petal-dance` · grants `tough-claws` | **Sporelord** — `vine-whip` → `razor-leaf-plus` · `growl` → `toxic` | **Bloomwarden** — `leech-seed` → `mega-drain-plus` · `growl` → `growth-plus` · grants `healer` |

### `charmander` line — Fire → Fire/Flying · 3 archetypes · ✅ / 🆕

| id | dex | Stage | Types | HP/Atk/Def/Spc/Spd | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `charmander` | 4 | basic | Fire | 39/52/43/50/65 | starter | **L12** → `charmeleon` | 1 `scratch` · 1 `growl` · 4 `ember` · 8 `leer` |
| `charmeleon` | 5 | stage1 | Fire | 58/64/58/65/80 | — | **L26** → `charizard` | — *(its base form's kit, rewritten by evolution)* |
| `charizard` | 6 | stage2 | Fire/Flying | 78/84/78/85/100 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/3/2/3 · **Abilities** `blaze` `tough-claws` `snipe` · **Mastery** `fire-blast` → `fire-blast-plus` → `fire-blast-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `charmeleon` | **Emberfang** — `scratch` → `slash` · `growl` → `rage` · **+`fire-punch`** · grants `tough-claws` | **Cinderlash** — `ember` → `ember-plus` · `leer` → `smokescreen` · **+`fire-spin`** · grants `snipe` | **Hearthkeeper** — `growl` → `smokescreen` · `leer` → `focus-energy` · **+`rest`** |
| → `charizard` | **Drakewing** — `scratch` → `slash-plus` · `growl` → `wing-attack` · grants `tough-claws` | **Infernal** — `ember` → `flamethrower` · `scratch` → `swift` · grants `snipe` | **Updraft** — `ember` → `fire-spin-plus` · `leer` → `agility` |

### `squirtle` line — Water · 3 archetypes · ✅ kits / 🆕 learnsets

| id | dex | Stage | Types | HP/Atk/Def/Spc/Spd | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `squirtle` | 7 | basic | Water | 44/48/65/50/43 | starter | **L12** → `wartortle` | 1 `tackle` · 1 `tail-whip` · 4 `bubble` · 8 `water-gun` |
| `wartortle` | 8 | stage1 | Water | 59/63/80/65/58 | — | **L26** → `blastoise` | — *(its base form's kit, rewritten by evolution)* |
| `blastoise` | 9 | stage2 | Water | 79/83/100/85/78 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/3/2 · **Abilities** `torrent` `shell-armor` `rain-dish` · **Mastery** `waterfall` → `waterfall-plus` → `waterfall-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `wartortle` | **Shellbreaker** — `tackle` → `skull-bash` · `tail-whip` → `withdraw` · **+`bite`** · grants `shell-armor` | **Tidecaller** — `water-gun` → `bubble-beam` · `bubble` → `bubble-plus` · **+`surf`** | **Tideguard** — `tail-whip` → `withdraw` · `bubble` → `bubble-plus` · **+`rest`** · grants `shell-armor` |
| → `blastoise` | **Siegeshell** — `tackle` → `skull-bash-plus` · `tail-whip` → `body-slam` | **Hydrocannon** — `water-gun` → `hydro-pump` · `bubble` → `ice-beam` | **Bulwark** — `tail-whip` → `barrier` · `water-gun` → `bubble-beam-plus` · grants `shell-armor` |

---

## 2. Meadow (primary R1 biome) — 8 lines

### `caterpie` line — Bug → Bug/Flying · 3 archetypes · ✅ / 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `caterpie` | 10 | basic | Bug | 45/30/35/20/45 | common | L8 → `metapod` | 1 `tackle` · 1 `string-shot` · 3 `harden` · 6 `leech-life` |
| `metapod` | 11 | stage1 | Bug | 50/20/55/25/30 | — | L12 → `butterfree` | — *(its base form's kit, rewritten by evolution)* |
| `butterfree` | 12 | stage2 | Bug/Flying ★ | 60/45/50/80/70 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/1/2/2 · **Abilities** `compound-eyes` `iron-shell` `swarm` · **Mastery** `psybeam` → `psybeam-plus` → `psybeam-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `metapod` | **Hardshell** — `tackle` → `headbutt` · `leech-life` → `twineedle` · **+`harden-plus`** | **Silkbinder** — `leech-life` → `leech-life-plus` · `string-shot` → `string-shot-plus` · **+`pin-missile`** | **Ironshell** — `harden` → `harden-plus` · `string-shot` → `string-shot-plus` · **+`withdraw`** · grants `iron-shell` |
| → `butterfree` | **Flutterblade** — `tackle` → `gust-plus` · `string-shot` → `supersonic` | **Dustweaver** — `leech-life` → `confusion-plus` · `string-shot` → `sleep-powder` · `harden` → `stun-spore` · grants `compound-eyes` | **Wardwing** — `harden` → `poison-powder` · `string-shot` → `sleep-powder` · `tackle` → `gust` |

### `weedle` line — Bug/Poison · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `weedle` | 13 | basic | Bug/Poison | 40/35/30/20/50 | common | L8 → `kakuna` | 1 `poison-sting` · 1 `string-shot` · 3 `harden` · 6 `leech-life` |
| `kakuna` | 14 | stage1 | Bug/Poison | 45/25/50/25/35 | — | L12 → `beedrill` | — *(its base form's kit, rewritten by evolution)* |
| `beedrill` | 15 | stage2 | Bug/Poison | 65/80/40/45/75 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/3/1/3 · **Abilities** `swarm` `poison-point` `snipe` · **Mastery** `fury-attack` → `fury-attack-plus` → `fury-attack-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kakuna` | **Spearshell** — `poison-sting` → `poison-sting-plus` · `leech-life` → `twineedle` · **+`harden-plus`** | **Venomweaver** — `string-shot` → `string-shot-plus` · `leech-life` → `pin-missile` · **+`poison-powder`** | — |
| → `beedrill` | **Lancer** — `leech-life` → `twineedle-plus` · `harden` → `focus-energy` · `string-shot` → `agility` | **Venomancer** — `poison-sting` → `toxic` · `leech-life` → `pin-missile-plus` · `harden` → `agility` · grants `snipe` | — |

### `pidgey` line — Normal/Flying · 3 archetypes · ✅ / 🆕 · common (Meadow + Sky)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `pidgey` | 16 | basic | Normal/Flying | 40/45/40/35/56 | common | **L12** → `pidgeotto` | 1 `tackle` · 1 `sand-attack` · 4 `gust` · 8 `quick-attack` |
| `pidgeotto` | 17 | stage1 | Normal/Flying | 63/60/55/50/71 | — | **L26** → `pidgeot` | — *(its base form's kit, rewritten by evolution)* |
| `pidgeot` | 18 | stage2 | Normal/Flying | 83/80/75/70/91 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/2/2/3 · **Abilities** `keen-eye` `tangled-feet` `healer` · **Mastery** `sky-attack` → `sky-attack-plus` → `sky-attack-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `pidgeotto` | **Talonstrike** — `tackle` → `wing-attack` · `quick-attack` → `quick-attack-plus` · **+`whirlwind`** | **Windcaller** — `gust` → `gust-plus` · `sand-attack` → `sand-attack-plus` · **+`swift`** · grants `keen-eye` | **Downdraft** — `sand-attack` → `sand-attack-plus` · `tackle` → `growl` · **+`agility`** |
| → `pidgeot` | **Skyreaver** — `tackle` → `drill-peck` · `quick-attack` → `fly` | **Galecaller** — `gust` → `wing-attack-plus` · `tackle` → `swift-plus` · grants `keen-eye` | **Tailwind** — `tackle` → `mirror-move` · `gust` → `gust-plus` · `quick-attack` → `roar` · grants `healer` |

### `rattata` line — Normal · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `rattata` | 19 | basic | Normal | 30/56/35/25/72 | common | **L12** → `raticate` | 1 `tackle` · 1 `tail-whip` · 4 `quick-attack` · 8 `bite` |
| `raticate` | 20 | stage1 (final) | Normal | 55/81/60/50/97 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/3/2/3 · **Abilities** `guts` `hustle` `run-down` · **Mastery** `super-fang` → `super-fang-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `raticate` | **Fangrunner** — `bite` → `hyper-fang` · `quick-attack` → `quick-attack-plus` · **+`focus-energy`** · grants `guts` | **Scavenger** — `tackle` → `swift` · `tail-whip` → `leer-plus` · **+`body-slam`** · grants `hustle` | — |

### `oddish` line — Grass/Poison · 3 archetypes · 🆕 · uncommon (Leaf Stone: Gloom may evolve from L18)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `oddish` | 43 | basic | Grass/Poison ★ | 45/50/55/75/30 | uncommon | **L12** → `gloom` | 1 `absorb` · 1 `poison-powder` · 4 `stun-spore` · 8 `acid` |
| `gloom` | 44 | stage1 | Grass/Poison | 60/65/70/85/40 | — | **L26** → `vileplume` (Leaf Stone from L18) | — *(its base form's kit, rewritten by evolution)* |
| `vileplume` | 45 | stage2 | Grass/Poison | 75/80/85/100/50 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/2/3/1 · **Abilities** `chlorophyll` `effect-spore` `healer` · **Mastery** `solar-beam` → `solar-beam-plus` → `solar-beam-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `gloom` | **Rootfeeder** — `absorb` → `mega-drain` · `acid` → `acid-plus` · **+`petal-dance`** | **Toxicbloom** — `acid` → `acid-plus` · `poison-powder` → `toxic` · **+`sleep-powder`** · grants `effect-spore` | **Mistpetal** — `stun-spore` → `stun-spore-plus` · `absorb` → `mega-drain` · **+`growth`** |
| → `vileplume` | **Petalstorm** — `absorb` → `mega-drain-plus` · `acid` → `petal-dance-plus` | **Toxicarium** — `acid` → `sludge` · `poison-powder` → `toxic-plus` · grants `effect-spore` | **Pollenguard** — `stun-spore` → `stun-spore-plus` · `poison-powder` → `haze` · `absorb` → `mega-drain-plus` · grants `healer` |

### `bellsprout` line — Grass/Poison · 2 archetypes (Vanguard, Specialist) · ✅ v0.7.3 · uncommon (Leaf Stone ≥ L24)

> Shipped with Region 2 (the Grass Gym's slot 1, and Region 1's widened Meadow). Learnset levels are compressed
> under each threshold, as every Region 1 line's were (§6.9): 1/1/4/7/10 · 13/16/20/23 · 27/32/38. Gluttony is not
> authored, so the pool is Chlorophyll with Snipe as the hidden third; `leaf-storm-s` ships as its row says.

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `bellsprout` | 69 | basic | Grass/Poison | 50/75/35/70/40 | uncommon | **L12** → `weepinbell` | 1 `vine-whip` · 1 `growth` · 4 `wrap` · 8 `poison-powder` |
| `weepinbell` | 70 | stage1 | Grass/Poison | 65/90/50/85/55 | — | **L26** → `victreebel` (Leaf Stone from L18) | — *(its base form's kit, rewritten by evolution)* |
| `victreebel` | 71 | stage2 | Grass/Poison | 80/105/65/100/70 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/3/2/2 · **Abilities** `chlorophyll` `gluttony` `snipe` · **Mastery** `solar-beam` → `solar-beam-plus` → `solar-beam-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `weepinbell` | **Snapjaw** — `wrap` → `slam` · `vine-whip` → `vine-whip-plus` · **+`razor-leaf`** | **Cutting Leaves** — `vine-whip` → `razor-leaf` · `poison-powder` → `acid` · **+`sleep-powder`** | — |
| → `victreebel` | **Flytrap** — `wrap` → `slam-plus` · `growth` → `swords-dance` | **Acid Pitcher** — `vine-whip` → `razor-leaf-plus` · `poison-powder` → `acid-plus` · `growth` → `stun-spore` | — |

### `mankey` line — Fighting · 2 archetypes (Vanguard, Specialist) · ✅ Gen I (2026-09-23, the built kit is in `species-gen1.md`) · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `mankey` | 56 | basic | Fighting | 40/80/35/35/70 | uncommon | **L12** → `primeape` | 1 `scratch` · 1 `leer` · 4 `low-kick` · 8 `karate-chop` |
| `primeape` | 57 | stage1 (final) | Fighting | 65/105/60/60/95 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/3/1/3 · **Abilities** `anger-point` `vital-spirit` `guts` · **Mastery** `rage` → `rage-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `primeape` | **Fury** — `karate-chop` → `karate-chop-plus` · `low-kick` → `submission` · **+`thrash`** | **Brawler** — `low-kick` → `seismic-toss` · `scratch` → `fury-swipes` · **+`rock-slide`** | — |

### `eevee` line — Normal → Water / Electric / Fire · 3 branches = 3 species · 🆕 · rare (Meadow) · meta-starter (§8.5.2)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `eevee` | 133 | basic | Normal | 55/55/50/65/55 | rare | **L12** → one of `vaporeon` / `jolteon` / `flareon` (the matching Stone allows it from L8) | 1 `tackle` · 1 `tail-whip` · 4 `sand-attack` · 8 `quick-attack` |
| `vaporeon` | 134 | stage1 (final) | Water ★ | 130/65/60/110/65 | — | — | — *(its base form's kit, rewritten by evolution)* |
| `jolteon` | 135 | stage1 (final) | Electric ★ | 65/65/60/110/130 | — | — | — *(its base form's kit, rewritten by evolution)* |
| `flareon` | 136 | stage1 (final) | Fire | 65/130/60/110/65 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/2/3 · **Abilities** `adaptability` `run-down` `anticipation` (Vaporeon adds `water-absorb`; Jolteon `volt-absorb`, `speed-boost`; Flareon `flash-fire`, `guts`) · **Mastery** `take-down` → `take-down-plus`

| Evolution | Vanguard (→ Flareon) | Specialist (→ Jolteon) | Support (→ Vaporeon) |
|---|---|---|---|
| → branch species | `bite` → `fire-fang` · **+`flare-blitz`** | `swift` → `thunderbolt` · **+`thunder-wave`** | `tail-whip` → `aqua-ring` · **+`wish`** |

> Eevee's archetype **is** its species choice: the branch defines the type. Three branches, not four — Gen I
> has exactly three Eeveelutions, and the Gen I constraint outranks the older promise of a fourth (§8.5.2).

---

## 3. Cave — 7 lines

### `zubat` line — Poison/Flying · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `zubat` | 41 | basic | Poison/Flying | 40/45/35/40/55 | common | **L12** → `golbat` | 1 `leech-life` · 1 `supersonic` · 4 `bite` · 8 `wing-attack` |
| `golbat` | 42 | stage1 (final) | Poison/Flying | 75/80/70/75/90 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/2/3 · **Abilities** `inner-focus` `infiltrator` `snipe` · **Mastery** `sky-attack` → `sky-attack-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `golbat` | **Nightfang** — `bite` → `bite-plus` · `leech-life` → `leech-life-plus` · **+`haze`** | **Echolocator** — `wing-attack` → `wing-attack-plus` · `supersonic` → `supersonic-plus` · **+`confuse-ray`** · grants `snipe` | — |

### `geodude` line — Rock/Ground · 3 archetypes · ✅ / 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `geodude` | 74 | basic | Rock/Ground | 40/80/100/30/20 | common | **L12** → `graveler` | 1 `tackle` · 1 `defense-curl` · 4 `rock-throw` · 8 `self-destruct` |
| `graveler` | 75 | stage1 | Rock/Ground | 55/95/115/45/35 | — | **L26** → `golem` | — *(its base form's kit, rewritten by evolution)* |
| `golem` | 76 | stage2 | Rock/Ground | 80/110/130/55/45 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/3/3/2 · **Abilities** `sturdy` `rock-head` `solid-rock` · **Mastery** `mega-punch` → `mega-punch-plus` → `mega-punch-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `graveler` | **Boulderfist** — `tackle` → `rock-slide` · `self-destruct` → `self-destruct-plus` · **+`harden`** | **Stonecaster** — `rock-throw` → `rock-throw-plus` · `tackle` → `rock-slide` · **+`harden`** | **Bedrock** — `defense-curl` → `defense-curl-plus` · `rock-throw` → `rock-slide` · **+`harden-plus`** · grants `solid-rock` |
| → `golem` | **Avalanche** — `tackle` → `rock-slide-plus` · `self-destruct` → `explosion` · grants `tough-claws` | **Quakebringer** — `tackle` → `earthquake` · `rock-throw` → `rock-slide-plus` | **Bastion** — `defense-curl` → `defense-curl-plus` · `tackle` → `body-slam` · `rock-throw` → `rock-slide-plus` |

### `diglett` line — Ground · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `diglett` | 50 | basic | Ground | 10/55/25/45/95 | common | **L12** → `dugtrio` | 1 `scratch` · 1 `sand-attack` · 4 `growl` · 8 `dig` |
| `dugtrio` | 51 | stage1 (final) | Ground | 35/80/50/70/120 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 1/3/1/4 · **Abilities** `sand-veil` `hustle` `arena-trap` · **Mastery** `tri-attack` → `tri-attack-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dugtrio` | **Burrower** — `dig` → `earthquake` · `scratch` → `slash` · **+`fissure`** · grants `hustle` | **Duststorm** — `sand-attack` → `sand-attack-plus` · `scratch` → `rock-slide` · **+`rock-throw`** · grants `sand-veil` | — |

> Arena Trap is Diglett's hidden ability since v0.7.5, rewritten for a game with no flee to trap: while the wearer
> leads, every enemy loses 1/16 of its HP each turn (§6.8.3). The reserved "-x" id is retired.

### `onix` — Rock/Ground · single stage · 2 archetypes via Training Grounds only · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `onix` | 95 | basic (final) | Rock/Ground | 35/45/160/30/70 | uncommon | — (single stage: +25 % growth, §6.2.4) | 1 `tackle` · 1 `screech` · 8 `bind` · 16 `rock-throw` · 24 `harden` |

**Growth** 2/2/4/2 (+25 %) · **Abilities** `sturdy` `rock-head` `weak-armor` · **Mastery** `rock-slide`

### `machop` line — Fighting · 2 archetypes (Vanguard, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `machop` | 66 | basic | Fighting | 70/80/50/35/35 | uncommon | **L12** → `machoke` | 1 `low-kick` · 1 `leer` · 4 `karate-chop` · 8 `focus-energy` |
| `machoke` | 67 | stage1 | Fighting | 80/100/70/50/45 | — | **L26** → `machamp` | — *(its base form's kit, rewritten by evolution)* |
| `machamp` | 68 | stage2 | Fighting | 90/130/80/65/55 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/3/2/1 · **Abilities** `guts` `no-guard` `steadfast` · **Mastery** `seismic-toss` → `seismic-toss-plus` → `seismic-toss-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `machoke` | **Ironfist** — `karate-chop` → `karate-chop-plus` · `low-kick` → `low-kick-plus` · **+`submission`** · grants `guts` | — | **Bastion** — `leer` → `leer-plus` · `focus-energy` → `meditate` · **+`counter`** · grants `steadfast` |
| → `machamp` | **Colossus** — `low-kick` → `mega-kick` · `karate-chop` → `mega-punch` · grants `no-guard` | — | **Bulwark** — `focus-energy` → `meditate-plus` · `leer` → `rock-slide` · grants `guts` |

### `aerodactyl` — Rock/Flying · single stage · ✅ Gen I (2026-09-23) · rare (Cave; Fossil Mystery Event)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `aerodactyl` | 142 | basic (final) | Rock/Flying | 80/105/65/60/130 | rare | — (+25 % growth) | 1 `wing-attack` · 1 `agility` · 8 `supersonic` · 16 `bite` · 24 `take-down` |

**Growth** 3/3/2/4 (+25 %) · **Abilities** `rock-head` `pressure` `tough-claws` · **Mastery** `rock-slide`

### `lapras` — Water/Ice · single stage · ✅ v0.7.3 · rare (Cave lake + River, and Region 2's Sea)

> Shipped with Region 2 as the Sea's rare and the Elite Wild (`elites.md` §5). Growth is the row's with the
> single-stage +25 % rounded up (5/3/4/3, Onix's convention); Hydration is not authored. `mist`'s team-wide
> guard needs an effect kind the sim does not have, so it ships as self Def +1 (v0.3's substitute for Safeguard).

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `lapras` | 131 | basic (final) | Water/Ice | 130/85/80/95/60 | rare | — (+25 % growth) | 1 `water-gun` · 1 `growl` · 8 `sing` · 16 `mist` · 24 `body-slam` |

**Growth** 4/2/3/2 (+25 %) · **Abilities** `water-absorb` `shell-armor` `hydration` · **Mastery** `ice-beam`

---

## 4. River / Lake — 4 lines

### `magikarp` line — Water → Water/Flying · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `magikarp` | 129 | basic | Water | 20/10/55/20/80 | common | **L18** → `gyarados` *(bespoke — the number is the joke)* | 1 `splash` · 1 `tackle` |
| `gyarados` | 130 | stage1 (final) | Water/Flying | 95/125/79/100/81 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 1/1/2/2 (Magikarp) → line growth 3/4/2/2 after evolution (a deliberate exception) · **Abilities** `swift-swim` `intimidate` `moxie` · **Mastery** `hyper-beam` → `hyper-beam-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `gyarados` | **Seaserpent** — `tackle` → `bite-plus` · `splash` → `leer` · **+`thrash`** · grants `intimidate` | **Stormbringer** — `splash` → `dragon-rage` · `tackle` → `bubble-beam` · **+`hydro-pump`** · grants `intimidate` | — |

> The Magikarp "investment" fantasy: worthless recruit, monster at L18. Its 3-move learnset means a deck of 2–3 cards until evolution — a deliberate cost. Splash is a 0-AP utility that draws 1 (so the card is never dead).

### `poliwag` line — Water → Water/Fighting · 3 archetypes · ✅ (Poliwrath: Gen I, 2026-09-23) · common (Water Stone: Poliwhirl may evolve from L26)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `poliwag` | 60 | basic | Water | 40/50/40/40/90 | common | **L12** → `poliwhirl` | 1 `bubble` · 1 `hypnosis` · 4 `water-gun` · 8 `double-slap` |
| `poliwhirl` | 61 | stage1 | Water | 65/65/65/50/90 | — | **L26** → `poliwrath` (Water Stone from L18) | — *(its base form's kit, rewritten by evolution)* |
| `poliwrath` | 62 | stage2 | Water/Fighting | 90/85/95/70/70 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/2/3 · **Abilities** `water-absorb` `damp` `swift-swim` · **Mastery** `mega-punch` → `mega-punch-plus` → `mega-punch-plus-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `poliwhirl` | **Ripplefist** — `double-slap` → `body-slam` · `bubble` → `bubble-plus` · **+`submission`** | **Mesmer** — `bubble` → `bubble-beam` · `water-gun` → `water-gun-plus` · **+`hydro-pump`** · grants `water-absorb` | **Lullaby** — `hypnosis` → `hypnosis-plus` · `double-slap` → `amnesia` · **+`rest`** |
| → `poliwrath` | **Fighting Tadpole** — `double-slap` → `submission-plus` · `water-gun` → `ice-punch` | **Torrent Fist** — `bubble` → `surf` · `water-gun` → `ice-beam` | **Spiral Sleep** — `hypnosis` → `hypnosis-plus` · `double-slap` → `psychic` · `water-gun` → `bubble-beam` |

### `psyduck` line — Water · 2 archetypes (Specialist, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `psyduck` | 54 | basic | Water | 50/52/48/50/55 | uncommon | **L12** → `golduck` | 1 `scratch` · 1 `tail-whip` · 4 `water-gun` · 8 `disable` |
| `golduck` | 55 | stage1 (final) | Water | 80/82/78/80/85 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 3/2/2/3 · **Abilities** `cloud-nine` `damp` `swift-swim` · **Mastery** `psybeam` → `psybeam-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `golduck` | — | **Migraine** — `water-gun` → `hydro-pump` · `scratch` → `confusion` · **+`psychic`** | **Placid** — `disable` → `amnesia` · `tail-whip` → `tail-whip-plus` · **+`bubble-beam`** |

### `krabby` line — Water · 2 archetypes (Vanguard, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `krabby` | 98 | basic | Water | 30/105/90/25/50 | uncommon | **L12** → `kingler` | 1 `bubble` · 1 `leer` · 4 `vice-grip` · 8 `harden` |
| `kingler` | 99 | stage1 (final) | Water | 55/130/115/50/75 | — | — | — *(its base form's kit, rewritten by evolution)* |

**Growth** 2/4/3/2 · **Abilities** `hyper-cutter` `shell-armor` `sheer-force` · **Mastery** `crabhammer` → `crabhammer-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kingler` | **The Pincer** — `vice-grip` → `vice-grip-plus` · `leer` → `stomp` · **+`guillotine`** | — | **The Bulwark** — `harden` → `harden-plus` · `bubble` → `bubble-beam` · **+`withdraw`** · grants `shell-armor` |

---

## 5. Elite Wild boss-wilds (§2.8.2) — 2 lines

### `snorlax` — Normal · single stage · ✅ · boss-wild (R1, L14–16, boss HP ≈ 2× elite)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `snorlax` | 143 | basic (final) | Normal | 160/110/65/65/30 | boss-wild | — (+25 % growth) | 1 `headbutt` · 1 `amnesia` · 8 `rest` · 16 `body-slam` · 24 `harden` |

**Growth** 5/3/2/1 (+25 %) · **Abilities** `thick-fat` `immunity` `gluttony` · **Mastery** `double-edge`
**Boss script**: P1 stall (`rest` heals every HP, self-Sleep, P1 only · `amnesia` +2 Def) → P2 offence (`body-slam` Melee 85, 30 % Paralysis · `headbutt`). Catch → recruit `snorlax` at its level with 0 Trauma.

### `marowak` (+ `marowak-spirit` boss variant) — Ground / Ghost · ✅ (the `cubone` line of `species-gen1.md` evolves into it)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `marowak` | 105 | stage1 (final) | Ground | 60/80/110/50/45 | boss-wild recruit | — | — *(its base form's kit, rewritten by evolution)* |
| `marowak-spirit` | 105-s | boss variant | Ghost | 60/80/110/50/45 | boss-wild | — | fixed kit: Curse · `confuse-ray` · Shadow Bone · `lick` |

**Growth** 3/3/3/2 · **Abilities** `rock-head` `lightning-rod` `battle-armor` (spirit: `levitate` `cursed-body`) · **Mastery** `bonemerang` → `bonemerang-plus`
**Boss script**: Curse = 25 % self-HP → 3-turn DoT on target · `confuse-ray` 3t · Shadow Bone Melee 85 Ghost, 20 % −1 Def · `lick` Melee 40, 30 % Paralysis. **Catch → recruit a living Ground `marowak`** holding `thick-club` (held item, Marowak-only, +50 % Melee). `cubone` (R3 Tower pool) evolves into `marowak` at L12.

---

## 6. Region 1 roster summary (for map generation and art fetch)

| Biome | Common (2 offered) | Uncommon (1 offered) | Rare (~10 % swap) |
|---|---|---|---|
| Meadow 🌾 | `caterpie` `weedle` `pidgey` `rattata` | `oddish` `bellsprout` `mankey` | `eevee` |
| Cave 🕳️ | `zubat` `geodude` `diglett` | `onix` `machop` | `aerodactyl` `lapras` |
| River 💧 | `magikarp` `poliwag` | `psyduck` `krabby` | `lapras` |

**Art to fetch (dex)**: 1–18, 19–20, 41–45, 50–51, 54–57, 60–62, 66–71, 74–76, 95, 98–99, 105, 129–136, 142–143 — `npm run art:portraits -- <dex…>` then add the lines to `roster-vs.json` and `npm run art:sprites`. `marowak-spirit` reuses Marowak's sprite with a CSS ghost tint (v0.4).

**Counts**: 24 lines · 57 species · 3 starters · 15 base wild species (R1 pool) · 2 boss-wilds. Trainer/Gym/Elite rosters in `trainers.md`, `gyms.md`, `elites.md` only use species from this file (R1) or from `species-pool-r2-r3.md` (R2/R3).
