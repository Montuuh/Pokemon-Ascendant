import { describe, expect, it } from 'vitest';
import { content, ctx, dispatch, handCard, leadOf, scenario, start, tweak, withConsumableHand, withHand } from '../testing/harness';

import { apCostDetails, cardPlayability } from './preview';
import type { CombatState } from './state';

// §3.2.2 / §7.3.5 — a recurring refill must include the opening turn.
describe('AP provenance — §3.8', () => {
  it('SagesTome_EveryTurnIncludingTheFirst_GrantsOneMoreAp', () => {
    let state = start(scenario({ team: [{ species: 'snorlax', level: 42 }], enemies: [{ species: 'caterpie', level: 4, tier: 'wild', phaseCount: 1 }], relics: ['sages-tome'] }));
    for (let turn = 1; turn <= 4; turn++) {
      expect(state.player.ap, `turn ${turn}`).toBe(ctx.config.baseApPerTurn + 1);
      state = dispatch(state, { type: 'end-turn' });
    }
  });

  it('CapsStackedTurnStartBonuses_AndNamesEachSourceAndBlockedAmount', () => {
    let state = start(scenario({ team: [0, 1, 2].map(() => ({ species: 'snorlax', level: 84, abilityId: 'speed-boost' })), enemies: [{ species: 'caterpie', level: 1, tier: 'wild', phaseCount: 1 }], relics: ['sages-tome'] }));
    state = dispatch(state, { type: 'end-turn' });
    expect(state.player.ap).toBe(6);
    const ledger = state.log.filter((l) => l.turn === 2 && l.ap?.kind === 'balance');
    expect(ledger.some((l) => l.ap!.source === "Sage's Tome")).toBe(true);
    expect(ledger.filter((l) => l.ap!.source.includes('Speed Boost'))).toHaveLength(3);
    expect(ledger.at(-1)!.text).toContain('1 blocked by the 6 AP cap');
    expect(ledger.at(-1)!.ap).toMatchObject({ before: 6, after: 6, requested: 1 });
  });

  it('EtherLogsItsSpendAndActualCappedRestorationSeparately', () => {
    let state = start(scenario({ team: [0, 1, 2].map(() => ({ species: 'snorlax', level: 84, abilityId: 'speed-boost' })), enemies: [{ species: 'caterpie', level: 1, tier: 'wild', phaseCount: 1 }], relics: ['sages-tome'], consumables: ['ether'] }));
    state = withConsumableHand(dispatch(state, { type: 'end-turn' }), ['ether']);
    state = dispatch(state, { type: 'use-consumable', cardId: state.player.consumables.hand[0]!.id });
    expect(state.player.ap).toBe(6);
    const entries = state.log.filter((l) => l.ap?.source.startsWith('Ether'));
    expect(entries.map((l) => [l.ap!.before, l.ap!.after])).toEqual([[6, 5], [5, 6]]);
    expect(entries[1]!.text).toContain('1 blocked by the 6 AP cap');
  });

  it('StoredCreditsNameTheirOrigin_WhenEarnedAndWhenApplied_WithoutDoublePayingTome', () => {
    let state = start(scenario({ team: [{ species: 'snorlax', level: 84, moves: ['tackle', 'growl', 'defense-curl'] }], enemies: [{ species: 'caterpie', level: 84, tier: 'wild', phaseCount: 1 }], relics: ['sages-tome', 'cycle-cell', 'move-echo'] }));
    state = withHand(state, ['tackle', 'growl', 'defense-curl']);
    for (const move of ['tackle', 'growl', 'defense-curl']) state = dispatch(state, { type: 'play-card', cardId: handCard(state, move).id });
    state = tweak(state, (d) => { d.player.reshuffled = true; d.player.reshuffledTurn = d.turn; });
    state = dispatch(state, { type: 'end-turn' });
    expect(state.player.ap).toBe(6); expect(state.player.bankedAp).toBe(0);
    expect(state.log.filter((l) => l.ap?.kind === 'bank').map((l) => l.ap!.source)).toEqual(['Cycle Cell', 'Move Echo']);
    const applied = state.log.filter((l) => l.turn === 2 && l.ap?.kind === 'balance');
    expect(applied.filter((l) => l.ap!.source === "Sage's Tome")).toHaveLength(1);
    expect(applied.filter((l) => l.ap!.source.includes('stored last turn')).map((l) => l.ap!.source)).toEqual(['Cycle Cell — stored last turn', 'Move Echo — stored last turn']);
  });

  it('FreeCostsNameTheRelicAndCondition_AndPreviewsNeverWriteToTheLog', () => {
    let state = start(scenario({ team: [{ species: 'snorlax', level: 84, moves: ['tackle', 'water-gun'], status: 'paralysis' }], enemies: [{ species: 'caterpie', level: 84, tier: 'wild', phaseCount: 1 }], relics: ['grandmasters-tempo'] }));
    state = withHand(state, ['water-gun']);
    const before = state.log;
    const card = handCard(state, 'water-gun');
    for (let i = 0; i < 5; i++) { apCostDetails(state, content.move('water-gun'), leadOf(state), ctx); cardPlayability(state, card.id, ctx); }
    expect(state.log).toBe(before);
    const after = dispatch(state, { type: 'play-card', cardId: card.id });
    const entry = after.log.findLast((l) => l.ap?.source.includes('Water Gun'))!;
    expect(entry.text).toContain('Paralysis'); expect(entry.text).toContain("Grandmaster's Tempo: free");
    expect(entry.ap!.before).toBe(entry.ap!.after);
    expect(entry.text).not.toContain('99');
  });

  it('ManualFreeSwapsNameTheConsumedSource_AndEveryBalanceFormsAnUnbrokenLedger', () => {
    let state = start(scenario({ team: [{ species: 'snorlax', level: 84 }, { species: 'pidgey', level: 84 }], enemies: [{ species: 'caterpie', level: 1, tier: 'wild', phaseCount: 1 }], relics: ['flow-state', 'tacticians-coin', 'sages-tome'] }));
    state = dispatch(state, { type: 'swap', benchIndex: 1 });
    state = dispatch(state, { type: 'swap', benchIndex: 0 });
    state = dispatch(state, { type: 'end-turn' });
    const ledger = state.log.filter((l) => l.ap?.kind === 'balance');
    expect(ledger.some((l) => l.ap!.source.includes('free: Flow State'))).toBe(true);
    expect(ledger.some((l) => l.ap!.source.includes("free: Tactician's Coin"))).toBe(true);
    let balance = 0;
    for (const entry of ledger) { expect(entry.ap!.before).toBe(balance); balance = entry.ap!.after; }
    expect(balance).toBe(state.player.ap);
  });

  it('LegacyNumericBankStillAppliesOnce_AndIsExplicitlyLabelled', () => {
    let state: CombatState = start(scenario({ team: [{ species: 'snorlax', level: 84 }], enemies: [{ species: 'caterpie', level: 1, tier: 'wild', phaseCount: 1 }] }));
    state = tweak(state, (d) => { d.player.bankedAp = 2; delete d.player.bankedApSources; });
    state = dispatch(state, { type: 'end-turn' });
    expect(state.player.ap).toBe(5); expect(state.player.bankedAp).toBe(0);
    expect(state.log.some((l) => l.text.includes('Previously stored AP'))).toBe(true);
    state = dispatch(state, { type: 'end-turn' }); expect(state.player.ap).toBe(3);
  });

  it('ASecondBankSourceDoesNotOverwriteUnlabelledLegacyCredits', () => {
    let state = start(scenario({ team: [{ species: 'snorlax', level: 84 }], enemies: [{ species: 'caterpie', level: 1, tier: 'wild', phaseCount: 1 }], relics: ['cycle-cell'] }));
    state = tweak(state, (d) => { d.player.bankedAp = 2; delete d.player.bankedApSources; d.player.reshuffled = true; d.player.reshuffledTurn = d.turn; });
    state = dispatch(state, { type: 'end-turn' });
    expect(state.player.ap).toBe(6);
    expect(state.log.filter((l) => l.turn === 2 && l.ap?.source.includes('stored last turn')).map((l) => l.ap!.requested)).toEqual([2, 1]);
  });

});
