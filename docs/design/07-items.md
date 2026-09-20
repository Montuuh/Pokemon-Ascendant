# Topic 7 — Items

> **Canon.** Edit this file directly. `§` numbers are an API cited from code and tests — never renumber or
> delete a section.
>
> **This topic owns:** the three item systems — consumables, relics and held items — plus TMs, their boundaries and their effects.
> **It does not own:** where they are sold (§2.9.2, §2.11.2) or how they are unlocked across runs (§8.6).
>
> Full catalogues: [`catalogs/consumables.md`](catalogs/consumables.md) ·
> [`catalogs/relics.md`](catalogs/relics.md) · [`catalogs/held-items.md`](catalogs/held-items.md) ·
> [`catalogs/tms.md`](catalogs/tms.md). This topic holds the **rules**; the catalogues hold the **rows**.

---

# §7.1 Three systems, clean boundaries

| System | Scope | Lifespan | Slot |
|---|---|---|---|
| **Consumables** | In-combat tools, drawn as cards | Returned at combat end | Inventory, uncapped |
| **Relics** | Persistent run-state modifiers | Until run end | Inventory, uncapped (6–8 typical) |
| **Held Items** | Per-Pokémon equipment, always on | Until re-equipped or run end | **One per Pokémon** |
| **TMs** | A consumable class applied from the Map View | Single use | Never in the combat pile |

**The boundary test**, for anything new:

| The effect is… | It is a… |
|---|---|
| Passive, run-wide, no draw cost — "once per combat, your first swap is free" | **Relic** |
| A single-use in-combat action — "restore HP now" | **Consumable** |
| Always on, one Pokémon only — "+20 % Fire damage for the wearer" | **Held Item** |
| A permanent addition to one Pokémon's move pool | **TM** |

---

# §7.2 Consumables

## §7.2.1 Rules

The consumable pile is a **per-combat roster, not ammunition** (§3.5): built at combat start from the inventory,
2 cards drawn per turn, each usable once per combat, everything returned at combat end. The **No Refunds**
difficulty modifier is the only thing that changes that, and it is worth ×1.30 XP because of it.

Duplicates stack as a count, and the pile offers distinct entries first so three Potions never flood a hand.

## §7.2.2 Healing

| Item | Tier | AP | Effect | Price |
|---|---|---|---|---|
| **Potion** | 1 | 1 | Restore **20 HP** | 30 ₽ |
| **Super Potion** | 2 | 1 | Restore **60 HP** | 70 ₽ |
| **Hyper Potion** | 3 | 1 | Restore **120 HP** | 150 ₽ |
| **Max Potion** | 4 | 1 | Restore to full Effective Max HP | 300 ₽ |
| **Revive** | — | 2 | Revive a fainted Pokémon at 50 % Effective Max HP | 400 ₽, rare stock |

**Healing is a flat number, as it is in the games.** *(Decided 2026-09-20, reversing the 2026-09-19 call.)*

The percentage version was adopted to solve a real problem — a flat 20 is a third of a health bar in Region 1
and a tenth of one in Region 3, so the class thins out as the run goes on. It solved it at a cost that is worse:
a Potion stops being *a Potion*. Everyone who has played a Pokémon game knows what 20 HP is worth and can read
a health bar against it; "25 % of Effective Max HP" has to be computed, and it computes to a different number
on every Pokémon in the party. The franchise's own numbers are a shared vocabulary, and trading that for a
tuning convenience is the wrong trade.

The scaling problem is real and is solved by the **upgrade chain** instead (§7.2.6): 20 → 60 → 120 → full is
exactly how the games keep healing relevant across a campaign, and it makes each upgrade a visible jump rather
than a correction. Region 3 is Hyper Potion territory the same way it is in the games.

**Revive** is the single exception to "no in-combat revival" (§2.4.3). It is deliberately expensive in both money
and AP.

## §7.2.3 Status cures

| Item | AP | Cures | Price |
|---|---|---|---|
| **Antidote** | 0 | Poison | 25 ₽ |
| **Burn Heal** | 0 | Burn | 25 ₽ |
| **Paralyze Heal** | 0 | Paralysis | 25 ₽ |
| **Awakening** | 0 | Sleep | 25 ₽ |
| **Ice Heal** | 0 | Freeze | 25 ₽ |
| **Full Heal** | **1** | Any primary status **and** Confusion | 90 ₽ |

Single cures are free to play because the cost is *carrying* them — inventory space is not scarce, but the
2-card consumable draw is. Full Heal costs 1 AP precisely so the five specific cures keep a reason to exist.

## §7.2.4 Combat utility

| Item | AP | Effect | Price |
|---|---|---|---|
| **Ether** | 1 | +2 AP this turn | 80 ₽ |
| **X Attack** | 1 | Attack +1 stage for this combat | 60 ₽ |
| **X Defense** | 1 | Defence +1 stage for this combat | 60 ₽ |
| **Guard Spec** | 1 | Block the next status applied to that Pokémon | 70 ₽ |
| **Sharp Lens** | 1 | +20 % crit chance on all moves this combat | 120 ₽ |
| **Radar Scope** | 0 | Reveal every Unknown intent this combat | 100 ₽ |
| **Smoke Bomb** | 1 | Cancel one enemy's declared intent this turn | 110 ₽ |
| **Card Pocket** | 0 | Keep up to 2 skill cards for next turn | 90 ₽ |
| **Quick Claw** | 2 | The first card played this turn costs 0 AP | 100 ₽ |
| **Defog** | 1 | Clear the active field, Battlefield or Home Field (§4.3.6) | 80 ₽ |

**Ether at 1 AP for +2** is a net +1 and the best AP trade in the game; at 0 AP it would be strictly correct to
play every time it appears, which is not a decision. It is also the reason a 4-AP ultimate is castable at all,
and **Quick Claw** is its combo partner.

## §7.2.5 Pokéballs and Evolution Items

Two genuinely expendable classes that never enter the combat pile as ordinary cards.

| Item | AP | Effect | Price |
|---|---|---|---|
| **Pokéball** | 1 | A catch attempt (§2.6.4) | 50 ₽ |
| Great Ball 🔒 | 1 | +15 points to the catch threshold | 120 ₽ |
| Ultra Ball 🔒 | 1 | +30 points | 250 ₽ |

Balls are counted: start 3, +1 per Region, one spent per throw whether it works or not.

| Stone | Unlocks | Price |
|---|---|---|
| **Fire Stone** | Eevee → Flareon, from level 12 | 250 ₽ |
| **Water Stone** | Eevee → Vaporeon; Poliwhirl → Poliwrath from 26 | 250 ₽ |
| **Thunder Stone** | Eevee → Jolteon | 250 ₽ |
| **Leaf Stone** | Gloom → Vileplume, Weepinbell → Victreebel, from 24 | 250 ₽ |
| **Moon Stone** | Reserved for Region 2 lines | 250 ₽ |

A stone lets its line evolve **earlier** and opens the stone-specific branch; the level path always remains
(§6.3.2). Stones are applied from the Map View.

## §7.2.6 Upgrade chains

Potion → Super Potion → Hyper Potion → Max Potion. An upgrade **replaces** the lower tier in the inventory; the
City Shop sells it at the price difference plus 20 %. Status cures and utilities have no chains — each is its
own item.

---

# §7.3 Relics

Sixty relics: **50 in the drop pool** (Common, Uncommon, Rare) plus **10 choice-only Legendaries**.

## §7.3.1 Rarity

| Rarity | Count | Drop weight | Typical source |
|---|---|---|---|
| Common | 25 | 60 % | Trainer drops, Region Shops, Safe events |
| Uncommon | 18 | 30 % | Elite drops, City Shops, Tradeoff events |
| Rare | 7 | 10 % | Gym drops, Victory Road, Gamble events |
| **Legendary** | 10 | **never drops** | Guaranteed 1-of-3 picks only (§7.3.7) |

Rarity is **drop weight**. Meta tier (§8.6.1) is **pool membership**. They are orthogonal and conflating them is
the single easiest mistake to make in this system.

## §7.3.2 Synergy categories

Every relic carries one primary and optionally one secondary category. The City Shop's curation algorithm
(§2.11.2.1) scores on them.

| Category | Touches |
|---|---|
| **Lead-Economy** | The Lead slot, the swap counter, swap costs |
| **Card-Economy** | Draw, retention, cycling, hand size, AP |
| **Combat** | Damage, defence, crit, immunity |
| **Meta-Acquisition** | XP, money, recruitment, the Pokédex |
| **Status** | Applying, curing, prolonging or exploiting conditions |

## §7.3.3 Common relics (25)

Fifteen of them are the type-boost charms — Soft Sand, Mystic Water, Charcoal, Miracle Seed, Hard Stone, Sharp
Beak, Magnet, Twisted Spoon, Black Belt and Pink Bow among them — each giving **+15 % to that type's moves for
the whole party**. They are the reliable backbone of the Common tier and the reason a mono-type team can commit.

The other ten shape a turn rather than a number:

| Relic | Category | Effect |
|---|---|---|
| **Barrier Charm** | Combat | The first enemy attack of the first combat each Region deals −20 % |
| **Quick Claw Charm** | Card | Once per combat, replay the last skill card you played, free |
| **Berry Pouch** | Combat | Healing consumables restore +20 % |
| **Soothe Bell** | Combat | A Pokémon at full HP at turn start deals +5 % on its next attack |
| **Coin Pouch** | Meta | Poké Dollar drops ×1.25 |
| **Cleanse Tag** | Status | The first status applied to your side each combat is blocked |
| **Lucky Egg Token** | Meta | In-run XP ×1.15 |
| **Exp Share** | Meta | Benched Box Pokémon earn 100 % XP instead of 75 % |
| **Defense Curl Charm** | Combat | Every 3 manual swaps, the new Lead gains Defence +1 |
| **Quick Draw** | Card | Turn 1 of each combat: draw +1 skill card |
| **Brave Charm** | Combat | Pokémon below 50 % HP deal +10 % |
| **Battle Hat** | Card | At turn end, if you made no manual swap, retain 1 skill card |
| **Recycle Tag** | Card | The first discard reshuffle each combat draws +1 |
| **Hiker's Coat** | Combat | The Lead takes −10 % from Cleave intents |
| **Wide Lens** | Combat | Status riders resolve **before** damage, so a faint never eats the rider |

## §7.3.4 Uncommon relics (18)

| Relic | Category | Effect |
|---|---|---|
| **Choice Specs** | Card | The first Ranged move each turn costs 0 AP; later Ranged moves cost +1 |
| **Choice Band** | Card | The same for Melee |
| **Move Echo** | Card | Play 3 different moves from one Pokémon in a turn → +1 AP next turn |
| **Type Resonance** | Combat | Active members sharing a primary type buff each other's matching moves +10 % per shared member |
| **Adrenal Surge** | Combat | When a Pokémon faints, the rest of the Active Team gains Attack +1 |
| **Reactor Core** | Card | Max hand size +1 skill card |
| **Hand-Off Pouch** | Card | At turn start you may discard 1 to draw 1 |
| **Cycle Cell** | Card | When the skill deck reshuffles, +1 AP next turn |
| **Status Lance** | Status | Statuses you apply last +1 turn (Sleep and Freeze unaffected) |
| **Pressure Plate** | Combat | After a 3+ AP move, the next move that turn costs −1 AP |
| **Vital Pendant** | Combat | Once per combat below 25 % HP, heal to 50 % Effective Max HP |
| **Trauma Salve** | Meta | Single charge: remove all Trauma from one Pokémon |
| **Tactician's Coin** | Lead | The first manual swap each combat costs 0 AP |
| **Steady Aim** | Combat | Crit multiplier 1.5 → 1.75 |
| **Lure Module** | Meta | Wild Areas offer 4 species instead of 3 |
| **Battle Tracker** | Meta | After defeating an enemy, +5 % Witnessed reveal rate on similar species this run |
| **Healer's Kit** | Status | Status cures also restore +15 HP |
| **Bond Bracelet** | Combat | The first time the Lead drops below 50 %, the whole bench gains Defence +1 |

## §7.3.5 Rare relics (7)

| Relic | Category | Effect |
|---|---|---|
| **Master Ball Charm** | Meta | Once per run: a Pokéball use is a guaranteed catch, ignoring the gauge |
| **Champion's Crest** | Combat | Each enemy a Pokémon defeats grants it +5 % damage this run, capped at +25 % |
| **Time Spinner** | Combat | Once per combat: skip the entire enemy Resolution |
| **Phoenix Feather** | Combat | Once per run: prevent a faint and restore to 1 HP. Consumed |
| **Sage's Tome** | Card | Max hand size +2; max AP per turn +1 |
| **Crown of Echoes** | Combat | The first move each combat is copied free into your hand on turn 2 |
| **Soul Link** | Combat | Choose a Pokémon on pickup: it and its Lead partner deal +10 % while both live |

Four further relics fill the Tier-3 Mastery lane to ten (§8.6.1): **Perfect Recall** (once per combat, shuffle
the discard back at turn start), **Trainer's Instinct** (see each enemy's intent one turn further ahead),
**Evolution Catalyst** (one Pokémon may evolve 4 levels early) and **Box Expander** (+2 Box capacity this run).
Every Tier-3 relic changes *how a run works*, never how hard it hits.

## §7.3.6 Conflicts and ordering

- **Choice Band and Choice Specs** can both be held. Each tracks its own first-move-of-type discount.
- **Faint prevention resolves in this order:** Sturdy (ability) → Last Stand (Legendary) → Focus Sash (held
  item) → Phoenix Feather (relic). Ability first, then the run-long pick, then the equipped item, then the
  consumed relic as the true last resort.
- **Trauma Salve** (relic) and **Trauma Salve Cache** (Hub upgrade) are independent: the upgrade guarantees one
  in a shop, the relic is the item itself.
- **Type-boost relics, Held Items, Badges and fields** are each independent multiplicative terms in the damage
  formula. They multiply; they do not add.

## §7.3.7 Legendary relics (10)

A fourth **rarity class**, above Rare and outside the drop table. These are the former League Boons, unified into
the relic system and retuned for permanent scope.

| | |
|---|---|
| **Acquisition** | A guaranteed **1-of-3 pick** at each Gym victory, at the Victory Road Summit, and at the Black Market — about four pick-moments per run. Seeded; already-held relics are excluded |
| **Hold cap** | **Maximum 2 per run.** At the cap, a pick-moment offers a Rare instead, or a skip |
| **Never** | Not in Starting Relics, not in shop random stock, not in the drop pool |
| **Meta status** | Available from run 1 — Legendary is a rarity class, not a meta tier |
| **Power** | The six ported Boons were retuned to about **two-thirds** strength, because they now last a whole run instead of five League fights |

| Legendary | Category | Effect |
|---|---|---|
| **Battle Hardened** | Combat | Every Active Pokémon starts each combat with a Shield equal to 10 % of its max HP |
| **Flow State** | Lead | The first manual swap each combat costs 0 AP |
| **Last Stand** | Combat | Once per combat, the first Pokémon that would faint survives at 1 HP |
| **Type Mastery** | Combat | Super-effective moves deal an extra +0.15× |
| **Clear Mind** | Combat | Every Unknown intent is revealed, in every combat |
| **Evolution's Edge** | Combat | Fully-evolved Pokémon deal +10 % |
| **Grandmaster's Tempo** | Card | +1 max hand size, and the first skill card each turn costs 0 AP |
| **Living Legend** | Meta | In-run XP ×1.3; recruits arrive +2 levels with 0 Trauma |
| **Unbreakable Will** | Status | Immune to the first status each combat; your statuses last +1 turn |
| **Apex Predator** | Combat | While the Lead is at full HP its moves deal +20 %; any damage disables this until it is healed back to full |

The 2-per-run cap is what keeps these a deliberate apex sculpt rather than a snowball (Pillar 3).

---

# §7.4 Held Items

Eighteen items plus one signature, one slot per Pokémon.

## §7.4.1 Rules

| | |
|---|---|
| **Slots** | One per Pokémon |
| **Equipping** | Drag and drop in the Map View. The previous item returns to the inventory |
| **Persistence** | Across combats, nodes and Regions, until re-equipped or the run ends |
| **Releasing a Pokémon** | Drops its item back to the inventory — never lost |
| **Mid-combat** | No changes. The loadout locks with the Active Team (§2.3) |
| **Sources** | Trainer battles 20 % of the time, the Elite Trainer's guaranteed slot, City Shop slot 7, Mystery rewards. **Never** in wild loot |

## §7.4.2 Type boosts (8)

Charcoal · Mystic Water · Magnet · Miracle Seed · NeverMeltIce · Black Belt · Sharp Beak · Twisted Spoon.
Each gives the **wearer** +20 % on that type's moves.

They share names with the Common relic charms on purpose, and they are deliberately different: the **relic**
gives +15 % to the whole party, the **item** gives +20 % to one Pokémon. Breadth against focus.

## §7.4.3 Type Plates (5) — the Lead Aura source

Splash · Flame · Zap · Meadow · Mind Plate. While the wearer is **Lead**, every bench Pokémon's moves of that
type deal **+5 %** (§6.5.4). Rare drops and the Mysterious Stone event.

## §7.4.4 Sustain and defence (3)

| Item | Effect |
|---|---|
| **Leftovers** | Restore `floor(EffectiveMaxHP / 16)` (minimum 1) at the end of each Resolution Phase |
| **Eviolite** | If the wearer is **not** fully evolved: Defence +20 % |
| **Focus Sash** | Once per combat, survive a lethal hit at 1 HP. Re-arms at combat end |

Eviolite is the mechanical argument for *not* evolving something — a small counterweight to Pillar 4, which is
healthy.

## §7.4.5 Tempo (2)

| Item | Effect |
|---|---|
| **Choice Band** | Melee +25 %; the wearer's **Ranged moves are unplayable** |
| **Choice Scarf** | The wearer's moves cost −1 AP (minimum 0); only one of its moves may be played per turn |

Both are genuine double edges, and the UI shows the restriction as a positional-style lock rather than quietly
hiding the cards.

## §7.4.6 Signature

**Thick Club** — Marowak only: Melee +50 %. Auto-equipped on the Marowak recruited by catching Marowak's Spirit
(§2.8.2). Never in a random pool.

---

# §7.5 TMs

Fifteen TMs. A TM is a consumable class that **never enters the combat pile**: it is applied from the Map View
and permanently adds its move to a compatible Pokémon's Learned Move Pool (§6.4.1).

Coverage spans the type chart — Ice Beam, Thunderbolt, Flamethrower, Surf, Psychic, Earthquake, Solar Beam,
Toxic, Shadow Bone — plus three utility picks: **Body Slam** (very broad compatibility), **Hyper Beam** (a 4-AP
ultimate for the biggest Normal-types) and **Foresight** (0 AP, reveals every Unknown intent this turn).

| | |
|---|---|
| **Compatibility** | Each TM carries a `compatibleSpecies` list; incompatible targets are greyed, never hidden |
| **Mastery** | Exempt — no TM reaches the 5th slot |
| **Sources** | Region Shop special slot and City Shop slot 8 at 250–500 ₽, a 5 % Trainer drop, specific Mystery rewards |

Full list with compatibility: [`catalogs/tms.md`](catalogs/tms.md).

Two type notes: there is no Steel type (§4.1.2), so Iron Tail is Rock-typed; and Dragon has no strong resist in
the 15-type chart, so TM13 Dragon Rage deals a **fixed 40** damage and stays a utility filler rather than a
coverage staple.

---

# §7.6 Inventory

**Map View** — three tabs: Consumables, Held Items (paired with their wearer's portrait), Relics. Plus the
run's Poké Dollars, Pokéballs and Trainer Tokens.

**In combat** — only the 2-card consumable hand. There is no "view full inventory" mid-fight: combat is atomic,
and you enter it with the inventory you chose (§3.1).

Sorting by name, rarity or category; filters for "equipped only" and "sellable".

---

# §7.7 Data shape

Every item class is content JSON validated by a schema. The fields, as the simulation sees them:

| Class | Fields |
|---|---|
| **Consumable** | `id · name · apCost · tier · target · effect · description · upgradeTo?` |
| **Relic** | `id · name · rarity · metaTier · categories[] · effect (hook + params)` |
| **Held Item** | `id · name · effect (hook + params) · grantsLeadAura?` |
| **TM** | `id · move · compatibleSpecies[]` |

An effect is a **named hook plus parameters**, never a script — which is what lets a designer add a relic
without touching the simulation, as long as its hook already exists. Adding a *new* hook is a code change, and
the hook vocabulary is listed in the catalogues.

---

# §7.8 Build order

| System | Version |
|---|---|
| Consumables: healing, cures, Ether, X Attack, Pokéball | v0.1 ✅ |
| The rest of the consumables, the upgrade chain, shops and money | v0.4 |
| Relics: Common and Uncommon, drops, Starting Relic | v0.4 |
| Held Items | v0.4 |
| TMs and Evolution Items | v0.3 |
| Rare relics, the Legendary pick, the Black Market | v0.5 |
| Tier-2 and Tier-3 unlocks | v0.6 |

---

# §7.9 Resolved boundary questions

| Question | Answer |
|---|---|
| Where does a new effect belong? | The boundary test in §7.1 |
| Held Item slots per Pokémon | One |
| Are TMs consumables? | A consumable **class**, applied from the Map View, never drawn as a card |
| The relic rarity curve | 25 / 18 / 7 at 60 / 30 / 10 % (§7.3.1) |
| Starting Relic pool | Common and Uncommon only (§8.6.3) |
| Faint-prevention order | Sturdy → Last Stand → Focus Sash → Phoenix Feather (§7.3.6) |
| Flat or percentage healing | **Flat**, the franchise numbers; the upgrade chain does the scaling (§7.2.2) |
| Full Heal's AP cost | 1, so the single cures keep a purpose (§7.2.3) |

> **A note on old prototype data.** Some Unity-era relic assets carry effects that disagree with this topic —
> a different Soothe Bell, a different Exp Share. Those assets were prototypes written before the catalogue;
> **this document wins**, and the catalogue matches it.
