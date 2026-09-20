# Session State — Pokémon Ascendant

**Date:** 2026-09-21
**Version in progress:** **v0.6 Meta — starting.** v0.1–v0.5 complete; v0.5.0 is the shipped build.
**Sprint goal:** the pre-v0.6 fixes the user asked for on 2026-09-21 are done; v0.6 proper begins next.
**Shipped this session (pre-v0.6 fixes):**
- **Catching was reading as a broken probability.** The gauge is deterministic by design (§2.6.4) but the pill
  showed `64%` beside a ball, and a throw below READY failed for certain while spending the ball. The pill now
  names the HP target; the Poké Ball card is **locked until READY** and never a wasted throw — a rule change,
  recorded in §2.6.4.1 with its reasoning.
- **Combat chrome:** the back arrow (to the practice picker, from inside a run) and the dead restart are gone;
  one ☰ opens the same pause menu the map has. **Menu:** Quick fight, Practice fights and How to play are off it
  (fixtures stay reachable by `?scenario=`; the rules live in the pause menu).
- **A tooltip system** (`src/ui/tooltip`): one portal layer, 450 ms on hover, instant on focus, Escape/scroll
  dismiss. All 63 native `title=` attributes are gone; every explanation is built in `src/ui/tips.tsx` from the
  content rows so the game speaks in one voice. Move cards, items, intents, statuses, types (with weaknesses),
  portraits, the AP pool, the swap ladder, the catch gauge, node markers, the map HUD, the Box, the Move Manager
  and the Dojo all explain themselves on hover. Seven long screen ledes became one line plus an ⓘ.
- **About screen** with the version (from `package.json`) and a roadmap timeline parsed from
  `docs/roadmap.md` at build time — so shipping a version is two edits and the game follows.
- `package.json` bumped to **0.5.0**.
**Next action:** v0.6 Meta — Trainer XP and Tokens (§8.3), the other four Hub kiosks (§8.4), Pokédex tiers and
Mastery moves (§5.13, §6.8), unlock trees, meta starters (§8.5), relic tiers (§8.6).
**Blocked on:** nothing.
**Last commit:** `e2f6577` — GitHub Pages deploy, MIT licence, README rewrite. Public repo at
https://github.com/Montuuh/Pokemon-Ascendant · **live at https://montuuh.github.io/Pokemon-Ascendant/** on every push to `main`.
**Test status:** `npm run check` green — 337/337 Vitest, typecheck, lint, § and catalogue guards. 52/52
Playwright. Production build clean.
**Balance (120 seeds):** Bulbasaur 67 % · Charmander 66 % · Squirtle 73 %. A 30-seed table read 63/67/80 and
the 80 was noise — the standing rule about the standard error of a *difference* earned its place again.
**Open questions:** three, all carried. (a) §3.1, whether a *costly* disengage from a wild fight should
exist. (b) Toxic's `⚠ OPEN` in `catalogs/tms.md`. (c) the end-of-run Poké Dollar surplus, to re-measure at
v0.6 — the Gym prize is designed to carry into Region 2 and there is no Region 2 yet.


## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
