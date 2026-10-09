import { describe, expect, it } from 'vitest';
import type { EnemySetup } from '../content/defs';
import { ctx, dispatch, handCard, scenario, start, tweak, withHand } from '../testing/harness';
import { comboBreakAt, doubleActionBudget } from './combo';

// §5.6.1 — acting twice, priced in AP (v0.9.12): one budget for both actions, and a second action you can break.

// A Raticate that knows a 2-AP and two 1-AP moves: its pair must fit three AP.
const RATICATE: EnemySetup = { species: 'raticate', level: 14, tier: 'wild', phaseCount: 1, acts: 2, moves: ['hyper-fang', 'quick-attack', 'bite', 'tail-whip'] };
const TEAM = [{ species: 'squirtle', level: 14, moves: ['water-gun', 'surf', 'tackle', 'withdraw'] }, { species: 'charmander', level: 12 }];
const fight = (enemy: EnemySetup = RATICATE, seed = 3) => start(scenario({ seed, team: TEAM, enemies: [enemy] }));

describe('Acting twice, on an AP budget — §5.6.1', () => {
  it('Declare_ActsTwice_BothActionsFitTheBudget_OnEverySeed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = fight(RATICATE, seed);
      const e = s.enemies[0]!;
      const ap = [e.intent, e.second].filter(Boolean).reduce((n, i) => n + (i!.moveId ? ctx.content.move(i!.moveId).apCost : 0), 0);
      expect(ap, `seed ${seed}: ${e.intent?.moveId} + ${e.second?.moveId}`).toBeLessThanOrEqual(doubleActionBudget(e, ctx));
      expect(e.second, `seed ${seed}`).not.toBeNull();
    }
  });

  it('Budget_GymLeadersAce_HasTheLargerOne', () => {
    const s = fight({ ...RATICATE, tier: 'boss' });
    expect(doubleActionBudget(s.enemies[0]!, ctx)).toBe(ctx.config.doubleActionApBudgetBoss);
    expect(doubleActionBudget(fight().enemies[0]!, ctx)).toBe(ctx.config.doubleActionApBudget);
  });
});

describe('Breaking a combo — §5.6.1', () => {
  const ready = (enemy: EnemySetup = RATICATE) => {
    let s = withHand(fight(enemy), ['surf', 'water-gun', 'tackle']);
    s = tweak(s, (d) => { for (const m of d.player.team) { m.hp = 999; m.maxHp = 999; } });
    return s;
  };

  it('Hit_AQuarterOfItsMaxHpInYourTurn_BreaksTheSecondAction', () => {
    let s = ready();
    const e = s.enemies[0]!;
    // Bring it to one point short of the threshold, then land the hit that crosses it.
    s = tweak(s, (d) => { d.enemies[0]!.stagger = comboBreakAt(e, ctx) - 1; });
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tackle').id, targetUid: e.uid });
    expect(s.enemies[0]!.second!.broken).toBe(true);
    expect(s.events.some((x) => x.t === 'combo-break' && x.enemyUid === e.uid)).toBe(true);
  });

  it('Hit_UnderTheThreshold_LeavesTheComboStanding', () => {
    let s = ready();
    const e = s.enemies[0]!;
    s = tweak(s, (d) => { d.enemies[0]!.maxHp = 9999; d.enemies[0]!.hp = 9999; });
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tackle').id, targetUid: e.uid });
    expect(s.enemies[0]!.second!.broken).toBeFalsy();
    expect(s.enemies[0]!.stagger).toBeGreaterThan(0);
  });

  it('SuperEffectiveHit_BreaksItAtOnce', () => {
    // Water on a Charmeleon is super-effective, however much it hurts.
    let s = ready({ ...RATICATE, species: 'charmeleon', moves: ['scratch', 'ember', 'growl', 'leer'] });
    const e = s.enemies[0]!;
    s = tweak(s, (d) => { d.enemies[0]!.maxHp = 9999; d.enemies[0]!.hp = 9999; });
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id, targetUid: e.uid });
    expect(s.enemies[0]!.second!.broken).toBe(true);
  });

  it('Resolve_BrokenSecond_DoesNotHappen_AndTheNextTurnActsTwiceAgain', () => {
    let s = ready();
    s = tweak(s, (d) => { d.enemies[0]!.second = { ...d.enemies[0]!.second!, broken: true }; });
    const before = s.events.length;
    s = dispatch(s, { type: 'end-turn' });
    const acted = s.events.slice(before).filter((x) => x.t === 'enemy-action');
    expect(acted).toHaveLength(1);
    // A new turn, a new combo, and its stagger starts again from nothing.
    expect(s.enemies[0]!.second?.broken).toBeFalsy();
    expect(s.enemies[0]!.stagger ?? 0).toBe(0);
  });
});
