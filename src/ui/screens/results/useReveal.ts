import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx, type SfxId } from '@/ui/audio/sfx';
import type { Beat, RevealPlan } from './results';

/**
 * §9.4.5 — the reveal's clock: milliseconds since the result screen opened, driving every bar, number and panel from
 * the one plan, so a bar and the number beside it never disagree. A click on the field jumps to the next stop (the end
 * of the bar filling, of the panel standing); Escape or Skip jumps to the end. With motion off the clock starts at the end.
 *
 * v0.9.80 — the plan's `holds` stop the clock (a level that teaches a move) until a click lets it go: `held` says the clock
 * is standing at one. A click that lands on a hold waits there; the next one releases it.
 */
export function useReveal(plan: RevealPlan, animate: boolean): { t: number; done: boolean; held: boolean; advance: () => void; skip: () => void } {
  const [t, setT] = useState(() => (animate ? 0 : plan.total));
  const [released, setReleased] = useState(0);
  const origin = useRef(0);
  const clock = useRef(t);
  const total = plan.total;
  const holds = plan.holds;

  useEffect(() => {
    if (!animate) return;
    origin.current = performance.now() - clock.current;
    let raf = 0;
    const tick = () => {
      const elapsed = Math.min(total, performance.now() - origin.current);
      const stop = holds[released];
      if (stop !== undefined && elapsed >= stop) {
        clock.current = stop;
        setT(stop);
        return;
      }
      clock.current = elapsed;
      setT(elapsed);
      if (elapsed < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, total, holds, released]);

  const jump = useCallback((to: number) => {
    clock.current = to;
    origin.current = performance.now() - to;
    setT(to);
  }, []);
  // With motion off (or switched off mid-reveal) the clock reads the end.
  const now = animate ? t : total;
  const stop = animate ? holds[released] : undefined;
  const held = stop !== undefined && now >= stop;
  const advance = useCallback(() => {
    if (held) {
      setReleased((r) => r + 1);
      return;
    }
    const next = plan.stops.find((s) => s > now + 1) ?? total;
    jump(stop !== undefined ? Math.min(next, stop) : next);
  }, [held, jump, plan.stops, now, total, stop]);
  const skip = useCallback(() => {
    setReleased(holds.length);
    jump(total);
  }, [holds.length, jump, total]);
  return { t: now, done: now >= total, held, advance, skip };
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
