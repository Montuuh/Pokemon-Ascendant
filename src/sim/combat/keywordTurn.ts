import type { RunCtx } from './context';
import { emit, log } from './context';
import { applyMoveEffects, heal, strike } from './damageFlow';
import { afterUse, FIELD_NAME } from './keywords';
import { activeEnemy, slotOccupant } from './slots';
import type { Combatant, CombatState } from './state';
import { applyStatus } from './status';
import type { FieldCategory } from './fields';
import type { SlotId } from '../types';

// §3.11 — what the move keywords do at the turn's edges: Guard falls away, a recharge binds, a rampage returns or ends,
// a charged hit lands (all at the start); side conditions, Wish and move-set fields count down (at the end).

/** §3.11 — the top of the turn, before the AP refill and the draw. */
export function keywordTurnStart(state: CombatState, ctx: RunCtx): void {
  const everyone: Combatant[] = [...state.player.team, ...state.enemies];
  for (const c of everyone) {
    // §3.11.4 — Guard lasts until the next turn starts.
    if (c.guard !== undefined) delete c.guard;
    const v = c.volatile;
    if (!v) continue;
    // §3.11.8 — the turn after the ultimate is the recharge turn.
    if (v.recharge === 'pending') v.recharge = 'active';
    // §3.11.9 — a rampage binds from the turn after it began, and ends — in Confusion — when its returns are spent.
    if (v.rampage) {
      if (v.rampage.active && v.rampage.left <= 0) {
        delete v.rampage;
        if (c.hp > 0 && applyStatus(c, 'confusion', state.turn, ctx.config) === 'applied') {
          emit(state, { t: 'status-applied', targetUid: c.uid, status: 'confusion' });
          log(state, 'system', `${c.name}'s rampage ends — it is confused!`);
        }
      } else v.rampage.active = true;
    }
  }
  // §3.11.10 — your charged hits land now, on the foe they were aimed at (the enemy Lead if that one has gone). An
  // enemy's land as its next intent instead (`declareIntent`), so they are telegraphed twice.
  for (const owner of state.player.team) {
    const charge = owner.volatile?.charge;
    if (!charge || charge.turn >= state.turn) continue;
    delete owner.volatile!.charge;
    if (owner.hp <= 0) continue;
    const move = ctx.content.move(charge.moveId);
    const target = state.enemies.find((e) => e.uid === charge.targetUid && e.hp > 0) ?? activeEnemy(state);
    if (!target) continue;
    log(state, 'player', `${owner.name}'s ${move.name} lands!`);
    if (move.power > 0) strike(state, ctx, owner, target, move, !!move.alwaysCrit);
    if (target.hp > 0) applyMoveEffects(state, ctx, owner, target, move);
    afterUse(state, owner, move);
  }
}

/** §3.11.9 — with the hand drawn, each rampaging Pokémon of yours gets its move back, free and for this turn only. */
export function rampageReturns(state: CombatState): void {
  for (const owner of state.player.team) {
    const r = owner.volatile?.rampage;
    if (!r || !r.active || r.left <= 0 || owner.hp <= 0) continue;
    r.left -= 1;
    state.player.hand.push({ id: `c${state.nextCardSerial++}`, moveId: r.moveId, ownerUid: owner.uid, temp: true });
    log(state, 'system', `${owner.name} is still on a rampage.`);
  }
}

/** §3.11 — the end of the Resolution: the side conditions, Wish and the move-set fields count down; a recharge is over. */
export function keywordTurnEnd(state: CombatState): void {
  for (const c of [...state.player.team, ...state.enemies]) if (c.volatile?.recharge === 'active') delete c.volatile.recharge;

  if (state.sides?.length) {
    // §5.2.3 — Spikes and Stealth Rock stay for the fight.
    for (const s of state.sides) if (!s.lasting) s.turnsLeft -= 1;
    for (const s of state.sides.filter((x) => x.turnsLeft <= 0)) {
      // §3.11.13 — the wish comes true for whoever stands in its place now.
      if (s.id === 'wish') {
        const who = s.side === 'player' ? slotOccupant(state, s.place as SlotId) : state.enemies[s.place as number];
        if (who && who.hp > 0) {
          const healed = heal(state, who, s.amount ?? 0, 'move');
          log(state, 'system', healed > 0 ? `The wish comes true — ${who.name} recovers ${healed} HP.` : `The wish comes true.`);
        }
      } else {
        log(state, 'system', `${s.side === 'player' ? 'Your' : 'The enemy'} ${SIDE_LABEL[s.id]} wore off.`);
      }
    }
    state.sides = state.sides.filter((x) => x.turnsLeft > 0);
  }

  // §4.3.15 — a move-set field gives back the ground the fight opened with.
  if (state.fieldTimers) {
    for (const category of Object.keys(state.fieldTimers) as FieldCategory[]) {
      const timer = state.fieldTimers[category]!;
      timer.turnsLeft -= 1;
      if (timer.turnsLeft > 0) continue;
      const gone = state.fields[category];
      const fields = { ...state.fields };
      if (timer.restore) fields[category] = timer.restore;
      else delete fields[category];
      state.fields = fields;
      delete state.fieldTimers[category];
      emit(state, { t: 'field', fields: { ...state.fields } });
      log(state, 'system', `${gone ? FIELD_NAME[gone] : 'The field'} fades${timer.restore ? ` — ${FIELD_NAME[timer.restore]} again` : ''}.`);
    }
  }
}

const SIDE_LABEL = { reflect: 'Reflect', 'light-screen': 'Light Screen', safeguard: 'Safeguard', mist: 'Mist', wish: 'wish', spikes: 'Spikes', 'stealth-rock': 'Stealth Rock' } as const;
