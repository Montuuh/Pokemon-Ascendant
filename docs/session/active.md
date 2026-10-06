# Session State — Pokémon Ascendant

**Date:** 2026-10-07 · **Version:** v0.9.2 shipped (*The Hub and the Poké Mart, revamped*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.9.3** The catch, animated (see `docs/roadmap.md`).

**v0.8.7–v0.8.10** — the route, the balance pass, the honest harness, the growth curves (`balance/report.test.ts`,
`BALANCE_REPORT=1 REPORT_SEEDS=240`). **v0.9.1** — Shiny found in the wild (§5.14, `run/shiny.ts`, 1 in 40, `copyIsShiny`), its collection in the
Pokédex, +N Bond on the reward screen; the Bond in four linear ranks of 100 (Shiny Charm · hidden ability · the whole
Mastery · start a run, or a starter line always shiny), ~5 / 11 / 16 / 21 runs (`balance/bondCareer.test.ts`,
`BOND_REPORT=1`); every line's Mastery Lv2/Lv3 and hidden ability. Fixture `?scenario=wild-shiny`. **v0.9.2** — the Hub as the Indigo
Plateau lobby (`PixelRoom`, `hub/lobby.ts`, `npm run art:hub`); leftover ₽ → Tokens (200 each, cap 5); curve 330 × N^1.6,
3 Tokens a level, shelves 1/2/4/6, no Discoveries shelf — `balance/accountCareer.test.ts` (`ACCOUNT_REPORT=1`).

**Findings to act on:** every Gym's ace sits 1–2 levels under the team; Region 2's Gyms lost 2 % of the time; the Rare Candy is worth 8 points
of Region 3; the breather's 8 % / 30 % unmeasured. UI nits left: locked Wild emblems hard to tell apart in grey;
Escape on a preview drops focus to the body; a combat card's "×0.5" multiplier at 1.66:1 contrast; group breakdown box
mid-arena; tiny enemy icons; Bench 2 clipped at 720 p. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another
session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 706 Vitest, typecheck, lint, §, catalogue and version guards; e2e 121.
**Balance** (720 runs): R1 60 % · R2|R1 58 % · R3|R2 48 % · full run 17 % · relics ~11 at a won run's end · team +0–2 levels over.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
