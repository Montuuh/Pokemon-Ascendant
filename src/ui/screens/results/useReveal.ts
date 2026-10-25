import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx, type SfxId } from '@/ui/audio/sfx';
import type { Beat, RevealPlan } from './results';

/**
 * §9.4.5 — the reveal's clock: milliseconds since the result screen opened, driving every bar, number and panel from
 * the one plan, so a bar and the number beside it never disagree. A click on the field jumps to the next stop (the end
 * of the bar filling, of the panel standing); Escape or Skip jumps to the end. With motion off the clock starts at the end.
 */
export function useReveal(plan: RevealPlan, animate: boolean): { t: number; done: boolean; advance: () => void; skip: () => void } {
  const [t, setT] = useState(() => (animate ? 0 : plan.total));
  const start = useRef(0);
  const total = plan.total;

  useEffect(() => {
    if (!animate) return;
    start.current = performance.now();
    let raf = 0;
    const tick = () => {
      const now = Math.min(total, performance.now() - start.current);
      setT(now);
      if (now < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, total]);

  const jump = useCallback((to: number) => {
    start.current = performance.now() - to;
    setT(to);
  }, []);
  // With motion off (or switched off mid-reveal) the clock reads the end.
  const now = animate ? t : total;
  const advance = useCallback(() => jump(plan.stops.find((s) => s > now + 1) ?? total), [jump, plan.stops, now, total]);
  const skip = useCallback(() => jump(total), [jump, total]);
  return { t: now, done: now >= total, advance, skip };
}

/** A jump further than this past the last moment heard is a skip: its beats are not all played at once. */
const SKIPPED = 400;

/**
 * §9.4.5 / §9.5.3 — each beat's sound as the clock reaches it: the XP bar's whistle, the heal's restore, the level-up
 * fanfare, the Badge's, a coin for the prize money. A skip plays none of what it jumped over but the fanfare, once, when
 * a level was gained — the news is heard even when it is not watched (and with motion off, from the start).
 */
export function useRevealSounds(plan: RevealPlan, t: number, soundOf: (beat: Beat) => SfxId | null): void {
  const heard = useRef<{ at: number; done: Set<Beat> }>({ at: -1, done: new Set() });
  useEffect(() => {
    const h = heard.current;
    const due = plan.beats.filter((b) => b.at <= t && !h.done.has(b));
    if (!due.length) return;
    const skipped = t - Math.max(0, h.at) > SKIPPED && due.length > 1;
    h.at = t;
    for (const b of due) h.done.add(b);
    if (skipped) {
      if (due.some((b) => b.kind === 'level')) playSfx('level-up');
      return;
    }
    for (const b of due) {
      const id = soundOf(b);
      if (id) playSfx(id);
    }
  }, [plan, t, soundOf]);
}
