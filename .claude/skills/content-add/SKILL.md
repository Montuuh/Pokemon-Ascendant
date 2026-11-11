---
name: content-add
description: >
  Author game content end to end: a species, move, ability, relic, held item, consumable, TM, trainer, Gym,
  event or modifier. The catalogue row first, then the JSON, the schema if the shape is new, the art its
  rot-guard demands, and the guards green. Use when asked to "add a move", "add Pokémon X", "new relic", "port
  the 🆕 rows for this version", or when a design pass has left rows in a catalogue that the build does not have.
  For art alone use art-add; for a rule (not a row) use sim-rule.
---

# Add content — Pokémon Ascendant

Content is data. The catalogue (`docs/design/catalogs/`) is the design truth, the JSON (`src/content/data/`) the
runtime truth, and the Zod schemas (`src/content/schemas/`) the contract between them. Read
`docs/design/catalogs/README.md` (status marks, conventions) and `.claude/rules/content.md` before the first row.

## 1. The row

- Find the catalogue that owns the class (the README's Files table) and the § it implements. Read that §: a row
  never restates a rule, and a row the rule forbids is a design change, not content.
- Weigh two to four candidates for a taste call (name, numbers, effect) and keep the best; the user has
  delegated these. Run `pillar-check` on anything that is more than a re-skin of an existing row.
- Write the row once: a stable kebab-case id unique across **all** catalogues, its §, a status mark, the roadmap
  version that first needs it, and for every number the knob that owns it or `placeholder`.
- Backticks in a catalogue mean "content id". A code identifier in backticks fails `check:catalogs`.

## 2. The data

- Add the entry to the JSON file that holds its siblings, in the same field order. Never renumber or rename an
  existing id (saves and golden replays reference them), and never alter the moves the recorded fixtures use
  without meaning to move the goldens.
- Art paths are derived from the id by the helpers in `src/content/schemas/species.ts` and `src/content/paths.ts`;
  they are not stored in JSON.
- A new field or effect kind is a schema change: extend the Zod schema with a doc comment citing the §, give
  existing rows a default or migrate them, and hand the rule itself to `sim-rule`.
- Placeholder numbers carry `"_tuning": "placeholder"`.

## 3. What the rot-guards will ask for

`src/content/content.test.ts` and `roster.test.ts` fail until the row is complete. Read the failing test name: it
says what is missing. Typically a species needs its portrait, box icon, battle and practice sprites, learnset
and ability pool; a move its illustration; an item, stone or relic its icon; a TM its disc. Fetch or make each
through the `art-add` skill and its lane in `docs/art/pipeline.md`, and add third-party sources to
`docs/art/ATTRIBUTION.md`.

## 4. Prove it

```bash
npm run check:catalogs
npm test -- src/content
npm run check
```

Then see it in the game: deep-link a fixture that uses it (`/?scenario=<id>&seed=7`), or put it in hand with
`__ascendant.hand([...])` / in the party with `__ascendant.run` tools, and read the screenshot. If it changes
what a fight is worth, run `balance-check`.

## 5. Record it

Flip the catalogue status mark, update the `implementation-status.md` row if a count or state moved, and the
codex if a headline number changed (roster size, move count). Commit as `content: …`. A batch a player would
notice is a version (`ship-version`); a row or two is not.
