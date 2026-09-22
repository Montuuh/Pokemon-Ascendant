import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, content, ctx, eventsOf, scenario, start, startFixture } from '../testing/harness';
import { effectiveMaxHp, statAtLevel } from './stats';

describe('createCombat — §3.2.1 Combat Start', () => {
  it('Start_ThreeStarters_BuildsTwelveCardDeckAndDrawsFive', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    expect(s.player.hand).toHaveLength(5);
    expect(s.player.deck).toHaveLength(7);
    expect(s.player.discard).toHaveLength(0);
    const owners = new Set([...s.player.hand, ...s.player.deck].map((c) => c.ownerUid));
    expect(owners.size).toBe(3);
  });

  it('Start_LandsInActionPhaseWithBaseAP_TurnOne', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    expect(s.turn).toBe(1);
    expect(s.phase).toBe('action');
    expect(s.player.ap).toBe(ctx.config.baseApPerTurn);
    expect(s.player.swapCounter).toBe(0);
    expect(s.enemies[0]!.intent).not.toBeNull();
  });

  it('Start_LeadIndexFromSetup_Respected', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY], leadIndex: 2 }));
    expect(s.player.leadIndex).toBe(2);
  });

  it('Start_StatsScaleWithLevel_PerGrowthCurve', () => {
    const s = start(scenario({ team: [{ species: 'charmander', level: 8 }], enemies: [PIDGEY] }));
    const c = s.player.team[0]!;
    const species = ctx.content.species('charmander');
    expect(c.maxHp).toBe(39 + 2 * 7);
    // §4.1.5.1 — Attack is max(Atk 52, Spc 60) = 60, not the raw physical stat.
    expect(c.base.attack).toBe(60 + 3 * 7);
    expect(c.base.attack).toBe(statAtLevel(species, 'attack', 8));
  });

  it('Start_HpPercentAndStatus_SeedMidFightState', () => {
    const s = start(scenario({ team: [{ species: 'charmander', level: 8, hpPercent: 50, status: 'poison' }], enemies: [PIDGEY] }));
    const c = s.player.team[0]!;
    expect(c.hp).toBe(Math.round(c.maxHp / 2));
    expect(c.status?.kind).toBe('poison');
  });

  it('Start_CarriedStatus_KeepsItsClock_§4.2.7.1', () => {
    // A status carried in from the run's last fight resumes with what was left of it, not a fresh duration.
    const s = start(scenario({ team: [{ species: 'charmander', level: 8, status: 'sleep', statusTurnsLeft: 1, confusionTurns: 2 }], enemies: [PIDGEY] }));
    const c = s.player.team[0]!;
    expect(c.status?.kind).toBe('sleep');
    expect(c.status?.turnsLeft).toBe(1);
    // §4.2.3.1 — Confusion bites at the start of a turn, and turn 1 has already started: two carried turns
    // are the fumble on turn 1 (spent) and one more to come.
    expect(c.confusionTurns).toBe(1);
  });

  it('Start_Trauma_TwoZoneCurve_FloorsAtSeventyFivePercentOff', () => {
    // §8.2.1 — zone 1 is gentle (5 %/stack), zone 2 is the rest-or-retire signal (10 %/stack), floor −75 %.
    expect(effectiveMaxHp(100, 0, ctx.config)).toBe(100);
    expect(effectiveMaxHp(100, 1, ctx.config)).toBe(95);
    expect(effectiveMaxHp(100, 5, ctx.config)).toBe(75);
    expect(effectiveMaxHp(100, 6, ctx.config)).toBe(65);
    expect(effectiveMaxHp(100, 10, ctx.config)).toBe(25);
    expect(effectiveMaxHp(100, 14, ctx.config)).toBe(25); // capped
    const s = start(scenario({ team: [{ species: 'charmander', level: 8, traumaStacks: 2 }], enemies: [PIDGEY] }));
    expect(s.player.team[0]!.maxHp).toBe(Math.floor(53 * 0.9));
  });

  it('Start_ConsumablePile_DrawsTwoAndKeepsRestInPool', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['potion', 'potion', 'antidote', 'ether'] }));
    expect(s.player.consumables.hand).toHaveLength(2);
    expect(s.player.consumables.pool).toHaveLength(2);
  });

  it('Start_PokeBall_OnlyInWildFightsWithBalls', () => {
    const wild = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball'], balls: 2 }));
    const trainer = start(scenario({ kind: 'trainer', team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball'], balls: 2 }));
    const noBalls = start(scenario({ team: STARTERS, enemies: [PIDGEY], consumables: ['poke-ball'], balls: 0 }));
    const all = (s: typeof wild) => [...s.player.consumables.hand, ...s.player.consumables.pool];
    expect(all(wild)).toHaveLength(1);
    expect(all(trainer)).toHaveLength(0);
    expect(all(noBalls)).toHaveLength(0);
  });

  it('Start_IronShell_RaisesDefenseOneStage', () => {
    const s = start(scenario({ team: [{ species: 'metapod', level: 10 }], enemies: [PIDGEY] }));
    expect(s.player.team[0]!.stages.defense).toBe(1);
  });

  it('Start_SequentialEnemies_QueueTheRest', () => {
    const s = startFixture('wild-boss-3phase');
    expect(s.enemies).toHaveLength(1);
    expect(s.enemyQueue).toHaveLength(1);
    expect(s.enemies[0]!.speciesId).toBe('geodude');
  });

  it('Start_EmitsCombatStartAndTurnStart', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    expect(eventsOf(s, 'combat-start')).toHaveLength(1);
    expect(eventsOf(s, 'turn-start')).toHaveLength(1);
    expect(eventsOf(s, 'intent')).toHaveLength(1);
  });

  it('AllFixtures_Build', () => {
    for (const sc of content.allScenarios()) {
      const s = startFixture(sc.id);
      expect(s.outcome).toBe('in-progress');
      expect(s.player.hand.length).toBeGreaterThan(0);
    }
  });
});
