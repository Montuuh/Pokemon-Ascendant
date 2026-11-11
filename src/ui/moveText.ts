import { DEFAULT_BATTLE_CONFIG, type CardPlayability, type MoveDef, type MoveEffect } from '@/sim';
import { DISRUPT_TEXT, FIELD_IN, SIDE_NAME, fmtMult, frac } from '@/ui/strings';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rules text composed from the move's data — the single place card text is assembled (ui rule). */
/** `guard`: the sim's Guard for this card's owner (`CardPlayability.guard`); without one the card names the hit it stops. */
export function describeMoveDef(move: MoveDef, opts: { guard?: number | null } = {}): string {
  const parts: string[] = [];
  // A damaging card prints its power, type and range already; the plate carries only what they do not say.
  if (move.power > 0 && move.targeting === 'cleave') parts.push('Hits every enemy.');
  for (const fx of move.effects) {
    if (fx.kind === 'status') parts.push(`${fx.chance >= 1 ? '' : `${Math.round(fx.chance * 100)}% `}${cap(fx.status)}${fx.self ? ' (self)' : ''}.`);
    if (fx.kind === 'stage') parts.push(`${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} (${fx.target === 'self' ? 'self' : fx.target === 'foe-side' ? 'all foes' : fx.target === 'bench' ? 'your bench' : 'foe'}).`);
    if (fx.kind === 'heal') {
      const who = fx.target === 'lead' ? ' (the Lead)' : '';
      parts.push(fx.durationTurns ? `Regen ${Math.round(fx.percentOfMaxHp * 100)}% HP a turn${who}.` : `Heal ${Math.round(fx.percentOfMaxHp * 100)}% HP${who}.`);
      if (fx.weatherScaled) parts.push('×2 in Sun, ×½ other weather.');
    }
    if (fx.kind === 'drain') parts.push(`Heals ${fx.percentOfDamage === 0.5 ? 'half' : `${Math.round(fx.percentOfDamage * 100)}%`} of the damage it deals.`);
    if (fx.kind === 'recoil') parts.push(`Recoil: ${Math.round(fx.percentOfDamage * 100)}% of the damage it deals.`);
    if (fx.kind === 'draw') parts.push(`Draw ${fx.cards}.`);
    if (fx.kind === 'power-bonus') parts.push(powerBonusText(fx));
    if (fx.kind === 'fixed-damage') parts.push(`Takes ${Math.round(fx.percentOfTargetHp * 100)}% of the target's current HP.`);
    if (fx.kind === 'self-damage') parts.push(`Costs ${Math.round(fx.percentOfMaxHp * 100)}% of its own HP.`);
    if (fx.kind === 'multi-hit') parts.push(`Hits ${fx.hits} times; the power is the total.`);
    if (fx.kind === 'on-kill-stage') parts.push(`If it knocks the target out: ${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} (self).`);
    if (fx.kind === 'team-cure') parts.push('Cures every status on the team.');
    if (fx.kind === 'team-guard')
      parts.push(fx.guard === 'status' ? 'Shields the team: the next status is blocked.' : `Braces the team: the next area hit deals ${100 - (fx.percent ?? 50)}% less.`);
    // §3.11 — the move keywords, a few words each on the card; the whole rule is in the card's bubble (`keywordRules`).
    if (fx.kind === 'protect') parts.push('Protect: blocks the foe this turn; not twice running.');
    if (fx.kind === 'endure') parts.push('Endure: lives at 1 HP this turn.');
    if (fx.kind === 'guard') parts.push(opts.guard != null ? `Guard ${opts.guard} until next turn.` : `Guard: a ${fx.power}-power hit, until next turn.`);
    if (fx.kind === 'substitute') parts.push(`Substitute for ${Math.round(fx.percentOfMaxHp * 100)}% HP.`);
    if (fx.kind === 'side-condition') parts.push(`${SIDE_NAME[fx.condition].short}, ${fx.turns} turns.`);
    if (fx.kind === 'set-field') parts.push(`${cap(FIELD_IN[fx.field] ?? fx.field)}, ${fx.turns} turns.`);
    if (fx.kind === 'recharge') parts.push('Recharge next turn.');
    if (fx.kind === 'fatigue') parts.push(`Fatigue: −${fx.ap} AP next turn.`);
    if (fx.kind === 'rampage') parts.push(`Rampage: free ${fx.turns}×, then Confused.`);
    if (fx.kind === 'charge') parts.push(fx.outOfReach ? 'Out of reach; lands next turn.' : `Lands next turn${fx.skipIn ? `; at once in ${FIELD_IN[fx.skipIn]}` : ''}.`);
    if (fx.kind === 'counter') parts.push(`Counter: ${fx.range === 'melee' ? 'Melee' : 'Ranged'} hits back ×${fx.multiplier}.`);
    if (fx.kind === 'wish') parts.push(`Wish: ${Math.round(fx.percentOfMaxHp * 100)}% HP here next turn.`);
    if (fx.kind === 'root') parts.push('Rooted for the fight.');
    if (fx.kind === 'baton-pass') parts.push('Passes its stat changes on.');
    const d = disruptCard(fx);
    if (d) parts.push(d);
  }
  // §4.3.15 — the field costs in one line: "−1 AP in the rain, +1 in the Sun".
  const costs = move.effects.flatMap((fx) => (fx.kind === 'field-cost' ? [`${fx.delta < 0 ? '−' : '+'}${Math.abs(fx.delta)} in ${FIELD_IN[fx.field]}`] : []));
  if (costs.length) parts.push(`AP ${costs.join(', ')}.`);
  if (move.overexert) parts.push(`Can borrow ${move.overexert} AP.`);
  if (move.alwaysCrit) parts.push('Always crits.');
  if (move.modifier === 'step-forward') parts.push('Step-Forward.');
  if (move.modifier === 'step-backward') parts.push('Step-Backward.');
  return parts.join(' ');
}

/** §5.13.2 / §5.5.2 — a power bonus in a few words, one per condition (a new condition fails the typecheck here). */
function powerBonusText(fx: Extract<MoveEffect, { kind: 'power-bonus' }>): string {
  const m = `×${fx.multiplier ?? 1}`;
  switch (fx.when) {
    case 'target-poisoned':
      return `${m} power into a Poisoned target.`;
    case 'self-below':
      return `${m} power below ${Math.round((fx.below ?? 0) * 100)}% HP.`;
    case 'in-field':
      return `${m} power in ${FIELD_IN[fx.field ?? 'rain-dance']}.`;
    case 'friendship':
      return 'Full power at full Friendship; less the less fond it is.';
    case 'per-trauma':
      return `+${fx.perStack} power per Trauma stack.`;
    case 'target-asleep':
      return `${m} power into a sleeping target.`;
    case 'target-paralyzed':
      return `${m} power into a paralysed target.`;
    case 'target-below':
      return `${m} power into a target below ${Math.round((fx.below ?? 0) * 100)}% HP.`;
    case 'hurt-this-turn':
      return `${m} power if a move hurt it since it last acted.`;
    case 'target-holds-item':
      return `${m} power while the target holds an item.`;
    default: {
      const never: never = fx.when;
      return never;
    }
  }
}

/** §5.2.3 — a disruption in a few words on the card's face; null for any other effect. */
function disruptCard(fx: MoveEffect): string | null {
  const t = DISRUPT_TEXT.card;
  switch (fx.kind) {
    case 'disable':
      return t.disable(fx.turns);
    case 'taunt':
      return t.taunt;
    case 'force-swap':
      return t.forceSwap;
    case 'trap':
      return t.trap(fx.turns);
    case 'drowsy':
      return t.drowsy;
    case 'perish':
      return t.perish(fx.turns, frac(DEFAULT_BATTLE_CONFIG.disruption.perishPercent));
    case 'seed':
      return fx.heal ? t.seed(frac(fx.percent)) : t.curse(frac(fx.percent));
    case 'hazard':
      return t.hazard(SIDE_NAME[fx.hazard].name);
    case 'knock-off':
      return t.knockOff;
    case 'haze':
      return t.haze;
    case 'helping-hand':
      return t.helpingHand(fmtMult(fx.multiplier));
    default:
      return null;
  }
}

/** §5.2.3 — a disruption's whole rule, for the card's bubble (`keywordRules`); null for any other effect. */
export function disruptRule(fx: MoveEffect): string | null {
  const t = DISRUPT_TEXT.rule;
  switch (fx.kind) {
    case 'disable':
      return t.disable(fx.turns);
    case 'taunt':
      return t.taunt;
    case 'force-swap':
      return t.forceSwap;
    case 'trap':
      return t.trap(fx.turns);
    case 'drowsy':
      return t.drowsy;
    case 'perish':
      return t.perish(fx.turns, frac(DEFAULT_BATTLE_CONFIG.disruption.perishPercent));
    case 'seed':
      return fx.heal ? t.seed(frac(fx.percent)) : t.curse(frac(fx.percent));
    case 'hazard':
      return t.hazard(SIDE_NAME[fx.hazard].name, SIDE_NAME[fx.hazard].effect);
    case 'knock-off':
      return t.knockOff;
    case 'haze':
      return t.haze;
    case 'helping-hand':
      return t.helpingHand(fmtMult(fx.multiplier));
    default:
      return null;
  }
}

export function describeMove(play: CardPlayability): string {
  return describeMoveDef(play.move, { guard: play.guard });
}
