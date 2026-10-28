import { describe, expect, it } from 'vitest';
import { ctx, dispatch, enemyOf, eventsOf, handCard, leadOf, scenario, start, tweak, withHand } from '../testing/harness';
import { cardPlayability } from './preview';
import { markRhythm, rhythmEvery, rhythmReady } from './rhythm';
import type { CombatState } from './state';

// §4.1.3.1 — the critical rhythm. Squirtle leads with a pinned kit; one Pidgey that only ever Tackles.
const fight = () =>
  start(scenario({
    team: [{ species: 'squirtle', level: 12, moves: ['tackle', 'water-gun', 'tail-whip', 'slash'] }],
    enemies: [{ species: 'pidgey', level: 7, tier: 'wild', phaseCount: 1, moves: ['tackle'] }],
  }));
const pinSpeed = (s: CombatState, mine: number, foe: number) => tweak(s, (d) => {
  d.player.team[0]!.base.speed = mine;
  d.player.team[0]!.level = 1;
  d.enemies[0]!.base.speed = foe;
  d.enemies[0]!.level = 1;
});

describe('Critical rhythm — §4.1.3.1', () => {
  it('Rhythm_TiersReadLevelFreeSpeed', () => {
    const s = fight();
    const at = (speed: number, level = 1) => rhythmEvery({ ...leadOf(s), base: { ...leadOf(s).base, speed }, level }, ctx.config);
    expect([at(140), at(120), at(119), at(100), at(99), at(80), at(79), at(50), at(49), at(15)]).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    // The level is taken back out: 90 at Lv 1 and 90 × 1.7 at Lv 21 are the same tier.
    expect(at(Math.round(90 * (1 + 0.035 * 20)), 21)).toBe(at(90));
    // The enemy's table is tighter at the slow end (it acts once where you play three cards) and reaches 2 at the fast end
    // (v0.9.80: a Dugtrio, 120 base, and a Golem, 45, no longer read alike).
    const foe = (speed: number) => rhythmEvery({ ...enemyOf(s), base: { ...enemyOf(s).base, speed }, level: 1 }, ctx.config);
    expect([foe(140), foe(110), foe(109), foe(80), foe(79), foe(45), foe(30), foe(29), foe(15)]).toEqual([2, 2, 3, 3, 4, 4, 4, 5, 5]);
  });

  it('Rhythm_ParalysisAndStagesSlowIt', () => {
    const s = pinSpeed(fight(), 120, 50);
    expect(rhythmEvery(leadOf(s), ctx.config)).toBe(2);
    const para = tweak(s, (d) => { d.player.team[0]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: 3 }; });
    expect(rhythmEvery(leadOf(para), ctx.config)).toBe(5); // 60
    const slowed = tweak(s, (d) => { d.player.team[0]!.stages.speed = -3; });
    expect(rhythmEvery(leadOf(slowed), ctx.config)).toBe(4); // 84
  });

  it('Player_FullMeter_NextHitCrits_PreviewSaysSo_ThenEmpties', () => {
    let s = pinSpeed(fight(), 100, 50); // every 3
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 1; });
    s = withHand(s, ['tackle', 'tail-whip', 'water-gun']);
    // A hit on a meter not yet full is an ordinary hit, and fills it a step.
    expect(cardPlayability(s, handCard(s, 'tackle').id, ctx)!.damage!.isCrit).toBe(false);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tackle').id });
    expect((eventsOf(s, 'damage').at(-1) as { crit: boolean }).crit).toBe(false);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tail-whip').id });
    expect(leadOf(s).rhythm).toBe(3);
    expect(rhythmReady(leadOf(s), ctx.config)).toBe(true);
    const card = handCard(s, 'water-gun');
    expect(cardPlayability(s, card.id, ctx)!.damage!.isCrit).toBe(true);
    s = dispatch(s, { type: 'play-card', cardId: card.id });
    expect((eventsOf(s, 'damage').at(-1) as { crit: boolean }).crit).toBe(true);
    expect(leadOf(s).rhythm).toBe(0);
  });

  it('Player_UtilityCardFillsButNeverSpends_AndTheMeterCaps', () => {
    let s = pinSpeed(fight(), 100, 50);
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 3; });
    s = withHand(s, ['tail-whip']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tail-whip').id });
    expect(leadOf(s).rhythm).toBe(3);
  });

  it('Player_AlwaysCritMove_LeavesTheMeterFull', () => {
    let s = pinSpeed(fight(), 100, 50);
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 3; });
    s = withHand(s, ['slash']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'slash').id });
    expect(leadOf(s).rhythm).toBe(3);
  });

  it('Enemy_FullMeter_DeclaresCrit_HitsCrit_ThenEmpties', () => {
    let s = pinSpeed(fight(), 50, 90); // its every is 3
    s = tweak(s, (d) => { d.enemies[0]!.rhythm = 3; });
    s = tweak(s, (d) => { markRhythm(d.enemies[0]!, ctx); });
    expect(enemyOf(s).intent!.crit).toBe(true);
    s = dispatch(s, { type: 'end-turn' });
    const hit = eventsOf(s, 'damage').find((e) => (e as { sourceUid: string }).sourceUid === enemyOf(s).uid) as { crit: boolean };
    expect(hit.crit).toBe(true);
    // Spent on that hit; turn 2's Tackle has a meter of 0 and is not a crit.
    expect(enemyOf(s).rhythm).toBe(0);
    expect(enemyOf(s).intent!.crit).toBeUndefined();
  });

  it('Enemy_FillsAStepPerAction_AndDeclaresTheCritTheTurnItIsFull', () => {
    let s = pinSpeed(fight(), 50, 90); // every 3: turns 1–3 fill it, turn 4's Tackle is the crit
    const crits: boolean[] = [];
    for (let t = 0; t < 4; t++) {
      crits.push(!!enemyOf(s).intent!.crit);
      s = tweak(s, (d) => { d.player.team[0]!.hp = d.player.team[0]!.maxHp; });
      s = dispatch(s, { type: 'end-turn' });
    }
    expect(crits).toEqual([false, false, false, true]);
  });

  it('Enemy_ActingTwice_FillsTwiceATurn_AndTheSecondActionCanBeTheCrit', () => {
    let s = start(scenario({
      team: [{ species: 'squirtle', level: 12, moves: ['tackle', 'water-gun', 'tail-whip', 'bubble'] }],
      enemies: [{ species: 'pidgey', level: 7, tier: 'wild', phaseCount: 1, moves: ['tackle', 'gust'], acts: 2 }],
    }));
    s = pinSpeed(s, 50, 90); // every 3
    s = tweak(s, (d) => { d.enemies[0]!.rhythm = 2; markRhythm(d.enemies[0]!, ctx); });
    const e = enemyOf(s);
    expect(e.second).toBeTruthy();
    expect([!!e.intent!.crit, !!e.second!.crit]).toEqual([false, true]);
  });
});
