import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTipStore } from './tipStore';
import styles from './Tooltip.module.css';

// The one bubble. Mounted once in App, above everything, in a portal so no screen's `overflow: hidden` can
// clip it. Positions itself against the anchor: above by default, below when there is no room above, and
// always inside the viewport horizontally.

const GAP = 8;
const MARGIN = 8;

export function TooltipLayer() {
  const anchor = useTipStore((s) => s.anchor);
  const content = useTipStore((s) => s.content);
  const id = useTipStore((s) => s.id);
  const hide = useTipStore((s) => s.hide);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);

  // Measure after paint, so the bubble's own size is known before it is placed.
  useLayoutEffect(() => {
    if (!anchor || !box.current) {
      setPos(null);
      return;
    }
    const a = anchor.getBoundingClientRect();
    const b = box.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = a.left + a.width / 2 - b.width / 2;
    left = Math.max(MARGIN, Math.min(vw - b.width - MARGIN, left));

    let top = a.top - b.height - GAP;
    let below = false;
    if (top < MARGIN) {
      top = a.bottom + GAP;
      below = true;
      // If it fits nowhere, pin it to the bottom of the viewport rather than off it.
      if (top + b.height > vh - MARGIN) top = Math.max(MARGIN, vh - b.height - MARGIN);
    }
    setPos({ left, top, below });
  }, [anchor, content]);

  // Escape and scroll both dismiss: a tooltip that survives a scroll floats away from its anchor.
  useEffect(() => {
    if (!anchor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    const onScroll = () => hide();
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchor, hide]);

  if (!anchor || content === null || content === undefined) return null;

  return createPortal(
    <div
      ref={box}
      id={id}
      role="tooltip"
      className={`${styles.bubble} ${pos?.below ? styles.below : styles.above} ${pos ? styles.placed : ''}`}
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
      data-testid="tooltip"
    >
      {content}
    </div>,
    document.body,
  );
}
