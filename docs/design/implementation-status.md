# Implementation status

> What is built, where its code lives, and where the build still disagrees with canon. **Derived** — canon is
> the topic files; this is the map from a rule to the file that implements it.
>
> Update a row whenever a system's status changes. Last reviewed 2026-09-20 (during v0.5).

**Legend** ✅ complete for its scope · ◐ partially built · ☐ not started · ⚠ built but diverges from canon

---

## Systems

| System | Canon | Code | Tests | Status |
|---|---|---|---|---|
| Combat loop, five phases | §3.2 | `sim/combat/turn.ts`, `reducer.ts`, `state.ts` | `setup`, `cards`, `faint` | ✅ |
| Lead and swap | §3.3 | `reducer.ts`, `slots.ts`, `preview.ts` | `swap`, `faint` | ✅ |
| Deck, hand, consumables | §3.4, §3.5 | `sim/combat/deck.ts` | `cards`, `status` | ✅ 15 of 28 consumables, the §7.2.6 healing chain complete |
| Damage and type chart | §4.1 | `damage.ts`, `typeChart.ts`, `damageFlow.ts`, `stats.ts` | `damage`, `typeChart`, `statStages` | ✅ |
| Status and stat stages | §4.2 | `status.ts`, `statStages.ts`, ticks in `turn.ts` | `status`, `statStages` | ✅ |
| Field effects | §4.3 | — | — | ☐ v0.7 |
| Enemy AI and intents | §5.1–§5.7 | `intents.ts`, `slots.ts` | `intents`, goldens | ✅ |
| Bosses, Gyms, Badges | §5.8–§5.10 | `boss.ts`, `damageFlow.ts`, `run/region.ts`, `content/data/badges.json` | `boss`, `mapRules`, `badges`, the Gym fixture | ✅ all four R1 Gyms with band-derived levels; the four R1 Badges resolve through §7.7's hooks beside relics. R2/R3 Badges arrive with their Gyms |
| Elite Four, Champion | §5.11, §5.12 | — | — | ☐ v0.8 |
| Pokédex and Mastery | §5.13 | — | — | ☐ v0.6 |
| Catching | §2.6.4 | `catch.ts`, `reducer.ts` | `catch`, the catch fixture | ✅ |
| HP economy and Trauma | §2.4, §8.2 | `combat/stats.ts`, `battleConfig.ts`, `run/run.ts` | `setup`, `run` | ✅ |
| XP, levels, evolution | §6.2, §6.3 | `run/xp.ts`, `ui/screens/EvolutionScreen.tsx` | `run`, `runBalance`, `e2e/progression` | ✅ 63 branches, archetype picked per evolution |
| Moves, abilities, the Dojo | §6.4–§6.7 | `abilities.ts` (19 hooks), `run/xp.ts`, `ui/components/MoveManager.tsx`, `ui/screens/DojoScreen.tsx` | `abilities`, `moveEffects`, `run`, `e2e/progression` | ✅ pool, Move Manager, 3 TMs, Dojo at canon prices; 4 abilities inert pending v0.7 |
| Map, nodes, run flow | §2.1, §2.5–§2.14 | `run/map.ts`, `region.ts`, `run.ts`, `encounter.ts`, `events.ts` | `run`, `mapRules`, `runBalance`, `e2e/run`, `e2e/economy` | ✅ **Map v2**: 12 layers, ~47 nodes, the Gym fork 2-of-4 with themed lanes, Elite Wild at 45 %, extra Elite at 22 % |
| Items, relics, economy | §7 | `run/economy.ts`, `combat/items.ts`, `reducer.ts`, `ui/screens/ShopScreen.tsx`, `ui/screens/LegendaryScreen.tsx` | `items`, `run`, `e2e/economy`, `e2e/run` | ✅ money, **all 60 relics** (25/18/7/10), 19 held items, Mart + re-rolls, Therapy, the §7.3.7 Legendary 1-of-3 at a Gym victory. 3 relic rows inert; the Black Market is v0.7 |
| Meta progression | §8.3–§8.9 | `run/modifiers.ts`, `run/regionModifiers.ts`, `meta/achievements.ts`, `app/achievementStore.ts`, `ui/screens/{StarterSelect,HubScreen}.tsx` | `regionModifiers`, `achievements`, `e2e/meta`, `e2e/economy` | ◐ §8.8 difficulty modifiers (7 of 10), §8.6.3 Starting Relic, §2.11.3 Region Modifiers (13 of 17 live), §8.7 achievements (10 of 50), §8.4 the hub shell with the PC Terminal open. Trainer XP, Tokens and the other four kiosks v0.6 |
| Determinism, RNG, replay | §10.7 | `sim/rng/*`, `sim/replay/*` | `gameRng`, `determinism`, `golden` | ✅ |
| Save | §10.8 | `run/save.ts`, `app/saveProvider.ts`, `app/runStore.ts` | `run` | ✅ local; server profile v0.6 |
| Presentation | §9 | `src/ui/*`, `src/app/*` | `e2e/screens`, `e2e/playthrough`, `e2e/run`, `e2e/progression`, `e2e/economy`, `e2e/meta`, `e2e/a11y` | ◐ 22 of 27 screens + the §9.6.1 rules panel; §9.6's text size (80/100/125/150 %) and motion override ship in Settings |

Code paths are relative to `src/`. The full architecture is in [`docs/architecture.md`](../architecture.md).

---

## Where the build disagrees with canon

Canon is correct; these are work items, not open questions. v0.2 closed four, v0.3 closed four and opened
four, and v0.4 closed all of those. What is left is content waiting on a system, not a rule implemented wrong
— and every waiting row says so where a player can read it (§7.7).

| # | Canon says | The build does | Fix in |
|---|---|---|---|
| 1 | 28 consumables (§7.2) | 15. The healing chain and the §7.2.6 upgrades are complete; nine utilities and the three Evolution Items wait on the systems they read — fields, the Pokédex, evolution items | **v0.6 / v0.7** |
| 2 | 15 relic hooks cover every authored row (§7.7) | 3 of 43 relics and 3 of 10 difficulty modifiers are inert, each carrying a `pending` note, each excluded from every drop, shelf and offer by `isOfferable` | **v0.5 / v0.6** |
| 3 | A boss ace reaches Phase 4 under Master's Challenge (`catalogs/modifiers.md`) | §5.8.3 defines three phases and no fourth threshold, entry effect or marker, so a three-phase ace keeps three; the picker says so | **v0.6** |
| 4 | Snorlax's boss script runs `snore` (playable only while asleep), `yawn` (delayed status), `heavy-slam` (conditional power) and `giga-impact-v` (recharge) | Four effect kinds the sim does not have. The shipped profile is the half that has a definition — Amnesia, Rest, Body Slam, Crunch — and the §2.8.2 catch mechanic, which is the reason the node exists, is intact | **v0.6** |
| 5 | Krabby learns `mud-shot` at 13, `metal-claw` at 17 and `stomp` at 21 (`catalogs/species-r1.md`) | Its evolveLevel is 12, so §6.9 makes all three unreachable — a catalogue slip. They moved onto Kingler at the same levels, so the *line* keeps every move | **catalogue fix** |
| 6 | Four lines' first pool entry is their most characteristic passive (§6.5.1) | It is, and for Oddish, Diglett, Magikarp and Psyduck that passive is inert until the field system lands | **v0.7** |

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
| Species | 24 R1 lines + 17 reserved | 43 species (18 lines), with learnsets, catalogue ability pools, stage tutor lists and 65 evolution branches |
| Moves | ~150 | 163, all with their full effect |
| Abilities | 38 | 31 · 27 live, 4 inert pending the field system (v0.7) |
| Consumables | 28 | 15, including the whole §7.2.6 healing chain and §2.4.3 Revive |
| Scenarios | — | 6 fixtures + generated run nodes |
| Trainers · gyms | all | 10 R1 rosters over 5 archetypes (Swimmers joined for the Water lane); **all four** R1 Gyms |
| TMs | 15 | 3 (the ones whose move exists) |
| Relics | 25 Common + 18 Uncommon | 43 · 40 live, 3 inert and excluded from every offer |
| Held items | 19 | 19 · 18 reachable; Thick Club waits on Marowak |
| Mystery events | 22 | 9 (3 Safe · 4 Tradeoff · 2 Gamble) |
| Difficulty modifiers | 10 | 10 listed · 7 selectable, 3 locked with the version that unblocks them |
| Elites | 2 R1 archetypes + 2 Elite Wilds | 1 Elite Trainer (the Ace Trainer; the Rival wants a run spanning Regions) + 1 Elite Wild (Snorlax) |
| Achievements | all | none yet — v0.6 |

Port a catalogue row when its roadmap version comes up; every row carries that version.
`npm run check:catalogs` guards the catalogues, and the content tests guard the JSON.

---

## Verification

| Gate | Command | Current |
|---|---|---|
| Typecheck, lint, unit tests, catalogue guard | `npm run check` | green — 292 tests |
| Screens, a UI playthrough, a full route, the v0.3 progression screens and the v0.4 economy | `npm run e2e` | green — 38 tests (1920×1080 and 1280×720) |
| Section references resolve | `npm run check:refs` | green — 2476 citations, 359 sections |
| Combat pacing | `npm run balance` | wild 3.8 turns / 100 % · Gym 11.3 / 100 % |
| Whole-run pacing | `npm run balance` | win rate 58–70 % by starter (60 seeds) · ~37 turns · 3–4 evolutions |
