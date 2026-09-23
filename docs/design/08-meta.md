# Topic 8 — Meta Progression

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** everything that survives a run — Trauma, Trainer XP and Tokens, the Hub, starter and relic unlocks, achievements and difficulty modifiers.
> **It does not own:** what any of those things do inside a fight (Topics 3–5) or a run (Topic 2).

---

# §8.1 Philosophy

Three guarantees hold the meta layer together.

1. **Failure is fuel.** Every run, won or lost, materially improves the next one through Trainer XP and Pokédex
   mastery. A wipe in Region 1 is worth 80–150 XP; a wipe in Region 3 is worth 400–600.
2. **Unlocks expand the option space, never the power floor.** Meta-unlocks add Pokémon, relics, starters and
   modifiers. They never add damage, HP or any baseline number. A first-run player and a hundred-hour player face
   **the same maths**; the veteran simply has more choices.
3. **Trauma is the in-run consequence layer.** Without it, "failure is fuel" would make a run consequence-free.

The explicitly rejected anti-pattern is permanent stat upgrades that gradually trivialise the content. Pokémon Ascendant's
meta progression is **horizontal**, not vertical.

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

# §8.3 Trainer XP and Level

## §8.3.1 What Trainer XP is

The persistent account currency, earned in every run whether it is won or lost. It drives **Trainer Level**,
which advances the **reward track** (§8.3.5).

**Trainer XP is never spent.** It accrues. It is also never power: it unlocks starters, relics, modifiers and
Hub conveniences, and never a single point of damage or HP.

## §8.3.2 Sources

| Source | XP |
|---|---|
| Combat node cleared | 5 — wild, trainer and elite alike, so every fight counts |
| Recruitment (first of a species this run) | 10 |
| Evolution | 15 |
| Gym Leader | 50 |
| Victory Road Gauntlet | 75 |
| Elite Four member | 100 |
| Champion | 250 |
| **Failed run** | `floor(layersCleared × 50)`, capped at 400 |
| Pokédex tier promotion | 25 / 75 / 200 |
| Achievement | 50–500 by medal tier |

| Run outcome | Typical total |
|---|---|
| Wipe in Region 1 | 80–150 |
| Wipe in Region 3 | 400–600 |
| Win | 900–1 200 |
| Win, achievement-heavy | up to 2 000 |

Difficulty modifiers multiply the run's total (§8.8.3).

## §8.3.3 The level curve

```
cumulative XP to reach Level N = floor(500 × N^1.6)
```

| Level | Cumulative | Meaning |
|---|---|---|
| 2 | 1 515 | After the first won run, or the second lost one |
| 5 | 6 566 | End of a first weekend |
| 10 | 19 905 | Every shelf at the Poké Mart is open; the track has paid 26 Tokens |
| 15 | 38 081 | |
| 20 | 60 341 | Completionist tier — all run content visible |
| 30 | 115 442 | Prestige cap; future Ascension entry |

Soft-logarithmic: levels 2–10 are a few runs apart, 20–30 are dozens. *(The table was recomputed from the
formula on 2026-09-21 — the earlier one had drifted from it by up to 45 %; the formula is the rule.)*

## §8.3.4 Two currencies

| | Trainer XP | Trainer Tokens |
|---|---|---|
| **Earned** | Everything in §8.3.2 | **Every Trainer Level** (2; 5/5/8/8/10/10 at the milestones) + Gold (+2) and Platinum (+5) achievements |
| **Spent** | Never — it drives the track | Manually, at the Poké Mart |
| **Opens / buys** | The Poké Mart's **shelves**, one per stop that opens one | **Everything on an open shelf** — starters, Hub upgrades, relics for the pool, cosmetics |

**XP decides what is for sale; Tokens decide what you take home.** The track's only job is to pay Tokens and
open the next shelf (§8.3.5); the Mart's only job is to sell. Nothing meta is granted outright any more, and
nothing meta is unbuyable. *(Decided 2026-09-21. Until then the track handed out starters, Hub upgrades and
titles itself and Tokens bought Tier-3 relics only — which meant earning Tokens from Level 5 with nothing to
spend them on until Level 10, and a road of gifts nobody chose.)*

**Why two.** A single bar where every unlock competes is the "XP funnel" trap: progress feels slow and no choice
feels meaningful. The track guarantees something visible every level — failure is fuel, made legible — while
Tokens preserve **agency**: the shop costs ~210 Tokens (§8.4.1) against ~92 from the track and ~64 from medals,
so a player is always choosing and never finished.

## §8.3.5 The reward track

Every Trainer Level **pays Tokens** the moment it is reached, and four levels also **open a shelf** at the Poké
Mart. Nothing else is on the track: the pass pays, the shop sells (§8.3.4).

| Level | Pays | Opens |
|---|---|---|
| 1 | — | **Trainer's Corner** (the floor: titles, avatars, frames, Curated Starting Relic +1) |
| 2 | 🎟 2 | |
| 3 | 🎟 2 | **Starters** — Magikarp 4 · Eevee 6 · Pikachu 6 |
| 4 | 🎟 2 | |
| 5 | 🎟 5 | **Hub upgrades** — Expanded Box 5 · Pokédex Insight 4 · Modifier Slot +1 6 · Twin Run 8 · Trauma Salve Cache 4 · Apex Reveal 4 |
| 6–7 | 🎟 2 each | |
| 8 | 🎟 2 | **Discoveries** — any undiscovered Tier-2 relic, 4 each |
| 9 | 🎟 2 | |
| 10 | 🎟 5 | **Mastery lane** — the Tier-3 relics, 5 each |
| 11–14 | 🎟 2 each | |
| 15 | 🎟 8 | |
| 16–19 | 🎟 2 each | |
| 20 | 🎟 8 | |
| 21–24 | 🎟 2 each | |
| 25 | 🎟 10 | |
| 26–29 | 🎟 2 each | |
| 30 | 🎟 10 | prestige cap |

**92 Tokens by Level 30**, 26 of them by Level 10 when the last shelf opens. The anchors: the Corner open from
the first Token so nothing is earned with nowhere to go; the three starters affordable by Level 8 on the track
alone (17 Tokens paid, 16 asked); every shelf open by Level 10; the shop as a whole (~210) out of reach of the
track alone, so medals matter and choice never runs out. Amounts and prices are tunable; the shape is not.

The track is settled **idempotently**: every level at or below the current one whose Tokens have not been paid
is paid on the next XP, not only the levels this event crossed. An account from before a row existed, or a save
that missed a level, collects it rather than never (v0.6). A v0.6.0–v0.6.2 save keeps everything the old track
granted and is back-paid the two Tokens each of its claimed levels now pays (`upgradeAccount`).

**Difficulty modifiers are not on the track.** They open by Trainer Level (§8.8.2), which the Daycare Lady
shows as one ladder; a second path to the same rows would make that ladder lie. **Tier-2 relics are not on
the track either** — the nine "Relic pool +1" rows of 2026-09-21 morning became the Discoveries shelf the same
evening: a relic you never met the criterion for is bought, at a price, instead of arriving unasked.

---

# §8.4 The Trainer Hub

The pre-run and post-run menu. Not a 3D space: a clean 2D hub styled as a Pokémon Center interior, with kiosks.

## §8.4.1 Kiosks

| Kiosk | Function | Available |
|---|---|---|
| **PC Terminal** | The Pokédex — every species, its record, its kit and its line's Bond (§5.13, §6.8, §8.9) — the medal case (§8.7), the relic discoveries (§8.6.1) | From the start |
| **Trainer Card** | Level, total XP, Tokens, profile stats | From the start |
| **Poké Mart** | Five shelves — Trainer's Corner, Starters, Hub upgrades, Discoveries, Mastery lane — opened by Trainer Level (1/3/5/8/10), paid in Tokens (§8.3.5) | From the start (the Corner); every shelf by Level 10 |
| **Daycare Lady** | Configure the starting roster, difficulty modifiers, run options | Trainer Level 3 |
| **Mystery Door** | Daily Seed runs, leaderboards, prestige Ascension | Post-launch (previewable at 15) |

## §8.4.2 Hub upgrades

Each is quality-of-life or option-expanding, never power, and each is **sold at the Poké Mart** — the first
on the Trainer's Corner from Level 1, the rest on the Hub upgrades shelf from Level 5 — in any order.

| Upgrade | Shelf | 🎟 | Effect |
|---|---|---|---|
| Curated Starting Relic +1 | Corner (Lv 1) | 3 | Run start offers 4 Starting Relics instead of 3 |
| Pokédex Insight | Hub upgrades (Lv 5) | 4 | The first fight each run against a species you have **not yet** made Familiar shows its opening intent free |
| Trauma Salve Cache | Hub upgrades | 4 | City 1's shop is guaranteed to stock at least one Trauma Salve, in the Uncommon relic's slot *(sold since v0.7.1)* |
| Apex Pokémon Reveal | Hub upgrades | 4 | The Victory Road Apex species is shown on entering Region 3 *(sold once Victory Road ships, v0.8)* |
| Expanded Box | Hub upgrades | 5 | Box capacity 6 → 8 for all future runs |
| Difficulty Modifier Slot +1 | Hub upgrades | 6 | Stack 2 difficulty modifiers per run instead of 1 |
| Second Starter Slot (Twin Run) | Hub upgrades | 8 | Choose two starters; the Box starts +1 larger. Active Team stays 3 |

Priced by how much of a run they reshape: a fourth relic offer is a nudge, Twin Run is a different opening.
A pending upgrade is on the shelf, priced, and not sold — nothing is bought that does nothing. *(Prices set
2026-09-21; until then the track granted these at Levels 3/6/7/9/11/13/18.)*

Pokédex Insight is a *peek*, not progress: a Familiar species already shows every intent (§5.13.1), so the
upgrade covers the species you have not learned yet, once per run each, first meeting only. It stays information
rather than a Pokédex shortcut because the Pokédex's tiers are meant to be earned by fighting. *(Worded
2026-09-21; the earlier text said "unseen species at Familiar tier", which contradicts itself.)*

## §8.4.3 The Trainer Card

Level and XP bar · Token balance · runs won and lost · fastest run · highest difficulty cleared · Pokédex
completion · achievement completion · Pokémon recruited, evolved and mastered · favourite Lead (most
Lead-turns). No mechanical effect — it is the profile, and the goal-setting surface. It wears whatever the
Trainer's Corner has sold (§8.4.4).

## §8.4.4 Cosmetics — the Trainer's Corner

The one shelf that is only ever a purchase. Open from Level 1, so the first two Tokens the track pays have
somewhere to go, and cheap for the same reason. A cosmetic touches the Trainer Card and nothing else; buying
one wears it, and the Corner swaps among the ones you own. One worn per kind.

| Kind | 🎟 | Rows | Shown |
|---|---|---|---|
| **Title** | 2 | Ace Trainer · Pokédex Scholar · Veteran · Champion in Waiting | A ribbon beside the card's name |
| **Avatar** | 3 | The eight Region-1 trainer classes — Youngster, Lass, Bug Catcher, Camper, Picnicker, Hiker, Swimmer, Ace Trainer — the sprites their trainers already wear on the map | Beside the card's name |
| **Frame** | 2 | Great Ball · Ultra Ball · Master Ball | A border around the card's head |

Gym Leaders are not avatars: they are the people you fight. The four titles were the track's cosmetic rows in
v0.6.0 (Levels 19/23/27/29); a returning save's titles become the matching rows here, worn. *(Decided
2026-09-21; the rows live in `src/sim/meta/cosmetics.ts`, not in content JSON, because nothing in a run reads
them.)*

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

Three more, **sold on the Poké Mart's Starters shelf from Trainer Level 3** (§8.3.5), each widening build
diversity rather than raising power. In any order; the track has paid for all three by Level 8.

| Starter | 🎟 | Type | Design slot |
|---|---|---|---|
| **Magikarp** | 4 | Water → Water/Flying | The late bloomer. Nearly useless until level 18, a monster afterwards — the cheapest because the first Region is the price |
| **Eevee** | 6 | Normal | The branch-flex pick: its evolution *is* its type choice — Vaporeon, Jolteon or Flareon |
| **Pikachu** | 6 | Electric | The iconic pick. Ranged-leaning kit |

*(Prices set 2026-09-21; until then the track granted Pikachu at Level 4, Eevee at 8 and Magikarp at 12.)*

**Eevee has three branches, not four.** Gen I has exactly three Eeveelutions, and the Gen I constraint (§1.6.2)
outranks a promise of a fourth.

**Any line at Bond rank 5 may also start a run** (§6.8.2) — a fourth road to the starter screen, earned by
playing the line across several runs rather than by Trainer Level. *(Added 2026-09-21.)*

**Magikarp replaces Riolu** as the third meta-starter. Riolu is a Gen IV Pokémon in a Gen I project, and the
"weak early, devastating later" fantasy it was chosen for is exactly what the Magikarp line already delivers —
with a three-card deck for the first stretch of the run, which is a far more interesting cost.
*(Both decided 2026-09-19.)*

## §8.5.3 Starter run modifiers

Small thematic flourishes, balance-neutral by intent:

- **Pikachu:** starts holding a Light Ball (+25 % Electric damage, Pikachu only). A Raichu keeps holding it and
  it stops working, which makes "evolve or keep the ball" a real Pillar-4 choice. *(Built v0.7.3.)*
- **Eevee:** the first Mystery node visited is guaranteed to be a Stone Cache — a free evolution stone of your
  choice. *(Waits on Evolution Items, v0.7; Eevee itself ships in v0.6 with its three branches.)*
- **Magikarp:** starting relic offers are biased toward Water and toward survivability, because the first two
  Regions are a defensive problem. Implemented as a guarantee: at least one Water or defensive relic is in the
  offer, drawn from the same seed.
- **Pikachu:** its kit shipped with Region 2 (v0.7.3), and the Starters shelf sells it. Until then it was priced
  and not sold — a shelf that says so beats selling an empty species.

---

# §8.6 The relic pool

## §8.6.1 Availability tiers

| Tier | Count | Available | Unlocked by |
|---|---|---|---|
| **Tier 1 — Foundation** | 20 | Run 1 | Always in the pool |
| **Tier 2 — Discovered** | 20 | Progressive | Triggering a specific run event, once, across any runs — **or 4 Tokens on the Discoveries shelf, from Trainer Level 8** |
| **Tier 3 — Mastery** | 10 | Trainer Level 10+ | 5 Tokens each on the Mastery lane, in any order |

**Tier is not rarity.** Tier decides whether a relic is in your account's pool at all; rarity decides how often
it drops once it is (§7.3.1).

Tier 2 creates ongoing discovery: even at Trainer Level 20 there are relics you have not met because you have
not done the thing that unlocks them. All twenty criteria: [`catalogs/relics.md`](catalogs/relics.md). The
Discoveries shelf is the way past a criterion you keep missing — dearer than discovering (which is free) and
cheaper than a Tier-3, so the criterion stays the natural road and the shelf the paid one. Reactor Core is Tier
2 with a criterion *and* on the Mastery lane; it is not on the Discoveries shelf twice. *(Shelf added
2026-09-21.)*

All ten Tier-3 entries change *how a run works* rather than how hard it hits — which is why they are the
dearest shelf and the last to open.

**Legendary** is a separate axis again — a **rarity class** (§7.3.7), available from run 1, never randomly
dropped, obtained only by a guaranteed 1-of-3 pick, maximum 2 per run.

## §8.6.2 Building a run's pool

At run start: all Tier 1, plus every unlocked Tier 2, plus every unlocked Tier 3. A seed-stable subset of that
pool drives every drop in the run.

**Drop weighting is by rarity, always**: Common 60 % / Uncommon 30 % / Rare 10 %, regardless of which tiers you
have unlocked. Unlocking more relics never makes the good ones rarer.

## §8.6.3 Starting Relic curation

The 1-of-3 (or 1-of-4) Starting Relic offer is drawn from **Common and Uncommon only** — never Rare, never
Legendary. A Starting Relic sets a direction; it does not decide the build.

---

# §8.7 Achievements

Achievements grant Trainer XP always, and Tokens at the harder tiers. They are also the discovery signal for
Tier-2 relics and they carry the meta-starters' old thematic criteria as flavour.

## §8.7.0 Medal tiers

| Tier | Difficulty | XP | Tokens | Extra |
|---|---|---|---|---|
| 🥉 Bronze | Easy | 50–100 | — | — |
| 🥈 Silver | Medium | 150–250 | — | — |
| 🥇 Gold | Hard | 250–400 | **+2** | Occasional cosmetic title |
| 💎 Platinum | Very hard | 400–500 | **+5** | Occasional Tier-2 relic or cosmetic |

About 20 % are **Hidden**: the description is revealed on completion.

## §8.7.1 Categories

Eight, fifty achievements, distributed: First Steps 5 · Recruitment 6 · Evolution 6 · Mastery 6 · Combat 7 ·
Boss 7 · Build Identity 7 · Endurance 6. Twenty grant Tokens.

| Category | Flavour | Examples |
|---|---|---|
| **First Steps** | The tutorial beats | Win your first combat · earn your first Badge |
| **Recruitment** | Breadth of roster | Recruit 25 species · recruit with a full Box |
| **Evolution** | Using the branch system | Evolve into all 3 archetypes of one species |
| **Mastery** | Depth with one species | Master a species · master 10 |
| **Combat** | Single-fight skill | Win taking no damage · win with only Ranged moves |
| **Boss** | The climaxes | Beat all 3 Gyms in a run · beat a Gym with no faints |
| **Build Identity** | Self-imposed constraints | All-one-type team · no evolutions · 2 or fewer relics |
| **Endurance** | Consistency | Win 5 runs in a row · clear Region 3 without healing |

### §8.7.1.1 The catalogue

All fifty, with medal tier, hidden flag **and the trigger event each one listens for**:
[`catalogs/achievements.md`](catalogs/achievements.md). The trigger column is the difference between a list and
an implementable system — an achievement without a named event cannot be built.

## §8.7.2 Surface

The PC Terminal shows the full list by category: name, description (or `???` if hidden and incomplete), reward,
a progress bar where one applies, and the completion date.

## §8.7.3 Hidden achievements

Roughly 20 %, reserved for discovery moments — "the first time you play a 4-AP ultimate" beats. Everything
chase-able is visible.

---

# §8.8 Difficulty modifiers

## §8.8.1 Structure

At run start the player picks 0–N modifiers from the unlocked pool. **N = 1** by default; the Difficulty
Modifier Slot +1 Hub upgrade makes it 2.

Each modifier carries a display name and flavour text, one or more mechanical effects, an XP multiplier, and an
unlock criterion.

## §8.8.2 The pool

| Modifier | Effect | XP × | Unlock |
|---|---|---|---|
| **Iron Will** | Wild encounters have +20 % HP | 1.15 | Level 3 |
| **Tight Schedule** | League micro-rest heals 20 % instead of 30 % | 1.15 | Level 4 |
| **One Path** | **Both Gym fork routes show the same type** — no counter-pick | 1.10 | Level 4 |
| **Dense Fog** | Every non-boss enemy starts with one Unknown intent | 1.15 | Level 5 |
| **No Refunds** | Consumables are expended on use and do not return at combat end | 1.30 | Level 6 |
| **Box Squeeze** | Box capacity 4, not expandable | 1.20 | Level 7 |
| **Trauma Surge** | Trauma costs 2 pp more per stack in each zone (−7 % / −12 %; cap unchanged) | 1.20 | Level 8 |
| **Faint Echo** | A fainted Pokémon's discarded cards stay in the discard pile until the end of next turn | 1.20 | Level 9 |
| **Greater Threats** | Each Region's enemies use the next Region's stat tier | 1.40 | Level 10 |
| **Master's Challenge** | Every boss gains one extra phase; aces get a fourth | 1.50 | Level 15 + a Champion clear |

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

---

# §8.9 Pokédex persistence

The Pokédex system itself — tiers, thresholds and rewards — is §5.13. This section owns how it persists and
what else the entry remembers:

- Tracked **per account**, across every run, and never reset.
- Reaching Familiar awards one-time Trainer XP (§8.3.2).
- The **Bond** (§6.8) is persisted beside it, per line, and is read on the line's page of the Pokédex (§8.9.2).

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
five pips for its line's Bond rank, and nothing else on the grid. Two orders: by number, and **by Bond**, which puts the lines you have played first, whole. A card opens
the species' **sheet**, three tabs: **Record** (the numbers above and the Familiar standing), **Kit** (the
line's learnset, the Dojo tutor list, the abilities with the hidden one marked, the Mastery Moves by rank,
what it evolves into — each evolution a door to its own sheet) and **the line** (its stages as doors, its
Bond bar, the ladder of what each rank opens for that line by name, and how Bond grows at the foot).

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

*(Redrawn 2026-09-22, twice. The v0.6.1 grids printed the ladder, the thresholds and every unlock chip on
every row, and the first reader called it too much; the rule since is the picture on the grid, the paragraph
one click away. A separate Companions tab — a card per line — lasted the morning: the Bond is per line and a
line is a page of the Pokédex, so two tabs were two doors to the same room. One book, ordered two ways.)*

---

# §8.10 What persists

The account-level save holds: Trainer XP and Level · Tokens and claimed milestones · unlocked starters, Tier-2
and Tier-3 relics, difficulty modifiers and Hub upgrades · achievement progress · Pokédex progress · lifetime
statistics.

It is written at run end and on every Poké Mart purchase — and, in the browser build, after every fold, because
a tab closes without ceremony and a level earned mid-run must not depend on reaching the summary. The fold is
idempotent (claimed levels, medal list, discovery list), so an extra write costs nothing. Format, versioning,
atomicity and the three-layer model (Meta / Run / Settings): §9.8.

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
| Trainer XP, Level, the track, Tokens, the Hub | v0.6 |
| Pokédex tiers and Mastery Moves | v0.6 |

---

# §8.13 Glossary additions

**Trauma stack** — a per-instance, per-run counter incremented on faint; reduces Effective Max HP on the
two-zone curve of §6.2.1.
**Effective Max HP** — the Trauma-adjusted ceiling every heal and every damage-over-time tick uses.
**Trainer XP** — persistent account XP; never spent; drives Trainer Level.
**Trainer Level** — the account metric that advances the reward track and opens the Poké Mart's shelves.
**Trainer Token** — the agency currency; every level and the hard achievements; spent on any open shelf.
**Shelf** — one of the Poké Mart's five counters (Corner, Starters, Hub upgrades, Discoveries, Mastery lane), opened by Trainer Level.
**Hub upgrade** — a permanent quality-of-life or option-expanding unlock, bought at the Poké Mart.
**Cosmetic** — a title, avatar or frame the Trainer Card wears; bought at the Trainer's Corner; no effect (§8.4.4).
**Tier 1 / 2 / 3** — a relic's meta-unlock status. Not its rarity.
**Legendary relic** — a 4th rarity class above Rare: choice-only, never dropped, max 2 per run (§7.3.7).
**Difficulty modifier** — an opt-in run-start challenge that multiplies the run's Trainer XP.
