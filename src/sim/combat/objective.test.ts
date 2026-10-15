import { describe, expect, it } from 'vitest';
import type { EnemySetup, ScenarioDef } from '../content/defs';
import { consumableCard, ctx, dispatch, eventsOf, scenario, start, STARTERS, teamWithKit, tweak, withHand } from '../testing/harness';
import { objectiveTurnsLeft } from './objective';
import { consumablePlayability } from './preview';
import type { CombatState } from './state';

// §5.6.5 — fights with another objective: a runner that leaves after its last turn, and a find held to the end of
// its last turn against a guard that grows angrier every turn.

const ABRA: EnemySetup = { species: 'abra', level: 9, tier: 'wild', phaseCount: 1, moves: ['teleport'] };
const PRIMEAPE: EnemySetup = { species: 'primeape', level: 11, tier: 'wild', phaseCount: 1, moves: ['thrash', 'rage', 'karate-chop'] };
const RHYDON: EnemySetup = { species: 'rhydon', level: 30, tier: 'wild', phaseCount: 1, moves: ['horn-attack', 'stomp', 'horn-drill'] };

const fight = (objective: NonNullable<ScenarioDef['objective']>, enemies: EnemySetup[], consumables: string[] = []): CombatState =>
  start({ ...scenario({ team: STARTERS, enemies, consumables }), objective });

/** The guard's teeth pulled, so a test about the clock is not decided by a lucky crit on your team. */
const toothless = (s: CombatState) => tweak(s, (d) => d.enemies.forEach((e) => (e.base.attack = 1)));
const endTurns = (s: CombatState, n: number) => {
  for (let i = 0; i < n && s.outcome === 'in-progress'; i++) s = dispatch(s, { type: 'end-turn' });
  return s;
};

describe('The flee race — §5.6.5', () => {
  it('TurnsLeft_CountsTheTurnBeingPlayed', () => {
    const s = fight({ kind: 'flee', turns: 2 }, [ABRA]);
    expect(objectiveTurnsLeft(s)).toBe(2);
    expect(objectiveTurnsLeft(dispatch(s, { type: 'end-turn' }))).toBe(1);
  });

  it('LastTurn_TheRunnersIntentIsItsGetaway_NeverHidden', () => {
    const s = dispatch(fight({ kind: 'flee', turns: 2 }, [ABRA]), { type: 'end-turn' });
    const intent = s.enemies[0]!.intent!;
    expect(intent.kind).toBe('getaway');
    expect(intent.moveId).toBe('teleport');
    expect(intent.hidden).toBe(false);
  });

  it('RunnerStandingAfterItsLastTurn_EndsAsFled', () => {
    const s = endTurns(fight({ kind: 'flee', turns: 2 }, [ABRA]), 2);
    expect(s.outcome).toBe('fled');
    expect(s.phase).toBe('ended');
    expect(s.turn).toBe(2);
  });

  it('RunnerKnockedOutFirst_IsAVictory', () => {
    let s = start({ ...scenario({ team: teamWithKit(['tackle', 'water-gun']), enemies: [ABRA] }), objective: { kind: 'flee', turns: 2 } });
    s = withHand(tweak(s, (d) => void (d.enemies[0]!.hp = 1)), ['tackle']);
    s = dispatch(s, { type: 'play-card', cardId: s.player.hand[0]!.id });
    expect(s.outcome).toBe('victory');
  });

  it('RunnerAsleepWhenItsLastTurnBegins_CannotRun_AndRunsTheFirstTurnItCan', () => {
    // Put to sleep on turn 1: on turn 2, its last, it cannot declare the getaway.
    let s = tweak(fight({ kind: 'flee', turns: 2 }, [ABRA]), (d) => void (d.enemies[0]!.status = { kind: 'sleep', appliedTurn: 1, turnsLeft: 1 }));
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.intent!.kind).toBe('incapacitated');
    s = dispatch(s, { type: 'end-turn' });
    expect(s.outcome).toBe('in-progress');
    // Awake on turn 3, it declares its getaway and is gone at the end of the turn.
    expect(s.enemies[0]!.intent!.kind).toBe('getaway');
    s = dispatch(s, { type: 'end-turn' });
    expect(s.outcome).toBe('fled');
    expect(s.turn).toBe(3);
  });

  it('Runner_CanBeCaught', () => {
    const s = fight({ kind: 'flee', turns: 2 }, [ABRA], ['poke-ball']);
    const ball = consumableCard(s, 'poke-ball');
    expect(consumablePlayability(s, ball.id, ctx)?.reason ?? null).toBeNull();
  });
});

describe('The hold-out — §5.6.5', () => {
  it('TeamStandingAfterTheLastTurn_WinsTheHold', () => {
    const s = endTurns(toothless(fight({ kind: 'hold', turns: 3 }, [PRIMEAPE])), 3);
    expect(s.outcome).toBe('victory');
    expect(s.turn).toBe(3);
    expect(s.enemies[0]!.hp).toBeGreaterThan(0);
  });

  it('Guard_GainsAnAttackStageAtTheEndOfEveryTurn_ButTheLast', () => {
    const s = endTurns(toothless(fight({ kind: 'hold', turns: 3 }, [PRIMEAPE])), 3);
    const rises = eventsOf(s, 'stage').filter((e) => e.t === 'stage' && e.targetUid === s.enemies[0]!.uid && e.stat === 'attack');
    // Rage may raise it too; the clock's own rises are one a turn on turns 1 and 2.
    expect(s.enemies[0]!.stages.attack).toBeGreaterThanOrEqual(2 * ctx.config.objectives.guardEscalation);
    expect(rises.length).toBeGreaterThanOrEqual(2);
  });

  it('Guard_IsNotForCatching', () => {
    const s = fight({ kind: 'hold', turns: 3 }, [PRIMEAPE], ['poke-ball']);
    const ball = consumableCard(s, 'poke-ball');
    expect(consumablePlayability(s, ball.id, ctx)?.reason).toBe('guard');
  });

  it('LastTurn_AGuardWithAFinisher_TelegraphsItAtYourLead', () => {
    const s = endTurns(toothless(fight({ kind: 'hold', turns: 2 }, [RHYDON])), 1);
    const intent = s.enemies[0]!.intent!;
    expect(intent.moveId).toBe(ctx.config.objectives.guardFinisher);
    expect(intent.targetSlot).toBe('lead');
    expect(intent.hidden).toBe(false);
  });

  it('NoObjective_NoClock', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PRIMEAPE] }));
    expect(s.objective).toBeUndefined();
    expect(objectiveTurnsLeft(s)).toBeNull();
  });
});
