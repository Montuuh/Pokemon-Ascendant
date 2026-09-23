import type { RunCtx } from './context';
import { emit, log } from './context';
import { discardHand, drawConsumables, drawSkillCards, returnConsumableHand, sweepEchoes } from './deck';
import { applyPhaseTransitions, tempoApTax } from './boss';
import { dealDamage, heal } from './damageFlow';
import { declareIntent } from './intents';
import { aliveTeam, benchIndices, lead } from './slots';
import type { Combatant, CombatState } from './state';
import { abilityTurnStartAp, turnEndBenchHeal } from './abilities';
import { itemBankedAp, itemConsumableDrawBonus, itemDrawBonus, itemRetainCards, itemTurnEndHeal, itemTurnStartLeadHeal, recallsDiscard, reshuffleCopies } from './items';
import { dotDamage, statusActiveThisTurn } from './status';
import { executeIntent } from './enemyTurn';

// §3.2 — the five-phase loop. `beginTurn` = Draw + Intent (lands in Action); `resolveTurn` = Resolution → next turn.

export function beginTurn(state: CombatState, ctx: RunCtx): void {
  state.turn += 1;
  state.phase = 'draw';
  const p = state.player;

  // §3.2.2 — AP refill (Tempo Control may tax it), swap counter and discount reset.
  // §7.3 — AP banked by a relic last turn (Cycle Cell, Move Echo) lands on top of the refill.
  // §6.5.2 Speed Boost — its turn-2 AP lands beside the banked AP.
  p.ap = Math.max(0, ctx.config.baseApPerTurn - tempoApTax(state, ctx.config)) + p.bankedAp + abilityTurnStartAp(p.team, state.turn, ctx.content);
  p.bankedAp = 0;
  p.swapCounter = 0;
  p.defensiveDiscount = false;
  p.playedThisTurn = [];
  // §8.4.3 — whoever starts the turn as Lead gets the turn on their record.
  const leadNow = p.team[p.leadIndex];
  if (leadNow && leadNow.hp > 0) p.leadTurns[leadNow.uid] = (p.leadTurns[leadNow.uid] ?? 0) + 1;
  emit(state, { t: 'turn-start', ap: p.ap });
  log(state, 'turn', `— Turn ${state.turn} —`);

  // §5.10.2 Rainbow Badge — a statused Lead restores a little at the top of the turn.
  const bloom = itemTurnStartLeadHeal(state, ctx.content);
  if (bloom > 0 && leadNow && leadNow.hp > 0 && leadNow.hp < leadNow.maxHp) heal(state, leadNow, bloom, 'ability');

  // §8.6.1 Perfect Recall — once per fight, a deck about to run short takes its discard back *before* the
  // draw, so the turn is drawn from a full deck rather than a reshuffle mid-draw. It is not a reshuffle: the
  // relics that pay on one do not fire, which is what keeps it a Tier-3 convenience and not a Cycle Cell engine.
  const want = ctx.config.baseSkillCardsPerTurn + itemDrawBonus(state, state.turn, ctx.content);
  if (recallsDiscard(state, ctx.content) && p.deck.length < want && p.discard.length > 0) {
    p.deck = ctx.rng.shuffle([...p.deck, ...p.discard.filter((c) => c.echoUntilTurn === undefined)]);
    p.discard = p.discard.filter((c) => c.echoUntilTurn !== undefined);
    p.spent.push('perfect-recall');
    log(state, 'system', 'Perfect Recall: the discard pile returns to the deck.');
  }
  // §7.3 — relics that add cards do it here, so the extra card is in hand before the intent is read.
  const drawn = drawSkillCards(state, want, ctx.rng);

  // §5.10.1 Hive Badge — last turn's deck cycle promised free copies; they land on top of the draw, so the
  // hand is complete before the intent is read and the player can plan against it.
  for (const q of p.queuedCards) {
    const card = { id: `c${state.nextCardSerial++}`, moveId: q.moveId, ownerUid: q.ownerUid };
    p.hand.push(card);
    drawn.push(card);
    log(state, 'system', `The Hive Badge buzzes: a free ${ctx.content.move(q.moveId).name}.`);
  }
  p.queuedCards = [];

  // §5.10.1 — and this turn's cycle, if there was one, queues the next. Rolled here rather than inside the
  // draw so the RNG is spent in one place per turn whatever the deck did.
  if (p.reshuffled) {
    const { copies, chance } = reshuffleCopies(state, ctx.content);
    for (let i = 0; i < copies; i++) {
      if (ctx.rng.range01() >= chance) continue;
      // The copy is of a card that actually cycled — the ones now sitting in the deck.
      const pool = p.deck.length ? p.deck : p.hand;
      const pick = pool[ctx.rng.range(0, pool.length)];
      if (pick) p.queuedCards.push({ moveId: pick.moveId, ownerUid: pick.ownerUid });
    }
  }
  p.reshuffled = false;
  // §2.11.3 Lucky Draw — one more item card on the turn it names, from the pile rather than the deck.
  const cons = drawConsumables(state, ctx.config.baseConsumableCardsPerTurn + itemConsumableDrawBonus(state, state.turn, ctx.content), ctx.rng);
  emit(state, { t: 'draw', cardIds: drawn.map((c) => c.id), consumableIds: cons.map((c) => c.id) });

  // §4.2.3.1 — Confusion: each Confused Pokémon discards 1 random skill card; consumables are immune.
  for (const c of p.team) {
    if (c.hp <= 0 || c.confusionTurns <= 0) continue;
    if (!statusActiveThisTurn({ appliedTurn: c.confusionAppliedTurn }, state.turn)) continue;
    if (p.hand.length > 0) {
      const idx = ctx.rng.range(0, p.hand.length);
      const [card] = p.hand.splice(idx, 1);
      p.discard.push(card!);
      emit(state, { t: 'confusion-discard', uid: c.uid, cardId: card!.id });
      log(state, 'system', `${c.name} is confused and fumbled a card.`);
    }
    c.confusionTurns -= 1;
    if (c.confusionTurns === 0) {
      emit(state, { t: 'status-cleared', targetUid: c.uid, status: 'confusion', cause: 'expired' });
      log(state, 'system', `${c.name} snapped out of confusion.`);
    }
  }

  // §3.2.3 — Intent phase (boss phase transitions first, §5.8.3).
  state.phase = 'intent';
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    applyPhaseTransitions(state, e, ctx);
    declareIntent(state, e, ctx, ctx.rng);
  }
  state.phase = 'action';
}

/** §3.2.5 — Resolution: enemy intents → abilities → status ticks → cooldowns → discard → outcome → next turn. */
export function resolveTurn(state: CombatState, ctx: RunCtx): void {
  state.phase = 'resolution';
  // §8.6.1 Reactor Core's discovery — how many cards you were still holding when you ended the turn.
  state.player.tally.peakHandAtTurnEnd = Math.max(state.player.tally.peakHandAtTurnEnd, state.player.hand.length);

  // Enemies act in slot order (supports first, lead enemy last — §5.6; single enemy in v0.1).
  for (const e of [...state.enemies]) {
    if (e.hp <= 0 || state.outcome !== 'in-progress') continue;
    executeIntent(state, e, ctx);
    if (checkOutcome(state)) return finish(state);
  }

  // §6.6 Healer — turn-end bench heal.
  for (const c of aliveTeam(state)) {
    const amount = turnEndBenchHeal(c, ctx.content);
    if (amount <= 0) continue;
    const benches = benchIndices(state)
      .map((i) => state.player.team[i]!)
      .filter((b) => b.hp > 0 && b.hp < b.maxHp);
    if (benches.length === 0) continue;
    const target = benches[ctx.rng.range(0, benches.length)]!;
    heal(state, target, amount, 'ability');
  }

  // §7.4.4 Leftovers — the wearer's own end-of-turn heal, before the status ticks that may undo it.
  for (const c of aliveTeam(state)) {
    const amount = itemTurnEndHeal(c, ctx.content);
    if (amount > 0) heal(state, c, amount, 'ability');
  }

  // Status ticks (§4.2), players first then enemies.
  for (const c of [...state.player.team, ...state.enemies]) tickStatuses(state, c, ctx);
  if (checkOutcome(state)) return finish(state);

  // §5.3 — cooldowns tick down.
  for (const e of state.enemies) {
    for (const id of Object.keys(e.cooldowns)) {
      e.cooldowns[id] = Math.max(0, (e.cooldowns[id] ?? 0) - 1);
      if (e.cooldowns[id] === 0) delete e.cooldowns[id];
    }
  }

  // §3.2.5 — hand to discard (fainted owners' cards dropped), unused consumables back to the pool.
  // §7.3 — bank the AP a relic earned this turn before the turn's bookkeeping is cleared.
  state.player.bankedAp += itemBankedAp(state, ctx.content);
  // §7.3 Battle Hat — keep a card past the discard when you did not swap.
  const keep = itemRetainCards(state, ctx.content);
  const aliveUids = new Set(aliveTeam(state).map((c) => c.uid));
  const retained = keep > 0 ? state.player.hand.slice(0, keep).filter((c) => aliveUids.has(c.ownerUid)) : [];
  discardHand(state, (uid) => aliveUids.has(uid));
  // §8.8 Faint Echo — a fainted Pokémon jams the pile for exactly one turn, then the cards go.
  const swept = sweepEchoes(state);
  if (swept > 0) log(state, "system", `The echo fades — ${swept} dead card${swept === 1 ? "" : "s"} leave the discard.`);
  if (retained.length) {
    state.player.discard = state.player.discard.filter((c) => !retained.includes(c));
    state.player.hand = retained;
    log(state, 'system', `Held on to ${retained.length} card${retained.length === 1 ? '' : 's'}.`);
  }
  returnConsumableHand(state);

  // §3.3.5 — the Lead fainted: the player must pick a replacement before the next turn.
  const l = lead(state);
  if ((!l || l.hp <= 0) && aliveTeam(state).length > 0) {
    state.player.pendingLeadPick = true;
    emit(state, { t: 'lead-pick-required' });
    log(state, 'system', 'Choose a new Lead.');
    return;
  }
  beginTurn(state, ctx);
}

export function tickStatuses(state: CombatState, c: Combatant, ctx: RunCtx): void {
  if (c.hp <= 0) return;
  if (c.regen) {
    const amount = heal(state, c, c.maxHp * c.regen.percentOfMaxHp, 'regen');
    if (amount > 0) log(state, 'system', `${c.name} regenerated ${amount} HP.`);
    c.regen.turnsLeft -= 1;
    if (c.regen.turnsLeft <= 0) c.regen = null;
  }
  const s = c.status;
  if (!s || !statusActiveThisTurn(s, state.turn)) return;
  const dot = dotDamage(c, ctx.config);
  if (dot > 0) {
    log(state, 'system', `${c.name} is hurt by its ${s.kind} (${dot}).`);
    dealDamage(state, ctx, null, c, dot, { crit: false, effectiveness: 'neutral', cause: s.kind === 'burn' ? 'burn' : 'poison' });
    // §7.5 Toxic — count the tick *after* it lands, so the first one is the ordinary Poison number.
    if (s.escalatingTicks !== undefined) s.escalatingTicks += 1;
    if (c.hp <= 0) return;
  }
  if (s.turnsLeft !== null) {
    s.turnsLeft -= 1;
    if (s.turnsLeft <= 0) {
      const kind = s.kind;
      c.status = null;
      emit(state, { t: 'status-cleared', targetUid: c.uid, status: kind, cause: 'expired' });
      log(state, 'system', `${c.name} is no longer ${kind === 'sleep' ? 'asleep' : kind === 'freeze' ? 'frozen' : 'paralysed'}.`);
    }
  }
}

/** §3.1 — Victory when no enemies remain (or the wild was caught); Defeat when the whole team fainted. */
export function checkOutcome(state: CombatState): boolean {
  if (state.outcome !== 'in-progress') return true;
  if (aliveTeam(state).length === 0) {
    state.outcome = 'defeat';
    return true;
  }
  if (state.enemies.every((e) => e.hp <= 0) && state.enemyQueue.length === 0) {
    state.outcome = 'victory';
    return true;
  }
  return false;
}

/**
 * §3.1.2 — run. The enemy gets the action it telegraphed (the parting shot); if the team survives it, the fight
 * ends as Escaped. No XP, no drop, no catch — the run layer collects the toll (§3.1.2's table).
 */
export function flee(state: CombatState, ctx: RunCtx): void {
  state.phase = 'resolution';
  log(state, 'player', 'You break for the exit —');
  for (const e of [...state.enemies]) {
    if (e.hp <= 0 || state.outcome !== 'in-progress') continue;
    executeIntent(state, e, ctx);
    if (checkOutcome(state)) return finish(state);
  }
  state.outcome = 'escaped';
  finish(state);
}

export function finish(state: CombatState): void {
  state.phase = 'ended';
  emit(state, { t: 'outcome', outcome: state.outcome });
  log(state, 'system', state.outcome === 'defeat' ? 'Your team was wiped out…' : state.outcome === 'caught' ? 'Gotcha!' : state.outcome === 'escaped' ? 'Got away.' : 'Victory!');
  // §4.2.7 — statuses and stages clear at combat end (kept in state for the summary; the run layer resets).
}
