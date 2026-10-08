# Move catalog

> Implements §3.6 (taxonomy), §4.1.1 (power and range), §6.3.6 (kit rules), §4.2 (status riders). Columns map 1:1 to
> `MoveDef` (`src/sim/content/defs.ts`); every table below is generated from `moves.json`, so it is the build.
>
> **Every move is a Gen I move (v0.9.5, the user's call, 2026-10-08).** Its name is the Gen I name; its type is the
> modern one where the game has that type — Gust is Flying, Karate Chop Fighting, Sand Attack Ground — and Bite stays
> Normal, as there is no Dark. A **+** is that move made better, the card an evolution upgrades into when its type has
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
> | 4 | 110–130 | 115–130 | the ultimate |
>
> A move with both a modifier and a rider sits at the foot of its band; Gen I's high-critical moves (Karate Chop,
> Razor Leaf, Crabhammer, Slash) crit every time and pay for it there. Cleave (×~1.6), recoil, a rampage's
> self-Confusion and a sacrifice are budgeted apart; Mastery tiers have their own bands (`mastery-moves.md`).
>
> **Accuracy is a rider.** The sim never misses, so a Gen I status move's accuracy is its chance: Sing and
> Supersonic 55 %, Hypnosis 60 %, the powders and Glare 75 %, Toxic 85 %, Thunder Wave and Confuse Ray certain.
> Sand Attack, Smokescreen, Kinesis and Flash, which lowered accuracy, lower Attack.

## 0. What is in the build

| Set | Moves |
|---|---|
| Gen I moves | 161 of the 165 |
| Made better (+) | 70 |
| Mastery tiers (+, ++) | 38 |
| Enemy actions | 2 |
| **Total in `moves.json`** | **271** |

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
| `guillotine` | Guillotine | Normal | Off | Melee | — | 4 | 130 | cd 2 | ignores Def stages |
| `razor-wind` | Razor Wind | Normal | Off | Ranged | — | 3 | 95 | backstrike | — |
| `swords-dance` | Swords Dance | Normal | Util | Melee | — | 1 | — | — | self Atk +2 |
| `cut` | Cut | Normal | Off | Melee | — | 1 | 50 | — | — |
| `whirlwind` | Whirlwind | Normal | Util | Melee | — | 0 | — | — | draw 1 |
| `bind` | Bind | Normal | Off | Melee | — | 1 | 40 | — | foe Def −1 |
| `slam` | Slam | Normal | Off | Melee | — | 2 | 75 | — | — |
| `stomp` | Stomp | Normal | Off | Melee | — | 2 | 70 | — | — |
| `mega-kick` | Mega Kick | Normal | Off | Melee | — | 4 | 120 | — | — |
| `headbutt` | Headbutt | Normal | Off | Melee | — | 2 | 70 | — | — |
| `horn-attack` | Horn Attack | Normal | Off | Melee | — | 2 | 65 | — | — |
| `fury-attack` | Fury Attack | Normal | Off | Melee | — | 1 | 45 | — | 3 hits |
| `horn-drill` | Horn Drill | Normal | Off | Melee | — | 4 | 130 | cd 2 | ignores Def stages |
| `tackle` | Tackle | Normal | Off | Melee | — | 1 | 40 | — | — |
| `body-slam` | Body Slam | Normal | Off | Melee | — | 3 | 85 | — | Paralysis 30 % |
| `wrap` | Wrap | Normal | Off | Melee | — | 1 | 40 | — | foe Def −1 |
| `take-down` | Take Down | Normal | Off | Melee | — | 2 | 75 | — | recoil 25 % |
| `thrash` | Thrash | Normal | Off | Melee | — | 3 | 100 | — | self Confusion |
| `double-edge` | Double-Edge | Normal | Off | Melee | — | 4 | 120 | — | recoil 33 % |
| `tail-whip` | Tail Whip | Normal | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `leer` | Leer | Normal | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `bite` | Bite | Normal | Off | Melee | — | 1 | 50 | — | — |
| `growl` | Growl | Normal | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `roar` | Roar | Normal | Util | Ranged | — | 1 | — | — | foe Atk −1 · foe Def −1 |
| `sing` | Sing | Normal | Util | Ranged | — | 1 | — | — | Sleep 55 % |
| `supersonic` | Supersonic | Normal | Util | Ranged | — | 1 | — | — | Confusion 55 % |
| `sonic-boom` | Sonic Boom | Normal | Off | Ranged | — | 1 | 50 | — | — |
| `disable` | Disable | Normal | Util | Ranged | — | 1 | — | — | foe Atk −2 |
| `hyper-beam` | Hyper Beam | Normal | Off | Ranged | — | 4 | 130 | cd 2 | — |
| `strength` | Strength | Normal | Off | Melee | — | 2 | 75 | — | — |
| `growth` | Growth | Normal | Util | Melee | — | 0 | — | — | self Atk +1 |
| `quick-attack` | Quick Attack | Normal | Off | Melee | SF | 1 | 40 | — | — |
| `rage` | Rage | Normal | Off | Melee | — | 1 | 40 | — | self Atk +1 |
| `screech` | Screech | Normal | Util | Ranged | — | 1 | — | — | foe Def −2 |
| `double-team` | Double Team | Normal | Def | Melee | — | 0 | — | — | self Def +1 |
| `recover` | Recover | Normal | Def | Melee | — | 1 | — | cd 2 | heal 40 % |
| `harden` | Harden | Normal | Def | Melee | — | 0 | — | — | self Def +1 |
| `minimize` | Minimize | Normal | Def | Melee | — | 1 | — | — | self Def +2 |
| `smokescreen` | Smokescreen | Normal | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `defense-curl` | Defense Curl | Normal | Def | Melee | — | 0 | — | — | self Def +1 |
| `focus-energy` | Focus Energy | Normal | Util | Melee | — | 0 | — | — | self Atk +1 |
| `metronome` | Metronome | Normal | Util | Melee | — | 1 | — | — | draw 2 |
| `self-destruct` | Self-Destruct | Normal | Off | Melee | — | 3 | 130 | — | recoil 50 % |
| `egg-bomb` | Egg Bomb | Normal | Off | Ranged | — | 3 | 95 | — | — |
| `swift` | Swift | Normal | Off | Ranged | — | 1 | 55 | — | — |
| `skull-bash` | Skull Bash | Normal | Off | Melee | — | 3 | 95 | — | — |
| `spike-cannon` | Spike Cannon | Normal | Off | Ranged | — | 1 | 50 | — | 3 hits |
| `constrict` | Constrict | Normal | Off | Melee | — | 1 | 40 | — | foe Def −1 |
| `soft-boiled` | Soft-Boiled | Normal | Def | Melee | — | 1 | — | cd 2 | heal 50 % |
| `glare` | Glare | Normal | Util | Ranged | — | 1 | — | — | Paralysis 75 % |
| `barrage` | Barrage | Normal | Off | Ranged | — | 1 | 50 | — | 3 hits |
| `lovely-kiss` | Lovely Kiss | Normal | Util | Ranged | — | 1 | — | — | Sleep 75 % |
| `transform` | Transform | Normal | Def | Melee | — | 1 | — | — | self Atk +1 · self Def +1 |
| `dizzy-punch` | Dizzy Punch | Normal | Off | Melee | — | 2 | 65 | — | Confusion 20 % |
| `flash` | Flash | Normal | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `splash` | Splash | Normal | Util | Melee | — | 0 | — | — | draw 1 |
| `explosion` | Explosion | Normal | Off | Melee | — | 4 | 170 | cd 2 | recoil 75 % |
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
| `counter` | Counter | Fighting | Off | Melee | — | 2 | 65 | — | ×1.5 below 50 % HP |
| `seismic-toss` | Seismic Toss | Fighting | Off | Melee | — | 2 | 70 | — | — |
| `high-jump-kick` | High Jump Kick | Fighting | Off | Melee | SF | 3 | 100 | — | recoil 25 % |

### Fire

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `fire-punch` | Fire Punch | Fire | Off | Melee | — | 2 | 70 | — | Burn 10 % |
| `ember` | Ember | Fire | Off | Ranged | — | 1 | 45 | — | Burn 10 % |
| `flamethrower` | Flamethrower | Fire | Off | Ranged | — | 3 | 95 | — | Burn 10 % |
| `fire-spin` | Fire Spin | Fire | Off | Ranged | — | 2 | 65 | — | Burn 30 % |
| `fire-blast` | Fire Blast | Fire | Off | Ranged | — | 4 | 120 | — | Burn 30 % |

### Ice

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `ice-punch` | Ice Punch | Ice | Off | Melee | — | 2 | 70 | — | Freeze 10 % |
| `mist` | Mist | Ice | Def | Melee | — | 1 | — | — | team guard: next status |
| `ice-beam` | Ice Beam | Ice | Off | Ranged | — | 3 | 95 | — | Freeze 10 % |
| `blizzard` | Blizzard | Ice | Off | Ranged | — | 4 | 120 | — | Freeze 10 % |
| `aurora-beam` | Aurora Beam | Ice | Off | Ranged | — | 2 | 65 | — | foe Atk −1 |
| `haze` | Haze | Ice | Util | Ranged | — | 1 | — | — | cure the team |

### Electric

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `thunder-punch` | Thunder Punch | Electric | Off | Melee | — | 2 | 70 | — | Paralysis 10 % |
| `thunder-shock` | Thunder Shock | Electric | Off | Ranged | — | 1 | 45 | — | Paralysis 10 % |
| `thunderbolt` | Thunderbolt | Electric | Off | Ranged | — | 3 | 95 | — | Paralysis 10 % |
| `thunder-wave` | Thunder Wave | Electric | Util | Ranged | — | 1 | — | — | Paralysis |
| `thunder` | Thunder | Electric | Off | Ranged | — | 4 | 120 | — | Paralysis 10 % |

### Flying

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `gust` | Gust | Flying | Off | Ranged | — | 1 | 45 | — | — |
| `wing-attack` | Wing Attack | Flying | Off | Melee | — | 2 | 65 | — | — |
| `fly` | Fly | Flying | Off | Melee | SF | 3 | 90 | — | — |
| `peck` | Peck | Flying | Off | Melee | — | 1 | 45 | — | — |
| `drill-peck` | Drill Peck | Flying | Off | Melee | — | 2 | 75 | — | — |
| `mirror-move` | Mirror Move | Flying | Util | Melee | — | 1 | — | — | self Atk +1 · draw 1 |
| `sky-attack` | Sky Attack | Flying | Off | Melee | SF | 4 | 110 | cd 1 | always crit |

### Grass

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `vine-whip` | Vine Whip | Grass | Off | Ranged | — | 1 | 45 | — | — |
| `absorb` | Absorb | Grass | Off | Ranged | — | 1 | 45 | — | drain 50 % |
| `mega-drain` | Mega Drain | Grass | Off | Ranged | — | 2 | 70 | — | drain 50 % |
| `leech-seed` | Leech Seed | Grass | Util | Ranged | — | 1 | — | — | Poison 90 % |
| `razor-leaf` | Razor Leaf | Grass | Off | Ranged | — | 2 | 65 | — | always crit |
| `solar-beam` | Solar Beam | Grass | Off | Ranged | — | 4 | 120 | cd 1 | — |
| `stun-spore` | Stun Spore | Grass | Util | Ranged | — | 1 | — | — | Paralysis 75 % |
| `sleep-powder` | Sleep Powder | Grass | Util | Ranged | — | 1 | — | — | Sleep 75 % |
| `petal-dance` | Petal Dance | Grass | Off | Melee | SF | 3 | 100 | — | self Confusion |
| `spore` | Spore | Grass | Util | Ranged | — | 2 | — | — | Sleep |

### Ground

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `sand-attack` | Sand Attack | Ground | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `earthquake` | Earthquake | Ground | Off | Melee | — | 3 | 90 | cleave cd 1 | — |
| `fissure` | Fissure | Ground | Off | Melee | — | 4 | 130 | cd 2 | ignores Def stages |
| `dig` | Dig | Ground | Off | Melee | SB | 2 | 75 | — | — |
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
| `string-shot` | String Shot | Bug | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `leech-life` | Leech Life | Bug | Off | Melee | — | 1 | 45 | — | drain 50 % |

### Water

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `water-gun` | Water Gun | Water | Off | Ranged | — | 1 | 45 | — | — |
| `hydro-pump` | Hydro Pump | Water | Off | Ranged | — | 4 | 120 | — | — |
| `surf` | Surf | Water | Off | Ranged | — | 2 | 70 | cleave | — |
| `bubble-beam` | Bubble Beam | Water | Off | Ranged | — | 2 | 65 | — | foe Atk −1 |
| `withdraw` | Withdraw | Water | Def | Melee | — | 0 | — | — | self Def +1 |
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
| `agility` | Agility | Psychic | Util | Melee | — | 0 | — | — | self Atk +1 · draw 1 |
| `teleport` | Teleport | Psychic | Util | Melee | — | 0 | — | — | draw 1 |
| `barrier` | Barrier | Psychic | Def | Melee | — | 1 | — | — | self Def +2 |
| `light-screen` | Light Screen | Psychic | Def | Melee | — | 1 | — | — | team guard: next Cleave −50 % |
| `reflect` | Reflect | Psychic | Def | Melee | — | 1 | — | — | self Def +1 · bench Def +1 |
| `amnesia` | Amnesia | Psychic | Def | Melee | — | 1 | — | — | self Def +2 |
| `kinesis` | Kinesis | Psychic | Util | Ranged | — | 0 | — | — | foe Atk −1 |
| `dream-eater` | Dream Eater | Psychic | Off | Ranged | — | 2 | 90 | — | drain 50 % |
| `psywave` | Psywave | Psychic | Off | Ranged | — | 1 | 50 | — | — |
| `rest` | Rest | Psychic | Def | Melee | — | 1 | — | — | heal 100 % · self Sleep |

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

## 2. Made better (+)

What a first or final evolution upgrades a card into, derived from its move: more power within its band, or a
stronger rider when the band is full; a utility's stage, chance, heal or draw one step further.

| id | Name | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|---|
| `razor-leaf-plus` | Razor Leaf+ | Grass | Off | Ranged | — | 2 | 80 | — | always crit |
| `mega-drain-plus` | Mega Drain+ | Grass | Off | Ranged | — | 2 | 85 | — | drain 50 % |
| `growth-plus` | Growth+ | Normal | Util | Melee | — | 0 | — | — | self Atk +2 |
| `ember-plus` | Ember+ | Fire | Off | Ranged | — | 1 | 55 | — | Burn 10 % |
| `slash-plus` | Slash+ | Normal | Off | Melee | — | 2 | 75 | — | always crit |
| `fire-spin-plus` | Fire Spin+ | Fire | Off | Ranged | — | 2 | 80 | — | Burn 30 % |
| `bubble-plus` | Bubble+ | Water | Off | Ranged | — | 1 | 55 | — | foe Atk −1 |
| `skull-bash-plus` | Skull Bash+ | Normal | Off | Melee | — | 3 | 100 | — | foe Def −1 |
| `bubble-beam-plus` | Bubble Beam+ | Water | Off | Ranged | — | 2 | 80 | — | foe Atk −1 |
| `harden-plus` | Harden+ | Normal | Def | Melee | — | 0 | — | — | self Def +2 |
| `leech-life-plus` | Leech Life+ | Bug | Off | Melee | — | 1 | 50 | — | drain 50 % · foe Def −1 |
| `string-shot-plus` | String Shot+ | Bug | Util | Ranged | — | 0 | — | — | foe Def −2 |
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
| `defense-curl-plus` | Defense Curl+ | Normal | Def | Melee | — | 0 | — | — | self Def +2 |
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
| `withdraw-plus` | Withdraw+ | Water | Def | Melee | — | 0 | — | — | self Def +2 |
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
| `agility-plus` | Agility+ | Psychic | Util | Melee | — | 0 | — | — | self Atk +2 · draw 2 |
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
