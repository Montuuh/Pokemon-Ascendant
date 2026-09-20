import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { BattleConfig } from './battleConfig';
import type { CombatEvent, CombatState, EnemyCombatant, LogCategory } from './state';

/** What every reducer receives besides the state. Content and config are immutable. */
export interface CombatCtx {
  content: ContentRegistry;
  config: BattleConfig;
}

/** Internal per-action context: adds the RNG built from the state's cursor and a late-bound intent declarer
 *  (so the damage pipeline can telegraph a freshly-entered enemy without importing the AI module). */
export interface RunCtx extends CombatCtx {
  rng: GameRng;
  declareIntentFor?: (state: CombatState, enemy: EnemyCombatant) => void;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type EventBody = DistributiveOmit<CombatEvent, 'seq' | 'turn'>;

export function emit(state: CombatState, body: EventBody): void {
  state.events.push({ ...body, seq: state.nextSeq++, turn: state.turn } as CombatEvent);
}

export function log(state: CombatState, category: LogCategory, text: string): void {
  state.log.push({ turn: state.turn, category, text });
}
