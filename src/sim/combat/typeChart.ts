import type { PokemonType } from '../types';

// Per docs/design/04-resolution.md §4.1.2 — Gen I type effectiveness, "Gen I matrix exactly".
// Only non-neutral cells are listed; everything else is ×1.
// Gen I quirks preserved on purpose (they are canon for this game):
//   - Ghost → Psychic = ×0   (the famous Gen I bug)
//   - Bug   → Poison  = ×2   (Gen I; later gens ×0.5)
//   - Poison → Bug    = ×2   (Gen I; later gens ×1)
// The worked example in the spec prose (Ground vs Water/Rock = 0.5×) is arithmetically wrong; the matrix
// gives ×1 × ×2 = ×2 and the test suite asserts that (Unity-era OPEN G6, resolved in favour of the matrix).
type Row = Partial<Record<PokemonType, number>>;

export const TYPE_CHART: Readonly<Record<PokemonType, Row>> = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
  ice: { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, bug: 2, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 2, flying: 0.5, psychic: 2, ghost: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
  ghost: { normal: 0, psychic: 0, ghost: 2 },
  dragon: { dragon: 2 },
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
