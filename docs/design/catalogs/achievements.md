# Achievement catalog — 50

> Implements §8.7 / §8.7.1.1. Medal tier sets the reward: 🥉 50–100 XP · 🥈 150–250 XP ·
> 🥇 250–400 XP **+2 Tokens** · 💎 400–500 XP **+5 Tokens**. (H) = hidden until completed (~20 %).
> ★ carries a meta-starter's thematic flavour. ◆ needs deferred League content.
>
> **This file adds the one column the canon table lacks: the trigger event.** An achievement without a named
> event is not implementable, and the Unity project shipped 19 of 50 for exactly that reason. Trigger names are
> the sim/run events a listener subscribes to.

| # | Category | Achievement | Description | Tier | Trigger event |
|---|---|---|---|---|---|
| 1 | First Steps | First Blood | Win your first combat | 🥉 | `combat-end(victory)` |
| 2 | First Steps | Gotcha! | Recruit your first Pokémon | 🥉 | `recruit` |
| 3 | First Steps | Growing Up | Trigger your first evolution | 🥉 | `evolution` |
| 4 | First Steps | Badge Collector | Earn your first Badge | 🥉 | `badge-awarded` |
| 5 | First Steps | The Long Road ★ | Complete your first run (reach Region 2) | 🥈 | `run-end(region>=2)` |
| 6 | Recruitment | Welcome Wagon | Recruit 10 different species (lifetime) | 🥉 | `recruit` + dex counter |
| 7 | Recruitment | Full House (H) | Recruit while the Box is full | 🥈 | `recruit(boxFull)` |
| 8 | Recruitment | Pokédex Apprentice | Recruit 25 different species | 🥈 | dex counter |
| 9 | Recruitment | Catch of the Day | Catch a Rare-tier wild | 🥈 | `catch(rarity=rare)` |
| 10 | Recruitment | Gotta Catch 'Em | Recruit 50 different species | 🥇 | dex counter |
| 11 | Recruitment | Wild at Heart | Win a run with an all-wild-recruited Active Team | 🥇 | `run-end(win)` + team origin |
| 12 | Evolution | Metamorphosis | 10 evolutions (lifetime) | 🥉 | `evolution` counter |
| 13 | Evolution | Branch Out | Evolve into all 3 archetypes of one species (across runs) | 🥈 | `evolution(archetype)` set |
| 14 | Evolution | Many Faces ★ | Win a run and recruit 4 different evolutions across runs | 🥇 | `run-end(win)` + dex |
| 15 | Evolution | Full Bloom | Field an all-final-stage Active Team in one combat | 🥈 | `combat-start` team check |
| 16 | Evolution | Late Bloomer (H) | Evolve on the final layer before a Gym | 🥉 | `evolution(layer=preGym)` |
| 17 | Evolution | Two-Stage Climb | Take one Pokémon through both evolutions in a run | 🥈 | `evolution` per-instance counter |
| 18 | Mastery | Acquaintance | Familiar tier with 5 species | 🥉 | `dex-tier-up(familiar)` |
| 19 | Mastery | Veteran Trainer | Veteran tier with 10 species | 🥈 | `dex-tier-up(veteran)` |
| 20 | Mastery | Specialist | Master one species | 🥇 | `dex-tier-up(master)` |
| 21 | Mastery | Living Pokédex | Master 10 species | 💎 | `dex-tier-up(master)` counter |
| 22 | Mastery | Shiny Hunter (H) | Recruit a Shiny | 🥇 | `recruit(shiny)` |
| 23 | Mastery | Move Master | Use a Mastery Move in combat | 🥈 | `card-played(mastery)` |
| 24 | Combat | Untouchable | Win a combat taking no damage | 🥈 | `combat-end` + damage tally |
| 25 | Combat | Sharpshooter | Win a combat using only Ranged moves | 🥈 | `combat-end` + card log |
| 26 | Combat | One-Mon Army | Win a combat using only one Pokémon's cards | 🥇 | `combat-end` + card log |
| 27 | Combat | Swap Maestro | Win a combat with 5+ manual swaps | 🥈 | `combat-end` + swap tally |
| 28 | Combat | Status Surgeon (H) | Inflict 4 different statuses in one combat | 🥇 | `status-applied` set |
| 29 | Combat | Overkill (H) | Land a hit for ≥3× the target's remaining HP | 🥉 | `damage-dealt` |
| 30 | Combat | Comeback Kid (H) | Win a combat down to your last standing Pokémon | 🥈 | `combat-end` + team state |
| 31 | Boss | Gym Sweep | Defeat all 3 Gym Leaders in one run | 🥇 | `badge-awarded` ×3 |
| 32 | Boss | Flawless Gym | Beat a Gym Leader with no faints | 🥇 | `combat-end(gym)` + faints |
| 33 | Boss | City Conqueror | Win the optional City Gym (4th Badge) | 🥇 | `badge-awarded(city)` |
| 34 | Boss | Champion ◆ | Defeat the Champion | 💎 | `run-end(win)` |
| 35 | Boss | Underdog ★◆ | Beat the Champion with no fully-evolved Pokémon | 💎 | `run-end(win)` + team |
| 36 | Boss | Speedrunner ◆ | Beat the Champion in under 90 minutes | 💎 | `run-end(win)` + timer |
| 37 | Boss | Type Tactician (H) | Beat a Gym using only super-effective damage | 🥈 | `damage-dealt` log |
| 38 | Build Identity | Monotype Master | Win a run with an all-one-type Active Team | 🥇 | `run-end(win)` + team |
| 39 | Build Identity | Pure Form | Win a run with no evolution | 💎 | `run-end(win)` + evo tally |
| 40 | Build Identity | Solo Trainer | Win a run using only the starter's line | 💎 | `run-end(win)` + card log |
| 41 | Build Identity | Pacifist's Path (H) | Win a run catching 0 wild Pokémon | 🥇 | `run-end(win)` + catch tally |
| 42 | Build Identity | Relic Hoarder | Hold 8+ relics at once | 🥈 | `relic-acquired` |
| 43 | Build Identity | Minimalist | Win a run holding ≤2 relics | 🥇 | `run-end(win)` |
| 44 | Build Identity | Glass Cannon (H) | Win a Gym fight with a Trauma-stacked Lead | 🥈 | `combat-end(gym)` + trauma |
| 45 | Endurance | Back-to-Back | Win 2 runs in a row | 🥈 | `run-end` streak |
| 46 | Endurance | Win Streak | Win 5 runs in a row | 💎 | `run-end` streak |
| 47 | Endurance | Iron Trainer | Clear Region 3 with no Pokémon Center healing | 🥇 | `region-end` + heal tally |
| 48 | Endurance | No Rest (H) | Win a run visiting 0 Pokémon Centers | 💎 | `run-end(win)` + node log |
| 49 | Endurance | Modifier Master | Win a run with 2 difficulty modifiers active | 🥇 | `run-end(win)` |
| 50 | Endurance | Ascendant | Win a run on the highest available difficulty | 💎 | `run-end(win)` |

**Totals** — First Steps 5 · Recruitment 6 · Evolution 6 · Mastery 6 · Combat 7 · Boss 7 · Build Identity 7 ·
Endurance 6. Hidden: 10 (20 %). Token-granting (🥇/💎): 20 achievements → up to 64 Tokens, which with the ~44
from the Battle Pass track comfortably funds the 50 Tokens the Tier-3 Mastery lane needs (§8.3.5).

## Required run-tally surface

The triggers above need the run to keep these counters, which is the actual implementation cost:

`damageTakenThisCombat` · `cardsPlayedThisCombat[{owner, range, type, isMastery}]` · `manualSwapsThisCombat` ·
`statusesAppliedThisCombat[]` · `faintsThisCombat` / `ThisRun` · `catchesThisRun` · `centersVisitedThisRun` ·
`healsThisRegion` · `relicsHeld` · `evolutionsThisRun[{instance, archetype}]` · `runTimerMs` · `winStreak`.

All of them are cheap and all of them are also useful for the run-summary screen (§3.8), so they are worth
building once at v0.5 rather than retrofitting per achievement.
