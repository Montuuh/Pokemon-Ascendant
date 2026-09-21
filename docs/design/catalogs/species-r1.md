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
> with their effect clause omitted pending v0.4 effect kinds (`moves.md` section 0); and pools drop the four
> abilities not yet authored into `abilities.json` (`rain-dish`, `infiltrator`, `weak-armor`, and the reserved
> `arena-trap-x`). Lines not in the build — Bellsprout, Mankey, Aerodactyl, Lapras, Marowak — keep their
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
| `bulbasaur` | 1 | basic | Grass | 45/49/49/65/45 | starter | **L12** → `ivysaur` | 1 `tackle` · 1 `growl` · 5 `vine-whip` · 9 `leech-seed` · 13 `sleep-powder` |
| `ivysaur` | 2 | stage1 | Grass/Poison | 60/62/63/80/60 | — | **L26** → `venusaur` | 18 `razor-leaf` · 22 `mega-drain` · 26 `sweet-scent` · 30 `vine-lash` |
| `venusaur` | 3 | stage2 | Grass/Poison | 80/82/83/100/80 | — | — | 34 `power-whip` · 40 `petal-blizzard` · 46 `solar-beam` |

**Growth** 3/2/2/2 · **Abilities** `overgrow` `chlorophyll` `healer` · **Mastery** `seed-bomb` → `seed-barrage` → `bloom-cannon`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `ivysaur` | `tackle` → `headbutt` | `vine-whip` → `vine-lash` | `growl` → `sweet-scent` |
| → `venusaur` | `headbutt` → `body-slam` · **+`petal-blizzard`** | `vine-lash` → `power-whip` · **+`solar-beam`** | `leech-seed` → `giga-drain` · **+`synthesis`** |

### `charmander` line — Fire → Fire/Flying · 3 archetypes · ✅ / 🆕

| id | dex | Stage | Types | HP/Atk/Def/Spc/Spd | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `charmander` | 4 | basic | Fire | 39/52/43/50/65 | starter | **L12** → `charmeleon` | 1 `scratch` · 1 `growl` · 5 `ember` · 9 `smokescreen` · 13 `fire-fang` |
| `charmeleon` | 5 | stage1 | Fire | 58/64/58/65/80 | — | **L26** → `charizard` | 18 `slash` · 22 `flame-wheel` · 26 `dragon-claw` · 30 `fire-spin` |
| `charizard` | 6 | stage2 | Fire/Flying | 78/84/78/85/100 | — | — | 34 `wing-attack` · 38 `flamethrower` · 44 `heat-wave` · 50 `fire-blast` |

**Growth** 2/3/2/3 · **Abilities** `blaze` `tough-claws` `snipe` · **Mastery** `fire-fang-m` → `inferno-fang` → `blast-burn`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `charmeleon` | `scratch` → `slash` | `ember` → `flame-wheel-r` | `smokescreen` → `will-o-wisp` |
| → `charizard` | `dragon-claw` → `dragon-claw-plus` · **+`flare-blitz`** | `flamethrower` → `fire-blast` · **+`heat-wave`** | `will-o-wisp` → `will-o-wisp-plus` · **+`roost`** |

### `squirtle` line — Water · 3 archetypes · ✅ kits / 🆕 learnsets

| id | dex | Stage | Types | HP/Atk/Def/Spc/Spd | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `squirtle` | 7 | basic | Water | 44/48/65/50/43 | starter | **L12** → `wartortle` | 1 `tackle` · 1 `tail-whip` · 5 `water-gun` · 9 `withdraw` · 13 `bubble` |
| `wartortle` | 8 | stage1 | Water | 59/63/80/65/58 | — | **L26** → `blastoise` | 18 `bite` · 22 `water-pulse` · 26 `rapid-spin` · 30 `aqua-jet` |
| `blastoise` | 9 | stage2 | Water | 79/83/100/85/78 | — | — | 34 `surf` · 40 `hydro-pump` · 46 `skull-bash` |

**Growth** 3/2/3/2 · **Abilities** `torrent` `shell-armor` `rain-dish` · **Mastery** `aqua-tail` → `aqua-tail-plus` → `aqua-tail-max`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `wartortle` | `tackle` → `skull-bash` · `tail-whip` → `aqua-jet` | `water-gun` → `water-pulse` · `tail-whip` → `charm` | `withdraw` → `iron-defense` · `tail-whip` → `aqua-ring` |
| → `blastoise` | `skull-bash` → `skull-bash-plus` · **+`hydro-crash`** | `water-pulse` → `surf` · **+`hydro-pump`** | `aqua-ring` → `aqua-ring-plus` · **+`aqua-fortress`** |

---

## 2. Meadow (primary R1 biome) — 8 lines

### `caterpie` line — Bug → Bug/Flying · 3 archetypes · ✅ / 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `caterpie` | 10 | basic | Bug | 45/30/35/20/45 | common | L8 → `metapod` | 1 `tackle` · 1 `string-shot` · 4 `bug-bite` · 7 `harden` |
| `metapod` | 11 | stage1 | Bug | 50/20/55/25/30 | — | L12 → `butterfree` | 9 `silk-bind` · 11 `pin-shot` |
| `butterfree` | 12 | stage2 | Bug/Flying ★ | 60/45/50/80/70 | — | — | 14 `gust` · 17 `powder-spread` · 21 `psybeam` · 26 `silver-wind` · 32 `bug-buzz` |

**Growth** 2/1/2/2 · **Abilities** `compound-eyes` `iron-shell` `swarm` · **Mastery** `sticky-web` → `dream-eater` → `quiver-dance`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `metapod` | `tackle` → `bug-bite-plus` | `string-shot` → `silk-bind` | `harden` → `harden-plus` |
| → `butterfree` | `bug-bite-plus` → `silver-wind` · **+`aerial-ace`** | `pin-shot` → `psybeam` · **+`bug-buzz`** | `harden-plus` → `safeguard` · **+`powder-spread`** |

### `weedle` line — Bug/Poison · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `weedle` | 13 | basic | Bug/Poison | 40/35/30/20/50 | common | L8 → `kakuna` | 1 `poison-sting` · 1 `string-shot` · 5 `bug-bite` · 7 `harden` |
| `kakuna` | 14 | stage1 | Bug/Poison | 45/25/50/25/35 | — | L12 → `beedrill` | 9 `harden-plus` · 11 `pin-shot` |
| `beedrill` | 15 | stage2 | Bug/Poison | 65/80/40/45/75 | — | — | 14 `fury-attack` · 18 `twineedle` · 24 `focus-energy` · 30 `pin-missile` · 36 `poison-jab` |

**Growth** 2/3/1/3 · **Abilities** `swarm` `poison-point` `snipe` · **Mastery** `venoshock` → `fell-stinger-v` → `toxic-thread`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kakuna` | `poison-sting` → `poison-sting-plus` | `string-shot` → `silk-bind` | — |
| → `beedrill` | `bug-bite` → `twineedle` · **+`fell-stinger-v`** | `pin-shot` → `pin-missile` · **+`toxic`** | — |

### `pidgey` line — Normal/Flying · 3 archetypes · ✅ / 🆕 · common (Meadow + Sky)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `pidgey` | 16 | basic | Normal/Flying | 40/45/40/35/56 | common | **L12** → `pidgeotto` | 1 `tackle` · 1 `sand-attack` · 5 `gust` · 9 `quick-attack` · 13 `roost` |
| `pidgeotto` | 17 | stage1 | Normal/Flying | 63/60/55/50/71 | — | **L26** → `pidgeot` | 18 `wing-attack` · 22 `tailwind` · 26 `feather-dance` · 30 `aerial-ace` |
| `pidgeot` | 18 | stage2 | Normal/Flying | 83/80/75/70/91 | — | — | 34 `air-slash` · 40 `roost-plus` · 46 `hurricane` |

**Growth** 2/2/2/3 · **Abilities** `keen-eye` `tangled-feet` `healer` · **Mastery** `brave-bird` → `brave-bird-plus` → `sky-attack`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `pidgeotto` | `tackle` → `wing-attack` | `gust` → `aerial-ace` | `sand-attack` → `feather-dance` |
| → `pidgeot` | `wing-attack` → `brave-bird` · **+`sky-attack`** | `aerial-ace` → `air-slash` · **+`hurricane`** | `tailwind` → `tailwind-plus` · **+`roost-plus`** |

### `rattata` line — Normal · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `rattata` | 19 | basic | Normal | 30/56/35/25/72 | common | **L12** → `raticate` | 1 `tackle` · 1 `tail-whip` · 4 `quick-attack` · 8 `bite` · 12 `focus-energy` |
| `raticate` | 20 | stage1 (final) | Normal | 55/81/60/50/97 | — | — | 18 `hyper-fang` · 24 `crunch` · 30 `sucker-punch` · 36 `double-edge` |

**Growth** 2/3/2/3 · **Abilities** `guts` `hustle` `run-down` · **Mastery** `super-fang` → `super-fang-plus`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `raticate` | `bite` → `hyper-fang` · **+`double-edge`** | `quick-attack` → `sucker-punch` · **+`crunch`** | — |

### `oddish` line — Grass/Poison · 3 archetypes · 🆕 · uncommon (Leaf Stone: Gloom may evolve from L18)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `oddish` | 43 | basic | Grass/Poison ★ | 45/50/55/75/30 | uncommon | **L12** → `gloom` | 1 `absorb` · 1 `sweet-scent` · 5 `poison-powder` · 9 `acid` · 13 `sleep-powder` |
| `gloom` | 44 | stage1 | Grass/Poison | 60/65/70/85/40 | — | **L26** → `vileplume` (Leaf Stone from L18) | 18 `mega-drain` · 22 `stun-spore` · 26 `moonlight` · 30 `sludge` |
| `vileplume` | 45 | stage2 | Grass/Poison | 75/80/85/100/50 | — | — | 34 `giga-drain` · 40 `petal-dance` · 46 `sludge-bomb` |

**Growth** 2/2/3/1 · **Abilities** `chlorophyll` `effect-spore` `healer` · **Mastery** `spore-cloud` → `aromatherapy-m` → `petal-dance`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `gloom` | `absorb` → `mega-drain` | `acid` → `sludge` | `sweet-scent` → `aromatic-mist` |
| → `vileplume` | `mega-drain` → `giga-drain` · **+`petal-dance`** | `sludge` → `sludge-bomb` · **+`toxic`** | `moonlight` → `moonlight-plus` · **+`aromatherapy-m`** |

### `bellsprout` line — Grass/Poison · 2 archetypes (Vanguard, Specialist) · 🆕 · uncommon (Leaf Stone ≥ L24)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `bellsprout` | 69 | basic | Grass/Poison | 50/75/35/70/40 | uncommon | **L12** → `weepinbell` | 1 `vine-whip` · 1 `growth` · 5 `wrap` · 9 `poison-powder` · 13 `acid` |
| `weepinbell` | 70 | stage1 | Grass/Poison | 65/90/50/85/55 | — | **L26** → `victreebel` (Leaf Stone from L18) | 18 `razor-leaf` · 22 `stun-spore` · 26 `sludge` · 30 `slam` |
| `victreebel` | 71 | stage2 | Grass/Poison | 80/105/65/100/70 | — | — | 34 `power-whip` · 40 `leaf-blade` · 46 `sludge-bomb` |

**Growth** 2/3/2/2 · **Abilities** `chlorophyll` `gluttony` `snipe` · **Mastery** `leaf-tornado` → `leaf-storm-s` → `giga-impact-v`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `weepinbell` | `wrap` → `slam` | `vine-whip` → `razor-leaf` | — |
| → `victreebel` | `slam` → `power-whip` · **+`leaf-blade`** | `acid` → `sludge-bomb` · **+`leaf-storm-s`** | — |

### `mankey` line — Fighting · 2 archetypes (Vanguard, Specialist) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `mankey` | 56 | basic | Fighting | 40/80/35/35/70 | uncommon | **L12** → `primeape` | 1 `scratch` · 1 `leer` · 5 `low-kick` · 9 `karate-chop` · 13 `focus-energy` · 17 `seismic-toss` |
| `primeape` | 57 | stage1 (final) | Fighting | 65/105/60/60/95 | — | — | 22 `fury-swipes` · 28 `cross-chop` · 34 `thrash` · 40 `close-combat` |

**Growth** 2/3/1/3 · **Abilities** `anger-point` `vital-spirit` `guts` · **Mastery** `rage-fist` → `final-gambit`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `primeape` | `karate-chop` → `cross-chop` · **+`close-combat`** | `low-kick` → `seismic-toss-plus` · **+`fury-swipes`** | — |

### `eevee` line — Normal → Water / Electric / Fire · 3 branches = 3 species · 🆕 · rare (Meadow) · meta-starter (§8.5.2)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `eevee` | 133 | basic | Normal | 55/55/50/65/55 | rare | **L12** → one of `vaporeon` / `jolteon` / `flareon` (the matching Stone allows it from L8) | 1 `tackle` · 1 `tail-whip` · 5 `sand-attack` · 9 `quick-attack` · 13 `bite` · 17 `swift` |
| `vaporeon` | 134 | stage1 (final) | Water ★ | 130/65/60/110/65 | — | — | 22 `water-gun` · 26 `aqua-ring` · 32 `hydro-pump` · 38 `acid-armor` |
| `jolteon` | 135 | stage1 (final) | Electric ★ | 65/65/60/110/130 | — | — | 22 `thunder-shock` · 26 `agility` · 32 `thunderbolt` · 38 `thunder` |
| `flareon` | 136 | stage1 (final) | Fire | 65/130/60/110/65 | — | — | 22 `ember` · 26 `fire-fang` · 32 `flamethrower` · 38 `flare-blitz` |

**Growth** 3/2/2/3 · **Abilities** `adaptability` `run-down` `anticipation` (Vaporeon adds `water-absorb`; Jolteon `volt-absorb`, `speed-boost`; Flareon `flash-fire`, `guts`) · **Mastery** `last-resort` → (`hydro-vortex` / `gigavolt-havoc` / `inferno-overdrive` per branch)

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
| `zubat` | 41 | basic | Poison/Flying | 40/45/35/40/55 | common | **L12** → `golbat` | 1 `leech-life` · 1 `supersonic` · 5 `bite` · 9 `wing-attack` · 13 `confuse-ray` · 17 `air-cutter` |
| `golbat` | 42 | stage1 (final) | Poison/Flying | 75/80/70/75/90 | — | — | 24 `poison-fang` · 30 `air-slash` · 36 `leech-life-plus` · 42 `cross-poison` |

**Growth** 3/2/2/3 · **Abilities** `inner-focus` `infiltrator` `snipe` · **Mastery** `screech` → `venom-drench`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `golbat` | `bite` → `poison-fang` · **+`cross-poison`** | `wing-attack` → `air-slash` · **+`leech-life-plus`** | — |

### `geodude` line — Rock/Ground · 3 archetypes · ✅ / 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `geodude` | 74 | basic | Rock/Ground | 40/80/100/30/20 | common | **L12** → `graveler` | 1 `tackle` · 1 `defense-curl` · 5 `rock-throw` · 9 `magnitude` · 13 `rollout` · 16 `self-destruct-g` |
| `graveler` | 75 | stage1 | Rock/Ground | 55/95/115/45/35 | — | **L26** → `golem` | 20 `rock-blast` · 24 `stealth-rock` · 28 `bulldoze` · 32 `earthquake` |
| `golem` | 76 | stage2 | Rock/Ground | 80/110/130/55/45 | — | — | 36 `rock-polish` · 40 `body-press` · 46 `stone-edge` |

**Growth** 3/3/3/2 · **Abilities** `sturdy` `rock-head` `solid-rock` · **Mastery** `rock-slide-m` → `rock-wrecker` → `tectonic-rage`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `graveler` | `tackle` → `rollout` | `rock-throw` → `rock-blast` | `defense-curl` → `harden-plus` |
| → `golem` | `rollout` → `body-press` · **+`stone-edge`** | `rock-blast` → `earthquake` · **+`rock-slide-m`** | `harden-plus` → `iron-defense` · **+`wide-guard`** |

### `diglett` line — Ground · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `diglett` | 50 | basic | Ground | 10/55/25/45/95 | common | **L12** → `dugtrio` | 1 `scratch` · 1 `sand-attack` · 5 `mud-slap` · 9 `magnitude` · 13 `dig` · 17 `sucker-punch` |
| `dugtrio` | 51 | stage1 (final) | Ground | 35/80/50/70/120 | — | — | 26 `slash` · 32 `earthquake` · 38 `fissure-d` |

**Growth** 1/3/1/4 · **Abilities** `sand-veil` `arena-trap-x` `hustle` · **Mastery** `tri-attack-d` → `triple-dive`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `dugtrio` | `dig` → `earthquake` · **+`fissure-d`** | `mud-slap` → `mud-bomb` · **+`slash`** | — |

> `arena-trap-x` is listed for id stability only. Arena Trap was replaced by Sand Veil — there is no flee mechanic to trap. Do not implement.

### `onix` — Rock/Ground · single stage · 2 archetypes via Training Grounds only · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `onix` | 95 | basic (final) | Rock/Ground | 35/45/160/30/70 | uncommon | — (single stage: +25 % growth, §6.2.4) | 1 `tackle` · 1 `harden` · 5 `bind` · 9 `rock-throw` · 13 `rage` · 17 `rock-slide-m` · 22 `slam` · 28 `iron-tail` · 34 `stone-edge` |

**Growth** 2/2/4/2 (+25 %) · **Abilities** `sturdy` `rock-head` `weak-armor` · **Mastery** `dragon-tail` → `double-edge-o`

### `machop` line — Fighting · 2 archetypes (Vanguard, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `machop` | 66 | basic | Fighting | 70/80/50/35/35 | uncommon | **L12** → `machoke` | 1 `low-kick` · 1 `leer` · 5 `karate-chop` · 9 `focus-energy` · 13 `seismic-toss` · 17 `knock-off` |
| `machoke` | 67 | stage1 | Fighting | 80/100/70/50/45 | — | **L26** → `machamp` | 22 `vital-throw` · 26 `bulk-up` · 30 `submission` · 34 `cross-chop` |
| `machamp` | 68 | stage2 | Fighting | 90/130/80/65/55 | — | — | 38 `dynamic-punch` · 44 `close-combat` · 50 `giga-impact-v` |

**Growth** 3/3/2/1 · **Abilities** `guts` `no-guard` `steadfast` · **Mastery** `revenge` → `counter` → `all-out-pummeling`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `machoke` | `karate-chop` → `cross-chop` | — | `leer` → `bulk-up` |
| → `machamp` | `cross-chop` → `dynamic-punch` · **+`close-combat`** | — | `bulk-up` → `bulk-up-plus` · **+`wide-guard`** |

### `aerodactyl` — Rock/Flying · single stage · 🆕 · rare (Cave; Fossil Mystery Event)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `aerodactyl` | 142 | basic (final) | Rock/Flying | 80/105/65/60/130 | rare | — (+25 % growth) | 1 `wing-attack` · 1 `supersonic` · 6 `bite` · 12 `ancient-power` · 18 `agility` · 24 `crunch` · 30 `rock-slide-m` · 36 `sky-drop` · 42 `giga-impact-v` |

**Growth** 3/3/2/4 (+25 %) · **Abilities** `rock-head` `pressure` `tough-claws` · **Mastery** `iron-head-a` → `supersonic-skystrike`

### `lapras` — Water/Ice · single stage · 🆕 · rare (Cave lake + River)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `lapras` | 131 | basic (final) | Water/Ice | 130/85/80/95/60 | rare | — (+25 % growth) | 1 `water-gun` · 1 `sing` · 6 `mist` · 12 `ice-shard` · 18 `body-slam` · 24 `confuse-ray` · 30 `ice-beam` · 36 `surf` · 42 `sheer-cold-l` |

**Growth** 4/2/3/2 (+25 %) · **Abilities** `water-absorb` `shell-armor` `hydration` · **Mastery** `perish-song` → `hydro-vortex`

---

## 4. River / Lake — 4 lines

### `magikarp` line — Water → Water/Flying · 2 archetypes (Vanguard, Specialist) · 🆕 · common

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `magikarp` | 129 | basic | Water | 20/10/55/20/80 | common | **L18** → `gyarados` *(bespoke — the number is the joke)* | 1 `splash` · 1 `tackle` · 15 `flail` |
| `gyarados` | 130 | stage1 (final) | Water/Flying | 95/125/79/100/81 | — | — | 20 `bite` · 24 `dragon-rage` · 28 `aqua-tail-g` · 32 `crunch` · 36 `hydro-pump` · 42 `hurricane` · 48 `hyper-beam` |

**Growth** 1/1/2/2 (Magikarp) → line growth 3/4/2/2 after evolution (a deliberate exception) · **Abilities** `swift-swim` `intimidate` `moxie` · **Mastery** `splash-m` → `dragon-dance`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `gyarados` | `flail` → `aqua-tail-g` · **+`crunch`** | `tackle` → `dragon-rage` · **+`hydro-pump`** | — |

> The Magikarp "investment" fantasy: worthless recruit, monster at L18. Its 3-move learnset means a deck of 2–3 cards until evolution — a deliberate cost. Splash is a 0-AP utility that draws 1 (so the card is never dead).

### `poliwag` line — Water → Water/Fighting · 3 archetypes · 🆕 · common (Water Stone: Poliwhirl may evolve from L26)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `poliwag` | 60 | basic | Water | 40/50/40/40/90 | common | **L12** → `poliwhirl` | 1 `bubble` · 1 `hypnosis` · 5 `water-gun` · 9 `double-slap` · 13 `rain-dance` · 17 `body-slam` |
| `poliwhirl` | 61 | stage1 | Water | 65/65/65/50/90 | — | **L26** → `poliwrath` (Water Stone from L18) | 22 `bubble-beam` · 26 `belly-drum-p` · 30 `mud-shot` · 33 `brick-break` |
| `poliwrath` | 62 | stage2 | Water/Fighting | 90/85/95/70/70 | — | — | 36 `submission` · 40 `hydro-pump` · 46 `dynamic-punch` |

**Growth** 3/2/2/3 · **Abilities** `water-absorb` `damp` `swift-swim` · **Mastery** `circle-throw` → `mind-reader` → `focus-punch`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `poliwhirl` | `double-slap` → `body-slam` | `bubble` → `bubble-beam` | `hypnosis` → `hypnosis-plus` |
| → `poliwrath` | `body-slam` → `submission` · **+`dynamic-punch`** | `bubble-beam` → `hydro-pump` · **+`rain-dance-plus`** | `hypnosis-plus` → `rest-p` · **+`wide-guard`** |

### `psyduck` line — Water · 2 archetypes (Specialist, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `psyduck` | 54 | basic | Water | 50/52/48/50/55 | uncommon | **L12** → `golduck` | 1 `water-gun` · 1 `tail-whip` · 5 `confusion` · 9 `disable` · 13 `screech` · 17 `water-pulse` · 21 `zen-headbutt` · 25 `amnesia` |
| `golduck` | 55 | stage1 (final) | Water | 80/82/78/80/85 | — | — | 28 `psych-up` · 32 `hydro-pump` · 36 `psychic` · 40 `aqua-jet` |

**Growth** 3/2/2/3 · **Abilities** `cloud-nine` `damp` `swift-swim` · **Mastery** `psyshock` → `shattered-psyche`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `golduck` | — | `confusion` → `psychic` · **+`hydro-pump`** | `disable` → `amnesia-plus` · **+`psych-up`** |

### `krabby` line — Water · 2 archetypes (Vanguard, Support) · 🆕 · uncommon

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `krabby` | 98 | basic | Water | 30/105/90/25/50 | uncommon | **L12** → `kingler` | 1 `bubble` · 1 `leer` · 5 `vice-grip` · 9 `harden` · 13 `mud-shot` · 17 `metal-claw` · 21 `stomp` |
| `kingler` | 99 | stage1 (final) | Water | 55/130/115/50/75 | — | — | 26 `crabhammer` · 32 `guillotine-k` · 38 `brine` |

**Growth** 2/4/3/2 · **Abilities** `hyper-cutter` `shell-armor` `sheer-force` · **Mastery** `slam-k` → `crabhammer-max`

| Evolution | Vanguard | Specialist | Support |
|---|---|---|---|
| → `kingler` | `vice-grip` → `crabhammer` · **+`guillotine-k`** | — | `harden` → `iron-defense` · **+`wide-guard`** |

---

## 5. Elite Wild boss-wilds (§2.8.2) — 2 lines

### `snorlax` — Normal · single stage · ✅ · boss-wild (R1, L14–16, boss HP ≈ 2× elite)

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `snorlax` | 143 | basic (final) | Normal | 160/110/65/65/30 | boss-wild | — (+25 % growth) | 1 `tackle` · 1 `amnesia` · 6 `snore` · 12 `rest-s` · 18 `body-slam` · 24 `yawn` · 30 `crunch` · 36 `heavy-slam` · 44 `giga-impact-v` |

**Growth** 5/3/2/1 (+25 %) · **Abilities** `thick-fat` `immunity` `gluttony` · **Mastery** `belly-drum-s` → `pulverizing-pancake`
**Boss script**: P1 stall (`rest-s` heals 50 % max HP, self-Sleep 2 turns, P1 only · `snore` Ranged 60, only while asleep · `amnesia` +2 Def) → P2 offence (`body-slam` Melee 85, 30 % Paralysis · `crunch`). Catch → recruit `snorlax` at its level with 0 Trauma.

### `marowak` (+ `marowak-spirit` boss variant) — Ground / Ghost · ✅

| id | dex | Stage | Types | Stats | Rarity | Evolves | Learnset |
|---|---|---|---|---|---|---|---|
| `marowak` | 105 | stage1 (final) | Ground | 60/80/110/50/45 | boss-wild recruit | — | 1 `bone-club` · 1 `growl` · 6 `headbutt` · 12 `bonemerang` · 18 `focus-energy` · 24 `thrash` · 30 `bone-rush` · 36 `earthquake` |
| `marowak-spirit` | 105-s | boss variant | Ghost | 60/80/110/50/45 | boss-wild | — | fixed kit: `curse-ms` · `confuse-ray` · `shadow-bone` · `lick` |

**Growth** 3/3/3/2 · **Abilities** `rock-head` `lightning-rod` `battle-armor` (spirit: `levitate` `cursed-body`) · **Mastery** `bonemerang-m` → `bone-rush-max`
**Boss script**: `curse-ms` = 25 % self-HP → 3-turn DoT on target · `confuse-ray` 3t · `shadow-bone` Melee 85 Ghost, 20 % −1 Def · `lick` Melee 40, 30 % Paralysis. **Catch → recruit a living Ground `marowak`** holding `thick-club` (held item, Marowak-only, +50 % Melee). `cubone` (R3 Tower pool) evolves into `marowak` at L12.

---

## 6. Region 1 roster summary (for map generation and art fetch)

| Biome | Common (2 offered) | Uncommon (1 offered) | Rare (~10 % swap) |
|---|---|---|---|
| Meadow 🌾 | `caterpie` `weedle` `pidgey` `rattata` | `oddish` `bellsprout` `mankey` | `eevee` |
| Cave 🕳️ | `zubat` `geodude` `diglett` | `onix` `machop` | `aerodactyl` `lapras` |
| River 💧 | `magikarp` `poliwag` | `psyduck` `krabby` | `lapras` |

**Art to fetch (dex)**: 1–18, 19–20, 41–45, 50–51, 54–57, 60–62, 66–71, 74–76, 95, 98–99, 105, 129–136, 142–143 — `npm run art:portraits -- <dex…>` then add the lines to `roster-vs.json` and `npm run art:sprites`. `marowak-spirit` reuses Marowak's sprite with a CSS ghost tint (v0.4).

**Counts**: 24 lines · 57 species · 3 starters · 15 base wild species (R1 pool) · 2 boss-wilds. Trainer/Gym/Elite rosters in `trainers.md`, `gyms.md`, `elites.md` only use species from this file (R1) or from `species-pool-r2-r3.md` (R2/R3).
