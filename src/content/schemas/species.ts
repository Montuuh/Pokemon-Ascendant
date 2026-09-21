import { z } from 'zod';
import { asset } from '../paths';
import { POKEMON_TYPES } from '@/sim/types';

// Per docs/design/10-foundations.md §10.3.2 (PokemonSpeciesSO) — web counterpart.
// Content JSON is validated against these schemas at load time and in `npm test`.
export const PokemonTypeSchema = z.enum(POKEMON_TYPES);

export const BaseStatsSchema = z.object({
  hp: z.number().int().positive(),
  attack: z.number().int().positive(),
  defense: z.number().int().positive(),
  speed: z.number().int().nonnegative(),
});

export const SpeciesSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'kebab-case id'),
  dex: z.number().int().positive(),
  name: z.string().min(1),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  stage: z.enum(['basic', 'stage1', 'stage2']),
  baseStats: BaseStatsSchema,
  /** §6.3 — ids of EvolutionBranch entries (empty for final forms). */
  branches: z.array(z.string()).default([]),
  /** §3.4 — the 4 baseline moves this species contributes to the shared hand. */
  baselineMoves: z.array(z.string()).length(4),
  abilityId: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']).default('common'),
  // Art keys are derived, never stored: portraits/NNN-id.png, icons/NNN-id.png, battle/id.gif
});
export type Species = z.infer<typeof SpeciesSchema>;

export const RosterSchema = z.object({
  _note: z.string().optional(),
  lines: z.array(
    z.object({
      line: z.string(),
      species: z.array(z.object({ dex: z.number().int().positive(), id: z.string() })).min(1),
    }),
  ),
});
export type Roster = z.infer<typeof RosterSchema>;

/** Art path helpers — the only place that knows the on-disk naming convention. */
export function portraitUrl(dex: number, id: string): string {
  return asset(`art/pokemon/portraits/${String(dex).padStart(3, '0')}-${id}.png`);
}
export function boxIconUrl(dex: number, id: string): string {
  return asset(`art/pokemon/icons/${String(dex).padStart(3, '0')}-${id}.png`);
}
/** §5.13.1 Veteran — `shiny` picks the official shiny palette of the same sprite. */
export function battleSpriteUrl(id: string, side: 'front' | 'back' = 'front', shiny = false): string {
  return asset(`art/pokemon/battle/${id}${shiny ? '-shiny' : ''}${side === 'back' ? '-back' : ''}.gif`);
}
