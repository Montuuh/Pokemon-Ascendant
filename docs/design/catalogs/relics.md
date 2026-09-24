# Relic catalog — 60 (50 drop-pool + 10 Legendary)

> Implements §7.3 (catalog, rarity, synergy categories), §8.6 (meta tiers, pool construction, starting-relic
> curation), §7.3.7 (Legendary class). Status legend in `README.md`.
>
> **Two orthogonal axes, never conflate them** (§8.6.1): **Rarity** = in-run drop weight (Common 60 % /
> Uncommon 30 % / Rare 10 %; Legendary never drops). **Meta tier** = whether the relic is in your account's pool
> at all (T1 Foundation 20, always; T2 Discovered 20, unlocked by an event; T3 Mastery 10, bought with Tokens).
>
> **Categories** (§7.3.2): `lead` Lead-Economy · `card` Card-Economy · `combat` Combat · `meta`
> Meta-Acquisition · `status` Status. The City Shop curation algorithm (§2.11.2.1) scores on these.

## 1. Common (25) — Tier 1 · drop weight 60 %

| id | Name | Cat | Effect | Hook | Status |
|---|---|---|---|---|---|
| `barrier-charm` | Barrier Charm | combat | First combat each Region: the first enemy attack deals −20 % | `on-combat-start` | ✅ canon |
| `quick-claw-charm` | Quick Claw Charm | card | The first card of each fight costs 1 AP less (`ap-cost`, v0.7.5 — was an activated replay) | `ap-cost` | ✅ |
| `berry-pouch` | Berry Pouch | combat | Healing consumables restore +20 % | `on-heal` | ✅ |
| `soothe-bell` | Soothe Bell | combat | A Pokémon at full HP at turn start deals +5 % on its next attack | `on-turn-start` | ✅ |
| `coin-pouch` | Coin Pouch | meta | Poké Dollar drops ×1.25 | `on-reward` | ✅ |
| `soft-sand` | Soft Sand | combat | Ground moves +15 % (party-wide) | `on-damage` | ✅ |
| `mystic-water-charm` | Mystic Water Charm | combat | Water moves +15 % | `on-damage` | ✅ |
| `charcoal-charm` | Charcoal Charm | combat | Fire moves +15 % | `on-damage` | ✅ |
| `miracle-seed-charm` | Miracle Seed Charm | combat | Grass moves +15 % | `on-damage` | ✅ |
| `hard-stone` | Hard Stone | combat | Rock moves +15 % | `on-damage` | ✅ |
| `sharp-beak-charm` | Sharp Beak Charm | combat | Flying moves +15 % | `on-damage` | ✅ |
| `magnet-charm` | Magnet Charm | combat | Electric moves +15 % | `on-damage` | ✅ |
| `twisted-spoon-charm` | Twisted Spoon Charm | combat | Psychic moves +15 % | `on-damage` | ✅ |
| `black-belt-charm` | Black Belt Charm | combat | Fighting moves +15 % | `on-damage` | ✅ |
| `pink-bow` | Pink Bow | combat | Normal moves +15 % | `on-damage` | ✅ |
| `cleanse-tag` | Cleanse Tag | status | The first status applied to your side each combat is blocked | `on-status-apply` | ✅ |
| `lucky-egg-token` | Lucky Egg Token | meta | In-run XP ×1.15 | `on-xp` | ✅ |
| `exp-share` | Exp Share | meta | Benched Box Pokémon earn 100 % XP (from the 75 % baseline) | `on-xp` | ✅ |
| `defense-curl-charm` | Defense Curl Charm | combat | Every 3 manual swaps: the new Lead gains Def +1 | `on-swap` | ✅ |
| `quick-draw` | Quick Draw | card | Turn 1 of each combat: draw +1 skill card | `on-turn-start` | ✅ |
| `brave-charm` | Brave Charm | combat | Pokémon below 50 % HP deal +10 % | `on-damage` | ✅ |
| `battle-hat` | Battle Hat | card | At turn end, if you made no manual swap, retain 1 skill card | `on-turn-end` | ✅ |
| `recycle-tag` | Recycle Tag | card | The first discard-reshuffle each combat draws +1 | `on-reshuffle` | ✅ |
| `hikers-coat` | Hiker's Coat | combat | The Lead takes −10 % from Cleave intents | `on-damage-taken` | ✅ |
| `wide-lens` | Wide Lens | combat | Status riders resolve **before** damage (so a faint never eats the rider) | `on-rider` | ✅ |

## 2. Uncommon (18) — drop weight 30 %

| id | Name | Cat | Effect | Meta tier | Status |
|---|---|---|---|---|---|
| `choice-specs` | Choice Specs | card | The first Ranged move each turn costs 0 AP; later Ranged moves cost +1 | T1 | ✅ |
| `choice-band-relic` | Choice Band (relic) | card | The first Melee move each turn costs 0 AP; later Melee moves cost +1 | T1 | ✅ |
| `move-echo` | Move Echo | card | Play 3 different moves from one Pokémon in a turn → +1 AP next turn | T1 | ✅ |
| `type-resonance` | Type Resonance | combat | Active Team members sharing a primary type buff each other's matching moves +10 % per shared member | T1 | ✅ |
| `adrenal-surge` | Adrenal Surge | combat | When a Pokémon faints, the rest of the Active Team gains Atk +1 | T1 | ✅ |
| `reactor-core` | Reactor Core | card | Max hand size +1 skill card | T2 | ✅ |
| `hand-off-pouch` | Hand-Off Pouch | card | A card Confusion knocks out of your hand is replaced from the deck (v0.7.5 — was an activated discard-to-draw) | T2 | ✅ |
| `cycle-cell` | Cycle Cell | card | When the skill deck reshuffles, +1 AP next turn | T2 | ✅ |
| `status-lance` | Status Lance | status | Statuses you apply last +1 turn (Paralysis 4, Confusion 4; Sleep/Freeze unchanged) | T1 | ✅ |
| `pressure-plate` | Pressure Plate | combat | After a 3+ AP move, the next move that turn costs −1 AP | T1 | ✅ |
| `vital-pendant` | Vital Pendant | combat | Once per combat below 25 % HP: heal to 50 % Effective Max HP | T2 | ✅ |
| `trauma-salve` | Trauma Salve | meta | Single charge: remove all Trauma from one Pokémon (§8.2.4) | T1 | ✅ |
| `tacticians-coin` | Tactician's Coin | lead | The first manual swap each combat costs 0 AP | T1 | ✅ |
| `steady-aim` | Steady Aim | combat | Crit multiplier 1.5 → 1.75 | T2 | ✅ |
| `lure-module` | Lure Module | meta | Wild Areas offer +1 species choice (4 instead of 3) | T2 | ✅ |
| `battle-tracker` | Battle Tracker | meta | A species already fought this run never hides its first intent again (§5.5.1). Was "+5 % Witnessed reveal rate", a rate the Pokédex's single Familiar tier no longer has | T2 | ✅ v0.7.5 |
| `healers-kit` | Healer's Kit | status | Status cures also restore +15 HP | T1 | ✅ |
| `bond-bracelet` | Bond Bracelet | combat | The first time the Lead drops below 50 %, the whole bench gains Def +1 | T2 | ✅ |

## 3. Rare (7) — drop weight 10 %

| id | Name | Cat | Effect | Meta tier | Status |
|---|---|---|---|---|---|
| `master-ball-charm` | Master Ball Charm | meta | Once per run: a Pokéball throw cannot miss (`guaranteed-catch`, once per run) | T2 | ✅ v0.6.2 |
| `champions-crest` | Champion's Crest | combat | Each enemy a Pokémon defeats: +5 % damage for it this run (cap +25 %) | T3 | ✅ |
| `time-spinner` | Time Spinner | combat | Every enemy but a boss loses its first turn of the fight, shown on its intent (v0.7.5 — was an activated skip) | T3 | ✅ |
| `phoenix-feather` | Phoenix Feather | combat | Once per run: prevent a faint, restore to 1 HP. Consumed. | T2 | ✅ |
| `sages-tome` | Sage's Tome | card | Max hand size +2; max AP per turn +1 | T3 | ✅ |
| `crown-of-echoes` | Crown of Echoes | combat | The first move each combat is copied free into your hand on turn 2 | T3 | ✅ |
| `soul-link` | Soul Link | combat | The two Pokémon longest in the Box each deal +10 % while both stand in the fight (v0.7.5 — was a pick on pickup) | T3 | ✅ |

## 4. Legendary (10) — choice-only, max 2 per run (§7.3.7)

Never in the drop pool, never in shops, never a Starting Relic. Offered 1-of-3 at Gym victories, the Victory
Road Summit and the Black Market (~4 pick moments per run).

| id | Name | Cat | Effect | Origin | Status |
|---|---|---|---|---|---|
| `battle-hardened` | Battle Hardened | combat | Every Active Pokémon starts each combat with a Shield = 10 % of max HP | Boon 15→10 % | ✅ |
| `flow-state` | Flow State | lead | The first manual swap each combat costs 0 AP | Boon | ✅ |
| `last-stand` | Last Stand | combat | Once per combat the first Pokémon that would faint survives at 1 HP | Boon | ✅ |
| `type-mastery` | Type Mastery | combat | Super-effective moves deal +0.15× bonus | Boon 0.25→0.15 | ✅ |
| `clear-mind` | Clear Mind | combat | Every Unknown intent is revealed, every combat | Boon | ✅ |
| `evolutions-edge` | Evolution's Edge | combat | Fully-evolved Pokémon deal +10 % | Boon 15→10 % | ✅ |
| `grandmasters-tempo` | Grandmaster's Tempo | card | +1 max hand size; the first skill card each turn costs 0 AP | New | ✅ |
| `living-legend` | Living Legend | meta | In-run XP ×1.3; recruits arrive +2 levels with 0 Trauma | New | ✅ |
| `unbreakable-will` | Unbreakable Will | status | Immune to the first status each combat; your statuses last +1 turn | New | ✅ |
| `apex-predator` | Apex Predator | combat | While the Lead is at full HP its moves deal +20 %; any damage disables this until healed to full | New | ✅ |

## 5. Tier-2 discovery criteria (20) 🆕

§8.6.1 gives three examples; the rest are authored here. Each unlock is a run event, checked across runs.

| Relic | Unlocked by |
|---|---|
| `barrier-charm` | Win a combat with no Pokémon fainting |
| `lucky-egg-token` | Earn XP in 50 combats |
| `soothe-bell` | Win a run without using Trauma Salve |
| `reactor-core` | End a turn holding 7 cards |
| `cycle-cell` | Reshuffle the skill deck 3 times in one combat |
| `vital-pendant` | Survive a combat with the Lead below 10 % HP |
| `steady-aim` | Land 10 crits |
| `lure-module` | Recruit 3 Pokémon in one Region |
| `battle-tracker` | Reach Familiar tier on 5 species |
| `bond-bracelet` | Finish a combat with all 3 Active Pokémon alive, 10 times |
| `master-ball-charm` | Have 5 Poké Balls broken out of (the consolation unlock) — reachable again since the catch became a roll (§2.6.4, 2026-09-21) |
| `phoenix-feather` | Lose a run in Region 3 (tracked since v0.7.5) |
| `hand-off-pouch` | Lose 20 cards to Confusion (tracked since v0.7.5) |
| `type-resonance` | Field an all-one-type Active Team |
| `adrenal-surge` | Win a combat after losing 2 Pokémon |
| `pressure-plate` | Play a 4-AP move |
| `status-lance` | Apply 4 different statuses in one combat |
| `healers-kit` | Cure 15 statuses |
| `cleanse-tag` | Take 10 statuses in one run |
| `wide-lens` | Have a rider fail to land because the target fainted first |

## 6. Tier-3 Mastery lane (10) — 5 Tokens each on the Poké Mart's Mastery lane, from Trainer Level 10 (§8.6.1)

§8.6.1 wants exactly 10 Tier-3 relics; §7.3 authors 7 Rares, of which 5 are Tier 3. The four rows marked 🆕 fill
the lane. Every Tier-3 relic should change *how a run works*, not how much damage it does.

| id | Name | Cat | Effect | Status |
|---|---|---|---|---|
| `champions-crest` | Champion's Crest | combat | Kill credit grants that Pokémon +5 % damage this run, cap +25 % | ✅ |
| `time-spinner` | Time Spinner | combat | Every enemy but a boss loses turn 1 | ✅ |
| `sages-tome` | Sage's Tome | card | Max hand +2; max AP +1 | ✅ |
| `crown-of-echoes` | Crown of Echoes | combat | The first move each combat is copied free into hand on turn 2 | ✅ |
| `soul-link` | Soul Link | combat | The two longest-travelling Pokémon deal +10 % while both stand | ✅ |
| `reactor-core` | Reactor Core | card | Max hand +1 (also reachable as a Tier-2 discovery) | ✅ |
| `perfect-recall` | Perfect Recall | card | Once per combat, when the deck would run short at turn start, the discard pile is shuffled back in before the draw | ✅ v0.6 |
| `trainers-instinct` | Trainer's Instinct | combat | See each enemy's intent **one turn further ahead**; it commits to the plan (§5.5.1) | ✅ v0.7.5 |
| `evolution-catalyst` | Evolution Catalyst | meta | Once per run, the first Pokémon to come within 4 levels of its threshold evolves there | ✅ v0.6 |
| `box-expander` | Box Expander | meta | Box capacity +2 for this run (stands down under Box Squeeze) | ✅ v0.6 |

**Shipped state (2026-09-21, v0.6).** `tier` and `discovery` are fields on every relic row in `relics.json`.
Eighteen of the twenty criteria are tracked (`counters` on the account, folded from the combat tally and the
run's end facts); every Tier-2 row is also sold on the Poké Mart's Discoveries shelf for 4 Tokens from Trainer
Level 8 (§8.3.5), which is the only road to the two above until their systems ship. Reactor Core is Tier 2
*and* on the Mastery lane (`mastery: true`), so the Discoveries shelf leaves it out.

## 7. Pool construction rules (§8.6.2)

- Active pool = all T1 (20) + unlocked T2 + unlocked T3. Drop weight is by **rarity**, never tier.
- **Starting Relic** offers are Common+Uncommon only, never Rare or Legendary (§8.6.3).
- Duplicates: a relic already held is excluded from every offer and drop for the rest of the run.
- The `trauma-salve` relic and the Hub upgrade "Trauma Salve Cache" are independent (§7.3.6).

## 8. Conflicts resolved (§7.3.6)

`choice-band-relic` + `choice-specs` may both be held; each tracks its own first-move-of-type discount.
Faint prevention order: **Sturdy (ability) → `last-stand` (Legendary) → `phoenix-feather` (Rare)**.
Type-boost relics, Held Items and field effects all multiply into the damage formula independently.
