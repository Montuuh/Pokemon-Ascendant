import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from './battleConfig';
import { clampStage, stageMultiplier } from './statStages';

// Per §4.2.6 (CL-002) — linear ±6 ladder 0.4 … 1.6.
describe('statStages', () => {
  it('stageMultiplier_Endpoints_MatchLadder', () => {
    expect(stageMultiplier(-6, DEFAULT_BATTLE_CONFIG)).toBe(0.4);
    expect(stageMultiplier(0, DEFAULT_BATTLE_CONFIG)).toBe(1.0);
    expect(stageMultiplier(6, DEFAULT_BATTLE_CONFIG)).toBe(1.6);
  });

  it('stageMultiplier_OutOfRange_Clamps', () => {
    expect(clampStage(9)).toBe(6);
    expect(clampStage(-9)).toBe(-6);
    expect(stageMultiplier(9, DEFAULT_BATTLE_CONFIG)).toBe(1.6);
  });

  it('stageMultiplier_IsLinear', () => {
    for (let s = -6; s < 6; s++) {
      const a = stageMultiplier(s, DEFAULT_BATTLE_CONFIG);
      const b = stageMultiplier(s + 1, DEFAULT_BATTLE_CONFIG);
      expect(b - a).toBeCloseTo(0.1, 10);
    }
  });
});
