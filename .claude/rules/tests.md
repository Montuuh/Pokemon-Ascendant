---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "e2e/**"
---

# Test rules

- Naming: `Method_Scenario_ExpectedResult`. Every `describe`/`it` block carries the § it proves.
- Independent and order-free; seeded; no wall clock; no network (except explicitly-marked fetch scripts, which are not tests).
- **Every seed is pinned, e2e included.** A fixture carries `&seed=<n>`; a run started from the menu goes through
  `/?screen=menu&seed=<n>` (the starter screen takes it, `entryRunSeed`) or `__ascendant.run.new(starter, n)`. A test
  that walks the UI to a new run without one gets a random map, and a layout assertion then passes on some maps and
  fails on others (v0.9.69: "the map is usable at 1280x720" failed on most runs for a reason only some seeds showed).
  When variety matters, sweep named seeds in a loop and name the worst one in a test of its own — never rely on chance.
- **A layout test checks the worst case it can name**, not the one the fixture happens to fit: the tallest map, the
  longest name, Labels on, 720p. It measures what is drawn (pictures, captions, tags), not only the hit box.
- **A fix's test fails without the fix.** Put the old line back, watch the assertion fail for the right reason,
  restore — then commit.
- **Sim rules → Vitest** (`src/**/*.test.ts`). **Screens → Playwright** (`e2e/`): assert the DOM via `data-testid`, then screenshot to `playtest/<name>.png`.
- **Golden-master replays**: `src/sim/replay/fixtures/*.json` (seed + input log + expected end state). A rule change that alters a fixture updates it deliberately, with the reason in the commit.
- A visual claim needs a PNG Claude has read in the session. "Looks fine" without an image is not a verification.
- Keep `npm run check` under a minute; heavier suites go behind `npm run e2e`.
