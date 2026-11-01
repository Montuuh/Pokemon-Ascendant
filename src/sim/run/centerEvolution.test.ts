import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { arriveAtCity, createRun, defaultRunCtx, deserialiseRun, effectiveMax, evolutionResume, newPartyMon, runReducer, serialiseRun, therapyPrice, type RunAction, type RunState } from '@/sim';

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (state: RunState, action: RunAction): RunState => {
  const result = runReducer(state, action, ctx);
  expect(result.rejected).toBeUndefined();
  return result.state;
};
const city = () => produce(createRun('squirtle', 7, ctx), (d) => {
  d.money = 5000;
  d.box.push(newPartyMon('pidgey', 10, content, 7, 'reserve'));
  arriveAtCity(d, ctx);
  for (const m of d.box) { m.hp = 1; m.traumaStacks = 2; m.status = { kind: 'burn', turnsLeft: null }; m.confusionTurns = 2; }
});
const center = () => apply(city(), { type: 'enter-building', building: 'center' });
const queued = (state: RunState, uids: string[]) => produce(state, (d) => {
  d.phase = 'evolution';
  d.pendingEvolutions = uids.map((uid) => {
    const mon = d.box.find((m) => m.uid === uid)!;
    return { uid, from: mon.speciesId, branchIds: content.species(mon.speciesId).branches.map((b) => b.id), returnTo: 'center' as const };
  });
});
function oldSave(state: RunState, resting: string | null, pendingStone = false): string {
  const old = JSON.parse(serialiseRun(state, 0)) as { version: number; checksum: number; run: RunState & { resting?: string | null } };
  old.version = 21; old.run.version = 21; old.run.resting = resting;
  if (old.run.city) Object.assign(old.run.city, { daycareUsed: true });
  if (pendingStone) old.run.stones = []; // v21 spent the stone before saving the prompt.
  old.checksum = (JSON.parse(serialiseRun(old.run, 0)) as { checksum: number }).checksum;
  return JSON.stringify(old);
}

describe('Manual Center services — §2.11.1', () => {
  it('EnteringDoesNotHealCureOrTreat_AndTheNurseTreatsTheWholeBoxOnlyWhenAsked', () => {
    const before = city();
    const entered = apply(before, { type: 'enter-building', building: 'center' });
    expect(entered.box).toEqual(before.box);
    expect(entered.heals).toBe(before.heals);
    const hurt = produce(entered, (d) => { d.box[1]!.hp = 0; });
    const healed = apply(hurt, { type: 'heal-center' });
    expect(healed.money).toBe(hurt.money);
    expect(healed.heals).toBe((hurt.heals ?? 0) + 1);
    for (const mon of healed.box) {
      expect(mon.hp).toBe(effectiveMax(healed, mon, content));
      expect(mon.status).toBeNull(); expect(mon.confusionTurns).toBe(0); expect(mon.traumaStacks).toBe(2);
    }
    expect(runReducer(before, { type: 'heal-center' }, ctx).rejected).toBe('wrong-phase');
  });

  it('BedsRemoveOneStackAtTheCurrentPrice_WithoutHealingOrChangingTheFormation', () => {
    const before = center();
    const mon = before.box[0]!;
    const after = apply(before, { type: 'use-therapy', uid: mon.uid });
    expect(after.money).toBe(before.money - therapyPrice(mon));
    expect(after.box[0]!.traumaStacks).toBe(1); expect(after.box[0]!.hp).toBe(1);
    expect(after.box[0]!.level).toBe(mon.level); expect(after.box[0]!.xp).toBe(mon.xp);
    expect(after.activeUids).toEqual(before.activeUids); expect(after.heals).toBe(before.heals);
    const healed = apply(after, { type: 'heal-center' });
    expect(healed.box[0]!.hp).toBe(effectiveMax(healed, healed.box[0]!, content));
    expect(healed.box[0]!.traumaStacks).toBe(1);
  });

  it('V21ReleasesRestingPokemonIntoOnlyAFreeLegalPlace_WithoutAnotherLevelOrReward', () => {
    const before = center();
    const loaded = deserialiseRun(oldSave(before, 'reserve'), content);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.run.box).toEqual(before.box); expect(loaded.run.money).toBe(before.money);
    expect(loaded.run.activeUids).toEqual([...before.activeUids, 'reserve']);
    expect(loaded.run).not.toHaveProperty('resting'); expect(loaded.run.city).not.toHaveProperty('daycareUsed');
    const full = produce(before, (d) => {
      const extra = newPartyMon('rattata', 10, content, 7, 'third');
      const resting = newPartyMon('oddish', 10, content, 7, 'fourth');
      d.box.push(extra, resting); d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
    });
    const kept = deserialiseRun(oldSave(full, 'fourth'), content);
    expect(kept.ok && kept.run.activeUids).toEqual(full.activeUids);
    const legendary = produce(before, (d) => { d.box[1] = newPartyMon('articuno', 30, content, 7, 'reserve'); d.box.push(newPartyMon('rattata', 10, content, 7, 'third')); d.activeUids.push('third'); });
    const legal = deserialiseRun(oldSave(legendary, 'reserve'), content);
    expect(legal.ok && legal.run.activeUids).toEqual(legendary.activeUids);
  });

  it('V21RestingUnknownSpecies_ReturnsCorruptWithoutThrowing', () => {
    const invalid = produce(center(), (d) => { d.box[1]!.speciesId = 'missing-species'; });
    expect(deserialiseRun(oldSave(invalid, 'reserve'), content)).toEqual({ ok: false, reason: 'corrupt' });
  });
});

describe('Postponed evolution — §6.3.1', () => {
  it('PostponingOneUidKeepsTheOtherPrompt_AndDoesNotOfferThePostponedStageAgain', () => {
    let state = produce(center(), (d) => { d.box[0]!.level = 12; d.box[1]!.level = 12; });
    const uid = state.box[0]!.uid;
    state = queued(state, [uid, 'reserve']);
    state = apply(state, { type: 'defer-evolution', uid });
    expect(state.phase).toBe('evolution'); expect(state.pendingEvolutions.map((p) => p.uid)).toEqual(['reserve']);
    expect(state.box[0]!.speciesId).toBe('squirtle'); expect(state.box[0]!.deferredEvolutionFrom).toBe('squirtle');
    state = apply(state, { type: 'choose-branch', uid: 'reserve', branchId: state.pendingEvolutions[0]!.branchIds[0]! });
    expect(state.phase).toBe('center'); expect(state.pendingEvolutions).toEqual([]);
    state = apply(state, { type: 'resume-evolution', uid });
    expect(state.phase).toBe('evolution'); expect(state.pendingEvolutions[0]!.uid).toBe(uid);
    state = apply(state, { type: 'choose-branch', uid, branchId: state.pendingEvolutions[0]!.branchIds[0]! });
    expect(state.phase).toBe('center'); expect(state.box[0]!.deferredEvolutionFrom).toBeUndefined();
    expect(state.box[0]!.hp).toBe(1); // Evolution in the Center must not bypass the nurse.
  });

  it('StoneIsRetainedOnOpenPostponeAndReload_AndSpentOnlyOnConfirmation', () => {
    let state = produce(center(), (d) => { d.box[0] = newPartyMon('eevee', 8, content, 7, 'eevee'); d.activeUids = ['eevee']; d.stones = ['fire-stone']; });
    state = apply(state, { type: 'use-stone', uid: 'eevee', stoneId: 'fire-stone' });
    expect(state.stones).toEqual(['fire-stone']);
    state = apply(state, { type: 'defer-evolution', uid: 'eevee' });
    const loaded = deserialiseRun(serialiseRun(state, 0), content);
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    state = loaded.run;
    expect(state.box[0]!.speciesId).toBe('eevee'); expect(state.stones).toEqual(['fire-stone']);
    expect(evolutionResume(state, state.box[0]!, content)).toEqual({ stone: 'fire-stone' });
    state = apply(state, { type: 'resume-evolution', uid: 'eevee' });
    expect(state.pendingEvolutions[0]!.branchIds).toEqual(['eevee-vanguard']);
    state = apply(state, { type: 'choose-branch', uid: 'eevee', branchId: 'eevee-vanguard' });
    expect(state.box[0]!.speciesId).toBe('flareon'); expect(state.stones).toEqual([]);
  });

  it('V21PendingStoneGetsOneRefund_WithoutDuplicationOnTheNextReload', () => {
    let state = produce(center(), (d) => { d.box[0] = newPartyMon('eevee', 8, content, 7, 'eevee'); d.activeUids = ['eevee']; d.stones = ['fire-stone']; });
    state = apply(state, { type: 'use-stone', uid: 'eevee', stoneId: 'fire-stone' });
    const loaded = deserialiseRun(oldSave(state, null, true), content);
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    expect(loaded.run.stones).toEqual(['fire-stone']);
    const again = deserialiseRun(serialiseRun(loaded.run, 0), content);
    expect(again.ok && again.run.stones).toEqual(['fire-stone']);
    const done = apply(loaded.run, { type: 'choose-branch', uid: 'eevee', branchId: 'eevee-vanguard' });
    expect(done.stones).toEqual([]);
  });

  it('QueuedCatalystEvolutionDoesNotQueueAnotherEarlyCandidate', () => {
    let state = produce(center(), (d) => {
      d.box = [newPartyMon('squirtle', 12, content, 7, 'natural'), newPartyMon('bulbasaur', 8, content, 7, 'early-a'), newPartyMon('charmander', 8, content, 7, 'early-b')];
      d.activeUids = d.box.map((m) => m.uid); d.relics = ['evolution-catalyst'];
    });
    state = queued(state, ['natural', 'early-a']);
    state = apply(state, { type: 'choose-branch', uid: 'natural', branchId: state.pendingEvolutions[0]!.branchIds[0]! });
    expect(state.pendingEvolutions.map((p) => p.uid)).toEqual(['early-a']);
    state = apply(state, { type: 'choose-branch', uid: 'early-a', branchId: state.pendingEvolutions[0]!.branchIds[0]! });
    expect(state.spentRelics).toContain('evolution-catalyst'); expect(state.phase).toBe('center'); expect(state.pendingEvolutions).toEqual([]);
    expect(runReducer(state, { type: 'resume-evolution', uid: 'early-b' }, ctx).rejected).toBe('wrong-phase');
  });

  it('TrainingEntitlementSurvivesPostponementAndReload_ForOneStage_WithoutSpendingCatalyst', () => {
    let state = produce(createRun('charmander', 7, ctx), (d) => {
      d.relics = ['evolution-catalyst']; d.phase = 'training'; d.pendingNodeId = d.reachable[0]!;
      d.map.nodes[d.pendingNodeId]!.kind = 'training';
    });
    const uid = state.box[0]!.uid;
    state = apply(state, { type: 'train', uid, upgrade: 'evolve' });
    expect(state.pendingEvolutions[0]!.forced).toBe(true);
    state = apply(state, { type: 'defer-evolution', uid });
    const loaded = deserialiseRun(serialiseRun(state, 0), content);
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    expect(evolutionResume(loaded.run, loaded.run.box[0]!, content)).toEqual({ forced: true });
    state = apply(loaded.run, { type: 'resume-evolution', uid });
    state = apply(state, { type: 'choose-branch', uid, branchId: state.pendingEvolutions[0]!.branchIds[0]! });
    expect(state.box[0]!.speciesId).toBe('charmeleon'); expect(state.box[0]!.deferredEvolutionForced).toBeUndefined();
    expect(state.spentRelics).not.toContain('evolution-catalyst'); expect(state.pendingEvolutions).toEqual([]);
    expect(runReducer(state, { type: 'resume-evolution', uid }, ctx).rejected).toBe('wrong-phase');
  });

  it('V21TrainingProvenancePreservesItsFreeEvolution_EvenWithCatalystAvailable', () => {
    let state = produce(createRun('charmander', 7, ctx), (d) => {
      d.relics = ['evolution-catalyst']; d.phase = 'training'; d.pendingNodeId = d.reachable[0]!;
      d.map.nodes[d.pendingNodeId]!.kind = 'training';
    });
    const uid = state.box[0]!.uid;
    state = apply(state, { type: 'train', uid, upgrade: 'evolve' });
    state = produce(state, (d) => { delete d.pendingEvolutions[0]!.forced; });
    const loaded = deserialiseRun(oldSave(state, null), content);
    expect(loaded.ok).toBe(true); if (!loaded.ok) return;
    expect(loaded.run.pendingEvolutions[0]!.forced).toBe(true);
    const done = apply(loaded.run, { type: 'choose-branch', uid, branchId: loaded.run.pendingEvolutions[0]!.branchIds[0]! });
    expect(done.spentRelics).not.toContain('evolution-catalyst'); expect(done.box[0]!.speciesId).toBe('charmeleon');
  });


  it('DeferredStoneWithCatalystAvailable_ResumesTheChosenStoneAndBranch', () => {
    let state = produce(createRun('eevee', 7, ctx), (d) => {
      d.box[0]!.level = 8; d.stones = ['fire-stone']; d.relics = ['evolution-catalyst'];
    });
    const uid = state.box[0]!.uid;
    state = apply(state, { type: 'use-stone', uid, stoneId: 'fire-stone' });
    state = apply(state, { type: 'defer-evolution', uid });
    const saved = deserialiseRun(serialiseRun(state, 0), content);
    expect(saved.ok).toBe(true); if (!saved.ok) return;
    state = saved.run;
    expect(evolutionResume(state, state.box[0]!, content)).toEqual({ stone: 'fire-stone' });
    state = apply(state, { type: 'resume-evolution', uid });
    expect(state.pendingEvolutions[0]!.stone).toBe('fire-stone');
    expect(state.pendingEvolutions[0]!.branchIds).toEqual(['eevee-vanguard']);
    state = apply(state, { type: 'choose-branch', uid, branchId: 'eevee-vanguard' });
    expect(state.box[0]!.speciesId).toBe('flareon'); expect(state.stones).toEqual([]);
    expect(state.spentRelics).not.toContain('evolution-catalyst');
  });


  it('EarnedTrainingRightSurvivesAnAdditionalStonePreviewAndPostponement', () => {
    let state = produce(createRun('eevee', 7, ctx), (d) => {
      d.box[0]!.level = 8; d.stones = ['fire-stone']; d.relics = ['evolution-catalyst'];
      d.phase = 'training'; d.pendingNodeId = d.reachable[0]!; d.map.nodes[d.pendingNodeId]!.kind = 'training';
    });
    const uid = state.box[0]!.uid;
    state = apply(state, { type: 'train', uid, upgrade: 'evolve' });
    state = apply(state, { type: 'defer-evolution', uid });
    state = apply(state, { type: 'use-stone', uid, stoneId: 'fire-stone' });
    state = apply(state, { type: 'defer-evolution', uid });
    expect(state.box[0]!.deferredEvolutionForced).toBe(true);
    const saved = deserialiseRun(serialiseRun(state, 0), content);
    expect(saved.ok).toBe(true); if (!saved.ok) return;
    state = apply(saved.run, { type: 'resume-evolution', uid });
    expect(state.pendingEvolutions[0]!.forced).toBe(true);
    state = apply(state, { type: 'choose-branch', uid, branchId: 'eevee-vanguard' });
    expect(state.stones).toEqual(['fire-stone']); expect(state.spentRelics).not.toContain('evolution-catalyst');
  });

});
