import { useEffect, useState, type HTMLAttributes } from 'react';
import styles from './ArenaSprite.module.css';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  src: string;
  /** Drawn but not seen: its place in the formation (and the FX anchored to it) stays where it is. */
  concealed?: boolean;
  imgClassName?: string;
  shiny?: boolean;
}

/**
 * §9.2.1 / D9 — a battle sprite on the field, at a pixel-art scale: the box's height (set by the formation, from the
 * stage's own height) over the sprite's natural height, to the nearest half step (D9 allows whole and half multiples) —
 * so a 42-px Charmander stands at 3× and a 60-px Charmeleon at 1.5×, not 1× beside a 2× Bulbasaur. Never more than a
 * tenth past its box, so it never climbs into the intent chip above it. Anchored at the bottom centre, at its feet.
 */
export function ArenaSprite({ src, concealed, imgClassName, shiny, className, ...rest }: Props) {
  const [box, setBox] = useState<HTMLSpanElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    if (!box) return;
    const measure = () => setRoom((cur) => (cur === box.clientHeight ? cur : box.clientHeight));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);
  const scale = natural && room ? fitScale(room, natural.h) : 0;
  return (
    <span ref={setBox} className={`${styles.box} ${className ?? ''}`} {...rest}>
      <img
        className={`pixel ${styles.img} ${imgClassName ?? ''}`}
        src={src}
        alt=""
        draggable={false}
        data-shiny={shiny || undefined}
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        style={scale && !concealed ? { width: natural!.w * scale, height: natural!.h * scale } : { width: natural ? natural.w * Math.max(1, scale) : undefined, visibility: 'hidden' }}
      />
    </span>
  );
}

/** The nearest half step to fill `room` with a sprite `h` tall, stepped down until it stands within a tenth of it. */
function fitScale(room: number, h: number): number {
  let s = Math.round((room / h) * 2) / 2;
  while (s > 1 && s * h > room * 1.1) s -= 0.5;
  return Math.max(1, s);
}
