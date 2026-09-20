import type { ConsumableDef, MoveDef } from '../content/defs';
import type { CombatCtx } from './context';
import { breakdownFor } from './damageFlow';
import type { DamageBreakdown } from './damage';
import { catchGauge, type CatchGauge } from './catch';
import { activeEnemy, benchIndices, lead } from './slots';
import type { Combatant, CombatState, RejectReason, SkillCard } from './state';
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
  /** Damage against the active enemy (null for non-damaging cards). */
  damage: DamageBreakdown | null;
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

export function cardPlayability(state: CombatState, cardId: string, ctx: CombatCtx): CardPlayability | null {
  const card = state.player.hand.find((c) => c.id === cardId);
  if (!card) return null;
  const move = ctx.content.move(card.moveId);
  const owner = state.player.team.find((c) => c.uid === card.ownerUid)!;
  const isLead = state.player.leadIndex === state.player.team.indexOf(owner);
  const apCost = effectiveApCost(state, move, owner, ctx);
  const enemy = activeEnemy(state);
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

  const damage = move.power > 0 && enemy ? breakdownFor(owner, enemy, move, !!move.alwaysCrit || state.player.critChance >= 1, ctx, state) : null;
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
}

export function consumablePlayability(state: CombatState, cardId: string, ctx: CombatCtx): ConsumablePlayability | null {
  const card = state.player.consumables.hand.find((c) => c.id === cardId);
  if (!card) return null;
  const def = ctx.content.consumable(card.consumableId);
  let reason: RejectReason | null = null;
  if (state.player.pendingLeadPick) reason = 'lead-pick-pending';
  else if (state.phase !== 'action' || state.outcome !== 'in-progress') reason = 'not-action-phase';
  else if (def.apCost > state.player.ap) reason = 'not-enough-ap';
  else if (def.effect.kind === 'catch' && state.kind !== 'wild') reason = 'not-wild';
  else if (def.effect.kind === 'catch' && state.player.balls <= 0) reason = 'no-balls';
  else if (def.effect.kind === 'catch' && !activeEnemy(state)) reason = 'no-enemy';
  // §2.6.4.1 — a throw below READY always fails and still spends the ball. That is not a decision, it is a
  // trap dressed as one, and it was reading as "the RNG robbed me" — the exact feeling §2.6.4.3 exists to
  // prevent. The card stays visible with the gauge on it and plays the moment it would actually catch.
  else if (def.effect.kind === 'catch' && !catchGauge(activeEnemy(state)!, def.effect).ready) reason = 'not-ready';
  return { cardId, def, playable: reason === null, reason, needsAllyTarget: def.target === 'ally' };
}

/** §2.6.4 — live catch gauge for the UI pill (null when not a wild fight or no ball available). */
export function catchStatus(state: CombatState, ctx: CombatCtx): (CatchGauge & { ballsLeft: number }) | null {
  if (state.kind !== 'wild') return null;
  const enemy = activeEnemy(state);
  if (!enemy) return null;
  const ballDef = [...state.player.consumables.pool, ...state.player.consumables.hand, ...state.player.consumables.used]
    .map((c) => ctx.content.consumable(c.consumableId))
    .find((d) => d.effect.kind === 'catch');
  const effect = ballDef?.effect.kind === 'catch' ? ballDef.effect : { kind: 'catch' as const, thresholdPercent: 30, statusBonusPercent: 20 };
  return { ...catchGauge(enemy, effect), ballsLeft: state.player.balls };
}

export function pickLeadOptions(state: CombatState): number[] {
  return state.player.team.map((c, i) => (c.hp > 0 && i !== state.player.leadIndex ? i : -1)).filter((i) => i >= 0);
}
