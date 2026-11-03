# Move catalog

> Implements §3.6 (taxonomy), §4.1.1 (power and range), §6.3.6 (kit rules), §4.2 (status riders). Columns map 1:1 to
> `MoveDef` (`src/sim/content/defs.ts`); every table below is generated from `moves.json`, so it is the build.
>
> **Every move is a Gen I move (v0.9.5, the user's call, 2026-10-08).** Its name is the Gen I name; its type is the
> modern one where the game has that type — Gust is Flying, Karate Chop Fighting, Sand Attack Ground, Bite Dark (since
> v0.9.84, when the type joined) — **and the only moves that are not Gen I's are the 14 of the two types Gen I lacked,
> Dark and Steel (§1b), and since v0.9.89 the Gen II–IV moves the keywords need (§1c, §3.11).** A **+** is that move made better, the card an evolution upgrades into when its type has
> no stronger Gen I move to climb to (Lick → Lick+); a Mastery tier is the line's Lv1 move's **+** and **++**
> (§6.8.4). A content test holds every row to the 165 moves of Generation I (`gen1-moves.json`). The enemy-only
> `call-for-help` and `cover` are actions, not moves anyone learns.
>
> **Reading the columns.** `Role` Off/Def/Util (Def drives the §3.3.1 defensive-swap discount). `Rng` Melee
> (Lead-only unless Step-Forward) / Ranged (any slot, ×0.75). `Mod` SF/SB (Melee only). `Tgt` cleave (every
> slot, never fizzles) / backstrike (a declared bench slot, fizzles if empty). `cd` an enemy-side cooldown (§5.3).
>
> **Power budget — a contract, enforced by a content test (§6.3.6.4).**
>
> | AP | Melee power | Ranged power | Notes |
> |---|---|---|---|
> | 0 | — | — | utility only |
> | 1 | 40–50 | 45–55 | the workhorse |
> | 2 | 60–75 | 65–90 | a rider or a modifier costs ~10 power |
> | 3 | 85–100 | 90–100 | |
> | 3 + Recharge | 130–170 | 130–170 | the ultimate (§3.11.8); Explosion's 170 also takes its recoil |
> | 3 + Fatigue | 110–120 | 110–120 | the series' inaccurate nukes |
> | 3 + a self drop | 110–130 | 110–130 | Overheat, Close Combat |
>
> No card is printed above 3 AP (§3.7): until v0.9.89 the 4-AP ultimates could only be played on a relic's or an Ether's AP.
>
> A move with both a modifier and a rider sits at the foot of its band; Gen I's high-critical moves (Karate Chop,
> Razor Leaf, Crabhammer, Slash) crit every time and pay for it there. Cleave (×~1.6), recoil, a rampage's
> self-Confusion and its free returns, a charge's turn of warning and a sacrifice are budgeted apart; Mastery tiers have their own bands (`mastery-moves.md`).
>
> **Accuracy is a rider.** The sim never misses, so a Gen I status move's accuracy is its chance: Sing and
> Supersonic 55 %, Hypnosis 60 %, the powders and Glare 75 %, Toxic 85 %, Thunder Wave and Confuse Ray certain.
> Sand Attack, Smokescreen, Kinesis and Flash, which lowered accuracy, lower Attack.

## 0. What is in the build

| Set | Moves |
|---|---|
| Gen I moves | 161 of the 165 |
| Later moves, Dark and Steel (§1b) | 14 |
| Made better (+) | 70 |
| Mastery tiers (+, ++) | 39 |
| Enemy actions | 2 |
| **Total in `moves.json`** | **286** |

Not in the game: the Gen I moves no rule here can express — Whirlwind and Roar's escape, Bide, Counter's exact
return, Mimic, Metronome's lottery, Mirror Move's copy, Substitute, Conversion's retype, Teleport, Struggle — keep
their names on simpler cards where one fits the line (Metronome draws two, Mirror Move raises Attack and draws,
Conversion raises both stats, Whirlwind and Teleport draw), and the rest are absent.

## 1. Gen I moves

### Normal

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `pound` | Pound | Normal | Off | Melee | — | 1 | 40 | — | — |
| `double-slap` | Double Slap | Normal | Off | Melee | — | 1 | 45 | — | 3 hits |
| `comet-punch` | Comet Punch | Normal | Off | Melee | — | 1 | 45 | — | 3 hits |
| `mega-punch` | Mega Punch | Normal | Off | Melee | — | 2 | 75 | — | — |
| `pay-day` | Pay Day | Normal | Off | Ranged | — | 1 | 50 | — | — |
| `scratch` | Scratch | Normal | Off | Melee | — | 1 | 40 | — | — |
| `vice-grip` | Vice Grip | Normal | Off | Melee | — | 1 | 50 | — | — |
| `guillotine` | Guillotine | Normal | Off | Melee | — | 3 | 130 | — | Recharge · ignores Def stages |
| `razor-wind` | Razor Wind | Normal | Off | Ranged | — | 3 | 95 | backstrike | — |
| `swords-dance` | Swords Dance | Normal | Util | Melee | — | 1 | — | — | self Atk +2 |
| `cut` | Cut | Normal | Off | Melee | — | 1 | 50 | — | — |
| `whirlwind` | Whirlwind | Normal | Util | Ranged | — | 1 | — | CD 2 | drag the foe's Lead out (§5.2.3); on a foe, its raises blown away (v0.9.92) |
| `bind` | Bind | Normal | Off | Melee | — | 1 | 40 | — | foe Def −1 |
| `slam` | Slam | Normal | Off | Melee | — | 2 | 75 | — | — |
| `stomp` | Stomp | Normal | Off | Melee | — | 2 | 70 | — | — |
| `mega-kick` | Mega Kick | Normal | Off | Melee | — | 3 | 120 | — | Fatigue 1 |
| `headbutt` | Headbutt | Normal | Off | Melee | — | 2 | 70 | — | — |
| `horn-attack` | Horn Attack | Normal | Off | Melee | — | 2 | 65 | — | — |
| `fury-attack` | Fury Attack | Normal | Off | Melee | — | 1 | 45 | — | 3 hits |
| `horn-drill` | Horn Drill | Normal | Off | Melee | — | 3 | 130 | — | Recharge · ignores Def stages |
| `tackle` | Tackle | Normal | Off | Melee | — | 1 | 40 | — | — |
| `body-slam` | Body Slam | Normal | Off | Melee | — | 3 | 85 | — | Paralysis 30 % |
| `wrap` | Wrap | Normal | Off | Melee | — | 1 | 40 | — | foe Def −1 |
| `take-down` | Take Down | Normal | Off | Melee | — | 2 | 75 | — | recoil 25 % |
| `thrash` | Thrash | Normal | Off | Melee | — | 2 | 60 | — | Rampage 2 |
| `double-edge` | Double-Edge | Normal | Off | Melee | — | 3 | 120 | — | recoil 33 % |
| `tail-whip` | Tail Whip | Normal | Util | Ranged | — | 0 | — | — | every foe Def −1 (v0.9.92) |
| `leer` | Leer | Normal | Util | Ranged | — | 0 | — | — | every foe Def −1 (v0.9.92) |
| `bite` | Bite | Dark | Off | Melee | — | 1 | 50 | — | — |
| `growl` | Growl | Normal | Util | Ranged | — | 0 | — | — | every foe Atk −1 (v0.9.92) |
| `roar` | Roar | Normal | Util | Ranged | — | 1 | — | CD 2 | drag the foe's Lead out (§5.2.3); on a foe, its raises blown away (v0.9.92) |
| `sing` | Sing | Normal | Util | Ranged | — | 1 | — | — | Sleep 55 % |
| `supersonic` | Supersonic | Normal | Util | Ranged | — | 1 | — | — | Confusion 55 % |
| `sonic-boom` | Sonic Boom | Normal | Off | Ranged | — | 1 | 50 | — | — |
| `disable` | Disable | Normal | Util | Ranged | — | 1 | — | — | Disable 2: the foe's strongest card, or the move a foe declared (§5.2.3, v0.9.92) |
| `hyper-beam` | Hyper Beam | Normal | Off | Ranged | — | 3 | 150 | — | Recharge |
| `substitute` | Substitute | Normal | Def | Ranged | — | 1 | — | — | Substitute 25 % |
| `strength` | Strength | Normal | Off | Melee | — | 2 | 75 | — | — |
| `growth` | Growth | Normal | Util | Melee | — | 0 | — | — | self Atk +1 |
| `quick-attack` | Quick Attack | Normal | Off | Melee | SF | 1 | 40 | — | — |
| `rage` | Rage | Normal | Off | Melee | — | 1 | 40 | — | self Atk +1 |
| `screech` | Screech | Normal | Util | Ranged | — | 1 | — | — | foe Def −2 |
| `double-team` | Double Team | Normal | Def | Melee | — | 0 | — | — | self Def +1 |
| `recover` | Recover | Normal | Def | Melee | — | 1 | — | — | heal 50 % · PP 1 |
| `harden` | Harden | Normal | Def | Melee | — | 1 | — | — | Guard 50 · self Def +1 |
| `minimize` | Minimize | Normal | Def | Melee | — | 1 | — | — | self Def +2 |
| `smokescreen` | Smokescreen | Normal | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `defense-curl` | Defense Curl | Normal | Def | Melee | — | 1 | — | — | Guard 40 · self Def +1 |
| `focus-energy` | Focus Energy | Normal | Util | Melee | — | 0 | — | — | self Atk +1 |
| `metronome` | Metronome | Normal | Util | Melee | — | 1 | — | — | draw 2 |
| `self-destruct` | Self-Destruct | Normal | Off | Melee | — | 3 | 130 | — | recoil 50 % |
| `egg-bomb` | Egg Bomb | Normal | Off | Ranged | — | 3 | 95 | — | — |
| `swift` | Swift | Normal | Off | Ranged | — | 1 | 55 | — | — |
| `skull-bash` | Skull Bash | Normal | Off | Melee | — | 2 | 85 | — | Charge · self Def +1 |
| `spike-cannon` | Spike Cannon | Normal | Off | Ranged | — | 1 | 50 | — | 3 hits |
| `constrict` | Constrict | Normal | Off | Melee | — | 1 | 40 | — | foe Spd −1 |
| `soft-boiled` | Soft-Boiled | Normal | Def | Melee | — | 1 | — | — | heal 50 % · PP 1 |
| `glare` | Glare | Normal | Util | Ranged | — | 1 | — | — | Paralysis 75 % |
| `barrage` | Barrage | Normal | Off | Ranged | — | 1 | 50 | — | 3 hits |
| `lovely-kiss` | Lovely Kiss | Normal | Util | Ranged | — | 1 | — | — | Sleep 75 % |
| `transform` | Transform | Normal | Def | Melee | — | 1 | — | — | self Atk +1 · self Def +1 |
| `dizzy-punch` | Dizzy Punch | Normal | Off | Melee | — | 2 | 65 | — | Confusion 20 % |
| `flash` | Flash | Normal | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `splash` | Splash | Normal | Util | Melee | — | 0 | — | — | draw 1 |
| `explosion` | Explosion | Normal | Off | Melee | — | 3 | 170 | — | recoil 75 % · Recharge |
| `fury-swipes` | Fury Swipes | Normal | Off | Melee | — | 1 | 45 | — | 3 hits |
| `hyper-fang` | Hyper Fang | Normal | Off | Melee | — | 2 | 75 | — | — |
| `sharpen` | Sharpen | Normal | Util | Melee | — | 0 | — | — | self Atk +1 |
| `conversion` | Conversion | Normal | Def | Melee | — | 1 | — | — | self Atk +1 · self Def +1 |
| `tri-attack` | Tri Attack | Normal | Off | Ranged | — | 3 | 90 | — | Burn 7 % · Paralysis 7 % · Freeze 7 % |
| `super-fang` | Super Fang | Normal | Off | Melee | — | 2 | — | — | 50 % of current HP |
| `slash` | Slash | Normal | Off | Melee | — | 2 | 60 | — | always crit |

### Fighting

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `karate-chop` | Karate Chop | Fighting | Off | Melee | — | 1 | 40 | — | always crit |
| `double-kick` | Double Kick | Fighting | Off | Melee | — | 1 | 50 | — | 2 hits |
| `jump-kick` | Jump Kick | Fighting | Off | Melee | SF | 2 | 65 | — | recoil 20 % |
| `rolling-kick` | Rolling Kick | Fighting | Off | Melee | SB | 2 | 65 | — | — |
| `submission` | Submission | Fighting | Off | Melee | — | 3 | 90 | — | recoil 25 % |
| `low-kick` | Low Kick | Fighting | Off | Melee | — | 1 | 50 | — | — |
| `counter` | Counter | Fighting | Def | Ranged | — | 1 | — | — | Counter Melee ×1.5 · PP 2 |
| `seismic-toss` | Seismic Toss | Fighting | Off | Melee | — | 2 | 70 | — | — |
| `high-jump-kick` | High Jump Kick | Fighting | Off | Melee | SF | 3 | 100 | — | recoil 25 % |

### Fire

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `fire-punch` | Fire Punch | Fire | Off | Melee | — | 2 | 70 | — | Burn 10 % |
| `ember` | Ember | Fire | Off | Ranged | — | 1 | 45 | — | Burn 10 % |
| `flamethrower` | Flamethrower | Fire | Off | Ranged | — | 3 | 95 | — | Burn 10 % |
| `fire-spin` | Fire Spin | Fire | Off | Ranged | — | 2 | 65 | — | Burn 30 % |
| `fire-blast` | Fire Blast | Fire | Off | Ranged | — | 3 | 120 | — | Burn 30 % · Fatigue 1 |

### Ice

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `ice-punch` | Ice Punch | Ice | Off | Melee | — | 2 | 70 | — | Freeze 10 % |
| `mist` | Mist | Ice | Def | Ranged | — | 1 | — | — | Mist 3 turns |
| `ice-beam` | Ice Beam | Ice | Off | Ranged | — | 3 | 95 | — | Freeze 10 % |
| `blizzard` | Blizzard | Ice | Off | Ranged | — | 3 | 120 | — | Freeze 10 % · −1 AP in Hail · Fatigue 1 |
| `aurora-beam` | Aurora Beam | Ice | Off | Ranged | — | 2 | 65 | — | foe Atk −1 |
| `haze` | Haze | Ice | Util | Ranged | — | 1 | — | — | every stat change on the field washed away (§5.2.3, v0.9.92) |

### Electric

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `thunder-punch` | Thunder Punch | Electric | Off | Melee | — | 2 | 70 | — | Paralysis 10 % |
| `thunder-shock` | Thunder Shock | Electric | Off | Ranged | — | 1 | 45 | — | Paralysis 10 % |
| `thunderbolt` | Thunderbolt | Electric | Off | Ranged | — | 3 | 95 | — | Paralysis 10 % |
| `thunder-wave` | Thunder Wave | Electric | Util | Ranged | — | 1 | — | — | Paralysis |
| `thunder` | Thunder | Electric | Off | Ranged | — | 3 | 120 | — | Paralysis 10 % · −1 AP in Rain · +1 AP in Sun · Fatigue 1 |

### Flying

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `gust` | Gust | Flying | Off | Ranged | — | 1 | 45 | — | — |
| `wing-attack` | Wing Attack | Flying | Off | Melee | — | 2 | 65 | — | — |
| `fly` | Fly | Flying | Off | Melee | SF | 2 | 75 | — | Charge, out of reach |
| `peck` | Peck | Flying | Off | Melee | — | 1 | 45 | — | — |
| `drill-peck` | Drill Peck | Flying | Off | Melee | — | 2 | 75 | — | — |
| `mirror-move` | Mirror Move | Flying | Util | Melee | — | 1 | — | — | self Atk +1 · draw 1 |
| `sky-attack` | Sky Attack | Flying | Off | Melee | SF | 2 | 80 | — | Charge · always crit |

### Grass

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `vine-whip` | Vine Whip | Grass | Off | Ranged | — | 1 | 45 | — | — |
| `absorb` | Absorb | Grass | Off | Ranged | — | 1 | 45 | — | drain 50 % |
| `mega-drain` | Mega Drain | Grass | Off | Ranged | — | 2 | 70 | — | drain 50 % |
| `leech-seed` | Leech Seed | Grass | Util | Ranged | — | 1 | — | — | seed: ⅛ a turn to the other side's Lead, until it leaves; not a Grass-type (§5.2.3, v0.9.92) |
| `razor-leaf` | Razor Leaf | Grass | Off | Ranged | — | 2 | 65 | — | always crit |
| `solar-beam` | Solar Beam | Grass | Off | Ranged | — | 2 | 100 | — | Charge (none in Sun) · ×0.5 in Rain |
| `stun-spore` | Stun Spore | Grass | Util | Ranged | — | 1 | — | — | Paralysis 75 % |
| `sleep-powder` | Sleep Powder | Grass | Util | Ranged | — | 1 | — | — | Sleep 75 % |
| `petal-dance` | Petal Dance | Grass | Off | Melee | SF | 2 | 60 | — | Rampage 2 |
| `spore` | Spore | Grass | Util | Ranged | — | 2 | — | — | Sleep |

### Ground

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `sand-attack` | Sand Attack | Ground | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `earthquake` | Earthquake | Ground | Off | Melee | — | 3 | 90 | cleave cd 1 | — |
| `fissure` | Fissure | Ground | Off | Melee | — | 3 | 130 | — | Recharge · ignores Def stages |
| `dig` | Dig | Ground | Off | Melee | SB | 2 | 75 | — | Charge, out of reach |
| `bone-club` | Bone Club | Ground | Off | Melee | — | 2 | 65 | — | — |
| `bonemerang` | Bonemerang | Ground | Off | Ranged | — | 2 | 70 | — | 2 hits |

### Poison

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `poison-sting` | Poison Sting | Poison | Off | Ranged | — | 1 | 45 | — | Poison 30 % |
| `acid` | Acid | Poison | Off | Ranged | — | 1 | 45 | — | foe Def −1 |
| `poison-powder` | Poison Powder | Poison | Util | Ranged | — | 1 | — | — | Poison 75 % |
| `toxic` | Toxic | Poison | Util | Ranged | — | 1 | — | — | Poison 85 % (escalating) |
| `smog` | Smog | Poison | Off | Ranged | — | 1 | 45 | — | Poison 40 % |
| `sludge` | Sludge | Poison | Off | Ranged | — | 2 | 70 | — | Poison 30 % |
| `poison-gas` | Poison Gas | Poison | Util | Ranged | — | 1 | — | — | Poison 55 % |
| `acid-armor` | Acid Armor | Poison | Def | Melee | — | 1 | — | — | self Def +3 |

### Bug

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `twineedle` | Twineedle | Bug | Off | Ranged | — | 2 | 70 | — | 2 hits · Poison 20 % |
| `pin-missile` | Pin Missile | Bug | Off | Ranged | — | 2 | 75 | — | 3 hits |
| `string-shot` | String Shot | Bug | Util | Ranged | — | 0 | — | — | foe Spd −1 |
| `leech-life` | Leech Life | Bug | Off | Melee | — | 1 | 45 | — | drain 50 % |

### Water

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `water-gun` | Water Gun | Water | Off | Ranged | — | 1 | 45 | — | — |
| `hydro-pump` | Hydro Pump | Water | Off | Ranged | — | 3 | 120 | — | Fatigue 1 |
| `surf` | Surf | Water | Off | Ranged | — | 2 | 70 | cleave | — |
| `bubble-beam` | Bubble Beam | Water | Off | Ranged | — | 2 | 65 | — | foe Spd −1 |
| `withdraw` | Withdraw | Water | Def | Melee | — | 1 | — | — | Guard 60 · self Def +1 |
| `waterfall` | Waterfall | Water | Off | Melee | — | 2 | 75 | — | — |
| `clamp` | Clamp | Water | Off | Melee | — | 1 | 45 | — | foe Def −1 |
| `bubble` | Bubble | Water | Off | Ranged | — | 1 | 45 | — | foe Atk −1 |
| `crabhammer` | Crabhammer | Water | Off | Melee | — | 3 | 85 | — | always crit |

### Psychic

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `psybeam` | Psybeam | Psychic | Off | Ranged | — | 2 | 70 | — | Confusion 10 % |
| `confusion` | Confusion | Psychic | Off | Ranged | — | 1 | 50 | — | Confusion 10 % |
| `psychic` | Psychic | Psychic | Off | Ranged | — | 3 | 95 | — | — |
| `hypnosis` | Hypnosis | Psychic | Util | Ranged | — | 1 | — | — | Sleep 60 % |
| `meditate` | Meditate | Psychic | Util | Melee | — | 0 | — | — | self Atk +1 |
| `agility` | Agility | Psychic | Util | Melee | — | 0 | — | — | self Spd +2 · draw 1 |
| `teleport` | Teleport | Psychic | Util | Melee | — | 0 | — | — | draw 1 |
| `barrier` | Barrier | Psychic | Def | Melee | — | 1 | — | — | self Def +2 |
| `light-screen` | Light Screen | Psychic | Def | Ranged | — | 1 | — | — | Light Screen 3 turns |
| `reflect` | Reflect | Psychic | Def | Ranged | — | 1 | — | — | Reflect 3 turns |
| `amnesia` | Amnesia | Psychic | Def | Melee | — | 1 | — | — | self Def +2 |
| `kinesis` | Kinesis | Psychic | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `dream-eater` | Dream Eater | Psychic | Off | Ranged | — | 2 | 45 | — | drain 50 % · ×2.2 on a sleeper (§5.5.2, v0.9.92) |
| `psywave` | Psywave | Psychic | Off | Ranged | — | 1 | 50 | — | — |
| `rest` | Rest | Psychic | Def | Melee | — | 1 | — | — | heal 100 % · self Sleep · PP 1 |

### Dragon

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `dragon-rage` | Dragon Rage | Dragon | Off | Ranged | — | 1 | 50 | — | — |

### Rock

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `rock-throw` | Rock Throw | Rock | Off | Ranged | — | 1 | 50 | — | — |
| `rock-slide` | Rock Slide | Rock | Off | Ranged | — | 2 | 75 | — | — |

### Ghost

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `night-shade` | Night Shade | Ghost | Off | Ranged | — | 2 | 70 | — | — |
| `confuse-ray` | Confuse Ray | Ghost | Util | Ranged | — | 1 | — | — | Confusion |
| `lick` | Lick | Ghost | Off | Melee | — | 1 | 40 | — | Paralysis 30 % |

## 1b. Later moves — Dark and Steel (v0.9.84)

Generation I has neither type, so these 14 are the game's only moves of a later generation (the user's call, 2026-10-29): the
Gen II–IV moves the series gave them, cut into the AP bands (§6.3.6.4), their riders kept as deterministic stages. Reference
data for the content test: `src/content/data/later-moves.json`. A new row here needs one there, and an illustration
(`docs/art/prompts/move-art.json`).

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `pursuit` | Pursuit | Dark | Off | Melee | — | 1 | 40 | — | foe Spd −1 |
| `feint-attack` | Feint Attack | Dark | Off | Melee | SB | 2 | 60 | — | — |
| `crunch` | Crunch | Dark | Off | Melee | — | 3 | 85 | — | foe Def −1 |
| `snarl` | Snarl | Dark | Off | Ranged | — | 1 | 45 | — | foe Atk −1 |
| `dark-pulse` | Dark Pulse | Dark | Off | Ranged | — | 2 | 80 | — | — |
| `night-slash` | Night Slash | Dark | Off | Melee | — | 2 | 60 | — | always crit |
| `metal-claw` | Metal Claw | Steel | Off | Melee | — | 1 | 40 | — | self Atk +1 |
| `bullet-punch` | Bullet Punch | Steel | Off | Melee | SF | 1 | 40 | — | — |
| `magnet-bomb` | Magnet Bomb | Steel | Off | Ranged | — | 1 | 50 | — | — |
| `steel-wing` | Steel Wing | Steel | Off | Melee | — | 2 | 65 | — | self Def +1 |
| `iron-head` | Iron Head | Steel | Off | Melee | — | 2 | 75 | — | — |
| `flash-cannon` | Flash Cannon | Steel | Off | Ranged | — | 2 | 70 | — | foe Def −1 |
| `iron-tail` | Iron Tail | Steel | Off | Melee | — | 3 | 85 | — | foe Def −1 |
| `meteor-mash` | Meteor Mash | Steel | Off | Melee | — | 3 | 85 | — | self Atk +1 |

*Who learns them besides the four new evolutions:* Persian tutors `feint-attack`; Raticate learns `crunch` (and Gyarados and Arbok
tutor it; Raticate's Vanguard path turns `bite` into it); Raticate tutors `pursuit`; Dragonite and Aerodactyl tutor `steel-wing`;
Rhydon and Golem `iron-head`; Marowak and Raichu `iron-tail`; Charizard `metal-claw`. Rattata, whose Bite is Dark now, learns Hyper
Fang at L10 so it keeps a Normal attack worth playing (§6.3.6).

*Notes:* `pursuit` slows the foe (the chase, made a Speed stage that moves its critical rhythm, §4.1.3.1); `feint-attack` is a hit
and a retreat (SB); `bullet-punch` is the Steel hit that arrives first (SF); `night-slash` is Slash in Dark, crit every time;
`metal-claw` and `meteor-mash` raise Attack, `steel-wing` Defence; `flash-cannon`, `iron-tail` and `crunch` lower Defence.

## 1c. Later moves — the keywords' Gen II–IV moves (v0.9.89)

The moves of Generations II–IV the move keywords (§3.11) were written for (the user's call, 2026-11-03: "import more moves
where Gen I has few"): Protect and Detect, the weather dances, the heals and screens, the starter ultimates, the finishers
that pay with a stat drop or recoil, Outrage. Reference data for the content test: `src/content/data/later-moves.json`,
with each move's generation. A new row here needs one there, and an illustration (`docs/art/prompts/move-art.json`).

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `protect` | Protect | Normal | Def | Ranged | — | 1 | — | — | Protect · PP 2 |
| `detect` | Detect | Fighting | Def | Ranged | — | 1 | — | — | Protect · PP 2 |
| `endure` | Endure | Normal | Def | Ranged | — | 0 | — | — | Endure · PP 1 |
| `return` | Return | Normal | Off | Melee | — | 2 | 90 | — | Power × Friendship / 255 (§6.3.9; v0.9.90) |
| `rain-dance` | Rain Dance | Water | Util | Ranged | — | 1 | — | — | Rain 3 turns |
| `sunny-day` | Sunny Day | Fire | Util | Ranged | — | 1 | — | — | Sun 3 turns |
| `sandstorm` | Sandstorm | Rock | Util | Ranged | — | 1 | — | — | Sandstorm 3 turns |
| `hail` | Hail | Ice | Util | Ranged | — | 1 | — | — | Hail 3 turns |
| `safeguard` | Safeguard | Normal | Def | Ranged | — | 1 | — | — | Safeguard 3 turns |
| `wish` | Wish | Normal | Def | Ranged | — | 1 | — | — | Wish 50 % · PP 1 |
| `heal-bell` | Heal Bell | Normal | Util | Ranged | — | 1 | — | — | cure the team |
| `aromatherapy` | Aromatherapy | Grass | Util | Ranged | — | 1 | — | — | cure the team |
| `ingrain` | Ingrain | Grass | Def | Melee | — | 1 | — | — | heal 6 % × 20 turns · rooted · PP 1 |
| `aqua-ring` | Aqua Ring | Water | Def | Melee | — | 1 | — | — | heal 6 % × 20 turns · PP 1 |
| `synthesis` | Synthesis | Grass | Def | Melee | — | 1 | — | — | heal 25 % (×2 Sun, ×0.5 other weather) · PP 2 |
| `moonlight` | Moonlight | Normal | Def | Melee | — | 1 | — | — | heal 25 % (×2 Sun, ×0.5 other weather) · PP 2 |
| `morning-sun` | Morning Sun | Normal | Def | Melee | — | 1 | — | — | heal 25 % (×2 Sun, ×0.5 other weather) · PP 2 |
| `milk-drink` | Milk Drink | Normal | Def | Melee | — | 1 | — | — | heal 50 % · PP 1 |
| `roost` | Roost | Flying | Def | Melee | — | 1 | — | — | heal 50 % · PP 1 |
| `mirror-coat` | Mirror Coat | Psychic | Def | Ranged | — | 1 | — | — | Counter Ranged ×1.5 · PP 2 |
| `baton-pass` | Baton Pass | Normal | Util | Melee | SB | 1 | — | — | Baton Pass |
| `u-turn` | U-turn | Bug | Off | Melee | SB | 2 | 60 | — | — |
| `iron-defense` | Iron Defense | Steel | Def | Melee | — | 1 | — | — | Guard 60 · self Def +1 |
| `calm-mind` | Calm Mind | Psychic | Util | Melee | — | 1 | — | — | self Atk +1 · self Def +1 |
| `bulk-up` | Bulk Up | Fighting | Util | Melee | — | 1 | — | — | self Atk +1 · self Def +1 |
| `giga-impact` | Giga Impact | Normal | Off | Melee | — | 3 | 150 | — | Recharge |
| `blast-burn` | Blast Burn | Fire | Off | Ranged | — | 3 | 150 | — | Recharge |
| `hydro-cannon` | Hydro Cannon | Water | Off | Ranged | — | 3 | 150 | — | Recharge |
| `frenzy-plant` | Frenzy Plant | Grass | Off | Ranged | — | 3 | 150 | — | Recharge |
| `overheat` | Overheat | Fire | Off | Ranged | — | 3 | 130 | — | self Atk −2 |
| `draco-meteor` | Draco Meteor | Dragon | Off | Ranged | — | 3 | 130 | — | self Atk −2 |
| `leaf-storm` | Leaf Storm | Grass | Off | Ranged | — | 3 | 130 | — | self Atk −2 |
| `close-combat` | Close Combat | Fighting | Off | Melee | — | 3 | 120 | — | self Def −2 |
| `superpower` | Superpower | Fighting | Off | Melee | — | 3 | 120 | — | self Atk −1 · self Def −1 |
| `flare-blitz` | Flare Blitz | Fire | Off | Melee | — | 3 | 120 | — | recoil 33 % · Burn 10 % |
| `volt-tackle` | Volt Tackle | Electric | Off | Melee | — | 3 | 120 | — | recoil 33 % · Paralysis 10 % |
| `wood-hammer` | Wood Hammer | Grass | Off | Melee | — | 3 | 120 | — | recoil 33 % |
| `brave-bird` | Brave Bird | Flying | Off | Melee | — | 3 | 120 | — | recoil 33 % |
| `outrage` | Outrage | Dragon | Off | Melee | — | 2 | 60 | — | Rampage 2 |

## 1d. Later moves — the progressive learnsets' Gen II–IV moves (v0.9.91)

The moves the stages' learnsets were cut from the series' Gen IV ones needed (§6.9, `scripts/v0991-moves.mjs`): the
elemental fangs and punches, the Ghost, Dragon, Bug and Poison moves Gen I lacked, and the stage moves a track grows into
(Charm, Scary Face, Dragon Dance, Rock Polish). Only what the sim already expresses; power is the series' cut into the
§6.3.6.4 bands. Charm is Normal, its type in Gens II–V. Reference data: `later-moves.json`, with the generation.

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `dragon-claw` | Dragon Claw | Dragon | Off | Melee | — | 2 | 75 | — | — (Gen 3) |
| `dragon-pulse` | Dragon Pulse | Dragon | Off | Ranged | — | 3 | 90 | — | — (Gen 4) |
| `twister` | Twister | Dragon | Off | Ranged | — | 1 | 45 | — | — (Gen 2) |
| `dragon-breath` | Dragon Breath | Dragon | Off | Ranged | — | 2 | 65 | — | Paralysis 30 % (Gen 3) |
| `shadow-ball` | Shadow Ball | Ghost | Off | Ranged | — | 2 | 80 | — | — (Gen 2) |
| `shadow-claw` | Shadow Claw | Ghost | Off | Melee | — | 2 | 70 | — | — (Gen 4) |
| `shadow-punch` | Shadow Punch | Ghost | Off | Melee | — | 2 | 60 | — | — (Gen 3) |
| `shadow-sneak` | Shadow Sneak | Ghost | Off | Melee | — | 1 | 40 | — | — (Gen 4) |
| `astonish` | Astonish | Ghost | Off | Melee | — | 1 | 40 | — | — (Gen 3) |
| `bullet-seed` | Bullet Seed | Grass | Off | Ranged | — | 2 | 75 | — | 3 hits (Gen 3) |
| `seed-bomb` | Seed Bomb | Grass | Off | Ranged | — | 2 | 80 | — | — (Gen 4) |
| `leaf-blade` | Leaf Blade | Grass | Off | Melee | — | 3 | 90 | — | — (Gen 3) |
| `energy-ball` | Energy Ball | Grass | Off | Ranged | — | 2 | 80 | — | — (Gen 4) |
| `giga-drain` | Giga Drain | Grass | Off | Ranged | — | 2 | 65 | — | drain 50 % (Gen 2) |
| `power-whip` | Power Whip | Grass | Off | Melee | — | 3 | 100 | — | — (Gen 4) |
| `mach-punch` | Mach Punch | Fighting | Off | Melee | — | 1 | 40 | — | — (Gen 2) |
| `drain-punch` | Drain Punch | Fighting | Off | Melee | — | 2 | 65 | — | drain 50 % (Gen 4) |
| `brick-break` | Brick Break | Fighting | Off | Melee | — | 2 | 75 | — | — (Gen 3) |
| `cross-chop` | Cross Chop | Fighting | Off | Melee | — | 3 | 95 | — | — (Gen 2) |
| `dynamic-punch` | Dynamic Punch | Fighting | Off | Melee | — | 3 | 90 | — | Confusion 50 % (Gen 2) |
| `vital-throw` | Vital Throw | Fighting | Off | Melee | — | 2 | 70 | — | — (Gen 2) |
| `vacuum-wave` | Vacuum Wave | Fighting | Off | Ranged | — | 1 | 45 | — | — (Gen 4) |
| `aura-sphere` | Aura Sphere | Fighting | Off | Ranged | — | 3 | 90 | — | — (Gen 4) |
| `reversal` | Reversal | Fighting | Off | Melee | — | 1 | 45 | — | ×2.5 below 34 % HP (Gen 2) |
| `flail` | Flail | Normal | Off | Melee | — | 1 | 40 | — | ×2.5 below 34 % HP (Gen 2) |
| `double-hit` | Double Hit | Normal | Off | Melee | — | 2 | 70 | — | 2 hits (Gen 4) |
| `crush-claw` | Crush Claw | Normal | Off | Melee | — | 2 | 70 | — | foe Def -1 (Gen 3) |
| `scary-face` | Scary Face | Normal | Util | Ranged | — | 1 | — | — | foe Spe -2 (Gen 2) |
| `charm` | Charm | Normal | Util | Ranged | — | 1 | — | — | foe Att -2 (Gen 2) |
| `tickle` | Tickle | Normal | Util | Ranged | — | 1 | — | — | foe Att -1 · foe Def -1 (Gen 3) |
| `aqua-jet` | Aqua Jet | Water | Off | Melee | — | 1 | 40 | — | — (Gen 4) |
| `aqua-tail` | Aqua Tail | Water | Off | Melee | — | 3 | 90 | — | — (Gen 4) |
| `water-pulse` | Water Pulse | Water | Off | Ranged | — | 2 | 65 | — | Confusion 20 % (Gen 3) |
| `ice-shard` | Ice Shard | Ice | Off | Ranged | — | 1 | 45 | — | — (Gen 4) |
| `ice-fang` | Ice Fang | Ice | Off | Melee | — | 2 | 65 | — | Freeze 10 % (Gen 4) |
| `powder-snow` | Powder Snow | Ice | Off | Ranged | — | 1 | 45 | — | Freeze 10 % (Gen 2) |
| `fire-fang` | Fire Fang | Fire | Off | Melee | — | 2 | 65 | — | Burn 10 % (Gen 4) |
| `flame-wheel` | Flame Wheel | Fire | Off | Melee | — | 2 | 60 | — | Burn 10 % (Gen 2) |
| `lava-plume` | Lava Plume | Fire | Off | Ranged | — | 2 | 70 | Cleave | Burn 30 % (Gen 4) |
| `heat-wave` | Heat Wave | Fire | Off | Ranged | — | 3 | 80 | Cleave | Burn 10 % (Gen 3) |
| `will-o-wisp` | Will-O-Wisp | Fire | Util | Ranged | — | 1 | — | — | Burn 100 % (Gen 3) |
| `thunder-fang` | Thunder Fang | Electric | Off | Melee | — | 2 | 65 | — | Paralysis 10 % (Gen 4) |
| `spark` | Spark | Electric | Off | Melee | — | 2 | 65 | — | Paralysis 30 % (Gen 2) |
| `discharge` | Discharge | Electric | Off | Ranged | — | 2 | 70 | Cleave | Paralysis 30 % (Gen 4) |
| `zap-cannon` | Zap Cannon | Electric | Off | Ranged | — | 3 | 90 | — | Paralysis 50 % (Gen 2) |
| `poison-jab` | Poison Jab | Poison | Off | Melee | — | 2 | 75 | — | Poison 30 % (Gen 4) |
| `poison-fang` | Poison Fang | Poison | Off | Melee | — | 1 | 50 | — | Poison 30 % (Gen 3) |
| `cross-poison` | Cross Poison | Poison | Off | Melee | — | 2 | 70 | — | Poison 10 % (Gen 4) |
| `sludge-bomb` | Sludge Bomb | Poison | Off | Ranged | — | 3 | 90 | — | Poison 30 % (Gen 2) |
| `gunk-shot` | Gunk Shot | Poison | Off | Ranged | — | 3 | 100 | — | Poison 30 % (Gen 4) |
| `earth-power` | Earth Power | Ground | Off | Ranged | — | 3 | 90 | — | — (Gen 4) |
| `mud-shot` | Mud Shot | Ground | Off | Ranged | — | 1 | 50 | — | foe Spe -1 (Gen 3) |
| `mud-bomb` | Mud Bomb | Ground | Off | Ranged | — | 2 | 65 | — | — (Gen 4) |
| `aerial-ace` | Aerial Ace | Flying | Off | Melee | — | 2 | 60 | — | — (Gen 3) |
| `air-slash` | Air Slash | Flying | Off | Ranged | — | 2 | 75 | — | — (Gen 4) |
| `air-cutter` | Air Cutter | Flying | Off | Ranged | — | 2 | 65 | Cleave | — (Gen 3) |
| `feather-dance` | Feather Dance | Flying | Util | Ranged | — | 1 | — | — | foe Att -2 (Gen 3) |
| `zen-headbutt` | Zen Headbutt | Psychic | Off | Melee | — | 2 | 75 | — | — (Gen 4) |
| `psycho-cut` | Psycho Cut | Psychic | Off | Melee | — | 2 | 70 | — | — (Gen 4) |
| `x-scissor` | X-Scissor | Bug | Off | Melee | — | 2 | 75 | — | — (Gen 4) |
| `bug-buzz` | Bug Buzz | Bug | Off | Ranged | — | 3 | 90 | — | — (Gen 4) |
| `signal-beam` | Signal Beam | Bug | Off | Ranged | — | 2 | 75 | — | Confusion 10 % (Gen 3) |
| `megahorn` | Megahorn | Bug | Off | Melee | — | 3 | 100 | — | — (Gen 2) |
| `silver-wind` | Silver Wind | Bug | Off | Ranged | — | 2 | 65 | — | — (Gen 3) |
| `fury-cutter` | Fury Cutter | Bug | Off | Melee | — | 1 | 40 | — | — (Gen 2) |
| `ancient-power` | Ancient Power | Rock | Off | Ranged | — | 2 | 65 | — | — (Gen 2) |
| `stone-edge` | Stone Edge | Rock | Off | Ranged | — | 3 | 100 | — | — (Gen 4) |
| `rock-blast` | Rock Blast | Rock | Off | Ranged | — | 2 | 75 | — | 3 hits (Gen 3) |
| `power-gem` | Power Gem | Rock | Off | Ranged | — | 2 | 70 | — | — (Gen 4) |
| `rock-tomb` | Rock Tomb | Rock | Off | Ranged | — | 1 | 50 | — | foe Spe -1 (Gen 3) |
| `rock-polish` | Rock Polish | Rock | Util | Ranged | — | 0 | — | — | self Spe +2 (Gen 4) |
| `metal-sound` | Metal Sound | Steel | Util | Ranged | — | 1 | — | — | foe Def -2 (Gen 3) |
| `dragon-dance` | Dragon Dance | Dragon | Util | Ranged | — | 1 | — | — | self Att +1 · self Spe +1 (Gen 3) |
| `nasty-plot` | Nasty Plot | Dark | Util | Ranged | — | 1 | — | — | self Att +2 (Gen 4) |
| `payback` | Payback | Dark | Off | Melee | — | 1 | 50 | — | — (Gen 4) |
| `sucker-punch` | Sucker Punch | Dark | Off | Melee | — | 2 | 70 | — | — (Gen 4) |

## 1e. Later moves — the utility that hurts and the finishers (v0.9.92)

The enemies' disruption (§5.2.3) and the finishers a combo sets up (§5.5.2), `scripts/v0992-moves.mjs`. Enemies carry
them through their kits' roles and their trainers' repertoires (§5.4.1); none is in a learnset yet. Each is read on the
intent before it lands, and nearly each is answered by a swap. Reference data: `later-moves.json`, with the generation.

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `taunt` | Taunt | Dark | Util | Ranged | — | 1 | — | — | Taunt 1: no card of it that does no damage, next turn; a foe's declared set-up fizzles (Gen 3) |
| `yawn` | Yawn | Normal | Util | Ranged | — | 1 | — | — | drowsy: asleep at the end of next turn if it still leads (Gen 3) |
| `perish-song` | Perish Song | Normal | Util | Ranged | — | 1 | — | — | after 3 more turns, each side's Lead loses ½ its Max HP (Gen 2) |
| `mean-look` | Mean Look | Normal | Util | Ranged | — | 1 | — | — | Trap 2: the Lead cannot be swapped out by hand (Gen 2) |
| `spikes` | Spikes | Ground | Util | Ranged | — | 1 | — | — | the other side: ⅛ on entering the Lead, not a Flyer, for the fight (Gen 2) |
| `stealth-rock` | Stealth Rock | Rock | Util | Ranged | — | 1 | — | — | the other side: ⅛ × Rock's effectiveness on entering the Lead, for the fight (Gen 4) |
| `knock-off` | Knock Off | Dark | Off | Melee | — | 1 | 40 | — | ×1.5 while it holds an item; the item is gone for the fight (Gen 3) |
| `helping-hand` | Helping Hand | Normal | Util | Ranged | — | 1 | — | — | its Lead's hits this turn ×1.5; an enemy's is up when declared (Gen 3) |
| `curse` | Curse | Ghost | Util | Ranged | — | 1 | — | — | self ½ Max HP · the foe loses ¼ a turn until it leaves (Gen 2) |
| `wake-up-slap` | Wake-Up Slap | Fighting | Off | Melee | — | 1 | 40 | — | ×1.8 on a sleeper (Gen 4) |
| `smelling-salts` | Smelling Salts | Normal | Off | Melee | — | 1 | 40 | — | ×1.8 on a paralysed target (Gen 3) |
| `brine` | Brine | Water | Off | Ranged | — | 2 | 55 | — | ×1.6 below half HP (Gen 4) |
| `revenge` | Revenge | Fighting | Off | Melee | — | 2 | 50 | — | ×2 when a move hurt it since it last acted (Gen 3) |
| `avalanche` | Avalanche | Ice | Off | Melee | — | 2 | 50 | — | ×2 when a move hurt it since it last acted (Gen 4) |

## 2. Made better (+)

What a first or final evolution upgrades a card into, derived from its move: more power within its band, or a
stronger rider when the band is full; a utility's stage, chance, heal or draw one step further.

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `razor-leaf-plus` | Razor Leaf+ | Grass | Off | Ranged | — | 2 | 80 | — | always crit |
| `mega-drain-plus` | Mega Drain+ | Grass | Off | Ranged | — | 2 | 85 | — | drain 50 % |
| `growth-plus` | Growth+ | Normal | Util | Melee | — | 0 | — | — | self Atk +2 |
| `ember-plus` | Ember+ | Fire | Off | Ranged | — | 1 | 55 | — | Burn 10 % |
| `slash-plus` | Slash+ | Normal | Off | Melee | — | 2 | 100 | — | always crit |
| `fire-spin-plus` | Fire Spin+ | Fire | Off | Ranged | — | 2 | 80 | — | Burn 30 % |
| `bubble-plus` | Bubble+ | Water | Off | Ranged | — | 1 | 55 | — | foe Atk −1 |
| `skull-bash-plus` | Skull Bash+ | Normal | Off | Melee | — | 3 | 100 | — | foe Def −1 |
| `bubble-beam-plus` | Bubble Beam+ | Water | Off | Ranged | — | 2 | 80 | — | foe Spd −1 |
| `harden-plus` | Harden+ | Normal | Def | Melee | — | 1 | — | — | Guard 70 · self Def +1 |
| `leech-life-plus` | Leech Life+ | Bug | Off | Melee | — | 1 | 50 | — | drain 50 % · foe Def −1 |
| `string-shot-plus` | String Shot+ | Bug | Util | Ranged | — | 0 | — | — | foe Spd −2 |
| `gust-plus` | Gust+ | Flying | Off | Ranged | — | 1 | 55 | — | — |
| `confusion-plus` | Confusion+ | Psychic | Off | Ranged | — | 1 | 55 | — | Confusion 30 % |
| `poison-sting-plus` | Poison Sting+ | Poison | Off | Ranged | — | 1 | 55 | — | Poison 30 % |
| `twineedle-plus` | Twineedle+ | Bug | Off | Ranged | — | 2 | 85 | — | 2 hits · Poison 20 % |
| `pin-missile-plus` | Pin Missile+ | Bug | Off | Ranged | — | 2 | 90 | — | 3 hits |
| `quick-attack-plus` | Quick Attack+ | Normal | Off | Melee | SF | 1 | 50 | — | — |
| `sand-attack-plus` | Sand Attack+ | Ground | Util | Ranged | — | 0 | — | — | foe Atk −2 |
| `wing-attack-plus` | Wing Attack+ | Flying | Off | Melee | — | 2 | 75 | — | — |
| `swift-plus` | Swift+ | Normal | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `leer-plus` | Leer+ | Normal | Util | Ranged | — | 0 | — | — | foe Def −2 |
| `bite-plus` | Bite+ | Normal | Off | Melee | — | 1 | 50 | — | foe Def −1 |
| `wrap-plus` | Wrap+ | Normal | Off | Melee | — | 1 | 50 | — | foe Def −1 |
| `thunder-shock-plus` | Thunder Shock+ | Electric | Off | Ranged | — | 1 | 55 | — | Paralysis 10 % |
| `defense-curl-plus` | Defense Curl+ | Normal | Def | Melee | — | 1 | — | — | Guard 60 · self Def +1 |
| `tail-whip-plus` | Tail Whip+ | Normal | Util | Ranged | — | 0 | — | — | foe Def −2 |
| `horn-attack-plus` | Horn Attack+ | Normal | Off | Melee | — | 2 | 75 | — | — |
| `double-slap-plus` | Double Slap+ | Normal | Off | Melee | — | 1 | 50 | — | 4 hits |
| `sing-plus` | Sing+ | Normal | Util | Ranged | — | 1 | — | — | Sleep 80 % |
| `supersonic-plus` | Supersonic+ | Normal | Util | Ranged | — | 1 | — | — | Confusion 80 % |
| `pay-day-plus` | Pay Day+ | Normal | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `karate-chop-plus` | Karate Chop+ | Fighting | Off | Melee | — | 1 | 50 | — | always crit |
| `roar-plus` | Roar+ | Normal | Util | Ranged | — | 1 | — | — | foe Atk −2 · foe Def −2 |
| `acid-plus` | Acid+ | Poison | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `stomp-plus` | Stomp+ | Normal | Off | Melee | — | 2 | 75 | — | foe Def −1 |
| `disable-plus` | Disable+ | Normal | Util | Ranged | — | 1 | — | — | foe Atk −3 |
| `sonic-boom-plus` | Sonic Boom+ | Normal | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `growl-plus` | Growl+ | Normal | Util | Ranged | — | 0 | — | — | foe Atk −2 |
| `aurora-beam-plus` | Aurora Beam+ | Ice | Off | Ranged | — | 2 | 80 | — | foe Atk −1 |
| `pound-plus` | Pound+ | Normal | Off | Melee | — | 1 | 50 | — | — |
| `clamp-plus` | Clamp+ | Water | Off | Melee | — | 1 | 50 | — | foe Def −2 |
| `withdraw-plus` | Withdraw+ | Water | Def | Melee | — | 1 | — | — | Guard 80 · self Def +1 |
| `hypnosis-plus` | Hypnosis+ | Psychic | Util | Ranged | — | 1 | — | — | Sleep 85 % |
| `vice-grip-plus` | Vice Grip+ | Normal | Off | Melee | — | 1 | 50 | — | foe Def −1 |
| `leech-seed-plus` | Leech Seed+ | Grass | Util | Ranged | — | 1 | — | — | Poison |
| `bone-club-plus` | Bone Club+ | Ground | Off | Melee | — | 2 | 75 | — | — |
| `smokescreen-plus` | Smokescreen+ | Normal | Util | Ranged | — | 0 | — | — | foe Atk −2 |
| `self-destruct-plus` | Self-Destruct+ | Normal | Off | Melee | — | 3 | 100 | — | recoil 50 % · foe Def −1 |
| `smog-plus` | Smog+ | Poison | Off | Ranged | — | 1 | 55 | — | Poison 40 % |
| `rock-throw-plus` | Rock Throw+ | Rock | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `scratch-plus` | Scratch+ | Normal | Off | Melee | — | 1 | 50 | — | — |
| `stun-spore-plus` | Stun Spore+ | Grass | Util | Ranged | — | 1 | — | — | Paralysis |
| `toxic-plus` | Toxic+ | Poison | Util | Ranged | — | 1 | — | — | Poison  (escalating) |
| `petal-dance-plus` | Petal Dance+ | Grass | Off | Melee | SF | 3 | 100 | — | self Confusion · foe Def −1 |
| `water-gun-plus` | Water Gun+ | Water | Off | Ranged | — | 1 | 55 | — | — |
| `submission-plus` | Submission+ | Fighting | Off | Melee | — | 3 | 100 | — | recoil 25 % |
| `psychic-plus` | Psychic+ | Psychic | Off | Ranged | — | 3 | 100 | — | foe Def −1 |
| `low-kick-plus` | Low Kick+ | Fighting | Off | Melee | — | 1 | 50 | — | foe Def −1 |
| `meditate-plus` | Meditate+ | Psychic | Util | Melee | — | 0 | — | — | self Atk +2 |
| `vine-whip-plus` | Vine Whip+ | Grass | Off | Ranged | — | 1 | 55 | — | — |
| `slam-plus` | Slam+ | Normal | Off | Melee | — | 2 | 75 | — | foe Def −1 |
| `rock-slide-plus` | Rock Slide+ | Rock | Off | Ranged | — | 2 | 90 | — | — |
| `night-shade-plus` | Night Shade+ | Ghost | Off | Ranged | — | 2 | 85 | — | — |
| `lick-plus` | Lick+ | Ghost | Off | Melee | — | 1 | 50 | — | Paralysis 30 % |
| `confuse-ray-plus` | Confuse Ray+ | Ghost | Util | Ranged | — | 0 | — | — | Confusion |
| `thunder-wave-plus` | Thunder Wave+ | Electric | Util | Ranged | — | 0 | — | — | Paralysis |
| `agility-plus` | Agility+ | Psychic | Util | Melee | — | 0 | — | — | self Spd +3 · draw 2 |
| `dragon-rage-plus` | Dragon Rage+ | Dragon | Off | Ranged | — | 1 | 55 | — | foe Def −1 |
| `barrier-plus` | Barrier+ | Psychic | Def | Melee | — | 1 | — | — | self Def +3 |

## 3. Mastery tiers

The Lv2 (+) and Lv3 (++) of each line's Mastery (`mastery-moves.md`): 2 AP and 100, 3 AP and 130, the Lv1 move's
riders kept.

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `solar-beam-plus` | Solar Beam+ | Grass | Off | Ranged | — | 2 | 100 | — | — |
| `solar-beam-plus-plus` | Solar Beam++ | Grass | Off | Ranged | — | 3 | 130 | — | — |
| `fire-blast-plus` | Fire Blast+ | Fire | Off | Ranged | — | 2 | 100 | — | Burn 30 % |
| `fire-blast-plus-plus` | Fire Blast++ | Fire | Off | Ranged | — | 3 | 130 | — | Burn 30 % |
| `waterfall-plus` | Waterfall+ | Water | Off | Melee | — | 2 | 100 | — | — |
| `waterfall-plus-plus` | Waterfall++ | Water | Off | Melee | — | 3 | 130 | — | — |
| `psybeam-plus` | Psybeam+ | Psychic | Off | Ranged | — | 2 | 100 | — | Confusion 10 % |
| `psybeam-plus-plus` | Psybeam++ | Psychic | Off | Ranged | — | 3 | 130 | — | Confusion 10 % |
| `fury-attack-plus` | Fury Attack+ | Normal | Off | Melee | — | 2 | 100 | — | 3 hits |
| `fury-attack-plus-plus` | Fury Attack++ | Normal | Off | Melee | — | 3 | 130 | — | 3 hits |
| `sky-attack-plus` | Sky Attack+ | Flying | Off | Melee | SF | 2 | 100 | — | always crit |
| `sky-attack-plus-plus` | Sky Attack++ | Flying | Off | Melee | SF | 3 | 130 | — | always crit |
| `super-fang-plus` | Super Fang+ | Normal | Off | Melee | — | 2 | — | — | 65 % of current HP |
| `thunder-plus` | Thunder+ | Electric | Off | Ranged | — | 2 | 100 | — | Paralysis 10 % |
| `thunder-plus-plus` | Thunder++ | Electric | Off | Ranged | — | 3 | 130 | — | Paralysis 10 % |
| `earthquake-plus` | Earthquake+ | Ground | Off | Melee | — | 2 | 100 | cleave | — |
| `double-kick-plus` | Double Kick+ | Fighting | Off | Melee | — | 2 | 100 | — | 2 hits |
| `double-kick-plus-plus` | Double Kick++ | Fighting | Off | Melee | — | 3 | 130 | — | 2 hits |
| `tri-attack-plus` | Tri Attack+ | Normal | Off | Ranged | — | 2 | 100 | — | Burn 7 % · Paralysis 7 % · Freeze 7 % |
| `rage-plus` | Rage+ | Normal | Off | Melee | — | 2 | 100 | — | self Atk +1 |
| `surf-plus` | Surf+ | Water | Off | Ranged | — | 2 | 100 | cleave | — |
| `ice-beam-plus` | Ice Beam+ | Ice | Off | Ranged | — | 2 | 100 | — | Freeze 10 % |
| `body-slam-plus` | Body Slam+ | Normal | Off | Melee | — | 2 | 100 | — | Paralysis 30 % |
| `blizzard-plus` | Blizzard+ | Ice | Off | Ranged | — | 2 | 100 | — | Freeze 10 % |
| `dream-eater-plus` | Dream Eater+ | Psychic | Off | Ranged | — | 2 | 100 | — | drain 50 % |
| `crabhammer-plus` | Crabhammer+ | Water | Off | Melee | — | 2 | 100 | — | always crit |
| `explosion-plus` | Explosion+ | Normal | Off | Melee | — | 2 | 100 | — | recoil 75 % |
| `bonemerang-plus` | Bonemerang+ | Ground | Off | Ranged | — | 2 | 100 | — | 2 hits |
| `sludge-plus` | Sludge+ | Poison | Off | Ranged | — | 2 | 100 | — | Poison 30 % |
| `hydro-pump-plus` | Hydro Pump+ | Water | Off | Ranged | — | 2 | 100 | — | — |
| `hyper-beam-plus` | Hyper Beam+ | Normal | Off | Ranged | — | 2 | 100 | — | — |
| `take-down-plus` | Take Down+ | Normal | Off | Melee | — | 2 | 100 | — | recoil 25 % |
| `mega-punch-plus` | Mega Punch+ | Normal | Off | Melee | — | 2 | 100 | — | — |
| `mega-punch-plus-plus` | Mega Punch++ | Normal | Off | Melee | — | 3 | 130 | — | — |
| `psywave-plus` | Psywave+ | Psychic | Off | Ranged | — | 2 | 100 | — | — |
| `psywave-plus-plus` | Psywave++ | Psychic | Off | Ranged | — | 3 | 130 | — | — |
| `seismic-toss-plus` | Seismic Toss+ | Fighting | Off | Melee | — | 2 | 100 | — | — |
| `seismic-toss-plus-plus` | Seismic Toss++ | Fighting | Off | Melee | — | 3 | 130 | — | — |
| `dream-eater-plus-plus` | Dream Eater++ | Psychic | Off | Ranged | — | 3 | 130 | — | drain 50 % |

## 4. Enemy-only actions (v0.8.2, §5.6.2)

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `call-for-help` | Call for Help | Normal | Util | Ranged | — | 1 | — | cd 2 | summon |
| `cover` | Cover | Normal | Util | Ranged | — | 1 | — | cd 2 | cover |

## 5. Retired in v0.9.5

Every move that was not Gen I, and what took its place wherever it was named — a tutor list, an egg move, a trainer's
kit. The kits themselves were rewritten line by line (`species-r1.md`, `species-r2.md`, `species-gen1.md`).

| id | Became |
|---|---|
| `roost` | `recover` |
| `roost-plus` | `recover` |
| `vine-lash` | `razor-leaf` |
| `petal-blizzard` | `petal-dance` |
| `power-whip` | `razor-leaf` |
| `sweet-scent` | `stun-spore` |
| `dragon-claw` | `slash` |
| `flame-wheel` | `fire-punch` |
| `flame-wheel-r` | `fire-punch` |
| `dragon-claw-plus` | `slash` |
| `aqua-jet` | `bubble` |
| `hydro-crash` | `waterfall` |
| `aqua-ring` | `rest` |
| `aqua-ring-plus` | `rest` |
| `aqua-fortress` | `light-screen` |
| `bug-bite` | `leech-life` |
| `bug-bite-plus` | `twineedle` |
| `silk-bind` | `string-shot` |
| `pin-shot` | `pin-missile` |
| `harden-plus` | `harden` |
| `powder-spread` | `sleep-powder` |
| `silver-wind` | `gust` |
| `tailwind` | `agility` |
| `tailwind-plus` | `agility` |
| `feather-dance` | `growl` |
| `aerial-ace` | `wing-attack` |
| `hurricane` | `sky-attack` |
| `magnitude` | `earthquake` |
| `rock-blast` | `rock-throw` |
| `rollout` | `defense-curl` |
| `stealth-rock` | `leer` |
| `stone-edge` | `rock-slide` |
| `rock-polish` | `sharpen` |
| `body-press` | `body-slam` |
| `crunch` | `hyper-fang` |
| `sucker-punch` | `quick-attack` |
| `psych-up` | `meditate` |
| `flail` | `rage` |
| `giga-drain` | `mega-drain` |
| `moonlight` | `recover` |
| `moonlight-plus` | `recover` |
| `fire-fang` | `fire-punch` |
| `heat-wave` | `flamethrower` |
| `water-pulse` | `bubble-beam` |
| `rapid-spin` | `withdraw` |
| `aqua-tail-g` | `waterfall` |
| `brine` | `bubble-beam` |
| `sludge-bomb` | `sludge` |
| `poison-fang` | `poison-sting` |
| `poison-jab` | `sludge` |
| `cross-poison` | `sludge` |
| `leech-life-plus` | `leech-life` |
| `mud-slap` | `sand-attack` |
| `mud-shot` | `sand-attack` |
| `mud-bomb` | `dig` |
| `bulldoze` | `earthquake` |
| `iron-tail` | `slam` |
| `vital-throw` | `seismic-toss` |
| `cross-chop` | `karate-chop` |
| `close-combat` | `submission` |
| `dynamic-punch` | `submission` |
| `bulk-up` | `meditate` |
| `bulk-up-plus` | `meditate` |
| `brick-break` | `karate-chop` |
| `belly-drum-p` | `meditate` |
| `zen-headbutt` | `headbutt` |
| `air-slash` | `wing-attack` |
| `will-o-wisp` | `confuse-ray` |
| `will-o-wisp-plus` | `confuse-ray` |
| `synthesis` | `recover` |
| `charm` | `growl` |
| `iron-defense` | `barrier` |
| `skull-bash-plus` | `skull-bash` |
| `bug-buzz` | `pin-missile` |
| `poison-sting-plus` | `poison-sting` |
| `hypnosis-plus` | `hypnosis` |
| `amnesia-plus` | `amnesia` |
| `flare-blitz` | `fire-blast` |
| `brave-bird` | `sky-attack` |
| `fell-stinger-v` | `twineedle` |
| `aromatic-mist` | `growth` |
| `aromatherapy-m` | `haze` |
| `aromatherapy` | `haze` |
| `safeguard` | `mist` |
| `wide-guard` | `light-screen` |
| `metal-claw` | `slash` |
| `wish` | `recover` |
| `powder-snow` | `aurora-beam` |
| `ice-shard` | `ice-punch` |
| `icy-wind` | `aurora-beam` |
| `icicle-spear` | `ice-punch` |
| `spark` | `thunder-shock` |
| `charge-beam` | `thunder-shock` |
| `discharge` | `thunderbolt` |
| `volt-tackle` | `thunder-punch` |
| `zap-cannon` | `thunder` |
| `extreme-speed` | `quick-attack` |
| `sludge-wave` | `sludge` |
| `dragon-pulse` | `dragon-rage` |
| `mach-punch` | `comet-punch` |
| `sky-uppercut` | `high-jump-kick` |
| `leaf-blade` | `razor-leaf` |
| `signal-beam` | `psybeam` |
| `ancient-power` | `rock-slide` |
| `heavy-slam` | `body-slam` |
| `bone-rush` | `bonemerang` |
| `air-cutter` | `gust` |
| `sky-drop` | `fly` |
| `shadow-punch` | `lick` |
| `shadow-ball` | `night-shade` |
| `extrasensory` | `psybeam` |
| `calm-mind` | `amnesia` |
| `psystrike` | `psychic` |
| `hyper-voice` | `swift` |
| `aura-sphere` | `psychic` |
| `earth-power` | `earthquake` |
| `drill-run` | `dig` |
| `power-gem` | `rock-slide` |
| `twister` | `dragon-rage` |
| `outrage` | `thrash` |
| `lava-plume` | `flamethrower` |
| `x-scissor` | `slash` |
| `megahorn` | `horn-attack` |
| `gunk-shot` | `sludge` |
| `ingrain` | `leech-seed` |
| `venoshock` | `acid` |
| `revenge` | `counter` |
| `rage-fist` | `rage` |
| `last-resort` | `take-down` |
| `iron-head-a` | `headbutt` |
| `glacial-song` | `ice-beam` |
| `belly-drum-s` | `meditate` |
| `leaf-tornado` | `razor-leaf` |
| `seed-bomb` | `razor-leaf` |
| `aqua-tail` | `waterfall` |
| `spore-cloud` | `spore` |
| `dragon-tail` | `slam` |
| `circle-throw` | `seismic-toss` |
| `psyshock` | `psychic` |
| `leek-slash` | `cut` |
| `sticky-web` | `string-shot` |
| `giga-impact-v` | `hyper-beam` |
| `sheer-cold-l` | `blizzard` |
| `leaf-storm-s` | `razor-leaf` |
| `hi-jump-kick` | `high-jump-kick` |
| `softboiled` | `soft-boiled` |
| `transform-d` | `transform` |
| `rest-s` | `rest` |
| `fissure-d` | `fissure` |
| `guillotine-k` | `guillotine` |
| `slam-k` | `slam` |
| `splash-m` | `splash` |
| `tri-attack-d` | `tri-attack` |
| `sludge-bomb-w` | `sludge` |
| `horn-drill-r` | `horn-drill` |
| `shadow-ball-h` | `night-shade` |

## 6. Design rules for authoring a new move

1. **It is a Gen I move, or one of them made better.** A line whose type runs out of Gen I moves climbs by **+**.
2. **Every kit is playable from its likely position.** At least one Ranged card unless the species is a Lead
   anchor (`machop`'s line, `pinsir`, `snorlax`) — a content test walks every branch path.
3. **A 0-AP move is never strictly better than doing nothing**: stat stages decay, a draw costs the card it is.
4. **A rider chance is a number the player sees** (§9.2.3); a Gen I accuracy becomes that number.
5. **Multi-hit is deterministic**: it states its hit count, never rolls it.
6. **Cooldowns are enemy-side only.**
