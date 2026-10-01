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

// The whole Gen I matrix, written out independently of TYPE_CHART (attacker rows, defender columns), so every one of
// the 225 cells is checked against the source rather than against the table it would be copied from. Gen I's own
// quirks are in it: Ghost does nothing to Psychic, Bug and Poison hit each other ×2, Ice is neutral on Fire.
describe('The Gen I type chart, cell by cell — §4.1.2', () => {
  const ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon'] as const;
  const GEN1: Record<(typeof ORDER)[number], string> = {
    normal:   '1 1 1 1 1 1 1 1 1 1 1 1 .5 0 1',
    fire:     '1 .5 .5 1 2 2 1 1 1 1 1 2 .5 1 .5',
    water:    '1 2 .5 1 .5 1 1 1 2 1 1 1 2 1 .5',
    electric: '1 1 2 .5 .5 1 1 1 0 2 1 1 1 1 .5',
    grass:    '1 .5 2 1 .5 1 1 .5 2 .5 1 .5 2 1 .5',
    ice:      '1 1 .5 1 2 .5 1 1 2 2 1 1 1 1 2',
    fighting: '2 1 1 1 1 2 1 .5 1 .5 .5 .5 2 0 1',
    poison:   '1 1 1 1 2 1 1 .5 .5 1 1 2 .5 .5 1',
    ground:   '1 2 1 2 .5 1 1 2 1 0 1 .5 2 1 1',
    flying:   '1 1 1 .5 2 1 2 1 1 1 1 2 .5 1 1',
    psychic:  '1 1 1 1 1 1 2 2 1 1 .5 1 1 1 1',
    bug:      '1 .5 1 1 2 1 .5 2 1 .5 2 1 1 .5 1',
    rock:     '1 2 1 1 1 2 .5 1 .5 2 1 2 1 1 1',
    ghost:    '0 1 1 1 1 1 1 1 1 1 0 1 1 2 1',
    dragon:   '1 1 1 1 1 1 1 1 1 1 1 1 1 1 2',
  };
  it('EveryAttackerAgainstEveryDefender_MatchesGenI', () => {
    for (const atk of ORDER) {
      const row = GEN1[atk].split(' ').map(Number);
      ORDER.forEach((def, i) => expect(typeMultiplierSingle(atk, def), `${atk} → ${def}`).toBe(row[i]));
    }
  });
  it('NormalHitsGroundNeutrally_ItIsRockThatResistsIt', () => {
    expect(typeMultiplier('normal', ['ground'])).toBe(1);
    expect(typeMultiplier('normal', ['rock', 'ground'])).toBe(0.5);
  });
});
