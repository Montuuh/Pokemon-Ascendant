import { describe, expect, it } from 'vitest';
import { DEFAULT_BATTLE_CONFIG } from './battleConfig';
import { computeDamage, type DamageInputs } from './damage';

// Per §4.1.1 — the series' formula (v0.9.96): floor( ((2L/5 + 2) × Power × Atk/Def / 100 + 2) × Range × Crit × STAB × TypeEff ).
// At Lv 50 the level term is 22.
const base: DamageInputs = {
  power: 40,
  level: 50,
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
    // 22 × 40 × 1 / 100 + 2 = 10.8 → ×1.5 STAB = 16
    const r = computeDamage(base, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(16);
    expect(r.hasStab).toBe(true);
    expect(r.isCrit).toBe(false);
  });

  it('computeDamage_HighPowerRanged_AppliesRangeModifier', () => {
    // (22 × 90 × 2 / 100 + 2) × 0.75 = 31.2 → no STAB (grass move, fire attacker) → ×2 vs water = 62
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
    expect(r.final).toBe(62);
  });

  it('computeDamage_Immunity_ReturnsZero', () => {
    const r = computeDamage({ ...base, power: 200, moveType: 'normal', defenderTypes: ['ghost'] }, DEFAULT_BATTLE_CONFIG);
    expect(r.final).toBe(0);
  });

  it('computeDamage_CritAndAlwaysCrit_ApplyMultiplierOnce', () => {
    const inputs = { ...base, power: 100, attack: 100, defense: 50 }; // 22×100×2/100 + 2 = 46 → STAB 69
    const plain = computeDamage(inputs, DEFAULT_BATTLE_CONFIG);
    const crit = computeDamage({ ...inputs, crit: true }, DEFAULT_BATTLE_CONFIG);
    const forced = computeDamage({ ...inputs, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    const both = computeDamage({ ...inputs, crit: true, alwaysCrit: true }, DEFAULT_BATTLE_CONFIG);
    expect(plain.final).toBe(69);
    expect(crit.final).toBe(103);
    expect(forced.final).toBe(103);
    expect(both.final).toBe(103);
  });

  it('computeDamage_ZeroDefense_ClampsToOne', () => {
    const r = computeDamage(
      { ...base, defense: 0, power: 10, attack: 10, attackerTypes: ['fire'] },
      DEFAULT_BATTLE_CONFIG,
    );
    expect(r.defense).toBe(1);
    expect(r.final).toBe(24); // 22×10×10/1/100 + 2 = 24
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
    const expected = Math.floor(((22 * 35 * 61) / 47 / DEFAULT_BATTLE_CONFIG.divisor + DEFAULT_BATTLE_CONFIG.damageFlat) * 1.5 * 1.5 * 4);
    expect(r.final).toBe(expected);
  });

  it('computeDamage_LevelTerm_GrowsTheHitWithItsUser_§4.1.1', () => {
    // Lv 5: 4 × 40 / 100 + 2 = 3.6 → STAB 5. Lv 50: 16. The +2 keeps a weak low-level hit from flooring to nothing.
    expect(computeDamage({ ...base, level: 5 }, DEFAULT_BATTLE_CONFIG).final).toBe(5);
    expect(computeDamage({ ...base, level: 5, power: 10, attack: 10, defense: 60 }, DEFAULT_BATTLE_CONFIG).final).toBe(3);
  });

  it('computeDamage_NoPower_DealsNothing', () => {
    expect(computeDamage({ ...base, power: 0 }, DEFAULT_BATTLE_CONFIG).final).toBe(0);
  });
});
