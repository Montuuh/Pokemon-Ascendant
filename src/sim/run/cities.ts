import type { CityBuilding, CityId } from './types';

// §2.1.4, §2.11 — the two Cities of a run, and the seam they sit in.
//
// A run is three Regions. After the first Gym the run stops in a small town, after the second in the big city,
// and after the third it is won (Victory Road and the League arrive in v0.9). A City is a lobby: the doors it
// has open are listed here, because the reducer refuses a door the City does not have; everything about how a
// door *looks* — the building on the background, the in-development panels — is the UI's (src/ui/screens/city).

/** §2.1 — Regions per run in this build. The third Gym wins it until Victory Road exists. */
export const REGION_COUNT = 3;

export interface CityDef {
  id: CityId;
  name: string;
  /** The Region whose Gym leads here (0-based). */
  afterRegion: number;
  /** §2.11.4 — the open buildings. The Challenge Ring, the Game Corner and the rest are not open yet. */
  open: readonly CityBuilding[];
  /**
   * §2.11.2 — the shop's size. The Department Store's floors are v0.7.2; until then it stocks what the Mart
   * stocks, so Celadon is the right shape now and the right size later.
   */
  shop: 'mart' | 'department-store';
  /** §2.9.4 — the Dojo's price multiplier here: base in the town, +30 % in the city. */
  dojoMarkup: number;
  /**
   * §2.9.4 — the city Dojo's "wider list": the tutor moves of every stage the line has reached, not only the
   * current one, so a Pokémon no longer has to hold an evolution back to buy a pre-form move here.
   */
  dojoWide: boolean;
  /**
   * §2.9.4.1 — the Challenge Ring: its fee, what each rung pays (bottom to top), and how hard it is — rung 1
   * `firstOffset` levels above the Gym the run just beat, each later rung `stepOffset` more, rivals fielding
   * `teamSize` Pokémon. Per City, because the teams that reach Celadon are not the teams that reach Pallet.
   */
  ring: { fee: number; prizes: ({ money: number } | { relicPick: true })[]; firstOffset: number; stepOffset: number; teamSize: number };
}

export const CITIES: Record<CityId, CityDef> = {
  'pallet-town': {
    id: 'pallet-town', name: 'Pallet Town', afterRegion: 0, open: ['center', 'mart', 'dojo'], shop: 'mart', dojoMarkup: 1, dojoWide: false,
    ring: { fee: 250, prizes: [{ money: 300 }, { relicPick: true }], firstOffset: 7, stepOffset: 3, teamSize: 3 },
  },
  'celadon-city': {
    id: 'celadon-city', name: 'Celadon City', afterRegion: 1, open: ['center', 'mart', 'dojo', 'game-corner'], shop: 'department-store', dojoMarkup: 1.3, dojoWide: true,
    ring: { fee: 400, prizes: [{ money: 400 }, { money: 600 }, { relicPick: true }], firstOffset: 16, stepOffset: 4, teamSize: 4 },
  },
};

/**
 * §2.9.4.1 — what every Ring rival shares: Elite-class, so every Pokémon two-phase. How hard each City's ladder
 * is lives on the City (`ring` above); the harness holds both to the canon's clear-rate bands.
 */
export const RING = {
  phaseCount: 2 as const,
  /** §2.9.4.1 — the top prize is a Rare relic, one of three. */
  pickCount: 3,
};

/**
 * §2.11.5 — the Game Corner's two machines, printed beside them on the screen. The outcome is rolled against
 * these tables first and only then drawn (the wheel's segment, the reels), so the odds shown are the odds.
 *
 * The Wheel is the table laid out: fifty segments, each ×0, ×2, ×4 or ×8, so a uniform stop *is* the printed
 * 66 / 24 / 8 / 2 %. The Slots weigh their outcomes in thousandths: 766 / 150 / 60 / 20 / 4.
 */
export const CASINO = {
  wheel: {
    minStake: 10,
    maxStake: 200,
    step: 10,
    /** Fifty segments, interleaved so the rare ones are spread round the rim. */
    segments: [
      0, 2, 0, 0, 4, 0, 2, 0, 0, 0, 2, 0, 0, 0, 8, 0, 0, 2, 0, 4, 0, 0, 2, 0, 0,
      2, 2, 0, 0, 0, 4, 0, 0, 2, 0, 0, 0, 2, 0, 0, 2, 0, 0, 4, 0, 0, 2, 0, 2, 0,
    ] as readonly number[],
  },
  slots: {
    stake: 50,
    table: [
      { multiplier: 0, weight: 766 },
      { multiplier: 2, weight: 150 },
      { multiplier: 4, weight: 60 },
      { multiplier: 10, weight: 20 },
      { multiplier: 50, weight: 4 },
    ] as readonly { multiplier: number; weight: number }[],
    /** The three-of-a-kind that shows each paying outcome; a losing pull shows any mixed three. */
    faces: { 2: 'cherry', 4: 'bell', 10: 'bar', 50: 'seven' } as Readonly<Record<number, string>>,
    symbols: ['cherry', 'bell', 'bar', 'seven'] as readonly string[],
  },
};

/** §2.11.5 — a machine's expected value per unit staked, straight from its table. Both are under 1. */
export function casinoExpectedValue(machine: 'wheel' | 'slots'): number {
  if (machine === 'wheel') return CASINO.wheel.segments.reduce((a, m) => a + m, 0) / CASINO.wheel.segments.length;
  const total = CASINO.slots.table.reduce((a, r) => a + r.weight, 0);
  return CASINO.slots.table.reduce((a, r) => a + r.multiplier * r.weight, 0) / total;
}

/** §2.1.4 — the City that follows this Region's Gym, or null after the last Region. */
export function cityAfter(regionIndex: number): CityId | null {
  return (Object.values(CITIES).find((c) => c.afterRegion === regionIndex)?.id ?? null) as CityId | null;
}

/** §2.1 — is this the Region whose Gym ends the run? */
export const isFinalRegion = (regionIndex: number): boolean => regionIndex >= REGION_COUNT - 1;
