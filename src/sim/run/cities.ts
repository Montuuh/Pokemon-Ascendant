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
}

export const CITIES: Record<CityId, CityDef> = {
  'pallet-town': { id: 'pallet-town', name: 'Pallet Town', afterRegion: 0, open: ['center', 'mart', 'dojo'], shop: 'mart', dojoMarkup: 1 },
  'celadon-city': { id: 'celadon-city', name: 'Celadon City', afterRegion: 1, open: ['center', 'mart', 'dojo'], shop: 'department-store', dojoMarkup: 1.3 },
};

/** §2.1.4 — the City that follows this Region's Gym, or null after the last Region. */
export function cityAfter(regionIndex: number): CityId | null {
  return (Object.values(CITIES).find((c) => c.afterRegion === regionIndex)?.id ?? null) as CityId | null;
}

/** §2.1 — is this the Region whose Gym ends the run? */
export const isFinalRegion = (regionIndex: number): boolean => regionIndex >= REGION_COUNT - 1;
