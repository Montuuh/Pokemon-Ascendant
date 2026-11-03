import type { MoveDef, MoveEffect } from '../content/defs';
import type { RunCtx } from './context';
import { emit, log } from './context';
import { changeStage, dealDamage, heal } from './damageFlow';
import { activeEnemy, setLead, slotOrder } from './slots';
import type { Combatant, CombatState, EnemyCombatant, SideCondition } from './state';
import { applyStatus, isPositionLocked } from './status';
import { typeMultiplier } from './typeChart';

// §5.2.3 — the enemy's utility that hurts (v0.9.92, the user's call: "stronger, more useful non-damaging moves"): each
// one telegraphed on its intent, and nearly every one answered by a swap (Pillar 2). Played by your side, the same moves
// do the same to the foe where the foe can feel it.

type Fx<K extends MoveEffect['kind']> = Extract<MoveEffect, { kind: K }>;

const isPlayers = (state: CombatState, c: Combatant) => state.player.team.includes(c);
const leadOfPlayer = (state: CombatState) => state.player.team[state.player.leadIndex];

/** §5.2.3 — one disruption effect of a move that landed on `target` (null for one aimed at a side or the field). */
export function applyDisruption(state: CombatState, ctx: RunCtx, user: Combatant, target: Combatant | null, fx: MoveEffect): void {
  switch (fx.kind) {
    case 'disable':
      return disable(state, ctx, target, fx);
    case 'taunt':
      if (!target) return;
      vol(target).tauntUntil = state.turn + fx.turns;
      log(state, 'system', `${target.name} fell for the taunt — no moves but attacks for now.`);
      // A foe's declared set-up is broken now, and shown so: its chip is what will happen (§5.2).
      if (!isPlayers(state, target)) breakIntents(target as EnemyCombatant, ctx, (m) => m.power === 0);
      return;
    case 'force-swap':
      return forceSwap(state, ctx, user, target);
    case 'trap':
      if (!target) return;
      vol(target).trappedUntil = state.turn + fx.turns;
      log(state, 'system', `${target.name} can't get away!`);
      return;
    case 'drowsy':
      if (!target || target.status) return;
      vol(target).drowsyTurn = state.turn + 1;
      log(state, 'system', `${target.name} grew drowsy — it will fall asleep at the end of next turn if it stays in.`);
      return;
    case 'perish':
      if (state.perish) return;
      state.perish = { turnsLeft: fx.turns, sungTurn: state.turn };
      log(state, 'system', `Perish Song echoes — after ${fx.turns} more turns, whoever leads on each side is struck.`);
      return;
    case 'seed':
      if (!target || target.volatile?.seeded) return;
      vol(target).seeded = { percent: fx.percent, heal: fx.heal, bySide: isPlayers(state, user) ? 'player' : 'enemy' };
      log(state, 'system', fx.heal ? `${target.name} was seeded!` : `${user.name} laid a curse on ${target.name}!`);
      return;
    case 'hazard': {
      const side: SideCondition['side'] = isPlayers(state, user) ? 'enemy' : 'player';
      state.sides ??= [];
      if (state.sides.some((s) => s.id === fx.hazard && s.side === side)) return;
      // They stay for the fight: `lasting`, so the clock never counts them down (keywordTurnEnd).
      state.sides.push({ id: fx.hazard, side, turnsLeft: 1, lasting: true });
      log(state, 'system', `${fx.hazard === 'spikes' ? 'Spikes' : 'Pointed stones'} are scattered around ${side === 'player' ? 'your' : 'the enemy'} side.`);
      return;
    }
    case 'knock-off':
      if (!target?.heldItemId) return;
      log(state, 'system', `${user.name} knocked off ${target.name}'s ${ctx.content.heldItem(target.heldItemId).name}!`);
      target.heldItemId = null;
      return;
    case 'haze':
      for (const c of [...state.player.team, ...state.enemies]) {
        if (c.hp <= 0) continue;
        for (const stat of ['attack', 'defense', 'speed'] as const) if (c.stages[stat] !== 0) changeStage(state, c, stat, -c.stages[stat]);
      }
      log(state, 'system', 'A haze washes every stat change away.');
      return;
    case 'helping-hand': {
      const ally = isPlayers(state, user) ? leadOfPlayer(state) : activeEnemy(state);
      const who = ally && ally.uid !== user.uid && ally.hp > 0 ? ally : user;
      vol(who).helped = { turn: state.turn, multiplier: fx.multiplier };
      log(state, 'system', `${user.name} is ready to help ${who.name}!`);
      return;
    }
    default:
      return;
  }
}

function vol(c: Combatant) {
  c.volatile ??= {};
  return c.volatile;
}

/**
 * §5.2.3 Disable — on your side it locks the target's strongest card for its turns; on a foe, the move it declared this
 * turn (the series' last move), else its strongest: the intent fizzles, and it is not chosen again until the lock lifts.
 */
function disable(state: CombatState, ctx: RunCtx, target: Combatant | null, fx: Fx<'disable'>): void {
  if (!target) return;
  const strongest = [...target.moveIds].map((id) => ctx.content.move(id)).sort((a, b) => b.power - a.power)[0];
  if (isPlayers(state, target)) {
    if (!strongest) return;
    state.player.disabled = { moveId: strongest.id, ownerUid: target.uid, untilTurn: state.turn + fx.turns };
    log(state, 'system', `${target.name}'s ${strongest.name} was disabled!`);
    return;
  }
  const foe = target as EnemyCombatant;
  const named = foe.intent?.moveId ? ctx.content.move(foe.intent.moveId) : strongest;
  if (!named) return;
  vol(foe).disabledMove = { moveId: named.id, untilTurn: state.turn + fx.turns };
  foe.cooldowns[named.id] = Math.max(foe.cooldowns[named.id] ?? 0, fx.turns + 1);
  log(state, 'system', `${target.name}'s ${named.name} was disabled!`);
  breakIntents(foe, ctx, (m) => m.id === named.id);
}

/** §5.2.3 — a foe's declared actions that a Taunt or a Disable now stops: struck out on their chips, and they do not happen. */
function breakIntents(foe: EnemyCombatant, ctx: RunCtx, stops: (m: MoveDef) => boolean): void {
  const hit = (i: EnemyCombatant['intent']) => !!i?.moveId && !i.broken && stops(ctx.content.move(i.moveId));
  if (hit(foe.intent)) foe.intent = { ...foe.intent!, broken: true };
  if (hit(foe.second ?? null)) foe.second = { ...foe.second!, broken: true };
  // A combo whose set-up is stopped does not follow through either.
  if (foe.next?.combo && foe.intent?.broken) foe.next = null;
}

/** §5.2.3 — an enemy's move a Disable holds this turn. */
export function moveDisabled(c: Combatant, moveId: string, turn: number): boolean {
  const d = c.volatile?.disabledMove;
  return !!d && d.moveId === moveId && turn <= d.untilTurn;
}

/**
 * §5.2.3 Roar / Whirlwind — your Lead is dragged out, and the most hurt Pokémon of your bench is dragged in (no AP, no
 * swap ladder); a rooted, trapped or frozen Lead stands. On a foe it blows its stat changes away instead.
 */
function forceSwap(state: CombatState, ctx: RunCtx, user: Combatant, target: Combatant | null): void {
  if (!target) return;
  if (!isPlayers(state, target)) {
    for (const stat of ['attack', 'defense', 'speed'] as const) if (target.stages[stat] > 0) changeStage(state, target, stat, -target.stages[stat]);
    log(state, 'system', `${target.name}'s build-up is blown away!`);
    return;
  }
  const lead = leadOfPlayer(state);
  const next = forcedSwapTarget(state);
  if (!lead || lead.uid !== target.uid || next === null) {
    log(state, 'system', `${target.name} stands its ground.`);
    return;
  }
  const from = state.player.leadIndex;
  const dragged = state.player.team[next]!;
  setLead(state, next);
  emit(state, { t: 'swap', fromIndex: from, toIndex: next, kind: 'forced', apCost: 0 });
  log(state, 'system', `${target.name} is driven out — ${dragged.name} is dragged in!`);
  // The hazards' hit is the Roar's: the forecast plays the turn in order (rocks laid first count), and puts it on its action.
  enterSideHazards(state, ctx, dragged, user.uid);
  void user;
}

/**
 * §5.2.3 — who a Roar drags into your Lead now: the most hurt of your bench standing, or null when your Lead stands its
 * ground (rooted, frozen, recharging, rampaging) or nobody can come in. The intent's card names it.
 */
export function forcedSwapTarget(state: CombatState): number | null {
  const lead = leadOfPlayer(state);
  if (!lead || lead.hp <= 0 || isPositionLocked(lead) || (lead.volatile?.rooted ?? false)) return null;
  const bench = slotOrder(state).slice(1).map((i) => ({ i, c: state.player.team[i]! })).filter((x) => x.c && x.c.hp > 0);
  if (!bench.length) return null;
  return bench.sort((a, b) => a.c.hp / a.c.maxHp - b.c.hp / b.c.maxHp)[0]!.i;
}

/** §5.2.3 — your card is locked by Disable this turn. */
export function cardDisabled(state: CombatState, ownerUid: string, moveId: string): boolean {
  const d = state.player.disabled;
  return !!d && d.ownerUid === ownerUid && d.moveId === moveId && state.turn <= d.untilTurn;
}

/** §5.2.3 — under a Taunt, its non-damaging moves cannot be played (yours) or chosen (an enemy's). */
export function isTaunted(c: Combatant, turn: number): boolean {
  return (c.volatile?.tauntUntil ?? 0) >= turn;
}

/** §5.2.3 — Mean Look: it cannot be swapped out this turn. */
export function isTrapped(c: Combatant, turn: number): boolean {
  return (c.volatile?.trappedUntil ?? 0) >= turn;
}

/**
 * §5.2.3 Revenge / Avalanche — a move hurt it since it last acted: an enemy, this turn (your cards come before its turn);
 * yours, since the enemies' last Resolution.
 */
export function hurtSinceItsTurn(state: CombatState, c: Combatant): boolean {
  const hurt = c.volatile?.hurtTurn;
  if (hurt === undefined) return false;
  return isPlayers(state, c) ? hurt >= state.turn - 1 : hurt === state.turn;
}

/** §5.2.3 Helping Hand — the boost on this Pokémon's hits this turn (1 without one). */
export function helpingMultiplier(c: Combatant, turn: number): number {
  return c.volatile?.helped?.turn === turn ? c.volatile.helped.multiplier : 1;
}

/**
 * §5.2.3 — Spikes and Stealth Rock: what each one standing on its side takes from a Pokémon stepping into that side's
 * Lead (Spikes miss a Flyer; Stealth Rock × Rock's effectiveness). Pure: the swap's preview reads the same numbers.
 */
export function sideHazardDamage(state: CombatState, ctx: Pick<RunCtx, 'config'>, entering: Combatant): { id: 'spikes' | 'stealth-rock'; amount: number }[] {
  if (entering.hp <= 0 || !state.sides?.length) return [];
  const side = isPlayers(state, entering) ? 'player' : 'enemy';
  const out: { id: 'spikes' | 'stealth-rock'; amount: number }[] = [];
  for (const s of state.sides.filter((x) => x.side === side)) {
    if (s.id !== 'spikes' && s.id !== 'stealth-rock') continue;
    if (s.id === 'spikes' && entering.types.includes('flying')) continue;
    const share = ctx.config.disruption.hazardPercent * (s.id === 'stealth-rock' ? typeMultiplier('rock', entering.types) : 1);
    if (share > 0) out.push({ id: s.id, amount: Math.max(1, Math.floor(entering.maxHp * share)) });
  }
  return out;
}

/** §5.2.3 — the hazards on its side, dealt to the Pokémon stepping into its Lead (`by`: the Roar that dragged it there). */
export function enterSideHazards(state: CombatState, ctx: RunCtx, entering: Combatant, by: string | null = null): void {
  for (const h of sideHazardDamage(state, ctx, entering)) {
    if (entering.hp <= 0) return;
    log(state, 'system', `${entering.name} is hurt by the ${h.id === 'spikes' ? 'spikes' : 'pointed stones'} (${h.amount}).`);
    dealDamage(state, ctx, by, entering, h.amount, { crit: false, effectiveness: 'neutral', cause: 'hazard' });
  }
}

/**
 * §5.2.3 — the turn's end: a seed or a curse drains whoever carries it (a seed feeds the other side's Lead) — on your side
 * only while it leads, so a swap shakes it off; a drowsy Lead falls asleep; Perish Song counts down, and at zero strikes
 * both Leads.
 */
export function disruptionTurnEnd(state: CombatState, ctx: RunCtx): void {
  const playerLead = leadOfPlayer(state);
  for (const c of [...state.player.team, ...state.enemies]) {
    const v = c.volatile;
    if (!v || c.hp <= 0) continue;
    const mine = isPlayers(state, c);
    // A swap shakes off a seed, a curse and drowsiness: they hold only on the Pokémon that leads.
    if (mine && c !== playerLead) {
      delete v.seeded;
      delete v.drowsyTurn;
      continue;
    }
    if (v.seeded) {
      const chip = Math.max(1, Math.floor(c.maxHp * v.seeded.percent));
      log(state, 'system', `${c.name} is ${v.seeded.heal ? 'sapped by the seed' : 'wracked by the curse'} (${chip}).`);
      const dealt = dealDamage(state, ctx, null, c, chip, { crit: false, effectiveness: 'neutral', cause: 'seed' });
      const healer = v.seeded.bySide === 'player' ? playerLead : activeEnemy(state);
      if (v.seeded.heal && healer && healer.hp > 0 && dealt > 0) heal(state, healer, dealt, 'move');
    }
    if (v.drowsyTurn !== undefined && v.drowsyTurn <= state.turn) {
      delete v.drowsyTurn;
      if (c.hp > 0 && applyStatus(c, 'sleep', state.turn, ctx.config) === 'applied') {
        emit(state, { t: 'status-applied', targetUid: c.uid, status: 'sleep' });
        log(state, 'system', `${c.name} fell asleep!`);
      }
    }
  }
  // The song's own turn does not count: its count is the turns you have to answer it.
  if (state.perish && state.perish.sungTurn < state.turn) {
    state.perish.turnsLeft -= 1;
    if (state.perish.turnsLeft <= 0) {
      delete state.perish;
      for (const c of [playerLead, activeEnemy(state)]) {
        if (!c || c.hp <= 0) continue;
        log(state, 'system', `The song ends — ${c.name} is struck!`);
        dealDamage(state, ctx, null, c, Math.max(1, Math.floor(c.maxHp * ctx.config.disruption.perishPercent)), { crit: false, effectiveness: 'neutral', cause: 'perish' });
      }
    } else log(state, 'system', `Perish Song: ${state.perish.turnsLeft} turn${state.perish.turnsLeft === 1 ? '' : 's'} left.`);
  }
}

/** §5.2.3 — the disruption kinds, for the classifier and the card text. */
export const DISRUPTION_KINDS = ['disable', 'taunt', 'force-swap', 'trap', 'drowsy', 'perish', 'seed', 'hazard', 'knock-off', 'haze', 'helping-hand'] as const;

export function disrupts(move: MoveDef): boolean {
  return move.effects.some((e) => (DISRUPTION_KINDS as readonly string[]).includes(e.kind) && e.kind !== 'knock-off');
}
