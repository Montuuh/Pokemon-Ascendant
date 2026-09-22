import type { CityBuilding, CityId } from '@/sim';
import type { CityDoor } from '@/ui/strings';

// §2.11 — where each door sits on a City's background. The sim owns which doors are open (`CITIES[id].open`);
// this file owns only the drawing: a box over each building, as percentages of the 16:9 art, so the doors stay
// on their buildings at every window size. Measured off the installed 1920×1080 PNG — when the art is redrawn
// (v1.2 builds the towns from tilesets), these boxes are redrawn with it.

export interface DoorPlacement {
  door: CityDoor;
  /** The sim building behind the door, if it has one yet. A door without one is in development (§2.11.0). */
  building?: CityBuilding;
  /** left, top, width, height — percent of the art. */
  box: readonly [number, number, number, number];
  /** Which edge of the box the name plate hangs from, so it never covers the building's face. */
  plate: 'top' | 'bottom';
}

export interface TownLayout {
  doors: readonly DoorPlacement[];
}

export const TOWNS: Record<CityId, TownLayout> = {
  // public/art/towns/pallet-town.png — Center top-left, Mart top-right, Dojo bottom-left, the Safari lodge
  // behind its palisade bottom-right, and the road out at the top. The court in the square is scenery: the
  // Challenge Ring's door is inside the Dojo (§2.9.4.1, §2.11.4).
  'pallet-town': {
    doors: [
      { door: 'center', building: 'center', box: [9.6, 5.5, 13.6, 23.6], plate: 'bottom' },
      { door: 'mart', building: 'mart', box: [77.1, 7.9, 10, 21.3], plate: 'bottom' },
      { door: 'dojo', building: 'dojo', box: [2.9, 41.2, 23.7, 32.4], plate: 'bottom' },
      { door: 'safari', box: [72, 43, 26, 44], plate: 'top' },
      { door: 'gate', box: [44.5, 0, 11, 13], plate: 'bottom' },
    ],
  },
  // public/art/towns/celadon-city.png — the Center top-left, the Department Store's tower top-right, the Dojo
  // bottom-left, the Game Corner with the stairs down to the Black Market beside it, the Safari lodge on the
  // east edge, and the avenue out at the top. The plaza's court is scenery, as in Pallet Town.
  'celadon-city': {
    doors: [
      { door: 'center', building: 'center', box: [6.3, 11.6, 11.7, 18.5], plate: 'bottom' },
      { door: 'department-store', building: 'mart', box: [51.6, 3.5, 23.4, 40], plate: 'bottom' },
      { door: 'dojo', building: 'dojo', box: [6.1, 65.6, 13.8, 23.8], plate: 'bottom' },
      { door: 'game-corner', box: [50.8, 66.7, 16.9, 22.3], plate: 'bottom' },
      { door: 'black-market', box: [70, 75.7, 6, 13.6], plate: 'top' },
      { door: 'safari', box: [82, 15.7, 17.5, 52.8], plate: 'top' },
      { door: 'gate', box: [31, 0, 8.5, 14], plate: 'bottom' },
    ],
  },
};
