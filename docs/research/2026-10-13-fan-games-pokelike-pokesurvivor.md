# Fan-game study — Pokelike and PokéSurvivor (2026-10-13)

> **What this is.** A study of the two Pokémon fan games that are drawing the most attention right now, read for ideas
> Pokémon Ascendant can use, in design and in art. It is research, not canon: nothing here changes a rule until it is
> written into `docs/design/` or placed on `docs/roadmap.md`. Pillar checks use `docs/design/01-overview.md`.
>
> **Method.** *Pokelike* (pokelike.xyz, v3.4.1): played the start of a Kanto Story run (starter, map, a catch node,
> three trainer fights, every node tooltip), read the achievements screen and **every patch note from v1.1
> (2026-03-11) to v3.4.1 (2026-10-03)**. *PokéSurvivor* (pokesurvivor.com, github.com/JPTER78/pokesurvivor): read the
> repo's `GDD.md` (the whole design log) and README, the itch.io page and its feedback thread, a press write-up,
> and played the start of a run (personality test, menu, level-up). Ascendant was read from the v0.9.12 screenshots in
> `playtest/` and the code where a claim needed it.

---

## 1. The short version

**What the two games prove.** Pokelike is a *Pokémon auto-battler roguelike* that grew, in seven months of weekly
patches, into a platform of modes. It then shipped **two deckbuilder modes**: *Catch the Spire* (a weekly challenge) and
*SpireMon* (a permanent mode). Both
landed on the same conclusions Ascendant's canon already holds: enemies telegraph their target and damage, and "the
damage a card shows is the damage a card deals". The audience for *Pokémon × Slay the Spire* is real, and the
best-known Pokémon roguelike is now moving toward it.
PokéSurvivor went viral in days with a *bullet-heaven* and the Mystery Dungeon look. Its most-repeated player
complaint is that 966 Pokémon feel like a dozen, because the moves are samey. That is the opposite bet to
Ascendant's (151 Pokémon, kits by evolution path), and the complaint supports our bet.

**The eight ideas worth taking** (detail and pillar checks in §4):

| # | Idea | From | Lands in |
|---|---|---|---|
| D1 | **A signature rule for every Gym Leader**, shown before the fight | Pokelike (SpireMon) | v1.0 balance pass, or before it |
| D2 | **Legendary arenas**: each Legendary fought on its own field and backdrop | PokéSurvivor (rifts) | v0.9.13 Victory Road |
| D3 | **Hall of Fame**: a won run's team is recorded, with a "share" card | Pokelike | v0.9.14 The League |
| D4 | **A daily seeded route** with a streak and a result grid to share | Pokelike (Pokésort, dailies) | v1.0 |
| D5 | **Fights with another objective**: a Pokémon that flees in N turns, a hold-out | PokéSurvivor (treasure goblins, locked chests) | v1.2 |
| D6 | **Rotating challenge runs** (Nuzlocke, Baby Cup, Monotype…) built on the difficulty modifiers | Pokelike (weeklies) | after v1.0 |
| D7 | **A route Trader**: give one, pick one of three face-down offers that show a type and a level | Pokelike | v1.2 |
| D8 | **Animation speed** (×1 / ×2 / instant) and Space-to-skip on every beat | Pokelike | next polish patch |

| # | Art improvement | Why |
|---|---|---|
| A1 | **Show the Gym Leader and the Elite in their own fight** | The sprite is drawn only when ≤ 1 enemy is on the field, and both always fight two at a time, so the climax fights never show who you are fighting |
| A2 | **Card art shows the move, not its owner** | Five cards from three Pokémon show three faces; two Squirtle cards look the same |
| A3 | **One register for creatures in a run** | The same Squirtle appears twice, 200 px apart: an official-art portrait and a pixel sprite |
| A4 | **Map nodes in full colour; the map stays visible behind a preview** | Grey medallions on a painted map; the preview modal blacks the map out |
| A5 | **No empty cream screens** | Victory, relic picks, evolution and run-over float on an empty field |
| A6 | **Sound** (a synthesised SFX set before v1.1's full audio) | The game is silent; PokéSurvivor ships a full soundtrack with no audio files |
| A7 | **A logo and a living title screen** | The title is plain Baloo 2 type; the official-art Charmander sits on a pixel town |

**What not to copy** (§6): auto-battle, gacha, permanent per-line stat buffs, a 900-species roster, type-count trait
synergies, and ads.

---

## 2. Pokelike

### 2.1 What it is

- **Format.** A browser roguelike. You pick a starter (each Pokémon shows **one move** on its card), then walk a vertical,
  Slay-the-Spire-style lattice of **9 maps per region** to the Gyms, the Elite Four and the Champion. **Battles
  resolve on their own.** The player's decisions are drafting, team order, items, TMs and the route.
- **Nodes**, each drawn as a full-colour sprite with a tooltip that names its reward:
  - Catch (pick 1 of 3, no fight)
  - Wild Battle ("+1 level")
  - Trainer ("Team Rocket Grunt — +2 Levels — Poison/Normal Pokémon")
  - Item
  - Move Tutor
  - Trade ("swap a Pokémon for a mystery one 3 levels higher")
  - Pokémon Center
  - Random Event
  - Legendary and shiny nodes
  - The Gym, whose tooltip lists the leader's team and levels
- **Modes:**
  - Story (Kanto to Unova, Classic or Nuzlocke)
  - Battle Tower (stages unlocked in order, Kanto to Kalos)
  - Endless (Normal / Hardcore)
  - Challenges: a weekly rule-set run (Trick Room, Baby Cup, TM Overdrive, Kanto Fusion, Mega Johto, Hidden Ability)
  - A daily Monotype run
  - *Soul Link*: a two-player co-op Nuzlocke
  - *SpireMon* and *Catch the Spire*: the two deckbuilders
  - **Pokésort**, a daily logic puzzle with a streak
- **Meta:**
  - Pokédollars from clears and achievements
  - A Poké Mart that sells Shiny and Legendary Eggs, and vitamins (permanent EVs per evolution line)
  - Every winning team saved to the **Hall of Fame**
  - Any line you have won with can start a Battle Tower run (the "Hall of Fame PC")
  - Mega Stones earned by being a Challenge run's MVP
  - Cloud sync, 6 languages, dark mode and a PWA install
- **Cadence.** A patch most weeks since March 2026, with long patch notes that name bugs plainly ("a lost fight could be
  fought again by reloading").

### 2.2 Why it works (inferred from play and from what its patches chase)

1. **Zero friction.** No account, no install: three clicks to the map, and a fight takes seconds.
2. **Every node is legible at a glance.** The node *is* its sprite: a trainer is the trainer, a Center is the Center.
   The tooltip names the reward and the type. The boss's team and levels are one hover away.
3. **Reasons to come back that cost no content:**
   - A daily puzzle with a streak, and a **grace day** that is earned back after seven solves.
   - A weekly rule set with a first-clear payout.
   - Achievements that pay.
   - A Hall of Fame.
4. **Variety from rules, not assets.** Most weeklies are a twist on existing content: the slower Pokémon moves first,
   nothing evolves, every move starts at its weakest. The cost is one rule and a page of text.
5. **Collection as a long goal.** "Have every Gen 1 line in your Hall of Fame PC" turns each won run into a stamp.
6. **Design statements worth stealing verbatim.**
   - From the v3.0 Story revamp: *"you should lose runs to decisions, not to a map handing you nothing you can use."*
   - From v3.4: *"Endless is meant to end."* Every effect that scaled with the enemy's max HP was made to fade when
     the team is outlevelled.

### 2.3 Its deckbuilder modes, in detail (closest to Ascendant)

- **Catch the Spire** (v2.8, a weekly):
  - Your Pokémon stop attacking on their own.
  - You start with 10 cards (5 attacks, 5 that halve an incoming hit) and win one more card per fight.
  - The typed cards you are offered depend on how much of that type you field, and **the odds are printed** over
    every offer.
  - Enemies show what they will hit for and whom.
  - No passives and no traits: "the deck is the whole build".
- **SpireMon** (v3.2 weekly, v3.3 permanent):
  - Three lanes a side and 3 Mana a turn.
  - A Pokémon card attacks once as it enters, then its ability fires; at the end of the turn everything attacks in
    Speed order.
  - Deck: 4 owned cards plus 4 caught in the run.
  - A collection that persists, opened in booster packs: hold to tear, the cards fan out face down, tap to flip,
    rarer cards glow, and each card is stamped NEW! or +1 token.
- **Each Gym Leader fights under a signature rule**, shown when you hover the boss on the map:
  - Brock caps every hit at 25 % of max HP.
  - Misty washes your weakest Pokémon back into your deck.
  - Lt. Surge makes your first card each turn cost 1 more.
  - Erika's Pokémon gain 4 levels a turn.
  - Koga drains your field 10 % a turn.
  - Sabrina shuffles a card out of your hand.
  - Blaine lowers your defences with every hit.
  - Giovanni sends in an unstoppable Mewtwo on turn 5.
  - Gary makes each card in a turn cost 1 more than the last.
- **SpireMon Endless** adds a **Sudden Death clock**: from turn 12, the end of each turn takes 25 / 50 / 75 / 100 % of
  each fielded Pokémon's max HP, through Sturdy and Focus Sash. Even a wall nothing can kill must win in time.

### 2.4 Its art

- **One register, end to end.** The creatures are pixel sprites everywhere: the starter cards, the catch cards, the
  map, the battle and the Pokédex. The trainers are their pixel battle sprites. The map nodes are pixel objects
  (Poké Ball, tall grass, TM disc, potion, Center).
- **Retro GBA chrome**, since v1.3's visual rework: cream panels with hard pixel shadows and a pixel display font. The
  logo is a pixel wordmark with a Poké Ball in place of the "O".
- **A scene behind every screen.** Sky, sea and a grass strip in parallax pixel art; per-route map backgrounds; a
  light and a dark theme.
- **Weak spots.**
  - The battle view is two dark panels with small sprites on grass pads. With auto-battle there is little to watch.
  - The text in the pixel font is small and grey on cream.
  - Ads and a consent wall greet a first visit.

---

## 3. PokéSurvivor

### 3.1 What it is

- **Format.** A bullet-heaven in the vein of Vampire Survivors and Survivor.io. You move and your partner attacks on
  its own with the active move (1 of 4, switched with 1–4). A level-up offers **1 of 3 cards with one reroll**.
- **966 Pokémon, all generations**, with Mystery Dungeon sprites from SpriteCollab (CC BY-NC 4.0, 114 artists credited).
  The game makes no network calls to play, uses no build step and no dependencies: vanilla JS on Canvas 2D.
- **Moves.** 52, then 64, in 7 families (projectile, melee, beam, orbs, nova, aura, buff), 5 levels each. **A move
  evolves** when it reaches max level *and* you took its condition upgrade that run (Ember + Power → Flamethrower). It
  arrives as a golden card.
- **Enemies.**
  - Six stat tiers; each run draws a cast of 7 per tier.
  - Each tier has at least two "personalities": healer, shielder, summoner, kamikaze, beam, zones, fan, jumper. Every
    attack is **telegraphed on the ground**.
  - Bosses at minutes 3, 6, 9, 12 and 15.
  - **Rifts** (a 14 % chance every 30 s, from 1:15) open a separate arena, one per type (18), each with its own terrain
    and weather, where you fight that type's **Legendary**.
- **The map.**
  - Power altars (25 s of a buff)
  - Healing springs that run dry and refill
  - Locked chests that open only if you **stand beside them for 3.5 s while being attacked**
  - Traps that hurt enemies too
  - Lava you can lure enemies into
  - Weather events
- **Mid-run events** every 4–5 minutes:
  - A one-type horde
  - A golden hour (double XP and coins)
  - A lost Pokémon to escort; one in five joins you
  - **Treasure goblins**: a Meowth with coins or a Gholdengo with tickets, which flee after 15 s
- **Meta.**
  - Coins buy permanent upgrades per Pokémon.
  - A per-region **gacha** paid in tickets earned in play (never with money), with a pixel slot-machine animation.
  - Shinies: 1/4096 in the wild, with an on-screen arrow pointing to them.
  - Daily and weekly missions, 127 achievements with titles, and a public profile.
  - Leaderboards and co-op for up to 4 players.
- **First launch.** An eight-question **personality test**, as in Mystery Dungeon, picks your partner among 29
  starters; you can decline it.
- **Sound.** All of it is **composed in code**: a Web Audio synthesiser (flute, marimba, bass, drums, reverb), five
  themes and per-move SFX, with no audio files. The README gives the reason: Nintendo's music cannot be used.

### 3.2 What players say

The itch.io page rates it 4.8/5, though from only 5 ratings. The long feedback thread:

- **The roster is wider than it is deep.** "966 playable Pokémon feels pointless": many moves are elemental variants
  of one base, so there are fewer than a dozen distinct movesets. The thread asks for each species' abilities to make
  it unique.
- **Grinding upgrades per Pokémon is tedious.** The thread asks for global boosts and less micromanagement.
- **The thread asks for a friendship or affinity system** that rewards playing a favourite, and lets weaker Pokémon
  catch up.
- **Healer stacks are unkillable.** The thread suggests capping defensive stacks and putting a cooldown on heals.
- **It wants a move dictionary** outside a run, and the gacha animation to be skippable.

### 3.3 Its art

- **Mystery Dungeon sprites with every animation**: idle, walk, attack, shoot, charge, hurt, faint, in 8 directions.
  The sprites are anchored by the feet so that attacks don't jump, and the projectiles fly on the ground plane with
  shadows.
- **Tiles painted from code** in a 16-px pixel grammar. The three biomes cross-fade their palettes over 2.6 s instead of
  cutting.
- **23 attack shapes drawn in pixel art and tinted by each type's palette**: flame, drop, bubble, leaf, bolt,
  crystal, rock, sludge, sting, star, wind, web, wave, crescent, sound, impact, claw, jaws, arrow, orb, shadow ball,
  heart. They have the PMD outline. Beams render as jets, and the enemies' shots carry a red ring on the ground.
- **The same pixel size across the whole UI** (×2). The bosses are drawn at multiples of 0.5, after big legendaries at
  ×1 "looked like another game".
- **No emoji anywhere.** Every icon is drawn as pixel art in code: the type emblem plus a family badge on each move.
  The rarity tiers are the Poké Ball tiers (Poké → Great → Ultra → Luxury → Master), and the shiny mark is the
  games' red star.
- **The menu is the world.** Wild Pokémon wander behind the title and the login. The dialogue boxes are Mystery
  Dungeon's blue boxes.

---

## 4. Design ideas for Ascendant

For each idea: what it would be **here**, how it fits the pillars, what it costs, and where it would land.

### D1 — A signature rule for every Gym Leader ★ recommended

- **What.** The twelve leaders each get one rule. It is printed on the Gym's node and on the fight's top bar, and it is
  the leader's, not the type's. It layers over the per-type Phase 2 (§5.9.4) and the Home Field. The examples are
  written against Ascendant's own mechanics:
  - **Brock**: no hit takes more than a quarter of his Pokémon's max HP, so you race the wall with DoT and multi-hits.
  - **Misty**: at the end of each turn the tide brings your Bench 1 forward, telegraphed as an intent so you plan the
    forced swap.
  - **Lt. Surge**: the first card each turn costs +1 AP.
  - **Erika**: her Lead heals 5 % of its max HP each turn while it is unhurt that turn.
  - **Sabrina**: one named card leaves your hand each turn.
  - **Blaine**: every hit lowers the target's Defence one stage.
  - **Giovanni**: an Earthquake every third turn hits every slot.
  - **Lorelei**: a Freeze holds until a Fire move or a swap.
- **Why.**
  - It answers a finding the harness has already made: *Region 2's Gyms stay soft at any multiplier because the
    counter-pick decides them* (§5.9.3). A rule that is not about type keeps the climax a puzzle after you
    counter-pick.
  - It gives each of the 12 Gyms a memory, and it makes a second run against the same leader a different plan.
- **Pillars.** Pillar 1 (the rule is telegraphed and learnable). Pillar 2: Misty's and Surge's rules are swap
  problems.
- **Cost.**
  - It is likely expressible as an *enemy-side* entry on the hooks that Relics, Badges and Region Modifiers already
    share (§7.7, `relicsOf`). That needs checking before it is promised.
  - Twelve rows in `catalogs/gyms.md`.
  - One balance pass, re-measured over 720 runs.

### D2 — Legendary arenas ★ recommended, feeds v0.9.13

- **What.** When Legendary Pokémon enter the run (v0.9.13), each one is fought on its own ground: Articuno in Hail,
  Zapdos on Electric Terrain, Moltres in Sun, Mewtwo on Psychic Terrain, with a backdrop of its own. PokéSurvivor's rift
  arenas show how much a fight's identity comes from *where* it happens.
- **Pillars.** Pillar 1: the field is shown at the start. Pillar 5: regional flavour.
- **Cost.** Low: the 10 fields exist (§4.3), and so do the backdrops.

### D3 — Hall of Fame and the share card ★ recommended, feeds v0.9.14

- **What.**
  - **The record.** When the Champion falls, the team is recorded the way the games do it: each Pokémon steps up in
    turn, with its level, its evolution path and its relics.
  - **The book.** Each record goes into a **Hall of Fame** book in the Hub's PC: date, seed, starter, Badges and
    turns.
  - **The share card.** The run-end screen offers a **share card**: a PNG drawn on a canvas (team sprites, Badges,
    seed, time) copied to the clipboard.
  - **Replay later (stretch).** Since a run is a seed plus an input log (§10.7.4), a record could even offer "watch it
    again".
- **Why.**
  - It is the series' own ending, and v0.9.14's exit criterion is "a run ends at the Champion".
  - Pokelike's growth leaned on "Hall of Fame" collection goals, and on a share button whose posts spread the game on
    TikTok and X.
- **Pillars.** Pillar 5.
- **Cost.** One screen, one Hub book, and a canvas render.

### D4 — A daily seeded route

- **What.** A **Daily Route**: the date sets the seed, the starter and one difficulty modifier, and everyone plays the
  same map, once.
  - **Result.** A Wordle-style text grid (Badges as emoji, depth, turns) to paste anywhere.
  - **Streak.** A Pokelike-style shield: one missed day is forgiven, and the shield is earned back after seven days.
  - **Where it opens.** The canon's hidden **Mystery Door** was already meant for "daily seeds, leaderboards,
    Ascension" (§8.4). The daily seed needs no server.
- **A leaderboard later.** A server can **verify a score by replaying its input log** (the sim is bit-exact), which is
  a stronger anti-cheat than PokéSurvivor's clock checks.
- **Pillars.** Neutral. A meta mode, not a rule change.
- **Cost.** Low for the daily and its streak; a leaderboard needs a server.

### D5 — Fights with another objective

- **What.** A few node variants whose win condition is not "KO everything":
  - **The flee race.** A Chansey, or a Meowth carrying Pay Day, telegraphs *Flee in 3*. KO it first for a Lucky Egg
    or a purse. This is PokéSurvivor's treasure goblin, made turn-based.
  - **The hold-out.** Survive four turns of a rampaging Primeape to open a guarded cache. A defensive puzzle where
    every swap matters.
- **Pillars.** Pillar 1 (the countdown is an intent) and Pillar 2: a hold-out is the purest test of the swap.
- **Cost.**
  - A new outcome check: survive N turns, or the enemy leaves.
  - A "flee" intent kind.
  - Placement in §5.6.3's table.

### D6 — Rotating challenge runs

- **What.** A *challenge of the week*: a fixed seed plus a curated rule set, with a medal.
- **Built from what exists.** The 10 stackable difficulty modifiers (§8.8), plus one special rule each week:
  - **Nuzlocke**: a faint is a release, and only the first Pokémon of each Wild Area can be caught.
  - **Baby Cup**: no evolution past stage 1.
  - **Monotype**: one type only.
  - **TM Overdrive**: kits start at their weakest; only TMs improve them.
- **Why.** Nuzlocke deserves its own mention: it is the most-played self-imposed Pokémon challenge, and with HP
  persistence and Trauma Ascendant is halfway there already.
- **Pillars.** Neutral; modes on top.
- **Cost.** Low per week once the frame exists.

### D7 — A route Trader

- **What.** A new stop: give one of your Box, then pick one of three **face-down** offers. Each shows only a type and
  a level, and the newcomer arrives two levels above what you gave.
- **Why.** It is a way to re-roll a line that is not working, inside the stop columns. The Black Market's Trader
  stays the rare, named version.
- **Pillars.** Pillar 3: you sculpt the team rather than draft it, because you choose what to give up.
- **Cost.** Medium: a screen and a §2.9 row.

### D8 — Animation speed and skip

- **What.** A setting for **×1 / ×2 / instant** next to the motion setting, and Space to skip any beat (an evolution, a
  level-up, a catch).
- **Why.** A 90–100-minute run repeats the same beats hundreds of times. Pokelike added auto speed-up, then skip, then
  a setting, all in response to players. Today Ascendant's settings hold only `textScale` and `motion`.
- **Cost.** Low, if the beat durations already flow from one place (`fxTimings`).

### Smaller ideas, worth a line each

- **Signature held items, line by line** (Pokelike gives one to all 366 lines). Ascendant has the Thick Club and the
  Light Ball. Growing toward "every starter and every Rare line has one" fits Pillar 4. Only ever offered for a line
  in the party.
- **Leaders and Elites with held items, shown in the preview.** It adds identity and stays telegraphed.
- **One reroll on a 1-of-3 pick**, as a scarce resource: a Hub upgrade or a relic.
- **A first-launch quiz** as a *tutorial vehicle*: "Professor Oak's questions" recommends a starter and explains
  Vanguard / Specialist / Support along the way. It is charming, cheap and optional.
- **The face-down reveal for rewards.** SpireMon's pack opening (hold, fan, flip, rarity glow, NEW!) is the
  reference for a Legendary relic pick or a Bond rank-up.
- **Design lessons to keep for the League and any endless mode.**
  - Effects that scale with the *enemy's* max HP must fade when outlevelled, or they become an infinite build.
  - A fight clock (Sudden Death) beats stall builds that nothing else can.
- **"Two maps to find it on."** Pokelike pairs its encounter pools so every needed counter appears in two places.
  The Ascendant check: does every lane's `counter` species appear on at least two nodes of a route?

### Where Ascendant already matches or leads

| Area | Them | Ascendant |
|---|---|---|
| Telegraph and honest numbers | Catch the Spire arrived at it in v2.8 | Canon since §5; "the intent's number is the hit" |
| Effectiveness popups | Pokelike v3.1.1 | Already in `useCombatFx` (coloured floats + "Super effective!") |
| Keyboard play | Pokelike v2.2 | Combat takes 1–9, Enter and E |
| Constraint achievements | "One is Enough", "Minimalist", "Purist" | One-Mon Army, Pure Form, Solo Trainer, No Rest (`catalogs/achievements.md`) |
| An affinity system | Requested by PokéSurvivor's players | Bond (§6.8) |
| Late-evolving lines held back early | Pokelike v3.0 | v0.9.8: Region 1 wilds are first forms |
| A rival who counter-picks your starter | Pokelike (Silver) | The Rival (§2.8) |
| Depth over breadth | PokéSurvivor's top complaint | 151 species, kits by evolution path |

---

## 5. Art: where Ascendant stands, and what to change

The diagnosis comes from `playtest/` (v0.9.12): `combat-acts-twice.png`, `run-region3-gym.png`, `run-map.png`,
`run-node-preview.png`, `run-evolution.png`, `run-reward.png`, `elite-relic-pick.png`, `run-summary.png`, `menu.png`,
`hub-lobby.png`, `run-town.png`.

**What is already strong.**
- The towns, the Hub lobby, the Game Corner and the route are real FRLG tiles: coherent, warm, and more authentic than
  either competitor's.
- The combat stage reads clearly: squad left, enemy right, intent chips, a hand along the bottom.
- The intent card's breakdown is better information design than anything in either game.

### A1 — The Gym Leader and the Elite, seen ★ quick win

- **The problem.** `CombatScreen.tsx` draws the trainer only while `enemies.length <= 1`. Gyms and the Elite always
  fight two at a time (§5.6.3), so in `run-region3-gym.png` Sabrina is a chip in the top bar and nowhere on the stage.
- **The fix.**
  - Stand the leader behind the enemy row: smaller, raised, half-lit, the way the games show a trainer behind their
  Pokémon.
  - Open the fight with the series' slide-in ("Leader Sabrina wants to battle!", her sprite crossing the stage).
- **Cost.** The sprites are already installed: 29 of them, including every leader in `public/art/trainers/`.

### A2 — Card art that shows the move ★ the biggest visual gain

- **The problem.** A move card's window holds its **owner's** official-art portrait (`combat-acts-twice.png`). A hand of
  five from three Pokémon shows three faces. Bubble and Water Gun differ only in their names.
- **The pipeline already expects this.** `docs/art/pipeline.md` lists card art as "◐ fallback live → generated later".
- **The model.** Follow PokéSurvivor: a **small set of move-family illustrations** drawn as pixel art and tinted by type
  (bolt, flame, drop, leaf, rock, claw, beam, wave, sound, powder, shield, heart…). It would be about 20 shapes × 15
  type palettes, drawn by script on the games' 1-px outline, like the roulette table (`npm run art:props`).
- **The owner stays.** It becomes a small pixel badge in the corner.
- **The same shapes animate the arena.** They become the projectile and impact VFX of each move family. The arena's
  motion today is lunges and floats (§9.9).
- **Rule check.** "Never generate a Pokémon" holds, because these are effects, not creatures.

### A3 — One register for the creatures in a run

- **The problem.** Ascendant mixes three registers:
  - **Official artwork**: the squad panels, the hand, the reward, the evolution screen, the menu's Charmander.
  - **Gen V pixel sprites**: the arena, the town and Hub characters.
  - **3DS battle backgrounds**: the arena backdrops, blurred.

  Standing facts accepted *official backdrop + pixel sprite* ("what Showdown looks like"). What does not work is **the
  same creature in two registers at once**: in combat, the Lead's portrait card (official art) stands a hand's width
  from its pixel back sprite. Both competitors pick one register per creature and hold it everywhere.
- **The proposal.**
  - **In a run**, the creatures are pixel: squad panels, cards, map team, reward, catch, evolution reveal. The Gen V
    front sprites exist for all 151, shiny included (604 files in `public/art/pokemon/battle/`).
  - **The books** (Pokédex sheet, Item Guide, Trainer Card) keep the official art as illustration.
  - **The chrome** stays modern (Baloo 2, Nunito, rounded panels). That is legibility and text scale, not register.
- **Canon to rewrite.** §9.1.1 still says "Modern illustrated 2D, cel-shaded", which the build left behind at v0.5.
  The statement should become something like *a pixel world under warm modern chrome*.

### A4 — The map: nodes you can read, a map you keep

- **Problem 1: grey medallions.** Every node is a grey disc with a small dark glyph, and only the reachable ones get a
  label (`run-map.png`). At a glance a trainer, a Wild Area and a stop look alike.
  - **The fix:** draw nodes in full colour: the trainer class's sprite, the FRLG Center, the item, the tall-grass tile.
    Fade the far future rather than grey everything. Draw the path walked darker than the paths open.
- **Problem 2: the preview hides the map.** Opening a node's preview replaces the painted map with a dark void
  (`run-node-preview.png`).
  - **The fix:** dim and blur the map behind the modal instead, so the player keeps their place.

### A5 — No empty cream screens

- **The problem.** Victory, the Elite's prize, evolution and run-over each sit alone in an empty cream field. The
  relic icons are ~32 px pixel art inside 56-px tiles, so a Rare reads as small as a Common.
- **Stage the reward screens.**
  - Keep the fight's backdrop behind the Victory card (dimmed), with the team standing in it.
  - Present relics on a pedestal: the icon at an integer ×3, its rarity's glow, and a flip reveal for Rare and
    Legendary picks.
  - Make run-over a scene: the series' "blackout" for a loss, the Hall of Fame (D3) for a win.
- **The evolution screen.** Three paths for the same Ivysaur look alike. Give each path its colour on the sprite and
  show its signature card's art (A2).

### A6 — Sound, sooner

- **The problem.** The game has no audio at all: no `AudioContext` and no audio files in `src/`. §9.5 places audio at
  v1.1.
- **The model.** PokéSurvivor shows the cheap path for a web fan game: a **Web Audio synthesiser with the SFX composed
  in code**. That means no files, no licensing, and nothing of Nintendo's.
- **What to bring forward.** About 15 sounds: card play, hit, super-effective hit, faint, swap, Poké Ball throw and
  each shake, catch, level-up, evolution, and the UI clicks. Music can wait for v1.1.
- **Why sooner.** This is the largest *feel* gain per hour left in the project.

### A7 — A logo and a living title screen

- **The problem.**
  - The title is "Pokémon Ascendant" set in Baloo 2.
  - The official-art Charmander stands on a generated pixel town: two registers again.
  - Both competitors open on a wordmark and a scene that moves.
- **The proposal.**
  - **A wordmark** with an upward, evolving motif, authored as an SVG or generated (it is an invented mark).
  - **The menu vista made alive.** The last run's party walks the town in their animated Gen V sprites, or the wild
    Pokémon of Region 1 wander it, as PokéSurvivor does.

### Smaller art notes

- **Type labels.** The FRLG pixel labels are faithful, but at 12 px tall on the cards ("NORMAL", "GRASS") they sit at the
  edge of legibility. Keep them at whole-pixel scales of 15 px and up.
- **Hidden ability.** A Pokémon with its hidden ability awake could carry a quiet glow (Pokelike: blue for a hidden
  ability, purple for a mutant). That makes Bond's Trusted rank visible in play.
- **Rarity as Poké Ball tiers.** PokéSurvivor marks Common → Legendary as Poké → Great → Ultra → Luxury → Master Ball.
  For relics this would replace a coloured border with an object the player already knows. It is a candidate, to be
  checked against the rarity tokens shipped in v0.9.10.

---

## 6. What not to copy

| Theirs | Why not here |
|---|---|
| Auto-battle (Pokelike Story) | Anti-pillar: *not an auto-battler*. The hand is the game. |
| Gacha (PokéSurvivor) | Anti-pillar: *not mass-collection*. It is also the most criticised system in its feedback. |
| Permanent stat buffs per line: vitamins, EVs, per-Pokémon upgrades | §8's rule: *unlocks expand options, never power*. PokéSurvivor's players call the grind tedious. |
| 900+ species across nine generations | Gen I depth is the bet; their own players report the breadth as hollow. |
| Traits that reward fielding N of a type | Pillar 3: synergy is *sculpted*, not drafted. A type-count bonus pushes the draft. The party type charms (15 Common relics) already cover the taste. |
| A softened type chart (×1.6 / ×0.6 / ×0.3, no immunity) | Their reason is one active move. With a hand of cards, immunity is a visible choice, so ×0 stays. |
| Mutants and fusions | Off-canon for a Gen I game, and fusions borrow another fan project's art. |
| Ads and a consent wall | Ascendant is free and non-commercial. The disclaimer is load-bearing, and money is not. |

**A risk to weigh, not a rule.**
- PokéSurvivor **dropped "Pokémon" from its name** on 2026-10-08, in its own words "like PokéRogue or Showdown".
- The press write-up of its viral week notes that visibility is what historically draws takedown requests.
- Ascendant carries "Pokémon" in its title (the rename of 2026-09-20).
- This is the user's call, and it gets heavier at v1.0 when the game goes on itch.io.

---

## 7. Suggested order

1. **Now, small:** A1 (the leader on stage), D8 (animation speed), A4's second half (keep the map behind the preview).
2. **With v0.9.13 Victory Road:** D2 (Legendary arenas).
3. **With v0.9.14 The League:** D3 (the Hall of Fame and the share card), plus the "Endless is meant to end" lesson for
   the League's numbers.
4. **Before or inside v1.0:**
   - D1 (Gym Leader rules), with the v1.0 balance pass
   - A2 (move card art and VFX)
   - A3 (one register, and §9.1.1 rewritten)
   - A5 (staged reward screens)
   - A6 (synthesised SFX)
   - A7 (the logo)
   - D4 (the daily route)
5. **After v1.0:** D6 (weekly challenges, Nuzlocke first), D5 and D7 with v1.2's wider world, and Soul Link as input to
   v2.0's two-player design talk.

None of this is on the roadmap yet. Each item goes there, or into canon, once the user picks it.

---

**Sources.**
- [pokelike.xyz](https://pokelike.xyz/): in-game patch notes v1.1–v3.4.1 and the achievements screen, read 2026-10-13.
- [github.com/JPTER78/pokesurvivor](https://github.com/JPTER78/pokesurvivor): `GDD.md` and `README.md`.
- [pokesurvivor.com](https://pokesurvivor.com/), played.
- [jpter78.itch.io/pokesurvivor](https://jpter78.itch.io/pokesurvivor) and its
  [feedback thread](https://itch.io/t/7118231/feedback-wall-of-text).
- [shanethegamer.com: PokéSurvivor](https://www.shanethegamer.com/news/pokesurvivor-pokemon-vampire-survivors-fan-game/).
- [androidphoria.com: Pokelike](https://androidphoria.com/juegos/pokelike-roguelike-de-pokemon).
