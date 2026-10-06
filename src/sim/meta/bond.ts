import type { ContentRegistry } from '../content/defs';

// §6.8 — Bond: how a Pokémon line gets better, run after run, by being *played*.
//
// One track per evolution line (Charmander, Charmeleon and Charizard share it), filled by what you do with it
// in the Active Team, with five ranks that each open one concrete thing on the line. It replaced two overlapping
// systems on 2026-09-21 — Pokédex tiers earned by knocking the species out, and Mastery levels earned by
// species-specific achievements — because "fight against it to improve yours" read backwards to the first
// player who met it, and because progress that comes from playing a Pokémon is the progress that feels like
// the Pokémon's. The Pokédex keeps what it is good at: knowledge about the species you fight (§5.13).

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
} as const;

/**
 * §6.8.2 — the four tiers and what each opens, one thing a tier (the user, 2026-10-06): the Shiny Charm, the hidden
 * ability, the line's whole Mastery, and the right to start a run. The order is the order a player wants them: a
 * look first, a choice at the Dojo second, the line's full kit third, the line as your partner last.
 */
export const BOND_TIER = { shinyCharm: 1, hiddenAbility: 2, mastery: 3, soulbound: 4 } as const;

/**
 * §6.8.2 — cumulative points to reach tiers 1–4. **Linear** (the user, 2026-10-06): every tier costs the same 100, so
 * a line played every run reaches them after about 5 / 10 / 15 / 20 runs, and a line recruited every other run after
 * about twice that — measured as a career by `balance/bondCareer.test.ts`. v0.9.1's five ranks at 10 · 40 · 110 ·
 * 200 · 360 front-loaded the rewards and handed a line its first Mastery card inside its first run.
 */
export const BOND_TIER_COST = 100;
export const MAX_BOND_RANK = 4;
export const BOND_RANKS = [BOND_TIER_COST, 2 * BOND_TIER_COST, 3 * BOND_TIER_COST, 4 * BOND_TIER_COST] as const;

export const BOND_RANK_NAME: Record<number, string> = { 0: '—', 1: 'Companion', 2: 'Trusted', 3: 'Deep Bond', 4: 'Soulbound' };

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
  /** Tier 1 — §5.14: every new copy of the line rolls for shiny, three times as often in the wild. */
  shinyCharm: boolean;
  /** Tier 2 — §6.8.3: the third authored ability, at the Dojo. */
  hiddenAbility: boolean;
  /**
   * Tier 3 — §5.13.2: the whole Mastery at once, every tier on every stage (the stage still decides which card the
   * slot holds). It was three unlocks across three ranks until v0.9.2; one unlock is the line's full potential.
   */
  mastery: 0 | 3;
  /** Tier 4 — §8.5.2: the line may start a run, and starts it shiny. */
  starter: boolean;
}

export function bondUnlocks(rank: number): BondUnlocks {
  return {
    shinyCharm: rank >= BOND_TIER.shinyCharm,
    hiddenAbility: rank >= BOND_TIER.hiddenAbility,
    mastery: rank >= BOND_TIER.mastery ? 3 : 0,
    starter: rank >= BOND_TIER.soulbound,
  };
}

/** §6.8.2 — the ladder, in the player's words, for the Pokédex sheet's Line tab and the tooltips. */
export const BOND_LADDER: { rank: 1 | 2 | 3 | 4; name: string; unlock: string }[] = [
  { rank: 1, name: 'Companion', unlock: 'Shiny Charm — every new one of the line may be shiny; three times as often in the wild' },
  { rank: 2, name: 'Trusted', unlock: 'Hidden ability — open at the Dojo' },
  { rank: 3, name: 'Deep Bond', unlock: 'Mastery Move — the fifth card, at every stage of the line' },
  { rank: 4, name: 'Soulbound', unlock: 'The line can start a run — and starts it shiny' },
];

/** §6.8.3 — the line's hidden ability: the last of its three authored abilities, or null while unauthored. */
export function hiddenAbilityOf(lineId: string, content: ContentRegistry): string | null {
  return content.species(lineId).hiddenAbility ?? null;
}
