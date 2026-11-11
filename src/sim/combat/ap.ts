import { log } from './context';
import type { CombatState } from './state';

export interface ApSource { source: string; amount: number; free?: boolean }

/** §3.8 — every committed AP balance change has one source, an actual delta and an honest cap. */
export function changeAp(state: CombatState, amount: number, source: string, cap = Infinity): void {
  const before = state.player.ap;
  const after = Math.max(0, Math.min(cap, before + amount));
  state.player.ap = after;
  const actual = after - before;
  const limited = amount > actual ? `; ${amount - actual} blocked by the ${cap} AP cap` : '';
  log(state, 'ap', `AP ${actual >= 0 ? '+' : '−'}${Math.abs(actual)} — ${source} (${before} → ${after}${limited}).`);
  state.log[state.log.length - 1]!.ap = { kind: 'balance', source, requested: amount, before, after };
}

/** §7.3 / §3.8 — a promised next-turn credit is not AP spendable in the present turn. */
export function bankAp(state: CombatState, entries: readonly ApSource[]): void {
  state.player.bankedApSources ??= state.player.bankedAp ? [{ source: 'Previously stored AP', amount: state.player.bankedAp }] : [];
  for (const entry of entries) {
    const before = state.player.bankedAp;
    state.player.bankedAp += entry.amount;
    (state.player.bankedApSources ??= []).push(entry);
    log(state, 'ap', `Next turn: +${entry.amount} AP (${entry.source}).`);
    state.log[state.log.length - 1]!.ap = { kind: 'bank', source: entry.source, requested: entry.amount, before, after: state.player.bankedAp };
  }
}
