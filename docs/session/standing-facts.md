# Standing facts — Pokémon Ascendant

> The things that were expensive to learn and are cheap to forget. Split out of `active.md` in v0.5 so the
> session header can be rewritten every version without putting the accumulated knowledge at risk — which is
> exactly what happened once.
>
> A fact earns its place here by having been **paid for**: a measurement, a regression, a rule that was
> implemented wrong first. Anything derivable from the code or the canon belongs in the code or the canon.

## Working with the user (read this first)

- **Reply in Spanish.** The user writes in Spanish; code, docs, commits and every string in the game stay in
  English (en-GB), because the game's localisation is its own version (v1.1).
- **Commit and push every finished unit to `main`** — the user's standing instruction, which is the
  authorisation `CLAUDE.md`'s workflow refers to. Conventional commits, **no attribution lines**, never force.
- **Taste calls are delegated.** "Lo que mejor quede", "deja las que mejor creas": decide, record the rationale
  where the rule lives, say what you chose. **The written design is mutable** (2026-09-24): a better name, idea
  or item is written in directly. Only a change of the game's direction goes to the user; an idea the user likes
  but wants later goes to the roadmap's backlog.
- **Art:** permission to download and to generate images is standing. Fetch every real object (Pokémon,
  items, badges, trainers, battle backdrops); generate only invented scenes. Never generate a Pokémon.
- **Every version ships by `docs/release-doctrine.md`** (the `ship-version` skill): a `CHANGELOG.md` entry the
  game shows as What's new, and the version stamped everywhere; `npm run check:version` guards it. Work that
  reaches `main` between versions goes under `## Next`.
- **Playtest findings arrive in chat** ("I found that…"); they go to the roadmap — a fix into the next
  subversion, an idea into the backlog — never only into the reply.
- **The user runs other agents in this same folder** (other Claude sessions, and Codex: `AGENTS.md`,
  `.agents/`, `.codex/`). See *Working in a shared folder* below before staging anything.

## Canon and content

- **Canon is `docs/design/`, ten topics.** 1 Overview · 2 The Run (everything outside a fight, including the
  whole map) · 3 Combat (your turn) · 4 Resolution (the maths) · 5 Enemies (their turn) · 6 Progression ·
  7 Items · 8 Meta · 9 Presentation · 10 Foundations. Each topic states at the top what it owns.
- **A rule is stated once, in its place.** No override blocks and no change log — git holds the history, and
  the rationale sits next to the rule. Unresolved points are inline `⚠️ OPEN` flags.
- **`§` numbers are an API**, ~2,480 citations across docs and code. `npm run check:refs` proves they all
  resolve; `npm run check:catalogs` does the same for content ids. Both run inside `npm run check`.
- **`catalogs/` is the content authoring source** (19 files). Each row carries the roadmap version that needs
  it.
- **`catalogs/` is where content comes from, and I have to open it first.** v0.3 authored 24 branch moves
  before reading `catalogs/species-r1.md`, which already specifies every line's branch table; one invented id
  collided with a Mastery move. The invented set was thrown away and the catalogue's 27 ported instead. **When
  a catalogue row exists, port it; do not re-design it** — and when porting trips a content guard, the
  catalogue may be the thing that is wrong (Krabby's learnset sat above its own evolve level).
- **`implementation-status.md`** maps every system to its code and its state, and lists where the build
  disagrees with canon. Every divergence names the version that closes it.

## The simulation

- **Sim** (`src/sim`): pure, deterministic, reducer-based. `combat/` is one fight; `run/` is everything
  between fights. Both take `(state, action, ctx) → {state, rejected}` and never throw on illegal input.
- **The run layer's shape:** `region.ts` is the Region 1 content table (biomes, 10 trainer rosters, the Elite,
  the Elite Wild, all four Gyms, the lane themes, run start), `map.ts` generates the seeded 12-layer forked
  route, `run.ts` is the reducer, `encounter.ts` turns a node into a `ScenarioDef`, `economy.ts` owns money
  and prices, `events.ts` owns Mystery Events, `modifiers.ts` owns §8.8, `xp.ts` owns levels and evolution,
  `save.ts` owns the envelope, `report.ts` is the seam back from a finished fight.
- **`region.ts` cannot import `map.ts`** — the dependency runs the other way — so `ROUTE_LAYERS` is written in
  both and `mapRules.test.ts` asserts they agree.
- **Evolution is queued, not applied.** Crossing the threshold flags it; the branch is picked on the Evolution
  screen between nodes (§6.3.1). The reducer's order after a fight is reward → evolution queue → swap-or-skip
  → map, and `leaveNode` is the one place that walks off a cleared node.
- **The active 4 is the player's** (§6.7.2). A level-up grows the pool and fills a free slot but never evicts
  a chosen card. `autoPickMoves` is the default and the *Auto* button: two strongest attacks, fill by recency,
  **always one Ranged card** — all three clauses were paid for by a harness regression.
- **Immer freezes state**, so a test that sets up a run builds new objects rather than pushing onto it.

## The map (v0.5)

- **A lattice, not a ladder.** 12 layers, 4–5 columns, ~47 nodes of which you walk 12. "Highly connected" and
  "clear paths" pull against each other; what reconciles them is a **locality rule** — a node links only to
  columns within one of its own, and its children are a *contiguous* window. The contiguity is what actually
  guarantees edges never cross: a random subset of the same candidates sends an edge over its neighbour.
- **The Gym fork is the run's one irreversible decision.** Two of four Gym types per run, named on the map
  from layer 0; the trunk runs to L7 and L8 splits into two lanes that **never rejoin**. An edge that could
  change lane would make the choice a detour rather than a commitment.
- **Each lane is themed after its own Gym** — biome, species and trainer archetype — so it telegraphs its
  destination for four layers rather than on one signpost. A lane's wilds are *adjacent* to its Gym, not
  counter to it, so the counter is built in the **trunk**: plan in the trunk, commit at the fork. Each lane
  carries one `counter` species so a late commit is a handicap, not a loss.
- **A landmark that is the whole layer is a wall, not a decision.** The Elite Trainer as a single-node layer
  ended a third of the harness's runs and offered no alternative; §2.5's own diagram had always drawn it as
  the middle of three. *Guaranteed on the map* is not the same as *unavoidable*.
- **A weighting and an anti-repeat rule fight each other.** "No two adjacent nodes share a type" fired on
  almost every roll at a 9:2 wild bias and halved a deliberately wild-heavy opening. A row of four cannot be
  both mostly-one-kind and never-twice-in-a-row. The rule is no **three** in a row.
- **A service node costs a fight.** One node per layer means a Dojo or a Centre *replaces* a fight rather than
  sitting beside one. Two corollaries paid for in v0.4: a service layer's other columns must **roll normally**
  (pinning them to Wild deleted two late trainer fights from every route), and *where* a service sits changes
  what it is worth — the Dojo at L3 measured 13 points worse than skipping it, because §6.4.3's tutor list is
  the un-evolved one until L6.
- **Levels follow the layer, and the climax follows the levels.** The wild band is a ramp across the *whole*
  route, not an offset from the layer index — as an offset it flattened from layer 8 and let a team arrive
  four levels over. §5.9.3's Gym premium (band + 4, band + 6) is **derived** for the same reason: pinning the
  Gym at L14/L16 against a ten-layer route left it behind the moment the route grew to twelve.

## The systems that share one vocabulary

- **Relics, Badges and Region Modifiers are one code path.** §7.3.6 puts them in the same sentence as
  independent terms of the same formula, so `combat/items.ts` resolves all three through §7.7's named hooks
  and `relicsOf` is the only place that knows there are three. What distinguishes them is *provenance and
  scope* — a relic is picked up, a Badge is won and permanent, a Modifier lasts one Region — and that lives
  in the run layer, which is the only place it means anything.
- **A shared list needs defensive lookups.** The corollary, paid for immediately: `player.spent` can hold a
  charge belonging to any of the three, and the run was looking every one of them up with `content.relic()`.
  The harness found it on the first run where a Region Modifier spent a charge.
- **A relic with two clauses gets `also`, not a second system.** Four of the sixty do two things; `relicsOf`
  flattens the second clause into the same list, so no hook site knows the difference. A third clause would
  mean the shape is wrong and it should become an array.
- **Legendary is a rarity class, not a drop weight.** It is outside the drop table entirely and reachable
  only through a 1-of-3 pick. Adding a weight, however small, would turn the apex tier into a lottery and
  make the pick-moment meaningless — so `rollRelic` filters it out *after* the fallback, where the rule
  would otherwise rot unnoticed.
- **Achievements are a fold over a diff, never an event queue on the run.** `RunState` is saved, replayed and
  checksummed (§10.8); hanging account bookkeeping off it would put a cross-run concern inside the thing that
  has to replay identically. `metaEventsFor(before, after)` is pure, so a ten-run streak is a millisecond.

## Balance and measurement

- **Two balance harnesses.** `balance.test.ts` is one fight; `runBalance.test.ts` plays whole runs through
  `autoRun.ts` and reports win rate, depth, turns, catches and evolutions per starter. The run harness caught
  the zero-catch bug and the level-10 learning cliff — prefer it for anything that touches pacing.
- **A harness that ignores the central decision measures the wrong player — and then the design gets tuned
  against that player.** The auto-run did not choose its lane by matchup until v0.5. Once it did, the
  counter-picking showed up in the data immediately.
- **A harness that matches on a content *shape* stops exercising the system when that shape changes.** Moving
  healing to percentages dropped the measured win rate from 47/47/57 to 17/3/27 — the auto-player's
  `.find(kind === 'heal-flat')` silently stopped drinking Potions, and the same change bricked its Ether
  branch (it fired at `ap === 0`, and Ether costs 1 AP). Gate on `playable` and on the effect's own numbers,
  never on a hard-coded kind.
- **An A/B needs more samples than a point estimate.** The standard error of a *difference* of two win rates
  is √2 times either one's, so the service-node comparisons run at 80 seeds and the table at 30. At 30 the
  comparison failed on pure noise once.
- **Balance now (120 seeds):** Bulbasaur 67 %, Charmander 66 %, Squirtle 73 %. v0.3's 61/28/90 spread closed
  in v0.4 — the economy gave the weak start four places to buy an answer — and v0.5's fork keeps it closed.
- **The seed-count rule earned its place a second time.** The same table at 30 seeds read 63/67/80 and looked
  like the Region Modifiers had blown a 17-point hole in the spread. At 120 it was 7 points. Before reacting
  to a *difference* moving, re-run it long.
- **The harness has to take the decision the design expects.** It takes a Region Modifier at run start for
  the same reason it chooses its lane by matchup: a harness that skips a choice every player makes measures
  a strictly worse player, and then the design gets tuned against that player.
- **Golden fixtures** are regenerated only with `UPDATE_GOLDEN=1 npm test`, plus a note in the rule that
  changed.
- **The Region curve (§2.2.1) is tuned over 720 runs, guarded over 120.** `npm run check` runs one block of 40
  seeds × 3 starters, which wanders ±~10 pp; to *tune*, measure long: `CURVE_SEEDS=240 npx vitest run
  src/sim/balance/runBalance.test.ts -t EachRegion` (~50 s, Git Bash). The knob is `REGION_STAT_TIER` in
  `run/region.ts`. Paid for in v0.7.4: Region 3's own roster read 37 % given Region 2 at the placeholder's
  Attack ×2.3 (the 120-run guard still passed); ×1.95 put it back at 47 %.
- **A new Region's roster hits harder than its placeholder did.** Real final forms (Alakazam, Gengar, Machamp)
  outclass Region 1 lines raised by +16 levels; re-measure the curve whenever a Region's tables change.

## Honesty rules

- **Honest degradation has a gate.** A content row whose system does not exist ships with a `pending` note the
  UI prints — and `isOfferable` in `run/economy.ts` keeps it out of every drop, shelf and offer. Showing a
  labelled blank is honest; selling one for 300 ₽ is not. Same rule for difficulty modifiers: a locked row
  names the version that unblocks it and cannot be taken.
- **No section numbers in player-facing strings.** A `§` tells us where a rule lives and tells a player
  nothing. `modifiers.test.ts` asserts it.
- **The rules are explained once, on purpose.** Every control has a tooltip, but tooltips are discovery, not
  teaching. §9.6.1's "How to play" panel is six fight rules and four route rules, in two headed groups.
- **A screen, not a doorway.** A Centre that heals on entry and returns the map leaves §8.2.4's Therapy
  unreachable; an event that resolves and vanishes is a gamble the player never sees land. Both hold state
  until the player acknowledges it.

## Tooling

- **Dev hook:** `?screen=<id>` · `?scenario=<id>&seed=n` · `window.__ascendant.{dump,start,dispatch,auto,replay}`
  · `npm run shot` · `npm run balance`.
- **Run-layer dev tools:** `__ascendant.run.goto('dojo')` walks to the nearest node of a kind through the real
  reducers, auto-playing every fight and walking *through* service nodes it was not asked for
  (`goto(kind, true)` stops at the Evolution screen). `run.levelTo(11)`, `run.fill(3)`, `run.grantTm(...)`,
  `run.wear(...)`, `run.trauma(3)`, `run.pay(2000)` set up a state without playing to it. A lone level-5
  starter loses the first wild fight about half the time, so `run.fill(3)` first.
- **The playtest menu is secret, and in every build.** Typing `rarecandy` on any screen opens it (`src/app/cheats.ts`,
  `ui/components/CheatMenu.tsx`): travel to a City or the Gym, heal, clear Trauma, levels, evolve, money, balls, a
  relic, win the fight. It writes the stores directly so the account never folds it (no medals, Bond or Pokédex), and
  it stays out of the CHANGELOG, which the game shows. The dev hook `__ascendant` stays dev-only.
- **A Mystery node's phase is `event`, not `mystery`** — the node kind and the phase share a name for the
  other three service nodes and not for this one.
- **Art comes from scripts, never by hand:** `art:portraits`, `art:sprites`, `art:trainers`, `art:nodes`,
  `art:items`, `art:gen`, then `scripts/install-art.mjs` to resize and convert into `public/`. Anything
  third-party gets a row in `docs/art/ATTRIBUTION.md`.
- **Generate a scene, fetch an object.** Scenes have no canonical original to get wrong, so they are
  generated. Objects the player already knows — every item, every badge, the Pokémon Centre, trainer classes,
  the Pokémon — are the *real* assets, because a model approximates an object and cannot reproduce a specific
  one. A carefully-described Potion came back white and orange when the real one is purple and mint.
- **A place the player has stood in is an object.** v0.4 read "scene" as "anything wide" and generated the
  four battle backdrops; v0.5 put the real ones back. The generated Gym was the better *illustration* and the
  worse Gym, because a generated backdrop behind a real sprite is the one place the seam always shows. Only
  two scenes are generated now — the menu vista and the route plate — and both are invented places.
- **What gives a generated asset away is the register, not the subject.** The v0.4 vista had a red-roofed
  Centre, a Poké Mart, tall grass and a signpost, and still read as fan art, because it was a modern
  cel-shaded illustration above a screen full of 16-bit sprites. Redrawn as a top-down overworld town in the
  same pixel grammar as the map plate, the same scene reads as the game. Ask what *medium* the franchise
  would have drawn it in, not what it would have drawn.
- **A backdrop is not decoration — it is where the fight is.** Trainer and Elite encounters had `stage`
  hardcoded to `'meadow'`, which put every Hiker in a field four layers into a cave lane, and the wild
  lookup re-derived the biome *from the species* so a Psyduck in the River lane fought in a Meadow. Both
  silently undid the one thing §2.5's lanes exist to do. The node already knows its biome; ask the node.
- **Official is not the same as pixel.** Showdown's `gen6bgs` are real 3DS battle backgrounds, not pixel art,
  and they sit under Gen V pixel sprites without complaint — that pairing *is* what Showdown looks like. The
  pixel register belongs to the overworld screens (map plate, menu vista), not the battle plate.
- **Image generation runs on Vertex AI with gcloud credentials, no API key.** AI Studio "Prepay" is a
  different, usually empty pot; a 429 about depleted prepayment means "use Vertex". Details in
  `docs/art/pipeline.md` §5.
- **Generate at least two variants and look at both.** One shot is a coin flip. Generation and installation
  are separate on purpose: a bad variant should not be able to overwrite a shipped asset.
- **The map plate is pixel art and the whole chain has to respect it:** generate at 1K, install with the
  `pixel` profile for nearest-neighbour, set `image-rendering: pixelated`, and remove the screen's blur. Miss
  one of the four and it is an expensive smudge.

## The rename (2026-09-20)

- **The project is *Pokémon Ascendant*.** It was *Evoline* until v0.5 shipped, and *Project Ascendant* in
  Unity before that; the new name picks that lineage back up and puts the genre in the title. The folder
  moved with it: `CODE - Proyectos/Pokémon Ascendant`, with a space **and** an accent in the path. Vite,
  Vitest, Playwright and every `import.meta.dirname` script were checked from the new path and hold; if a
  future tool chokes on the `é`, that is the first thing to suspect.
- **The trademark is in the title now, so the disclaimer is load-bearing.** The menu's "not affiliated with
  Nintendo" line and the README's notice are no longer decoration. `e2e/a11y.spec.ts` asserts the menu line
  is reachable at every supported size, because 150 % text on a 720p window pushed it below the fold first.
- **A rename pass will happily flatten a migration table.** The find-and-replace mapped every new storage key
  onto itself, and nothing failed — a migration that maps a key to itself behaves exactly like one with
  nothing left to migrate. It would have shipped and silently eaten every player's saves and medals on
  update. The lesson is not "be careful": it is that **the old name inside a migration is data**, and the
  only thing that makes its loss loud is a test that asserts the predecessor is not the key itself
  (`app/storageKeys.test.ts`).
- **Verify a codemod, do not trust its output.** The first pass *reported* a file as written that still held
  both old spellings. Re-grep afterwards, case-insensitively, and look at what is left.

## Hosting

- **Every asset URL goes through `asset()` in `src/content/paths.ts`.** GitHub Pages serves the game under
  `/Pokemon-Ascendant/`, and a root-absolute `/art/…` there asks the wrong site for the sprite. The helper reads
  Vite's `BASE_URL`; the workflow sets `VITE_BASE` from the repo name; dev and tests stay at `/`. Fifteen inline
  strings became named builders in `ui/art.ts` so a new screen cannot reintroduce the bug by accident.
- **Verify a hosted build by loading it under the sub-path, not by grepping the bundle.** `BASE_URL` is inlined
  as a string and concatenated at runtime, so the final URLs never appear in `dist`. A throwaway static server
  at the sub-path plus one Playwright pass counting broken images is the check that means something.
- **Git Bash rewrites a leading `/` in an env value into a Windows path** (`VITE_BASE=/x/` became
  `/Program Files/Git/x/`). Prefix with `MSYS_NO_PATHCONV=1` for any local reproduction of the CI build.
- **Pages on a private repo needs a paid plan.** The account is on Free, so the repo is public — which the
  Pages URL makes moot anyway. The deploy source is GitHub Actions; there is no `gh-pages` branch to sync.

## Working in a shared folder (2026-09-23/24)

- **Other agents edit this tree while you work.** `git status` will show files you never touched; they are
  theirs until they commit them. **Never `git add -A` and commit blind**: stage by path, or `git add -A` then
  `git reset -- <their files>`, and read `git diff --cached --stat` before committing. Paid for: a
  `git add -A` swept another session's roadmap edits (the user's backlog priorities) into an unrelated commit.
- **A file both of you edited** can be committed with only your hunk: build your version from `git show
  HEAD:<file>` plus your change, `git hash-object -w` it, and `git update-index --cacheinfo
  100644,<sha>,<path>`. The working tree keeps both edits.
- **A file changed under you** ("modified since read") means someone else is in it: re-read, merge onto theirs,
  never overwrite. `docs/session/active.md` is the usual one — keep their lines when you rewrite the header.
- **Port 5173 may be another session's dev server.** `preview_start` then refuses the name; open the page by
  URL instead, or start your own once theirs is gone.

## Environment gotchas

- **Heredocs in the agent's Bash tool halve backslashes**, even quoted (`<<'EOF'`): a regex like `/\d+/` or
  `/\*\*/` written through `node - <<'EOF'` lands as `/d+/` or `/**/` and breaks silently. Write any script with
  a backslash, a regex or a template literal to a file with the Write tool and run it with `node`.
- **`check:catalogs` reads every backticked kebab token in a catalogue as a content id.** A code identifier
  (a hook name, a field, a stage id) in backticks fails the guard; write it without backticks.
- **A module imported from page JS through Vite (`import('/src/…')`) is a second instance**, not the app's:
  setting a store through it changes nothing. Drive the game through `window.__ascendant` hooks.

- **Rewriting a CSS module wholesale leaves Vite serving an empty object**, so every class comes back
  `undefined` and the component renders unstyled. It looks like a layout bug and it is a stale-cache bug.
  Restart the dev server.
- Playwright uses system Chrome. Editing sim files while playing in the browser hot-reloads and resets the
  fight.
- **`node -e` with backticks in the payload breaks under bash.** Use the Write/Edit tools for anything
  containing a template literal, a `§`, or a shell metacharacter. A one-liner that looked fine truncated
  `active.md` to its header; the tree has no commits, so there was nothing to recover from.
