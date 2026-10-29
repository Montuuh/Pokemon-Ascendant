# Biome & Region catalog

> Implements §2.6.1 (biomes), §2.6.2 (encounter composition), §2.6.3 (species pools), §2.6.5 (level bands),
> §2.13 (region aesthetics), §2.5 v2 (map dimensions). Species ids resolve in `species-r1.md` /
> `species-pool-r2-r3.md`.

## 1. Habitats (16) ✅ v0.9.25

A Wild Area is a habitat (§2.6.1, 2026-10-20): a small pool of one family, a backdrop, and a landmark that is its
picture on the map (§9.3, v0.9.28; `public/art/map/habitat/<id>.png`). The first three ids are the v0.9.7 biomes', kept for saved maps. Display names by Region in §2.

| id | Name | Regions | Primary in | Theme | Map landmark | Stage art |
|---|---|---|---|---|---|---|
| `tall-grass` | Tall Grass | R1, R2 | **R1** | Normal, Flying, Poison | a stand of rustling tall grass | `route.jpg` ✅ (Showdown classic) |
| `meadow` | Flower Meadow | R1 | — | Grass, Fire, Normal | flowers | `meadow.jpg` ✅ |
| `forest` | Forest | R1, R2 | — | Bug, Grass | three pines | `forest.jpg` ✅ |
| `cave` | Cave · Deep Cave (R3) | R1, R2, R3 | — | Rock, Ground, Poison, Fighting; fossils | a peak with a cave's mouth | `cave.jpg` ✅ |
| `ridge` | Rocky Ridge · Mountain Trail (R2) | R1, R2 | — | Fighting, Ground, Fire | Kindle Road's rocks | `mountain.jpg` ✅ (Showdown classic) |
| `river` | Fishing Spot | R1, R2 | — | Water | a pond | `pond.jpg` ✅ (Showdown classic) |
| `shore` | Seashore · Rocky Shore (R2) | R1, R2 | — | Water, Poison, Rock, Flying | a sandbank, sea rocks | `beach.jpg` ✅ (Showdown classic) |
| `sea` | Open Sea | R2 | **R2** | Deep-water Water, Ice | a reef on open water | `sea.jpg` ✅ |
| `power-plant` | Power Plant | R1, R2 | — | Electric, Poison | the Power Plant | `power-plant.jpg` ✅ |
| `tower` | Old Tower · Haunted Tower (R3) | R1, R3 | — | Ghost, Psychic | the Pokémon Tower's dome | `tower.jpg` ✅ |
| `swamp` | Toxic Marsh | R2 | — | Poison | a marsh | `night-meadow.jpg` ✅ |
| `volcano` | Volcano Slope | R3 | **R3** | Fire | a cone with a glowing crater | `volcano.jpg` ✅ |
| `badlands` | Badlands | R3 | — | Ground, Rock | sandstone rocks | `desert.jpg` ✅ |
| `lake` | Underground Lake | R3 | — | Water, Ice | an ice rock in a pool | `ice-cave.jpg` ✅ |
| `sky` | Sky Cliffs | R3 | — | Flying, Dragon | rock spires | `sky-pillar.jpg` ✅ |
| `ruins` | Overgrown Ruins | R3 | — | Grass, Psychic | a Tanoby chamber | `forest.jpg` ✅ |

**Binding is canon**: the eligible set and the primary weighting are fixed per Region. The opt-in
`naturalist-lens` Region Modifier raises the Rare row's odds instead of moving a habitat (§2.11.3.1).

## 2. Encounter composition (§2.6.2, §2.6.3) — v0.9.7, habitats v0.9.25

Each Wild Area node shows **its habitat's whole pool by rarity** and rolls who leads on entry: Common 60 % ·
Uncommon 30 % · Rare 10 %, then one of the row evenly. `naturalist-lens` makes the Rare 30 %; `lure-module`
keeps the better of two rarity rolls. A lane draws from two habitats and its counter (§2.5) joins a pool as an Uncommon
when the habitat lacks it. Every non-Legendary species is placed (146 ✅); each Region fields its strength: R1 basics
(and the cocoons), R2 middle forms and the never-evolving, R3 final forms only. Starters are Rares at their Region's form.

Region 1 — Tall Grass, Forest, Flower Meadow, Cave, Rocky Ridge, Fishing Spot, Seashore, Power Plant, Old Tower (weights 4 · 3 · 2 · 2 · 2 · 2 · 1 · 1 · 1):

| Habitat | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `tall-grass` | `pidgey` `rattata` `spearow` `nidoran-f` `nidoran-m` | `ekans` `meowth` `doduo` `jigglypuff` | `eevee` |
| `forest` | `caterpie` `weedle` `oddish` `paras` | `bellsprout` `venonat` `exeggcute` | `pikachu` `bulbasaur` `scyther` |
| `meadow` | `oddish` `bellsprout` `jigglypuff` `nidoran-f` | `clefairy` `exeggcute` `vulpix` `growlithe` `ponyta` | `bulbasaur` `eevee` |
| `cave` | `zubat` `geodude` `diglett` `paras` | `clefairy` `sandshrew` `cubone` `rhyhorn` `onix` | `kabuto` `omanyte` |
| `ridge` | `geodude` `mankey` `machop` `sandshrew` `spearow` | `rhyhorn` `cubone` `ponyta` `growlithe` | `charmander` |
| `river` | `magikarp` `poliwag` `goldeen` `psyduck` `krabby` | `slowpoke` `horsea` `shellder` | `dratini` `squirtle` |
| `shore` | `tentacool` `krabby` `shellder` `psyduck` | `staryu` `seel` `horsea` | `squirtle` `omanyte` |
| `power-plant` | `magnemite` `voltorb` `rattata` `grimer` | `koffing` `meowth` `ekans` | `pikachu` |
| `tower` | `gastly` `zubat` `koffing` | `drowzee` `cubone` `grimer` `exeggcute` | `abra` |

Region 2 — Open Sea, Power Plant, Fishing Spot, Rocky Shore, Cave, Mountain Trail, Toxic Marsh, Tall Grass, Forest (weights 4 · 3 · 2 · 2 · 2 · 2 · 2 · 1 · 1):

| Habitat | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `sea` | `tentacruel` `seadra` `seaking` `golduck` | `starmie` `dewgong` `slowbro` | `jynx` `dragonair` |
| `river` | `poliwhirl` `seaking` `golduck` `kingler` | `slowbro` `seadra` | `wartortle` `dragonair` |
| `shore` | `kingler` `golbat` `graveler` `pidgeotto` | `marowak` `dewgong` `starmie` | `farfetchd` `wartortle` |
| `power-plant` | `magneton` `electrode` `raichu` | `electabuzz` `muk` `weezing` | `porygon` `ditto` |
| `cave` | `golbat` `graveler` `dugtrio` `sandslash` | `rhydon` `haunter` `kadabra` | `charmeleon` |
| `ridge` | `machoke` `primeape` `graveler` `sandslash` | `dugtrio` `marowak` `nidorino` | `hitmonlee` `hitmonchan` |
| `swamp` | `muk` `weezing` `arbok` `gloom` | `haunter` `golbat` `weepinbell` `venomoth` | `ditto` |
| `tall-grass` | `raticate` `pidgeotto` `arbok` `nidorina` `nidorino` | `persian` `wigglytuff` `clefable` `lickitung` `hypno` | `farfetchd` `ivysaur` |
| `forest` | `butterfree` `beedrill` `parasect` `venomoth` `metapod` `kakuna` | `gloom` `weepinbell` `tangela` | `victreebel` `pinsir` `ivysaur` |

Region 3 — Volcano Slope, Badlands, Deep Cave, Underground Lake, Sky Cliffs, Haunted Tower, Overgrown Ruins (weights 4 · 2 · 2 · 2 · 2 · 1 · 1):

| Habitat | Common (60 %) | Uncommon (30 %) | Rare (10 %) |
|---|---|---|---|
| `volcano` | `arcanine` `ninetales` `rapidash` `rhydon` | `magmar` `flareon` `golem` | `charizard` |
| `badlands` | `rhydon` `golem` `nidoking` `nidoqueen` | `marowak` `tauros` `dodrio` `steelix` | `aerodactyl` |
| `cave` | `machamp` `golem` `poliwrath` | `omastar` `kabutops` `marowak` `magnezone` | `snorlax` `kangaskhan` |
| `lake` | `cloyster` `poliwrath` `vaporeon` | `gyarados` `omastar` `kabutops` | `lapras` `blastoise` |
| `sky` | `pidgeot` `fearow` `dodrio` | `gyarados` `scizor` `jolteon` | `dragonite` `aerodactyl` |
| `tower` | `gengar` `hypno` | `alakazam` `mr-mime` `exeggutor` `vileplume` `umbreon` | `chansey` `venusaur` |
| `ruins` | `vileplume` `victreebel` `exeggutor` | `hypno` `jolteon` `mr-mime` `scizor` | `venusaur` |

## 3. Level bands (§2.6.5)

| Region | Wild recruits | Trainers | Elite (own · lent) | Gym non-ace / ace (lent) | Elite Wild |
|---|---|---|---|---|---|
| R1 | 5–13 | 6–15 | 12–14 · 9–10 | 14 / 15 (12) | 14–16 |
| R2 | 14–22 | 15–24 | 21–23 · 18–19 | 23 / 24 (21) | 23–25 |
| R3 | 24–32 | 25–34 | 31–33 · 28–29 | 33 / 34 (31) | 33–35 |

A late-Region recruit spawns at the top of the band so it catches up rather than being dead weight.

*(v0.8.10: Region 2 and Region 3 moved up two levels — 12–20 → 14–22, 22–30 → 24–32. Region 1's band ends at 13 and
Region 2's began at 12, so a team that left Region 1 at Lv 15–16 walked into Region 2 four levels over everything;
measured, see §2.6.5. The Gym's two columns follow `GYM_LEVEL_PREMIUM`: the band's top +1 and +2 since 2026-10-20 — −2
and +0 before, with its lent Pokémon eight under; the Elite's own two over its column's top, its lent ones at the
column's bottom, §2.8.1.)*

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
