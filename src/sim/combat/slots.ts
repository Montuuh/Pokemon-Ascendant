import type { SlotId } from '../types';
import type { Combatant, CombatState, EnemyCombatant } from './state';

// §3.3 / §5.2 — slots are positions. `lead` is the Lead; `bench1`/`bench2` are the other two, in the order the
// fight keeps (`player.order`). A swap trades two Pokémon's places and nothing else: the Lead stepping down takes
// the very place of the Pokémon stepping up, and the third never moves (v0.9.10 — slots read off array order had the
// old Lead land on bench 1 whichever bench came up, and the other bench slide down to make room).

/** The team's indices by place: the Lead, bench 1, bench 2. */
export function slotOrder(state: Pick<CombatState, 'player'>): number[] {
  const { team, leadIndex, order } = state.player;
  if (order && order[0] === leadIndex && order.length === team.length) return order;
  return [leadIndex, ...team.map((_, i) => i).filter((i) => i !== leadIndex)];
}

/** §3.3 — put `index` in the Lead, trading places with the Lead it replaces. */
export function setLead(state: Pick<CombatState, 'player'>, index: number): void {
  const order = [...slotOrder(state)];
  const at = order.indexOf(index);
  if (at > 0) [order[0], order[at]] = [order[at]!, order[0]!];
  state.player.order = order;
  state.player.leadIndex = index;
}

export function slotToIndex(state: CombatState, slot: SlotId): number | null {
  const order = slotOrder(state);
  const idx = slot === 'lead' ? order[0] : slot === 'bench1' ? order[1] : order[2];
  return idx !== undefined && idx < state.player.team.length ? idx : null;
}

export function indexToSlot(state: CombatState, index: number): SlotId {
  const at = slotOrder(state).indexOf(index);
  return at === 0 ? 'lead' : at === 1 ? 'bench1' : 'bench2';
}

/** Occupant of a slot, or null if the slot is empty or its occupant has fainted (§5.4.1). */
export function slotOccupant(state: CombatState, slot: SlotId): Combatant | null {
  const idx = slotToIndex(state, slot);
  if (idx === null) return null;
  const c = state.player.team[idx];
  return c && c.hp > 0 ? c : null;
}

export function lead(state: CombatState): Combatant | null {
  return state.player.team[state.player.leadIndex] ?? null;
}

export function benchIndices(state: CombatState): number[] {
  return slotOrder(state).slice(1);
}

export function aliveTeam(state: CombatState): Combatant[] {
  return state.player.team.filter((c) => c.hp > 0);
}

/** §5.6 — the enemy Lead: the first living enemy on the field (index 0 once a faint has promoted a support). */
export function activeEnemy(state: CombatState) {
  return state.enemies.find((e) => e.hp > 0) ?? null;
}

/** §5.6 — the living enemies on the field, in slot order (Lead first). */
export function aliveEnemies(state: CombatState): EnemyCombatant[] {
  return state.enemies.filter((e) => e.hp > 0);
}

/** §5.6 — true for the enemy Lead; a support is any other enemy on the field. */
export function isEnemyLead(state: CombatState, enemy: EnemyCombatant): boolean {
  return activeEnemy(state)?.uid === enemy.uid;
}

/** §5.6 / §3.2.5 — the order intents resolve in: supports first in slot order, the enemy Lead last. */
export function resolutionOrder(state: CombatState): EnemyCombatant[] {
  const [first, ...rest] = state.enemies;
  return first ? [...rest, first] : [];
}

/** §5.6 — what the player reads on an enemy's place: the Lead, or a Support (the sprites show the order). */
export function enemySlotLabel(state: CombatState, enemy: EnemyCombatant): string {
  const i = state.enemies.findIndex((e) => e.uid === enemy.uid);
  return i <= 0 ? 'Lead' : 'Support';
}

export function findCombatant(state: CombatState, uid: string): Combatant | null {
  return state.player.team.find((c) => c.uid === uid) ?? state.enemies.find((e) => e.uid === uid) ?? null;
}

export const SLOT_LABEL: Record<SlotId, string> = { lead: 'Lead', bench1: 'Bench 1', bench2: 'Bench 2' };
