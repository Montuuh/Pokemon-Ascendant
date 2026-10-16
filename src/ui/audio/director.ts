import type { CombatState, RunState } from '@/sim';
import type { TrackId } from './music';

// §9.5.2 / §9.5.4 — which music plays where, and when a fight turns tense: pure reads of the screen, the run and the
// fight, kept apart from the hooks so they can be tested without a speaker or a store.

/** §9.5.2 — the low-HP layer comes in under this share of the team's HP. */
const TENSION_BELOW = 0.3;

/** §9.5.4 — the track for where the player is. Pure, so it can be read without a speaker. */
export function trackFor(screen: string, run: RunState | null, combat: CombatState | null): TrackId | null {
  if (screen === 'combat' && combat) {
    if (combat.gymRule === 'synergy') return 'champion';
    if (combat.kind === 'boss' || combat.arenaRule || combat.enemies.some((e) => e.tier === 'boss')) return 'boss';
    return 'combat';
  }
  if (screen === 'victory' || screen === 'defeat') return null;
  if (screen === 'map' && run) {
    if (run.zone === 'league') return 'league';
    if (run.zone === 'victory-road') return 'victory-road';
    if (run.city) return 'city';
    return `region-${Math.min(3, run.regionIndex + 1)}` as TrackId;
  }
  if (screen === 'hub') return 'city';
  return 'title';
}

/** §9.5.2 — the team as a whole below its share: the fight's tension layer. */
export function inTension(combat: CombatState | null): boolean {
  if (!combat) return false;
  const team = combat.player.team;
  const hp = team.reduce((a, m) => a + Math.max(0, m.hp), 0);
  const max = team.reduce((a, m) => a + m.maxHp, 0);
  return max > 0 && hp / max < TENSION_BELOW;
}

