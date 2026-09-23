# Topic 6 — Progression

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** everything a Pokémon gains during a run — XP, levels, learnsets, evolution, the move pool, abilities, the Dojo and Mastery.
> **It does not own:** anything that survives the run (Topic 8), or the nodes that sell these services (Topic 2).

---

# §6.1 Two layers of growth

| Layer | What grows | Where |
|---|---|---|
| **Within a run** | Levels, known moves, evolution stage, ability, held item | This topic |
| **Across runs** | Trainer Level, unlocks, Pokédex tiers, Mastery access | Topic 6 |

Within a run the important growth is not the stat line — it is the **deck**. A run starts with one Pokémon and
a two-card deck and ends with twelve to fifteen cards that you chose. Levels add cards, evolution rewrites them,
and the Dojo lets you buy the ones nature would never give you.

---

# §6.2 XP and levels

## §6.2.1 Earning XP

XP is awarded at combat end and scales with the enemy tier.

| Enemy | XP | Config field |
|---|---|---|
| Wild | 48 | `ProgressionConfig.wildXp` |
| Trainer | 72 | `trainerXp` |
| Elite | 110 | `eliteXp` |
| Gym Leader | 200 | `gymXp` |

These are per enemy, and they are set by the arc in §6.2.4, not chosen for feel: a seven-node Region has to
carry a Lv 5 starter to roughly Lv 14 by the Gym. The first values tried (30/45/80/140) landed the team at
Lv 11 and made the Gym unwinnable for two of the three starters. `src/sim/balance/runBalance.test.ts` is the
check — change a number here and read the table, do not reason about it.

**Scaled by the level gap** (Gen V's formula): each Pokémon takes the encounter's XP ×
`((2·Le + 10) / (Le + Lp + 10))^2.5`, where `Le` is the average level of what was beaten and `Lp` its own
level (`ProgressionConfig.xpLevelExponent`, 0 turns it off). Level with the foe it is ×1; ten levels above a
Lv 20 foe, about ×0.63; five below, about ×1.3. Without it a three-Region run ended with a Lv 43 team fighting
Lv 33 Gyms: flat XP per fight grows a team faster than a Region's band climbs (§2.2.1). *(2026-09-22.)*

**Distribution:** the Active Team earns **100 %**; Pokémon sitting in the Box earn **75 %**. The `exp-share`
relic lifts the bench to 100 %.

Benched Pokémon learning at three-quarters speed is deliberate: it means a Box member falls behind but never
falls out of the run, so swapping your team composition between Regions stays viable instead of being punished.

Multipliers stack multiplicatively: `lucky-egg-token` ×1.15, the `quick-study` Region Modifier ×1.15, the
`living-legend` Legendary ×1.3.

## §6.2.2 Levelling up

Level-ups are processed **between nodes**, never mid-combat. The Post-Combat Reward screen shows the XP bar
fill, applies the stat increase immediately, and **evolves any Pokémon that crossed its threshold** (§6.2.4).

Evolution is not optional and not deferred, because a base form's learnset ends two levels *below* its
threshold (§6.9): a Pokémon that levels past 10 without evolving simply stops learning, and its four cards
never change again for the rest of the run. Holding an evolution back is therefore not a strategic choice, it
is a dead end — so the level-up applies it. What the player chooses is the **branch** (§6.3), on the Evolution
screen (§3.6).

## §6.2.3 Stat growth

Each level adds a flat amount to HP, Attack and Defence from the line's growth curve:

```
stat(level) = base + growth × (level − 1)
```

Growth curves are tuned for this game, not copied from Gen I. **Single-stage species get +25 % growth per
level** to compensate for never evolving (`ProgressionConfig.singleStageGrowthBonusPercent`).

The XP curve is `xpToNext(L) = 12 + (L − 1) × 4` (`levelUpBaseXp`, `levelUpSlopeXp`).

## §6.2.4 The intended arc

| Milestone | When |
|---|---|
| First evolution | End of Region 1 |
| Final evolution | End of Region 2 |
| Region 3 | A fully-evolved team being sculpted, not grown |

To make that fit a three-Region run, **evolution levels are compressed and uniform**: a line's first evolution is
at **level 12** and its final at **level 26**, regardless of what the source material says. Gen I's 16 and 32
were written for a 50-hour journey, not a 90-minute run, and they leave every Region 2 recruit permanently
mid-stage.

A handful of lines keep a bespoke threshold where the number *is* the joke or the identity — Magikarp evolves at
18, and the two-stage bug lines evolve at 8 and 12 so they can actually complete inside Region 1. Those are
listed per species in [`catalogs/species-r1.md`](catalogs/species-r1.md). *(Decided 2026-09-19.)*

---

# §6.3 Evolution

Evolution is not a stat buff. It is a **deck-manipulation event** that permanently rewrites what a Pokémon
contributes, and it is the primary creative expression inside a run (Pillar 4).

## §6.3.1 Triggering it

- Available when the Pokémon reaches its level threshold.
- Crossing the threshold **queues an Archetype Selection screen** (§6.3.3), shown between nodes, after the
  Post-Combat Reward and before the map. One screen per Pokémon, in Box order.
- The evolution itself is **not optional** and not deferrable, for the reason §6.2.2 gives: a base form's
  learnset ends below its threshold, so holding one back is a dead end rather than a tactic. What is
  player-initiated is the **branch** — and that choice is permanent, so the screen confirms it.
- The Victory Road Training Grounds can force an early evolution (§2.12.3).
- **A recruit caught past its threshold owes its screen straight away**, queued with the catch. Region 2's
  recruits arrive at Lv 12–20 and every basic evolves at 12, so the catch is where a Region 2 Pokémon chooses its
  branch — the same beat as levelling into it, one fight earlier. *(v0.7.3.)*

> *Changed 2026-09-19 (v0.3).* This section used to say evolution was player-initiated and that delaying it was
> a legitimate tactic, which contradicted §6.2.2. §6.2.2 is right and this now matches it: the level-up
> applies the evolution, the player picks the archetype. Delaying stays meaningful in exactly one place — a
> stone (§6.3.2) lets a line evolve *earlier*, and a stage-aware tutor list (§6.4.3) gives a reason to buy
> before you evolve rather than after.

## §6.3.2 Evolution Items

Five stones exist: Fire, Water, Thunder, Leaf, Moon (§7.2.5).

A stone does **two** things for a line that uses one:

1. It lets the Pokémon evolve **earlier** than its level threshold — from level 12 for Eevee's branches, level 24
   for Gloom and Weepinbell, level 26 for Poliwhirl.
2. It opens the **stone-specific branch**, which level-only evolution does not offer.

The level path always still exists. In a roguelike you cannot farm for an item, so a stone must be an
opportunity — tempo plus an option — and never a wall. *(Decided 2026-09-19.)*

## §6.3.3 Archetype Selection

When evolution triggers, the player sees:

- Each available **archetype** with its identity label and a full preview of what it does to the Pokémon's
  Learned Move Pool: which moves are **upgraded** (old → new, with the diff highlighted), which are **added**,
  and which are untouched.
- The stat change.
- A confirmation dialogue, because it cannot be undone.

Afterwards the player may immediately reconfigure the active 4 from the updated pool.

**Archetypes available per species:** most lines offer **2**; starters and high-rarity species offer **3**. The
choice is made **fresh at every evolution** — picking Vanguard at the first evolution does not lock Vanguard at
the second. A Wartortle raised as a Specialist can become a Vanguard Blastoise.

## §6.3.4 The three archetypes

| Archetype | Moves tend toward | Modifiers | Ability pool leans |
|---|---|---|---|
| **Vanguard** | Melee, high power, Lead-anchored | Step-Forward and Step-Backward appear and multiply | Crit, melee boosts, recoil tolerance |
| **Specialist** | Ranged, status riders, coverage | Riders on offensive moves | Type boosts, rider reliability |
| **Support** | Defensive and Utility, healing, shields, stat stages | Defensive positioning | Team sustain, auras |

These are **guidelines, not a rigid grid**. A naturally physical species may only offer Vanguard and Specialist;
a naturally supportive one may skip Vanguard entirely. The archetype should feel true to the species first.

## §6.3.5 What an evolution actually does

Evolution operates on the **Learned Move Pool** (§6.7) and is purely additive — nothing is ever removed.

**The payload, per evolution:**

1. **Stat upscale** — the new species' base stats and growth take over.
2. **1–2 in-place upgrades** — a pool move is replaced by its evolved version. If it was in the active 4, the
   upgrade takes that slot automatically.
3. **At most one addition** — a new move enters the pool. At the **final** evolution this addition is the
   species' **signature move**, the strongest thing in its kit.

That is the whole payload, deliberately. An evolution that rewrote six moves at once made the choice
unreadable — the player could not tell what they were choosing. Two upgrades and a signature is something you can
evaluate in the preview.

**Pool size over a run**

| Point | Pool |
|---|---|
| Base form at recruitment | 2 moves |
| Base form, fully levelled | 4–5 |
| After first evolution | 5–6 |
| After final evolution | 6–7 |
| Plus TMs and Dojo visits | 7–9 |

The **active 4 never grows**. That fixed budget against a growing pool is the recurring decision the whole
progression system exists to produce.

## §6.3.6 Move-kit construction rules

Every kit is built to these rules so that kits stay coherent and the hand stays playable. A **single-stage**
species follows the *final*-stage template, not the base-form one — it is already what it is going to be, which
is the same reason it gets +25 % growth (§6.2.3).

### §6.3.6.1 Base form
- 1–2 Offensive moves, mixing Melee and Ranged by species.
- 1 Defensive or Utility move.
- 0 positional modifiers — rarely 1 where the species demands it.
- AP range 0–2. **Exactly 2 moves known at level 1** (§6.9).

### §6.3.6.2 Middle stage
- 1–2 Offensive, at least one upgraded.
- 1 Defensive or Utility, possibly upgraded.
- 0–1 positional modifiers — Vanguard introduces its first here.
- AP range 1–3.

### §6.3.6.3 Final stage
- 2 Offensive, at least one high-power, one possibly a 4-AP ultimate.
- 1 Defensive or Utility.
- 1 signature move, unique to that archetype and stage.
- 1–2 positional modifiers — Vanguard typically 2.
- AP range 1–4.

### §6.3.6.4 The power budget *(a contract, not a guideline)*

| AP | Melee power | Ranged power |
|---|---|---|
| 0 | — *(utility only)* | — |
| 1 | 40–50 | 45–55 |
| 2 | 60–75 | 65–90 |
| 3 | 85–100 | 90–100 |
| 4 | 110–130 | 115–130 |

A move carrying **both** a modifier and a rider sits at the bottom of its band. A `cleave` move counts as ~1.6×
its printed power for budgeting. A content test enforces the bands, because 150 moves authored across many
sessions will not stay coherent on good intentions. *(Decided 2026-09-19.)*

### §6.3.6.5 Two rules that keep hands playable

- **Every kit has at least one Ranged move**, unless the species is explicitly a Lead anchor (Golem, Machamp,
  Snorlax). A four-Melee kit is a dead hand whenever that Pokémon is benched.
- **A 0-AP move must never be strictly correct every turn.** Free utilities either decay (stat stages, which
  both sides watch diminish) or cost something elsewhere.

---

# §6.4 TMs and the Dojo

Two ways to add a move outside evolution.

## §6.4.1 TMs

- **What:** a single-use item from shops, drops and events.
- **What it does:** permanently adds its move to a compatible Pokémon's Learned Move Pool. The player then
  reconfigures the active 4.
- **Compatibility:** each TM carries a `compatibleSpecies` list; incompatible targets are greyed out, never
  hidden.
- **Where:** applied from the Map View, out of combat. A TM never enters the combat consumable pile.
- **Mastery is exempt** — no TM can touch the 5th slot.

Fifteen TMs, with their compatibility lists: §7.5 and [`catalogs/tms.md`](catalogs/tms.md).

## §6.4.2 The Dojo

The Dojo is a **paid map node**, roughly one per Region, that teaches two things (§2.9.4):

- An **off-learnset move** from the Pokémon's stage-appropriate tutor list — the moves it would never learn
  naturally. 150 ₽.
- An **ability** from the species' pool, setting or replacing the single passive slot. 200 ₽.

There is no offer cap: every available tutor move for that stage is listed, minus what the Pokémon already knows.
Tutor lists are stage-aware (§6.4.3), so evolving changes the menu.

> *v0.3 substitution.* There is no money until v0.4, so a visit carries **one service** rather than a purse.
> The decision the node exists to force — which Pokémon, and which of the two services — is unchanged; only the
> currency is missing. Prices replace the credit when the economy lands.

The Dojo is the run's main money sink and its main deliberate-sculpt stop. Pokémon Centers do **not** tutor;
they heal and treat Trauma only.

---

# §6.5 Abilities

An ability is an always-on passive: no AP, no card slot, one per Pokémon.

## §6.5.1 How a Pokémon gets one

Each species carries an **`availableAbilities` pool** of 1–4 entries — the abilities that suit it.

| Event | What happens |
|---|---|
| **Base form** | No ability, or occasionally a trivial one |
| **First evolution** | The Pokémon is granted the **first entry of its pool** automatically |
| **The Dojo** | Sets or replaces the passive slot with **any** entry from the pool, including swapping back |

The hybrid exists because the two pure designs both fail: auto-granting everything makes the Dojo pointless, and
granting nothing means a Pokémon has no passive at all unless the map happens to offer a Dojo. This way every
evolved Pokémon has an identity, and the Dojo's job is what it should be — **changing** that identity on purpose.
*(Decided 2026-09-19.)*

Ability pools never contain two entries with the same hook (no "which +15 % is better" non-choice), and every
pool contains at least one defensive or utility option so the Dojo is a fork rather than a damage upgrade.

The pool's **third** entry is the line's hidden ability: listed, greyed, and locked until the line's Bond reaches
rank 3 (§6.8.3).

## §6.5.2 Categories

| Category | Does | Example |
|---|---|---|
| **Combat** | Modifies damage, AP or draw under a condition | Torrent: Water moves +20 % below 30 % HP |
| **Vision** | Reveals enemy information | Keen Eye: all Unknown intents revealed at combat start |
| **Positional** | Changes Lead or swap behaviour | Intimidate: on entering Lead, all enemies Attack −1 |
| **Type** | Immunity or altered interaction with a type | Levitate: immune to Ground |
| **Survival** | Changes faint or damage thresholds | Sturdy: survive one lethal hit per combat at 1 HP |
| **Status** | Immunity to, or exploitation of, a condition | Immunity: cannot be Poisoned |
| **Support** | Helps the rest of the team | Healer: heal a bench ally 3 HP at turn end |
| **Aura** | Grants a Lead Aura while this Pokémon leads | §6.5.4 |

## §6.5.3 Key designs

### §6.5.3.1 Keen Eye *(Vision)*
While this Pokémon is in the Active Team, every Unknown intent is revealed at combat start, for the whole run.
Stacks conceptually with the Marsh Badge and Radar Scope into a full vision build.

### §6.5.3.2 Foresight *(a move, not an ability)*
A 0-AP Utility card that reveals every Unknown intent **for the current turn**. Deliberately the active,
repeatable counterpart to Keen Eye's passive, permanent version — two different build axes, one costing a card
and a draw, the other costing an ability slot.

### §6.5.3.3 Levitate *(Type)*
Treated as non-grounded: immune to Ground moves, unaffected by Electric Terrain's bonus and its Paralysis block.

### §6.5.3.4 Torrent / Blaze / Overgrow *(Combat, starter lines)*
Below 30 % HP, that Pokémon's moves of its primary type deal **+20 %**. Granted at the first evolution.

### §6.5.3.5 Intimidate *(Positional)*
On entering the Lead slot — by manual swap, Step-Forward or faint replacement — every enemy's Attack drops one
stage. It rewards exactly the play Pillar 2 is about.

## §6.5.4 Lead Aura

**Not a default mechanic.** A Pokémon has a Lead Aura only through a specific ability or a **Type Plate** held
item (§7.4.3).

**Effect:** while the wearer is the Lead, every **bench** Pokémon's moves of the Aura's type deal **+5 %**.

It activates the moment the Pokémon enters the Lead slot and ends when it leaves, shown as a persistent icon
under the portrait. Auras stack additively — an ability aura and an item aura on the same Pokémon give +10 %, and
auras of different types apply independently.

Lead Aura adds a fourth question to the swap decision: who absorbs, what comes online, what it costs, and **what
the bench gains**. It stays an opt-in build pillar rather than a background rule.

---

# §6.6 Ability catalogue

Thirty-eight abilities across the eight categories, each mapped to the simulation hook it needs. The full table —
id, effect, hook, parameters and which species pools carry it — is
[`catalogs/abilities.md`](catalogs/abilities.md).

**Live in the current build (12):** Overgrow · Blaze · Torrent · Tough Claws · Snipe · Shell Armor ·
Compound Eyes · Keen Eye · Sturdy · Healer · Iron Shell · Swift Swim.

Adding an ability means picking an existing hook or adding one; a new hook is a simulation change, not just
content. The hook vocabulary is listed at the top of the catalogue.

---

## §6.5.5 Pre-evolution passives

Around 70 % of base forms have **no** ability; the remaining 30 % have a minor one where it is part of the
species' identity (Magikarp's Swift Swim). The first evolution always grants something meaningful.

---

# §6.7 The Learned Move Pool

Each Pokémon accumulates a pool of moves and contributes **4** of them as cards.

## §6.7.1 How the pool grows

| Source | Effect |
|---|---|
| **Levelling** | The species' learnset adds a move at each listed level (§6.9) |
| **Evolution** | Upgrades entries in place and may add one (§6.3.5) |
| **TMs** | Add one move |
| **The Dojo** | Adds one off-learnset move |

**Moves are never removed.** An upgrade replaces its entry in place — same slot, better version — and the pool
deduplicates, so learning Surf from a TM and then gaining Surf from an evolution leaves one Surf.

Nothing forgets. A late-run pool of eight or nine entries is the *reward*, and the fixed active-4 budget is
where the pressure lives.

## §6.7.2 Configuring the active 4

From the Move Manager, reachable from any Pokémon's detail view in the Map View, **out of combat, between nodes,
free and unlimited**.

- The active 4 are the cards that Pokémon contributes to the skill deck.
- The Mastery Move is always the 5th and cannot be toggled off (§5.13.2).

## §6.7.3 Auto-upgrade on evolution

If an upgraded move **was** in the active 4, its evolved version takes that slot. If it was benched in the pool,
it upgrades quietly. Either way the player sees the diff and may reconfigure before leaving the screen.

## §6.7.4 Why it works this way

Every addition is a **net gain** — no source ever forces a replacement. The trade-off lives entirely in the
active-4 budget, so a TM feels like a gift rather than a dilemma, while the deck stays exactly as intentional as
the player made it. That is "synergy is sculpted, not drafted" expressed as an inventory rule.

---

# §6.8 Bond — a line gets better by being played

Each evolution line has a **Bond**, tracked per account (§8.9), that grows with what you do *with* it and opens
one concrete thing on the line at each of five ranks: its Mastery Move tiers, its Shiny palette, its hidden
ability, and at the top the right to start a run. Charmander, Charmeleon and Charizard share one Bond.

Bond replaced two overlapping systems on 2026-09-21 — Pokédex tiers earned by *knocking out* the species, and
Mastery levels earned by species-specific achievements. The first read backwards to the first player who met it
("do I have to kill it? with it?"), the second was a hundred authored quests for a feeling the play itself
already produces. What the player wanted was to feel a Pokémon improve *poco a poco, run a run*, by playing it;
Bond is that, and nothing here is a point of damage: every unlock is a card, a palette, an option or a door.

## §6.8.1 Bond points

Earned by a line while it is in the **Active Team**:

| What you did with the line | Bond |
|---|---|
| Won a fight | +1 — and +1 more for the member that led the most turns of that fight |
| Evolved | +5 |
| Recruited it (first of the line this run) | +2 |
| Finished a run with it | +8 |
| Won a run with it | +15 (replaces the +8) |

A first run with a starter leaves it at roughly 30: rank 2 on the first evening, rank 3 on the second, rank 5
around the fifth. The numbers are tunable; the anchor is **one run ≈ one rank early on, and Soulbound is a
commitment of several runs, not one lucky one.**

## §6.8.2 Ranks and unlocks

| Rank | Bond | Name | Opens on the line |
|---|---|---|---|
| 1 | 5 | Companion | **Mastery Move Lv1** — the fifth card (§5.13.2) |
| 2 | 15 | Trusted | **Shiny** — your copies wear the official shiny palette |
| 3 | 35 | Veteran | **Hidden ability** (§6.8.3) |
| 4 | 60 | Deep Bond | **Mastery Move Lv2** (the stage still caps it: middle stage or a two-stage final) |
| 5 | 100 | Soulbound | **Mastery Move Lv3** on a three-stage line; on a two-stage or single-stage line the Mastery card is dealt into **every opening hand**. Either way the line **may start a run** (§8.5.2) |

Rank-ups are folded by the account the moment the event lands (§8.10), so a rank crossed mid-run applies from
the next fight. Crossing a rank pays no Trainer XP — Bond is the line's, XP is the trainer's.

## §6.8.3 Hidden abilities

Every line's catalogue row authors **three** abilities (`catalogs/species-r1.md`). The **third is the hidden
one**: it sits in the pool, the Dojo lists it greyed and named as hidden, and it opens at Bond rank 3. The first
entry is still what the first evolution grants (§6.5.1); the second is the Dojo's choice from the start.

Six lines' third abilities are not authored yet (Rain Dish, Infiltrator, Arena Trap, Weak Armor, Sheer Force,
Gluttony — each waits on a system of v0.7); their rank-3 slot says so, and the rank still grants the rest.

## §6.8.4 Power targets

| Tier | Power | AP | Modifiers |
|---|---|---|---|
| **Lv1** | 60–80 | 1 | None — the clean, always-useful fallback |
| **Lv2** | 85–110 | 1–2 | One positional modifier or one rider |
| **Lv3** | 110–140 | 2–3 | A composite, species-unique effect no other card can replicate |

A Mastery Move must beat the base learnset at equal AP and feel species-defining. The full 24-line catalogue:
[`catalogs/mastery-moves.md`](catalogs/mastery-moves.md).

---

# §6.9 The level-gated learnset

- A base form **knows 2 moves at level 1**.
- Each species has an ordered learnset of `(level, move)` entries; a Pokémon knows every entry at or below its
  current level.
- **Deck contribution = `min(known, 4)`.** The active-4 cap never changes, and Mastery remains the 5th.
- Known moves are read from the **whole evolution line**, base form first. An evolved form's own learnset
  starts above its pre-evolution's threshold, so without this a freshly-evolved Pokémon would know nothing.
- **A level-up adds to the pool and fills a free slot; it never evicts a card the player chose.** Past four,
  a newly learned move waits in the pool until the Move Manager swaps it in (§6.7.2) — which is the fixed
  budget doing its job. The Reward screen names what is waiting so nothing looks lost.
- **The auto-pick** (the Move Manager's *Auto*, and the kit a recruit arrives with) keeps the two strongest
  attacks, then fills by recency, then guarantees one Ranged card if the pool has one. All three clauses were
  paid for: "the four newest" alone stripped Oddish of Absorb, its only card that hurts a Rock; and picking
  purely by power gave a Vanguard Charmeleon four Melee cards, a dead hand on the bench (§6.3.6.5), which cost
  the Fire line two thirds of its win rate before the whole-run harness caught it.
- Learnset levels are **clamped below the stage's evolution level**, so evolving early never loses a move. A
  content test enforces it.
- A recruited wild derives its known moves from its spawn level, so a Region 2 catch arrives with a full kit.

**What this produces.** A run opens with one Pokémon and a **two-card deck**. It thickens as you recruit — about
six cards with a full base-form team — and reaches twelve by Gym 1 as those Pokémon level into their four-move
kits. The deck growing *is* the early game's sense of progress, and it is why the natural learnset is
deliberately lean: scarcity is what makes the Dojo, TMs and evolution matter.

> **Legacy field.** `PrimaryAbility` was the pre-pool auto-grant field, retained only for save compatibility.
> New and updated species populate `availableAbilities` (§6.5.1).

---

# §6.10 Implementation state

**Built (v0.2):** XP and the distribution split, the level curve, stat growth, line-aware level-gated
learnsets, and evolution at the threshold.

**Built (v0.3):** the branch choice and the Evolution screen (§6.3, §3.6) — 63 branches over 24 species, ported
from [`catalogs/species-r1.md`](catalogs/species-r1.md) · the Learned Move Pool and the Move Manager (§6.7) ·
TMs (§6.4.1, three of the fifteen) · the Dojo as a map node with its tutor and ability services (§6.4.2,
§6.4.3) · abilities as a swappable pool with six new simulation hooks (§6.5.1, §6.5.2).

**Still open.** Ten branch payloads print an effect the sim cannot express yet — recoil, deterministic
multi-hit, escalating Poison, on-kill triggers and the three team-wide guards — and ship at their catalogued
power with that clause omitted; they are listed in [`catalogs/moves.md`](catalogs/moves.md) and land with v0.4.
Four lines' canonical first pool entry (Oddish's Chlorophyll, Diglett's Sand Veil, Magikarp's Swift Swim,
Psyduck's Cloud Nine) is inert until the system it needs exists, so those Pokémon evolve into a passive that
does nothing yet; the Dojo says so on the card and can swap it for one that works — except Psyduck, whose whole
pool waits on v0.7 field effects.
Current state: [`implementation-status.md`](implementation-status.md).

---

## §6.4.3 Tutor learnsets are stage-aware

Each species **stage** carries its own tutor learnset, not the line. Evolving changes what the Dojo offers:
Squirtle sees Squirtle's list, Blastoise sees Blastoise's. Delaying an evolution to take a pre-form tutor move is
a legal and intended play; you simply lose access to the evolved list until you evolve and visit again.
