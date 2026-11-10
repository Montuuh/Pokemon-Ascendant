# Vault catalog — what a new account has not opened

> Implements §8.6.1 (the vault), §8.6.2 (Oak's Parcels) and §8.14 (a Leader's TM). **55 entries**: 43 come by parcel
> and 12 with a Gym Leader's first Badge. The runtime table is `src/sim/meta/vault.ts`; an entry's id there is
> `kind:id` (`relic:barrier-charm`, `held:plates`). A row here names content defined in its own catalogue — this
> file adds no content, only the lock.
>
> **Never in the vault:** recruitable species, the six Legendary relics, and every consumable (§8.6.1 says why).
> **The floor:** every relic rarity keeps more than half of its rows open on a fresh account; a content test holds it.

## Relics — 20, by parcel

A row marked *Field Note* also opens when its deed is done (§8.7.1); its criterion is in `relics.md` §5.

| id | Rarity | Also by |
|---|---|---|
| `barrier-charm` | Common | Field Note |
| `cleanse-tag` | Common | Field Note |
| `lucky-egg-token` | Common | Field Note |
| `soothe-bell` | Common | Field Note |
| `status-lance` | Common | Field Note |
| `healers-kit` | Common | Field Note |
| `hand-off-pouch` | Common | Field Note |
| `battle-tracker` | Common | Field Note |
| `reactor-core` | Uncommon | Field Note |
| `lure-module` | Uncommon | Field Note |
| `cycle-cell` | Uncommon | Field Note |
| `phoenix-feather` | Uncommon | Field Note |
| `crown-of-echoes` | Uncommon | — |
| `time-spinner` | Uncommon | — |
| `trainers-instinct` | Uncommon | — |
| `box-expander` | Uncommon | — |
| `champions-crest` | Rare | — |
| `soul-link` | Rare | — |
| `perfect-recall` | Rare | — |
| `evolution-catalyst` | Rare | — |

Open from the first run: 24 of 32 Commons (the twelve Type Gems among them), 10 of 18 Uncommons, 5 of 9 Rares, all
6 Legendaries. The seven open relics that still carry a `discovery` criterion are Field Notes that pay an Oak's
Parcel instead.

## Held items — 6 cards, by parcel

| id | Card |
|---|---|
| `leftovers` | Leftovers |
| `eviolite` | Eviolite |
| `focus-sash` | Focus Sash |
| `power-bracer` | Power Bracer |
| `choice-scarf` | Choice Scarf |
| *(bundle)* | **The Type Plates** — all sixteen as one card: Splash, Flame, Zap, Meadow, Mind, Icicle, Fist, Earth, Sky, Stone, Toxic, Insect, Spooky, Draco, Dread, Iron |

Open from the first run: the type boosters (Charcoal and its kin), Black Glasses, Silk Scarf, and everything an
evolution waits on (Twisted Spoon, Hard Stone, Spell Tag, Metal Coat, Macho Brace). The signature items (Light
Ball, Thick Club) never enter a pool.

## TMs — 14 by parcel

Flamethrower · Blizzard · Hyper Beam · Thunder · Psychic · Explosion · Giga Impact · Overheat · Dream Eater · Sky
Attack · Rest · Dark Pulse · Flash Cannon · Substitute.

## TMs — 12 by Badge (§8.14)

| Badge | Leader's TM |
|---|---|
| `boulder-badge` | Rock Slide |
| `cascade-badge` | Surf |
| `hive-badge` | Swords Dance |
| `plain-badge` | Body Slam |
| `volcano-badge` | Fire Blast |
| `rainbow-badge` | Solar Beam |
| `thunder-badge` | Thunderbolt |
| `soul-badge` | Toxic |
| `marsh-badge` | Calm Mind |
| `earth-badge` | Earthquake |
| `knuckle-badge` | Bulk Up |
| `glacier-badge` | Ice Beam |

## Mystery events — 3, by parcel

| id | Why it waits |
|---|---|
| `cursed-trinket` | A gamble with a relic at stake |
| `slot-booth` | A gamble |
| `unmarked-cave` | A gamble with a fight in it |

Eleven events are open from the first run.
