# Session State — Pokémon Ascendant

**Date:** 2026-09-30 · **Version:** v0.8.6 shipped (*Consumables that are spent, scarcer relics*) — v0.8 in progress.
**First, read [`standing-facts.md`](standing-facts.md) → *Working with the user* and *Working in a shared folder*.**

**Sprint goal next:** **v0.8.7** routes revamped (§2.5, §2.9 — design pass with the user first), then **v0.8.8** the
balance pass (Gym at five, R3 → ~50 %, the Ring, the supply tables). Renumbered by the user on 2026-09-30.

**v0.8.1–5:** groups, honest intent, acting twice, Call for Help, fields, TEAM_SIZE, one grammar. **v0.8.6** (`run/rewards.ts`): consumables are **spent** (§3.5) and found
often — trainers 1–2 from a Region supply table, wild nodes Poké Balls, Elite/Gym prizes, nurse and Center gifts
(`run.lastGift`), three supplies events, shop **bundles** (§2.9.2, §2.11.2.2). Relics **scarce** (§7.3.1): trainer 15 %
Common, the Elite a pick of 2U+1R on the reward screen (`claim-reward { relicId }`), first Gym Rares then Legendaries,
relic events weight 0.35, the **collector's premium** +25 % per relic bought (`slotPrice`, `relicsBought`). No
Refunds → **Lean Pack**. Second pass (same version, the user's call): balls are bag entries + Great/Ultra (save v17),
the combat **Bag** (whole bag, 2 items a turn), eased catch curve + ball picker, roles Attacker/Defender (Cover)/Buffer,
mirrored enemy panels; third pass: hidden trainer rosters, "As Lead" (`forecastIfLead`), XP cut, Ring two at a time.

**Findings to act on:** v0.8.8 — the harness never plays cures or X items (a full run ends with ~37 unused), the Ring's
rung 1 ~71–75 %, the market's prices. v1.2 — map caption token, wild biome emblems, route-line contrast. UI nits left:
group breakdown box mid-arena; tiny enemy icons; Bench 2 clipped at 720 p; Ring/Safari guides share a nav; silhouette
filter ×3; blurry TM sprites; `.trauma` px; the reward and Gym-pick
screens are not mapped in `scripts/ui-audit.mjs` (shared with another session — map them when it is free).
`AGENTS.md`, `.agents/`, `.codex/` (Codex) are another session's; `scripts/ui-audit.mjs` is shared with it.

**Test status:** `npm run check` green — 655 Vitest, typecheck, lint, §, catalogue and version guards; `e2e/supplies`,
`economy`, `run` green. **Balance** (120 runs, XP ×0.6, level-matched tiers): R1 68 % · R2|R1 56 % · R3|R2 40 % · full run 15 %.
**Shipping:** `docs/release-doctrine.md` (the `ship-version` skill). **UI changes:** the `ui-review` skill.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
