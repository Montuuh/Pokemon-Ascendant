import { describe, expect, it } from 'vitest';
import { STARTERS, ctx, dispatch, eventsOf, handCard, scenario, start, tweak, withHand } from '../testing/harness';
import { currentPhase, phaseMarkers, bossArchetype } from './boss';

const ACE = { species: 'golem', level: 15, tier: 'boss' as const, phaseCount: 3 as const };
const TEAM = [{ species: 'wartortle', level: 15 }, { species: 'ivysaur', level: 15 }, { species: 'charmeleon', level: 15 }];

describe('Boss phases — §5.8.3 / §5.9.4', () => {
  it('Phase_ThresholdsFromHP_Stateless', () => {
    const e = { hp: 100, maxHp: 100, phaseCount: 3 as const };
    expect(currentPhase(e, ctx.config)).toBe(1);
    expect(currentPhase({ ...e, hp: 50 }, ctx.config)).toBe(2);
    expect(currentPhase({ ...e, hp: 20 }, ctx.config)).toBe(3);
    expect(currentPhase({ ...e, hp: 20, phaseCount: 2 }, ctx.config)).toBe(2);
    expect(currentPhase({ ...e, hp: 5, phaseCount: 1 }, ctx.config)).toBe(1);
  });

  it('PhaseMarkers_MatchPhaseCount', () => {
    expect(phaseMarkers({ phaseCount: 1 }, ctx.config)).toEqual([]);
    expect(phaseMarkers({ phaseCount: 2 }, ctx.config)).toEqual([0.5]);
    expect(phaseMarkers({ phaseCount: 3 }, ctx.config)).toEqual([0.5, 0.2]);
  });

  it('Archetype_ByPrimaryType', () => {
    expect(bossArchetype({ types: ['rock', 'ground'] })).toBe('entrenchment');
    expect(bossArchetype({ types: ['bug', 'flying'] })).toBe('status-siege');
    expect(bossArchetype({ types: ['normal', 'flying'] })).toBe('onslaught');
    expect(bossArchetype({ types: ['water'] })).toBe('tempo-control');
  });

  it('Entrenchment_OnPhase2Entry_PlusTwoDefOnce', () => {
    let s = tweak(start(scenario({ kind: 'boss', team: TEAM, enemies: [ACE] })), (d) => {
      d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.45);
    });
    s = dispatch(s, { type: 'end-turn' }); // next intent phase applies the transition
    expect(s.enemies[0]!.phase).toBe(2);
    expect(s.enemies[0]!.stages.defense).toBe(2);
    expect(eventsOf(s, 'phase')).toHaveLength(1);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.stages.defense).toBe(2); // one-shot
  });

  it('Phase3_ResetsCooldowns', () => {
    let s = tweak(start(scenario({ kind: 'boss', team: TEAM, enemies: [ACE] })), (d) => {
      d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.15);
      d.enemies[0]!.cooldowns['stone-edge'] = 2;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.phase).toBe(3);
    expect(s.enemies[0]!.cooldowns['stone-edge']).toBeUndefined();
  });

  it('Sturdy_SurvivesOneLethalHitAtOneHP_ThenConsumed', () => {
    let s = tweak(start(scenario({ team: [{ species: 'blastoise', level: 40, moves: ['surf', 'hydro-crash', 'water-gun', 'withdraw'] }], enemies: [ACE] })), (d) => {
      d.enemies[0]!.hp = 5;
      d.player.ap = 6;
    });
    s = withHand(s, ['surf', 'hydro-crash']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'surf').id });
    expect(s.enemies[0]!.hp).toBe(1);
    expect(s.enemies[0]!.sturdyAvailable).toBe(false);
    expect(eventsOf(s, 'sturdy')).toHaveLength(1);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'hydro-crash').id });
    expect(s.outcome).toBe('victory');
  });

  it('SequentialEnemies_NextEntersWithIntent_VictoryOnlyWhenQueueEmpty', () => {
    let s = start(scenario({ kind: 'trainer', team: STARTERS, enemies: [{ species: 'caterpie', level: 3, tier: 'trainer', phaseCount: 1 }, { species: 'pidgey', level: 8, tier: 'trainer', phaseCount: 1 }] }));
    s = tweak(s, (d) => {
      d.enemies[0]!.hp = 1;
    });
    s = withHand(s, ['ember']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id });
    expect(s.outcome).toBe('in-progress');
    expect(s.enemies[0]!.speciesId).toBe('pidgey');
    expect(s.enemies[0]!.intent).not.toBeNull();
    expect(s.enemyQueue).toHaveLength(0);
    expect(eventsOf(s, 'enemy-enter')).toHaveLength(2);
  });

  it('Onslaught_Phase2_OnlyOffensiveIntents', () => {
    // Pidgeot (normal) ace in phase 2 must not pick Roost/Tailwind/Sand Attack.
    let s = tweak(start(scenario({ kind: 'boss', team: TEAM, enemies: [{ species: 'pidgeot', level: 15, tier: 'boss', phaseCount: 3 }] })), (d) => {
      d.enemies[0]!.hp = Math.floor(d.enemies[0]!.maxHp * 0.4);
    });
    for (let i = 0; i < 4; i++) {
      s = dispatch(s, { type: 'end-turn' });
      if (s.outcome !== 'in-progress' || s.player.pendingLeadPick) break;
      expect(['attack', 'cleave', 'backstrike']).toContain(s.enemies[0]!.intent!.kind);
    }
  });
});
