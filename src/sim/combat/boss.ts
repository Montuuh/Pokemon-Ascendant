import type { BattleConfig } from './battleConfig';
import type { RunCtx } from './context';
import { emit, log } from './context';
import { changeStage } from './damageFlow';
import type { CombatState, EnemyCombatant } from './state';
import { hpFraction } from './stats';

// §5.8.3 — boss phases are a pure function of HP (stateless, replay-safe); one-shot entry effects are tracked.

export function currentPhase(enemy: Pick<EnemyCombatant, 'hp' | 'maxHp' | 'phaseCount'>, config: BattleConfig): 1 | 2 | 3 {
  if (enemy.phaseCount <= 1) return 1;
  const hp = hpFraction(enemy);
  if (enemy.phaseCount >= 3 && hp <= config.bossPhase3HpThreshold) return 3;
  if (hp <= config.bossPhase2HpThreshold) return 2;
  return 1;
}

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

/** Run at every Intent phase: apply one-shot phase-entry effects and record the phase. */
export function applyPhaseTransitions(state: CombatState, enemy: EnemyCombatant, ctx: RunCtx): void {
  if (enemy.phaseCount <= 1) return;
  const phase = currentPhase(enemy, ctx.config);
  if (phase >= 2 && !enemy.enteredPhase2) {
    enemy.enteredPhase2 = true;
    emit(state, { t: 'phase', enemyUid: enemy.uid, phase: 2 });
    log(state, 'enemy', `${enemy.name} enters Phase 2!`);
    if (bossArchetype(enemy) === 'entrenchment') {
      changeStage(state, enemy, 'defense', ctx.config.phase2EntrenchmentDefStages);
      log(state, 'enemy', `${enemy.name} entrenches — race the wall.`);
    }
  }
  if (phase >= 3 && !enemy.enteredPhase3) {
    enemy.enteredPhase3 = true;
    emit(state, { t: 'phase', enemyUid: enemy.uid, phase: 3 });
    log(state, 'enemy', `${enemy.name} makes its last stand!`);
    // §5.8.3 — cooldowns reset so the signature can fire immediately.
    enemy.cooldowns = {};
  }
  enemy.phase = phase;
}

/** §5.9.4 Tempo Control — the player's AP is taxed while the ace is in an aggressive phase. */
export function tempoApTax(state: CombatState, config: BattleConfig): number {
  return state.enemies.some((e) => e.hp > 0 && e.phaseCount > 1 && bossArchetype(e) === 'tempo-control' && currentPhase(e, config) >= 2)
    ? config.phase2TempoApTax
    : 0;
}
