# Session State — Pokémon Ascendant

**Date:** 2026-10-06 · **Version:** v0.9.2 shipped (*Bond, reworked*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.9.3** Player level and the Poké Mart, revamped — a design pass with the user first (see
`docs/roadmap.md`).

**v0.8.7–v0.8.10** — the route, the balance pass, the honest harness, the growth curves (`balance/report.test.ts`,
`BALANCE_REPORT=1 REPORT_SEEDS=240`). **v0.9.1** — Bond re-paced (wins that mean something; ranks 10 · 40 · 110 · 200 ·
360, about 18 runs to Soulbound — `balance/bondCareer.test.ts`, `BOND_REPORT=1`), Shiny found in the wild (§5.14,
`run/shiny.ts`, 1 in 40, the Bond's Shiny Charm), its collection in the Pokédex, +N Bond on the reward screen, and
every line's Mastery Lv2/Lv3. Fixture `?scenario=wild-shiny`. **v0.9.2** — the Bond reworked by the user: four linear ranks
of 100 (Shiny Charm for every new copy · hidden ability · the whole Mastery · start a run, or a starter line always shiny), ~5 / 11 / 16 / 21
runs; the nine missing hidden abilities written.

**Findings to act on:** every Gym's ace sits 1–2 levels under the team; Region 2's Gyms lost 2 % of the time; the Rare Candy is worth 8 points
of Region 3; the breather's 8 % / 30 % unmeasured. UI nits left: locked Wild emblems hard to tell apart in grey;
Escape on a preview drops focus to the body; a combat card's "×0.5" multiplier at 1.66:1 contrast; group breakdown box
mid-arena; tiny enemy icons; Bench 2 clipped at 720 p. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another
session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 704 Vitest, typecheck, lint, §, catalogue and version guards; e2e 122.
**Balance** (720 runs): R1 60 % · R2|R1 58 % · R3|R2 48 % · full run 17 % · relics ~11 at a won run's end · team +0–2 levels over.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
