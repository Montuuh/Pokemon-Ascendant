import type { CombatState, RunState } from '@/sim';
import type { TrackId } from './songs';

// §9.5.2 / §9.5.4 — which music plays where, and when a fight turns tense: pure reads of the screen, the run and the
// fight, kept apart from the hooks so they can be tested without a speaker or a store.

/** §9.5.2 — the low-HP layer comes in under this share of the team's HP. */
const TENSION_BELOW = 0.3;

/** §9.5.2 — a fight's track, by what is across the field. */
export function battleTrack(combat: CombatState, run: RunState | null): TrackId {
  if (combat.gymRule === 'synergy') return 'battle-champion';
  if (combat.arenaRule) return 'battle-legendary';
  if (combat.kind === 'boss') return run?.zone === 'league' ? 'battle-league' : 'battle-gym';
  if (combat.kind === 'elite' || combat.enemies.some((e) => e.tier === 'boss' || e.tier === 'elite')) return 'battle-elite';
  return combat.kind === 'trainer' ? 'battle-trainer' : 'battle-wild';
}

/** §9.5.2 — the fanfare a won fight goes out on: a wild Pokémon's (and a catch's), a trainer's, a Gym's or the League's. */
export function victoryTrack(combat: CombatState): TrackId {
  if (combat.kind === 'boss') return 'victory-gym';
  return combat.kind === 'wild' ? 'victory-wild' : 'victory-trainer';
}

/** §9.5.4 — where the run is standing, between fights. */
function placeTrack(run: RunState): TrackId {
  switch (run.phase) {
    case 'center':
    case 'aid':
      return 'center';
    case 'shop':
      return 'mart';
    case 'game-corner':
      return 'game-corner';
    case 'black-market':
      return 'hideout';
    case 'event':
    case 'trader':
      return 'mystery';
    default:
      break;
  }
  if (run.zone === 'league') return 'league';
  if (run.zone === 'victory-road') return 'victory-road';
  if (run.city) return 'city';
  return `route-${Math.min(3, Math.max(1, run.regionIndex + 1))}` as TrackId;
}

/** §9.5.4 — the track for where the player is. Pure, so it can be read without a speaker. */
export function trackFor(screen: string, run: RunState | null, combat: CombatState | null): TrackId | null {
  if ((screen === 'combat' || screen === 'results') && combat) {
    // The fight's end is the music's: the fanfare from the last faint through the result, the fall on a loss.
    if (combat.outcome === 'victory' || combat.outcome === 'caught') return victoryTrack(combat);
    if (combat.outcome === 'defeat') return 'defeat';
    if (screen === 'combat') return battleTrack(combat, run);
  }
  if (screen === 'victory') return 'hall-of-fame';
  if (screen === 'defeat') return 'defeat';
  if ((screen === 'map' || screen === 'results') && run) return placeTrack(run);
  if (screen === 'hub' || screen === 'starter') return 'hub';
  return 'title';
}

/** §9.5.4 — what is likely to play next, so it can be rendered before it is needed. Pure. */
export function tracksAhead(screen: string, run: RunState | null, combat: CombatState | null): TrackId[] {
  if (screen === 'combat' && combat && combat.outcome === 'in-progress') return [victoryTrack(combat)];
  if (screen === 'map' && run && !run.city) return ['battle-wild', 'battle-trainer'];
  return [];
}

/** §9.5.2 — the team as a whole below its share: the fight's tension layer. */
export function inTension(combat: CombatState | null): boolean {
  if (!combat || combat.outcome !== 'in-progress') return false;
  const team = combat.player.team;
  const hp = team.reduce((a, m) => a + Math.max(0, m.hp), 0);
  const max = team.reduce((a, m) => a + m.maxHp, 0);
  return max > 0 && hp / max < TENSION_BELOW;
}
