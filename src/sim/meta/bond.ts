import type { ContentRegistry } from '../content/defs';

// §6.8 — Bond: how a Pokémon line gets better, run after run, by being *played*.
//
// One track per evolution line (Charmander, Charmeleon and Charizard share it), filled by what you do with it
// in the Active Team, with five ranks that each open one concrete thing on the line. It replaced two overlapping
// systems on 2026-09-21 — Pokédex tiers earned by knocking the species out, and Mastery levels earned by
// species-specific achievements — because "fight against it to improve yours" read backwards to the first
// player who met it, and because progress that comes from playing a Pokémon is the progress that feels like
// the Pokémon's. The Pokédex keeps what it is good at: knowledge about the species you fight (§5.13).

/** §6.8.1 — Bond points, per line, for what you do with it in the Active Team. */
export const BOND = {
  /** A won fight (a catch counts). */
  win: 1,
  /** …and one more for the member that led the most turns of that fight. */
  lead: 1,
  /** An evolution. */
  evolution: 5,
  /** The first recruit of the line in a run. */
  recruit: 2,
  /** Finishing a run with it in the Active Team, lost… */
  runFinished: 8,
  /** …or won. Replaces, not adds. */
  runWon: 15,
} as const;

/** §6.8.2 — cumulative points to reach ranks 1–5. */
export const BOND_RANKS = [5, 15, 35, 60, 100] as const;
export const MAX_BOND_RANK = 5;

export const BOND_RANK_NAME: Record<number, string> = { 0: '—', 1: 'Companion', 2: 'Trusted', 3: 'Veteran', 4: 'Deep Bond', 5: 'Soulbound' };

export function bondRank(points: number): number {
  let rank = 0;
  while (rank < MAX_BOND_RANK && points >= BOND_RANKS[rank]!) rank++;
  return rank;
}

/** Progress inside the current rank, for the bar. At rank 5, 1. */
export function bondProgress(points: number): { rank: number; into: number; span: number; fraction: number; next: number | null } {
  const rank = bondRank(points);
  if (rank >= MAX_BOND_RANK) return { rank, into: 0, span: 0, fraction: 1, next: null };
  const floor = rank === 0 ? 0 : BOND_RANKS[rank - 1]!;
  const next = BOND_RANKS[rank]!;
  const span = next - floor;
  return { rank, into: points - floor, span, fraction: span > 0 ? (points - floor) / span : 1, next };
}

/**
 * §6.8.2 — what each rank opens on the line. `mastery` is the Mastery Move tier the line may carry (the stage
 * still caps it, §5.13.2); the rest are flags the run and the UI read.
 */
export interface BondUnlocks {
  mastery: 0 | 1 | 2 | 3;
  shiny: boolean;
  hiddenAbility: boolean;
  /** Rank 5 on a line whose Mastery caps at Lv2: the Mastery card opens every fight in hand. */
  opener: boolean;
  /** Rank 5: the line may be picked on the starter screen (§8.5.2). */
  starter: boolean;
}

export function bondUnlocks(rank: number, threeStageLine: boolean): BondUnlocks {
  return {
    mastery: rank >= 5 && threeStageLine ? 3 : rank >= 4 ? 2 : rank >= 1 ? 1 : 0,
    shiny: rank >= 2,
    hiddenAbility: rank >= 3,
    opener: rank >= 5 && !threeStageLine,
    starter: rank >= 5,
  };
}

/** §6.8.2 — the ladder, in the player's words, for the Pokédex sheet's Line tab and the tooltips. */
export const BOND_LADDER: { rank: 1 | 2 | 3 | 4 | 5; name: string; unlock: string }[] = [
  { rank: 1, name: 'Companion', unlock: 'Mastery Move Lv1 — a fifth card' },
  { rank: 2, name: 'Trusted', unlock: 'Shiny' },
  { rank: 3, name: 'Veteran', unlock: 'Hidden ability' },
  { rank: 4, name: 'Deep Bond', unlock: 'Mastery Move Lv2' },
  { rank: 5, name: 'Soulbound', unlock: 'Mastery Move Lv3 (three-stage lines) or the Mastery card in every opening hand · the line can start a run' },
];

/** Does the line reach a third stage? Decides whether rank 5 is Lv3 or the opener. */
export function isThreeStageLine(lineId: string, content: ContentRegistry): boolean {
  const base = content.species(lineId);
  const mid = base.evolvesTo[0];
  return !!mid && content.species(mid).evolvesTo.length > 0;
}

/** §6.8.3 — the line's hidden ability: the last of its three authored abilities, or null while unauthored. */
export function hiddenAbilityOf(lineId: string, content: ContentRegistry): string | null {
  return content.species(lineId).hiddenAbility ?? null;
}
