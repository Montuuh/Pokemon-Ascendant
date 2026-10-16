import type { BattleConfig } from './battleConfig';
import type { FieldId } from './fields';
import { turnsUntil } from './gymRules';
import type { Combatant, CombatState, EnemyCombatant } from './state';
import type { MoveDef } from '../content/defs';
import type { PokemonType, StatusCondition } from '../types';

// §2.12.2.1 — a Legendary's arena rule: the Legendary's answer to §5.9.5's Leader rules, one each, for the whole
// fight, shown before it. This file is the pure half — what a rule says about a number, a stage, a status, a move's
// reach; the half that acts at a turn's edge (Metronome's next field) lives in `ruleTurn.ts`, and Rekindle's rise in
// the damage flow, which owns healing. A rule is the Legendary's: it never helps the player.

export const ARENA_RULE_IDS = ['mist', 'thundercloud', 'rekindle', 'barrier', 'playful'] as const;
export type ArenaRuleId = (typeof ARENA_RULE_IDS)[number];

/** §2.12.2.1 — the rules' numbers. Data, not literals in the rules. */
export interface ArenaRuleConfig {
  /** Rekindle — the share of Max HP it rises at, the first time it falls to it, and the share it rises by. */
  rekindleAt: number;
  rekindleHeal: number;
  /** Barrier — every Nth turn it takes this share of all damage. */
  barrierEvery: number;
  barrierTaken: number;
}

/** §2.12.2.1 — Metronome's draw: every Battlefield the game has (§4.3), one a turn. */
export const METRONOME_FIELDS: readonly FieldId[] = [
  'sunny-day', 'rain-dance', 'hail',
  'electric-terrain', 'grassy-terrain', 'psychic-terrain', 'misty-terrain',
  'sandstorm', 'toxic-spikes', 'sticky-web',
];

export const arenaRuleOf = (state: Pick<CombatState, 'arenaRule'>): ArenaRuleId | null => state.arenaRule ?? null;

/** The Legendary: an arena fight has one enemy, and the rule is its. */
const isLegendary = (state: CombatState, c: Combatant): c is EnemyCombatant => !!state.arenaRule && state.enemies.some((e) => e.uid === c.uid);

/** §2.12.2.1 Barrier — is the Barrier up this turn? Every Nth turn, counted as the Leaders' timed rules are. */
export function barrierUp(state: CombatState, config: BattleConfig): boolean {
  return arenaRuleOf(state) === 'barrier' && turnsUntil(state, config.arenaRules.barrierEvery) === 1;
}

/** §2.12.2.1 Barrier — the term in the damage formula: what the Legendary takes while its Barrier is up. */
export function arenaDamageMultiplier(state: CombatState, target: Combatant, config: BattleConfig): number {
  return barrierUp(state, config) && isLegendary(state, target) ? config.arenaRules.barrierTaken : 1;
}

/** §2.12.2.1 Mist — the Legendary's stats cannot be lowered. */
export function arenaBlocksStage(state: CombatState, target: Combatant, delta: number): boolean {
  return arenaRuleOf(state) === 'mist' && delta < 0 && isLegendary(state, target);
}

/** §2.12.2.1 Mist — and it is never Frozen. */
export function arenaBlocksStatus(state: CombatState, target: Combatant, status: StatusCondition): boolean {
  return arenaRuleOf(state) === 'mist' && status === 'freeze' && isLegendary(state, target);
}

/** §2.12.2.1 Thundercloud — from Phase 2 the sky opens: the Legendary's Thunder reaches the whole team. */
export function arenaCleaves(state: CombatState, enemy: EnemyCombatant, move: MoveDef): boolean {
  return arenaRuleOf(state) === 'thundercloud' && enemy.phase >= 2 && move.id === 'thunder';
}

/**
 * §2.12.2.1 Rekindle — does this hit make it rise? The first time the Legendary stands at or under its share of Max
 * HP, once a fight. The caller (`dealDamage`) heals it and clears its status.
 */
export function rekindles(state: CombatState, target: Combatant, config: BattleConfig): boolean {
  if (arenaRuleOf(state) !== 'rekindle' || state.ruleState?.rekindled || !isLegendary(state, target)) return false;
  return target.hp > 0 && target.hp <= Math.floor(target.maxHp * config.arenaRules.rekindleAt);
}

/**
 * §2.12.2.1 Playful — a damaging move that landed on the Legendary makes it that move's type, alone: its STAB and its
 * weaknesses follow. Returns the type it took, or null when nothing changed.
 */
export function playfulTakes(state: CombatState, target: Combatant, move: MoveDef, dealt: number): PokemonType | null {
  if (arenaRuleOf(state) !== 'playful' || dealt <= 0 || move.power <= 0 || target.hp <= 0 || !isLegendary(state, target)) return null;
  if (target.types.length === 1 && target.types[0] === move.type) return null;
  target.types = [move.type];
  return move.type;
}

/**
 * §2.12.2.1 — what an arena rule shows on its chip right now: the turns until the Barrier (1 = up this turn), whether
 * Rekindle is still to come, the type Playful has taken, the field Metronome draws next.
 */
export type ArenaCounter =
  | { kind: 'turns'; turns: number }
  | { kind: 'rekindle'; spent: boolean }
  | { kind: 'type'; type: PokemonType }
  | null;
export function arenaCounter(state: CombatState, config: BattleConfig): ArenaCounter {
  switch (arenaRuleOf(state)) {
    case 'barrier':
      return { kind: 'turns', turns: turnsUntil(state, config.arenaRules.barrierEvery) };
    case 'rekindle':
      return { kind: 'rekindle', spent: !!state.ruleState?.rekindled };
    case 'playful': {
      const legendary = state.enemies[0];
      return legendary?.types.length ? { kind: 'type', type: legendary.types[0]! } : null;
    }
    default:
      return null;
  }
}

/** §2.12.2.1 Metronome — the field it draws next, shown a turn ahead; null when the arena has no Metronome. */
export const metronomeNext = (state: CombatState): FieldId | null => state.ruleState?.metronomeNext ?? null;
