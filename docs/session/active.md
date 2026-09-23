# Session State — Pokémon Ascendant

**Date:** 2026-09-24 · **Version:** v0.7.4 shipped (*Region 3, Volcanic Highlands*).
**Sprint goal next:** v0.7.5 — *The leftovers*: Evolution Items (Eevee's Stone Cache, the Mysterious Stone), the
intent queue (Trainer's Instinct), the six pending hidden abilities, the unwritten Mastery moves (Regions 2 and 3
lines too), the inert relic rows, the Master Ball Charm criterion. Exit: nothing marked "pending v0.7".

**v0.7.4:** Region 3 is a `RegionContent` of its own (`*_R3` in `run/region.ts`): Volcano 5 · Cave 3 (Fighting and
Ice lanes) · Sky 2 · Tower 1, band 22–30, 12 rosters (Hex Maniacs `veiled`: first intent hidden), Boss Giovanni,
Aerodactyl, Sabrina/Giovanni/Kiyo/Lorelei (scripted off-type aces). Marsh · Earth · Knuckle · Glacier live (new
`status-chill` hook). R3 Attack tier ×2.3 → ×1.95 (720 runs: R3|R2 47 %, full 15 %, 4.9 turns). R2 Elite renamed
Koichi. Plate + Tower backdrop generated; sprites/emblems fetched. Also: **What's new** (CHANGELOG.md, read by the
game) and the **release doctrine** (`docs/release-doctrine.md`, `ship-version` skill, `check:version`).

**Findings to act on:**
- Since v0.7.4 (in `## Next`): Badges renamed as in the games (Soul ↔ Marsh, Plain, Knuckle; save v10 migrates).
  Ditto's Transform → backlog. The written design is mutable: decide names/items directly (CLAUDE.md, rules).
- The Poké Mart shows unmet starters by name (§8.9.2 is Pokédex-only).
- Map caption `font-size: 11px` should be `--type-caption` once 720 has room; the tick's `#2f7d4f` has no token.
- Not built (§2.11): Daycare/PC Box at the Center, scored shop curation; Safari, Black Market, extra-moves doors.
- 13 abilities in `abilities.json` still carry 🆕 in the catalogue (stale marks, pre-existing).
- Backlog (roadmap): animated catch, the Ring as its own building, a dual multiplayer mode (to talk through).

**Test status:** `npm run check` green — 493 Vitest, typecheck, lint, §, catalogue and version guards.
**Shipping:** every version follows `docs/release-doctrine.md` — CHANGELOG entry (or `## Next` between versions),
`npm version`, roadmap mark, README status, this header. **UI review loop:** `ui-review` skill after any UI change.

## Standing facts

In [`standing-facts.md`](standing-facts.md). The header above is rewritten every version; the facts are not.
