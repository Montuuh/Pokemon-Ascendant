import { martArt } from '@/ui/art';
import { PixelRoom } from '@/ui/components/PixelRoom';
import { SHELF_LABEL, SHOP_TEXT } from '@/ui/strings';
import { shelfCountLine, shelfTip, shopExitTip } from '@/ui/tips';
import { CLERK_SPRITE, type Room, type ShelfId } from './rooms';

// §2.11.2 — a shop as FireRed / LeafGreen drew it: the real map, the clerk behind the counter, and every piece of
// furniture a shelf you press (the room itself is \`PixelRoom\`, shared with the Trainer Hub's lobby). How much is
// left is in the bubble and the panel, not on the plate: the room reads as a shop, not a stock count. What a shelf
// holds is the screen's, what is on sale the sim's. The door (the Mart's doormat, a floor's stairs down) is the way
// back to town.

export function ShopRoom({ room, counts, chosen, onChoose, onExit, exitLabel, label }: { room: Room; counts: Record<string, number>; chosen: ShelfId; onChoose: (id: ShelfId) => void; onExit: () => void; exitLabel: string; label: string }) {
  const clerk = room.shelves.find((s) => s.sprite);
  return (
    <PixelRoom
      art={martArt(room.art)}
      w={room.w}
      h={room.h}
      label={label}
      testId="shop-room"
      chosen={chosen}
      onChoose={onChoose}
      // The maps have nobody in them: the clerk stands behind the counter.
      sprites={clerk?.sprite ? [{ src: martArt('clerk'), at: [...clerk.sprite, CLERK_SPRITE[0], CLERK_SPRITE[1]] }] : []}
      spots={room.shelves.map((shelf) => {
        const count = counts[shelf.id] ?? 0;
        return {
          id: shelf.id,
          boxes: shelf.boxes,
          label: SHELF_LABEL[shelf.id],
          ariaLabel: `${SHELF_LABEL[shelf.id]}, ${shelfCountLine(shelf.id, count)}`,
          tip: shelfTip(shelf.id, count),
          testId: `shelf-${shelf.id}`,
          ...(shelf.plate ? { plate: shelf.plate } : {}),
        };
      })}
      exit={{ box: room.exit, label: exitLabel, plate: SHOP_TEXT.exit, tip: shopExitTip(exitLabel, true), testId: 'shop-exit', onExit }}
    />
  );
}
