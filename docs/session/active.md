# Session State — Pokémon Ascendant

**Date:** 2026-10-15 · **Version:** v0.9.15 shipped (*The combat screen and its cards*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**
**Sprint goal next:** **v0.9.16** the title screen as a battle, then v0.9.17 objectives · v0.9.18
Trader · v0.9.19 Victory Road · v0.9.20 League · v0.9.21 Sound — the user's notes on the fan-game study, re-planned 2026-10-14.

**v0.8.7–v0.8.10** — the route, balance, harness, growth curves (`BALANCE_REPORT=1 REPORT_SEEDS=240`). **v0.9.1** — Shiny found in the wild (§5.14, `run/shiny.ts`, 1 in 40, `copyIsShiny`), its collection in the
Pokédex, +N Bond on the reward screen; the Bond in four linear ranks of 100 (Shiny Charm · hidden ability · the whole
Mastery · start a run, or a starter line always shiny), ~5 / 11 / 16 / 21 runs (`balance/bondCareer.test.ts`,
`BOND_REPORT=1`); every line's Mastery Lv2/Lv3 and hidden ability. Fixture `?scenario=wild-shiny`. **v0.9.2** — the Hub as the Indigo
Plateau lobby (`PixelRoom`, `hub/lobby.ts`, `npm run art:hub`); leftover ₽ → Tokens (200 each, cap 5); curve 330 × N^1.6,
3 Tokens a level, shelves 1/2/4/6, no Discoveries shelf — `balance/accountCareer.test.ts` (`ACCOUNT_REPORT=1`).
**v0.9.3** — the arena's beats (§9.9.1): the catch, send-out, recall, faint ghosts (`useCombatFx`, `ArenaFx`); e2e runs
reduced motion by default, `e2e/animations.spec.ts` turns it on. **v0.9.4** — the catch as four shake checks (§2.6.4.4, `shakeChecks`). **v0.9.5** — every move Gen I (`moves.md`,
`gen1-moves.json`), kits 2 → 4 → 5 → 5 by slots (`sim/combat/kit.ts`, §6.3.5), `scripts/v095-moves/`; stat tier re-tuned. **v0.9.6** — `EvolutionCutscene`, Evolution and Reward screens reworked, `ProgressToasts`, `TypeChart` (§9.4.4–5). **v0.9.7** — 146 species in tiered pools (§2.6.3), rolled on entry (`run/wild.ts`), `WildPool` card; Lure = two rolls. **v0.9.8** — R1 wilds first forms only; every roster `evolvedAt` by level (no `evolveRosters`); `WildTierBanner` (`?scenario=wild-rare`); §2.2 escalates by form, not type. **v0.9.9** — Region Modifiers off (`REGION_MODIFIERS_ON`); Master Ball item; Pokédex paths (`kitPaths`, `branchPayload`); Item Guide (lobby table); `MOVE_CAP`; saves v20, account v3. **v0.9.10** — whole group Pokémon (no roles); `STAT_GROWTH_RATE`; 46 TMs (`gen-tms.mjs`); `rememberedMoves`; `player.order` swaps; Item Guide tiles. **v0.9.11** — evolved forms learn by level (`v0911-learnsets.mjs`, `holdsSlot`, catch-up in `applyBranch`; `content.test` EveryPath_EndsWithARealKit); faint keeps the pre-faint line (`Ghost.foe.line`); TM discs per type. **v0.9.12** — enemy HP never scaled; divisor 5; tier Attack only; Acting Twice on an AP budget with a break (`combat/combo.ts`, `run/doubleAction.ts`). **v0.9.13** — a rule per Gym Leader (§5.9.5, `combat/gymRules.ts`, `ruleTurn.ts`, `BattleConfig.gymRules`, `RuleChip`), the Leader on stage, CSS keyframes through `global()`; fixture `?scenario=gym-sabrina-rule`; `NO_GYM_RULES=1` baseline. **v0.9.14** — the map after Pokelike: straight edges (`terrain.ts`), nodes as the things (`nodeArt.ts`), `nodesAhead`, four edge registers, strip routes. **v0.9.15** — move art (`public/art/moves/`, `npm run art:moves`, Vertex quota: `GOOGLE_CLOUD_LOCATION=global --jobs 2`), the move card redrawn (head · window · plate · foot, lock band, `overlap`), item cards to match, one-row tray + AP orb, log ticker (`LogCategory 'intent'`), pixel portraits (`usePixelFit`), `MoveHit` flash, live tooltips.

**Findings to act on:** every Gym's ace sits 1–2 levels under the team; Gyms lost 4 / 11 / 26 % (Sabrina, Lorelei, Giovanni the hardest); the Rare Candy is worth 8 points
of Region 3; the breather's 8 % / 30 % unmeasured. UI nits left: locked Wild emblems hard to tell apart in grey;
Escape on a preview drops focus to the body; group breakdown box mid-arena; item icons are painted renders beside
pixel move art (art backlog); the ui-audit misses `color(srgb …)` contrast and 6+ card hands. `AGENTS.md`, `.agents/`, `.codex/` (Codex) are another
session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 767 Vitest, typecheck, lint, §, catalogue and version guards; e2e 142 (+1 skipped); `run.spec` map-at-720 and `progression` evolution flake under full parallel load (pass alone).
**Balance** (360 runs, v0.9.13): R1 58 % · R2|R1 60 % · R3|R2 48 % · full run 17 % · fights 5 / 8 / 10 turns · ~7 relics at a won run's end · team +0–2 levels over. The user will revisit the biomes ("specialised nodes").
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
