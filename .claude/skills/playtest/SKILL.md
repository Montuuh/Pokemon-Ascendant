---
name: playtest
description: >
  Drive the running game like a player and report design findings. Use when asked to "playtest", "try the
  combat", "does the swap feel right", or after a gameplay/UI change that needs feel evaluation rather than a
  unit test. Produces a structured report mapped to design pillars and § references.
---

# Playtest — Pokémon Ascendant

## Drive it

1. `preview_start` with config `dev` (or `npm run dev`). Deep-link: `/?screen=combat` (later `/?scenario=<fixture>`).
2. Interact with the browser tool: `find` cards by name, `left_click`, `hover`, drag via `left_click_drag`,
   `screenshot` after every meaningful step (keep them; they are the evidence).
3. Read state without guessing: `javascript_tool` → `window.__ascendant.dump()` (JSON of the live state).
4. Play at least one full fight per scenario. Note every moment you had to think, every moment you did not,
   and every moment you were confused.

## Report (docs/playtests/YYYY-MM-DD-<topic>.md)

```
# Playtest — <topic> — <date>
Build: <git sha or "working tree"> · Scenario(s): …
## What I did (turn log, 1 line per turn: hand → decision → outcome)
## Findings (each: observation → design vs tuning → § → pillar → severity)
## Swap decision quality (pillar 2): how many turns was the swap a real choice? evidence.
## Readability (§10.2): could every consequence be predicted before committing? misses.
## Recommendations (prioritised; tuning knobs name the BattleConfig field)
## Screenshots: playtest/*.png referenced
```

Distinguish **design issues** (rule creates a bad decision space) from **tuning issues** (right rule, wrong
number) from **UI issues** (right outcome, badly communicated). Do not propose new mechanics inside a playtest
report; raise them as open questions for the `design-change` skill.
