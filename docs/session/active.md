# Session State — Pokémon Ascendant

**Date:** 2026-11-09 · **Version:** v0.9.107 (*Routes you walk*).
**Shipped 2026-11-09 (v0.9.107):** the route review's three phases in one version (report claude.ai/artifact/XW2ciawxqoNer3HW7eKySU): no PONR river (Gym-coloured commit lines, `preview-commits`, a ridge), one pixel density (`naturalHeight`, D 1.5/2), frame, chapters, building fronts and set pieces from pret (`art:props`), FRLG weather (`art:weather`), trainers facing west with sibling classes, §2.5.5 obstacles/ledge/Mystery places (`run/routeFeatures.ts`), three trunk tracks. UI review Ship with fixes ×2, fixed. Harness R1 23 %. 26 e2e failures predate it (also on HEAD). **Waiting on the user's look.**
**Shipped 2026-11-07 (v0.9.106):** FRLG visual tasks on a Pokémon play on its sprite (`MON_TASKS`, `mons` in useCombatFx, `.fx-mon-*` in motion.css, §9.9.2). All five causes of the move review are now addressed (report artifact claude.ai/artifact/MB5SLkZH3qHyK2LT85KZVa). **Waiting on the user's look.**
**Shipped 2026-11-04 (v0.9.99 / v0.9.98):** Common-heavy sources (trainers 20 % C, picks C/U/U, Elite Wild U, weights
70/25/5, Starting Relic C) and relic unlocks off (`RELIC_UNLOCKS_ON`; rework in backlog); rarities re-tiered by
power (32/18/9/6). Harness: 92 % C · 6 % U · 3 % R taken. **Waiting on verdict.**
**Shipped 2026-11-04 (v0.9.97):** relic balance pass (§7.3.1 power bands, temporary combat probe, not a suite): five
broken relics fixed, outliers cut, dead ones reworked, Legendaries raised, `offerPool` Gem curation, `startingRelicFits`.
**Shipped 2026-11-04 (v0.9.96 / v0.9.95):** Gen III stat and damage formulas, starters' 3rd move, sure first catch;
enemies ×1, lower levels, less XP. Harness R1 9 % (floors). **Waiting on verdict**; if Gyms wall, cut structure.
**First:** [standing-facts.md](standing-facts.md), especially shared-folder ownership and standing commit/push authority.
**Rework in progress (user, 2026-11-03; plan approved):** four versions. ✅ v0.9.89 move keywords. ✅ v0.9.90 real
evolution levels and methods, Friendship. ✅ v0.9.91 progressive learnsets (tracks, Move Reminder, no filler on a final
form, 76 Gen II–IV moves). ✅ **v0.9.92** enemies with intent (kits §5.2.2, disruption §5.2.3,
weights §5.3.2, combos §5.5.2, doubles §5.6.1, Gym re-cut + test, 14 moves). The rework is complete. Harness (with the
slower XP curve) R1 58 · R2|R1 46 · R3|R2 44 · League 71 · run 8 %; Region tier ×0.49 / ×0.48 / ×0.60. Open: the new moves in player learnsets/TMs, junk cards, Spite, Follow Me, Elite Trainer combos. Plan: `~/.claude/plans/quiero-hacer-un-rework-wobbly-steele.md`.

**Dark and Steel (v0.9.84):** Gen II 17-type chart; Umbreon/Scizor/Steelix/Magnezone (155 species), 14 later moves, six TMs, Gems/Black Glasses/Plates/Metal Coat; Magnemite Electric/Steel. Eevee has four paths; archetype uniqueness is per target species. R3 Magnezone/Steelix trainers cost 13 win-rate points and were replaced. Four later species use enlarged Gen VII box icons. No new Dark/Steel Gym or Elite.
**Rhythm (v0.9.81–83):** continuous Speed curve; ally fills by printed AP (k 260, 2–5, carry 0.5), enemy per action. Card hover fill, ghost arc, pace chevron and ready cue built. Cue is delay-timed, not impact-timed; held/dragged/720p ghosts remain unreviewed. Earlier threshold-tier design is superseded.

**UI debt:** audit dead-CSS scan follows only modules imported as styles; Text over gradients/images is not measured by the audit. Shortlisted later: web-design-guidelines, break-ui, kill-ai-slop scanner. Every visual implementation still needs measured audit plus independent ui-reviewer, not just captures.
**Motion:** D11/D12 in ui-doctrine.md; docs/design/ui/motion-review.md; System/Reduced/Full matrix, ui:motion, real-time ui:film. Ready-cue audio/impact synchronisation debt above remains.
**Workshop:** CLAUDE.md/.claude are versioned; .claude/state, .claude/patches and local settings remain local. Codex/AGENTS counterparts remain local.
**Shared server:** verify game identity, pin seed 7, default four Playwright workers; never stop another app on 5173. Wait for images before geometry.
**Shipping:** release-doctrine R0 — player-informative design/art earns a version; documentation-only work is maintenance, committed/pushed to main without changing stamps. Keep verified, implemented and published states distinct.

Earlier release details and evidence pointers: [roadmap](../roadmap.md), [implementation status](../design/implementation-status.md), [standing facts](standing-facts.md). Art review history (closed) remains under playtest/art-review-2026-10-24/.
