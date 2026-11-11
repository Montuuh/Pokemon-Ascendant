---
name: sim-rule
description: >
  Implement or change one game rule in the simulation, from its § to a green replay: read the section and the
  implementation-status row, write the tests the § implies first, then the reducer change with its numbers in
  config and its citation, then goldens, balance and the derived docs. Use for "implement §…", "make X work like
  the doc says", "add the keyword/status/field effect", "change how swap/damage/XP works", or any edit under
  src/sim that alters behaviour. For a broken rule use bugfix; for a rule that is not written yet, design-change.
---

# A rule in the sim — Pokémon Ascendant

The sim is the game and the doc wins over the code. Standard: `.claude/rules/sim.md`, `.claude/rules/tests.md`.

## 1. Read before writing

1. The § in its topic file (`docs/design/NN-*.md`), whole, plus the sections it cites. List every rule and every
   edge case it states or implies. If the § is silent or wrong on something the code must decide, that is a gap:
   a taste call you decide and write into the § with its rationale; a direction call goes to `design-change`.
2. The system's row in `docs/design/implementation-status.md`: where the code lives, which tests cover it, where
   the build already diverges.
3. The existing code path and its tests. Find the reducer that owns the phase; do not add a second one.

## 2. Tests first

Colocated `foo.test.ts`, one block per rule, named `Method_Scenario_Expected`, headed by its §, seeded. Cover the
edge cases you listed, and the mandatory ones when they are in reach (faint precedence, freeze lock, swap counter
reset, Backstrike fizzle, Cleave never fizzles, purge from deck and discard). Watch them fail for the right
reason before writing the rule.

## 3. The rule

- A reducer: `(state, action, ctx) => state`, `ctx = { config, content, rng }`, Immer for the draft.
- Every multiplier, cost, duration, chance and threshold is a field of `BattleConfig` (`src/sim/combat/battleConfig.ts`),
  `ProgressionConfig` or a content row, with the § in its doc comment. A literal in the rule is a bug.
- Randomness from the `RngStreams` stream that owns the decision. A new draw on a stream that recorded fights
  consume re-rolls them all: prefer a stream of its own, or accept it and say so in step 4.
- What the player should see is an entry in `state.events`; the UI animates from that.
- Cite: `// Per §X.Y.Z — <the rule in a clause>` on every non-trivial branch.
- Export through `src/sim/index.ts` only.

## 4. Replays, balance, preview

```bash
npm test                      # goldens fail if recorded behaviour moved
UPDATE_GOLDEN=1 npm test      # only for a deliberate change; say why in the commit
npm run balance               # when a number or an enemy decision moved
```

A golden that moved without you meaning it to is the finding, not an inconvenience. If the rule changes damage,
targeting or cost, the damage preview and the intent text must agree with it: they call the sim, so check them
on screen (`/?scenario=<fixture>&seed=7`, hover the card), do not assume.

## 5. Review and record

- `sim-reviewer` agent on the diff; `qa` agent when the rule has a wide edge-case surface; `balance-check` when
  it changes what a fight is worth.
- Update the `implementation-status.md` row, the § if the implementation settled a detail, and the codex section
  if the topic changed meaningfully.
- `npm run check` green, then commit as `feat(sim): …` with the § in the subject or body.
