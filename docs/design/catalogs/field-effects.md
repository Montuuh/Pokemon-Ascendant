# Field Effect catalog — 4 fields × 2 owners

> Implements §4.3. One engine, two classes: a neutral **Battlefield** (symmetric, wild/Region
> encounters) and an enemy-owned **Home Field** (one-sided, Gym/Elite). Every field carries an `owner` flag.
> Weather and Terrain are independent categories that can coexist; a second field of the same category
> overwrites the first (§4.3.7). Region 3 accent — 🔒 until v0.7.

## 1. The four launch fields

| id | Category | Effect (neutral Battlefield) | Notes |
|---|---|---|---|
| `sunny-day` | Weather | Fire ×1.5, Water ×0.5 | |
| `rain-dance` | Weather | Water ×1.5, Fire ×0.5 | Enables `swift-swim`, `rain-dish`, `hydration` |
| `electric-terrain` | Terrain | Electric ×1.3 to grounded Pokémon; Paralysis cannot be applied to them | Grounded = not Flying and not `levitate` |
| `sandstorm` | Hazard | Every non-Rock/Ground Pokémon loses 5 % max HP at the end of its turn | Ties fields to the faint/swap economy |

## 2. Home Fields (§4.3.5) — one per Gym type

A Gym Leader or Elite sets a Home Field matching its own type at combat start, shown as a persistent
`🏠 Home Field: [Type]` badge. **Enemy** moves of that type deal ×1.5; **player** moves of that type get nothing.
There is no player-side suppression — the threat is amplified enemy offence, not a tax.

| Type | Home Field id | Type | Home Field id |
|---|---|---|---|
| Rock | `home-rock` | Fire | `home-fire` |
| Water | `home-water` | Grass | `home-grass` |
| Bug | `home-bug` | Electric | `home-electric` |
| Normal | `home-normal` | Poison | `home-poison` |
| Psychic | `home-psychic` | Ground | `home-ground` |
| Fighting | `home-fighting` | Ice | `home-ice` |

This is what closes the old "Gym type field is inert" gap (#33): the field now has a real multiplier.

## 3. Counterplay (§4.3.6)

- **Don't feed it** — resist or avoid the boss's type; a Home Field only amplifies its own offence.
- **`defog`** (consumable, 80 ₽) clears the active field, Battlefield or Home Field, for the rest of combat.
- **`field-surveyor`** (Region Modifier) lets the player choose the neutral Battlefield in wild/Region combats.
- Post-launch: player field-setting moves that overwrite a Home Field with a neutral Battlefield, and a
  `weather-vane` Rare relic that flips an enemy Home Field to player-owned.

## 4. UI contract

The active field is displayed persistently in the top status bar; a Home Field adds the ownership badge. Card
hover damage previews already fold the field (and its owner) into the number, per Pillar 1 — a preview that does
not include the field is a bug, not a simplification.
