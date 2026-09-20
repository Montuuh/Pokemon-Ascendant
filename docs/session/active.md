# Session State — Pokémon Ascendant

**Date:** 2026-09-20
**Version in progress:** **v0.5 Region 1 complete — code done.** v0.1–v0.4 complete.
**Sprint goal:** finish the Region. The route was the first half; the second half is what the route *pays*.
**Shipped this session:**
- **Art audit.** Every battle backdrop is the real one again (Showdown's gen6 rips) — v0.4 had replaced the
  four in-use ones with generated illustrations, and a generated backdrop behind a real sprite is the one
  place the seam always shows. Each Gym now stands in its own lane's biome at depth or at dusk, the `river`
  biome stopped borrowing the forest, and the two encounter builders stopped hardcoding `'meadow'` — which
  had quietly been putting every Hiker in a field four layers into a cave lane. The menu vista and the route
  plate were regenerated as **top-down pixel art**, the same overworld register, and the plate lost the
  painted Gym that was reading as a third one between the two real Gym badges.
- **The four Region 1 Badges (§5.10.1)**, on the same §7.7 hooks as relics.
- **All sixty relics.** Rare joins the drop table at 10 %; Legendary is outside it and comes only from the
  guaranteed **1-of-3 pick at a Gym victory** (§7.3.7), capped at two.
- **The seventeen Region Modifiers (§2.11.3)**, one in force, expiring with the Region, offered as the
  fourth step of the new-run stepper — where `ui/screens.md` §3.3 always drew it.
- **Ten achievements (§8.7)**, folded from events *diffed* off the run so nothing touches the save.
- **The Trainer Hub shell (§8.4)** with the PC Terminal open, and **Settings (§9.6)**: text size at
  80/100/125/150 % and a motion override.
- Two real bugs found on the way: `playedThisTurn` was never written, so every "first card each turn" clause
  in the game was true on *every* card (Choice Specs made all Ranged moves free); and the run looked every
  spent charge up as a relic, which threw the moment a Region Modifier spent one.
- **Renamed to Pokémon Ascendant** (was Evoline). 134 occurrences over 40 files, the dev hook is
  `window.__ascendant`, and the three localStorage keys moved with a migration so nobody loses a save or a
  medal. The folder moved too — `CODE - Proyectos/Pokémon Ascendant`. The rename found its own bug: the codemod flattened the
  migration table onto itself, which fails silently by construction — `app/storageKeys.test.ts` is now the
  thing that would catch it.
**Next action:** a human playtest of the whole Region — the link above is what to hand testers — that is v0.5's exit criterion and the only thing left
in it. Then v0.6 Meta: Trainer XP and Tokens, the other four hub kiosks, Pokédex tiers and Mastery moves.
**Blocked on:** nothing.
**Last commit:** `e2f6577` — GitHub Pages deploy, MIT licence, README rewrite. Public repo at
https://github.com/Montuuh/Pokemon-Ascendant · **live at https://montuuh.github.io/Pokemon-Ascendant/** on every push to `main`.
**Test status:** `npm run check` green — 328/328 Vitest, typecheck, lint, 2,754 § citations, 792 catalogue
ids. 43/43 Playwright. Production build clean.
**Balance (120 seeds):** Bulbasaur 67 % · Charmander 66 % · Squirtle 73 %. A 30-seed table read 63/67/80 and
the 80 was noise — the standing rule about the standard error of a *difference* earned its place again.
**Open questions:** three, all carried. (a) §3.1, whether a *costly* disengage from a wild fight should
exist. (b) Toxic's `⚠ OPEN` in `catalogs/tms.md`. (c) the end-of-run Poké Dollar surplus, to re-measure at
v0.6 — the Gym prize is designed to carry into Region 2 and there is no Region 2 yet.


## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
