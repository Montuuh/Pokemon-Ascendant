import type { ConsumableEffect, ContentRegistry } from '../content/defs';
import type { Combatant } from './state';
import { hpFraction } from './stats';

// §2.6.4 — the catch chance. A real roll since 2026-09-21, and a *telegraphed* one: the exact number is on the
// ball card and on the gauge before the throw, the roll is the run's seeded RNG, and nothing about *how much*
// you are risking is hidden. What the player decides is whether to throw now or weaken it first; what the dice
// decide is only whether this throw was the one.
//
//   p = catchRate(species) × (1 − 0.9·HP%)^1.7 × status × ball,  clamped to [1 %, 90 %]
//
// A Rattata at full HP with a Poké Ball is ~2 %; at half HP 33 %; at a quarter 58 %; asleep at a quarter 87 %.
// A Snorlax at full HP is the floor. Numbers live in BattleConfig-style constants below so a tuning pass edits
// one place; the per-species rate is content (§2.6.4.1).

export const CATCH = {
  /** The share of HP that matters: at full HP the base is (1 − 0.9) = 0.1 before the exponent. */
  hpWeight: 0.9,
  /** Curve steepness. Higher = the early damage counts for less, the last quarter for more. */
  exponent: 1.7,
  /** Multipliers for a target that cannot act: Sleep or Freeze. */
  hardStatus: 1.5,
  /** Any other condition, or Confusion. */
  softStatus: 1.2,
  floor: 0.01,
  cap: 0.9,
  /** §2.6.4.1 — default catch rate (the chance at ~0 HP) by rarity and stage when the species row sets none. */
  byRarity: { common: 0.9, uncommon: 0.7, rare: 0.5, legendary: 0.2 } as Record<string, number>,
  byStage: { basic: 1, stage1: 0.65, stage2: 0.4 } as Record<string, number>,
} as const;

export interface CatchOdds {
  /** The final probability, 0.01–0.9 (1 when a guaranteed catch is armed). */
  chance: number;
  /** The species' own ceiling, before HP and status. */
  catchRate: number;
  hpFactor: number;
  statusMult: number;
  ballMult: number;
  hasStatus: boolean;
  /** §8.6.1 Master Ball Charm — this throw cannot miss. */
  guaranteed: boolean;
}

/** §2.6.4.1 — the species' catch rate: its row's, or the rarity × stage default. */
export function catchRateOf(speciesId: string, content: ContentRegistry): number {
  const s = content.species(speciesId);
  if (typeof s.catchRate === 'number') return s.catchRate;
  return (CATCH.byRarity[s.rarity] ?? 0.5) * (CATCH.byStage[s.stage] ?? 1);
}

export function catchOdds(wild: Combatant, effect: Extract<ConsumableEffect, { kind: 'catch' }>, content: ContentRegistry, guaranteed = false): CatchOdds {
  const hard = wild.status?.kind === 'sleep' || wild.status?.kind === 'freeze';
  const hasStatus = wild.status !== null || wild.confusionTurns > 0;
  const statusMult = hard ? CATCH.hardStatus : hasStatus ? CATCH.softStatus : 1;
  const ballMult = effect.ballMultiplier;
  const catchRate = catchRateOf(wild.speciesId, content);
  const hpFactor = wild.hp <= 0 ? 0 : Math.pow(1 - CATCH.hpWeight * hpFraction(wild), CATCH.exponent);
  const raw = catchRate * hpFactor * statusMult * ballMult;
  const chance = guaranteed ? 1 : wild.hp <= 0 ? 0 : Math.min(CATCH.cap, Math.max(CATCH.floor, raw));
  return { chance, catchRate, hpFactor, statusMult, ballMult, hasStatus, guaranteed };
}

/** The number the UI prints: whole percent, never 0 for a live target. */
export const catchPercent = (odds: CatchOdds): number => Math.max(odds.chance > 0 ? 1 : 0, Math.round(odds.chance * 100));
