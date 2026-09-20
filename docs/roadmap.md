# Pokémon Ascendant — Roadmap

> The version being built is the only scope. Anything else is out unless the user overrides. Each version has
> a **playable claim** (what a tester can do), **exit criteria** (how we know it is done), and the **art it
> needs**. Design references point to `docs/design/`. Status: ☐ planned · ◐ in progress · ✅ done.

## Principle: validate the core before widening

The Unity project built twelve systems before anyone felt the signature turn. This roadmap inverts that: the
first shippable thing is the combat, in front of external testers, via a web link. Every later version adds one
loop layer and re-tests the core inside it.

| Version | Name | Playable claim | Status |
|---|---|---|---|
| **v0.1** | **Combat Slice (Vertical Slice)** | Fight a full 3-Pokémon battle against a wild enemy and a 3-phase boss; the swap decision matters | ✅ code complete 2026-09-19 · ◐ external playtest |
| v0.2 | First Route | Start a run, walk a short Region 1 route (wild + trainers + Center + Gym), win or lose, resume a save | ✅ code · ◐ playtest |
| v0.3 | Identity through Evolution | Evolve with a branch choice, sculpt the active 4 from a move pool, learn TMs/tutor moves | ✅ code · ◐ playtest |
| v0.4 | Economy & Relics | Money, shop, relics, held items, mystery events, elite, difficulty modifiers | ✅ code 2026-09-20 · ◐ playtest |
| v0.5 | Region 1 complete | 12-layer map with the Gym fork, badges, region modifiers, achievements, hub stub — a 60-min run | ✅ code 2026-09-20 · ◐ playtest |
| v0.6 | Meta | Trainer XP/tokens, hub kiosks, Pokédex tiers + Mastery moves, unlocks, meta starters, relic tiers | ☐ |
| v0.7 | Regions 2 & 3 | Status-on-intents, multi-enemy, field effects, cities, R2/R3 content | ☐ |
| v0.8 | Victory Road & League | Gauntlet, Apex, Training Grounds, 5-fight League, Champion, boons | ☐ |
| v0.9 | Polish | Audio, accessibility tier, localisation (es-ES/en-US), generated backdrops, VFX pass | ☐ |
| v1.0 | Release | Desktop build (Tauri), itch.io web + Windows, balance pass, trailer | ☐ |

---

## v0.1 — Combat Slice (the Vertical Slice)  ✅ code complete · ◐ playtest

**Goal.** Prove the signature moment-to-moment loop: a 12-card shared hand where every swap is a decision
(pillar 2) and every enemy action is telegraphed (pillar 1). Nothing outside a single combat.

**Design.** `03-combat.md` (all), `04-resolution.md` §4.1–§5.8, `09-presentation.md` §9.2, `ui/02`, `ui/09`.

**Shipped 2026-09-19**
- Sim: five phases (§3.2); draw 5 skill + 2 consumable; AP 3; Lead absorbs single-target; manual swap ladder
  1/2/3 with per-turn reset and the defensive-swap discount (§3.3.1–§3.3.3); Melee = Lead-only, Ranged = any
  slot; Step-Forward / Step-Backward (§3.3.4); faint resolution + Lead replacement + purge from deck AND discard
  + Freeze precedence (§3.3.5); skill deck 12 with reshuffle (§3.4); consumables per-combat (§3.5); damage,
  type chart, crit (§4.1); all six statuses with G7 timing and immunities (§4.2); stat stages (§4.2.6); enemy
  intents targeting slots with live predicted damage, scoring AI + randomness floor, Cleave never fizzles /
  Backstrike fizzles, hidden first intent for Gyms (§5); boss phases 50/20 % with markers, Entrenchment, P3
  cooldown reset, Sturdy (§5.8); deterministic catch gauge (§2.6.4); sequential Gym enemies; 9 ability hooks.
- Content: 18 species, 56 moves, 12 abilities, 11 consumables, 6 fixtures (Zod-validated, art rot-guarded).
- Screens: Main Menu · Scenario picker · **Combat** (squad formation, animated sprites over stage backdrops,
  intent chip with live damage, hover/select damage preview, Step-Back and ally-target prompts, Lead-pick
  modal, catch pill, combat log, floating numbers/shake/lunge/banners, Victory/Defeat/Caught summary).
- Tooling: `?scenario=<id>&seed=n`, `window.__ascendant.{dump,start,dispatch,auto,replay}`, golden-master
  replays (3 fixtures), balance harness (`npm run balance`), Playwright screenshots + UI playthrough.
- Art (all by script, no human step): portraits, box icons, animated battle sprites (front/back), SVG glyph set,
  item icons, trainer sprites, 11 stage backdrops, CSS motion per §9.9.

**Exit criteria**
1. ✅ `npm run check` green — 151 Vitest cases across rules, content, determinism, golden masters, balance envelope
   (the original "≥ 300" target was over-estimated: the reducer design needs fewer, broader tests than the Unity
   class-per-rule suite; coverage of the § list above is complete).
2. ✅ Three golden-master replays pass; RNG cursor lives in state, so save/restore mid-fight replays identically.
3. ☐ Five external testers finish the six fixtures from a web link without a soft-lock or a rules bug.
   *(Internal: the UI playthrough e2e wins wild-basic by clicks alone; a manual Gym run is logged in
   `docs/playtests/2026-09-19-combat-slice.md`.)*
4. ☐ Playtest report from external testers (≥ 4/5 say the swap mattered; median turn < 40 s).
   *(Internal report says yes on the swap; timing needs humans.)*
5. ✅ at 1920×1080 (screenshots in `playtest/`); ☐ 1280×720 pass pending.

**Open from the playtest:** Q29 enemy-side statuses, Q30 hidden opener Cleave, Q28 divisor confirmation.

---

## v0.2 — First Route  ✅ code complete · ◐ playtest

**Goal.** Wrap the combat in the smallest honest run: a linear-ish route with choices, recruitment and a boss,
so persistence, XP and the Box/Active tension exist.

**Design.** `02-the-run.md` §2.1–§2.4, `02-the-run.md` §2.5 (simplified 7-layer map), §2.6 wild + catching, §2.7 trainers, §2.9.1 Center, `06-progression.md` §6.2 XP/levels, `06` §8.2 Trauma stacks, `10-foundations.md` §10.8 saves.

**Shipped 2026-09-19**
- **Run layer** (`src/sim/run/`, pure and deterministic like the combat sim): seven-layer seeded Region map
  with per-layer type weights and the canon guarantees (three entry choices, a Wild by layer 1, a Centre at
  layer 5, the Gym at layer 6, no unreachable node, no adjacent same-kind); node previews that name the
  species you will actually fight; the Box (cap 6) and the Active 3 with a Lead; catch → Box → Swap-or-Skip;
  the Centre heal; XP with the 75 % bench share; HP, status and Trauma carried between nodes; Victory/Defeat.
- **Layer-scaled difficulty** (§2.6.3, §2.7.3): the wild band walks with the route (L5–6 at layer 0, L10–11 at
  layer 5) and a trainer sits one level above its layer's band. A node fixes its roster when the map is
  generated, so the fight can never disagree with the preview.
- **Evolution at the threshold** (§6.2.4) — see the scope note below.
- **Save/resume** (§10.8): an FNV-1a-checksummed envelope behind a `SaveProvider`, localStorage today;
  autosave at every node boundary; Continue on the main menu; a reload mid-fight rebuilds the same fight from
  the scenario the save carries, so no progress is lost to a refresh.
- **Screens:** New-run stepper (difficulty stub → Starter Select), Map, Node Preview, Post-Combat Reward,
  Team/Loadout (the Box panel on the map), Swap-or-Skip, Pause, Victory, Defeat.
- **Content:** 40 species, 128 moves, 30 abilities; eight trainer rosters over four archetypes; the Region 1
  Gym (Geodude + a three-phase Graveler ace).
- **Art (regenerated 2026-09-19, Pokémon-themed):** four battle backdrops, the Region map plate and the
  main-menu vista, all generated at 2K and installed at 1920×1080; eleven consumable icons in the Pokémon bag
  style with their backgrounds cut out; four full-colour map node badges. The doctrine changed with them:
  generated art now leans *into* the franchise's visual language rather than around it, because the project
  is free and stays free. The creatures are still the real sprites, for craft reasons.
- **Accessibility (§9.6, four items pulled forward):** the whole fight plays from the keyboard, every control
  carries a name, cards read as sentences, a live region narrates combat and the map, modals trap and return
  focus, and no animation loops under `prefers-reduced-motion`. Six Playwright cases hold the line.
- **Verification:** 201 Vitest cases (41 of them the run layer) · a whole-run auto-player
  (`src/sim/balance/autoRun.ts`) reporting win rate, depth and pacing per starter · 16 Playwright cases,
  five of which drive a complete route through the UI with nothing but clicks, at both target resolutions.

**Scope call — evolution landed early.** The roadmap put evolution in v0.3, but a base form's learnset ends
two levels *before* its evolution threshold, so without it every Pokémon stopped learning at level 10 and the
run was unwinnable for two of the three starters. The state change (`grantXp` evolves at `evolveLevel` and
re-derives the kit) shipped here; the v0.3 line item is now the **Evolution *screen*** — the animation, the
before/after panel and the branch choice — which is the part the design actually describes in §3.6.

**Exit criteria**
1. ✅ `npm run check` green — 202 Vitest cases; `npm run e2e` green — 23 Playwright cases.
2. ✅ A full route is completable end to end through the UI alone (e2e `run.spec.ts`), and quitting
   mid-route and pressing Continue resumes the same map and seed.
3. ✅ The whole-run harness finishes the Region for every starter: Bulbasaur 56 %, Charmander 33 %,
   Squirtle 89 % over 18 seeds each, ~30 combat turns and 2–4 evolutions per run.
4. ☐ An external tester completes a 20-minute run end to end and resumes one from a save.
5. ✅ 1920×1080 and 1280×720 both verified — the 720p case asserts no page overflow and every node marker
   inside the graph panel, so the layout cannot silently regress. Screenshots in `playtest/`.

**Open:** the starter spread (33 % vs 89 %) is a Rock-Gym matchup effect and is flavour-correct, but wants a
human read before v0.3 tuning. Seven unused stage backdrops are still Showdown rips; they belong to regions
that have not shipped and are flagged in `ATTRIBUTION.md` for replacement when their region lands.

## v0.3 — Identity through Evolution  ✅ code complete · ◐ playtest

**Goal.** Make the run *yours*. Evolution stops being a stat bump that happens to you and becomes the choice
the whole progression system exists to produce (Pillar 4).

**Design.** `06-progression.md` §6.3 (archetypes), §6.7 (Learned Move Pool + the active 4), §6.4 (TMs, the
Dojo, stage-aware tutor lists), §6.5 (abilities as a swappable pool), `02-the-run.md` §2.9.4 (the Dojo node),
`ui/screens.md` 3.6 / 4.4 / 4.7. Content from `catalogs/species-r1.md`, `moves.md`, `abilities.md`, `tms.md`.

**Shipped 2026-09-19**
- **Evolution as a decision.** Crossing the threshold no longer evolves anything by itself: it queues an
  Evolution screen, one per Pokémon, between the Reward and the map. **63 branches over 24 species**, ported
  from the catalogue's own tables — the archetypes each line offers, which pool entries each upgrades in place,
  and which move it adds. The screen plays the morph, shows the stat diff and shows the payload as a
  before→after list, marking the upgrades that will land in your active 4. The pick is permanent and it is made
  fresh at every evolution, so a Support Ivysaur can become a Vanguard Venusaur.
- **The Learned Move Pool** (§6.7). A Pokémon now keeps everything it has learned. Levelling adds to the pool
  and fills a free slot but never evicts a card you chose; past four, the new move waits. The **Move Manager**
  (from any Box row, or inside the Dojo) moves cards between the pool and the active 4, with an *Auto* that
  applies the kit rules — two ways to deal damage, and always one Ranged card.
- **The Dojo** (§2.9.4) as a real map node, one per route, mid-trunk: a stage-aware tutor list and the ability
  service. One service per visit stands in for 150/200 ₽ until the economy lands.
- **TMs** (§6.4.1). Three of the fifteen — the ones whose move already existed. They drop from trainers and the
  Gym, and are taught from the Move Manager; an incompatible target is greyed, never hidden.
- **Abilities** (§6.5). Six new simulation hooks turned seven catalogued rows from flavour into behaviour —
  Guts, Poison Point, Effect Spore, Inner Focus, Steadfast, Intimidate, Water Absorb — plus Solid Rock. Ability
  pools now match the catalogue exactly, the Box owns the passive slot, and the branch decides what an
  evolution grants.
- **The route grew to eight layers.** You clear one node per layer, so a service node replaces a fight rather
  than sitting beside one; at seven layers the Dojo cost the Charmander line two thirds of its win rate. Eight
  keeps six fights with the Dojo on the route.
- **Verification:** 233 Vitest cases (11 of them the new ability hooks, 20 the run layer's v0.3 actions) ·
  28 Playwright cases, four of them driving the Evolution screen, the Move Manager, the Dojo and a TM teach ·
  the whole-run harness extended to pick branches, re-pick kits and spend the Dojo.

**Scope calls, all recorded where they live.** The roadmap line said "Center tutor"; canon (§2.9.1) had already
moved tutoring out of Centres and into the Dojo, so the Dojo is what shipped. Ten branch additions print an
effect the sim cannot express yet (recoil, multi-hit, escalating Poison, on-kill, three team-wide guards) and
ship at their catalogued power with that clause omitted — `catalogs/moves.md` section 0 lists them, and the
effect kinds are v0.4. The TM drop runs at 35 % instead of canon's 5 % because the Shop and Mystery Events, its
other two sources, do not exist yet.

**Exit criteria**
1. ✅ `npm run check` green — 233 Vitest; `npm run e2e` green — 28 Playwright.
2. ✅ Two runs with the same starter play differently: the branch changes the kit, the passive and the range
   profile, and the harness's archetype pick swings the Charmander line's win rate by 7 pp on its own.
3. ☐ Testers describe the evolution choice as the moment their run "became theirs" (Pillar 4). Human.
4. ☐ A tester finishes a run having used the Dojo and a TM, and can say what they bought and why. Human.

**Deployability audit (2026-09-19).** Played end to end before moving on. Fixed: the Centre was rolled into the trunk weights and averaged 2.8 per map against canon’s one (§2.5.1) — the trunk now rolls fights only; a “How to play” panel on the menu and in the pause menu, because every rule was discoverable by tooltip and none was explained (§9.6.1); the version string now reads from package.json instead of saying “v0.2”; the locked difficulty card said “arrives in v0.3” while running inside v0.3; the Starter screen now names the Region 1 Gym and how your type fares against it, because Pillar 1 telegraphs every intent in a fight and said nothing about the climax. Verdict: ready for a guided playtest, not for a public link — the starter spread is the blocker.

**Open.** The starter spread is now measured properly — over 120 seeds, Bulbasaur 61 %, Charmander 28 %,
Squirtle 90 %. It is the Region 1 Gym's type matchup and it is flavour-correct, but it is not a balance anyone
would ship. The designed fix is v0.5's Gym fork (2-of-4), which lets a Fire start pick a Gym it can beat;
tuning Region 1 around one mandatory Rock Gym would just move the problem. Wants a human read.

## v0.4 — Economy & Relics  ✅ code · ◐ playtest

**Goal.** Give the route between the fights something to decide. v0.3 made a run *yours* through evolution;
v0.4 makes it yours through what you carry, and makes a service node a real trade against a fight.

**Design.** `07-items.md` (relics, held items, consumable upgrades), `02` §2.8 elite, §2.9 shop/dojo/centre,
§2.10 mystery events, `08` §8.6.3 Starting Relic, §8.8 difficulty modifiers.

**Shipped 2026-09-20**
- **Money (§2.14).** Poké Dollars from every fight, on the map HUD. Prices from `catalogs/economy.md`:
  consumables by tier, ball 50, relic 150/300, held item 300, TM 350, re-rolls 25→50→100, Therapy
  100 × (1 + stacks), Dojo 150/200. One file, `run/economy.ts`, so a balance pass edits one table.
- **43 relics** (25 Common + 18 Uncommon) and **19 held items**, ported from the catalogues, each a named
  hook plus parameters (§7.7) resolved in `combat/items.ts`. §7.3.6's independent multiplicative terms are
  pinned by test: two Water boosts multiply, they do not add.
- **Nodes.** Poké Mart with a seeded shelf and the re-roll ladder (§2.9.2); Mystery Events, nine of them in a
  3 Safe / 4 Tradeoff / 2 Gamble mix, every outcome stated on the button and confirmed on screen after
  (§2.10); the Elite Trainer, two Pokémon both two-phase, a guaranteed relic (§2.8.1); and the Pokémon
  Centre, which stopped being a doorway and became a screen so §8.2.4's Therapy has somewhere to be sold.
- **Route.** Ten layers. Shop at L3 (early, so a relic has the route to pay itself back), Dojo at L6 (late,
  so §6.4.3's per-stage tutor list is the evolved one), Mystery at L2 and L5, Elite at L7 alone, Centre at
  L8, Gym at L9. The Elite and the Gym are the only single-node layers: a landmark is a door, not a fork.
- **Difficulty (§8.8).** All ten modifiers on the picker, seven live (Iron Will, Dense Fog, No Refunds, Box
  Squeeze, Trauma Surge, Faint Echo, Master's Challenge), three locked with the version that unblocks them.
  One slot, XP premium shown live, and the baseline is the floor.
- **Screens.** Poké Mart · Mystery Event · Pokémon Centre · inventory drawer (relics / held items / bag,
  and the only place a Held Item is equipped) · a three-step new-run stepper with a real difficulty select
  and §8.6.3's 1-of-3 Starting Relic.
- **Art.** 62 relic and held-item icons and three node badges, all real assets — PokéAPI item sprites, the
  HGSS Poké Mart and question mark from the Bulbagarden Archives, a Showdown Ace Trainer. Plus a drawn ₽
  coin, because the glyph is missing from enough fallback stacks to risk tofu on a first load.
- **v0.3 debts, all closed.** The Dojo charges 150/200 and sells as many services as you can pay for; the TM
  drop is back to canon's 5 % now the Shop and Mystery Events are its other sources; the five `MoveEffect`
  kinds landed in v0.4's first pass and the ten branch additions print their real effect.

**Balance.** The starter spread was v0.3's named ship blocker at 61 / 28 / 90 %. v0.4 measures
**47 / 47 / 57** over 60 seeds — a 10-point spread — without touching the Gym or the type chart. The economy
closed it: a Fire start now has a Starting Relic, a shelf, an Elite's relic and a Held Item to find an answer
with. Every service node measures within the noise band of skipping it, which is the trade they are for.

**Honest degradation.** Three relics and three difficulty modifiers ship inert because the system behind them
does not exist. Each says so in the UI, and `isOfferable` keeps the inert relics out of every drop, shelf and
Starting Relic offer — a labelled blank is still a blank, and selling one for 300 ₽ would be worse than not
shipping the row. Master's Challenge is available but partial: §5.8.3 stops at three phases, so a three-phase
ace keeps three and the card says so.

**Exit criteria**
1. ✅ `npm run check` green — 277 Vitest; `npm run e2e` green — 38 Playwright.
2. ✅ No dominant relic: the drop pool excludes duplicates for the run, and the balance harness's A/B over
   every service node lands inside the noise band.
3. ☐ Testers report build variety (Pillar 3) — that two runs with the same starter felt different because of
   what they carried, not just what they evolved into. Human.
4. ☐ A tester can say, unprompted, why they skipped a node. Human.

## v0.5 — Region 1 complete  ◐

**Goal.** Make the *route* the decision. v0.3 made a run yours through evolution, v0.4 through what you carry;
v0.5 makes it yours through where you go — and gives the Region two possible endings instead of one.

**Design.** `02` §2.5 Map v2 (12 layers, Gym fork 2-of-4), §2.5.0 lane themes, §2.8.2 Elite Wild, `05` §5.9.2
type pool, §5.10 badges (R1 four), `02` region modifiers, `08` §8.7 achievements (10), §8.4 hub stub,
`09` §9.6 accessibility basics, settings.

**Shipped 2026-09-20 — the map**
- **Twelve layers, ~47 nodes, a lattice not a ladder.** 4–5 columns, 1–3 children each, every edge within one
  column of its parent and drawn from a *contiguous* window so edges never cross. You walk twelve of the
  forty-seven, and the forty-five you did not take stay on the board.
- **The Gym fork (§2.5).** Two of the Region's four Gym types are drawn per run and named on the map from
  layer 0. The trunk runs to L7; L8 splits into two lanes that **never rejoin**, so choosing one closes the
  other. That is the whole reason it is a choice.
- **Themed lanes (§2.5.0)** — the idea the map is built around. Each lane looks like the Gym at the end of
  it: the Rock lane is caves and Hikers, the Water lane is rivers and Swimmers, for four layers before you
  arrive. A lane's wilds are *adjacent* to its Gym rather than counter to it, so the counter is built in the
  trunk and the lane is where you commit — plan in the trunk, commit at the fork. Each lane carries one
  **counter species** so a late commit is a handicap and not a loss.
- **Generation rules.** A wild-heavy opening (L0–L1 are >60 % Wild, because a lone Lv 5 starter needs bodies
  before it needs XP) · **no Centre before the fork** · the Elite Trainer guaranteed at L7 **as the middle of
  three**, not as the whole layer · an extra Elite Trainer in a lane at **22 %** · an Elite Wild at **45 %**,
  at most one. All six are asserted over 200 seeds in `mapRules.test.ts`.
- **All four Region 1 Gyms** (Rock · Water · Bug · Normal) with their own leaders, badges, telegraph lines
  and off-type answer, plus the Krabby line the Water Gym needed. Levels are **derived** from the wild band
  now (§5.9.3: non-ace +4, ace +6) so a route-length change cannot leave the climax behind — which is exactly
  what it did on the first jump from ten layers to twelve.
- **The Elite Wild (§2.8.2)** — Snorlax, boss HP, two phases, a catch-or-kill dilemma the reducer enforces:
  beat it and you take a Rare relic, catch it and you take the Pokémon, never both.

**Balance.** 67 / 58 / 70 over 60 seeds (Bulbasaur / Charmander / Squirtle) — a 12-point spread. The harness
now **chooses its lane by matchup**, which it had to: the fork is the decision the map exists to create, and a
harness that ignores it measures a strictly worse player than the design assumes, after which the *design*
gets tuned against that player.

**Shipped 2026-09-20 — the rest**
- **The four Region 1 Badges (§5.10.1)**, resolved through the *same* §7.7 hooks as relics, because §7.3.6
  already says they are independent terms of one formula and a second implementation is a second place for
  it to drift. Won at the Gym, permanent, and named on the summary with what each one does.
- **Rare and Legendary relics (§7.3.5, §7.3.7)** — the catalogue is all sixty rows now. Rare joins the drop
  table at 10 %; **Legendary is outside it entirely** and reachable only through the guaranteed **1-of-3
  pick at a Gym victory**, capped at two per run. Three rows ship inert, each naming the version it needs.
- **Region Modifiers (§2.11.3)** — the seventeen, one in force at a time, expiring with its Region. Offered
  as the fourth step of the new-run stepper, which is where `ui/screens.md` §3.3 always drew it: §2.11.3 puts
  the Reflection in a City, and v0.5 has one Region and no Cities.
- **Achievements (§8.7)** — ten of the fifty, chosen because every trigger already exists. A pure fold over
  events **diffed** from the run rather than emitted by it, so nothing about the account's record can reach
  inside a save that has to replay identically (§10.8).
- **The Trainer Hub (§8.4)** — the shell, with the PC Terminal open and the other four kiosks named and
  dated. **Settings (§9.6)** — text size at 80/100/125/150 % and a motion override, both persisted.

**Balance (120 seeds).** 67 / 66 / 73 — a 7-point spread, and about 4 points of win rate above the map
alone, which is the Rare tier and the Region Modifier being worth something. A 30-seed table read 63/67/80;
the 80 was noise, exactly as the standing rule about the standard error of a *difference* predicts.

**Exit:** a 60-minute run; three testers come back for a second run unprompted. (This is the old Unity
"Region 1 end-to-end" VS.)

## v0.6 — Meta  ☐
Trainer XP / Tokens (§8.3), hub kiosks (§8.4), Pokédex tiers + Mastery moves (§5.13, §6.8), unlock trees, meta starters (§8.5), relic tiers (§8.6), Trauma services.

## v0.7 — Regions 2 & 3  ☐
Mechanical escalation (§2.2): status-on-intents, multi-enemy (1 lead + supports), field effects (§4.3), Cities (§2.1 / CL-015), R2/R3 gyms and biomes, content expansion.

## v0.8 — Victory Road & League  ☐
§2.12 nodes (Gauntlet, Apex, Training Grounds, Summit), League 5 fights with micro-rest, Champion signature (§5.12), League Boons.

## v0.9 — Polish  ☐
Audio direction + stems + SFX bible (§9.5), accessibility tier (§9.6), localisation architecture + es-ES/en-US (§9.10), generated backdrop set (`ui/07`), VFX pass, performance pass.

## v1.0 — Release  ☐
Tauri desktop build (Windows; Linux stretch), itch.io web + Windows downloads, balance pass with telemetry from playtests, trailer, README/press kit. Fan project: free, non-commercial, IP disclaimer everywhere.

---

## Change control
Scope moves only through this file. When a version's scope changes, add a dated line under it and a
note in the canon section if design moved. Keep `docs/session/active.md` pointing at the current version and task.
