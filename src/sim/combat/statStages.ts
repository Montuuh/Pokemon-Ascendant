import type { BattleConfig } from './battleConfig';

export const MIN_STAGE = -6;
export const MAX_STAGE = 6;

/** Clamp a stat stage into the ±6 ladder (§4.2.6). */
export function clampStage(stage: number): number {
  return Math.max(MIN_STAGE, Math.min(MAX_STAGE, Math.trunc(stage)));
}

/**
 * Per §4.2.6 (CL-002) — linear ladder 0.4 … 1.0 … 1.6, ±0.1 per stage.
 * Stages reset at combat end and multiply BEFORE status multipliers (stage then status).
 */
export function stageMultiplier(stage: number, config: BattleConfig): number {
  const idx = clampStage(stage) - MIN_STAGE;
  const m = config.statStageMultipliers[idx];
  if (m === undefined) {
    throw new Error(`statStageMultipliers must have 13 entries (got ${config.statStageMultipliers.length})`);
  }
  return m;
}
