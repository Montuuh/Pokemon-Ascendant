# Gym Leader catalog — 12 (4 per Region)

> Data for §5.9.2–§5.9.5 and §5.10. **⚠ Designed 2026-10-29; implementation and tuning pending v0.9.86.**
> The user chose five members with a thematic off-type support permitted. The build still pads two authored
> members from lane pools; these replacement teams are not shipped. Species, moves and assets already exist.

## 1. Region 1 — Rock · Water · Bug · Normal

Every member row: **⚠ v0.9.86 · §5.9.3**. Rows are deployment order; slot 5 is the ace. Roles describe the kit's
job, not an extra support actor or an escalation buff. Levels and phase counts follow §5.9.3.

### `rock-gym-r1` — Brock · Rock Solid

`rock-gym-r1` · `boulder-badge` · Entrenchment. Sandslash is the guest: sand disruption and Ground coverage.
Water and Grass remain good answers. Kabutops and Omastar have modest kits and one phase; their base stats are
a named Region 1 balance risk, not permission to flatten their HP. Graveler's three phases distinguish the ace.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `onix` | Opening bind and Defence pressure | `rock-throw`, `bind`, `screech`, `tackle` |
| 2 | `kabutops` | Physical pressure and Grass drain | `scratch-plus`, `rock-throw`, `absorb`, `harden` |
| 3 | `omastar` | Ranged coverage and a braced shell | `bubble-beam`, `horn-attack`, `withdraw`, `rock-slide` |
| 4 | `sandslash` | Guest: sand control | `slash`, `sand-attack`, `dig`, `defense-curl` |
| 5 | `graveler` | Ace: Rock/Ground wall | `rock-slide`, `rock-throw`, `harden`, `dig` |

### `water-gym-r1` — Misty · Riptide

`water-gym-r1` · `cascade-badge` · Tempo Control. Five swimming lines replace the repeated Kingler and Magikarp.
Confusion, Sleep and smokescreen pressure planning; Riptide remains the central constraint.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `golduck` | Opening Psychic coverage and disruption | `confusion`, `water-gun`, `tail-whip`, `disable` |
| 2 | `poliwhirl` | Sleep and physical coverage | `bubble-plus`, `body-slam`, `hypnosis`, `submission` |
| 3 | `seaking` | Horn pressure and Confusion | `horn-attack-plus`, `water-gun`, `supersonic`, `tail-whip` |
| 4 | `seadra` | Ranged pressure and Ice coverage | `bubble-beam`, `smokescreen`, `leer`, `ice-beam` |
| 5 | `kingler` | Ace: claws and a hardened shell | `crabhammer`, `bubble-beam`, `stomp`, `harden` |

### `bug-gym-r1` — Aster · Swarm

`bug-gym-r1` · `hive-badge` · Status Siege. Gloom is a forest-floor guest. There is no cocoon filler, and no
Scyther/Pinsir/Scizor stat jump: this early Gym tests condition management. Fire and Flying still answer all five.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `venomoth` | Opening Confusion siege and Psychic coverage | `psybeam`, `leech-life`, `disable`, `supersonic` |
| 2 | `parasect` | Drain and Paralysis | `leech-life-plus`, `absorb`, `stun-spore`, `slash` |
| 3 | `beedrill` | Multi-hit pressure | `twineedle-plus`, `poison-sting-plus`, `agility`, `harden-plus` |
| 4 | `gloom` | Guest: garden spores and drain | `mega-drain`, `acid-plus`, `poison-powder`, `stun-spore` |
| 5 | `butterfree` | Ace: Sleep and Confusion | `sleep-powder`, `confusion`, `gust`, `harden` |

### `normal-gym-r1` — Whitney · Rollout

`normal-gym-r1` · `plain-badge` · Onslaught. Five Normal lines with different coverage and tempo. Wigglytuff may
Sing but never loops Rest. Raticate keeps Dig coverage.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `pidgeotto` | Opening Flying pressure | `wing-attack`, `gust`, `sand-attack`, `quick-attack-plus` |
| 2 | `farfetchd` | Light pressure and debuffs | `peck`, `gust`, `leer`, `sand-attack` |
| 3 | `persian` | Fast Dark coverage | `slash`, `bite-plus`, `pay-day`, `screech` |
| 4 | `wigglytuff` | Sleep and physical staying power | `body-slam`, `double-slap-plus`, `sing`, `defense-curl` |
| 5 | `raticate` | Ace: burst and Ground coverage | `hyper-fang`, `quick-attack-plus`, `dig`, `tail-whip` |

## 2. Region 2 — Fire · Grass · Electric · Poison

Every member row: **⚠ v0.9.86 · §5.9.3**. The Region's status accent remains (§2.2); it must not evict any of
the four authored moves. Two enemies share the field; these are not five separate duels.

### `fire-gym-r2` — Blaine · Meltdown

`fire-gym-r2` · `volcano-badge` · Onslaught. Five Fire lines bring speed, disruption and coverage before the ace.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `ninetales` | Opening ranged pressure and trapping | `flamethrower`, `quick-attack`, `fire-spin`, `tail-whip-plus` |
| 2 | `rapidash` | Fast physical pressure | `stomp-plus`, `ember`, `agility`, `growl` |
| 3 | `magmar` | Confusion and close pressure | `fire-punch`, `confuse-ray`, `ember`, `leer` |
| 4 | `flareon` | Mixed reach and disruption | `flamethrower`, `swift`, `sand-attack`, `fire-spin` |
| 5 | `arcanine` | Ace: physical and Dark coverage | `flamethrower`, `take-down`, `bite-plus`, `roar` |

### `grass-gym-r2` — Erika · Bloom

`grass-gym-r2` · `rainbow-badge` · Status Siege. Constriction, Paralysis, Psychic coverage, physical setup and
Poison occupy different slots. Drain stays species identity; repeated percentage heals do not join the kits.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `tangela` | Opening drain and constriction | `mega-drain`, `constrict`, `poison-powder`, `bind` |
| 2 | `parasect` | Paralysis and physical drain | `leech-life-plus`, `slash`, `stun-spore`, `absorb` |
| 3 | `exeggutor` | Psychic coverage and seeded pressure | `razor-leaf`, `psychic`, `leech-seed`, `stomp` |
| 4 | `victreebel` | Physical setup and Grass pressure | `razor-leaf`, `vine-whip-plus`, `slam-plus`, `swords-dance` |
| 5 | `vileplume` | Ace: Poison and draining flowers | `petal-dance`, `mega-drain`, `toxic-plus`, `sludge` |

### `electric-gym-r2` — Surge · Overcharge

`electric-gym-r2` · `thunder-badge` · Tempo Control. Magneton contributes Steel; Jolteon's Bug coverage and
Electrode's Normal burst keep Ground useful without letting it answer every action.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `raichu` | Opening Paralysis and mixed reach | `thunderbolt`, `thunder-wave`, `quick-attack-plus`, `slam` |
| 2 | `magneton` | Armoured ranged pressure | `thunderbolt`, `sonic-boom-plus`, `swift`, `supersonic` |
| 3 | `electabuzz` | Speed and Defence disruption | `thunderbolt`, `quick-attack`, `leer`, `screech` |
| 4 | `jolteon` | Fast Bug coverage | `thunderbolt`, `pin-missile`, `swift`, `sand-attack` |
| 5 | `electrode` | Ace: charged burst | `thunderbolt`, `thunder-wave`, `sonic-boom-plus`, `self-destruct` |

### `poison-gym-r2` — Koga · Toxic

`poison-gym-r2` · `soul-badge` · Status Siege. A snake, bat, sludge, moth and gas cloud replace repeated
Weezing/Golbat. Ground immunity and Psychic coverage remain visible species/intent properties.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `arbok` | Opening constriction and Paralysis | `wrap-plus`, `glare`, `bite-plus`, `sludge` |
| 2 | `golbat` | Flying coverage and Confusion | `wing-attack`, `bite-plus`, `supersonic`, `haze` |
| 3 | `muk` | Durable Poison pressure and disruption | `sludge`, `acid-plus`, `disable`, `pound-plus` |
| 4 | `venomoth` | Poison delivery and Psychic coverage | `psybeam`, `poison-powder`, `supersonic`, `leech-life` |
| 5 | `weezing` | Ace: poison cloud and explosion | `smog-plus`, `poison-gas`, `smokescreen-plus`, `self-destruct` |

## 3. Region 3 — Psychic · Ground · Fighting · Ice

Every member row: **⚠ v0.9.86 · §5.9.3**. Final forms only. Auto must not restore Recover on Alakazam or Rest
on Lorelei's team. There is no additional escalating support actor.

### `psychic-gym-r3` — Sabrina · Mind Lock

`psychic-gym-r3` · `marsh-badge` · Tempo Control. Five Psychic lines. The hand seal remains central; Defence
is setup rather than an unbounded healing loop.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `hypno` | Opening Sleep and disruption | `psychic`, `headbutt`, `hypnosis`, `disable` |
| 2 | `mr-mime` | Barrier and Defence-independent coverage | `psychic`, `reflect`, `barrier`, `seismic-toss` |
| 3 | `slowbro` | Water coverage and disruption | `surf`, `psychic`, `disable`, `growl` |
| 4 | `exeggutor` | Grass coverage and seeded pressure | `razor-leaf`, `stomp`, `leech-seed`, `psychic` |
| 5 | `alakazam` | Ace: fast pressure without Recover | `psychic`, `psybeam`, `reflect`, `seismic-toss` |

### `ground-gym-r3` — Giovanni · Tremor

`ground-gym-r3` · `earth-badge` · Entrenchment on the ace. All five share Ground. Nidoqueen's primary Poison
type still gives her Status Siege (§5.9.4). Bone, sand and rock replace the duplicate and unrelated Ninetales.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `nidoqueen` | Opening Poison siege and heavy pressure | `earthquake`, `body-slam`, `sludge`, `toxic-plus` |
| 2 | `sandslash` | Dig and sand disruption | `slash`, `dig`, `sand-attack`, `swift` |
| 3 | `dugtrio` | Fast Ground pressure | `earthquake`, `slash`, `sand-attack`, `growl` |
| 4 | `marowak` | Bone strikes and Defence disruption | `bone-club-plus`, `earthquake`, `headbutt`, `leer` |
| 5 | `rhydon` | Ace: Rock/Ground wall | `rock-slide`, `dig`, `stomp-plus`, `tail-whip` |

### `fighting-gym-r3` — Kiyo · Close Quarters

`fighting-gym-r3` · `knuckle-badge` · Onslaught. All five Fighting lines. Water and elemental coverage make
the kit matter after the player counter-picks Psychic or Flying.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `primeape` | Opening aggression and Rock coverage | `karate-chop-plus`, `thrash`, `rock-slide`, `leer` |
| 2 | `poliwrath` | Water coverage and Sleep pressure | `submission-plus`, `bubble-beam`, `hypnosis`, `ice-punch` |
| 3 | `hitmonlee` | Kicks and setup | `double-kick`, `rolling-kick`, `meditate`, `swift` |
| 4 | `hitmonchan` | Physical and elemental coverage | `submission`, `mega-punch`, `fire-punch`, `ice-punch` |
| 5 | `machamp` | Ace: heavy blows and Electric coverage | `karate-chop`, `submission`, `seismic-toss`, `thunder-punch` |

### `ice-gym-r3` — Lorelei · Ice Armour

`ice-gym-r3` · `glacier-badge` · Tempo Control. Slowbro is the declared cold-water guest with Ice Beam;
Articuno is not a filler slot. Lapras becomes the ace. Nobody carries Rest/Recover: this is already the longest
baseline Gym. Fire shatters the Leader's armour on Slowbro too.

| Slot | Pokémon | Role | Scripted four moves |
|---|---|---|---|
| 1 | `dewgong` | Opening Water/Ice pressure | `aurora-beam`, `surf`, `take-down`, `growl` |
| 2 | `jynx` | Sleep and Psychic coverage | `ice-beam`, `psychic`, `lovely-kiss`, `double-slap` |
| 3 | `slowbro` | Guest: cold-water control | `ice-beam`, `psychic`, `disable`, `surf` |
| 4 | `cloyster` | Armoured multi-hit pressure | `ice-beam`, `clamp-plus`, `spike-cannon`, `withdraw-plus` |
| 5 | `lapras` | Ace: the freezing beam | `ice-beam`, `surf`, `body-slam`, `mist` |

## 4. Phase archetypes and ace signatures

Mapping and behaviour live in §5.9.4. The named archetype above describes the ace, not an override of another
member's primary type. A one-phase member has no Phase-2 effect. Home Field and the Leader's rule stay fight-wide.

**Phase-3 signatures — ⚠ v0.9.86, §5.8.3.** Each signatureMove names one move in the ace's four-move kit;
these are data for the one-shot declaration contract, not extra moves, free actions or damage multipliers.
The response is shown with its intent. A signature still uses ordinary move/status/type rules. Lapras uses
Ice Beam rather than the 4-AP Blizzard: the normal per-move enemy cap is 3 AP even when an ace has a larger
shared Acting Twice budget. Paralysis may still make a signature unaffordable and delay it; it is not waived.

| Gym id | Ace | signatureMove | Printed AP | Concrete response |
|---|---|---|---:|---|
| `rock-gym-r1` | `graveler` | `rock-slide` | 2 | Rock-resistant Lead; reduce its Attack or finish the ace before Resolution |
| `water-gym-r1` | `kingler` | `crabhammer` | 3 | Water/Grass resistance, Defence or a KO before its claws land |
| `bug-gym-r1` | `butterfree` | `confusion` | 1 | Psychic resistance or Dark immunity; reduce the forecast rather than relying on a late Sleep |
| `normal-gym-r1` | `raticate` | `hyper-fang` | 2 | Rock/Steel resistance or Ghost immunity; a defensive swap also answers Rollout |
| `fire-gym-r2` | `arcanine` | `flamethrower` | 3 | Fire/Water/Rock resistance or damage reduction; remove it before the hit |
| `grass-gym-r2` | `vileplume` | `petal-dance` | 3 | Grass-resistant Lead; the move retains its printed self-Confusion drawback |
| `electric-gym-r2` | `electrode` | `thunderbolt` | 3 | Ground immunity or Electric resistance; the signature does not override either |
| `poison-gym-r2` | `weezing` | `self-destruct` | 3 | Ghost immunity or Rock/Steel resistance; printed recoil follows damage, not an automatic self-KO |
| `psychic-gym-r3` | `alakazam` | `psychic` | 3 | Dark immunity or Psychic/Steel resistance; keep its Attack debuffs in place |
| `ground-gym-r3` | `rhydon` | `rock-slide` | 2 | Rock-resistant Lead and Defence; Water/Grass burst can KO it before Resolution |
| `fighting-gym-r3` | `machamp` | `submission` | 3 | Ghost immunity or Fighting resistance; the move retains its printed recoil |
| `ice-gym-r3` | `lapras` | `ice-beam` | 3 | Water/Fire/Ice/Steel resistance or damage reduction; Fire can also shatter Ice Armour |

## 5. Seeded selection

The pools, two-Gym draw, counter-pick and One Path remain §5.9.1–§5.9.2 / §8.8.2. Stable Gym ids, trainers,
Badges and arenas stay. The preview names the guest and its job without exposing the other four (§2.7);
the matchup summary includes its types. All five positions are authored, not drawn from lane favourites.

## 6. Rewards

Rewards remain §2.14, §6.2.1 and §7.3.7. This redesign adds no XP, second relic or money to compensate for five
useful members. Whole-run traces must measure XP and post-Gym levels alongside difficulty.

## 7. Authoring and validation

Validate the actual fielded forms after evolution: five unique species **and five unique evolutionary lines**,
at least four sharing the Gym's type, at most one declared guest, four existing moves per member, ace last,
and none of the three default starter lines (Bulbasaur, Charmander, Squirtle) or a Legendary. Pikachu and Eevee
lines unlocked later at the Mart are permitted; the broader isStarterLine helper is not this validator.
Gym membership is explicit. A new evolution that collapses two members fails a
content guard rather than silently substituting a species. Scripted coverage may use a line's appropriate Gen I
moves before its learnset teaches them, as existing aces do; this never teaches those moves to the player.

Implementation compares every Gym against the same seeded baseline, then checks the 720-run Region curve
(§2.2.1), faints, damage per AP, duration tail, repeated status/Defence setup, phase entries and subsequent XP.
Knobs: GYM_ATTACK_MULTIPLIER, GymDef.attackScale, member attackMultiplier and the four moves. Values remain
tuning candidates until measured; species HP is not flattened.

The baseline is not a target to preserve blindly: Surge and Sabrina lost no sampled fights, while Lorelei lost
46 % and averaged 42.4 turns in a small arrival sample. Evidence: the 2026-10-29 review in `../../reviews/`.
