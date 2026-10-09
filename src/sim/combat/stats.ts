import type { ContentRegistry, SpeciesDef } from '../content/defs';
import type { BranchArchetype, PokemonType, Stat } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant } from './state';
import { applyPayload, autoPickMoves, holdsSlot, lineChain, upgradeParents } from './kit';
import { stageMultiplier } from './statStages';

/**
 * §6.3.4 — the archetype's lean (v0.9.6, the user's call: two paths of one evolution should not make the same
 * Pokémon). The species gives the stats; the path an evolved Pokémon took tilts them a few points, and every tilt is a
 * trade, never a free gain: a Vanguard hits and lasts a little more for less Defence, a Specialist hits harder and is
 * faster for less bulk, a Support lasts longer for less Attack. The latest evolution's archetype is the one that counts.
 */
export const ARCHETYPE_STAT_BIAS: Record<BranchArchetype, Record<'hp' | Stat, number>> = {
  vanguard: { hp: 1.05, attack: 1.03, defense: 0.97, speed: 1 },
  specialist: { hp: 0.96, attack: 1.05, defense: 0.96, speed: 1.05 },
  support: { hp: 1.05, attack: 0.95, defense: 1.05, speed: 1 },
};

/**
 * §6.2.3 — the share of its base a stat gains every level (v0.9.10, the user's call: stats in proportion to the
 * series'). Every stat grows in proportion to its own base, so a species' total at any level keeps the proportion
 * of its base total: Magikarp stays small and Gyarados grows big, a final form stands above its pre-evolutions at
 * the same level, and a single stage or a Legendary carries its higher total. Chosen so the mean total at Lv 30 is
 * where the old flat per-line growth left it (584).
 */
export const STAT_GROWTH_RATE = 0.035;

/** §6.2.3 — HP also gains this much a level whatever its base, as the series adds the level to HP: a low-level fight keeps some length. */
export const HP_PER_LEVEL = 1;

// §6.2.3 — level-scaled base stats: base × (1 + rate × (level − 1)), then the archetype's lean (§6.3.4) for a
// Pokémon that has taken a path. (Until v0.9.10: base + a flat per-line growth × (level − 1), which gave Geodude
// Golem's growth and a single stage a quarter more than a final form.)
export function statAtLevel(species: SpeciesDef, stat: 'hp' | Stat, level: number, archetype?: BranchArchetype | null): number {
  const lv = Math.max(1, Math.trunc(level));
  const raw = species.baseStats[stat] * (1 + STAT_GROWTH_RATE * (lv - 1)) + (stat === 'hp' ? HP_PER_LEVEL * lv : 0);
  return Math.round(archetype ? raw * ARCHETYPE_STAT_BIAS[archetype][stat] : raw);
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
 * §6.9 / §6.3.5 — every move a Pokémon of this species knows at this level, oldest first: the base form's learnset,
 * then each evolution's payload along the way. One met already evolved — a wild Ivysaur, a Gym's Venusaur — took
 * its stage's first branch at every step, so it holds the same five cards a player's would (v0.9.5).
 */
export function knownMoves(content: ContentRegistry, speciesId: string, level: number): string[] {
  const lv = Math.max(1, Math.trunc(level));
  const chain = lineChain(content, speciesId);
  const parents = upgradeParents(content, speciesId);
  let pool: string[] = [];
  chain.forEach((s, i) => {
    for (const l of [...s.learnset].sort((a, b) => a.level - b.level)) if (l.level <= lv && !holdsSlot(pool, l.move, parents)) pool.push(l.move);
    const next = chain[i + 1];
    const branch = next && s.branches.find((b) => b.to === next.id);
    if (branch) pool = applyPayload(pool, branch, parents);
  });
  return pool;
}

/**
 * §6.9 — deck contribution is min(known, 4), picked as the Move Manager's Auto picks (`autoPickMoves`): the two
 * strongest attacks, one of its own type, then the newest of the rest, with one Ranged card. Every enemy kit that is
 * not scripted is this pick.
 */
export function activeMoves(content: ContentRegistry, speciesId: string, level: number, cap = 4): string[] {
  return autoPickMoves(knownMoves(content, speciesId, level), content, cap, content.species(speciesId).types);
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
