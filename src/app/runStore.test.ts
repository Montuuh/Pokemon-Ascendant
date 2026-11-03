import { afterEach, describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { getContent } from '@/content/registry';
import { arriveAtCity, createRun, defaultRunCtx, effectiveMax, newPartyMon, type SaveProvider } from '@/sim';
import { useRunStore } from './runStore';

const original = useRunStore.getState();
afterEach(() => useRunStore.setState(original));
function setup() {
  let saved: string | null = null;
  const provider: SaveProvider = { read: () => saved, write: (text) => { saved = text; }, clear: () => { saved = null; } };
  const content = getContent();
  const run = produce(createRun('squirtle', 7, defaultRunCtx(content)), (d) => {
    d.box[0] = newPartyMon('eevee', 11, content, 7, 'eevee'); d.activeUids = ['eevee'];
    d.stones = ['fire-stone']; arriveAtCity(d, defaultRunCtx(content));
  });
  useRunStore.setState({ run, provider, lastRejected: null });
  return useRunStore.getState();
}
function reload() {
  useRunStore.setState({ run: null });
  const result = useRunStore.getState().loadSave();
  expect(result.ok).toBe(true);
  return useRunStore.getState().run!;
}

describe('Permanent service actions autosave — §10.8', () => {
  it('StoneReservationPostponementResumptionAndConfirmationSurviveRealStoreReloads', () => {
    setup();
    expect(useRunStore.getState().dispatch({ type: 'use-stone', uid: 'eevee', stoneId: 'fire-stone' })).toBe(true);
    expect(reload().pendingEvolutions[0]!.stone).toBe('fire-stone');
    expect(useRunStore.getState().dispatch({ type: 'defer-evolution', uid: 'eevee' })).toBe(true);
    const postponed = reload();
    expect(postponed.phase).toBe('city'); expect(postponed.box[0]!.deferredEvolutionFrom).toBe('eevee'); expect(postponed.stones).toEqual(['fire-stone']);
    expect(useRunStore.getState().dispatch({ type: 'resume-evolution', uid: 'eevee' })).toBe(true);
    expect(reload().phase).toBe('evolution');
    expect(useRunStore.getState().dispatch({ type: 'choose-branch', uid: 'eevee', branchId: 'eevee-vanguard' })).toBe(true);
    expect(reload().box[0]!.speciesId).toBe('flareon'); expect(useRunStore.getState().run!.stones).toEqual([]);
  });

  it('RequestedNurseHealingSurvivesReload_EntryStillDoesNotHeal', () => {
    setup();
    useRunStore.setState({ run: produce(useRunStore.getState().run!, (d) => { d.box[0]!.hp = 1; d.box[0]!.traumaStacks = 1; }) });
    expect(useRunStore.getState().dispatch({ type: 'enter-building', building: 'center' })).toBe(true);
    expect(reload().box[0]!.hp).toBe(1);
    expect(useRunStore.getState().dispatch({ type: 'heal-center' })).toBe(true);
    const healed = reload();
    expect(healed.box[0]!.hp).toBe(effectiveMax(healed, healed.box[0]!, getContent())); expect(healed.box[0]!.traumaStacks).toBe(1);
  });

  it('EarnedTrainingIsSavedBeforeItsPrompt_AndRemainsFreeWhenPostponed', () => {
    setup();
    useRunStore.setState({ run: produce(useRunStore.getState().run!, (d) => {
      d.phase = 'training'; d.city = null; d.relics = ['evolution-catalyst']; d.pendingNodeId = d.reachable[0]!;
      d.map.nodes[d.pendingNodeId]!.kind = 'training';
    }) });
    expect(useRunStore.getState().dispatch({ type: 'train', uid: 'eevee', upgrade: 'evolve' })).toBe(true);
    expect(reload().pendingEvolutions[0]!.forced).toBe(true);
    expect(useRunStore.getState().dispatch({ type: 'defer-evolution', uid: 'eevee' })).toBe(true);
    expect(reload().box[0]!.deferredEvolutionForced).toBe(true);
    expect(useRunStore.getState().dispatch({ type: 'resume-evolution', uid: 'eevee' })).toBe(true);
    expect(useRunStore.getState().dispatch({ type: 'choose-branch', uid: 'eevee', branchId: 'eevee-vanguard' })).toBe(true);
    const done = reload(); expect(done.spentRelics).not.toContain('evolution-catalyst'); expect(done.stones).toEqual(['fire-stone']);
  });

});
