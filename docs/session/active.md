# Session State — Pokémon Ascendant

**Date:** 2026-10-09 · **Version:** v0.9.11 shipped (*Moves for every path, and the faint that fades*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.9.12** Victory Road (see `docs/roadmap.md`).

**v0.8.7–v0.8.10** — the route, balance, harness, growth curves (`BALANCE_REPORT=1 REPORT_SEEDS=240`). **v0.9.1** — Shiny found in the wild (§5.14, `run/shiny.ts`, 1 in 40, `copyIsShiny`), its collection in the
Pokédex, +N Bond on the reward screen; the Bond in four linear ranks of 100 (Shiny Charm · hidden ability · the whole
Mastery · start a run, or a starter line always shiny), ~5 / 11 / 16 / 21 runs (`balance/bondCareer.test.ts`,
`BOND_REPORT=1`); every line's Mastery Lv2/Lv3 and hidden ability. Fixture `?scenario=wild-shiny`. **v0.9.2** — the Hub as the Indigo
Plateau lobby (`PixelRoom`, `hub/lobby.ts`, `npm run art:hub`); leftover ₽ → Tokens (200 each, cap 5); curve 330 × N^1.6,
3 Tokens a level, shelves 1/2/4/6, no Discoveries shelf — `balance/accountCareer.test.ts` (`ACCOUNT_REPORT=1`).
**v0.9.3** — the arena's beats (§9.9.1): the catch, send-out, recall, faint ghosts (`useCombatFx`, `ArenaFx`); e2e runs
reduced motion by default, `e2e/animations.spec.ts` turns it on. **v0.9.4** — the catch as four shake checks (§2.6.4.4, `shakeChecks`). **v0.9.5** — every move Gen I (`moves.md`,
`gen1-moves.json`), kits 2 → 4 → 5 → 5 by slots (`sim/combat/kit.ts`, §6.3.5), `scripts/v095-moves/`; stat tier re-tuned. **v0.9.6** — `EvolutionCutscene`, Evolution and Reward screens reworked, `ProgressToasts`, `TypeChart` (§9.4.4–5). **v0.9.7** — 146 species in tiered pools (§2.6.3), rolled on entry (`run/wild.ts`), `WildPool` card; Lure = two rolls. **v0.9.8** — R1 wilds first forms only; every roster `evolvedAt` by level (no `evolveRosters`); `WildTierBanner` (`?scenario=wild-rare`); §2.2 escalates by form, not type. **v0.9.9** — Region Modifiers off (`REGION_MODIFIERS_ON`); Master Ball item; Pokédex paths (`kitPaths`, `branchPayload`); Item Guide (lobby table); `MOVE_CAP`; saves v20, account v3. **v0.9.10** — whole group Pokémon (no roles); `STAT_GROWTH_RATE`; 46 TMs (`gen-tms.mjs`); `rememberedMoves`; `player.order` swaps; Item Guide tiles. **v0.9.11** — evolved forms learn by level (`v0911-learnsets.mjs`, `holdsSlot`, catch-up in `applyBranch`; `content.test` EveryPath_EndsWithARealKit); faint keeps the pre-faint line (`Ghost.foe.line`); TM discs per type.

**Findings to act on:** every Gym's ace sits 1–2 levels under the team; Region 2's Gyms lost 2 % of the time; the Rare Candy is worth 8 points
of Region 3; the breather's 8 % / 30 % unmeasured. UI nits left: locked Wild emblems hard to tell apart in grey;
Escape on a preview drops focus to the body; a combat card's "×0.5" multiplier at 1.66:1 contrast; group breakdown box
mid-arena; tiny enemy icons; Bench 2 clipped at 720 p. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another
session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 737 Vitest, typecheck, lint, §, catalogue and version guards; e2e 137 (+1 skipped).
**Balance** (720 runs): R1 60 % · R2|R1 59 % · R3|R2 51 % · full run 18 % · ~7 relics at a won run's end · team +0–2 levels over. The user will revisit the biomes ("specialised nodes").
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
