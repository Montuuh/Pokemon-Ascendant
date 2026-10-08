# Mastery Move catalog — 51 lines

> Implements §5.13.2 (the immutable 5th card slot) and §6.8 (the unlock achievements). A Mastery Move is not
> part of the active-4 configuration: it cannot be replaced by a TM, a tutor or an evolution, and it advances
> Lv1 → Lv2 → Lv3 with the Pokémon's evolutions **if** the tier is unlocked in `MetaProgression`.
> Two-stage lines cap at Lv2. Move stats live in `moves.md`.
>
> **Every tier is a Gen I move (v0.9.5).** Lv1 is the move itself, at its own numbers; Lv2 is its **+** at 2 AP and
> 100 power, Lv3 its **++** at 3 AP and 130, the riders kept (a Super Fang tier takes 65 % and 80 % of HP). A line's
> Mastery is never a card its kit can otherwise hold — a content test walks every branch path.

| Line | Lv1 (base) | Lv2 (stage 1 / final of 2-stage) | Lv3 (3-stage final) |
|---|---|---|---|
| `bulbasaur` | `solar-beam` | `solar-beam-plus` | `solar-beam-plus-plus` |
| `charmander` | `fire-blast` | `fire-blast-plus` | `fire-blast-plus-plus` |
| `squirtle` | `waterfall` | `waterfall-plus` | `waterfall-plus-plus` |
| `caterpie` | `psybeam` | `psybeam-plus` | `psybeam-plus-plus` |
| `weedle` | `fury-attack` | `fury-attack-plus` | `fury-attack-plus-plus` |
| `pidgey` | `sky-attack` | `sky-attack-plus` | `sky-attack-plus-plus` |
| `rattata` | `super-fang` | `super-fang-plus` | — |
| `spearow` | `sky-attack` | `sky-attack-plus` | — |
| `pikachu` | `thunder` | `thunder-plus` | — |
| `sandshrew` | `earthquake` | `earthquake-plus` | — |
| `nidoran-f` | `double-kick` | `double-kick-plus` | `double-kick-plus-plus` |
| `vulpix` | `fire-blast` | `fire-blast-plus` | — |
| `zubat` | `sky-attack` | `sky-attack-plus` | — |
| `diglett` | `tri-attack` | `tri-attack-plus` | — |
| `psyduck` | `psybeam` | `psybeam-plus` | — |
| `mankey` | `rage` | `rage-plus` | — |
| `growlithe` | `fire-blast` | `fire-blast-plus` | — |
| `tentacool` | `surf` | `surf-plus` | — |
| `ponyta` | `fire-blast` | `fire-blast-plus` | — |
| `magnemite` | `thunder` | `thunder-plus` | — |
| `doduo` | `sky-attack` | `sky-attack-plus` | — |
| `seel` | `ice-beam` | `ice-beam-plus` | — |
| `grimer` | `body-slam` | `body-slam-plus` | — |
| `shellder` | `blizzard` | `blizzard-plus` | — |
| `drowzee` | `dream-eater` | `dream-eater-plus` | — |
| `krabby` | `crabhammer` | `crabhammer-plus` | — |
| `voltorb` | `explosion` | `explosion-plus` | — |
| `cubone` | `bonemerang` | `bonemerang-plus` | — |
| `koffing` | `sludge` | `sludge-plus` | — |
| `rhyhorn` | `earthquake` | `earthquake-plus` | — |
| `horsea` | `blizzard` | `blizzard-plus` | — |
| `staryu` | `hydro-pump` | `hydro-pump-plus` | — |
| `magikarp` | `hyper-beam` | `hyper-beam-plus` | — |
| `eevee` | `take-down` | `take-down-plus` | — |
| `oddish` | `solar-beam` | `solar-beam-plus` | `solar-beam-plus-plus` |
| `poliwag` | `mega-punch` | `mega-punch-plus` | `mega-punch-plus-plus` |
| `abra` | `psywave` | `psywave-plus` | `psywave-plus-plus` |
| `machop` | `seismic-toss` | `seismic-toss-plus` | `seismic-toss-plus-plus` |
| `bellsprout` | `solar-beam` | `solar-beam-plus` | `solar-beam-plus-plus` |
| `geodude` | `mega-punch` | `mega-punch-plus` | `mega-punch-plus-plus` |
| `gastly` | `dream-eater` | `dream-eater-plus` | `dream-eater-plus-plus` |
| `farfetchd` | `cut` | — | — |
| `onix` | `rock-slide` | — | — |
| `mr-mime` | `psybeam` | — | — |
| `scyther` | `slash` | — | — |
| `jynx` | `blizzard` | — | — |
| `electabuzz` | `thunder` | — | — |
| `magmar` | `flamethrower` | — | — |
| `lapras` | `ice-beam` | — | — |
| `aerodactyl` | `rock-slide` | — | — |
| `snorlax` | `double-edge` | — | — |

## Unlocks (§6.8.2) — by Bond rank since 2026-09-21

Since v0.9.1 the whole Mastery is **one unlock, at Deep Bond (rank 3, 300 Bond)**: every tier on every stage, the slot
holding whatever card the Pokémon's stage reaches. (A first cut of v0.9.1 opened Lv1 at rank 1, Lv2 at rank 4, Lv3 at rank 5, and a
Soulbound two-stage line opened every fight with its card in hand.) The species-specific achievements
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
| `poliwag` | Land `mega-punch-plus-plus` on a boss in Phase 3 |

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


**Shipped state (v0.9.1).** Every recruitable line carries its whole Mastery: the 36 Lv2 cards and 9 Lv3 cards the
v0.7.5 pass left for the Bond revamp are written, all on effects the sim already has. Region 1's lines keep the ids
`species-r1.md` planned, re-read for the combat that exists (Final Gambit is a hit that grows when the user is low,
not a self-KO; Bellsprout's two are new ids, Leaf Storm and Giga Impact being its branches' upgrades already). **Eevee** takes one card, Adaptive Burst,
instead of the three per-branch cards once planned: a line carries one Mastery track, and three would need the slot to
read the branch — kept for later if the branches want their own.

**Shipped state (v0.7.5).** Every line a run can recruit — Region 1, 2 and 3's pools, the Elite Wilds, the
starters and the meta-starters, 51 lines — carries its Lv1, and the three default starters carry Lv2 and
Lv3. The rest of Lv2 and Lv3 wait for **v0.9.1** on purpose: they are Bond rewards at rank 4 and 5, and v0.9.1 is
where Bond is revamped — writing ninety cards against a curve about to change would be writing them twice.
Four catalogue effects were added to the sim for them (power-bonus, fixed-damage, self-damage, and multi-hit on a
Mastery card); three were rewritten because their system does not exist — Perish Song (a delayed KO) became Glacial
Song, Last Resort lost its hand condition, and Tri Attack's cycle became three small riders.
