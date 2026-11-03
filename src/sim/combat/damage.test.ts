import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from './battleConfig';
import { computeDamage, type DamageInputs } from './damage';

// Per §4.1.1 — floor( Power × (Atk/Def) × Range × Crit × STAB × TypeEff / Divisor ), divisor 5 (v0.9.12; Unity shipped 8).
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
    // 40 × 1 × 1 / 10 = 4 → ×1.5 STAB = 6
    const r = computeDamage(base, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(6);
    expect(r.hasStab).toBe(true);
    expect(r.isCrit).toBe(false);
  });

  it('computeDamage_HighPowerRanged_AppliesRangeModifier', () => {
    // 90 × (80/40) × 0.75 / 10 = 13.5 → no STAB (grass move, fire attacker) → ×2 vs water = 27
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
    expect(r.final).toBe(27);
  });

  it('computeDamage_Immunity_ReturnsZero', () => {
    const r = computeDamage({ ...base, power: 200, moveType: 'normal', defenderTypes: ['ghost'] }, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(0);
  });

  it('computeDamage_CritAndAlwaysCrit_ApplyMultiplierOnce', () => {
    const inputs = { ...base, power: 100, attack: 100, defense: 50 }; // 100×2/10 = 20 → STAB 30
    const plain = computeDamage(inputs, DEFAULT_BATTLE_CONFIG);
    const crit = computeDamage({ ...inputs, crit: true }, DEFAULT_BATTLE_CONFIG);
    const forced = computeDamage({ ...inputs, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    const both = computeDamage({ ...inputs, crit: true, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    expect(plain.final).toBe(30);
    expect(crit.final).toBe(45);
    expect(forced.final).toBe(45);
    expect(both.final).toBe(45);
  });

  it('computeDamage_ZeroDefense_ClampsToOne', () => {
    const r = computeDamage(
      { ...base, defense: 0, power: 10, attack: 10, attackerTypes: ['fire'] },
      DEFAULT_BATTLE_CONFIG,
    );
    expect(r.defense).toBe(1);
    expect(r.final).toBe(10); // 10×10/1/10 = 10
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
