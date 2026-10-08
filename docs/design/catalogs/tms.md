# TM catalog — 15

> Implements §7.5 and §5.4.1. A TM is a Consumable-class item that **never enters the combat pile**: it is
> applied from the Map View, permanently adding its move to a compatible Pokémon's Learned Move Pool (§6.7).
> Single use. The Mastery slot is exempt (§5.13.2).

| TM | id | Move | Type | Pwr | AP | Compatible (R1 pool) | Status |
|---|---|---|---|---|---|---|---|
| 01 | `tm01-mega-punch` | `mega-punch` | Normal | 75 | 2 | machop, mankey, snorlax, rattata, primeape | 🆕 |
| 02 | `tm02-ice-beam` | `ice-beam` | Ice | 95 | 3 | squirtle line, lapras, poliwag line, psyduck line, vaporeon | 🆕 |
| 03 | `tm03-thunderbolt` | `thunderbolt` | Electric | 95 | 3 | jolteon, eevee, psyduck line, magikarp→gyarados | 🆕 |
| 04 | `tm04-flamethrower` | `flamethrower` | Fire | 95 | 3 | charmander line, flareon, eevee | ✅ v0.3 |
| 05 | `tm05-surf` | `surf` | Water | 70 (cleave) | 2 | every Water-type + snorlax, lapras | ✅ v0.3 |
| 06 | `tm06-psychic` | `psychic` | Psychic | 95 | 3 | psyduck line, butterfree, eevee | 🆕 |
| 07 | `tm07-earthquake` | `earthquake` | Ground | 90 (cleave) | 3 | geodude line, diglett line, onix, marowak, snorlax | ✅ v0.3 |
| 08 | `tm08-solar-beam` | `solar-beam` | Grass | 120 | 4 | bulbasaur line, oddish line, bellsprout line | 🆕 |
| 09 | `tm09-hyper-beam` | `hyper-beam` | Normal | 130 | 4 | snorlax, raticate, pidgeot, golem, gyarados | 🆕 |
| 10 | `tm10-toxic` | `toxic` | Poison | — | 1 | every Poison-type, oddish line, bellsprout line, zubat line | 🆕 |
| 11 | `tm11-body-slam` | `body-slam` | Normal | 85 | 3 | broad: any Normal-type + snorlax, lapras, poliwrath, golem | 🆕 |
| 12 | `tm12-rock-slide` | `rock-slide` | Rock | 75 | 2 | geodude line, onix, rhyhorn line, kabuto line, omanyte line, aerodactyl | 🆕 |
| 13 | `tm13-dragon-rage` | `dragon-rage` | Dragon | 50 | 1 | charizard, gyarados, aerodactyl | 🆕 |
| 14 | `tm14-dig` | `dig` | Ground | 75 | 2 | sandshrew line, diglett line, cubone line, nidoran lines, eevee | 🆕 |
| 15 | `tm15-swift` | `swift` | Normal | 55 | 1 | nearly everything: the Ranged card a Melee kit is missing (§6.3.6.5) | 🆕 |

**Notes**
- Every TM is a Gen I move since v0.9.5 (`moves.md`), as Gen I's own TMs were. Iron Tail, Shadow Bone and Foresight
  left with the rest of the moves Gen I never had; Rock Slide, Dig and Swift took their numbers. (Foresight's idea — the
  move version of `keen-eye`, revealing intents for a turn — waits for a card that can carry it.)
- TM13 is Dragon, which has no strong resist in the 15-type chart; at 1 AP it is a utility filler, not a staple.

**Acquisition** (§7.5): Region Shop special slot and City Shop slot 8 at 250–500 ₽ (curated to the team's
`compatibleSpecies`), a 5 % Trainer-battle drop, and specific Mystery rewards.

> **v0.3 ships three** — the ones whose move already existed — and only one of the three acquisition paths,
> because neither the Shop nor Mystery Events exist yet. With just the Trainer drop, 5 % means most runs never
> meet the system, so v0.3 runs the drop at **35 %** (and the Gym always drops one), curated to the Box. It
> reverts to canon's 5 % when the Shop lands in v0.4. `TM_DROP_CHANCE` in `src/sim/run/region.ts`.
**UI**: incompatible targets are greyed, never hidden (`ui.md`); the teach screen shows a before/after diff.
