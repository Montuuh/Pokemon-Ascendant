import type { RunCtx } from './context';
import { emit, log } from './context';
import { absorbedByAbility, applyMoveEffects, strike } from './damageFlow';
import { intentRecipient, summonedBy } from './intents';
import { makeEnemy } from './setup';
import { slotOccupant } from './slots';
import type { Combatant, CombatState, EnemyCombatant, Intent } from './state';

// §3.2.5 — an enemy executes its telegraphed intent against whoever occupies the targeted slot NOW.

/**
 * §3.2.5 / §5.6.1 — an enemy's whole turn: its intent, then — for a Pokémon that acts twice — its second, right
 * after, if it is still standing and the fight is still on.
 */
export function executeTurn(state: CombatState, enemy: EnemyCombatant, ctx: RunCtx): void {
  executeIntent(state, enemy, ctx, enemy.intent);
  if (enemy.second && enemy.hp > 0 && state.outcome === 'in-progress') executeIntent(state, enemy, ctx, enemy.second);
}

export function executeIntent(state: CombatState, enemy: EnemyCombatant, ctx: RunCtx, intent: Intent | null = enemy.intent): void {
  if (!intent || intent.kind === 'incapacitated') {
    if (intent) log(state, 'enemy', `${enemy.name} can't move!`);
    return;
  }
  const move = intent.moveId ? ctx.content.move(intent.moveId) : null;
  if (!move) return;

  enemy.witnessed = true; // §5.5 — Witnessed tier
  if (move.cooldown && move.cooldown > 0) enemy.cooldowns[move.id] = move.cooldown;

  if (intent.kind === 'summon') {
    emit(state, { t: 'enemy-action', enemyUid: enemy.uid, intent: { ...intent }, fizzled: false });
    callForHelp(state, enemy, summonedBy(state, enemy, move, ctx.config.maxOnField).length, ctx);
    return;
  }

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
    // §5.6 — a Healer's or Buffer's move lands on the enemy Lead; only a heal-or-raise move is ever aimed there
    // (`allyGivable`), so handing the recipient in as the "user" applies exactly its heal and its raise.
    const recipient = intentRecipient(state, enemy, intent);
    log(state, 'enemy', recipient.uid === enemy.uid ? `${enemy.name} used ${move.name}.` : `${enemy.name} used ${move.name} on ${recipient.name}.`);
    applyMoveEffects(state, ctx, recipient, null, move);
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

/**
 * §5.6.2 — Call for Help. The caller's next waiting companions step onto the field as supports, as many as the move
 * brings and the field has room for (`maxOnField`). They were telegraphed by name on the chip; they declare their
 * own intents at the next Intent phase, which comes straight after this Resolution — so their first action is
 * always read before it lands. A call with nobody left to answer, or no room, is a wasted turn, and says so.
 */
function callForHelp(state: CombatState, caller: EnemyCombatant, count: number, ctx: RunCtx): void {
  const n = count;
  if (n <= 0) {
    log(state, 'enemy', `${caller.name} calls for help, but nobody comes.`);
    return;
  }
  for (let i = 0; i < n; i++) {
    const setup = caller.helpers!.shift()!;
    const fresh = makeEnemy(nextEnemyUid(state), setup, ctx);
    state.enemies.push(fresh);
    // A call makes a group of what was a single fight: from now on a free place is refilled, up to the new size.
    state.onField = Math.max(state.onField, state.enemies.length);
    emit(state, { t: 'enemy-enter', enemyUid: fresh.uid, called: true });
    log(state, 'enemy', `${caller.name} called for help — ${fresh.name} joins the fight!`);
  }
}

/** A uid no enemy of this fight has used: e0, e1, … in the order they took the field. */
function nextEnemyUid(state: CombatState): string {
  const used = [...state.enemies, ...state.enemyQueue, ...state.defeatedEnemies].map((e) => Number(e.uid.slice(1))).filter((n) => Number.isFinite(n));
  return `e${used.length ? Math.max(...used) + 1 : 0}`;
}
