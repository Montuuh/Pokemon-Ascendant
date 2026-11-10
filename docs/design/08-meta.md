# Topic 8 — Meta Progression

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** everything that survives a run — Trauma, Trainer XP, the Rank, Research and Oak's Parcels, Tokens, the Hub, the Trainer Kit, the vault, the Journal, the Badge Case, the League Ladder, the Hall of Fame and the difficulty modifiers.
> **It does not own:** what any of those things do inside a fight (Topics 3–5) or a run (Topic 2).

---
# §8.1 Philosophy

**No run ends empty.** A run is an hour, and most runs end in a defeat. Every one of them, a wipe in Region 1
included, hands the account at least one thing with a name it did not have: a relic or a TM for the world, a Bond
rank on a Pokémon, somebody new in the lobby. Bars and Tokens move too, but they are not the reward.

*Why this replaced the three guarantees of v0.6 (the user, 2026-11-10: "noto que un jugador no progresa mucho
cuando termina una partida").* The old layer was a shop with a small wage and, once v0.9.99 opened every relic,
almost nothing on its shelves: a Region 1 wipe moved the level bar a third of the way and paid one or two Tokens,
twenty-four of twenty-nine levels paid three Tokens and nothing else, a line's first Bond reward waited five runs,
and the run's end kept what it had earned behind a button. The rework is those five problems answered.

Six rules hold the layer together:

1. **Three clocks.** Something arrives this run (an Oak's Parcel, a Bond rank, Tokens), something is three to five
   runs away (a Journal entry, a Trainer Rank, a Leader's first Badge), something is twenty or more away (the
   Ribbons, the League Ladder, the Pokédex). No surface mixes the three.
2. **Progress has a face.** What is earned is an object, a Pokémon, a person or a place. No reward is only a number.
3. **The player chooses what to chase.** A parcel is one of three, and up to three Journal entries are pinned.
4. **The fight is the same for everyone.** Nothing the account holds touches damage, HP, AP, the draw or a formula.
   The account **may** change what a run *starts with*, through the Trainer Kit's slots (§8.4.5): a perk is packed,
   not stacked, and the Kit as a whole is held to a measured ceiling. *This is the one place the rework breaks the
   old canon, which allowed no advantage at all (the user's call, 2026-11-10).* With a run won less than one time
   in ten, a little chosen help is what makes the tenth run go further than the first; the slots keep it small,
   visible and a decision.
5. **A defeat is paid in the same coin as a win.** Winning pays more of the same things. Only the League Ladder,
   the Hall of Fame and two of the Ribbons ask for a win.
6. **Trauma is the in-run consequence layer.** Without it, a run that always pays would be a run that costs nothing.

---

# §8.2 Trauma

## §8.2.1 The mechanic

Every time a Pokémon's HP reaches 0, it accrues **one Trauma stack** for the rest of the run. Trauma belongs to
the **instance**, not the species or the slot.

```
EffectiveMaxHP = floor( BaseMaxHP × max(0.25, 1 − 0.05·min(s,5) − 0.10·max(0, min(s,10) − 5)) )
```

| Stacks | Multiplier | Effective Max HP (base 100) |
|---|---|---|
| 0 | 1.00 | 100 |
| 1 | 0.95 | 95 |
| 2 | 0.90 | 90 |
| 3 | 0.85 | 85 |
| 4 | 0.80 | 80 |
| 5 | 0.75 | 75 |
| 6 | 0.65 | 65 |
| 7 | 0.55 | 55 |
| 8 | 0.45 | 45 |
| 9 | 0.35 | 35 |
| **10 +** | **0.25** | **25** *(floor)* |

**Two zones, on purpose.** Stacks 1–5 cost 5 % each, so ordinary play — the occasional faint — barely registers.
Stacks 6–10 cost 10 % each, so a Pokémon that keeps fainting visibly breaks down. The steep zone is a
**rest-or-retire signal**, not a flat punishment, and the floor at −75 % means it never becomes an
unrecoverable spiral.

Anti-spiral protection comes from three places: the soft cap, Trauma being per-instance (rotate the Box), and
benched Pokémon still earning 75 % XP (§6.2.1) so rotation is painless.

## §8.2.2 Timing and visibility

Stacks apply **instantly at the moment of faint**, during Resolution.

| Where | What is shown |
|---|---|
| **In combat** | Nothing. The Pokémon has already left the Active Team; the penalty is irrelevant until the map |
| **Map View** | A `⚠ N` badge over the portrait. Hover shows the Effective Max HP and the formula |
| **Pre-combat** | The team-selection panel shows each Pokémon's Effective Max HP and stack count |
| **Post-combat** | `+1 Trauma → [Pokémon]` with the new effective maximum |
| **First ever stack** | A one-time explanation popup. Silent thereafter |

**Healing interaction — the load-bearing consequence.** Every heal computes against Effective Max HP. A Pokémon
Center restores you to your *current ceiling*, never to your original one. Full heals never undo faints.

**Damage-over-time uses the same number**: `floor(EffectiveMaxHP / 16)`. The combat HP bar caps at the effective
maximum, so "a sixteenth of your bar" reads true.

## §8.2.3 Persistence

| Scope | Behaviour |
|---|---|
| **Within a run** | Stacks persist across combats, nodes, Cities and Regions. They never decay with time |
| **Across runs** | Discarded at run end with the rest of run state. Trauma is run-scoped |
| **In the Box** | A benched Pokémon keeps its stacks — they belong to the instance, not the Active slot |
| **On recruitment** | A new recruit always starts at 0, however badly the run has gone |
| **Through evolution** | Stacks carry. The new base HP is multiplied by the same factor, so the effective maximum still rises — evolution is identity continuity, not a reset |

## §8.2.4 Clearing stacks

Three routes, all scarcity-gated:

| Source | Type | Cost | Effect |
|---|---|---|---|
| **Trauma Salve** | Uncommon relic, single charge | Found or bought | Removes **all** stacks from one Pokémon. Consumed |
| **Therapy** | Pokémon Center service | `100 × (1 + stacks)` ₽ | Removes **1** stack. Repeatable while affordable |
| **Daycare Recovery** | Rare Mystery event | Skip the node's reward; the Pokémon misses the next combat | Removes **all** stacks from one Pokémon |

The player can always recover, but recovery costs money, an inventory slot, or tempo. That keeps Trauma a live
threat all run without ever soft-locking an unlucky start.

## §8.2.5 Telegraphing

Per Pillar 1, Trauma is never a hidden cost. The badge is on the portrait, the effective maximum is on the
pre-combat panel, and the combat HP bar simply *is* the effective maximum — there is no ghost segment showing
what you lost. The bar tells the truth of the moment.

## §8.2.6 Edge cases

| Case | Resolution |
|---|---|
| Multiple stacks in one combat? | No. One faint, one stack — a Pokémon cannot faint twice, it leaves the Active Team |
| Sturdy saves at 1 HP | No stack. No HP-reaches-0 event fires |
| The `last-stand` Legendary saves at 1 HP | No stack, same reason |
| Trauma Salve on a 0-stack Pokémon | The option is greyed out; the Salve cannot be wasted |
| Therapy at 0 stacks | Hidden from the service list |
| Does boss AI see Trauma? | No. It is player-side state and never enters intent scoring |
| An Apex or Elite Wild recruit | Always 0 stacks |

## §8.2.7 Why this shape

Four alternatives were considered and rejected: uncapped stacks (unrecoverable spirals in Region 3); a penalty
applied only at Pokémon Centers (a Region 3 faint would cost nothing before the League); suppressing a move for
one combat (too volatile for the deck economy, and it punishes exactly the repositioning Pillar 2 rewards); and
no consequence at all (which makes "failure is fuel" hollow). The chosen design is visible, telegraphed,
recoverable by three explicit paths, and incapable of spiralling.

---

# §8.3 Trainer XP, the Rank and the Field Report

## §8.3.1 What Trainer XP is

The persistent account measure, earned in every run whether it is won or lost. **It is never spent**, and one
number does three jobs: it drives the **Trainer Rank** (§8.3.3), it fills the **Research** bar toward the next
Oak's Parcel (§8.6.2), and at a run's end the XP that run earned becomes **Tokens** (§8.3.4). One number, so the
player has one thing to understand; three jobs, so it always moves something that is close.

## §8.3.2 Sources

| Source | XP | Field Report line |
|---|---|---|
| Combat node cleared | 5 — wild, trainer and elite alike, so every fight counts | Fights won |
| Recruitment (first of a species this run) | 10 | New recruits |
| Evolution | 15 | Evolutions |
| Gym Leader | 50 | Badges |
| A Leader's Badge, the first time it is ever won (§8.14) | +100 | Badges |
| A species the account had never met takes the field | 5 | Species discovered |
| A species reaches Familiar (§5.13.1) | 25 | Pokédex |
| A Journal entry completed, by its medal (§8.7.0) | 25 / 50 / 100 / 200 | Journal |
| A Field Note written (§8.7.1) | 25 | Journal |
| **Failed run** | `floor(layersCleared × 50)`, capped at 400 | Distance covered |

The new-species and first-Badge rows are what v0.9.110 added: they pay for *novelty*, so a run that goes somewhere
the account has not been is worth more than one that repeats the last. Difficulty modifiers multiply the run's
total (§8.8.3). The whole account is measured as a career — one account, many runs in a row, its own perks playing
into each — by `balance/accountCareer.test.ts`.

## §8.3.3 The Trainer Rank

Nine ranks, each with a face. A rank is a milestone: somebody arrives in the lobby (§8.4.6), a Kit slot opens, a
parcel shows one more card — and a purse of Tokens comes with it.

| Rank | Name | Cumulative XP | Purse | Brings |
|---|---|---|---|---|
| 1 | Newcomer | 0 | — | The nurse (Trainer Card), the PC, the Item Guide, the League door |
| 2 | Rookie | 300 | 🎟 5 | **Professor Oak's aide** — Oak's Parcels and the Trainer Journal |
| 3 | Trainer | 1 000 | 🎟 10 | **The Poké Mart clerk** — Starters, Services, the Trainer's Corner |
| 4 | Challenger | 2 200 | 🎟 10 | **The Trainer Kit** — the first slot, and the Kit shelf at the Mart |
| 5 | Ace | 3 800 | 🎟 15 | A second Kit slot |
| 6 | Veteran | 6 000 | 🎟 15 | Fuller parcels: four cards instead of three |
| 7 | Expert | 9 500 | 🎟 20 | A third Kit slot |
| 8 | Elite | 14 500 | 🎟 30 | The Elite purse |
| 9 | Master | 22 000 | 🎟 50 | The last rank; XP past it still fills parcels and still becomes Tokens |

*Why nine and not thirty.* Until v0.9.110 the account had thirty Trainer Levels on `floor(330 × N^1.6)`, and
twenty-four of them paid three Tokens and nothing else: a level-up had no face, and the player learned that the
Hub's dial was a counter. Nine milestones with a consequence are worth more than thirty without one, and the first
four are inside the first handful of runs — Rookie after the first, by design, so the first run ends with the
aide walking in. The table is the rule; `meta/rank.ts` holds it.

## §8.3.4 Tokens

One wallet. **XP decides who is in the lobby; Tokens decide what you take home from the Mart.**

| Earned from | Tokens |
|---|---|
| **A run's end**: the XP that run earned | 1 for every 80 XP |
| **A run's end**: the ₽ it ended with | 1 for every 100 ₽, at most 10 a run |
| A Trainer Rank's purse (§8.3.3) | 5 – 50 |
| A Journal entry, by its medal (§8.7.0) | 2 / 5 / 10 / 20 |
| A League Ladder rung won for the first time (§8.8.5) | 15 |
| Oak's aide, at 150 species owned (§8.9.3) | 50 |
| An Oak's Parcel earned when the vault is empty (§8.6.2) | 10 |

**Spent** at the Poké Mart, on what is the account's own: starters, the three services, the Kit perks and things
for the Trainer Card to wear (§8.4). **The world's content is never sold** — a relic, a held item, a TM or a
Mystery comes in an Oak's Parcel, by a Field Note or with a Badge (§8.6) — so a Token never buys a shortcut past
a discovery.

*Why the numbers moved.* Until v0.9.110 a level paid three Tokens and 200 ₽ made one, capped at five: about 2.3 a
run against prices of 2–8, so most runs ended with nothing to buy. A run's own XP is the wage now — a Region 1
wipe is about four Tokens before the ₽ and whatever the Journal paid — against prices of 6–70, so every run buys
something small or moves something big. The ₽ rate stays poor on purpose: ₽ spent in the run (a Potion, a
Therapy, a TM) is worth more than ₽ carried out, and the cap keeps a run from being played for the bank.

*Why a wallet at all.* A single bar where every unlock competes is the "XP funnel" trap: progress feels slow and
no choice feels meaningful. Parcels answer "what is new in the world", by a pick of three; Tokens answer "what do
I want for myself", by saving up.

## §8.3.5 The rank road

The Trainer Card draws the ranks as a road of eight stops, each as what it brings — the aide, the clerk, a Kit
slot, a fuller parcel, a purse — the next one lit and named. Every stop is settled **idempotently**: every rank at
or below the current one whose purse has not been paid is paid on the next XP, not only the ranks this event
crossed, so a save that missed one collects it rather than never.

**Difficulty modifiers are not on the road** (they are the League Ladder's, §8.8.5), **and neither is anything
from the vault** (§8.6): a rank brings a person and a purse, never a relic.

## §8.3.6 The Field Report

The run's end is a prize-giving, in the order the series pays things. Beside the last team (§9.12.3), six panels,
all on the screen at rest; motion only decides when each one arrives, a **Skip** button and a reduced-motion
setting land them at once, and a panel with nothing to say says so in a line.

| # | Panel | Shows |
|---|---|---|
| 1 | **The run** | The tally, by the lines of §8.3.2, and the run's total XP |
| 2 | **Research** | The bar filling from where the run found it; each parcel that arrived; **Open the parcel**, here, without a trip to the Hub |
| 3 | **The Rank** | The bar; a rank crossed, and who it brings |
| 4 | **Bond** | A row per line: its sprite, what it earned, its bar, and the rank it crossed with what that opens |
| 5 | **Earned** | Everything with a name, as the thing it is: the rank's arrival, a Badge for the wall, what left the vault, Journal entries and their prizes, the aide's gifts, Ribbons, a Ladder rung, the Hall of Fame — and the Tokens, split into the run's and the ₽'s |
| 6 | **Next time** | The pinned Journal entries, then the open ones closest to done, each with its count and its prize (§8.7.2) |

*Why.* Until v0.9.110 this screen showed the last team and a button, and the ledger sat behind it as a dialog of
text. It is the moment the game collects on the whole hour; the last panel turns that ending into the start of the
next run, and **Run again** is the screen's primary button. The run's own numbers (nodes, turns, faints, the whole
Box) stay one door away, in the run record.

---

# §8.4 The Trainer Hub

The pre-run and post-run place. **A room, not a menu** (v0.9.2, the user's call): the **Indigo Plateau's Pokémon
Center lobby** as FireRed / LeafGreen drew it — the League's front room, where a run is meant to end — shown at a
whole-pixel scale with its people in it, every door of the Hub a piece of its furniture (`ui/screens/hub/lobby.ts`,
drawn by the same `PixelRoom` as the shops, §2.11.2). The rank dial and the Token count sit above the room.

## §8.4.1 Kiosks

| In the lobby | Opens | There from |
|---|---|---|
| **The door to the Elite Four**, between the statues | **New run** — the difficulty step, the starter and the Starting Relic (the run's start screen; the Region Modifier step is off, §2.11.3). Its header names the Kit that is packed and the Journal entries pinned | Always |
| **The nurse** and her counter — she keeps the League's register | **Trainer Card** — the rank, the stars, the rank road, the Badge Case, the services (§8.4.3) | Always |
| **The PC** | **PC Terminal** — the Pokédex and every line's Bond and Ribbons (§5.13, §6.8, §8.9), and the Hall of Fame (§8.15) | Always |
| **The table** in the left-hand corner | **Item Guide** — every relic, item, held item, Evolution Item and TM: what it does, how rare, its price, where it turns up, and whether your account has opened it (§8.6.1) | Always |
| **The research terminal**, and Professor Oak's aide at it | **Oak's aide** — the parcels waiting and the Research bar (§8.6.2); the Trainer Journal (§8.7). The door's plate counts the parcels waiting | Rookie (rank 2) |
| **The Poké Mart counter** and its clerk | **Poké Mart** — four shelves, paid in Tokens (below) | Trainer (rank 3) |
| **The table by the east wall** | **Trainer Kit** — the slots and the perks to pack (§8.4.5) | Challenger (rank 4) |
| **The doormat** | Back to the title menu | Always |

A door opens its kiosk in place of the room; **Lobby** (or Escape) closes it and puts the keyboard back on the door.

**The Mart's shelves:**

| Shelf | Opens | Sells |
|---|---|---|
| **Starters** | Trainer | Magikarp 25 · Eevee 35 · Pikachu 35 (§8.5.2) |
| **Services** | Trainer | Expanded Box 40 · Difficulty Modifier Slot +1 50 · Twin Run 70 (§8.4.2) |
| **Trainer Kit** | Challenger | Seven perks, 15–25 each (§8.4.5) |
| **Trainer's Corner** | Trainer | Titles 6 · avatars 8 (§8.4.4) |

A shelf that is not open yet is still a tab that can be read — priced, with a bar that says how far away it is —
because a door you can see is a goal (§7.7). The whole shop is about 480 Tokens.

## §8.4.2 Services

Bought once at the Poké Mart, in force for every run from then on, and needing no Kit slot: each widens an option
rather than starting a run richer.

| Service | 🎟 | Effect |
|---|---|---|
| Expanded Box | 40 | Box capacity 6 → 8 for all future runs |
| Difficulty Modifier Slot +1 | 50 | Stack 2 difficulty modifiers on a custom run instead of 1 (§8.8.1) |
| Second Starter Slot (Twin Run) | 70 | Choose two starters; the Box starts +1 larger. Active Team stays 3. The start screen shows two places, **Lead** and **Partner**: a tile fills the place in focus, the focus moves to the partner once the Lead is chosen, a tile already in the other place trades places, and the partner comes off with its own button (v0.9.9) |

*Until v0.9.110 these three and four conveniences were seven "Hub upgrades" on one shelf, all permanent. The four
that change what a run starts with or knows — the fourth Starting Relic offer, Pokédex Insight, the Trauma Salve
Cache and the Apex Reveal — are Kit perks now (§8.4.5): they were the same kind of thing as the new ones, and a
permanent advantage with no slot is exactly what rule 4 of §8.1 does not allow.*

## §8.4.3 The Trainer Card

The profile and the goal-setting surface: the rank dial and its name · the four stars (§8.15) · runs won and lost ·
fights won · Pokémon recruited and evolved · species met · Journal entries done · Soulbound lines · the League
Ladder rung · favourite Lead (most Lead-turns). Under them the **rank road** (§8.3.5), the **Badge Case** (§8.14)
and the three services. No mechanical effect lives here. It wears whatever the Trainer's Corner has sold and the
Journal has handed over (§8.4.4).

## §8.4.4 Cosmetics — the Trainer's Corner and the Journal's trophies

A cosmetic touches the Trainer Card and nothing else. One is worn per kind; the Corner swaps among the ones owned.

| Kind | Sold at the Corner | Journal trophies, never sold (§8.7.0) |
|---|---|---|
| **Title** — a ribbon beside the card's name | 🎟 6: Ace Trainer · Collector · Cooltrainer · Dragon Tamer · Hex Maniac · Route Walker | Pokédex Scholar · Veteran · Champion in Waiting |
| **Avatar** — a trainer class beside the name | 🎟 8: Battle Girl · Black Belt · Engineer · Gambler · Hex Maniac · Poké Fan · Scientist · Swimmer | Youngster · Bug Catcher · Lass · Hiker · Camper · Picnicker · Swimmer · Ace Trainer |
| **Frame** — a border around the card's head | — | Great Ball · Ultra Ball · Master Ball |

A trophy is worn the moment it is won, if the card wears nothing of its kind yet — so the first fight of the first
run puts a face on the card. Gym Leaders are not avatars: they are the people you fight, and the ones you have
beaten stand in the lobby (§8.4.6). *(v0.9.110: the first avatars and the frames became Journal prizes, so a deed
has a trophy and the Corner sells the rest; the rows live in `src/sim/meta/cosmetics.ts`, not in content JSON,
because nothing in a run reads them.)*

## §8.4.5 The Trainer Kit

**The one place the account changes what a run starts with.** A perk is owned once and **packed** into a slot
before a run; only a packed perk is in force. The rank opens the slots: one at Challenger, two at Ace, three at
Expert.

| Perk | From | Effect at the run's start |
|---|---|---|
| Mom's Allowance | Mart · 🎟 20 | 150 ₽ more (the run starts with 150) |
| First-Aid Pouch | Mart · 🎟 20 | 2 more Potions |
| TM Case | Mart · 🎟 25 | One TM the starter can learn, from what the account has opened |
| Curated Starting Relic | Mart · 🎟 20 | Four Starting Relic offers instead of three (§8.6.3) |
| Pokédex Insight | Mart · 🎟 20 | The first fight each run against a species not yet Familiar shows its opening intent free |
| Trauma Salve Cache | Mart · 🎟 15 | City 1's shop is guaranteed to stock a Trauma Salve, in the Uncommon relic's slot |
| Apex Pokémon Reveal | Mart · 🎟 15 | Leaving the City into Region 3 fixes and names the Legendary Victory Road's Apex will be |
| Ball Case | Oak's aide · 25 species | 3 more Poké Balls |
| Exp. Share | Oak's aide · 50 species | The Box earns the whole of a fight's XP instead of three quarters (§6.2.1) |
| Head Start | Oak's aide · 110 species | The starter begins 2 levels higher |

**Three rules keep it honest.** (1) *Slots, not stacks*: owning all ten perks is still three in force, so the Kit
is a decision made before every run — Pillar 3's sculpting, moved to the lobby. (2) *Never the fight's maths*: no
perk touches damage, HP, AP, the draw or a formula; each changes supplies, knowledge, or where a level or a TM
starts. (3) *A measured ceiling*: no single perk may lift the harness's run win rate by more than 3 points, and a
full Kit by no more than 8; a perk that does is retuned, not excused. *(Numbers in `KIT`, `meta/account.ts`.)*

Pokédex Insight is a *peek*, not progress: a Familiar species already shows every intent (§5.13.1), so the perk
covers the species you have not learned yet, once per run each, first meeting only.

## §8.4.6 The lobby fills

The room is the account's progress, drawn. On the first day it holds the nurse, the PC, the Item Guide's table and
the door. Then:

- **The rank brings people** (§8.3.3): Professor Oak's aide at his terminal, the Mart's clerk behind her counter,
  the Kit's table.
- **Every Leader beaten comes to stand in it** (§8.14), in the order their Badges were first won, from the door
  inward — twelve places.
- **A Partner line walks it** (§6.8.2): up to four, the highest Bond first, beside the player.

Nothing in the lobby is a number; a door that is not there yet is not shown locked, because the room is meant to
feel emptier on the first day than on the fortieth. *(Until v0.9.110 the lobby was the same picture on run 1 and
run 60. The Mystery Door — daily seeds, leaderboards — still opens nothing and stays hidden until it does.)*

---

# §8.5 Starters

## §8.5.1 Default (available from run 1)

| Starter | Type | Archetypes |
|---|---|---|
| **Bulbasaur** | Grass → Grass/Poison | Vanguard · Specialist · Support |
| **Charmander** | Fire → Fire/Flying | Vanguard · Specialist · Support |
| **Squirtle** | Water | Vanguard · Specialist · Support |

Starters get three archetypes per evolution; most species get two (§6.3.3).

## §8.5.2 Meta-unlocked

Three more, **sold on the Poké Mart's Starters shelf from Trainer (rank 3)** (§8.4.1), each widening build
diversity rather than raising power. In any order.

| Starter | 🎟 | Type | Design slot |
|---|---|---|---|
| **Magikarp** | 25 | Water → Water/Flying | The late bloomer. Nearly useless until level 18, a monster afterwards — the cheapest because the first Region is the price |
| **Eevee** | 35 | Normal | The branch-flex pick: its evolution *is* its type choice — Vaporeon, Jolteon, Flareon or Umbreon |
| **Pikachu** | 35 | Electric | The iconic pick. Ranged-leaning kit |

*(Re-priced with the Token wage in v0.9.110, §8.3.4; they were 4 / 6 / 6.)*

**Eevee has four branches** (v0.9.84). It had three while the game was Gen I only — Gen I has exactly three Eeveelutions, and
that constraint outranked an older promise of a fourth. Dark arriving made the fourth possible: **Umbreon**, through the Moon Stone.

**Any line at Soulbound (Bond rank 5) may also start a run** (§6.8.2) — a fourth road to the starter screen, earned
by playing the line across some fifteen runs rather than by Tokens. *(Added 2026-09-21; rank 5 of six since
v0.9.110.)*

**Magikarp replaces Riolu** as the third meta-starter. Riolu is a Gen IV Pokémon in a Gen I project, and the
"weak early, devastating later" fantasy it was chosen for is exactly what the Magikarp line already delivers —
with a three-card deck for the first stretch of the run, which is a far more interesting cost.
*(Both decided 2026-09-19.)*

## §8.5.3 Starter run modifiers

Small thematic flourishes, balance-neutral by intent:

- **Pikachu:** starts holding a Light Ball (+25 % Electric damage, Pikachu only). A Raichu keeps holding it and
  it stops working, which makes "evolve or keep the ball" a real Pillar-4 choice. *(Built v0.7.3.)*
- **Eevee:** the first Mystery node visited is guaranteed to be a Stone Cache — the Fire, Water or Thunder Stone,
  your choice, which evolves Eevee into that Eeveelution from level 8 (§6.3.2). *(Built v0.7.5.)*
- **Magikarp:** starting relic offers are biased toward Water and toward survivability, because the first two
  Regions are a defensive problem. Implemented as a guarantee: at least one Water or defensive relic is in the
  offer, drawn from the same seed.
- **Pikachu:** its kit shipped with Region 2 (v0.7.3), and the Starters shelf sells it. Until then it was priced
  and not sold — a shelf that says so beats selling an empty species.

---

# §8.6 The vault and Oak's Parcels

## §8.6.1 The vault

A new account plays with the core of the game's content and **holds back the rest in the vault**: 55 entries,
opened a piece at a time. What is held back is what changes a rule or asks you to know the game; what is open is
what explains itself.

| Class | In the game | Open from run 1 | In the vault | Opened by |
|---|---|---|---|---|
| Relics — Common | 32 | 24 (the twelve Type Gems among them) | 8 | Its Field Note (§8.7.1), or a parcel |
| Relics — Uncommon | 18 | 10 | 8 | A parcel; four of them also by a Field Note |
| Relics — Rare | 9 | 5 | 4 | A parcel |
| Relics — Legendary | 6 | 6 | 0 | — |
| Held items | 38 | 17 | 21, as 6 cards: Leftovers · Eviolite · Focus Sash · Power Bracer · Choice Scarf · **the sixteen Type Plates as one** | A parcel |
| TMs | 66 | 40 | 14 by parcel · 12 by Badge | A parcel; a Leader's own TM by their first Badge (§8.14) |
| Mystery events | 14 | 11 | 3 — the gambles | A parcel |
| Consumables | 19 | 19 | 0 | — |
| Recruitable species | all | all | 0 | — |

**Three things are never locked, each for a reason.** *Species*: the party is the deck, and the Pokédex's
silhouettes already make meeting one a discovery (the user's call, 2026-11-10). *Legendary relics*: a Gym's
one-of-three pick (§7.3.7) needs the whole six to be a choice. *Consumables*: supplies are written into the route's
own drop and find tables, and a run short of an Ether is a worse run, not a more interesting one.

**Every rarity keeps more than half of its rows open** — a content test holds the floor. That is the lesson of
v0.9.99, which turned an earlier unlock scheme off because a fresh account held 3 of the 18 Uncommons and rarity
could not mean what it says. Rarity still decides how often a relic drops once it is in the pool (§7.3.1); the
vault only decides whether it is in the pool at all.

**What is locked can be seen.** The Item Guide draws a vault row with a lock and says how it opens: "arrives in an
Oak's Parcel", its Field Note with the count, or the Badge it comes with. The rows are one table,
`meta/vault.ts`; its catalogue is [`catalogs/vault.md`](catalogs/vault.md). Content built later enters the vault,
so every content version lengthens the road by itself.

## §8.6.2 Oak's Parcels

**Research** is a bar that every point of Trainer XP also fills. When it is full, Professor Oak's aide has a
**parcel**: it shows **three cards** from the vault (four from Veteran), the player keeps **one**, and the others
go back. The card is the same card a run draws — the relic, the held item, the TM — and from the next run on, the
world can hand it over.

- **Cost:** the first ten parcels cost 300 Research each, the rest 450; what is left over carries. A Region 1 wipe
  is about one parcel, a won run two or three.
- **The offer** is a pure function of the account (its own salt, how many parcels it has opened, what is left), so
  it is the same however many times it is looked at, and taking a card is the only thing that changes it.
- **Where it is opened:** on the Field Report, the moment it arrives (§8.3.6), or later at the aide's terminal,
  whose plate counts the parcels waiting.
- **Other sources:** a Journal entry of Silver or above (§8.7.0), a League Ladder rung (§8.8.5), Oak's aide at 10
  and 80 species owned (§8.9.3).
- **An empty vault:** a parcel earned with nothing left to hold pays 10 Tokens instead.

**A run's pool** is frozen at its start (§8.10): everything the vault does not hold back, plus what the account has
opened. A shop, a drop, a find's reel, the TM Case and a Mystery never draw a locked row; a fixture, the balance
harness and any run started without an account have nothing locked.

*Why parcels and not a shop.* A pick of three is a moment with no price to balance and no way to be poor: it
guarantees §8.1's promise without asking the player to play well. A shop that sold relics for Tokens (the
Discoveries shelf of 2026-09-21, the Mastery lane until v0.9.99) made progress a wage; a parcel makes it a gift
with a choice in it.

## §8.6.3 Starting Relic curation

The 1-of-3 (or 1-of-4, with the Curated Starting Relic perk packed) Starting Relic offer is drawn from **Commons
only**, and only from what the account has opened (v0.9.99; it was Common and Uncommon, and a pick of three nearly
always held an Uncommon, so every run opened with one) — never Rare, never Legendary. A Starting Relic sets a
direction; it does not decide the build.

It also has to **do something from the first node** (`startingRelicFits`, v0.9.97): never a relic spent the moment
it is picked up (Trauma Salve, with no Trauma yet to clear), and a Type Gem only for a type one of the starters has.
Before it, an offer could hold a relic that did nothing for the whole first Region.

---

# §8.7 The Trainer Journal

The account's deeds, and what each one hands over. **No entry pays only a number**: every one pays Trainer XP and
Tokens by its medal *and* something with a name. Until v0.9.110 an achievement paid XP and lived on a tab of the
PC, and a relic's discovery criterion was a second, separate list; they are one book now, kept by Professor Oak's
aide, in three shelves.

## §8.7.0 Medals and prizes

| Medal | Difficulty | XP | Tokens | Prize |
|---|---|---|---|---|
| 🥉 Bronze | Easy | 25 | 2 | **A trainer avatar** — the deed's own trophy |
| 🥈 Silver | Medium | 50 | 5 | An Oak's Parcel, or a title |
| 🥇 Gold | Hard | 100 | 10 | An Oak's Parcel, or an avatar or a frame |
| 💎 Platinum | Very hard | 200 | 20 | Two Oak's Parcels, or a frame or a title with one |
| *(none)* | A Field Note | 25 | — | **The relic that carries the deed**, out of the vault; an Oak's Parcel if that relic was never locked |

*Why a Bronze pays an avatar and not a parcel.* The first steps come four to a first run, and four parcels on top
of the run's own would empty a tenth of the vault before the player had learned what a parcel is. An avatar is a
thing with a name, it is worn at once (§8.4.4), and it costs the vault nothing. The XP came down with the rework
(it was 75 / 200 / 325 / 450) so that a run's XP is mostly the run's.

## §8.7.1 The three shelves

| Shelf | Kind of deed | Entries | From |
|---|---|---|---|
| **Field Notes** | Do a thing once, or a counted number of times: win with no faint, take ten statuses in a run, win 50 fights | 19 — one per relic that carries a `discovery` criterion | The discovery criteria of the old Tier-2 relics, whose counters never stopped folding |
| **Challenges** | Win under a constraint: a mono-type team, no fully-evolved Pokémon, a Gym with no faint | The Combat, Boss, Build Identity and Endurance medals | §8.7.1.1 |
| **Milestones** | The totals: recruit 25 species, ten evolutions, ten Soulbound lines | The First Steps, Recruitment, Evolution and Mastery medals | §8.7.1.1 |

Eight medal categories, fifty achievements in the catalogue, distributed: First Steps 5 · Recruitment 6 ·
Evolution 6 · Mastery 6 · Combat 7 · Boss 7 · Build Identity 7 · Endurance 6.

### §8.7.1.1 The catalogue

All fifty, with medal tier, hidden flag **and the trigger event each one listens for**:
[`catalogs/achievements.md`](catalogs/achievements.md). The trigger column is the difference between a list and
an implementable system — an achievement without a named event cannot be built. The prizes that are not the
medal's default are in `meta/journal.ts`.

## §8.7.2 Surface, and pins

Professor Oak's aide keeps the Journal: the three shelves, each entry with its name, its deed (or `???` if hidden
and not done), its prize, and a progress bar where one applies.

**Up to three entries can be pinned.** The pinned ones are named in the header of the new-run screen and lead the
Field Report's *Next time* panel (§8.3.6); with fewer than three pinned, that panel fills in with the open entries
closest to done. A finished entry cannot be pinned, and a hidden one is never suggested. *This is what answers
"what am I chasing in the next run?" — before v0.9.110 nothing outside the PC's medal tab said that the Journal
existed.*

## §8.7.3 Hidden entries

About one in five medals is **Hidden**: the description is revealed on completion. They are reserved for
discovery moments — "the first time you play a 4-AP ultimate" beats. Everything chase-able is visible, and no
Field Note is hidden.

---

# §8.8 Difficulty modifiers and the League Ladder

## §8.8.1 Structure

A modifier is an opt-in run-start challenge that lasts the whole run. Each carries a display name and flavour
text, one or more mechanical effects, an XP multiplier, and the Ladder rung that introduces it. A run is one of
three things: **baseline** (no modifier); a **League Ladder rung** (§8.8.5), whose modifiers come as a fixed
stack; or a **custom** run, which picks 0–N from the modifiers the account has opened — **N = 1**, 2 with the
Difficulty Modifier Slot service.

## §8.8.2 The pool

| Rung | Modifier | Effect | XP × |
|---|---|---|---|
| 1 | **Iron Will** | Wild encounters have +20 % HP | 1.15 |
| 2 | **One Path** | **Both Gym fork routes show the same type** — no counter-pick | 1.10 |
| 3 | **Tight Schedule** | League micro-rest heals 20 % instead of 30 % | 1.15 |
| 4 | **Dense Fog** | Every non-boss enemy starts with one Unknown intent | 1.15 |
| 5 | **Lean Pack** | Fights drop no consumables and no Poké Balls — supplies come only from shops, events and gifts | 1.30 |
| 6 | **Box Squeeze** | The Box holds two fewer than the account has bought — 4 instead of 6, or 6 instead of 8 with the Expanded Box — and no relic expands it. *The user's note (2026-10-19): a flat 4 ignored the Box you paid for; the picker shows your numbers beside the base ones, struck through.* | 1.20 |
| 7 | **Trauma Surge** | Trauma costs 2 pp more per stack in each zone (−7 % / −12 %; cap unchanged) | 1.20 |
| 8 | **Faint Echo** | A fainted Pokémon's discarded cards stay in the discard pile until the end of next turn | 1.20 |
| 9 | **Greater Threats** | Every enemy hits 25 % harder (v0.9.95: the one Attack term left, §2.2.1) | 1.40 |
| 10 | **Master's Challenge** | Every boss gains one extra phase; aces get a fourth | 1.50 |

**A modifier is free for a custom run once the rung that introduces it has been won.** Until v0.9.110 each opened
at a Trainer Level, which made a modifier a level-up prize for a player who was not winning yet and had no use
for it.

**One Path** removes the informed choice at the fork, which is a genuine difficulty increase and a deliberate,
opt-in relaxation of Pillar 1 — the one place the player may choose to know less.

**Faint Echo** delays only the discard-pile half of the faint purge. The deck purge is still immediate,
otherwise you could draw cards from a Pokémon that no longer exists.

## §8.8.3 Stacking

XP multipliers stack **multiplicatively**: ×1.15 and ×1.20 give ×1.38. Mechanical effects apply independently.
Mutually exclusive pairs are declared per modifier and the picker blocks them; none conflict today.

## §8.8.4 No inverse difficulty

There is no "make it easier" modifier. Playing without modifiers **is** the easy mode, and baseline is the floor.
This keeps "every run is real" intact and removes the "I won, but on baby mode" asterisk.

## §8.8.5 The League Ladder

Ten rungs, **opened by the first Champion**. Rung N is a run with the first N modifiers of §8.8.2 on, as a fixed
stack; the new-run screen offers the next rung as one card beside the baseline.

- **A rung won for the first time** opens the next, frees its modifier for custom runs, and pays 15 Tokens and an
  Oak's Parcel.
- **One ladder for the account** (the user's call, 2026-11-10), climbed with any starter: a clear, finite goal
  rather than one ladder per starter.
- The top rung is one of the Trainer Card's four stars (§8.15), and a Ladder run won pins the Ladder Ribbon on
  every line that stood in it (§6.8.5).
- The rung a run stands for is derived from its modifiers (exactly the first N), so a run save gains no field.

*Why.* Before the first win the account's career is the Badge Case (§8.14); the Ladder is the answer to "I have
won — now what?". It keeps §8.8.4: there is still no easy mode.

---

# §8.9 Pokédex persistence

The Pokédex system itself — tiers, thresholds and rewards — is §5.13. This section owns how it persists, what
else the entry remembers, and what the book pays as it fills:

- Tracked **per account**, across every run, and never reset.
- Reaching Familiar awards one-time Trainer XP (§8.3.2), and so does a species the account had never met.
- The **Bond** (§6.8) and its Ribbons are persisted beside it, per line, and are read on the line's page (§8.9.2).

## §8.9.1 The record

Every species' entry keeps a **record** — numbers that are fun to read and drive nothing. *(Added 2026-09-22;
before it the entry held only the knock-outs the Familiar tier counts.)*

| Number | Counts | Credited to |
|---|---|---|
| Faced | fights the species took the field against you | each enemy species, once per fight |
| Knocked out | knock-outs of the species by your side (§5.13.1's number) | the species that fell |
| Caught | copies that went into a Poké Ball | the species caught |
| Recruited | copies that joined the Box, by any road | the species recruited |
| Fights won with · Runs finished with | fights and runs ended with a copy on the Active Team | each Active species |
| KOs landed | enemies a copy of yours finished | the species whose card landed the blow — a status tick credits nobody, §7.3.5's rule |
| Damage dealt | every point a copy of yours dealt to an enemy | the species whose card dealt it |
| Fainted | copies of yours that went down | the species that fell |
| Turns as Lead | turns a copy spent in the Lead slot (§8.4.3's number) | the species leading |
| Evolved | copies that evolved *from* this form | the form left behind |

The per-species numbers are counted at the fight's single event site (the tally) and folded into the account at
the fight's end, like every other account fact; a saved entry from before a number existed reads as zero.

## §8.9.2 The surface

The PC Terminal is the Pokédex's home, and the Pokédex is **the one book**: every species, and through it every
line. It is a **picture first**: a card per species with its number, its sprite, its name, its type glyphs and
six pips for its line's Bond rank, and nothing else on the grid. Two orders: by number, and **by Bond**, which puts the lines you have played first, whole. A card opens
the species' **sheet**, three tabs: **Record** (the numbers above and the Familiar standing), **Kit** (a base form's
own learnset by level, or — for an evolved form — **the kit each path leaves it with**, one row per chain of branches
(§6.3.5: payloads, then what the form learns by level; its learnset listed above it), the Dojo tutor list, the abilities with the hidden one marked, the
Mastery Moves by rank, what it evolves into — each evolution a door to its own sheet) and **the line** (its stages as
doors, **every evolution path** — the archetype, the level or stone, the stats at the threshold on that path's lean,
each card it upgrades with the old one struck out, the card it adds, the ability — its Bond bar, the ladder of what
each rank opens for that line by name, and how Bond grows at the foot). *(v0.9.9, the user's call: the Kit tab had
listed the whole line's learnset, which read as Primeape knowing Mankey's every move.)*

**An unmet species keeps everything to itself.** A species is **met** once the account holds any trace of it —
faced, knocked out, caught, recruited, fought or finished a run with, or a turn as Lead (a starter is met the
moment it takes the field, win or lose). Until then its card is a black silhouette with its number, **"???"**
for the name, no type glyphs and no type tint. Its sheet has nothing on record and no Familiar count (the count
is the rarity), shows the Kit as locked, and its line tab names every unmet stage "???" behind a silhouette,
with no evolution level into it; until some stage of the line is met, the Bond ladder says what each rank opens
without naming the line's Mastery Moves or hidden ability. Meeting it opens the real sprite, the name, the types
and the kit at once. The book holds all 151 species from the first run, so the grid is mostly silhouettes — a
list of what the world still has to show you. *(User request, 2026-09-23. Before it only the portrait was
hidden and the type label counted as a fact of the species; with the whole of Gen I in the book, a name and
types on every card gave the surprise away.)*

**The Poké Mart keeps the same secret** (v0.7.5). A starter on the Starters shelf that the account has not met is
the same silhouette and "???", with no blurb, and the shelf itself names no one. It can still be bought — blind —
and owning it is meeting it. *(Before, the shelf named Magikarp, Eevee and Pikachu to an account that had met none
of them, which gave away three of the book's surprises from the Hub.)*

*(Redrawn 2026-09-22, twice. The v0.6.1 grids printed the ladder, the thresholds and every unlock chip on
every row, and the first reader called it too much; the rule since is the picture on the grid, the paragraph
one click away. A separate Companions tab — a card per line — lasted the morning: the Bond is per line and a
line is a page of the Pokédex, so two tabs were two doors to the same room. One book, ordered two ways.)*

## §8.9.3 Professor Oak's aide

In FireRed the Professor's aides wait in the gatehouses and hand over an item once enough species are caught; here
the aide in the lobby does the same, by **species owned** — recruited, caught, or fought with (an evolved form
counts once it has won a fight).

| Species owned | The aide hands over |
|---|---|
| 10 | An Oak's Parcel |
| 25 | **Ball Case** (a Kit perk, §8.4.5) |
| 50 | **Exp. Share** — the series' own gift at fifty |
| 80 | Two Oak's Parcels |
| 110 | **Head Start** |
| 150 | 50 Tokens |

Each milestone is paid once, on the fold that reaches it, and shown on the Field Report. *Until v0.9.110 the
Pokédex was the game's best-drawn book and paid 25 XP; now every new capture counts toward something the player
can see coming, and three perks cannot be bought at all.*

---

# §8.10 What persists

The account-level save holds: Trainer XP · the run in progress' XP · Research, the parcels waiting and the count
opened · the account's salt · the vault entries opened · Tokens and the ranks paid · starters, services and perks
owned · the Kit that is packed · cosmetics owned and worn · the Pokédex · Bond and Ribbons per line · the Badge
Case · the League Ladder rung · the Hall of Fame · Journal progress, Field Notes written and pins · the aide's
milestones paid · lifetime statistics and the Field Notes' counters.

It is written at run end and on every Poké Mart purchase — and, in the browser build, after every fold, because
a tab closes without ceremony and a rank earned mid-run must not depend on reaching the Field Report. The fold is
idempotent (ranks paid, the medal list, the notes, the aide's milestones), so an extra write costs nothing.
Format, versioning, atomicity and the three-layer model (Meta / Run / Settings): §9.8.

**A run takes a snapshot of the account at its start** — the Box bonus, the relic pool, the locked rows, the Kit,
Bond ranks, Familiar species — and keeps it: what the account earns mid-run applies from the next run.

**Account v4 is a reset** (v0.9.110, the user's call: "yo haría reset"). The game is a Beta, the vault changes
what a first run holds, and an account that kept everything open would never see the road; an older save starts
again as a Newcomer.

---

# §8.11 Cross-system promises resolved here

| Promise | Where |
|---|---|
| §1.6 — 6 starters | §8.5 |
| §1.6 — 60 relics | §8.6 + §7.3 |
| §1.7 — stackable difficulty | §8.8 |
| §2.1.7 — XP on a failed run | §8.3.2 |
| §2.4.4 — the cost of fainting | §8.2 |
| §5.13 — who owns the Pokédex | §5.13 owns it; §8.9 persists it |

---

# §8.12 Build order

| System | Version |
|---|---|
| Trauma stacks and Effective Max HP | v0.2 (with HP persistence) |
| Trauma services (Therapy, Salve, Daycare) | v0.4 |
| Achievements (first 10) | v0.5 |
| Difficulty modifiers (first 3) | v0.4, full pool v0.6 |
| Trainer XP, Tokens, the Hub, the Pokédex | v0.6 |
| Bond | v0.6.2, four ranks v0.9.1, six ranks and Ribbons v0.9.110 |
| The meta-progression rework: the Field Report, the Rank, the vault and Oak's Parcels, the Journal, the lobby that fills, the Badge Case, the Trainer Kit, the League Ladder, the Hall of Fame | v0.9.110 |

---

# §8.13 Glossary additions

**Trauma stack** — a per-instance, per-run counter incremented on faint; reduces Effective Max HP on the
two-zone curve of §6.2.1.
**Effective Max HP** — the Trauma-adjusted ceiling every heal and every damage-over-time tick uses.
**Trainer XP** — persistent account XP; never spent; drives the Rank, fills Research and becomes Tokens at a run's end.
**Trainer Rank** — one of nine account milestones; each brings someone or something to the lobby.
**Field Report** — the run's end as six panels: the tally, Research, the Rank, Bond, what was earned, what to chase next.
**Research** — the bar Trainer XP fills toward the next Oak's Parcel.
**Oak's Parcel** — three cards from the vault (four from Veteran); keep one.
**The vault** — the content a new account has not opened: 55 entries, by parcel, Field Note or Badge.
**Trainer Token** — the one wallet; spent at the Poké Mart on starters, services, perks and cosmetics.
**Service** — a permanent, option-widening purchase that needs no Kit slot (Expanded Box, Modifier Slot, Twin Run).
**Trainer Kit** — up to three slots, opened by rank, for perks that change what a run starts with.
**Kit perk** — a thing owned once and packed into a slot; never a point of damage or HP.
**Trainer Journal** — the account's deeds in three shelves: Field Notes, Challenges, Milestones.
**Field Note** — a deed carried by a relic; writing it opens that relic.
**Pin** — one of up to three Journal entries the new-run screen and the Field Report keep in view.
**Cosmetic** — a title, avatar or frame the Trainer Card wears; no effect (§8.4.4).
**Badge Case** — every Badge ever won, across all runs; a Leader's first Badge opens their TM.
**League Ladder** — ten rungs of stacked difficulty modifiers, opened by the first Champion.
**Hall of Fame** — the record of every run that beat the Champion.
**Star** — one of the Trainer Card's four feats.
**Legendary relic** — a 4th rarity class above Rare: choice-only, never dropped, max 2 per run (§7.3.7).
**Difficulty modifier** — an opt-in run-start challenge that multiplies the run's Trainer XP.

---

# §8.14 The Badge Case

The game has twelve Gym Leaders and a run crosses three. **The first time each Leader's Badge is ever won**:

- the Badge goes into the account's **Badge Case**, on the Trainer Card;
- **the Leader's own TM leaves the vault** — Leaders hand TMs over, as in the series;
- the run earns 100 XP on top of the Gym's 50;
- **the Leader comes to stand in the lobby** (§8.4.6).

| Badge | Type | TM |
|---|---|---|
| Boulder | Rock | Rock Slide |
| Cascade | Water | Surf |
| Hive | Bug | Swords Dance |
| Plain | Normal | Body Slam |
| Volcano | Fire | Fire Blast |
| Rainbow | Grass | Solar Beam |
| Thunder | Electric | Thunderbolt |
| Soul | Poison | Toxic |
| Marsh | Psychic | Calm Mind |
| Earth | Ground | Earthquake |
| Knuckle | Fighting | Bulk Up |
| Glacier | Ice | Ice Beam |

The series' own gift where it has one (Calm Mind, Earthquake, Toxic), the type's signature TM where it has not.

*Why.* A run is won less than one time in ten, so the account needs a career for the player who has not won yet.
"Beat the other Gym of Region 1" is a goal two or three runs away, and the twelve ask for every fork to be walked
at least once. All twelve are one of the Trainer Card's four stars (§8.15). The Badge a run earns still has its
in-run effect (§5.10); the Case only remembers that it was won.

---

# §8.15 The Hall of Fame and the stars

**The Hall of Fame** keeps every run that beat the Champion — the fifty most recent: the account's run number, the
seed, the starter, the Active Team with its levels and its shinies, the Badges, the relics, and the League Ladder
rung it was won on. It is a tab of the PC Terminal. *(The backlog's shared Hall of Fame — other players', with a
replay — still waits on accounts and a server; this is the local book it will read.)*

**The Trainer Card wears four stars**, a feat each, derived from the account and never stored, so a star cannot
disagree with its feat:

| Star | Feat |
|---|---|
| Champion | Beat the Champion |
| Badge Case | Win every Badge (§8.14) |
| Pokédex | Meet every species (§8.9.2) |
| League Ladder | Win the top rung (§8.8.5) |

Four long goals in four different directions — winning, exploring, collecting, mastering — after FireRed's own
Trainer Card, whose stars mark the same kind of feat.
