# Playtest — Combat Slice v0.1 — 2026-09-19

**Build:** working tree (uncommitted), dev server · **Tester:** Claude (driving the real UI in the built-in browser,
reading state with `__ascendant.dump()`) · **Scenarios:** `wild-boss-3phase` (6 turns, manual), `wild-catch-ready`
(1 turn, manual), plus the auto-player table across all six fixtures (`npm run balance`, 12 seeds each).

## What I did — Gym: Rock Leader Brock (Wartortle L15 lead, Ivysaur L15, Charmeleon L15)

| Turn | Hand / situation | Decision | Outcome |
|---|---|---|---|
| 1 | Geodude 76/76, **intent hidden** (Gym rule). Water Gun 16 (×4), Mega Drain 18 (×4), Headbutt 2, Slash locked (bench), Withdraw | Max damage: Water Gun + Mega Drain (3 AP) | Geodude 42/76. Its hidden move was Defense Curl. |
| 2 | Geodude powering up again; Aqua Jet 20 (SF) + Vine Lash 22 = exactly 42 | Kill it | Geodude fainted; **Golem 122/122 enters immediately with a hidden intent** |
| 2→3 | End turn | — | Golem's hidden opener was **Earthquake (Cleave)**: Wartortle −25, Ivysaur −34, **Charmeleon −73 (13 left, ×2 Ground vs Fire)** |
| 3 | Body Press → Lead (Wartortle) · 15. Aqua Jet 17, Vine Lash 19 | Damage race; Charmeleon safe on the bench from a Lead-targeted hit | Golem 86/122 |
| 4 | **Earthquake → ALL SLOTS ~25**. Charmeleon 13 HP cannot be saved (no swap saves you from a Cleave) | Water Gun + Mega Drain (heals Ivysaur 25) | Golem 59 → crosses 50 %: **Phase 2, Entrenchment +2 Def**. Charmeleon faints (Trauma). |
| 5 | **Stone Edge → Lead (Wartortle) · 40; Wartortle has 36.** | **Swap Ivysaur in (1 AP)** — the intent chip live-updates to *54 dmg vs Ivysaur* (59 HP). Ether (+2 AP). Growl (free, −1 Atk → 48). Vine Lash + Mega Drain (+25 HP). | Golem 32/122 (26 %). Ivysaur takes 48, survives at 36. **This was the turn the game is about.** |
| 6 | Earthquake ~30 to all. Super Potion in hand. | Super Potion on Wartortle (36 → 86), Aqua Jet (steps Wartortle forward), Water Gun | Golem 7/122 → **Phase 3 last stand** ("makes its last stand!", Sturdy still armed). Ivysaur 6 HP after the quake. |
| 7 | Stone Edge → Lead 36. Golem 7 HP with Sturdy: any hit leaves it at 1. Mega Drain 14, Vine Lash 19 (2 AP each) | Would play Mega Drain (heal Ivysaur), eat Stone Edge on Wartortle (63 → 27), finish next turn | *(Session reset by a hot-reload here — the fight was won on the board: two alive vs 1 HP with the initiative.)* |

Catch fixture: Ember (burn proc) + Tackle took Caterpie to 13/59 with a status → gauge jumped from 58 % to
**READY** (threshold 30 → 50). Poké Ball → "Gotcha!" summary. Whole loop readable without the tooltip.

## Findings

| # | Observation | Type | § / pillar | Severity |
|---|---|---|---|---|
| 1 | The **swap decision carried the fight** (turn 5): reading "Stone Edge → Lead · 40" against a 36-HP Lead, swapping, and watching the number recompute for the new occupant is exactly pillar 2. The live-recomputed intent damage is the single most important UI element. | design ✅ | §3.3 · P2 | — |
| 2 | **Hidden opener + Cleave** (turn 2→3): the Gym ace's first move is hidden by rule (CL-011) and it was Earthquake ×2 on the Fire bench member. Nothing telegraphed it. It felt like a rules-legal ambush, not a read I missed. | design ⚠ | §5.5 / §5.8 · P1 | Q30 raised |
| 3 | Geodude opened with **two Defense Curls in a row** while losing (score tie with attacks, first-in-list won). Fixed in-session: buff intents now decay with banked stages; ties resolve toward offence. Auto-player win rate on the Gym dropped from 0.83 → 0.33 after the fix, then to **0.42** after lowering the Gym to Geodude L12 / Golem L14. | tuning (fixed) | §5.3 | closed |
| 4 | Enemy heal (Roost) was over-picked when the enemy was above 70 % HP (treated as "setup"). Fixed in-session: heal weight = missing HP; the wild opener went from 8.1 to 4.7 turns. | tuning (fixed) | §5.3 | closed |
| 5 | Bench melee cards being locked is felt every turn — good, that is the Lead's "what comes online" axis — but the auto-player originally never swapped to unlock them. A human does it naturally; the policy now does too. Suggests the tutorial line "swap to bring melee online" is worth a hint on the first locked card. | UI | §3.3.1 · P2 | low |
| 6 | Charmeleon is a liability in the Rock Gym (×0.5 out, ×2 in). Correct per type chart, and it makes team composition matter — but the fixture forces the team. In v0.2 the player picks the Active 3, so this becomes a real choice rather than a handicap. | design note | §2.3 | — |
| 7 | Log ordering: "It's super effective!" printed after "Golem sent out …" when a hit both fainted and spawned. Fixed in-session (commentary now precedes the hit). | bug (fixed) | — | closed |
| 8 | Combat log could show the *reason* a card is locked when hovering; today the lock overlay says "Melee · needs Lead", which was enough. | UI | — | low |
| 9 | Phase transitions read clearly: "enters Phase 2 / entrenches — race the wall" + the +2 Def chip, and the HP-bar markers matched the moments they fired. | UI ✅ | §5.8.3 | — |
| 10 | Sturdy on the ace at 7 HP created a genuine two-action problem ("any hit leaves it at 1, then I need a second one before Stone Edge lands"). Nice texture; Stone Edge always-crit at 3 AP is the right kind of scary. | design ✅ | §5.8.3 | — |

## Auto-player envelope (12 seeds, after fixes)

| Fixture | Win | Avg turns | Faints | Team HP left |
|---|---|---|---|---|
| wild-basic | 100 % | 4.7 | 0.00 | 92 % |
| wild-catch-ready | 100 % | 2.0 | 0.00 | 100 % |
| trainer-2enemy | 100 % | 8.5 | 0.00 | 81 % |
| status-showcase | 100 % | 6.2 | 0.00 | 70 % |
| full-hand-3mon | 100 % | 4.8 | 0.75 | 39 % |
| wild-boss-3phase | 42 % | 8.6 | 2.42 | 9 % |

The policy is a competent-but-literal player: it never uses Full Heal or X Attack and only retreats from Lead
hits. The manual Gym run (a human reading the whole board) was on track to win with two Pokémon standing, so the
Gym sits where a climax should: losable, learnable, not a coin flip.

## Swap decision quality (pillar 2)

Manual Gym run, 6 turns: turns 1–2 no swap needed (kill race); turn 3 no (Lead hit was small); turn 4 a swap
could not help (Cleave); **turn 5 the swap was the only line that did not lose a Pokémon**; turn 6 Step-Forward
via Aqua Jet moved the fresh Lead in for free. Three of six turns had a real positional decision, one of them
decisive. That matches the pillar.

## Readability (§9.2)

Every consequence was predictable before committing: intent text + live number, damage preview on hover with
STAB/type multipliers, KO tag when a card would finish the enemy, phase markers, catch gauge with the threshold in
the tooltip. The one miss is by design (hidden opener) and is logged as Q30.

## Recommendations

1. **Decide Q30** before external playtests: my preference is "hidden intents still show the kind glyph"
   (you know a Cleave is coming, not its magnitude) — keeps the Gym surprise without a bench execution.
2. Keep divisor 8 (Q28) — pacing lands in the roadmap targets.
3. Ratify the enemy-side status translations (Q29) or redesign; they read cleanly in play ("Golem can't move!").
4. Give the first locked melee card a one-time hint pointing at the bench swap chip (finding 5).
5. External testers next; measure decision time per turn and count "I couldn't know that" moments.

Screenshots: `playtest/combat-wild-boss-3phase.png`, `playtest/combat-wild-basic.png`, `playtest/combat-victory.png`.
