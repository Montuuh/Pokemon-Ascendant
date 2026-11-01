import type { BattleConfig } from './battleConfig';
import type { EnemyCombatant } from './state';

// §5.8.3 — the thresholds the HP bar draws, and §5.9.4's archetype. The phases themselves are state (`phases.ts`).

/** §5.8.3 — thresholds as fractions of max HP, for the HP-bar markers. */
export function phaseMarkers(enemy: Pick<EnemyCombatant, 'phaseCount'>, config: BattleConfig): number[] {
  if (enemy.phaseCount <= 1) return [];
  return enemy.phaseCount === 2 ? [config.bossPhase2HpThreshold] : [config.bossPhase2HpThreshold, config.bossPhase3HpThreshold];
}

export type BossArchetype = 'entrenchment' | 'status-siege' | 'onslaught' | 'tempo-control';

/** §5.9.4 (CL-013) — per-type Phase-2 signature, keyed on the ace's primary type. */
export function bossArchetype(enemy: Pick<EnemyCombatant, 'types'>): BossArchetype {
  switch (enemy.types[0]) {
    case 'rock':
    case 'ground':
      return 'entrenchment';
    case 'poison':
    case 'grass':
    case 'bug':
      return 'status-siege';
    case 'fire':
    case 'fighting':
    case 'normal':
      return 'onslaught';
    default:
      return 'tempo-control';
  }
}
