# Mastery Move catalog — 24 lines

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
| `caterpie` | `sticky-web` | `dream-eater` | `quiver-dance` |
| `weedle` | `venoshock` | `fell-stinger-v` | `toxic-thread` |
| `pidgey` | `brave-bird` | `brave-bird-plus` | `sky-attack` |
| `rattata` | `super-fang` | `super-fang-plus` | — |
| `oddish` | `spore-cloud` | `aromatherapy-m`(Lv2 variant) | `petal-dance` |
| `bellsprout` | `leaf-tornado` | `leaf-storm-s` | `giga-impact-v` |
| `mankey` | `rage-fist` | `final-gambit` | — |
| `eevee` | `last-resort` | `hydro-vortex` / `gigavolt-havoc` / `inferno-overdrive` (per branch) | — |
| `zubat` | `screech` | `venom-drench` | — |
| `geodude` | `rock-slide-m` | `rock-wrecker` | `tectonic-rage` |
| `diglett` | `tri-attack-d` | `triple-dive` | — |
| `onix` | `dragon-tail` | `double-edge-o` | — |
| `machop` | `revenge` | `counter` | `all-out-pummeling` |
| `aerodactyl` | `iron-head-a` | `supersonic-skystrike` | — |
| `lapras` | `perish-song` | `hydro-vortex` | — |
| `magikarp` | `splash-m` | `dragon-dance` | — |
| `poliwag` | `circle-throw` | `mind-reader` | `focus-punch` |
| `psyduck` | `psyshock` | `shattered-psyche` | — |
| `krabby` | `slam-k` | `crabhammer-max` | — |
| `snorlax` | `belly-drum-s` | `pulverizing-pancake` | — |
| `marowak` | `bonemerang-m` | `bone-rush-max` | — |

## Unlock achievements (§6.8)

**Lv1 — "Familiar Bond"** (universal, any one of): win 3 combats with it in the Active Team · recruit it for
the first time · finish any run with it in the Active Team.

**Lv2 — "Trusted Partner"** (species-specific):

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

**Lv3 — "Deep Bond"** (3-stage lines only, hard):

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
