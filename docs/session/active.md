# Session State — Pokémon Ascendant

**Date:** 2026-09-30 · **Version:** v0.8.6 shipped (*Consumables that are spent, scarcer relics*) — v0.8 in progress.
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8.7** routes revamped (§2.5, §2.9 — design pass with the user first), then **v0.8.8** the
balance pass (Gym at five, R3 → ~50 %, the Ring, the supply tables). Renumbered by the user on 2026-09-30.

**v0.8.1–5:** groups (§5.6), the honest intent, acting twice, Call for Help, groups across the run (§5.6.3), fields
(§4.3), TEAM_SIZE and one combat grammar. **v0.8.6** (`run/rewards.ts`): consumables are **spent** (§3.5) and found
often — trainers 1–2 from a Region supply table, wild nodes Poké Balls, Elite/Gym prizes, nurse and Center gifts
(`run.lastGift`), three supplies events, shop **bundles** (§2.9.2, §2.11.2.2). Relics **scarce** (§7.3.1): trainer 15 %
Common, the Elite a pick of 2U+1R on the reward screen (`claim-reward { relicId }`), first Gym Rares then Legendaries,
relic events weight 0.35, the **collector's premium** +25 % per relic bought (`slotPrice`, `relicsBought`). No
Refunds → **Lean Pack**. Run save v16. Full run ends with ~9 relics (was 16.5).

**Findings to act on:** v0.8.8 — the harness never plays cures or X items (a full run ends with ~27 unused), the Ring's
rung 1 ~72 %, the market's prices. v1.2 — map caption token, wild biome emblems, route-line contrast. UI nits left:
the group breakdown box mid-arena; tiny enemy box icons; Bench 2 clipped at 720 p; the Ring and Safari guides copy one
nav; the silhouette filter in three CSS modules; blurry TM sprites; `.trauma` literal px; the reward and Gym-pick
screens are not mapped in `scripts/ui-audit.mjs` (shared with another session — map them when it is free).
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 655 Vitest, typecheck, lint, §, catalogue and version guards; `e2e/supplies`,
`economy`, `run` green. **Balance** (120 runs): R1 63 % · R2|R1 61 % · R3|R2 43 % · full run 17 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
