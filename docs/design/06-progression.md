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
| Wild | 29 | `ProgressionConfig.wildXp` |
| Trainer | 43 | `trainerXp` |
| Elite | 66 | `eliteXp` |
| Gym Leader | 120 | `gymXp` |

These are for the first enemy; **every enemy past the first pays 50 %** (`extraEnemyXpShare`). **v0.8.6, the user's
call ("a mega nerf"):** groups are the rule since v0.8.5, and with every Pokémon of a trio paid in full (48 / 72 /
110 / 200) a team stood at Lv 14–15 after four nodes and seven levels over its Gym. The values are now ×0.6 with the
extras at half, which puts the team at the route's level — about Lv 9 after four nodes, a level or two over the
wild band at every layer (measured, the harness's per-layer trace) — and the enemy side was retuned to match
(§2.2.1's tiers, the Elite's and the Gym's premiums), so the curve holds where it was. The values are set by the arc in §6.2.4, not chosen for feel: a seven-node Region has to
carry a Lv 5 starter to roughly Lv 14 by the Gym. The first values tried (30/45/80/140) landed the team at
Lv 11 and made the Gym unwinnable for two of the three starters. `src/sim/balance/runBalance.test.ts` is the
check — change a number here and read the table, do not reason about it.

**Measured (v0.8.10, 720 runs, `balance/report.test.ts`).** A won fight pays each active Pokémon about **29 / 73 /
94 / 166** XP in Region 1 (wild / trainer / Elite / Gym), **31 / 72 / 120 / 236** in Region 2 and **37 / 82 / 149 /
307** in Region 3 — the level-gap scaling keeps a wild fight worth about the same all run, and the big fights grow.
The active team goes **Lv 5 → 15** across Region 1, **17 → 24** across Region 2 and **26 → 32** across Region 3, and
stands over what it fights by **+0 → +2** in Region 1 (it starts level with the route and pulls ahead), **+2** all
through Region 2 and **+1** through Region 3; the Box stays within half a level of the team. Region 2's and Region
3's bands moved up two levels to get there (§2.6.5): before, the team entered Region 2 four levels over. **Still
open:** every Gym's ace sits one or two levels *under* the team (+2.2 / +1.7 / +0.2) and its others well under — the
Gym is a threat by its Attack (§5.9.3), not its levels, on purpose: a higher level premium paid the team more XP and
made the run easier (v0.8.8).

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
  recruits arrive at Lv 14–22 and every basic evolves at 12, so the catch is where a Region 2 Pokémon chooses its
  branch — the same beat as levelling into it, one fight earlier. *(v0.7.3.)*

> *Changed 2026-09-19 (v0.3).* This section used to say evolution was player-initiated and that delaying it was
> a legitimate tactic, which contradicted §6.2.2. §6.2.2 is right and this now matches it: the level-up
> applies the evolution, the player picks the archetype. Delaying stays meaningful in exactly one place — a
> stone (§6.3.2) lets a line evolve *earlier*, and a stage-aware tutor list (§6.4.3) gives a reason to buy
> before you evolve rather than after.

## §6.3.2 Evolution Items

Five stones exist: Fire, Water, Thunder, Leaf, Moon (§7.2.5).

A stone lets its line evolve **earlier** than its level threshold: a basic **from level 8** (evolving at 12
otherwise), a middle stage **from level 18** (at 26 otherwise). It is applied from the Move Manager between
nodes — on the map, in a City lobby or at the Dojo — and opens the ordinary Evolution screen (§6.3.3) there and
then. Single use.

| Stone | Lines |
|---|---|
| Fire | Eevee → **Flareon**, Vulpix, Growlithe |
| Water | Eevee → **Vaporeon**, Shellder, Staryu, Poliwhirl |
| Thunder | Eevee → **Jolteon**, Pikachu |
| Leaf | Exeggcute, Gloom, Weepinbell |
| Moon | Clefairy, Jigglypuff, Nidorina, Nidorino |

For **Eevee** the stone also *is* the branch: the Evolution screen offers only the Eeveelution it makes. Every
other line keeps all its archetypes on a stone's screen. The level path always still exists.

*Why tempo and not a stone-only branch (v0.7.5, replacing the 2026-09-19 "opens the stone-specific branch"):*
every stone line's branches are already its whole identity — Gloom's three, Poliwhirl's three. A branch that only
a stone opens either takes one away from the level path, turning an option into a wall, or needs a fourth branch
no other line has. What a roguelike cannot otherwise buy is **time**: four levels in Region 1, eight across Region
2. In a roguelike you cannot farm for an item, so a stone must be an opportunity and never a wall. The lines are
Gen I's stone evolutions, all of them now that every species is built.

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

**The archetype's lean** (v0.9.6, the user's call: two paths of one evolution should not make the same Pokémon). The
species gives the stats; the path tilts them a few points, and every tilt is a trade rather than a free gain:

| Archetype | HP | Attack | Defence | Speed |
|---|---|---|---|---|
| Vanguard | +5 % | +3 % | −3 % | — |
| Specialist | −4 % | +5 % | −4 % | +5 % |
| Support | +5 % | −5 % | +5 % | — |

Only the latest evolution's archetype counts. Attack carries the smallest share on purpose: fights here are races, so a
point of Attack is worth more than a point of Defence — measured, a net-zero lean of ±5 % Attack doubled the Challenge
Ring's ladder (§2.9.4.1). The numbers are `ARCHETYPE_STAT_BIAS` (`sim/combat/stats.ts`), and the Evolution screen shows
each path's result as it is pointed at.

## §6.3.5 What an evolution actually does

Evolution operates on the **Learned Move Pool** (§6.7) and **rewrites it rather than piling onto it** (v0.9.5, the
user's call: lines learned too many moves, and an evolution should keep the count, not raise it).

**The caps are data and every species is checked against them** (`MOVE_CAP`, v0.9.9): a form holds at most **5**
cards on any path through its line, learns at most 5 by level, and offers at most 3 tutor and 3 egg moves — at most
**12** cards in all with its Mastery Move. `content.test` walks all 151, every path, on every check.

**The payload, per evolution:**

1. **Stat upscale** — the new species' base stats and growth take over.
2. **The first evolution upgrades up to two slots and adds one card** — a pool move is replaced in place by a
   better one (Vine Whip → Razor Leaf), and one new move arrives. If an upgraded move was in the active 4, the
   upgrade takes that slot automatically.
3. **The final evolution swaps one to three slots and adds none** — this is where the archetype's **signature**
   arrives, in the place of a card the line has outgrown (a Vanguard Venusaur's Vine Whip slot becomes Petal Dance).
   A two-stage line's single evolution is a first one: two upgrades and an addition, the signature among them.

That is the whole payload, deliberately: an evolution that rewrote six moves at once was unreadable in the preview.

**Slots, not names.** A payload names a slot by the move that first held it, so a final evolution's swap lands on
whatever the first evolution made of that slot — a Specialist Ivysaur's Razor Leaf and a Support Ivysaur's Vine
Whip both become a Specialist Venusaur's Razor Leaf+. A swap may change the card's kind outright: that is how a branch
deletes a move for another (the user's idea, 2026-10-08). A swap whose slot the Pokémon never learned arrives as a gift.

**Pool size over a run — a contract, walked over every branch path by a content test**

| Point | Pool |
|---|---|
| Base form at recruitment | 2 moves |
| Base form, fully levelled | 4 |
| After first evolution | 5 |
| After final evolution | 5 |
| Plus TMs, the Dojo and egg moves | 6–8 |

The **active 4 never grows**, and with five cards from the line there is always one choice to make in the Move
Manager — the TMs and the Dojo add the rest. *(Before v0.9.5 a line learned some twelve moves by level and its
branches added more; a final form sat on eight or nine, most of them never played.)* Magikarp is the one exception:
Splash and Tackle, all it ever learned in Gen I, until Gyarados.

## §6.3.6 Move-kit construction rules

Every kit is built to these rules so that kits stay coherent and the hand stays playable. A **single-stage**
species follows the *final*-stage template, not the base-form one — it is already what it is going to be, which
is the same reason it gets +25 % growth (§6.2.3).

### §6.3.6.1 Base form
- **Four moves**: 2 at level 1 (§6.9) and two more by the evolution level — the species' own Gen I moves where they
  fit the kit.
- 1–2 Offensive moves, mixing Melee and Ranged by species; 1–2 Defensive or Utility.
- 0 positional modifiers — rarely 1 where the species demands it. AP range 0–3.

### §6.3.6.2 Middle stage — five cards
- Two upgrades and one addition per archetype: a Vanguard reaches for heavier Melee, a Specialist for Ranged power
  and riders, a Support for status, stages and heals.
- AP range 1–3.

### §6.3.6.3 Final stage — five cards
- One to three swaps per archetype, the signature among them; at least one high-power card, possibly a 4-AP ultimate.
- AP range 1–4.

A **single-stage** species learns its five by level — two at level 1, three more by level 24 (a legendary by 40).

### §6.3.6.4 The power budget *(a contract, not a guideline)*

| AP | Melee power | Ranged power |
|---|---|---|
| 0 | — *(utility only)* | — |
| 1 | 40–50 | 45–55 |
| 2 | 60–75 | 65–90 |
| 3 | 85–100 | 90–100 |
| 4 | 110–130 | 115–130 |

A move carrying **both** a modifier and a rider sits at the bottom of its band, and so do Gen I's high-critical moves
(Karate Chop, Razor Leaf, Crabhammer, Slash), which crit every time here. A `cleave` move counts as ~1.6× its printed
power; recoil, a rampage's self-Confusion and a sacrifice are budgeted apart, and so are Mastery tiers (§6.8.4). A
content test enforces the bands — decided 2026-09-19, and made real in v0.9.5, when every move was re-cut from its
Gen I numbers.

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
rank 2 (§6.8.3).

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

**An evolution rewrites, it does not pile on** (§6.3.5): an upgrade or a swap replaces its entry in place — same
slot, the new card — and the pool deduplicates, so learning Surf from a TM and then gaining Surf from an evolution
leaves one Surf. A level-up teaches only what its new levels reach, so a move an evolution has rewritten is never
learned again.

The line gives five cards against the four slots; the TMs, the Dojo and egg moves are what grow a pool past it.

## §6.7.2 Configuring the active 4

From the Move Manager, reachable from any Pokémon's detail view in the Map View, **out of combat, between nodes,
free and unlimited**.

- The active 4 are the cards that Pokémon contributes to the skill deck.
- The Mastery Move is always the 5th and cannot be toggled off (§5.13.2).

## §6.7.3 Auto-upgrade on evolution

If an upgraded move **was** in the active 4, its evolved version takes that slot. If it was benched in the pool,
it upgrades quietly. Either way the player sees the diff and may reconfigure before leaving the screen.

## §6.7.4 Why it works this way

A TM, the Dojo or an egg move is a **net gain** — none forces a replacement — so it feels like a gift rather than a
dilemma, and the trade-off lives in the active-4 budget. The line itself stays at five, so each of those gifts is
the card that sharpens the choice: "synergy is sculpted, not drafted" expressed as an inventory rule.

---

# §6.8 Bond — a line gets better by being played

Each evolution line has a **Bond**, tracked per account (§8.9), that grows with what you do *with* it and opens
one concrete thing on the line at each of four ranks: its Shiny Charm, its hidden ability, its whole Mastery
Move, and at the top the right to start a run. Charmander, Charmeleon and Charizard share one Bond.

Bond replaced two overlapping systems on 2026-09-21 — Pokédex tiers earned by *knocking out* the species, and
Mastery levels earned by species-specific achievements. The first read backwards to the first player who met it
("do I have to kill it? with it?"), the second was a hundred authored quests for a feeling the play itself
already produces. What the player wanted was to feel a Pokémon improve *poco a poco, run a run*, by playing it;
Bond is that, and nothing here is a point of damage: every unlock is a card, a palette, an option or a door.

## §6.8.1 Bond points

Earned by a line while it is in the **Active Team**:

| What you did with the line | Bond |
|---|---|
| Won a trainer or Elite fight | +1 — and +1 more for the member that led the most turns of that fight |
| Won a Gym — a Region cleared together | +4 (and the lead's +1) |
| Won a wild fight | **nothing** |
| Evolved | +5 |
| Recruited it (first of the line this run) | +2 |
| Recruited a **shiny** of it (§5.14) | +10 |
| Finished a run with it | +8 |
| Won a run with it | +15 (replaces the +8) |

**The pace — linear (v0.9.1, the user's call: "every rank costs the same").** A line in the Active Team earns about
20 a run; every rank costs **100** (`BOND_TIER_COST`), so the ranks sit at **100 · 200 · 300 · 400** and a line
played every run reaches them after about **5 / 11 / 16 / 21 runs** — measured as a career, one account and many
runs in a row with the account's own perks playing into each (`balance/bondCareer.test.ts`). A line recruited
every other run takes about twice that, and the lines that are hard to find never get there by accident: that is
the point of the top rank. After 30 runs an account holds about two Soulbound lines. The first reward arrives after
about five runs; until then the bar and the **+N Bond** on every reward screen carry the progress. *History:* a first cut of v0.9.1
had five ranks at 10 · 40 · 110 · 200 · 360, quick at the bottom; before it, +1 a fight with ranks at 5 · 15 · 35 ·
60 · 100 made every played line Trusted inside its first run. A wild fight pays nothing because it is the filler
between the fights that mean something; the Gym pays a Region.

## §6.8.2 Ranks and unlocks

| Rank | Bond | Name | Opens on the line |
|---|---|---|---|
| 1 | 100 | Companion | **Shiny Charm** — every new copy of the line may be shiny: its wild ones ×3 as often, and its starter, Safari catch or trade at that charmed chance (§5.14) |
| 2 | 200 | Trusted | **Hidden ability** (§6.8.3) |
| 3 | 300 | Deep Bond | **Mastery Move** — the whole of it at once: the fifth card at every stage of the line, Lv1 on the base form to Lv3 on a three-stage final (§5.13.2) |
| 4 | 400 | Soulbound | **The line may start a run** (§8.5.2). A line that could already — a default starter or a Poké Mart one — gets **its starter always shiny** instead |

**Four ranks, one thing each (v0.9.1, the user's design).** A look first, a choice at the Dojo second, the line's full
kit third, the line as your partner last. **The Mastery is one unlock**, not three: "unlock the Pokémon's whole
potential, in all its evolutions" — the stage decides which card the slot holds, the Bond only whether it holds one.
That first cut handed out the first Mastery card in a line's first run and split the rest across two more ranks,
with a "Mastery card in every opening hand" rule for two-stage lines at the top; both are gone. **A starter line's
Soulbound is a shiny start** (the user, 2026-10-06): Bulbasaur, Charmander, Squirtle and the Mart's Magikarp, Eevee and
Pikachu can start a run without any Bond, so their rank 4 strikes "can start a run" and makes the starter always shiny;
every other line's rank 4 is the right to start one, and nothing more. **The Poké Mart still sells Magikarp, Eevee and
Pikachu** (§8.3.4): buy the starter now, or earn it — the player's choice.

Rank-ups are folded by the account the moment the event lands (§8.10), so a rank crossed mid-run applies from
the next fight. Crossing a rank pays no Trainer XP — Bond is the line's, XP is the trainer's.

## §6.8.3 Hidden abilities

Every line's catalogue row authors **three** abilities (`catalogs/species-r1.md`). The **third is the hidden
one**: it sits in the pool, the Dojo lists it greyed and named as hidden, and it opens at Bond rank 2. The first
entry is still what the first evolution grants (§6.5.1); the second is the Dojo's choice from the start.

Every line's third is authored (v0.7.5). The six that had waited were rewritten for the combat the game has,
rather than for the one they were first imagined against:

| Line | Hidden | What it does |
|---|---|---|
| Squirtle | **Rain Dish** | Each Water move it plays restores 1/16 of its HP — the rain it makes, drunk back |
| Zubat | **Infiltrator** | Its moves ignore a target's *raised* Defence (a lowered one still counts) |
| Diglett | **Arena Trap** | While it leads, every enemy loses 1/16 of its HP at the end of each turn |
| Onix | **Weak Armor** | When a hit lands on it: Defence −1, Attack +1 |
| Krabby | **Sheer Force** | Moves carrying a rider for the foe deal +20 %; the rider still rolls |
| Snorlax | **Gluttony** | Healing items used on it restore 50 % more |

*Why rewritten:* Rain Dish waited on weather and Infiltrator on Home Fields (both v0.8.4), and Arena Trap
traps a Pokémon that wants to flee — nothing an enemy here ever does. Each keeps the franchise's picture (a
Squirtle that feeds on its own water, a Diglett whose ground swallows its foes, a Zubat that slips past a guard)
in a rule that works today. A hidden ability is a Bond reward; one that does nothing until a later version is a
reward that lies.

## §6.8.4 Power targets

| Tier | Power | AP | What it is |
|---|---|---|---|
| **Lv1** | the move's own | the move's own | A Gen I move the line's kit never holds — the species' iconic finisher (Charmander's Fire Blast, Squirtle's Waterfall) |
| **Lv2** | 100 | 2 | Its **+**: the riders kept, the charge-up gone |
| **Lv3** | 130 | 3 | Its **++** |

Since v0.9.5 every tier is a Gen I move and its + and ++ (the user's call): a Mastery is the line's own move made
great, not an invented one, and a content test keeps it out of every path the kit can take. The bands are 85–110 at
1–2 AP for Lv2 and 110–140 at 2–3 AP for Lv3, enforced. A Super Fang tier takes 65 % and 80 % of the foe's HP instead. The full 24-line catalogue:
[`catalogs/mastery-moves.md`](catalogs/mastery-moves.md).

---

# §6.9 The level-gated learnset

- A base form **knows 2 moves at level 1** and **4 by its evolution level**. An evolved form has no learnset of its
  own: its kit is its base form's, rewritten by the evolutions (§6.3.5).
- Each species has an ordered learnset of `(level, move)` entries; a Pokémon knows every entry at or below its
  current level.
- **Deck contribution = `min(known, 4)`.** The active-4 cap never changes, and Mastery remains the 5th.
- **One met already evolved** — a wild Ivysaur, a Gym's Venusaur, a recruit caught above its threshold — took its
  stage's first branch at every step, so it holds the same five cards a player's would.
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
- A level-up teaches only the learnset entries its new levels reach (v0.9.5): before, it re-taught every move at or
  below the level, and a move an evolution had upgraded came back.

**What this produces.** A run opens with one Pokémon and a **two-card deck**. It thickens as you recruit — about
six cards with a full base-form team — and reaches twelve by Gym 1 as those Pokémon level into their four-move
kits. The deck growing *is* the early game's sense of progress, and it is why the natural learnset is
deliberately lean — four by level, one more by evolution: scarcity is what makes the Dojo, TMs and evolution matter.

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
