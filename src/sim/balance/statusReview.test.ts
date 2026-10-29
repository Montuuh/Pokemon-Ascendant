import { describe, expect, it } from 'vitest';
import { cardPlayability } from '../combat/preview';
import { ctx, dispatch, handCard, scenario, start, tweak, withHand } from '../testing/harness';

// §4.2.2.4 — replacing a disabling status must not bypass its anti-chain rule.
describe('Control recovery — §4.2.2.4', () => {
  it('Sleep_ReplacedWithPoisonBeforeReapplication_EnemyStillActsEveryOtherTurn', () => {
    let state = start(scenario({
      team: [{ species: 'ivysaur', level: 16, moves: ['probe-sleep', 'probe-poison', 'vine-whip', 'growl'] }],
      enemies: [{ species: 'geodude', level: 16, tier: 'trainer', phaseCount: 1 }],
    }));
    let acted = 0;
    for (let turn = 0; turn < 10; turn++) {
      state = tweak(withHand(state, ['probe-poison', 'probe-sleep']), (draft) => {
        draft.player.team[0]!.hp = draft.player.team[0]!.maxHp;
        draft.enemies[0]!.hp = draft.enemies[0]!.maxHp;
      });
      if (state.enemies[0]!.intent?.kind !== 'incapacitated') acted++;
      for (const move of ['probe-poison', 'probe-sleep']) {
        const card = handCard(state, move);
        if (cardPlayability(state, card.id, ctx)?.playable) state = dispatch(state, { type: 'play-card', cardId: card.id });
      }
      state = dispatch(state, { type: 'end-turn' });
    }
    console.log(`poison/sleep replacement: enemy acted ${acted}/10 turns`);
    expect(acted).toBeGreaterThanOrEqual(5);
  });
});
