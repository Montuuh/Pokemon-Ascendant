import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, dispatch, eventsOf, handCard, reject, scenario, start, tweak, withHand } from '../testing/harness';
import { swapOptions } from './preview';

const base = () => start(scenario({ team: STARTERS, enemies: [PIDGEY] }));

describe('Manual swap — §3.3.1', () => {
  it('ManualSwap_Ladder_1_2_3_AP', () => {
    let s = tweak(base(), (d) => {
      d.player.ap = 6;
    });
    expect(swapOptions(s)[0]!.cost).toBe(1);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(s.player.ap).toBe(5);
    expect(swapOptions(s)[0]!.cost).toBe(2);
    s = dispatch(s, { type: 'swap', benchIndex: 0 });
    expect(s.player.ap).toBe(3);
    expect(swapOptions(s)[0]!.cost).toBe(3);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(s.player.ap).toBe(0);
    expect(s.player.swapCounter).toBe(3);
  });

  it('ManualSwap_ChangesLeadIndex_AndEmitsSwapEvent', () => {
    const s = dispatch(base(), { type: 'swap', benchIndex: 2 });
    expect(s.player.leadIndex).toBe(2);
    const ev = eventsOf(s, 'swap').at(-1) as { kind: string; apCost: number };
    expect(ev.kind).toBe('manual');
    expect(ev.apCost).toBe(1);
  });

  it('ManualSwap_InsufficientAP_Rejected', () => {
    const s = tweak(base(), (d) => {
      d.player.ap = 0;
    });
    expect(reject(s, { type: 'swap', benchIndex: 1 })).toBe('not-enough-ap');
  });

  it('ManualSwap_TargetIsLead_Rejected', () => {
    expect(reject(base(), { type: 'swap', benchIndex: 0 })).toBe('target-is-lead');
  });

  it('ManualSwap_TargetFainted_Rejected', () => {
    const s = tweak(base(), (d) => {
      d.player.team[1]!.hp = 0;
    });
    expect(reject(s, { type: 'swap', benchIndex: 1 })).toBe('target-fainted');
  });

  it('ManualSwap_FrozenLead_Rejected_FrozenBench_Rejected', () => {
    const frozenLead = tweak(base(), (d) => {
      d.player.team[0]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
    });
    expect(reject(frozenLead, { type: 'swap', benchIndex: 1 })).toBe('lead-frozen');
    const frozenBench = tweak(base(), (d) => {
      d.player.team[1]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
    });
    expect(reject(frozenBench, { type: 'swap', benchIndex: 1 })).toBe('target-frozen');
  });

  it('SwapCounter_ResetsAtNextDrawPhase', () => {
    let s = dispatch(base(), { type: 'swap', benchIndex: 1 });
    expect(s.player.swapCounter).toBe(1);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.turn).toBe(2);
    expect(s.player.swapCounter).toBe(0);
    expect(s.player.defensiveDiscount).toBe(false);
  });

  it('ManualSwap_ArmsDefensiveDiscount_ConsumedByFirstDefensiveCard', () => {
    // Squirtle owns Withdraw (defensive, 1 AP). Swap Squirtle in, then Withdraw costs 0.
    let s = withHand(base(), ['withdraw', 'tackle']);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    expect(s.player.defensiveDiscount).toBe(true);
    const ap = s.player.ap;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'withdraw').id });
    expect(s.player.ap).toBe(ap);
    expect(s.player.defensiveDiscount).toBe(false);
  });

  it('DefensiveDiscount_NotConsumedByOffensiveCard', () => {
    let s = withHand(base(), ['water-gun', 'withdraw']);
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    const ap = s.player.ap;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.player.ap).toBe(ap - 1);
    expect(s.player.defensiveDiscount).toBe(true);
  });

  it('DefensiveDiscount_DoesNotStackAcrossSwaps', () => {
    let s = withHand(base(), ['withdraw']);
    s = tweak(s, (d) => {
      d.player.ap = 6;
    });
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    s = dispatch(s, { type: 'swap', benchIndex: 2 });
    s = dispatch(s, { type: 'swap', benchIndex: 1 });
    const ap = s.player.ap;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'withdraw').id });
    expect(s.player.ap).toBe(ap); // −1 once, floored at 0 for a 1-AP card
  });
});

describe('Step-Forward / Step-Backward — §3.3.2–§3.3.4', () => {
  it('StepForward_FromBench_BecomesLeadBeforeEffect_NoCounter_NoDiscount', () => {
    // Wartortle (Aqua Jet, SF) on the bench.
    let s = start(scenario({ team: [{ species: 'charmander', level: 8 }, { species: 'wartortle', level: 23, moves: ['aqua-jet', 'water-gun', 'bite', 'withdraw'] }], enemies: [PIDGEY] }));
    s = withHand(s, ['aqua-jet']);
    const enemyHp = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'aqua-jet').id });
    expect(s.player.leadIndex).toBe(1);
    expect(s.player.swapCounter).toBe(0);
    expect(s.player.defensiveDiscount).toBe(false);
    expect(s.enemies[0]!.hp).toBeLessThan(enemyHp);
    expect((eventsOf(s, 'swap').at(-1) as { kind: string }).kind).toBe('step-forward');
  });

  it('StepBackward_FromLead_EffectThenSwapToChosenBench', () => {
    let s = start(scenario({ team: [{ species: 'wartortle', level: 20, moves: ['skull-bash', 'water-gun', 'bite', 'withdraw'] }, { species: 'charmander', level: 8 }, { species: 'bulbasaur', level: 8 }], enemies: [PIDGEY] }));
    s = withHand(s, ['skull-bash']);
    const enemyHp = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'skull-bash').id, stepBackTo: 2 });
    expect(s.enemies[0]!.hp).toBeLessThan(enemyHp);
    expect(s.player.leadIndex).toBe(2);
    expect(s.player.swapCounter).toBe(0);
  });

  it('StepBackward_NoLegalBench_LeadStays', () => {
    let s = start(scenario({ team: [{ species: 'wartortle', level: 20, moves: ['skull-bash', 'water-gun', 'bite', 'withdraw'] }, { species: 'charmander', level: 8 }], enemies: [PIDGEY] }));
    s = withHand(s, ['skull-bash']);
    s = tweak(s, (d) => {
      d.player.team[1]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
    });
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'skull-bash').id, stepBackTo: 1 });
    expect(s.player.leadIndex).toBe(0);
  });

  it('StepBackward_FromBench_IsIneligible_MeleeNeedsLead', () => {
    let s = start(scenario({ team: [{ species: 'charmander', level: 8 }, { species: 'wartortle', level: 20, moves: ['skull-bash', 'water-gun', 'bite', 'withdraw'] }], enemies: [PIDGEY] }));
    s = withHand(s, ['skull-bash']);
    expect(reject(s, { type: 'play-card', cardId: handCard(s, 'skull-bash').id })).toBe('melee-needs-lead');
  });
});
