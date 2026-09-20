import type { RunCtx } from './context';
import { emit, log } from './context';
import { absorbedByAbility, applyMoveEffects, strike } from './damageFlow';
import { slotOccupant } from './slots';
import type { Combatant, CombatState, EnemyCombatant } from './state';

// §3.2.5 — an enemy executes its telegraphed intent against whoever occupies the targeted slot NOW.

export function executeIntent(state: CombatState, enemy: EnemyCombatant, ctx: RunCtx): void {
  const intent = enemy.intent;
  if (!intent || intent.kind === 'incapacitated') {
    if (intent) log(state, 'enemy', `${enemy.name} can't move!`);
    return;
  }
  const move = intent.moveId ? ctx.content.move(intent.moveId) : null;
  if (!move) return;

  enemy.witnessed = true; // §5.5 — Witnessed tier
  if (move.cooldown && move.cooldown > 0) enemy.cooldowns[move.id] = move.cooldown;

  const targets: Combatant[] = [];
  let fizzled = false;
  if (intent.kind === 'cleave') {
    // §5.4.1 — Cleave hits every occupied slot; never fizzles while anyone stands.
    for (const slot of ['lead', 'bench1', 'bench2'] as const) {
      const occ = slotOccupant(state, slot);
      if (occ) targets.push(occ);
    }
  } else if (intent.targetSlot) {
    const occ = slotOccupant(state, intent.targetSlot);
    if (occ) targets.push(occ);
    else fizzled = intent.kind === 'backstrike' || intent.kind === 'attack' || intent.kind === 'status' || intent.kind === 'debuff';
  }
  emit(state, { t: 'enemy-action', enemyUid: enemy.uid, intent: { ...intent }, fizzled });

  if (fizzled) {
    // §5.4.1 — Backstrike into an empty slot does not redirect to the Lead.
    log(state, 'enemy', `${enemy.name}'s ${move.name} hit nothing!`);
    return;
  }

  if (intent.kind === 'buff' || intent.kind === 'stall') {
    log(state, 'enemy', `${enemy.name} used ${move.name}.`);
    applyMoveEffects(state, ctx, enemy, null, move);
    return;
  }

  for (const target of targets) {
    if (target.hp <= 0) continue;
    log(state, 'enemy', `${enemy.name} used ${move.name} on ${target.name}!`);
    if (absorbedByAbility(state, ctx, target, move)) continue;
    if (move.power > 0) strike(state, ctx, enemy, target, move, !!move.alwaysCrit);
    if (target.hp > 0 || move.power === 0) applyMoveEffects(state, ctx, enemy, target, move);
  }
}
