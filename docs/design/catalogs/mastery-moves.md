# Mastery Move catalog — 51 lines

> Implements §5.13.2 (the immutable 5th card slot) and §6.8 (the unlock achievements). A Mastery Move is not
> part of the active-4 configuration: it cannot be replaced by a TM, a tutor or an evolution, and it advances
> Lv1 → Lv2 → Lv3 with the Pokémon's evolutions **if** the tier is unlocked in `MetaProgression`.
> Two-stage lines cap at Lv2. Move stats live in `moves.md`.
>
> **Power targets (§6.8.4):** Lv1 60–80 power / 1 AP / no modifier · Lv2 85–110 / 1–2 AP / one modifier or
> rider · Lv3 110–140 / 2–3 AP / a composite species-unique effect.

| Line | Lv1 (base) | Lv2 (stage 1 / final of 2-stage) | Lv3 (3-stage final) |
|---|---|---|---|
| `bulbasaur` | `seed-bomb` | `seed-barrage` | `bloom-cannon` |
| `charmander` | `fire-fang-m` | `inferno-fang` | `blast-burn` |
| `squirtle` | `aqua-tail` | `aqua-tail-plus` | `aqua-tail-max` |
| `caterpie` | `sticky-web` | — | — |
| `weedle` | `venoshock` | `fell-stinger-v` | — |
| `pidgey` | `brave-bird` | — | `sky-attack` |
| `rattata` | `super-fang` | — | — |
| `oddish` | `spore-cloud` | `aromatherapy-m` | `petal-dance` |
| `zubat` | `screech` | — | — |
| `geodude` | `rock-slide-m` | — | — |
| `diglett` | `tri-attack-d` | — | — |
| `onix` | `dragon-tail` | — | — |
| `machop` | `revenge` | — | — |
| `magikarp` | `splash-m` | — | — |
| `poliwag` | `circle-throw` | — | — |
| `psyduck` | `psyshock` | — | — |
| `krabby` | `slam-k` | — | — |
| `snorlax` | `belly-drum-s` | — | — |
| `eevee` | `last-resort` | — | — |
| `bellsprout` | `leaf-tornado` | — | — |
| `mankey` | `rage-fist` | — | — |
| `aerodactyl` | `iron-head-a` | — | — |
| `lapras` | `glacial-song` | — | — |
| `cubone` | `bonemerang-m` | — | — |
| `pikachu` | `nuzzle-m` | — | — |
| `tentacool` | `acid-spray-m` | — | — |
| `shellder` | `icicle-crash-m` | — | — |
| `horsea` | `twister-m` | — | — |
| `staryu` | `water-pulse-m` | — | — |
| `seel` | `aqua-jet-m` | — | — |
| `voltorb` | `spark-m` | — | — |
| `magnemite` | `magnet-bomb-m` | — | — |
| `electabuzz` | `thunder-punch-m` | — | — |
| `koffing` | `clear-smog-m` | — | — |
| `growlithe` | `flame-charge-m` | — | — |
| `vulpix` | `fire-spin-m` | — | — |
| `ponyta` | `blaze-kick-m` | — | — |
| `sandshrew` | `sand-tomb-m` | — | — |
| `rhyhorn` | `drill-run-m` | — | — |
| `magmar` | `fire-punch-m` | — | — |
| `abra` | `confusion-m` | — | — |
| `nidoran-f` | `poison-fang-m` | — | — |
| `jynx` | `powder-snow-m` | — | — |
| `spearow` | `drill-peck-m` | — | — |
| `doduo` | `pluck-m` | — | — |
| `farfetchd` | `leek-slash` | — | — |
| `scyther` | `fury-cutter-m` | — | — |
| `gastly` | `night-shade-m` | — | — |
| `drowzee` | `zen-headbutt-m` | — | — |
| `grimer` | `poison-jab-m` | — | — |
| `mr-mime` | `psywave-m` | — | — |

## Unlocks (§6.8.2) — by Bond rank since 2026-09-21

Lv1 at **Companion** (5 Bond), Lv2 at **Deep Bond** (60), Lv3 at **Soulbound** (100) on a three-stage line; a
Soulbound two-stage line opens every fight with its Mastery card in hand. The species-specific achievements
below are the superseded design, kept for the flavour they may lend future medals — none of them gates a tier.

**Lv2 — "Trusted Partner"** (superseded):

| Line | Achievement |
|---|---|
| `bulbasaur` | Apply Poison or Sleep to 5 enemies with its moves |
| `charmander` | Land a single 40+ damage Fire hit with it |
| `squirtle` | Absorb 60+ incoming damage with Defensive moves while it is Lead |
| `caterpie` | Win a combat without it taking damage (DoT excluded) |
| `pidgey` | Use Step-Forward or Step-Backward 10+ times with it |
| `geodude` | Survive a lethal hit via Sturdy while it is Lead |
| `magikarp` | Evolve it into Gyarados |
| `eevee` | Field all three branch species across runs |
| `snorlax` | Catch it rather than defeating it |
| `marowak` | Catch the Spirit and field the living Marowak |
| *(generic fallback)* | Win 3 runs with it in the Active Team |

**Lv3 — "Deep Bond"** (superseded):

| Line | Achievement |
|---|---|
| `bulbasaur` | Win a run with Venusaur as Lead for 60 %+ of all combat turns |
| `charmander` | Win a run using no consumables |
| `squirtle` | Win a run with no Active Pokémon ever fainting |
| `caterpie` | Apply a status to every enemy in a combat, 5 times |
| `pidgey` | Win a run with Pidgeot in the Active Team on the highest difficulty |
| `geodude` | Win a Gym fight where Golem takes a Water or Grass hit and survives |
| `machop` | Win a combat using only Melee moves from Machamp |
| `poliwag` | Land `focus-punch` on a boss in Phase 3 |

## Deck-size integration (§5.13.2)

Deck size = 12 + one card per Active member with Mastery unlocked (max 15). Hand size stays 5. When a Pokémon
with an unlocked Mastery faints, **5** cards are purged from the deck and discard instead of 4.

**Scope**: the Mastery *slot* mechanic is v0.6; the Lv1 moves should exist as data from v0.3 so that the
evolution screen can show the full future kit (Pillar 4 — the player should see what a line becomes).

**Shipped state (2026-09-21, v0.6).** The slot, the deck maths and the faint purge are in. `mastery.json` holds
the table for the 19 shipped lines; a tier is `null` until its move has a row in `moves.json`, and the slot
then keeps the tier below. Lv1 ships for 13 lines — Bulbasaur, Charmander, Squirtle, Caterpie, Pidgey, Oddish,
Zubat, Geodude, Onix, Magikarp, Poliwag, Psyduck, Krabby. Six Lv1 moves wait on an effect kind the sim lacks
(`venoshock` ×2 vs Poisoned, `super-fang` half current HP, `revenge` conditional power, `tri-attack-d`
cycling status, `last-resort` hand condition, `belly-drum-s` self HP loss). Lv2 and Lv3 wait on §6.8.2–§6.8.3's
achievements — and since the same day, every tier unlocks by **Bond rank** (§6.8.2): Lv1 at rank 1, Lv2 at
rank 4, Lv3 at rank 5.


**Shipped state (v0.7.5).** Every line a run can recruit — Region 1, 2 and 3's pools, the Elite Wilds, the
starters and the meta-starters, 51 lines — carries its Lv1, and the three default starters carry Lv2 and
Lv3. The rest of Lv2 and Lv3 wait for **v0.9.1** on purpose: they are Bond rewards at rank 4 and 5, and v0.9.1 is
where Bond is revamped — writing ninety cards against a curve about to change would be writing them twice.
Four catalogue effects were added to the sim for them (power-bonus, fixed-damage, self-damage, and multi-hit on a
Mastery card); three were rewritten because their system does not exist — Perish Song (a delayed KO) became Glacial
Song, Last Resort lost its hand condition, and Tri Attack's cycle became three small riders.
