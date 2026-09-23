# Modifier catalog — badges, region modifiers, difficulty modifiers

> The three families of persistent run modifier. **Badges** are earned from Gyms and last the run;
> **Region modifiers** are chosen per Region and expire with it; **difficulty modifiers** are opted into at run
> start and multiply the run's Trainer XP. Each row names the simulation hook it needs.

---

## Badges — 12

> Implements §5.10. One Badge per Gym type; 3 earned per run (one per Region), max 4 with the optional City
> Gym (§2.11.4). A Badge is permanent from the moment it is awarded until run end, and stacks with everything.
> Each row names the **hook** the sim needs, so a Badge is data plus one subscriber.

| id | Name | Type | Tier | Effect | Hook | Status |
|---|---|---|---|---|---|---|
| `boulder-badge` | Boulder | Rock | R1 | The Lead reduces all incoming damage by 1 (min 0) | `on-damage-taken` | ✅ canon |
| `cascade-badge` | Cascade | Water | R1 | After a **manual** Lead swap, draw 1 extra skill card this turn | `on-swap` | ✅ |
| `hive-badge` | Hive | Bug | R1 | When a card cycles discard → deck, 20 % chance of a free copy in hand next turn | `on-reshuffle` | ✅ |
| `plain-badge` | Plain | Normal | R1 | **The first card you play each turn costs 1 less AP** (min 0) | `on-ap-cost` | ✅ redesigned 2026-09-19 |
| `volcano-badge` | Volcano | Fire | R2 | Offensive cards costing 3+ AP deal +20 % | `on-damage` | ✅ |
| `rainbow-badge` | Rainbow | Grass | R2 | At turn start, a statused Lead restores 3 HP | `on-turn-start` | ✅ |
| `thunder-badge` | Thunder | Electric | R2 | The first Ranged move each turn costs −1 AP (min 0) | `on-ap-cost` | ✅ |
| `soul-badge` | Soul | Poison | R2 | Applying a status to an enemy draws 1 skill card | `on-status-apply` | ✅ |
| `marsh-badge` | Marsh | Psychic | R3 | Every Unknown intent is revealed for the first 2 turns of each combat | `on-combat-start` | ✅ built v0.7.4 (`reveal-intents`, until turn 2; also reads through a Hex Maniac's veil) |
| `earth-badge` | Earth | Ground | R3 | Step-Forward and Step-Backward moves cost −1 AP (min 0) | `on-ap-cost` | ✅ built v0.7.4 (the ap-cost hook, step moves only) |
| `knuckle-badge` | Knuckle | Fighting | R3 | Melee moves deal +25 % | `on-damage` | ✅ built v0.7.4 (`damage-dealt`, range melee) |
| `glacier-badge` | Glacier | Ice | R3 | When an enemy gains a status, its next attack deals −15 % | `on-status-apply` | ✅ built v0.7.4 (a new status-chill hook; the intent shows the smaller number) |

## Two resolved in the 2026-09-19 pass

*(The names are the games' own since 2026-09-24 — Soul for Poison, Marsh for Psychic, Plain, Knuckle; §5.10.4 has why.)*

- **The Plain Badge (Normal) was redesigned.** "+10 % to damage dealt *and* received" was close to neutral — it sped fights
  up slightly and helped whoever hit harder. Every other Badge changes how you play; this one now does too, and
  an AP discount is the most universally useful lever there is, which fits Normal's identity as flexibility.
- **The Knuckle Badge (Fighting) is +25 % Melee, flat.** The old summary table said "+15 % bench / +25 % Lead"; Melee is already
  Lead-gated, so a second Lead condition was redundant.

## Synergy map (for the Gym fork counter-pick)

| Badge | Pairs well with |
|---|---|
| Boulder | Cascade, Rainbow, Knuckle (durable Lead-centric play) |
| Cascade | Boulder, Soul, Earth, Hive (swap-tempo engine) |
| Hive | Cascade, Soul, Plain (deck cycling) |
| Volcano | Marsh, Earth, Knuckle (expensive-card builds) |
| Thunder | Cascade, Marsh (Ranged economy; partly offsets the ×0.75 range modifier) |
| Soul | Cascade, Glacier, Hive (status engine) |
| Earth | Cascade, Volcano, Knuckle (positional combo turns) |
| Glacier | Soul, Rainbow (status as defence) |

The fork at L9 shows both Badges, so the choice is "which engine do I want for the rest of the run" — that is
the macro expression of Pillar 3.

---

## Region modifiers — 17

> Implements §2.11.3 (pool) and §2.1.4.1 (per-Region): exactly **one** is active at a time, chosen from a
> curated 3-offer, applying to that Region only and expiring when the Region ends. Picked pre-R1 at run setup,
> then at City 1 (for R2) and City 2 (for R3). Relics and Badges are the run-long stacking systems; these are
> the per-act accent.

| id | Name | Effect (this Region only) | Tier | Status |
|---|---|---|---|---|
| `hand-of-plenty` | Hand of Plenty | +1 max hand size | Strong | ✅ |
| `swap-fuel` | Swap Fuel | The Lead heals 5 HP on every manual swap | Strong | ✅ |
| `lucky-draw` | Lucky Draw | Draw 1 extra consumable card on turn 1 of every combat | Medium | ✅ |
| `type-affinity` | Type Affinity | All moves of a **type you choose** deal +10 % | Strong | ✅ |
| `status-mastery` | Status Mastery | Statuses you apply last +1 turn | Medium | ✅ |
| `iron-skin` | Iron Skin | All your Pokémon take −1 damage from Cleave intents | Niche | ✅ |
| `pocket-healer` | Pocket Healer | The first combat at each node heals the team +5 % on victory | Medium | ✅ |
| `coin-purse` | Coin Purse | Poké Dollar drops ×1.5 | Medium | ✅ |
| `pokedex-whisper` | Pokédex Whisper | The first Unknown intent of each combat is revealed | Niche | ✅ |
| `sturdy-lead` | Sturdy Lead | Once per combat the Lead survives a lethal hit at 1 HP | Strong | ✅ |
| `mass-mobilization` | Mass Mobilization | Step-Forward and Step-Backward also draw 1 card | Niche | ✅ |
| `trauma-resistance` | Trauma Resistance | Each Trauma stack costs 4 % max HP instead of 5 % (cap unchanged) | Strong | ✅ |
| `glass-cannon` | Glass Cannon | +20 % damage dealt **and** +20 % taken | Medium | ✅ |
| `quick-study` | Quick Study | All Pokémon gain +15 % combat XP | Medium | ✅ |
| `bargain-hunter` | Bargain Hunter | Shop and Dojo prices −20 % | Medium | ✅ |
| `field-surveyor` | Field Surveyor | You choose the neutral Battlefield at the start of each wild/Region combat | Niche | ✅ (needs v0.7 fields) |
| `naturalist-lens` | Naturalist's Lens | At Region start, choose one biome from the Region's eligible set; it becomes the Region's primary biome | Medium | ✅ |

**Offer curation** (§2.11.3.1): the 3 offered are seeded and weighted to the current team — `type-affinity`
surfaces the player's most-common move type, `swap-fuel` weights up if the player swaps often, `trauma-resistance`
weights up when the Box carries stacks. The offer never contains a modifier whose system is not yet reachable
(`field-surveyor` is excluded before Region 3).

> The pool is **17**. Canon used to state 12, 16 and 17 in the same section because additions were appended
> rather than merged; §2.11.3.1 now lists all seventeen in one table.

---

## Difficulty modifiers — 10

> Implements §6.8. Opt-in at run start, 0–N selected from the unlocked pool (default N = 1; the Hub upgrade
> "Difficulty Modifier Slot +1" raises it to 2). Each multiplies the Trainer XP earned that run; multipliers
> stack multiplicatively (§8.8.3). **There is no "easier" modifier** — baseline is the floor (§8.8.4).

| id | Name | Effect | XP × | Unlock | Status |
|---|---|---|---|---|---|
| `iron-will` | Iron Will | All wild encounters have +20 % HP | 1.15 | Trainer Lv 3 | ✅ |
| `tight-schedule` | Tight Schedule | League micro-rest heals 20 % instead of 30 % | 1.15 | Trainer Lv 4 | ✅ (inert until v0.8) |
| `no-refunds` | No Refunds | Consumables are **expended** after use — they do not return at combat end | 1.30 | Trainer Lv 6 | ✅ |
| `dense-fog` | Dense Fog | Every non-boss enemy starts with one Unknown intent | 1.15 | Trainer Lv 5 | ✅ |
| `box-squeeze` | Box Squeeze | Box capacity 4 instead of 6; cannot be expanded | 1.20 | Trainer Lv 7 | ✅ |
| `trauma-surge` | Trauma Surge | Trauma costs 2 pp more per stack in each zone (−7 % / −12 %; cap unchanged) | 1.20 | Trainer Lv 8 | ✅ |
| `greater-threats` | Greater Threats | Each Region's enemies use the next Region's stat tier | 1.40 | Trainer Lv 10 | ✅ |
| `faint-echo` | Faint Echo | A fainted Pokémon's discarded cards stay in the discard pile until the end of next turn (jamming draws) | 1.20 | Trainer Lv 9 | ✅ |
| `one-path` | One Path | Both Gym fork routes show the same Gym type — no counter-pick | 1.10 | Trainer Lv 4 | ✅ |
| `masters-challenge` | Master's Challenge | Every boss gains one extra phase (Phase 3 universal; aces get Phase 4) | 1.50 | Trainer Lv 15 + a Champion clear | ✅ |

**Stacking**: `iron-will` ×1.15 + `trauma-surge` ×1.20 → ×1.38 XP; the mechanical effects apply independently.
Mutually exclusive pairs are declared per modifier in a `conflictsWith[]` list and the picker blocks them
(none conflict today).

> **One Path shows the same Gym type on both branches** (decided 2026-09-19), removing the counter-pick. It is
> the one place the game deliberately relaxes Pillar 1 — acceptable precisely because the player opts in, and
> paid for with ×1.10 XP.

**Interaction with `faint-echo`**: §3.3.5 purges a fainted Pokémon's cards from deck *and* discard. Faint Echo
delays only the discard-pile half; the deck purge is immediate, otherwise the player could draw cards from a
Pokémon that is gone.
