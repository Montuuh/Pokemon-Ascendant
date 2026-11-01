# AP, postponed evolution and the Pokémon Center — 2026-10-30

Status: shipped. Final full-browser rerun (2026-11-02): 443/444, the one timeout (`item-pixels` Summit, 1080p) passing 10/10 in isolation. Release: v0.9.86.

## Decisions and resulting behaviour

- User: Sage’s Tome grants +1 AP at the start of **every** turn, including turn 1; the limit remains 6.
  The previous implementation banked its recurring bonus at turn end, so the opening turn missed it.
- Every committed player AP change uses one ledger writer. The full console retains gains, expiry, spends,
  zero-cost effects, named discounts/taxes, each banked source and blocked excess at the cap. Previews do not log.
  Flow State, Tactician’s Coin and Run Down retain the source of a consumed free swap. The short ticker keeps
  gameplay events; the complete history is one click away and no longer drops entries after 200 lines.
- User: evolution may be postponed and resumed manually from the Pokémon’s Team sheet. The marker is saved per
  UID/source species; subsequent automatic checks skip that stage. Confirmation clears it, applies the branch
  and catches up the evolved learnset. Current eligibility is checked again when resuming/confirming.
- Resuming an explicitly postponed stone preserves its resource and branch even when Catalyst is available.
  A Training right already earned for this stage survives previewing and postponing another resource.
- Stones are reserved when the screen opens and spent only on confirmation; Catalyst also spends only on an
  eligible confirmed early evolution. An already-earned Training Grounds evolution remains available for exactly
  its original stage after postponement/save/load, and never spends Catalyst.
- Center: entering does not heal. The nurse restores the **whole Box** to effective maximum HP and cures primary
  conditions/Confusion for free when asked. Beds now open Therapy: one Trauma stack for 100 × (1 + stacks) ₽,
  without refilling HP. A persistent panel lists current/effective max HP and Trauma for every Box Pokémon.
- Daycare, its paid level, once-per-visit counter and next-fight rest restriction are removed. The separate
  Mystery-event catalogue is unchanged. Old saves keep purchased levels/XP; a previously resting Pokémon is
  available immediately, joining only a free legal team place without displacing the chosen formation.
- Save v22 refunds an old pending stone once, releases legacy Daycare restrictions and recognises old Training
  prompts from their node and recorded grant. Reloading a migrated save grants nothing again.

Canon: §2.11.1, §2.12.3, §3.2.2, §3.8, §6.2.2, §6.3.1–2, §7.3.5; screen contracts in design/ui/screens.md.
Authored Gym teams and enemy phase changes remain unimplemented and move to the planned v0.9.87.

## Independent design and QA

Designer: **Proceed with notes**; no pillar violation in preserving a paid, stage-scoped Training right.
The Training source must survive postponement and must not propagate to a second evolution.

QA found and the implementation fixed:

1. New permanent actions initially lacked store autosave. Real provider/store reload tests now cover stone
   reservation, postponement, resumption, confirmation and requested nurse healing.
2. Confirming another queued Pokémon could reserve the same Catalyst for two early candidates. Existing queued
   early evolutions now reserve its one use; a regression checks the other candidate is not added.
3. A corrupt legacy resting Pokémon could throw while migrating. Migration/content validation now share the
   corrupt-save boundary, with a regression requiring a normal corrupt result instead of a throw.
4. Visible Center help still mentioned Daycare; obsolete copy, tips and CSS have been removed.

## Evidence and verification

Evidence root (ignored local artefacts): `playtest/ap-evolution-center-2026-10-30/`.

- Before the Tome fix, `SagesTome_EveryTurnIncludingTheFirst_GrantsOneMoreAp` failed at turn 1:
  `expected 3 to be 4`.
- New regression files: combat/ap (8), run/centerEvolution (12), app/runStore (3). Latest focused run:
  **3 files / 23 passed**. Existing run/services/swap integration also passed (115 tests before the final additions).
- Initial browser checks had six fixture errors: two queried a nonexistent Therapy test id; four asked the
  six-species dev helper to create eight Pokémon in one call (it created seven). Corrected selectors and an
  explicitly legal expanded Box resolve those failures; **18 browser tests passed**.
- The final layout fixtures use the actual `--text-scale` setting, not root font size: 720p/1080p, 100/150 %,
  full/reduced motion, keyboard and pointer, both ends of an eleven-Pokémon Box scroller.
- Additional browser assertions: postponed stone evolution survives a real page reload and resumes from its
  sheet; a 41-turn fight retains the opening AP entries beyond 200 log lines; requested healing owns the machine
  animation and aligns with the authored room.

- Full `npm run check` on the final reviewed sources: **89 files passed / 3 skipped; 995 tests passed / 3 skipped**;
  references, catalogues and version stamps passed. `npm run build` passed and all 12 audit-tool tests passed.
- Final focused browser suite after the review fixes: **22 passed**. A specific overflow regression was seen red
  with the old 58/34/38 px tracks (`Defense overlaps bar`) and green again with intrinsic shared tracks.
- Measured final audit: **Capture 15/15 complete; Quality gate no measured blockers; Review not performed by the
  audit**. Thirty-seven text blocks over gradients/images remain outside contrast measurement and were read visually.
  CombatLog’s dynamic category classes are used and are not dead CSS.

## UI review

Initial independent verdict: **Ship with fixes**. All requested changes are applied:

- D8 Blocker: stats and three-digit deltas now have intrinsic shared columns; branch title and sprite wrap together
  at 720p/150 %, including shiny sprites and all four Eevee branches.
- D10/D12 Should: an unconfirmed cutscene says “preparing” / “could evolve”; only confirmed evolution announces
  completion. A browser regression reaches the reveal naturally, then postpones it with the stone still intact.
- D4 Should: duplicate service instructions moved behind the health heading’s InfoDot.
- D10 Should: nurse explanation moved into the shared tips module.
- Garbage removed: stale Daycare comments, orphan rejection/type, unused CSS and impossible HP55/49 audit fixtures.

The reviewer drove full nurse animation, keyboard/focus returns, eleven-Pokémon scrolling, both evolution flows,
Settings Reduced with OS Full, and the long log (285 lines, 41 Tome bonuses, turn 1 retained). Audio, screen readers,
mobile and every AP-credit combination were not independently inspected; simulation regressions cover credit types.
Final independent verdict: **Ship**, no findings or garbage outstanding. The reviewer re-read all 30 final audit
captures plus the corrected layout, shiny, footer and full-motion preview evidence, then drove the fixes again.

The first full browser run passed **443/444**. Its one failure still assumed entering/leaving the Center cured Burn.
The existing test now checks an untreated visit preserves Burn, then requests nurse treatment and checks the cure.
Focused rerun passed; the complete suite is being repeated. No product code changed for that correction.

The primary agent also read all ten `screens.spec.ts` captures: menu, scenario picker, six combat fixtures, card
hover and after-play. Version 0.9.86 is visible; controls, status badges, previews, hands and AP remain legible and
within their frames. The changed Center/Team/evolution/AP-console states were read separately at both resolutions,
with 150 % text and both ends of the Box scroller.

The audit-tool contract still required the removed center-daycare preset. It now requires center-therapy,
center-full-box and team-evolution; the original audit-tool failure was:

```text
AssertionError [ERR_ASSERTION]: center-daycare is a required canonical preset
```

The complete rerun then passed **444/444**. A final resource-order audit found two additional cases and added
regressions: a postponed Fire Stone must take precedence over an available Catalyst, and a paid Training right
must survive another stone preview. Both new tests were seen red (`{ catalyst: true }` instead of the chosen stone;
missing Training flag) and green after correction. The three focused regression files now pass **23/23**, and
`npm run check` passes **995 tests / 3 skipped** on that final source. The updated browser cases carry both a stone
and Catalyst and assert the chosen stone is used while the relic stays unspent. Final full-browser repeat (2026-11-02): 443/444; the `item-pixels` Summit
case timed out under four workers and passed 10/10 alone. Published as v0.9.86.

## Earlier check failures, resolved

The first complete check caught short/overlong changelog copy and three old assertions of automatic City healing.
Copy now meets the existing bounds. Those tests retain their healing/cure/ceiling assertions after explicitly asking
for treatment, and also check that entering preserves the Box. Focused rerun: **37 passed**.

```text

 FAIL  src/content/changelog.test.ts > The changelog the game reads — release doctrine > EveryEntrySaysWhatItAdded
AssertionError: v0.9.86: expected 2 to be greater than 2
 ❯ src/content/changelog.test.ts:41:46
     39|       expect(r.items.length, `${r.version} has no bullets`).toBeGreate…
     40|       for (const item of r.items) {
     41|         expect(item.title.length, r.version).toBeGreaterThan(2);
       |                                              ^
     42|         expect(item.body.length, `${r.version} · ${item.title}`).toBeG…
     43|       }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  src/content/changelog.test.ts > The changelog the game reads — release doctrine > EveryEntryIsBrief_TheMainPointsOnly
AssertionError: v0.9.86 · AP: expected 89 to be less than or equal to 70
 ❯ src/content/changelog.test.ts:52:92
     50|     for (const r of CHANGELOG.releases.flatMap((m) => [m, ...m.patches…
     51|       expect(r.items.length, r.version).toBeLessThanOrEqual(r.level ==…
     52|       for (const item of r.items) expect(item.body.length, `${r.versio…
       |                                                                                            ^
     53|       expect(r.lede.length, `${r.version} lede`).toBeLessThanOrEqual(8…
     54|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  src/sim/run/cities.test.ts > The City lobby — §2.11.0 > TheCenter_HealsAndCuresOnTheWayIn_ThenLeadsBackToTheLobby_§2.9.1
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ src/sim/run/cities.test.ts:159:51
    157|     s = apply(s, { type: 'enter-building', building: 'center' });
    158|     expect(s.phase).toBe('center');
    159|     expect(s.box.every((m) => m.status === null)).toBe(true);
       |                                                   ^
    160|     expect(s.box.every((m) => m.hp > 1)).toBe(true);
    161|     s = apply(s, { type: 'leave-center' });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  src/sim/run/finds.test.ts > The heal, recorded — §2.4.2, §9.9.3 > TheCenter_SaysEveryPokemonsHpBeforeAndAfter_AndWhoWasCured
AssertionError: expected [] to have a length of 3 but got +0

- Expected
+ Received

- 3
+ 0

 ❯ src/sim/run/finds.test.ts:128:19
    126|     const at = apply(run, { type: 'enter-building', building: 'center'…
    127|     const lines = at.lastHeal!;
    128|     expect(lines).toHaveLength(3);
       |                   ^
    129|     expect(lines[0]).toMatchObject({ from: 3, to: effectiveMax(at, at.…
    130|     expect(lines[1]!.from).toBe(0);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  src/sim/run/finds.test.ts > The heal, recorded — §2.4.2, §9.9.3 > TheCenter_HealsToTheTraumaCeiling_NeverLeavesHpAboveIt_§2.4.2
AssertionError: expected 999 to be 41 // Object.is equality

- Expected
+ Received

- 41
+ 999

 ❯ src/sim/run/finds.test.ts:143:27
    141|     });
    142|     const at = apply(run, { type: 'enter-building', building: 'center'…
    143|     expect(at.box[0]!.hp).toBe(effectiveMax(at, at.box[0]!, content));
       |                           ^
    144|     expect(at.lastHeal![0]!.to).toBe(at.box[0]!.hp);
    145|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯
```
