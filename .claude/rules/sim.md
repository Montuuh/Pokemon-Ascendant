---
paths:
  - "src/sim/**"
---

# Simulation rules — `src/sim/**`

The sim is the game. Everything else is a view of it.

- **Pure TypeScript.** No DOM, no React, no I/O, no imports from `src/ui`, `src/app` or `src/dev`. ESLint enforces the `Math.random` / `Date.now` / `window` bans.
- **Deterministic.** All randomness through a `GameRng` obtained from `RngStreams` (§10.7). Time is never read; if a rule needs "now", it is an input.
- **Reducers, not controllers.** A rule is `(state, action, ctx) => state` where `ctx = { config, content, rng }`. Use Immer's `produce` for ergonomics; never mutate an input outside a draft. Emit UI-relevant happenings as entries in `state.events` (the UI turns them into animation), never by calling out.
- **Numbers are data.** Read every multiplier, cost, duration and threshold from `BattleConfig` or content. The only literals allowed are structural (3 slots, 4 moves per species, 13 stage entries).
- **Cite the spec.** Every non-trivial branch: `// Per §3.3.5.1 — Frozen Lead that faints voids the position lock`. Grep the § before changing behaviour; the design doc wins over the code.
- **Tests colocated** (`foo.test.ts`), named `Method_Scenario_Expected`, each block headed by its §. GDD edge cases are mandatory coverage (faint precedence, freeze lock, swap counter reset, Backstrike fizzle, Cleave never fizzles, purge from deck AND discard).
- **Public API only via `src/sim/index.ts`.**
- **Porting from C#:** keep a note where float32 vs double could change a floor result; golden-master fixtures decide (docs/migration/from-unity.md).
- Hot paths (draw, resolve) stay allocation-light but readability wins over micro-optimisation; profile before optimising.
