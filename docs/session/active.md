# Session State — Pokémon Ascendant

**Date:** 2026-09-22
**Version in progress:** **v0.6.x closed — v0.7 next.** v0.1–v0.6 complete; v0.6.5 is the shipped build.
**Sprint goal:** the pre-v0.7 close-out is done. 2026-09-21: the Hub redrawn (v0.6.1); **Bond** (§6.8); **catching
as a shown roll** (§2.6.4); **running with a toll** (§3.1.2) (v0.6.2); **the Poké Mart as the shop of the pass**
(v0.6.3). 2026-09-22: **the PC Terminal as pictures and sheets** (v0.6.4), then **one Pokédex** (v0.6.5 — the
Companions tab folded in). Open with the user: the type-icon set (the web uses the official-glyph set, same as
Unity's final; the `_old` set was the minimal one) — awaiting confirmation.
**Shipped in v0.6.4–v0.6.5 — the PC Terminal (§8.9.1, §8.9.2):**
- Three tabs: Pokédex · Medals · Discoveries. The Pokédex is a card grid (number · sprite · name · type glyphs ·
  five pips for the line's Bond rank; silhouettes for unfaced species; "By number / By Bond" order). Every card
  opens a sheet (`hub/PcSheet.tsx` — Radix Dialog with a Back stack) with three tabs: Record tiles + Familiar
  line · Kit (line learnset, tutor list, Mastery Moves, abilities w/ hidden, evolutions as doors) · the line
  (`LineSheet` embedded: stages as doors with the current one marked, Bond bar, named ladder, how Bond grows).
- **Record** on `DexEntry`: encounters, caught, recruits, knockouts, faints, damageDealt, evolutions
  (+ `normalizeDexEntry` for old saves). Fed by `CombatTally.koBy/faintsOf/damageBy` (counted at `emit()`),
  report `enemies`, event `caughtSpecies` and `fromSpeciesId`. Testids: `dex-<id>[data-met]`, `dex-sheet`,
  `dex-stat-<key>`, `dex-sheet-knowledge`, `dex-sheet-tab-record|kit|line`, `dex-order-dex|bond`,
  `dex-<id>[data-rank]`, `line-sheet[data-rank]`, `line-stage-<id>`, `pc-sheet-back/close`. `bond-<line>` and
  `pc-tab-companions` are gone.
**Shipped in v0.6.3 — the Mart (§8.3.4, §8.3.5, §8.4.1, §8.4.2, §8.4.4, §8.5.2, §8.6.1):**
- The track **pays Tokens at every level** (2; 5/5/8/8/10/10 at milestones; 92 by Level 30) and **opens
  shelves** at 3/5/8/10. Nothing else is on it. `REWARD_TRACK` is derived, `TrackReward = {tokens, opens?}`.
- Five shelves in `meta/mart.ts` (`shelfItems`, `martPrice`, `buy`, `wear`): Trainer's Corner Lv 1 (titles 2,
  avatars 3, frames 2, Curated Starting Relic +1 3) · Starters Lv 3 (Magikarp 4, Eevee 6, Pikachu 6 — priced,
  `pending` until its kit) · Hub upgrades Lv 5 (4–8; pending ones priced, not sold) · Discoveries Lv 8 (any
  undiscovered Tier-2, 4; Reactor Core stays on the lane) · Mastery lane Lv 10 (Tier-3, 5). `shopTotal` ≈ 214.
- Cosmetics in `meta/cosmetics.ts`; `account.cosmetics` + `account.wearing`; the Trainer Card wears them
  (`card-title`, `card-avatar`, `card-head[data-frame]`). `titles` is gone.
- `ACCOUNT_VERSION = 2`; `upgradeAccount` back-pays 2 Tokens per claimed non-milestone level, keeps granted
  starters/hub, re-keys titles → cosmetic ids. `AccountContext` lost `discoverableRelics`.
- UI: Mart = Radix Tabs per shelf (`mart-tab-<shelf>[data-open]`, `mart-banner[data-state]`, `mart-<id>`,
  `mart-price-<id>`, `mart-wear-<id>`, `mart-tokens[data-tokens]`); road stops are "+N" faces, storefront
  stops at 3/5/8/10 (`track-N[data-opens]`); Daycare prices unbought starters; TrainerCard chips show prices.
**Next action:** v0.7 — *Regions 2 & 3* (see `docs/roadmap.md`): Pikachu's kit, Evolution Items, the intent
queue, Greater Threats, Cities/Trauma Salve Cache, the 6 pending hidden abilities, unshipped Mastery moves.
**Blocked on:** nothing.
**Last commit:** see `git log -1` — v0.6.5.
**Test status:** `npm run check` green — 393 Vitest, typecheck, lint, § (361) and catalogue guards. Playwright
green (see the last run in this file's git history if in doubt).
**Balance:** unchanged (the harness is account-less).
**Open questions:** (a) end-of-run ₽ surplus — parked until the full run exists. (b) consumables
spent-but-found-more-often — mentioned by the user, not yet valued; catch/flee balance waits on it. (c) Mart
prices and track amounts are first numbers; revisit after a few real accounts level.


## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
