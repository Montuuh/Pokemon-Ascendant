---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "e2e/**"
---

# Test rules

- Naming: `Method_Scenario_ExpectedResult`. Every `describe`/`it` block carries the § it proves.
- Independent and order-free; seeded; no wall clock; no network (except explicitly-marked fetch scripts, which are not tests).
- **Sim rules → Vitest** (`src/**/*.test.ts`). **Screens → Playwright** (`e2e/`): assert the DOM via `data-testid`, then screenshot to `playtest/<name>.png`.
- **Golden-master replays**: `src/sim/replay/fixtures/*.json` (seed + input log + expected end state). A rule change that alters a fixture updates it deliberately, with the reason in the commit.
- A visual claim needs a PNG Claude has read in the session. "Looks fine" without an image is not a verification.
- Keep `npm run check` under a minute; heavier suites go behind `npm run e2e`.
