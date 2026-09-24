# Session State — Pokémon Ascendant

**Date:** 2026-09-24 · **Version:** v0.7.4 shipped (*Region 3, Volcanic Highlands*).
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** v0.7.5 — *The leftovers and the playtest nerfs* (`docs/roadmap.md`): Evolution Items, the
intent queue, six hidden abilities, the Mastery moves (Regions 2–3 too), the inert relics, Master Ball Charm;
**Sleep** must not land on a sleeping Pokémon, **Mega Drain** needs a numbers pass; the Poké Mart hides unmet starters.

**The plan (2026-09-24, the backlog placed in versions — the user's priority order, with named deviations):**
v0.7.6 Safari Zone · v0.7.7 Black Market + the Ring's own building · v0.7.8 every City door open →
**v0.8 The run, revisited**: routes + spent consumables · Bond & Shiny · Trainer level & Poké Mart · the balance
pass → **v0.9 The endgame**: multi-enemy · double-attack intents · field effects · animated catch · Victory Road ·
the League → v1.0 release · v1.1 polish · v1.2 map revamp · v1.3 the world, wider · v2.0 two players.
Awaiting the user's word on three calls: multi-enemy behind the revamps; the balance pass after them; whether
"routes, revamped" is the rules (v0.8.1) or the look (v1.2).

**Since v0.7.4 (in CHANGELOG `## Next`):** the Badges carry the games' names (Soul = Koga's, Marsh = Sabrina's,
Plain, Knuckle; run save v10 migrates v9). Ditto's Transform → v1.3. The written design is mutable.

**Findings to act on:** map caption token, wild biome emblems and route-line contrast → v1.2 · 13 stale 🆕
ability marks → v0.7.5 · `AGENTS.md`, `.agents/`, `.codex/` (the Codex setup) are untracked: another session's.

**Test status:** `npm run check` green — 494 Vitest, typecheck, lint, §, catalogue and version guards.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.
**Tuning the Region curve:** `CURVE_SEEDS=240 npx vitest run src/sim/balance/runBalance.test.ts -t EachRegion`.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
