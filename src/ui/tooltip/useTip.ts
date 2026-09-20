import { useCallback, useEffect, useRef, type FocusEvent, type MouseEvent, type ReactNode } from 'react';
import { TIP_ID, useTipStore } from './tipStore';

/** How long the pointer rests before the bubble opens. Focus opens at once — a keyboard user asked for it. */
export const TIP_DELAY_MS = 450;

export interface TipTriggerProps {
  onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave: (e: MouseEvent<HTMLElement>) => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: (e: FocusEvent<HTMLElement>) => void;
  'aria-describedby': string;
}

/**
 * Attach a tooltip to any element: `<button {...useTip(<Tip title="…" body="…" />)}>`.
 *
 * Hover waits `TIP_DELAY_MS` so a pointer crossing the hand does not fire five bubbles; focus does not wait.
 * Leaving, blurring, pressing Escape or scrolling closes it. `content` may be null to attach nothing — that
 * lets a component spread the hook unconditionally and decide per render whether it has anything to say.
 */
export function useTip(content: ReactNode, delay = TIP_DELAY_MS): TipTriggerProps {
  const show = useTipStore((s) => s.show);
  const hide = useTipStore((s) => s.hide);
  const timer = useRef<number | null>(null);
  // The latest content, read at fire time rather than captured at enter time: a card's damage preview can
  // change while the pointer rests on it, and the bubble should say what is true when it opens.
  const latest = useRef(content);
  // Written after every render rather than during it (React's rule for refs); an event can only fire after
  // the commit, so it always reads the current content.
  useEffect(() => {
    latest.current = content;
  });

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const open = useCallback(
    (el: HTMLElement, wait: number) => {
      cancel();
      if (latest.current === null || latest.current === undefined || latest.current === false) return;
      if (wait === 0) {
        show(el, latest.current);
        return;
      }
      timer.current = window.setTimeout(() => {
        timer.current = null;
        if (latest.current !== null) show(el, latest.current);
      }, wait);
    },
    [cancel, show],
  );

  const close = useCallback(
    (el: HTMLElement) => {
      cancel();
      hide(el);
    },
    [cancel, hide],
  );

  // Unmounting with the bubble open (a card leaves the hand under the pointer) must not strand it.
  const last = useRef<HTMLElement | null>(null);
  useEffect(() => () => {
    cancel();
    if (last.current) hide(last.current);
  }, [cancel, hide]);

  return {
    onMouseEnter: (e) => {
      last.current = e.currentTarget;
      open(e.currentTarget, delay);
    },
    onMouseLeave: (e) => close(e.currentTarget),
    onFocus: (e) => {
      last.current = e.currentTarget;
      open(e.currentTarget, 0);
    },
    onBlur: (e) => close(e.currentTarget),
    'aria-describedby': TIP_ID,
  };
}
