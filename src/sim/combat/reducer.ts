import { produce } from 'immer';
import type { CombatCtx, RunCtx } from './context';
import { emit, log } from './context';
import { absorbedByAbility, applyMoveEffects, breakdownFor, changeStage, heal, onEnterLead, strike } from './damageFlow';
import { buildSkillDeck, drawSkillCards } from './deck';
import { echoesFirstCard, itemCureHeal, itemRidersFirst, swapDrawBonus, swapHealAmount, guaranteedCatch } from './items';
import { catchOdds } from './catch';
import { declareIntent } from './intents';
import { cardPlayability, consumablePlayability, pickLeadOptions, swapOptions } from './preview';
import { rngFromState } from './setup';
import { activeEnemy, lead } from './slots';
import type { CombatAction, CombatState, RejectReason } from './state';
import { cureStatus } from './status';
import { beginTurn, checkOutcome, finish, resolveTurn } from './turn';
import { isPositionLocked } from './status';

// The combat reducer: (state, action, ctx) → state. Pure over state (RNG cursor lives in the state).
// Illegal actions return the SAME state object plus a reason via `validate` so UIs never dispatch blind.

export interface ReduceResult {
  state: CombatState;
  rejected: RejectReason | null;
}

export function validateAction(state: CombatState, action: CombatAction, ctx: CombatCtx): RejectReason | null {
  if (state.outcome !== 'in-progress') return 'not-action-phase';
  if (state.player.pendingLeadPick && action.type !== 'pick-lead') return 'lead-pick-pending';
  switch (action.type) {
    case 'pick-lead':
      if (!state.player.pendingLeadPick) return 'not-action-phase';
      return pickLeadOptions(state).includes(action.benchIndex) ? null : 'invalid-index';
    case 'end-turn':
      return state.phase !== 'action' ? 'not-action-phase' : null;
    case 'play-card': {
      const p = cardPlayability(state, action.cardId, ctx);
      if (!p) return 'card-not-in-hand';
      return p.reason;
    }
    case 'use-consumable': {
      const p = consumablePlayability(state, action.cardId, ctx);
      if (!p) return 'card-not-in-hand';
      if (p.reason) return p.reason;
      if (p.needsAllyTarget) {
        const idx = action.targetIndex ?? state.player.leadIndex;
        const t = state.player.team[idx];
        if (!t) return 'invalid-index';
        // §2.4.3 — Revive is the one consumable whose target is *meant* to be at 0 HP; everything else
        // targeting a fainted ally is a wasted card, and the UI greys it rather than letting it happen.
        const wantsFainted = p.def.effect.kind === 'revive';
        if ((t.hp <= 0) !== wantsFainted) return 'target-fainted';
      }
      return null;
    }
    case 'swap': {
      const opt = swapOptions(state).find((o) => o.benchIndex === action.benchIndex);
      if (!opt) return action.benchIndex === state.player.leadIndex ? 'target-is-lead' : 'invalid-index';
      return opt.reason;
    }
  }
}

export function combatReducer(state: CombatState, action: CombatAction, ctx: CombatCtx): ReduceResult {
  const rejected = validateAction(state, action, ctx);
  if (rejected) return { state, rejected };
  const next = produce(state, (draft) => {
    const rng = rngFromState(draft);
    const run: RunCtx = { ...ctx, rng, declareIntentFor: (s, e) => declareIntent(s, e, ctx, rng) };
    apply(draft, action, run);
    draft.rngCursor = rng.cursor;
  });
  return { state: next, rejected: null };
}

function apply(state: CombatState, action: CombatAction, ctx: RunCtx): void {
  switch (action.type) {
    case 'play-card':
      return playCard(state, action.cardId, action.stepBackTo, ctx);
    case 'use-consumable':
      return applyConsumable(state, action.cardId, action.targetIndex, ctx);
    case 'swap':
      return manualSwap(state, action.benchIndex, ctx);
    case 'pick-lead':
      return pickLead(state, action.benchIndex, ctx);
    case 'end-turn':
      return resolveTurn(state, ctx);
  }
}

// ---- §3.2.4 Action phase -------------------------------------------------------------------------------

function playCard(state: CombatState, cardId: string, stepBackTo: number | undefined, ctx: RunCtx): void {
  const p = cardPlayability(state, cardId, ctx)!;
  const { card, move, owner } = p;
  const player = state.player;
  const ownerIndex = player.team.indexOf(owner);

  // Pay AP; §3.3.1 — the defensive discount is consumed by the first Defensive card after a manual swap.
  player.ap -= p.apCost;
  if (move.role === 'defensive' && player.defensiveDiscount) player.defensiveDiscount = false;

  // §7.3.4 — the turn's play record, *after* the cost is priced off it and before anything else reads it.
  //
  // Nothing wrote this until v0.5, which meant every "first card each turn" clause in the game was true on
  // every card: Choice Specs made every Ranged move free rather than the first, and Choice Band never
  // charged its surcharge. It was invisible because both relics still looked like they were working.
  player.playedThisTurn.push({ ownerUid: owner.uid, moveId: move.id, apCost: p.apCost });
  // §8.6.1 Pressure Plate's discovery reads the printed cost, not the discounted one.
  player.tally.maxApMove = Math.max(player.tally.maxApMove, move.apCost);

  // §7.3.5 Crown of Echoes — the combat's first card comes back free next turn. Tracked in `spent` so it
  // fires once per combat rather than once per turn.
  if (echoesFirstCard(state, ctx.content)) {
    const crown = 'crown-of-echoes';
    if (!player.spent.includes(crown)) {
      player.spent.push(crown);
      player.queuedCards.push({ moveId: move.id, ownerUid: owner.uid });
      log(state, 'system', `The Crown of Echoes remembers ${move.name}.`);
    }
  }

  // Remove from hand → discard (before effects so a draw effect cannot redraw it mid-resolution).
  player.hand = player.hand.filter((c) => c.id !== card.id);
  player.discard.push(card);

  // §3.3.2 — Step-Forward: the owner becomes Lead before the effect. No swap-counter increment, no discount.
  if (p.stepsForward) {
    const from = player.leadIndex;
    player.leadIndex = ownerIndex;
    emit(state, { t: 'swap', fromIndex: from, toIndex: ownerIndex, kind: 'step-forward', apCost: 0 });
    log(state, 'player', `${owner.name} steps forward!`);
    onEnterLead(state, ctx, ownerIndex);
  }

  const enemy = activeEnemy(state);
  emit(state, { t: 'card-played', cardId: card.id, moveId: move.id, ownerUid: owner.uid, targetUid: enemy?.uid ?? null, apCost: p.apCost });
  log(state, 'player', `${owner.name} used ${move.name}!`);

  if (move.power > 0 && enemy && absorbedByAbility(state, ctx, enemy, move)) {
    // §6.5.2 — the hit was swallowed whole: no damage, no rider, nothing to check.
  } else if (move.power > 0 && enemy) {
    const crit = !!move.alwaysCrit || (player.critChance > 0 && ctx.rng.chance(player.critChance));
    // Commentary first: the hit may faint the target and bring the next enemy in, and those lines must read
    // after the hit that caused them. The breakdown is computed up front for exactly that reason.
    const preview = breakdownFor(owner, enemy, move, crit, ctx);
    if (preview.isCrit) log(state, 'player', 'A critical hit!');
    if (preview.typeMultiplier > 1) log(state, 'player', "It's super effective!");
    else if (preview.typeMultiplier > 0 && preview.typeMultiplier < 1) log(state, 'player', "It's not very effective…");
    else if (preview.typeMultiplier === 0) log(state, 'player', "It doesn't affect the target…");
    // §7.3 Wide Lens — riders normally land *after* the hit, so a move that faints its target wastes its
    // status. The relic reverses the order for the player's moves only: the enemy is still standing when the
    // rider rolls. It is a relic, so it is the player's; an enemy's Poison Sting keeps the ordinary order.
    const ridersFirst = itemRidersFirst(state, ctx.content);
    if (ridersFirst) applyMoveEffects(state, ctx, owner, enemy, move);
    strike(state, ctx, owner, enemy, move, crit);
    // Riders only land on a target that is still standing.
    if (!ridersFirst && enemy.hp > 0) applyMoveEffects(state, ctx, owner, enemy, move);
  } else {
    applyMoveEffects(state, ctx, owner, enemy, move);
  }

  // Draw effects belong to the hand, so the reducer resolves them here.
  for (const fx of move.effects) {
    if (fx.kind === 'draw') {
      const drawn = drawSkillCards(state, fx.cards, ctx.rng);
      emit(state, { t: 'draw', cardIds: drawn.map((c) => c.id), consumableIds: [] });
      log(state, 'player', `Drew ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`);
    }
  }

  // §3.3.3 — Step-Backward: effect first, then swap to a chosen bench if one is legal. No counter, no discount.
  if (move.modifier === 'step-backward' && player.leadIndex === ownerIndex && owner.hp > 0) {
    const options = p.stepBackOptions;
    const dest = stepBackTo !== undefined && options.includes(stepBackTo) ? stepBackTo : options[0];
    if (dest !== undefined && !isPositionLocked(player.team[dest]!)) {
      const from = player.leadIndex;
      player.leadIndex = dest;
      emit(state, { t: 'swap', fromIndex: from, toIndex: dest, kind: 'step-backward', apCost: 0 });
      log(state, 'player', `${owner.name} steps back; ${player.team[dest]!.name} takes the Lead.`);
      onEnterLead(state, ctx, dest);
    }
  }

  if (checkOutcome(state)) finish(state);
}

function applyConsumable(state: CombatState, cardId: string, targetIndex: number | undefined, ctx: RunCtx): void {
  const p = consumablePlayability(state, cardId, ctx)!;
  const player = state.player;
  const card = player.consumables.hand.find((c) => c.id === cardId)!;
  const def = p.def;
  player.ap -= def.apCost;
  player.consumables.hand = player.consumables.hand.filter((c) => c.id !== card.id);
  player.consumables.used.push(card);

  const ally = def.target === 'ally' ? player.team[targetIndex ?? player.leadIndex]! : lead(state);
  emit(state, { t: 'consumable-used', consumableId: def.id, targetUid: def.target === 'ally' ? (ally?.uid ?? null) : null, apCost: def.apCost });
  log(state, 'player', `Used ${def.name}${def.target === 'ally' && ally ? ` on ${ally.name}` : ''}.`);

  const fx = def.effect;
  switch (fx.kind) {
    case 'heal-flat': {
      const amount = ally ? heal(state, ally, fx.amount, 'consumable') : 0;
      log(state, 'system', amount > 0 ? `${ally!.name} recovered ${amount} HP.` : 'It had no effect.');
      break;
    }
    /**
     * Max Potion's "restore to full", as a fraction of **Effective Max HP** — the Trauma-reduced number the
     * bar already shows, so a Pokémon three stacks deep fills the bar it actually has rather than the one it
     * used to have. Every other healing row is flat (§7.2.2); this is the only percentage that ships.
     */
    case 'heal-percent': {
      const amount = ally ? heal(state, ally, Math.max(1, Math.floor((ally.maxHp * fx.percent) / 100)), 'consumable', ctx.content) : 0;
      log(state, 'system', amount > 0 ? `${ally!.name} recovered ${amount} HP.` : 'It had no effect.');
      break;
    }
    /**
     * §2.4.3 — the only in-combat revival, and the only consumable whose target is *meant* to be at 0 HP.
     *
     * "Fainting permanently removes that Pokémon's deck contribution for the rest of the fight. The only
     * exception is the revive consumable." So the cards §3.3.5 purged come back too — otherwise Revive
     * returns a body that cannot act, which is not what the rule says and not worth 2 AP and 400 ₽.
     * They land in the discard rather than the deck: the Pokémon is back in the fight, not back to the top
     * of it, and the next reshuffle folds them in.
     */
    case 'revive': {
      if (!ally || ally.hp > 0) {
        log(state, 'system', 'It had no effect.');
        break;
      }
      ally.hp = Math.max(1, Math.floor((ally.maxHp * fx.percent) / 100));
      player.discard.push(...buildSkillDeck(state, [[ally.uid, ally.moveIds]]));
      emit(state, { t: 'heal', targetUid: ally.uid, amount: ally.hp, hpAfter: ally.hp, cause: 'consumable' });
      log(state, 'system', `${ally.name} is back on its feet at ${ally.hp} HP, and its cards are back in the pile.`);
      break;
    }
    case 'cure': {
      const removed = ally ? cureStatus(ally, fx.status) : [];
      for (const s of removed) emit(state, { t: 'status-cleared', targetUid: ally!.uid, status: s, cause: 'cured' });
      log(state, 'system', removed.length ? `${ally!.name} was cured of ${removed.join(', ')}.` : 'It had no effect.');
      // §7.3 Healer's Kit — a cure that lands also mends. Only when something was actually cured: an Antidote
      // on a healthy Pokémon is still a wasted card, relic or no relic.
      if (ally && removed.length) {
        const bonus = itemCureHeal(state, ctx.content);
        if (bonus > 0) {
          const healed = heal(state, ally, bonus, 'consumable');
          if (healed > 0) log(state, 'system', `The Healer's Kit mends ${ally.name} for ${healed} HP.`);
        }
      }
      break;
    }
    case 'ap':
      player.ap = Math.min(ctx.config.maxApPerTurn, player.ap + fx.amount);
      log(state, 'system', `+${fx.amount} AP.`);
      break;
    case 'stage':
      if (ally) changeStage(state, ally, fx.stat, fx.stages);
      break;
    case 'catch': {
      const enemy = activeEnemy(state)!;
      // §8.6.1 Master Ball Charm — armed until its one throw; the throw spends it whatever else happens.
      const charm = guaranteedCatch(state, ctx.content);
      const odds = catchOdds(enemy, fx, ctx.content, charm !== null);
      if (charm) player.spent.push(charm);
      player.balls = Math.max(0, player.balls - 1);
      // §2.6.4 — one roll at the shown chance, from the fight's own stream so a replay throws the same ball.
      const success = odds.guaranteed || ctx.rng.chance(odds.chance);
      emit(state, { t: 'catch', success, chance: odds.chance, ballsLeft: player.balls });
      if (success) {
        log(state, 'player', `Gotcha! ${enemy.name} was caught!`);
        state.outcome = 'caught';
        enemy.intent = null;
        state.defeatedEnemies.push(enemy);
        state.enemies = [];
        finish(state);
        return;
      }
      player.tally.catchFails += 1;
      log(state, 'player', `${enemy.name} broke free! (${Math.round(odds.chance * 100)}% — weaken it, or status it, and try again)`);
      break;
    }
  }
  if (checkOutcome(state)) finish(state);
}

/** §3.3.1 — manual swap: 1/2/3 AP ladder, arms the defensive discount, respects Freeze locks. */
function manualSwap(state: CombatState, benchIndex: number, ctx: RunCtx): void {
  const player = state.player;
  const free = player.freeSwaps > 0;
  const cost = free ? 0 : Math.min(3, player.swapCounter + 1);
  const from = player.leadIndex;
  player.ap -= cost;
  // A free swap does not advance the ladder either: it is the swap that did not happen, economically.
  if (free) player.freeSwaps -= 1;
  else player.swapCounter += 1;
  player.totalManualSwaps += 1;
  player.defensiveDiscount = true;
  player.leadIndex = benchIndex;
  emit(state, { t: 'swap', fromIndex: from, toIndex: benchIndex, kind: 'manual', apCost: cost });
  log(state, 'player', `${player.team[benchIndex]!.name} takes the Lead (${cost} AP).`);

  // §2.11.3 Swap Fuel — and the Pokémon stepping up gets a little back for stepping up.
  const fuel = swapHealAmount(state, ctx.content);
  if (fuel > 0) heal(state, player.team[benchIndex]!, fuel, 'ability');

  // §5.10.1 Cascade Badge — the swap you paid for hands a card back, now, while the turn is still yours.
  const extra = swapDrawBonus(state, ctx.content);
  if (extra > 0) {
    const drawn = drawSkillCards(state, extra, ctx.rng);
    if (drawn.length) {
      emit(state, { t: 'draw', cardIds: drawn.map((c) => c.id), consumableIds: [] });
      log(state, 'system', `The Cascade Badge turns the swap into ${drawn.length === 1 ? 'a card' : `${drawn.length} cards`}.`);
    }
  }

  onEnterLead(state, ctx, benchIndex);
}

/** §3.3.5 — replacement Lead at no cost; then the next turn begins. */
function pickLead(state: CombatState, benchIndex: number, ctx: RunCtx): void {
  const from = state.player.leadIndex;
  state.player.leadIndex = benchIndex;
  state.player.pendingLeadPick = false;
  emit(state, { t: 'swap', fromIndex: from, toIndex: benchIndex, kind: 'replacement', apCost: 0 });
  log(state, 'player', `${state.player.team[benchIndex]!.name} steps up as the new Lead.`);
  onEnterLead(state, ctx, benchIndex);
  beginTurn(state, ctx);
}
