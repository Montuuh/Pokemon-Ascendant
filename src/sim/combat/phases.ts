import type { BattleConfig } from './battleConfig';
import type { CombatCtx, RunCtx } from './context';
import { emit, log } from './context';
import { changeStage } from './damageFlow';
import { bossArchetype } from './boss';
import { classifyMove, scoreIntent } from './intents';
import type { CombatState, EnemyCombatant, Intent, SignatureWait } from './state';
import { cardsLocked, paralysisApBonus } from './status';

// §5.8.3 — phases are state the enemy owns, not a reading of its HP: a crossed threshold latches while it stands,
// commits at the next turn's start (before the AP refill), and healing never takes either back.

/** The phase its HP has reached, for the latch only: never shown, never used to decide what it does. */
function reached(enemy: Pick<EnemyCombatant, 'hp' | 'maxHp' | 'phaseCount'>, config: BattleConfig): 1 | 2 | 3 {
  if (enemy.phaseCount <= 1 || enemy.maxHp <= 0) return 1;
  const hp = enemy.hp / enemy.maxHp;
  if (enemy.phaseCount >= 3 && hp <= config.bossPhase3HpThreshold) return 3;
  if (hp <= config.bossPhase2HpThreshold) return 2;
  return 1;
}

/** §5.8.3 — after any HP loss (and at creation, for an enemy that starts below a threshold): raise the pending phase. */
export function latchPhase(enemy: EnemyCombatant, config: BattleConfig): void {
  if (enemy.phaseCount <= 1 || enemy.hp <= 0) return;
  const at = reached(enemy, config);
  if (at > Math.max(enemy.phase, enemy.pendingPhase ?? 1)) enemy.pendingPhase = at as 2 | 3;
}

/** §5.8.3 — a KO cancels what had not yet begun: the pending phase and a signature not yet declared. */
export function cancelPhaseOnFaint(enemy: EnemyCombatant): void {
  delete enemy.pendingPhase;
  if (enemy.signature && enemy.signature.state !== 'spent') enemy.signature.state = 'spent';
}

/**
 * §5.8.3 — the commit boundary: at the turn's start, before the Draw and the AP refill, every standing enemy enters
 * the phase it latched. A jump straight to Phase 3 applies Phase 2's entry too, once each, under one event.
 */
export function commitPhases(state: CombatState, ctx: RunCtx): void {
  for (const enemy of state.enemies) {
    // A Pokémon whose HP was set rather than hit (a fixture, an arrival) latches here; the latch only ever raises.
    latchPhase(enemy, ctx.config);
    const to = enemy.pendingPhase;
    if (enemy.hp <= 0 || !to || to <= enemy.phase) continue;
    const from = enemy.phase;
    if (from < 2 && to >= 2 && bossArchetype(enemy) === 'entrenchment') {
      changeStage(state, enemy, 'defense', ctx.config.phase2EntrenchmentDefStages);
    }
    // Phase 3 opens the signature opportunity. An ace with none (a Master's Challenge promotion) presses the attack only.
    if (to >= 3 && enemy.signature?.state === 'locked') enemy.signature.state = 'ready';
    enemy.phase = to;
    delete enemy.pendingPhase;
    emit(state, { t: 'phase', enemyUid: enemy.uid, phase: to, from });
    log(state, 'enemy', to >= 3 ? `${enemy.name} makes its last stand!` : `${enemy.name} enters Phase 2!`);
    if (from < 2 && bossArchetype(enemy) === 'entrenchment') log(state, 'enemy', `${enemy.name} entrenches — race the wall.`);
  }
}

/** §5.9.4 Tempo Control — the player's AP is taxed while the ace stands in an aggressive (committed) phase. */
export function tempoApTax(state: CombatState, config: BattleConfig): number {
  return state.enemies.some((e) => e.hp > 0 && e.phaseCount > 1 && e.phase >= 2 && bossArchetype(e) === 'tempo-control') ? config.phase2TempoApTax : 0;
}

/**
 * §5.8.3 — an open signature opportunity: declared as the ace's first action (its cooldown waived for this one
 * declaration), or — when it cannot be played now — the reason it waits. Null when there is no opportunity.
 */
export function signatureIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx): { intent: Intent } | { wait: SignatureWait } | null {
  const sig = enemy.signature;
  if (!sig || sig.state !== 'ready') return null;
  const locked = cardsLocked(enemy);
  if (locked) return { wait: locked === 'sleep' ? 'asleep' : 'frozen' };
  const move = ctx.content.move(sig.moveId);
  if (move.apCost + paralysisApBonus(enemy, ctx.config) > ctx.config.baseApPerTurn) return { wait: 'paralysed' };
  const intent = classifyMove(state, enemy, move, ctx);
  if (!intent || scoreIntent(state, enemy, { intent, move }, ctx, sig.moveId) <= 0) return { wait: 'no-target' };
  return { intent: { ...intent, signature: true } };
}

/** §5.8.3 — the opportunity is spent on declaration, whatever then happens to the action. */
export function spendSignature(state: CombatState, enemy: EnemyCombatant): void {
  if (!enemy.signature) return;
  enemy.signature.state = 'spent';
  delete enemy.signature.wait;
  log(state, 'enemy', `${enemy.name} readies its signature move!`);
}
