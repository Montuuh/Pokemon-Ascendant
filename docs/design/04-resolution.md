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

Divisor 8 is the tuned value: it lands wild fights at 4–5 turns and Gym fights at 8–9, inside the 5–8 target.
*(Ratified 2026-09-19 after the v0.1 balance pass. Earlier drafts said "TBD via playtesting" and an old document
said 50; 8 is correct.)*

**Presentation.** The final number is shown on the card when a target is selected, with the breakdown, the type
badge, the STAB flag, the crit chance and any rider. The formula itself is never shown. A preview that disagrees
with the result is a bug — both call the same pure function.

## §4.1.2 The type chart

The **Gen I 15-type chart**, exactly: Normal, Fire, Water, Electric, Grass, Ice, Fighting, Poison, Ground,
Flying, Psychic, Bug, Rock, Ghost, Dragon. Dark, Steel and Fairy do not exist in Pokémon Ascendant.

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

Gen I immunities are preserved (Ghost immune to Normal and Fighting, Ground immune to Electric, Flying immune to
Ground, and so on). They are displayed in the Intent Phase and on card hover — never hidden.

**STAB** is 1.5 when the card's type matches either of the user's types.

Because Steel does not exist, moves that are Steel-typed in the source material are typed **Rock** here
(`iron-tail`, `metal-claw`), and there is no Steel poison-immunity row.

## §4.1.3 Crit

Crits are **scarce and investment-gated**, not a background dice roll. **Base crit chance is 0 %.**

| Source | Scope | Effect |
|---|---|---|
| **AlwaysCrit move** | per move | That move always crits, ignoring everything else |
| **Consumable** (`sharp-lens`) | this combat | +20 % crit chance on all moves |
| **Ability / relic** (`focus-energy`, `steady-aim`) | per Pokémon or run | Additive crit chance, or a bigger multiplier |

Stacking is additive with a soft cap around 30–35 %. The crit multiplier is **1.5**, raised to 1.75 by the
`steady-aim` relic. Hover always shows the effective crit chance and flags a redundant crit bonus on an
AlwaysCrit move.

## §4.1.5 Stats

| Stat | Meaning |
|---|---|
| **HP** | Current / Effective Max |
| **Attack** | One unified offensive stat, used by every move |
| **Defence** | One unified defensive stat, used against every move |
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
Permanent until cured — it **survives the end of the combat** (§4.2.7.1). **Fire-types are immune.**
*Offensive disruption — the burned Pokémon wants to come off the front line.*

### §4.2.2.2 Poison ☠️
`floor(EffectiveMaxHP / 16)` damage at the end of each Resolution Phase, and **Defence −15 %**.
Permanent until cured — it **survives the end of the combat** (§4.2.7.1). **Poison-types are immune.**
*Defensive disruption — the poisoned Pokémon wants to come off the Lead.*

> Burn and Poison are deliberate mirrors: same chip damage, one attacks your offence and one your defence, and
> each creates a swap incentive for a different reason.

### §4.2.2.3 Paralysis ⚡
Every move belonging to that Pokémon costs **+1 AP** while it lasts, whether it is Lead or bench. Swapping it in
or out costs nothing extra. **3 turns. Electric-types are immune.**
*Economy disruption you can route around — play someone else's cards, or move it out.*

### §4.2.2.4 Sleep 💤
That Pokémon's cards are **unplayable**. Its position is **not** locked: it can be swapped in or out and can be
the destination of another Pokémon's Step-Backward. It cannot initiate a Step-Forward, because that needs one of
its own cards. **1 turn. No immunity.**

### §4.2.2.5 Freeze 🧊
Cards unplayable **and position-locked** — it cannot be swapped in or out, cannot be a Step-Backward
destination, cannot Step-Forward. While frozen it takes **×1.5 from Fire moves** (the thaw window).
**1 turn. Fire- and Ice-types are immune.**
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

Abilities add more (`immunity`, `insomnia`, `limber`, `inner-focus`, `vital-spirit` — §6.6). Immunity is checked
at the moment of application.

## §4.2.5 Summary

| Condition | Type | Duration | Primary effect | Secondary | Position lock |
|---|---|---|---|---|---|
| Burn | Primary | Permanent | `EffMaxHP/16` per turn | Attack −25 % | No |
| Poison | Primary | Permanent | `EffMaxHP/16` per turn | Defence −15 % | No |
| Paralysis | Primary | 3 turns | That Pokémon's moves +1 AP | — | No |
| Sleep | Primary | 1 turn | Its cards unplayable | — | No |
| Freeze | Primary | 1 turn | Its cards unplayable | ×1.5 Fire damage taken | **Yes** |
| Confusion | Secondary | 3 turns | −1 skill card per turn, per Confused Pokémon | — | No |

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
| **Combat end** | Paralysis, Sleep, Freeze, Confusion and every stat stage, automatically. **Not** Burn or Poison (§4.2.7.1) |
| **Fainting** | Everything the fainted Pokémon carried |
| **Field Aid** — the route's nurse (§2.9.1) | Burn and Poison, for the whole Box |
| **Pokémon Center heal** — in a City (§2.11.1) | Every status, for the whole Box |

### §4.2.7.1 Carry-over — Burn and Poison persist

A Burn or a Poison **outlives the combat that inflicted it**: the Pokémon walks to the next node with it, is
drawn with its badge on the map and in the Box, and enters the next fight with it already in effect — ticking
from the first Resolution Phase. It ends only when something in the table above cures it. An evolution into a
type that is immune to it (§4.2.4) clears it.

The rule follows the two conditions' own design. Burn and Poison were always *permanent until cured*; they
are attrition, and attrition that stops at the edge of a fight is not attrition. Paralysis, Sleep, Freeze and
Confusion are counted in turns — they are one-fight tempo puzzles, and carried into a new fight they would
become an opening turn the player never got to answer. Carry-over also gives Region 2's accent (status on
enemy intents, §2.2) a cost that lasts beyond one fight, gives the merchant's cures and the nurse a job, and is
faithful to the series. It is telegraphed (Pillar 1): the badge is on the Pokémon before you pick the Active
Team, so benching the poisoned one is a real decision (Pillar 2). *(Decided 2026-09-22; until then combat end
cleared everything.)*

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
**owner**: `Neutral` (a **Battlefield** — symmetric, wild and Region fights) or `Enemy` (a **Home Field** —
one-sided, Gym and Elite fights). One engine, two classes.

Weather and Terrain are independent categories and can coexist; a second field of the same category overwrites
the first.

## §4.3.1 ☀️ Sunny Day *(Weather)*
Fire ×1.5, Water ×0.5.

## §4.3.2 🌧️ Rain Dance *(Weather)*
Water ×1.5, Fire ×0.5. Enables `swift-swim`, `rain-dish` and `hydration`.

## §4.3.3 ⚡ Electric Terrain *(Terrain)*
Electric ×1.3 against grounded Pokémon, and grounded Pokémon cannot be Paralysed.
Grounded = everything except Flying-types and `levitate` holders.

## §4.3.4 🪨 Sandstorm *(Hazard)*
Rock-, Ground- and Fighting-types are immune; everyone else loses **5 % of max HP** at the end of their turn.
It pressures low-HP and freshly-swapped Pokémon, which ties fields to the faint economy.

## §4.3.5 Home Fields
A Gym Leader or Elite sets a field matching **its own type** at combat start, shown as a persistent
`🏠 Home Field: [Type]` badge.

- **Enemy** moves of that type: **×1.5**.
- **Player** moves of that type: ×1.0 — no boost. It is the enemy's turf.
- No player-side suppression: the threat is amplified enemy offence, not a tax on you.

## §4.3.6 Counterplay
- **Don't feed it.** A Home Field only amplifies the enemy's own type, so a resist wall blunts the whole phase.
- **`defog`** (consumable, 80 ₽) clears any field, Battlefield or Home Field, for the rest of combat.
- **`field-surveyor`** (Region Modifier) lets you choose the Battlefield in wild and Region fights.
- *Post-launch:* player field-setting moves that overwrite a Home Field with a neutral one, and a `weather-vane`
  relic that flips ownership.

Damage previews always account for the active field and its owner.

## §4.3.7 Category stacking

Weather and Terrain are independent; one of each may be active. A second field of the same category overwrites
the first. Multipliers stack multiplicatively across categories. The launch set is four: two Weather, one
Terrain, one Hazard (§4.3).

---

# §4.4 Resolved edge cases

## §4.4.1 Crit reduction

No source of crit reduction exists at launch. The calculation clamps to a 0–100 % range, so if one is ever
added: AlwaysCrit bypasses the system entirely; stackable crit chance is reduced first; the floor is 0 %.

## §4.4.2 Confusion cannot soft-lock

With all three Active Pokémon confused the player still holds 2 skill + 2 consumable cards. Confusion cannot
stack on one Pokémon (re-applying resets the timer), so the maximum is 3 discards per turn. `full-heal` cures it.
No pity timer is needed.

