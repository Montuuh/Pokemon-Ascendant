import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, consumableCard, ctx, dispatch, eventsOf, reject, scenario, start, tweak, withConsumableHand } from '../testing/harness';
import { catchGauge } from './catch';
import { catchStatus } from './preview';

const BALL = { kind: 'catch' as const, thresholdPercent: 30, statusBonusPercent: 20 };
const wild = () => start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball', 'potion'], balls: 2 }));

describe('Catching — §2.6.4 (CL-014)', () => {
  it('Gauge_Values_NoStatus', () => {
    const mon = { hp: 100, maxHp: 100, status: null, confusionTurns: 0 } as Parameters<typeof catchGauge>[0];
    expect(catchGauge(mon, BALL).gauge).toBe(0);
    expect(catchGauge({ ...mon, hp: 65 }, BALL).gauge).toBe(50);
    expect(catchGauge({ ...mon, hp: 30 }, BALL)).toMatchObject({ gauge: 100, ready: true });
    expect(catchGauge({ ...mon, hp: 31 }, BALL).ready).toBe(false);
  });

  it('Gauge_Status_ExpandsWindowTo50', () => {
    const mon = { hp: 50, maxHp: 100, status: { kind: 'sleep', appliedTurn: 0, turnsLeft: 1 }, confusionTurns: 0 } as Parameters<typeof catchGauge>[0];
    expect(catchGauge(mon, BALL)).toMatchObject({ thresholdPercent: 50, ready: true });
    expect(catchGauge({ ...mon, hp: 100 }, BALL).ready).toBe(false);
  });

  it('Gauge_FaintedWild_Zero', () => {
    const mon = { hp: 0, maxHp: 100, status: null, confusionTurns: 0 } as Parameters<typeof catchGauge>[0];
    expect(catchGauge(mon, BALL).gauge).toBe(0);
  });

  it('Throw_BeforeReady_IsLocked_AndCostsNothing', () => {
    // §2.6.4.1 (changed 2026-09-21) — a throw that fails for certain is not a decision. Below READY the card
    // is visible, says why it waits, and cannot be played; the ball is not spent on a guaranteed miss.
    const s = withConsumableHand(wild(), ['poke-ball']);
    expect(catchStatus(s, ctx)!.ready).toBe(false);
    const balls = s.player.balls;
    expect(reject(s, { type: 'use-consumable', cardId: consumableCard(s, 'poke-ball').id })).toBe('not-ready');
    expect(s.player.balls).toBe(balls);
    expect(eventsOf(s, 'catch')).toHaveLength(0);
  });

  it('Throw_WhenReady_CatchesAndEndsCombat', () => {
    let s = tweak(withConsumableHand(wild(), ['poke-ball']), (d) => {
      d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.25);
    });
    expect(catchStatus(s, ctx)!.ready).toBe(true);
    s = dispatch(s, { type: 'use-consumable', cardId: consumableCard(s, 'poke-ball').id });
    expect(s.outcome).toBe('caught');
    expect(s.phase).toBe('ended');
    expect(s.defeatedEnemies[0]!.speciesId).toBe('pidgey');
  });

  it('Throw_NoBallsLeft_Rejected', () => {
    // At READY, so the only thing standing between the card and the throw is the ball count.
    let s = tweak(withConsumableHand(wild(), ['poke-ball']), (d) => {
      d.player.balls = 0;
      d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.25);
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
