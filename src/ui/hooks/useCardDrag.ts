import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

// §5.6 / §9.2.4 — a card dragged onto its target. Pointer events rather than HTML5 drag-and-drop, so it works the
// same with a mouse, a pen and a finger, and so the target under the pointer can be read on every move — which is
// what lets the damage preview follow the drag. A press that never travels is left alone: it stays a click.

export interface CardDrag {
  id: string;
  /** Pointer position, for the ghost. */
  x: number;
  y: number;
  /** The enemy under the pointer (`data-enemy-uid`), if any. */
  overUid: string | null;
}

/** How far a press has to travel before it becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 8;

export function useCardDrag(onDrop: (drag: CardDrag) => void) {
  const [drag, setDrag] = useState<CardDrag | null>(null);
  const dropRef = useRef(onDrop);
  useEffect(() => {
    dropRef.current = onDrop;
  }, [onDrop]);
  // A drag ends in a pointerup over the card's own button, which the browser follows with a click: swallow it.
  const swallowClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const begin = useCallback((e: ReactPointerEvent, id: string) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let current: CardDrag | null = null;
    const move = (ev: PointerEvent) => {
      if (!current && Math.hypot(ev.clientX - sx, ev.clientY - sy) < DRAG_THRESHOLD_PX) return;
      const over = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-enemy-uid]')?.getAttribute('data-enemy-uid') ?? null;
      current = { id, x: ev.clientX, y: ev.clientY, overUid: over };
      setDrag(current);
    };
    const stop = (drop: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', esc);
      cleanup.current = null;
      if (current) {
        swallowClick.current = true;
        window.setTimeout(() => {
          swallowClick.current = false;
        }, 0);
        if (drop) dropRef.current(current);
      }
      setDrag(null);
    };
    const up = () => stop(true);
    const cancel = () => stop(false);
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') stop(false);
    };
    window.addEventListener('keydown', esc);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    cleanup.current = () => stop(false);
  }, []);

  /** True (once) when the click in progress is the tail of a drag and must be ignored. */
  const clickWasDrag = useCallback(() => swallowClick.current, []);

  return { drag, begin, clickWasDrag };
}
