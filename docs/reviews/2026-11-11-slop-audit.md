# Slop audit — the whole game — 2026-11-11

> Skill: `.claude/skills/slop-remover` (audit mode, read-only). Build: `e61a65d0` + working tree, v0.9.110.
> **Applied in v0.9.111 (*Plain words*)**, every section, the same day: ~930 words gone, 135 rewrites plus the
> card template, the spellings and the dev leaks. Two species-path lines turned out to be wrong, not just wordy
> (Gyarados sets no Rain; Machoke does not scale with Trauma), and the event risk pill had become "Safe · Safe" once
> its blurb was cut, so the blurb went. Left as they were, on purpose: trainer dialogue except six two-beat lines,
> Mystery scenes, the About disclaimer, and the changelog's minor summaries (a minor sums its patches by design, R2).

## Scope and method

- **Every player-facing string**, read in full, not sampled: 3 538 strings, 29 882 words, extracted from the
  TypeScript AST of `src/ui`, `src/app` and `src/sim`, the prose fields of the 15 content files, and the
  What's new entries of `CHANGELOG.md` (`node .claude/skills/slop-remover/slop-scan.mjs --json …`).
- **Every screen** captured and measured by `npm run ui:audit -- --all` (88 screen presets, 1920×1080 and 1280×720).
  Its D1 text measurements are in *Screens* below.
- Dev-only surfaces (cheat menu, scenario picker) were read but ranked low.

| Surface | Strings | Words | Verdict |
|---|---:|---:|---|
| Tooltips (`tips.tsx` + bubbles in screens) | 741 | 7 579 | The main source of slop: repetition, flourishes, implementation talk |
| String tables (`strings.ts`, `moveText`, `evolutionText`) | 1 005 | 7 256 | Mostly tight; dev leaks, design narration, a few flourishes |
| Run text (`src/sim/run`: map, events, trainers, log) | 323 | 3 011 | Trainer counterplay lines read as dev notes; dialogue fine |
| Species paths (`species.json`) | 166 | 1 963 | Aphorism tic in ~25 of 166 lines |
| What's new (`CHANGELOG.md`) | 163 | 1 438 | Clean and brief; six duplicated bullets |
| Screens and components (JSX) | 479 | 2 077 | Clean apart from dev leaks; long text lives in tooltips |
| Combat log (`src/sim/combat`) | 193 | 1 201 | Series voice; two tutorials and one debug line |
| Meta (`src/sim/meta`) | 102 | 792 | One dev leak, epigram titles |
| Relics, items, abilities, TMs, badges, modifiers | 321 | 3 239 | Tight; one grammar bug, spelling drift |

**Overall.** The game does not have the usual AI-slop problem of marketing words and padding: only 22 filler
words and 12 AI-vocabulary hits in 30 000 words. Its slop is subtler and specific: **text that explains the build
instead of the game**, **the same rule restated in every bubble**, **aphorisms and "not X, but Y" flourishes**,
and **counterplay lines that argue with a misreading nobody had**. The most-seen one is mechanical: "Deals
damage." on almost every attack card. Roughly 150 strings should change, plus the card template; about 40 of
them are worth doing first.

---

## 1. Bugs found on the way (fix regardless)

| Where | Text | Problem | Fix |
|---|---|---|---|
| `tms.json` tm13, tm14, tm24, tm25, tm45, tm60 | "Teaches Ice Beam: a ice ranged hit…", "a electric technique" | Article before a vowel: the template writes "a" for every type | Generate the article (`an ice`, `an electric`) where the TM text is built, or drop it: "Teaches Ice Beam: Ice, Ranged, 95 power, 3 AP." |
| `tips.tsx:286` intent tip | "Every enemy move is telegraphed a turn ahead. Nothing here is a guess." | False: hidden intents exist (Unknown intent, Keen Eye, Marsh Badge, Pokédex Familiar) | "Every enemy move is shown a turn ahead, unless it is hidden." |
| `HowToPlay.tsx:40` | "Nothing is hidden and nothing is random about it." | Same pillar slogan, false in the same cases; the rules page is where a new player learns it | "Some intents start hidden; knock a species out enough times and its intents show." or cut the sentence |
| `strings.ts:157` Confusion hint | "Enemies choose uniformly among legal intents." | Implementation language on screen | "A confused enemy picks its move at random." |
| Spelling drift (D10) | "Defense" ×24 (the stat panel, move cards "+1 Defense (self)", iron-shell, x-defense) vs "Defence" ×31 (tips, infiltrator, weak-armor, boss texts) | One name for one stat | "Defense" everywhere: it is the series' stat name, like "Pokémon Center", and the one the stat panel and the cards already print (house en-GB stays for ordinary prose) |
| Spacing drift (D10) | "+20% damage" (overgrow, blaze, torrent, tough-claws, snipe) vs "+20 % damage" (swarm, hustle, most items) | One voice | Pick one (the majority is "20 %") |
| Naming drift (D10) | "Pokémon Centre", "the Centre", "Centre's Therapy" ×13 (`tips.tsx:679, 689, 1523, 1818`, `HowToPlay.tsx:64, 74`) vs "Pokémon Center" ×44 (strings, run log, map, city doors) | A proper name is not respelled | "Pokémon Center" everywhere |

### The most-seen slop: "Deals damage." on every attack card

`src/ui/moveText.ts:10` opens every offensive card's text with "Deals damage." — on 118 of the 724 moves it is
the whole text, and on the rest it prefixes the rider ("Deals damage. 10% Burn."). The card already prints the
power, the type and the range. It is on screen in every hand of every fight (see `combat-gym-720.png`: four of
five cards). **Proposal:** drop the sentence; a card with no rider shows only its rider line or nothing
("10% Burn.", "Lands next turn. +1 Defense (self)."), and "Hits every enemy." stays because it is a rule.

---

## 2. Dev and roadmap leaks (D10) — cut or replace with "Not yet"

All are dormant today (no content row is `pending`, no ability is inert, no door is in development since
v0.7.9), which is why nobody has seen them; each would reach a player the day a row is added.

| Where | Text | Proposal |
|---|---|---|
| `ItemCard.tsx:79, 98`, `strings.ts:1326` | "Not working yet: {pending}" | "Not yet" (and the reason in a comment, not on the card) |
| `MoveManager.tsx:150` | " (inert in this build)" | Cut; an ability without a hook should not be offered |
| `DojoScreen.tsx:337` | "No effect until a later version." | "Not yet" |
| `strings.ts:1100` | "Not open yet — this door is in development." | "Not open yet." |
| `sim/meta/mart.ts:91` | "its move kit is not written yet" | "not yet" |
| `sim/run/modifiers.ts:109` | "…keeps three — a fourth is not in the game yet." | "A Pokémon with three phases keeps three." |
| `AboutScreen.tsx:28` | "Code complete · {note} pending" | Decide: About's timeline is meant to show the roadmap, so keep; otherwise "Done" |
| `scenarios.json` (7 rows) | "(§5.6.5)", "(§2.12.2)", "(§2.3)", "(§5.12)", "(§5.5.2)", "(§5.2.3)" | Dev picker only (reached only when a deep link fails); strip the § anyway, they are in the fixture's `_note` |
| `sim/combat/ap.ts:24` | "(stored a → b; current AP unchanged)" | Debug detail in the AP breakdown: "Next turn: +n AP ({source})." |

## 3. Implementation and design narration — cut

| Where | Text | Proposal |
|---|---|---|
| `tips.tsx:1706` catch tip | "Each throw spends the ball and is the series' four shake checks — three wobbles, then the click — which all pass at exactly the chance on its row." | "Each throw spends the ball and catches at the chance on its row." |
| `tips.tsx:1212` sound | "Every sound in the game is made as it plays — no recordings. Music follows…" | Start at "Music follows where you are…" |
| `tips.tsx:1202` Apex reveal | "Shown because you bought the upgrade at the Poké Mart." | Cut |
| `strings.ts:601`, `sim/run/map.ts:285` Mystery | "A scene and a choice, with every outcome written on the button before you press it." / "A choice with its outcome stated up front — unless it is a gamble, and then it says that too." | "No fight. A choice; a gamble says so." |
| `EventScreen.tsx:25-27` event kinds | "Nothing here can hurt you." · "Something is given up for something gained." · "A stated chance, both sides shown." | "Safe" · "A trade-off" · "A gamble" |
| `HowToPlay.tsx:64` | "…because that is where you decide whether a stop is worth it." | Cut the clause |
| `HowToPlay.tsx:105` lede | "Six rules and you can start; the four after them are about the route between the fights, and they keep until your first Poké Mart." | "Six rules to start; four more for the route." |
| `SettingsScreen.tsx:52` text size | "Every screen is built to hold together at the largest setting. If something clips at 150 %, that is a bug worth reporting." | Cut both sentences; the control explains itself |
| `tips.tsx:1330` Dojo count | "The count is for the Pokémon picked on the left: what this counter still has to teach it." | "Still to teach {name}." |
| `tips.tsx:1192` labels toggle | "…Its picture and its bubble say the rest." | Cut the last sentence |
| `tips.tsx:1041` city | "Every labelled building is a door — walk in as often as you like." | "Walk in as often as you like." |
| `SpeciesSheet.tsx:72, 79` | "The Kit tab has where." · "The line tab has what each one opens." | Cut |

## 4. The same rule in every bubble — say it once (D1)

| Rule | Where it is restated | Proposal |
|---|---|---|
| Trauma: "only the Center's Therapy takes it off" | `tips.tsx:689, 1053, 1064, 1197, 1461, 1531`, `map.ts:270`, `HowToPlay.tsx:74`, `strings.ts:2141` log | Keep it in the Trauma tip (`689`) and the Center's Therapy tip (`1531`); elsewhere end at "Trauma stays." |
| Familiar: "its hidden intents show from turn one" | `SpeciesSheet.tsx:98, 105, 108, 109, 111` (one sheet), `bond.ts:110`, `LineSheet.tsx:50`, `tips.tsx:1793, 1807` | On the sheet: the counter ("3 more knock-outs to Familiar") and one tooltip with the rule |
| "Costs the ball whether it works or not." | `consumables.json` poke-ball, great-ball, ultra-ball; `tips.tsx:1646` | Once, in the ball tooltip (`1646` already says it) |
| "Leaving all three is allowed." | `tips.tsx:1249, 1518, 1651, 1671` | Make it the button ("Leave them" already is) and cut the sentence |
| "It commits to it unless it can no longer play it." | `relics.json` clear-mind, trainers-instinct; `tips.tsx:605` | Keep in the intent tip (`605`), cut from both relics |
| Flee: "nothing lost but the chance" | `strings.ts:560, 566` | Once, in `560` |
| Trainer XP sources | `tips.tsx:733, 758`, `strings.ts:1560` | Keep the full list in `758`; `733` ends at "XP to {next}." |
| CHANGELOG: v0.9.x bullets repeated under two themes | lines 186/212, 187/213, 188/214, 189/205, 190/206, 221/255 | Fold each pair into the newer entry (the changelog-by-theme rule) |

## 5. Defensive clarifications in counterplay lines — cut the second half

The Gym, Elite and Champion "Answer:" lines (`PHASE_TEXT.answer`, shown in the phase and signature tooltips) are
the right idea — one counterplay line per boss — but half of them carry a clause that argues with the
implementation. The same line is also copied between bosses (`region.ts` 434=524, 476=526, 495=527, 528=781,
532=989, 533=1003, 534=1017, 535=1031).

| Where | Text | Proposal |
|---|---|---|
| `league.ts:62` | "Normal immunity or a Ghost-resistant Lead; this is ordinary typed damage, not fixed damage." | "Normal immunity or a Ghost-resistant Lead." |
| `league.ts:74` | "A Flying-resistant Lead or damage reduction; this Fly gives it no turn out of reach." | "A Flying-resistant Lead or damage reduction." |
| `league.ts:55`, `region.ts:534, 1017` | "…; the move keeps its recoil." | Cut the clause |
| `league.ts:68`, `region.ts:532, 989`, scenario gym-sabrina-rule | "…; keep its Attack drops in place." | Cut the clause |
| `region.ts:530, 810` | "Ground immunity or Electric resistance; the signature overrides neither." | Cut the clause |
| `region.ts:531` | "…; its recoil follows the damage, not an automatic self-KO." | Cut the clause |
| `league.ts:105`, `region.ts:529, 796` | "…; its own self-Confusion still follows." / "the move keeps its own self-Confusion drawback" | Cut the clause |
| `region.ts:434, 524, 533, 1003` | "…or finish the ace before Resolution." | "…or finish the ace first." ("Resolution" is a phase name the player never sees) |
| scenarios wild-boss-3phase, ace-phases | "…; natural Sturdy is shown on its own." | Cut |
| `strings.ts:84` crit pace | "Pace from the species' Speed {n} — the level on the card does not count." | "Pace from the species' Speed {n}." |
| `strings.ts:453` Ice Armour rule | "At each Intent phase her Lead's ice armour…" | "Every turn her Lead's ice armour…" |

## 6. Flourishes — aphorisms, "not X, but Y", two-beat punchlines

These are the clearest AI fingerprint in the game. The species-path lines that work name the change ("The
scratch grows into a slash, and the claws learn to drill."; Eevee's "Fire. The heaviest Attack of the three, up
close."); the ones below say a mood the card already shows.

**Species paths** (`species.json`, shown on the evolution choice):

| Path | Text | Proposal |
|---|---|---|
| ivysaur-support | "The bulb is a supply line, not a weapon. Softens whoever your Lead has to face." | "Softens whoever your Lead has to face." |
| venusaur-vanguard | "The flower is a siege engine. Everything is heavy and everything is close." | "Heavy, close and slow." |
| venusaur-specialist | "Reach, and then more reach — up to the four-AP one nothing survives." | "Ranged from the bench, up to a 4-AP finisher." |
| charizard-vanguard | "Stops being a Fire type in a fight and starts being a dragon." | "Trades Fire for Dragon moves, up close." |
| blastoise-specialist | "Never moves. Never has to — the whole enemy line is in range." | "Hits the whole enemy line from the bench." |
| pidgeot-specialist | "Owns the air." | "Ranged Flying hits from the bench." |
| golbat-vanguard | "Feeds on the fight." | "Drains HP with every hit." |
| gloom-specialist | "Stops pretending to be a Grass type." | "Poison first: its moves leave Poison." |
| machamp-vanguard | "Four arms, one plan." | "All Melee, all power." |
| machoke-vanguard | "Pure forward pressure — and it hits harder for every scrape it is carrying." | "Hits harder for every Trauma it carries." |
| golem-support | "Sits down in the Lead slot and refuses to be a problem the team has to solve." | "A Lead that does not fall." |
| gyarados-vanguard | "The joke ends here. Everything that was flailing becomes a bite." | "Splash and Tackle become Bite and heavier hits." |
| gyarados-specialist | "Rises as weather, and opens with a Dragon the chart has no answer to." | "Sets Rain and opens with a Dragon move." |
| raticate-vanguard / -specialist | "Bites once, hard." · "Fights dirty and never where you expect." | Name the moves it gains |

**Tooltips and strings:**

| Where | Text | Proposal |
|---|---|---|
| `tips.tsx:985` flee toll | "Cheaper than a wipe, dearer than a win." | Cut |
| `tips.tsx:1380` Game Corner | "…they turn money you cannot use into a chance at something you can." | Cut the clause |
| `tips.tsx:1403` slots | "Three reels, and one dream: three {face}s pay ×{n}." | "Three {face}s pay ×{n}." |
| `tips.tsx:1547` | "The house edge is real." | Cut (the return % is on the line above) |
| `tips.tsx:1489` Metronome | "…from all ten Battlefields — it cuts both ways." | "…from all ten Battlefields, for both sides." |
| `tips.tsx:1334` tutor | "…— the kind it would never learn by levelling — … and no longer holds: the Dojo remembers." | "Moves off this stage's learnset, and every move its line learned on the way here and no longer holds." |
| `tips.tsx:1467` Legendary | "…a Legendary takes two of the three places: strong, and one body to lose." | Cut after "places" |
| `tips.tsx:1071` Team | "…The sheet is the Pokémon: its stats as its next fight fields them…" (61 words) | Split: formation rule (one line) · sheet contents (its own tip) |
| `StarterSelect.tsx:324` | "…it sets a direction, it does not decide the build." | Cut the clause |
| `StarterSelect.tsx:245` | "There is no easier setting — the baseline is the floor." | "There is no easier setting." |
| `SpeciesSheet.tsx:143` | "Enemies your copies finished — the blow, not the burn." | "Enemies your copies knocked out with a hit." |
| `strings.ts:1222` Rare row | "A real find. The starters, the fossils and the giants hide in this row." | "Starters, fossils and the giants." |
| `PokeMart.tsx:32, 34` starters | "Three cards and a prayer until Gyarados; a monster after." · "The iconic pick, ranged-leaning." | "Weak until it evolves into Gyarados." · "Ranged-leaning. Starts holding a Light Ball." |
| `HowToPlay.tsx:50, 69` | "…and that choice is what makes the run yours." · "…so it is the map or nowhere." | Cut both clauses |
| `sim/meta/cosmetics.ts:25-32` titles | "For the one who reads the intents before the fight." ×8 pattern; "Rock-solid, in every sense." | Say how it was earned ("Win 10 fights with no hidden intent") or nothing |
| `sim/meta/journal.ts:59` | "Do a thing once. The relic that carries the deed is yours." | "One deed, one relic." |
| `tms.json` tm04, tm05, tm07 | "…leaves a Burn behind it more often than it looks." · "The only Cleave most Water types will ever hold." · "Expensive, and worth it against a wide team." | The template the other 63 TMs use |
| Late trainer lines (`region.ts:704, 725, 907, 913, 923, 925`) | "Only one Pokémon. It is the only one I need." · "The plant never sleeps. Neither do I." · "Two Pokémon, both at their best. That is all an Ace needs." · "This mountain was here before you. So were we." | Low priority (dialogue is flavour); rewrite a few so not every Ace speaks in two-beat aphorisms |

## 7. Reassurance, praise and moralising — cut

| Where | Text |
|---|---|
| `strings.ts:737` Center | "Your Box is in better shape than most that get this far." (keep "Nobody is carrying Trauma.") |
| `strings.ts:582` defeat | "Your team, and everything you learned." |
| `strings.ts:1133` Safari | "One or two catches is a good day." |
| `strings.ts:1112` Safari | "— but it is one no route will ever offer you." |
| `tips.tsx:614` AP | "…so a turn that ends with points left is a turn that did less than it could." |
| `sim/meta/account.ts:162` | "Yours for every run, no slot needed." |
| `sim/meta/rank.ts:26` | "The lobby as you find it." |
| `tips.tsx:126` | "Both types counted together: what a hit actually does." → "Both types counted together." |

## 8. Label + restatement, and interface narration — shorten

| Where | Text | Proposal |
|---|---|---|
| `tips.tsx:48` | "Cleared · this stop is already behind you" | "Cleared" |
| `tips.tsx:50` | "Off your route · this branch is no longer reachable" | "Off your route" |
| `tips.tsx:52, 54` | "…Inspect the cart before you spend." · "…Inspect the available upgrades and prices before choosing." | Cut the second sentence |
| `strings.ts:938` shop | "Everything on sale here in one list, the Poké Balls with it — and the clerk buys held items back." | "Everything on sale. The clerk buys held items back." |
| `strings.ts:943` | "A stone someone in your Box can use to evolve — when there is one." | "A stone someone in your Box can use." |
| `strings.ts:945-947` relic shelves | "small, steady edges" · "Dearer relics that bend a rule or reward a plan." · "the best the store sells" | "Common relics." · "Uncommon relics." · "Rare relics." (the shelf title already says it — cut the blurbs) |
| `strings.ts:1596` road tip | "…and a purse of Tokens with it. Click a stop to read it." | Cut "Click a stop to read it." |
| `strings.ts:529` phase | "Its opening phase: no phase effect yet." | "No phase effect yet." |
| `relics.json` phoenix-feather | "…The feather regrows with each new Region." | Cut (restates "Once per Region") |
| `consumables.json` master-ball, revive | "…cannot fail: the ball holds whatever it is thrown at." · "…The only revival there is inside a fight." | "A catch that cannot fail." · cut the second sentence |
| Jargon "joins the world" / "is in the world now" | `strings.ts:1518, 1575, 1576, 1593`, `journal.ts:104`, `tips.tsx:918` | "can now turn up in a run" |
| `PcTerminal.tsx:72` Pokédex tip | 74 words, three em dashes: silhouettes, pips, the sheet, sparkles and the Bond rules in one paragraph | One line per mark on the grid: "Silhouette: not met yet. Pips: the line's Bond. ✦: caught shiny." and the Bond rules in their own tip |
| `SpeciesSheet.tsx:148` shiny tip | "…your collection; one is enough to show its palette here. … they are rare, and the line's Shiny Charm makes them less so." | "Shinies of it that joined your Box. Met {n} times." |

## 9. Combat log — two tutorials and a jargon line

| Where | Text | Proposal |
|---|---|---|
| `reducer.ts:352` | "{name} broke free! (x% — weaken it, or status it, and try again)" | "{name} broke free!" — the series' four failure lines are already in `strings.ts:177`; the odds are on the picker |
| `phases.ts:55` | "{name} entrenches — race the wall." | "{name} digs in!" |
| `reducer.ts:370` AP sources | " — Quick swap discount n", " — swap ladder n" | Fine in the AP breakdown; check they never reach the log |

## 10. What is clean and should stay

- **What's new**: short, technical, one line per point, as the release doctrine asks (only the duplicates above).
- **Rejections** (`REJECT_TEXT`), **errors** and **empty states**: one line, the reason and the way out.
- **Gym rule texts** (`strings.ts:431-455`): rule, then one counterplay line ("Chip the wall: multi-hits, Burn
  and Poison."). The model for every boss line.
- **Disruption and keyword texts** (`strings.ts:1342-1503`): dense, but every clause is a rule the player needs.
- **Mystery events, legendary arrivals, trainer greetings, battle log, Badge and stone flavour**: the game's own
  voice, series-faithful (pillar 5). Not slop.
- **Abilities, relics, held items, region modifiers**: one sentence, number first. The house style at its best.

---

## Screens (measured, `npm run ui:audit -- --all`)

101 of 101 captures complete, no measured blockers (report: `playtest/ui-audit/report.md`, local).

**The screens themselves are not where the slop is.** D1 holds almost everywhere: the only block over 120
characters on a base screen is the About disclaimer (186 chars — legal text, keep); the 137-char block the audit
flags on every combat screen is the screen-reader instruction (`CombatScreen.tsx:514`, `sr-only`, keep). The
copy problems in this report live one hover away, in the tooltips, and on the cards.

| Most text on screen | Chars | Note |
|---|---:|---|
| `changelog` | 2 821 | It is the content (What's new) |
| `hub-pc-eevee-line`, `hub-pc-kadabra-line`, `hub-pc-kit` | 2 589–2 724 | Pokédex sheet tabs: data rows, not prose; fine |
| `hub-pc-sheet` | 1 651 | Record tab: 12 stat tiles + the Familiar footer, which repeats the rule its InfoDot explains (§4) |
| `shop`, `store` | 1 102 / 805 | Item rows; the per-shelf blurbs are the slop (§8) |
| `move-reminder` | 1 021 | Move rows; fine |
| `combat-*` | 587–769 | Mostly card text: "Deals damage." on most cards (§1) |

Looked at directly: `combat-gym`, `team`, `move-reminder`, `shop`, `hub-pc-sheet`, `hub-pc-eevee-line` (720p).
Also visible on the map's top bar: "Column 1 of 20 · seed 7" — the seed is a roguelike convention and can stay.

## Apply order (recommended)

1. **Bugs and the card text** (§1): TM articles, the two false "nothing hidden" sentences, the Confusion hint,
   spelling and naming drift, and "Deals damage." off the cards. Small, safe, the most player-visible.
2. **Dev leaks** (§2): dormant today, so zero risk now and a guard for later.
3. **Counterplay lines** (§5) and **repetition** (§4): the bulk of the reading load in fights.
4. **Flourishes** (§6–8): tooltips first, then species paths (a content pass: catalogue row + JSON).
5. Leave trainer dialogue and event scenes unless the user wants a voice pass.

After each step: `npm run check`, `npm run shot`, the `ui-review` skill (copy is UI).
