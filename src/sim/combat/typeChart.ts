import type { PokemonType } from '../types';

// Per docs/design/04-resolution.md §4.1.2 — Gen II type effectiveness across the 17 types (Dark and Steel since v0.9.84).
// Only non-neutral cells are listed; everything else is ×1.
// Resolves Gen I balance quirks:
//   - Ghost   → Psychic = ×2   (fixes the Gen I bug where Ghost had ×0)
//   - Bug     → Poison  = ×0.5 (was ×2 in Gen I)
//   - Poison  → Bug     = ×1   (neutral, was ×2 in Gen I)
//   - Ice     → Fire    = ×0.5 (Fire resists Ice, was ×1 in Gen I)
// The worked example in the spec prose (Ground vs Water/Rock = 0.5×) is arithmetically wrong; the matrix
// gives ×1 × ×2 = ×2 and the test suite asserts that (Unity-era OPEN G6, resolved in favour of the matrix).
type Row = Partial<Record<PokemonType, number>>;

export const TYPE_CHART: Readonly<Record<PokemonType, Row>> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  dragon: { dragon: 2, steel: 0.5 },
  // Gen II: Dark is the answer to Ghost and Psychic, and is itself ground down by Fighting and Bug; Steel hits Ice and Rock and
  // resists nearly everything, at the price of Fire, Fighting and Ground.
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, steel: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 },
};

/** Single-cell lookup (attacker type vs one defender type). */
export function typeMultiplierSingle(attack: PokemonType, defender: PokemonType): number {
  return TYPE_CHART[attack][defender] ?? 1;
}

/**
 * Per §4.1.2 — dual-type effectiveness is the product of both lookups.
 * Immunity (×0) wins by multiplication; ×4 and ×0.25 are preserved.
 */
export function typeMultiplier(attack: PokemonType, defenderTypes: readonly PokemonType[]): number {
  let m = 1;
  for (const t of defenderTypes) m *= typeMultiplierSingle(attack, t);
  return m;
}

/** UI helper — bucket a multiplier into the effectiveness vocabulary used by badges and previews. */
export type Effectiveness = 'immune' | 'quarter' | 'half' | 'neutral' | 'double' | 'quad';
export function effectivenessLabel(m: number): Effectiveness {
  if (m === 0) return 'immune';
  if (m <= 0.25) return 'quarter';
  if (m < 1) return 'half';
  if (m === 1) return 'neutral';
  if (m >= 4) return 'quad';
  return 'double';
}
