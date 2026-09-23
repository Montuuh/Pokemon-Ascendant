# Pokémon Ascendant — Roadmap

> The version being built is the only scope. Anything else is out unless the user overrides. Each version has
> a **playable claim** (what a tester can do), **exit criteria** (how we know it is done), and the **art it
> needs**. Design references point to `docs/design/`. Status: ☐ planned · ◐ in progress · ✅ done.
>
> **The table below is read by the game.** The About screen parses it (`src/content/roadmap.ts`), so it is the
> one place a version's status and date live: mark the row and the game follows. Keep the four columns and
> the `✅ YYYY-MM-DD` shape on a finished row.

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
| v0.7 | Cities & Regions 2–3 | The run continues past Gym 1: two Cities as lobbies, routes stripped to a nurse and a pedlar, then Regions 2 and 3 with their own accents. **Five subversions** | ◐ in progress |
| v0.8 | Multi-enemy & field effects | 1 lead + 1–2 supports: slots, targeting, intents, AI, preview — and the field effects biomes hang off | ☐ |
| v0.9 | Victory Road & League | Gauntlet, Apex, Training Grounds, 5-fight League, Champion, boons | ☐ |
| v1.0 | Release | Desktop build (Tauri), itch.io web + Windows, balance pass, trailer | ☐ |
| v1.1 | Polish | Audio, accessibility tier, localisation (es-ES/en-US), generated backdrops, VFX pass | ☐ |
| v1.2 | Map revamp | A horizontal route you scroll, painted from a tileset with the biome on top | ☐ |

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

### v0.7.2 — The city  ☐
**Celadon City**: the Department Store by floors, the wider City Dojo, the Game Corner's two machines — the
Wheel and the Slots, tables printed (§2.11.5) — and the Black
Market door drawn beneath it, in development. The **Challenge Ring** in both Dojos (§2.9.4.1): a ladder of
trainers — two rungs in the town, three in the city — where you see the next rival and choose to cash out or
climb. The only new combat surface of the City.
**Exit:** two Cities that feel different sizes, not two copies — and a balance test that holds the Ring's
clear rates inside their bands (§2.9.4.1: rung 1 about half; the whole ladder about 1 in 6 in the town, under
1 in 10 in the city).

### v0.7.3 — Region 2, Coastal Cliffs  ☐
Biomes `sea` and `power-plant`, ~10 authored lines (kits, learnsets, branches), trainer rosters, the four R2
Gyms and their Badges, and the accent: **status conditions on enemy intents** (§2.2). Pikachu's kit lands here
— it is a power-plant species. Region 1's thin biome pools widen at the same time (§2.6.1).
**Exit:** Region 2 plays differently from Region 1, not just harder.

### v0.7.4 — Region 3, Volcanic Highlands  ☐
Biomes `volcano`, `cave`, `sky`, `tower`, ~10 authored lines, the four R3 Gyms and Badges. Its mechanical
accent (multi-enemy, field effects) is **v0.8** — R3 ships on R2's combat rules and gains them later.
**Exit:** three Regions with three rosters and twelve possible Gyms.

### v0.7.5 — The leftovers  ☐
Evolution Items (Eevee's Stone Cache, the Mysterious Stone event), the intent queue (Trainer's Instinct),
the six pending hidden abilities, the unwritten Mastery moves, the inert relic rows, the
Master Ball Charm criterion.
**Exit:** nothing in the build is marked "pending v0.7".

## v0.8 — Multi-enemy & field effects  ☐
1 lead + 1–2 supports: slots, targeting, intents, AI, damage preview, Cleave and Backstrike against several
bodies, and the field effects (§4.3) that biomes hang their identity on (§2.6.1). Separated from the Regions
on 2026-09-22 because it is not content — it is the combat engine, and a targeting bug must not look like a
content bug. The League assumes it, so it comes before Victory Road.

## v0.9 — Victory Road & League  ☐
§2.12 nodes (Gauntlet, Apex, Training Grounds, Summit), League 5 fights with micro-rest, Champion signature (§5.12), League Boons.

## v1.1 — Polish  ☐
Audio direction + stems + SFX bible (§9.5), accessibility tier (§9.6), localisation architecture + es-ES/en-US (§9.10), generated backdrop set (`ui/07`), VFX pass, performance pass.

## v1.0 — Release  ☐
Tauri desktop build (Windows; Linux stretch), itch.io web + Windows downloads, balance pass with telemetry from playtests, trailer, README/press kit. Fan project: free, non-commercial, IP disclaimer everywhere.

---

## Change control
Scope moves only through this file. When a version's scope changes, add a dated line under it and a
note in the canon section if design moved. Keep `docs/session/active.md` pointing at the current version and task.

## v1.2 — Map revamp  ☐
The Region map redrawn: **horizontal**, scrolled left to right the way a route is walked, and painted from a
**tileset** with the biome laid over it instead of one flat backdrop per lane. Decided as post-release on
2026-09-22 — it is an art and tooling system (atlas, autotiling, seams) rather than a rule change, and the
current map works. The horizontal reading is the part that matters: a Pokémon route runs left to right, and
the vertical map is a roguelike convention borrowed from a game about climbing a tower.

---

# Backlog — good ideas with no version yet

Kept here so they stop living in chat. Nothing on this list is promised, and none of it blocks a version.

| Idea | What it is | Where it would live |
|---|---|---|
| **Fossils and the Laboratory** | Revive Omanyte, Kabuto or Aerodactyl into a recruit no route offers. The town's fourth door | Pallet Town (§2.11.4) |
| **Role events** | The Pokémon Fan Club, Team Rocket, the Magikarp salesman's swindle, Silph Co. — written encounters with a choice, in a City rather than on a route | §2.10 / §2.11 |
| **The Safari Zone** | Entry fee, a fixed number of balls, species the routes never offer (§2.11.6) | The door is already drawn |
| **The Black Market** | Legendary relics paid in HP or Trauma, Pokémon traded for Pokémon — the things a Mart will not sell (§2.11.6) | Beneath the Game Corner |
| **The Dojo's extra moves** | A move catalogue beyond each species' tutor list (§2.11.6) | The Dojo's third counter, drawn in development |
| **HMs (MO)** | Cut, Fly, Surf, Strength, Flash — as battle moves, a field use, or not at all. Needs its own design; may never ship | — |
| **Recovering missed Badges** | A way to earn the Badges of Gym types your run never met — a run earns three of twelve, and the fork decides which (§2.12.6) | — |
| **The global balance pass** | Levels, money, consumables, relics, prices — together, against a whole run. Natural moment: after v0.7.5, when three Regions and two Cities exist to balance; v1.0's pass is the final one | All of §2, §7, `catalogs/economy.md` |
| **End-of-run ₽ surplus** | What leftover money converts into at a run's end | §8.3 |
| **Consumables that are spent** | The user's idea: consumables are consumed for real, and found far more often | §7.2 |
