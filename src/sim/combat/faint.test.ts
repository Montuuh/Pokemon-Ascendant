import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, dispatch, eventsOf, reject, scenario, start, tweak } from '../testing/harness';
import { pickLeadOptions } from './preview';

// A strong enemy so the Lead reliably faints during Resolution.
const GOLEM = { species: 'golem', level: 30, tier: 'wild' as const, phaseCount: 1 as const };
const weak = () => start(scenario({ team: STARTERS, enemies: [GOLEM] }));

describe('Faint resolution — §3.3.5', () => {
  it('LeadFaints_RequiresLeadPick_NoAPCost_ThenNextTurn', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[0]!.hp = 1;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.hp).toBe(0);
    expect(s.player.pendingLeadPick).toBe(true);
    expect(eventsOf(s, 'lead-pick-required')).toHaveLength(1);
    expect(reject(s, { type: 'end-turn' })).toBe('lead-pick-pending');
    expect(pickLeadOptions(s)).toEqual([1, 2]);
    s = dispatch(s, { type: 'pick-lead', benchIndex: 2 });
    expect(s.player.leadIndex).toBe(2);
    expect(s.player.pendingLeadPick).toBe(false);
    expect(s.turn).toBe(2);
    expect(s.player.ap).toBe(3);
  });

  it('LeadFaints_CardsPurgedFromDeckAndDiscard_HandCardsDropped', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[0]!.hp = 1;
    });
    s = dispatch(s, { type: 'end-turn' });
    s = dispatch(s, { type: 'pick-lead', benchIndex: 1 });
    const all = [...s.player.deck, ...s.player.discard, ...s.player.hand];
    expect(all.some((c) => c.ownerUid === 'p0')).toBe(false);
    expect(all).toHaveLength(8);
  });

  it('LeadFaints_TraumaIncrements', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[0]!.hp = 1;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[0]!.traumaStacks).toBe(1);
  });

  it('BenchFaints_FromDoT_NoPrompt_LeadUnchanged', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[1]!.hp = 1;
      d.player.team[1]!.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null };
      d.enemies[0]!.hp = 1000;
      d.enemies[0]!.intent = { kind: 'buff', moveId: 'rock-polish', targetSlot: null, hidden: false };
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.team[1]!.hp).toBe(0);
    expect(s.player.pendingLeadPick).toBe(false);
    expect(s.player.leadIndex).toBe(0);
    expect(s.turn).toBe(2);
  });

  it('FrozenLeadFaints_PositionLockVoided_ReplacementPicked', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[0]!.hp = 1;
      d.player.team[0]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
      d.player.team[1]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 }; // frozen bench is still eligible
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.pendingLeadPick).toBe(true);
    expect(pickLeadOptions(s)).toEqual([1, 2]);
    s = dispatch(s, { type: 'pick-lead', benchIndex: 1 });
    expect(s.player.leadIndex).toBe(1);
  });

  it('AllFaint_Defeat', () => {
    let s = tweak(weak(), (d) => {
      d.player.team[0]!.hp = 1;
      d.player.team[1]!.hp = 0;
      d.player.team[2]!.hp = 0;
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.outcome).toBe('defeat');
    expect(s.phase).toBe('ended');
  });

  it('EnemyFaintsDuringResolutionDoT_Victory', () => {
    let s = tweak(start(scenario({ team: STARTERS, enemies: [PIDGEY] })), (d) => {
      d.enemies[0]!.hp = 1;
      d.enemies[0]!.status = { kind: 'poison', appliedTurn: 0, turnsLeft: null };
      d.enemies[0]!.intent = { kind: 'incapacitated', moveId: null, targetSlot: null, hidden: false };
    });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.outcome).toBe('victory');
  });
});
