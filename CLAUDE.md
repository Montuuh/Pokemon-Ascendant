# Pokémon Ascendant — Claude Code configuration

Roguelike deckbuilder where **the party IS the deck**: three active Pokémon each contribute four moves to one
shared hand; the Lead/Swap action-point tension is the signature mechanic; branching evolutions rewrite the
deck mid-run. Fan-made, non-commercial portfolio piece. **Web build** (TypeScript + React + Vite), successor of
the Unity project *Project Ascendant* (`../ProjectAscendant`, read-only reference). Design canon carried over;
code re-implemented — see `docs/migration/from-unity.md`.

## Read first (only what the task needs, in this order)

1. `docs/session/active.md` — where we are (printed by the SessionStart hook).
2. `docs/roadmap.md` — the version being built and its exit criteria. Work that does not advance it is out of scope unless the user says otherwise.
3. `docs/design/00-codex.md` — the whole game in one file. Then the **topic that owns** what you are touching
   (`docs/design/NN-*.md`, canon — each one says at the top what it owns), then
   `docs/design/implementation-status.md` for where the code is and where it still diverges. Content lives in
   `docs/design/catalogs/`. An unresolved point is an inline `⚠️ OPEN` flag in its section — never invent an answer.
4. `docs/architecture.md` — how the code is organised and why.

## Stack & commands

| Purpose | Command |
|---|---|
| Dev server (hot reload) | `npm run dev` → http://localhost:5173 (also `preview_start` name `dev`) |
| Typecheck + lint + unit tests | `npm run check` |
| Unit tests only (sim + content) | `npm test` |
| Doc guards: § citations and catalogue ids resolve | `npm run check:refs` · `npm run check:catalogs` (both in `check`) |
| Screens: assert + screenshot to `playtest/*.png` | `npm run shot` (full e2e incl. UI playthrough: `npm run e2e`) |
| Balance table (auto-player over all fixtures) | `npm run balance` · regenerate goldens after a deliberate rules change: `UPDATE_GOLDEN=1 npm test` |
| Deep-link a fixture | `http://localhost:5173/?scenario=<id>&seed=<n>` · state: `window.__ascendant.dump()` |
| Fetch battle sprites for the roster | `npm run art:sprites` |
| Generate an image into the project (needs `.env` key) | `npm run art:gen -- --out <png> --prompt "…"` |

React 19 · TypeScript strict · Vite · Vitest · Playwright · Zustand · Immer · Zod · Tabler icons · CSS Modules + tokens.
Desktop packaging (Tauri) arrives at v1.0 — see `docs/architecture.md §Packaging`.

## Design pillars (immutable — violations need an explicit user override)

1. **Telegraphed tactics over reactive RNG** 2. **Every swap is a decision** 3. **Synergy is sculpted, not drafted**
4. **Identity through Evolution** 5. **Cheerful core, regional flavour**
Tiebreaker: when Pokémon faithfulness conflicts with pacing or a pillar, pacing and pillars win. Flag the conflict.

## Engineering rules (codebase-wide; path-scoped detail in `.claude/rules/`)

- `src/sim` is **pure and deterministic**: no DOM, no I/O, no `Math.random`/`Date`. Randomness only via `GameRng` from `RngStreams` (§10.7). Given seed + input log the sim replays identically.
- **Balance values are data**: `BattleConfig` / content JSON validated by Zod schemas. A literal number inside a rule is a bug.
- **UI is a view**: reads store state, dispatches actions, computes nothing but formatting. Damage preview calls the sim.
- **Cite the spec**: every non-trivial rule carries `// Per §3.3.1 — …`. `§` numbers are an API: never renumber.
- **Tests are the spec made executable**: sim rules → Vitest (`Method_Scenario_Expected`); screens → Playwright; feel → screenshot you actually looked at.

## Verification loop (every change, no exceptions)

1. `npm run check` — must be green; paste failures, never summarise them away.
2. UI change → `npm run shot` then **Read** the PNG(s) in `playtest/`, or open the dev server in the browser tool and screenshot. Hover/drag/animation: Playwright actions or the browser tool, then screenshot.
3. UI change → **the UI review** (`.claude/skills/ui-review`): `npm run ui:audit` measures the changed screens, the `ui-reviewer` agent judges them against `docs/design/ui-doctrine.md`, you fix, then `node .claude/hooks/ui-clear.mjs`. A hook queues every edit under `src/ui`/`src/app` and the Stop hook will not end the turn while the queue is unreviewed (defer on purpose: `.claude/state/ui-skip`).
4. State questions → `window.__ascendant.dump()` in the browser console / `javascript_tool`.
Never claim "tests pass" or "looks right" without the output or the image in this session.

## Design canon lives in `docs/design/` (Notion is retired)

Ten topics, each stating what it owns. **A rule is stated once, in its place** — when it changes, rewrite the
section rather than appending an override, and put the rationale in the same paragraph. Git is the change log.
Unresolved points are inline `> ⚠️ **OPEN (date)**: …` flags. Design changes follow
`.claude/skills/design-change` (options → user decides → record). Keep `00-codex.md` in sync.

**Authoring content**: the row goes in `docs/design/catalogs/<class>.md` first (stable kebab id, its §, a status
mark, the roadmap version), then into `src/content/data/`. **Touching a system**: check `docs/design/implementation-status.md` first — it maps the system to its code, its
state, and any place the build still disagrees with canon.

## Workflow (lightweight — one human, one AI)

- Small, reversible change: do it, verify, report.
- Feature / multi-file: state the plan in a few lines (files, approach, § touched), then build unless the user objects. Ask only when different readings would produce materially different work.
- **No commits or pushes unless asked.** Conventional commits: `feat(sim): …`, `feat(ui): …`, `content: …`, `design: …`, `docs: …`.
- End of a task: update `docs/session/active.md` (≤ 30 lines) and, if scope moved, `docs/roadmap.md`.
- **Every version ships with its changelog and is stamped everywhere** — `docs/release-doctrine.md`, walked by
  `.claude/skills/ship-version`: the `CHANGELOG.md` entry (the game's What's new screen reads it; work between
  versions goes under `## Next` as it lands), `npm version X.Y.Z --no-git-tag-version`, the roadmap mark, the
  README Status line, the session header. `npm run check:version` fails the check until all of them agree.
- Subagents (`.claude/agents/`): `designer` for pillar/balance review, `qa` for edge-case hunts, `ui-reviewer` for every visual change (doctrine in `docs/design/ui-doctrine.md`). Use them for review, not for writing code in parallel on the same files.

## Art

Assets are plain files under `public/art/` referenced by path — no import step. Fast lanes, sources, sizes and
licences: `docs/art/pipeline.md`. Adding art: `.claude/skills/art-add`.
