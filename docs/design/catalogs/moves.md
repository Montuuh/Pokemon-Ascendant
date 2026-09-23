# Move catalog

> Implements §3.6 (tag taxonomy), §4.1.1 (power/range), §6.3.6 (kit templates), §4.2 (status riders).
> Columns map 1:1 to `MoveDef` (`src/sim/content/defs.ts`). Status legend in `README.md`.
>
> **Reading the columns.** `Role` = Offensive/Defensive/Utility (drives the §3.3.1 defensive-swap discount).
> `Rng` = Melee (Lead-only unless Step-Forward) / Ranged (any slot, ×0.75 damage). `Mod` = positional modifier
> (SF = Step-Forward, SB = Step-Backward; Melee-only, mutually exclusive, no swap-counter increment).
> `Tgt` = single / cleave (all slots, never fizzles) / backstrike (a bench slot, fizzles if empty).
> `CD` = enemy-side cooldown in turns (§5.3 CooldownGate). Effects use the `MoveEffect` union.
>
> **Power budget — a contract, enforced by a content test (§6.3.6.4).** At divisor 8 a move's expected damage is
> `power × (atk/def) × range × stab × type / 8`. The bands below keep a 1-AP move at ~1 "beat" of a health bar:
>
> | AP | Melee power | Ranged power | Notes |
> |---|---|---|---|
> | 0 | — | — | utility only (no damage) |
> | 1 | 40–50 | 45–55 | the workhorse; every Pokémon has one |
> | 2 | 60–75 | 65–90 | +rider or +modifier costs ~10 power |
> | 3 | 85–100 | 90–100 | one per final-stage kit; often a cooldown or a drawback |
> | 4 | 110–130 | 115–130 | "ultimate", needs setup to afford (§3.2.4) |
>
> A move that carries **both** a modifier and a rider sits at the bottom of its band. A `cleave` move counts as
> ~1.6× its single-target power for budget purposes, so `earthquake` (90, 3 AP, cd1) is at the ceiling.

## 0. What is in the build

| Version | Moves | Note |
|---|---|---|
| v0.1 | 56 | section 1 below |
| v0.2 | +72 | the level-gated learnsets of `species-r1.md` |
| v0.3 | +28 | the evolution-branch payloads: every upgrade target and addition the branch tables name |
| v0.4–v0.7.2 | +25 | the Krabby line, Snorlax, Eevee and the Eeveelutions, the Mastery moves that shipped |
| v0.7.3 | +34 | Region 2's kits: the rows marked v0.7.3 in section 2, plus `mist`, `sheer-cold-l`, `leaf-storm-s` (Lapras, Victreebel) |
| Gen I (2026-09-23) | +64 | the rest of the 151 (`species-gen1.md`): the catalogue rows those kits name, shipped as written, and the rows marked Gen I below |
| **Total in `moves.json`** | **279** | the rest of section 2 lands with the content its version needs |

**Ten v0.3 moves ship with their effect clause omitted**, because it needs a `MoveEffect` kind the sim does not
have. They carry their catalogued type, role, range, modifier, AP and power, so the budget and the kit rules
still hold; only the rider is missing. They are `flare-blitz` and `brave-bird` (recoil), `pin-missile`
(deterministic multi-hit), `fell-stinger-v` (on-kill), `fissure-d` (ignore Def stages), `toxic` (escalating
DoT — ships as flat Poison), `aromatic-mist` (ally-target stage — ships as self), `aromatherapy-m` (team cure —
ships as a self-heal), and `safeguard` / `wide-guard` / `aqua-fortress` (team-wide guards — ship as self Def).
Every one of those effect kinds is v0.4 work; until then the catalogue row is the spec and the JSON is the
subset. 🆕 marks a row with no JSON entry at all.

## 1. Shipped in v0.1 (56) ✅

These are live in `src/content/data/moves.json` and covered by golden-master replays. Changing any number here
requires `UPDATE_GOLDEN=1 npm test` and a note in the section that changed.

| id | Type | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|---|
| `tackle` | Normal | Off | Melee | — | 1 | 40 | — | — |
| `scratch` | Normal | Off | Melee | — | 1 | 40 | — | — |
| `quick-attack` | Normal | Off | Melee | SF | 1 | 40 | — | — |
| `headbutt` | Normal | Off | Melee | SF | 2 | 65 | — | — |
| `slash` | Normal | Off | Melee | — | 2 | 70 | — | always-crit |
| `growl` | Normal | Util | Melee | — | 0 | — | — | foe Atk −1 |
| `tail-whip` | Normal | Util | Melee | — | 0 | — | — | foe Def −1 |
| `sand-attack` | Normal | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `smokescreen` | Normal | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `sweet-scent` | Normal | Util | Ranged | — | 0 | — | — | foe Def −2 |
| `harden` | Normal | Util | Melee | — | 0 | — | — | self Def +1 |
| `harden-plus` | Normal | Util | Melee | — | 0 | — | — | self Def +2 |
| `defense-curl` | Normal | Util | Melee | — | 0 | — | — | self Def +1 |
| `withdraw` | Normal | Def | Melee | — | 1 | — | — | self Def +1 |
| `roost` | Normal | Util | Melee | — | 1 | — | — | heal 25 % |
| `roost-plus` | Normal | Util | Melee | — | 1 | — | — | heal 35 % |
| `vine-whip` | Grass | Off | Ranged | — | 1 | 45 | — | — |
| `vine-lash` | Grass | Off | Ranged | — | 2 | 65 | — | — |
| `power-whip` | Grass | Off | Ranged | — | 2 | 85 | — | — |
| `mega-drain` | Grass | Off | Ranged | — | 2 | 50 | — | heal 25 % |
| `petal-blizzard` | Grass | Off | Melee | SF | 3 | 90 | — | — |
| `leech-seed` | Grass | Util | Ranged | — | 1 | — | — | Poison 100 % |
| `ember` | Fire | Off | Ranged | — | 1 | 40 | — | Burn 20 % |
| `flame-wheel` | Fire | Off | Melee | SB | 2 | 60 | — | Burn 30 % |
| `flamethrower` | Fire | Off | Ranged | — | 2 | 90 | — | Burn 20 % |
| `dragon-claw` | Dragon | Off | Melee | SF | 2 | 65 | — | — |
| `dragon-claw-plus` | Dragon | Off | Melee | SB | 3 | 100 | — | — |
| `water-gun` | Water | Off | Ranged | — | 1 | 45 | — | — |
| `aqua-jet` | Water | Off | Melee | SF | 1 | 45 | — | — |
| `skull-bash` | Normal | Off | Melee | SB | 2 | 60 | — | — |
| `hydro-crash` | Water | Off | Melee | SF | 3 | 95 | — | — |
| `surf` | Water | Off | Ranged | — | 2 | 70 | cleave | — |
| `aqua-ring` | Water | Def | Melee | — | 1 | — | — | heal 12.5 %/turn × 3 |
| `string-shot` | Bug | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `silk-bind` | Bug | Util | Ranged | — | 1 | — | — | foe Atk −1 |
| `bug-bite` | Bug | Off | Melee | — | 1 | 40 | — | — |
| `pin-shot` | Bug | Off | Ranged | — | 1 | 50 | — | — |
| `silver-wind` | Bug | Off | Ranged | — | 2 | 65 | — | self Atk +1 |
| `powder-spread` | Bug | Util | Ranged | — | 1 | — | — | Sleep 60 % |
| `psybeam` | Psychic | Off | Ranged | — | 2 | 70 | — | Confusion 20 % |
| `gust` | Flying | Off | Ranged | — | 1 | 50 | — | — |
| `wing-attack` | Flying | Off | Melee | SF | 2 | 70 | — | — |
| `aerial-ace` | Flying | Off | Ranged | — | 2 | 70 | — | — |
| `hurricane` | Flying | Off | Ranged | — | 3 | 95 | — | — |
| `tailwind` | Flying | Util | Ranged | — | 0 | — | — | draw 1 |
| `tailwind-plus` | Flying | Util | Ranged | — | 0 | — | — | draw 2 |
| `feather-dance` | Flying | Util | Ranged | — | 0 | — | — | foe Atk −2 |
| `rock-throw` | Rock | Off | Ranged | — | 1 | 45 | — | — |
| `rock-blast` | Rock | Off | Melee | SB | 2 | 65 | backstrike | — |
| `rollout` | Rock | Off | Melee | SF | 1 | 50 | — | — |
| `stone-edge` | Rock | Off | Melee | SB | 3 | 95 | cd2 | always-crit |
| `stealth-rock` | Rock | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `rock-polish` | Rock | Util | Melee | — | 0 | — | — | self Atk +2 |
| `magnitude` | Ground | Off | Melee | — | 1 | 50 | — | — |
| `earthquake` | Ground | Off | Melee | — | 3 | 90 | cleave cd1 | — |
| `body-press` | Fighting | Off | Melee | SF | 2 | 80 | — | — |

## 2. Needed by the R1 species catalog (~95, most now shipped)

Grouped by type. `+` in the Mod column means the move is an upgrade target of an evolution archetype.

Rows here are **not** all pending any more: v0.2 shipped the learnset moves and v0.3 shipped the branch
payloads, so 100 of these are live. Rather than mark a hundred rows, section 0 carries the count and
`src/content/data/moves.json` is the answer to "is this one in?". What remains unshipped is the content whose
version has not come up — Mastery (v0.6), the Region 2 and 3 pools (v0.7), and the ten effect clauses listed
in section 0.

### Normal (32)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `pound` | Off | Melee | — | 1 | 40 | — | — (Gen I, 2026-09-23) |
| `pay-day` | Off | Ranged | — | 1 | 45 | — | — (Gen I, 2026-09-23) |
| `horn-attack` | Off | Melee | — | 2 | 65 | — | — (Gen I, 2026-09-23) |
| `horn-drill` | Off | Melee | — | 4 | 130 | cd2 | ignores Def stages (Gen I, 2026-09-23) |
| `guillotine` | Off | Melee | — | 4 | 130 | cd2 | ignores Def stages (`pinsir`) (Gen I, 2026-09-23) |
| `glare` | Util | Ranged | — | 1 | — | — | Paralysis 100 % (Gen I, 2026-09-23) |
| `lovely-kiss` | Util | Ranged | — | 1 | — | — | Sleep 100 % (Gen I, 2026-09-23) |
| `egg-bomb` | Off | Ranged | — | 3 | 100 | — | — (Gen I, 2026-09-23) |
| `softboiled` | Def | Melee | — | 1 | — | cd2 | heal 50 % (Gen I, 2026-09-23) |
| `dizzy-punch` | Off | Melee | — | 2 | 70 | — | Confusion 20 % (Gen I, 2026-09-23) |
| `mega-kick` | Off | Melee | — | 3 | 100 | — | — (Gen I, 2026-09-23) |
| `barrage` | Off | Ranged | — | 1 | 18 | — | 3 hits (Gen I, 2026-09-23) |
| `comet-punch` | Off | Melee | — | 1 | 18 | — | 3 hits (Gen I, 2026-09-23) |
| `spike-cannon` | Off | Ranged | — | 1 | 18 | — | 3 hits (Gen I, 2026-09-23) |
| `minimize` | Def | Melee | — | 1 | — | — | self Def +2 (Gen I, 2026-09-23) |
| `swords-dance` | Util | Melee | — | 1 | — | — | self Atk +2 (Gen I, 2026-09-23) |
| `hyper-voice` | Off | Ranged | — | 3 | 80 | cleave | — (Gen I, 2026-09-23) |
| `transform-d` | Util | Melee | — | 1 | — | — | stand-in: self Atk +1, Def +1 — the real Transform is in the backlog (`species-gen1.md`) (Gen I, 2026-09-23) |
| `take-down` | Off | Melee | — | 2 | 90 | — | recoil 25 % (v0.7.3) |
| `extreme-speed` | Off | Melee | SF | 2 | 80 | — | — (`arcanine`, v0.7.3) |
| `self-destruct` | Off | Melee | — | 3 | 130 | — | recoil 50 % (`voltorb`, `koffing`, v0.7.3) |
| `explosion` | Off | Melee | — | 4 | 170 | cd2 | recoil 75 % (v0.7.3) |
| `recover` | Def | Melee | — | 1 | — | cd2 | heal 40 % (`starmie`, v0.7.3) |
| `tri-attack` | Off | Ranged | — | 3 | 80 | — | Burn · Paralysis · Freeze 7 % each (`magneton`, v0.7.3) |
| `leer` | Util | Ranged | — | 0 | — | — | foe Def −1 |
| `bite` | Off | Melee | — | 1 | 50 | — | — |
| `crunch` | Off | Melee | — | 2 | 75 | — | foe Def −1 |
| `hyper-fang` | Off | Melee | SF | 2 | 80 | — | — |
| `super-fang` | Off | Melee | — | 2 | — | — | damage = half target current HP (Mastery Lv1, `rattata`) |
| `super-fang-plus` | Off | Melee | SF | 2 | — | — | half current HP, min 20 (Mastery Lv2) |
| `sucker-punch` | Off | Melee | SF | 1 | 55 | — | +50 % damage if the target's intent is an Attack (telegraphed, Pillar 1) |
| `double-edge` | Off | Melee | — | 3 | 110 | — | self takes 25 % of damage dealt |
| `body-slam` | Off | Melee | — | 2 | 75 | — | Paralysis 30 % |
| `swift` | Off | Ranged | — | 1 | 50 | — | ignores Def stages |
| `focus-energy` | Util | Melee | — | 0 | — | — | self crit +25 % this combat |
| `rage` | Off | Melee | — | 1 | 45 | — | self Atk +1 when this Pokémon is damaged next turn |
| `slam` | Off | Melee | — | 2 | 75 | — | — |
| `stomp` | Off | Melee | SF | 2 | 70 | — | — |
| `double-slap` | Off | Melee | — | 1 | 45 | — | hits twice for 22 each (deterministic rule) |
| `screech` | Util | Ranged | — | 1 | — | — | foe Def −2 |
| `charm` | Util | Ranged | — | 0 | — | — | foe Atk −2 |
| `rapid-spin` | Off | Melee | SB | 1 | 45 | — | clears trap DoT on the user |
| `mega-punch` | Off | Melee | SF | 2 | 80 | — | TM01 |
| `foresight` | Util | Ranged | — | 0 | — | — | reveal every Unknown intent this turn (TM15) |
| `slam-k` | Off | Melee | — | 1 | 60 | — | Mastery Lv1 (`krabby`) |
| `splash-m` | Util | Melee | — | 0 | — | — | draw 2 (Mastery Lv1, `magikarp` — the joke, upgraded) |
| `disable` | Util | Ranged | — | 1 | — | — | the target's declared intent is cancelled this turn |
| `amnesia` | Util | Melee | — | 1 | — | — | self Def +2 |
| `amnesia-plus` | Util | Melee | — | 1 | — | — | self Def +2, heal 10 % |
| `psych-up` | Util | Ranged | — | 1 | — | — | copy the target's positive stat stages |
| `safeguard` | Def | Melee | — | 1 | — | — | team is immune to the next status application |
| `wide-guard` | Def | Melee | — | 2 | — | — | the next Cleave this combat deals 50 % damage |
| `giga-impact-v` | Off | Melee | — | 4 | 130 | cd2 | user cannot play a card next turn |
| `hyper-beam` | Off | Ranged | — | 4 | 130 | cd2 | user cannot play a card next turn |
| `splash` | Util | Melee | — | 0 | — | — | draw 1 (the joke that is never a dead card) |
| `flail` | Off | Melee | — | 1 | — | — | power = 20 + 100 × (1 − hp%) |

### Grass (10)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `absorb` | Off | Ranged | — | 1 | 40 | — | heal 25 % of damage |
| `razor-leaf` | Off | Ranged | — | 2 | 70 | — | — |
| `giga-drain` | Off | Ranged | — | 3 | 85 | — | heal 50 % of damage |
| `solar-beam` | Off | Ranged | — | 4 | 120 | cd1 | — |
| `leaf-blade` | Off | Melee | SF | 3 | 90 | — | always-crit |
| `leaf-storm-s` | Off | Ranged | — | 3 | 100 | — | self Atk −2 |
| `leaf-tornado` | Off | Ranged | — | 2 | 65 | — | foe Def −1 (Mastery Lv1, `bellsprout`) |
| `growth` | Util | Melee | — | 0 | — | — | self Atk +1 |
| `synthesis` | Util | Melee | — | 1 | — | — | heal 40 % |
| `petal-dance` | Off | Melee | SF | 3 | 100 | — | self Confusion after 2 turns (deterministic) |

### Fire (10)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `lava-plume` | Off | Ranged | — | 2 | 60 | cleave | Burn 30 % (Gen I, 2026-09-23) |
| `fire-punch` | Off | Melee | — | 2 | 75 | — | Burn 10 % (v0.7.3) |
| `fire-fang` | Off | Melee | SF | 1 | 50 | — | Burn 20 % |
| `flame-wheel-r` | Off | Ranged | — | 2 | 70 | — | Burn 30 % |
| `fire-spin` | Off | Ranged | — | 2 | 55 | — | 15 dmg/turn × 3 (trap DoT) |
| `heat-wave` | Off | Ranged | — | 3 | 85 | cleave | Burn 20 % |
| `fire-blast` | Off | Ranged | — | 4 | 120 | cd1 | Burn 40 % |
| `flare-blitz` | Off | Melee | SF | 3 | 110 | — | self takes 25 % of damage dealt |
| `will-o-wisp` | Util | Ranged | — | 1 | — | — | Burn 100 % |
| `will-o-wisp-plus` | Util | Ranged | — | 1 | — | — | Burn 100 %, foe Atk −1 |
| `flash-fire-m` | Off | Ranged | — | 2 | 80 | — | +50 % power if the user is Burned (never: Fire is immune — flavour only; do not ship) |

### Water (15)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `waterfall` | Off | Melee | — | 2 | 75 | — | — (Gen I, 2026-09-23) |
| `clamp` | Off | Melee | — | 1 | 45 | — | foe Spd −1 (`shellder`, v0.7.3) |
| `bubble` | Off | Ranged | — | 1 | 40 | — | foe Atk −1 |
| `bubble-beam` | Off | Ranged | — | 2 | 65 | — | foe Atk −1 |
| `water-pulse` | Off | Ranged | — | 2 | 70 | — | Confusion 25 % |
| `hydro-pump` | Off | Ranged | — | 3 | 100 | — | — |
| `brine` | Off | Ranged | — | 2 | 65 | — | ×2 power if the target is below 50 % HP |
| `crabhammer` | Off | Melee | — | 2 | 80 | — | always-crit |
| `crabhammer-max` | Off | Melee | SF | 3 | 100 | — | always-crit (Mastery Lv2, `krabby`) |
| `aqua-tail` | Off | Melee | — | 1 | 65 | — | Mastery Lv1, `squirtle` |
| `aqua-tail-plus` | Off | Melee | SF | 2 | 95 | — | Mastery Lv2 |
| `aqua-tail-max` | Off | Melee | SF | 3 | 130 | — | ignores 2 Def stages (Mastery Lv3) |
| `aqua-tail-g` | Off | Melee | SF | 2 | 85 | — | `gyarados` variant |
| `aqua-ring-plus` | Def | Melee | — | 1 | — | — | heal 18 %/turn × 3 |
| `aqua-fortress` | Def | Melee | — | 2 | — | — | self Def +2, team takes −25 % Cleave damage this combat (signature) |
| `rain-dance` / `rain-dance-plus` | Util | Ranged | — | 1 | — | — | set the Rain Dance field (v0.7, §4.3); until then: self Water moves +20 % |
| `skull-bash-plus` | Off | Melee | SB | 2 | 75 | — | foe Def −1 |
| `mist` | Def | Melee | — | 1 | — | — | team is immune to stat-lowering for 2 turns |
| `sheer-cold-l` | Off | Ranged | — | 4 | 120 | cd2 | Freeze **40 %** (`lapras`). A guaranteed Freeze at 4 AP is a hard lock, since Freeze also prevents swapping |
| `acid-armor` | Util | Melee | — | 1 | — | — | self Def +3 |
| `iron-defense` | Def | Melee | SB | 1 | — | — | self Def +2 |
| `hydro-vortex` | Off | Ranged | — | 3 | 125 | — | Mastery Lv2/3 (`vaporeon`, `lapras`) |

### Ice (8)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `haze` | Util | Ranged | — | 1 | — | — | cures the whole team's statuses (Gen I, 2026-09-23) |
| `powder-snow` | Off | Ranged | — | 1 | 40 | — | Freeze 10 % (v0.7.3) |
| `aurora-beam` | Off | Ranged | — | 2 | 65 | — | foe Atk −1 (v0.7.3) |
| `icicle-spear` | Off | Melee | — | 2 | 25 | — | 3 hits (`cloyster`, v0.7.3) |
| `ice-punch` | Off | Melee | — | 2 | 75 | — | Freeze 10 % (v0.7.3) |
| `blizzard` | Off | Ranged | — | 4 | 120 | cleave · cd1 | Freeze 20 % (v0.7.3) |
| `ice-shard` | Off | Ranged | — | 1 | 45 | — | — |
| `ice-beam` | Off | Ranged | — | 3 | 95 | — | Freeze 20 % |
| `icy-wind` | Off | Ranged | — | 2 | 60 | cleave | foe Atk −1 |

### Electric (12)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `spark` | Off | Melee | SF | 1 | 50 | — | Paralysis 20 % (v0.7.3) |
| `charge-beam` | Off | Ranged | — | 2 | 50 | — | self Atk +1 (v0.7.3) |
| `thunder-punch` | Off | Melee | — | 2 | 75 | — | Paralysis 10 % (v0.7.3) |
| `discharge` | Off | Ranged | — | 3 | 80 | cleave | Paralysis 30 % (v0.7.3) |
| `volt-tackle` | Off | Melee | SF | 3 | 110 | — | recoil 33 % (`raichu`, v0.7.3) |
| `zap-cannon` | Off | Ranged | — | 4 | 120 | cd1 | Paralysis 100 % (`magneton`, v0.7.3) |
| `thunder-shock` | Off | Ranged | — | 1 | 45 | — | Paralysis 20 % |
| `thunderbolt` | Off | Ranged | — | 3 | 95 | — | Paralysis 20 % |
| `thunder` | Off | Ranged | — | 4 | 120 | cd1 | Paralysis 40 % |
| `thunder-wave` | Util | Ranged | — | 1 | — | — | Paralysis 100 % |
| `agility` | Util | Melee | — | 0 | — | — | self Atk +1, draw 1 |
| `gigavolt-havoc` | Off | Ranged | — | 3 | 125 | — | Mastery (`jolteon`) |

### Poison (11)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `gunk-shot` | Off | Ranged | — | 4 | 120 | cd1 | Poison 30 % (Gen I, 2026-09-23) |
| `smog` | Off | Ranged | — | 1 | 30 | — | Poison 40 % (`koffing`, v0.7.3) |
| `sludge-wave` | Off | Ranged | — | 3 | 90 | cleave | Poison 10 % (v0.7.3) |
| `poison-sting` | Off | Melee | — | 1 | 40 | — | Poison 20 % |
| `poison-sting-plus` | Off | Melee | SF | 1 | 50 | — | Poison 35 % |
| `poison-powder` | Util | Ranged | — | 1 | — | — | Poison 100 % |
| `acid` | Off | Ranged | — | 1 | 45 | — | foe Def −1 |
| `sludge` | Off | Ranged | — | 2 | 70 | — | Poison 25 % |
| `sludge-bomb` | Off | Ranged | — | 3 | 95 | — | Poison 30 % |
| `toxic` | Util | Ranged | — | 1 | — | — | Poison 100 %, DoT doubles each turn (cap MaxHP/8) |
| `cross-poison` | Off | Melee | SF | 2 | 75 | — | Poison 20 %, always-crit |
| `poison-fang` | Off | Melee | — | 2 | 70 | — | Poison 50 % |
| `poison-jab` | Off | Melee | SF | 2 | 80 | — | Poison 30 % |
| `venoshock` | Off | Ranged | — | 2 | 65 | — | ×2 power if the target is Poisoned (Mastery Lv1, `weedle`) |
| `venom-drench` | Util | Ranged | — | 1 | — | — | all enemies Atk −1 and Def −1 if Poisoned (Mastery Lv2, `zubat`) |

### Bug (7)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `bug-bite-plus` | Off | Melee | SF | 1 | 50 | — | — |
| `leech-life` | Off | Melee | — | 1 | 45 | — | heal 50 % of damage |
| `leech-life-plus` | Off | Melee | SF | 2 | 75 | — | heal 50 % of damage |
| `twineedle` | Off | Melee | SF | 2 | 70 | — | hits twice for 35 each; Poison 20 % |
| `pin-missile` | Off | Ranged | — | 2 | 75 | — | hits 5 times for 15 (deterministic) |
| `fury-attack` | Off | Melee | — | 1 | 45 | — | hits 3 times for 15 |
| `bug-buzz` | Off | Ranged | — | 3 | 95 | — | foe Def −1 |
| `fell-stinger-v` | Off | Melee | SF | 2 | 65 | — | self Atk +3 if this move faints the target |
| `sticky-web` | Util | Ranged | — | 1 | — | — | all enemies Atk −1 (Mastery Lv1, `caterpie`) |
| `quiver-dance` | Util | Melee | — | 1 | — | — | self Atk +1 Def +1, draw 1 (Mastery Lv3, `butterfree`) |
| `signal-beam` | Off | Ranged | — | 2 | 70 | — | Confusion 20 % |

### Rock / Ground (11)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `mud-slap` | Off | Ranged | — | 1 | 40 | — | foe Atk −1 |
| `mud-shot` | Off | Ranged | — | 1 | 50 | — | foe Atk −1 |
| `mud-bomb` | Off | Ranged | — | 2 | 70 | — | foe Def −1 |
| `dig` | Off | Melee | SB | 2 | 75 | — | the user takes no damage from the next single-target intent |
| `bulldoze` | Off | Melee | — | 2 | 60 | cleave | foe Atk −1 |
| `ancient-power` | Off | Ranged | — | 2 | 65 | — | self Atk +1 Def +1 |
| `rock-slide-m` | Off | Ranged | — | 3 | 85 | cleave | — |
| `rock-wrecker` | Off | Melee | — | 3 | 120 | cd2 | Mastery Lv2 (`geodude`) |
| `tectonic-rage` | Off | Melee | SF | 3 | 135 | cd2 | ignores Def stages (Mastery Lv3, `golem`) |
| `fissure-d` | Off | Melee | — | 4 | 125 | cd2 | ignores Def stages (`dugtrio`) |
| `self-destruct-g` | Off | Melee | — | 2 | 120 | cleave | the user faints (and takes a Trauma stack) |
| `bind` | Off | Melee | — | 1 | 40 | — | 10 dmg/turn × 2 |
| `iron-tail` | Off | Melee | SB | 2 | 80 | — | foe Def −1 |
| `bone-club` | Off | Melee | — | 1 | 50 | — | — |
| `bonemerang` | Off | Ranged | — | 2 | 70 | — | hits twice for 35 |
| `bonemerang-m` | Off | Ranged | — | 2 | 85 | — | hits twice (Mastery Lv1, `marowak`) |
| `bone-rush` | Off | Melee | SF | 3 | 90 | — | hits 3 times for 30 |
| `bone-rush-max` | Off | Melee | SF | 3 | 120 | — | hits 3 times, ignores 1 Def stage (Mastery Lv2) |
| `heavy-slam` | Off | Melee | — | 3 | 100 | — | +20 % power per 40 max-HP over the target |

### Fighting (14)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `double-kick` | Off | Melee | — | 1 | 25 | — | 2 hits (Gen I, 2026-09-23) |
| `rolling-kick` | Off | Melee | — | 1 | 50 | — | — (Gen I, 2026-09-23) |
| `jump-kick` | Off | Melee | SF | 2 | 80 | — | self takes 20 % of damage dealt (Gen I, 2026-09-23) |
| `hi-jump-kick` | Off | Melee | SF | 3 | 110 | — | self takes 25 % of damage dealt (Gen I, 2026-09-23) |
| `aura-sphere` | Off | Ranged | — | 3 | 90 | — | — (Gen I, 2026-09-23) |
| `mach-punch` | Off | Melee | SF | 1 | 40 | — | — (`hitmonchan`, v0.7.3) |
| `sky-uppercut` | Off | Melee | — | 2 | 85 | — | — (`hitmonchan`, v0.7.3) |
| `low-kick` | Off | Melee | — | 1 | 45 | — | — |
| `karate-chop` | Off | Melee | SF | 1 | 50 | — | always-crit |
| `seismic-toss` | Off | Melee | — | 2 | — | — | damage = the user's level × 2 (level-scaling, ignores stats) |
| `seismic-toss-plus` | Off | Melee | SB | 2 | — | — | damage = level × 3 |
| `cross-chop` | Off | Melee | SF | 2 | 80 | — | always-crit |
| `brick-break` | Off | Melee | — | 2 | 75 | — | removes the target's positive Def stages before damage |
| `submission` | Off | Melee | SF | 3 | 100 | — | self takes 25 % of damage dealt |
| `close-combat` | Off | Melee | SF | 3 | 110 | — | self Def −2 |
| `dynamic-punch` | Off | Melee | SF | 3 | 100 | — | Confusion 100 % |
| `fury-swipes` | Normal Off | Melee | — | 2 | 60 | — | hits 3 times for 20 |
| `thrash` | Normal Off | Melee | — | 2 | 85 | — | must be replayed next turn if drawn (fixed 2 turns) — ships without the repeat |
| `vital-throw` | Off | Melee | SB | 2 | 70 | — | — |
| `bulk-up` / `bulk-up-plus` | Util | Melee | — | 1 | — | — | self Atk +1 Def +1 / +2 each |
| `counter` | Def | Melee | — | 1 | — | — | the next single-target hit on the Lead deals its damage back (Mastery Lv2, `machop`) |
| `revenge` | Off | Melee | — | 2 | 70 | — | ×1.5 power if the user was damaged last turn (Mastery Lv1) |
| `all-out-pummeling` | Off | Melee | SF | 3 | 135 | cd2 | Mastery Lv3 (`machamp`) |
| `final-gambit` | Off | Melee | — | 3 | — | — | damage = the user's current HP; the user faints (Mastery Lv2, `primeape`) |
| `rage-fist` | Off | Melee | — | 1 | 55 | — | +15 power per faint this combat (Mastery Lv1, `mankey`) |
| `focus-punch` | Off | Melee | SF | 3 | 120 | — | fails if the Lead was damaged this turn before it resolves (Mastery Lv3, `poliwrath`) |
| `circle-throw` | Off | Melee | SB | 1 | 55 | — | Mastery Lv1 (`poliwag`) |
| `knock-off` | Off | Melee | — | 1 | 50 | — | the target's Home Field / held bonus is suppressed this combat |

### Psychic / Ghost / Flying / misc (14)

| id | Role | Rng | Mod | AP | Pwr | Tgt/CD | Effect |
|---|---|---|---|---|---|---|---|
| `confusion` | Psychic Off | Ranged | — | 1 | 50 | — | Confusion 15 % |
| `psychic` | Psychic Off | Ranged | — | 3 | 95 | — | foe Def −1 |
| `psyshock` | Psychic Off | Ranged | — | 2 | 75 | — | ignores Def stages (Mastery Lv1, `psyduck`) |
| `shattered-psyche` | Psychic Off | Ranged | — | 3 | 125 | — | Mastery Lv2 |
| `zen-headbutt` | Psychic Off | Melee | SF | 2 | 75 | — | Confusion 20 % |
| `hypnosis` / `hypnosis-plus` | Util | Ranged | — | 1 | — | — | Sleep 100 % / Sleep 100 % + foe Def −1 |
| `dream-eater` | Psychic Off | Ranged | — | 2 | 80 | — | only playable on a Sleeping target; heal 100 % of damage (Mastery Lv2, `metapod`) |
| `sing` | Util | Ranged | — | 1 | — | — | Sleep 100 % |
| `supersonic` | Util | Ranged | — | 1 | — | — | Confusion 100 % |
| `confuse-ray` | Util | Ranged | — | 1 | — | — | Confusion 100 % |
| `curse-ms` | Util | Melee | — | 1 | — | — | the user loses 25 % max HP; the target takes 3-turn DoT |
| `shadow-bone` | Ghost Off | Melee | — | 2 | 85 | — | foe Def −1 (20 %) |
| `lick` | Ghost Off | Melee | — | 1 | 40 | — | Paralysis 30 % |
| `air-cutter` | Flying Off | Ranged | — | 2 | 60 | cleave | — |
| `air-slash` | Flying Off | Ranged | — | 3 | 90 | — | — |
| `sky-attack` / `sky-attack-v` | Flying Off | Melee | SF | 3 | 110 | cd1 | always-crit |
| `brave-bird` / `brave-bird-plus` | Flying Off | Melee | SF | 2 / 3 | 85 / 110 | — | self takes 25 % of damage dealt |
| `sky-drop` | Flying Off | Melee | SB | 3 | 95 | — | the target's next intent is cancelled |
| `supersonic-skystrike` | Flying Off | Melee | SF | 3 | 130 | cd2 | Mastery (`aerodactyl`) |
| `dragon-rage` | Dragon Off | Ranged | — | 1 | — | — | fixed 40 damage, ignores type and stats |
| `dragon-pulse` | Dragon Off | Ranged | — | 3 | 90 | — | — (`seadra`, v0.7.3) |
| `twister` | Dragon Off | Ranged | — | 1 | 40 | cleave | — (Gen I, 2026-09-23) |
| `outrage` | Dragon Off | Melee | — | 3 | 110 | — | self Confusion 100 % (Gen I, 2026-09-23) |
| `night-shade` | Ghost Off | Ranged | — | 2 | 70 | — | — (Gen I, 2026-09-23) |
| `shadow-punch` | Ghost Off | Melee | SF | 2 | 70 | — | — (Gen I, 2026-09-23) |
| `shadow-ball` | Ghost Off | Ranged | — | 3 | 95 | — | — (Gen I, 2026-09-23) |
| `kinesis` | Psychic Util | Ranged | — | 0 | — | — | foe Atk −1 (Gen I, 2026-09-23) |
| `psywave` | Psychic Off | Ranged | — | 1 | 50 | — | — (Gen I, 2026-09-23) |
| `extrasensory` | Psychic Off | Ranged | — | 2 | 80 | — | — (Gen I, 2026-09-23) |
| `barrier` | Psychic Def | Melee | — | 1 | — | — | self Def +2 (Gen I, 2026-09-23) |
| `reflect` | Psychic Def | Melee | — | 1 | — | — | self Def +1, bench Def +1 (Gen I, 2026-09-23) |
| `light-screen` | Psychic Def | Melee | — | 1 | — | — | the next Cleave on the team deals 50 % less (Gen I, 2026-09-23) |
| `calm-mind` | Psychic Util | Melee | — | 1 | — | — | self Atk +1, Def +1 (Gen I, 2026-09-23) |
| `psystrike` | Psychic Off | Ranged | — | 4 | 130 | cd2 | ignores Def stages (`mewtwo`) (Gen I, 2026-09-23) |
| `peck` | Flying Off | Melee | — | 1 | 40 | — | — (Gen I, 2026-09-23) |
| `drill-peck` | Flying Off | Melee | — | 2 | 75 | — | — (Gen I, 2026-09-23) |
| `fly` | Flying Off | Melee | SF | 3 | 90 | — | — (Gen I, 2026-09-23) |
| `earth-power` | Ground Off | Ranged | — | 3 | 90 | — | foe Def −1 (Gen I, 2026-09-23) |
| `drill-run` | Ground Off | Melee | — | 2 | 70 | — | always-crit (Gen I, 2026-09-23) |
| `power-gem` | Rock Off | Ranged | — | 2 | 80 | — | — (Gen I, 2026-09-23) |
| `x-scissor` | Bug Off | Melee | — | 2 | 75 | — | — (Gen I, 2026-09-23) |
| `megahorn` | Bug Off | Melee | — | 3 | 100 | — | — (Gen I, 2026-09-23) |
| `ingrain` | Grass Def | Melee | — | 1 | — | — | heal 12.5 % a turn for 3 turns (Gen I, 2026-09-23) |
| `dragon-dance` | Util | Melee | — | 1 | — | — | self Atk +1, draw 1 (Mastery Lv2, `gyarados`) |
| `dragon-tail` | Dragon Off | Melee | SB | 2 | 75 | — | Mastery Lv1 (`onix`) |
| `metal-claw` | Rock Off | Melee | SF | 1 | 50 | — | self Atk +1 (Steel is not a type in the 15-type chart, so it is typed Rock) |
| `guillotine-k` | Water Off | Melee | — | 4 | 130 | cd2 | ignores Def stages (`kingler`) |
| `rest-s` / `rest-p` | Util | Melee | — | 1 | — | — | heal 50 % max HP, self Sleep 2 turns |
| `yawn` | Util | Ranged | — | 1 | — | — | the target falls asleep at the end of next turn (telegraphed) |
| `moonlight` / `moonlight-plus` | Util | Melee | — | 1 | — | — | heal 30 % / 45 % |
| `aromatic-mist` | Util | Ranged | — | 0 | — | — | an ally's Def +1 |
| `aromatherapy-m` | Util | Melee | — | 1 | — | — | cure all statuses on the team (Mastery Lv3, `vileplume`) |
| `stun-spore` | Util | Ranged | — | 1 | — | — | Paralysis 100 % |
| `sleep-powder` | Util | Ranged | — | 1 | — | — | Sleep 100 % |
| `spore-cloud` | Util | Ranged | — | 1 | — | — | Sleep 100 % and Poison 100 % (Mastery Lv1, `oddish`) |
| `wrap` | Off | Melee | — | 1 | 40 | — | 10 dmg/turn × 2 |
| `vice-grip` | Off | Melee | — | 1 | 50 | — | — |
| `effect-spore-m` | — | — | — | — | — | — | (reserved id; ability, not a move — do not ship as a move) |
| `wish` | Util | Ranged | — | 1 | — | — | the chosen ally heals 40 % at the end of next turn |
| `last-resort` | Off | Melee | — | 2 | 90 | — | playable only if every other card in hand has been played this combat (Mastery Lv1, `eevee`) |
| `perish-song` | Util | Ranged | — | 2 | — | — | all enemies faint after 3 turns (Mastery Lv1, `lapras`; bosses take 25 % max HP instead) |
| `belly-drum-s` | Util | Melee | — | 2 | — | — | self loses 40 % max HP, Atk +4 (Mastery Lv1, `snorlax`) |
| `belly-drum-p` | Util | Melee | — | 2 | — | — | self loses 30 % max HP, Atk +3 (`poliwhirl`) |
| `pulverizing-pancake` | Off | Melee | SF | 3 | 140 | cd2 | Mastery Lv2 (`snorlax`) |
| `snore` | Off | Ranged | — | 1 | 60 | — | playable only while asleep |
| `seed-bomb` / `seed-barrage` / `bloom-cannon` | Grass Off | Ranged | — | 1 / 2 / 3 | 65 / 95 / 130 | — | Mastery line (`bulbasaur`) |
| `fire-fang-m` / `inferno-fang` / `blast-burn` | Fire Off | Melee | — / SF / SF | 1 / 2 / 3 | 70 / 100 / 135 | — | Mastery line (`charmander`) |
| `iron-head-a` | Rock Off | Melee | SF | 2 | 85 | — | Mastery Lv1 (`aerodactyl`) |
| `double-edge-o` | Off | Melee | — | 3 | 115 | — | self takes 25 % (Mastery Lv2, `onix`) |
| `triple-dive` | Ground Off | Melee | — | 2 | 75 | — | hits 3 times (Mastery Lv2, `dugtrio`) |
| `tri-attack-d` | Off | Ranged | — | 2 | 70 | — | Burn/Paralysis/Freeze 20 %, cycling deterministically (Mastery Lv1, `diglett`) |
| `mind-reader` | Util | Ranged | — | 0 | — | — | reveal every Unknown intent this turn (Mastery Lv2, `poliwhirl`) |
| `toxic-thread` | Util | Ranged | — | 1 | — | — | Poison 100 %, foe Atk −1 (Mastery Lv3, `beedrill`) |
| `screech-z` | — | — | — | — | — | — | (duplicate of `screech`; do not ship) |
| `inferno-overdrive` | Fire Off | Ranged | — | 3 | 125 | — | Mastery (`flareon`) |
| `giga-impact-o` | — | — | — | — | — | — | (use `giga-impact-v`) |

## 3. Design rules for authoring a new move

1. **Every move a Pokémon owns must be playable from its likely position.** A kit of four Melee moves on a
   support Pokémon is a dead hand whenever it is benched (§3.3.1). Kits mix at least one Ranged move unless the
   species is explicitly a Lead-anchor (`golem`, `machamp`, `snorlax`).
2. **A 0-AP move must never be strictly better than doing nothing on every turn** — otherwise it is just free
   value and the AP economy stops mattering. 0-AP utilities either have a decaying effect (stat stages, which the
   AI and the player both see diminish) or a cost elsewhere (`splash` draws but does nothing).
3. **A rider chance is a number the player sees** (§9.2.3 card anatomy). 100 % riders belong on Utility moves
   that deal no damage; damaging moves carry 20–40 %.
4. **Deterministic multi-hit**: a multi-hit move states its hit count, never rolls it.
5. **Cooldowns are enemy-side only.** A player card is limited by AP and the draw, not a timer.
