# Changelog

> What each version of Pokémon Ascendant added, newest first, as short technical notes. **The game reads this
> file**: the *What's new* screen (the version pill on the main menu) is built from it, so an entry here is an
> entry in the game. Versions, where else they are stamped, and how to write an entry:
> [`docs/release-doctrine.md`](docs/release-doctrine.md). `npm run check:version` proves they all agree.
>
> Shape the parser reads: `## vX.Y — Name · YYYY-MM-DD` (or `· in progress`) for a version on the roadmap,
> `### vX.Y.Z — Name · YYYY-MM-DD` for a point version under it, one short line of lede, then 2–4
> `- **Headline.** A few words.` bullets. Every change ships as a version; there is no unreleased block.

## v0.9 — The long game · in progress

The account's systems revisited, and the road to the Champion.

### v0.9.10 — Combat, stats and moves, revisited · 2026-10-09

Whole Pokémon in groups, stats in the series' proportions, many more moves.

- **Groups.** Behind the Lead, whole Pokémon: no role, full HP.
- **Stats.** Each grows with its base: Gyarados big, Magikarp not.
- **Moves.** 46 TMs, a Dojo that remembers, Porygon fixed.
- **Fixes.** Swaps, the catch, the faint, Shell Armor; fewer relics.

### v0.9.9 — The Hub's books, and the Master Ball · 2026-10-09

A Pokédex with every evolution path, an Item Guide, and leaner run options.

- **Pokédex.** Each path's stats, moves learned and forgotten.
- **Item Guide.** Every relic and item, on the lobby's table.
- **Master Ball.** An item now, never sold; the charm is gone.
- **Run start.** Region Modifiers off; two starters, two places.

### v0.9.8 — Regions that scale, rarity announced · 2026-10-08

Each Region grows with the player; a wild fight says how rare it is.

- **Route 1, first forms.** No last evolution in its grass.
- **Evolved by level.** Every trainer and Gym, Region 1's too.
- **Rarity banner.** Common, Uncommon or Rare! as the fight opens.
- **Re-tuned.** Gyms' Attack eased for their evolved teams.

### v0.9.7 — Wild Areas, the whole Pokédex · 2026-10-08

Every Pokémon lives on a route; a Wild Area rolls who waits.

- **The whole Pokédex.** 146 species placed, by Region strength.
- **Rarity rows.** Common 60 %, Uncommon 30 %, Rare 10 %.
- **Rolled on entry.** The Lens and the Lure move the shown odds.
- **Re-tuned.** Enemy Attack per Region, for stronger recruits.

### v0.9.6 — Evolution, rewards and types, polished · 2026-10-08

The evolution animated, clearer rewards, and type charts at a glance.

- **Evolution.** The series' animation; each path leans the stats.
- **Rewards.** Stat gains, new moves and Bond unlocks, as chips.
- **Progress.** Medals and discoveries listed, and a panel for the rest.
- **Type charts.** Attacking and defending apart, ×4 down to ×0.

### v0.9.5 — Moves and kits, revamped · 2026-10-08

Every move is a Gen I move, and an evolution rewrites the kit, not grows it.

- **Gen I moves.** Real names and types; power and cost re-cut.
- **Leaner kits.** Four moves by level, five after evolving.
- **Branches swap.** A final evolution trades cards for its signature.
- **Mastery.** A Gen I move, then its + and its ++.

### v0.9.4 — The catch, faithful · 2026-10-08

The catch and the faint, played the way the series plays them.

- **Shake checks.** Four checks: three wobbles, then the click.
- **Slower catch.** Each check lights up; a break can come at any wobble.
- **The faint.** The fallen sink from view and never blink back.
- **Trainer's balls.** Back to the trainer's hand, and thrown from it.

### v0.9.3 — The arena, animated · 2026-10-07

The catch, the send-out, the recall and the faint, played out in the arena.

- **The catch.** Throw, wobbles by the odds, then the click or the burst.
- **Send-out.** Pokémon come out of their ball; wild ones step in.
- **Faint and recall.** The fallen drop; a trainer's go back to the ball.
- **Waits for it.** The outcome, hand and log wait for the beat to end.

### v0.9.2 — The Hub and the Poké Mart, revamped · 2026-10-07

The Hub is a place, leftover ₽ becomes Tokens, and every shelf opens early.

- **The Hub.** The Indigo Plateau lobby: Mart, nurse, PC and the League door.
- **₽ to Tokens.** A run's leftover ₽ becomes Tokens: 200 ₽ each, up to 5.
- **Shelves.** All open by about the tenth run; the whole shop in about sixty.
- **Discovered, not sold.** Tier-2 relics are only found by playing.

### v0.9.1 — Bond and Shiny, revamped · 2026-10-06

Shinies found in the wild; Bond in four equal ranks; every Mastery whole.

- **Shiny.** Any wild Pokémon may be shiny, by surprise; catch it to keep it.
- **Bond.** Four ranks of 100: Charm, hidden ability, Mastery, start a run.
- **Starters.** A starter line's top rank makes its starter always shiny.
- **Mastery.** 45 new Lv2 and Lv3 cards: every recruitable line complete.

## v0.8 — Multi-enemy & the route · 2026-10-05

Group fights, field effects, a reworked route and a balanced run.

- **Group fights.** Up to three enemies; cards dragged onto a target.
- **Enemy turns.** Honest intents, acting twice, calling for help.
- **Fields.** Ten Battlefields; every Gym lays its own.
- **The route.** 20 columns left to right, painted from FRLG tiles.
- **Supplies.** Consumables are spent; relics are rarer.
- **Balance.** Harder hits, Gyms at five, tuned over 720 runs.

### v0.8.10 — Growth curves · 2026-10-05

The balance report measures relics and XP; the level bands fixed to match.

- **Relics.** ~2.5 a Region, ~11 at a won run's end; by source and rarity.
- **Levels.** What each fight pays, and the team's level gap column by column.
- **Bands.** Regions 2 and 3 two levels up; the team stays one or two over.
- **Curve.** Enemy HP pays for it: 60 / 58 / 48 %, run 17 %.

### v0.8.9 — The harness, honest · 2026-10-05

The balance harness plays like a player; the curve re-read, Region 1 retuned.

- **Reads the intents.** Swaps in whoever takes half of a big telegraphed hit.
- **Control and raises.** Sleeps or paralyses the foe that will last; raises in long fights.
- **Reads the cards.** Takes the strongest Reflection, not the first.
- **Curve.** The old harness read 4 points low; now 60 / 60 / 50 %, run 18 %.

### v0.8.8 — The balance pass · 2026-10-05

Enemies hit harder and fall faster; the run tuned over 720 runs.

- **Harder hits.** Enemies deal ~1/6 of Max HP a hit; fights last 4–5 turns.
- **Gyms at five.** Five Pokémon, two at a time, hitting harder than their Region.
- **The Ring.** Rivals hit harder; the first rung is won about half the time.
- **Curve.** Region 2 ~56 %, Region 3 ~53 %, the whole run ~17 %.

### v0.8.7 — Routes, revamped · 2026-10-04

A wider route, walked left to right, painted from FireRed tiles.

- **Horizontal map.** 20 columns that scroll; a strip shows the whole route.
- **Tracks and a Y.** Paths cross, split and merge; a river is the point of no return.
- **Gym grounds.** Each lane wears its Gym's terrain and its own field.
- **Six new fields.** Hail, Grassy, Psychic, Misty, Toxic Spikes, Sticky Web.

### v0.8.6 — Consumables that are spent, scarcer relics · 2026-09-30

Consumables used up, rarer relics, group roles, hidden rosters, less XP.

- **Consumables are spent.** A Bag, 2 a turn; heals and cures usable between fights.
- **Catching.** Great and Ultra Balls, higher odds, a ball picker on the catch %.
- **Scarcer relics.** Trainers 15 % Common; Elite pick of 3; each relic bought costs +25 %.
- **Groups.** Cover; hidden rosters; "As Lead" damage; far less XP; type tips fixed.

### v0.8.5 — More group fights, one combat grammar · 2026-09-30

Many more group fights, and one combat view for one enemy or three.

- **Bigger teams.** Trainers carry 3 Pokémon; Elites and Gyms 4, two at a time.
- **More groups.** Packs up to 50 % of wild nodes; trainers two or three at once.
- **Social species.** Rattata, Zubat, Nidoran and others always call for help.
- **One combat view.** A single enemy shows like a group; numbers on the panels.

### v0.8.4 — Field effects · 2026-09-30

Sun, Rain, Electric Terrain, Sandstorm and Home Fields.

- **Battlefields.** Lane biomes set Sun, Rain, Electric Terrain or Sandstorm.
- **Home Fields.** Gym Leaders and Elites boost their own type ×1.2.
- **Field abilities.** Swift Swim, Chlorophyll and Cloud Nine work.
- **Defog.** New consumable that clears every field.

### v0.8.3 — Groups across the run · 2026-09-29

Group fights placed on every route, more in later Regions.

- **Wild packs and callers.** Wild nodes can be packs or Pokémon that call for help.
- **Trainer pairs.** Trainers with two or more Pokémon can send two at once.
- **Elite support.** From Region 2 the Elite Trainer fights with a support.
- **Preview.** A node's preview card names its fight's shape.

### v0.8.2 — Acting twice and calling for help · 2026-09-29

Enemies with two actions a turn, and enemies that call companions.

- **Two actions.** Some Pokémon declare two intents a turn; both are shown.
- **Call for Help.** A telegraphed intent names the companion who joins as a support.
- **Called companions.** They telegraph before acting and count for XP.

### v0.8.1 — Multi-enemy fights · 2026-09-29

Fights against two or three enemies at once.

- **Enemy groups.** A Lead and 1–2 supports: Healer, Buffer, Debuffer, Attacker.
- **Targeting.** Drag a card onto an enemy; Melee reaches only the enemy Lead.
- **Per-target damage.** Every enemy shows the card's own number; area moves hit all.
- **Exact intents.** Intent damage is the real hit; incoming hits shown on each portrait.

## v0.7 — Cities & Regions 2–3 · 2026-09-28

Regions 2–3 and a City between each Region.

- **Regions 2 and 3.** New biomes, wild tables, trainers and 8 Gyms.
- **Cities.** Pallet Town and Celadon City between Regions.
- **City services.** Mart, Department Store, Dojos, Centers, Ring, Safari.
- **Game Corner.** Roulette and slots with printed odds.
- **Full Gen I roster.** All 151 species implemented.

### v0.7.12 — Nurse back button and technical changelog · 2026-09-29

Field nurse back button.

- **Field nurse.** Leaves by the corner back button.

### v0.7.11 — Shop clerks and back buttons · 2026-09-29

Shop clerk panel and one back button for every building.

- **Shop clerk.** Buy/Sell panel with all stock of the shop or floor.
- **Shelf highlight.** Multi-piece shelves outlined as one shape.
- **Back button.** One corner arrow in every building's header.
- **Room exits.** Shop and Game Corner floor exits lead to town.

### v0.7.10 — Poké Mart and Department Store rooms · 2026-09-28

Shops rebuilt on original FRLG maps.

- **Original art imported.** FRLG Poké Mart and Celadon Store maps.
- **Shelf categories.** Medicine, TMs, relics, held items, stones.
- **Department Store.** One room per floor, 1F–5F.

### v0.7.9 — Daycare, PC Box and egg moves · 2026-09-28

Last in-development City services implemented.

- **Daycare.** +1 level for 200 ₽; the Pokémon skips the next fight.
- **PC Box.** Team, Lead and moves editable in the Center.
- **Egg moves.** New Dojo counter: up to 3 per line, 250 ₽.

### v0.7.8 — Game Corner machines · 2026-09-28

Roulette rules and slot animation reworked.

- **Roulette.** European wheel: red/black ×2, green ×36.
- **Slots.** Animated reels that stop left to right.
- **Ring.** Full heal on exit; how-to-play guide added.

### v0.7.7 — Ring, Coliseum and Team Rocket · 2026-09-25

Ring buildings and a hidden area.

- **Ring and Coliseum.** Standalone buildings; ladder shown before the fee.
- **Leave confirmation.** Ring, Safari and Black Market ask first.
- **Safari art.** FRLG tiles and new bait and rock sprites.
- **Team Rocket.** A hidden area in Celadon.

### v0.7.6 — Safari Zone · 2026-09-24

New catching minigame in both Cities.

- **Safari Zone.** Stealth catching with Safari Balls and a turn clock.
- **Exclusive species.** Pokémon not found on any route.
- **Tutorial.** Six-page guide on the first visit.

### v0.7.5 — Pending systems and balance fixes · 2026-09-24

Systems left pending by Regions 2–3, and two fixes.

- **Evolution stones.** Five stones for early evolution.
- **Fixes.** Sleep can't be reapplied; drain heals 50 % of damage.
- **Trainer's Instinct.** Shows enemy intents one turn ahead.
- **Mastery moves.** Added for every recruitable line.

### v0.7.4 — Region 3 · 2026-09-23

Region 3 content.

- **Region 3.** Volcanic Highlands biomes, wild tables and trainers.
- **Gyms.** Sabrina, Giovanni, Kiyo and Lorelei.
- **Species data.** All 151 Gen I species implemented.
- **What's new screen.** In-game changelog viewer.

### v0.7.3 — Region 2 · 2026-09-23

Region 2 content.

- **Region 2.** Coastal Cliffs biomes, wild tables and trainers.
- **New species.** 26 lines added with evolutions.
- **Gyms.** Blaine, Erika, Surge and Koga.
- **Pikachu.** New starter in the Hub Poké Mart.

### v0.7.2 — Celadon City · 2026-09-23

Second City.

- **Celadon City.** Second City, after Region 2.
- **Department Store.** Five floors; re-roll per floor.
- **Game Corner.** Roulette and slots with printed odds.

### v0.7.1 — Multi-Region runs · 2026-09-22

Runs continue past the first Gym.

- **Three Regions.** A run ends at the third Gym.
- **Pallet Town.** City between Regions 1 and 2.
- **Status persistence.** Statuses carry between fights.

## v0.6 — Meta · 2026-09-21

Account progression between runs.

- **Account level.** Trainer XP earned in every run.
- **Trainer Hub.** Trainer Card, PC Terminal, Poké Mart, Daycare Lady.
- **Pokédex.** Knockouts reveal hidden enemy intents.
- **Starters.** Eevee, Magikarp and Twin Run.
- **Achievements.** 24 medals with unlock conditions.

### v0.6.5 — Pokédex merge · 2026-09-22

Companions folded into the Pokédex.

- **Pokédex.** Companions merged into species sheets.
- **Sort by Bond.** Lines sortable by Bond rank.

### v0.6.4 — PC Terminal · 2026-09-22

PC Terminal redesign.

- **PC Terminal.** Card grid with detail sheets.
- **Species records.** Per-species battle stats.

### v0.6.3 — Hub Poké Mart · 2026-09-21

Account shop and Token rewards.

- **Token rewards.** Every level; new shelves at 3, 5, 8 and 10.
- **Hub Poké Mart.** Cosmetics, starters and Trainer Hub upgrades.

### v0.6.2 — Bond, catching and running · 2026-09-21

Line progression and two combat options.

- **Bond.** Per-line ranks with unlocks.
- **Catch roll.** Chance shown before the throw.
- **Run away.** Paid escape; not allowed in Gyms.

### v0.6.1 — Trainer Hub redesign · 2026-09-21

Trainer Hub layout.

- **Level dial.** Account level shown as a ring.
- **Reward track.** All level rewards on one track.

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
