# Mystery Event catalog — 22 (12 canon + 10 new)

> Implements §7.9. Each event is a flavour scene plus 2–3 choices; each choice states its outcome up front
> unless the event is tagged 🔴 Gamble (Pillar 1 holds even inside "Mystery"). Events never repeat within a run.
> Risk mix target (§2.10.3): 🟢 Safe 30 % · 🟡 Tradeoff 50 % · 🔴 Gamble 20 %.

## 1. Canon 12 (§2.10.2)

| id | Risk | Scene | Choices |
|---|---|---|---|
| `mysterious-stone` | 🟢 | A mossy stone hums faintly | (a) take it → an Evolution Item the Box can use (any, if nobody can) · (b) leave it — ✅ v0.7.5, Safe: nothing is asked in return |
| `wandering-tutor` | 🟢 | An old trainer offers a forgotten technique | (a) free Dojo move for one Pokémon · (b) decline → +100 ₽ |
| `berry-bush` | 🟢 | A bush heavy with berries | (a) eat now → +30 % HP to the whole Box · (b) harvest → 3 `potion` |
| `daycare-recovery` | 🟡 | An old couple offer to rest one Pokémon | (a) clear all Trauma from one Pokémon; it skips the next combat · (b) decline |
| `slot-booth` | 🔴 | A carny offers a coin flip | (a) wager 100 ₽ → 50 % win 250 ₽ / 50 % lose it · (b) decline |
| `wounded-pokemon` | 🟡 | A wild Pokémon, badly hurt | (a) heal it → free recruit with 2 Trauma stacks · (b) battle it at full HP (normal catch) · (c) leave |
| `trainers-dare` | 🟡 | A rival challenges you | (a) accept → an Elite-tier fight with doubled rewards · (b) decline, no penalty |
| `cursed-trinket` | 🔴 | A glittering trinket on a pedestal | (a) take it → a random Rare relic, 30 % chance of 2 Trauma stacks on a random Pokémon · (b) leave |
| `old-map` | 🟢 | A torn map fragment | (a) read it → reveal every node 2 layers ahead · (b) sell at the next shop → +200 ₽ |
| `lost-backpack` | 🟢 | An unattended pack | (a) 3 random consumables · (b) 200 ₽ · (c) leave it |
| `bond-ceremony` | 🟢 | A shrine to bonding | (a) one Pokémon gains +1 to a chosen stat permanently · (b) leave |
| `stat-trade` | 🟡 | A sage offers a swap | (a) one Pokémon swaps Attack and Defence for the run · (b) leave |

## 2. New 10 🆕

Authored to fill the gaps the canon set leaves: no event currently touches the **deck**, the **Lead mechanic**,
**Pokéball scarcity**, or the **Box cap** — the four systems the run is actually about.

| id | Risk | Scene | Choices |
|---|---|---|---|
| `abandoned-pokeball` | 🟢 | A dented ball half-buried in the grass | (a) take it → +2 balls · (b) prise it open → a random consumable |
| `type-shrine` | 🟡 | A shrine humming with one element (the seeded type is shown) | (a) attune one Pokémon → its moves of that type +15 % for the run · (b) offer 150 ₽ → the whole team gains it for the next Region · (c) leave |
| `sparring-ring` | 🟡 | Two trainers invite you to spar without stakes | (a) spar → a normal Trainer fight, no rewards, but **all XP doubled** · (b) watch → learn one enemy's intent pool (Pokédex credit) · (c) leave |
| `moving-truck` | 🟡 | A courier is short-handed | (a) carry cargo → 250 ₽, but the whole team starts the next combat at −15 % HP · (b) decline |
| `veterans-lesson` | 🟢 | A retired trainer critiques your formation | (a) the first manual swap of every combat costs 0 AP for the rest of this Region · (b) +1 max hand size for the next 3 combats |
| `fossil-dig` | 🔴 | A dig site with two exposed fossils | (a) the winged fossil → `aerodactyl` at the Region's band · (b) the shell fossil → a Rare relic · (c) leave (both are gone) |
| `poachers-camp` | 🔴 | An empty camp with a full cage | (a) free the Pokémon → a free recruit, but the next Trainer node becomes an Elite · (b) take the supplies → 3 balls + 150 ₽ · (c) leave |
| `pokemon-daycare-swap` | 🟡 | The daycare will trade a Pokémon for a rested one | (a) swap a Box Pokémon for a random one of the same rarity at +3 levels, 0 Trauma · (b) decline |
| `berry-blender` | 🟢 | A blender and a pile of berries | (a) upgrade one healing consumable a tier · (b) 2 random status cures |
| `mirror-pool` | 🔴 | A still pool shows your team, changed | (a) reroll one Pokémon's ability from its pool · (b) reroll a relic you hold into a random relic of the same rarity · (c) leave |

## 3. Effect vocabulary (what a choice may do)

A choice is data, not a script. The authoring surface is this closed list, so a new event needs no new code:

`grant-item` · `grant-relic(rarity)` · `grant-money(n)` · `grant-balls(n)` · `heal-box(percent)` ·
`clear-trauma(target)` · `add-trauma(target, n)` · `recruit(species|pool)` · `start-combat(profile)` ·
`reveal-map(layers)` · `stat-boost(target, stat, n)` · `swap-stats(target)` · `type-boost(scope, type, pct)` ·
`upgrade-consumable` · `reroll-ability` · `reroll-relic` · `modify-next-node(type)` · `hand-size(n, duration)` ·
`swap-discount(duration)` · `xp-multiplier(n, scope)`.

## 4. Generation rules

- 2 Mystery nodes per Region (§2.5.2), drawn from the pool without replacement for the whole run (§2.10.4).
- The risk badge (🟢/🟡/🔴) is visible on the map node **before** entering.
- 🔴 Gamble events are the only ones allowed an unknown outcome, and even they state the *space* of outcomes.
- Events that grant a recruit respect the Box cap → Swap-or-Skip (§2.3.1).
- `wandering-tutor` needs a Dojo reachable from a route and is not in the pool yet. `mysterious-stone` joined it in
  v0.7.5 with the Evolution Items, beside Eevee's Stone Cache (§8.5.3), which is never drawn from the pool.
