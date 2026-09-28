# Changelog

> What each version of Pokémon Ascendant added, newest first, as short technical notes. **The game reads this
> file**: the *What's new* screen (the version pill on the main menu) is built from it, so an entry here is an
> entry in the game. Versions, where else they are stamped, and how to write an entry:
> [`docs/release-doctrine.md`](docs/release-doctrine.md). `npm run check:version` proves they all agree.
>
> Shape the parser reads: `## vX.Y — Name · YYYY-MM-DD` (or `· in progress`) for a version on the roadmap,
> `### vX.Y.Z — Name · YYYY-MM-DD` for a point version under it, one short line of lede, then 2–4
> `- **Headline.** A few words.` bullets. Every change ships as a version; there is no unreleased block.

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
