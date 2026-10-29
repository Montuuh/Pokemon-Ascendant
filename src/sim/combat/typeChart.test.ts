import { describe, expect, it } from 'vitest';
import { POKEMON_TYPES } from '../types';
import { isImmuneToStatus } from './status';
import { TYPE_CHART, effectivenessLabel, typeMultiplier, typeMultiplierSingle } from './typeChart';

// Per §4.1.2 — Gen II type chart across the 17 types (Dark and Steel since v0.9.84).
describe('TypeChart', () => {
  it('typeMultiplier_GroundVsWaterRock_ReturnsDouble', () => {
    // Spec prose says 0.5×; the Gen I matrix (canon) gives 1 × 2 = 2. Unity-era OPEN G6.
    expect(typeMultiplier('ground', ['water', 'rock'])).toBe(2);
  });

  it('typeMultiplier_GenIIRebalance_Applied', () => {
    expect(typeMultiplierSingle('ghost', 'psychic')).toBe(2);
    expect(typeMultiplierSingle('bug', 'poison')).toBe(0.5);
    expect(typeMultiplierSingle('poison', 'bug')).toBe(1);
    expect(typeMultiplierSingle('ice', 'fire')).toBe(0.5);
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

// The whole Gen II matrix for the 17 types, written out independently of TYPE_CHART (attacker rows, defender columns), so every one of
// the 289 cells is checked against the source rather than against the table it would be copied from. Gen II rebalances:
// Ghost hits Psychic ×2, Bug and Poison hit each other ×0.5 and ×1, Fire resists Ice at ×0.5; and its two new types — Dark
// (hits Ghost and Psychic, immune to Psychic) and Steel (hits Ice and Rock, resists nearly everything, immune to Poison).
describe('The Gen II type chart (17 types), cell by cell — §4.1.2', () => {
  const ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel'] as const;
  const GEN2: Record<(typeof ORDER)[number], string> = {
    normal:   '1 1 1 1 1 1 1 1 1 1 1 1 .5 0 1 1 .5',
    fire:     '1 .5 .5 1 2 2 1 1 1 1 1 2 .5 1 .5 1 2',
    water:    '1 2 .5 1 .5 1 1 1 2 1 1 1 2 1 .5 1 1',
    electric: '1 1 2 .5 .5 1 1 1 0 2 1 1 1 1 .5 1 1',
    grass:    '1 .5 2 1 .5 1 1 .5 2 .5 1 .5 2 1 .5 1 .5',
    ice:      '1 .5 .5 1 2 .5 1 1 2 2 1 1 1 1 2 1 .5',
    fighting: '2 1 1 1 1 2 1 .5 1 .5 .5 .5 2 0 1 2 2',
    poison:   '1 1 1 1 2 1 1 .5 .5 1 1 1 .5 .5 1 1 0',
    ground:   '1 2 1 2 .5 1 1 2 1 0 1 .5 2 1 1 1 2',
    flying:   '1 1 1 .5 2 1 2 1 1 1 1 2 .5 1 1 1 .5',
    psychic:  '1 1 1 1 1 1 2 2 1 1 .5 1 1 1 1 0 .5',
    bug:      '1 .5 1 1 2 1 .5 .5 1 .5 2 1 1 .5 1 2 .5',
    rock:     '1 2 1 1 1 2 .5 1 .5 2 1 2 1 1 1 1 .5',
    ghost:    '0 1 1 1 1 1 1 1 1 1 2 1 1 2 1 .5 .5',
    dragon:   '1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 1 .5',
    dark:     '1 1 1 1 1 1 .5 1 1 1 2 1 1 2 1 .5 .5',
    steel:    '1 .5 .5 .5 1 2 1 1 1 1 1 1 2 1 1 1 .5',
  };
  it('EveryAttackerAgainstEveryDefender_MatchesGenII', () => {
    expect([...ORDER].sort()).toEqual([...POKEMON_TYPES].sort());
    for (const atk of ORDER) {
      const row = GEN2[atk].split(' ').map(Number);
      expect(row, atk).toHaveLength(ORDER.length);
      ORDER.forEach((def, i) => expect(typeMultiplierSingle(atk, def), `${atk} → ${def}`).toBe(row[i]));
    }
  });
  it('NormalHitsGroundNeutrally_ItIsRockThatResistsIt', () => {
    expect(typeMultiplier('normal', ['rock', 'ground'])).toBe(0.5);
    expect(typeMultiplier('normal', ['ground'])).toBe(1);
  });
  it('DarkAndSteel_TheDualTypesTheRosterCarries_v0.9.84', () => {
    // Magneton and Magnezone (Electric/Steel): Ground, Fire and Fighting are the answers, and Fire and Fighting hit it ×2 only
    // through Steel while Ground's ×2 stacks with Electric's immunity to nothing — Ground is the clean answer.
    expect(typeMultiplier('ground', ['electric', 'steel'])).toBe(4);
    expect(typeMultiplier('fire', ['electric', 'steel'])).toBe(2);
    expect(typeMultiplier('poison', ['electric', 'steel'])).toBe(0);
    // Scizor (Bug/Steel): Fire is the ×4, and its two types resist Grass, Bug and Fighting between them.
    expect(typeMultiplier('fire', ['bug', 'steel'])).toBe(4);
    expect(typeMultiplier('grass', ['bug', 'steel'])).toBe(0.25);
    // Steelix (Steel/Ground): Water, Fighting and Ground hit it, and Electric cannot touch it.
    expect(typeMultiplier('water', ['steel', 'ground'])).toBe(2);
    expect(typeMultiplier('electric', ['steel', 'ground'])).toBe(0);
    // Umbreon (Dark): Psychic cannot touch it, Fighting and Bug can.
    expect(typeMultiplier('psychic', ['dark'])).toBe(0);
    expect(typeMultiplier('fighting', ['dark'])).toBe(2);
    expect(typeMultiplier('bug', ['dark'])).toBe(2);
  });
  it('SteelIsImmuneToPoison_AndToItsStatus_DarkIsNotImmuneToAnything_§4.2.4', () => {
    expect(isImmuneToStatus(['steel'], 'poison')).toBe(true);
    expect(isImmuneToStatus(['bug', 'steel'], 'poison')).toBe(true);
    expect(isImmuneToStatus(['steel'], 'burn')).toBe(false);
    for (const status of ['burn', 'poison', 'paralysis', 'sleep', 'freeze', 'confusion'] as const) expect(isImmuneToStatus(['dark'], status), status).toBe(false);
  });
});
