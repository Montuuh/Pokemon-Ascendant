import type { CombatCtx, RunCtx } from './context';
import { log } from './context';
import { changeStage } from './damageFlow';
import { aliveTeam } from './slots';
import type { CombatState, EnemyCombatant, Intent } from './state';

// §5.6.5 — fights with another objective. Two telegraphed races: a runner that leaves at the end of its last turn,
// and a find held against a guard that escalates on a schedule you can see. Both end at a turn's end, after the
// statuses and the Leader's rule, so everything that happened in the turn counts.

/**
 * §5.6.5 — the turns the objective has left, counting the one being played: a runner that flees in 2 reads 2 on
 * turn 1 and 1 on its last turn. Null in a fight without one.
 */
export function objectiveTurnsLeft(state: Pick<CombatState, 'objective' | 'turn'>): number | null {
  const o = state.objective;
  return o ? Math.max(0, o.turns - Math.max(1, state.turn) + 1) : null;
}

/** Is this the objective's last turn (or past it) — the runner's getaway, the guard's finisher, the end of the hold? */
const lastTurn = (state: CombatState) => (objectiveTurnsLeft(state) ?? 2) <= 1;

/**
 * §5.6.5 — the intent the objective dictates, if it dictates one this turn: the runner's getaway on its last turn
 * (Teleport when it knows it, else a plain run), and the guard's finisher on the hold's last turn when its kit holds
 * it (Rhydon's Horn Drill, at your Lead). Shown like any intent, never hidden: the race is the telegraph.
 */
export function objectiveIntent(state: CombatState, enemy: EnemyCombatant, ctx: CombatCtx): Intent | null {
  const o = state.objective;
  if (!o || !lastTurn(state)) return null;
  if (o.kind === 'flee') return { kind: 'getaway', moveId: enemy.moveIds.includes('teleport') ? 'teleport' : null, targetSlot: null, hidden: false };
  const finisher = ctx.config.objectives.guardFinisher;
  if (enemy.moveIds.includes(finisher)) return { kind: 'attack', moveId: finisher, targetSlot: 'lead', hidden: false };
  return null;
}

/**
 * §5.6.5 — the turn's end. A runner still standing after its last turn gets away (the fight ends as Fled: no XP, no
 * drop, no catch, no toll). A hold-out with a Pokémon of yours standing after its last turn is won; before it, the
 * guard grows angrier — its Attack up a stage at the end of every turn.
 */
export function objectiveTurnEnd(state: CombatState, ctx: RunCtx): void {
  const o = state.objective;
  if (!o || state.outcome !== 'in-progress') return;
  const standing = state.enemies.filter((e) => e.hp > 0);
  if (o.kind === 'flee') {
    if (!lastTurn(state) || standing.length === 0) return;
    const runner = standing[0]!;
    // It runs only on a turn it declared its getaway: one asleep or frozen when the turn began could not, and runs the
    // first turn it can (v0.9.18 — put it to sleep a turn ahead, the series' Safari Zone answer). A status landed in
    // the turn itself only telegraphs (§4.2.1 G7), so it does not stop a getaway already declared.
    if (runner.intent?.kind !== 'getaway') return;
    log(state, 'enemy', runner.moveIds.includes('teleport') ? `${runner.name} teleported away!` : `${runner.name} ran away!`);
    state.outcome = 'fled';
    return;
  }
  if (lastTurn(state)) {
    if (aliveTeam(state).length > 0) {
      log(state, 'system', 'You held out! The find is yours.');
      state.outcome = 'victory';
    }
    return;
  }
  for (const guard of standing) changeStage(state, guard, 'attack', ctx.config.objectives.guardEscalation);
}
