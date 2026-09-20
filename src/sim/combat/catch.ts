import type { ConsumableEffect } from '../content/defs';
import type { Combatant } from './state';
import { hpFraction } from './stats';

// §2.6.4.1 (CL-014) — deterministic Catchability gauge. No roll, ever.

export interface CatchGauge {
  /** HP% threshold at or below which the catch succeeds. */
  thresholdPercent: number;
  /** 0–100; 100 = READY. */
  gauge: number;
  ready: boolean;
  hasStatus: boolean;
}

export function catchGauge(wild: Combatant, effect: Extract<ConsumableEffect, { kind: 'catch' }>): CatchGauge {
  const hasStatus = wild.status !== null || wild.confusionTurns > 0;
  const thresholdPercent = effect.thresholdPercent + (hasStatus ? effect.statusBonusPercent : 0);
  const hpPercent = hpFraction(wild) * 100;
  if (wild.hp <= 0) return { thresholdPercent, gauge: 0, ready: false, hasStatus };
  const gauge = Math.max(0, Math.min(100, Math.round((100 * (100 - hpPercent)) / (100 - thresholdPercent))));
  return { thresholdPercent, gauge, ready: gauge >= 100, hasStatus };
}
