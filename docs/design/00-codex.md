# Codex — the whole game in one file

> **A derived digest, not canon.** Read this first for any design or gameplay task: it gives you the shape of
> every system and how they interact. Then open the cited `§` in the topic file before writing a number, a rule
> or an edge case anywhere. **When this file and a topic file disagree, the topic file wins** and this one needs
> regenerating.
>
> **Reflects canon as of 2026-09-19**, after the full design pass; §2 (the Cities) and §8.9.2 (the unmet silhouette) as of 2026-09-23; the Safari Zone (§2.11.6) as of 2026-09-24; the Ring as a building and the Black Market (§2.9.4.1, §2.11.0, §2.11.6, §7.3.7) as of 2026-09-25; the Game Corner's Roulette (§2.11.5), the Daycare, the PC Box and egg moves (§2.11.1, §2.9.4.2) as of 2026-09-28; multi-enemy fights, reach and the honest intent (§5.6, §5.2, §9.2.4–§9.2.6, §2.6.4.1) as of 2026-09-29; acting twice and calling for help (§5.6.1, §5.6.2) and groups placed across the run (§5.6.3) as of 2026-09-29; field effects live (§4.3, §2.6.1) as of 2026-09-30; consumables that are spent and scarcer relics (§3.5, §7.2–§7.3, §2.7.2, §2.11.2.3) as of 2026-09-30. The route revamp (§2.5, §2.9, §9.3) as of 2026-10-02. Regenerate the affected section whenever a
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
- **A Region:** a seeded **20-column route walked left to right**, scrolled, on tracks that split, merge and cross
  — the trunk (0–7), a **Y** whose outer tracks lean toward the two Gyms (8 to the point of no return at 11–13),
  two themed lanes, two Gyms at 19, both announced. Six **stop columns**; ~12 fights a route. *(v0.8.7.)*
- **A City** (after Gyms 1 and 2) is a **lobby** — a drawn town whose buildings are doors, no visit budget, the
  gate leaves when you say so. **Pallet Town** (5 doors) then **Celadon City** (more, dearer). Routes keep only a
  nurse (+50 % HP) and a travelling merchant; the shop and the only Dojo are in the Cities. *(2026-09-22.)*
  A City shop is its FRLG room (v0.7.10): every piece of furniture a labelled shelf — Medicine, TMs, Relics, Held
  items, Evolution stones — and a clerk behind the counter who lists everything the shop (or the floor) sells, with
  the Poké Balls, and buys back. Every City's Center heals free and has Therapy, a **Daycare** (200 ₽: +1 level, the Pokémon sits out the next
  fight; once a visit) and a **PC Box** (team, Lead, moves); every Dojo sells tutor moves, passives and each
  line's **egg moves** (up to three, 250 ₽, §2.9.4.2). No door is in development (v0.7.9).
  Celadon is the bigger City: a five-floor **Department Store**, a Dojo whose tutor list spans every stage the
  line has reached, and the **Game Corner** — FireRed's own room as the screen, its slot banks and two roulette
  tables opening the classic Roulette (37 pockets: red/black ×2, the one green ×36, EV 0.973, stake ≤200 ₽) and the
  Slots (50 ₽, ×50 jackpot, EV 0.94, reels stopping left to right), tables printed, outcome rolled first; the room
  is pointed at, not walked. Each City has its **Ring** as a building of its own — Pallet's
  **Challenge Ring** in the square, Celadon's **Pokémon Coliseum**: the ladder and the first rival on show before
  the fee, then 2 rungs / 3 rungs of Elite-class rivals fighting two at a time, no healing between, cash out or climb; money below, a Rare
  relic 1-of-3 on top, no XP; however it ends, the whole Box walks out healed to full (Trauma stays), and it never
  ends the run. A five-page How to play. Meant to be lost (ladder ≈1 in 6 in the town, under 1 in 10 in the city).
  *(2026-09-23; out of the Dojo 2026-09-25.)* Every **committing** door (Ring, Safari, Black Market) asks before
  it closes behind you.
  **Team Rocket's Black Market** (§2.11.6) is a **secret**: no door on the map; a Grunt guards a poster at the back
  of Celadon's Game Corner, a switch behind it opens stairs down. Four counters, none paid in the usual coin: the
  **Trader** (one of yours for one of two stolen Pokémon no route offers), the **Fence** (Rare Candy, 400 ₽ a level;
  buys relics at 40 %), the **Gambler** (1–3 relics staked on a Rare at a printed 80 % × stake ÷ prize, 5–90 %), and
  the **Executive's showcase** (one Legendary for **three of your Pokémon**, off the books — it may take a run to 3 —
  and the deal closes the market). Measured: buying it by reflex costs Region 3 twelve points. *(2026-09-25.)*
  Both Cities hold the **Safari Zone** (§2.11.6): a ticket (200 / 350 ₽) buys 3 Safari Balls and a 10 / 12-turn
  clock for a lineup of species no route offers (Dratini only in the city), each **stalked** on a tile board — two
  actions a turn, its path and its look shown, tall grass hides you, bait and rock, a throw is the whole turn at a
  printed chance, and every alarm (being seen, a missed ball) brings it closer to bolting; a Rare bolts at the first.
  One or two recruits a visit; the rare, gone for first, lands about a third of the time. *(2026-09-24.)*
  Superseded: a City was a **Choice Plaza** — Shop and Reflection always, plus **2 of** {City Gym,
  Center, Grand Dojo, Black Market}.
- **Region Modifiers are per-Region**: exactly 1 active, re-picked each Region, expiring with it. Relics and
  Badges are the run-long systems.
- **Victory Road:** Gauntlet (no heal, 1-of-3 Rare), Apex recruit, Training Grounds (a free upgrade), Summit
  (full heal + 1-of-3 Legendary + League preview).
- **League** 🔒 deferred: 5 fights, 30 % micro-rest between them.
- **Escalation is mechanical**: R1 baseline · R2 status on enemy intents · R3 field effects and the largest
  multi-enemy groups (groups appear in every Region, more and larger each Region, §5.6.3; cards are dragged onto a target, §5.6). The
  numeric half (§2.2.1): trainers at their evolved forms from R2, an enemy stat tier (Attack ×0.8 / ×1 / ×0.8, HP
  ×0.9 / ×0.9 / ×0.85), and a curve the harness holds — R2 ~60 % given R1, R3 ~50 % given R2, the whole run ~1 in 6.
- **Region 2 (Coastal Cliffs) is its own content** since v0.7.3: Sea primary, Power Plant, River, Cave, rare
  Meadow; ten new lines plus Electabuzz, Hitmonchan, Lapras and Bellsprout's line; its own trainers, the Karate King
  Elite, the Lapras Elite Wild and the Fire · Grass · Electric · Poison Gyms with their Badges. 76 % of what it
  fields is new, a quarter Electric or Ice. A Region 2 basic evolves after its catch. *(2026-09-23.)*
- **Region 3 (Volcanic Highlands) is its own content** since v0.7.4: Volcano primary, Cave, Sky, rare Abandoned
  Tower; twelve rosters (the Hex Maniac hides each Pokémon's first intent), Giovanni as the Elite Trainer,
  Aerodactyl as the Elite Wild, and the Psychic · Ground · Fighting · Ice Gyms of Sabrina, Giovanni, Kiyo and
  Lorelei with the Marsh, Earth, Knuckle and Glacier Badges (every Badge carries the name of the badge its art is — Koga's is the Soul Badge, as in Gen I; 2026-09-24). Two thirds of what it fields is new. Its accent (multi-enemy,
  field effects) is v0.8's. *(2026-09-23.)*

**Box & Active Team.** Box capacity 6 (→8). Active Team is 3, locked on node entry; only those 3 contribute
cards. Overflow on recruit → **Swap or Skip**, and releasing is permanent.

**HP persists** across combats and nodes. `currentHP == 0` **is** fainted. No in-combat revival except the
`revive` consumable. Every faint costs a **Trauma stack**.

---

## 2. The map and its nodes *(Topic 2, continued)*

**20 columns, left to right** (§2.5, v0.8.7). Tracks, not a lattice: a node usually has one child on its own track;
the choices are **crossings** to an adjacent track (one per pair per column, never two columns running), splits and
merges — so pivoting from the top track to the bottom takes at least two steps, and no edge crosses another. Trunk
0–7 (wild-heavy at 0–1) · the crossroads at 8 · **the Y** to the **point of no return** (col 11–13, seeded, a
landmark): the top track leans to Gym A, the bottom to Gym B (their species and trainers), the middle stays neutral
and carries the **Elite** (col 9–10) · two lanes of two tracks, each **in its Gym's terrain** with its biome's
**field** drawn as weather · **two Gyms at 19**. **Stop columns** at 2|3, 5|6, 8, p, p+2|p+3 and 18: every node a
stop — the field nurse (one per lane at 18, guaranteed), the merchant (≥1 in the trunk), a Mystery, or **something
on the ground** (a find named on the map, one click). So every route walks ~12 fights and ~7 stops. ~65 nodes. The
map is **painted from a tileset** by a pure function of the map (§2.5.4) and saved whole in the run.

**Wild nodes** offer **3 species up front** — 2 Common + 1 Uncommon, ~10 % upgrading the Uncommon to Rare.
8 biomes bound to Regions; **Naturalist's Lens** makes their Rares three times as common.
**Recruit bands:** R1 5–10 · R2 12–20 · R3 22–30.

**Running (§3.1.2, 2026-09-21)** — any Action-phase turn except a Gym: the enemy's telegraphed action lands, the
fight ends as Escaped (no XP/drop/catch), and the toll comes off: wild −20 % ₽ + Trauma on the Lead · trainer
−30 % + Trauma on all + a consumable · Elite −50 % + Trauma on all + a relic (never Legendary).

**Catching — a roll at a shown number** (2026-09-21; curve eased v0.8.6). `p = catchRate × (1 − 0.8·HP%)^1.2 × status × ball`,
clamped 1–90 %: the species' ceiling (common 0.9 · uncommon 0.7 · rare 0.5, ×0.65 middle stage, ×0.4 final;
Snorlax 0.2), a steep HP curve, ×1.5 asleep/frozen or ×1.2 any other status. ~13 % at full HP for a common
basic, 49 % at half, 69 % at a quarter. The card plays at any odds; a miss spends the ball and the turn. Seeded
from the fight's stream. Master Ball Charm arms one sure throw per run. 0 HP loses the recruit. A catch is a
**Victory with full XP**. Balls are bag entries (Poké ×1, Great ×1.5, Ultra ×2): start 3, +1 per Region, one per attempt either way; the catch pill opens a picker with each ball's chance (v0.8.6).

**Trainers** — 9 archetypes, **three Pokémon** (the roster's own + its archetype's, 4 levels under) — **which, and
their levels, are a surprise** (v0.8.6: the map shows one Poké Ball per Pokémon, the fight "N to come") — one at a time,
two at a time (50/60/70 %) or three (a quarter/40 %/half of those), band = wild +1/+2, no hidden intents.
**Elite Trainer** — guaranteed, **four Pokémon two at a time** (its own two 2-phase, two lent between), **a relic pick: two Uncommons and a Rare**. Roster by Region: Rival 80/60/40 %,
Giovanni 30 % in R3, otherwise a Specialist. The **Rival counter-picks your starter** and scales by Region band.
**Elite Wild** — a catchable boss-wild, ≤1 per Region, not on every route: **catch it** for the rare recruit or
**defeat it** for one Rare relic. Phase 2 makes it *easier* to catch.
**Mystery Events** — 22, tagged 🟢 Safe 30 % / 🟡 Tradeoff 50 % / 🔴 Gamble 20 %, badge visible before entering,
never repeating in a run.
**Shops** — the route's merchant: Potion ×3, a Tier-1 bundle, Balls ×3, a wildcard (a Common relic one visit in
three). City: 8 **team-curated** slots — Potion ×5, bundles, a Common and an Uncommon relic (Rare a quarter of the
time), Balls ×5 — +30 % prices, sells at 30 % (the only money exit). Celadon's Department Store: five floors, a
re-roll restocks one floor. Relics carry the collector's premium (+25 % per relic bought).

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
**Consumables are spent** (v0.8.6): the whole bag is open every turn behind a **Bag** button (one card per kind,
×N), **two items a turn**, and a played one leaves the bag when the fight ends. Found far more often to match — see
§7 below. Poké Balls are bag entries too; TMs and stones are spent outside a fight.

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
| **Sleep** | its cards unplayable, position free; never lands on a sleeper or a frozen one | 1 turn | — |
| **Freeze** | cards unplayable + **position-locked** + ×1.5 Fire taken | 1 turn | Fire, Ice |
| **Confusion** | discards 1 skill card/turn per Confused Pokémon | 3 turns | — |

Applied on turn N, effective from N+1. DoT uses **Effective** Max HP. Stage first, then status, multiplicatively.
**Stat stages:** linear ±6, 0.4 → 1.6 at ±0.1 per stage, reset at combat end, **persist across boss phases**.
**On the enemy side:** Paralysis prices intents out of its 3-AP budget, Sleep/Freeze skip its action, Confusion
makes it pick uniformly among legal intents — still telegraphed, just no longer smart.

**Fields** (live since v0.8.4) — 10 Battlefields: Sun (Fire ×1.5, Water ×0.5), Rain (the reverse), Hail (3 % a turn
to all but Ice), Electric Terrain (Electric ×1.3 into the grounded, who cannot be Paralysed), Grassy Terrain (Grass
×1.3 from the grounded, 3 % back a turn), Psychic Terrain (Psychic ×1.3 from the grounded, no Sleep), Misty Terrain
(no status on the grounded), Sandstorm (3 % a turn to all but Rock/Ground/Fighting), Toxic Spikes (Poison on whoever
steps into the Lead), Sticky Web (−1 Speed on whoever steps in). **Every Gym lays its own** over its lane (§4.3.14,
v0.8.7; none shared within a Region); a Gym or Elite also brings a **Home Field** (its type ×1.2 for the enemy only). Weather and Terrain coexist.
`defog` clears every field; Cloud Nine suppresses them while it leads; Field Surveyor sets a wild fight's ground
by the Lead's type.

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
**The intent's number is the hit** — the Resolution run dry on a copy of the fight (every relic, item, ability,
reduction and shield, and earlier intents of the same turn); only a chance rider is left out. 63 % → 100 % measured.

**Groups** (§5.6, v0.8.1) — 1–3 enemies on the field (`onField`), the first the **enemy Lead**, the rest supports;
the list's remainder fills a free place. Supports act first, the Lead last. **Reach:** a single-target Melee card
reaches only the enemy Lead; Ranged, Backstrike and area cards reach every enemy; the player's Cleave hits them all,
each its own number. Cards are aimed by dragging onto an enemy or clicking card then enemy. The Lead falls → the
strongest left (a fresh arrival too) steps up; the fight ends when all are down. Supports carry a **role** (v0.8.6) —
Attacker (most) · Defender (a fifth: heals the Lead, and telegraphs **Cover** when the Lead is hurt, taking its
place with +1 Defence) · Buffer (a fifth: raises allies, lowers and afflicts you) — score their role's intents ×1.5,
never double a status the group already plans, enter at 60 % HP, and from their 4th turn gain +1 Attack a turn. A
catch in a pack ends the fight; the rest scatter.
**Acting twice** (§5.6.1): an authored `acts: 2` Pokémon declares two intents (different moves), both shown — the
second marked *Also* — and resolves them back to back. **Calling for help** (§5.6.2): the enemy-only
`call-for-help` move brings the caller's next authored companion onto the field as a support (at most 3 on the
field); its chip names who comes, and the companion telegraphs before it acts. Worth ×2 to a caller standing alone.
**Social species** (Rattata, Spearow, Zubat, the Nidoran, Mankey, Diglett, Magnemite, Doduo lines) always come
ready to call their own kind. **The breather** (§5.6.4): a won group fight gives back 8 % max HP per extra enemy, up
to 30 %. Supports hit at 70 % and escalate at most +2.
**Across the run** (§5.6.3): each fight node fixes its shape with the node (a hash, not the map's stream) and its
preview card names it — wild **packs** (30 / 40 / 50 % of wild nodes, some of three), wild **callers** (10 / 15 /
20 % + every social species), trainers **two at a time** (50 / 60 / 70 %) or **three**, the Elite (four Pokémon) and
the Gym (four) **always two at a time**, the Region 3 Elite Wild **acts twice** at 75 % HP (v0.8.5).

**Bosses** — ≥2 phases, aces 3. P1 setup > 50 % · P2 forced type ≤ 50 % · P3 last stand ≤ 20 % (cooldowns reset,
signature uncapped, Sturdy). **Gyms:** 2 Pokémon, ace 3-phase, **no mid-fight evolution** — the threat is a level
premium (band −2 non-ace, +0 ace, v0.8.6) plus a Home Field; **four Pokémon, two at a time, the ace last** (v0.8.5). Mid-fight evolution belongs to the **Rival and the Champion**.
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

**XP** by tier: wild 29 / trainer 43 / elite 66 / gym 120 for the first enemy, **50 % for each one after** (v0.8.6), scaled by the level gap (Gen V's formula, §6.2.1).
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

- **28 consumables**, **spent when played** (v0.8.6). Healing is flat, as in the games: 20 / 60 / 120 HP / full.
  Five 0-AP single cures plus a **1-AP** Full Heal. Ether **1 AP for +2**. Radar Scope, Smoke Bomb, Card Pocket,
  Quick Claw, Defog. Balls and five Evolution Stones. **Where they come from:** every trainer drops 1–2 (by Region:
  Potions → Super → Hyper), a wild node ~30 % leaves 1–2 Poké Balls, the Elite and the Gym add a prize, the nurse
  and a City's Center hand over a pair, shops sell **bundles** (Potion ×3 / ×5, Balls ×3 / ×5, 10 % off), and three
  Mystery Events are supplies.
- **60 relics**, **scarce** (v0.8.6: a full run ends with ~9, was 16.5). 25 Common (15 of them the +15 % party type
  charms) / 18 Uncommon / 7 Rare / **10 Legendary**. A trainer drops a Common 15 % of the time; the Elite Trainer
  offers a **pick of two Uncommons and a Rare**; the beaten Elite Wild a Rare; the **first Gym a Rare 1-of-3**,
  later Gyms and the Summit a **Legendary 1-of-3, max 2 per run** — plus the Black Market's one, off the books, for
  three Pokémon (to 3). Relic events are drawn at weight 0.35. Shop relics carry the **collector's premium**: +25 %
  of list per relic bought this run.
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
Record · Kit · the line's Bond, §8.9.2, and a per-species record, §8.9.1; all 151 species are in the book, and an unmet one is a silhouette, "???" and no types until any trace of it lands on the account — 2026-09-23), Trainer Card, Poké Mart (from the
start), Daycare Lady (Lv 3), Mystery Door (post-launch).
**Poké Mart shelves** — Trainer's Corner Lv 1 (titles 2, avatars 3, frames 2, Curated Starting Relic +1 3) ·
Starters Lv 3 (Magikarp 4, Eevee 6, Pikachu 6 — sold since v0.7.3, holding a Light Ball) · Hub upgrades Lv 5 (4–8) · Discoveries Lv 8 (any undiscovered
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
right (a group mirrored: its Lead forward, supports behind, one compact panel each), an intent **chip** above it,
the hand tray along the bottom, and the **damage preview beside the target** — per target in a group, with a blue
"out of reach" lock where a Melee card cannot land. Hits coming at you sit on your portraits, one number each; an
area intent's chip says "→ ALL" and prints no number. Resting on an intent opens the **intent card** (§9.2.6).
The preview shows the final number, the full breakdown, crit, riders and a KO flag — it calls the same function
the sim does. Unplayable cards are **desaturated, never hidden**: amber means AP, blue means position.

**Accessibility is staged**: reduced motion and text size at v0.5 because they are expensive to retrofit; the
rest at v1.1. Information never waits on an animation.

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
