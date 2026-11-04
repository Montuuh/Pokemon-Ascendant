# Relic catalog — 65 (59 drop-pool + 6 Legendary)

> Implements §7.3 (catalog, rarity, synergy categories), §8.6 (meta tiers, pool construction, starting-relic
> curation), §7.3.7 (Legendary class). Status legend in `README.md`.
>
> **Two orthogonal axes, never conflate them** (§8.6.1): **Rarity** = in-run drop weight (Common 60 % /
> Uncommon 30 % / Rare 10 %; Legendary never drops). **Meta tier** = whether the relic is in your account's pool
> at all (T1 Foundation 20, always; T2 Discovered 20, unlocked by an event; T3 Mastery 10, bought with Tokens).
>
> **Categories** (§7.3.2): `lead` Lead-Economy · `card` Card-Economy · `combat` Combat · `meta`
> Meta-Acquisition · `status` Status. The City Shop curation algorithm (§2.11.2.1) scores on these.
>
> **Power bands** (§7.3.1, the v0.9.97 balance pass, win-rate points plus half the HP points on the combat probe):
> Common up to ~2, Uncommon ~2–6, Rare ~3–9, Legendary ~4 and up. A Type Gem is offered only when the Box can use its type (§7.3.1); a Starting Relic
> only when it does something from the first node (§8.6.3). **v0.9.98** moved every relic a band below its rarity down one
> (six Uncommons, five Rares, four Legendaries) and Wide Lens up; meta tier does not move with rarity.

## 1. Common (32) — drop weight 60 %

| id | Name | Cat | Effect | Hook | Status |
|---|---|---|---|---|---|
| `barrier-charm` | Barrier Charm | combat | The first enemy hit of each combat deals half damage (v0.9.97, was −20 %) | `damage-taken` | ✅ v0.9.97 |
| `quick-claw-charm` | Quick Claw Charm | card | The first card of each fight costs 1 AP less (`ap-cost`, v0.7.5 — was an activated replay) | `ap-cost` | ✅ |
| `berry-pouch` | Berry Pouch | combat | Healing consumables restore +20 % | `on-heal` | ✅ |
| `soothe-bell` | Soothe Bell | meta | Every Friendship gain ×2 (§6.3.9; v0.9.90 — until then +5 % at full HP, which nobody missed) | `friendship-multiplier` | ✅ |
| `coin-pouch` | Coin Pouch | meta | Poké Dollar drops ×1.25 | `on-reward` | ✅ |
| `ground-gem` | Ground Gem | combat | Ground moves +10 % (party-wide) | `on-damage` | ✅ |
| `water-gem` | Water Gem | combat | Water moves +10 % | `on-damage` | ✅ |
| `fire-gem` | Fire Gem | combat | Fire moves +10 % | `on-damage` | ✅ |
| `grass-gem` | Grass Gem | combat | Grass moves +10 % | `on-damage` | ✅ |
| `rock-gem` | Rock Gem | combat | Rock moves +10 % | `on-damage` | ✅ |
| `flying-gem` | Flying Gem | combat | Flying moves +10 % | `on-damage` | ✅ |
| `electric-gem` | Electric Gem | combat | Electric moves +10 % | `on-damage` | ✅ |
| `psychic-gem` | Psychic Gem | combat | Psychic moves +10 % | `on-damage` | ✅ |
| `fighting-gem` | Fighting Gem | combat | Fighting moves +10 % | `on-damage` | ✅ |
| `normal-gem` | Normal Gem | combat | Normal moves +10 % | `on-damage` | ✅ |
| `dark-gem` | Dark Gem | combat | Dark moves +10 % | `on-damage` | ✅ v0.9.84 |
| `steel-gem` | Steel Gem | combat | Steel moves +10 % | `on-damage` | ✅ v0.9.84 |
| `cleanse-tag` | Cleanse Tag | status | The first status applied to your side each combat is blocked | `on-status-apply` | ✅ |
| `lucky-egg-token` | Lucky Egg Token | meta | In-run XP ×1.15 | `on-xp` | ✅ |
| `exp-share` | Exp Share | meta | Benched Box Pokémon earn 100 % XP (from the 75 % baseline) | `on-xp` | ✅ |
| `defense-curl-charm` | Defense Curl Charm | combat | Every 2nd manual swap: the incoming Lead gains Def +1 (v0.9.97, was every 3rd) | `reactive-stage` | ✅ v0.9.97 |
| `quick-draw` | Quick Draw | card | Turn 1 of each combat: draw +1 skill card | `on-turn-start` | ✅ |
| `brave-charm` | Brave Charm | combat | Pokémon below 50 % HP deal +10 % | `on-damage` | ✅ |
| `battle-hat` | Battle Hat | card | At turn end, if you made no manual swap, retain 1 skill card | `on-turn-end` | ✅ |
| `recycle-tag` | Recycle Tag | card | The turn after the deck reshuffles, draw +1 (never fired until v0.9.97) | `draw` | ✅ v0.9.97 |
| `hikers-coat` | Hiker's Coat | combat | The whole team takes −25 % from Cleave intents (v0.9.97, was the Lead, −10 %) | `damage-taken` | ✅ v0.9.97 |
| `hand-off-pouch` | Hand-Off Pouch | card | A card Confusion knocks out of your hand is replaced from the deck (v0.7.5 — was an activated discard-to-draw) | `confusion-redraw` | ✅ v0.9.98 |
| `healers-kit` | Healer's Kit | status | A Pokémon swapped out of the Lead is cured of its status; every cure also restores +8 HP (v0.9.97, was the +8 only) | `swap-cure` | ✅ v0.9.98 |
| `status-lance` | Status Lance | status | Statuses you apply last +1 turn (Paralysis 4, Confusion 4; Sleep/Freeze unchanged) | `status-duration` | ✅ v0.9.98 |
| `tacticians-coin` | Tactician's Coin | lead | The first manual swap each combat costs 0 AP | `free-swap` | ✅ v0.9.98 |
| `battle-tracker` | Battle Tracker | meta | A species already fought this run never hides its first intent again (§5.5.1). Was "+5 % Witnessed reveal rate", a rate the Pokédex's single Familiar tier no longer has | `run-scouting` | ✅ v0.9.98 |
| `trauma-salve` | Trauma Salve | meta | Single charge: remove all Trauma from one Pokémon (§8.2.4) | `on-acquire` | ✅ v0.9.98 |

## 2. Uncommon (18) — drop weight 30 %

| id | Name | Cat | Effect | Meta tier | Status |
|---|---|---|---|---|---|
| `choice-specs` | Choice Specs | card | The first Ranged move each turn costs 1 AP less, never below 1; later Ranged moves cost +1 (v0.9.97, was free) | T1 | ✅ v0.9.97 |
| `choice-band` | Choice Band | card | The first Melee move each turn costs 1 AP less, never below 1; later Melee moves cost +1 (v0.9.97, was free) | T1 | ✅ v0.9.97 |
| `move-echo` | Move Echo | card | Play 2 different moves from one Pokémon in a turn → +1 AP next turn (v0.9.97, was 3) | T1 | ✅ v0.9.97 |
| `type-resonance` | Type Resonance | combat | Active Team members sharing a primary type buff each other's matching moves +10 % per shared member | T2 | ✅ |
| `adrenal-surge` | Adrenal Surge | combat | When a Pokémon faints, the rest of the Active Team gains Atk +2 (v0.9.97, was +1) | T2 | ✅ v0.9.97 |
| `reactor-core` | Reactor Core | card | Draw +1 skill card every turn (the hand is discarded whole: max hand +1) | T2 | ✅ |
| `cycle-cell` | Cycle Cell | card | The first three reshuffles each combat: +1 AP next turn (never fired until v0.9.97) | T2 | ✅ v0.9.97 |
| `pressure-plate` | Pressure Plate | combat | After a 3+ AP move, the next move that turn costs −1 AP | T2 | ✅ |
| `vital-pendant` | Vital Pendant | combat | Once per combat below 25 % HP: heal to 50 % Effective Max HP | T2 | ✅ |
| `steady-aim` | Steady Aim | combat | Crit multiplier 1.5 → 1.75 (never reached the damage until v0.9.97) | T2 | ✅ v0.9.97 |
| `lure-module` | Lure Module | meta | Wild Areas roll their rarity twice and keep the rarer — 36 / 45 / 19 % (§2.6.2). Was "+1 species choice", which the v0.9.7 pool-and-roll has no choice for | T2 | ✅ v0.9.7 |
| `bond-bracelet` | Bond Bracelet | combat | The first time the Lead drops below 50 %, the whole bench gains Def +1 | T2 | ✅ |
| `wide-lens` | Wide Lens | combat | Status riders resolve **before** damage (so a faint never eats the rider) | T2 | ✅ v0.9.98 |
| `crown-of-echoes` | Crown of Echoes | combat | The first move each combat is copied free into your hand on turn 2 | T3 | ✅ v0.9.98 |
| `time-spinner` | Time Spinner | combat | Every enemy but a boss loses its first turn of the fight, shown on its intent (v0.7.5 — was an activated skip) | T3 | ✅ v0.9.98 |
| `phoenix-feather` | Phoenix Feather | combat | Once per Region: prevent a faint, restore to 1 HP; regrows with each new Region (v0.9.97, was once per run, and a bug brought it back every combat) | T2 | ✅ v0.9.98 |
| `trainers-instinct` | Trainer's Instinct | combat | See each enemy's intent **one turn further ahead**; it commits to the plan (§5.5.1) | T3 | ✅ v0.9.98 |
| `box-expander` | Box Expander | meta | Box capacity +2 for this run (stands down under Box Squeeze) | T3 | ✅ v0.9.98 |

## 3. Rare (9) — drop weight 10 %

The seven below plus Perfect Recall and Evolution Catalyst, the Tier-3 rows in §6 that are Rare (Trainer's
Instinct and Box Expander are Uncommon since v0.9.98).

| id | Name | Cat | Effect | Meta tier | Status |
|---|---|---|---|---|---|
| `champions-crest` | Champion's Crest | combat | Each enemy a Pokémon defeats: +5 % damage for it this run (cap +25 %) | T3 | ✅ |
| `sages-tome` | Sage's Tome | card | +1 AP every turn including turn 1, but draw 1 fewer; cap 6 (v0.9.97, was +2 cards) | T3 | ✅ v0.9.97 |
| `soul-link` | Soul Link | combat | The two Pokémon longest in the Box each deal +15 % while both stand in the fight (v0.9.97, was +10 %) | T3 | ✅ v0.9.97 |
| `unbreakable-will` | Unbreakable Will | status | Immune to the first status each turn; your statuses last +1 turn (v0.9.97, was each combat) | T1 | ✅ v0.9.98 |
| `clear-mind` | Clear Mind | combat | Every Unknown intent is revealed, and each enemy's intent is seen a turn ahead, committed (v0.9.97, adds Trainer's Instinct's queue) | T1 | ✅ v0.9.98 |
| `evolutions-edge` | Evolution's Edge | combat | Fully-evolved Pokémon deal +20 % | T1 | ✅ v0.9.98 |
| `last-stand` | Last Stand | combat | Once per combat the first Pokémon that would faint survives at 1 HP | T1 | ✅ v0.9.98 |

## 4. Legendary (6) — choice-only, max 2 per run from the picks (§7.3.7)

Never in the drop pool, never on a shop shelf, never a Starting Relic. Offered 1-of-3 at the second and third Gym
victories, a beaten Apex and the Victory Road Summit (four pick moments per run, two picks at most; at the cap the
pick is Rare / Rare / Uncommon). The Black Market's showcase sells a Legendary *Pokémon*, not a relic (§2.11.6).

| id | Name | Cat | Effect | Origin | Status |
|---|---|---|---|---|---|
| `battle-hardened` | Battle Hardened | combat | Every Active Pokémon starts each combat with a Shield = 15 % of max HP | Boon 15 % (v0.9.97, back from 10 %) | ✅ v0.9.97 |
| `flow-state` | Flow State | lead | The first manual swap of every turn costs 0 AP (Tactician's Coin gives one per combat; the two stack, the turn's own spent first) | Boon | ✅ |
| `type-mastery` | Type Mastery | combat | Super-effective moves deal ×1.3 | Boon (v0.9.97, was ×1.15) | ✅ v0.9.97 |
| `grandmasters-tempo` | Grandmaster's Tempo | card | Draw +1 each turn; the first skill card each turn costs 0 AP (the free card never fired until v0.9.97) | New | ✅ v0.9.97 |
| `living-legend` | Living Legend | meta | In-run XP ×1.3; recruits arrive +2 levels with 0 Trauma | New | ✅ |
| `apex-predator` | Apex Predator | combat | While the Lead is at full HP its moves deal +50 %; any damage disables this until healed to full (v0.9.97, was +20 %) | New | ✅ v0.9.97 |

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
| `sages-tome` | Sage's Tome | card | +1 AP every turn including turn 1, but draw 1 fewer; cap 6 | ✅ v0.9.97 |
| `crown-of-echoes` | Crown of Echoes | combat | The first move each combat is copied free into hand on turn 2 | ✅ |
| `soul-link` | Soul Link | combat | The two longest-travelling Pokémon deal +15 % while both stand | ✅ v0.9.97 |
| `reactor-core` | Reactor Core | card | Max hand +1 (also reachable as a Tier-2 discovery) | ✅ |
| `perfect-recall` | Perfect Recall | card | Keep two unplayed cards at every turn's end, swap or not (v0.9.97, was a once-a-fight discard recall that changed almost nothing) | ✅ v0.9.97 |
| `trainers-instinct` | Trainer's Instinct | combat | See each enemy's intent **one turn further ahead**; it commits to the plan (§5.5.1) | ✅ v0.7.5 |
| `evolution-catalyst` | Evolution Catalyst | meta | Once per run, the first Pokémon to come within 6 levels of its threshold evolves there | ✅ v0.6 |
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

`choice-band` + `choice-specs` may both be held; each tracks its own first-move-of-type discount.
Faint prevention order: **Sturdy (ability) → `last-stand` (Rare) → `phoenix-feather` (Uncommon)**.
Type-boost relics, Held Items and field effects all multiply into the damage formula independently.
