# Trainer catalog — 8 archetypes × 3 regions = 21 rosters

> Implements §2.7 (archetypes, rewards, generation) and §2.7.3 (per-Region eligibility). A Trainer node fields
> **1–2 Pokémon sequentially** (the second enters the moment the first faints, §2.8 reserves 2-phase profiles
> for Elites). Status legend in `README.md`.
>
> **Sequential, not simultaneous.** Multi-enemy (1 lead + supports) is a Region 3 accent (§5.6) and belongs to
> the Elite/Gym layer, not to ordinary trainers.

## 1. Archetype identities (§2.7.1)

| id | Name | Tactical identity | Regions | Sprite (Showdown) |
|---|---|---|---|---|
| `bug-catcher` | Bug Catcher | High volume, low individual threat; Confusion and Sleep riders | R1 | `bugcatcher` |
| `youngster` | Youngster | Generalist, the difficulty floor; one randomised Pokémon | R1, R2 | `youngster` |
| `lass` | Lass | Generalist with a status lean | R1, R2 | `lass` |
| `hiker` | Hiker | Slow, durable, Defence-stacking; punishes a damage race | R1, R2 | `hiker` |
| `swimmer` | Swimmer | Water, status-heavy (Confusion, Burn-shred) | R1 (river), R2 | `swimmer` |
| `engineer` | Engineer | Buff-stall: sets up before striking | R2, R3 | `scientist` |
| `hex-maniac` | Hex Maniac | Vision disruption — generates Unknown intents | R2, R3 | `hexmaniac` |
| `ace-trainer` | Ace Trainer | Two high-stat Pokémon, multi-type | R3 (+ R1 Elite specialist) | `acetrainer` |
| `rocket-grunt` | Rocket Grunt | Aggressive Cleave/Backstrike kits, Poison | R2, R3 | `rocketgrunt` |

> §2.7.1 lists 8; `youngster` and `lass` were one row ("Lass / Youngster") and `sailor`/`swimmer` another. They
> are split here into distinct rosters because they need different species pools — the count is 9 ids, 8 canon
> archetypes; §2.7.1 now lists the same nine.

## 2. Region 1 rosters (levels 6–12, wild band +1) ✅ needed at v0.2

| Archetype | Team | Levels | ₽ | Loot roll |
|---|---|---|---|---|
| `bug-catcher` | `caterpie` + `weedle` | 6, 7 | 50–80 | 50 % common item |
| `bug-catcher-b` | `metapod` + `kakuna` | 9, 9 | 70–100 | 50 % common item |
| `youngster` | `rattata` | 8 | 50–80 | 50 % common item |
| `youngster-b` | `pidgey` + `rattata` | 9, 10 | 80–110 | 50 % + 20 % uncommon |
| `lass` | `oddish` + `pidgey` | 9, 10 | 80–120 | 50 % common |
| `lass-b` | `bellsprout` + `caterpie` | 10, 9 | 80–120 | 50 % common |
| `hiker` | `geodude` + `onix` | 10, 11 | 120–175 | 30 % common relic |
| `hiker-b` | `diglett` + `geodude` | 9, 11 | 110–160 | 30 % common relic |
| `swimmer` | `poliwag` + `magikarp` | 9, 8 | 100–160 | 50 % common |
| `swimmer-b` | `psyduck` + `krabby` | 11, 11 | 130–180 | 20 % uncommon item |

Each archetype has two variants so a Region with 4 trainer nodes never repeats a roster. The generator picks
without replacement (§2.7.3, seeded).

## 3. Region 2 rosters (levels 14–22) 🔒 v0.7

| Archetype | Team | Levels |
|---|---|---|
| `youngster` | `raticate` + `pidgeotto` | 15, 16 |
| `lass` | `gloom` + `jigglypuff*` | 17, 16 |
| `hiker` | `graveler` + `machoke` | 18, 18 |
| `swimmer` | `seel*` + `tentacool*` | 17, 18 |
| `engineer` | `magnemite*` + `voltorb*` | 18, 19 |
| `hex-maniac` | `haunter*` + `drowzee*` | 20, 19 |
| `rocket-grunt` | `koffing*` + `ekans*` | 19, 20 |

`*` = species defined in `species-pool-r2-r3.md`.

## 4. Region 3 rosters (levels 26–34) 🔒 v0.7

| Archetype | Team | Levels |
|---|---|---|
| `ace-trainer` | `pidgeot` + `arcanine*` | 30, 32 |
| `ace-trainer-b` | `alakazam*` + `machamp` | 31, 32 |
| `hex-maniac` | `gengar*` + `hypno*` | 31, 30 |
| `rocket-grunt` | `weezing*` + `arbok*` | 30, 31 |
| `engineer` | `magneton*` + `electrode*` | 31, 30 |
| `hiker` | `golem` + `rhyhorn*` | 32, 31 |

## 5. Rewards (§2.7.2)

| Reward | Value |
|---|---|
| Trainer XP (meta) | 5 per node |
| Poké Dollars | 50–150 R1 · 120–260 R2 · 200–400 R3 (archetype tier scales inside the band) |
| Loot | 50 % common item / 30 % common relic / 20 % uncommon item, seeded |
| Held Item | 20 % chance (§7.4.6), uniform over the 18 generic items |
| TM | 5 % chance |
| Pokédex credit | each defeated Pokémon counts toward its species' kill thresholds (§5.13) |
| In-run XP | `ProgressionConfig.trainerXp` = 45 base × the level band |

## 6. Authoring rules for a new roster

1. **Level band** = the Region's wild band + 1 to + 2. A trainer is a step up from a wild fight, not a boss.
2. **Type coherence**: the archetype's identity must be readable from the team in one glance (Pillar 1 extends
   to the map: the node preview shows the archetype, so the player can counter-pick their Active 3).
3. **No hidden intents** at baseline — Unknown intents belong to Elites and Gyms, or to the Dense Fog
   modifier.
4. **A trainer never fields a fully-evolved Pokémon before the player can reach that stage** (R1 trainers
   top out at stage-1 forms; the Gym ace is the exception and that is the point).
5. Two Pokémon is the default; one Pokémon is reserved for the low-floor archetypes (`youngster`, `lass`) and
   for the first trainer node of Region 1.
