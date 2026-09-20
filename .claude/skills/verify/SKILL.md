---
name: verify
description: >
  Run the full Pokémon Ascendant verification loop after any change: typecheck + lint + unit tests, then the visual
  suite that screenshots every screen for Claude to read. Use before claiming anything works, before a commit,
  or when asked to "check", "verify", "run the tests", or "does it still work".
---

# Verify — Pokémon Ascendant

## 1. Static + unit

```bash
npm run check
```

Green means: `tsc` clean, `eslint` clean, Vitest all passing. If anything fails, paste the failing block
verbatim in the report and fix it; never summarise a failure away.

## 2. Screens (only if UI/content/art changed)

```bash
npm run shot
```

Then **Read** every PNG the run wrote to `playtest/` (`menu.png`, `combat.png`, `combat-hover-ember.png`, …)
and describe what you see against the spec / mockup. A failing Playwright assertion is a bug, not flakiness,
until proven otherwise (`playtest/test-results/**/error-context.md` has the DOM snapshot).

Live inspection alternative: `preview_start` (config `dev`) → open `http://localhost:5173/?screen=combat` in
the browser tool → `screenshot`, `read_page`, `find`, and `javascript_tool` with `window.__ascendant.dump()`.

## 3. Report

- What was verified, with the command output lines that prove it (test counts, screenshot names).
- Anything that could NOT be verified (e.g. no Playwright browser available) — say so explicitly.
- Never write "tests pass" or "looks right" without evidence from this session.
