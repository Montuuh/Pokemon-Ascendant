import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, dispatch, handCard, scenario, start, tweak, withHand } from '../testing/harness';
import { purgeOwner } from './deck';

// §5.13 / §8.6.1 / §8.10 — what the account hands a fight: the fifth card, the revealed intent, Perfect Recall,
// and the tallies the Tier-2 discoveries read back out.

const BOSS = { species: 'onix', level: 12, tier: 'boss' as const, phaseCount: 2 as const };

describe('The Mastery slot — §5.13.2', () => {
  it('AMemberWithAMasteryMove_BringsFiveCards_AndAFaintPurgesFive', () => {
    const team = STARTERS.map((m, i) => (i === 0 ? { ...m, masteryMove: 'aqua-tail' } : m));
    const s = start(scenario({ team, enemies: [PIDGEY] }));
    const all = [...s.player.hand, ...s.player.deck];
    expect(all).toHaveLength(13);
    const fifth = all.filter((c) => c.mastery);
    expect(fifth).toHaveLength(1);
    expect(fifth[0]!.moveId).toBe('aqua-tail');
    expect(fifth[0]!.ownerUid).toBe('p0');
    // §5.13.2 — "5 cards leave the deck and discard, not 4": the purge is by owner, so it needs no special case.
    const draft = structuredClone(s);
    draft.player.discard = draft.player.hand;
    draft.player.hand = [];
    const removed = purgeOwner(draft, 'p0');
    expect(removed).toBe(5);
  });

  it('TheDeckNeverExceedsFifteen_ThreeMasteries', () => {
    const team = STARTERS.map((m) => ({ ...m, masteryMove: 'aqua-tail' }));
    const s = start(scenario({ team, enemies: [PIDGEY] }));
    expect(s.player.hand.length + s.player.deck.length).toBe(15);
  });
});

describe('Familiar and Insight — §5.13.1, §8.4.2', () => {
  it('AFamiliarSpecies_NeverHidesItsIntent_EvenAsABoss', () => {
    const hidden = start(scenario({ team: STARTERS, enemies: [BOSS], kind: 'boss' }));
    expect(hidden.enemies[0]!.intent?.hidden).toBe(true);
    const known = start(scenario({ team: STARTERS, enemies: [BOSS], kind: 'boss', familiar: ['onix'] }));
    expect(known.enemies[0]!.intent?.hidden).toBe(false);
  });

  it('Insight_ShowsTheFirstIntentOnly', () => {
    let s = start(scenario({ team: STARTERS, enemies: [BOSS], kind: 'boss', insight: ['onix'] }));
    expect(s.enemies[0]!.intent?.hidden).toBe(false);
    // After it has acted it is witnessed anyway; Insight adds nothing more and takes nothing away.
    s = dispatch(s, { type: 'end-turn' });
    expect(s.enemies[0]!.witnessed).toBe(true);
    expect(s.enemies[0]!.intent?.hidden).toBe(false);
  });
});

describe('Perfect Recall — §8.6.1', () => {
  it('AShortDeck_TakesItsDiscardBack_BeforeTheDraw_OncePerFight', () => {
    let s = start(scenario({ team: STARTERS, enemies: [{ ...PIDGEY, level: 1, hpPercent: 100 }], relics: ['perfect-recall'] }));
    // Empty the deck into the discard by hand, so the next turn's draw would run short.
    s = tweak(s, (d) => {
      d.player.discard.push(...d.player.deck);
      d.player.deck = [];
    });
    const discardBefore = s.player.discard.length;
    expect(discardBefore).toBeGreaterThan(0);
    s = dispatch(s, { type: 'end-turn' });
    if (s.outcome !== 'in-progress') return;
    expect(s.player.spent).toContain('perfect-recall');
    // Not a reshuffle: the relics that pay on one do not see one.
    expect(s.player.tally.reshuffles).toBe(0);
    expect(s.player.hand).toHaveLength(5);
  });
});

describe('The fight tally — §8.6.1', () => {
  it('CountsThePrintedApOfACardPlayed_AndTheHandAtTurnEnd', () => {
    let s = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    s = withHand(s, ['tackle', 'growl', 'tail-whip', 'water-gun', 'scratch']);
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.player.tally.maxApMove).toBe(1);
    s = dispatch(s, { type: 'end-turn' });
    expect(s.player.tally.peakHandAtTurnEnd).toBe(4);
  });
});
