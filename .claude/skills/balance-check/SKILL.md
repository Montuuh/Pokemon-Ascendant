---
name: balance-check
description: >
  Numerical and exploit review of a mechanic, move kit, relic, boss or config change. Use when tuning numbers,
  evaluating "is this broken?", or before adding content to the roster. Simulates with the real sim where
  possible instead of reasoning in prose.
---

# Balance check — Pokémon Ascendant

## Protocol

1. **Outline** the mechanic exactly as specified (§) and as implemented (file + function).
2. **Simulate.** Prefer code over prose: write a throwaway Vitest under `src/sim/**/__sandbox__/` (gitignored
   pattern) or a node script that drives the sim with seeded `RngStreams` over N fights / turns and prints the
   distribution (damage per AP, turns to kill, swap frequency, dead-draw rate, faint rate). Delete it after, or
   promote it to a real test if it guards a rule.
3. **Evaluate** against: action-economy abuse, dead-draw risk, soft-lock, snowball vs anti-snowball, degenerate
   loops (infinite AP/draw), boss phase skips, and every pillar (run `pillar-check`).
4. **Document**: findings with numbers, the exact knob (`BattleConfig` field / content id), a recommended
   range, and what to watch in the next playtest.

## Reference targets (canon, verify in §)

- Turn pacing target and AP economy: §3.2 / §3.3 · Damage formula and multipliers: §4.1 · Status numbers: §4.2 ·
  Crit soft-cap ~30–35 %: §4.1.3 · Boss phases 50 % / 20 %: §5.8 · Trauma −5 %/stack cap 5: §8.2 ·
  Mastery power bands: §5.11.

Numbers you change belong in config/content, never in a rule. Propose, do not silently retune canon values.
