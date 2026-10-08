# Biome & Region catalog

> Implements §2.6.1 (biomes), §2.6.2 (encounter composition), §2.6.3 (species pools), §2.6.5 (level bands),
> §2.13 (region aesthetics), §2.5 v2 (map dimensions). Species ids resolve in `species-r1.md` /
> `species-pool-r2-r3.md`.

## 1. Biomes (8)

| id | Name | Regions | Primary in | Theme | Stage art |
|---|---|---|---|---|---|
| `meadow` | Meadow 🌾 | R1, R2 (rare) | **R1** | Normal, Bug, Grass | `meadow.png` ✅ |
| `cave` | Cave 🕳️ | R1, R2, R3 | — | Rock, Ground, Fighting, duals | `cave.png` ✅ |
| `river` | River / Lake 💧 | R1, R2 | — | Water, Bug-Water | `river.png` (use `forest.png` until fetched) |
| `sea` | Sea 🌊 | R2 | **R2** | deep-water Water, Ice | ☐ |
| `power-plant` | Power Plant ⚡ | R2, R3 | — | Electric | ☐ |
| `volcano` | Volcano Slope 🔥 | R3 | **R3** | Fire, Rock-Fire, Ground | ✅ `volcano.jpg` |
| `sky` | Sky / Cliffs 🦅 | R3 | — | Flying, Bug-Flying, Psychic | ✅ `sky-pillar.jpg` |
| `tower` | Abandoned Tower 👻 | R3 (rare) | — | Ghost, Poison, Psychic | ✅ `tower.jpg` (generated, v0.7.4) |

**Binding is canon**: the eligible set and the primary weighting are fixed per Region. The opt-in
`naturalist-lens` Region Modifier raises the Rare row's odds instead of moving a biome (§2.11.3.1).

## 2. Encounter composition (§2.6.2, §2.6.3) — v0.9.7

Each Wild Area node shows **its biome's whole pool by rarity** and rolls who leads on entry: Common 60 % ·
Uncommon 30 % · Rare 10 %, then one of the row evenly. `naturalist-lens` makes the Rare 30 %; `lure-module`
keeps the better of two rarity rolls. A lane's counter (§2.5) joins its pool as an Uncommon when the biome lacks it.
Every non-Legendary species is placed (146 ✅); each Region fields its strength: R1 basics (and the cocoons), R2
middle forms and the never-evolving, R3 final forms only. Starters are Rares at their Region's form. ✅ v0.9.7

Region 1 (weights: Meadow 5 · Cave 3 · River 2):

| Biome | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `meadow` | `caterpie` `weedle` `pidgey` `rattata` `spearow` `oddish` `bellsprout` `nidoran-f` `nidoran-m` | `metapod` `kakuna` `paras` `venonat` `meowth` `ekans` `doduo` `exeggcute` `jigglypuff` `growlithe` `ponyta` `vulpix` | `bulbasaur` `pikachu` `eevee` `farfetchd` |
| `cave` | `zubat` `geodude` `diglett` `sandshrew` `machop` `mankey` | `onix` `cubone` `clefairy` `rhyhorn` `grimer` `koffing` `gastly` `abra` `drowzee` `magnemite` `voltorb` | `charmander` `omanyte` `kabuto` |
| `river` | `magikarp` `poliwag` `psyduck` `goldeen` `tentacool` `krabby` | `slowpoke` `horsea` `shellder` `seel` `staryu` | `squirtle` `dratini` |

Region 2 (weights: Sea 5 · Power Plant 3 · River 2 · Cave 2 · Meadow 1):

| Biome | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `sea` | `tentacruel` `seadra` `seaking` `golduck` | `starmie` `dewgong` `slowbro` | `wartortle` `jynx` `dragonair` |
| `river` | `poliwhirl` `kingler` `golduck` `seaking` | `slowbro` `seadra` `dewgong` | `wartortle` `dragonair` `ditto` |
| `power-plant` | `magneton` `electrode` `raichu` | `electabuzz` `kadabra` `hypno` | `porygon` `ditto` |
| `cave` | `golbat` `graveler` `machoke` `dugtrio` `sandslash` `primeape` | `haunter` `muk` `weezing` `kadabra` `onix` | `charmeleon` `hitmonlee` `hitmonchan` |
| `meadow` | `raticate` `pidgeotto` `arbok` `butterfree` `beedrill` `parasect` `venomoth` | `gloom` `weepinbell` `nidorina` `nidorino` `persian` `wigglytuff` `clefable` `tangela` `lickitung` | `ivysaur` `scyther` `pinsir` `farfetchd` |

Region 3 (weights: Volcano 5 · Cave 3 · Sky 2 · Tower 1):

| Biome | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `volcano` | `arcanine` `ninetales` `rapidash` `rhydon` | `magmar` `flareon` `nidoking` `nidoqueen` `golem` | `charizard` `tauros` |
| `cave` | `machamp` `poliwrath` `golem` `cloyster` | `omastar` `kabutops` `vaporeon` `marowak` | `blastoise` `aerodactyl` `lapras` `snorlax` `kangaskhan` |
| `sky` | `pidgeot` `fearow` `dodrio` | `gyarados` `jolteon` `scyther` | `dragonite` `aerodactyl` |
| `tower` | `gengar` `hypno` | `alakazam` `exeggutor` `vileplume` `victreebel` | `venusaur` `chansey` `mr-mime` |

## 3. Level bands (§2.6.5)

| Region | Wild recruits | Trainers | Elite | Gym non-ace / ace | Elite Wild |
|---|---|---|---|---|---|
| R1 | 5–10 | 6–12 | 12–15 | 12–13 / 14–16 | 14–16 |
| R2 | 14–22 | 17–24 | 24–28 | 20–22 / 22–24 | 26–28 |
| R3 | 24–32 | 28–36 | 34–38 | 30–32 / 32–34 | 36–38 |

A late-Region recruit spawns at the top of the band so it catches up rather than being dead weight.

*(v0.8.10: Region 2 and Region 3 moved up two levels — 12–20 → 14–22, 22–30 → 24–32. Region 1's band ends at 13 and
Region 2's began at 12, so a team that left Region 1 at Lv 15–16 walked into Region 2 four levels over everything;
measured, see §2.6.5. The Gym's two columns follow `GYM_LEVEL_PREMIUM`: the band's top −2 and +0.)*

## 4. Regions (3)

| id | Name | Primary / secondary biomes | Palette | Gym pool | City |
|---|---|---|---|---|---|
| `region-1` | Verdant Route 🌿 | meadow / river, cave | saturated greens, soft yellows, sky blue | Rock, Water, Bug, Normal | Pallet Plaza |
| `region-2` | Coastal Cliffs 🌊 | sea / river, power-plant | cool blues, weathered grey, deep purple | Fire, Grass, Electric, Poison | Vermilion Harbor |
| `region-3` | Volcanic Highlands 🔥 | volcano / cave, sky, tower | reds, oranges, blacks, purples | Psychic, Ground, Fighting, Ice | — (ends at Victory Road) |

**Mechanical escalation** (§2.2), not numeric: R1 baseline · R2 adds status riders on enemy intents · R3 adds
multi-enemy (1 lead + 1–2 supports) and field effects · the League combines everything.

## 5. Map shape (§2.5 v2) — 12 layers per Region

| Layer | Content |
|---|---|
| L0 | Entry: choose 1 of 3 nodes of varied type (no forced Wild) |
| L1–L2 | A Wild Area is guaranteed reachable here (early recruitment stays viable) |
| L1–L8 | Trunk: a branching tree, 1–3 children per node, fan-in ≤ 2, no crossing edges |
| ≈L7 | 1 guaranteed **Elite Trainer** |
| L9 | **Gym fork**: two sub-lanes, each telegraphing its Gym type and Badge |
| L9–L10 | A guaranteed Pokémon Center in each sub-lane |
| L11 | The two terminal Gyms; the player fights only the one their route reaches |

**Per-Region node budget** (§2.5.2): 2 Wild · 4 Trainer · 1 Elite Trainer · 1 Center per lane · 1 Shop ·
2 Mystery · 1 Dojo · ≤1 Elite Wild (seeded, not guaranteed). Layer-adjacent nodes never share a type.

> v0.2 ships a **simplified 7-layer** version of this map (roadmap), keeping the fork and the guarantees. The
> 12-layer generator lands at v0.5.

## 6. The Safari Zone (§2.11.6) ✅ v0.7.6

Gen I's Safari list. Since v0.9.7 every species lives on a route too (§2.6.3); the park's Rares are never a route's
Common (`safari.test` holds it), so the Safari is the sure sighting of what a route rolls one time in ten. *(Until
v0.9.7 the list was "less every line a route offers"; the fossils, the starters and Ditto, once kept off the routes
for the Laboratory, the Poké Mart and Transform, are route Rares now — the Laboratory (v1.2) will have to sell them on
something other than exclusivity.)* The tiers are the
Safari's own — the board a species is stalked on — not its drop rarity.

| City | Easy | Tricky | Rare |
|---|---|---|---|
| Pallet Town | `nidoran-m` `paras` `venonat` `goldeen` | `exeggcute` `slowpoke` | `chansey` `tauros` `kangaskhan` `pinsir` |
| Celadon City | the same | the same | the same, and `dratini` |

| Species | Trait on its board |
|---|---|
| `goldeen` · `slowpoke` | In its pond — never leaves the water; reached from the open shore |
| `chansey` | Keen-eyed — looks 4 tiles |
| `tauros` | Quick — walks 2 a turn |
| `kangaskhan` | Alert — hears the tiles beside it |
| `pinsir` | Sharp-eared — hears 2 tiles away |
| `dratini` | In its pond, and quick |

**Dratini is the Safari's.** §2 above had pencilled it as the Sea's Rare (`dratini*`), stood in for by `lapras`
until it was built. It goes where Gen I kept it instead — the big city's Safari, the hardest board in the park —
and the Sea keeps Lapras. *(2026-09-24.)*
