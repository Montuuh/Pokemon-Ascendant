# Playtest — First Route v0.2 — 2026-09-19

**Build:** working tree (uncommitted), dev server · **Tester:** Claude, driving the real UI in the built-in
browser plus a new whole-run auto-player (`src/sim/balance/autoRun.ts`, 18 seeds per starter) · **Scope:** the
run outside a fight — new-run flow, map, node previews, catching, the Box, XP, saves, Victory/Defeat.

The headline is that the auto-player found four real defects that no single-fight test could have, because
each of them only shows up over the length of a route. They are listed first.

## Defects the whole-run harness found

| # | Observation | Type | § | Status |
|---|---|---|---|---|
| 1 | **Zero catches in 54 simulated runs.** A wild scenario copied the run's consumable list, which never contained `poke-ball`, and `createCombat` only builds a ball card from that list. The `balls` counter was decremented on a successful catch, so the resource existed on the HUD and nowhere else. A run could therefore never recruit, and every run was fought with the lone starter. | bug | §2.6.4 | **fixed** — a wild scenario now adds one ball card per ball held, and the run reads the fight's own remaining count back, so a miss costs a ball too |
| 2 | **Everything stopped learning at level 10.** A base form's learnset ends two levels *below* its evolution threshold, and evolution was scheduled for v0.3. So from level 10 to level 20 a Pokémon's four cards never changed: the §6.9 "deck thickens" loop was dead for the whole run, and the Gym — written for an evolved team — was unwinnable for two of the three starters. | design | §6.2.4, §6.9 | **fixed** — evolution applies at the threshold during the level-up; the v0.3 line item is now the Evolution *screen*, not the mechanic |
| 3 | **The auto-picked kit dropped the move that mattered.** "The four most recently learned" left Oddish with Acid (×0.25 into Rock) and no Absorb (×4), so a level-10 Oddish was strictly worse against the Gym than a level-5 one. | design | §6.9, §6.3.6 | **fixed** — the pick keeps the two strongest attacks first, then fills by recency |
| 4 | **A flat wild band made layer 0 as dangerous as layer 5.** Region 1's band was applied whole to every node, so the opening choice could put a Lv 5 starter against a Lv 10 wild or a Lv 12 trainer. 23 of 90 runs ended in the first four layers. | design | §2.6.3, §2.7.3 | **fixed** — the band walks with the route, L5–6 at layer 0 to L10–11 at layer 5; trainers sit one above their own layer's band |

## What the numbers say now

Whole-run auto-player, 18 seeds per starter (`npm run balance`):

| Starter | Win % | Avg depth | Combat turns | Catches | Faints | Top level | Evolutions |
|---|---|---|---|---|---|---|---|
| Bulbasaur | 56 % | 5.7 / 7 | 29 | 2.3 | 2.2 | 14.6 | 2.9 |
| Charmander | 33 % | 5.6 / 7 | 28 | 2.1 | 2.2 | 13.8 | 2.1 |
| Squirtle | 89 % | 6.4 / 7 | 32 | 2.5 | 1.6 | 17.1 | 4.0 |

Single-fight envelope is unchanged except the Gym, which the auto-player now clears reliably at 11.3 turns
because the fixture team is an evolved route team rather than three raw stage-1s.

## Tuning applied, and why

| Change | From | To | Reason |
|---|---|---|---|
| Route XP per enemy | 30 / 45 / 80 / 140 | 48 / 72 / 110 / 200 | A seven-node route has to carry Lv 5 to roughly Lv 14. The old table landed at Lv 11. |
| Region 1 Gym ace | Golem L16 (final form) | Graveler L16 (mid-stage) | A final form in the *first* Gym ended 52 of 90 runs. The ace should be a level premium over the route, not a stage the player cannot have reached. Golem is a Region 3 problem. |
| Wild band | flat 5–10 | 5–6 at layer 0 → 10–11 at layer 5 | See defect 4. |

## What I played by hand

Squirtle, seed 2042705085. The new-run stepper reads cleanly: the difficulty step is honest about being a stub
(the second tier is visibly locked and says "arrives in v0.3"), and the starter panel shows the three cards you
will actually open with, which is the right thing to show because the deck is the game.

The map reads as a route rather than a graph — seven layers climbing toward a Gym that is visible and out of
reach from turn one, which is the Pillar 1 promise applied to the map rather than to a fight. The node preview
names the species, and after the roster-fixing change it is now binding: what the preview listed is what the
fight builds.

Entering the first Wild Area, the fight boots with the run's own team at its run HP, `run-n0-0` in the header,
and three balls in the pile. I lost that first fight deliberately (playing nothing but End Turn) to check the
defeat path: the outcome overlay switched to a single "See how far you got" button, the run ended, the Defeat
summary reported Trauma ×1 with max HP down 56 → 53, and the save was cleared so the menu no longer offered
Continue. That is the whole loss loop, correct on the first try.

## Findings from the hand pass

| # | Observation | Type | § / pillar | Severity |
|---|---|---|---|---|
| 1 | A reload mid-fight dropped the player at the scenario picker with the run intact but the fight gone. | bug | §10.8 | **fixed** — the save carries `pendingScenario`, so boot rebuilds the same fight with the same seed |
| 2 | The map's atmospheric veil was tuned blind and drowned the route plate entirely; the node glyphs rendered black-on-dark because an `<img>`-loaded SVG cannot inherit `currentColor`. | visual | §9.4.1 | **fixed** — veil softened and the art blurred instead; glyphs are CSS masks over `currentColor`, so one file serves every node state |
| 3 | Box icons (68×56 with a small sprite inside) read as a smudge in list rows. | visual | ui/01 | **fixed** — the run screens use the square official-artwork portraits instead |
| 4 | The combat header showed `run-n0-0` instead of the fight's name, because it looked the id up in the scenario catalog and a run fight is generated. | bug | §9.2 | **fixed** — the store carries the scenario name |
| 5 | Charmander's 33 % against a Rock Gym is the widest starter spread in the table. It is the canonical Fire-into-Rock matchup and the answer is the Box, which the run now supplies. Worth a human read before v0.3 tunes anything. | design ⚠ | §5.9 · P5 | open |

## Verification

| Gate | Result |
|---|---|
| `npm run check` | green — 202 Vitest cases, typecheck, lint, 1,728 § citations, 790 catalogue ids |
| `npm run e2e` | green — 17 Playwright cases |
| Full route through the UI, clicks only | green — `e2e/run.spec.ts` walks the new-run flow, seven layers, fights, rewards and the summary |
| Quit mid-route and Continue | green — same map, same seed |
| Resolution | 1920×1080 and 1280×720 both verified; the 720p case asserts no overflow and no clipped node |

## Art and accessibility pass (same day, after the first write-up)

The art doctrine was reversed on the owner's call: generated art now leans *into* the Pokémon look instead of
around it, on the basis that the project is free and stays free. Everything visual was regenerated against
that brief and the results are in the build, not in a folder.

| Family | Before | After |
|---|---|---|
| Battle backdrops (4 in use) | 800×480 Showdown rips, upscaled 2.4× | Generated 2K, installed at 1920×1080 |
| Map plate | A hand-authored SVG | A generated overhead route with the Gym and a cave mouth |
| Main-menu vista | CSS gradients and two hills | A town with a red-roofed Centre and a Poké Mart |
| Consumable icons (11) | 30×30 PokéAPI sprites at 40 px | Generated 128² in the bag style, backgrounds cut out |
| Map node markers (4) | Monochrome game-icons glyphs | Full-colour badges: tall grass, crossed Poké Balls, the Centre cross, a Gym badge |

Two things worth keeping from the process. **Nano Banana Pro needs `responseModalities: ['TEXT','IMAGE']`** —
ask for `IMAGE` alone and it finishes with `IMAGE_RECITATION` and returns nothing, which reads exactly like
a content refusal. And **rewriting a CSS module wholesale leaves Vite serving an empty object**, so every
class comes back `undefined` and the component renders unstyled; it looks like a layout bug and it is a
stale-cache bug.

Accessibility (§9.6) pulled four items forward from v0.5 and post-v1.0:

| Item | What shipped |
|---|---|
| Keyboard play | 1–9 select a card, E ends the turn, Escape cancels. The whole fight runs without a mouse |
| Names | Every control is named; a card reads "Water Gun, water. From Squirtle. 1 AP. 7 damage. …" rather than as a pile of glyphs |
| Live regions | A polite region narrates combat and the map, so the board is not silent |
| Focus | Modals take focus on open, cycle Tab inside, and give it back on close |
| Reduced motion | Nothing loops. One-shots still run, because killing a `forwards` animation strands damage numbers mid-air |

`e2e/a11y.spec.ts` holds all six as assertions, including a check that zero elements animate forever under
`prefers-reduced-motion`.

### Second correction: generated objects were plausible, not correct

The first item pass was generated from careful descriptions of the canonical designs, and it produced a
white-and-orange spray bottle where the real Potion is purple and mint. That is the whole lesson in one
image: describing an object better does not make a model reproduce it. Everything the player already knows by
heart now comes from the real assets.

| Family | Source |
|---|---|
| 11 consumables | Serebii itemdex, Scarlet & Violet renders at 160² |
| Boulder Badge, Pokémon Centre, tall-grass tile | Bulbagarden Archives via the MediaWiki API |
| Four trainer-class emblems | The Showdown sprites already in the project, on the same badge disc |

The map plate also moved register: it is now top-down pixel art, because that is how a Pokémon route map is
read. Keeping it crisp needed four changes at once — generate at 1K, nearest-neighbour upscale,
`image-rendering: pixelated`, and removing the blur the map screen was applying to its backdrop.

And the move cards were rebuilt around the owner's portrait. A twelve-card shared hand has to say whose card
is whose, and a 22 px avatar beside the title was not saying it.

## Still open for v0.2

An external tester has not yet completed a 20-minute run. Everything else on the exit list is met.
