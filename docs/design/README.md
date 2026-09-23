# Design canon

The single source of truth for Pokémon Ascendant's design. Edit the markdown; git is the history.

---

## The ten topics

Read them in order the first time. Each one says at the top what it owns and what it does not, so there is
exactly one place any given rule lives.

| Topic | File | Owns |
|---|---|---|
| **1** | [Overview](01-overview.md) | Pitch, pillars, audience, scope, legal, glossary |
| **2** | [The Run](02-the-run.md) | **Everything outside a fight** — the run's shape, the Box and Active Team, the HP economy, the map, every node type, the Cities, Victory Road |
| **3** | [Combat](03-combat.md) | **Your turn** — the five phases, the Lead mechanic, the deck, the hand, consumables, AP |
| **4** | [Resolution](04-resolution.md) | **The maths** — the damage formula, the type chart, crit, status conditions, stat stages, field effects |
| **5** | [Enemies](05-enemies.md) | **Their turn** — AI and intents, bosses, Gym Leaders, Badges, the League, the Pokédex |
| **6** | [Progression](06-progression.md) | XP, levels, learnsets, evolution, the move pool, abilities, the Dojo, Mastery |
| **7** | [Items](07-items.md) | Consumables, relics, held items, TMs |
| **8** | [Meta Progression](08-meta.md) | Trauma, Trainer XP and Tokens, the Hub, unlocks, achievements, difficulty modifiers |
| **9** | [Presentation](09-presentation.md) | Art direction, colour, the combat and map layouts, icons, audio, accessibility, screens |
| **10** | [Foundations](10-foundations.md) | Determinism, RNG, replay, the save model, the content schema, the test layers |

Combat is split three ways on purpose, along the line you actually think in while implementing: **3** is what
you do, **4** is what the numbers do, **5** is what the enemy does. Topics **9** and **10** are reference
material and sit at the end.

---

## Reading order for a task

| Step | Read | Why |
|---|---|---|
| 1 | [`00-codex.md`](00-codex.md) | The whole game in one file. Enough to orient, never enough to quote |
| 2 | The topic that owns your system | Canon. The rule, its rationale and its edge cases |
| 3 | [`implementation-status.md`](implementation-status.md) | Where the code is, what is built, and where the build still disagrees with canon |
| 4 | [`catalogs/`](catalogs/) | If you are authoring or porting content |

---

## The rest of the folder

| Path | What it is |
|---|---|
| [`catalogs/`](catalogs/) | **The authoring source for all content.** Every species, move, ability, consumable, relic, held item, TM, trainer, gym, elite, mystery event, badge, modifier, achievement, biome and field — each with a stable id, the `§` it implements, and the roadmap version that first needs it. Rows go here, then into `src/content/data/` |
| [`implementation-status.md`](implementation-status.md) | System → canon `§` → code path → status, plus the list of places the build diverges from canon |
| [`glossary.md`](glossary.md) | The canonical vocabulary, and the words we deliberately do not use |
| [`ui/design-system.md`](ui/design-system.md) | Tokens, components, motion, input, the move-card anatomy |
| [`ui/screens.md`](ui/screens.md) | Per-screen specifications: zones, components, bindings, states |
| [`ui/mockups/`](ui/mockups/) | Rendered HTML references — open them in a browser |

---

## Conventions that are load-bearing

**`§` numbering is an API.** Code and tests cite `§N.N.N` — around 1,600 citations across the repo. Never
renumber by hand and never delete a section. `npm run check:refs` proves every citation still resolves; keep it
green.

**Canon states the current rule once.** When a rule changes, rewrite the section. Do not append an override
block underneath the old text — that is how a document ends up teaching the wrong game to anyone who reads it
top to bottom. A superseded design goes in a clearly-marked historical section at the end of its file, if it is
worth remembering at all.

**Rationale lives next to the rule.** Why Trauma has two zones, why the Plain Badge was redesigned, why
catching is deterministic — all of it belongs in the section, in a sentence or two. There is no separate
decision log; git holds the diffs and the prose holds the reasoning.

**Never fold a guess into canon.** An unresolved point is an inline `> ⚠️ **OPEN (date)**: …` in the section it
affects, naming who decides. There is exactly one today, in §3.1.

**Rules here, rows in the catalogues.** A topic holds the rule and the small authoritative table — the six
status conditions, the twelve Badges. A catalogue holds the 150 moves. Neither repeats the other.

**Derived files are derived.** `00-codex.md` and `implementation-status.md` restate canon for speed. When canon
moves, they move. The topic always wins.

**Style.** en-GB. Active voice. Rule first, rationale second. Tables for catalogues, Mermaid for flows.
Canonical terms only — Lead, Swap, Step-Forward / Step-Backward, Faint, Intent, Mastery Move.

---

## Where a change belongs

| You are changing | Edit |
|---|---|
| A **rule** | the canon `§`, plus the row in `implementation-status.md` if the code has to follow |
| A **tuning number** | the config field named in `catalogs/economy.md` or `battleConfig.ts`. No ceremony |
| **Content** | the row in `catalogs/`, then port it to `src/content/data/` |
| Something **undecided** | an inline OPEN flag in the affected section. Never a guess |

Design changes follow [`.claude/skills/design-change`](../../.claude/skills/design-change/SKILL.md): read the
`§`, generate two to four named options with their pillar impact, present them without picking, the user
decides, then record it in the section itself.

Two guards keep this honest, both part of `npm run check`:
`npm run check:refs` — every `§` citation resolves to a real heading.
`npm run check:catalogs` — every id referenced in a catalogue is defined in one.
