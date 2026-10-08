import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, consumableCard, content, ctx, dispatch, eventsOf, reject, scenario, start, tweak, withConsumableHand } from '../testing/harness';
import { CATCH, catchOdds, catchRateOf, SHAKE_CHECKS, shakeChecks, wobblesShown } from './catch';
import { GameRng } from '../rng/gameRng';
import { catchOptions, catchStatus } from './preview';

// §2.6.4 — the catch chance (2026-09-21): a roll at a shown number, never a hidden one.

const BALL = { kind: 'catch' as const, ballMultiplier: 1 };
const wild = () => start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball', 'potion'], balls: 2 }));
const mon = (over: Partial<{ hp: number; maxHp: number; status: { kind: string; appliedTurn: number; turnsLeft: number } | null; confusionTurns: number; speciesId: string }> = {}) =>
  ({ speciesId: 'rattata', hp: 100, maxHp: 100, status: null, confusionTurns: 0, ...over }) as unknown as Parameters<typeof catchOdds>[0];

describe('Catch odds — §2.6.4.1', () => {
  it('ACommonBasic_AtFullHp_IsNearTheFloor_AndClimbsSteeplyAtTheEnd', () => {
    // The anchors (v0.8.6): ~13 % at full HP, ~49 % at half, ~69 % at a quarter, 90 % cap.
    expect(catchOdds(mon(), BALL, content).chance).toBeCloseTo(0.1305, 3);
    expect(catchOdds(mon({ hp: 50 }), BALL, content).chance).toBeCloseTo(0.4875, 3);
    expect(catchOdds(mon({ hp: 25 }), BALL, content).chance).toBeCloseTo(0.6886, 3);
    expect(catchOdds(mon({ hp: 1 }), BALL, content).chance).toBeCloseTo(0.8914, 3);
  });

  it('StatusMultiplies_SleepAndFreezeMost_AndTheCapHolds', () => {
    const asleep = mon({ hp: 25, status: { kind: 'sleep', appliedTurn: 0, turnsLeft: 2 } });
    const burned = mon({ hp: 25, status: { kind: 'burn', appliedTurn: 0, turnsLeft: 2 } });
    expect(catchOdds(asleep, BALL, content).chance).toBe(CATCH.cap);
    expect(catchOdds(burned, BALL, content).chance).toBeCloseTo(0.826, 2);
    expect(catchOdds(mon({ hp: 1, status: { kind: 'sleep', appliedTurn: 0, turnsLeft: 2 } }), BALL, content).chance).toBe(CATCH.cap);
  });

  it('TheSpeciesSetsTheCeiling_ByRarityAndStage_OrItsOwnRow', () => {
    expect(catchRateOf('rattata', content)).toBe(0.9);
    expect(catchRateOf('raticate', content)).toBeCloseTo(0.9 * 0.65, 5);
    expect(catchRateOf('psyduck', content)).toBe(0.7);
    expect(catchRateOf('eevee', content)).toBe(0.5);
    // Snorlax's row says 0.2: about 3 % at full HP.
    expect(catchRateOf('snorlax', content)).toBe(0.2);
    expect(catchOdds(mon({ speciesId: 'snorlax' }), BALL, content).chance).toBeCloseTo(0.029, 3);
  });

  it('AFaintedTarget_HasNoChance_AndAMasterBallHasAll', () => {
    expect(catchOdds(mon({ hp: 0 }), BALL, content).chance).toBe(0);
    expect(catchOdds(mon({ speciesId: 'snorlax' }), { kind: 'catch', ballMultiplier: 1, sure: true }, content)).toMatchObject({ chance: 1, guaranteed: true });
  });
});

describe('Throwing — §2.6.4.1', () => {
  it('Throw_AtFullHp_IsPlayable_AndSpendsTheBall_WhateverTheRoll', () => {
    // No lock any more: the card plays at any odds (about 13 % here), and the ball is gone either way.
    const s0 = withConsumableHand(wild(), ['poke-ball']);
    expect(catchStatus(s0, ctx)!.chance).toBeLessThan(0.2);
    expect(reject(s0, { type: 'use-consumable', cardId: consumableCard(s0, 'poke-ball').id })).toBeNull();
    const s = dispatch(s0, { type: 'use-consumable', cardId: consumableCard(s0, 'poke-ball').id });
    expect(s.player.balls).toBe(2); // the bag's ball and the fixture's two, one thrown
    expect(eventsOf(s, 'catch')).toHaveLength(1);
    const caught = s.outcome === 'caught';
    expect(s.outcome).toBe(caught ? 'caught' : 'in-progress');
    expect(s.player.tally.catchFails).toBe(caught ? 0 : 1);
  });

  it('Throw_IsSeeded_SoAReplayThrowsTheSameBall', () => {
    const throwAt = (seed: number) => {
      let s = tweak(withConsumableHand(start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball'], balls: 2, seed })), ['poke-ball']), (d) => {
        d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.25);
      });
      s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'poke-ball').id });
      return s.outcome;
    };
    const outcomes = [1, 2, 3, 4, 5, 6, 7, 8].map(throwAt);
    // Same seed, same result; across seeds a ~58 % throw lands sometimes and misses sometimes.
    expect(throwAt(3)).toBe(outcomes[2]);
    expect(outcomes).toContain('caught');
    expect(outcomes).toContain('in-progress');
  });

  it('Throw_AMasterBall_CannotMiss_§2.6.4.2', () => {
    const s0 = withConsumableHand(start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['master-ball'], balls: 1 })), ['master-ball']);
    expect(catchOptions(s0, ctx)[0]!.odds).toMatchObject({ chance: 1, guaranteed: true });
    const s = dispatch(s0, { type: 'use-consumable', cardId: consumableCard(s0, 'master-ball').id });
    expect(s.outcome).toBe('caught');
  });

  it('Throw_NoBallsLeft_Rejected', () => {
    let s = tweak(withConsumableHand(wild(), ['poke-ball']), (d) => {
      d.player.balls = 0;
    });
    expect(reject(s, { type: 'use-consumable', cardId: consumableCard(s, 'poke-ball').id })).toBe('no-balls');
    s = tweak(s, (d) => {
      d.player.balls = 1;
    });
    expect(reject(s, { type: 'use-consumable', cardId: consumableCard(s, 'poke-ball').id })).toBeNull();
  });

  it('CatchStatus_NullOutsideWildFights', () => {
    const s = start(scenario({ kind: 'trainer', team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball'], balls: 3 }));
    expect(catchStatus(s, ctx)).toBeNull();
  });
});

// §2.6.4.4 — the shake checks: four at chance^¼ each, so all four pass at the shown chance.
describe('shakeChecks — §2.6.4.4', () => {
  it('ShakeChecks_ManyThrows_CatchRateIsTheShownChance', () => {
    const rng = new GameRng(1234);
    for (const chance of [0.13, 0.42, 0.81]) {
      let caught = 0;
      const n = 20_000;
      for (let i = 0; i < n; i++) if (shakeChecks(chance, (p) => rng.chance(p)) === SHAKE_CHECKS) caught++;
      expect(caught / n).toBeCloseTo(chance, 1);
    }
  });

  it('ShakeChecks_Guaranteed_PassesAllFourWithoutRolling', () => {
    expect(shakeChecks(1, () => { throw new Error('rolled'); })).toBe(SHAKE_CHECKS);
  });

  it('WobblesShown_ByChecksPassed_AlwaysOneToThree', () => {
    expect([0, 1, 2, 3, 4].map(wobblesShown)).toEqual([1, 2, 3, 3, 3]);
  });

  it('Catch_Throw_EmitsTheChecksPassed', () => {
    const s = withConsumableHand(wild(), ['poke-ball']);
    const card = s.player.consumables.hand.find((c) => c.consumableId === 'poke-ball')!;
    const after = dispatch(s, { type: 'use-consumable', cardId: card.id });
    const ev = eventsOf(after, 'catch')[0] as unknown as { checks: number; success: boolean };
    expect(ev.checks).toBeGreaterThanOrEqual(0);
    expect(ev.checks === SHAKE_CHECKS).toBe(ev.success);
  });
});
