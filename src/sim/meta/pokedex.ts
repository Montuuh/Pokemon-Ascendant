import type { RarityTier } from '../types';

// §5.13 — the Pokédex: what fighting a species many times earns you.
//
// Three tiers, thresholds scaled by the species' rarity, and a reward per tier that is *information first,
// power last*: Familiar reveals the species' hidden intents, Veteran makes your own copies Shiny, Master
// opens the Mastery Move. §8.9 owns the persistence (it lives in the account); this file owns the numbers.

export type DexTier = 0 | 1 | 2 | 3;

export const DEX_TIER_NAME: Record<DexTier, string> = { 0: '—', 1: 'Familiar', 2: 'Veteran', 3: 'Master' };

/** §5.13.1 — kills needed per tier, by the species' rarity. */
export const DEX_THRESHOLDS: Record<RarityTier, [familiar: number, veteran: number, master: number]> = {
  common: [10, 30, 50],
  uncommon: [5, 15, 25],
  rare: [2, 5, 10],
  // A legendary species is not in the wild pool; if one is ever fought, treat it as rare.
  legendary: [2, 5, 10],
};

/** §8.3.2 — one-time Trainer XP on each promotion. */
export const DEX_TIER_XP: Record<DexTier, number> = { 0: 0, 1: 25, 2: 75, 3: 200 };

export interface DexEntry {
  /** §5.13.1 — defeats, from anyone on your side, against anyone's copy of the species. Catching is not one. */
  defeats: number;
  /** §6.8.1 — ever recruited. */
  recruited: boolean;
  /** §6.8.1 — combats won with it in the Active Team. */
  winsWith: number;
  /** §6.8.1 — runs finished with it in the Active Team. */
  runsFinishedWith: number;
  tier: DexTier;
}

export function dexTierFor(defeats: number, rarity: RarityTier): DexTier {
  const [f, v, m] = DEX_THRESHOLDS[rarity];
  if (defeats >= m) return 3;
  if (defeats >= v) return 2;
  if (defeats >= f) return 1;
  return 0;
}

/** Kills still needed for the next tier, or null at Master. */
export function dexNext(entry: DexEntry | undefined, rarity: RarityTier): { tier: DexTier; need: number; have: number } | null {
  const have = entry?.defeats ?? 0;
  const tier = entry?.tier ?? 0;
  if (tier >= 3) return null;
  const thresholds = DEX_THRESHOLDS[rarity];
  return { tier: (tier + 1) as DexTier, need: thresholds[tier as 0 | 1 | 2], have };
}
