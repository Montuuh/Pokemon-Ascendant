import type { ContentRegistry } from '../content/defs';

// §6.8 — Bond: how a Pokémon line gets better, run after run, by being *played*.
//
// One track per evolution line (Charmander, Charmeleon and Charizard share it), filled by what you do with it, with
// six ranks that each open one concrete thing on the line. It replaced two overlapping systems on 2026-09-21 —
// Pokédex tiers earned by knocking the species out, and Mastery levels earned by species-specific achievements —
// because "fight against it to improve yours" read backwards to the first player who met it, and because progress
// that comes from playing a Pokémon is the progress that feels like the Pokémon's. The Pokédex keeps what it is good
// at: knowledge about the species you fight (§5.13).

/**
 * §6.8.1 — Bond points, per line, for what you do with it in the Active Team. v0.9.1 counts the fights that mean
 * something — a trainer, an Elite, a Gym — and not the wild ones: since the route became twenty columns (v0.8.7) a run
 * fought ~25 fights and the old +1 a fight made every played line Trusted inside one run.
 */
export const BOND = {
  /** A won trainer, Elite or Gym fight. A wild fight pays no Bond. */
  win: 1,
  /** …and one more for the member that led the most turns of that fight. */
  lead: 1,
  /** A Gym won with the line in the Active Team: a Region cleared together. Replaces `win`, the lead's +1 still adds. */
  gym: 4,
  /** §5.14 — a shiny of the line joins the Box. */
  shiny: 10,
  /** An evolution. */
  evolution: 5,
  /** The first recruit of the line in a run. */
  recruit: 2,
  /** Finishing a run with it in the Active Team, lost… */
  runFinished: 8,
  /** …or won. Replaces, not adds. */
  runWon: 15,
  /**
   * §6.8.1 — a line waiting in the Box earns this share of the Gym and the run's end (v0.9.110), rounded down: rotating
   * the team no longer costs a line its progress. Ordinary fights still pay only the three that fought them.
   */
  benchShare: 0.5,
} as const;

/**
 * §6.8.2 — the six ranks and what each opens, one thing a rank. v0.9.110 added a rank at each end of the user's four
 * (2026-10-06): **Acquainted** at the bottom, so the first run with a line already opens something, and **Partner** at
 * the top, the line as the face of your account. The four in the middle are the same four in the same order.
 */
export const BOND_TIER = { acquainted: 1, shinyCharm: 2, hiddenAbility: 3, mastery: 4, soulbound: 5, partner: 6 } as const;

/**
 * §6.8.2 — cumulative points to reach ranks 1–6. A line in the Active Team earns about 20 a run, so a line played
 * every run reaches them after about **1 · 3 · 6 · 10 · 15 · 21** runs (`balance/bondCareer.test.ts`). The steps grow
 * by 20 each time, so the early ranks come quickly and the top keeps the twenty-run pace it had when every rank cost
 * 100 (v0.9.1): what changed is that the first reward no longer waits five runs.
 */
export const BOND_RANKS = [20, 60, 120, 200, 300, 420] as const;
export const MAX_BOND_RANK = BOND_RANKS.length;

export const BOND_RANK_NAME: Record<number, string> = { 0: '—', 1: 'Acquainted', 2: 'Companion', 3: 'Trusted', 4: 'Deep Bond', 5: 'Soulbound', 6: 'Partner' };

export function bondRank(points: number): number {
  let rank = 0;
  while (rank < MAX_BOND_RANK && points >= BOND_RANKS[rank]!) rank++;
  return rank;
}

/** Progress inside the current tier, for the bar. At the top tier, 1. */
export function bondProgress(points: number): { rank: number; into: number; span: number; fraction: number; next: number | null } {
  const rank = bondRank(points);
  if (rank >= MAX_BOND_RANK) return { rank, into: 0, span: 0, fraction: 1, next: null };
  const floor = rank === 0 ? 0 : BOND_RANKS[rank - 1]!;
  const next = BOND_RANKS[rank]!;
  const span = next - floor;
  return { rank, into: points - floor, span, fraction: span > 0 ? (points - floor) / span : 1, next };
}

/** §6.8.2 — what the line's tier opens. Flags the run and the UI read. */
export interface BondUnlocks {
  /** Rank 1 — you know the line: its species count as Familiar (§5.13.1) when you face them. */
  acquainted: boolean;
  /** Rank 2 — §5.14: every new copy of the line rolls for shiny, three times as often in the wild. */
  shinyCharm: boolean;
  /** Rank 3 — §6.8.3: the third authored ability, at the Dojo. */
  hiddenAbility: boolean;
  /**
   * Rank 4 — §5.13.2: the whole Mastery at once, every tier on every stage (the stage still decides which card the
   * slot holds). It was three unlocks across three ranks in v0.9.1's first cut; one unlock is the line's full potential.
   */
  mastery: 0 | 3;
  /** Rank 5 — §8.5.2: the line may start a run; a line that already could starts it shiny (`copyIsShiny`). */
  starter: boolean;
  /** Rank 6 — the line walks the lobby, and as your starter it begins a level higher (§6.8.2). */
  partner: boolean;
}

export function bondUnlocks(rank: number): BondUnlocks {
  return {
    acquainted: rank >= BOND_TIER.acquainted,
    shinyCharm: rank >= BOND_TIER.shinyCharm,
    hiddenAbility: rank >= BOND_TIER.hiddenAbility,
    mastery: rank >= BOND_TIER.mastery ? 3 : 0,
    starter: rank >= BOND_TIER.soulbound,
    partner: rank >= BOND_TIER.partner,
  };
}

/** §6.8.2 — a Partner line that starts the run begins this many levels higher. */
export const PARTNER_START_LEVELS = 1;

/** §6.8.2 — the ladder, in the player's words, for the Pokédex sheet's Line tab and the tooltips. */
export const BOND_LADDER: { rank: 1 | 2 | 3 | 4 | 5 | 6; name: string; unlock: string }[] = [
  { rank: 1, name: 'Acquainted', unlock: 'You know it — its hidden intents show when you face one' },
  { rank: 2, name: 'Companion', unlock: 'Shiny Charm — its shinies turn up three times as often' },
  { rank: 3, name: 'Trusted', unlock: 'Hidden ability — assignable at the Dojo' },
  { rank: 4, name: 'Deep Bond', unlock: 'Mastery Move — a fifth card unique to the line, in every evolution' },
  { rank: 5, name: 'Soulbound', unlock: 'The line can start a run' },
  { rank: 6, name: 'Partner', unlock: 'It walks your lobby, and starts a run one level higher' },
];

/** §6.8.5 — the four Ribbons a line can wear, in the order they are earned. */
export type RibbonId = 'gym' | 'league' | 'champion' | 'ladder';
export const RIBBONS: readonly { id: RibbonId; name: string; earned: string }[] = [
  { id: 'gym', name: 'Gym Ribbon', earned: 'Won a Gym with it in the Active Team' },
  { id: 'league', name: 'League Ribbon', earned: 'Reached the League with it in the Active Team' },
  { id: 'champion', name: 'Champion Ribbon', earned: 'Beat the Champion with it in the Active Team' },
  { id: 'ladder', name: 'Ladder Ribbon', earned: 'Won a League Ladder run with it in the Active Team' },
];

/** §6.8.3 — the line's hidden ability: the last of its three authored abilities, or null while unauthored. */
export function hiddenAbilityOf(lineId: string, content: ContentRegistry): string | null {
  return content.species(lineId).hiddenAbility ?? null;
}
