import { MODIFIERS, type DifficultyModifier } from '../run/modifiers';

// §8.8.5 — the League Ladder: the difficulty modifiers as ten rungs, opened by the first Champion.
//
// Until v0.9.110 a modifier opened by Trainer Level, which made it a level-up prize for a player who was not
// winning yet and had no use for it. On a ladder it is the answer to "I have won — now what?": rung N is a run with
// the first N modifiers on, a rung won opens the next and frees its own modifier for a custom run, and the top is
// one of the Trainer Card's four stars (§8.15).

/** The rungs, in order: the selectable modifiers by their `rung`. */
export const LADDER: readonly DifficultyModifier[] = MODIFIERS.filter((m) => m.available).sort((a, b) => a.rung - b.rung);

export const LADDER_TOP = LADDER.length;

/** The modifier ids a run at this rung carries: the first `rung` rows. */
export const ladderModifiers = (rung: number): string[] => LADDER.slice(0, Math.max(0, Math.min(LADDER_TOP, rung))).map((m) => m.id);

/**
 * The rung a run's modifiers stand for: N when they are exactly the first N rows, 0 otherwise (a baseline or a
 * custom run). Derived rather than saved, so the run save gains no field and an old save reads true.
 */
export function ladderRungOf(modifiers: readonly string[]): number {
  const n = modifiers.length;
  if (n === 0 || n > LADDER_TOP) return 0;
  const want = ladderModifiers(n);
  return want.every((id) => modifiers.includes(id)) ? n : 0;
}

/** §8.8.5 — what a rung won for the first time pays. */
export const LADDER_PRIZE = { tokens: 15, parcels: 1 } as const;
