import type { SlotId } from '../types';
import type { Combatant, CombatState } from './state';

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

export function activeEnemy(state: CombatState) {
  return state.enemies.find((e) => e.hp > 0) ?? null;
}

export function findCombatant(state: CombatState, uid: string): Combatant | null {
  return state.player.team.find((c) => c.uid === uid) ?? state.enemies.find((e) => e.uid === uid) ?? null;
}

export const SLOT_LABEL: Record<SlotId, string> = { lead: 'Lead', bench1: 'Bench 1', bench2: 'Bench 2' };
