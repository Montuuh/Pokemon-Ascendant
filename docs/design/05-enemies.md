# Topic 5 — Enemies

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns the other side of the board:** how enemies choose what to do, how it is telegraphed, what
> bosses and Gym Leaders add on top, and the Pokédex knowledge that erodes their advantage.
> **It does not own:** what their attacks do to you (Topic 4), or where you meet them (Topic 2).

---

# §5.1 Principle

Every enemy action is revealed before the player acts. Within that constraint the AI plays **well** — the player
is solving a puzzle, not dodging dice. Intent selection is a scoring function evaluated fresh each turn, fully
deterministic given the run seed.

---

# §5.2 Intent types

Intents target **slots**. The display names the slot and its current occupant.

| Intent | Display | Behaviour |
|---|---|---|
| `Attack(N, slot)` | ⚔ N → Lead *(Squirtle)* | Single-target damage |
| `Cleave(N)` | ⚔ N → ALL SLOTS | Damages every occupied slot; N ≈ 50–70 % of its single-target damage |
| `Backstrike(N, slot)` | 🎯 N → Bench-L *(Charmander)* | Hits a named bench slot, bypassing the Lead |
| `Buff(stat)` | ⬆ Atk +1 | Raises one of its own stats a stage |
| `Stall(effect)` | 🛡 Def +1 / heal | A defensive or restorative action on itself |
| `Status(cond, slot)` | 💢 BURN → Lead | Applies a condition to the slot's occupant |
| `Unknown` | ❓ + a kind glyph | Hidden magnitude (§5.5) |

**Why slots and not Pokémon:** it gives every telegraph a counter-play. A Backstrike aimed at your fragile bench
member can be answered by moving someone sturdier into that slot — positioning becomes defensive as well as
offensive.

# §5.3 Intent scoring

```
Score(intent) = BaseWeight × TypeEffectiveness × StatusState × HPState × CooldownGate
```

| Factor | Rule |
|---|---|
| **Type effectiveness** | ×2.0 into a super-effective target · ×0.5 into a resisted one · **×0** into an immunity — the AI never attacks into an immunity |
| **Status state** | **×0** for a redundant primary status — the AI never re-applies what is already there. A target with only Confusion can still receive a primary |
| **HP state** | Target below 30 % HP → attacks on it ×2.0 · self below 40 % → aggressive intents ×1.5 · self above 70 % → setup intents ×1.5 |
| **Cooldown gate** | 0 if the move is on cooldown, 1 otherwise. High-impact moves carry cooldowns and the AI plans around them |
| **Heal weighting** | A heal or Stall scores by **missing HP**, never as setup — a healthy enemy does not waste a turn healing |
| **Buff decay** | A self-buff decays with stages already banked: `score × max(0, 1 − banked/3)`. Nothing stacks Defence Curl four times |
| **Tie-break** | Equal scores resolve **toward the offensive intent** |
| **Backstrike targeting** | Picks the bench slot where it would deal the most damage |

**Randomness floor.** Each turn there is a seeded **12.5 %** chance the AI takes a non-top intent. It keeps the
scoring function from being perfectly reverse-engineered without making it play badly.

*(The heal-weighting, buff-decay, tie-break and Backstrike-targeting rules came out of the v0.1 playtest, where
a Geodude spent a losing fight using Defense Curl. Ratified 2026-09-19.)*

# §5.4 Cleave and Backstrike

**Cleave** damages every currently occupied, non-fainted slot. It **never fizzles**: with one Pokémon left, it
hits that one.

**Backstrike** targets a bench slot declared in the Intent Phase.

## §5.4.1 Empty-slot resolution
If the targeted bench slot is empty at Resolution — nobody there, or its occupant already fainted — the
Backstrike **fizzles**. It deals no damage and it does **not** redirect to the Lead. Leaving no bench means you
cannot be Backstruck; that is the trade.

# §5.5 Unknown intents

An Unknown intent hides an enemy's action behind ❓.

**What is still visible.** An Unknown intent always shows its **kind glyph** — you know a Cleave, a Status or an
Attack is coming, just not its magnitude or exact target. A hidden intent that could delete a bench Pokémon with
no warning at all is an ambush, not a read you missed. *(Decided 2026-09-19 after the v0.1 playtest, where a
Gym ace's hidden opener was a Cleave that removed a bench member.)*

**Where they occur**

| Encounter | Baseline |
|---|---|
| Wild, Trainer | None — every intent is visible from turn 1 |
| Elite, Gym | **Exactly one per enemy**: its first intent is hidden. Once it acts, everything it does afterwards is visible for the rest of that combat |
| Dense Fog modifier | Extends the one-per-enemy rule to Wild and Trainer fights too (§8.8.2) |

**How they get revealed**

| Tier | Trigger | Scope |
|---|---|---|
| **Witnessed** | The enemy uses the move | Rest of this combat; permanently logged in the Pokédex |
| **Scouted** | `foresight` move or `radar-scope` consumable | This combat |
| **Researched** | The `keen-eye` ability, the Soul Badge, the `clear-mind` Legendary | This run, from combat start |

# §5.6 Multi-enemy encounters

A Region 3 accent: one lead enemy plus one or two supports.

- All enemies reveal intents simultaneously.
- Resolution order: **supports first in slot order, lead enemy last.**
- The player picks a target for each offensive card.

| Support role | Behaviour |
|---|---|
| **Healer** | Restores the lead enemy's HP |
| **Buffer** | Buffs the lead enemy |
| **Debuffer** | Applies status to the player |
| **Attacker** | Extra damage |

Supports have reduced HP and are meant to die in 2–3 turns; one that survives longer escalates. Every support
uses the same scoring function, so a Debuffer never double-applies and a Healer waits until it matters.

---

# §5.7 Counter-intel

When a boss's intent pool is **fully** revealed — by Keen Eye, the Soul Badge, Radar Scope, the `clear-mind`
Legendary, or a combination — the boss's AI changes:

- Its top-scored intent is multiplied by **0.7**, so it sometimes plays its second or third choice.
- The randomness floor is **disabled**; counter-intel replaces it as the variance source.
- A `Counter-Intel Active` badge appears under the boss's portrait — the system is transparent even though its
  output varies.

**Standard enemies never use counter-intel.** They always play optimally regardless of what you know; full
information is the player's reward for investing in it.

---

# §5.8 Bosses

1. **Multi-phase structure** — behaviour escalates at visible HP thresholds.
2. **Scripted phase patterns** — the phase constrains intent type; scoring still picks the target.
3. **Unique mechanics** — Home Fields, per-type signatures, mid-fight evolution for the Rival and Champion.
4. **Permanent rewards** — Badges, Rare and Legendary relics, meta XP.

## §5.8.1 Phase behaviour

Bosses follow scripted phase patterns with condition-based transitions. Within a phase the scoring function
still chooses the target — a phase constrains the intent *type*, not the intent *target*.

| Phase type | Behaviour |
|---|---|
| **Mass Attack** | Every intent is Attack or Cleave |
| **Mass Status** | Every intent applies a condition, chosen strategically |
| **Setup** | Aggressive self-buffing ahead of a payoff |
| **Signature** | The highest-impact move, ignoring its cooldown |
| **Evolution** | The Pokémon evolves mid-fight, telegraphed one turn ahead |

**Mid-fight evolution** belongs to the **Rival** and the **Champion** only — Gym aces do not evolve (§5.9.3).
One turn before: `✨ [name] is gathering energy — EVOLUTION IMMINENT.` The player gets one turn to burst it below
the threshold or prepare. On evolution: stats rise, the move pool swaps, HP carries across as a percentage, and
the intent pattern resets.

## §5.8.2 Boss tiers

| Tier | Count | Pokémon each | Phases | Fights |
|---|---|---|---|---|
| Gym Leader | 3 per run (of 12) | 2, sequential | 2; ace 3 | 6 |
| Elite Four 1–2 | 2 | 2, sequential | 2; ace 3 | 4 |
| Elite Four 3–4 | 2 | 3, sequential | 2; ace 3 | 6 |
| Champion | 1 | 5 (final two simultaneous) | 2–3; ace 3 + evolution | 5 |
| **Total** | | | | **21 boss-tier Pokémon** |

## §5.8.3 Phase structure

Thresholds are drawn as notches on the enemy's HP bar.

| Phase | Trigger | Behaviour |
|---|---|---|
| **Phase 1** | HP > 50 % | Setup and reading the player: Buff, Status, methodical Attack |
| **Phase 2** | HP ≤ 50 % | The forced phase type fires (§5.9.4 for Gyms) |
| **Phase 3** *(aces)* | HP ≤ 20 % | Last stand: cooldowns reset, the signature move fires uncapped, Sturdy may save one lethal hit |

## §5.8.4 Stages persist across phases
Stat stages — the boss's own buffs and the player's debuffs alike — carry through every transition. A boss
debuffed −2 Attack in Phase 1 enters Phase 3 still at −2.

---

# §5.9 Gym Leaders

## §5.9.1 The fork
Each Region's map splits at layer 9 into two routes leading to two different Gym Leaders. **Both Gyms' types and
Badges are visible when the choice is made**; the unchosen one is abandoned for the run. This is Pillar 1 applied
at the macro scale — a counter-pick, not a coin flip.

## §5.9.2 The type pool

| Region | Pool |
|---|---|
| 1 | Rock · Water · Bug · Normal |
| 2 | Fire · Grass · Electric · Poison |
| 3 | Psychic · Ground · Fighting · Ice |

The seed draws **2 distinct types** per Region and assigns one to each terminal Gym node. Twelve Gym types
exist; a run earns 3 Badges, so nine are missed — 220 possible three-Badge combinations.

## §5.9.3 Leader design rules

- **Two Pokémon, sequential.** The second is the ace, with three phases and Sturdy in Phase 3.
- **No mid-fight evolution.** That belongs to the Rival and the Champion. A Gym's threat is a **power premium**:
  the non-ace sits 4 levels above the Region's wild band, the ace 6.
- **Single-type identity.** Every Pokémon on the team is the Gym's type, which is what makes the counter-pick
  meaningful.
- **But never a free win.** Each team carries at least one answer to a full-resist party — usually an
  off-type coverage move, like the Rock Gym's Fighting-typed `body-press`.
- **A Home Field** of its type is set at combat start (§4.3.5).
- **Giovanni is both** a Gym Leader (Viridian, Ground, Region 3) and an Elite Trainer (§2.8.1). A run can face
  both; both are canon.

Teams, levels and badges for all twelve: [`catalogs/gyms.md`](catalogs/gyms.md).

## §5.9.4 Per-type signature Phase 2

Every Gym type maps to exactly **one** of four Phase-2 archetypes. They are telegraphed, learnable and
repeatable — the point is that a second run against the same type is a different experience because you know
what is coming.

| Archetype | Types | Phase 2 does | Counter |
|---|---|---|---|
| **Entrenchment** | Rock, Ground | +2 Defence stages and a damage-reduction clause — race the wall | Damage-over-time, stat-stage strip, Defence-ignoring moves |
| **Status Siege** | Poison, Grass, Bug | Floods the Lead with the Gym's signature condition | Cleanse, swap the statused Lead, immune typing |
| **Onslaught** | Fire, Fighting, Normal | Mass Attack, amplified ×1.5 by the Home Field — a burst race | Resist wall, defensive swaps, healing |
| **Tempo Control** | Electric, Psychic, Ice, Water | AP and swap taxes plus Paralysis and Freeze locks | AP management, status immunity, planning two turns ahead |

# §5.10 Badges

Twelve Badges, one per Gym type. **Three per run** from the Gyms you fight, plus up to **one** bonus Badge —
Victory Road's Perfect Clear (§2.12.6); a City pays none. A Badge is permanent from the moment it is awarded.

## §5.10.1 Region 1 tier

**🪨 Boulder Badge** *(Rock)* — Your Lead reduces all incoming damage by 1 (minimum 0).
*Durability. Flat reduction matters enormously early and gracefully stops mattering late.*

**💧 Cascade Badge** *(Water)* — After a manual Lead swap, draw 1 extra skill card this turn.
*Tempo. It converts the AP you spend swapping into card advantage — the single best Pillar-2 reward.*

**🐛 Hive Badge** *(Bug)* — When a skill card cycles from the discard pile back into the deck, 20 % chance to
generate a free copy in your hand next turn.
*Deck velocity. Cheap, fast decks cycle more and get paid more.*

**⭐ Normal Badge** *(Normal)* — The **first card you play each turn costs 1 less AP** (minimum 0).
*Universal efficiency, and the only Badge that changes how every single turn is built.*
*(Redesigned 2026-09-19. The original "+10 % to damage dealt and received" was close to neutral, and a Gym reward
the player cannot feel is not a reward.)*

## §5.10.2 Region 2 tier

**🔥 Volcano Badge** *(Fire)* — Offensive cards costing 3 or more AP deal +20 % damage.
**🌿 Rainbow Badge** *(Grass)* — At turn start, a Lead with a status condition restores 3 HP.
**⚡ Thunder Badge** *(Electric)* — The first Ranged move each turn costs 1 less AP (minimum 0).
**💜 Marsh Badge** *(Poison)* — Applying a status condition to an enemy draws 1 skill card.

## §5.10.3 Region 3 tier

**🔮 Soul Badge** *(Psychic)* — Every Unknown intent is revealed for the first 2 turns of each combat.
**🌍 Earth Badge** *(Ground)* — Step-Forward and Step-Backward moves cost 1 less AP (minimum 0).
**🥊 Fist Badge** *(Fighting)* — Melee moves deal **+25 %** damage.
**❄️ Glacier Badge** *(Ice)* — When an enemy gains a status condition, its next attack deals 15 % less damage.

## §5.10.4 Summary

| Badge | Type | Tier | Effect |
|---|---|---|---|
| Boulder | Rock | R1 | Lead takes −1 incoming damage |
| Cascade | Water | R1 | Manual swap → draw 1 |
| Hive | Bug | R1 | Deck cycling: 20 % free copy |
| Normal | Normal | R1 | First card each turn −1 AP |
| Volcano | Fire | R2 | 3+ AP offensive cards +20 % |
| Rainbow | Grass | R2 | Statused Lead heals 3/turn |
| Thunder | Electric | R2 | First Ranged move −1 AP |
| Marsh | Poison | R2 | Applying status → draw 1 |
| Soul | Psychic | R3 | Unknown intents revealed, 2 turns |
| Earth | Ground | R3 | SF/SB moves −1 AP |
| Fist | Fighting | R3 | Melee +25 % |
| Glacier | Ice | R3 | Statused enemy attacks −15 % |

Synergy notes and the counter-pick logic: [`catalogs/modifiers.md`](catalogs/modifiers.md).

---

# §5.11 The Elite Four

> 🔒 **Deferred.** Specified, not built. The build order completes the Region 1 → Victory Road loop first.

Four sequential boss trainers, no map navigation, a **30 % HP micro-rest** between fights.

| Fight | Difficulty | Team |
|---|---|---|
| Elite 1 | Easiest League fight — a recalibration, slightly easier than Gym 3 | 2 |
| Elite 2 | A meaningful step up | 2 |
| Elite 3 | Near-Elite-4 | 3 |
| Elite 4 | The hardest non-Champion fight | 3 |

Rules: a distinct type identity each; mixed field effects the player has not met at boss intensity; counter-intel
active when fully scouted (§5.7); the ace always has three phases.

---

# §5.12 The Champion

> 🔒 **Deferred**, with §5.11.

Five Pokémon covering multiple types — no single counter works across the team. Pokémon 1–3 are sequential;
**4 and 5 are fielded simultaneously**, the only encounter in the game that does, with the support healing or
buffing the ace. Every Champion Pokémon has at least two phases; the ace has three and evolves at 50 %.

## §5.12.1 Signature — Full Team Synergy

Each defeated Champion Pokémon buffs the survivors: **+5 % Attack per fallen ally, capped at +20 %**. It is
displayed from the first turn ("Each fallen ally empowers their teammates") and shown as a live stack on the
remaining HP bars.

---

# §5.13 The Pokédex

The Pokédex is the **cross-run knowledge artifact**: it records the species you have met, caught and knocked
out, and converts knock-outs into information about the enemy. It is about the species you *fight*; making
your own Pokémon better is the Bond (§6.8). This section owns the threshold and the reward; §8.9 owns only how
it is persisted.

## §5.13.1 Familiar

| Rarity | Knock-outs | Reward |
|---|---|---|
| Common | 10 | **Familiar** — the species' Unknown intents are revealed from turn one, in every fight from then on |
| Uncommon | 5 | |
| Rare | 2 | |

Kill credit comes from knocking a copy of the species out — wild or trainer-owned — with **any** of your
Pokémon. **Catching does not award kill credit** — you learn about a species by fighting it.

Familiar is the only tier. The Pokédex used to climb to Veteran (Shiny) and Master (the Mastery Move); both
moved to the Bond on 2026-09-21, because earning your partner's palette and its signature card by knocking out
its wild cousins read backwards, and because the Pokédex is better at one thing said clearly than three things
said confusingly.

## §5.13.2 Mastery Moves

Every species line has a Mastery Move defined across its stages — a dedicated **5th card slot** outside the
active-4 configuration.

- **Immutable.** No TM, tutor, evolution or Move Manager can touch the Mastery slot.
- **Three tiers, one per stage.** Lv1 on the base form (60–80 power, 1 AP, no modifier); Lv2 on the middle stage
  or a two-stage line's final form (85–110, 1–2 AP, one modifier or rider); Lv3 on a three-stage final form
  (110–140, 2–3 AP, a composite species-unique effect).
- **It advances with evolution**, but only if that tier has been unlocked in your account. Otherwise the
  Pokémon keeps the tier it has.
- **Unlocks are per line, across runs**, by Bond rank (§6.8.2): Lv1 at Companion, Lv2 at Deep Bond, Lv3 at
  Soulbound on a three-stage line. A Soulbound two-stage line instead opens every fight with its Mastery card
  in hand.

**Deck integration.** Deck size = 12 + 1 per Active member with an unlocked Mastery, to a maximum of 15. Hand
size stays 5. When a Mastery-unlocked Pokémon faints, **5** cards leave the deck and discard, not 4.

Full line-by-line catalogue: [`catalogs/mastery-moves.md`](catalogs/mastery-moves.md).

**Shiny implementation:** no second sprite set is *authored*. The build fetches the official shiny palette of
each battle sprite beside the normal one (the same source as the rest of the sprites), because a real shiny
palette is available and a hue-shift over a real sprite would be the one invented thing on screen. A
hue-shift remains the fallback for any species whose shiny is missing.

---

