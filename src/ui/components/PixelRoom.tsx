import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { IconArrowLeft } from '@tabler/icons-react';
import { useTip } from '@/ui/tooltip';
import styles from './PixelRoom.module.css';

// A room as FireRed / LeafGreen drew it: the real map at a whole-pixel scale, the people the map has no room for
// drawn in it, and every piece of furniture a **spot** you press. The Poké Mart's floors (§2.11.2) and the Trainer
// Hub's lobby (§8.4) are both this: the room only asks; what a spot opens is the screen's.
//
// A spot lights as **one shape**: its pieces are drawn into an SVG over the map and outlined together by a filter that
// grows their union by one and two map pixels, so a clerk and the L of a counter read as one thing, and the outline is
// in the map's own pixels. The buttons stay rectangles, for the pointer and the keyboard only. A spot's first piece
// wears its name plate and takes the Tab stop; the others are the same spot for the pointer and hidden from the
// accessibility tree.
//
// The map is drawn at the largest whole-pixel scale its box allows, so every pixel is square (D9); only a box too small
// for ×2 shrinks it freely rather than drop to a postage stamp at ×1.

/** A box in a map's pixels: left, top, width, height. */
export type Box = readonly [number, number, number, number];

export interface RoomSpot<Id extends string> {
  id: Id;
  /** The furniture that is this spot. The first box wears the name plate and takes the Tab stop. */
  boxes: readonly Box[];
  /** The plate's text. */
  label: string;
  /** The button's accessible name, when it says more than the plate. */
  ariaLabel?: string;
  /** The bubble on hover and focus. */
  tip: ReactNode;
  testId?: string;
  /** Where the plate hangs: under its piece, centred; `raised` lifts it into the bottom of its piece. */
  plate?: 'raised' | 'raised-right';
}

/** Someone the map has no room for, standing in it: a sprite and its top-left in the map's pixels. */
export interface RoomSprite {
  src: string;
  at: Box;
}

/** The way out: a doormat, the stairs down. It lights like a spot, never gold: it is never chosen. */
export interface RoomExit {
  box: Box;
  /** The button's accessible name. */
  label: string;
  /** The plate's text, when shorter than the name. */
  plate?: string;
  tip: ReactNode;
  testId: string;
}

const PLATE = { raised: styles.plateRaised, 'raised-right': styles.plateRaisedRight } as const;

/** The frame's border, outside the map's pixels. */
const FRAME = 3;

export function PixelRoom<Id extends string>({ art, w, h, spots, sprites = [], exit, chosen = null, onChoose, label, testId, maxScale = 4, frame = 'box' }: {
  art: string;
  w: number;
  h: number;
  spots: readonly RoomSpot<Id>[];
  sprites?: readonly RoomSprite[];
  exit?: RoomExit & { onExit: () => void };
  chosen?: Id | null;
  onChoose: (id: Id) => void;
  label: string;
  testId: string;
  maxScale?: number;
  /**
   * `box`: a bordered rectangle round the map (the shops). `silhouette`: no box — an ink outline drawn round the
   * map's own shape, for a room that is not a rectangle (the Hub's L-shaped lobby), so the frame never draws a shape
   * the games did not.
   */
  frame?: 'box' | 'silhouette';
}) {
  const box = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(2);
  // The spot under the pointer and the one holding the keyboard's focus, kept apart so the pointer passing by never
  // wipes the focus's light. The way out counts as a shape too.
  const [hovered, setHovered] = useState<Id | 'exit' | null>(null);
  const [focused, setFocused] = useState<Id | 'exit' | null>(null);
  const uid = useId().replace(/:/g, '');
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const fitIn = Math.min((el.clientWidth - FRAME * 2) / w, (el.clientHeight - FRAME * 2) / h);
      setScale(fitIn >= 2 ? Math.min(maxScale, Math.floor(fitIn)) : Math.max(1, fitIn));
    };
    fit();
    const watch = new ResizeObserver(fit);
    watch.observe(el);
    return () => watch.disconnect();
  }, [w, h, maxScale]);

  const place = ([x, y, bw, bh]: Box): CSSProperties => ({
    left: `${(x / w) * 100}%`,
    top: `${(y / h) * 100}%`,
    width: `${(bw / w) * 100}%`,
    height: `${(bh / h) * 100}%`,
  });
  const lit = (id: Id | 'exit') => (id === chosen ? 'chosen' : id === hovered || id === focused ? 'near' : null);
  const exitLit = exit ? lit('exit') : null;

  return (
    <section ref={box} className={styles.room} aria-label={label} data-testid={testId} data-scale={scale}>
      <div className={`${styles.floor} ${frame === 'silhouette' ? styles.silhouette : ''}`} style={{ width: w * scale + FRAME * 2, height: h * scale + FRAME * 2 }}>
        <img className={styles.art} src={art} alt="" draggable={false} />
        {sprites.map((s, i) => (
          <img key={i} className={styles.sprite} style={place(s.at)} src={s.src} alt="" draggable={false} />
        ))}

        {/* Each spot's pieces as one shape, outlined together while it is chosen or the pointer is on it. */}
        <svg className={styles.shapes} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          <defs>
            {(['near', 'chosen'] as const).map((k) => (
              <filter key={k} id={`${uid}-${k}`} filterUnits="userSpaceOnUse" x={-3} y={-3} width={w + 6} height={h + 6}>
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
          {spots.map((spot) => {
            const state = lit(spot.id);
            return (
              <g key={spot.id} filter={state ? `url(#${uid}-${state})` : undefined} data-shape={spot.id} data-state={state ?? undefined}>
                {state && spot.boxes.map(([x, y, bw, bh], i) => <rect key={i} x={x} y={y} width={bw} height={bh} className={styles.piece} />)}
              </g>
            );
          })}
          {exit && (
            <g filter={exitLit ? `url(#${uid}-${exitLit})` : undefined} data-shape="exit" data-state={exitLit ?? undefined}>
              {exitLit && <rect x={exit.box[0]} y={exit.box[1]} width={exit.box[2]} height={exit.box[3]} className={styles.piece} />}
            </g>
          )}
        </svg>

        {spots.map((spot) =>
          spot.boxes.map((b, i) => (
            <Spot key={`${spot.id}-${i}`} spot={spot} first={i === 0} style={place(b)} chosen={chosen === spot.id} onChoose={onChoose} onHover={setHovered} onFocus={setFocused} />
          )),
        )}
        {exit && <ExitSpot<Id> exit={exit} style={place(exit.box)} onHover={setHovered} onFocus={setFocused} />}
      </div>
    </section>
  );
}

type Near<Id> = (id: Id | 'exit' | null) => void;

function Spot<Id extends string>({ spot, first, style, chosen, onChoose, onHover, onFocus }: { spot: RoomSpot<Id>; first: boolean; style: CSSProperties; chosen: boolean; onChoose: (id: Id) => void; onHover: Near<Id>; onFocus: Near<Id> }) {
  const tip = useTip(spot.tip);
  return (
    <button
      type="button"
      className={styles.spot}
      style={style}
      onClick={() => onChoose(spot.id)}
      aria-pressed={chosen}
      aria-label={spot.ariaLabel ?? spot.label}
      // One Tab stop and one name a spot: its first piece. The rest are the same spot for the pointer.
      tabIndex={first ? undefined : -1}
      aria-hidden={first ? undefined : true}
      data-testid={first ? spot.testId : undefined}
      {...tip}
      {...lightOn(tip, spot.id, onHover, onFocus)}
    >
      {first && <span className={`${styles.plate} ${chosen ? styles.plateChosen : ''} ${spot.plate ? PLATE[spot.plate] : ''}`}>{spot.label}</span>}
    </button>
  );
}

function ExitSpot<Id extends string>({ exit, style, onHover, onFocus }: { exit: RoomExit & { onExit: () => void }; style: CSSProperties; onHover: Near<Id>; onFocus: Near<Id> }) {
  const tip = useTip(exit.tip);
  return (
    <button type="button" className={`${styles.spot} ${styles.exit}`} style={style} onClick={exit.onExit} aria-label={exit.label} data-testid={exit.testId} {...tip} {...lightOn(tip, 'exit' as const, onHover, onFocus)}>
      <span className={styles.plate}>
        <IconArrowLeft size={14} aria-hidden="true" /> {exit.plate ?? exit.label}
      </span>
    </button>
  );
}

/** A spot's pointer and focus handlers: the bubble's, and the room's light on its shape. */
function lightOn<Id>(tip: ReturnType<typeof useTip>, id: Id | 'exit', onHover: Near<Id>, onFocus: Near<Id>) {
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
