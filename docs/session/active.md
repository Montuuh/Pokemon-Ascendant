# Session State — Pokémon Ascendant

**Date:** 2026-11-04 · **Version:** v0.9.94 (*No early walls*).
**Shipped 2026-11-04 (v0.9.94):** §2.6.2.1 wall guard (`wildFor`): R1 wild pools drop Rock/Steel/Ghost until a STAB.
**Shipped 2026-11-04 (v0.9.93):** stats at half scale (`STAT_SCALE` 0.5, §6.2.3), divisor 5 → 10, flat HP amounts halved,
save v24. Harness R1 63 · R2|R1 51 · R3|R2 38 · League 67 · run 8 %. Watch: small multipliers floor away on early hits.
**First:** [standing-facts.md](standing-facts.md), especially shared-folder ownership and standing commit/push authority.
**Rework in progress (user, 2026-11-03; plan approved):** four versions. ✅ v0.9.89 move keywords. ✅ v0.9.90 real
evolution levels and methods, Friendship. ✅ v0.9.91 progressive learnsets (tracks, Move Reminder, no filler on a final
form, 76 Gen II–IV moves). ✅ **v0.9.92** enemies with intent (kits §5.2.2, disruption §5.2.3,
weights §5.3.2, combos §5.5.2, doubles §5.6.1, Gym re-cut + test, 14 moves). The rework is complete. Harness (with the
slower XP curve) R1 58 · R2|R1 46 · R3|R2 44 · League 71 · run 8 %; Region tier ×0.49 / ×0.48 / ×0.60. Open: the new moves in player learnsets/TMs, junk cards, Spite, Follow Me, Elite Trainer combos. Plan: `~/.claude/plans/quiero-hacer-un-rework-wobbly-steele.md`.
**Pushed 2026-11-03 (no version):** base forms learn at the series' levels (`scripts/early-learnsets.mjs`, §6.9): 55 species
retimed, Lv 1 pair = first hit + first trick (starters Tackle/Scratch + Growl; Ember 7, Vine Whip 9). Leech Seed is in the
v0.9.92 WIP (`seed`, disruption.ts) — check Grass immunity and the seeded chip when it lands.
**Shipped 2026-11-03 (v0.9.91):** stage learnsets from Gen IV (`scripts/v0991-learnsets.mjs`), 269 tracks and 79 filler
upgrades (§6.9.1), Move Reminder (§6.9.2), 76 moves (`scripts/v0991-moves.mjs`); Region tier ×0.50 / ×0.64 / ×0.67, Ring
×2.05. Harness R1 63 · R2|R1 48 · R3|R2 47 · League 59 · run 8 %.
**Shipped 2026-11-03 (v0.9.90):** every level ×1.4 from Lv 1 (`scripts/v0990-levels.mjs`; catalogue cells by
`scripts/v0990-catalogs.mjs`), Gen I levels and methods (`readyBranches`, §6.3.7–§6.3.9), trade items held and spent,
Friendship (hearts, grooming, Soothe Bell, Return, hold-on at 255), guaranteed stock, save v23, Region Attack tier
×0.55 / ×0.70 / ×0.76. Harness R1 61 · R2|R1 49 · R3|R2 56 · League 60 · run 10 %. UI review Ship with fixes.
**Shipped 2026-11-02 (v0.9.88):** twelve five-member authored Gym teams; guest named on the preview; pre-v0.9.88 maps keep
the legacy roster. Lorelei stays hardest (37 %).
**Art review (24 Oct):** closed by the user on 2026-11-02; its unimplemented findings (B20–B26, B29, B32, B33) are dropped, not pending. B30 fixed in architecture.md.

**Dark and Steel (v0.9.84):** Gen II 17-type chart; Umbreon/Scizor/Steelix/Magnezone (155 species), 14 later moves, six TMs, Gems/Black Glasses/Plates/Metal Coat; Magnemite Electric/Steel. Eevee has four paths; archetype uniqueness is per target species. R3 Magnezone/Steelix trainers cost 13 win-rate points and were replaced. Four later species use enlarged Gen VII box icons. No new Dark/Steel Gym or Elite.
**Rhythm (v0.9.81–83):** continuous Speed curve; ally fills by printed AP (k 260, 2–5, carry 0.5), enemy per action. Card hover fill, ghost arc, pace chevron and ready cue built. Cue is delay-timed, not impact-timed; held/dragged/720p ghosts remain unreviewed. Earlier threshold-tier design is superseded.

**UI debt:** audit dead-CSS scan follows only modules imported as styles; Text over gradients/images is not measured by the audit. Shortlisted later: web-design-guidelines, break-ui, kill-ai-slop scanner. Every visual implementation still needs measured audit plus independent ui-reviewer, not just captures.
**Motion:** D11/D12 in ui-doctrine.md; docs/design/ui/motion-review.md; System/Reduced/Full matrix, ui:motion, real-time ui:film. Ready-cue audio/impact synchronisation debt above remains.
**Workshop:** CLAUDE.md/.claude are versioned; .claude/state, .claude/patches and local settings remain local. Codex/AGENTS counterparts remain local.
**Shared server:** verify game identity, pin seed 7, default four Playwright workers; never stop another app on 5173. Wait for images before geometry.
**Shipping:** release-doctrine R0 — player-informative design/art earns a version; documentation-only work is maintenance, committed/pushed to main without changing stamps. Keep verified, implemented and published states distinct.

Earlier release details and evidence pointers: [roadmap](../roadmap.md), [implementation status](../design/implementation-status.md), [standing facts](standing-facts.md). Art review history (closed) remains under playtest/art-review-2026-10-24/.
