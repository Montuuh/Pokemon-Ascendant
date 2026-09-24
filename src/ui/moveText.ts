import type { CardPlayability, MoveDef } from '@/sim';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Rules text composed from the move's data — the single place card text is assembled (ui rule). */
export function describeMoveDef(move: MoveDef): string {
  const parts: string[] = [];
  if (move.power > 0) parts.push(move.targeting === 'cleave' ? 'Hits every enemy.' : 'Deals damage.');
  for (const fx of move.effects) {
    if (fx.kind === 'status') parts.push(`${fx.chance >= 1 ? '' : `${Math.round(fx.chance * 100)}% `}${cap(fx.status)}${fx.self ? ' (self)' : ''}.`);
    if (fx.kind === 'stage') parts.push(`${fx.stages > 0 ? '+' : ''}${fx.stages} ${cap(fx.stat)} (${fx.target === 'self' ? 'self' : 'foe'}).`);
    if (fx.kind === 'heal') parts.push(fx.durationTurns ? `Regen ${Math.round(fx.percentOfMaxHp * 100)}% HP for ${fx.durationTurns} turns.` : `Heal ${Math.round(fx.percentOfMaxHp * 100)}% HP.`);
    if (fx.kind === 'drain') parts.push(`Heals ${fx.percentOfDamage === 0.5 ? 'half' : `${Math.round(fx.percentOfDamage * 100)}%`} of the damage it deals.`);
    if (fx.kind === 'recoil') parts.push(`Recoil: ${Math.round(fx.percentOfDamage * 100)}% of the damage it deals.`);
    if (fx.kind === 'draw') parts.push(`Draw ${fx.cards}.`);
    if (fx.kind === 'power-bonus')
      parts.push(
        fx.when === 'target-poisoned' ? `×${fx.multiplier} power into a Poisoned target.`
        : fx.when === 'self-below' ? `×${fx.multiplier} power below ${Math.round((fx.below ?? 0) * 100)}% HP.`
        : `+${fx.perStack} power per Trauma stack.`,
      );
    if (fx.kind === 'fixed-damage') parts.push(`Takes ${Math.round(fx.percentOfTargetHp * 100)}% of the target's current HP.`);
    if (fx.kind === 'self-damage') parts.push(`Costs ${Math.round(fx.percentOfMaxHp * 100)}% of its own HP.`);
  }
  if (move.alwaysCrit) parts.push('Always crits.');
  if (move.modifier === 'step-forward') parts.push('Step-Forward.');
  if (move.modifier === 'step-backward') parts.push('Step-Backward.');
  return parts.join(' ');
}

export function describeMove(play: CardPlayability): string {
  return describeMoveDef(play.move);
}
