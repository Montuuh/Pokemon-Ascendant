import type { ContentRegistry, SpeciesDef } from '../content/defs';
import type { PokemonType, Stat } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant } from './state';
import { stageMultiplier } from './statStages';

// §6.2.3 — level-scaled base stats: base + growth × (level − 1). Flat growth per line (Unity StatGrowthCurve).
export function statAtLevel(species: SpeciesDef, stat: 'hp' | Stat, level: number): number {
  const lv = Math.max(1, Math.trunc(level));
  return species.baseStats[stat] + species.growth[stat] * (lv - 1);
}

/**
 * §8.2.1 — the two-zone Trauma curve. Stacks 1–5 cost 5 % of max HP each (normal play barely notices);
 * stacks 6–10 cost 10 % each, so a Pokémon that keeps fainting visibly breaks down. Floors at −75 %.
 *
 *   EffectiveMaxHP = floor(BaseMaxHP × max(0.25, 1 − 0.05·min(s,5) − 0.10·max(0, min(s,10) − 5)))
 */
export function effectiveMaxHp(baseMaxHp: number, traumaStacks: number, config: BattleConfig): number {
  const s = Math.min(Math.max(0, Math.trunc(traumaStacks)), config.traumaStackCap);
  const zone1 = Math.min(s, config.traumaZone1Stacks) * config.traumaZone1PenaltyPercent;
  const zone2 = Math.max(0, s - config.traumaZone1Stacks) * config.traumaZone2PenaltyPercent;
  const floorPercent = 100 - (config.traumaZone1Stacks * config.traumaZone1PenaltyPercent
    + (config.traumaStackCap - config.traumaZone1Stacks) * config.traumaZone2PenaltyPercent);
  const percent = Math.max(floorPercent, 100 - zone1 - zone2);
  return Math.max(1, Math.floor((baseMaxHp * percent) / 100));
}

/**
 * §6.9 — every move a Pokémon of this species knows at this level, oldest first.
 * The whole evolution line counts: evolving adds moves, it never forgets them.
 */
export function knownMoves(content: ContentRegistry, speciesId: string, level: number): string[] {
  const lv = Math.max(1, Math.trunc(level));
  return content.lineLearnset(speciesId).filter((l) => l.level <= lv).map((l) => l.move);
}

/**
 * §6.9 — deck contribution is min(known, 4). "The four most recently learned" alone produced kits with a
 * single damaging card, or none: Oddish learns Absorb at 1 and Acid at 7, so by level 10 its only card that
 * hurts a Rock is gone. The auto-pick therefore keeps the two strongest attacks first, then fills with the
 * newest remaining moves. Since v0.3 this is the *default*, not the rule: the Move Manager lets a player
 * re-pick any four from the pool, and the Auto button is this function.
 */
export function activeMoves(content: ContentRegistry, speciesId: string, level: number, cap = 4): string[] {
  const known = knownMoves(content, speciesId, level);
  if (known.length <= cap) return known;

  const power = (id: string) => content.move(id).power ?? 0;
  const attacks = known.filter((m) => power(m) > 0);
  // Two attacks is the floor from the basic-kit rule (§6.3.6); more than that is up to recency.
  const keep = [...attacks].sort((a, b) => power(b) - power(a)).slice(0, Math.min(2, attacks.length));
  const rest = known.filter((m) => !keep.includes(m));
  const filled = [...keep, ...rest.slice(rest.length - (cap - keep.length))];
  // Return them in learn order so the kit still reads as a history.
  return known.filter((m) => filled.includes(m));
}

export function hpFraction(c: Pick<Combatant, 'hp' | 'maxHp'>): number {
  if (c.maxHp <= 0) return 0;
  return Math.max(0, Math.min(1, c.hp / c.maxHp));
}

export function isFainted(c: Pick<Combatant, 'hp'>): boolean {
  return c.hp <= 0;
}

/**
 * §4.1.1 + §4.2.6 + §4.2.1 G8 — EffAtk = floor(BaseAtk × StageMul × StatusMul), floored at 1.
 * Burn applies −25 % Attack (§4.2.2.1).
 */
export function effectiveAttack(c: Combatant, config: BattleConfig): number {
  const stage = stageMultiplier(c.stages.attack, config);
  const status = c.status?.kind === 'burn' ? config.burnAttackMultiplier : 1;
  return Math.max(1, Math.floor(c.base.attack * stage * status));
}

/** §4.2.2.2 — Poison applies −15 % Defense. */
export function effectiveDefense(c: Combatant, config: BattleConfig): number {
  const stage = stageMultiplier(c.stages.defense, config);
  const status = c.status?.kind === 'poison' ? config.poisonDefenseMultiplier : 1;
  return Math.max(1, Math.floor(c.base.defense * stage * status));
}

export function hasType(c: Pick<Combatant, 'types'>, type: PokemonType): boolean {
  return c.types.includes(type);
}
