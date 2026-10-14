import type { RunCtx } from './context';
import { emit, log } from './context';
import { dealDamage, heal, onEnterLead } from './damageFlow';
import { isGrounded } from './fields';
import { ruleOf, turnsUntil } from './gymRules';
import { benchIndices, setLead } from './slots';
import type { CombatState } from './state';

// §5.9.5 — the Leader's rule, the half that acts at a turn's edges. The numbers a rule changes are read in
// `gymRules.ts`; this file does what the rule does: a seal at the draw, a shield at the Intent phase, a stage on a
// hit, and the tide, the bloom, the roll and the quake at the end of the turn.

/** §5.9.5 Mind Lock — at the draw of every Nth turn, Sabrina seals the strongest attack in your hand (most power, then the dearest). */
export function sealStrongest(state: CombatState, ctx: RunCtx): void {
  if (ruleOf(state) !== 'mind-lock' || turnsUntil(state, ctx.config.gymRules.mindLockEvery) !== 1) return;
  const rs = (state.ruleState ??= {});
  let best: { id: string; power: number; ap: number } | null = null;
  for (const card of state.player.hand) {
    const move = ctx.content.move(card.moveId);
    if (move.power <= 0) continue;
    if (!best || move.power > best.power || (move.power === best.power && move.apCost > best.ap)) best = { id: card.id, power: move.power, ap: move.apCost };
  }
  if (!best) {
    delete rs.sealedCardId;
    return;
  }
  rs.sealedCardId = best.id;
  log(state, 'enemy', `Sabrina's Mind Lock seals ${ctx.content.move(state.player.hand.find((c) => c.id === best.id)!.moveId).name} this turn.`);
}

/** §5.9.5 Ice Armour — at each Intent phase the enemy Lead's ice shield is set (never stacked) to its share of Max HP. */
export function armourLead(state: CombatState, ctx: RunCtx): void {
  if (ruleOf(state) !== 'ice-armour') return;
  const leader = state.enemies.find((e) => e.hp > 0);
  if (!leader) return;
  const shield = Math.max(1, Math.floor(leader.maxHp * ctx.config.gymRules.iceArmour));
  if (leader.shield >= shield) return;
  leader.shield = shield;
  log(state, 'enemy', `${leader.name} is armoured in ice (${shield}).`);
}

/** Turn start: the bookkeeping the rules keep per turn is cleared. */
export function ruleTurnStart(state: CombatState): void {
  if (ruleOf(state) === 'bloom') for (const e of state.enemies) delete e.hurtThisTurn;
  if (state.ruleState?.sealedCardId) delete state.ruleState.sealedCardId;
}

/**
 * The end of the turn, after the statuses and the fields: Bloom, Tremor, then the Rollout count, then the tide — the
 * swap last, so everything that happened this turn happened to the Lead you chose.
 */
export function ruleTurnEnd(state: CombatState, ctx: RunCtx): void {
  const rule = ruleOf(state);
  if (!rule) return;
  const g = ctx.config.gymRules;

  if (rule === 'bloom') {
    for (const e of state.enemies) {
      if (e.hp <= 0 || e.hurtThisTurn || e.hp >= e.maxHp) continue;
      const back = heal(state, e, Math.max(1, Math.floor(e.maxHp * g.bloomHeal)), 'ability');
      if (back > 0) log(state, 'enemy', `${e.name} blooms (+${back}).`);
    }
  }

  if (rule === 'tremor' && turnsUntil(state, g.tremorEvery) === 1) {
    log(state, 'enemy', 'The ground shakes!');
    for (const c of state.player.team) {
      if (c.hp <= 0 || !isGrounded(c, ctx.content)) continue;
      const quake = Math.max(1, Math.floor(c.maxHp * g.tremorPercent));
      dealDamage(state, ctx, null, c, quake, { crit: false, effectiveness: 'neutral', cause: 'tremor' });
    }
  }

  if (rule === 'rollout') {
    const leadMon = state.player.team[state.player.leadIndex];
    const rs = (state.ruleState ??= {});
    if (!leadMon || leadMon.hp <= 0) {
      delete rs.leadUid;
      rs.leadTurns = 0;
    } else if (rs.leadUid === leadMon.uid) {
      rs.leadTurns = Math.min(g.rolloutMaxTurns, (rs.leadTurns ?? 0) + 1);
    } else {
      rs.leadUid = leadMon.uid;
      rs.leadTurns = 1;
    }
  }

  if (rule === 'riptide' && turnsUntil(state, g.riptideEvery) === 1) tide(state, ctx);
}

/**
 * §5.9.5 Riptide — the tide trades your Lead with Bench 1, or Bench 2 when Bench 1 is down. A free swap that is not
 * yours: it counts as none (no ladder, no discount). A Frozen Lead is held in place (§4.2.4), and so is a fallen one.
 */
function tide(state: CombatState, ctx: RunCtx): void {
  const p = state.player;
  const leadMon = p.team[p.leadIndex];
  if (!leadMon || leadMon.hp <= 0 || leadMon.status?.kind === 'freeze') return;
  const to = benchIndices(state).find((i) => (p.team[i]?.hp ?? 0) > 0);
  if (to === undefined) return;
  const from = p.leadIndex;
  setLead(state, to);
  emit(state, { t: 'swap', fromIndex: from, toIndex: to, kind: 'forced', apCost: 0 });
  log(state, 'enemy', `The riptide pulls ${leadMon.name} back — ${p.team[to]!.name} is swept into the Lead.`);
  onEnterLead(state, ctx, to);
}
