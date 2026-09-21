# Session State — Pokémon Ascendant

**Date:** 2026-09-21
**Version in progress:** **v0.6.x — closing the pending design points before v0.7.** v0.1–v0.6 complete; v0.6.2 is the shipped build.
**Sprint goal:** the pre-v0.7 close-out. Done today: the Hub redrawn (v0.6.1 — level dial, the reward road, the
Pokédex legend, a shop that sells); **Bond** replacing Pokédex tiers + Mastery levels (§6.8); **catching as a
shown roll** (§2.6.4); **running with a toll** (§3.1.2); the two v0.6 track/Insight flags decided. One proposal
is with the user: the Poké Mart as "the shop of the pass".
**Shipped this session (v0.6.1–v0.6.2):**
- **Bond (§6.8)** — per line, from play: +1 per won fight in the Active Team (+1 leading), +5 evolution, +2 first
  recruit, +8 finishing a run, +15 winning. Ranks 5/15/35/60/100 → Mastery Lv1 · Shiny · hidden ability (the
  line's third authored; 6 lines pending) · Lv2 · Lv3 or the opening-hand card + starter eligibility. Pokédex =
  Familiar only. `meta/bond.ts`, `hiddenAbility` on species, `abilityLocked` at the Dojo, Companions tab.
- **Catch (§2.6.4)** — `p = catchRate × (1 − 0.9·HP%)^1.7 × status × ball`, 1–90 %, seeded; species `catchRate`
  (Snorlax 0.2); Master Ball Charm live (`guaranteed-catch`); pill prints the %.
- **Run (§3.1.2)** — `flee` action: parting shot, Escaped, toll by tier (`run/flee.ts`); never from a Gym.
- Hub on `radix-ui` / `motion` / `@number-flow/react` / `react-circular-progressbar`; `useMotionPref()`.
- Tooltips re-anchor on scroll (a focus that scrolled the page was closing its own bubble).
**Next action:** the user's call on the Poké Mart redesign (track pays +2 Tokens per level and opens shelves:
Trainer's Corner L1 · Starters L3 · Hub upgrades L5 · Discoveries L8 · Mastery lane L10). Then v0.7.
**Blocked on:** that call. Nothing else.
**Last commit:** see `git log -1` — v0.6.2.
**Test status:** `npm run check` green — 380 Vitest, typecheck, lint, § and catalogue guards. 55/55 Playwright.
**Balance:** unchanged by the account (harness is account-less); the catch roll changed the autoplayer's throw
rule to "50 %+", inside the balance envelope.
**Open questions:** (a) the Mart redesign above. (b) end-of-run ₽ surplus — parked until the full run exists.
(c) consumables spent-but-found-more-often — mentioned by the user, not yet valued; catch/flee balance waits on it.


## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
