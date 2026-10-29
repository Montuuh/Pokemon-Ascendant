import { describe, expect, it } from 'vitest';
import { ctx, dispatch, enemyOf, eventsOf, handCard, leadOf, scenario, start, tweak, withHand } from '../testing/harness';
import { cardPlayability } from './preview';
import { markRhythm, rhythmActs, rhythmLeft, rhythmReady, stepRhythm } from './rhythm';
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

// Ally pace is 320 / Speed acts (so Speed 80 fills in exactly 4, a quarter a card); an enemy's is 270 / Speed, at most 4 (Speed 90 fills in 3).
const ALLY_4 = 80;
const FOE_3 = 90;
const para = () => ({ kind: 'paralysis' as const, appliedTurn: 0, turnsLeft: 99 });

describe('Critical rhythm — §4.1.3.1', () => {
  it('Rhythm_PaceReadsLevelFreeSpeed_OnACurve_NotTiers', () => {
    const s = fight();
    const at = (speed: number, level = 1) => rhythmActs({ ...leadOf(s), base: { ...leadOf(s).base, speed }, level }, ctx.config);
    // K / Speed, kept inside 2 … 6: a fast one hits the floor, a wall the ceiling, the middle is continuous.
    expect([at(200), at(160), at(80)]).toEqual([2, 2, 4]);
    expect(at(100)).toBeCloseTo(3.2, 5);
    expect(at(60)).toBeCloseTo(5.33, 2);
    expect([at(40), at(15)]).toEqual([6, 6]);
    // The level is taken back out: 90 at Lv 1 and 90 × 1.7 at Lv 21 are the same pace.
    expect(at(90 * (1 + 0.035 * 20), 21)).toBeCloseTo(at(90), 6);
    // The enemy's curve is shorter at the slow end (it acts once where you play three cards) and still reaches 2 at the fast end.
    const foe = (speed: number) => rhythmActs({ ...enemyOf(s), base: { ...enemyOf(s).base, speed }, level: 1 }, ctx.config);
    expect(foe(FOE_3)).toBe(3);
    expect(foe(130)).toBeCloseTo(270 / 130, 9);
    expect([foe(300), foe(30), foe(15)]).toEqual([2, 4, 4]);
  });

  it('Rhythm_SpeedStagesMoveThePace_EvenOnTheCurvesEdges_v0.9.80', () => {
    const acts = (stage: number, speed = ALLY_4) => rhythmActs(leadOf(tweak(pinSpeed(fight(), speed, 50), (d) => { d.player.team[0]!.stages.speed = stage; })), ctx.config);
    expect(acts(0)).toBe(4);
    // Each stage is ±10 % of the pace: +2 is 4 / 1.2, −2 is 4 / 0.8.
    expect(acts(2)).toBeCloseTo(4 / 1.2, 6);
    expect(acts(-2)).toBeCloseTo(5, 6);
    // A wall at the curve's ceiling (Speed 40 reads 8, kept at 6) still speeds up with a stage…
    expect(acts(2, 40)).toBeCloseTo(6 / 1.2, 6);
    // … and a fast one at the floor still slows down with a drop, but a boost has nowhere to go.
    expect(acts(-3, 160)).toBeCloseTo(2 / 0.7, 6);
    expect(acts(3, 160)).toBe(2);
  });

  it('Rhythm_ParalysisHalvesThePace_OfTheActsStillToCome_v0.9.80', () => {
    const s = pinSpeed(fight(), ALLY_4, FOE_3);
    const slowed = tweak(s, (d) => { d.player.team[0]!.status = para(); d.enemies[0]!.status = para(); });
    // Half the pace is twice the acts — and not swallowed at either edge of the curve.
    expect(rhythmActs(leadOf(slowed), ctx.config)).toBe(8);
    expect(rhythmActs(enemyOf(slowed), ctx.config)).toBe(6);
    expect(rhythmActs(leadOf(tweak(pinSpeed(fight(), 160, 50), (d) => { d.player.team[0]!.status = para(); })), ctx.config)).toBe(4);
    expect(rhythmActs(leadOf(tweak(pinSpeed(fight(), 40, 50), (d) => { d.player.team[0]!.status = para(); })), ctx.config)).toBe(12);
    // Mid-fill: a meter at 0.5 needed 2 more acts, and needs 4 once it is paralysed. Cured, it is 2 again.
    const half = tweak(s, (d) => { d.player.team[0]!.rhythm = 0.5; });
    expect(rhythmLeft(leadOf(half), ctx.config)).toBe(2);
    const slowHalf = tweak(half, (d) => { d.player.team[0]!.status = para(); });
    expect(rhythmLeft(leadOf(slowHalf), ctx.config)).toBe(4);
    expect(rhythmLeft(leadOf(tweak(slowHalf, (d) => { d.player.team[0]!.status = null; })), ctx.config)).toBe(2);
  });

  it('Rhythm_AFullMeter_IsNotTakenBack_ByParalysisOrAStage', () => {
    let s = pinSpeed(fight(), FOE_3, FOE_3);
    s = tweak(s, (d) => { d.player.team[0]!.rhythm = 1; d.player.team[0]!.status = para(); d.player.team[0]!.stages.speed = -6; });
    expect(rhythmReady(leadOf(s))).toBe(true);
    expect(rhythmLeft(leadOf(s), ctx.config)).toBe(0);
  });

  it('Rhythm_StepsAtTodaysPace_ASpeedChangeMidFillCountsFromThenOn', () => {
    const lead = structuredClone(leadOf(pinSpeed(fight(), ALLY_4, 50)));
    stepRhythm(lead, ctx.config, false);
    stepRhythm(lead, ctx.config, false);
    expect(lead.rhythm).toBe(0.5);
    lead.stages.speed = 3; // 1.3 × the pace
    stepRhythm(lead, ctx.config, false);
    expect(lead.rhythm).toBeCloseTo(0.5 + 1.3 / 4, 9);
    // Never past full.
    stepRhythm(lead, ctx.config, false);
    stepRhythm(lead, ctx.config, false);
    expect(lead.rhythm).toBe(1);
  });

  it('Player_FullMeter_NextHitCrits_PreviewSaysSo_ThenEmpties', () => {
    let s = pinSpeed(fight(), ALLY_4, 50); // a quarter a card
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 0.5; });
    s = withHand(s, ['tackle', 'tail-whip', 'water-gun']);
    // A hit on a meter not yet full is an ordinary hit, and fills it a step.
    expect(cardPlayability(s, handCard(s, 'tackle').id, ctx)!.damage!.isCrit).toBe(false);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tackle').id });
    expect((eventsOf(s, 'damage').at(-1) as { crit: boolean }).crit).toBe(false);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tail-whip').id });
    expect(leadOf(s).rhythm).toBe(1);
    expect(rhythmReady(leadOf(s))).toBe(true);
    const card = handCard(s, 'water-gun');
    expect(cardPlayability(s, card.id, ctx)!.damage!.isCrit).toBe(true);
    s = dispatch(s, { type: 'play-card', cardId: card.id });
    expect((eventsOf(s, 'damage').at(-1) as { crit: boolean }).crit).toBe(true);
    expect(leadOf(s).rhythm).toBe(0);
  });

  it('Player_UtilityCardFillsButNeverSpends_AndTheMeterCaps', () => {
    let s = pinSpeed(fight(), ALLY_4, 50);
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 1; });
    s = withHand(s, ['tail-whip']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tail-whip').id });
    expect(leadOf(s).rhythm).toBe(1);
  });

  it('Player_AlwaysCritMove_LeavesTheMeterFull', () => {
    let s = pinSpeed(fight(), ALLY_4, 50);
    s = tweak(s, (d) => { d.player.ap = 9; d.player.team[0]!.rhythm = 1; });
    s = withHand(s, ['slash']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'slash').id });
    expect(leadOf(s).rhythm).toBe(1);
  });

  it('Enemy_FullMeter_DeclaresCrit_HitsCrit_ThenEmpties', () => {
    let s = pinSpeed(fight(), 50, FOE_3); // a third an action
    s = tweak(s, (d) => { d.enemies[0]!.rhythm = 1; });
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
    let s = pinSpeed(fight(), 50, FOE_3); // a third an action: turns 1–3 fill it, turn 4's Tackle is the crit
    const crits: boolean[] = [];
    for (let t = 0; t < 4; t++) {
      crits.push(!!enemyOf(s).intent!.crit);
      s = tweak(s, (d) => { d.player.team[0]!.hp = d.player.team[0]!.maxHp; });
      s = dispatch(s, { type: 'end-turn' });
    }
    expect(crits).toEqual([false, false, false, true]);
  });

  it('Enemy_Paralysed_TakesLongerToCrit_ButAFullMeterStands_v0.9.80', () => {
    // Paralysed from the start: a sixth an action, so the crit that came on turn 4 comes on turn 7.
    let s = tweak(pinSpeed(fight(), 50, FOE_3), (d) => { d.enemies[0]!.status = para(); });
    const crits: boolean[] = [];
    for (let t = 0; t < 7; t++) {
      crits.push(!!enemyOf(s).intent!.crit);
      s = tweak(s, (d) => { d.player.team[0]!.hp = d.player.team[0]!.maxHp; });
      s = dispatch(s, { type: 'end-turn' });
    }
    expect(crits.indexOf(true)).toBe(6);
    // A crit already declared (a full meter) is not undone by paralysing it afterwards.
    let full = pinSpeed(fight(), 50, FOE_3);
    full = tweak(full, (d) => { d.enemies[0]!.rhythm = 1; markRhythm(d.enemies[0]!, ctx); });
    full = tweak(full, (d) => { d.enemies[0]!.status = para(); });
    expect(enemyOf(full).intent!.crit).toBe(true);
    expect(rhythmReady(enemyOf(full))).toBe(true);
  });

  it('Enemy_ActingTwice_FillsTwiceATurn_AndTheSecondActionCanBeTheCrit', () => {
    let s = start(scenario({
      team: [{ species: 'squirtle', level: 12, moves: ['tackle', 'water-gun', 'tail-whip', 'bubble'] }],
      enemies: [{ species: 'pidgey', level: 7, tier: 'wild', phaseCount: 1, moves: ['tackle', 'gust'], acts: 2 }],
    }));
    s = pinSpeed(s, 50, FOE_3); // a third an action
    s = tweak(s, (d) => { d.enemies[0]!.rhythm = 2 / 3; markRhythm(d.enemies[0]!, ctx); });
    const e = enemyOf(s);
    expect(e.second).toBeTruthy();
    expect([!!e.intent!.crit, !!e.second!.crit]).toEqual([false, true]);
  });
});
