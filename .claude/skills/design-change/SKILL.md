---
name: design-change
description: >
  Protocol for any change to game design canon (docs/design): a new mechanic, a rule change, resolving an
  OPEN question, or a number that is not just tuning. Use when the user asks "what if", "should we", "change
  the rule", or when implementation hits a gap in the spec. Generates options, lets the user decide, records
  the decision everywhere it must live.
---

# Design change — Pokémon Ascendant

## 1. Read before inventing

Open `docs/design/00-codex.md` for the system shape, then the cited `§` in the topic file. Grep `src/` and
`docs/` for that § to know what the change touches. Never generate options in a vacuum.

## 2. Generate 2–4 named options

Each option: **name** · what it is, concretely · **pillar impact** (cite pillar numbers; ✅ / ⚠️ / ❌) ·
pros for the player experience · cons and risks (implementation cost, edge cases, snowball/anti-snowball,
soft-lock) · which § and code it changes.

## 3. Present without picking

Side by side. No recommendation, no ranking. The user chooses. (If the user explicitly asks for your pick,
give one with the reason, then wait.)

## 4. Record the decision — all of these, same session

1. **Rewrite** the canon `docs/design/NN-*.md` section so it states the new rule once, with a sentence of rationale. Keep the `§` stable; never append an override block under the old text.
2. If it closes an inline `⚠️ OPEN` flag, delete the flag.
3. If the code must follow, add or update the row in `docs/design/implementation-status.md`.
4. Regenerate the affected `00-codex.md` lines and bump the codex date.
5. If scope moved: update `docs/roadmap.md`.
6. Note it in `docs/session/active.md`, and run `npm run check`.

A design change is not done until all of these are. Implementation is a separate task with its own tests.

## Guardrails

- A ❌ pillar violation stops work until the user overrides, revises the proposal, or revises the pillar.
- Numbers: propose ranges and the knob (`BattleConfig` field), not a single magic value; tuning is playtest's job.
- Anti-pillars (not a Showdown clone, no card acquisition, no mass collection, no grimdark) are hard constraints.
