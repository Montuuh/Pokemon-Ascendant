import type { SlotId } from '../types';
import type { Combatant, CombatState, EnemyCombatant } from './state';

// §3.3 / §5.2 — slots are positions. `lead` is the Lead; `bench1`/`bench2` are the remaining team members in
// array order. A manual swap moves Pokémon between slots; the slots themselves never move.

export function slotToIndex(state: CombatState, slot: SlotId): number | null {
  const { team, leadIndex } = state.player;
  if (slot === 'lead') return leadIndex < team.length ? leadIndex : null;
  const benches = team.map((_, i) => i).filter((i) => i !== leadIndex);
  const idx = slot === 'bench1' ? benches[0] : benches[1];
  return idx ?? null;
}

export function indexToSlot(state: CombatState, index: number): SlotId {
  const { leadIndex, team } = state.player;
  if (index === leadIndex) return 'lead';
  const benches = team.map((_, i) => i).filter((i) => i !== leadIndex);
  return benches[0] === index ? 'bench1' : 'bench2';
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
  return state.player.team.map((_, i) => i).filter((i) => i !== state.player.leadIndex);
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
