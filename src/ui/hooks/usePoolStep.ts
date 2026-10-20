import { useSyncExternalStore } from 'react';

/**
 * §9.3 — the beat a Wild Area's residents go round their pool to: one clock for the whole map, ticking every `tickMs`,
 * and each resident showing a face for `faceMs`. Every node starts at its own point of that period, and a node's second
 * resident half a face after its first, so the map changes one face here and there, never a node's two at once — calm
 * enough for a screen the player studies.
 */
export const POOL_CYCLE = { tickMs: 100, faceMs: 2400 } as const;

let tick = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    tick += 1;
    for (const l of listeners) l();
  }, POOL_CYCLE.tickMs);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const still = () => () => {};

/**
 * Which face a resident is on: the map's clock, started `offsetMs` into the period. A component re-renders only when its
 * own face changes. While not `on` (motion off, or nothing to rotate) no clock runs and the face stays where its offset
 * put it.
 */
export function usePoolStep(on: boolean, offsetMs: number): number {
  return useSyncExternalStore(on ? subscribe : still, () => Math.floor(((on ? tick * POOL_CYCLE.tickMs : 0) + offsetMs) / POOL_CYCLE.faceMs));
}
