import type { ConsumableDef, MoveDef } from '../content/defs';
import type { CombatCtx } from './context';
import { breakdownFor } from './damageFlow';
import type { DamageBreakdown } from './damage';
import { catchOdds, type CatchOdds } from './catch';
import { activeEnemy, aliveEnemies, benchIndices, lead } from './slots';
import type { Combatant, CombatState, ConsumableCard, EnemyCombatant, RejectReason, SkillCard } from './state';
import { choiceLockBlocks, itemApDelta } from './items';
import { cardsLocked, isPositionLocked, paralysisApBonus } from './status';

// Read-only selectors the UI (and the auto-player) use to know what is legal and what it would do.
// Every rule here mirrors the reducer's validation — keep them in lockstep (tests assert agreement).

export interface CardPlayability {
  card: SkillCard;
  move: MoveDef;
  owner: Combatant;
  playable: boolean;
  reason: RejectReason | null;
  /** Effective AP cost after Paralysis (+1) and the defensive-swap discount (−1). */
  apCost: number;
  /** Would this card move its owner into the Lead slot first (§3.3.2)? */
  stepsForward: boolean;
  /** §3.3.3 — playing it asks for a bench destination. */
  needsStepBackChoice: boolean;
  stepBackOptions: number[];
  /** Damage against the card's target — the one named, or the enemy Lead (null for non-damaging cards). */
  damage: DamageBreakdown | null;
  /** §5.6 — the card lands on the enemies (a hit, a foe status or a foe stat drop), so it takes an enemy target. */
  aimsAtFoe: boolean;
  /** §5.6 — an area card (Cleave) lands on every enemy on the field, each with its own number. */
  hitsAll: boolean;
  /** §5.6 / §9.2.4 — every enemy on the field, whether this card can reach it, and what it would deal there. */
  targets: CardTarget[];
}

export interface CardTarget {
  uid: string;
  reachable: boolean;
  damage: DamageBreakdown | null;
}

/** §5.6 — does the move land on the foe side at all (a hit, a status, a stat drop)? */
export function aimsAtFoe(move: MoveDef): boolean {
  return move.power > 0 || move.effects.some((e) => (e.kind === 'status' && !e.self) || (e.kind === 'stage' && e.target === 'foe'));
}

/**
 * §5.6 — reach, the Lead mechanic mirrored: a single-target Melee card lands only on the enemy Lead, which stands
 * in front of its supports. Ranged cards, Backstrike cards and area cards reach every enemy.
 */
export function canReach(state: CombatState, move: MoveDef, enemy: EnemyCombatant): boolean {
  if (enemy.hp <= 0) return false;
  if (move.targeting === 'cleave' || move.targeting === 'backstrike' || move.range === 'ranged') return true;
  return activeEnemy(state)?.uid === enemy.uid;
}

/** §5.6 — the enemies a card lands on when aimed at `target`: every one for an area card, else the one. */
export function cardVictims(state: CombatState, move: MoveDef, target: EnemyCombatant | null): EnemyCombatant[] {
  if (move.targeting === 'cleave') return aliveEnemies(state);
  return target ? [target] : [];
}

export function effectiveApCost(state: CombatState, move: MoveDef, owner: Combatant, ctx: CombatCtx): number {
  let cost = move.apCost + paralysisApBonus(owner, ctx.config);
  if (move.role === 'defensive' && state.player.defensiveDiscount) cost = Math.max(0, cost - 1);
  // §7.3.4 / §7.4.5 — relic and held-item AP changes. Choice Specs and Choice Band return a large negative
  // to mean "free", which the floor below turns into 0 without special-casing the sentinel anywhere else.
  cost += itemApDelta(state, owner, move, ctx.content);
  return Math.max(0, cost);
}

export function stepBackOptions(state: CombatState): number[] {
  return benchIndices(state).filter((i) => {
    const b = state.player.team[i]!;
    return b.hp > 0 && !isPositionLocked(b);
  });
}

export function cardPlayability(state: CombatState, cardId: string, ctx: CombatCtx, targetUid?: string): CardPlayability | null {
  const card = state.player.hand.find((c) => c.id === cardId);
  if (!card) return null;
  const move = ctx.content.move(card.moveId);
  const owner = state.player.team.find((c) => c.uid === card.ownerUid)!;
  const isLead = state.player.leadIndex === state.player.team.indexOf(owner);
  const apCost = effectiveApCost(state, move, owner, ctx);
  // §5.6 — the card's target: the one named, else the enemy Lead.
  const named = targetUid !== undefined ? state.enemies.find((e) => e.uid === targetUid && e.hp > 0) ?? null : null;
  const enemy = targetUid !== undefined ? named : activeEnemy(state);
  const foe = aimsAtFoe(move);
  const stepsForward = move.modifier === 'step-forward' && !isLead;
  const sbOptions = move.modifier === 'step-backward' && isLead ? stepBackOptions(state) : [];

  let reason: RejectReason | null = null;
  if (state.player.pendingLeadPick) reason = 'lead-pick-pending';
  else if (state.phase !== 'action' || state.outcome !== 'in-progress') reason = 'not-action-phase';
  else if (owner.hp <= 0) reason = 'owner-fainted';
  else if (cardsLocked(owner) === 'sleep') reason = 'owner-asleep';
  else if (cardsLocked(owner) === 'freeze') reason = 'owner-frozen';
  else if (move.range === 'melee' && !isLead && move.modifier !== 'step-forward') reason = 'melee-needs-lead';
  // §7.4.5 — Choice Band and Choice Scarf: shown as a lock, never hidden (ui.md).
  else if (choiceLockBlocks(state, owner, move, ctx.content)) reason = 'choice-locked';
  else if (stepsForward && isPositionLocked(owner)) reason = 'owner-frozen';
  else if (stepsForward && lead(state) && isPositionLocked(lead(state)!)) reason = 'lead-frozen';
  else if (apCost > state.player.ap) reason = 'not-enough-ap';
  else if (move.power > 0 && !enemy) reason = 'no-enemy';
  else if (targetUid !== undefined && foe && !enemy) reason = 'no-enemy';
  else if (foe && enemy && !canReach(state, move, enemy)) reason = 'out-of-reach';

  const crit = !!move.alwaysCrit || state.player.critChance >= 1;
  const damage = move.power > 0 && enemy ? breakdownFor(owner, enemy, move, crit, ctx, state) : null;
  const targets = state.enemies
    .filter((e) => e.hp > 0)
    .map((e) => ({ uid: e.uid, reachable: foe && canReach(state, move, e), damage: move.power > 0 ? breakdownFor(owner, e, move, crit, ctx, state) : null }));
  return {
    card,
    move,
    owner,
    playable: reason === null,
    reason,
    apCost,
    stepsForward,
    needsStepBackChoice: sbOptions.length > 0,
    stepBackOptions: sbOptions,
    damage,
    aimsAtFoe: foe,
    hitsAll: move.targeting === 'cleave',
    targets,
  };
}

export interface SwapOption {
  benchIndex: number;
  cost: number;
  allowed: boolean;
  reason: RejectReason | null;
}

/** §3.3.1 — next manual swap cost (1/2/3) and whether each bench is a legal destination. */
export function swapOptions(state: CombatState): SwapOption[] {
  // §3.3.1 — the 1/2/3 ladder, unless a free swap is banked (Run Down, Tactician's Coin, Flow State).
  const cost = state.player.freeSwaps > 0 ? 0 : Math.min(3, state.player.swapCounter + 1);
  const l = lead(state);
  return benchIndices(state).map((benchIndex) => {
    const b = state.player.team[benchIndex]!;
    let reason: RejectReason | null = null;
    if (state.player.pendingLeadPick) reason = 'lead-pick-pending';
    else if (state.phase !== 'action' || state.outcome !== 'in-progress') reason = 'not-action-phase';
    else if (b.hp <= 0) reason = 'target-fainted';
    else if (isPositionLocked(b)) reason = 'target-frozen';
    else if (l && isPositionLocked(l)) reason = 'lead-frozen';
    else if (cost > state.player.ap) reason = 'not-enough-ap';
    return { benchIndex, cost, allowed: reason === null, reason };
  });
}

export interface ConsumablePlayability {
  cardId: string;
  def: ConsumableDef;
  playable: boolean;
  reason: RejectReason | null;
  needsAllyTarget: boolean;
  /** §2.6.4 / §5.6 — a Poké Ball is thrown at one enemy of the pack. */
  aimsAtFoe: boolean;
}

/** §2.6.4 — the wild Pokémon a ball is thrown at: the one named, else the enemy Lead. */
export function catchTarget(state: CombatState, targetUid?: string): EnemyCombatant | null {
  if (targetUid === undefined) return activeEnemy(state);
  return state.enemies.find((e) => e.uid === targetUid && e.hp > 0) ?? null;
}

export function consumablePlayability(state: CombatState, cardId: string, ctx: CombatCtx, targetUid?: string): ConsumablePlayability | null {
  const card = state.player.consumables.hand.find((c) => c.id === cardId);
  if (!card) return null;
  const def = ctx.content.consumable(card.consumableId);
  let reason: RejectReason | null = null;
  if (state.player.pendingLeadPick) reason = 'lead-pick-pending';
  else if (state.phase !== 'action' || state.outcome !== 'in-progress') reason = 'not-action-phase';
  else if (state.player.itemsUsed >= state.player.itemCap) reason = 'item-limit';
  else if (def.apCost > state.player.ap) reason = 'not-enough-ap';
  else if (def.effect.kind === 'catch' && state.kind !== 'wild') reason = 'not-wild';
  else if (def.effect.kind === 'catch' && state.player.balls <= 0) reason = 'no-balls';
  else if (def.effect.kind === 'catch' && !catchTarget(state, targetUid)) reason = 'no-enemy';
  return { cardId, def, playable: reason === null, reason, needsAllyTarget: def.target === 'ally', aimsAtFoe: def.effect.kind === 'catch' };
}

/**
 * §2.6.4 / §2.6.4.2 — every kind of ball in the bag, its count, and the chance it would have on this target: the
 * catch picker's rows (v0.8.6). Best ball first. Empty when this is not a catch.
 */
export function catchOptions(state: CombatState, ctx: CombatCtx, targetUid?: string): { consumableId: string; cardId: string; count: number; odds: CatchOdds; playable: ConsumablePlayability }[] {
  if (state.kind !== 'wild') return [];
  const enemy = catchTarget(state, targetUid);
  if (!enemy) return [];
  const byKind = new Map<string, ConsumableCard[]>();
  for (const card of state.player.consumables.hand) {
    if (ctx.content.consumable(card.consumableId).effect.kind !== 'catch') continue;
    byKind.set(card.consumableId, [...(byKind.get(card.consumableId) ?? []), card]);
  }
  return [...byKind]
    .map(([consumableId, cards]) => {
      const def = ctx.content.consumable(consumableId);
      const effect = def.effect as Extract<typeof def.effect, { kind: 'catch' }>;
      return { consumableId, cardId: cards[0]!.id, count: cards.length, odds: catchOdds(enemy, effect, ctx.content), playable: consumablePlayability(state, cards[0]!.id, ctx, enemy.uid)! };
    })
    .sort((a, b) => b.odds.ballMult - a.odds.ballMult);
}

/** §2.6.4 — the live catch odds for the UI pill (null when not a wild fight or no ball available). */
export function catchStatus(state: CombatState, ctx: CombatCtx, targetUid?: string): (CatchOdds & { ballsLeft: number }) | null {
  if (state.kind !== 'wild') return null;
  const enemy = catchTarget(state, targetUid);
  if (!enemy) return null;
  const ballDef = [...state.player.consumables.hand, ...state.player.consumables.pool]
    .map((c) => ctx.content.consumable(c.consumableId))
    .find((d) => d.effect.kind === 'catch');
  const effect = ballDef?.effect.kind === 'catch' ? ballDef.effect : { kind: 'catch' as const, ballMultiplier: 1 };
  return { ...catchOdds(enemy, effect, ctx.content), ballsLeft: state.player.balls };
}

export function pickLeadOptions(state: CombatState): number[] {
  return state.player.team.map((c, i) => (c.hp > 0 && i !== state.player.leadIndex ? i : -1)).filter((i) => i >= 0);
}
