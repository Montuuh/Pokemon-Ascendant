# Gym Leader catalog — 12 (4 per Region tier)

> Implements §5.9 (branching Gym paths, type pool, leader design rules), §5.9.4 (per-type signature
> Phase 2), §5.10 (badges — full effects in `badges.md`), §4.3.5 (Home Field). Status legend in
> `README.md`.
>
> **The Gym contract.** 2 Pokémon, sequential. The second is the **ace**: 3 phases, Sturdy in Phase 3, and
> **no mid-fight evolution** — the threat is a power premium, not a transformation. The
> leader sets an enemy-owned **Home Field** of its type at combat start: its own type-moves deal ×1.5, the
> player gets no boost (§4.3.5). The first intent of each Gym Pokémon is **Hidden**, but it still shows its
> kind glyph — you know a Cleave is coming, not how hard (§5.5).
>
> **Power premium**: non-ace = wild band + 4, ace = wild band + 6 (R1: 12–14 and 14–16 against a 5–10 band).

## 1. Region 1 pool — Rock · Water · Bug · Normal (2 of 4 drawn per run)

| id | Leader | Type | Slot 1 (2-phase) | Ace (3-phase, Sturdy) | Phase-2 archetype | Badge |
|---|---|---|---|---|---|---|
| `rock-gym-r1` | Brock | Rock | `geodude` L14 | `graveler` L16 | **Entrenchment** (+2 Def, race the wall) | `boulder-badge` |
| `water-gym-r1` | Misty | Water | `krabby` L12 | `kingler` L14 | **Tempo Control** (AP tax + Confusion) | `cascade-badge` |
| `bug-gym-r1` | Aster | Bug | `caterpie` L12 | `butterfree` L15 | **Status Siege** (Sleep/Confusion flood) | `hive-badge` |
| `normal-gym-r1` | Wren | Normal | `pidgey` L13 | `raticate` L15 | **Onslaught** (Mass Attack ×1.5 Home Field) | `plain-badge` |

> **The Water Gym fields Krabby and Kingler** (decided 2026-09-19). The Unity build used Squirtle and
> Wartortle — a starter line the player may own themselves, which cannibalises the starter's identity. A Gym
> Leader should field Pokémon you do not already have.
>
> **Rock Gym levels set by the run harness** (2026-09-19). The v0.1 fixture used Geodude L12 + **Golem** L14.
> A final form in the *first* Gym was a wall: over 90 simulated runs it ended 52 of them, and two of the three
> starters could not clear the Region at all. The ace is now the line's **mid-stage at a level premium** —
> Geodude L14 + Graveler L16 against a route team that arrives around Lv 14 having evolved once. Golem is a
> Region 3 problem. Measured result: Bulbasaur 56 %, Charmander 33 %, Squirtle 89 % over 18 seeds each.
> Charmander's low figure is the Fire-into-Rock matchup and is intended; the answer is the Box.

**Rock Gym ace detail** (the shipped fixture, the reference for the other 11):

- P1 (>50 %): `defense-curl`, `rock-throw`, `magnitude` — setup and read.
- P2 (≤50 %): **Entrenchment** — immediately +2 Def stages, then `rock-blast` (Backstrike) and `earthquake`
  (Cleave, cd1). The wall is the phase.
- P3 (≤20 %): cooldowns reset, `stone-edge` (always-crit) fires uncapped, Sturdy survives one lethal hit.

## 2. Region 2 pool — Fire · Grass · Electric · Poison ✅ v0.7.3

> The levels below are the catalogue's; the fight's come from the band (§5.9.3's +4 / +6 on Region 2's 12–20
> route), so every Region 2 Gym fields slot 1 at Lv 24 and its ace at Lv 26. Slot 1 is the line's young one on
> purpose — Growlithe, Weepinbell, Voltorb, Koffing — which is why a Gym, alone of Region 2's rosters, is not
> walked through its evolutions (§2.7.3). Stages: volcano, forest, power-plant, dark-city.

| id | Leader | Type | Slot 1 | Ace | Phase-2 archetype | Badge |
|---|---|---|---|---|---|---|
| `fire-gym-r2` | Blaine | Fire | `growlithe*` L20 | `arcanine*` L22 | **Onslaught** | `volcano-badge` |
| `grass-gym-r2` | Erika | Grass | `weepinbell` L20 | `vileplume` L22 | **Status Siege** | `rainbow-badge` |
| `electric-gym-r2` | Surge | Electric | `voltorb*` L20 | `electrode*` L22 | **Tempo Control** | `thunder-badge` |
| `poison-gym-r2` | Koga | Poison | `koffing*` L20 | `weezing*` L22 | **Status Siege** | `soul-badge` |

## 3. Region 3 pool — Psychic · Ground · Fighting · Ice ✅ v0.7.4

> As built: levels from the band (22–30, so slot 1 at 34 and the ace at 36). Stages: library, desert, gym,
> ice-cave. Two aces carry a scripted kit for the off-type answer their learnset lacks at 36 (§5.9.3):
> Alakazam `psychic` `psyshock` `calm-mind` **`shadow-ball`**, Machamp `cross-chop` `dynamic-punch`
> `close-combat` **`thunder-punch`**; Rhydon's Megahorn and Dewgong's Surf are their own. Kiyo wears the
> Gen IV Black Belt sprite, Lorelei FireRed's. Nidoqueen's primary type is Poison, so Giovanni's slot 1 plays
> Status Siege and his ace the Entrenchment the table names (§5.9.4 reads the Pokémon's own type).

| id | Leader | Type | Slot 1 | Ace | Phase-2 archetype | Badge |
|---|---|---|---|---|---|---|
| `psychic-gym-r3` | Sabrina | Psychic | `kadabra*` L33 | `alakazam*` L35 | **Tempo Control** | `marsh-badge` |
| `ground-gym-r3` | Giovanni | Ground | `nidoqueen*` L34 | `rhydon*` L36 | **Entrenchment** | `earth-badge` |
| `fighting-gym-r3` | Kiyo | Fighting | `machoke` L34 | `machamp` L36 | **Onslaught** | `knuckle-badge` |
| `ice-gym-r3` | Lorelei | Ice | `dewgong*` L34 | `cloyster*` L36 | **Tempo Control** | `glacier-badge` |

Giovanni appears **both** here and at the R3 Elite Trainer node (`elites.md`) — both lanes are canon
and a player may defeat both in one run.

## 4. The four Phase-2 archetypes (§5.9.4)

| Archetype | Types | What Phase 2 does | Counter |
|---|---|---|---|
| **Entrenchment** | Rock, Ground | Ace gains +2 Def stages and a damage-reduction clause from its Home Field | DoT, stat-stage strip, Defence-ignoring moves (`psyshock`, `swift`) |
| **Status Siege** | Poison, Grass, Bug | Mass-Status phase: the Lead is flooded with the Gym's signature status | Cleanse (`full-heal`), swap the statused Lead, immune typing |
| **Onslaught** | Fire, Fighting, Normal | Mass-Attack phase amplified by the Home Field ×1.5 — a burst race | Resist wall, defensive swaps, healing |
| **Tempo Control** | Electric, Psychic, Ice, Water | AP and swap taxes plus Paralysis/Freeze locks | AP management, status immunity, planning two turns out |

## 5. Seeded selection (§5.9.2, §2.5 v2)

Per Region the MapRNG draws **2 distinct types** from the 4-type pool and assigns one to each terminal Gym node
at L11. Both routes telegraph their Gym's type and Badge from the fork at L9 (Pillar 1). The unchosen Gym is
abandoned for the run. Over a run: 3 Badges from 12, 220 possible combinations.

The **One Path** difficulty modifier makes both routes show the **same Gym type**, removing the counter-pick
entirely (§8.8.2). That is a real difficulty increase and the one place a player may opt into knowing less.

## 6. Rewards (§2.14)

| Reward | Value |
|---|---|
| Badge | the type's Badge, permanent for the run (`badges.md`) |
| Relic | a guaranteed Rare **plus** a 1-of-3 **Legendary** pick |
| Poké Dollars | 500 |
| Trainer XP (meta) | 50 |
| In-run XP | `ProgressionConfig.gymXp` = 140 base |

## 7. Authoring rules

1. **Single-type identity**: every Pokémon on the team is the Gym's type (dual-types are fine if one half
   matches). This is what makes the fork a counter-pick decision.
2. The ace's Phase-2 archetype is fixed by type (the table in §4); never mix archetypes within one Gym.
3. Both Pokémon must have at least one answer to a full-resist team, or the counter-pick becomes a free win —
   usually a Normal-type coverage move (the Rock Gym's `body-press` is Fighting, not Rock, for exactly this).
4. The Home Field badge is shown persistently; the damage preview already accounts for it (§4.3.6).
