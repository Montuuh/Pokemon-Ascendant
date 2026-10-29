# Topic 4 — Resolution

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns the maths of a fight:** the damage formula, the type chart, crit, status conditions, stat
> stages and field effects — everything that turns an action into a number.
> **It does not own:** who acts or why (Topic 5), or the structure of a turn (Topic 3).

---

# §4.1 Damage and types

## §4.1.1 The damage formula

```
damage = floor( Power × (Attack / Defence) × Range × Crit × STAB × TypeEff / Divisor )
```

| Term | Value | Source |
|---|---|---|
| **Power** | 40–130, banded by AP cost (§6.3.6.4) | the move |
| **Attack / Defence** | Effective stats after stages and status (§4.1.5) | the combatants |
| **Range** | 1.0 Melee · **0.75 Ranged** | the move |
| **Crit** | 1.5 on a crit, otherwise 1.0 | §4.1.3 |
| **STAB** | 1.5 when the move's type matches either of the user's types | derived |
| **TypeEff** | 4 / 2 / 1 / 0.5 / 0.25 / 0 | §4.1.2 |
| **Divisor** | **8** (`BattleConfig.divisor`) | balance config |

**Rules that fall out of it**

- **One floor, at the end.** Multiplication is commutative, so the term order is presentational: the damage
  breakdown reads Power → Crit → STAB → TypeEff → Range because that is the order the player thinks in.
- **Range folds into base damage** before Crit, since it is intrinsic to the move's power profile.
- **No minimum-damage clamp.** Only an immunity (×0) deals 0.
- **Level is not in the formula.** Levels raise stats; stats feed the formula.
- **No Physical/Special split.** One Attack, one Defence (§4.1.5).

Divisor 5 is the tuned value (v0.9.12). Divisor 8 landed wild fights at 4–5 turns while every enemy fought on a
fraction of its HP (§2.2.1); with its whole HP back — the user's call: an enemy is the Pokémon its species and level
say — the fights doubled, and tuning the enemies' Attack alone could not hold Region 3 (37 %, Gyms of 46 turns, every
hit 3 % of a Pokémon's HP). At 5, for both sides, fights run 5 / 8 / 10 turns by Region and Gyms 8 / 13 / 19.
*(Ratified 2026-09-19 after the v0.1 balance pass. Earlier drafts said "TBD via playtesting" and an old document
said 50; 8 is correct.)*

**Presentation.** The final number is shown on the card when a target is selected, with the breakdown, the type
badge, the STAB flag, the crit chance and any rider. The formula itself is never shown. A preview that disagrees
with the result is a bug — both call the same pure function.

## §4.1.2 The type chart

The **17-type chart with Gen II effectiveness**: Normal, Fire, Water, Electric, Grass, Ice, Fighting,
Poison, Ground, Flying, Psychic, Bug, Rock, Ghost, Dragon, **Dark** and **Steel**. Fairy does not exist in Pokémon
Ascendant. Effectiveness relationships use Generation II to resolve Gen I's balance defects (Ghost hits
Psychic for 2.0× rather than Gen I's 0× bug; Fire resists Ice at 0.5×; Bug hits Poison for 0.5×; Poison hits Bug
neutrally at 1.0×).

**Dark and Steel** (v0.9.84, the user's call) are Generation II's two additions, at their Generation II values — the chart was
the 15 Gen I types until then, and the two arrive with the Pokémon, moves and items that carry them (§6.3, §3.6, §7.3–§7.4).

| Type | Hits for ×2 | Resisted (×0.5) by | Takes ×2 from | Resists (×0.5) | Immune to |
|---|---|---|---|---|---|
| **Dark** | Ghost, Psychic | Fighting, Dark, Steel | Fighting, Bug | Ghost, Dark | Psychic |
| **Steel** | Ice, Rock | Fire, Water, Electric, Steel | Fire, Fighting, Ground | Normal, Grass, Ice, Flying, Psychic, Bug, Rock, Ghost, Dragon, Steel | Poison |

*Why:* Dark is the one type Psychic and Ghost cannot beat, and the first thing in the game that answers them; Steel is the
series' wall — nearly everything resists it and only three types hurt it — so it is the type a Normal or Flying team meets
with dread. The same chart gives the two new types their own weaknesses, so neither is a free pick: Fighting is the answer to both.

| Matchup | Multiplier | Label |
|---|---|---|
| Double super effective | 4.0 | SUPER EFFECTIVE ×4 |
| Super effective | 2.0 | SUPER EFFECTIVE |
| Neutral | 1.0 | *(no label)* |
| Resisted | 0.5 | NOT VERY EFFECTIVE |
| Double resisted | 0.25 | NOT VERY EFFECTIVE ×2 |
| Immune | 0.0 | IMMUNE |

A dual-type defender multiplies both halves: Fire vs Grass/Poison = 2.0 × 1.0 = **2.0**; Electric vs
Water/Flying = 2.0 × 2.0 = **4.0**; Ground vs Water/Rock = 1.0 × 2.0 = **2.0**; Normal vs Ghost/Poison =
0.0 × 1.0 = **0.0** — immunity always wins.

Immunities are preserved (Ghost immune to Normal and Fighting, Ground immune to Electric, Flying immune to
Ground, Normal immune to Ghost, Dark immune to Psychic, Steel immune to Poison, and so on). They are displayed in the Intent Phase and on card hover — never hidden.

**STAB** is 1.5 when the card's type matches either of the user's types.

## §4.1.3 Crit

Crits are **scarce and investment-gated**, not a background dice roll. **Base crit chance is 0 %.** Since v0.9.59
every Pokémon also earns them on a clock its Speed sets — the critical rhythm (§4.1.3.1), never a roll.

| Source | Scope | Effect |
|---|---|---|
| **AlwaysCrit move** | per move | That move always crits, ignoring everything else |
| **Consumable** (`sharp-lens`) | this combat | +20 % crit chance on all moves |
| **Ability / relic** (`focus-energy`, `steady-aim`) | per Pokémon or run | Additive crit chance, or a bigger multiplier |

Stacking is additive with a soft cap around 30–35 %. The crit multiplier is **1.5**, raised to 1.75 by the
`steady-aim` relic. Hover always shows the effective crit chance and flags a redundant crit bonus on an
AlwaysCrit move.

### §4.1.3.1 The critical rhythm — Speed's second job

Every Pokémon, **on both sides**, carries a meter from 0 to 1. Every **act** fills it by the share its **pace** allows.
**On your side an act is AP spent**: each AP of a card's *printed* cost that Pokémon plays fills one share, so a 2-AP card fills
twice a 1-AP card and a free card fills nothing (v0.9.82, the user's call: a Growl fed the ring as much as a 4-AP attack, so
cheap decks crit more for the same AP; now the share of your AP that ends as crit is set by Speed alone, and the AP of a swap,
spent by nobody's card, fills no meter — one more small cost of changing Lead). Printed, not paid: a discount, a free swap or
Paralysis's +1 AP changes what a card costs, not what it feeds. **On the enemy's side an act is an action** (a Pokémon that
acts twice fills it twice a turn). Full, its **next hit is a critical**: certain, never rolled. The hit that spends it empties it; anything else fills
it, up to full, and a full meter waits for a hit. An AlwaysCrit move crits anyway and leaves the meter alone.

**Speed sets the pace, and what happens to Speed moves it** (v0.9.80, the user's call: tiers hid Speed stages and
Paralysis behind cuts a +10 % stage rarely crossed). The acts that fill a meter are a **curve**, in two steps:

1. **The species.** Its *level-free* Speed (base, the archetype's lean and the Dojo's points, divided by the level's growth
   §6.2.3, so it reads the species and not how far into the run it is) gives `k / Speed` acts, kept inside the side's
   reach: **allies 260 / Speed AP, between 2 and 5** (Speed 130+ fills in 2 AP, 65 in 4, 52 or less in 5); **enemies 270 /
   Speed actions, between 2 and 4** (Speed 135+ in 2, 90 in 3, 67 or less in 4). A Dugtrio (120) and a Meowth (90) no longer
   read alike, nor a Golem (45) and a Pidgeotto (71). The ally constant keeps the old per-card pace's crits a run: the
   auto-player plays 0.8 AP a card, so the 4.7 cards that filled a ring were about 3.9 AP, and 11.0 crits a run read 11.5 before.
2. **What is happening to its Speed now.** The Speed stage (§4.2.6, ±10 % a stage) and Paralysis (×0.5, §4.2.2.3) multiply the
   pace, *after* step 1, and the result is kept between **2 and 10 acts** (enemies 2 and 8). So a stage moves the pace of
   everyone — a wall at 6 acts still gets to 5 with +2 — and Paralysis doubles the acts still to come even for a fast Pokémon or
   a wall, instead of being swallowed at an edge. Only a Pokémon already at the 2-act floor gains nothing from a boost.

A change of pace applies to the acts *still to come*: the meter keeps what it holds, and a meter already full is never
taken back. A big card can fill past full: your meter holds up to half a meter beyond it, which the crit leaves behind, so one
card never makes two criticals and a 4-AP card is not wasted — so Agility, String Shot, Constrict, Bubble Beam, Thunder Wave and the like are tools for the **timing** of a
crit, used before it is declared. (The first three Speed stages were content that did not exist until v0.9.80: Agility now
gives +2 Speed, String Shot and Constrict −1, Bubble Beam −1; Thunder Wave and the other Paralysis moves already did.)
The *quick swap* (§3.3.1.1) reads the same Speed, stages and Paralysis included.

*The number on a card is not the number the rhythm reads:* a card's Speed grows with its level (a Golem, base 45, shows 95 at
Lv 33; a Dugtrio, 120, shows 254). The dial's tooltip prints the species' Speed, the card's own number beside it, the stage and
Paralysis acting on it, the acts it needs now, and the curve at a few reference Speeds.

(`critRhythm.ally`, `critRhythm.enemy`: `k`, `minActs`, `maxActs`, `floorActs`, `ceilActs`.) The enemy's reach is shorter at
the slow end because an enemy acts once a turn where your side plays three cards, and because Speed already favours you
against slow walls through the quick swap: measured on tiers, the Rock Gym (Geodude, Golem) stopped costing Pokémon
(§3.3.1.1) when the slow end reached 6.

**Shown before it lands (Pillar 1).** Every Pokémon's card wears its meter as a **dial** on its outer edge, at the
middle of its window (v0.9.60, the user's choice of five looks): a ring that fills with the meter and is cut into the acts it takes now (a stage or Paralysis changes
them while you watch), the whole acts still to go on its face; full, a turning star and a **CRIT** tab. Full on your side, every damaging card of that Pokémon in your
hand wears the **✦** crit badge and a breathing gold edge, and its damage preview already counts the crit. The ✦ is
the one crit mark (v0.9.61): an AlwaysCrit card wears it too, always, but never the edge — it does not spend the
rhythm. An enemy's crit is **declared with its intent**: the chip says **CRIT**
and its number is the critical one, a turn ahead. Nothing you do takes a declared crit back — the answer is the swap,
the resist, or the Pokémon who can take it — but a foe slowed *before* its meter fills has its crit pushed later.

**Planning aids on your side** (v0.9.83, the user's call to improve the rhythm's UX): a ring you cannot plan with is a ring
you watch. (1) A card's **hover** says what it feeds its owner's ring — "Its 1 AP fill 25 % of Charmander's ring", "…the next
damaging card is a critical", or "Free: fills nothing". (2) While a card is hovered, held or dragged, its owner's dial draws
where the ring **would** stand as a lighter **ghost** arc, the same arithmetic as the play (`rhythmFillOf` beside `stepRhythm`),
so the AP capsule's "what this costs" has its twin, "what this feeds". (3) A small **▲ / ▼** on the dial's rim says a Speed
stage or Paralysis is making it fill quicker or slower (green when it favours you, red when it does not — for a foe, quicker is
red); the hover lists the modifiers. (4) One of **your** rings becoming full plays a short rising cue, once, never when a
screen opens already full.

*Why (the user's call, 2026-10-26):* a Speed-based crit chance, as Gen I had, was weighed and rejected — it would
have made every preview a range and every enemy number a gamble. The rhythm keeps Speed's series meaning (fast
Pokémon crit more) and keeps every number exact. The user set the enemy's side: every enemy has it, wild ones too;
it fills per action, so a Pokémon that acts twice gets there sooner; it is shown on the intent; it cannot be broken.

## §4.1.5 Stats

| Stat | Meaning |
|---|---|
| **HP** | Current / Effective Max |
| **Attack** | One unified offensive stat, used by every move |
| **Defence** | One unified defensive stat, used against every move |
| **Speed** | Never in the damage formula. A Pokémon faster than the enemy Lead swaps in for 1 AP less (§3.3.1.1); its Speed sets the pace of its critical rhythm (§4.1.3.1). Paralysis halves it (§4.2.2.3) |
| **Level** | Drives stat growth; never enters the damage formula directly |

**Effective stat** = `base + growth × (level − 1)`, then the stat-stage multiplier, then the status multiplier —
multiplicative, in that order:

```
EffAtk = floor( (base + growth×(level−1)) × stageMultiplier × statusMultiplier )
```

Modifiers from relics, Badges, abilities, held items and fields are separate multiplicative terms in the damage
formula; none of them edit a base value.

### §4.1.5.1 Deriving the two stats from Gen I

Gen I has Attack, Defence and Special. Pokémon Ascendant has two stats, so a species converts:

```
attack  = max(Atk, Spc)
defence = round((Def + Spc) / 2)
```

Special attackers stay threats (Alakazam hits hard) and special walls stay walls (Lapras soaks), which a naive
`attack = Atk` destroys. About ten species need a hand-tune after the conversion; those are marked in
[`catalogs/species-r1.md`](catalogs/species-r1.md). *(Decided 2026-09-19.)*

## §4.1.6 Drain and recoil

Two riders read the damage a move **actually dealt** — after type, crit, abilities, items and the target's
remaining HP — and never its printed power:

- **Drain** — the attacker recovers **half** of it (Absorb, Mega Drain, Giga Drain, Leech Life and its Plus).
- **Recoil** — the attacker loses the share the move prints (Take Down 25 %, Volt Tackle 33 %, Self-Destruct 50 %…).
  Rock Head cancels it (§6.6).

A drain move that hits a resist heals a little and one that hits a weakness heals a lot, so its sustain tracks
the matchup — which is the point of the rider. *Why (playtest, 2026-09-24):* the build had ported the drain moves
as "heal 25 % of Max HP" whatever they hit, so Mega Drain (50 power, 2 AP, Ranged) returned 12.5 % of Max HP per AP
from the bench, into a resist, every turn — the best sustain per AP in the Grass kit, and with Leftovers a Lead
that held its HP under a same-level hitter. The catalogue had always said "of damage"; the port had not. Measured by
`nerfs.test`: 12.4 % → 5.2 % of Max HP per AP, and an Ivysaur with Leftovers playing it every turn under a same-level
Raticate goes from −1.3 % to −6 % of its Max HP a turn. The powers
moved to the §6.3.6.4 band for a rider (Absorb 45, Mega Drain 65, Giga Drain 90, Leech Life Plus 65) so the
cards still earn their slot as attacks.

---

# §4.2 Status conditions

Status is the second axis of a fight. Every Gen I condition is redesigned as a **deterministic** effect so the
player can plan around it. All six clear at combat end.

A Pokémon carries **one primary status at a time** plus, independently, Confusion. A new primary replaces the
old one.

## §4.2.1 Timing and interaction rules

- **A status applied on turn N takes effect from turn N+1.** The application turn is telegraph only.
- **Damage-over-time computes on Effective Max HP** (§8.2.1), not base max HP — the HP bar and the DoT agree.
- **Stat stage first, then the status multiplier**, multiplicatively (§4.1.5).
- **Swapping does not cure anything** (§4.2.7).
- Applying a status to an immune target shows IMMUNE and wastes the play. The AI never does it (§5.3).

## §4.2.2 The five primary conditions

### §4.2.2.1 Burn 🔥
`floor(EffectiveMaxHP / 16)` damage at the end of each Resolution Phase, and **Attack −25 %**.
Permanent until cured (§4.2.7). **Fire-types are immune.**
*Offensive disruption — the burned Pokémon wants to come off the front line.*

### §4.2.2.2 Poison ☠️
`floor(EffectiveMaxHP / 16)` damage at the end of each Resolution Phase, and **Defence −15 %**.
Permanent until cured (§4.2.7). **Poison-types are immune.**
*Defensive disruption — the poisoned Pokémon wants to come off the Lead.*

> Burn and Poison are deliberate mirrors: same chip damage, one attacks your offence and one your defence, and
> each creates a swap incentive for a different reason.

### §4.2.2.3 Paralysis ⚡
Every move belonging to that Pokémon costs **+1 AP** while it lasts, whether it is Lead or bench, and its **Speed is
halved** (`paralysisSpeedMultiplier`) — which can cost it the quick swap (§3.3.1.1), and on the enemy Lead lowers the
bar your Pokémon must clear. It also halves the **pace of its critical rhythm** (§4.1.3.1): the acts still to fill the meter
double, on the curve's edges too, so Paralysis slows even a wall and even a fast Pokémon; a meter already full stays full.
That makes Thunder Wave and its kin the way to *delay* a foe's crit before it is declared. Swapping it in or out costs
nothing extra. **3 turns. Electric-types are immune.**
*Economy disruption you can route around — play someone else's cards, or move it out.*

### §4.2.2.4 Sleep 💤
That Pokémon's cards are **unplayable**. Its position is **not** locked: it can be swapped in or out and can be
the destination of another Pokémon's Step-Backward. It cannot initiate a Step-Forward, because that needs one of
its own cards. **1 turn. No type immunity** — but it **cannot land on a Pokémon that is already Asleep or
Frozen**: the play shows IMMUNE and is spent, exactly as §4.2.1 treats an immune target.

*Why (playtest, 2026-09-24):* Sleep lasts one turn and the application turn is telegraph (§4.2.1), so a
Pokémon put to sleep every turn never woke. Sleep Powder costs 1 AP; one card a turn locked any single enemy
for the whole fight. Two fixes were weighed. **Refresh-not-stack** (a re-application resets the clock) does not
break the loop — a one-turn clock refreshed every turn is still a permanent lock. **No Sleep on a sleeper** does:
the enemy wakes at the end of its sleeping turn, acts on the turn Sleep is re-applied, and sleeps the next — at
best every other turn, for a card a turn. Measured by `nerfs.test`: the enemy under the abuse acted **1 of 10**
turns before, **5 of 10** after.

### §4.2.2.5 Freeze 🧊
Cards unplayable **and position-locked** — it cannot be swapped in or out, cannot be a Step-Backward
destination, cannot Step-Forward. While frozen it takes **×1.5 from Fire moves** (the thaw window).
**1 turn. Fire- and Ice-types are immune**, and like Sleep it cannot land on a Pokémon already Asleep or
Frozen (§4.2.2.4) — the two silencing conditions never chain into each other.
Faint precedence: a Frozen Lead that faints voids the lock (§3.3.5.1).

> Sleep and Freeze are also mirrors: both silence a Pokémon for a turn, but Sleep lets you move it to safety and
> Freeze does not. Freeze pays for that with the Fire vulnerability.

## §4.2.3 Secondary condition

### §4.2.3.1 Confusion 💫
At the start of each Draw Phase, **1 random skill card is discarded per Confused Pokémon**. Consumable cards are
immune. **3 turns**, tracked per Pokémon, and it coexists with any primary status.

Confusion cannot stack on one Pokémon; re-applying resets the 3-turn timer. With all three Active Pokémon
confused the player still draws 2 skill + 2 consumable cards, which is the **design safety floor** — no
pity timer is needed, and `full-heal` cures it.

## §4.2.4 Type immunities

| Type | Immune to |
|---|---|
| Fire | Burn, Freeze |
| Ice | Freeze |
| Electric | Paralysis |
| Poison | Poison |
| Steel | Poison |

Abilities add more (`immunity`, `insomnia`, `limber`, `inner-focus`, `vital-spirit` — §6.6). Immunity is checked
at the moment of application.

## §4.2.5 Summary

| Condition | Type | Duration | Primary effect | Secondary | Position lock |
|---|---|---|---|---|---|
| Burn | Primary | Permanent | `EffMaxHP/16` per turn | Attack −25 % | No |
| Poison | Primary | Permanent | `EffMaxHP/16` per turn | Defence −15 % | No |
| Paralysis | Primary | 3 turns | That Pokémon's moves +1 AP | — | No |
| Sleep | Primary | 1 turn | Its cards unplayable | Cannot land on a sleeper or a frozen one | No |
| Freeze | Primary | 1 turn | Its cards unplayable | ×1.5 Fire damage taken; cannot land on a sleeper or a frozen one | **Yes** |
| Confusion | Secondary | 3 turns | −1 skill card per turn, per Confused Pokémon | — | No |

**Every one of them outlives the combat that inflicted it** — the timed ones with what is left of their turns
(§4.2.7.1).

## §4.2.6 Stat stages

Separate from status conditions, and they do not occupy a status slot.

- Applied as **multipliers** on base stats, never edits.
- **Linear ladder, ±6 stages**: −6 → 0.4, +0.1 per stage, 0 → 1.0, +6 → 1.6. Thirteen entries in
  `BattleConfig.statStageMultipliers`.
- Reset at combat end.
- They **persist across boss phase transitions** (§5.8.4), which is what makes debuffing a boss worth the card.

## §4.2.7 Curing

| Source | Cures |
|---|---|
| Single cures (`antidote`, `burn-heal`, `paralyze-heal`, `awakening`, `ice-heal`) | Their one condition, 0 AP |
| `full-heal` | Any primary status **and** Confusion, 1 AP |
| Specific moves | As written on the card |
| **Swapping** | Nothing |
| **Combat end** | Every stat stage, automatically. **No status** — a status outlives the fight (§4.2.7.1) |
| **Fainting** | Everything the fainted Pokémon carried |
| **Field Aid** — the route's nurse (§2.9.1) | Every status, for the whole Box |
| **Pokémon Center heal** — in a City (§2.11.1) | Every status, for the whole Box |

### §4.2.7.1 Carry-over — every status outlives the fight

A Pokémon that ends a combat with a status **keeps it into the next one**. Burn and Poison stay until cured, as
they always did. The timed conditions — Paralysis, Sleep, Freeze, Confusion — keep **what is left of their
duration**, and their clock stops between fights: a Pokémon that ends a fight Asleep with one turn to go starts
the next fight Asleep for one turn. A carried status is in effect from turn one — it was applied in an earlier
fight, so §4.2.1's one-turn delay has already run. It is drawn on the Pokémon in the Box and on the map, so the
Active Team is chosen knowing it. Fainting clears it, an evolution into an immune type (§4.2.4) clears it, and
the nurse and the Center cure it (the table above). **Stat stages are not statuses** and still reset at combat
end.

**The cost, stated plainly:** a Pokémon that ends a fight Asleep or Frozen starts the next one unable to play a
card, and a Frozen one cannot leave its slot until it thaws. That is deliberate. It makes a fight's last turns
matter — finishing the enemy while your Lead is asleep has a price — it gives the status cures a job beyond
the turn they are drawn, and it grows sharper once consumables are spent instead of returned (backlog). The
telegraph that keeps it inside Pillar 1 is the Box: nothing carried is hidden, and a Frozen Pokémon can simply
be left out of the Active Team. *(Decided by the user on 2026-09-22 — "más restrictivo" — over the narrower
Burn-and-Poison-only rule proposed earlier the same day.)*

## §4.2.8 Status on the enemy side

Status is symmetric, but an enemy has no hand, so the five conditions translate:

| Condition | On an enemy |
|---|---|
| **Burn** | Chip damage and Attack −25 %, exactly as for the player |
| **Poison** | Chip damage and Defence −15 %, exactly as for the player |
| **Paralysis** | Every intent costs +1 AP against the enemy's 3-AP budget; intents it can no longer afford are unavailable. If nothing is affordable it skips, telegraphed as "can't act" |
| **Sleep** | It skips its action, telegraphed as "can't act" |
| **Freeze** | It skips its action and takes ×1.5 from Fire |
| **Confusion** | It picks **uniformly at random** among its legal intents instead of scoring them — still declared in advance, so the player still sees what is coming |

Confusion on an enemy is therefore an information *and* a quality attack: the intent is still telegraphed, but
it stops being the smart one. *(Ratified 2026-09-19; previously these translations existed only in code.)*

---

# §4.3 Field effects

A field is set at encounter start and lasts the whole combat unless overwritten. Every field carries an
**owner**: `Neutral` (a **Battlefield** — symmetric, set by the biome a fight stands in, §2.6.1) or `Enemy` (a
**Home Field** — one-sided, Gym and Elite fights). One engine, two classes. Every number below is a `BattleConfig`
value (`weatherBoost`, `weatherDamp`, `electricTerrainBoost`, `sandstormPercent`, `homeFieldBoost`), and the
active fields show as chips on the combat top bar and on a node's preview card, each with its numbers in a bubble.
**Cloud Nine** (§6.5) suppresses every field while its holder leads, on either side; the chips go dashed.

Weather and Terrain are independent categories and can coexist; a second field of the same category overwrites
the first.

## §4.3.1 ☀️ Sunny Day *(Weather)*
Fire ×1.5, Water ×0.5, for both sides. Enables `chlorophyll` (one more card on turn 1).

## §4.3.2 🌧️ Rain Dance *(Weather)*
Water ×1.5, Fire ×0.5, for both sides. Enables `swift-swim` (one more card on turn 1). `hydration` is not authored yet.

## §4.3.3 ⚡ Electric Terrain *(Terrain)*
Electric ×1.3 against grounded Pokémon, and grounded Pokémon cannot be Paralysed.
Grounded = everything except Flying-types and `levitate` holders.

## §4.3.4 🪨 Sandstorm *(Hazard)*
Rock-, Ground- and Fighting-types are immune; everyone else loses **3 % of max HP** at the end of every turn, on both
sides. It pressures low-HP and freshly-swapped Pokémon, which ties fields to the faint economy.
*(v0.8.4: 5 % first. Region 3's two cave lanes end at Fighting and Ice Gyms whose Pokémon the storm spares, so at 5 %
the Sandstorm was a one-sided tax that cost Region 3 six points of its curve, §2.2.1; 3 % keeps it a pressure.)*

## §4.3.5 Home Fields
A Gym Leader or Elite sets a field matching **its own type** at combat start, shown as a persistent
`🏠 Home Field: [Type]` badge.

- **Enemy** moves of that type: **×1.2** (`homeFieldBoost`).
- **Player** moves of that type: ×1.0 — no boost. It is the enemy's turf.
- No player-side suppression: the threat is amplified enemy offence, not a tax on you.
- An Elite Trainer's Home Field is its lead Pokémon's first type.

*(v0.8.4: ×1.5 first. §5.9.3's level premium was tuned before any Home Field existed, and the two together made a
Gym a wall — Region 3's Gym deaths went from 6 % to 27 % of Gym fights. ×1.2 keeps the turf a real threat, measured
at the harness: Region 3 given Region 2 41 %, the whole run 14 %; the v0.8.7 balance pass weighs it against the
premium.)*

## §4.3.6 Counterplay
- **Don't feed it.** A Home Field only amplifies the enemy's own type, so a resist wall blunts the whole phase.
- **`defog`** (consumable, 1 AP, tier 1) clears every field, Battlefield and Home Field, for the rest of combat.
- **`field-surveyor`** (Region Modifier): every wild fight opens under the Battlefield your **Lead** favours — Sun
  for Fire, Rain for Water, Electric Terrain for Electric, Sandstorm for Rock, Ground or Fighting. You choose the
  ground by choosing who leads. *(v0.8.4: "you choose" was a picker screen before every wild fight; the Lead is a
  choice the player already makes on the map, so the modifier rides on it.)*
- *Post-launch:* player field-setting moves that overwrite a Home Field with a neutral one, and a `weather-vane`
  relic that flips ownership.

Damage previews always account for the active field and its owner.

## §4.3.7 Category stacking

Weather and Terrain are independent; one of each may be active. A second field of the same category overwrites
the first. Multipliers stack multiplicatively across categories. The set is ten: three Weather (Sun, Rain, Hail),
four Terrain (Electric, Grassy, Psychic, Misty), three Hazard (Sandstorm, Toxic Spikes, Sticky Web).

## §4.3.8 🌨️ Hail *(Weather)*
Everyone but Ice-types loses **3 % of max HP** at the end of every turn, on both sides (`hailPercent`). The
Sandstorm's twin for the Ice Gym: the storm the Gym's own Pokémon stand in.

## §4.3.9 🌿 Grassy Terrain *(Terrain)*
Grass moves ×1.3 from a **grounded** attacker (`typeTerrainBoost`), and every grounded Pokémon gets **3 %** of its
max HP back at the end of every turn, on both sides (`grassyHealPercent`). A slow field: fights run longer, and the
Grass Gym is the one that wants them long.

## §4.3.10 🔮 Psychic Terrain *(Terrain)*
Psychic moves ×1.3 from a grounded attacker, and a grounded Pokémon cannot be put to **Sleep**.

## §4.3.11 🌫️ Misty Terrain *(Terrain)*
A grounded Pokémon cannot be given **any** status — Burn, Poison, Paralysis, Sleep, Freeze or Confusion — on either
side. The Normal Gym's ground: no tricks, a straight fight.

## §4.3.12 ☠️ Toxic Spikes *(Hazard)*
Whoever steps into the Lead mid-fight — a swap, a Step-Forward or Step-Backward, a replacement, an enemy stepping
up — is **Poisoned**, unless it is a Poison-type, not grounded, or already has a status. The Leads that open the fight
stand there before the spikes are laid. It makes every swap a cost (Pillar 2): the lane rewards a team that can stay.

## §4.3.13 🕸️ Sticky Web *(Hazard)*
Whoever steps into the Lead mid-fight, and is grounded, loses **1 Speed stage** (`stickyWebStages`). The Bug Gym's
ground: lighter than the spikes, and it stacks with every swap you make. Since v0.9.58 the stage bites: a slower
Pokémon can lose its quick swap (§3.3.1.1).

## §4.3.14 Each Gym's ground

Every Gym lays its own Battlefield over its whole lane and its own fight (on top of its Home Field, §4.3.5), and no two
Gyms of one Region share one — so the fork is also a choice of ground.

| Gym type | Field | | Gym type | Field |
|---|---|---|---|---|
| Rock | Sandstorm | | Fire | Sun |
| Water | Rain | | Grass | Grassy Terrain |
| Bug | Sticky Web | | Electric | Electric Terrain |
| Normal | Misty Terrain | | Poison | Toxic Spikes |
| Psychic | Psychic Terrain | | Ground | Sun |
| Fighting | Sandstorm | | Ice | Hail |

*(The user's call, 2026-10-04: every Gym with a field of its own. Ground takes Sun — Groudon's drought — rather than a
second Sandstorm; Fighting keeps the storm its own types shrug off, which makes it a one-sided pressure to plan
against. Measured on 360 runs: R1 69 % · R2|R1 61 % · R3|R2 55 % · run 23 %.)*

---

# §4.4 Resolved edge cases

## §4.4.1 Crit reduction

No source of crit reduction exists at launch. The calculation clamps to a 0–100 % range, so if one is ever
added: AlwaysCrit bypasses the system entirely; stackable crit chance is reduced first; the floor is 0 %.

## §4.4.2 Confusion cannot soft-lock

With all three Active Pokémon confused the player still holds 2 skill + 2 consumable cards. Confusion cannot
stack on one Pokémon (re-applying resets the timer), so the maximum is 3 discards per turn. `full-heal` cures it.
No pity timer is needed.

