import type { CardPlayability, MoveDef } from '@/sim';
import { FIELD_IN, SIDE_NAME } from '@/ui/strings';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rules text composed from the move's data — the single place card text is assembled (ui rule). */
/** `guard`: the sim's Guard for this card's owner (`CardPlayability.guard`); without one the card names the hit it stops. */
export function describeMoveDef(move: MoveDef, opts: { guard?: number | null } = {}): string {
  const parts: string[] = [];
  if (move.power > 0) parts.push(move.targeting === 'cleave' ? 'Hits every enemy.' : 'Deals damage.');
  for (const fx of move.effects) {
    if (fx.kind === 'status') parts.push(`${fx.chance >= 1 ? '' : `${Math.round(fx.chance * 100)}% `}${cap(fx.status)}${fx.self ? ' (self)' : ''}.`);
    if (fx.kind === 'stage') parts.push(`${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} (${fx.target === 'self' ? 'self' : 'foe'}).`);
    if (fx.kind === 'heal') {
      const who = fx.target === 'lead' ? ' (the Lead)' : '';
      parts.push(fx.durationTurns ? `Regen ${Math.round(fx.percentOfMaxHp * 100)}% HP a turn${who}.` : `Heal ${Math.round(fx.percentOfMaxHp * 100)}% HP${who}.`);
      if (fx.weatherScaled) parts.push('×2 in Sun, ×½ other weather.');
    }
    if (fx.kind === 'drain') parts.push(`Heals ${fx.percentOfDamage === 0.5 ? 'half' : `${Math.round(fx.percentOfDamage * 100)}%`} of the damage it deals.`);
    if (fx.kind === 'recoil') parts.push(`Recoil: ${Math.round(fx.percentOfDamage * 100)}% of the damage it deals.`);
    if (fx.kind === 'draw') parts.push(`Draw ${fx.cards}.`);
    if (fx.kind === 'power-bonus')
      parts.push(
        fx.when === 'target-poisoned' ? `×${fx.multiplier} power into a Poisoned target.`
        : fx.when === 'self-below' ? `×${fx.multiplier} power below ${Math.round((fx.below ?? 0) * 100)}% HP.`
        : fx.when === 'in-field' ? `×${fx.multiplier} power in ${FIELD_IN[fx.field ?? 'rain-dance']}.`
        : `+${fx.perStack} power per Trauma stack.`,
      );
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

export function describeMove(play: CardPlayability): string {
  return describeMoveDef(play.move, { guard: play.guard });
}
