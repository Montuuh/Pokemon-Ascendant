import { describe, expect, it } from 'vitest';
import { POKEMON_TYPES } from '../types';
import { TYPE_CHART, effectivenessLabel, typeMultiplier, typeMultiplierSingle } from './typeChart';

// Per §4.1.2 — Gen I type chart.
describe('TypeChart', () => {
  it('typeMultiplier_GroundVsWaterRock_ReturnsDouble', () => {
    // Spec prose says 0.5×; the Gen I matrix (canon) gives 1 × 2 = 2. Unity-era OPEN G6.
    expect(typeMultiplier('ground', ['water', 'rock'])).toBe(2);
  });

  it('typeMultiplier_GenIQuirks_Preserved', () => {
    expect(typeMultiplierSingle('ghost', 'psychic')).toBe(0);
    expect(typeMultiplierSingle('bug', 'poison')).toBe(2);
    expect(typeMultiplierSingle('poison', 'bug')).toBe(2);
  });

  it('typeMultiplier_Immunities_ReturnZeroEvenWhenOtherTypeIsWeak', () => {
    expect(typeMultiplier('electric', ['ground', 'water'])).toBe(0);
    expect(typeMultiplier('ground', ['flying', 'fire'])).toBe(0);
    expect(typeMultiplier('normal', ['ghost'])).toBe(0);
    expect(typeMultiplier('fighting', ['ghost'])).toBe(0);
  });

  it('typeMultiplier_DualWeakness_ReturnsQuad', () => {
    expect(typeMultiplier('fire', ['grass', 'ice'])).toBe(4);
    expect(typeMultiplier('rock', ['fire', 'flying'])).toBe(4);
  });

  it('typeMultiplier_DualResist_ReturnsQuarter', () => {
    expect(typeMultiplier('fire', ['water', 'rock'])).toBe(0.25);
  });

  it('typeMultiplier_NoDefenderTypes_ReturnsNeutral', () => {
    expect(typeMultiplier('fire', [])).toBe(1);
  });

  it('TYPE_CHART_OnlyContainsCanonicalMultipliers', () => {
    const allowed = new Set([0, 0.5, 2]);
    for (const atk of POKEMON_TYPES) {
      for (const [def, m] of Object.entries(TYPE_CHART[atk])) {
        expect(allowed.has(m), `${atk}->${def}=${m}`).toBe(true);
        expect(POKEMON_TYPES.includes(def as (typeof POKEMON_TYPES)[number])).toBe(true);
      }
    }
  });

  it('effectivenessLabel_BucketsMultipliers', () => {
    expect(effectivenessLabel(0)).toBe('immune');
    expect(effectivenessLabel(0.25)).toBe('quarter');
    expect(effectivenessLabel(0.5)).toBe('half');
    expect(effectivenessLabel(1)).toBe('neutral');
    expect(effectivenessLabel(2)).toBe('double');
    expect(effectivenessLabel(4)).toBe('quad');
  });
});
