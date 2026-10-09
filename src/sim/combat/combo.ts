import type { CombatCtx } from './context';
import type { EnemyCombatant } from './state';

// §5.6.1 — acting twice, priced in AP rather than HP (v0.9.12, the user's call: an enemy's HP is never scaled). A
// Pokémon that acts twice spends one budget on both actions, and you can break its second by hurting it enough.

/** §5.6.1 — the AP a Pokémon that acts twice may spend on its two actions: a Gym Leader's ace has the larger budget. */
export function doubleActionBudget(enemy: EnemyCombatant, ctx: CombatCtx): number {
  return enemy.tier === 'boss' ? ctx.config.doubleActionApBudgetBoss : ctx.config.doubleActionApBudget;
}

/** §5.6.1 — the damage still to deal it this turn before its second action breaks (0 once broken). */
export function comboBreakLeft(enemy: EnemyCombatant, ctx: CombatCtx): number {
  return enemy.second?.broken ? 0 : Math.max(0, comboBreakAt(enemy, ctx) - (enemy.stagger ?? 0));
}

/** §5.6.1 — the damage, dealt in one of your turns, that breaks its second action. */
export function comboBreakAt(enemy: Pick<EnemyCombatant, 'maxHp'>, ctx: CombatCtx): number {
  return Math.max(1, Math.ceil(enemy.maxHp * ctx.config.comboBreakShare));
}
