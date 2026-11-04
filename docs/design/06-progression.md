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
| Wild | 22 (v0.9.95; 26 before) | `ProgressionConfig.wildXp` |
| Trainer | 24 (v0.9.95; 39 before — a trainer was two levels at Lv 10) | `trainerXp` |
| Elite | 49 | `eliteXp` |
| Gym Leader | 28 | `gymXp` |
| Elite Wild, Victory Road's Gauntlet and Apex | 66 | `apexXp` |
| A League door | 120 | `leagueXp` |

*(v0.9.95, the user's playtest: "Lv 18 at the point of no return; trainers above all give a lot". A trainer already pays
for every Pokémon it sends and stood over the team, so its rate came down to about the wild's per Pokémon; with the enemy
levels lowered too (§2.7.3), the harness reaches the point of no return at Lv ~12 where it stood at ~15.)*

*(2026-10-20: the Elite and the Gym 66 → 49 and 120 → 80, when their levels came up to stand over the team (§2.8.1,
§5.9.3): the level factor below pays a foe over the team more, and the base came down by as much, so the team reaches
each Gym at the level it did. The boss-wilds and the League kept their levels and their pay.)*

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

Level-ups are processed **between nodes**, never mid-combat. The fight's result (§9.4.5) shows the XP bar
fill, applies the stat increase immediately — the Max HP a level adds is added to current HP as well, as in the series,
so a wounded Pokémon is not left further from full by levelling (a fainted one stays fainted) — and **offers evolution to any Pokémon that crossed its threshold** (§6.2.4) — as
the series' surprise, on Continue: nothing on the result says one is coming.

Evolution can be **postponed** (§6.3.1; user decision, 2026-10-30). The current form keeps its existing stats and
learnset until the player evolves it; its own learnset still ends below the threshold (§6.9). Resuming later
applies the chosen branch and catches up the evolved form's learnset without replacing the chosen active four.

## §6.2.3 Stat growth

**The series' own formula** (v0.9.96, the user's call: "the stats are very unbalanced between Pokémon — Diglett and
Onix do nothing, some enemies have far more HP than others"). Gen III's, with the mean individual value and no EVs:

```
stat(level) = (2 × base + IV) × level / 100 + 5                 IV = 15 (STAT_FORMULA)
HP(level)   = (2 × base + IV) × level / 100 + level + 10
```

The flat terms are the point. A purely proportional curve (v0.9.10–v0.9.95: `base × (1 + 0.025 × (level − 1)) × 0.5`)
kept every species at its base's ratio at every level, so Diglett had 7 HP to Snorlax's 90 at Lv 5 (×13) and a frail
species was one hit from anything. The series' `+ level + 10` and `+ 5` bring the extremes together where levels are
low — 16 HP to 31 at Lv 5 (×2) — and the base takes over as the level climbs, as it does in the games. The level term
is the other half: a Lv 15 stands at about twice a Lv 5, where the old curve gave it a quarter more, so a level is
worth what it is in the games and a level gap (an Elite, a Gym's ace, the Ring) counts. Two Pokémon of one species
and level are the same Pokémon: there are no rolled IVs. The archetype's lean (§6.3.4) multiplies the result.

The base is the species' own (§4.1.5.1: Attack the higher of Gen I's Attack and Special, Defence their mean), so a
final form stands above its pre-evolution at the same level and a single stage or a Legendary carries its higher
total, with no bonus on top. The damage formula took the series' shape with it (§4.1.1): the level term in front, the
+2 behind, so a fight lasts as many turns at Lv 40 as at Lv 10. Every flat HP amount is read against these numbers —
a Potion's 10 is a third of a Lv 10 bar (§7.2.2) — and a level-free reading (the rhythm's Speed, §4.1.3.1) runs the
formula backwards (`baseOfStat`). *(v0.9.93–v0.9.95 printed the proportional curve at half scale; v0.9.10–v0.9.92 at
full scale; until v0.9.10 each line had a flat growth per level.)*

The XP curve is `xpToNext(L) = 32 + (L − 1) × 1.2` (`levelUpBaseXp`, `levelUpSlopeXp`), to the series' Lv 100 —
steep at the start and flat later, so Lv 5 → 6 costs 37 and Lv 44 → 45 costs 84. *(v0.9.92, the user's call of 2026-11-03:
"two trainer and wild nodes and I was Lv 14". The `8 + 2(L − 1)` before cost 16 at Lv 5, a third of one trainer's pay.)*
*(v0.9.90: the levels stretched by 1.4 (§6.2.4), and the rate, the HP per level and the curve came down by the same
factor — 0.035, 1 and 12 + 4(L − 1) before — so a Pokémon at the same point of the run has the stats and the XP to its
next level it had at the compressed level.)*

## §6.2.4 The intended arc

**Evolution levels are the series' own** (v0.9.90, the user's call of 2026-11-03: "evolve at the original games' rate,
no level squish"): each species takes its Gen I level and its Gen I method — a level, a stone, the held item a trade
line levels up with (§6.3.8), or Friendship (§6.3.9). The run's level axis stretched to hold them, not its difficulty:

**The team's arc** (v0.9.92, the user's call of 2026-11-03): about **Lv 18 at the end of Region 1, 30 at the end of
Region 2 and 45 at the end of Region 3**. Measured (720 runs, the harness's per-layer trace): the active team stands
at Lv 7.5 at layer 4, 12.4 at layer 10 and **18.3** going into Gym 1 (19.7 out); **30.7** into Gym 2 (31.9 out); **43.6**
into Gym 3 (44.6 out) — level with the Region's foes the whole way, where the `8 + 2(L − 1)` curve had it at 9 / 14 / 20.5
/ 32.5 / 44, two or three levels over Regions 1 and 2. The Gym pays 28, not 80: its five Pokémon stand over the team, and
at 80 the Gym alone was four levels. Region Attack tiers came down to hold the run's shape (§2.2.1).

| Stretch | Wild | Its Gym's ace |
|---|---|---|
| Region 1 | 5–18 | ~21 |
| Region 2 | 19–30 | ~36 |
| Region 3 | 33–44 | ~49 |
| League | — | the Champion's ~63 |

Every authored level moved by `L' = round(1 + 1.4 (L − 1))` — the old compression was Gen I's 16 → 12 and 36 → 26, a
factor of 1.4 — and every gap between two levels by ×1.4 (§6.2.3 brought the stats down by the same factor).

So the team evolves **staggered across the run**, each member at its own moment, and the deck rewrites itself all the
way to the League rather than twice: Caterpie and Weedle early in Region 1 (7 / 10), the starters, Abra and the Nidoran
at 16, Pidgey 18, Rattata and Magikarp 20, Oddish and Bellsprout 21 — Geodude and Gastly 25, Machop 28, Dratini and
Magnemite 30, Ivysaur 32 in Region 2 — Charmeleon and Wartortle 36, Slowpoke 37, Ponyta 40, Rhyhorn 42 — and Dragonair
55, a Dragonite as the run's last prize. A line that evolves late already carries the higher base stats for it: that is
the series' bet, and it is kept. The enemies came down to meet the team that evolves later (§2.2: the Region's Attack
tier, v0.9.90), not the levels.

*(Until v0.9.90 every line evolved at a compressed and uniform 12 and 26, "Gen I's 16 and 32 were written for a 50-hour
journey" (2026-09-19); every Region 2 recruit then arrived evolved or evolving, and every stone and trade line evolved by
level too.)*

---

# §6.3 Evolution

Evolution is not a stat buff. It is a **deck-manipulation event** that permanently rewrites what a Pokémon
contributes, and it is the primary creative expression inside a run (Pillar 4).

## §6.3.1 Triggering it

- Available when its method holds (§6.3.7): a level line at its level, a held-item line at a level-up while holding its
  item, a Friendship branch at a level-up fond enough; a stone opens its own screen (§6.3.2).
- Crossing it **queues an Archetype Selection screen** (§6.3.3), shown between nodes, after the
  fight's result (§9.4.5) and before the map. One screen per Pokémon, in Box order, offering **only the branches whose
  method holds** — a fond Eevee is offered Umbreon, not the stones' three.
- **Evolve later** (also Escape before confirmation) postpones this Pokémon's current stage. The choice is saved
  per UID and source species, and future level-ups/catches/visits do not repeat that stage's popup.
- The Pokémon's **Team sheet → Evolve** resumes it manually outside combat. Revalidate its current stage, level,
  available Evolution Catalyst and reserved stone before opening and again before committing a branch.
- Resumption prefers an already-earned Training right, then free level eligibility, then the explicitly postponed
  stone and its branch if still usable and owned. Catalyst is a fallback, so resuming a chosen stone never
  silently spends that relic instead.
- Only confirming a branch changes the Pokémon or spends a stone/Catalyst. A postponed stone remains in the bag;
  older saves that already spent a pending stone receive it back once on migration. An unrelated Pokémon is free
  to use the unspent Catalyst meanwhile; the postponed one must then meet its current eligibility again.
- Confirmed evolution clears that stage's postponement. A newly eligible next stage can offer its own choice.
  Queue order and the originating service are preserved when either confirming or postponing; evolving inside
  the Center does not grant an implicit heal.
- The Victory Road Training Grounds grant one early evolution (§2.12.3). Postponing keeps that already-earned
  right for this UID/source stage; resuming it spends no stone or Catalyst. Previewing/postponing a stone does
  not discard that earned right. It never carries to a second stage.
- **A recruit caught past its level threshold owes its screen straight away**, queued with the catch — the same beat as
  levelling into it, one fight earlier. *(v0.7.3.)* Since v0.9.90 that is the exception, not the Region 2 rule: a
  Region 2 Geodude at 26 owes one; most recruits arrive below their level.

> *Changed 2026-10-30 (v0.9.86).* Postponement and manual resumption supersede the mandatory-evolution decision of v0.3.

## §6.3.2 Evolution Items

Five stones exist: Fire, Water, Thunder, Leaf, Moon (§7.2.5). **A stone line evolves by its stone and only by it**
(v0.9.90, the user's call: "only the item, with guaranteed access"). A stone works on a basic **from Lv 11** and on a
middle stage **from Lv 25** — the levels the stones opened at before, on the stretched scale (§6.2.4): a Lv 5 Vulpix
does not become a Ninetales on the first route, and pacing wins over faithfulness there (the tiebreaker). It is
applied from the Move Manager between nodes — on the map, in a City lobby or at the Dojo — and opens the ordinary
Evolution screen (§6.3.3) there and then. The stone is reserved while choosing and spent only on confirmation. Single use.

| Stone | Lines |
|---|---|
| Fire | Eevee → **Flareon**, Vulpix, Growlithe |
| Water | Eevee → **Vaporeon**, Shellder, Staryu, Poliwhirl |
| Thunder | Eevee → **Jolteon**, Pikachu, Magneton → **Magnezone** |
| Leaf | Exeggcute, Gloom, Weepinbell |
| Moon | Clefairy, Jigglypuff, Nidorina, Nidorino |

For **Eevee** the stone also *is* the branch: the Evolution screen offers only the Eeveelution it makes; Umbreon is
Friendship's (§6.3.9). Every other line keeps all its archetypes on a stone's screen. **A trainer or a wild Pokémon**
fields a stone line's evolved form from the level its species names (`evolveLevel`: Pikachu 26, Vulpix 32…), the
series' trainers' level, as it does a trade line's (§2.7.3).

**A stone is always on offer** while someone in the Box can take one (§6.3.7's access rule): in a roguelike you cannot
farm for an item, so a stone must be an opportunity and never a wall. *(Until v0.9.90 the stone bought time — four
levels in Region 1, eight across Region 2 — and the level path always still existed; and the Metal Coat was a stone,
§6.3.8 made it a held item.)*

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

Evolution operates on the **Learned Move Pool** (§6.7): its payload **rewrites slots rather than piling onto them**
(v0.9.5), and since v0.9.11 the evolved form then **learns its line's signature moves by level** (§6.9) — the user's
review: "rather too many moves than a Pokémon with bad ones". Payloads alone left some paths with no attack of the
Pokémon's own type worth playing (a Charizard on Scratch and Ember, a Butterfree with no Bug or Flying attack, a
Beedrill with one attack); the learnset fills every path, whatever the branches chose. The pool is the choice; the
deck is still each Pokémon's active four.

**Every path ends with a real kit** — a content test walks all 155, every path, at the last level the form is held: a
move of its own type worth playing for its stage (a base form 45, a middle form 65, a final or single form 75 — Gen
I's ceiling where the type has none higher: Poison and Ghost 70, Dragon 50), at least three attacks once evolved, and
one Ranged attack so it plays from the bench. Magikarp and Ditto are the jokes the series makes of them; a cocoon is a
wall for four levels; Weezing's only 70-power Poison move is its Mastery, so Smog+ carries its type.

**The caps are data and every species is checked against them** (`MOVE_CAP`, v0.9.9, raised in v0.9.11): a form holds
at most **12** cards on any path through its line, learns at most 10 by level, and offers at most 3 tutor and 3 egg
moves — at most **18** cards in all with its Mastery Move. They guard against a runaway list; they are not a budget.

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
| Base form, fully levelled | 4–5 |
| After first evolution | 5, then 6–8 as it levels |
| After final evolution | 8–11 by the end of a run |
| Plus TMs, the Dojo and egg moves | as many as the player buys |

The **active 4 never grows**: the Move Manager picks from the pool, and a bigger pool is a better choice, not a
bigger hand. *(v0.9.5 cut a line to five cards; v0.9.11 gave the evolved forms their level-ups back, one by one,
after a review of every path.)* Magikarp is the one exception: Splash and Tackle, all it ever learned in Gen I, until
Gyarados.

## §6.3.6 Move-kit construction rules

Every kit is built to these rules so that kits stay coherent and the hand stays playable. A **single-stage**
species follows the *final*-stage template, not the base-form one — it is already what it is going to be, which
is the same reason it gets +25 % growth (§6.2.3).

### §6.3.6.1 Base form
- **Four moves**: 2 at level 1 (§6.9) and two more by the evolution level — the species' own Gen I moves where they
  fit the kit.
- 1–2 Offensive moves, mixing Melee and Ranged by species; 1–2 Defensive or Utility.
- 0 positional modifiers — rarely 1 where the species demands it. AP range 0–3.

### §6.3.6.2 Middle stage — five cards, then its level-ups
- Two upgrades and one addition per archetype: a Vanguard reaches for heavier Melee, a Specialist for Ranged power
  and riders, a Support for status, stages and heals.
- Then two or three of the line's own moves by level (§6.9), the ones every path should have.
- AP range 1–3.

### §6.3.6.3 Final stage — the signature, then its level-ups
- One to three swaps per archetype, the signature among them; at least one high-power card, possibly a 4-AP ultimate.
- Then three or four by level from 28: the line's best attack of its type where no payload gave it.
- AP range 1–4.

A **single-stage** species learns its kit by level — two at level 1, the rest by level 34 (a legendary by 40).

### §6.3.6.4 The power budget *(a contract, not a guideline)*

| AP | Melee power | Ranged power |
|---|---|---|
| 0 | — *(utility only)* | — |
| 1 | 40–50 | 45–55 |
| 2 | 60–75 | 65–90 |
| 3 | 85–100 | 90–100 |
| 3 + Recharge (§3.11.8) | 130–170 | 130–170 |
| 3 + Fatigue (§3.11.8) | 110–120 | 110–120 |
| 3 + a drop of its own stats | 110–130 | 110–130 |

No card is printed above 3 AP (§3.7, v0.9.89): the 4-AP ultimates were playable only on a relic's or an Ether's AP, so
they became 3 AP with a drawback — the series' own turn of recharge, its misses as next turn's Fatigue.

A move carrying **both** a modifier and a rider sits at the bottom of its band, and so do Gen I's high-critical moves
(Karate Chop, Razor Leaf, Crabhammer, Slash), which crit every time here. A `cleave` move counts as ~1.6× its printed
power; recoil, a rampage's self-Confusion and free returns, a charge's turn of warning and a sacrifice are budgeted apart, and so are Mastery tiers (§6.8.4). A
content test enforces the bands — decided 2026-09-19, and made real in v0.9.5, when every move was re-cut from its
Gen I numbers.

### §6.3.6.5 Two rules that keep hands playable

- **Every kit has at least one Ranged move**, unless the species is explicitly a Lead anchor (Golem, Machamp,
  Snorlax). A four-Melee kit is a dead hand whenever that Pokémon is benched.
- **A 0-AP move must never be strictly correct every turn.** Free utilities either decay (stat stages, which
  both sides watch diminish) or cost something elsewhere.

## §6.3.7 How a line evolves — the four methods

Each species names its method (`evolveBy`, absent for a level), and a branch can name its own (`by`: Eevee's Umbreon):

| Method | Ready when | Lines |
|---|---|---|
| **Level** | its level reaches `evolveLevel` | most lines (§6.2.4) |
| **Stone** | never by itself: its stone opens the screen (§6.3.2) | the five stones' |
| **Held item** | a level-up while holding its item (§6.3.8) | Kadabra, Machoke, Graveler, Haunter, Scyther, Onix |
| **Friendship** | a level-up with Friendship at 220 or more (§6.3.9) | Eevee → Umbreon |

**Access is guaranteed** (v0.9.90): the route's merchant always carries one thing an evolution in the Box waits on — a
stone someone can take now, or a trade line's held item the run does not carry — and a City's Mart and its Department
Store's top floor always carry both kinds (§2.9.2, §2.11.2.2). The **accelerators** stay what they were: the Black
Market's Rare Candy (priced by the level, 280 ₽), Training's Level Push and its early evolution — which pays **any**
method's condition, a stone's, a held item's or Friendship's (§2.12.3) — and the Evolution Catalyst (§8.6.1, six levels
early, for a level line).

## §6.3.8 The trade evolutions — levelling up with a held item

The series' trade evolutions evolve **at a level-up while holding their own item**, as Gen II's trade-with-an-item does,
and the item is spent by the evolution (v0.9.90, the user's call: "no Linking Cord, no Cable Club — each its own held
item, the spoon for Alakazam"). Each item is also a held item worth holding for itself, so carrying it costs the slot:

| Line | Item | While held |
|---|---|---|
| Kadabra → Alakazam | **Twisted Spoon** | Psychic +20 % |
| Machoke → Machamp | **Macho Brace** (Gen III) | XP ×1.5; the wearer starts every fight a Speed stage down (the series' effort training) |
| Graveler → Golem | **Hard Stone** | Rock +20 % |
| Haunter → Gengar | **Spell Tag** | Ghost +20 % |
| Scyther → Scizor · Onix → Steelix | **Metal Coat** (a stone until v0.9.90) | Steel +20 % |

The level-up is the trigger, not the equipping: putting the spoon on between nodes does nothing until Kadabra next
levels, and a postponed evolution keeps the item (taking it off takes the evolution with it; putting it back brings it
back). The rule to teach is short: *hold its item and level up*. Magnezone keeps the Thunder Stone, Scarlet and
Violet's method.

## §6.3.9 Friendship

A new in-run progression (v0.9.90, the user's call: "Umbreon needs a Friendship system"): **per Pokémon and per run**,
apart from Bond (§6.8), which is the account's and the line's. Bond is what a line learns with you across runs;
Friendship is what this Pokémon feels for you in this one.

- **The series' scale.** 0–255, shown as five hearts on the Team sheet with its words on hover ("It is very fond of
  you."). A caught, received or starting Pokémon begins at **70**.
- **It grows** with each fight won in the Active Team while standing (+2, the Lead +1 more), each level gained (+5 below
  100, +3 below 200, +2 above: Gen II's steps), and the **Center's grooming** (+25 for 150 ₽, once a Pokémon a visit, at
  the lounge table: Daisy's and the Haircut Brothers' service). The **Soothe Bell** relic doubles every gain (it was a
  5 % damage bonus at full HP that nobody missed).
- **It falls** by 5 for each faint.
- **What it gives.** At **220**, a level-up evolves a Friendship branch (Eevee → Umbreon; night is not modelled), and the
  screen can be postponed like any other. **Return** (Gen II, TM69) hits for its printed 90 at full Friendship and its
  share below (the series' friendship / 2.5): a 3-AP hit for 2 AP, earned. At **255**, once a fight, the Pokémon **holds
  on at 1 HP** through a lethal hit (X and Y's "toughed it out"): the faint-prevention ladder's rung after the held item
  and before the Phoenix Feather (§7.3.6). An enemy's Return reads a trainer's 160.
- Numbers: `ProgressionConfig.friendship` and `BattleConfig.friendship`. An Eevee caught on Route 1 reaches 220 on wins
  and levels alone around the end of Region 2; the grooming and the Bell bring it into the Region's middle. It leaves
  the door open to Gen II's other Friendship evolutions (Crobat, Blissey, Espeon) if the roster ever grows.

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
| **Support** | Helps the rest of the team | Healer: heal a bench ally 2 HP at turn end |
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

The line gives five cards against the four slots by its first evolution and more as it levels (§6.9); the TMs, the
Dojo and egg moves grow it further.

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
about five runs; until then the bar and the **+N Bond** behind every fight result's progress door (§9.4.5) carry the progress. *History:* a first cut of v0.9.1
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

- A base form **knows 2 moves at level 1** and **4 by its evolution level**. An evolved form's kit is its base
  form's, rewritten by the evolutions (§6.3.5), and then **its own learnset** (v0.9.11): the line's signature moves,
  learned as it levels. A level-up never teaches back a card a branch has rewritten (a Venusaur with Razor Leaf+ does
  not learn Razor Leaf), and **a late evolution catches up**: a form evolving past one of its own entries — a stone
  used at Lv 30 — learns it on the spot.
- Each species has an ordered learnset of `(level, move)` entries; a Pokémon knows every entry at or below its
  current level. **Every stage learns its own** (v0.9.91, the user's call: "more moves to learn, progressing like the
  Pokémon's"): the series' Gen IV learnset of that species, cut to the stage's own level window and merged with the rows
  it already had (`scripts/v0991-learnsets.mjs`; the source is `scripts/data/learnsets-gen4.json`) — about six a stage,
  fourteen at most, so a Pokémon learns something every few levels all run. A move the line gets another way is never
  added by level: its Mastery tiers, its branches' payloads, its tutor and egg lists.
- **A base form learns at the series' levels** (2026-11-03, the user's call: "at first most Pokémon only have Normal
  moves"). Every row of a base form that the series teaches by level takes its Gen IV level, and the level-1 pair is
  the series' first hit and first trick — Tackle and Growl, not Vine Whip: a starter's Ember arrives at 7, Bubble at 7,
  Vine Whip at 9. A move of the Pokémon's own type sits at Lv 1 only where the series puts it there (Pikachu's Thunder
  Shock, Vulpix's Ember, Oddish's Absorb) or where the line has no other hit (Cubone's Bone Club, Abra's Confusion —
  a Teleport alone is no card). Where the series' Lv 1 hit was missing from the kit it is added and grown by a track
  (Ponyta and Slowpoke's Tackle, into Stomp and Headbutt). A species that never evolves keeps its authored rows past
  Lv 25, and the Legendaries keep theirs: both are met high, with the kit their encounter was tuned for
  (`scripts/early-learnsets.mjs`).
- **A third card before the first fight** (v0.9.96, the user's call: "the first levels are slow and hard with so few
  moves"). Every starter learns a third move at Lv 3, so it walks in at Lv 5 with three: Bulbasaur Vine Whip,
  Charmander Ember, Squirtle Bubble, Pikachu Quick Attack, Eevee Sand Attack. And a base form met in Region 1 with no hit
  of its own type before Lv 10 gets one near Lv 7 — Diglett and Sandshrew Mud Shot, Geodude and Onix Rock Throw, the
  Nidoran Poison Sting, Grimer Acid, Seel, Shellder Water Gun, Voltorb Thunder Shock, Exeggcute Bullet Seed at 11
  (`scripts/v0996-early-hits.mjs`). The Lv 1 pair stays a pair.
- **Deck contribution = `min(known, 4)`.** The active-4 cap never changes, and Mastery remains the 5th.
- **One met already evolved** — a wild Ivysaur, a Gym's Venusaur, a recruit caught above its threshold — took its
  stage's first branch at every step, and its forms' learnsets up to its level, so it holds the kit a player's would.
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

**What this produces.** A run opens with one Pokémon and a **three-card deck**, and its first catch is sure (§2.6.4.5). It thickens as you recruit — about
six cards with a full base-form team — and reaches twelve by Gym 1 as those Pokémon level into their four-move
kits. The deck growing *is* the early game's sense of progress. Past four, a Pokémon's moves **grow** rather than pile
up (§6.9.1): the pool stays a choice, and the active four keep getting better.

## §6.9.1 Tracks — a move grows like the Pokémon

A learnset row can **replace** an earlier move (`replaces`): learned, it takes that move's slot in the pool and in the
active four, in place (v0.9.91, the user's call: "final forms should not keep weak moves like Scratch"). A Charmeleon's
Fire Fang takes Scratch's slot at 28, a Charizard's Flamethrower Fire Spin's at 42; a Mankey's Low Kick Scratch's at 5.

- **The rule a track follows.** A hit replaces a hit of its range and of its type (or a Normal one), at least 10 power
  stronger and at most one AP band dearer; a foe debuff or a self brace replaces a weaker one of the same stats. A hit
  replaces a hit that is not a filler only once the line holds four attacks, so an evolved form keeps three (§6.3.5); a
  base form keeps four by its evolution level (its own tracks spend only what it has past four).
- **No final form keeps a level-1 filler** — Tackle, Scratch, Pound, Peck, Wrap, Growl, Leer, Tail Whip, Sand Attack,
  String Shot, Harden, Defense Curl, Withdraw — on any path, learned or handed over by a branch: where the line's own
  moves never grow one, its first evolution learns the filler's role's upgrade (a melee hit of its type or Headbutt,
  Charm, Screech, Scary Face, Iron Defense). A content test walks every path.
- **A branch follows its own slots.** An evolution's upgrade of a move a track has already grown arrives beside the
  track's card, not over it (a Sandslash keeps the Dig its Scratch became, and takes Slash too).
- The level-up window names each step — *Grew into* ~~Scratch~~ → Fire Fang — and holds for a click like a new move
  (§9.4.5). A Pokémon met on the route, or a recruit, holds its tracks at its level, as a player's would.

## §6.9.2 The Move Reminder

What a track or an evolution took out of the pool is not lost: the **Move Reminder**, a section of the Move Manager
(§6.7.2), gives any of it back — free, between nodes, as often as wanted — into the pool, beside the move that replaced
it. It offers the moves the line learns by level at or below the Pokémon's level that an evolution or a track replaced
(Ember at 1 AP is sometimes worth more than Flamethrower at 3). *(The plan placed it at the Center, as FRLG's Move
Reminder; in the Move Manager it is where the choice it serves is made, and it needs no trip.)*

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
