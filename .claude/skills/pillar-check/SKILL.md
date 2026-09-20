---
name: pillar-check
description: >
  Fast yes/no/flag evaluation of any proposal, feature, card, relic or implementation against Pokémon Ascendant's 5
  design pillars and anti-pillars. Use for a quick sanity check before deeper design work; use design-change
  for the full options protocol.
---

# Pillar check — Pokémon Ascendant

1. **Telegraphed tactics over reactive RNG** — the player can always plan; randomness lives in what options exist, not whether plans work.
2. **Every swap is a decision** — Lead-swapping has real AP, defence and tempo trade-offs; never free, never arbitrarily punished.
3. **Synergy is sculpted, not drafted** — power comes from interactions between moves, evolutions and relics, never one card.
4. **Identity through Evolution** — branching evolution is the primary creative expression within a run.
5. **Cheerful core, regional flavour** — warm, bright, faithful tone; regions add flavour without changing mechanics.

Tiebreaker: faithfulness loses to pacing and pillar integrity. Anti-pillars: not a Showdown clone (no
speed/accuracy/PP), no card acquisition, no mass collection, not a numbers-go-up auto-battler, not grimdark.

## Output

For each pillar: ✅ aligned / ⚠️ tension (one line why) / ❌ violation. Then one verdict:
**Proceed** / **Proceed with notes** / **Block**. Any ❌ → stop and ask the user: override, revise proposal,
or revise pillar.
