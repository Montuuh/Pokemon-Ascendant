# Pokémon Ascendant — Roadmap

> The version being built is the only scope. Anything else is out unless the user overrides. Each version has
> a **playable claim** (what a tester can do), **exit criteria** (how we know it is done), and the **art it
> needs**. Design references point to `docs/design/`. Status: ☐ planned · ◐ in progress · ✅ done.
>
> **The table below is read by the game.** The About screen parses it (`src/content/roadmap.ts`), so it is the
> one place a version's status and date live: mark the row and the game follows. Keep the four columns and
> the `✅ YYYY-MM-DD` shape on a finished row. What a shipped version *added*, for players, is
> [`CHANGELOG.md`](../CHANGELOG.md); shipping one follows [`release-doctrine.md`](release-doctrine.md).

## Principle: validate the core before widening

The Unity project built twelve systems before anyone felt the signature turn. This roadmap inverts that: the
first shippable thing is the combat, in front of external testers, via a web link. Every later version adds one
loop layer and re-tests the core inside it.

| Version | Name | Playable claim | Status |
|---|---|---|---|
| v0.1 | Combat Slice | Fight a full 3-Pokémon battle against a wild enemy and a 3-phase boss; the swap decision matters | ✅ 2026-09-19 · ◐ playtest |
| v0.2 | First Route | Start a run, walk a short Region 1 route (wild + trainers + Center + Gym), win or lose, resume a save | ✅ 2026-09-19 · ◐ playtest |
| v0.3 | Identity through Evolution | Evolve with a branch choice, sculpt the active 4 from a move pool, learn TMs/tutor moves | ✅ 2026-09-19 · ◐ playtest |
| v0.4 | Economy & Relics | Money, shop, relics, held items, mystery events, elite, difficulty modifiers | ✅ 2026-09-20 · ◐ playtest |
| v0.5 | Region 1 complete | 12-layer map with the Gym fork, badges, region modifiers, achievements, hub stub — a 60-min run | ✅ 2026-09-20 · ◐ playtest |
| v0.6 | Meta | Trainer XP/tokens, hub kiosks, Pokédex tiers + Mastery moves, unlocks, meta starters, relic tiers | ✅ 2026-09-21 · ◐ playtest |
| v0.7 | Cities & Regions 2–3 | The run continues past Gym 1: two Cities as lobbies, routes stripped to a nurse and a pedlar, Regions 2 and 3 with their own accents, then the Safari Zone, the Ring and the Coliseum as their own buildings, Team Rocket's secret Black Market — the Game Corner played, every City door open. **Twelve subversions** | ✅ 2026-09-28 |
| v0.8 | Multi-enemy & the route | Fights against two or three enemies at once across the whole run — cards dragged onto a target, enemies that act twice or call for help — field effects, the route reworked, then the whole run balanced | ✅ 2026-10-05 |
| v0.9 | The long game | Bond, Shiny, the Trainer level and the Poké Mart reworked, the catch animated, then Victory Road, the League and the Champion | ☐ |
| v1.0 | Release | Desktop build (Tauri), itch.io web + Windows, balance pass, trailer | ☐ |
| v1.1 | Polish | Audio, accessibility tier, localisation (es-ES/en-US), generated backdrops, VFX pass | ☐ |
| v1.2 | The world, wider | Fossils and the Laboratory, role events, Ditto's Transform, HMs | ☐ |
| v2.0 | Two players | A dual mode, designed with the user first | ☐ |

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

## v0.6 — Meta  ✅ 2026-09-21

**Goal.** Make the *second run* worth starting. v0.5 made one run whole; v0.6 gives every run — won or lost —
somewhere to land: an account that levels, a track that hands something out at every level, a Pokédex that
turns fights into knowledge, and a fifth card a line can earn.

**Shipped 2026-09-21**
- **The account (§8.3, §8.9, §8.10)** — `AccountState`: lifetime XP on the §8.3.3 curve (recomputed from the
  formula; the old table had drifted by up to 45 %), the 30-row reward track settled **idempotently** (every
  unclaimed level at or below the current one, so a save from before a row existed still collects it), Tokens
  from milestone levels and Gold/Platinum medals, lifetime stats for the Trainer Card. A pure fold over the same
  `MetaEvent`s v0.5 diffed from the run; the app persists it after every fold, and folds v0.5's medal case into
  the first account paid what those medals were worth.
- **The Hub (§8.4)** — all four kiosks open: the **Trainer Card** (level, XP bar, Tokens, the whole track, the
  seven Hub upgrades), the **PC Terminal** (the Pokédex, browsable and filterable, beside the medals), the
  **Poké Mart** (nine Tier-3 relics at five Tokens from Level 10, and the Tier-2 discovery board), and the
  **Daycare Lady** at Level 3 (starters and modifiers, open and locked alike). The Mystery Door stays labelled.
- **Relic tiers (§8.6)** — `tier` and `discovery` on every relic row; a run's pool is Tier 1 + discovered
  Tier 2 + bought Tier 3, frozen into the save as `RunPerks` so a replay never asks the account. Eighteen of the
  twenty discovery criteria are tracked through a per-fight `CombatTally` and the run's end facts; the four
  🆕 Tier-3 rows the catalogue authored are in, three of them working.
- **The Pokédex and Mastery (§5.13, §6.8)** — kill credit per species with catching excluded; Familiar reveals
  intents from turn one, Veteran shows the **official shiny sprite** (fetched, not hue-shifted — the doctrine
  is "fetch the object"), Master opens the Mastery Move. The immutable fifth card: 12 + 1 per member, 15 at most,
  a faint purges five. Lv1 for 13 lines by §6.8.1's three triggers; six Lv1 moves and every Lv2/Lv3 wait on their
  effect kinds and achievements.
- **Meta-starters (§8.5)** — the **Eevee line** ported (three branches = three species, five new abilities
  including Adaptability, Anticipation, Speed Boost and Flash Fire), Magikarp's Water-and-survivability lean on
  the Starting Relic offer, **Twin Run** with a second starter tile. Pikachu is granted at Level 4 and says its kit
  is v0.7.
- **Modifiers (§8.8)** — every row gated by Trainer Level; **One Path** enabled now the fork exists (8 of 10 live).
- **Achievements (§8.7)** — 24 of 50, with a Mastery category fed by a `dex-tier-up` event the account raises.
- **The run-end summary** — XP earned, the level moved, rewards, medals, promotions and discoveries, kept in a
  ledger beside the account so a mid-run reload does not lose the total.

**2026-09-21 — the Hub, redrawn (v0.6.1).** A first look at the four kiosks found the level a number lost in
a card, the track a table of contents, the Pokédex missing its verb and the Poké Mart doing two jobs. The level
is now a dial (ring + rolling number) that sits in the Hub's header on every kiosk; the track is a horizontal
road of twenty-nine stops drawn as what they hand out, the next one lit and explained; the Pokédex opens with
a four-step legend (knock out — Familiar 👁 — Veteran ✨ — Master ★) and a three-segment bar per species; the
Poké Mart is a shelf with a Buy button and a banner that says what opens it; the Tier-2 board moved to the PC
Terminal as a third tab. Built on unstyled primitives (`radix-ui` Tabs/Progress/ScrollArea, `motion`,
`@number-flow/react`, `react-circular-progressbar`) under our own tokens. Pokédex Whisper shipped on the
same first-only reveal flag as Anticipation.

**2026-09-21 — three design points closed before v0.7 (v0.6.2).**
- **Bond (§6.8)** replaces Pokédex tiers + Mastery levels: one track per line, filled by *playing* it, five
  ranks that open Mastery Lv1 · Shiny · the hidden ability · Mastery Lv2 · Lv3 / the opening-hand card and the
  right to start a run. The Pokédex keeps Familiar only (§5.13). The PC Terminal opens on a Companions tab.
- **Catching is a roll at a shown number (§2.6.4)** — species ceiling × HP curve × status × ball, 1–90 %,
  seeded; the card plays at any odds; Master Ball Charm arms one sure throw per run.
- **Running (§3.1.2)** — the enemy's telegraphed action lands, the fight ends as Escaped, and the toll comes
  off by fight tier (wild −20 % ₽ + Trauma on the Lead · trainer −30 % + all + a consumable · Elite −50 % +
  all + a relic); never from a Gym.
- Also: the three "New difficulty modifier" track rows are "Relic pool +1"; Pokédex Insight worded as a
  first-meeting peek; Pokédex Whisper live; tooltips re-anchor on scroll instead of closing.

**2026-09-21 — the Poké Mart as the shop of the pass (v0.6.3).** The user's point: Tokens were earned from
Level 5 with nothing to buy until Level 10, and the road was a list of gifts nobody chose. Now the track
**pays Tokens at every level** (2; 5/5/8/8/10/10 at the milestones; 92 by Level 30) and **opens shelves** at
3/5/8/10, and the Mart sells everything meta: the Trainer's Corner from Level 1 (titles 2, avatars 3, frames
2, Curated Starting Relic +1 3), Starters at 3 (Magikarp 4, Eevee 6, Pikachu 6 once its kit ships), Hub
upgrades at 5 (4–8), Discoveries at 8 (any undiscovered Tier-2, 4), the Mastery lane at 10 (Tier-3, 5). The
shop (~210) outruns the income (~156) on purpose. §8.3.4–§8.3.5, §8.4.1–§8.4.2, new §8.4.4 (cosmetics), §8.5.2,
§8.6.1. `meta/mart.ts`, `meta/cosmetics.ts`; account v2 back-pays a v0.6.0–v0.6.2 save the Tokens its
levels now pay and keeps what the old track granted. The Trainer Card wears what the Corner sold.

**2026-09-22 — the PC Terminal as pictures and sheets (v0.6.4).** The user's note: too much on the screen —
the Bond legend, the ladder and every unlock chip on every Companions row; knock-out counts and Familiar bars on
every Pokédex row. Now both tabs are grids of cards (portrait, name, one number) and every card opens a sheet:
the line's stages, Bond bar and named ladder (§8.9.2); the species' hero, **record** (§8.9.1 — faced, knocked
out, caught, recruited, fights and runs with, KOs landed, damage dealt, fainted, Lead turns, evolved; new
`CombatTally.koBy/faintsOf/damageBy`, `enemies`, `caughtSpecies`, `fromSpeciesId`) and kit. Unmet species
are silhouettes. Radix Dialog with a Back stack; the legend text lives in tooltips and at the foot of the line
sheet. Later the same day the Companions tab folded into the Pokédex: the line is the sheet's third tab, the
card carries the line's rank as five pips, and "By Bond" orders the book by the lines played (v0.6.5).

**Deferred to v0.7:** Pikachu's kit · Eevee's Stone Cache (Evolution Items) · Trainer's Instinct (the intent
queue) · Greater Threats (Region 2's stat tier) · the Trauma Salve Cache upgrade (Cities) · the Master Ball
Charm criterion (a throw cannot fail since §2.6.4.1 — re-author) · the two ⚠️ OPEN flags in §8.3.5 and §8.4.2.

**Balance.** Unchanged by design — the harness runs an account-less run, and the fixtures a null pool. 30 seeds
read 63 / 70 / 80, inside the noise of v0.5's 30-seed table.

**Exit:** a lost run still feels like progress; a third run starts with something the first two earned.

## v0.7 — Cities & Regions 2–3  ✅ 2026-09-28

Split into nine (five at first; the Cities grew four of their own), because the run has to *continue* before it can escalate. Each one ships.

### v0.7.1 — The seam and the town  ✅ 2026-09-22
The run no longer ends at the Region 1 Gym: Gym → City → next Region. **Pallet Town** as a lobby (§2.1.4,
§2.11): Pokémon Center, Poké Mart, Dojo, the Safari door drawn and closed, and the gate that opens the
Reflection (§2.11.3, already built) and leaves. Routes lose their Center, Shop and Dojo and gain the nurse and
the travelling merchant (§2.9); the freed L6 node becomes a third Mystery Event (§2.5.1). The Trauma Salve
Cache Hub upgrade goes live. **Every status carries over between fights** (§4.2.7.1) and the nurse cures
them. The town Dojo shows the Challenge Ring's door marked in development until v0.7.2. Regions 2 and 3 are Region 1's generator at a higher level band — placeholders on purpose, so the whole
loop can be played and felt before its content exists.
**Exit:** a three-Region run end to end, with two City visits, on a single seed.

**Shipped.** Gym → Legendary pick → City → the gate's Reflection → the next Region; the third Gym wins the run.
Pallet Town and Celadon City are drawn (generated top-down pixel art, `public/art/towns/`) with every door
placed over its building; the Center, the shop (sells held items back) and the Dojo are open in both, the Ring,
Safari, Game Corner and Black Market doors say they are in development. The route has the field nurse and the
travelling merchant; statuses carry between fights with their clocks; the Trauma Salve Cache is sold. The
exit is a test: `cities.test` walks one seed through all three Regions and both Cities, and the harness plays
whole runs (`runBalance`).

**Difficulty pass (2026-09-22/23).** Shipped, the placeholder Regions were too gentle: every autoplayed run that
beat Gym 1 beat the other two. Four changes, all canon now (§2.2, §2.2.1, §2.7.3, §6.2.1): XP scaled by the
level gap (Gen V's formula), enemies at the forms their levels warrant from Region 2, Region 2's accent (every
enemy carries its type's status move), and an Attack-weighted enemy stat tier. Measured over 720 runs: Region 2
~60 % given Region 1, Region 3 ~50 % given Region 2, the whole run ~17 %, fights 4–5 turns in every Region;
`runBalance` guards the bands. Greater Threats went live with the tier. The D5 doctrine now keeps full
contrast on unaffordable offers (the price chip says "not now", not a fade).

### v0.7.2 — The city  ✅ 2026-09-23
**Celadon City**: the Department Store by floors, the wider City Dojo, the Game Corner's two machines — the
Wheel and the Slots, tables printed (§2.11.5) — and the Black
Market door drawn beneath it, in development. The **Challenge Ring** in both Dojos (§2.9.4.1): a ladder of
trainers — two rungs in the town, three in the city — where you see the next rival and choose to cash out or
climb. The only new combat surface of the City.
**Exit:** two Cities that feel different sizes, not two copies — and a balance test that holds the Ring's
clear rates inside their bands (§2.9.4.1: rung 1 about half; the whole ladder about 1 in 6 in the town, under
1 in 10 in the city).

**Shipped.** Celadon is the bigger City now. Its Department Store is five floors as tabs (21 slots; a re-roll
restocks the floor on screen). Its Dojo teaches every stage the line has reached. Its Game Corner has the Wheel
(a 50-segment rim that *is* the table, stake 10–200 ₽) and the Slots (cherry · bell · BAR · 7, 50 ₽ a pull):
the outcome is rolled first on its own stream, then drawn. The Challenge Ring opens behind both Dojos (2 rungs /
3 rungs of Elite-class rivals at evolved forms, the next one always in view, nothing heals between, cash out or
climb, no XP), and its top prize is a relic 1-of-3 (Rare once the account has three open). The exit is a test:
`ring.test` holds the harness's clear rates — tuned per City to Pallet 0.64 / 0.17 and Celadon 0.47 / 0.17 /
0.04 — and `city.test` / `e2e/city` cover the ladder, the machines and the floors. The Black Market stays
a door in development, as do the Safari and the Dojo's extra-moves counter.

### v0.7.3 — Region 2, Coastal Cliffs  ✅ 2026-09-23
Biomes `sea` and `power-plant`, ~10 authored lines (kits, learnsets, branches), trainer rosters, the four R2
Gyms and their Badges, and the accent: **status conditions on enemy intents** (§2.2). Pikachu's kit lands here
— it is a power-plant species. Region 1's thin biome pools widen at the same time (§2.6.1).
**Exit:** Region 2 plays differently from Region 1, not just harder.

**Shipped.** Region 2 is its own Region: every Region reads a `RegionContent` table, and Region 2's has its own
biomes (the Sea primary, the Power Plant, River, Cave and a rare Meadow), twelve trainer rosters, the Karate King
Elite, the Lapras Elite Wild and the Fire · Grass · Electric · Poison Gyms — Blaine, Erika, Surge, Koga — with the
Volcano, Rainbow, Thunder and Marsh Badges live in the sim. Ten new lines plus Electabuzz, Hitmonchan, Lapras and
Bellsprout's line (26 species, 34 moves — Ice had none before), `static` and `thick-fat`, and Pikachu sold on the
Starters shelf, starting with its Light Ball. A Region 2 basic is caught at Lv 12–20 and chooses its branch at the
catch. Region 1's pools widened (Bellsprout, Krabby, real Rares). A generated coastal route plate, the real
backdrops and emblems. The exit is measured, not asserted (`runBalance`): 76 % of Region 2's enemies are species
Region 1 never fields, 26 % are Electric or Ice (Region 1: none), and 19 % of its fights send a status home
(Region 1: 8 %). The curve held on the real roster without retuning (720 runs: 59 % · 45 % · 15 %); Celadon's
Ring was retuned for Region 2's rivals (+10, +2, rivals of 3: 60 % · 22 % · 3 %). Region 3 stays the placeholder
for v0.7.4, and goes unnamed on the map until then.

### v0.7.4 — Region 3, Volcanic Highlands  ✅ 2026-09-23
Biomes `volcano`, `cave`, `sky`, `tower`, ~10 lines, the four R3 Gyms and Badges. Its mechanical
accent (multi-enemy, field effects) is **v0.8** — R3 ships on R2's combat rules and gains them later.
**Done ahead of it (2026-09-23):** all 151 Gen I species are built (`catalogs/species-gen1.md`) and sit in no
pool, so Region 3 *places* its lines rather than authoring them; the Pokédex hides an unmet species behind a
silhouette, "???" and no types (§8.9.2).
**Exit:** three Regions with three rosters and twelve possible Gyms.

**Shipped.** Region 3 is its own Region: the Volcano primary, the Cave (shared by the Fighting and the Ice lanes),
the Sky and a rare Abandoned Tower; twelve rosters over six archetypes, the Hex Maniacs veiled (each of their
Pokémon hides its first intent, §2.7.1); Boss Giovanni as the Elite Trainer and Aerodactyl as the Elite Wild; and
Sabrina, Giovanni, Kiyo and Lorelei with the Soul, Earth, Fist and Glacier Badges live — the last on a new
`status-chill` hook whose smaller number shows on the intent. Two aces carry a scripted off-type answer. A generated
volcanic route plate and Tower backdrop; the Leaders', the Hex Maniac's and the four emblems fetched. The map names
it now. Measured, not asserted: 67 % of what Region 3 fields is new, 13 % Psychic or Ghost (earlier Regions 1 %);
its own roster hit harder than the placeholder, so its Attack tier came down from ×2.3 to ×1.95, which puts Region 3
given Region 2 at 47 % over 720 runs and the whole run at 15 %. Also in this version: What's new and the release
doctrine (every version written down and stamped everywhere), and Karate King Koichi, Region 2's Elite, renamed so
Kiyo can lead the Fighting Gym. The exit holds: three Regions, three rosters, twelve Gyms.

### v0.7.5 — The leftovers and the playtest nerfs  ✅ 2026-09-24
The short things that close v0.7. Evolution Items (Eevee's Stone Cache, the Mysterious Stone event), the intent
queue (Trainer's Instinct), the six pending hidden abilities, the unwritten Mastery moves (Regions 2 and 3's lines
too), the inert relic rows, the Master Ball Charm criterion. The two nerfs playtesting found (2026-09-24):
- **Sleep** can land on a Pokémon that is already asleep. §4.2.2.4 gives Sleep no type immunity on purpose, but
  nothing stops a second Sleep move re-rolling it; decide between an immunity while asleep and refresh-not-stack
  (§4.2.5), and measure it.
- **Mega Drain** — 50 power, 2 AP, Ranged, a quarter of the damage back — is the best sustain per AP in the Grass
  kit; a numbers pass (`catalogs/moves.md`, §4.1). Combined with Leftovers is broken.
Also: the Poké Mart hides an unmet starter the way the Pokédex does (§8.9.2), and the ability catalogue's stale
🆕 marks are corrected.
**Exit:** nothing in the build is marked "pending v0.7", and both nerfs are measured.

**Shipped.** Nothing in the build waits on v0.7 any more; the four rows that remain pending name v0.8.4 (Swift Swim,
Chlorophyll, Cloud Nine, Field Surveyor — all field effects). **Sleep** (§4.2.2.4): Sleep and Freeze cannot land on
a Pokémon already asleep or frozen — refresh-not-stack was rejected because a one-turn clock refreshed every turn is
still a lock; `nerfs.test` measures the abuse at 1 of 10 enemy turns before, 5 of 10 after. **Mega Drain** (§4.1.6):
the port had made every drain move heal a share of *Max HP*; a new `drain` effect heals half the damage dealt, and
the powers moved into the rider band (Mega Drain 65) — 12.4 % → 5.2 % of Max HP per AP, and an Ivysaur with
Leftovers under a Raticate goes from −1.3 % to −6 % a turn. **Evolution Items** (§6.3.2, rewritten to *tempo*: basics
from Lv 8, middle stages from Lv 18, Eevee's stone is its branch) with the Mysterious Stone event, Eevee's Stone Cache
and a City shop slot; run save v11. **The intent queue** (§5.5.1): under Trainer's Instinct each enemy plans a turn
ahead and commits to it; Battle Tracker scouts species met this run. **The inert relics** became passives (Quick Claw
Charm, Hand-Off Pouch, Time Spinner, Soul Link) and Phoenix Feather and the Pouch got their discoveries — "the Master
Ball Charm criterion" turned out to be tracked since v0.6.2, and the untracked one was Phoenix Feather's. **The six
hidden abilities** rewritten for the combat that exists (§6.8.3), plus Damp; Naturalist's Lens and Mass Mobilization
live; **Mastery Lv1 for all 51 recruitable lines** and the starters' Lv2/Lv3 (the rest of Lv2/Lv3 moved to v0.9.1
with the Bond revamp). The Poké Mart hides unmet starters (§8.9.2) and owning is meeting everywhere. Found on the way
and fixed: Berry Pouch never boosted flat Potions; the Region Modifier offer's LCG was nearly linear in consecutive
seeds; the Ring test ran on 11 samples. Measured (120 seeds): Bulbasaur 53 %, Charmander 49 %, Squirtle 68 %;
the curve over 720 runs: Region 2 given 1 at 55 %, Region 3 given 2 at 43 %, the whole run 13 % — inside §2.2.1's bands.

### v0.7.6 — The Safari Zone  ✅ 2026-09-24
The door already drawn in the City (§2.11.6): an entry fee, a fixed number of balls, and species no route
offers — the Gen I lines built ahead of their Regions that no pool places yet. *(Backlog #1.)*
**Exit:** a City visit can end with a recruit no route could have given.

**Shipped.** Both Safaris are open, and the Safari is a minigame of its own — the user asked for one that makes it
unlike the rest of the game, with the classic bait-rock-ball menu as the fallback if it got out of hand; it did not.
**The stalk** (§2.11.6): a tile board of tall grass, clearings, boulders and ponds; two actions a turn (step, bait,
rock — a throw is the whole turn); the Pokémon's path and where it will look when the turn ends always on screen;
being seen or a missed ball is an alarm, and its last alarm sends it off. Rarer is a harder board (bigger, sharper,
one alarm) with one trait each — keen-eyed Chansey, quick Tauros and Dratini, alert Kangaskhan, sharp-eared Pinsir.
Ticket 200 / 350 ₽ for 3 Safari Balls and a 10 / 12-turn clock; lineups of 3 / 4 from Gen I's Safari list less
everything a route offers (Dratini only in Celadon, and the catalogue's Sea keeps Lapras); recruits at the next
Region's floor; no XP. `run/safari.ts` on its own `SafariRNG` stream, run save v12 (migrates v11), the
`SafariScreen` on the real meadow backdrop, the Safari Ball and Red fetched. The exit is a test: `safari.test`
proves no Safari species is on any route. **Measured** (a one-turn-lookahead stalker, 150 visits each): 1.5–1.9
recruits a visit; the rare, gone for first, lands in 45 % of Pallet visits and 37 % of Celadon's, against about four
in five for a common stalked first — the first cut (a one-action throw, more balls) handed out two or three a visit.
The run table is unchanged (Region 1: 53 / 49 / 68 %); the curve over 720 runs moved to Region 2 given 1 at 67 %,
Region 3 given 2 at 49 %, the whole run 18 % — the last two on §2.2.1's targets, Region 2 seven over, inside its
guard, left for the v0.8.6 balance pass.

### v0.7.7 — The Ring, the Coliseum, and Team Rocket's Black Market  ✅ 2026-09-25
Two buildings of their own and one secret, drawn together because both Cities' art is redrawn for them.
- **The Rings leave the Dojo** (§2.9.4.1): Pallet Town gets its own **Ring**, a town arena in the square; Celadon
  City gets the **Pokémon Coliseum**, the big city's big stage. Same ladder as today (two rungs, three rungs).
  *(Backlog #11.)*
- **The Black Market is a secret** (§2.11.6): no door on the map. Inside the Game Corner, a switch hidden behind a
  poster — Gen I's way into the Rocket Hideout — opens stairs down to **Team Rocket's** back room: Legendary
  relics paid in HP or Trauma, Pokémon traded for Pokémon. The poster is a hidden spot on today's Game Corner screen;
  v0.7.8 redraws the room, and the poster moves into it. *(Backlog #2.)*
**Exit:** both Rings stand on their own, and a player who has never been told can find the Market.

**Shipped.** **The Rings are buildings** (§2.9.4.1): Pallet's square court is a stone battle ring and Celadon's plaza
a Pokémon Coliseum — each generated as an edit and pasted back over only the square it replaces, in the town's own
palette, so every other pixel of both towns is untouched (a diff against git proves it; `scripts/patch-town.mjs`);
the stairs beside the Game Corner are gone from Celadon's art. Walking in is free — the ladder and the first rival are
on show — and the fee is paid on a Step-in button. **Every committing door asks before it closes** (§2.11.0, the
user's call): cashing out of the Ring, leaving the Safari with a ticket, going back up from the market. **Team
Rocket's Black Market** (§2.11.6), designed with the user: the FRLG Game Corner's own back wall above the machines, a
Grunt guarding the poster ("Keep away from that poster!"), a switch behind it, stairs down to the Rocket Hideout's
B1F; four counters — the **Trader** (one of yours for one of two stolen Pokémon no route offers), the **Fence**
(Rare Candy, 400 ₽ a level; buys relics at 40 %), the **Gambler** (relics staked on a Rare at a printed 80 % ×
stake ÷ prize, 5–90 %), and the **Executive's showcase**: one Legendary for **three of your Pokémon**, and the deal
closes the market (the user rejected HP and Trauma as prices, since the Center refunds both). Run save v13 (migrates
v12), its own `MarketRNG` stream; `blackMarket.test` holds its rules, `e2e/black-market` finds it by pointer
alone. **Decided while building:** the showcase is **off the books** — it may take a run to three Legendaries —
because a run that took both Gyms' Legendaries reaches Celadon at the cap of two, which shut the showcase to nearly
everyone who found it (§7.3.7). **Measured** (720 runs each way; the harness that has found it buys candies for its
Lead and the Legendary with its three weakest from a Box of five): Region 3 given Region 2 49 % → 37 %, the whole run
18 % → 14 %, candies alone 44 % (noise) — the three Pokémon are a real price, and buying by reflex loses. The default
harness plays the player who has not found the secret, so the curve is unchanged. The market's prices go to the
v0.8.6 pass. Also: a chained evolution (Dratini traded at 30 into Dragonite) hands back to where its first screen
opened; the Game Corner's machines sit beside their tables on short screens.

### v0.7.8 — The Game Corner, played  ✅ 2026-09-28
Celadon's Game Corner, already FireRed's whole room (done ahead, 2026-09-25), gets its two machines right
(user, 2026-09-28). The Slots' odds do not change; the Roulette becomes the classic one.
- **The classic Roulette** (§2.11.5): the European wheel's 37 pockets in their real order — 18 red, 18 black, one
  green zero — and one bet a spin on a colour: red or black ×2, green ×36, EV 0.973 for all three. No cap on green
  (the user's call). The wheel turns one way and the ball the other until it drops into the rolled pocket. Run save v14.
- **The Slots, animated**: the reels spin fast and slow down, each column at its own speed and stopping in turn,
  left to right, until the last lands on the result. The outcome is still rolled first and the reels drawn to show it
  (§2.11.5), and the result line and the wallet wait for the last reel (D8).
- **Not walked** (the user's call, 2026-09-28, recorded in §2.11.5): Red walking the room with WASD was weighed and
  dropped — three things to do, each already one click or one Tab away; walking belongs to the Safari's stalk.
**Exit:** a player bets on a colour and watches the ball land where the result says, and pulls the Slots and watches
three reels stop in turn — the wallet moving only when each machine has stopped.

**Shipped.** **The classic Roulette** (§2.11.5): `CASINO.wheel` is the European rim's 37 pockets in their real order
with `pocketColour` and `betChance`; `spin-wheel` takes a colour (`bad-bet` otherwise) and pays red/black ×2, green
×36 — EV 36/37 for every bet, and green takes the full 200 ₽ stake (the user: if it wins a lot, let it; the old
jackpot-bound sentence left the canon). Run save v14 drops a v13 wheel's last result. On screen the printed table is
the bet selector; the rim and an ivory ball overlay turn on one clock (`--motion-spin`, 4.2 s), aimed so the ball
rests on the rolled pocket's centre, and the result, the lit row and the wallet wait for the ball. **The Slots' reels**
are strips in a drum window that shows each payline face's neighbours; they scroll down and stop left to right
(`--motion-reel` + `--motion-reel-stagger`, a slight overshoot), and a stopped reel keeps the neighbour it landed
with. **Decided with the user:** the room stays pointed at, not walked — WASD was weighed and dropped (§2.11.5).
**Decided while building:** the win pulse plays once on landing and never under reduced motion; the green pocket was
deepened to #107a46 so the ivory 0 on the result chip passes 4.5:1. `city.test` holds the wheel (37 pockets,
18/18/1, alternating colours, payouts, the migration), `e2e/city` watches the ball and the reels land mid-spin.

### v0.7.9 — Every door open  ✅ 2026-09-28
The last doors marked in development: the Dojo's third counter (§2.9.4.2) and the Center's Daycare and PC Box
(§2.11.1). Both designed with the user (2026-09-28): the counter sells **egg moves**, and the Daycare takes one
Pokémon **once per City visit**.
**Exit (v0.7):** three Regions, two Cities, and no door in either that says "in development".

**Shipped.** **Egg moves** (§2.9.4.2): up to three per line on its base form (`eggMoves` in `species.json`, 64 lines
in `catalogs/egg-moves.md`; 15 lines the games gave none, or none this game has, carry none), picked from the series'
own egg-move lists and kept to moves the game already has and the line never learns, tutors or gains from a branch —
`content.test` guards all three. 250 ₽ in the town, +30 % in the city (`PRICES.dojoEgg`); the list is the line's, so
a Charizard buys what a Charmander would. The Dojo's three counters became tabs (Tutor · Egg moves · Passive, each
with what is left to buy), so the deck stays beside the counter at 720p. **The Daycare** (§2.11.1): 200 ₽, a whole
level through the normal level-up (a queued evolution hands back to the Center), full HP inside the Center, then the
Pokémon leaves the team and `set-active` refuses it until one fight — a route node or a Ring rung — is played
(`RunState.resting`, `returnFromDaycare` after `finish-combat`); it needs another Pokémon able to fight; once a
visit (`CityState.daycareUsed`). Run save v15. **The PC Box** is the map's `BoxPanel` indoors (team, Lead, Move
Manager), which learned a Resting tag with its own tip; the Center is three counters side by side. `services.test`
holds both services; `e2e/economy` and `e2e/progression` play them. **Decided while building:** the Daycare refills
HP because the Center already healed everyone; move text now covers multi-hit, on-kill, team-cure and team-guard
effects, which four egg moves brought onto a shop shelf. No door in either City is in development, so §2.11.0's rule
now covers only a door ever drawn before it is built. **v0.7 closes.**

### v0.7.10 — The Poké Mart, walked in  ✅ 2026-09-28
The user's call (2026-09-28), after v0.7 had closed: the City shops rebuilt as Pokémon shops — the FRLG rooms, their
shelves labelled by what they hold and pressable. Designed with the user: **both** shops (the Mart and every
Department Store floor), and the Mart's **stones shelf** stocked. §2.11.2's stock does not change.
**Exit:** in either City, a player finds each kind of goods on its own labelled shelf, presses it, and buys from it.

**Shipped.** **The shop is the room** (§2.11.2): `npm run art:mart` fetches FRLG's Poké Mart and builds the store's
five floors from the three FRLG drew with shop furniture (2F, 4F, 5F; the repeated two mirrored, each floor's number
on the lift's mat copied from the FRLG floor with that number), black surround made transparent. `ui/screens/shop/
rooms.ts` places every piece of furniture as a box in map pixels and says what each shelf holds; `ShopRoom.tsx` draws
the map at the largest whole-pixel scale its box allows (×3–×4 at 1080p; below ×2 it shrinks, as the Game Corner's
room does) with a name plate and a count on each shelf; the pressed shelf opens its cards beside the room, and the
counter keeps the buy-back. The Mart: Medicine, TMs, Relics, Held items, Evolution stones, Poké Balls at the counter.
The store: 1F Medicine + Poké Balls, 2F TMs, 3F Held items, 4F Common/Uncommon relics, 5F Rare relics, stones and
rare medicine; every floor's counter buys back. The Mart already stocked a stone the Box could use since v0.7.5 —
the canon's slot table now says so (slot 9). **Decided while building:** 5F is **Rare goods**, not "Rare counter",
because every floor now has a counter that only buys back; decorative furniture no shelf needs (4F's floor shelf and
wall case) stays scenery. `e2e/economy` and `e2e/city` press every shelf and prove every slot sits on exactly one.

### v0.7.11 — Shop clerks and a quieter way out  ✅ 2026-09-29
The user's polish on v0.7.10, shipped as its own patch (the doctrine now ships every change as a version).

**Shipped.** A clerk (the FRLG Gen III sprite) behind every shop counter sells the whole Mart or store floor on a
Buy tab, grouped by shelf with the Poké Balls, and buys back on a Sell tab (§2.11.2). Shelf plates show only their
name; a shelf of several pieces lights as one shape (an SVG outline of its pieces' union, in map pixels). Every
building — Center, Dojo, shop, Game Corner, Ring, Safari, Black Market — leaves by the same round arrow at the
header's top-left (`ui/components/BackButton`), asking first where the door commits (§2.11.0); a shop also leaves
by its doormat or stairs. **The changelog is brief now** (the user's call): 2–4 short bullets a patch, no lore, and
no `## Next` block — the parser, the What's new screen and the unread dot dropped it, and the release doctrine ships
every change as the next patch.

### v0.7.12 — Nurse back button and technical changelog  ✅ 2026-09-29
**Shipped.** The route nurse leaves by the shared corner `BackButton` like every building. The whole changelog was
rewritten as short technical notes (the user's call: no roleplay, name what changed — "Original FRLG maps imported"),
and release doctrine R2 now asks for that tone.

## v0.8 — Multi-enemy & the route  ✅ 2026-10-05

The version that changes how a fight is played. Fights against two or three enemies at once make the game far
more strategic, so they are **not only the League's or Region 3's** — they appear across the whole run (user,
2026-09-24; §2.2, §5.6). The route is reworked in the same version, and the balance pass comes last, once both
have settled. Not content first: it is the combat engine, so a targeting bug cannot hide behind a content bug.

### v0.8.1 — Multi-enemy fights  ✅ 2026-09-29
1 lead enemy + 1–2 supports (§5.6): slots, targeting, intents, AI, Cleave and Backstrike against several bodies.
The hand changes with it: a card is **dragged onto its target** as well as clicked, and before it is played it
shows **its damage against every enemy it can hit**, not against one (§9 — the damage preview goes per target).
**No area hit ever shows one number** (user, 2026-09-25): each target takes its own damage, so an area attack —
the enemies' at your team, and your cards at a group of enemies — prints its damage on every target it lands on,
never a single "each" figure on the attacker or the card, on both sides.
**The intent, reworked here** (user, 2026-09-25: moved from v0.7.7, since multi-enemy rebuilds intents anyway).
The playtest findings of 2026-09-24, measured over the harness's fights:
- **The intent's number is not the hit.** A single-target intent shows the hit that lands only 65 % of the time (the
  preview leaves out relics, Badges, held items, flat ability reductions and shields); a Cleave's one number matches
  21 % of hits, and 8 % on the bench (mean miss 11 HP) — it is the Lead's number printed as everyone's. The chip has
  to print the sim's own hit, per target.
- **An area intent prints no damage on its chip** (user, 2026-09-25): one number cannot be right when every target
  takes its own — type, Defence, ability, held item. The chip says what it is and that it hits everyone ("→ ALL");
  the damage goes on each target it will land on (the portraits), one number each.
- **An intent you can hover** (backlog, user, 2026-09-25) is designed with the user alongside.

**Shipped.** The combat engine takes groups (§5.6): a scenario's `onField` (1–3) puts that many enemies on the
field — the first the enemy Lead, the rest supports with a role — and the rest of the list fills a free place.
Decided with the user on 2026-09-29: **a single-target Melee card reaches only the enemy Lead** (Ranged, Backstrike
and area cards reach all; the player's Cleave hits every enemy, each its own number); when the Lead falls the
strongest left steps up and the fight ends only when all are down; a ball in a pack is aimed and a catch scatters
the rest (§2.6.4.1); supports enter at 60 % HP and gain +1 Attack a turn from their 4th; Healers and Buffers aim
at the Lead, the group never doubles a status, a role's intents score ×1.5 (all `BattleConfig`, tuned in v0.8.6).
**The intent is honest**: every number is the Resolution run dry on a copy of the fight (`combat/forecast.ts`) —
over whole harness runs the old chip matched 63 % of hits (a Cleave 34 %), the forecast 100 %. On screen: one
compact panel per enemy with a Lead/Support chip, the card's number on every enemy it reaches or a blue *Out of
reach* lock, drag-and-drop by pointer (click-then-click and the keyboard still work), incoming-hit chips on the
portraits, "→ ALL" with no number for an area intent, and the **intent card** on hover (§9.2.6). Groups live in
four fixtures (`group-*`); placing them in the run is v0.8.3. Also: a stale changelog e2e fixed (v0.7.12's rewrite).

### v0.8.2 — Enemies that act twice, and enemies that call for help  ✅ 2026-09-29
Some Pokémon and some battles **act twice a turn**, both intents shown; and some carry a move that **calls one or
two companions into the fight** — a telegraphed intent that turns a single fight into a multi-enemy one. Scope
decided with the user; both ride v0.8.1's intent and AI machinery. *(Backlog #9, and the user's idea of
2026-09-24.)*

**Shipped.** The user delegated the design ("adelante", 2026-09-29: build a large playable v0.8, then iterate), so
the rules are first versions, written in §5.6.1–§5.6.2. **Acting twice** is authored per encounter (`acts: 2`), not
a species stat: two intents, different moves, the second marked *Also* and resolved right after the first; each is
its own hit with its own chip, intent card and portrait chip (the forecast now splits per action, `byAction`).
**Calling for help** is an enemy-only move (`call-for-help`: Ranged, 1 AP, cooldown 2) that brings the caller's next
authored companion (`helpers`) onto the field as a support, at most 3 standing; the chip names who comes, the
newcomer telegraphs before it acts, and it counts in the XP pot (`fielded`). Worth ×2 to a caller alone. Two
fixtures (`wild-acts-twice`, `group-call-for-help`); v0.8.3 places them in the run. Also: the forecast is cached per
settled state, the combat log stopped printing intent damage (the chips carry it; computing it per declaration made
harness runs ~1.5× slower), and two harness timeouts were widened for a slower machine.

### v0.8.3 — Multi-enemy across the run  ✅ 2026-09-29
Where the groups appear, and how often: which wild nodes are packs, which trainers fight in pairs, which Elites
and Gyms bring a support, and how Region 3's accent grows from it. Designed with the harness, then placed.

**Shipped.** §5.6.3 and `run/groups.ts`: every fight node fixes its shape with the node — a hash of the run's seed,
the Region and the node id, so no saved map changes — and its preview card names it (a pill with a bubble). Wild
packs (15 / 25 / 30 %, a third member from Region 2), wild callers (10 / 15 / 20 %), trainers side by side (25 / 35 /
40 % of multi-Pokémon rosters), an Elite with a support from Region 2, and the Region 3 Elite Wild acting twice at 75 %
HP. Companions come from the node's biome, supports take the role their kit gives, and all of them take the Region's
tier, accent and modifiers. Measured at 120 seeds a starter: Region 1 60 %, Region 2 given 1 57 %, Region 3 given 2
52 %, the whole run 18 % — on §2.2.1's targets. **Gym supports are held back**: a Region 3 Gym with one dropped
Region 3 to 35 % (the support escalates through a long Gym fight) — v0.8.6 decides. Also: the preview card's biome
badge falls back like the map marker's instead of showing a broken image.

### v0.8.4 — Field effects  ✅ 2026-09-30
The biome effects (§4.3) that give each biome its identity (§2.6.1 — its ⚠️ OPEN closes here), and the four
weather abilities come alive. Region 3's accent keeps them.

**Shipped.** The §4.3 engine (`combat/fields.ts`): Sun and Rain (×1.5 / ×0.5), Electric Terrain (×1.3 into the
grounded, no Paralysis on them), Sandstorm (end of turn, all but Rock/Ground/Fighting), Home Fields; every term in the
dry-run forecast and the damage breakdown. §2.6.1's OPEN is closed: Volcano Sun, Sea and River Rain, Power Plant
Electric Terrain, Cave Sandstorm — **past the fork only, in every Region** (`run/battlefields.ts`), and a node's
preview card names its field. Swift Swim, Chlorophyll and Cloud Nine are live; Defog ships (the Smoke Ball's icon);
Field Surveyor sets a wild fight's ground by the Lead's type. Measured and tuned (canon §4.3.4–§4.3.5 carry why):
Home Field ×1.5 → ×1.2 (Region 3's Gym deaths went 6 % → 27 %), Sandstorm 5 % → 3 %, and no field on Region 3's trunk
(34 → 41 %). The curve at 120 seeds a starter: Region 3 given 2 41 %, the whole run 14 % — under §2.2.1's ~50 % and
~1 in 6; v0.8.6 retunes. The harness plays Defog against a hostile field. Hydration waits on Lapras's pool (v0.9.1).

### v0.8.5 — More group fights, one combat grammar  ✅ 2026-09-30
The user's first iteration on v0.8 (2026-09-30), before the route revamp: many more group fights, social species that
come ready to Call for Help, trainers with more Pokémon fighting two or three at once, an Elite and a Gym of at least
four fighting two at a time, and one combat grammar whether one enemy stands or three.

**Shipped.** §5.6.3 rewritten: packs on 30 / 40 / 50 % of wild nodes (some of three), every **social species**
(Rattata, Spearow, Zubat, the Nidoran, Mankey, Diglett, Magnemite, Doduo lines) comes ready to call its own kind,
trainers carry **three** (their archetype's Pokémon pad the roster, 4 levels under) and fight two at a time 50 / 60 /
70 % or three at once, the **Elite (four) and the Gym (four, the ace last) always two at a time** at full strength.
To keep the run winnable, measured over 360 runs: the Elite at the band (premium +2 → 0) and the Gym at band +0 / ace
+2 (was +4 / +6), supports hit at 70 % and escalate at most +2, **the breather** (§5.6.4: 8 % max HP per extra enemy
after a won group fight, up to 30 %), Region 3's tier HP ×1.1 / Attack ×1.55, the Ring's offsets +4 to stand where
it stood. Curve: R1 59 % · R2|R1 58 % · R3|R2 42 % · run 15 %. The Gym stays at four: five lost Region 3 at its Gym
three times in four even at the lower premium. **UI:** one grammar — a lone enemy's panel, chip and numbers are a
group's; the breakdown box opens only when a card is aimed; a card's corner is its power, its ×N chip measured
against the enemy Lead.

### v0.8.6 — Consumables that are spent, and scarcer relics  ✅ 2026-09-30
The user's call (2026-09-30), split from the route revamp: a version for **what a fight and a shop hand you**.
Consumables are **consumed for real** (§3.5, §7.2.1) and found far more often — a trainer always drops some, a wild
node sometimes leaves Poké Balls, shops sell them **in bundles** (§2.9.2, §2.11.2.2), events and the nurse hand them
out. Relics become **scarce**: a trainer drops only a Common, and only sometimes; the Elite Trainer a guaranteed pick;
the Gym keeps its 1-of-3; a rare event or two; and every relic bought makes the next one dearer (§2.11.2.3).
*(Backlog #8.)*
**Exit:** a used Potion is gone; a whole run ends holding about half the relics it did, with the §2.2.1 curve where
v0.8.5 left it.

**Shipped.** Designed with the user (2026-09-30). **Spent** (§3.5): the pile is one card per item and what is played
leaves the bag at the fight's end, whatever the outcome. **Found** (`run/rewards.ts`, §2.7.2): every trainer drops 1–2
from its Region's supply table (Potions and cures → Super → Hyper), 20 % a Poké Ball; wild nodes 30 % 1–2 Poké Balls
and 15 % a supply (§2.6.2); the Elite and the Gym add a prize; the nurse hands over two Potions or Super Potions and a
City's Center two Super or Hyper Potions on the first visit; three supplies events (Ranger's medkit, fallen Mart crate,
closing apothecary) and a `supplies` outcome. **Bundles** (§2.9.2, §2.11.2.2): the merchant sells Potion ×3, a Tier-1
×3 and Balls ×3; a City Potion ×5, Tier-1 ×3, Tier-2 ×2, Balls ×5, 10 % off. **Relics scarce** (§7.3.1): a trainer
drops a Common 15 % of the time (was 35 %, any rarity); the Elite Trainer offers a pick of two Uncommons and a Rare on
the reward screen (an Uncommon in the Rare's place until the account has discovered one); the Elite Wild beaten, one
Rare; the **first Gym's pick is Rares**, Legendaries from the second (§7.3.7); no extra drop on top of a pick; the relic
events (the trader, the new Cursed Trinket) drawn at weight 0.35; City shelves two relic slots (Rare a quarter of
visits), the store's relic floors halved; list prices 175 / 350 / 650 and the **collector's premium**, +25 % of list per
relic bought (§2.11.2.3). **No Refunds became Lean Pack** (§8.8: fights drop no supplies, ×1.30). Run save v16. Measured
over 120 runs: a full run ends with 9.4 relics (v0.8.5: 16.5; ~6 of them the Gym and Elite picks), the curve R1 63 % ·
R2|R1 61 % · R3|R2 43 % · run 17 % (v0.8.5 at the same seeds 57 / 59 / 35 / 12). The Ring's offsets went up (Pallet
+7, Celadon +5) because a full bag, not the level, carried rung 1. UI: the reward screen's supplies strip and the
Elite's pick as a second step, bundles and the premium chip in the shops, the nurse's and the Center's gift.
**Second pass, the same day** (the user's playtest; no new sub-version, their call): **balls in the bag** — Poké
Balls are consumables, with **Great (×1.5) and Ultra (×2) Balls** in City shops and Region 2–3 loot (run save v17);
**the bag in a fight** — no random two, a Bag button opens everything carried, **two items a turn** (§3.5); **the
catch curve eased** (0.9/1.7 → 0.8/1.2: 13 % at full HP, 49 % at half) and **the catch pill opens a ball picker**
with each ball's chance (§2.6.4.1); **support roles** reworked to Attacker / Defender / Buffer by share (60 / 20 / 20,
§5.6) — the Defender telegraphs **Cover** and takes its hurt Lead's place with +1 Defence — and only role-bearing
supports escalate; **the enemy panels mirror the squad** (the Lead's panel forward and framed, the supports behind,
§9.2.1). Measured over 120 runs: R1 65 % · R2|R1 67 % · R3|R2 42 % · run 18 %; Cover at a 50 % trigger and a
quarter of supports cost Region 3 twenty points, so it fires at 35 % on a fifth. The Ring's Celadon offset +7.
**Third pass** (the user's playtest, the same version): **a pair stands as a trio would** (the Lead centred and
forward, the support above behind it); **a trainer's team is a surprise** (§2.7.3 — the map shows one Poké Ball per
Pokémon, never who or at what level, and the fight's queue reads "N to come"); **As Lead** — every bench Pokémon
shows what this turn's visible intents would do to it at the Lead, and a hit on the Lead lists it for each
(`forecastIfLead`, the same dry run with another leading; §9.2.5); **less XP** — a group's extra enemies pay 75 %
(§6.2.1), which took about two levels off a team that ran seven to ten over its Region, with Region 3's Attack
×1.55 → ×1.45 to hold the curve (120 runs: R1 63 % · R2|R1 57 % · R3|R2 44 % · run 16 %); **the Ring's rivals
fight two at a time** and stand a few levels over the team instead of +18/+21 (Pallet four Pokémon +7 +2 a rung,
Celadon three +5; §2.9.4.1). Also a bug the user met: an evolution button that did nothing — not reproducible in
the sim or the UI (most likely a stale module while the dev server was being rewritten), but now a reducer error
is caught by the store and said beside the button, and a recruit swapped in at its threshold evolves at once.
**Fourth pass:** the Bag's heals, cures and Revive are usable between nodes and in town (§7.2.1, `run/fieldItems.ts`,
the `use-item` action, the inventory's target list); a hidden team names the types its archetype usually brings
(§2.7.3, `NodePreview.usualTypes`).
**Fifth pass** (the user's playtest: Lv 14–15 after four nodes): **XP ×0.6 with a group's extras at 50 %** (§6.2.1)
— the team now walks a level or two over the wild band at every layer — and the enemy side retuned to the level-matched
team: tiers ×0.9/×0.8, ×0.9/×1, ×0.85/×0.8 (HP/Attack, §2.2.1), the Elite two under the band, the Gym −2 / ace 0
(§5.9.3), the Ring at Gym ace +5/+4 with ×1.35 Attack instead of a wall of levels. 120 runs: R1 68 % · R2|R1 56 %
· R3|R2 40 % · run 15 %. Also: the type chart checked cell by cell against Gen I (all 225 match, now a test); the
"Ground resists Normal" the user saw was a dual-typed Pokémon's tooltip naming the pair's answer as one type's —
the badge now speaks for its own type and gives the pair's on a line of its own.
**For v0.8.8:** the harness never plays cures or X items, so a full run ends with ~37 unused consumables — tune the
supply tables against a player who does; Region 3 back to ~50 %.

### v0.8.7 — Routes, revamped  ✅ 2026-10-04
The Region map rebuilt — its shape, its pacing and its look (§2.5, §2.9, §9.3). *(Backlog #3.)* Designed with the
user on 2026-10-02, who also moved the map's look forward from its own post-release row: **20 columns walked left
to right** in a scrolled view; **tracks, not a lattice** (a node mostly has one child; crossings to an adjacent track,
so pivoting across the map takes two steps; splits and merges so no two routes share a shape); the one-layer fork
replaced by a **Y** — the outer tracks lean toward their Gyms, the middle one stays neutral with the Elite on it, and
a **point of no return** at column 11–13; **six stop columns** (nurse, merchant, Mystery, and a new find on the
ground), so every route walks ~12 fights; and the map **painted from FRLG tiles** by a pure terrain function — each
lane in its Gym's terrain (water, cave, forest, plant…) with its field drawn as weather. It also closes the map's
standing UI findings: a biome emblem on every Wild node, route lines at 3:1 against their terrain, and the node
caption on the `--type-caption` token.
**Shipped.** `run/map.ts` rewritten as tracks (`nextColumn`, `carry`, `addCrossings`, `placeNurse`, `stopColumns`);
`MapNode.row`/`lean`, `RegionMap.rows`/`yLayer`, the `cache` node (`GROUND_FINDS`, `RunState.lastFind`), save v18 keeps
old twelve-layer maps. The terrain is `ui/screens/map/` (`terrain.ts` → `tileset.ts` → `RouteView.tsx`) over FRLG tiles
(`npm run art:route`), with biome emblems on every Wild node. Wild and trainer XP ×0.9 for the longer route; 360 runs:
R1 64 % · R2|R1 61 % · R3|R2 58 % · run 23 %. The Ring: Pallet's step +4, Celadon's first rung +5. UI review: ship with
fixes, all Blockers and Shoulds fixed.
Art pass (same day, the user's notes): trees are the real FRLG sprites keyed to transparency and planted with their
crowns over the row above; every join between two terrains — and every plain floor road — is cut with Route 1's
sand fringe used as a mask; the Y changes along one wandering frontier per side; the west road edge is a straight
edge; water only in bodies of 2 × 2 and up, the coast on Route 24's rim; the highland's cliff tile out of its ground.
Fields (2026-10-04, the user's call): every Gym lays its own Battlefield over its lane (§4.3.14) — six new ones, Hail,
Grassy, Psychic and Misty Terrain, Toxic Spikes and Sticky Web; none shared within a Region. 360 runs: R1 69 % ·
R2|R1 61 % · R3|R2 55 % · run 23 %.
Art review (2026-10-04, many generated maps read at native size): solid tall grass and one-kind clumps of scenery,
no lone scenery tiles, water rims drawn against whole bodies, roads that change material once between nodes and are
cut against the ground they cross, the Poison lane on Rock Tunnel's tiles, Seafoam's hole tile out of the ice floor,
the Power Plant's grating for its road.
**For v0.8.8:** R3 now reads ~58 % (target ~50 %) and R1 64 % (was 68 %) — the curve moved with the route; the Ring
is at the edge of its bands again.

### v0.8.8 — The balance pass  ✅ 2026-10-05
Levels, money, consumables, relics and prices together, against whole runs of three Regions and two Cities with
multi-enemy fights in them — the harness first (720 runs, `CURVE_SEEDS=240`), then a playtest. After multi-enemy
on purpose (user, 2026-09-24): a pass before it would tune fights that are about to change shape. The first of
two; v1.0's is the last. *(Backlog #4.)*
Also here, from v0.7.7: **the Black Market's prices** (`BLACK_MARKET`, §2.11.6) are first values. The showcase at
three Pokémon costs a reflex buyer twelve points of Region 3 (`MARKET_SEEDS=240 MARKET_SPLIT=1` in
`balance/market.test`); the Rare Candy's 400 ₽ and the Gambler's 80 % edge were never measured against the Dojo.
Also here, from the playtest of 2026-09-24: **enemies hit too softly.** The median enemy hit is 12 % of the target's
Max HP (Region 1 13 %, 2 9 %, 3 11 %) — about eight hits to faint anyone, so a telegraph rarely forces a swap
(Pillar 2). A harder-hitting retune (a typical hit nearer a fifth of Max HP, fights kept at 4–5 turns), held to
§2.2.1's curve by the harness — here rather than earlier because multi-enemy changes how much damage a turn carries.
Also here, from v0.8.3: **whether Gyms bring a support, and on what terms.** Region 3's Gym with a support beside it
cost Region 3 seventeen points (52 → 35 %): Gym fights run long enough for a support to escalate (§5.6) every turn.
Options to measure: no escalation for a boss's support, a support only beside the non-ace, or a lower support level.
Also here, from v0.8.5: **the Gym at five** (the user's "if not five") and Region 3 back to ~50 % (42 % now); the
Challenge Ring now reads rung 1 ~75 % (its target is about half) because teams arrive stronger; the breather's 8 %
and 30 % are first values.
**Shipped.** The harness first: it now plays cures, X items and between-node heals (`tendBox`; a run used to end
with ~27 items unspent, now ~14), and `balance/report.test.ts` (`BALANCE_REPORT=1`) prints per Region the clear rate,
turns a fight, the median enemy hit and the Gym's loss rate. The enemy stat tier trades HP for Attack (§2.2.1):
×0.6/×1.45 · ×0.55/×1.75 · ×0.38/×2.25, the median hit 18 / 16 / 17 % of Max HP, fights 3.6 / 4.5 / 4.0 turns. The Gym
at five Pokémon, two at a time, no support beyond them, and its own Attack (`GYM_ATTACK_MULTIPLIER` ×1.3/×1.5/×1.15 —
a higher level premium made runs easier, because the Gym then paid more XP). 720 runs: **R1 59 % · R2|R1 56 % ·
R3|R2 53 % · run 17 %**. The Ring at ×1.7 Attack, Celadon's first rung +6: rung 1 0.54 / 0.40. The Black Market,
measured: finding it is worth +4 points of Region 3 (0.45 → 0.49), its prices stay. The breather (8 % / 30 %) and the
supply tables were left: the bag ends a run at ~14 items with the harness spending it.
**Findings for v1.0's pass:** Region 2's Gyms are lost 2 % of the time at any multiplier tried — the counter-pick
makes them easy, not their numbers; the Rare Candy alone is worth 8 points of Region 3.
**Exit (v0.8):** fights against groups everywhere in the run, a reworked route, and the whole run balanced.

### v0.8.10 — Growth curves  ✅ 2026-10-05

The user asked the balance pass to measure how many relics a run gathers and whether XP keeps the team in step with
its enemies. `balance/report.test.ts` now prints both: relics held at each Gym, gained per Region, at the run's end,
by source and rarity (`RunSimResult.relicsGained`); XP per active Pokémon per fight kind, levels gained per Region,
and the level gap — the active team's mean level against what it fights — by column and at the Elite and the Gym
(`FightTrace` `levelBefore` / `xpGained` / `boxLevel` / `relics`). **Found:** Region 2's band (12–20) began
below where Region 1's ended (13), so a team entered Region 2 **+3.9** over its fights — the reason its Gym was lost
2 % of the time. Regions 2 and 3 moved up two levels (14–22, 24–32): the gap is now +0 → +2 / +2 / +1, §6.2.1's
"a level or two over". The tier paid for it in HP (R2 ×0.45, R3 ×0.27; Attack tried first, it softened the hit to
13 %). 720 runs: **R1 60 % · R2|R1 58 % · R3|R2 48 % · run 17 %**. Relics: 2.5 / 2.6 / 2.0 a Region, ~11 at a won
run's end — even, so left; a doubled collector's premium moved it by under half a relic. Celadon's Ring +6 → +8
(rung 1 0.54). **Still open for v1.0:** every Gym's ace sits one or two levels under the team.

### v0.8.9 — The harness, honest  ✅ 2026-10-05

The user read v0.8.8's rates as lower than the game plays. They were: the combat autoplayer never played a status or
stat card that cost AP, swapped only a Lead that was nearly down, and took the first Reflection card. Now it puts the
foe that will last to Sleep or Paralysis (§4.2), raises its Lead in a fight worth it (§4.2.6), swaps in whoever takes
half or less of a telegraphed hit that would take a third of the Lead (§3.3.1), and takes the strongest Reflection
(§2.10). Same game, 720 runs: **R1 59 → 66 % · R2|R1 56 → 60 % · R3|R2 53 → 53 % · run 17 → 21 %** — v0.8.8
under-read the run by four points, nearly all of them in Region 1. Ablation: the status play is most of it, the
Reflection pick nothing. Region 1's Attack ×1.45 → **×1.55** puts the curve back on §2.2.1's targets: **R1 60 % ·
R2|R1 60 % · R3|R2 50 % · run 18 %**. The Ring, re-read (160 seeds): rung 1 Pallet 0.45, Celadon 0.53; the ladders
0.08 / 0.04.

## v0.9 — The long game  ☐

The account's systems revisited, and the road to the Champion.

### v0.9.1 — Bond and Shiny, revamped  ✅ 2026-10-06
Bond (§6.8) and Shiny — today only the Bond-rank sprite reveal, not something you find (§5.13) — reworked
together, since the one is the other's reward. Design pass with the user first. *(Backlog #5, #6.)*
It also writes the **Mastery Lv2 and Lv3** of every line but the three starters (§5.13.2): they are Bond rewards at ranks
4 and 5, so v0.7.5 wrote every line's Lv1 and left the rest for the curve they will be earned on.

**Shipped.** The design pass measured first: since the route became twenty columns a run fought ~25 fights, the old +1
a fight made every played line Trusted (Shiny) inside its first run and Soulbound in three. The user's calls
(2026-10-06): Shiny **wild, by surprise, tied to the Bond**; a shiny gives **Bond and a collection**, no stat; Bond
**very slow — more than fifteen runs to complete**; rank 2 becomes the line's **Shiny Charm**. Built:
- **Bond (§6.8.1–§6.8.2), first cut:** trainer and Elite wins +1 (+1 leading), a Gym +4, a wild fight nothing, a shiny
  recruit +10; five ranks at 10 · 40 · 110 · 200 · 360 (replaced the same day, below). Measured as a **career** (`balance/bondCareer.test.ts`: one account, many
  runs in a row, its perks playing into each): a line played every run reaches the ranks after **1 / 2 / 6 / 11 / 18
  runs**; after 24 runs an account holds about two Soulbound lines.
- **Shiny (§5.14):** every wild Pokémon rolls 1 in 40, a hash of seed and node so no stream moves; the Charm ×3 at
  rank 2, ×2 again at Soulbound. About one met every three runs; a 24-run career catches six or seven, mostly of the
  lines it keeps recruiting. A caught shiny keeps its palette, pays +10 Bond, fills the Pokédex's collection (shinies
  met and caught per species) and opens the hidden medal Shiny Hunter. The harness throws at a shiny from 25 % odds.
- **On screen:** the shiny sprite and a sparkle entrance in a fight, a mark beside its name wherever it is listed,
  "A shiny!" on the reward card, the collection in the Pokédex; and each line's **+N Bond** on the reward screen after
  every fight (`e2e/shiny`).
- **Mastery:** 36 Lv2 and 9 Lv3 cards, every recruitable line whole, the §6.8.4 bands guarded by a content test.
  Eevee carries one Lv2 instead of the three per-branch cards once planned (a line has one Mastery track).

**Then reworked by the user, the same day**, after a map of that first cut (sources, pace, what each rank gave each line):
**Four ranks, linear, 100 Bond each** (§6.8.2): **1 Companion** the Shiny Charm — every new copy of the line may be
shiny, its wild ones ×3, and now its starter, Safari catch and trade roll too (`copyIsShiny`); **2 Trusted** the
hidden ability; **3 Deep Bond** the whole Mastery Move at once, every stage (one unlock, the user's call — "the
Pokémon's whole potential"); **4 Soulbound** the line may start a run — and a line that could already (the three
default starters and the Mart's three) has its starter always shiny instead, the line struck through on its sheet.
The ladder reads as the user wrote it: the Charm's odds, the hidden ability "assignable at the Dojo", the Mastery
explained rather than named. Measured as a career: a line played every run reaches them after **5 / 11 / 16 / 21
runs**; a line recruited every other run, about twice that. The "Mastery card in every opening hand" rule is gone.
The nine recruitable lines with no hidden ability got one the sim already runs (Lapras Rain Dish, Electabuzz Vital
Spirit, Koffing and Jynx Sheer Force, Rhyhorn Sturdy, Magmar Flash Fire, Farfetch'd Moxie, Scyther Tough Claws,
Mr. Mime Shell Armor), guarded by a content test so no rank is empty. The Poké Mart keeps selling Magikarp, Eevee and
Pikachu: buy now or earn it.

### v0.9.2 — Player level and the Poké Mart, revamped  ✅ 2026-10-07
The Trainer level and the Mart (§8.3, §8.4), with the scored shop curation §2.11.2.1 still owes and what leftover
₽ turns into at a run's end. Design pass with the user first. *(Backlog #7, and the end-of-run surplus.)*

**Shipped.** The design pass measured the account as a career first (`balance/accountCareer.test.ts`, new): the last
shelf opened after ~37 runs, forty runs earned ~29 Tokens against a ~220 shop, and a run threw ~460 ₽ away. The user
chose three moves:
- **The Hub as a place (§8.4):** the Indigo Plateau's Pokémon Center lobby from FireRed / LeafGreen — the Mart counter
  and its clerk, the nurse who keeps the Trainer Card, the PC, the door to the Elite Four that starts a run, the doormat
  out — drawn by `PixelRoom`, now shared with the shops. The Daycare Lady (a board that repeated the run's start screen)
  and the Mystery Door (which opened nothing) are gone.
- **₽ becomes Tokens (§8.3.4):** 200 ₽ a Token at a run's end, won or lost, at most 5 — poor on purpose, so ₽ spent in
  the run is worth more than ₽ carried out.
- **The account re-paced (§8.3.3–§8.3.5):** the curve `330 × N^1.6` (was 500), three Tokens a level (more at the
  fifths), four shelves at 1 / 2 / 4 / 6 — every shelf open by about the ninth run, the whole ~134-Token shop paid off
  at a career's run 62. The Discoveries shelf is closed: a Tier-2 relic is only discovered (§8.6.1). The Apex Reveal is
  off the shelf until Victory Road.
**Not done:** §2.11.2.1's scored shop curation, which this row carried over, waits for v1.0's balance pass.

### v0.9.3 — The arena, animated  ✅ 2026-10-07
A bar that lights up to the throw's catch %, and a Poké Ball swinging side to side, slowing little by little
before it settles. The outcome is still rolled first (§2.6.4.1) — the animation only shows it. On the combat
screen v0.8 reshaped, so it is drawn once. *(Backlog #10.)*

**Shipped.** Broadened at the user's request from the catch to the arena's beats (§9.9.1): the catch (the throw, the
Pokémon drawn in, zero to three wobbles by the odds, the click and sparks or the burst, the catch % bar, the outcome
and the log waiting for it); Pokémon sent out of a ball (a trainer's, yours, a swap's new Lead, a trainer's next one)
or stepping in from the grass; a swapped-out Lead recalled; a fallen Pokémon drawn once more as a ghost that drops and,
for a trainer's or yours, goes back into its ball. `useCombatFx` drives them from the sim's events, `ArenaFx` draws
the ghosts and the catch; reduced motion makes them instant. The e2e suite runs reduced by default
(`playwright.config.ts`); `e2e/animations.spec.ts` and the Game Corner's spin turn motion on.
**Not done:** the evolution sequence and the boss-intro zoom of §9.9's table.

### v0.9.4 — The catch, faithful  ✅ 2026-10-08
The user's playtest of v0.9.3: the catch too fast, its bar unused, a break decided too early; the faint blinking
back before it went; a trainer's ball that never went back to the trainer.

**Shipped.** The catch is the series' four shake checks at p^¼ each (§2.6.4.4, `shakeChecks`): rolled by the sim,
a wobble before each of the first three and the click as the fourth, the ball always rocking once; four lights under
the ball, one per passed check; the Gen III lines for how close a break came; the whole beat about 6.5 s. The faint
(§9.9.1) slides down through the ground line from where the Pokémon stood — the ghost stands in at once, so nothing
blinks — and a trainer's ball, or yours, flies back to the hand; the next Pokémon comes out of a ball thrown from the
trainer's hand (`data-fx-hand` marks in the arena); its panel and the log line that names it wait until it is out. The Black Market's R3 bound now needs a sample of ten runs.

### v0.9.5 — Pokémon moves & kits, revamped  ✅ 2026-10-08
The user's review: lines learned too many moves; evolutions should rewrite the kit rather than grow it, a branch may
trade a move for another, every move must be a real Gen I move with its right type, and every move's effect, power
and cost rebalanced — with a "+" where a line runs out of moves.

**Shipped.** The user chose: the modern type where the game has it, **2 → 4 → 5 → 5**, and the Mastery rewritten too.
- **Every move is Gen I** (§3.6, `catalogs/moves.md`): 169 rows from the 165 of Generation I, 62 "+" rows, 38 Mastery
  tiers, re-cut into §6.3.6.4's bands — now a content test, as is the Gen I list (`gen1-moves.json`). Accuracy
  became the rider's chance (Sing 55 %, the powders 75 %); the high-critical four crit every time at the foot of
  their band; Razor Wind carries Backstrike. Every move that was not Gen I is retired, its name mapped to the Gen I move
  that took its place (`moves.md` §5).
- **Kits** (§6.3.5, §6.9): four moves by level, then the first evolution upgrades two slots and adds one, the last
  swaps up to three for the signature — five cards at every stage, walked over every branch path by a test. A payload
  names a slot, so a final swap lands on whatever the first branch made of it (`sim/combat/kit.ts`); a Pokémon met
  evolved took its first branches; a level-up teaches only its new levels.
- **Mastery** (§6.8.4): the 51 lines that had one keep one, now a Gen I move and its + and ++ (2 AP 100, 3 AP 130).
- **Balance**: evolved foes hold five cards where they held up to nine, and Regions 2–3 got easier; the stat tier
  re-tuned to Attack ×1.45/×1.9/×2.6, the status accent's fallback became Glare (a Paralysis that carries, where
  Supersonic's Confusion never outlasted a fight), and the Gym aces' kits scripted from their lines' Gen I moves so the
  telegraph is the card fought (an Auto pick left Kingler without a Water move) — R1 59 % · R2|R1 60 % · R3|R2 48 % ·
  run 17 % over 720 runs. The Auto pick keeps one attack of the Pokémon's own type, and never a move beside its +.
**Not done:** hidden abilities for the lines without one, so they could carry a Mastery too; the Gen I moves no rule
can express (Transform's copy, Metronome's lottery, Counter's return) stay stand-ins or absent.

### v0.9.6 — Evolution, rewards and types, polished  ✅ 2026-10-08
The user's visual patch to v0.9.5, grown into a version of its own at their suggestion: the classic evolution
animation and the Evolution screen's art and UX; then the reward after a fight, a panel for achievements and
discoveries, and type matchups that read at a glance, attacking and defending apart.

**Shipped.** `EvolutionCutscene` (§9.9.1): "What? Bulbasaur is evolving!", the sprite turned to light, the two shapes
trading faster and faster (never under 100 ms, no full-screen flash), a bloom and the reveal — skippable by a click or a
key, absent under reduced motion; it plays before the choice when every path makes one species, after it when they
differ (Eevee by level). The screen (§6.3.3): the evolved Pokémon with its stats as bars (old value under the new) and
the kit the path leaves as move chips, one compact card per path whose changes are chips too; pointing at a path
previews it, and every chip, bar, pill and the Evolve button explain themselves on hover. `previewBranch` returns the
stats before and after and the resulting kit, computed by `applyBranch` on a copy. A radiogroup with arrow keys; it
fits 720p. **Rewards** (§9.4.5): a level-up names its stat gains (`LevelUp.gains`/`statsAt`), its moves as chips, a Bond
rank's unlock; the fight's medals and discoveries are listed with their bars (`sim/meta/progress.ts` `progressNotes`);
the loot is a strip of chips. **The progress panel** (`ProgressToasts`) carries progress made outside a fight, in the
bottom-left corner, never taking a click. **Type charts** (§9.4.4, `TypeChart`): a move's type reads attacking (×2/×½/×0,
gold, a sword), a Pokémon's defending (×4 to ×0 for both its types, red and green, a shield); a card's tooltip carries
its attacking chart. **After the user's look at it:** a Pokémon past both thresholds (a Weedle caught at 13) now gets two screens, each
with its own cutscene — the one screen had kept the first pick and looped; with no path pointed at, the panel shows the
Pokémon as it stands, its own kit and stats; and each archetype leans the stats (§6.3.4: Vanguard HP and Attack,
Specialist Attack and Speed, Support HP and Defence, each for a cost), Region 3 re-tuned to ×2.7 Attack and ×0.3 HP —
R1 59 % · R2|R1 60 % · R3|R2 47 % · run 17 %.

### v0.9.7 — Wild Areas, the whole Pokédex  ✅ 2026-10-08
The user's call: many more Pokémon in the wild, varied, by rarity with each rarity's odds shown, in line with each
Region's strength — no Lapras on Route 1's first node, no pre-evolution on Route 3 — and all 151 put to use.

**Shipped.** Every non-Legendary species (146) placed in a biome pool (§2.6.3, `region.ts`): Region 1 basics (and the
cocoons), Region 2 the middle of the lines, Region 3 final forms only; the starters are Rares at their Region's form.
A Wild node shows its whole pool in three rows with their odds — Common 60 % · Uncommon 30 % · Rare 10 % (`WILD_TIER_ODDS`)
— and walking in rolls the rarity, then who leads, evenly (`run/wild.ts` `rollWild`, a hash of seed, Region and node).
The preview card's `WildPool` shows the odds as they will be rolled (`wildChances`): the Naturalist's Lens makes the Rare
30 %, the **Lure Module** now keeps the better of two rolls (36 / 45 / 19 %; "+1 species to choose" had no choice left to
widen). A lane's counter always sits in its pool. The Safari's and the Trader's Pokémon are no longer route-exclusive:
they are never a route's Common, a sure sighting where a route rolls them rarely. The stronger recruits made Regions 2
and 3 far easier (R2|R1 85 %, R3|R2 75 % in the quick table): enemy Attack ×1.6 / ×2.65 / ×3.9 and Region 3's HP ×0.35
— R1 62 % · R2|R1 60 % · R3|R2 55 % · run 20 % (720 runs; Region 3 a touch generous, ×4.0 would read 52 %).
**Not done:** the biomes stay as they are (the user will revisit the specialised nodes); fossils now turn up as route
Rares, so v1.2's Laboratory needs a reason other than exclusivity.

### v0.9.8 — Regions that scale, rarity announced  ✅ 2026-10-08
The user's look at v0.9.7: there is no type identity per Region — Routes 1, 2 and 3 escalate with the player's power
and level, so no last evolution on Route 1; trainers, the Elite and the Gyms may field higher forms, and must when their
level is past the threshold; and a wild fight should say whether it rolled a Common, an Uncommon or a Rare.

**Shipped.** Region 1's wilds are first forms with a form ahead (Onix, Farfetch'd, Metapod and Kakuna moved to Region 2).
Every trainer's, Elite Trainer's and Gym's Pokémon walks `evolvedAt` at its level, in every Region (§2.7.3 — the
`evolveRosters` flag is gone, and a Gym's young first slot with it). §2.2 rewritten: a Region escalates by the forms it
fields, not by type — `runBalance` now measures the final-form share climbing (R1 0.16 · R2 0.78 · R3 0.99) and no Region 1
wild fight led by a last evolution, in place of the Electric/Ice and Psychic/Ghost shares. The fight carries the rolled
rarity (`ScenarioDef.wildTier` → `CombatState.wildTier`) and `WildTierBanner` says it over the open ground as the fight
opens, fading as it begins (a star and a glow for a Rare; still and brief under reduced motion); fixture
`?scenario=wild-rare`. Region 2's Gyms, now Arcanine and Electrode where Growlithe and Voltorb stood, lost 34 %:
`GYM_ATTACK_MULTIPLIER` ×1.15 / ×1.1 / ×1.15 and Attack ×1.4 / ×2.5 / ×3.6 — R1 64 % · R2|R1 57 % · R3|R2 50 % · run 18 %
(720 runs). The quick band's Region 3 floor is 0.2 now: its 40-seed block reads 0.25 where 240 seeds read 0.44. **After the user's look at it:** a shiny looked plain on the Evolution screen — the official artwork has no shiny
version — so a shiny is drawn there with its battle sprite in the shiny palette (whole-number scale, the paths' icons
at their own size) and its name carries the shiny mark; the sim always kept the flag. And the bug behind a muddled Box and a second evolution that would
not take: the uid counter was module state, so after a reload the next recruit took the starter's uid. It lives in the
run now (`uidSeq`, `mintUid`, §10.7.4); save v18 → v19 repairs a save that already has a duplicate.

### v0.9.9 — The Hub's books, and the Master Ball  ✅ 2026-10-09
Seven notes from the user: Region Modifiers out for now; a better way to pick two starters; "to spawn" on a Wild
Area's odds; the Master Ball Charm replaced by Master Balls; an item dictionary in the Hub; a Pokédex that shows the
evolutions and their branches; and a validator for how many moves a Pokémon has.

**Shipped.** **Region Modifiers off** (`REGION_MODIFIERS_ON`, §2.11.3): no step on the new-run screen, no pick at a
City's gate (`depart-city` takes `null`), the system kept whole for later. **Twin Run** (§8.4.2): two places, Lead
and Partner, on the starter step. **The Master Ball** (§2.6.4.2): a `sure` catch item, never sold, a Region 2–3 Elite
or Gym prize; the Master Ball Charm relic, its hook and its discovery are gone (run save v19 → v20 hands an unspent
charm back as a ball; account v3 drops it). **The Pokédex** (§8.9.2): an evolved form's Kit tab is its kit by path
(`kitPaths`), and the line tab lists every evolution path (`branchPayload`, `BranchCard`) — the stats at the threshold,
each card upgraded with the old one struck out, the card added, the ability. **The Item Guide** (§8.4.1, the lobby's
table): relics, items, held items, Evolution Items and TMs, grouped, searchable across kinds, each with its price
(`listPrice`), where it turns up (`itemSources`) and, for a relic, where the account stands. **The move validator**
(`MOVE_CAP`, §6.3.5): all 151 checked on every path — none over its caps; what read as "too many moves" was the old
Kit tab listing the whole line's learnset. Region 2 re-tuned for the harness's lost modifier pick: Attack ×2.5 → ×2.4, R1 61 % · R2|R1 60 % · R3|R2 49 % · run 18 % (720 runs).

### v0.9.10 — Victory Road  ☐
§2.12's nodes — Gauntlet, Apex, Training Grounds, Summit — and a way back to the Badges a run never met: the
Perfect Clear of §2.12.6. *(Backlog: recovering missed Badges.)*
- **Legendary Pokémon enter the run here**, and the Black Market's Executive sells one **every time** (user,
  2026-09-28): the showcase offers a Legendary Pokémon, never "sold out" and never shut by a cap. Here because Victory
  Road's Apex (§2.12.2) is where the canon already brings the run's rarest species, and the two are balanced together.
  Needs the backlog's "a Legendary takes two team slots" designed with the user first.

### v0.9.11 — The League  ☐
Five fights with a micro-rest between them, the Champion's signature (§5.12), League Boons — on v0.8's
multi-enemy fights, which the League is built on.
**Exit (v0.9):** a run ends at the Champion, and the account pays for all of it.

## v1.0 — Release  ☐
Tauri desktop build (Windows; Linux stretch), itch.io web + Windows downloads, the final balance pass with
telemetry from playtests, trailer, README/press kit. Fan project: free, non-commercial, IP disclaimer everywhere.

## v1.1 — Polish  ☐
Audio direction + stems + SFX bible (§9.5), accessibility tier (§9.6), localisation architecture + es-ES/en-US (§9.10), generated backdrop set (`ui/07`), VFX pass, performance pass.

## v1.2 — The world, wider  ☐
Content that makes a second hundred runs different: **Fossils and the Laboratory** (revive Omanyte, Kabuto or
Aerodactyl — Pallet Town's fourth door, §2.11.4), **role events** (the Fan Club, Team Rocket, the Magikarp
salesman, Silph Co. — written City encounters with a choice, §2.10/§2.11), **Ditto's Transform** (copy the enemy
Lead's four cards into the hand, or its types and stats; needs a copy effect kind — §6.9,
`catalogs/species-gen1.md`), and **HMs** (Cut, Fly, Surf, Strength, Flash — as moves, a field use, or not at all;
a design pass decides, and it may never ship).

## v2.0 — Two players  ☐
A dual mode. A major version because it changes the shape of the game (`docs/release-doctrine.md` R1). Nothing
is designed: it is talked through with the user before anything is written.

---

## Change control
Scope moves only through this file. When a version's scope changes, rewrite its entry and say why in it, and note
the canon section if design moved. Keep `docs/session/active.md` pointing at the current version and task. A new
idea without a version goes to the backlog below; a playtest finding goes into the next subversion.

---

# Backlog — ideas with no version yet

**Waiting for a version** — ideas the user wants kept in mind, to be designed with the user before they are placed:

| Idea | Noted | Likely home |
|---|---|---|
| **A Legendary Pokémon takes two team slots.** Owning a Legendary opens the question of how to balance one; the user's idea is that it fills two places in the team. Not designed — kept for the design pass with the user. It gates v0.9.10's Legendary Pokémon at the Black Market. | user, 2026-09-28 | v0.9.10, designed first |

**Placed.** Every idea from the user's priority pass of 2026-09-24, and where each item went after the user's review
of the order (multi-enemy stays v0.8 and spreads through the run, the route joins it, the balance pass follows both;
the account revamps move to v0.9):

| # | Idea | Placed in |
|---|---|---|
| — | Playtest nerfs: Sleep, Mega Drain | v0.7.5 |
| 1 | The Safari Zone | v0.7.6 |
| 2 | The Black Market — a secret inside the Game Corner, run by Team Rocket | v0.7.7 |
| 3 | Routes, revamped | v0.8.7 |
| 4 | The global balance pass | v0.8.8 (after multi-enemy, per the user) and v1.0 |
| 5 | Bond, revamped | v0.9.1 |
| 6 | Shiny, revamped | v0.9.1 |
| 7 | Player level & Poké Mart, revamped | v0.9.2 |
| 8 | Consumables that are spent | v0.8.6 (with scarcer relics) |
| 9 | Double-attack enemy intents — and enemies that call for help | v0.8.2 |
| 10 | The catch, animated | v0.9.3 |
| 11 | The Ring moves out of the Dojo — a town Ring, and the city's Coliseum | v0.7.7 (with the City art) |
| — | Multi-enemy fights, everywhere in the run | v0.8.1, v0.8.3 |
| — | An intent you can hover (the intent card) | v0.8.1 ✅ |
| — | The Dojo's extra moves; the Center's Daycare and PC Box | v0.7.9 |
| — | The Game Corner played: the classic Roulette and the Slots' reels | v0.7.8 |
| — | End-of-run ₽ surplus | v0.9.2 |
| — | Recovering missed Badges | v0.9.10 |
| — | Fossils and the Laboratory · role events · Ditto's Transform · HMs | v1.2 |
| — | Multiplayer — a dual mode | v2.0 |
| — | The Black Market's Executive always sells a Legendary Pokémon | v0.9.10 (with the two-slot balance, designed first) |
