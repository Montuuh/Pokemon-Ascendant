# Topic 1 — Overview

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** the pitch, the pillars, the audience, the scope, the legal stance and the glossary.
> **It does not own:** any mechanic. Every rule lives in Topics 2–10.

---

# §1.1 High-Level Pitch

**Pokémon Ascendant is a roguelike deckbuilder where your party is your deck.**

Three active Pokémon each contribute four moves to one shared hand. Every turn is a conversation between your
**Lead** — who absorbs the incoming damage and unlocks the melee cards — and your bench. Swapping the Lead is
never free and never automatic: it costs Action Points, it changes who takes the next hit, and it brings a
different quarter of your deck online.

Branching evolutions rewrite the deck mid-run, so the team you finish with rarely resembles the one you
started. Each run crosses three themed Regions, each ending in a Gym Leader you chose to face.

**Signature moment-to-moment mechanic:** the Lead/Swap action-economy tension.
**Signature run-to-run mechanic:** branching evolutions that rewrite the deck.

---

# §1.2 Genre

Roguelike deckbuilder × tactical RPG. Structurally closest to Slay the Spire and Monster Train; thematically a
Pokémon game; mechanically neither's combat.

---

# §1.3 Pillars

## §1.3.1 Design Pillars (player-facing, immutable)

1. **Telegraphed tactics over reactive RNG.** The player can always plan. Randomness decides *what options
   exist*, never *whether a plan works*. Every enemy action is announced a turn ahead; every damage number is
   previewable before you commit.
2. **Every swap is a decision.** Changing the Lead trades AP, defence and tempo. Never free, never arbitrary.
3. **Synergy is sculpted, not drafted.** Power comes from how moves, evolutions, abilities and relics interact —
   never from one overpowered card.
4. **Identity through Evolution.** The branching evolution choice is the main creative expression inside a run.
5. **Cheerful core, regional flavour.** The base tone is warm and faithful; each Region layers its own palette,
   music and roster without changing the mechanics.

**Tiebreaker.** When Pokémon faithfulness collides with pacing or a pillar, **pacing and pillars win** — and the
conflict gets flagged rather than quietly resolved.

## §1.3.2 Engineering Pillars

1. **Data-driven content.** Species, moves, relics, encounters and regions are JSON validated by schemas. A
   balance number hard-coded in a rule is a bug.
2. **Decoupled systems.** The simulation is pure and knows nothing about the screen; the UI reads state and
   dispatches actions.
3. **Deterministic, replayable simulation.** Seed + input log replays bit-exact. Cheap now, impossible to
   retrofit, and it unlocks replay debugging, daily seeds and leaderboards later.

## §1.3.3 Anti-Pillars (what Pokémon Ascendant is not)

- **Not a Showdown clone.** Turn order, speed, accuracy and PP are abstracted away.
- **Not a card-acquisition game.** You recruit Pokémon; cards arrive bundled with the species and its evolutions.
- **Not a mass-collection game.** A small sculpted party beats a sprawling box.
- **Not a numbers-go-up auto-battler.** Every turn demands a real decision.
- **Not grimdark.** The base tone stays cheerful; tone varies only by Region.

---

# §1.4 Player Fantasy

You are a tactician-trainer reading the battlefield two turns ahead, sculpting a small evolving team into a
decisive answer to whatever the Region throws at you.

---

# §1.5 Audience

| Priority | Who | What they want |
|---|---|---|
| **Primary** | Slay the Spire / Monster Train / Balatro players | A fresh thematic frame with novel team-building; tight pacing |
| **Secondary** | Pokémon fans | Tactical, replayable challenge beyond the mainline difficulty curve |
| **Tertiary** | Recruiters reading a portfolio | Architecture and systems design worth looking at |

When Primary and Secondary conflict: **Primary wins on mechanics and pacing, Secondary wins on theming and
emotional beats.**

---

# §1.6 Scope

## §1.6.1 A full run

| | |
|---|---|
| Structure | 3 Regions + Victory Road + League |
| Climactic fights | 8 (3 Gyms + 4 Elite Four + Champion) = 21 boss-tier Pokémon |
| Target length | 90–100 minutes for a winning run |

## §1.6.2 Launch content targets

| Content | Target | Catalogued | Built |
|---|---|---|---|
| Evolution lines | ~30 | 41 (24 Region 1 + 17 reserved) | 6 |
| Moves | — | ~150 | 56 |
| Abilities | ~30 | 38 | 12 |
| Relics | 50 + 10 Legendary | 60 | 0 |
| Consumables | 24 | 28 | 11 |
| Held Items | 18 | 19 | 0 |
| TMs | 15 | 15 | 0 |
| Trainer archetypes | ~25 encounters | 21 rosters over 9 archetypes | 0 |
| Gym Leaders | 12 (4 per Region tier) | 12 | 1 |
| Mystery Events | 12 | 22 | 0 |
| Achievements | 50 | 50 | 0 |
| Region biomes | 3 Regions, 8 biomes | 8 | 3 stages |

Every catalogued row lives in [`catalogs/`](catalogs/) with a stable id and the roadmap version that needs it.
Gen I only; a later generation is the scaling lever if Gen I proves too small.

## §1.6.3 Version scope

The build order is in [`docs/roadmap.md`](../roadmap.md), and it is the only scope document. Summarised:
**v0.1** combat slice (shipped) · **v0.2** first route · **v0.3** evolution · **v0.4** economy and relics ·
**v0.5** Region 1 complete · **v0.6** meta · **v0.7** Cities and Regions 2–3 · **v0.8** multi-enemy and the route ·
**v0.9** the long game (the account revisited, Victory Road, the League) · **v1.0** release · **v1.1** polish ·
**v1.2** map revamp · **v1.3** the world, wider · **v2.0** two players.

> The phrase "vertical slice" in older text means the Unity-era Region-1-end-to-end milestone, which is now
> **v0.5**. The current first milestone is the **Combat Slice (v0.1)**.

---

# §1.7 Platform, Input, Session

| | |
|---|---|
| **Launch platform** | Web (the build is a static site). Desktop via Tauri at v1.0; Mac/Linux if cheap |
| **Input** | Mouse-primary, full keyboard shortcuts, gamepad-friendly, touch-tolerant hit targets |
| **Session** | ~90–100 min for a winning run; a single Region is ~25 min |
| **Save model** | Autosave on every map node. Combat is atomic — no mid-combat save, no resume mid-fight |
| **Accounts** | Local save at launch. A logged-in, server-backed profile is a post-v1.0 goal, so the save layer is written behind a provider interface from the start (§10.8) |
| **Difficulty** | Baseline is the floor. Difficulty is added by opt-in stackable modifiers (§8.8), never removed |

---

# §1.8 Social & Replayability

- **Launch:** singleplayer.
- **Planned:** daily-seed runs against a shared seed, leaderboards for fastest clear and highest difficulty.
  The determinism pillar exists mostly to keep this cheap.
- **Also enabled by determinism:** every run records its input log, so a player can export a replay and a bug
  report is a seed plus a file (§10.7.4).
- **Far future:** multiplayer, format undecided.

---

# §1.9 IP & Legal

Pokémon Ascendant is a **free, non-commercial fan project** and a portfolio piece.

| | |
|---|---|
| **Stance** | Fan project, openly. Distributed free on itch.io with a prominent disclaimer on the boot screen and in the README |
| **Assets** | Pokémon names, sprites and artwork are © Nintendo / Creatures / GAME FREAK. Battle sprites and stage backdrops come from Pokémon Showdown (Smogon sprite project) and are credited in [`docs/art/ATTRIBUTION.md`](../art/ATTRIBUTION.md); portraits and item icons come from PokéAPI |
| **Never** | No storefront, no payment, no advertising, no sale of any Pokémon asset — ever |
| **Generated art** | Only for **original** scenes (backdrops, atmospheric illustration). A generative model is never asked to draw a named Pokémon |
| **If this ever went commercial** | The only honest answer is a full reskin: original creatures, original names. Because every creature, move and region is data, that is a content swap rather than a rewrite — which is itself the point of the data-driven pillar |

*(Decided 2026-09-19. This replaces the earlier promise that public builds would ship a reskin; the project is
a fan project and says so.)*

---

# §1.10 Glossary

The canonical vocabulary — including the words we deliberately do **not** use — lives in
[`glossary.md`](glossary.md). The most load-bearing entries:

| Term | Defined in | One line |
|---|---|---|
| Active Team | §2.3 | The 3 Pokémon brought into a combat from the Box |
| Lead | §3.3 | The Pokémon absorbing damage; gates Melee cards |
| Slot | §3.2.3 | A position (`lead`, `bench1`, `bench2`). Intents target slots, not Pokémon |
| Manual swap | §3.3.1 | A player Lead change: 1/2/3 AP within a turn |
| Step-Forward / Step-Backward | §3.3.2–3 | Melee modifiers that bundle a Lead change with the effect |
| AP | §3.7 | The per-turn budget. 3 baseline, cap 6 |
| Intent | §5.2 | A telegraphed enemy action targeting a slot |
| Faint | §2.4.1 | `currentHP == 0`. No separate flag |
| Effective Max HP | §8.2.1 | Base max HP reduced by Trauma. Every heal and DoT uses it |
| Box | §2.3 | The run's Pokémon roster, capacity 6 |
| Badge | §5.10 | A permanent run modifier from a Gym Leader |
| Relic | §7.3 | A persistent run-state modifier |
| Archetype | §6.3.4 | The Vanguard / Specialist / Support flavour chosen at each evolution |
| Mastery Move | §5.13.2 | The immutable 5th card, earned across runs |
| Trauma stack | §8.2 | A per-instance faint penalty, cleared only by specific services |

---

# §1.11 Document map

| Topic | File | Owns |
|---|---|---|
| 1 | `01-overview.md` | Pitch, pillars, scope, legal, glossary |
| 2 | `02-the-run.md` | Everything outside a fight: the run, the Box, HP, the map, every node, Cities, Victory Road |
| 3 | `03-combat.md` | Your turn: the five phases, Lead and swap, deck, hand, consumables, AP |
| 4 | `04-resolution.md` | The maths: damage, types, crit, status, stat stages, fields |
| 5 | `05-enemies.md` | Their turn: AI and intents, bosses, Gyms, Badges, the League, the Pokédex |
| 6 | `06-progression.md` | XP, levels, learnsets, evolution, the move pool, abilities, the Dojo, Mastery |
| 7 | `07-items.md` | Consumables, relics, held items, TMs |
| 8 | `08-meta.md` | Trauma, Trainer XP, the Hub, unlocks, achievements, difficulty |
| 9 | `09-presentation.md` | Art direction, UI, screens, audio, accessibility |
| 10 | `10-foundations.md` | Determinism, RNG, replay, save, the content schema, tests |

Content lists live in [`catalogs/`](catalogs/); what is built in [`implementation-status.md`](implementation-status.md).
