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
deterministic given the run seed — except under Trainer's Instinct, where each turn's intent was planned the turn
before (§5.5.1).

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
| `Summon(helper)` | 👤+ Call for Help → +Nidoran♀ | Brings a named companion onto the field as a support (§5.6.2) |

**The number is the hit** (v0.8.1). What an intent prints is the Resolution phase run dry on a copy of the fight:
every term the real hit has — relics, Badges, held items, abilities, flat reductions, guards, shields, faint
prevention, and what an earlier intent of the same turn does to a later one — is in it, because it *is* that hit.
The only thing it cannot know is a roll; a rider that lands on a chance is taken not to land. Measured over the
harness's whole runs: the old chip (the bare formula, the Lead's number printed for a Cleave) matched the hit that
landed 63 % of the time and 34 % for a Cleave; the forecast matches 100 % (`balance/intentAccuracy.test`).

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
| **Researched** | The `keen-eye` ability, the Marsh Badge, the `clear-mind` Legendary | This run, from combat start |

## §5.5.1 The intent queue — seeing a turn further ahead

Under **Trainer's Instinct** (Tier-3 relic, §8.6.1) every enemy plans its *next* turn at the moment it declares
this one, from what it can see now, and the plan is shown under this turn's intent. Next turn it **commits to that
plan** — the chip you read is what happens — and thinks again only when the plan can no longer be played: its move
is on cooldown or unaffordable, its target slot is empty or immune, a status it planned is redundant, or a boss
has changed phase. It says so ("changes its plan") when it does. A plan hides exactly what this turn's intent
hides (§5.5): seeing further is not seeing through a veil. An incapacitated enemy still plans its waking turn.

*Why commitment (v0.7.5):* a forecast the enemy may ignore is a guess, and Pillar 1 promises that nothing on an
intent chip is a guess. The price is honest and small: a plan made a turn early is made on older information — a
Geodude that planned Defense Curl before this turn's Curl fired will curl again — so the relic trades a little of
the AI's sharpness for a full turn of foresight. Without the relic nothing plans ahead and nothing changes.

**Battle Tracker** (Tier-2) works on the same rule from the other side: a species you have already fought this run
never hides its first intent again, as if it were Familiar (§5.13.1) for the rest of the run.

# §5.6 Multi-enemy encounters

One lead enemy plus one or two supports. **Not only a Region 3 accent** (user, 2026-09-24): fighting a group is
where the game is most strategic, so groups appear across the whole run — which nodes, and how often, is placed
with the harness (roadmap v0.8.3). Region 3 keeps the largest groups and adds field effects (§2.2).

**The formation.** An encounter says how many enemies stand on the field at once (`onField`, 1–3; 1 is the
one-after-another fight of §5.9.3). The first on the field is the **enemy Lead**, the others its **supports**;
what is left of the list waits and **fills the first place that falls free**. The enemy side is the Lead mechanic
mirrored (§3.3): the Lead stands in front of its group.

- All enemies reveal intents in the same Intent phase, each against a slot of yours (§5.2).
- Resolution order: **supports first in slot order, lead enemy last.**
- **Reach** (user, 2026-09-29). A **single-target Melee card reaches only the enemy Lead**; Ranged cards, Backstrike
  cards and **area cards** (Cleave) reach every enemy. So most Melee hits land on the Lead unless they are an area
  hit, and a support behind it is answered with a Ranged card or an area one. A Melee card aimed at a support is
  refused and says why ("out of reach") — shown in the position colour, never hidden (§9.2.3).
- **Area cards** (the player's Cleave moves) hit **every enemy on the field**, each with its own number, riders
  rolled per target. §6.3.6.4's ×1.6 budget for a `cleave` move is what pays for that.
- The player picks a target for each card that lands on an enemy (a hit, a foe status, a foe stat drop):
  **dragging the card onto the enemy**, or clicking the card and then the enemy; clicking the card again, or
  Enter, aims it at the enemy Lead. Before it is played, a card shows **its damage against every enemy it can
  hit** — the preview is per target, never one number for the fight (§9.2.4).
- **The Lead falls, the fight goes on** (user, 2026-09-29). When the enemy Lead faints, the **strongest** of what
  stands (most HP, then level; a fresh arrival from the queue counts) **steps up to lead**, and the fight ends only
  when every enemy is down. A newcomer's first intent is declared at once, as §5.1 requires.
- **Catching in a pack:** §2.6.4.1 — the ball is aimed, and a catch scatters the rest.
- **Acting twice, and calling for help** — §5.6.1 and §5.6.2.

| Support role | Share | Behaviour |
|---|---|---|
| **Attacker** | the rest (~60 %) | Leans on hits: a second threat beside the Lead's |
| **Defender** | 20 % | Shields its Lead. Its heal goes to the Lead, weighed by the Lead's missing HP; it raises its own guard. When the Lead is at or under `coverLeadHp` (35 %) and the Defender is the sturdier of the two, it telegraphs **Cover** (an enemy-only move it brings; under the threshold it outranks its own heal): at Resolution it **takes the Lead's place** — your single-target Melee cards now reach only it — with +`coverDefenseStages` (1) Defence, and the old Lead drops behind, keeping its declared intent |
| **Buffer** | 20 % | Raises its allies (a raise goes to the Lead, decaying with the stages it has banked), lowers your team's stats and puts statuses on it |

*(Rewritten 2026-09-30, the user's call: "not all, or most, of the ones behind should be supporters" — they want
attackers, defenders with a swap, and buffers. The old four roles came from each Pokémon's kit, and because most
basics carry Growl, Tail Whip or Sand Attack most of the back row was a Debuffer. Now a seeded roll gives the
share above, checked against the kit: a Buffer needs a move that can raise, lower or afflict, otherwise it
attacks; any Pokémon can defend, since the role brings Cover. The old Healer is the Defender's heal; the old
Debuffer is the Buffer's second half. Measured: Cover at a 50 % trigger and a quarter of supports cost Region 3
twenty points; at 35 % and a fifth it stands where v0.8.5 left it.)*

A support's role is authored on the encounter (`role`) and is what makes it a support. The AI is the same §5.3
scoring function with two additions: the intents a role is for score ×`supportRoleMultiplier` (1.5), and **the
group never doubles a status** — a status another enemy already declared this turn on the same slot scores 0.
Only a move that does nothing but heal or raise can be handed to the Lead (Rest would put it to sleep, Belly Drum
would cut it); anything else stays on its caster.

**Supports are meant to fall in 2–3 turns.** A support enters with `supportHpMultiplier` (0.6) of its HP and hits
with `supportAttackMultiplier` (0.7) of its Attack — a group widens a fight more than it multiplies its damage
(v0.8.5: with trainers of three fighting as trios, full-Attack supports left Region 3 teams at a third of their HP
after every trainer). **One that lingers escalates**: from its `supportEscalateFromTurn`th (4th) Intent phase on the
field it gains `supportEscalateStages` (+1) Attack at every Intent phase, up to `supportEscalateCap` (+2) in all,
logged and shown as a stage chip. A Lead never escalates — it is the fight — and **only a Pokémon with a role
escalates**: a Lead a Defender covered, now standing behind, and an Elite's or a Gym's second Pokémon are not
supports and do not grow fierce (v0.8.6: a covered Lead escalating at full Attack was most of Cover's cost). The Elite's and the Gym's second
Pokémon are the team, not supports: no role, full HP and Attack, no escalation. *(All four numbers are `BattleConfig` first values, 2026-09-29; the v0.8.7 balance
pass tunes them.)*

## §5.6.1 Acting twice

A Pokémon authored with `acts: 2` takes **two actions a turn**. Both are declared in the Intent phase and both are
shown — the second as a chip under the first, marked *Also* — and at Resolution they land **one right after the
other**, in its own place in the order (a support's two before the Lead's). The second is chosen knowing the first:
**a different move**, and never a status the first (or the group, §5.6) already means to put on that slot. Each
action is its own hit, with its own number on its chip and its own chip on the portrait it lands on (§9.2.5). A
Pokémon that cannot act (asleep, frozen, caught off guard) loses both; a hidden first intent (§5.5) hides the
second too. Trainer's Instinct (§5.5.1) plans only the first action of next turn.

*Why authored and not a rule (v0.8.2, delegated):* acting twice is the most dangerous thing an enemy can do under
Pillar 1 — two telegraphed hits a turn halve the time you have to answer — so it belongs to a few chosen Pokémon
(the fast, the legendary, a boss's last stand) placed by the encounters in v0.8.3, never to a species by a stat
threshold. A second action is priced like one: the encounter that grants it gives that Pokémon fewer HP or fewer
levels than a lone Lead would have.

## §5.6.2 Calling for help

**Call for Help** (`call-for-help`, an enemy-only move: Normal, Ranged, 1 AP, 2-turn recharge) brings the caller's
next waiting **companion** onto the field as a support. The companions are authored on the caller (`helpers`, in
order, each with its role); nothing else can answer. The call is a **telegraphed intent** like any other: its chip
reads *Call for Help → +Nidoran♀*, naming who will come, and its card says where they will stand. At Resolution the
companion steps in (`maxOnField`, 3, is the most that can stand at once — a call with no room or nobody left to
answer is a wasted turn); it declares its own intent in the Intent phase that follows at once, so **its first action
is always read before it lands**. A call turns a single fight into a group: from then on the fight refills a free
place up to its new size, and a companion counts in the fight's XP like any enemy.

The AI weighs a call like a utility move, **×`summonAloneMultiplier` (2) when the caller stands alone**, and not
at all when no companion is left, the field is full, or the rest of the group already means to fill it this turn.
The answer to a call is the one the canon has always given a telegraph: it is a turn the caller does not hit you,
and the last one against fewer enemies — finish it, or get ready for the support.

## §5.6.3 Groups across the run

Every fight node decides its shape **once, with the node**: a hash of the run's seed, the Region and the node's id
(never a draw from the map's stream, so every map ever saved stays the same map). The **node's preview card names
the shape** before you commit — *A pack of 3*, *Calls for help*, *Side by side*, *Brings a support*, *Acts twice* —
with a bubble that says what it means (Pillar 1).

| Shape | What it is | R1 | R2 | R3 |
|---|---|---|---|---|
| **Pack** | A wild node's Pokémon leads companions from its biome's common list (another species first), a level lower, each a support with the role its kit gives | 30 % of wild nodes; 15 % of packs are 3 | 40 %; 35 % of 3 | 50 %; half of 3 |
| **Caller** | A lone wild Pokémon carries Call for Help (§5.6.2) with companions waiting, a level lower. **A social species always does** (below) | 10 % + social | 15 % + social | 20 % + social, 2 waiting |
| **Two at a time** | A trainer (three Pokémon, §2.7) sends two out at once; the others take the role their kit gives | 50 % of trainers | 60 % | 70 % |
| **Three at a time** | …or three at once, when it has three | a quarter of those | 40 % | half |
| **Two at a time (boss)** | The Elite (four Pokémon, §2.8.1) and the Gym (four, §5.9.3) always fight two at a time, their whole team at full strength | ✓ | ✓ | ✓ |
| **Acts twice** | The Elite Wild acts twice (§5.6.1) at 75 % of its HP | — | — | ✓ |

**Social species** (`SOCIAL_CALLERS`) come ready to Call for Help whenever they are met wild, alone or leading a
pack, and their companions are **more of their own kind**: Rattata, Spearow, Zubat, both Nidoran, Mankey, Diglett,
Magnemite and Doduo lines — the ones the games show in swarms and colonies. *(User, 2026-09-30: "some Pokémon
start with Call for Help".)*

A support's role is rolled by its share and checked against its kit (§5.6's table). Every companion, helper and support is folded through the Region's stat tier,
status accent and the run's modifiers like any enemy. The numbers live in `GROUP_RATES` (`run/groups.ts`).

*Why so many (user, 2026-09-30): group fights are where the game is most strategic, so they are the rule, not the
exception. What it cost and what paid for it, measured over 360 runs: the padding stands under its team (trainer −4,
Elite −6, Gym −6 levels), the Elite and the Gym came down to the band (§2.8.1, §5.9.3), supports hit at 70 % and
escalate at most twice, the breather (§5.6.4) gives back what the extra enemies take, and Region 3's tier came down
(§2.2.1). Region 1 59 %, Region 2 given 1 58 %, Region 3 given 2 42 %, the whole run 15 %.*

## §5.6.4 The breather

A fight **won against a group** gives back **8 % of max HP for every enemy past the first that took the field**
(called companions included), up to **30 %**, to every standing Pokémon of the Active Team (GROUP_BREATHER), on top of
any Pocket Healer. HP persists between fights (§2.4) and a group takes more of it than a single enemy; the breather
gives back what the *extra* enemies took, so more group fights does not mean more attrition. A lost or escaped fight
gives nothing.

---

# §5.7 Counter-intel

When a boss's intent pool is **fully** revealed — by Keen Eye, the Marsh Badge, Radar Scope, the `clear-mind`
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

- **Four Pokémon, two at a time** (§5.6.3; user, 2026-09-30: "at least four, if not five" — four is where the
  harness keeps Region 3 winnable). The Leader's own non-ace opens; its lane's favourites pad the team (§2.5), six
  levels under it; **the ace always comes out last**, with three phases and Sturdy in Phase 3.
- **No mid-fight evolution.** That belongs to the Rival and the Champion. A Gym's threat is a **power premium**:
  the non-ace sits **two under** the Region's wild band top, the ace **at** it (GYM_LEVEL_PREMIUM −2 / 0 since v0.8.6,
when XP stopped carrying teams seven levels over their Region; 0 / +2 before; +4 / +6 while a Gym
  fought two Pokémon one at a time).
- **Single-type identity.** The Leader's own Pokémon are the Gym's type and its padding comes from the lane that
  telegraphs it, which is what makes the counter-pick meaningful.
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

**⭐ Plain Badge** *(Normal)* — The **first card you play each turn costs 1 less AP** (minimum 0).
*Universal efficiency, and the only Badge that changes how every single turn is built.*
*(Redesigned 2026-09-19. The original "+10 % to damage dealt and received" was close to neutral, and a Gym reward
the player cannot feel is not a reward.)*

## §5.10.2 Region 2 tier

**🔥 Volcano Badge** *(Fire)* — Offensive cards costing 3 or more AP deal +20 % damage.
**🌿 Rainbow Badge** *(Grass)* — At turn start, a Lead with a status condition restores 3 HP.
**⚡ Thunder Badge** *(Electric)* — The first Ranged move each turn costs 1 less AP (minimum 0).
**💗 Soul Badge** *(Poison)* — Applying a status condition to an enemy draws 1 skill card.

## §5.10.3 Region 3 tier

*(Built v0.7.4. The Glacier Badge's blunted attack sits on the chilled enemy until it next attacks, so the
number on its intent is already the smaller one — the telegraph stays honest.)*

**🔮 Marsh Badge** *(Psychic)* — Every Unknown intent is revealed for the first 2 turns of each combat.
**🌍 Earth Badge** *(Ground)* — Step-Forward and Step-Backward moves cost 1 less AP (minimum 0).
**🥊 Knuckle Badge** *(Fighting)* — Melee moves deal **+25 %** damage.
**❄️ Glacier Badge** *(Ice)* — When an enemy gains a status condition, its next attack deals 15 % less damage.

## §5.10.4 Summary

| Badge | Type | Tier | Effect |
|---|---|---|---|
| Boulder | Rock | R1 | Lead takes −1 incoming damage |
| Cascade | Water | R1 | Manual swap → draw 1 |
| Hive | Bug | R1 | Deck cycling: 20 % free copy |
| Plain | Normal | R1 | First card each turn −1 AP |
| Volcano | Fire | R2 | 3+ AP offensive cards +20 % |
| Rainbow | Grass | R2 | Statused Lead heals 3/turn |
| Thunder | Electric | R2 | First Ranged move −1 AP |
| Soul | Poison | R2 | Applying status → draw 1 |
| Marsh | Psychic | R3 | Unknown intents revealed, 2 turns |
| Earth | Ground | R3 | SF/SB moves −1 AP |
| Knuckle | Fighting | R3 | Melee +25 % |
| Glacier | Ice | R3 | Statused enemy attacks −15 % |

Synergy notes and the counter-pick logic: [`catalogs/modifiers.md`](catalogs/modifiers.md).

**The names are the games' own** (2026-09-24). The map shows each Badge's real art, and a player reads the name
beside it, so a Badge is called what the badge in the picture is called: Koga's Poison Gym gives the **Soul** Badge
and Sabrina's Psychic Gym the **Marsh** Badge, as in Gen I (they were the other way round, named for how they
sounded — a marsh is poisonous, a soul psychic — which put Koga's pink heart on Sabrina's door), and the Normal
and Fighting Badges take the names of the badges whose art they wear, Whitney's **Plain** and the **Knuckle**
Badge. The effects stay with their types.

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

