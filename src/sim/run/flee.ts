import type { NodeKind } from './types';

// §3.1.2 — running from a fight, and what it costs.
//
// Decided 2026-09-21: a fight can be left, and leaving is never free. The enemy gets the action it has
// telegraphed (the "parting shot"), and the run pays a toll that climbs with the fight's stakes — a wild
// fight costs money and the Lead's nerve, a trainer costs the whole team's nerve and a consumable, an Elite
// costs half the wallet and a relic. A Gym cannot be run from: the fork was the choice, and it was made.
//
// Pillar 2 (every swap is a decision) is what a free exit would have devalued; the toll is what makes running
// a decision rather than an undo. Pillar 1 is kept by printing the toll on the button before it is pressed.

export type FleeTier = 'wild' | 'trainer' | 'elite';

export interface FleeToll {
  /** Share of the run's Poké Dollars lost, rounded down. */
  moneyPct: number;
  /** Who gains a Trauma stack: the Lead, or every Active member. */
  trauma: 'lead' | 'all';
  /** What else is lost: nothing, one random consumable, or one random relic (never a Legendary). */
  loot: 'none' | 'consumable' | 'relic';
}

export const FLEE_TOLL: Record<FleeTier, FleeToll> = {
  wild: { moneyPct: 20, trauma: 'lead', loot: 'none' },
  trainer: { moneyPct: 30, trauma: 'all', loot: 'consumable' },
  elite: { moneyPct: 50, trauma: 'all', loot: 'relic' },
};

/** Which toll a node's fight carries; null where running is not allowed at all. */
export function fleeTierFor(kind: NodeKind): FleeTier | null {
  switch (kind) {
    case 'wild':
      return 'wild';
    case 'trainer':
      return 'trainer';
    case 'elite':
    case 'elite-wild':
      return 'elite';
    default:
      return null;
  }
}

/** The toll in the player's words, for the button and the log. */
export function describeToll(toll: FleeToll): string {
  const parts = [`−${toll.moneyPct} % ₽`, toll.trauma === 'lead' ? '+1 Trauma on the Lead' : '+1 Trauma on every Active Pokémon'];
  if (toll.loot === 'consumable') parts.push('one consumable');
  if (toll.loot === 'relic') parts.push('one relic');
  return parts.join(' · ');
}
