# Codex — the whole game in one file

> **A derived digest, not canon.** Read this first for any design or gameplay task: it gives you the shape of
> every system and how they interact. Then open the cited `§` in the topic file before writing a number, a rule
> or an edge case anywhere. **When this file and a topic file disagree, the topic file wins** and this one needs
> regenerating.
>
> **Reflects canon as of 2026-09-19**, after the full design pass. Regenerate the affected section whenever a
> topic changes meaningfully, and bump that date.

---

## 1. Identity

A **roguelike deckbuilder where your party is your deck**. Three Active Pokémon each contribute 4 moves to one
shared hand. The moment-to-moment signature is **Lead/Swap AP tension**; the run-to-run signature is **branching
evolutions that rewrite the deck**. Gen I, fan-made, free, non-commercial.

**Pillars** — 1 Telegraphed tactics over reactive RNG · 2 Every swap is a decision · 3 Synergy is sculpted, not
drafted · 4 Identity through Evolution · 5 Cheerful core, regional flavour.
**Tiebreaker** — pacing and pillars beat faithfulness; flag the conflict.
**Anti-pillars** — not a Showdown clone, not card-acquisition, not mass-collection, not an auto-battler, not
grimdark.
**Audience** — Slay the Spire players first (mechanics, pacing), Pokémon fans second (theming, emotional beats).

---

## 2. The run *(Topic 2)*

Pre-run → Region ×3 → Victory Road → League. **90–100 minutes** for a win. 8 climactic fights = 21 boss-tier
Pokémon.

- **Pre-run:** difficulty → starter → 1 of 3 Starting Relics → 1 of 3 Region Modifiers. Confirming the modifier
  **locks the seed and generates the map**. The Box holds only the starter.
- **A Region:** a seeded 12-layer branching tree ending in a **Gym fork** at L9 — two routes, two Gyms, both
  announced. One guaranteed Elite Trainer ≈L7, one Center per Gym lane, ≈1 Dojo, 2 Mystery, 1 Shop, ≤1 Elite Wild.
- **A City** (after Gyms 1 and 2) is a **lobby** — a drawn town whose buildings are doors, no visit budget, the
  gate leaves when you say so. **Pallet Town** (4 doors) then **Celadon City** (more, dearer). Routes keep only a
  nurse (+50 % HP) and a travelling merchant; the shop and the only Dojo are in the Cities. *(2026-09-22.)*
  Superseded: a City was a **Choice Plaza** — Shop and Reflection always, plus **2 of** {City Gym,
  Center, Grand Dojo, Black Market}.
- **Region Modifiers are per-Region**: exactly 1 active, re-picked each Region, expiring with it. Relics and
  Badges are the run-long systems.
- **Victory Road:** Gauntlet (no heal, 1-of-3 Rare), Apex recruit, Training Grounds (a free upgrade), Summit
  (full heal + 1-of-3 Legendary + League preview).
- **League** 🔒 deferred: 5 fights, 30 % micro-rest between them.
- **Escalation is mechanical**: R1 baseline · R2 status on enemy intents · R3 multi-enemy + field effects. The
  numeric half (§2.2.1): enemies at their evolved forms from R2, an enemy stat tier (Attack ×1 / ×1.6 / ×2.3, HP
  ×1 / ×1 / ×1.15), and a curve the harness holds — R2 ~60 % given R1, R3 ~50 % given R2, the whole run ~1 in 6.

**Box & Active Team.** Box capacity 6 (→8). Active Team is 3, locked on node entry; only those 3 contribute
cards. Overflow on recruit → **Swap or Skip**, and releasing is permanent.

**HP persists** across combats and nodes. `currentHP == 0` **is** fainted. No in-combat revival except the
`revive` consumable. Every faint costs a **Trauma stack**.

---

## 2. The map and its nodes *(Topic 2, continued)*

**12 layers.** L0 choose 1 of 3 (no forced Wild) · a Wild reachable by L1–2 · trunk L1–8 · **Elite ≈L7** ·
**fork at L9** · a Center in each lane · **two Gyms at L11**. Seed-deterministic; on resume the map is
**re-derived by replay**, never restored from a cursor.

**Wild nodes** offer **3 species up front** — 2 Common + 1 Uncommon, ~10 % upgrading the Uncommon to Rare.
8 biomes bound to Regions; only **Naturalist's Lens** can steer them.
**Recruit bands:** R1 5–10 · R2 12–20 · R3 22–30.

**Running (§3.1.2, 2026-09-21)** — any Action-phase turn except a Gym: the enemy's telegraphed action lands, the
fight ends as Escaped (no XP/drop/catch), and the toll comes off: wild −20 % ₽ + Trauma on the Lead · trainer
−30 % + Trauma on all + a consumable · Elite −50 % + Trauma on all + a relic (never Legendary).

**Catching — a roll at a shown number** (2026-09-21). `p = catchRate × (1 − 0.9·HP%)^1.7 × status × ball`,
clamped 1–90 %: the species' ceiling (common 0.9 · uncommon 0.7 · rare 0.5, ×0.65 middle stage, ×0.4 final;
Snorlax 0.2), a steep HP curve, ×1.5 asleep/frozen or ×1.2 any other status. ~2 % at full HP for a common
basic, 33 % at half, 58 % at a quarter. The card plays at any odds; a miss spends the ball and the turn. Seeded
from the fight's stream. Master Ball Charm arms one sure throw per run. 0 HP loses the recruit. A catch is a
**Victory with full XP**. Balls are counted: start 3, +1 per Region, one per attempt either way.

**Trainers** — 9 archetypes, 1–2 Pokémon sequential, band = wild +1/+2, no hidden intents.
**Elite Trainer** — guaranteed, 2 Pokémon 2 phases, **Rare relic 1 of 3**. Roster by Region: Rival 80/60/40 %,
Giovanni 30 % in R3, otherwise a Specialist. The **Rival counter-picks your starter** and scales by Region band.
**Elite Wild** — a catchable boss-wild, ≤1 per Region, not on every route: **catch it** for the rare recruit or
**defeat it** for one Rare relic. Phase 2 makes it *easier* to catch.
**Mystery Events** — 22, tagged 🟢 Safe 30 % / 🟡 Tradeoff 50 % / 🔴 Gamble 20 %, badge visible before entering,
never repeating in a run.
**Shops** — Region: 3 consumables + 2 relics + ball + 1 special, re-roll 25/50/100 ₽. City: 8 **team-curated**
slots, +30 % prices, sells at 30 % (the only money exit).

---

## 3. Combat — your turn *(Topic 3)*

Atomic — no mid-combat save, no flee. Two outcomes, checked continuously; a lethal card play ends it instantly.
**Inside Resolution, all damage and faints resolve before outcomes are checked, and Defeat wins a tie.**

**Five phases:** Combat Start (once) → **Draw → Intent → Action → Resolution** → loop.

- **Draw:** 5 skill + 2 consumable cards; AP → 3; swap counter → 0; Confusion discards.
- **Intent:** each enemy reveals one intent targeting a **slot**, showing kind, magnitude and the slot's current
  occupant.
- **Action:** spend 3 AP on cards (0–3, rare 4), consumables (0–2) and swaps. Effects resolve immediately.
- **Resolution:** intents fire (supports first, lead enemy last) → status ticks → faints → outcome check → hand
  to discard.

**The Lead mechanic** — the Lead absorbs 100 % of single-target damage; Cleave and Backstrike are the
telegraphed exceptions. **Manual swap costs 1 / 2 / 3 AP** within a turn, resetting each turn, and **only manual
swaps count**. A manual swap discounts the **first Defensive card after it by 1 AP**. **Melee is Lead-only**
unless the card has Step-Forward; **Ranged plays anywhere** at ×0.75.

- **Step-Forward:** played from the bench, that Pokémon leads *before* the effect.
- **Step-Backward:** played from the Lead, the effect resolves *then* you swap to a chosen bench member.
- Neither increments the counter; neither gets the discount; both are Melee-only and mutually exclusive.
- **Faint:** Lead faints → pick any bench member free. Bench faints → it just leaves. Either way its 4 moves
  (+Mastery) are **purged from deck and discard**. A Frozen Lead that faints voids the lock.

**Deck** 12 (→15 with Mastery), hand always 5, discard reshuffles when empty.
**Consumables** are a per-combat roster: 2 drawn per turn, once each, **all returned at combat end** (except
under No Refunds). Balls and TMs are the genuinely expendable classes.

---

## 4. Resolution — the maths *(Topic 4)*

**Damage** = `floor( Power × (Atk/Def) × Range × Crit × STAB × TypeEff / 8 )`. One floor at the end. No minimum
clamp — only immunity deals 0. Level is not in the formula.
**Divisor 8** · STAB 1.5 · Crit 1.5 · Ranged 0.75.
**Stats:** one Attack, one Defence, derived from Gen I as `attack = max(Atk, Spc)`,
`defence = round((Def+Spc)/2)`. Effective = `base + growth×(level−1)`, then stage, then status.

**Type chart:** Gen I **15 types** exactly — no Dark, Steel or Fairy. ×4 / ×2 / ×1 / ×0.5 / ×0.25 / ×0; dual
types multiply; immunity always wins. Steel-typed source moves are typed Rock here.

**Crit:** base **0 %**. Only AlwaysCrit moves, consumables and abilities grant it; additive, soft cap ~30–35 %.

**Status** — all deterministic, one primary plus Confusion. **Every status persists into the next fight** —
Burn and Poison until cured, the timed ones with what is left of their turns (§4.2.7.1); stat stages clear at
combat end:

| | Effect | Duration | Immune |
|---|---|---|---|
| **Burn** | `EffMaxHP/16`/turn, Attack −25 % | permanent | Fire |
| **Poison** | `EffMaxHP/16`/turn, Defence −15 % | permanent | Poison |
| **Paralysis** | its moves cost +1 AP | 3 turns | Electric |
| **Sleep** | its cards unplayable, position free | 1 turn | — |
| **Freeze** | cards unplayable + **position-locked** + ×1.5 Fire taken | 1 turn | Fire, Ice |
| **Confusion** | discards 1 skill card/turn per Confused Pokémon | 3 turns | — |

Applied on turn N, effective from N+1. DoT uses **Effective** Max HP. Stage first, then status, multiplicatively.
**Stat stages:** linear ±6, 0.4 → 1.6 at ±0.1 per stage, reset at combat end, **persist across boss phases**.
**On the enemy side:** Paralysis prices intents out of its 3-AP budget, Sleep/Freeze skip its action, Confusion
makes it pick uniformly among legal intents — still telegraphed, just no longer smart.

**Fields** — 4 launch fields (Sunny, Rain, Electric Terrain, Sandstorm), each either a neutral **Battlefield** or
an enemy-owned **Home Field** (its type ×1.5, no player boost). Weather and Terrain coexist. `defog` clears any.

---

## 5. Enemies — their turn *(Topic 5)*

**AI** — everything telegraphed, and good within that.
`Score = BaseWeight × TypeEff × StatusState × HPState × CooldownGate`. Never attacks into immunity, never
re-applies a status. Target <30 % HP ×2 · self <40 % aggressive ×1.5 · self >70 % setup ×1.5. Heals weigh by
**missing HP**; self-buffs **decay with banked stages**; ties go **offensive**; Backstrike picks the best bench
slot. **Randomness floor 12.5 %.**
**Cleave never fizzles. Backstrike fizzles on an empty slot and never redirects.**
**Unknown intents:** none for Wild/Trainer; **one per enemy** for Elite/Gym (its first); Dense Fog extends it.
A hidden intent **still shows its kind glyph**. Reveal tiers: Witnessed → Scouted → Researched.
**Counter-intel:** a fully-scouted boss deprioritises its top intent ×0.7 and loses the randomness floor.
Standard enemies always play optimally.

**Bosses** — ≥2 phases, aces 3. P1 setup > 50 % · P2 forced type ≤ 50 % · P3 last stand ≤ 20 % (cooldowns reset,
signature uncapped, Sturdy). **Gyms:** 2 Pokémon, ace 3-phase, **no mid-fight evolution** — the threat is a level
premium (+4 non-ace, +6 ace) plus a Home Field. Mid-fight evolution belongs to the **Rival and the Champion**.
**Per-type Phase 2:** Entrenchment (Rock, Ground) · Status Siege (Poison, Grass, Bug) · Onslaught (Fire,
Fighting, Normal) · Tempo Control (Electric, Psychic, Ice, Water).
**Gym pool:** 4 types per Region, seed picks 2. R1 Rock/Water/Bug/Normal · R2 Fire/Grass/Electric/Poison ·
R3 Psychic/Ground/Fighting/Ice. **12 Badges, 3 per run, max 4.**
**Champion:** 5 Pokémon, the last two simultaneous, +5 % Attack per fallen ally, cap +20 %.

**Pokédex** — cross-run knowledge about the species you fight. **Familiar** (10/5/2 knock-outs by rarity)
reveals Unknown intents from turn one, and is the only tier. Catching awards no kill credit.

**Bond** (§6.8, 2026-09-21) — per *line*, filled by playing it: +1 per won fight in the Active Team (+1 leading),
+5 per evolution, +2 a first recruit, +8 finishing a run, +15 winning one. Five ranks at 5/15/35/60/100:
**Companion** Mastery Lv1 (the immutable 5th card) · **Trusted** Shiny · **Veteran** the hidden ability (the
line's third authored one, greyed at the Dojo until then) · **Deep Bond** Mastery Lv2 · **Soulbound** Mastery
Lv3 on three-stage lines or the Mastery card in every opening hand, and the line may start a run.

---

## 6. Progression *(Topic 6)*

**XP** by tier: wild 48 / trainer 72 / elite 110 / gym 200, scaled by the level gap (Gen V's formula, §6.2.1).
**Active 100 %, benched Box 75 %** (`exp-share` → 100).
Level-ups between nodes. Curve `12 + (L−1)×4`. Single-stage species get +25 % growth.

**Learnset** — a base form knows **2 moves at level 1** and learns more by level; deck contribution is
`min(known, 4)`. A run opens with a **two-card deck** and thickens as you recruit and level. Learnset levels are
clamped below the evolution level so nothing is lost.

**Evolution** — player-initiated between nodes, permanent. **12 and 26** are the uniform thresholds (a few
bespoke exceptions, e.g. Magikarp at 18). At **each** evolution you freely choose an archetype —
**Vanguard / Specialist / Support** — and stage 1 does not lock stage 2. Payload: **stat upscale + 1–2 in-place
upgrades + at most one addition**, the final one being the species **signature**. Most lines have 2 archetypes;
starters and high-rarity have 3.

**Evolution Items** let a line evolve **earlier** and open the stone branch; the level path always remains.

**Learned Move Pool** — grows from levelling, evolution, TMs and the Dojo; **nothing is ever removed**; the pool
deduplicates. The **active 4** is the fixed budget, reconfigurable free between nodes. Mastery is the 5th.

**Abilities** — one slot, from the species' `availableAbilities` pool. The **first pool entry is granted at the
first evolution**; the **Dojo sets or swaps** it thereafter. 38 authored across 8 categories.
**Lead Aura** (ability- or Type-Plate-granted): while the wearer leads, bench moves of that type +5 %, additive.

**The Dojo** — a paid node, ~1 per Region: an off-learnset move (150 ₽) and/or an ability (200 ₽). Stage-aware
tutor lists, no offer cap. The run's main money sink and its sculpting stop. Centers no longer tutor.

---

## 7. Items *(Topic 7)*

**Consumables** in-combat and returned · **Relics** persistent run-state · **Held Items** one per Pokémon ·
**TMs** a Map-View consumable class.

- **28 consumables.** Healing is a **percentage** of Effective Max HP: 25 / 45 / 70 / 100 %. Five 0-AP single
  cures plus a **1-AP** Full Heal. Ether **1 AP for +2**. Radar Scope, Smoke Bomb, Card Pocket, Quick Claw,
  Defog. Balls and five Evolution Stones.
- **60 relics.** 25 Common (15 of them the +15 % party type charms) / 18 Uncommon / 7 Rare / **10 Legendary**.
  Legendaries are **choice-only, 1-of-3 at Gym victories, the Summit and the Black Market, max 2 per run**.
- **19 held items.** 8 type boosts (+20 % wearer-only) · 5 Type Plates (Lead Aura) · Leftovers, Eviolite, Focus
  Sash · Choice Band, Choice Scarf · Thick Club.
- **15 TMs**, gated by `compatibleSpecies`, Mastery-exempt.
- **Faint prevention order:** Sturdy → Last Stand → Focus Sash → Phoenix Feather.

---

## 8. Meta progression *(Topic 8)*

**Failure is fuel · unlocks expand options, never power · Trauma is the in-run consequence.**

**Trauma** — +1 stack per faint, per instance, run-scoped, carried through evolution, 0 on every recruit.
Two-zone curve: **−5 %/stack for 1–5, −10 % for 6–10, floor −75 %**. Every heal *and* every DoT uses the
resulting **Effective Max HP** — a full heal restores your current ceiling, never your original one. Cleared by
the Trauma Salve relic (all), Therapy at `100×(1+stacks)` ₽ (one), or the Daycare event (all). Sturdy and Last
Stand prevent the faint, so they prevent the stack.

**Two currencies.** **Trainer XP** is earned every run and never spent; it drives **Trainer Level**
(`floor(500 × N^1.6)`), which advances a **reward track** that **pays Tokens at every level** (2; 5/5/8/8/10/10
at the milestones; 92 by Level 30) and **opens the Poké Mart's shelves** at 3/5/8/10. **Trainer Tokens** also
come from Gold (+2) and Platinum (+5) achievements, and buy **everything on an open shelf**. XP decides what is
for sale; Tokens decide what you take home. The shop (~210) outruns the income (~156) on purpose.

**Hub** — PC Terminal (Pokédex · Medals · Discoveries; the Pokédex is the one book: cards that open a sheet with
Record · Kit · the line's Bond, §8.9.2, and a per-species record, §8.9.1), Trainer Card, Poké Mart (from the
start), Daycare Lady (Lv 3), Mystery Door (post-launch).
**Poké Mart shelves** — Trainer's Corner Lv 1 (titles 2, avatars 3, frames 2, Curated Starting Relic +1 3) ·
Starters Lv 3 (Magikarp 4, Eevee 6, Pikachu 6) · Hub upgrades Lv 5 (4–8) · Discoveries Lv 8 (any undiscovered
Tier-2, 4) · Mastery lane Lv 10 (Tier-3, 5). 7 Hub upgrades, all QoL, all sold.
**Starters** — 3 default + 3 meta bought at the Mart; any Soulbound line (Bond 5) for free.
**Relics** — 60 = 50 drop-pool + 10 Legendary. Meta tiers T1 20 / T2 20 event-unlocked or bought / T3 10
Token-bought; tier ≠ rarity. Drop weight 60/30/10.
**Achievements** — 50, four medal tiers, ~20 % hidden, 20 grant Tokens, every one with a named trigger event.
**Difficulty** — 10 stackable modifiers multiplying run XP; **no easier mode**; baseline is the floor. Each
opens at a Trainer Level (§8.8.2) and only there — the track pays Tokens and opens shelves, nothing else.

*(Section reflects canon as of 2026-09-21 evening: the track pays and opens, the Mart sells (§8.3.4–§8.3.5,
§8.4.4 cosmetics); the track settles idempotently, the account is written after every fold in the browser,
Pokédex Insight is a first-meeting peek at species not yet Familiar (§8.4.2), and Shiny is the official palette
fetched rather than a hue-shift — §5.13.2.)*

---

## 9. Presentation *(Topic 9)*

Two warm themes: a cream **front-end** and a deep-plum **combat stage**. Baloo 2 + Nunito. 15 canonical type
hues, always paired with a glyph so colour is never the only channel. On the light theme the semantic accents
may be fills, tints or borders — **never running text** (they fail AA).

**Combat is a squad formation**: player cluster left with the Lead forward and crowned, a single enlarged enemy
right, an intent **chip** above it, the hand tray along the bottom, and the **damage preview beside the target**.
The preview shows the final number, the full breakdown, crit, riders and a KO flag — it calls the same function
the sim does. Unplayable cards are **desaturated, never hidden**: amber means AP, blue means position.

**Accessibility is staged**: reduced motion and text size at v0.5 because they are expensive to retrofit; the
rest at v0.9. Information never waits on an animation.

27 screens specced in `ui/` with rendered mockups; three are built.

---

## 10. Foundations *(Topic 10 + `docs/architecture.md`)*

**Data-driven · decoupled · deterministic.** `src/sim` is pure and must run headless in Node — that is what
makes the balance harness and the golden masters possible.

**RNG:** xorshift32, cursor **in the state**, five isolated streams (Map, Combat, Loot, Mystery, Encounter) with
`streamSeed = fmix32(runSeed ^ fnv1a(name))`.
**Replay:** every run records an input log by default; seed + log reproduces it bit-exact. Golden-master
fingerprints guard the rules; a change without a note is a regression.
**Save:** three layers (Meta / Run / Settings) behind a **provider interface** — local storage with export and
import now, a file at v1.0, a **logged-in server profile** after that. Autosave on node entry; **no mid-combat
save**. Map RNG is re-derived, never restored.

---

## 11. Where to verify

| Need | § | File |
|---|---|---|
| Pillars, scope, legal, glossary | §1.3 · §1.6 · §1.9 · §1.10 | **1** Overview |
| The run, Box/Active, HP | §2.1 · §2.3 · §2.4 | **2** The Run |
| Map, biomes, catching, trainers, elites, events, Cities, Victory Road | §2.5–§2.14 | **2** The Run |
| Phases, Lead, swap, deck, consumables, AP | §3.2 · §3.3 · §3.4 · §3.5 · §3.7 | **3** Combat |
| Damage, types, crit, stats | §4.1 | **4** Resolution |
| Status conditions, stages, enemy-side status | §4.2 | **4** Resolution |
| Field effects | §4.3 | **4** Resolution |
| AI scoring, intents, unknown intents, counter-intel | §5.1–§5.7 | **5** Enemies |
| Bosses, Gyms, Badges, Elite Four, Champion | §5.8–§5.12 | **5** Enemies |
| Pokédex and Mastery Moves | §5.13 | **5** Enemies |
| XP, evolution, moves, abilities, Dojo, learnsets | §6.2–§6.9 | **6** Progression |
| Consumables, relics, held items, TMs | §7.2–§7.5 | **7** Items |
| Trauma, Trainer XP, Hub, unlocks, difficulty | §8.2–§8.8 | **8** Meta |
| Art, colour, combat layout, audio, accessibility | §9.1 · §9.2 · §9.5 · §9.6 | **9** Presentation |
| Determinism, RNG, replay, save, tests | §10.4 · §10.7 · §10.8 · §10.11 | **10** Foundations |

**Content lists** are in [`catalogs/`](catalogs/). **What is actually built** is in
[`implementation-status.md`](implementation-status.md). **Vocabulary** is in [`glossary.md`](glossary.md).

---

## 12. Where the build differs from canon today

The shipped v0.1 combat slice predates the 2026-09-19 design pass. Five known divergences, each with a version
that fixes it — treat canon as correct and these as work items:

| Canon | The build | Fixed in |
|---|---|---|
| Trauma's two-zone curve, floor −75 % at 10 stacks | Linear −5 %, capped at 5 | v0.2 |
| Base forms know 2 moves, learnset by level | 4 fixed moves, no learnset | v0.2 |
| Abilities from a pool; first granted at evolution, Dojo swaps | Auto-granted, no pool | v0.3 |
| Healing is a percentage; Full Heal and Ether cost 1 AP | Flat 20/50; both 0 AP | v0.4 |
| Hidden intents show their kind glyph | Fully hidden | v0.2 |

Everything else in this codex matches what is built or what is not yet built at all.
