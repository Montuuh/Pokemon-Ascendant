# Enemy phases and Gym roster review — 2026-10-29

Status: runtime audit complete; twelve replacement teams and the chosen phase contract authored, not
implemented or balanced. Observations below describe the old runtime; they are not the newly selected rules.
The user chose **five members, permitting one thematic off-type support**. Canon is §5.9.3 and
`../design/catalogs/gyms.md`; this report records observations and alternatives, not a second rule source.

## Reproduction and evidence

Local evidence: `playtest/enemy-phase-gym-review-2026-10-29/` (ignored, retained).

- `probe.mjs`, `probe.json`, `probe.log`: real registry and combat reducer, seed 42; evolved roster enumeration,
  HP-threshold/entry mismatch, healing, lethal-hit Sturdy probes. High-level Blastoise makes the latter lethal;
  these probes prove rules, not realistic damage balance. The initial probe used the wrong species ability field;
  after correction it uses availableAbilities and species stage. The first low-power setup did not deal lethal
  damage; the final setup verifies the lethal cases instead of treating the original result as evidence.
- `focused-baseline.log`: `npx vitest run src/sim/combat/boss.test.ts src/sim/combat/gymRules.test.ts
  src/sim/run/mapRules.test.ts` — **43/43 pass**. Existing tests do not guard all the gaps below.
- `capture.mjs`, `ui-baseline.json`, `phase-threshold-1920.png`, `phase-threshold-1280.png`: existing
  wild-boss-3phase fixture, seed 7, text scale 150 %, reduced motion. Dev setHp places the opening Geodude at
  30/77 HP to isolate the discrepancy; it does not pretend a real player action occurred. Both captures show
  Phase 2/2 while stored phase is 1, enteredPhase2 is false and Defence is 0. Images were inspected.
  A second pair, phase3-1920.png / phase3-1280.png, first defeats the opener with a dev-seeded Water Gun,
  then sets Golem to 22/149 HP: Phase 3/3 is shown while stored phase is 1 and both entry flags are false.
- `balance-baseline.log`: PowerShell BALANCE_REPORT=1, REPORT_SEEDS=80, then
  `npx vitest run src/sim/balance/report.test.ts` — **240 seeded runs**, three starters, seeds 9001–9080 each,
  current default policy and real route attrition. Conditional Gym arrivals vary by leader and player route.
- `roster-proposal.mjs`, `roster-options.json`: species, evolution resolution, lines and move pools consulted
  while authoring. All replacements use the existing 155-species registry.
- `validate-catalog.mjs`, `catalog-validation.log`: **12 teams / 60 members / 240 existing move references**
  pass checks for unique resolved species/lines, type/guest/ace constraints, four distinct moves, default-starter
  and Legendary exclusion, and a pure-status option on phased Status Siege members. This checks authored data,
  not runtime implementation or balance. Independent designer verdict after corrections: **Proceed with notes**.
- Phase-decision follow-up: `signature-options.mjs`, `signature-options.log`, `validate-signatures.mjs`,
  `signature-validation.log` and `catalog-validation-phase-decision.log`. All **20 signature profiles** use
  existing damaging moves, matching printed AP and the base per-move cap; each has an authored response.
  Every Gym signature belongs to its ace's four-move kit, and all 60 authored kits have no unaffordable base
  AP slot. These checks validate the design data; the new phase behaviour is not implemented yet.

The first full `npm run check` passed typecheck, lint (one existing Fast Refresh warning), **967 tests with
3 skipped**, and all § references, then failed the catalogue guard because Gym ids appeared in prose rather
than definition headings. The original failure is retained in check.log; the headings now define the ids.

```text
⚠ 12 referenced id(s) with no definition:

  bug-gym-r1                 used in gyms.md
  electric-gym-r2            used in gyms.md
  fighting-gym-r3            used in gyms.md
  fire-gym-r2                used in gyms.md
  grass-gym-r2               used in gyms.md
  ground-gym-r3              used in gyms.md
  ice-gym-r3                 used in gyms.md
  normal-gym-r1              used in gyms.md
  poison-gym-r2              used in gyms.md
  psychic-gym-r3             used in gyms.md
  rock-gym-r1                used in gyms.md
  water-gym-r1               used in gyms.md
```

Final verification after the heading fix: **`npm run check` exits 0** (check-final.log), **967 passed /
3 skipped**, 7,376 § references resolved, 1,063 catalogue definitions / 1,114 references resolved, and all
v0.9.84 stamps agree. Lint retains one pre-existing react-refresh/only-export-components warning at
`src/ui/screens/TrainingLevelUp.tsx:10`; no lint errors. No runtime code changed, and no new version or
deployment is claimed by this design/documentation unit.

## Enemy phases: partially functional, poorly explained

1. **Thresholds and basic effects work.** `combat/boss.ts` computes phases at ≤50 % and ≤20 % HP;
   Entrenchment adds +2 Defence once, Tempo Control taxes AP, Onslaught filters to offensive intents and
   Status Siege prefers status intents when legal candidates exist. Phase 3 clears cooldowns once.
2. **The displayed phase gets ahead of entry effects.** `EnemyPanel.tsx` renders currentPhase from HP,
   but `turn.ts` applies entry effects at the next Intent phase. Probe: displayed phase 2, stored phase 1,
   Defence 0; after ending the turn, stored phase 2 and Defence +2. A persistent label promises an effect
   that has not happened yet. The existing committed intent must remain honest when crossing a threshold.
3. **Healing reverses the label but keeps one-shot effects.** After entering Entrenchment, restoring HP
   above 50 % displays phase 1 while Defence remains +2 and enteredPhase2 remains true. Re-entering does
   not grant another +2. This follows the current stateless function but needs an explicit player contract.
4. **The final signature is not guaranteed.** §5.8.3 promises an uncapped signature. `intents.ts` still scores
   the same move list, keeps its archetype filter and respects cooldowns after the entry reset; there is no
   authored signature field or forced final-phase selection. A Status Siege ace may continue prioritising
   status rather than a final attack. This is a code/canon gap, not established tuning.
5. **Sturdy is species ability protection, not universal Phase-3 protection.** `setup.ts` grants the first
   evolved-form ability; `damageFlow.ts` checks that ability and its charge, without a boss-phase gate.
   Golem survives a lethal hit at full HP in phase 1 (1 HP, one Sturdy event); Kingler at 2/97 HP, phase 3,
   dies to the lethal hit with no Sturdy event. Only Brock's current ace has default Sturdy among the twelve.
   The natural ability should not be removed to manufacture a phase mechanic; the ace contract needs deciding.
6. **Some UX already exists, but explains no tactics.** There are HP notches, Phase N/M, a transient
   “Phase N!” banner, battle-log entries and a phase sound. The chip has no explanatory bubble. Neither
   inspected viewport explains the threshold's effect, its timing, next threat or response. No UI changed here.

Relevant canon: §5.8.1–§5.8.4, §5.9.4, §9.2.2.3. Relevant code: `boss.ts`, `turn.ts`, `intents.ts`,
`setup.ts`, `damageFlow.ts`, `EnemyPanel.tsx`, `HpBar.tsx`, `useCombatFx.ts`, `audio/sfx.ts`.

## Recorded phase decision — 2026-10-29

The user selected **irreversible escalation with an authored, telegraphed signature and counterplay**. The
owning rule is §5.8.3, replacing the former HP-reversible contract; §9.2.2.3 owns its presentation. The OPEN flag
is closed. This is design completion; the code still exhibits the audited behaviour until v0.9.85 is built.

The independent designer reviewed declaration timing, hidden information, AP, CC, phase skips and natural
Sturdy. Three details were added to avoid contradictions: commitment precedes AP refill; the signature is
fully visible under first-action concealment and Dense Fog; Confusion preserves uniform legal choice rather
than being nullified by forced priority. The one opportunity is spent on declaration, with no free retry,
extra action or universal survival shield. Burst remains an answer. P1–P5 align with the recorded contract;
signature damage, phase frequency and fight-length effects still require runtime calibration.
Final independent verdict: **Proceed with notes, P1–P5 aligned**. The review's two wording points are resolved:
Phase-2 filters stop on Phase-3 entry even while the signature waits, and an encounter's initial low HP seeds
its pending phase before the first Draw. Neither is left as an implementation-time design choice.

The Gym and Elite catalogues now specify concrete signatures/responses for all twelve redesigned Gym aces,
four League aces, the Champion's three possible starters and the Golem practice profile. The shared starter
profiles also cover the reserved three-phase Rival encounter when built; existing two-phase enemies do not
acquire a signature. Inspection caught two 4-AP dead slots: Seadra now carries Ice Beam instead of Hydro Pump,
and Lapras's signature/kit uses Ice Beam instead of Blizzard. The per-move enemy cap is 3 even when Acting Twice
has a larger shared budget. These are authored data corrections, not measured balance changes.

A real UI implementation still needs measured audit and independent ui-reviewer review; the existing baseline
screenshots are neither that audit nor a UI approval.

Decision-recording verification: `npm run check` exits 0 in check-phase-decision.log, **967 passed / 3 skipped**,
7,391 § citations resolved, catalogue and version guards green. The existing Fast Refresh warning remains;
no runtime code, new release or deployed behaviour is claimed. Signature/data checks are recorded above.

## Gym repetition is structural

`gymTeamFor` starts from two rows, fills three positions with lane favourites through padTeam, then the map
resolves evolutions. The pool may repeat once exhausted; distinct young forms may also converge. The ace is
excluded from the opening selection when checking freshness. **All twelve current teams repeat species.**

| Leader | Distinct species / 5 | Current fielded roster, in order |
|---|---|---|
| Brock | 4 | Graveler, Onix, Golbat, Dugtrio, Graveler |
| Misty | 4 | Kingler, Golduck, Poliwhirl, Magikarp, Kingler |
| Aster | 3 | Butterfree, Beedrill, Butterfree, Gloom, Butterfree |
| Whitney | 2 | Pidgeotto, Pidgeotto, Raticate, Pidgeotto, Raticate |
| Blaine | 3 | Arcanine, Raticate, Pidgeotto, Arcanine, Arcanine |
| Erika | 3 | Weepinbell, Weepinbell, Gloom, Weepinbell, Vileplume |
| Surge | 3 | Electrode, Raichu, Magneton, Electrode, Electrode |
| Koga | 2 | Weezing, Golbat, Golbat, Weezing, Weezing |
| Sabrina | 3 | Alakazam, Hypno, Gengar, Gengar, Alakazam |
| Giovanni | 4 | Nidoqueen, Sandslash, Ninetales, Nidoqueen, Rhydon |
| Kiyo | 2 | Machamp, Primeape, Machamp, Primeape, Machamp |
| Lorelei | 2 | Dewgong, Dewgong, Cloyster, Cloyster, Cloyster |

## Difficulty baseline — conditional on reaching each Gym

| Leader | Arrivals | Player defeats | Mean turns |
|---|---:|---:|---:|
| Brock | 48 | 23 % | 12.7 |
| Misty | 38 | 3 % | 15.5 |
| Aster | 34 | 6 % | 11.4 |
| Whitney | 36 | 11 % | 12.1 |
| Blaine | 26 | 15 % | 18.7 |
| Erika | 17 | 6 % | 18.9 |
| Surge | 35 | 0 % | 20.5 |
| Koga | 15 | 7 % | 15.0 |
| Sabrina | 8 | 0 % | 16.1 |
| Giovanni | 26 | 15 % | 15.4 |
| Kiyo | 14 | 14 % | 18.1 |
| Lorelei | 13 | 46 % | 42.4 |

These are small, route-selected samples with an auto-player, not controlled matchups or proof that a leader has
zero difficulty. Regional Gym defeats are 12 % / 6 % / 20 %. R1 clear 57 %, R2 given R1 63 %, R3 given R2 56 %.
The report's “whole run 20 %” is computed from regionsCleared, so describes reaching past Region 3, not a verified
League-win rate. No replacement-team balance measurement has been performed.

## Recorded Gym direction and remaining work

The user rejected neither five slots nor type identity; they explicitly chose **five with a thematic off-type
support permitted** to handle Ice's four non-legendary species. The authoring pass assigns all sixty positions
and four moves per member. Full data is in the canonical catalogue, not duplicated here. Guest exceptions are
Sandslash for Brock, Gloom for Aster and Slowbro for Lorelei; Lapras becomes Lorelei's ace. Other teams remain
fully on-type. No new species and no arbitrary Legendary filler.

Pillar review: P1 ✅ with the guest telegraphed before the fork and included in matchup explanations;
P2 ✅ varied pressure rewards planning swaps; P3 ✅ keeps deck/evolution/relic synergies as the player's tools;
P4 ✅ unique enemy lines and no default-starter-line appropriation; P5 ✅ themed rosters and faithful assets.
R1 fossils' stats and R2's stronger complete teams are tuning risks. Do not declare this balanced from valid ids.
Independent designer review caught two authoring gaps, corrected before closure: the starter exclusion now names
the three default lines rather than excluding Mart starters such as Pikachu/Eevee; Venomoth opens Aster's team
with an actual pure-status move, and Nidoqueen carries Toxic so their Status Siege phase can function.

Implementation must replace Gym padding, carry four scripted moves plus the Region accent, validate resolved
species/lines, update guest telegraphs and Team matchups, measure the same seeds, check the 720-run curve,
and complete UI verification/review. Existing generated Gym previews need a legacy-compatible encounter path
until that Region ends; only newly generated maps use the new roster. A stored old species order must never
receive the replacement slots' unrelated moves or phases, and an active combat must remain intact.
Implementing phases is the next rule/content/UI work package under the settled contract. Its regressions must
cover threshold latching, pre-refill commitment, healing, phase skips/KO, natural Sturdy without universal
survival, CC/AP, signature visibility/legality, opportunity consumption, recoil outcome order and combo-break.
