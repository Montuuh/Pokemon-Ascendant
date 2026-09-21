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
  tallyEvent(state, body);
}

/**
 * §8.6.1 — the discovery tallies that are simplest to read off the event stream. Counting here, at the one
 * place every happening passes through, means a new damage or status site cannot forget to count.
 */
function tallyEvent(state: CombatState, e: EventBody): void {
  const t = state.player.tally;
  const mine = (uid: string | null | undefined) => !!uid && state.player.team.some((c) => c.uid === uid);
  const species = (uid: string | null | undefined) => state.player.team.find((c) => c.uid === uid)?.speciesId;
  const add = (rec: Record<string, number>, key: string | undefined, by: number) => { if (key) rec[key] = (rec[key] ?? 0) + by; };
  switch (e.t) {
    case 'damage':
      if (e.crit && e.cause === 'move' && mine(e.sourceUid)) t.crits += 1;
      // §8.9 — the record: damage your species dealt to the enemy, and the blow that finished one. A status
      // tick has no source and credits nobody, the same rule Champion's Crest uses (§7.3.5).
      if (mine(e.sourceUid) && !mine(e.targetUid)) {
        add(t.damageBy, species(e.sourceUid), e.amount);
        if (e.hpAfter === 0) add(t.koBy, species(e.sourceUid), 1);
      }
      break;
    case 'faint':
      if (e.side === 'player') add(t.faintsOf, species(e.uid), 1);
      break;
    case 'status-applied':
      if (mine(e.targetUid)) t.statusesTaken += 1;
      else if (!t.statusesApplied.includes(e.status)) t.statusesApplied.push(e.status);
      break;
    case 'status-cleared':
      if (e.cause === 'cured' && mine(e.targetUid)) t.statusesCured += 1;
      break;
  }
}

export function log(state: CombatState, category: LogCategory, text: string): void {
  state.log.push({ turn: state.turn, category, text });
}
