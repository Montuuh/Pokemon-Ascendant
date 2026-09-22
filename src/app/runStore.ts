import { create } from 'zustand';
import { getContent } from '@/content/registry';
import {
  buildOutcomeReport,
  createRun,
  defaultRunCtx,
  deserialiseRun,
  describeSave,
  runPerksFor,
  runReducer,
  serialiseRun,
  validateRunAction,
  type LoadResult,
  type RunAction,
  type RunRejectReason,
  type RunState,
  type SaveProvider,
} from '@/sim';
import { localSaveProvider } from '@/app/saveProvider';
import { useCombatStore } from '@/app/combatStore';
import { useAccountStore } from '@/app/accountStore';

// The run's React bridge (§2, §10.8). It owns one RunState, forwards actions to the pure reducer and decides
// when to write the save. It also drives the combat store: entering a fight hands the generated scenario over,
// and leaving one hands the result back. Nothing here computes a rule.

interface RunStore {
  run: RunState | null;
  provider: SaveProvider;
  lastRejected: { reason: RunRejectReason; at: number } | null;
  /** Bumped on every new run so screens can reset local state. */
  runKey: number;

  /**
   * §8.8 modifiers and §8.6.3's Starting Relic are chosen before the run exists, so they arrive here; the
   * account's perks (§8.10) are snapshotted from the account store at the same moment. `twin` is §8.4.2's
   * second starter.
   */
  newRun: (starterId: string, seed?: number, modifiers?: readonly string[], startingRelic?: string, regionModifier?: string, twin?: string) => void;
  dispatch: (action: RunAction) => boolean;
  /** Enter the pending node's fight: reduce, then boot the combat store with the generated scenario. */
  beginCombat: () => boolean;
  /** Read the finished combat back into the run. Safe to call once the combat has an outcome. */
  finishCombat: () => boolean;
  /** Rebuild the in-flight fight after a reload, from the scenario the save carries (§10.8.6). */
  resumeCombat: () => boolean;
  abandon: () => void;

  save: () => void;
  loadSave: () => LoadResult;
  hasSave: () => boolean;
  saveSummary: () => string | null;
  clearSave: () => void;
}

const ctx = () => defaultRunCtx(getContent());

/** A run seed the player never sees but a bug report can quote. */
const freshSeed = () => Math.floor(Math.random() * 0xffffffff) >>> 0;

export const useRunStore = create<RunStore>((set, get) => ({
  run: null,
  provider: localSaveProvider(),
  lastRejected: null,
  runKey: 0,

  newRun: (starterId, seed, modifiers = [], startingRelic, regionModifier, twin) => {
    const account = useAccountStore.getState();
    const perks = runPerksFor(account.account, getContent(), !!twin);
    const run = createRun(starterId, seed ?? freshSeed(), ctx(), 0, modifiers, startingRelic, regionModifier, perks, twin);
    run.stats.startedAt = Date.now();
    account.beginRun();
    set({ run, lastRejected: null, runKey: get().runKey + 1 });
    get().save();
  },

  dispatch: (action) => {
    const { run } = get();
    if (!run) return false;
    const result = runReducer(run, action, ctx());
    if (result.rejected) {
      set({ lastRejected: { reason: result.rejected, at: Date.now() } });
      return false;
    }
    set({ run: result.state, lastRejected: null });
    // §8.7 — the account's record watches every accepted action and folds whatever visibly happened. A diff
    // rather than an event queue on RunState: the run save has to replay identically (§10.8) and account
    // bookkeeping has no business inside it. See metaEventsFor.
    useAccountStore.getState().observe(run, result.state, action.type === 'finish-combat' ? action.report : undefined);
    // §10.8.1 — autosave at every node boundary, and after anything permanent: an evolution branch, a TM,
    // a tutor move and an ability swap all cost something the player cannot get back by reloading.
    const AUTOSAVE: RunAction['type'][] = [
      'enter-node', 'claim-reward', 'resolve-recruit', 'begin-combat',
      'choose-branch', 'use-tm', 'teach-move', 'set-ability', 'leave-dojo',
      // §2.11 — a City visit: the doors, what was bought and sold at them, and the gate out.
      'pick-legendary', 'leave-aid', 'leave-shop', 'leave-center', 'buy', 'sell-item', 'use-therapy',
      'enter-building', 'depart-city',
    ];
    if (AUTOSAVE.includes(action.type)) get().save();
    return true;
  },

  beginCombat: () => {
    const { run } = get();
    if (!run) return false;
    const rejected = validateRunAction(run, { type: 'begin-combat' }, ctx());
    if (rejected) {
      set({ lastRejected: { reason: rejected, at: Date.now() } });
      return false;
    }
    if (!get().dispatch({ type: 'begin-combat' })) return false;

    const next = get().run!;
    // A Centre heals instead of fighting, so there may be no scenario to start.
    if (next.phase === 'combat' && next.pendingScenario) {
      useCombatStore.getState().startScenario(next.pendingScenario, next.pendingScenario.seed);
    }
    return true;
  },

  finishCombat: () => {
    const { run } = get();
    const combat = useCombatStore.getState().state;
    if (!run || !combat || combat.outcome === 'in-progress') return false;
    return get().dispatch({ type: 'finish-combat', report: buildOutcomeReport(combat, run) });
  },

  resumeCombat: () => {
    const { run } = get();
    if (!run || run.phase !== 'combat' || !run.pendingScenario) return false;
    // The scenario carries its own seed, so the resumed fight replays the same RNG stream it started with.
    useCombatStore.getState().startScenario(run.pendingScenario, run.pendingScenario.seed);
    return true;
  },

  abandon: () => {
    get().clearSave();
    set({ run: null, lastRejected: null });
  },

  save: () => {
    const { run, provider } = get();
    if (!run) return;
    // A finished run is not resumable; clearing here stops "Continue" pointing at a victory screen.
    if (run.outcome !== 'in-progress') provider.clear();
    else provider.write(serialiseRun(run, Date.now()));
  },

  loadSave: () => {
    const result = deserialiseRun(get().provider.read(), getContent());
    if (result.ok) set({ run: result.run, lastRejected: null, runKey: get().runKey + 1 });
    else get().provider.clear();
    return result;
  },

  hasSave: () => deserialiseRun(get().provider.read(), getContent()).ok,

  saveSummary: () => {
    const result = deserialiseRun(get().provider.read(), getContent());
    return result.ok ? describeSave(result.run, getContent()) : null;
  },

  clearSave: () => get().provider.clear(),
}));
