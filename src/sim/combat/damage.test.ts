import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from './battleConfig';
import { computeDamage, type DamageInputs } from './damage';

// Per §4.1.1 — floor( Power × (Atk/Def) × Range × Crit × STAB × TypeEff / Divisor ), divisor 8 (Unity-tuned).
const base: DamageInputs = {
  power: 40,
  attack: 50,
  defense: 50,
  range: 'melee',
  moveType: 'normal',
  attackerTypes: ['normal'],
  defenderTypes: ['normal'],
  crit: false,
};

describe('computeDamage', () => {
  it('computeDamage_NeutralMeleeStab_MatchesFormula', () => {
    // 40 × 1 × 1 / 8 = 5 → ×1.5 STAB = 7.5 → floor 7
    const r = computeDamage(base, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(7);
    expect(r.hasStab).toBe(true);
    expect(r.isCrit).toBe(false);
  });

  it('computeDamage_HighPowerRanged_AppliesRangeModifier', () => {
    // 90 × (80/40) × 0.75 / 8 = 16.875 → no STAB (grass move, fire attacker) → ×2 vs water = 33.75 → 33
    const r = computeDamage(
      {
        ...base,
        power: 90,
        attack: 80,
        defense: 40,
        range: 'ranged',
        moveType: 'grass',
        attackerTypes: ['fire'],
        defenderTypes: ['water'],
      },
      DEFAULT_BATTLE_CONFIG,
    );
    expect(r.rangeMultiplier).toBe(0.75);
    expect(r.typeMultiplier).toBe(2);
    expect(r.final).toBe(33);
  });

  it('computeDamage_Immunity_ReturnsZero', () => {
    const r = computeDamage({ ...base, power: 200, moveType: 'normal', defenderTypes: ['ghost'] }, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(0);
  });

  it('computeDamage_CritAndAlwaysCrit_ApplyMultiplierOnce', () => {
    const inputs = { ...base, power: 100, attack: 100, defense: 50 }; // 100×2/8 = 25 → STAB 37.5 → 37
    const plain = computeDamage(inputs, DEFAULT_BATTLE_CONFIG);
    const crit = computeDamage({ ...inputs, crit: true }, DEFAULT_BATTLE_CONFIG);
    const forced = computeDamage({ ...inputs, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    const both = computeDamage({ ...inputs, crit: true, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    expect(plain.final).toBe(37);
    expect(crit.final).toBe(56);
    expect(forced.final).toBe(56);
    expect(both.final).toBe(56);
  });

  it('computeDamage_ZeroDefense_ClampsToOne', () => {
    const r = computeDamage(
      { ...base, defense: 0, power: 10, attack: 10, attackerTypes: ['fire'] },
      DEFAULT_BATTLE_CONFIG,
    );
    expect(r.defense).toBe(1);
    expect(r.final).toBe(12); // 10×10/1/8 = 12.5 → 12
  });

  it('computeDamage_FloorOnlyAtEnd_IsOrderIndependent', () => {
    const r = computeDamage(
      {
        ...base,
        power: 35,
        attack: 61,
        defense: 47,
        crit: true,
        moveType: 'water',
        attackerTypes: ['water'],
        defenderTypes: ['rock', 'ground'],
      },
      DEFAULT_BATTLE_CONFIG,
    );
    const expected = Math.floor(((35 * 61) / 47 / DEFAULT_BATTLE_CONFIG.divisor) * 1.5 * 1.5 * 4);
    expect(r.final).toBe(expected);
  });
});
