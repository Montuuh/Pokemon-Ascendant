import type { CityBuilding, CityId, WheelBet } from './types';

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
  /**
   * §2.11.4 — the open buildings. The Dojo's extra moves are not open yet; the Black Market is not a building
   * here but a secret inside the Game Corner (`blackMarket`).
   */
  open: readonly CityBuilding[];
  /** §2.9.4.1 — what this City calls its Ring: the town's Challenge Ring, the city's Pokémon Coliseum. */
  ringName: string;
  /** §2.11.6 — Team Rocket's Black Market lies beneath this City's Game Corner. */
  blackMarket: boolean;
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
   * Celadon's rivals are Region 2's rosters since v0.7.3 — final forms, where Region 1's had been evolved up —
   * so its ladder was retuned then: rivals of 3 rather than 4, which moved rung 1 far more than any level did.
   * v0.8.5: both offsets +4, the levels the Gym's premium dropped (§5.6.3), so the Ring stands where it stood.
   * v0.8.6 (the user's call: the route ran over-levelled and the Ring then under-levelled): XP was cut (groups pay
   * extra enemies at 75 %), and a rival now fights like an Elite — **two at a time** (`RING.onField`) — so the
   * ladder's difficulty is its shape, not a wall of levels. Pallet: four Pokémon, +7, +2 a rung; Celadon: three,
   * +5, no step. Measured: Pallet rung 1 0.75, ladder 0.18; Celadon rung 1 0.71, rung 2 0.21, ladder 0.03.
   * v0.8.7: the 20-column route sends stronger teams into both Cities, so Pallet's step is +4 and Celadon's first rung
   * +5. Measured: Pallet rung 1 0.80, ladder 0.23; Celadon rung 1 0.72, rung 2 0.30, ladder 0.14. The Ring's real
   * retune is v0.8.8's.
   */
  ring: { fee: number; prizes: ({ money: number } | { relicPick: true })[]; firstOffset: number; stepOffset: number; teamSize: number };
}

export const CITIES: Record<CityId, CityDef> = {
  'pallet-town': {
    id: 'pallet-town', name: 'Pallet Town', afterRegion: 0, open: ['center', 'mart', 'dojo', 'ring', 'safari'], ringName: 'Challenge Ring', blackMarket: false, shop: 'mart', dojoMarkup: 1, dojoWide: false,
    ring: { fee: 250, prizes: [{ money: 300 }, { relicPick: true }], firstOffset: 5, stepOffset: 4, teamSize: 4 },
  },
  'celadon-city': {
    id: 'celadon-city', name: 'Celadon City', afterRegion: 1, open: ['center', 'mart', 'dojo', 'ring', 'game-corner', 'safari'], ringName: 'Pokémon Coliseum', blackMarket: true, shop: 'department-store', dojoMarkup: 1.3, dojoWide: true,
    // §2.9.4.1 — +8 since v0.8.10 (Region 2's thinner tier read rung 1 at 0.64 at +6); +9 since v0.9.10 (Shell Armor as a share: 0.81 at +8).
    ring: { fee: 400, prizes: [{ money: 400 }, { money: 600 }, { relicPick: true }], firstOffset: 9, stepOffset: 2, teamSize: 3 },
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
  /** §2.9.4.1 — how many of a rival's Pokémon stand at once: two, like an Elite (v0.8.6). */
  onField: 2 as const,
  /**
   * §2.9.4.1 — a Ring rival hits harder than the route, not higher (v0.8.6): its Attack is ×this on top of the
   * Region's tier, so the ladder stays hard while its levels stand a few over the team instead of a wall above it.
   */
  attackMultiplier: 1.7,
};

/**
 * §2.11.5 — the Game Corner's two machines, printed beside them on the screen. The outcome is rolled against
 * these tables first and only then drawn (the ball's pocket, the reels), so the odds shown are the odds.
 *
 * The Roulette is the classic European wheel: 37 pockets in their real order round the rim, 18 red, 18 black and
 * the one green zero, and a bet on a colour. A uniform stop *is* 18/37 · 18/37 · 1/37, and each colour pays so that
 * every bet carries the wheel's own edge, 1/37. The Slots weigh their outcomes in thousandths: 766 / 150 / 60 / 20 / 4.
 */
export const CASINO = {
  wheel: {
    minStake: 10,
    maxStake: 200,
    step: 10,
    /** The European wheel's pockets, clockwise from the zero, as the real rim has them. */
    pockets: [
      0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
      5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
    ] as readonly number[],
    /** The red numbers; every other number but zero is black. */
    red: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36] as readonly number[],
    /** What a winning bet pays, as a multiple of its stake (the stake included). */
    pays: { red: 2, black: 2, green: 36 } as Readonly<Record<WheelBet, number>>,
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

/** §2.11.5 — the colour a Roulette number wears: the zero is green, the rest red or black as on the real wheel. */
export function pocketColour(n: number): WheelBet {
  if (n === 0) return 'green';
  return CASINO.wheel.red.includes(n) ? 'red' : 'black';
}

/** §2.11.5 — a Roulette bet's chance: the share of the rim's pockets that wear its colour. */
export function betChance(bet: WheelBet): number {
  return CASINO.wheel.pockets.filter((n) => pocketColour(n) === bet).length / CASINO.wheel.pockets.length;
}

/** §2.11.5 — a machine's expected value per unit staked, straight from its table. Every one is under 1. */
export function casinoExpectedValue(machine: 'wheel' | 'slots', bet: WheelBet = 'red'): number {
  if (machine === 'wheel') return betChance(bet) * CASINO.wheel.pays[bet];
  const total = CASINO.slots.table.reduce((a, r) => a + r.weight, 0);
  return CASINO.slots.table.reduce((a, r) => a + r.multiplier * r.weight, 0) / total;
}

/** §2.1.4 — the City that follows this Region's Gym, or null after the last Region. */
export function cityAfter(regionIndex: number): CityId | null {
  return (Object.values(CITIES).find((c) => c.afterRegion === regionIndex)?.id ?? null) as CityId | null;
}

/** §2.1 — is this the Region whose Gym ends the run? */
export const isFinalRegion = (regionIndex: number): boolean => regionIndex >= REGION_COUNT - 1;
