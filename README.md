# Pokémon Ascendant

Roguelike deckbuilder where **your party is your deck**. Three active Pokémon each contribute four moves to one
shared hand; swapping your Lead costs action points and is never free; branching evolutions rewrite your deck
mid-run. Web build (TypeScript + React + Vite), packaged for desktop with Tauri at v1.0.

> **An unofficial, free, non-commercial fan project.** Not affiliated with, endorsed by or connected to
> Nintendo, Creatures Inc., GAME FREAK inc. or The Pokémon Company. Pokémon and all related marks are their
> trademarks. Nothing here is sold, and nothing here carries advertising. Full terms and every asset's
> provenance: [`docs/art/ATTRIBUTION.md`](docs/art/ATTRIBUTION.md).

> Successor of *Project Ascendant* (Unity) — the name picks that lineage back up, after a spell as *Evoline*.
> The design canon, content values and art carried over; the code was re-implemented where the iteration loop
> is fast. See `docs/migration/from-unity.md`.

## Play it

```bash
npm install
npm run dev          # http://localhost:5173 — Quick fight, or /?scenario=wild-boss-3phase
```

Six combat fixtures (wild, catch, trainer, statuses, full deck, Gym Leader with a 3-phase ace). Click a card to
select it, click the enemy to play it; click a bench Pokémon to swap it in (1/2/3 AP); End Turn to see the
telegraphed enemy move land on whoever holds the targeted slot.

## Verify

```bash
npm run check        # typecheck + lint + 151 unit tests (rules, content, determinism, golden masters, balance)
npm run e2e          # Playwright: every fixture boots, interactions work, a full fight is won through the UI
npm run shot         # screenshots of every screen into playtest/
npm run balance      # auto-player balance table across fixtures
```

Requires Node ≥ 20 and Google Chrome (Playwright runs the system Chrome; see `playwright.config.ts`).

## Where things are

| Path | What |
|---|---|
| `docs/roadmap.md` | Versions v0.1 → v1.0, scope and exit criteria |
| `docs/design/` | **Design canon** (10 topics, UI pass, mockups, change-log, open questions) |
| `docs/architecture.md` | Engineering canon for the web build |
| `docs/art/pipeline.md` | Art lanes, sizes, licences; `scripts/fetch-*.mjs` pull assets from public sources |
| `docs/playtests/` | Playtest reports |
| `docs/ai/claude-code-guide.md` | How to work on this project with Claude Code |
| `src/sim` | Pure deterministic rules (the game) |
| `src/content` | JSON content + Zod schemas |
| `src/ui` | React screens/components + design tokens |
| `public/art` | Portraits, sprites, icons, items, trainers, stages |
| `CLAUDE.md`, `.claude/` | AI configuration: rules, skills, agents, hooks |

## Status

**v0.1 Combat Slice — code complete (2026-09-19).** Full combat rules (§3–§4 of the design canon), 18 species /
56 moves / 11 consumables, real combat screen with animated sprites and stage backdrops, deterministic replays,
balance harness. Next: external playtest, then v0.2 First Route.

## Legal

Pokémon © Nintendo / Creatures Inc. / GAME FREAK inc. This is an unofficial fan project, not affiliated with or
endorsed by the rights holders, distributed free of charge. Third-party asset credits: `docs/art/ATTRIBUTION.md`.
