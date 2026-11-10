// §8.3.3, §8.3.5 — the Trainer Rank: nine ranks, each with a face.
//
// Until v0.9.110 the account had thirty Trainer Levels, and twenty-four of them paid three Tokens and nothing else:
// a level-up had no face, and the player learned that the Hub's dial was a counter. A rank is a milestone instead —
// somebody arrives in the lobby, a Kit slot opens, a parcel shows one more card — and the first four are reached in
// the first four runs. The rank is still driven by Trainer XP, which is still never spent (§8.3.1).

export interface RankRow {
  rank: number;
  name: string;
  /** Cumulative Trainer XP to reach it. */
  xp: number;
  /** Tokens paid the moment it is reached. */
  tokens: number;
  /** What it brings to the lobby, in the player's words. */
  arrives: string;
  /** One line on why it matters, for the road's detail. */
  why: string;
}

/**
 * §8.3.3 — the rank table. The XP column is tuned against a career's median run (~550 XP): ranks 2 · 3 · 4 · 5 arrive
 * after about runs 1 · 2 · 4 · 7, the last after about forty (`balance/accountCareer.test.ts`).
 */
export const RANKS: readonly RankRow[] = [
  { rank: 1, name: 'Newcomer', xp: 0, tokens: 0, arrives: 'The nurse, the PC and the League door', why: 'The lobby as you find it.' },
  { rank: 2, name: 'Rookie', xp: 300, tokens: 5, arrives: "Professor Oak's aide", why: "Oak's Parcels and the Trainer Journal: new things for the world, and deeds to chase." },
  { rank: 3, name: 'Trainer', xp: 1000, tokens: 10, arrives: 'The Poké Mart clerk', why: 'The Mart opens: starters, services, and things to wear and hang.' },
  { rank: 4, name: 'Challenger', xp: 2200, tokens: 10, arrives: 'The Trainer Kit desk', why: 'One Kit slot: a perk you pack before every run.' },
  { rank: 5, name: 'Ace', xp: 3800, tokens: 15, arrives: 'A second Kit slot', why: 'Two perks a run.' },
  { rank: 6, name: 'Veteran', xp: 6000, tokens: 15, arrives: 'Fuller parcels', why: "Every Oak's Parcel shows four cards instead of three." },
  { rank: 7, name: 'Expert', xp: 9500, tokens: 20, arrives: 'A third Kit slot', why: 'Three perks a run — the whole Kit.' },
  { rank: 8, name: 'Elite', xp: 14500, tokens: 30, arrives: 'The Elite purse', why: 'A purse of Tokens for the long road.' },
  { rank: 9, name: 'Master', xp: 22000, tokens: 50, arrives: 'The Master purse', why: 'The last rank. Research past it still fills parcels.' },
];

export const MAX_RANK = RANKS.length;

export const rankRow = (rank: number): RankRow => RANKS[Math.max(1, Math.min(MAX_RANK, rank)) - 1]!;

/** Cumulative XP to *reach* rank N. Rank 1 is the floor and costs nothing. */
export const xpForRank = (n: number): number => (n <= 1 ? 0 : rankRow(n).xp);

/** The rank a lifetime XP total has reached, 1–9. */
export function rankFor(xp: number): number {
  let rank = 1;
  while (rank < MAX_RANK && xp >= xpForRank(rank + 1)) rank++;
  return rank;
}

/** Progress inside the current rank, for the bar: 0–1. At the top, 1. */
export function rankProgress(xp: number): { level: number; into: number; span: number; fraction: number } {
  const level = rankFor(xp);
  if (level >= MAX_RANK) return { level, into: 0, span: 0, fraction: 1 };
  const floor = xpForRank(level);
  const span = xpForRank(level + 1) - floor;
  const into = xp - floor;
  return { level, into, span, fraction: span > 0 ? into / span : 1 };
}

/** §8.4.5 — Trainer Kit slots by rank: one at Challenger, two at Ace, three at Expert. */
export const KIT_SLOT_RANKS = [4, 5, 7] as const;
export const kitSlotsFor = (rank: number): number => KIT_SLOT_RANKS.filter((r) => rank >= r).length;

/** §8.6.2 — cards an Oak's Parcel shows: three, four from Veteran. */
export const PARCEL_CHOICES = { base: 3, veteran: 4, veteranRank: 6 } as const;
export const parcelChoicesFor = (rank: number): number => (rank >= PARCEL_CHOICES.veteranRank ? PARCEL_CHOICES.veteran : PARCEL_CHOICES.base);

/** §8.4.6 — the rank at which each of the lobby's people arrives. */
export const ARRIVAL_RANK = { aide: 2, clerk: 3, kit: 4 } as const;
