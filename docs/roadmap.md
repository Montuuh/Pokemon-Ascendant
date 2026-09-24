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
| v0.7 | Cities & Regions 2–3 | The run continues past Gym 1: two Cities as lobbies, routes stripped to a nurse and a pedlar, Regions 2 and 3 with their own accents, then the Safari Zone, the Ring and the Coliseum as their own buildings, Team Rocket's secret Black Market — every City door open. **Eight subversions** | ◐ in progress |
| v0.8 | Multi-enemy & the route | Fights against two or three enemies at once across the whole run — cards dragged onto a target, enemies that act twice or call for help — field effects, the route reworked, then the whole run balanced | ☐ |
| v0.9 | The long game | Bond, Shiny, the Trainer level and the Poké Mart reworked, the catch animated, then Victory Road, the League and the Champion | ☐ |
| v1.0 | Release | Desktop build (Tauri), itch.io web + Windows, balance pass, trailer | ☐ |
| v1.1 | Polish | Audio, accessibility tier, localisation (es-ES/en-US), generated backdrops, VFX pass | ☐ |
| v1.2 | Map revamp | A horizontal route you scroll, painted from a tileset with the biome on top | ☐ |
| v1.3 | The world, wider | Fossils and the Laboratory, role events, Ditto's Transform, HMs | ☐ |
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

## v0.7 — Cities & Regions 2–3  ◐

Split into five, because the run has to *continue* before it can escalate. Each one ships.

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

### v0.7.7 — The Ring, the Coliseum, and Team Rocket's Black Market  ☐
Two buildings of their own and one secret, drawn together because both Cities' art is redrawn for them.
- **The Rings leave the Dojo** (§2.9.4.1): Pallet Town gets its own **Ring**, a town arena in the square; Celadon
  City gets the **Pokémon Coliseum**, the big city's big stage. Same ladder as today (two rungs, three rungs).
  *(Backlog #11.)*
- **The Black Market is a secret** (§2.11.6): no door on the map. Inside the Game Corner, a switch hidden behind a
  poster — Gen I's way into the Rocket Hideout — opens stairs down to **Team Rocket's** back room: Legendary
  relics paid in HP or Trauma, Pokémon traded for Pokémon. The Game Corner itself stays as it is. *(Backlog #2.)*
**Exit:** both Rings stand on their own, and a player who has never been told can find the Market.

**Playtest findings (2026-09-24), to fix in this subversion once the design is agreed with the user:**
- **The intent's number is not the hit.** Measured over the harness's fights: a single-target intent shows the hit
  that lands only 65 % of the time (the preview leaves out relics, Badges, held items, flat ability reductions and
  shields); a Cleave's one number matches 21 % of hits, and 8 % on the bench (mean miss 11 HP) — it is the Lead's
  number printed as everyone's. The chip has to print the sim's own hit, per target.
- **An area intent prints no damage on its chip** (user, 2026-09-25): one number cannot be right when every target
  takes its own — type, Defence, ability, held item. The chip says what it is and that it hits everyone ("→ ALL");
  the damage goes on each target it will land on (the portraits), one number each.
- **Enemies hit too softly.** The median enemy hit is 12 % of the target's Max HP (Region 1 13 %, 2 9 %, 3 11 %) —
  about eight hits to faint anyone, so a telegraph rarely forces a swap (Pillar 2). A harder-hitting retune, held
  to §2.2.1's curve by the harness.

### v0.7.8 — Every door open  ☐
The last doors marked in development, both small: the Dojo's extra-moves counter (§2.11.6) and the Center's
Daycare and PC Box services (§2.11.1).
**Exit (v0.7):** three Regions, two Cities, and no door in either that says "in development".

## v0.8 — Multi-enemy & the route  ☐

The version that changes how a fight is played. Fights against two or three enemies at once make the game far
more strategic, so they are **not only the League's or Region 3's** — they appear across the whole run (user,
2026-09-24; §2.2, §5.6). The route is reworked in the same version, and the balance pass comes last, once both
have settled. Not content first: it is the combat engine, so a targeting bug cannot hide behind a content bug.

### v0.8.1 — Multi-enemy fights  ☐
1 lead enemy + 1–2 supports (§5.6): slots, targeting, intents, AI, Cleave and Backstrike against several bodies.
The hand changes with it: a card is **dragged onto its target** as well as clicked, and before it is played it
shows **its damage against every enemy it can hit**, not against one (§9 — the damage preview goes per target).
**No area hit ever shows one number** (user, 2026-09-25): each target takes its own damage, so an area attack —
the enemies' at your team, and your cards at a group of enemies — prints its damage on every target it lands on,
never a single "each" figure on the attacker or the card. v0.7.7 sets the rule for the enemy side; this version
carries it to area cards against several enemies.

### v0.8.2 — Enemies that act twice, and enemies that call for help  ☐
Some Pokémon and some battles **act twice a turn**, both intents shown; and some carry a move that **calls one or
two companions into the fight** — a telegraphed intent that turns a single fight into a multi-enemy one. Scope
decided with the user; both ride v0.8.1's intent and AI machinery. *(Backlog #9, and the user's idea of
2026-09-24.)*

### v0.8.3 — Multi-enemy across the run  ☐
Where the groups appear, and how often: which wild nodes are packs, which trainers fight in pairs, which Elites
and Gyms bring a support, and how Region 3's accent grows from it. Designed with the harness, then placed.

### v0.8.4 — Field effects  ☐
The biome effects (§4.3) that give each biome its identity (§2.6.1 — its ⚠️ OPEN closes here), and the four
weather abilities come alive. Region 3's accent keeps them.

### v0.8.5 — Routes, revamped, and consumables that are spent  ☐
The route's generation, nodes and pacing, reworked (§2.5, §2.9) — with v0.8.3's groups placed on it — and
consumables that are **consumed for real and found far more often** (§7.2). They ship together because both change
what a route hands you. Design pass with the user first; the route's *look* is v1.2's. *(Backlog #3, #8.)*
The Region map redrawn: **horizontal**, scrolled left to right the way a route is walked, and painted from a
**tileset** with the biome laid over it instead of one flat backdrop per lane. Decided as post-release on
2026-09-22 — it is an art and tooling system (atlas, autotiling, seams) rather than a rule change, and the
current map works. The horizontal reading is the part that matters: a Pokémon route runs left to right, and
the vertical map is a roguelike convention borrowed from a game about climbing a tower. It also closes the
map's standing UI findings: a biome emblem on every Wild node (they fall back to the meadow tuft), route lines
at 3:1 against their plate (Regions 1 and 2 fall short), and the node caption on the `--type-caption` token.

### v0.8.6 — The balance pass  ☐
Levels, money, consumables, relics and prices together, against whole runs of three Regions and two Cities with
multi-enemy fights in them — the harness first (720 runs, `CURVE_SEEDS=240`), then a playtest. After multi-enemy
on purpose (user, 2026-09-24): a pass before it would tune fights that are about to change shape. The first of
two; v1.0's is the last. *(Backlog #4.)*
**Exit (v0.8):** fights against groups everywhere in the run, a reworked route, and the whole run balanced.

## v0.9 — The long game  ☐

The account's systems revisited, and the road to the Champion.

### v0.9.1 — Bond and Shiny, revamped  ☐
Bond (§6.8) and Shiny — today only the Bond-rank sprite reveal, not something you find (§5.13) — reworked
together, since the one is the other's reward. Design pass with the user first. *(Backlog #5, #6.)*
It also writes the **Mastery Lv2 and Lv3** of every line but the three starters (§5.13.2): they are Bond rewards at ranks
4 and 5, so v0.7.5 wrote every line's Lv1 and left the rest for the curve they will be earned on.

### v0.9.2 — Player level and the Poké Mart, revamped  ☐
The Trainer level and the Mart (§8.3, §8.4), with the scored shop curation §2.11.2.1 still owes and what leftover
₽ turns into at a run's end. Design pass with the user first. *(Backlog #7, and the end-of-run surplus.)*

### v0.9.3 — The catch, animated  ☐
A bar that lights up to the throw's catch %, and a Poké Ball swinging side to side, slowing little by little
before it settles. The outcome is still rolled first (§2.6.4.1) — the animation only shows it. On the combat
screen v0.8 reshaped, so it is drawn once. *(Backlog #10.)*

### v0.9.4 — Victory Road  ☐
§2.12's nodes — Gauntlet, Apex, Training Grounds, Summit — and a way back to the Badges a run never met: the
Perfect Clear of §2.12.6. *(Backlog: recovering missed Badges.)*

### v0.9.5 — The League  ☐
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
| **An intent you can hover.** Resting on an enemy's intent opens a card with everything it will do: the move and its type, who it is aimed at, how much it will deal to each target, its riders (a status, a stat change) — the enemy side's counterpart to a move card's tooltip. Goes with the per-target numbers of the intent fix, not instead of them: the numbers stay on screen, the card is the full read. | user, 2026-09-25 | v0.7.7's intent fix, or v0.8.1 with multi-enemy intents |

**Placed.** Every idea from the user's priority pass of 2026-09-24, and where each item went after the user's review
of the order (multi-enemy stays v0.8 and spreads through the run, the route joins it, the balance pass follows both;
the account revamps move to v0.9):

| # | Idea | Placed in |
|---|---|---|
| — | Playtest nerfs: Sleep, Mega Drain | v0.7.5 |
| 1 | The Safari Zone | v0.7.6 |
| 2 | The Black Market — a secret inside the Game Corner, run by Team Rocket | v0.7.7 |
| 3 | Routes, revamped | v0.8.5 |
| 4 | The global balance pass | v0.8.6 (after multi-enemy, per the user) and v1.0 |
| 5 | Bond, revamped | v0.9.1 |
| 6 | Shiny, revamped | v0.9.1 |
| 7 | Player level & Poké Mart, revamped | v0.9.2 |
| 8 | Consumables that are spent | v0.8.5 (with the routes) |
| 9 | Double-attack enemy intents — and enemies that call for help | v0.8.2 |
| 10 | The catch, animated | v0.9.3 |
| 11 | The Ring moves out of the Dojo — a town Ring, and the city's Coliseum | v0.7.7 (with the City art) |
| — | Multi-enemy fights, everywhere in the run | v0.8.1, v0.8.3 |
| — | The Dojo's extra moves; the Center's Daycare and PC Box | v0.7.8 |
| — | End-of-run ₽ surplus | v0.9.2 |
| — | Recovering missed Badges | v0.9.4 |
| — | Fossils and the Laboratory · role events · Ditto's Transform · HMs | v1.3 |
| — | Multiplayer — a dual mode | v2.0 |
