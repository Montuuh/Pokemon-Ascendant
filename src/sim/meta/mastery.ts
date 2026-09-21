import type { ContentRegistry } from '../content/defs';

// §5.13.2 / §6.8 — which Mastery Move a Pokémon carries into a fight.
//
// The tier a Pokémon *shows* is the lowest of three things: the tier its stage can hold (Lv1 on a base form,
// Lv2 on a middle stage or a two-stage final, Lv3 on a three-stage final), the tier its line has unlocked on
// the account, and the highest tier whose move actually ships. "It advances with evolution, but only if that
// tier has been unlocked" falls out of the first two; the third is why a line can be listed with a null.

/** The highest tier index this stage may hold: 0 for a base form, 1 for the middle, 2 for a three-stage final. */
export function stageTierCap(speciesId: string, content: ContentRegistry): number {
  const s = content.species(speciesId);
  if (s.stage === 'basic') return 0;
  if (s.stage === 'stage2') return 2;
  // stage1: the middle of a three-stage line, or the top of a two-stage one — both hold Lv2.
  return 1;
}

/** The move for the fifth slot, or null when the line has nothing unlocked (or nothing shipped) at this stage. */
export function masteryMoveFor(speciesId: string, unlockedTier: number, content: ContentRegistry): string | null {
  if (unlockedTier <= 0) return null;
  const line = content.lineBase(speciesId);
  const tiers = content.masteryMoves(line);
  const top = Math.min(unlockedTier - 1, stageTierCap(speciesId, content));
  for (let i = top; i >= 0; i--) if (tiers[i]) return tiers[i]!;
  return null;
}

/** §5.13.2 — deck size for a team: 12 + 1 per member with a Mastery card, capped at 15 (= 3 × 5). */
export const MASTERY_DECK_CAP = 15;
