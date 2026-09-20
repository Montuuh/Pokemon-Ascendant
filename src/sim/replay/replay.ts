import type { ScenarioDef } from '../content/defs';
import type { CombatCtx } from '../combat/context';
import { combatReducer } from '../combat/reducer';
import { createCombat } from '../combat/setup';
import type { CombatAction, CombatState } from '../combat/state';

// §10.7.4 — replay architecture: seed + input log ⇒ identical combat. Used for golden-master tests,
// bug reports ("here is the exact fight") and the Unity ↔ web parity check.

export interface RecordedCombat {
  scenarioId: string;
  seed: number;
  actions: CombatAction[];
}

export interface ReplayResult {
  state: CombatState;
  rejectedAt: number | null;
}

export function replayCombat(record: RecordedCombat, scenario: ScenarioDef, ctx: CombatCtx): ReplayResult {
  let state = createCombat(scenario, ctx, record.seed);
  for (let i = 0; i < record.actions.length; i++) {
    const r = combatReducer(state, record.actions[i]!, ctx);
    if (r.rejected) return { state, rejectedAt: i };
    state = r.state;
  }
  return { state, rejectedAt: null };
}

/** Stable, human-readable digest of a state: enough to catch any rules drift, short enough to store. */
export function fingerprint(state: CombatState): string {
  const team = state.player.team.map((c) => `${c.speciesId}:${c.hp}/${c.maxHp}${c.status ? `:${c.status.kind}` : ''}${c.confusionTurns ? ':conf' : ''}`).join(',');
  const enemies = [...state.enemies, ...state.defeatedEnemies].map((e) => `${e.speciesId}:${e.hp}/${e.maxHp}`).join(',');
  return `t${state.turn} ${state.outcome} lead=${state.player.leadIndex} ap=${state.player.ap} team=[${team}] enemies=[${enemies}] events=${state.events.length} rng=${state.rngCursor}`;
}
