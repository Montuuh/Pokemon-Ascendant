import { create } from 'zustand';
import { getContent } from '@/content/registry';
import {
  DEFAULT_BATTLE_CONFIG,
  battleConfigFor,
  combatReducer,
  createCombat,
  type CombatAction,
  type CombatCtx,
  type CombatState,
  type RecordedCombat,
  type RejectReason,
  type ScenarioDef,
} from '@/sim';

// The bridge between the pure sim and React. Holds the current CombatState, the input log (for replay export)
// and the UI-only selection state. Components read slices and call `dispatch`; nothing here computes rules.

export type SelectionMode = 'none' | 'card' | 'consumable-ally' | 'step-back';

export interface Selection {
  mode: SelectionMode;
  /** Selected skill card (mode card / step-back) or consumable card (mode consumable-ally). */
  cardId: string | null;
}

interface CombatStore {
  ctx: CombatCtx;
  scenarioId: string | null;
  /** The scenario’s display name — a run fight is generated, so it is not in the catalog. */
  scenarioName: string | null;
  /** Increments on every start/restart so UI effects can tell a fresh combat from a continued one. */
  combatKey: number;
  state: CombatState | null;
  actions: CombatAction[];
  lastRejected: { reason: RejectReason; at: number } | null;
  selection: Selection;
  start: (scenarioId: string, seed?: number) => void;
  /** Start a scenario built at runtime — a run node's fight, which has no catalog id (§2.6). */
  startScenario: (scenario: ScenarioDef, seed?: number) => void;
  restart: () => void;
  dispatch: (action: CombatAction) => boolean;
  select: (selection: Selection) => void;
  clearSelection: () => void;
  exportReplay: () => RecordedCombat | null;
}

const NO_SELECTION: Selection = { mode: 'none', cardId: null };

export const useCombatStore = create<CombatStore>((set, get) => ({
  ctx: { content: getContent(), config: DEFAULT_BATTLE_CONFIG },
  scenarioId: null,
  scenarioName: null,
  combatKey: 0,
  state: null,
  actions: [],
  lastRejected: null,
  selection: NO_SELECTION,

  start: (scenarioId, seed) => {
    get().startScenario(getContent().scenario(scenarioId), seed);
  },

  startScenario: (scenario, seed) => {
    // §8.8 — a difficulty modifier that changes a BattleConfig constant (Trauma Surge is the only one) has to
    // be folded in *here*, because the ctx is what every later reducer call reads. The scenario carries the
    // run's modifier list; a fixture with none gets the default object straight back, so replays are unmoved.
    const ctx = { ...get().ctx, config: battleConfigFor(scenario.modifiers ?? []) };
    const state = createCombat(scenario, ctx, seed);
    set({
      ctx,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      state,
      actions: [],
      lastRejected: null,
      selection: NO_SELECTION,
      combatKey: get().combatKey + 1,
    });
  },

  restart: () => {
    const { scenarioId, state } = get();
    // A run fight is not in the catalog, so only a fixture can be restarted from here.
    if (scenarioId && !scenarioId.startsWith('run-')) get().start(scenarioId, state?.seed);
  },

  dispatch: (action) => {
    const { state, ctx, actions } = get();
    if (!state) return false;
    const r = combatReducer(state, action, ctx);
    if (r.rejected) {
      set({ lastRejected: { reason: r.rejected, at: Date.now() } });
      return false;
    }
    set({ state: r.state, actions: [...actions, action], selection: NO_SELECTION, lastRejected: null });
    return true;
  },

  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: NO_SELECTION }),

  exportReplay: () => {
    const { scenarioId, state, actions } = get();
    if (!scenarioId || !state) return null;
    return { scenarioId, seed: state.seed, actions };
  },
}));
