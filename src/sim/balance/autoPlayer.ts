import type { CombatCtx } from '../combat/context';
import { predictIntentDamage } from '../combat/intents';
import { cardPlayability, catchStatus, consumablePlayability, pickLeadOptions, swapOptions, type CardPlayability } from '../combat/preview';
import { combatReducer } from '../combat/reducer';
import { activeEnemy, lead } from '../combat/slots';
import type { CombatAction, CombatState } from '../combat/state';
import { hpFraction } from '../combat/stats';
import { typeMultiplier } from '../combat/typeChart';

// A deterministic, reasonably competent policy used for balance simulation and golden-master recording.
// It is NOT the game's AI (enemies use §5); it stands in for a decent human player.

export interface AutoPlayerOptions {
  /** Swap the Lead out when its HP fraction drops below this and the incoming hit would matter. */
  retreatBelow: number;
  /** Heal when the Lead is below this fraction and a heal is in hand. */
  healBelow: number;
  /** Throw a ball as soon as the gauge is READY (wild only). */
  tryCatch: boolean;
}

export const DEFAULT_POLICY: AutoPlayerOptions = { retreatBelow: 0.3, healBelow: 0.45, tryCatch: false };

/** What a healing consumable is worth on a target with this Max HP, in HP. Flat is flat; percent scales. */
function healValue(def: { effect: { kind: string; amount?: number; percent?: number } }, maxHp: number): number {
  if (def.effect.kind === 'heal-flat') return def.effect.amount ?? 0;
  if (def.effect.kind === 'heal-percent') return Math.floor((maxHp * (def.effect.percent ?? 0)) / 100);
  return 0;
}

function healthiest(state: CombatState, indices: number[]): number | undefined {
  return [...indices].sort((a, b) => hpFraction(state.player.team[b]!) - hpFraction(state.player.team[a]!))[0];
}

/** Decide the next action for the current state, or null when nothing can be done. */
export function nextAction(state: CombatState, ctx: CombatCtx, opts: AutoPlayerOptions = DEFAULT_POLICY): CombatAction | null {
  if (state.outcome !== 'in-progress') return null;
  if (state.player.pendingLeadPick) {
    const best = healthiest(state, pickLeadOptions(state));
    return best === undefined ? null : { type: 'pick-lead', benchIndex: best };
  }
  if (state.phase !== 'action') return null;
  const enemy = activeEnemy(state);
  const l = lead(state);
  if (!enemy || !l) return { type: 'end-turn' };

  // 1. Catch when READY.
  if (opts.tryCatch && state.kind === 'wild') {
    const gauge = catchStatus(state, ctx);
    const ball = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.def.effect.kind === 'catch' && p.playable);
    if (gauge?.ready && ball) return { type: 'use-consumable', cardId: ball.cardId };
  }

  // 2. Heal a low Lead. Both healing kinds, best first — §7.2.2 made healing a percentage of Effective Max
  // HP, and a harness that only knew `heal-flat` silently stopped drinking Potions the day that landed.
  // It read as a 30-point balance collapse and was a missing case in a `find`.
  if (hpFraction(l) < opts.healBelow) {
    const healCard = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .filter((p) => p.playable && (p.def.effect.kind === 'heal-flat' || p.def.effect.kind === 'heal-percent'))
      // Weakest sufficient first: a Max Potion on a scratch is the same waste in a harness as in a player.
      .sort((a, b) => healValue(a.def, l.maxHp) - healValue(b.def, l.maxHp));
    const missing = l.maxHp - l.hp;
    const pick = healCard.find((p) => healValue(p.def, l.maxHp) >= missing) ?? healCard[healCard.length - 1];
    if (pick) return { type: 'use-consumable', cardId: pick.cardId, targetIndex: state.player.leadIndex };
  }

  // §2.4.3 — a Revive is worth two AP the moment somebody is down, because a body back is four cards back.
  const downIndex = state.player.team.findIndex((m) => m.hp <= 0);
  if (downIndex >= 0) {
    const revive = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.playable && p.def.effect.kind === 'revive');
    if (revive) return { type: 'use-consumable', cardId: revive.cardId, targetIndex: downIndex };
  }

  // 3. Retreat: if the Lead is low and about to be hit, swap in the bench that takes the least.
  const incoming = predictIntentDamage(state, enemy, ctx) ?? 0;
  const intent = enemy.intent;
  const threatensLead = !!intent && (intent.kind === 'attack' || intent.kind === 'cleave') && incoming > 0;
  if (threatensLead && intent.moveId && (hpFraction(l) < opts.retreatBelow || incoming >= l.hp)) {
    const options = swapOptions(state).filter((o) => o.allowed);
    if (options.length > 0) {
      const moveType = ctx.content.move(intent.moveId).type;
      const best = options
        .map((o) => ({ o, mult: typeMultiplier(moveType, state.player.team[o.benchIndex]!.types), hp: state.player.team[o.benchIndex]!.hp }))
        .sort((a, b) => a.mult - b.mult || b.hp - a.hp)[0]!;
      if (best.mult <= 1 || incoming >= l.hp) return { type: 'swap', benchIndex: best.o.benchIndex };
    }
  }

  // 4. Best damage per AP that is playable; take a KO when available.
  const all = state.player.hand.map((c) => cardPlayability(state, c.id, ctx)!);
  const plays = all.filter((p) => p.playable);
  const damaging = plays.filter((p) => p.damage && p.damage.final > 0);

  // 4a. Nothing damaging is online but a bench Pokémon holds melee cards: swap to bring them online
  //     when the swap plus the card still fit in the AP budget (§3.3.1 — the swap IS the decision).
  if (damaging.length === 0) {
    const locked = all.filter((p) => p.reason === 'melee-needs-lead' && p.damage && p.damage.final > 0 && p.owner.hp > 0);
    const options = swapOptions(state).filter((o) => o.allowed);
    let best: { benchIndex: number; value: number } | null = null;
    for (const o of options) {
      const owner = state.player.team[o.benchIndex]!;
      const cards = locked.filter((p) => p.owner.uid === owner.uid && p.apCost <= state.player.ap - o.cost);
      const value = cards.reduce((acc, p) => acc + p.damage!.final, 0);
      if (value > 0 && (!best || value > best.value)) best = { benchIndex: o.benchIndex, value };
    }
    if (best) return { type: 'swap', benchIndex: best.benchIndex };
  }

  // 4b. Short of AP with damage still in hand: an Ether buys a card you could not otherwise play.
  //
  // §7.2.4 made it cost 1 AP for +2, a net +1 — which means it must be played *before* the tank is empty.
  // The old trigger was `ap === 0`, and at 0 AP an Ether is a brick: the branch went dead the moment the
  // cost landed, and the harness simply stopped using its release valve. `playable` is the real gate.
  {
    const ether = state.player.consumables.hand
      .map((c) => consumablePlayability(state, c.id, ctx)!)
      .find((p) => p.playable && p.def.effect.kind === 'ap');
    // Only when it actually unlocks something: a card that is out of reach now and in reach after.
    const gain = ether && ether.def.effect.kind === 'ap' ? ether.def.effect.amount - ether.def.apCost : 0;
    const unlocks = all.some(
      (p) => p.reason === 'not-enough-ap' && p.damage && p.damage.final > 0 && p.apCost <= state.player.ap + gain,
    );
    if (ether && gain > 0 && unlocks) return { type: 'use-consumable', cardId: ether.cardId };
  }
  const pick = (p: CardPlayability): CombatAction => {
    const stepBackTo = p.needsStepBackChoice ? healthiest(state, p.stepBackOptions) : undefined;
    return stepBackTo === undefined ? { type: 'play-card', cardId: p.card.id } : { type: 'play-card', cardId: p.card.id, stepBackTo };
  };
  const ko = damaging.find((p) => p.damage!.final >= enemy.hp);
  if (ko) return pick(ko);
  if (damaging.length > 0) {
    damaging.sort(
      (a, b) =>
        b.damage!.final / Math.max(1, b.apCost) - a.damage!.final / Math.max(1, a.apCost) || b.damage!.final - a.damage!.final,
    );
    return pick(damaging[0]!);
  }
  // 5. Free utility (debuffs/buffs) before ending.
  const utility = plays.filter((p) => p.apCost === 0 && p.move.power === 0);
  if (utility.length > 0) return pick(utility[0]!);
  return { type: 'end-turn' };
}

export interface SimResult {
  state: CombatState;
  actions: CombatAction[];
  turns: number;
}

/** Play a whole combat with the policy. Guards against runaway loops. */
export function autoPlay(initial: CombatState, ctx: CombatCtx, opts: AutoPlayerOptions = DEFAULT_POLICY, maxActions = 600): SimResult {
  let state = initial;
  const actions: CombatAction[] = [];
  for (let i = 0; i < maxActions && state.outcome === 'in-progress'; i++) {
    const action = nextAction(state, ctx, opts) ?? { type: 'end-turn' as const };
    const r = combatReducer(state, action, ctx);
    if (r.rejected) {
      // The policy proposed something illegal — end the turn so the fight always progresses.
      const fallback = combatReducer(state, { type: 'end-turn' }, ctx);
      if (fallback.rejected) break;
      state = fallback.state;
      actions.push({ type: 'end-turn' });
      continue;
    }
    state = r.state;
    actions.push(action);
  }
  return { state, actions, turns: state.turn };
}
