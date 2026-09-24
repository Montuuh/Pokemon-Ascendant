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

**Binding is canon**: the eligible set and the primary weighting are fixed per Region. The only thing
that changes them is the opt-in `naturalist-lens` Region Modifier, which promotes one **eligible** biome to
primary — dominant, never exclusive, so the 3-species offer never starves.

## 2. Encounter composition (§2.6.2)

Each Wild Area node offers **3 species, visible before entering**: 2 Common + 1 Uncommon from the node's biome.
~10 % of nodes per Region upgrade the Uncommon slot to a Rare. The `lure-module` relic makes it 4 offers.

| Biome | Common | Uncommon | Rare |
|---|---|---|---|
| `meadow` | `caterpie` `weedle` `pidgey` `rattata` | `oddish` `bellsprout` `mankey` | `eevee` |
| `cave` | `zubat` `geodude` `diglett` | `onix` `machop` | `aerodactyl` `lapras` |
| `river` | `magikarp` `poliwag` | `psyduck` `krabby` | `lapras` |
| `sea` | `tentacool*` `shellder*` `horsea*` | `staryu*` `seel*` | `lapras` (Dratini is the Safari's, §6) |
| `power-plant` | `voltorb*` `magnemite*` | `pikachu*` `electabuzz*` | `zapdos*` 🔒 |

> **As built (v0.7.3).** Region 1 is the rows above without the unbuilt lines: the Meadow drops Mankey, and the
> Cave's Rare is `lapras` alone until Aerodactyl ships. Region 2's five pools
> are §2.6.3's table: the Sea as above with `lapras` for the unbuilt `dratini`; the Power Plant with
> `electabuzz` as its Rare while Zapdos is locked; and Region 2's own River, Cave and Meadow, which reuse Region 1
> species at Region 2's band. Weights: Sea 5 · Power Plant 3 · River 2 · Cave 2 · Meadow 1.
| `volcano` | `vulpix*` `growlithe*` | `magmar*` `ponyta*` | `moltres*` 🔒 |
| `sky` | `spearow*` `pidgey` | `doduo*` `farfetchd*` | `articuno*` 🔒 |
| `tower` | `gastly*` | `haunter*` `drowzee*` | `cubone*` `mr-mime*` |

> **As built (v0.7.4).** A Wild node offers base forms (§2.2.1), so Region 3's pools are the rows above in their
> first forms, without the Legendaries: the Volcano `vulpix` `ponyta` `sandshrew` · `rhyhorn` `growlithe` ·
> `magmar`; the Cave `zubat` `geodude` `machop` `mankey` `seel` `shellder` · `abra` `nidoran-f` `jynx` ·
> `aerodactyl` (two lanes share it, the Fighting lane's and the Ice lane's); the Sky `spearow` `pidgey` ·
> `doduo` `farfetchd` · `scyther` (for the locked Articuno); the Tower `gastly` `drowzee` · `cubone`
> `grimer` · `mr-mime`. Weights: Volcano 5 · Cave 3 · Sky 2 · Tower 1.

## 3. Level bands (§2.6.5)

| Region | Wild recruits | Trainers | Elite | Gym non-ace / ace | Elite Wild |
|---|---|---|---|---|---|
| R1 | 5–10 | 6–12 | 12–15 | 12–13 / 14–16 | 14–16 |
| R2 | 12–20 | 15–22 | 22–26 | 20–21 / 22–24 | 24–26 |
| R3 | 22–30 | 26–34 | 32–36 | 33–35 / 35–37 | 34–36 |

A late-Region recruit spawns at the top of the band so it catches up rather than being dead weight.

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

Gen I's Safari list, less every line a route already offers (`safari.test` holds it), less the fossils (the
Laboratory's, v1.3), the starters (the Poké Mart's) and Ditto (until its Transform exists). The tiers are the
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
