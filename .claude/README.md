# The workshop — how Claude Code is set up for Pokémon Ascendant

`CLAUDE.md` says how a session works on this project. This folder is the machinery behind it. Everything here is
versioned except `state/`, `patches/` and `settings.local.json`, so a clone or a cloud session starts with the
same instructions. Claude Code is the only agent runtime the project is configured for; there is no second copy
of any of this for another tool.

## What loads when

| Piece | Where | Loads |
|---|---|---|
| Project instructions | `../CLAUDE.md` | every session |
| Path-scoped rules | `rules/*.md` (`paths:` frontmatter) | when a matching file is read or edited |
| Skills | `skills/<name>/SKILL.md` | description always; body when invoked (`/name` or by Claude) |
| Subagents | `agents/*.md` | on demand through the Agent tool, in their own context |
| Hooks | `hooks/*`, wired in `settings.json` | on the event, run by the harness, not by Claude |
| Permissions | `settings.json` (shared), `settings.local.json` (personal) | every session |
| MCP servers | `../.mcp.json` | session start, after the user approves them once |
| Dev servers | `launch.json` | `preview_start` name `dev` / `dev-alt` |

## Rules (`rules/`)

`sim.md` · `content.md` · `ui.md` · `tests.md` · `design-docs.md`. One file per area of the tree, stating the
standard the reviewers hold it to.

## Skills (`skills/`)

| For | Skills |
|---|---|
| Doing the work | `sim-rule` a rule from its § · `content-add` a row from catalogue to JSON · `art-add` an asset · `bugfix` repro, failing test, fix, proof · `port-from-unity` |
| Judging it | `verify` the whole loop · `ui-review` after any visual change · `slop-remover` text the player does not need (scanner: `slop-scan.mjs`) · `playtest` feel · `balance-check` numbers · `pillar-check` the five pillars |
| Deciding and shipping | `design-change` a direction call · `session-close` commit and push a finished unit · `ship-version` a change that earns a number |

## Subagents (`agents/`)

Reviewers, not parallel writers. Each returns findings; the main session does the edits.

| Agent | Judges | Writes |
|---|---|---|
| `designer` | pillars, balance, feel, a proposed mechanic | nothing |
| `sim-reviewer` | a sim or content diff: purity, determinism, numbers as data, true citations | nothing |
| `qa` | edge cases, soft-locks, degenerate states | failing tests, bug reports in `docs/qa/` |
| `ui-reviewer` | a screen against `docs/design/ui-doctrine.md` (D1–D12) | nothing |
| `canon-auditor` | drift between canon, catalogues, JSON and code | nothing |
| `playtester` | how a fight or a run plays, in the browser | its report in `docs/playtests/` |

## Hooks (`hooks/`, wired in `settings.json`)

| Event | Script | Does |
|---|---|---|
| SessionStart | `session-start.sh` | prints `docs/session/active.md`, the last commit, the UI review queue |
| PreToolUse (edits, shell) | `guard.mjs` | refuses `.env`, `package-lock.json`, the Unity reference; blind staging, tree-discarding git, force, `--no-verify`, attribution lines |
| PostToolUse (edits) | `ui-change.mjs` | queues an edited UI file for review |
| PostToolUse (edits) | `post-edit.mjs` | content JSON parses · sim stays pure · § citations and catalogue ids resolve · `active.md` within 30 lines |
| Stop | `ui-stop.mjs` | holds the turn open while UI edits are unreviewed |
| (called by the ui-review skill) | `ui-review-start.mjs`, `ui-clear.mjs` | mark a review in flight; stamp it done and empty the queue |

A hook must be fast (well under a second), silent when it has nothing to say, and exit 0 on anything it does not
understand. Exit 2 is the only blocking answer. `guard.test.mjs` is the guard's spec: `node --test .claude/hooks/guard.test.mjs`.
Hooks and settings are read at session start, so a change to them takes effect in the next session.

## MCP (`../.mcp.json`)

`context7`: current documentation for the libraries the build uses (React 19, Motion, Radix, Zustand, Immer, Zod,
Vitest, Playwright, Vite), looked up instead of remembered. The browser, the dev server and GitHub need no
server here: the app's built-in browser and `preview_start` drive the game, and `gh` reads the Pages runs.

## Changing the workshop

- A new rule goes where it is enforced: a path-scoped rule for a standard, a hook for something that must never
  happen, a skill for a procedure with steps, an agent for a judgement that needs fresh eyes. Not in two of them.
- A skill's `description` is its trigger: say what it does and the words the user would use.
- Keep `CLAUDE.md` short; it is paid for on every turn. Detail belongs in a rule or a skill.
- After editing a hook, run its test and feed it a payload by hand before trusting it.
