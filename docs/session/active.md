# Session State — Pokémon Ascendant

**Date:** 2026-10-05 · **Version:** v0.8.8 shipped (*The balance pass*) — v0.8 complete.
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.9.1** Bond and Shiny, revamped (see `docs/roadmap.md`).

**v0.8.7** — the route: 20 columns left to right, tracks, the Y and the river, stop columns, finds on the ground, a
terrain painted from FRLG tiles (`ui/screens/map/`), every Gym its own field (§4.3.14, six new fields). **v0.8.8** —
the balance pass: the enemy tier trades HP for Attack (§2.2.1), the Gym at five with its own Attack
(`GYM_ATTACK_MULTIPLIER`), the Ring ×1.7, the harness spends its bag (`tendBox`, cures, X items), and
`balance/report.test.ts` (`BALANCE_REPORT=1 REPORT_SEEDS=240`) is the instrument.

**Findings to act on:** Region 2's Gyms lost 2 % of the time (matchup, not numbers); the Rare Candy is worth 8 points
of Region 3; the breather's 8 % / 30 % unmeasured. UI nits left: locked Wild emblems hard to tell apart in grey;
Escape on a preview drops focus to the body; a combat card's "×0.5" multiplier at 1.66:1 contrast; group breakdown box
mid-arena; tiny enemy icons; Bench 2 clipped at 720 p. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another
session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 694 Vitest, typecheck, lint, §, catalogue and version guards.
**Balance** (720 runs): R1 59 % · R2|R1 56 % · R3|R2 53 % · full run 17 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
