import type { ContentRegistry, MoveDef } from '../content/defs';
import type { PokemonType, Stat, StatusCondition } from '../types';
import type { BattleConfig } from './battleConfig';
import type { Combatant } from './state';
import { hpFraction } from './stats';

// §6.5 — passive abilities as pure hooks over (combatant, content). Data lives in abilities.json.

function hooks(c: Combatant, content: ContentRegistry) {
  return c.abilityIds.map((id) => content.ability(id));
}

/** Multiplier applied to the attacker's damage before the final floor (Blaze/Torrent/Overgrow, Tough Claws, Snipe). */
export function abilityAttackMultiplier(attacker: Combatant, move: MoveDef, content: ContentRegistry, config: BattleConfig): number {
  let m = 1;
  for (const a of hooks(attacker, content)) {
    if (a.hook === 'low-hp-type-boost' && a.params?.type === move.type && hpFraction(attacker) < config.abilityLowHpThreshold) {
      m *= config.abilityLowHpBoostMultiplier;
    }
    if (a.hook === 'range-boost' && a.params?.range === move.range) {
      m *= Number(a.params.multiplier ?? 1);
    }
    // §6.5.2 Adaptability — STAB 1.5 → 1.75. Expressed as a ratio over the config's STAB so the base formula
    // keeps its one STAB term and this stays a multiplier like every other ability.
    if (a.hook === 'stab-multiplier' && attacker.types.includes(move.type)) {
      m *= Number(a.params?.multiplier ?? config.stabMultiplier) / config.stabMultiplier;
    }
    // §6.5.2 Guts — the wearer hits harder while statused, and Burn's −25 % Attack stops applying. The
    // cancellation is a division rather than a branch in effectiveAttack, so the two stay independent.
    // §6.8.3 Sheer Force — a move that carries a rider for the foe hits harder, and the rider still rolls.
    if (a.hook === 'rider-force-plus-damage' && hasFoeRider(move)) m *= Number(a.params?.multiplier ?? 1.2);
    if (a.hook === 'while-statused' && attacker.status) {
      m *= Number(a.params?.multiplier ?? 1.3);
      if (attacker.status.kind === 'burn') m /= config.burnAttackMultiplier;
    }
  }
  return m;
}

/** A status or a stage change aimed at the target — what Sheer Force pays for. */
const hasFoeRider = (move: MoveDef): boolean =>
  move.power > 0 && move.effects.some((e) => (e.kind === 'status' && !e.self) || (e.kind === 'stage' && e.target === 'foe'));

/** §6.8.3 Infiltrator — the wearer's moves ignore a target's *raised* Defence (a lowered one still counts). */
export const abilityIgnoresRaisedDefence = (c: Combatant, content: ContentRegistry): boolean => hooks(c, content).some((a) => a.hook === 'ignore-defence-stages');

/** §6.8.3 Arena Trap — while the wearer leads, every enemy loses 1/divisor of its HP at the end of each turn. 0 is none. */
export function abilityLeadTrapDivisor(c: Combatant, content: ContentRegistry): number {
  const a = hooks(c, content).find((x) => x.hook === 'lead-trap-chip');
  return a ? Number(a.params?.divisor ?? 16) : 0;
}

/** §6.8.3 Weak Armor — the stage changes the wearer takes from being hit. */
export function abilityHitStages(target: Combatant, move: MoveDef, content: ContentRegistry): { stat: Stat; stages: number }[] {
  const out: { stat: Stat; stages: number }[] = [];
  for (const a of hooks(target, content)) {
    if (a.hook !== 'on-damaged-stages' || move.power <= 0) continue;
    out.push({ stat: 'defense', stages: Number(a.params?.defense ?? -1) }, { stat: 'attack', stages: Number(a.params?.attack ?? 1) });
  }
  return out;
}

/** §6.8.3 Gluttony — what a healing item is worth on the wearer. */
export function abilityConsumableHealMultiplier(c: Combatant, content: ContentRegistry): number {
  let m = 1;
  for (const a of hooks(c, content)) if (a.hook === 'consumable-heal-bonus') m *= Number(a.params?.multiplier ?? 1.5);
  return m;
}

/** §6.8.3 Rain Dish — a move of its type heals the wearer 1/divisor of its HP. 0 is none. */
export function abilityMoveHealDivisor(c: Combatant, move: MoveDef, content: ContentRegistry): number {
  const a = hooks(c, content).find((x) => x.hook === 'type-move-heal' && x.params?.type === move.type);
  return a ? Number(a.params?.divisor ?? 16) : 0;
}

/** §6.6 Damp — the named moves fail against the wearer. */
export const abilityBlocksMove = (target: Combatant, move: MoveDef, content: ContentRegistry): boolean =>
  hooks(target, content).some((a) => a.hook === 'block-moves' && String(a.params?.moves ?? '').split(',').includes(move.id));

/** §6.5.2 Solid Rock — super-effective hits land 25 % softer on the wearer. */
export function abilityDefenceMultiplier(target: Combatant, typeMultiplier: number, content: ContentRegistry): number {
  let m = 1;
  for (const a of hooks(target, content)) {
    if (a.hook === 'super-effective-reduction' && typeMultiplier > 1) m *= Number(a.params?.multiplier ?? 0.75);
  }
  return m;
}

/**
 * §6.5.2 Water Absorb — a whole type heals instead of hurting. Returns the HP to restore, or null when the
 * move lands normally. Checked before damage so the hit never reaches `dealDamage`.
 */
export function abilityTypeAbsorb(target: Combatant, moveType: PokemonType, content: ContentRegistry): number | null {
  for (const a of hooks(target, content)) {
    if (a.hook === 'type-absorb' && a.params?.type === moveType) {
      return Math.max(1, Math.floor(target.maxHp * Number(a.params.percentOfMaxHp ?? 0.2)));
    }
  }
  return null;
}

/** §6.5.2 Flash Fire — the absorbed type raises a stat instead of healing. The stat, or null for a plain absorb. */
export function abilityAbsorbBuff(target: Combatant, moveType: PokemonType, content: ContentRegistry): Stat | null {
  for (const a of hooks(target, content)) {
    if (a.hook === 'type-absorb' && a.params?.type === moveType && typeof a.params.buffInstead === 'string') return a.params.buffInstead as Stat;
  }
  return null;
}

/** §6.5.2 Speed Boost — extra AP at the start of a given turn, summed over the living team. */
export function abilityTurnStartAp(team: readonly Combatant[], turn: number, content: ContentRegistry): number {
  let ap = 0;
  for (const c of team) {
    if (c.hp <= 0) continue;
    for (const a of hooks(c, content)) if (a.hook === 'turn-start-ap' && Number(a.params?.turn ?? 0) === turn) ap += Number(a.params?.ap ?? 1);
  }
  return ap;
}

/** §6.5.2 Inner Focus and friends — one condition simply cannot land on the wearer. */
export function abilityBlocksStatus(target: Combatant, status: StatusCondition, content: ContentRegistry): boolean {
  return hooks(target, content).some((a) => a.hook === 'status-immunity' && a.params?.status === status);
}

/** §6.5.2 Poison Point, Effect Spore — what a Melee attacker takes back for touching the wearer. */
export function abilityRiposte(
  target: Combatant,
  move: MoveDef,
  content: ContentRegistry,
): { status: StatusCondition; chance: number } | null {
  for (const a of hooks(target, content)) {
    if (a.hook !== 'on-damaged') continue;
    if (a.params?.range && a.params.range !== move.range) continue;
    return { status: String(a.params?.status ?? 'poison') as StatusCondition, chance: Number(a.params?.chance ?? 0.3) };
  }
  return null;
}

/** §6.5.2 Rock Head — the wearer takes no self-damage from a recoil move. */
export function abilityIgnoresRecoil(c: Combatant, content: ContentRegistry): boolean {
  return hooks(c, content).some((a) => a.hook === 'recoil-immunity');
}

/** §6.5.2 Moxie — a stage change for taking something down. */
export function abilityOnKill(c: Combatant, content: ContentRegistry): { stat: Stat; stages: number }[] {
  const out: { stat: Stat; stages: number }[] = [];
  for (const a of hooks(c, content)) {
    if (a.hook === 'on-kill') out.push({ stat: String(a.params?.stat ?? 'attack') as Stat, stages: Number(a.params?.stages ?? 1) });
  }
  return out;
}

/**
 * §6.5.2 Tangled Feet, Sand Veil — incoming damage softened under a condition the wearer cannot choose.
 * Both are "you got unlucky, but less so", which is why they are defence rather than a flat reduction.
 */
export function abilityConditionalReduction(target: Combatant, move: MoveDef, content: ContentRegistry): number {
  let m = 1;
  for (const a of hooks(target, content)) {
    if (a.hook !== 'conditional-reduction') continue;
    const when = String(a.params?.when ?? '');
    if (when === 'confused' && target.confusionTurns <= 0) continue;
    if (when === 'ranged' && move.range !== 'ranged') continue;
    // §6.5.2 Thick Fat — only the listed types (a comma list, because params are flat).
    if (when === 'type' && !String(a.params?.types ?? '').split(',').includes(move.type)) continue;
    m *= Number(a.params?.multiplier ?? 1);
  }
  return m;
}

/** §6.5.2 Run Down — the wearer's first manual swap each combat is free. */
export function abilityFreeFirstSwap(c: Combatant, content: ContentRegistry): boolean {
  return hooks(c, content).some((a) => a.hook === 'swap-discount');
}

/** §6.5.3.5 Intimidate, Steadfast — what fires the moment the wearer takes the Lead slot. */
export function abilityOnEnterLead(
  c: Combatant,
  content: ContentRegistry,
): { target: 'self' | 'foe'; stat: Stat; stages: number }[] {
  const out: { target: 'self' | 'foe'; stat: Stat; stages: number }[] = [];
  for (const a of hooks(c, content)) {
    if (a.hook !== 'on-enter-lead') continue;
    out.push({
      target: a.params?.target === 'foe' ? 'foe' : 'self',
      stat: String(a.params?.stat ?? 'attack') as Stat,
      stages: Number(a.params?.stages ?? 1),
    });
  }
  return out;
}

/** Shell Armor — flat reduction on incoming hits while the holder is the Lead. */
export function abilityFlatReduction(target: Combatant, isLead: boolean, content: ContentRegistry): number {
  if (!isLead) return 0;
  let r = 0;
  for (const a of hooks(target, content)) if (a.hook === 'lead-flat-reduction') r += Number(a.params?.amount ?? 0);
  return r;
}

/** Compound Eyes — status riders always apply (§6.6). */
export function ridersAlwaysApply(attacker: Combatant, content: ContentRegistry): boolean {
  return hooks(attacker, content).some((a) => a.hook === 'riders-always-apply');
}

export function hasSturdy(c: Combatant, content: ContentRegistry): boolean {
  return hooks(c, content).some((a) => a.hook === 'sturdy');
}

/** Keen Eye — reveals hidden intents for the whole team (§6.5.3.1). */
/**
 * §6.5.3 Keen Eye reveals every intent; §6.5.2 Anticipation (`firstOnly`) reveals only an enemy's first.
 * `firstIntent` says which kind of moment this is.
 */
export function teamRevealsIntents(team: readonly Combatant[], content: ContentRegistry, firstIntent = false): boolean {
  return team.some((c) => c.hp > 0 && hooks(c, content).some((a) => a.hook === 'reveal-intents' && (!a.params?.firstOnly || firstIntent)));
}

export function turnEndBenchHeal(c: Combatant, content: ContentRegistry): number {
  let total = 0;
  for (const a of hooks(c, content)) if (a.hook === 'turn-end-bench-heal') total += Number(a.params?.amount ?? 0);
  return total;
}

export function startStageBoosts(c: Combatant, content: ContentRegistry): Array<{ stat: 'attack' | 'defense' | 'speed'; stages: number }> {
  const out: Array<{ stat: 'attack' | 'defense' | 'speed'; stages: number }> = [];
  for (const a of hooks(c, content)) {
    if (a.hook === 'start-stage') out.push({ stat: String(a.params?.stat) as 'attack' | 'defense' | 'speed', stages: Number(a.params?.stages ?? 0) });
  }
  return out;
}
