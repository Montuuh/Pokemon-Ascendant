# Implementation status

> What is built, where its code lives, and where the build still disagrees with canon. **Derived** — canon is
> the topic files; this is the map from a rule to the file that implements it.
>
> Update a row whenever a system's status changes. Last reviewed 2026-09-22 (v0.6.5).

**Legend** ✅ complete for its scope · ◐ partially built · ☐ not started · ⚠ built but diverges from canon

---

## Systems

| System | Canon | Code | Tests | Status |
|---|---|---|---|---|
| Combat loop, five phases | §3.2 | `sim/combat/turn.ts`, `reducer.ts`, `state.ts` | `setup`, `cards`, `faint` | ✅ |
| Lead and swap | §3.3 | `reducer.ts`, `slots.ts`, `preview.ts` | `swap`, `faint` | ✅ |
| Running (Escaped) | §3.1.2 | `combat/turn.ts` (`flee`), `run/flee.ts`, `run/run.ts` | `flee`, `run` | ✅ parting shot, then the toll by fight tier; never from a Gym |
| Deck, hand, consumables | §3.4, §3.5 | `sim/combat/deck.ts` | `cards`, `status` | ✅ 15 of 28 consumables, the §7.2.6 healing chain complete |
| Damage and type chart | §4.1 | `damage.ts`, `typeChart.ts`, `damageFlow.ts`, `stats.ts` | `damage`, `typeChart`, `statStages` | ✅ |
| Status and stat stages | §4.2 | `status.ts`, `statStages.ts`, ticks in `turn.ts` | `status`, `statStages` | ✅ in combat, and **carried between fights** (§4.2.7.1, v0.7.1): `run/report.ts` sends the status out with its clock (`CarriedStatus`), `PartyMon` keeps it, `encounter.ts` → `combat/setup.ts` restores it with its turns left (and confusion's); fainting, the nurse, the Center and an evolution into an immune type clear it. Tests: `cities.test`, `setup.test` |
| Field effects | §4.3 | — | — | ☐ v0.9.3, after multi-enemy (v0.9.1) |
| Cities | §2.1.4, §2.11 | `run/cities.ts`, `run/run.ts` (`arriveAtCity`, `enter-building`, `depart-city`, `sell-item`), `run/economy.ts` (the City shelf), `ui/screens/city/*` | `cities`, `city`, `run`, `runBalance` (full run), `ring` (balance), `e2e/city`, `e2e/economy`, `e2e/progression`, `e2e/run` | ⚠ v0.7.2: Gym → City → next Region. **Pallet Town** and **Celadon City** drawn as lobbies (generated pixel art, doors as boxes over the buildings in `towns.ts`); open doors: Center (heal + Therapy), the Mart (8 + Poké Balls, sells held items at 30 %) / Celadon's **Department Store** (five floors as tabs, 21 slots, ×1.3, a re-roll restocks one floor — `rollShopStock(…, 'department-store')`), the Dojo (+30 % and every reached stage's tutor list in Celadon — `tutorListFor`), the **Game Corner** in Celadon (`CASINO`, `spin-wheel`/`pull-slots`, own `CasinoRNG` stream, `ui/screens/GameCornerScreen.tsx`); the **Challenge Ring** behind both Dojos (`RING`, `rollRing`/`resolveRing` in `run.ts`, `buildRingScenario`, `ui/screens/RingScreen.tsx` + `RingPrizeScreen.tsx`; per-City offsets tuned by `playRing`); the gate is the Reflection. Safari, Black Market and the Dojo's extra-moves counter open an "in development" panel. **Not yet:** §2.11.1's Daycare and PC Box services (the map's Box panel stands in), §2.11.2.1's scored curation (every shelf is the slot table, drawn at random). The Trauma Salve Cache Hub upgrade is sold and stocks the first City |
| Route service nodes | §2.9 | `run/map.ts`, `run/run.ts`, `run/economy.ts`, `ui/screens/{AidScreen,ShopScreen}.tsx` | `mapRules`, `cities`, `run`, `e2e/economy` | ✅ v0.7.1: the field nurse (§2.9.1: +50 % HP to the whole Box, every status cured, never Trauma; one per lane before its Gym) and the travelling merchant (§2.9.2: two Tier-1 cures, Poké Balls ×3, a Common relic or a held item, one re-roll; at L3). The freed L6 is a third Mystery (§2.5.1) |
| Enemy AI and intents | §5.1–§5.7 | `intents.ts`, `slots.ts` | `intents`, goldens | ✅ |
| Bosses, Gyms, Badges | §5.8–§5.10 | `boss.ts`, `damageFlow.ts`, `run/region.ts`, `content/data/badges.json` | `boss`, `mapRules`, `badges`, the Gym fixture | ✅ all twelve Gyms with band-derived levels (two R3 aces carry a scripted kit, `GymDef.team[].moves`); their twelve Badges (named as their art is; run saves v9 → v10 migrate the renamed ids in `save.ts`) resolve through §7.7's hooks beside relics — Volcano (`damage-dealt` `minApCost`), Rainbow (`turn-end-heal` `atTurnStart`, `itemTurnStartLeadHeal`), Thunder (`ap-cost` `firstOfRange`), Soul — Koga's (`draw` `onStatusApplied`, `statusApplyDrawBonus`); Marsh — Sabrina's (`reveal-intents` `untilTurn`), Earth (`ap-cost` `stepOnly`), Knuckle (`damage-dealt` `range`), Glacier (new `status-chill`, `statusChillMultiplier` → `Combatant.chill`, spent by the next attack) |
| Elite Four, Champion | §5.11, §5.12 | — | — | ☐ v0.9.6 |
| Pokédex and Bond | §5.13, §6.8 | `meta/pokedex.ts`, `meta/bond.ts`, `meta/mastery.ts`, `meta/account.ts`, `run/run.ts` (`abilityLocked`), `combat/setup.ts` (the opener), `content/data/mastery.json`, `ui/screens/hub/PcTerminal.tsx` | `account`, `mastery`, `run`, `e2e/meta` | ✅ Pokédex = knowledge (Familiar only, KO count, caught flag). Bond per line from play (wins, lead, evolutions, recruits, runs) with five ranks: Mastery Lv1 · Shiny · hidden ability (the third authored; 6 lines pending) · Lv2 · Lv3 / opening-hand card + starter eligibility. Mastery Lv1 moves for 13 lines |
| Catching | §2.6.4 | `catch.ts`, `reducer.ts`, `preview.ts` | `catch`, the catch fixture | ✅ a shown roll since 2026-09-21: species ceiling × HP curve × status × ball, 1–90 %, seeded; Master Ball Charm arms one sure throw per run |
| HP economy and Trauma | §2.4, §8.2 | `combat/stats.ts`, `battleConfig.ts`, `run/run.ts` | `setup`, `run` | ✅ |
| XP, levels, evolution | §6.2, §6.3 | `run/xp.ts`, `ui/screens/EvolutionScreen.tsx` | `run`, `runBalance`, `e2e/progression` | ✅ 63 branches, archetype picked per evolution |
| Moves, abilities, the Dojo | §6.4–§6.7 | `abilities.ts` (19 hooks), `run/xp.ts`, `ui/components/MoveManager.tsx`, `ui/screens/DojoScreen.tsx` | `abilities`, `moveEffects`, `run`, `e2e/progression` | ✅ pool, Move Manager, 3 TMs, Dojo at canon prices; 4 abilities inert pending v0.7 |
| Map, nodes, run flow | §2.1, §2.5–§2.14 | `run/map.ts`, `region.ts`, `run.ts`, `encounter.ts`, `events.ts` | `run`, `mapRules`, `runBalance`, `e2e/run`, `e2e/economy` | ✅ **Map v2**: 12 layers, ~47 nodes, the Gym fork 2-of-4 with themed lanes, Elite Wild at 45 %, extra Elite at 22 %. ✅ **Three Regions, three rosters, twelve Gyms**: every Region is a `RegionContent` (`REGIONS`, `regionContent` in `region.ts`) — biomes and weights, band, trunk stage, rosters, Elite, Elite Wild, Gyms, lane themes. Region 2's since v0.7.3 (`*_R2`), Region 3's since v0.7.4 (`BIOMES_R3`, `TRAINERS_R3`, `ELITE_R3` Giovanni, `ELITE_WILD_R3` Aerodactyl, `GYMS_R3` with scripted aces, `LANE_THEME_R3`); rosters walked through `evolvedAt`; a plate each. The Hex Maniac's `veiled` rosters hide each Pokémon's first intent (`EnemySetup.veiled` → `intents.ts`). `levelOffset` is 0 everywhere and stays as a mechanism. The third Gym wins the run until Victory Road (v0.9). **Difficulty curve** (§2.2.1) ✅: the status accent, the stat tier (`REGION_STAT_TIER`, `statTierFor`), level-scaled XP (`levelXpFactor`), held by `runBalance`'s band test; `autoRun` takes a per-fight trace for this kind of work |
| Items, relics, economy | §7 | `run/economy.ts`, `combat/items.ts`, `reducer.ts`, `ui/screens/ShopScreen.tsx`, `ui/screens/LegendaryScreen.tsx` | `items`, `run`, `e2e/economy`, `e2e/run` | ✅ money, **all 60 relics** (25/18/7/10), 19 held items, Mart + re-rolls, Therapy, the §7.3.7 Legendary 1-of-3 at a Gym victory. 3 relic rows inert; the Black Market is v0.7 |
| Meta progression | §8.3–§8.10 | `meta/account.ts`, `meta/unlocks.ts`, `meta/achievements.ts`, `run/modifiers.ts`, `run/regionModifiers.ts`, `app/accountStore.ts`, `ui/screens/HubScreen.tsx`, `ui/screens/hub/*`, `ui/screens/StarterSelect.tsx` | `account`, `achievements`, `regionModifiers`, `e2e/meta`, `e2e/economy`, `e2e/run` | ✅ Trainer XP, the level curve, the track that pays Tokens at every level and opens shelves at 3/5/8/10 (idempotent settling, v1 → v2 back-pay), the Poké Mart's five shelves (`meta/mart.ts`: cosmetics, starters, Hub upgrades, Tier-2 discoveries, the Mastery lane — 9 of 10 Tier-3 rows live), relic tiers with 18 of 20 Tier-2 discoveries tracked, 9 of 10 modifiers with level gates, 7 Hub upgrades (5 sold, 2 waiting on Cities / Victory Road), Twin Run, meta-starters Eevee, Magikarp and Pikachu (sold since v0.7.3, starting with its Light Ball, `RUN_START.starterItems`), cosmetics (`meta/cosmetics.ts`) worn on the Trainer Card, the per-species record (§8.9.1: `CombatTally.koBy/faintsOf/damageBy`, `DexEntry`), the PC Terminal's Pokédex as cards + a three-tab sheet over all 151 species, an unmet one masked to a silhouette, "???", no types and a locked Kit (§8.9.2: `isMet` in `meta/pokedex.ts`, `hub/PcSheet.tsx`, `SpeciesSheet.tsx`, `LineSheet.tsx` as its Line tab), 24 of 50 achievements, all four open kiosks, the run-end account summary, `RunPerks` frozen into the save (§8.10) |
| Determinism, RNG, replay | §10.7 | `sim/rng/*`, `sim/replay/*` | `gameRng`, `determinism`, `golden` | ✅ |
| Save | §10.8 | `run/save.ts`, `app/saveProvider.ts`, `app/runStore.ts`, `app/accountStore.ts`, `app/storageKeys.ts` | `run`, `storageKeys`, `e2e/meta` | ✅ local: run save v6 (carries `perks`), account save v1 (folded from v0.5's medal case on first load), settings |
| Presentation | §9 | `src/ui/*`, `src/app/*`, `src/ui/screens/hub/*` (Radix primitives, motion, NumberFlow, the level ring) | `e2e/screens`, `e2e/playthrough`, `e2e/run`, `e2e/progression`, `e2e/economy`, `e2e/meta`, `e2e/a11y` | ◐ 22 of 27 screens + the §9.6.1 rules panel; §9.6's text size (80/100/125/150 %) and motion override ship in Settings |

Code paths are relative to `src/`. The full architecture is in [`docs/architecture.md`](../architecture.md).

---

## Where the build disagrees with canon

Canon is correct; these are work items, not open questions. v0.2 closed four, v0.3 closed four and opened
four, and v0.4 closed all of those. What is left is content waiting on a system, not a rule implemented wrong
— and every waiting row says so where a player can read it (§7.7).

| # | Canon says | The build does | Fix in |
|---|---|---|---|
| 1 | 28 consumables (§7.2) | 15. The healing chain and the §7.2.6 upgrades are complete; nine utilities and the three Evolution Items wait on the systems they read — fields, the Pokédex, evolution items | **v0.6 / v0.7** |
| 2 | 15 relic hooks cover every authored row (§7.7) | 3 of 43 relics and 2 of 10 difficulty modifiers are inert, each carrying a `pending` note, each excluded from every drop, shelf and offer by `isOfferable` | **v0.5 / v0.6** |
| 3 | A boss ace reaches Phase 4 under Master's Challenge (`catalogs/modifiers.md`) | §5.8.3 defines three phases and no fourth threshold, entry effect or marker, so a three-phase ace keeps three; the picker says so | **v0.6** |
| 4 | Snorlax's boss script runs `snore` (playable only while asleep), `yawn` (delayed status), `heavy-slam` (conditional power) and `giga-impact-v` (recharge) | Four effect kinds the sim does not have. The shipped profile is the half that has a definition — Amnesia, Rest, Body Slam, Crunch — and the §2.8.2 catch mechanic, which is the reason the node exists, is intact | **v0.6** |
| 5 | Krabby learns `mud-shot` at 13, `metal-claw` at 17 and `stomp` at 21 (`catalogs/species-r1.md`) | Its evolveLevel is 12, so §6.9 makes all three unreachable — a catalogue slip. They moved onto Kingler at the same levels, so the *line* keeps every move | **catalogue fix** |
| 6 | Four lines' first pool entry is their most characteristic passive (§6.5.1) | It is, and for Oddish, Diglett, Magikarp and Psyduck that passive is inert until the field system lands | **v0.7** |
| 7 | Eevee's first Mystery node is a Stone Cache (§8.5) | Evolution Items are v0.7.5; the Daycare Lady and the track row say so. Pikachu's kit shipped in v0.7.3 | **v0.7.5** |
| 8 | Trainer's Instinct sees intents one turn further ahead (`catalogs/relics.md`) | Enemies plan one turn at a time until the intent queue; the row is inert and labelled | **v0.7** |

**Closed in v0.6:** the whole account layer (§8.3–§8.6, §8.9, §8.10) · the Pokédex tiers and the Mastery slot (§5.13, §6.8) · One Path (§8.8.2), now the fork exists · 14 more achievements (§8.7) · the Eevee line (§8.5.2) · the four Tier-3 relics the catalogue authored (§8.6.1).

**Closed in v0.5:** the twelve-layer map with the Gym fork (§2.5) · all four Region 1 Gyms with levels derived from the wild band (§5.9.3) · the Elite Wild and its catch-or-kill rule (§2.8.2) · the wild band ramped across the whole route rather than the first half.

**Closed in v0.4:** Full Heal and Ether at 1 AP (§7.2.3–4)
· the Dojo's real prices, uncapped per visit (§2.9.4) · the TM drop back to canon's 5 % now the Shop and
Mystery Events are its other sources (§7.5) · the five `MoveEffect` kinds, so the ten branch additions print
and do what they say (`catalogs/moves.md`) · six abilities that were waiting on them · §2.4.3's Revive,
including the deck contribution it is supposed to give back.

> **Healing went percentage and came back.** v0.4 implemented §7.2.2's percentages; v0.5 reversed the design
> decision itself and restored the franchise's flat 20 / 60 / 120, with the upgrade chain doing the scaling.
> The rationale is in §7.2.2. Max Potion is the one row that stays a percentage, because "restore to full"
> genuinely is one.

**Closed in v0.3:** abilities as a swappable pool with the Dojo service (§6.5.1) · the branch choice and the
Evolution screen (§6.3, §3.6) · the Learned Move Pool and the player-chosen active 4 (§6.7) · §6.3.1's
contradiction with §6.2.2 about who initiates an evolution.

**Closed in v0.2:** the two-zone Trauma curve with its −75 % floor (§8.2.1) · level-derived, line-aware
learnsets with the §6.3.6 basic-kit rule (§6.9) · the hidden-intent kind glyph (§5.5) · the
`max(Atk, Spc)` / `round((Def+Spc)/2)` stat derivation (§4.1.5.1).

**The auto-pick is no longer the rule, it is the default.** §6.7.2's player-chosen active 4 landed with the
Move Manager. `autoPickMoves` in `run/xp.ts` is what a recruit arrives with and what the *Auto* button
applies — two strongest attacks, fill by recency, and always one Ranged card (§6.3.6.5).

---

## Content ported into `src/content/data/`

| Class | Catalogued | In JSON |
|---|---|---|
| Species | 24 R1 lines + 17 reserved + the rest of Gen I | **All 151** (79 base forms), with learnsets, ability pools, stage tutor lists and 160 evolution branches — the 78 of the Gen I pass (2026-09-23, `catalogs/species-gen1.md`, `scripts/add-gen1-content.mjs`) sit in no pool until a Region or an event places them; the legendaries are rarity `legendary`; Ditto's Transform is a stand-in (the real one is in the backlog); `mastery.json` holds the Region 1 lines' Mastery tiers — Region 2's are v0.7.5 |
| Moves | ~150 | 181, all with their full effect (11 Mastery Lv1 moves and the Eevee line's 7 joined in v0.6) |
| Abilities | 38 | 36 · 32 live, 4 inert pending the field system (v0.7) |
| Consumables | 28 | 15, including the whole §7.2.6 healing chain and §2.4.3 Revive |
| Scenarios | — | 6 fixtures + generated run nodes |
| Trainers · gyms | all | 10 R1 rosters over 5 archetypes (Swimmers joined for the Water lane); **all four** R1 Gyms |
| TMs | 15 | 3 (the ones whose move exists) |
| Relics | 25 Common + 18 Uncommon + 11 Rare + 10 Legendary | 64 · 60 live, 4 inert and excluded from every offer; every row carries its meta tier and, for Tier 2, its discovery criterion |
| Held items | 19 | 19 · 18 reachable; Thick Club waits on Marowak |
| Mystery events | 22 | 9 (3 Safe · 4 Tradeoff · 2 Gamble) |
| Difficulty modifiers | 10 | 10 listed · 8 selectable behind their Trainer Level, 2 locked with the version that unblocks them |
| Elites | 2 R1 archetypes + 2 Elite Wilds | 1 Elite Trainer (the Ace Trainer; the Rival wants a run spanning Regions) + 1 Elite Wild (Snorlax) |
| Achievements | 50 | 24 (`achievements.ts`); the rest wait on Regions 2–3, the League and the card log |

Port a catalogue row when its roadmap version comes up; every row carries that version.
`npm run check:catalogs` guards the catalogues, and the content tests guard the JSON.

---

## Verification

| Gate | Command | Current |
|---|---|---|
| Typecheck, lint, unit tests, catalogue guard | `npm run check` | green — 367 tests |
| Screens, a UI playthrough, a full route, the progression screens, the economy, the Hub and the account | `npm run e2e` | green — 53 tests (1920×1080 and 1280×720) |
| Section references resolve | `npm run check:refs` | green — ~3030 citations, 359 sections |
| Combat pacing | `npm run balance` | wild 3.8 turns / 100 % · Gym 11.3 / 100 % |
| Whole-run pacing | `npm run balance` | win rate 58–70 % by starter (60 seeds) · ~37 turns · 3–4 evolutions |
