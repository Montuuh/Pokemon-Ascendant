import type { ContentRegistry, MoveDef, MoveEffect } from '../content/defs';
import type { RunCtx } from './context';
import { emit, log } from './context';
import { levelTerm } from './damage';
import { FIELD_CATEGORY, fieldsSuppressed, withField, type FieldId } from './fields';
import { latchPhase } from './phases';
import { indexToSlot } from './slots';
import { stageMultiplier } from './statStages';
import type { Combatant, CombatState, EnemyCombatant, SideCondition, Volatile } from './state';

// §3.11 — the move keywords: Protect, Endure, Guard, Substitute, the side conditions, fields set by a move, Recharge,
// Rampage, Charge, Counter, Wish, Ingrain. Predicates and state changes only — the hits a keyword lands at a turn's
// start live in `keywordTurn.ts`, which may call the damage pipeline this module must not import.

export const isPlayers = (state: CombatState, c: Combatant): boolean => state.player.team.some((m) => m.uid === c.uid);
export const sideOf = (state: CombatState, c: Combatant): 'player' | 'enemy' => (isPlayers(state, c) ? 'player' : 'enemy');

/** The keyword state on a Pokémon, made on first use so a fight without keywords never carries it. */
export function volatileOf(c: Combatant): Volatile {
  return (c.volatile ??= {});
}

export const hasEffect = (move: MoveDef, kind: MoveEffect['kind']): boolean => move.effects.some((e) => e.kind === kind);

/** §3.11.2 — its Protect is up this turn. */
export const isProtected = (state: CombatState, c: Combatant): boolean => c.volatile?.protectTurn === state.turn;

/** §3.11.10 — it is in the air (or underground) until its charged hit lands. */
export const isOutOfReach = (c: Combatant): boolean => !!c.volatile?.charge?.outOfReach;

/** §3.11.2 / §3.11.10 — nothing the other side aims at it lands. */
export const isShielded = (state: CombatState, c: Combatant): boolean => isProtected(state, c) || isOutOfReach(c);

/** §3.11.8 — through its recharge turn its cards are locked and its place fixed. */
export const isRecharging = (c: Combatant): boolean => c.volatile?.recharge === 'active';

/** §3.11.8 / §3.11.9 / §3.11.13 — a keyword holds it where it stands: recharging, rampaging, rooted. */
export const keywordLocksPosition = (c: Combatant): boolean => isRecharging(c) || !!c.volatile?.rampage?.active || !!c.volatile?.rooted;

/** §3.11.6 — a side condition stands over this side. */
export function sideHas(state: CombatState, side: 'player' | 'enemy', id: SideCondition['id']): boolean {
  return (state.sides ?? []).some((s) => s.side === side && s.id === id && s.turnsLeft > 0);
}

/** §3.11.6 — Reflect (Melee) or Light Screen (Ranged) over the target's side: one more independent damage term. */
export function screenMultiplier(state: CombatState, target: Combatant, move: MoveDef, ctx: Pick<RunCtx, 'config'>): number {
  if (move.power <= 0) return 1;
  const side = sideOf(state, target);
  const screen = move.range === 'melee' ? 'reflect' : 'light-screen';
  return sideHas(state, side, screen) ? ctx.config.keywords.screenMultiplier : 1;
}

/** §3.11.1 — the uses left this fight; null for a move without PP. */
export function ppLeft(c: Combatant, move: MoveDef): number | null {
  if (!move.pp) return null;
  return Math.max(0, move.pp - (c.ppUsed?.[move.id] ?? 0));
}

/** §3.11.1 — spend one PP; true when that was the last, so the card is exhausted. */
export function spendPp(c: Combatant, move: MoveDef): boolean {
  if (!move.pp) return false;
  const used = (c.ppUsed ??= {});
  used[move.id] = (used[move.id] ?? 0) + 1;
  return used[move.id]! >= move.pp;
}

/** §3.11.2 — it raised a Protect last turn, so it cannot raise the next. */
export const protectBlocked = (state: CombatState, c: Combatant, move: MoveDef): boolean =>
  hasEffect(move, 'protect') && c.volatile?.protectedLast === state.turn - 1;

/** §4.3.15 — what the standing fields add to (or take off) this card's cost. */
export function fieldApDelta(state: CombatState, move: MoveDef, content: ContentRegistry): number {
  let delta = 0;
  for (const fx of move.effects) if (fx.kind === 'field-cost' && fieldStands(state, fx.field, content)) delta += fx.delta;
  return delta;
}

/** §4.3 — this field stands now, and no Cloud Nine is suppressing it. */
export function fieldStands(state: CombatState, field: FieldId, content: ContentRegistry): boolean {
  const fields = state.fields ?? {};
  return fields[FIELD_CATEGORY[field]] === field && !fieldsSuppressed(state, content);
}

/** §5.2.1 — a keyword move that guards rather than strikes: an enemy's takes effect the moment it is declared. */
export function isStance(move: MoveDef): boolean {
  if (move.power > 0) return false;
  return move.effects.some((e) => e.kind === 'protect' || e.kind === 'endure' || e.kind === 'guard' || e.kind === 'substitute' || e.kind === 'counter' || e.kind === 'side-condition' || e.kind === 'set-field');
}

/**
 * §3.11 — apply one keyword effect of `move`, used by `user`. Returns false for the kinds resolved elsewhere (Recharge,
 * Rampage and Charge after the move; the field cost at pricing; Baton Pass on the step back).
 */
export function applyKeyword(state: CombatState, ctx: RunCtx, user: Combatant, fx: MoveEffect): boolean {
  switch (fx.kind) {
    case 'protect': {
      const v = volatileOf(user);
      v.protectTurn = state.turn;
      v.protectedLast = state.turn;
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'protect' });
      log(state, 'system', `${user.name} protected itself!`);
      return true;
    }
    case 'endure':
      volatileOf(user).endureTurn = state.turn;
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'endure' });
      log(state, 'system', `${user.name} braced itself!`);
      return true;
    case 'guard': {
      const amount = guardAmount(user, fx.power, ctx);
      user.guard = (user.guard ?? 0) + amount;
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'guard', amount });
      log(state, 'system', `${user.name} guards (${user.guard}).`);
      return true;
    }
    case 'substitute': {
      const cost = Math.floor(user.maxHp * fx.percentOfMaxHp);
      if ((user.substitute ?? 0) > 0 || cost <= 0 || user.hp <= cost) {
        log(state, 'system', (user.substitute ?? 0) > 0 ? `${user.name} already has a substitute.` : `${user.name} is too weak to make a substitute.`);
        return true;
      }
      user.hp -= cost;
      user.substitute = cost;
      if ('phaseCount' in user) latchPhase(user as EnemyCombatant, ctx.config);
      emit(state, { t: 'damage', sourceUid: user.uid, targetUid: user.uid, amount: cost, crit: false, effectiveness: 'neutral', hpAfter: user.hp, cause: 'move' });
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'substitute', amount: cost });
      log(state, 'system', `${user.name} put in a substitute (${cost} HP).`);
      return true;
    }
    case 'side-condition': {
      const side = sideOf(state, user);
      const sides = (state.sides ??= []);
      const standing = sides.find((s) => s.side === side && s.id === fx.condition);
      if (standing) standing.turnsLeft = fx.turns;
      else sides.push({ id: fx.condition, side, turnsLeft: fx.turns });
      log(state, 'system', `${SIDE_TEXT[fx.condition]} covers ${side === 'player' ? 'your team' : 'the enemy side'} for ${fx.turns} turns.`);
      return true;
    }
    case 'set-field': {
      setField(state, ctx, user, fx.field, fx.turns);
      return true;
    }
    case 'counter':
      volatileOf(user).counter = { range: fx.range, multiplier: fx.multiplier, turn: state.turn };
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'counter' });
      log(state, 'system', `${user.name} gets ready to strike back (${fx.range === 'melee' ? 'Melee' : 'Ranged'}).`);
      return true;
    case 'wish': {
      // §3.11.13 — the place, not the Pokémon: whoever stands there at the end of the next Resolution takes it.
      const side = sideOf(state, user);
      const place = side === 'player' ? indexToSlot(state, state.player.team.indexOf(user)) : state.enemies.findIndex((e) => e.uid === user.uid);
      (state.sides ??= []).push({ id: 'wish', side, turnsLeft: 2, place, amount: Math.max(1, Math.floor(user.maxHp * fx.percentOfMaxHp)) });
      log(state, 'system', `${user.name} made a wish.`);
      return true;
    }
    case 'root':
      volatileOf(user).rooted = true;
      log(state, 'system', `${user.name} planted its roots — it will not move from here.`);
      return true;
    default:
      return false;
  }
}

/**
 * §3.11.4 — the Guard a move of `power` gives this Pokémon now: it grows with its level as the hits it stops do (§4.1.1's
 * level term) — the level term × the power over the divisor, × the species' base Defence against the reference, × its
 * Defence stage. The card prints this number, so the plate and the chip agree.
 */
export function guardAmount(c: Combatant, power: number, ctx: Pick<RunCtx, 'content' | 'config'>): number {
  const base = ctx.content.species(c.speciesId).baseStats.defense;
  return Math.max(1, Math.floor(((levelTerm(c.level, ctx.config) * power) / ctx.config.divisor) * (base / ctx.config.keywords.guardReferenceDefence) * stageMultiplier(c.stages.defense, ctx.config)));
}

const SIDE_TEXT: Record<SideCondition['id'], string> = {
  reflect: 'Reflect',
  'light-screen': 'Light Screen',
  safeguard: 'Safeguard',
  mist: 'Mist',
  wish: 'A wish',
  spikes: 'Spikes',
  'stealth-rock': 'Stealth Rock',
};

/**
 * §4.3.15 — a field set by a move: its category's place for `turns` Resolutions (more with the matching rock held),
 * remembering what the fight opened with so it comes back. A second move-set field keeps the first one's memory.
 */
export function setField(state: CombatState, ctx: RunCtx, user: Combatant, field: FieldId, turns: number): void {
  const category = FIELD_CATEGORY[field];
  const timers = (state.fieldTimers ??= {});
  const restore = timers[category] ? timers[category]!.restore : (state.fields[category] ?? null);
  const rock = user.heldItemId ? ctx.content.heldItem(user.heldItemId) : null;
  const extra = rock && rock.hook === 'field-duration' && rock.params?.field === field ? ctx.config.keywords.rockExtraTurns : 0;
  state.fields = withField(state.fields, field);
  timers[category] = { turnsLeft: turns + extra, restore: restore === field ? null : restore };
  emit(state, { t: 'field', fields: { ...state.fields } });
  log(state, 'system', `${user.name} changed the field — ${FIELD_NAME[field]} for ${turns + extra} turns.`);
}

export const FIELD_NAME: Record<FieldId, string> = {
  'sunny-day': 'harsh sunlight',
  'rain-dance': 'rain',
  hail: 'hail',
  'electric-terrain': 'Electric Terrain',
  'grassy-terrain': 'Grassy Terrain',
  'psychic-terrain': 'Psychic Terrain',
  'misty-terrain': 'Misty Terrain',
  sandstorm: 'a sandstorm',
  'toxic-spikes': 'Toxic Spikes',
  'sticky-web': 'a Sticky Web',
};

/**
 * §3.11.10 — a charge move used now: true when this use only charges (the hit lands next turn), false when it strikes —
 * because the field skips the charge (Solar Beam in the Sun) or because this is the charged hit being released.
 */
export function startsCharge(state: CombatState, ctx: RunCtx, user: Combatant, move: MoveDef, targetUid: string | null): boolean {
  const fx = move.effects.find((e) => e.kind === 'charge');
  if (!fx || fx.kind !== 'charge') return false;
  const pending = user.volatile?.charge;
  if (pending && pending.moveId === move.id && pending.turn < state.turn) {
    delete user.volatile!.charge;
    return false;
  }
  if (fx.skipIn && fieldStands(state, fx.skipIn, ctx.content)) return false;
  volatileOf(user).charge = { moveId: move.id, targetUid, outOfReach: !!fx.outOfReach, turn: state.turn };
  emit(state, { t: 'keyword', uid: user.uid, keyword: 'charge' });
  log(state, 'system', fx.outOfReach ? `${user.name} is out of reach — ${move.name} lands next turn!` : `${user.name} is charging ${move.name}!`);
  return true;
}

/**
 * §3.11.8 / §3.11.9 — after a move resolves: an ultimate leaves its user recharging next turn; a rampage starts (its
 * free returns and its replays do not start another).
 */
export function afterUse(state: CombatState, user: Combatant, move: MoveDef): void {
  if (user.hp <= 0) return;
  // §3.11.8 Fatigue — the next turn starts short: yours comes off the refill, an enemy's off its budget.
  const fatigue = move.effects.find((e) => e.kind === 'fatigue');
  if (fatigue && fatigue.kind === 'fatigue') {
    if (isPlayers(state, user)) state.player.apDebt = (state.player.apDebt ?? 0) + fatigue.ap;
    else volatileOf(user).fatigue = (user.volatile?.fatigue ?? 0) + fatigue.ap;
    log(state, 'system', `${user.name} is worn out — next turn starts ${fatigue.ap} AP short.`);
  }
  if (hasEffect(move, 'recharge')) {
    volatileOf(user).recharge = 'pending';
    emit(state, { t: 'keyword', uid: user.uid, keyword: 'recharge' });
    log(state, 'system', `${user.name} must recharge next turn.`);
  }
  const rampage = move.effects.find((e) => e.kind === 'rampage');
  if (rampage && rampage.kind === 'rampage') {
    const v = volatileOf(user);
    if (v.rampage && v.rampage.moveId === move.id) {
      // §3.11.9 — an enemy's replay counts down here; yours counted down when the free card came back.
      if (!isPlayers(state, user)) v.rampage.left = Math.max(0, v.rampage.left - 1);
    } else {
      v.rampage = { moveId: move.id, left: rampage.turns, active: !isPlayers(state, user) };
      emit(state, { t: 'keyword', uid: user.uid, keyword: 'rampage' });
      log(state, 'system', `${user.name} goes on a rampage!`);
    }
  }
}

/** §3.11.11 — the return a Counter owes for a hit of `move`'s range that dealt `dealt`; 0 when none. */
export function counterReturn(state: CombatState, target: Combatant, move: MoveDef, dealt: number): number {
  const c = target.volatile?.counter;
  if (!c || c.turn !== state.turn || dealt <= 0 || move.power <= 0 || move.range !== c.range || target.hp <= 0) return 0;
  return Math.max(1, Math.floor(dealt * c.multiplier));
}

/** §3.11.5 / §3.11.6 — a foe's status cannot reach it: behind a Substitute, or under its side's Safeguard. */
export function keywordBlocksStatus(state: CombatState, attacker: Combatant, recipient: Combatant): boolean {
  if (attacker.uid === recipient.uid || sideOf(state, attacker) === sideOf(state, recipient)) return false;
  return (recipient.substitute ?? 0) > 0 || sideHas(state, sideOf(state, recipient), 'safeguard');
}

/** §3.11.5 / §3.11.6 — a foe's stat drop cannot reach it: behind a Substitute, or under its side's Mist. */
export function keywordBlocksDrop(state: CombatState, attacker: Combatant, recipient: Combatant, stages: number): boolean {
  if (stages >= 0 || attacker.uid === recipient.uid || sideOf(state, attacker) === sideOf(state, recipient)) return false;
  return (recipient.substitute ?? 0) > 0 || sideHas(state, sideOf(state, recipient), 'mist');
}

/** §3.11.13 — a weather-scaled heal's multiplier: ×`sun` under Sun, ×`other` under any other weather. */
export function weatherHealMultiplier(state: CombatState, ctx: Pick<RunCtx, 'config' | 'content'>): number {
  const weather = state.fields?.weather;
  if (!weather || fieldsSuppressed(state, ctx.content)) return 1;
  return weather === 'sunny-day' ? ctx.config.keywords.weatherHeal.sun : ctx.config.keywords.weatherHeal.other;
}
