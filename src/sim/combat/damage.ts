import type { MoveRange, PokemonType } from '../types';
import type { BattleConfig } from './battleConfig';
import { typeMultiplier } from './typeChart';

// Per docs/design/04-resolution.md §4.1.1 — pure damage resolver. No RNG inside: crit is a resolved input.
//
//   base     = Power × (EffAtk / EffDef) × Range / Divisor
//   postCrit = base × Crit
//   final    = floor( postCrit × STAB × TypeEff )
//
// Ordering is presentational (single floor at the end makes it commutative). No min-damage clamp:
// only immunity (TypeEff = 0) yields 0. EffAtk/EffDef arrive already stage- and status-adjusted (§4.2.6).

export interface DamageInputs {
  power: number;
  /** Effective attack of the attacker (stages + status already applied). */
  attack: number;
  /** Effective defense of the target (stages + status already applied). Clamped to ≥ 1. */
  defense: number;
  range: MoveRange;
  moveType: PokemonType;
  attackerTypes: readonly PokemonType[];
  defenderTypes: readonly PokemonType[];
  /** Resolved crit roll from the crit system (§4.1.3). */
  crit: boolean;
  /** §4.1.3 — AlwaysCrit cards force a crit regardless of the roll. */
  alwaysCrit?: boolean;
}

export interface DamageBreakdown {
  power: number;
  attack: number;
  defense: number;
  base: number;
  critMultiplier: number;
  stabMultiplier: number;
  typeMultiplier: number;
  rangeMultiplier: number;
  final: number;
  isCrit: boolean;
  hasStab: boolean;
}

/** Per §4.1.2 — STAB applies if the move type matches either of the attacker's types. */
export function hasStab(attackerTypes: readonly PokemonType[], moveType: PokemonType): boolean {
  return attackerTypes.includes(moveType);
}

export function computeDamage(inp: DamageInputs, config: BattleConfig): DamageBreakdown {
  const defense = Math.max(1, inp.defense);
  const rangeMultiplier = inp.range === 'ranged' ? config.rangedModifier : config.meleeModifier;
  const isCrit = inp.crit || inp.alwaysCrit === true;
  const critMultiplier = isCrit ? config.critMultiplier : 1;
  const stab = hasStab(inp.attackerTypes, inp.moveType);
  const stabMultiplier = stab ? config.stabMultiplier : 1;
  const typeMult = typeMultiplier(inp.moveType, inp.defenderTypes);
  const divisor = Math.max(1, config.divisor);

  const base = (((inp.power * inp.attack) / defense) * rangeMultiplier) / divisor;
  const postCrit = base * critMultiplier;
  const scaled = postCrit * stabMultiplier * typeMult;
  const final = Math.floor(scaled);

  return {
    power: inp.power,
    attack: inp.attack,
    defense,
    base,
    critMultiplier,
    stabMultiplier,
    typeMultiplier: typeMult,
    rangeMultiplier,
    final,
    isCrit,
    hasStab: stab,
  };
}

/** Hover / drag damage preview (§9.2.4) — identical calculation, identical output. */
export const previewDamage = computeDamage;
