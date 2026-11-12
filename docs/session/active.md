# Session State — Pokémon Ascendant

**Date:** 2026-11-12 · **Version:** v0.9.119 (*Clear skies*).
**Shipped 2026-11-12 (v0.9.118–119):** Defog clears a move-set field's timer; a fainted result card dims only its sprite (D5); §3.1.2 lists the League and the Ring as un-runnable.
**Shipped 2026-11-12 (v0.9.117):** the last text package (results, run end, Hub, menus); the text pass v0.9.111–117 has covered every surface. **Waiting on the user's look.**
**Shipped 2026-11-12 (v0.9.116):** team, bag and item texts; Speed, One Path, Gym pick, Defog lines fixed. **Waiting on the user's look.**
**Shipped 2026-11-10 (v0.9.110):** the meta-progression rework, all four phases (§8, §6.8; proposal claude.ai/artifact/PWynspTEvWfyvYbDTESPcW): Field Report, vault + Oak's Parcels, Journal, Bond ×6 + Ribbons, nine Ranks, the lobby that fills, Badge Case, Trainer Kit, League Ladder, Hall of Fame. **Account v4 resets.** Not built: Leaders' challenges, lobby decorations. **After it (no version):** two ui-reviewer passes fixed (Field Report never scrolls or outgrows 720p, Journal tiles, Kit desk, Ladder pips, lobby people; `victory-full` audit preset); the Kit's ceiling measured on first-Gym clear rate (§8.4.5, `balance/kitCeiling.test.ts`): Head Start 2 → 1 level, all within +3 / +8. Five stale e2e fixed after it (ring plates, catch pill, TM bubble icon now on its 30 px grid); `ring-art:43` is flaky under load (reads sprites before they load). Changelog regrouped by theme; "Beta" beside the version. **Waiting on the user's look.**
**Shipped 2026-11-10 (v0.9.108):** seven-row map (level tracks, density 2/3), each Gym's field over all its ground and
fought on its leaning track, cleared obstacles gone, Mysteries a "?" again; landmark pixel a step under the tiles (D9, left). R1 22 %.
**Shipped 2026-11-09 (v0.9.107):** the route review's three phases (report claude.ai/artifact/XW2ciawxqoNer3HW7eKySU): a FRLG route — one pixel density, frame, chapters, buildings and set pieces from pret, FRLG weather, §2.5.5 obstacles/ledge (`run/routeFeatures.ts`). 26 e2e failures predate it.
**Shipped 2026-11-07 (v0.9.106):** FRLG visual tasks on a Pokémon play on its sprite (`MON_TASKS`, `mons` in useCombatFx, `.fx-mon-*` in motion.css, §9.9.2). All five causes of the move review are now addressed (report artifact claude.ai/artifact/MB5SLkZH3qHyK2LT85KZVa). **Waiting on the user's look.**
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
**Workshop:** CLAUDE.md/.claude versioned (map: .claude/README.md); state, patches, local settings stay local. Claude Code only (Codex retired 2026-11-11). Hooks: guard, post-edit, ui-stop, slop-stop. **Packages** (R0, 2026-11-11): one commit+push per themed package; a version when players see it.
**Shared server:** verify game identity, pin seed 7, default four Playwright workers; never stop another app on 5173. Wait for images before geometry.
**Shipping:** release-doctrine R0 — work ships in packages, one commit each; a package players see is a version, a docs/workshop one is not. Keep verified, implemented and published states distinct.

Earlier release details and evidence pointers: [roadmap](../roadmap.md), [implementation status](../design/implementation-status.md), [standing facts](standing-facts.md). Art review history (closed) remains under playtest/art-review-2026-10-24/.
