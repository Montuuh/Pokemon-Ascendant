import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { IconCoins } from '@tabler/icons-react';
import { martArt } from '@/ui/art';
import { SHELF_LABEL } from '@/ui/strings';
import { shelfCountLine, shelfTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import type { Box, Room, Shelf, ShelfId } from './rooms';
import styles from './ShopRoom.module.css';

// §2.11.2 — a shop as FireRed / LeafGreen drew it: the real map, and every piece of furniture a shelf you press. A
// shelf's first piece wears its name plate and how much is still on it (at a counter, how much you could sell); the
// others are the same shelf for the pointer and hidden from the accessibility tree. The room only asks — what a
// shelf holds is the screen's, what is on sale the sim's.
//
// The map is drawn at the largest whole-pixel scale its box allows, so every pixel is square (D9); only a box too
// small for ×2 shrinks it freely, as the Game Corner's room does, rather than drop to a postage stamp at ×1.

/** Where a plate hangs when centred under its piece would crowd a neighbour's or leave the room. */
const PLATE = { top: styles.plateTop, 'top-right': styles.plateTopRight, left: styles.plateLeft, right: styles.plateRight } as const;

/** The frame's border, outside the map's pixels. */
const FRAME = 3;

export function ShopRoom({ room, counts, chosen, onChoose, label }: { room: Room; counts: Record<string, number>; chosen: ShelfId; onChoose: (id: ShelfId) => void; label: string }) {
  const box = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(2);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const fitIn = Math.min((el.clientWidth - FRAME * 2) / room.w, (el.clientHeight - FRAME * 2) / room.h);
      setScale(fitIn >= 2 ? Math.min(4, Math.floor(fitIn)) : Math.max(1, fitIn));
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [room.w, room.h]);

  const place = ([x, y, w, h]: Box): CSSProperties => ({
    left: `${(x / room.w) * 100}%`,
    top: `${(y / room.h) * 100}%`,
    width: `${(w / room.w) * 100}%`,
    height: `${(h / room.h) * 100}%`,
  });
  return (
    <section ref={box} className={styles.room} aria-label={label} data-testid="shop-room" data-scale={scale}>
      <div className={styles.floor} style={{ width: room.w * scale + FRAME * 2, height: room.h * scale + FRAME * 2 }}>
        <img className={styles.art} src={martArt(room.art)} alt="" draggable={false} />
        {room.shelves.map((shelf) =>
          shelf.boxes.map((b, i) => (
            <ShelfSpot key={`${shelf.id}-${i}`} shelf={shelf} first={i === 0} style={place(b)} count={counts[shelf.id] ?? 0} chosen={chosen === shelf.id} onChoose={onChoose} />
          )),
        )}
      </div>
    </section>
  );
}

function ShelfSpot({ shelf, first, style, count, chosen, onChoose }: { shelf: Shelf; first: boolean; style: CSSProperties; count: number; chosen: boolean; onChoose: (id: ShelfId) => void }) {
  const name = SHELF_LABEL[shelf.id];
  const tip = useTip(shelfTip(shelf.id, count));
  // A counter that only buys back counts what you could sell, and wears a coin to say so.
  const selling = shelf.id === 'counter';
  return (
    <button
      type="button"
      className={`${styles.spot} ${chosen ? styles.chosen : ''}`}
      style={style}
      onClick={() => onChoose(shelf.id)}
      aria-pressed={chosen}
      aria-label={`${name}, ${shelfCountLine(shelf.id, count)}`}
      // One Tab stop and one name a shelf: its first piece. The rest are the same shelf for the pointer.
      tabIndex={first ? undefined : -1}
      aria-hidden={first ? undefined : true}
      data-testid={first ? `shelf-${shelf.id}` : undefined}
      {...tip}
    >
      {first && (
        <span className={`${styles.plate} ${shelf.plate ? PLATE[shelf.plate] : ''}`}>
          {name}
          {(!shelf.buysBack || count > 0) && (
            <b className={`${styles.count} tabular`}>
              {selling && <IconCoins size={12} aria-hidden="true" />}
              {count}
            </b>
          )}
        </span>
      )}
    </button>
  );
}
