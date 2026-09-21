import type { RarityTier } from '../types';

// §5.13 — the Pokédex: what fighting *against* a species many times teaches you about it.
//
// One tier, Familiar, and its reward is information: the species' hidden intents are shown from turn one.
// Making *your own* Pokémon better is the Bond's job (§6.8) — the Pokédex stopped handing out Shiny and the
// Mastery Move on 2026-09-21, because earning those by knocking out wild copies of your partner read backwards.
// §8.9 owns the persistence (it lives in the account); this file owns the numbers.

export type DexTier = 0 | 1;

export const DEX_TIER_NAME: Record<DexTier, string> = { 0: '—', 1: 'Familiar' };

/** §5.13.1 — knock-outs needed for Familiar, by the species' rarity. */
export const DEX_FAMILIAR: Record<RarityTier, number> = {
  common: 10,
  uncommon: 5,
  rare: 2,
  // A legendary species is not in the wild pool; if one is ever fought, treat it as rare.
  legendary: 2,
};

/** §8.3.2 — one-time Trainer XP on reaching Familiar. */
export const DEX_TIER_XP: Record<DexTier, number> = { 0: 0, 1: 25 };

export interface DexEntry {
  /** §5.13.1 — defeats, from anyone on your side, against anyone's copy of the species. Catching is not one. */
  defeats: number;
  /** Ever recruited. */
  recruited: boolean;
  /** Kept for the record; the Bond (§6.8) is what these feed now. */
  winsWith: number;
  runsFinishedWith: number;
  tier: DexTier;
}

export function dexTierFor(defeats: number, rarity: RarityTier): DexTier {
  return defeats >= DEX_FAMILIAR[rarity] ? 1 : 0;
}

/** Knock-outs still needed for Familiar, or null once there. */
export function dexNext(entry: DexEntry | undefined, rarity: RarityTier): { tier: DexTier; need: number; have: number } | null {
  const have = entry?.defeats ?? 0;
  if ((entry?.tier ?? 0) >= 1) return null;
  return { tier: 1, need: DEX_FAMILIAR[rarity], have };
}
