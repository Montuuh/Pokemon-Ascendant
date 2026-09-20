import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, ctx, dispatch, eventsOf, handCard, reject, scenario, start, tweak, withHand } from '../testing/harness';
import { cardPlayability } from './preview';

const base = () => start(scenario({ team: STARTERS, enemies: [PIDGEY] }));

describe('Card play — §3.2.4 / §3.3.1 Melee-Ranged', () => {
  it('Play_MeleeFromLead_Allowed_RangedFromBench_Allowed', () => {
    const s = withHand(base(), ['scratch', 'water-gun']);
    expect(cardPlayability(s, handCard(s, 'scratch').id, ctx)!.playable).toBe(true);
    expect(cardPlayability(s, handCard(s, 'water-gun').id, ctx)!.playable).toBe(true);
  });

  it('Play_MeleeFromBench_Rejected_MeleeNeedsLead', () => {
    const s = withHand(base(), ['tackle', 'tackle']); // Squirtle's and Bulbasaur's
    const squirtleTackle = s.player.hand.find((c) => c.moveId === 'tackle' && c.ownerUid === 'p1')!;
    expect(reject(s, { type: 'play-card', cardId: squirtleTackle.id })).toBe('melee-needs-lead');
  });

  it('Play_DamageAppliedAndCardDiscarded_APSpent', () => {
    let s = withHand(base(), ['ember']);
    const card = handCard(s, 'ember');
    const hp = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: card.id });
    expect(s.enemies[0]!.hp).toBeLessThan(hp);
    expect(s.player.ap).toBe(2);
    expect(s.player.hand.find((c) => c.id === card.id)).toBeUndefined();
    expect(s.player.discard.find((c) => c.id === card.id)).toBeDefined();
    expect(eventsOf(s, 'damage')).toHaveLength(1);
  });

  it('Play_NotEnoughAP_Rejected', () => {
    let s = withHand(base(), ['ember']);
    s = tweak(s, (d) => {
      d.player.ap = 0;
    });
    expect(reject(s, { type: 'play-card', cardId: handCard(s, 'ember').id })).toBe('not-enough-ap');
  });

  it('Play_ZeroAPUtility_Free', () => {
    let s = withHand(base(), ['growl', 'growl']); // Charmander's and Bulbasaur's
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'growl', 'p0').id });
    expect(s.player.ap).toBe(3);
    expect(s.enemies[0]!.stages.attack).toBe(-1);
  });

  it('Play_OwnerAsleep_Rejected_OwnerFrozen_Rejected', () => {
    const asleep = tweak(withHand(base(), ['ember']), (d) => {
      d.player.team[0]!.status = { kind: 'sleep', appliedTurn: 0, turnsLeft: 1 };
    });
    expect(reject(asleep, { type: 'play-card', cardId: handCard(asleep, 'ember').id })).toBe('owner-asleep');
    const frozen = tweak(withHand(base(), ['ember']), (d) => {
      d.player.team[0]!.status = { kind: 'freeze', appliedTurn: 0, turnsLeft: 1 };
    });
    expect(reject(frozen, { type: 'play-card', cardId: handCard(frozen, 'ember').id })).toBe('owner-frozen');
  });

  it('Play_Paralysis_AddsOneAPToOwnerCardsOnly', () => {
    const s = tweak(withHand(base(), ['ember', 'water-gun']), (d) => {
      d.player.team[0]!.status = { kind: 'paralysis', appliedTurn: 0, turnsLeft: 3 };
    });
    expect(cardPlayability(s, handCard(s, 'ember').id, ctx)!.apCost).toBe(2);
    expect(cardPlayability(s, handCard(s, 'water-gun').id, ctx)!.apCost).toBe(1);
  });

  it('Play_LethalCard_EndsCombatImmediately_Victory', () => {
    let s = tweak(withHand(base(), ['ember']), (d) => {
      d.enemies[0]!.hp = 1;
    });
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'ember').id });
    expect(s.outcome).toBe('victory');
    expect(s.phase).toBe('ended');
    expect(reject(s, { type: 'end-turn' })).toBe('not-action-phase');
  });

  it('Play_DrawEffect_DrawsExtraCards', () => {
    let s = start(scenario({ team: [{ species: 'pidgeotto', level: 16, moves: ['tailwind', 'gust', 'quick-attack', 'roost'] }, ...STARTERS.slice(0, 2)], enemies: [PIDGEY] }));
    s = withHand(s, ['tailwind']);
    const before = s.player.hand.length;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'tailwind').id });
    expect(s.player.hand.length).toBe(before - 1 + 1);
  });

  it('Play_HealMove_CappedAtMaxHp', () => {
    let s = start(scenario({ team: [{ species: 'pidgey', level: 10, hpPercent: 90, moves: ['roost', 'gust', 'tackle', 'sand-attack'] }], enemies: [PIDGEY] }));
    s = withHand(s, ['roost']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'roost').id });
    expect(s.player.team[0]!.hp).toBe(s.player.team[0]!.maxHp);
  });

  it('Play_AlwaysCrit_AppliesCritMultiplier', () => {
    let s = start(scenario({ team: [{ species: 'charmeleon', level: 13, moves: ['slash', 'ember', 'growl', 'smokescreen'] }], enemies: [{ species: 'geodude', level: 12, tier: 'wild', phaseCount: 1 }] }));
    s = withHand(s, ['slash']);
    const p = cardPlayability(s, handCard(s, 'slash').id, ctx)!;
    expect(p.damage!.isCrit).toBe(true);
    expect(p.damage!.critMultiplier).toBe(ctx.config.critMultiplier);
  });

  it('Play_ImmuneType_DealsZero', () => {
    // Geodude's Magnitude (ground) into Pidgey (flying) — ×0.
    let s = start(scenario({ team: [{ species: 'geodude', level: 10 }], enemies: [PIDGEY] }));
    s = withHand(s, ['magnitude']);
    const hp = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'magnitude').id });
    expect(s.enemies[0]!.hp).toBe(hp);
  });

  it('Preview_MatchesActualDamage_NoRngInDeterministicHits', () => {
    let s = withHand(base(), ['water-gun']);
    const preview = cardPlayability(s, handCard(s, 'water-gun').id, ctx)!.damage!.final;
    const hp = s.enemies[0]!.hp;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(hp - s.enemies[0]!.hp).toBe(preview);
  });

  it('EndTurn_HandGoesToDiscard_NewHandDrawn', () => {
    let s = base();
    const handIds = s.player.hand.map((c) => c.id);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.turn).toBe(2);
    expect(s.player.hand).toHaveLength(5);
    for (const id of handIds) expect(s.player.hand.find((c) => c.id === id)).toBeUndefined();
  });

  it('Deck_ReshufflesDiscardWhenEmpty', () => {
    let s = base();
    // 12 cards: turn 1 draws 5, turn 2 draws 5, turn 3 needs a reshuffle for 3 of them.
    s = dispatch(s, { type: 'end-turn' });
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.hand).toHaveLength(5);
    expect(s.player.deck.length + s.player.discard.length + s.player.hand.length).toBe(12);
  });
});
