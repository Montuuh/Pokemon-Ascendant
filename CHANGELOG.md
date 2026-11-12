# Changelog — Beta

> **Pokémon Ascendant is in Beta until v1.0.** Every v0.x build is a Beta build: systems still change between
> versions and a save may be reset when one does.
>
> What each version added, newest first, as short technical notes. **The game reads this file**: the *What's new*
> screen (the version pill on the main menu) is built from it, so an entry here is an entry in the game. Versions,
> where else they are stamped, and how to write an entry: [`docs/release-doctrine.md`](docs/release-doctrine.md).
> `npm run check:version` proves they all agree.
>
> **One entry per theme, not per patch** (the user's call, 2026-11-10): related point versions are gathered under
> the last version of their group, so the list reads as what the game gained rather than as a commit log.
>
> Shape the parser reads: `## vX.Y — Name · YYYY-MM-DD` (or `· in progress`) for a version on the roadmap,
> `### vX.Y.Z — Name · YYYY-MM-DD` for a themed entry under it, one short line of lede, then 2–4
> `- **Headline.** A few words.` bullets. There is no unreleased block.

## v0.9 — The long game · in progress

The Beta's long stretch: the account, the road to the Champion, a FireRed look.

### v0.9.120 — Road to the Plateau · 2026-11-12

The Trainer Hub is a road of five places; a new title screen and new music.

- **Trainer Hub.** Five places that open as your career grows.
- **Title screen.** A summit at dawn, where a party of three evolves.
- **Music and sound.** 26 new tracks and every effect redone.
- **Map and graphics.** A Habitats column; a hardware acceleration notice.

### v0.9.119 — Clear skies · 2026-11-12

Defog holds, a fainted card stays readable, and running is written down.

- **Defog.** A cleared field no longer comes back when a move's turns end.
- **Results.** A fainted Pokémon greys its picture, not its Trauma chip.
- **Running.** League and Ring fights cannot be run from, as the rules say.

### v0.9.117 — Home and after · 2026-11-12

The last text pass: results, the run's end, the Hub and the menus.

- **Run.** A greyed Run button now says why it cannot be pressed.
- **Relics.** Elite and Gauntlet picks show what they really pay.
- **How to play.** AP, types, Ranged and Trauma match the game.
- **Hub.** Mart, Kit, Pokédex and new-run bubbles trimmed.

### v0.9.116 — Team and bag · 2026-11-11

The Team screen, the bag and the item texts, checked against the rules.

- **Speed.** Its bubble names what it does: rhythm and quick swap.
- **Evolution.** The Move Reminder gives an upgraded card back.
- **Relics.** The Gym pick and the empty bag say what they pay.
- **Items.** Defog, Macho Brace and Type Mastery said plainly.

### v0.9.115 — Battle notes · 2026-11-11

Fight bubbles state the rule, and the rule is right.

- **Intents.** Attack, Cleave, buff and call bubbles cut to the fact.
- **Swaps.** The quick-swap rule said once, on the bench portrait.
- **Gym rules.** Advice lines cut where the rule already says it.
- **Fixes.** Steel is immune to Poison; a Ball is spent per throw.

### v0.9.114 — Route signs · 2026-11-11

Map bubbles and node previews: wrong lines fixed, repeats cut.

- **Fixes.** The Elite has four Pokémon; Training is free.
- **One voice.** A node's bubble and its card read the same words.
- **Shorter.** Runner, guard, group and wild-pool lines cut.
- **Signs.** Fork, Region, Victory Road and League bubbles trimmed.

### v0.9.113 — Town talk · 2026-11-11

Every city door, shop, Center, Dojo and park says what it does in fewer words.

- **Doors.** Each building's bubble is one or two lines.
- **Guides.** Ring and Safari guides trimmed; no coaching.
- **Shops.** Shelf, Trader and Mart texts cut to price and rule.
- **Fixes.** Eevee's four evolutions; the Trader's +3 levels on the map.

### v0.9.112 — Trainers speak · 2026-11-11

Trainers say their line as the fight opens, in the series' voice.

- **Opening line.** A trainer's quote holds the battle bar until you act.
- **New voices.** Forty trainer and Elite lines rewritten: short, loud, spoken.
- **Mystery events.** Plainer scenes; every button says what happens.

### v0.9.111 — Plain words · 2026-11-11

Every string in the game read and cut to what a player needs.

- **Cards.** No more "Deals damage."; a plate says what power cannot.
- **Tooltips.** One rule said once, not in every bubble; no developer notes.
- **Bosses.** Each answer line is the counterplay, nothing more.
- **Fixes.** "an ice", honest words on hidden intents, one Defense, one Center.

### v0.9.110 — The trainer's journey · 2026-11-10

The account rebuilt, and reset: every run now ends with something new.

- **Field Report.** A run's end pays out on screen: XP, parcels, Bond, goals.
- **Oak's Parcels.** Some relics, items and TMs start locked; runs open them.
- **A lobby that fills.** Nine ranks, a Badge Case, Bond in six ranks.
- **Kit and Ladder.** Perks packed before a run; ten rungs after a win.

### v0.9.109 — The route, drawn as FireRed · 2026-11-10

The route map is a FireRed route, with more on it than nodes.

- **FireRed routes.** One pixel size, biome chapters, people facing you.
- **Field moves.** Trees, rocks and water close shortcuts until cleared.
- **Ledges and places.** One-way ledges; Mysteries show their place.
- **Gym ground.** A Gym's field covers its whole biome.

### v0.9.106 — Move animations from the GBA · 2026-11-07

Every move plays FireRed's own battle animation.

- **FRLG sprites.** Each move replays its animation, sprite by sprite.
- **On the Pokémon.** Sway, shine and afterimages move its sprite.
- **Bigger effects.** Move sprites drawn at twice the Pokémon's pixel.

### v0.9.101 — Rooms from FRLG tiles · 2026-11-05

Every interior rebuilt from the games' tiles.

- **Rooms.** Shops, Centers, Dojos and the Hub rebuilt from FRLG tiles.
- **Rocket offices.** The Black Market is Team Rocket's offices.

### v0.9.99 — The series' numbers · 2026-11-04

Stats, damage and relics rebalanced on the games' formulas.

- **Gen III formulas.** Stats and damage follow the games.
- **Honest enemies.** Enemies hit as their species and level say.
- **Softer start.** A third starter move and a sure first catch.
- **Relic rarity.** Rarity matches power; Commons drop most often.

### v0.9.92 — Moves, evolution and enemies, reworked · 2026-11-03

Deeper moves, real evolution methods and smarter enemies.

- **Move keywords.** Guard, heal, weather and delayed hits; AP cap 3.
- **Real evolution.** Series levels, stones, Friendship and trades.
- **Growing learnsets.** Every stage learns its own moves.
- **Enemy intent.** Larger kits, disruption and combos.

### v0.9.88 — Readable bosses, clearer choices · 2026-11-02

Gym teams authored, boss phases explained, more choices in town.

- **Gym teams.** Every Leader fields five authored Pokémon.
- **Boss phases.** Announced, kept on screen and explained.
- **Choices.** Postpone an evolution; choose when the Center heals.
- **Equipment.** More useful held items; status control with limits.

### v0.9.84 — Dark and Steel · 2026-10-29

Two new types and the evolutions, moves and items that carry them.

- **17 types.** Dark and Steel join the Gen II chart.
- **Four evolutions.** Umbreon, Scizor, Steelix and Magnezone.
- **Moves and items.** 14 moves, six TMs, Gems and Plates.

### v0.9.83 — Critical rhythm · 2026-10-29

Speed sets how often a Pokémon crits, and the card says so.

- **Speed matters.** Speed sets the crit rhythm and prices the swap.
- **By AP.** Your rhythm fills by the AP your cards cost.
- **Readable.** A dial, and one ✦ on every card that will crit.
- **Apex Reveal.** Region 3 names Victory Road's Legendary.

### v0.9.79 — The pixel-art pass · 2026-10-28

Rooms, scenes, arenas and type redrawn in classic pixel art.

- **Interiors.** Dojo, Center, Summit and League as pixel rooms.
- **Event scenes.** Mystery Events illustrated; items in native pixels.
- **Arenas.** Distinct battle backdrops and Victory Road caves.
- **Clarity.** Pixel typography, readable labels, 720p layouts.

### v0.9.68 — Motion and feedback · 2026-10-27

Combat feedback weighed by the event; results on one screen.

- **Hits with weight.** Hit-stop, draining HP bars, contact frames.
- **Fight results.** A fight ends on its own stage, in one click.
- **Motion setting.** Reduced or full, whatever the device says.

### v0.9.31 — Wild Areas and the Team screen · 2026-10-22

Habitats on the route, one Team screen, and the Gen II chart.

- **Wild Areas.** Habitats that show where they are and who lives there.
- **Team screen.** One screen on the route and in the towns.
- **Seen, not told.** The Center heals ball by ball; finds on a reel.
- **Type chart.** Rebalanced with Generation II effectiveness.

### v0.9.24 — Sound and move animations · 2026-10-18

The game has sound, and every move is animated.

- **Sound.** Every effect and song synthesised as it plays.
- **Move animations.** Every move animated from user to target.

### v0.9.22 — Victory Road and the League · 2026-10-16

The end of the run: one last climb, then the Champion.

- **Victory Road.** Gauntlet, Apex Pokémon, Training Grounds, Summit.
- **Legendaries.** Articuno, Zapdos, Moltres, Mewtwo and Mew.
- **The League.** The Elite Four, then the Champion.

### v0.9.19 — New screens, new fights · 2026-10-15

The map, combat and title redrawn; fights with other goals.

- **Gym rules.** Every Leader fights under a rule of its own.
- **Map and combat.** Straight routes; cards played onto targets.
- **Objectives.** Fights won by something other than knockouts.
- **Trader.** Swap a Pokémon for a face-down offer.

### v0.9.12 — Combat, stats and moves, revisited · 2026-10-09

Whole Pokémon, series proportions and many more moves.

- **Whole enemies.** Enemies fight on their whole HP.
- **Double intent.** Some enemies act twice; you can break it.
- **Learnsets.** Evolved Pokémon learn their line's moves by level.

### v0.9.9 — Wild Areas and the Hub's books · 2026-10-09

Every Pokémon lives on a route, and the Hub explains the game.

- **Wild Areas.** Every species has a route; areas roll who waits.
- **Scaling Regions.** Each Region grows with the player.
- **Hub books.** Every evolution path in the Pokédex; an Item Guide.
- **Master Ball.** The Master Ball Charm becomes a ball.

### v0.9.6 — The arena, animated · 2026-10-08

The catch, the faint and the evolution played as the series does.

- **Arena beats.** Catch, send-out, recall and faint, animated.
- **Gen I kits.** Every move is Gen I; evolution rewrites the kit.
- **Evolution.** The evolution animated; clearer rewards.

### v0.9.2 — Bond, Shiny and the Hub · 2026-10-07

The account's systems revisited.

- **Shinies.** Found in the wild and kept through the run.
- **Bond.** Four equal ranks; the whole Mastery Move at once.
- **The Hub.** A room, not a menu; leftover ₽ becomes Tokens.

## v0.8 — Multi-enemy & the route · 2026-10-05

Group fights, field effects, a reworked route and a balanced run.

- **Group fights.** Up to three enemies; cards dragged onto a target.
- **Enemy turns.** Honest intents, acting twice, calling for help.
- **Fields.** Ten Battlefields; every Gym lays its own.
- **The route.** 20 columns left to right, painted from FRLG tiles.
- **Supplies.** Consumables are spent; relics are rarer.
- **Balance.** Harder hits, Gyms at five, tuned over 720 runs.

### v0.8.10 — The balance pass · 2026-10-05

The run tuned with a harness that plays like a player.

- **Balance.** Enemies hit harder and fall faster, over 720 runs.
- **Harness.** The auto-player plays like a player; Region 1 retuned.
- **Growth.** Level bands fixed; relics and XP measured.

### v0.8.7 — Routes and supplies · 2026-10-04

A wider route and an economy with real scarcity.

- **Routes.** 20 columns walked left to right, on FireRed tiles.
- **Supplies.** Consumables are used up; relics are rarer.

### v0.8.5 — Group fights and fields · 2026-09-30

Fights against several enemies, under weather and terrain.

- **Groups.** Two or three enemies at once, on every route.
- **Enemy turns.** Two actions a turn; calling companions.
- **Fields.** Sun, Rain, Electric Terrain, Sandstorm, Home Fields.

## v0.7 — Cities & Regions 2–3 · 2026-09-28

Regions 2–3 and a City between each Region.

- **Regions 2 and 3.** New biomes, wild tables, trainers and 8 Gyms.
- **Cities.** Pallet Town and Celadon City between Regions.
- **City services.** Mart, Department Store, Dojos, Centers, Ring, Safari.
- **Game Corner.** Roulette and slots with printed odds.
- **Full Gen I roster.** All 151 species implemented.

### v0.7.12 — City services · 2026-09-29

Shops on original maps and the last City services.

- **Shops.** Poké Mart and Department Store on FRLG maps.
- **Daycare and PC Box.** Egg moves and Box management.
- **Navigation.** One back button for every building.

### v0.7.8 — Safari, Ring and Game Corner · 2026-09-28

Three places to gamble a run on.

- **Safari Zone.** A catching minigame in both Cities.
- **Ring and Coliseum.** Ring buildings and a hidden area.
- **Game Corner.** Roulette and slots reworked.

### v0.7.5 — Regions 2 and 3 · 2026-09-24

Two more Regions and the systems they needed.

- **Region 2.** Coastal biomes, wild tables, trainers and Gyms.
- **Region 3.** Volcanic biomes, wild tables, trainers and Gyms.
- **Pending systems.** Evolution Items, Light Ball, Stone Cache.

### v0.7.2 — Multi-Region runs · 2026-09-23

Runs continue past the first Gym, through a City.

- **Three Regions.** A run crosses three Regions.
- **Cities.** Pallet Town and Celadon City between Regions.

## v0.6 — Meta · 2026-09-21

Account progression between runs.

- **Account level.** Trainer XP earned in every run.
- **Trainer Hub.** Trainer Card, PC Terminal, Poké Mart, Daycare Lady.
- **Pokédex.** Knockouts reveal hidden enemy intents.
- **Starters.** Eevee, Magikarp and Twin Run.
- **Achievements.** 24 medals with unlock conditions.

### v0.6.5 — The PC Terminal · 2026-09-22

The Pokédex and the PC Terminal redesigned.

- **PC Terminal.** Pokédex and medals as grids of cards.
- **One book.** Companions folded into the Pokédex.

### v0.6.3 — Hub, Mart and Bond · 2026-09-21

The Hub redesigned, a Token shop and line progression.

- **Trainer Hub.** A level dial and a road of rewards.
- **Poké Mart.** The account shop, paid in Tokens.
- **Bond.** A line improves by being played.
- **Catch and run.** Two new combat options.

## v0.5 — Region 1 complete · 2026-09-20

Full Region 1 map and Gyms.

- **Map.** 12 layers and branching paths.
- **Gym fork.** 2 of 4 Gyms per run; lanes never rejoin.
- **Badges.** 4 Gyms, each Badge a run-long bonus.
- **Legendary relics.** 1-of-3 pick after a Gym.
- **Region modifiers.** One optional rule per Region.

## v0.4 — Economy & Relics · 2026-09-20

Currency, items and new node types.

- **Currency.** Poké Dollars from every fight.
- **Items.** 43 relics and 19 held items.
- **Nodes.** Mart, Mystery Event, Elite Trainer, Center.
- **Difficulty modifiers.** 10 opt-in modifiers.

## v0.3 — Identity through Evolution · 2026-09-19

Branching evolution and move management.

- **Branching evolutions.** 2–3 archetypes per evolution.
- **Move pool.** Choose 4 active moves per Pokémon.
- **Dojo and TMs.** Tutor moves and ability swaps.
- **Abilities.** Passive combat effects.

## v0.2 — First Route · 2026-09-19

Route map and run structure.

- **Route map.** Wild, trainer, Center and Gym nodes.
- **Catching and Box.** 6 in the Box, 3 active.
- **XP and evolution.** Team XP with a bench share.
- **Saves.** Resume mid-run and mid-fight.

## v0.1 — Combat Slice · 2026-09-19

Core combat.

- **Shared hand.** 3 Pokémon × 4 moves.
- **Lead and swap.** Swaps cost AP, rising each time.
- **Enemy intents.** Telegraphed target and damage.
- **Boss phases.** A three-phase boss fight.
