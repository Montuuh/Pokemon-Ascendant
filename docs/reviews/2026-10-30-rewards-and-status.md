# Rewards and combat status review — 2026-10-30

User playtest brief: improve Safari rewards, make Held Items more available, enumerate all current combat conditions and assess both sides. The user chose **strong Sleep/Freeze control with limits**. This review owns the evidence and rationale; current rules live in §2.11.6, §7.4.1 and §4.2.

## Safari: restore value after losing exclusivity

The park originally sold access to species absent from routes. Since v0.9.7 those species also appear on routes, but the ticket still bought only recruits. A full Box could make an otherwise successful visit feel empty.

Alternatives considered:

- More balls/time: increases recruitment volume and weakens the approach puzzle; does little when the player wants to keep their team.
- Guaranteed catch or much higher odds: reduces the value of stalking well and raises recruitment power directly.
- **First-catch Ranger gift (implemented):** one useful, unowned Held Item in the bag per visit. The catch still matters, including when Swap-or-Skip declines the recruit. Exhausted useful equipment pays resale value instead (90 ₽). A failed or abandoned visit pays nothing. Later catches cannot repeat it.

The ticket advertises the gift before payment. A saved receipt survives the recruit/evolution screens and reload. The gift uses a run-and-Region-derived Safari substream, so awarding it does not move stalk throws, boards or the run's loot cursor. Old visits without the optional receipt remain loadable; an already-caught spot prevents a retroactive second gift.

This improves the value of a successful visit, not specifically the chance of catching a Rare. Easy-first gains the same gift; the Rare remains a recruitment choice. At unchanged odds, 150 seeds per city/order measured Pallet rare-first 1.47 catches/visit and 45% Rare visits; Celadon 1.47 and 37%. Easy-first gave 1.59/1.94 catches, with Rare visits 17%/0%. These are harness policies, not human success rates.

## Equipment: access and usable alternatives

The old 20% trainer drop rate gives only 0.8 expected items over four trainers, with a 41% probability of none. The Elite also rolled 20% in code despite canon promising a guaranteed item. Typed items were drawn uniformly even when nobody knew a matching attack. Shops already sold equipment; their availability and relevance were the problem.

Implemented:

- Trainers: 50% chance of one item; four victories now give two expected items and a 6.25% probability of none. These are distribution calculations, not measured route counts or a guarantee.
- Elite Trainer: one item guaranteed when eligible equipment remains.
- Travelling merchant: one equipment slot always; the existing one-in-five Common relic becomes an optional extra slot. No increase in relic frequency.
- Pallet Mart: two distinct equipment alternatives; Celadon Department Store retains four.
- Curated drops, shelves and the Safari gift exclude pending/signature/owned items. A typed bonus must match a damaging move in a Box member's learned pool; Eviolite needs an unfinished evolution, Power Bracer a Melee attack. Generic alternatives remain available. Ground finds retain the broader generic pool.
- Keep the 300 ₽ list price and 390 ₽ City price. A simultaneous discount was rejected after design review: improve access first and keep the money decision meaningful.

Trainer picks mixing equipment and Common relics were considered. They would give more agency, but reopen the previously measured relic-saturation problem and let a reward intended to fill equipment slots become another party-wide power source. This pass preserves relic budgets. The route Trader and Black Market Trader retain their Pokémon-exchange identity; the travelling merchant is the vendor improved here.

## Every current status: player, enemy, judgement

There are **six named conditions** in `src/sim/types.ts`: five primaries and independent Confusion. A new primary replaces the old one. All six carry between fights with remaining duration; stat stages reset. Existing type/ability/field immunities and cures remain.

### Burn — retain

Both sides lose `floor(EffectiveMaxHP/16)`, minimum one, per active Resolution, and Attack is multiplied by 0.75. It lasts until cured; Fire is immune. It reduces offensive pressure while adding attrition. Benching does not stop the tick, so a swap protects the team from weaker offence rather than curing the burn. No redesign is justified by this audit.

### Poison — retain, including Toxic

Both sides take the same base tick and Defence is multiplied by 0.85. Poison and Steel are immune. Its offensive opening distinguishes it from Burn's pressure reduction. Toxic is an escalating Poison variant, not a seventh slot: the base tick doubles with ticks taken, capped at one eighth of Effective Max HP. Its counter and status travel together; a cure removes both. Preserve the existing rule and cross-fight cost.

### Paralysis — retain identity; repair enemy accounting

For three active turns, the affected Pokémon's cards cost +1 AP, Speed halves and critical-rhythm pace slows. The swap action itself gains no surcharge; slower Speed can lose a quick swap. Electric is immune. On enemies, it removes unaffordable moves while preserving declared actions. The two-action enemy previously checked each move against three AP but charged only printed costs to the shared budget. Both selected actions now include the surcharge in that budget, retaining the existing per-move limit. This makes the same economic disruption work against both sides.

### Sleep — retain strong control; close replacement bypass

The affected player's cards are unavailable, but position stays free: another Pokémon can take over. An enemy misses its next declared action turn. Duration remains one; there is no type immunity. One denied turn is powerful but still supports a tactical response.

The old guard only inspected the current primary. Sleep alone let the enemy act 5/10 turns; Poison followed by Sleep each turn erased that guard and reduced it to 1/10. The new per-Pokémon control history survives primary replacement and cures. A control application on turn N lasting D blocks either disabling condition through N+D, independently of the current primary. The adversarial loop now permits 5/10 actions. Carried/seeded disabling statuses initialise that window on either side; fainting clears it. No new blanket boss immunity.

### Freeze — retain stronger, bounded control

One turn of unavailable cards plus position lock: no manual swap in/out, Step-Forward or Step-Backward destination. Fire and Ice are immune; Fire damage against the frozen target is multiplied by 1.5. A fainted frozen Lead never traps replacement selection. Enemies miss the relevant action turn and take the same Fire multiplier.

The Fire opening benefits the attacker; it is not compensation for the frozen target. The limits are duration, immunity and shared Sleep/Freeze history. This temporarily suspends the swap decision (Pillar 2 tension), within the strong-control option explicitly chosen by the user. The opponent's declared move is retained; applying Freeze is not a surprise cancellation of this turn's intent.

### Confusion — redesign the player's loss; repair enemy duration

Old player effect: each confused member removed a random card from the whole hand, potentially destroying an unaffected teammate's only response. New effect: each affected owner fumbles at most one **own** skill card before the hand is read. If none were drawn, no discard, but the three-turn clock advances. Three confused members can remove at most three from an ordinary five-card draw. Consumables remain available. Hand-Off Pouch may redraw the same card without triggering another discard for that owner in that Draw.

Enemy effect stays uniform selection among legal intents for three active turns, declared before the player acts. This preserves the previous user decision on phases. The enemy's timer previously never decreased; it now expires after three active Resolutions. Trainer's Instinct's already-announced legal future plan takes priority over a new selection when Confusion starts or expires (§5.5.1). Confusion can therefore lower average intent quality without guaranteeing that every individual choice is weaker.

## Timing and adjacent combat state

The old §4.2 introduction claimed statuses cleared after combat, contradicting its carry-over rule. Its blanket next-turn timing also contradicted actual stat/cost/position helpers. Canon now states the existing operational split: immediate stat/cost/card/position effects; declared intents retained; delayed DoT/countdowns. Recovery after cure/replacement is explained on the affected Pokémon's tooltip; rejection text no longer falsely calls a healthy or Poisoned Pokémon asleep.

Other state exists but does not add primary status conditions:

- Attack/Defence/Speed stages (−6…+6), regeneration, damage shield, next-hit Chill, critical rhythm, Trauma and Faint.
- Item/ability restrictions and charges: Choice Scarf/Power Bracer, endure/Sturdy, status/Cleave guards, defensive-swap discount, free swaps and item caps; Sabrina's sealed card and the Faint Echo modifier.
- Enemy cooldowns, phase state, committed intent/next plan, Acting Twice's stagger/broken second action, Cover formation and encounter objectives.
- Ten Battlefields: Sunny Day, Rain Dance, Hail; Electric, Grassy, Psychic and Misty Terrain; Sandstorm, Toxic Spikes and Sticky Web. Home Field, Gym rules and Legendary arena rules are encounter state.

These families retain their owning rules. This work does not add classic Pokémon conditions absent from the sim (such as attraction, flinch, Leech Seed or a new badly-poisoned status slot).

## Matched run measurement

Real `autoRun`, unchanged policy, three starters × 240 seeds (7001–7240), full route through the League: **720 baseline + 720 changed runs**. Baseline is an isolated export of pre-change HEAD; no other branch's gameplay is included. The measurement script and logs are in `playtest/design-fixes-2026-10-30/` (local, Git-ignored evidence).

- Region 1 clear: 57.1% → 55.8%.
- Region 2 given Region 1: 56.9% → 62.9%.
- Region 3 given Region 2: 47.4% → 54.9%.
- League given Region 3: 54.1% → 48.2%.
- Whole run: 8.3% → 9.3%.
- Occupied equipment slots entering the first Gym: 562/1297 (43.3%, 437 arrivals) → 996/1292 (77.1%, 435 arrivals).
- Net items held at the end of **all attempts**: mean 3.04 → 6.67. This is not a source drop-rate measurement; later survival and unused bag stock also affect it.

Equipment availability improves substantially without making all first-Gym slots automatic. Conditional rates use different surviving cohorts; one fixed seed block is one sample, not proof of individual causal effects or a final balance calibration. No enemy tier was retuned against it.

## Review and verification

Independent designer: **Proceed with notes**; retain price, guard exhaustion, preserve bounded control and explain information. Independent QA: no reproduced blocker; focused suite and extra seeded-control/Pouch probes passed. Their requested durable regressions and committed-plan clarification were added. Independent UI reviewer: **Ship** after adding the receipt's reusable equipment tooltip, a durable real-catch/declined-recruit browser regression and removing a stale four-offer comment. Merchant five-slot scrolling/purchase, ally/enemy recovery, hover, keyboard focus and Escape were checked at 720p/150%. Screen-reader and full-motion behaviour were not newly verified; this change adds no motion.

Regression proof: copying the new tests into the isolated old source gave **12 failed / 73 passed**, across six files. The changed source passes the focused suite. This includes the observed 1/10 → 5/10 control loop.

First full-check failure, retained in `check-initial.log` and fixed with a discriminated-event guard:

```text
src/sim/combat/status.test.ts(85,68): error TS2339: Property 'targetUid' does not exist on type 'CombatEvent'.
src/sim/combat/status.test.ts(85,113): error TS2339: Property 'status' does not exist on type 'CombatEvent'.
```

Final local verification:

- `npm run check`: exit 0, **979 passed / 3 skipped**, typecheck/lint (one existing Fast Refresh warning), section/catalogue guards and all version stamps agree.
- Exact staged-source export with fresh `npm ci --ignore-scripts`: production build passes; **95 focused tests** pass on that clean dependency install. No dependency versions were changed.
- Strict UI audit: **Capture 5/5 complete; Quality gate no measured blockers; Review not performed by the measuring tool**. Independent reviewer supplies **Ship** separately. Forty-three text blocks over images/gradients remain outside automatic contrast measurement. Additional 720p/150% images include both recovery tooltips, the gift receipt and its pointer/keyboard door, Mart equipment and a five-offer merchant. Review queue cleared.
- Latest Safari/browser screenshot suite: **19 passed**, including a real seeded catch into a full Box, declined recruit, item retained and pointer/keyboard receipt explanation.

Earlier full-check failures were retained and resolved, without weakening thresholds:

```text
FAIL src/content/changelog.test.ts > EveryEntryIsBrief_TheMainPointsOnly
AssertionError: v0.9.85 · Equipment: expected 76 to be less than or equal to 70
FAIL src/sim/balance/runBalance.test.ts > Run_TakingAServiceNode_IsNotATrap_the merchant
FAIL src/sim/balance/runBalance.test.ts > Run_TakingAServiceNode_IsNotATrap_a Mystery
Error: Test timed out in 122000ms.
FAIL src/sim/replay/golden.test.ts > wild-boss-3phase
Expected: events=94 rng=2418029724
Received: events=95 rng=2792278177
```

The changelog was shortened. The deliberate three-turn enemy Confusion expiry adds a cleared-status event and changes subsequent RNG selection; only the three-phase golden fingerprint was updated (actions, turns, outcome and final HP unchanged). Service comparisons pass on the final check in 85.9s/79.8s; the earlier heavily loaded run exceeded their unchanged timeouts.

The first full browser suite gave **456 passed / 3 failed**. Failures retained in `e2e.log`:

```text
Changelog_AllPatchStates_Readable_1280_1: Test timeout of 120000ms exceeded.
Blocked_alone_KeepsPriceTimingReasonAndRejectsPointerAndKeyboard: Test timeout of 30000ms exceeded.
readouts.spec.ts:133: page.evaluate: TypeError: Cannot read properties of null (reading 'enemies')
```

Final triage: each of the three original failing cases passed three repeated single-worker runs on a fresh server. The broader repeated batch gave 28/30; two additional changelog cases were interrupted while source changes invalidated the Vite page and a parallel browser run cleaned their shared trace directory. The latter produced:

```text
Changelog_AllPatchStates_Readable_1280_1.5: expect(getByTestId('changelog-screen')).toBeVisible() failed
Changelog_AllPatchStates_Readable_1920_1: browserContext.close: ENOENT ... .playwright-artifacts-3/traces/...network
```

With source edits stopped and a unique output directory, those two cases passed **three times each (6/6)**. No timeout or product assertion was weakened. Final source/browser checks leave no reproduced product failure. This is not a claim that the initial 459-case run was entirely green.

Publication follows the standing main/push workflow; hosted deployment is checked separately.
