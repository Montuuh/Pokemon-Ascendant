# TM catalog — 15

> Implements §7.5 and §5.4.1. A TM is a Consumable-class item that **never enters the combat pile**: it is
> applied from the Map View, permanently adding its move to a compatible Pokémon's Learned Move Pool (§6.7).
> Single use. The Mastery slot is exempt (§5.13.2).

| TM | id | Move | Type | Pwr | AP | Compatible (R1 pool) | Status |
|---|---|---|---|---|---|---|---|
| 01 | `tm01-mega-punch` | `mega-punch` (new: Melee 80, SF) | Fighting | 80 | 2 | machop, mankey, snorlax, rattata, primeape | 🆕 |
| 02 | `tm02-ice-beam` | `ice-beam` | Ice | 95 | 3 | squirtle line, lapras, poliwag line, psyduck line, vaporeon | 🆕 |
| 03 | `tm03-thunderbolt` | `thunderbolt` | Electric | 95 | 3 | jolteon, eevee, psyduck line, magikarp→gyarados | 🆕 |
| 04 | `tm04-flamethrower` | `flamethrower` | Fire | 90 | 2 | charmander line, flareon, eevee | ✅ v0.3 |
| 05 | `tm05-surf` | `surf` | Water | 70 (cleave) | 2 | every Water-type + snorlax, lapras | ✅ v0.3 |
| 06 | `tm06-psychic` | `psychic` | Psychic | 95 | 3 | psyduck line, butterfree, eevee | 🆕 |
| 07 | `tm07-earthquake` | `earthquake` | Ground | 90 (cleave) | 3 | geodude line, diglett line, onix, marowak, snorlax | ✅ v0.3 |
| 08 | `tm08-solar-beam` | `solar-beam` | Grass | 120 | 4 | bulbasaur line, oddish line, bellsprout line | 🆕 |
| 09 | `tm09-hyper-beam` | `hyper-beam` | Normal | 130 | 4 | snorlax, raticate, pidgeot, golem, gyarados | 🆕 |
| 10 | `tm10-toxic` | `toxic` | Poison | — | 1 | every Poison-type, oddish line, bellsprout line, zubat line | 🆕 |
| 11 | `tm11-body-slam` | `body-slam` | Normal | 75 | 2 | broad: any Normal-type + snorlax, lapras, poliwrath, golem | 🆕 |
| 12 | `tm12-iron-tail` | `iron-tail` | Rock | 80 | 2 | rattata line, pidgey line, onix, gyarados, marowak | 🆕 |
| 13 | `tm13-dragon-rage` | `dragon-rage` | Dragon | fixed 40 | 1 | charizard, gyarados, aerodactyl | 🆕 |
| 14 | `tm14-shadow-bone` | `shadow-bone` | Ghost | 85 | 2 | marowak, marowak-spirit, zubat line | 🆕 |
| 15 | `tm15-foresight` | `foresight` (new: 0 AP, reveal Unknown intents this turn) | Normal | — | 0 | nearly everything (§6.5.3.2) | 🆕 |

**Notes**
- TM13 is Dragon, which has no strong resist in the 15-type chart; fixed 40 damage keeps it a utility filler
  rather than a coverage staple.
- TM12 is typed **Rock**, not Steel, because Steel is not in the 15-type chart (§4.1.2).
- `foresight` is the move version of `keen-eye`: active, per-turn, cheap; the ability is passive and permanent.

**Acquisition** (§7.5): Region Shop special slot and City Shop slot 8 at 250–500 ₽ (curated to the team's
`compatibleSpecies`), a 5 % Trainer-battle drop, and specific Mystery rewards.

> **v0.3 ships three** — the ones whose move already existed — and only one of the three acquisition paths,
> because neither the Shop nor Mystery Events exist yet. With just the Trainer drop, 5 % means most runs never
> meet the system, so v0.3 runs the drop at **35 %** (and the Gym always drops one), curated to the Box. It
> reverts to canon's 5 % when the Shop lands in v0.4. `TM_DROP_CHANCE` in `src/sim/run/region.ts`.
**UI**: incompatible targets are greyed, never hidden (`ui.md`); the teach screen shows a before/after diff.
