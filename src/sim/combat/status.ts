import type { PokemonType, PrimaryStatus, StatusCondition } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant } from './state';

// §4.2.4 — type/condition immunities (Steel is not in the Gen I chart).
const IMMUNITIES: Readonly<Partial<Record<PokemonType, readonly StatusCondition[]>>> = {
  fire: ['burn', 'freeze'],
  ice: ['freeze'],
  electric: ['paralysis'],
  poison: ['poison'],
};

export function isImmuneToStatus(types: readonly PokemonType[], status: StatusCondition): boolean {
  return types.some((t) => IMMUNITIES[t]?.includes(status) ?? false);
}

export function isPrimaryStatus(s: StatusCondition): s is PrimaryStatus {
  return s !== 'confusion';
}

/** §4.2.5 — duration in turns; null = permanent until cured. */
export function statusDuration(status: PrimaryStatus, config: BattleConfig): number | null {
  switch (status) {
    case 'burn':
    case 'poison':
      return null;
    case 'paralysis':
      return config.paralysisDuration;
    case 'sleep':
      return config.sleepDuration;
    case 'freeze':
      return config.freezeDuration;
  }
}

export type ApplyStatusResult = 'applied' | 'immune' | 'already' | 'fainted';

/**
 * §4.2.2.4 — Sleep and Freeze each take a turn away, so neither can land on a Pokémon that is already asleep or
 * frozen. Without this a 1-AP Sleep card a turn kept an enemy asleep for the whole fight (playtest, 2026-09-24).
 */
export function isSilenced(target: Combatant): boolean {
  return target.status?.kind === 'sleep' || target.status?.kind === 'freeze';
}

/**
 * §4.2.2 — applying a primary status replaces the existing one; §4.2.3.1 — Confusion coexists and re-application
 * resets its timer (§4.4.2: never stacks). Returns what happened so the caller can emit the right event.
 */
export function applyStatus(target: Combatant, status: StatusCondition, turn: number, config: BattleConfig, escalating = false): ApplyStatusResult {
  if (target.hp <= 0) return 'fainted';
  if (isImmuneToStatus(target.types, status)) return 'immune';
  if ((status === 'sleep' || status === 'freeze') && isSilenced(target)) return 'already';
  if (status === 'confusion') {
    target.confusionTurns = config.confusionDuration;
    target.confusionAppliedTurn = turn;
    return 'applied';
  }
  target.status = { kind: status, appliedTurn: turn, turnsLeft: statusDuration(status, config) };
  // §7.5 Toxic — the same Poison, but the tick doubles. Tracked on the instance so a cure clears it too.
  if (escalating) target.status.escalatingTicks = 0;
  return 'applied';
}

/** §4.2.7 — cure one status or everything (Full Heal). Returns the statuses removed. */
export function cureStatus(target: Combatant, which: StatusCondition | 'all'): StatusCondition[] {
  const removed: StatusCondition[] = [];
  if (which === 'all' || which === 'confusion') {
    if (target.confusionTurns > 0) {
      target.confusionTurns = 0;
      removed.push('confusion');
    }
  }
  if (which === 'all' || which !== 'confusion') {
    if (target.status && (which === 'all' || target.status.kind === which)) {
      removed.push(target.status.kind);
      target.status = null;
    }
  }
  return removed;
}

/** §4.2.2.4 / §4.2.2.5 — the Pokémon's own cards are unplayable while Asleep or Frozen. */
export function cardsLocked(c: Combatant): 'sleep' | 'freeze' | null {
  if (c.status?.kind === 'sleep') return 'sleep';
  if (c.status?.kind === 'freeze') return 'freeze';
  return null;
}

/** §4.2.2.5 — Freeze position-locks (no manual swap in/out, no Step-Backward destination). */
export function isPositionLocked(c: Combatant): boolean {
  return c.hp > 0 && c.status?.kind === 'freeze';
}

/** §4.2.2.3 — Paralysis adds +1 AP to that Pokémon's moves. */
export function paralysisApBonus(c: Combatant, config: BattleConfig): number {
  return c.status?.kind === 'paralysis' ? config.paralysisApCostBonus : 0;
}

/**
 * §3.10 / §4.2.2.1–2 — DoT = floor(EffectiveMaxHP / divisor), minimum 1.
 *
 * §7.5 Toxic escalates: the same base tick, doubled once per tick taken, capped at EffectiveMaxHP/8. The cap
 * matters — an uncapped doubling kills anything in five turns regardless of how big it is, which would make
 * one 1-AP utility card the strongest move in the game.
 */
export function dotDamage(c: Combatant, config: BattleConfig): number {
  if (c.status?.kind === 'burn') return Math.max(1, Math.floor(c.maxHp / config.burnDotDivisor));
  if (c.status?.kind !== 'poison') return 0;
  const base = Math.max(1, Math.floor(c.maxHp / config.poisonDotDivisor));
  const ticks = c.status.escalatingTicks;
  if (ticks === undefined) return base;
  return Math.min(Math.max(1, Math.floor(c.maxHp / 8)), base * 2 ** ticks);
}

/**
 * §4.2.1 G7 — a status applied in turn N starts acting in turn N+1: DoT ticks and duration countdown only
 * happen at the end of a Resolution whose turn is later than the application turn.
 */
export function statusActiveThisTurn(s: { appliedTurn: number }, turn: number): boolean {
  return turn > s.appliedTurn;
}
