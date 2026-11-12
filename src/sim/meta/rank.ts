// §8.3.3, §8.3.5 — the Trainer Rank: nine ranks, each with a face.
//
// Until v0.9.110 the account had thirty Trainer Levels, and twenty-four of them paid three Tokens and nothing else:
// a level-up had no face, and the player learned that the Hub's dial was a counter. A rank is a milestone instead —
// somebody arrives in the Hub, the Hub itself moves on (§8.4), a Kit slot opens, a parcel shows one more card — and
// the first four are reached in the first four runs. The rank is still driven by Trainer XP, which is still never spent (§8.3.1).

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
  { rank: 1, name: 'Newcomer', xp: 0, tokens: 0, arrives: 'Your room: the PC and your Trainer Card', why: 'Where every trainer starts.' },
  { rank: 2, name: 'Rookie', xp: 300, tokens: 5, arrives: "Professor Oak's aide, in his Lab", why: "The Hub moves to the Lab. Oak's Parcels, the Trainer Journal and the Item Guide." },
  { rank: 3, name: 'Trainer', xp: 1000, tokens: 10, arrives: 'The Poké Mart clerk', why: 'The Mart opens: starters, services, and things to wear and hang.' },
  { rank: 4, name: 'Challenger', xp: 2200, tokens: 10, arrives: 'The Trainer Kit desk', why: 'One Kit slot: a perk you pack before every run.' },
  { rank: 5, name: 'Ace', xp: 3800, tokens: 15, arrives: 'Viridian City, and a second Kit slot', why: 'The Hub moves to the Pokémon Center. Two perks a run.' },
  { rank: 6, name: 'Veteran', xp: 6000, tokens: 15, arrives: 'Fuller parcels, and the League banner', why: "Every Oak's Parcel shows four cards instead of three." },
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

/**
 * §8.4, §8.4.1, §8.4.6 — the rank at which each of the Hub's people arrives, the rank that moves the Hub to Viridian
 * City, and the three ranks the League banner flies for (Veteran, Elite, Master). Elite also opens the Indigo Plateau
 * to a career whose Badge Case has not (§8.4).
 */
export const ARRIVAL_RANK = { aide: 2, clerk: 3, kit: 4, center: 5, banner: 6, elite: 8, master: 9 } as const;

/** §8.6.2 — cards an Oak's Parcel shows: three, four from Veteran. */
export const PARCEL_CHOICES = { base: 3, veteran: 4, veteranRank: ARRIVAL_RANK.banner } as const;
export const parcelChoicesFor = (rank: number): number => (rank >= PARCEL_CHOICES.veteranRank ? PARCEL_CHOICES.veteran : PARCEL_CHOICES.base);

/** §8.4 — the different Badges in the Case that open the Indigo Plateau: a quarter of the twelve. */
export const PLATEAU_BADGES = 3;
/** §8.4.6 — the species owned that stand the Pokédex award in the Hub: one of Oak's aide's milestones (§8.9.3). */
export const DEX_AWARD_OWNED = 50;
