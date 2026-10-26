import { REGION_COUNT } from './cities';
import type { RunState } from './types';

/** §2.1.3–§2.1.6 — regional progress survives a loss on Victory Road or at any League door. */
export function completedRegions(run: RunState): number {
  // Both zones follow the third Gym; their maps no longer contain the regional Gym history.
  if (run.zone === 'victory-road' || run.zone === 'league') return REGION_COUNT;
  // Cleared nodes distinguish a beaten Gym from a loss while standing at its door.
  // Older saves may end in victory at the third Gym, before the post-region zones existed.
  const clearedCurrent = run.outcome === 'victory' || run.visited.some((id) => run.map.nodes[id]?.kind === 'gym');
  return Math.min(REGION_COUNT, run.regionIndex + (clearedCurrent ? 1 : 0));
}
