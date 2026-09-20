# Topic 10 — Foundations

> **Canon.** `§` numbers are an API cited from code and tests — never renumber or delete a section.
>
> **This topic owns:** the three engineering rules that are really design decisions — determinism, event ordering and the save model — plus the content schema and the test layers.
> **It does not own:** how the code is organised; that is [`docs/architecture.md`](../architecture.md).

---

# §10.1 The three foundations

1. **Data-driven content.** Every game value — stats, moves, relics, items, AI weights, balance constants —
   lives in content JSON validated by a schema, or in a named config field. A balance number written inline in a
   rule is a bug, and a test looks for them.
2. **Decoupled systems.** The simulation is pure: no DOM, no I/O, no clock, no randomness except through the
   seeded generator. The UI reads state and dispatches actions; it computes nothing but formatting.
3. **Deterministic, replayable simulation.** Seed + input log ⇒ bit-exact replay.

These are non-negotiable. An architecture decision that conflicts with one of them is rejected, not discussed.

---

# §10.2 Where things live

| Concern | Home |
|---|---|
| Pure rules (the whole game's logic) | `src/sim` |
| Content JSON and its schemas | `src/content` |
| Store, screens, components, styles | `src/app`, `src/ui` |
| Dev tooling and deep links | `src/dev` |
| Full layout and rationale | [`docs/architecture.md`](../architecture.md) |

The dividing line that matters: **`src/sim` must be runnable in a bare Node process with no browser.** That is
what makes the balance harness, the golden-master replays and the auto-player possible, and it is why the
simulation may not import anything from `src/ui`.

---

# §10.3 Content schema

## §10.3.1 Two kinds of data

| Kind | Example | Mutability |
|---|---|---|
| **Definition** | A species, a move, a relic, a scenario | Immutable at runtime, loaded once, validated at load |
| **Run state** | The Box, the current combat, the inventory, the seed cursors | Mutated constantly, serialised to a save |

## §10.3.2 The master schema

Content is JSON parsed by schemas at load time and in the test suite. The inferred types are checked against the
interfaces the simulation declares, so a drift between content and code fails the typecheck rather than a
playtest.

The shapes, in brief:

| Entity | Fields |
|---|---|
| **Species** | `id · dex · name · types[] · stage · baseStats · growth · learnset[] · evolutions[] · availableAbilities[] · masteryMove · evolvesTo[] · rarity · spawnBiomes[]` |
| **Move** | `id · name · type · role · range · modifier · apCost · power · alwaysCrit? · targeting? · cooldown? · effects[]` |
| **Ability** | `id · name · category · description · hook · params?` |
| **Consumable** | `id · name · apCost · tier · target · effect · upgradeTo?` |
| **Relic / Held Item** | `id · name · rarity · metaTier · categories[] · hook · params` |
| **Scenario** | `id · name · kind · stage · seed · trainer? · player{team, leadIndex, consumables, balls} · enemies[]` |

**Two rules that keep it honest.** Ids are **kebab-case and stable forever**, because saves reference them —
renaming an id is a migration, never a rename. And an effect is always a **named hook plus parameters**, never a
script, so a designer can add a relic without touching the simulation as long as the hook exists.

---

# §10.4 Events

## §10.4.1 How systems talk

The simulation produces an **ordered array of events** as part of its state — damage dealt, status applied,
Pokémon fainted, phase entered, card drawn. It does not call the UI, the audio or anything else.

The UI reads that array and animates from it. Audio will subscribe to the same array. A relic hook reads it. The
simulation never knows any of them exist, which is what lets the same code run headless in the balance harness.

## §10.4.2 Ordering and determinism

Event handling is **synchronous and ordered**. No handler may defer work to a later tick, schedule a timer, or
depend on wall-clock time. Two runs of the same seed and input log must produce the *same events in the same
order*, because the golden-master fingerprint includes them.

This is the single rule most likely to be broken by accident, usually by making something async for convenience.

---

# §10.5 Game flow

Game flow is **data, not a class hierarchy**: the current screen, the current run phase and the current combat
phase are fields on state.

```
Boot → Menu → { Hub · New Run · Settings }
                        ↓
                  Run: Map ⇄ Node
                        ↓
              Combat: Draw → Intent → Action → Resolution
                        ↓
                  Run end → Hub
```

The five combat phases (§3.2) map one-to-one onto the combat phase field. Every transition is a reducer action,
so every transition is in the input log and therefore replayable.

---

# §10.6 Object lifecycle

A Pokémon in a run is a **plain data record**, not an entity with behaviour: species id, level, current HP, XP,
Trauma stacks, known moves, active 4, ability, held item, stat stages, status. `currentHP === 0` is the fainted
state — there is no separate flag (§2.4.1).

Combat state is produced by a pure reducer: `(state, action) → { state, rejected? }`. Nothing mutates in place;
nothing is pooled; there is no lifecycle to manage. Performance has not been a consideration at this scale and
should not become one without a measurement.

---

# §10.7 Seeded randomness

## §10.7.1 The generator

A single xorshift32 generator, wrapped so that every consumer goes through the same interface. **Nothing in
`src/sim` may call the platform's random function**, and a lint rule enforces it.

The generator's **cursor is part of the state**, not a hidden global. That is what makes a mid-combat state dump
replayable: the dump contains everything, including where the RNG is.

## §10.7.2 Five isolated streams

| Stream | Drives |
|---|---|
| **Map** | Map topology, node types, Gym pair |
| **Combat** | Intent selection, the randomness floor, crit and rider rolls |
| **Loot** | Drops, shop stock, relic offers |
| **Mystery** | Event selection and gamble outcomes |
| **Encounter** | Which species a Wild node offers, at what levels |

```
streamSeed = fmix32( runSeed ^ fnv1a(streamName) )
```

Isolation means that opening a different node does not shift the outcomes of a fight you have already planned.

The `fmix32` finaliser matters more than it looks: without it, xorshift32's first outputs for adjacent seeds are
nearly identical, and every hand-authored fixture rolled the same "randomness floor" result. Mixing the stream
seed fixes it.

## §10.7.3 What determinism guarantees

Given the same **content version**, the same **seed** and the same **input log**, a run produces the same state,
the same events and the same fingerprint. This is asserted by the test suite, not hoped for.

Content is part of the contract: changing a move's power changes the replay, which is exactly why golden masters
are regenerated deliberately and with a note.

## §10.7.4 Replay

Every run records an ordered **input log** — the actions the player dispatched, nothing else. Seed plus log
reconstructs the run entirely.

This is on by default, not a debug flag: it costs an array, and it turns a bug report into a seed and a file.
Three consequences fall out of it for free — replay debugging, a player-facing "export this run" button, and the
**golden-master suite**, where a recorded fight's fingerprint guards against accidental rule changes. A
fingerprint that changes without a deliberate note in the change log is a regression.

---

# §10.8 Saving

## §10.8.1 Three layers

| Layer | Contains | Written |
|---|---|---|
| **Meta** | Trainer XP and Level, Tokens, unlocks, achievements, Pokédex, statistics (§8.10) | At run end and on every Pokémart purchase |
| **Run** | Position, seed and RNG cursors, the Box, inventory, Badges, modifiers, tallies, input log | On every node entry |
| **Settings** | Audio, display, language, and later accessibility | On change |

## §10.8.2 Storage, and why it is behind an interface

Saving goes through a **save-provider interface**, never a direct storage call.

| Stage | Provider |
|---|---|
| **Now** | Browser local storage, with explicit **Export** and **Import** buttons so a save is a file the player owns |
| **v1.0 desktop** | A real file on disk via Tauri |
| **Post-v1.0** | A logged-in, server-backed profile — the stated goal for accounts and cross-device play |

The interface exists from the first save precisely so the account version is a provider swap rather than a
rewrite. Nothing above the interface may assume storage is synchronous, local, or unlimited.

## §10.8.3 Versioning

Every save carries a schema version. A loader that meets an older version migrates it forward; a loader that
meets a *newer* one refuses politely rather than corrupting it.

## §10.8.4 Integrity

Write to a temporary key, verify, then swap. Keep the last known-good save as a backup and fall back to it if
the primary fails to parse. A corrupt save must degrade to "start a new run", never to a crash.

## §10.8.5 No mid-combat save

Combat is atomic (§3.1). The Run layer is written **on node entry**, before a fight begins. Quitting mid-fight
returns you to the start of that node, and that is the intended behaviour — it makes a combat a commitment, and
it removes save-scumming a bad turn.

## §10.8.6 RNG cursors

The Run save stores the cursors of the four **content** streams (Combat, Loot, Mystery, Encounter), so a resumed
run continues the same sequences.

**The Map stream is deliberately not restored.** The map is re-derived by replaying map generation from the
Region's entry state. Restoring a mid-Region cursor would generate a *different* map on resume — the one bug in
this area that is genuinely hard to spot and genuinely fatal.

## §10.8.7 What the Run layer holds

Position (Region, layer, node) · the run seed and the four cursors · the Box, with each Pokémon's level, XP,
current HP, Trauma, known moves, active 4, ability and held item · the Active Team and Lead · inventory:
consumables, relics, held items, TMs, balls, money · Badges · the active Region Modifier and any difficulty
modifiers · run tallies for achievements and the summary screen · the input log.

The run tallies are worth building once, up front: they serve the achievement triggers (§8.7.1.1) and the
end-of-run summary equally, and retrofitting them per achievement is how the previous project ended up with
nineteen of fifty implemented.

---

# §10.11 Testing

## §10.11.1 Layers

| Layer | Tool | Covers |
|---|---|---|
| **Rules** | Unit tests over the pure simulation | Every rule in Topics 3–8. The tests *are* the specification, executable |
| **Content** | Schema validation + rot-guards | Every referenced move, ability, species and art file exists |
| **Determinism** | Replay tests | The same seed and log produce the same fingerprint |
| **Golden masters** | Recorded fights | A fingerprint change means a rule changed — deliberately or not |
| **Balance** | The auto-player over every fixture, many seeds | Win rate, turn count, faints, HP remaining |
| **Screens** | Browser automation | Each screen boots, the core interactions work, screenshots are captured |

## §10.11.2 What must always be covered

The load-bearing rules, the ones that quietly break: the swap-cost ladder and its reset · Melee legality from
each slot · Step-Forward and Step-Backward ordering · faint purge from deck **and** discard · faint precedence
over Freeze · the damage formula and the type chart, including immunities and ×4 · every status's timing,
duration and immunity · stat stage maths · intent scoring gates (immunity, redundancy, cooldown) · Cleave never
fizzling and Backstrike fizzling · boss phase thresholds and their effects · the catch gauge at its boundaries.

## §10.11.3 Regenerating a golden master

Only after a **deliberate** rules change, and always with a note saying which rule moved. Any other fingerprint
change is a regression to be investigated, not re-baselined.

## §10.11.4 Performance

No target has been set, because nothing has been slow. A turn resolves in well under a frame and the balance
harness runs hundreds of fights in about a second. If that changes, measure before optimising — and never trade
determinism for speed.

---

# §10.13 Modding

Not a launch feature, but nearly free given the architecture: content is JSON with a published schema, ids are
stable, and effects are named hooks. A custom species or relic is a valid JSON file. Left unexposed until there
is a reason to support it.

---

# §10.16 Anti-patterns

| Do not | Because |
|---|---|
| Call the platform random function in `src/sim` | It breaks determinism silently and irreversibly |
| Read the clock in a rule | Same |
| Make an event handler async | It breaks ordering (§10.4.2) |
| Put a balance number inline in a rule | It cannot be tuned, tested or seen |
| Let the UI compute a rule | Two implementations of one rule will disagree; the preview must call the sim |
| Import from `src/ui` inside `src/sim` | It ends the headless guarantee, and with it the harness |
| Rename a content id | Saves reference ids. That is a migration |
| Re-baseline a golden master to make a test pass | That is deleting the alarm, not fixing the fire |
