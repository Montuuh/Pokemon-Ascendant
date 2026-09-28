import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { martArt } from '@/ui/art';
import { SHELF_LABEL, SHOP_TEXT } from '@/ui/strings';
import { shelfCountLine, shelfTip, shopExitTip } from '@/ui/tips';
import { useTip } from '@/ui/tooltip';
import { CLERK_SPRITE, type Box, type Room, type Shelf, type ShelfId } from './rooms';
import styles from './ShopRoom.module.css';

// §2.11.2 — a shop as FireRed / LeafGreen drew it: the real map, the clerk behind the counter, and every piece of
// furniture a shelf you press. A shelf's first piece wears its name plate; the others are the same shelf for the
// pointer and hidden from the accessibility tree. How much is left is in the bubble and the panel, not on the plate:
// the room reads as a shop, not a stock count. The room only asks — what a shelf holds is the screen's, what is on
// sale the sim's. The door (the Mart's doormat, a floor's stairs down) is the way back to town.
//
// A shelf lights as **one shape**: its pieces are drawn into an SVG over the map and outlined together by a filter
// that grows their union by one and two map pixels, so the clerk and the L of the counter read as one thing, and the
// outline is in the map's own pixels. The buttons stay rectangles, for the pointer and the keyboard only.
//
// The map is drawn at the largest whole-pixel scale its box allows, so every pixel is square (D9); only a box too
// small for ×2 shrinks it freely, as the Game Corner's room does, rather than drop to a postage stamp at ×1.

/** Where a plate hangs when centred under its piece would crowd a neighbour's or leave the room. */
const PLATE = { raised: styles.plateRaised, 'raised-right': styles.plateRaisedRight } as const;

/** The frame's border, outside the map's pixels. */
const FRAME = 3;

export function ShopRoom({ room, counts, chosen, onChoose, onExit, exitLabel, label }: { room: Room; counts: Record<string, number>; chosen: ShelfId; onChoose: (id: ShelfId) => void; onExit: () => void; exitLabel: string; label: string }) {
  const box = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(2);
  // The shelf under the pointer and the one holding the keyboard's focus, kept apart so the pointer passing by
  // never wipes the focus's light. The door counts as a shape too.
  const [hovered, setHovered] = useState<ShelfId | 'exit' | null>(null);
  const [focused, setFocused] = useState<ShelfId | 'exit' | null>(null);
  const uid = useId().replace(/:/g, '');
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
  const clerk = room.shelves.find((s) => s.sprite);
  const lit = (id: ShelfId | 'exit') => (id === chosen ? 'chosen' : id === hovered || id === focused ? 'near' : null);
  const exitLit = lit('exit');

  return (
    <section ref={box} className={styles.room} aria-label={label} data-testid="shop-room" data-scale={scale}>
      <div className={styles.floor} style={{ width: room.w * scale + FRAME * 2, height: room.h * scale + FRAME * 2 }}>
        <img className={styles.art} src={martArt(room.art)} alt="" draggable={false} />
        {/* The maps have nobody in them: the clerk stands behind the counter. */}
        {clerk?.sprite && <img className={styles.sprite} style={place([...clerk.sprite, CLERK_SPRITE[0], CLERK_SPRITE[1]])} src={martArt('clerk')} alt="" draggable={false} />}

        {/* Each shelf's pieces as one shape, outlined together while it is chosen or the pointer is on it. */}
        <svg className={styles.shapes} viewBox={`0 0 ${room.w} ${room.h}`} aria-hidden="true">
          <defs>
            {(['near', 'chosen'] as const).map((k) => (
              <filter key={k} id={`${uid}-${k}`} filterUnits="userSpaceOnUse" x={-3} y={-3} width={room.w + 6} height={room.h + 6}>
                <feMorphology in="SourceAlpha" operator="dilate" radius="1" result="one" />
                <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="two" />
                <feComposite in="one" in2="SourceAlpha" operator="out" result="inner" />
                <feComposite in="two" in2="one" operator="out" result="outer" />
                <feFlood className={styles[`${k}Inner`]} />
                <feComposite in2="inner" operator="in" result="innerColour" />
                <feFlood className={styles[`${k}Outer`]} />
                <feComposite in2="outer" operator="in" result="outerColour" />
                <feMerge>
                  <feMergeNode in="outerColour" />
                  <feMergeNode in="innerColour" />
                </feMerge>
              </filter>
            ))}
          </defs>
          {room.shelves.map((shelf) => {
            const state = lit(shelf.id);
            return (
              <g key={shelf.id} filter={state ? `url(#${uid}-${state})` : undefined} data-shape={shelf.id} data-state={state ?? undefined}>
                {state && shelf.boxes.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} className={styles.piece} />)}
              </g>
            );
          })}
          <g filter={exitLit ? `url(#${uid}-${exitLit})` : undefined} data-shape="exit" data-state={exitLit ?? undefined}>
            {exitLit && <rect x={room.exit[0]} y={room.exit[1]} width={room.exit[2]} height={room.exit[3]} className={styles.piece} />}
          </g>
        </svg>

        {room.shelves.map((shelf) =>
          shelf.boxes.map((b, i) => (
            <ShelfSpot key={`${shelf.id}-${i}`} shelf={shelf} first={i === 0} style={place(b)} count={counts[shelf.id] ?? 0} chosen={chosen === shelf.id} onChoose={onChoose} onHover={setHovered} onFocus={setFocused} />
          )),
        )}
        <ExitSpot style={place(room.exit)} onExit={onExit} label={exitLabel} onHover={setHovered} onFocus={setFocused} />
      </div>
    </section>
  );
}

type Near = (id: ShelfId | 'exit' | null) => void;

function ShelfSpot({ shelf, first, style, count, chosen, onChoose, onHover, onFocus }: { shelf: Shelf; first: boolean; style: CSSProperties; count: number; chosen: boolean; onChoose: (id: ShelfId) => void; onHover: Near; onFocus: Near }) {
  const name = SHELF_LABEL[shelf.id];
  const tip = useTip(shelfTip(shelf.id, count));
  return (
    <button
      type="button"
      className={styles.spot}
      style={style}
      onClick={() => onChoose(shelf.id)}
      aria-pressed={chosen}
      aria-label={`${name}, ${shelfCountLine(shelf.id, count)}`}
      // One Tab stop and one name a shelf: its first piece. The rest are the same shelf for the pointer.
      tabIndex={first ? undefined : -1}
      aria-hidden={first ? undefined : true}
      data-testid={first ? `shelf-${shelf.id}` : undefined}
      {...tip}
      {...lightOn(tip, shelf.id, onHover, onFocus)}
    >
      {first && <span className={`${styles.plate} ${chosen ? styles.plateChosen : ''} ${shelf.plate ? PLATE[shelf.plate] : ''}`}>{name}</span>}
    </button>
  );
}

/** The way out: the Mart's doormat, a floor's stairs down. It lights like a shelf, never gold: it is never chosen. */
function ExitSpot({ style, onExit, label, onHover, onFocus }: { style: CSSProperties; onExit: () => void; label: string; onHover: Near; onFocus: Near }) {
  const tip = useTip(shopExitTip(label, true));
  return (
    <button type="button" className={`${styles.spot} ${styles.exit}`} style={style} onClick={onExit} aria-label={label} data-testid="shop-exit" {...tip} {...lightOn(tip, 'exit', onHover, onFocus)}>
      <span className={styles.plate}>
        <IconArrowLeft size={14} aria-hidden="true" /> {SHOP_TEXT.exit}
      </span>
    </button>
  );
}

/** A spot's pointer and focus handlers: the bubble's, and the room's light on its shape. */
function lightOn(tip: ReturnType<typeof useTip>, id: ShelfId | 'exit', onHover: Near, onFocus: Near) {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      tip.onMouseEnter(e);
      onHover(id);
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      tip.onMouseLeave(e);
      onHover(null);
    },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      tip.onFocus(e);
      onFocus(id);
    },
    onBlur: (e: FocusEvent<HTMLElement>) => {
      tip.onBlur(e);
      onFocus(null);
    },
  };
}
