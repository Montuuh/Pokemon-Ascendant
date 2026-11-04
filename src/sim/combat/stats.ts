import type { ContentRegistry, SpeciesDef } from '../content/defs';
import type { BranchArchetype, PokemonType, Stat } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant } from './state';
import { applyPayload, autoPickMoves, learnInto, lineChain, upgradeParents } from './kit';
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
 * §6.2.3 — the series' stat formula (Gen III, v0.9.96, the user's call: Pokémon as far apart as they are in the games).
 * A stat is (2·base + IV)·level/100 + 5, and HP is (2·base + IV)·level/100 + level + 10. The flat terms are what keep
 * a frail species alive and a sturdy one hittable at low level — Diglett has 16 HP to Snorlax's 31 at Lv 5, not 7 to
 * 90 — and the level term is what makes a level count: a Lv 15 stands at about twice a Lv 5. `iv` is the series' mean
 * individual value; no Pokémon rolls its own, so two of one species at one level are the same.
 */
export const STAT_FORMULA = { iv: 15, flat: 5, hpFlat: 10 } as const;

// §6.2.3 — the series' formula, then the archetype's lean (§6.3.4) for a Pokémon that has taken a path. (Until v0.9.95:
// base × (1 + 0.025·(level − 1)) × 0.5, which kept every species at its base's proportion and let the level barely count.)
export function statAtLevel(species: SpeciesDef, stat: 'hp' | Stat, level: number, archetype?: BranchArchetype | null): number {
  const lv = Math.max(1, Math.trunc(level));
  const core = ((2 * species.baseStats[stat] + STAT_FORMULA.iv) * lv) / 100;
  const raw = stat === 'hp' ? core + lv + STAT_FORMULA.hpFlat : core + STAT_FORMULA.flat;
  return Math.round(archetype ? raw * ARCHETYPE_STAT_BIAS[archetype][stat] : raw);
}

/** §6.2.3 — the base a stat reads as at a level: the formula run backwards, so a level-free reading (the rhythm's Speed) needs no species. */
export function baseOfStat(value: number, level: number): number {
  const lv = Math.max(1, Math.trunc(level));
  return Math.max(1, (((value - STAT_FORMULA.flat) * 100) / lv - STAT_FORMULA.iv) / 2);
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
  const branchParents = upgradeParents(content, speciesId, false);
  let pool: string[] = [];
  chain.forEach((s, i) => {
    // §6.9.1 — a track's row takes its slot, as a level-up does: a met Charizard holds Flamethrower, not Fire Spin beside it.
    for (const l of [...s.learnset].sort((a, b) => a.level - b.level)) if (l.level <= lv) learnInto(pool, l, parents);
    const next = chain[i + 1];
    const branch = next && s.branches.find((b) => b.to === next.id);
    if (branch) pool = applyPayload(pool, branch, branchParents);
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

/**
 * §4.1.5 / §3.3.1.1 — EffSpd = floor(BaseSpd × StageMul × StatusMul), floored at 1. Paralysis halves it. Speed never
 * enters the damage formula: it decides who outpaces whom (the quick swap) and how fast the critical rhythm fills
 * (§4.1.3.1).
 */
export function effectiveSpeed(c: Combatant, config: BattleConfig): number {
  const stage = stageMultiplier(c.stages.speed, config);
  const status = c.status?.kind === 'paralysis' ? config.paralysisSpeedMultiplier : 1;
  return Math.max(1, Math.floor(c.base.speed * stage * status));
}

/** §3.3.1.1 — strictly faster: a tie is not outpacing. */
export function outspeeds(a: Combatant, b: Combatant, config: BattleConfig): boolean {
  return effectiveSpeed(a, config) > effectiveSpeed(b, config);
}

export function hasType(c: Pick<Combatant, 'types'>, type: PokemonType): boolean {
  return c.types.includes(type);
}
