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
  // §8.9 — the record (2026-09-22): the numbers the Pokédex sheet shows. None of them is a rule input.
  /** Fights the species took the field against you. Zero means you have never met it. */
  encounters: number;
  /** Times a copy went into a Poké Ball. */
  caught: number;
  /** Times a copy joined the Box, by any road. */
  recruits: number;
  /** Enemy knock-outs your copies landed (the blow, not the status tick — §7.3.5's rule). */
  knockouts: number;
  /** Times a copy of yours fainted. */
  faints: number;
  /** Damage your copies dealt to enemies. */
  damageDealt: number;
  /** Times a copy of yours evolved *from* this species. */
  evolutions: number;
}

export const emptyDexEntry = (): DexEntry => ({
  defeats: 0, recruited: false, winsWith: 0, runsFinishedWith: 0, tier: 0,
  encounters: 0, caught: 0, recruits: 0, knockouts: 0, faints: 0, damageDealt: 0, evolutions: 0,
});

/** A saved entry from before a field existed, made whole. `recruits` is inferred from the old boolean. */
export function normalizeDexEntry(raw: Partial<DexEntry> | undefined): DexEntry {
  const e = { ...emptyDexEntry(), ...(raw ?? {}) };
  if (raw && raw.recruits === undefined && raw.recruited) e.recruits = 1;
  return e;
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
