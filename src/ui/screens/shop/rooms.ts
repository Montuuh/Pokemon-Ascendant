import type { ContentRegistry, ShopSlot, StoreFloor } from '@/sim';

// §2.11.2 — the Poké Mart and the Department Store's floors as FireRed / LeafGreen drew them (`npm run art:mart`).
// This file owns only the drawing: which piece of furniture is which shelf, as boxes in the map's own pixels, and
// which of the sim's slots each shelf holds. What is on sale is the sim's (`rollShopStock`); a slot is placed on a
// shelf by what it is, so a new kind of slot only needs a shelf that accepts it.
//
// Every room has a **clerk** behind its counter (the user's call, 2026-09-28): the one who sells you everything the
// room has — the whole Mart, or the whole floor — and buys held items back. The Poké Balls have no shelf of their
// own; they are the clerk's.

/** A box in a map's pixels: left, top, width, height. */
export type Box = readonly [number, number, number, number];

export type ShelfId =
  | 'clerk'
  | 'medicine'
  | 'rare-medicine'
  | 'tms'
  | 'held'
  | 'stones'
  | 'relics'
  | 'relics-common'
  | 'relics-uncommon'
  | 'relics-rare';

export interface Shelf {
  id: ShelfId;
  /** The furniture that is this shelf. The first box wears the name plate and takes the Tab stop. */
  boxes: readonly Box[];
  /** Whether a slot sits on this shelf. The clerk sells everything, but only the Poké Balls sit with them. */
  holds: (slot: ShopSlot, content: ContentRegistry) => boolean;
  /** Where the name plate hangs: under its piece, centred, unless it would crowd a neighbour's or leave the room. */
  plate?: 'top' | 'top-right';
}

export interface Room {
  art: 'mart' | 'floor-1' | 'floor-2' | 'floor-3' | 'floor-4' | 'floor-5';
  w: number;
  h: number;
  /** Every room's shelves, the clerk among them: the clerk's first box is where their sprite stands. */
  shelves: readonly Shelf[];
}

/** The clerk's sprite, in the map's pixels (`public/art/mart/clerk.png`). */
const CLERK_SIZE = [14, 20] as const;

/** The clerk and the counter they stand behind: one shelf, the clerk's box first so their plate hangs there. */
const clerk = ([x, y]: readonly [number, number], counter: readonly Box[]): Shelf => ({
  id: 'clerk',
  boxes: [[x, y, CLERK_SIZE[0], CLERK_SIZE[1]], ...counter],
  holds: (s) => s.kind === 'ball',
});

const kind = (k: ShopSlot['kind']) => (s: ShopSlot) => s.kind === k;
const consumableTier = (atLeast: number, below: number) => (s: ShopSlot, c: ContentRegistry) =>
  s.kind === 'consumable' && c.consumable(s.id).tier >= atLeast && c.consumable(s.id).tier < below;
const relicOf = (common: boolean | null) => (s: ShopSlot, c: ContentRegistry) =>
  s.kind === 'relic' && (common === null || (c.relic(s.id).rarity === 'common') === common);

/** A floor 208 px wide, mirrored: the same furniture, on the other side of the room. */
const mirror = (boxes: readonly Box[]): Box[] => boxes.map(([x, y, w, h]) => [208 - x - w, y, w, h] as const);

// FRLG's floor furniture, in the maps' pixels.
const F2 = {
  counter: [[0, 136, 48, 24], [32, 72, 16, 72]] as Box[],
  wall: [[160, 68, 48, 28]] as Box[],
  shelvesNear: [[112, 120, 32, 56], [112, 184, 32, 56]] as Box[],
  shelvesFar: [[160, 120, 32, 56], [160, 184, 32, 56]] as Box[],
  glass: [[16, 168, 48, 24], [16, 200, 48, 24]] as Box[],
};
const F4 = {
  counter: [[0, 184, 112, 20], [112, 184, 16, 56]] as Box[],
  wall: [[160, 68, 48, 28]] as Box[],
  shelf: [[16, 104, 32, 56]] as Box[],
  glassTop: [[80, 104, 48, 24], [144, 104, 48, 24]] as Box[],
  glassBottom: [[80, 136, 48, 24], [144, 136, 48, 24]] as Box[],
};
const F5 = {
  counter: [[0, 120, 48, 24], [32, 72, 16, 56]] as Box[],
  wall: [[160, 68, 48, 28]] as Box[],
  fridges: [[112, 124, 32, 36], [160, 124, 32, 36], [112, 188, 32, 36], [160, 188, 32, 36]] as Box[],
  shelves: [[16, 168, 32, 56], [64, 168, 32, 56]] as Box[],
};

/**
 * Pallet Town's Poké Mart: the clerk sells everything and buys items back, the back wall's stocked shelves
 * are Medicine, its glass cases the TMs, the glass table by the door the Relics, and the two shelves on the floor
 * the Held items and the Evolution stones.
 */
export const MART: Room = {
  art: 'mart',
  w: 176,
  h: 132,
  shelves: [
    { id: 'medicine', boxes: [[112, 12, 48, 30]], holds: consumableTier(0, 99) },
    clerk([32, 40], [[0, 60, 48, 20], [48, 24, 16, 56]]),
    { id: 'tms', boxes: [[64, 8, 48, 24]], holds: kind('tm') },
    { id: 'relics', boxes: [[16, 90, 32, 22]], holds: relicOf(null) },
    { id: 'held', boxes: [[112, 58, 32, 52]], holds: kind('held-item') },
    { id: 'stones', boxes: [[160, 58, 16, 52]], holds: kind('stone'), plate: 'top-right' },
  ],
};

/**
 * The Department Store, a floor a room (§2.11.2): 1F is FRLG's drugstore, 2F its TM floor, 3F and 5F its gift and
 * TM floors mirrored, 4F its gift floor. Every floor's clerk sells the whole floor and buys items back.
 */
export const STORE: Record<StoreFloor, Room> = {
  consumables: {
    art: 'floor-1',
    w: 208,
    h: 240,
    shelves: [
      { id: 'medicine', boxes: [...F5.fridges, ...F5.shelves, ...F5.wall], holds: consumableTier(0, 4) },
      clerk([16, 96], F5.counter),
    ],
  },
  tms: {
    art: 'floor-2',
    w: 208,
    h: 240,
    shelves: [
      { id: 'tms', boxes: [...F2.shelvesNear, ...F2.shelvesFar, ...F2.glass, ...F2.wall], holds: kind('tm') },
      clerk([16, 108], F2.counter),
    ],
  },
  'held-items': {
    art: 'floor-3',
    w: 208,
    h: 240,
    shelves: [
      { id: 'held', boxes: mirror([...F4.glassTop, ...F4.glassBottom, ...F4.shelf, ...F4.wall]), holds: kind('held-item') },
      clerk([145, 212], mirror(F4.counter)),
    ],
  },
  relics: {
    art: 'floor-4',
    w: 208,
    h: 240,
    shelves: [
      { id: 'relics-common', boxes: F4.glassTop, holds: relicOf(true) },
      { id: 'relics-uncommon', boxes: F4.glassBottom, holds: relicOf(false) },
      clerk([49, 212], F4.counter),
    ],
  },
  rare: {
    art: 'floor-5',
    w: 208,
    h: 240,
    shelves: [
      { id: 'relics-rare', boxes: mirror(F2.glass), holds: relicOf(null) },
      // Over its shelf, not under: the rare medicine's plate hangs under the shelf beside it.
      { id: 'stones', boxes: mirror(F2.shelvesNear), holds: kind('stone'), plate: 'top' },
      { id: 'rare-medicine', boxes: mirror([...F2.shelvesFar, ...F2.wall]), holds: consumableTier(4, 99) },
      clerk([178, 108], mirror(F2.counter)),
    ],
  },
};

/** The shelf a slot sits on in this room: the first that holds it, or the clerk's counter as a last resort. */
export function shelfOf(room: Room, slot: ShopSlot, content: ContentRegistry): ShelfId {
  return room.shelves.find((s) => s.holds(slot, content))?.id ?? 'clerk';
}
