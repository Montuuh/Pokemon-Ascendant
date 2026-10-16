import type { BattleConfig } from './battleConfig';
import type { MoveDef } from '../content/defs';
import type { Combatant, CombatState, EnemyCombatant } from './state';

// §5.9.5 — the Leader's rule. Every Gym Leader fights under one rule of its own, for the whole fight. This file
// is the pure half: what a rule *says* about a number (a damage term, a cap, an AP cost, a sealed card). The half
// that *does* something at a turn's edge lives in `ruleTurn.ts`, which may call into the damage flow; keeping the
// queries here lets `damageFlow` and `preview` read a rule without importing the code that deals damage.
//
// A rule is the enemy's: it never helps the player, and nothing but a Gym fight carries one (`state.gymRule`).

export const GYM_RULE_IDS = [
  'rock-solid',
  'riptide',
  'swarm',
  'rollout',
  'meltdown',
  'bloom',
  'overcharge',
  'toxic',
  'mind-lock',
  'tremor',
  'close-quarters',
  'ice-armour',
  // §5.12.1 — not a Leader's: the Champion's signature, Full Team Synergy.
  'synergy',
] as const;
export type GymRuleId = (typeof GYM_RULE_IDS)[number];

/** §5.9.5 — the rule's numbers. Data, not literals in the rules: tuned on the whole-run harness like any tier. */
export interface GymRuleConfig {
  /** Rock Solid — the most a single hit may take, as a share of the target's Max HP. */
  rockSolidCap: number;
  /** Riptide — the tide turns at the end of every Nth turn. */
  riptideEvery: number;
  /** Swarm — the bonus per Pokémon still waiting to come out. */
  swarmPerWaiting: number;
  /** Rollout — the bonus per turn your Lead has stayed the same Pokémon, and the most turns it counts. */
  rolloutPerTurn: number;
  rolloutMaxTurns: number;
  /** Meltdown — the Defence stage a hit lowers to, at the deepest. */
  meltdownFloor: number;
  /** Bloom — the share of Max HP an untouched Pokémon restores at the end of the turn. */
  bloomHeal: number;
  /** Overcharge — the extra AP on the turn's first card, on every Nth turn. */
  overchargeAp: number;
  overchargeEvery: number;
  /** Tremor — the quake lands at the end of every Nth turn, for this share of Max HP. */
  tremorEvery: number;
  tremorPercent: number;
  /** Mind Lock — the seal falls at the draw of every Nth turn. */
  mindLockEvery: number;
  /** Close Quarters — the player's Ranged and Melee terms against the Leader's Pokémon. */
  closeQuartersRanged: number;
  closeQuartersMelee: number;
  /** Ice Armour — the shield the enemy Lead wears at each Intent phase, as a share of its Max HP. */
  iceArmour: number;
  /** §5.12.1 Full Team Synergy — the Champion's hits per fallen ally, and the most it reaches. */
  synergyPerFallen: number;
  synergyCap: number;
}

export const ruleOf = (state: Pick<CombatState, 'gymRule'>): GymRuleId | null => state.gymRule ?? null;

const isEnemy = (state: CombatState, c: Combatant): boolean => state.enemies.some((e) => e.uid === c.uid) || state.enemyQueue.some((e) => e.uid === c.uid);

/** The enemy Lead: the first living enemy on the field (§5.6). */
const enemyLead = (state: CombatState): EnemyCombatant | null => state.enemies.find((e) => e.hp > 0) ?? null;

/**
 * §5.9.5 Rollout — how many turns in a row the player's current Lead has stood there. The count belongs to one
 * Pokémon: the moment another takes the Lead, it reads 0, so the intent's number drops as you swap (Pillar 2).
 */
export function rolloutTurns(state: CombatState, config: BattleConfig): number {
  if (ruleOf(state) !== 'rollout') return 0;
  const leadMon = state.player.team[state.player.leadIndex];
  const rs = state.ruleState;
  if (!leadMon || !rs || rs.leadUid !== leadMon.uid) return 0;
  return Math.min(config.gymRules.rolloutMaxTurns, rs.leadTurns ?? 0);
}

/**
 * §5.9.5 — the rule's term in the damage formula, one more independent multiplier (§7.3.6). Swarm and Rollout lift
 * the Leader's hits; Close Quarters reshapes the player's. 1 when no rule speaks to this hit.
 */
export function ruleDamageMultiplier(state: CombatState, attacker: Combatant, target: Combatant, move: MoveDef, config: BattleConfig): number {
  const rule = ruleOf(state);
  if (!rule) return 1;
  const g = config.gymRules;
  const fromEnemy = isEnemy(state, attacker);
  switch (rule) {
    case 'swarm': {
      if (!fromEnemy) return 1;
      const waiting = state.enemyQueue.filter((e) => e.hp > 0).length;
      return 1 + g.swarmPerWaiting * waiting;
    }
    case 'rollout':
      // Her Lead only: the Pokémon behind it hits as it always does.
      if (!fromEnemy || enemyLead(state)?.uid !== attacker.uid) return 1;
      return 1 + g.rolloutPerTurn * rolloutTurns(state, config);
    case 'synergy':
      return fromEnemy ? synergyMultiplier(state, config) : 1;
    case 'close-quarters':
      if (fromEnemy || !isEnemy(state, target) || move.power <= 0) return 1;
      return move.range === 'ranged' ? g.closeQuartersRanged : g.closeQuartersMelee;
    default:
      return 1;
  }
}

/** §5.12.1 Full Team Synergy — every fallen Champion Pokémon lifts the survivors' hits, to a cap. */
export function synergyMultiplier(state: CombatState, config: BattleConfig): number {
  if (ruleOf(state) !== 'synergy') return 1;
  return 1 + Math.min(config.gymRules.synergyCap, config.gymRules.synergyPerFallen * state.defeatedEnemies.length);
}

/**
 * §5.9.5 Rock Solid — the most one hit may take from the Leader's Pokémon, or null when no cap applies. A multi-hit
 * move is capped hit by hit, which is why the caller multiplies this by the hit count for the move's total.
 */
export function ruleHitCap(state: CombatState, target: Combatant, config: BattleConfig): number | null {
  if (ruleOf(state) !== 'rock-solid' || !isEnemy(state, target)) return null;
  return Math.max(1, Math.floor(target.maxHp * config.gymRules.rockSolidCap));
}

/**
 * §5.9.5 Overcharge — on an overcharged turn (every Nth, counted like the tide), the extra AP on the turn's first card.
 * Consumables never pay it.
 */
export function ruleApDelta(state: CombatState, config: BattleConfig): number {
  if (ruleOf(state) !== 'overcharge' || turnsUntil(state, config.gymRules.overchargeEvery) !== 1) return 0;
  return state.player.playedThisTurn.length === 0 ? config.gymRules.overchargeAp : 0;
}

/** §5.9.5 Toxic — a Poison the Leader's side inflicts is the badly-poisoned kind (§7.5). */
export function ruleEscalatesPoison(state: CombatState, attacker: Combatant): boolean {
  return ruleOf(state) === 'toxic' && isEnemy(state, attacker);
}

/** §5.9.5 Mind Lock — is this card the one Sabrina sealed at the draw? */
export function isSealed(state: CombatState, cardId: string): boolean {
  return ruleOf(state) === 'mind-lock' && state.ruleState?.sealedCardId === cardId;
}

/**
 * §5.9.5 Meltdown — does this hit lower its target's Defence? The Leader's Pokémon, landing damage on one of yours
 * that is not already at the floor. The caller (`strike`) applies the stage.
 */
export function ruleMeltsDefence(state: CombatState, attacker: Combatant, target: Combatant, dealt: number, config: BattleConfig): boolean {
  if (ruleOf(state) !== 'meltdown' || dealt <= 0 || target.hp <= 0) return false;
  if (!isEnemy(state, attacker) || !state.player.team.some((m) => m.uid === target.uid)) return false;
  return target.stages.defense > config.gymRules.meltdownFloor;
}

/** §5.9.5 Ice Armour — a Fire move shatters the enemy's ice shield whole, before it lands. */
export function shatterIce(state: CombatState, target: Combatant, moveType: string): boolean {
  if (ruleOf(state) !== 'ice-armour' || moveType !== 'fire' || target.shield <= 0 || !isEnemy(state, target)) return false;
  target.shield = 0;
  return true;
}

/** §5.9.5 Bloom — the damage flow marks one of the Leader's Pokémon that took any damage this turn. */
export function markHurt(state: CombatState, target: Combatant, amount: number): void {
  if (ruleOf(state) !== 'bloom' || amount <= 0) return;
  const e = state.enemies.find((x) => x.uid === target.uid);
  if (e) e.hurtThisTurn = true;
}

/**
 * §5.9.5 — what a rule counts right now, for the chip on the fight's top bar: the turns until a timed rule lands
 * (Riptide, Tremor, Overcharge, Mind Lock), or the multiplier a growing one stands at (Rollout, Swarm). Null when the
 * rule keeps no count, or its count is nothing yet.
 */
export type RuleCounter = { kind: 'turns'; turns: number } | { kind: 'multiplier'; value: number } | null;
export function ruleCounter(state: CombatState, config: BattleConfig): RuleCounter {
  const g = config.gymRules;
  switch (ruleOf(state)) {
    case 'riptide':
      return { kind: 'turns', turns: turnsUntil(state, g.riptideEvery) };
    case 'tremor':
      return { kind: 'turns', turns: turnsUntil(state, g.tremorEvery) };
    case 'overcharge':
      return { kind: 'turns', turns: turnsUntil(state, g.overchargeEvery) };
    case 'mind-lock':
      return { kind: 'turns', turns: turnsUntil(state, g.mindLockEvery) };
    case 'rollout': {
      const n = rolloutTurns(state, config);
      return n > 0 ? { kind: 'multiplier', value: 1 + g.rolloutPerTurn * n } : null;
    }
    case 'swarm': {
      const waiting = state.enemyQueue.filter((e) => e.hp > 0).length;
      return waiting > 0 ? { kind: 'multiplier', value: 1 + g.swarmPerWaiting * waiting } : null;
    }
    case 'synergy': {
      const m = synergyMultiplier(state, config);
      return m > 1 ? { kind: 'multiplier', value: m } : null;
    }
    default:
      return null;
  }
}

/**
 * §5.9.5 Riptide / Tremor — how many turns until the next one lands (1 = at the end of this turn). Turn 0 is
 * before the fight's first draw, so the count is read from the turn in progress.
 */
export function turnsUntil(state: Pick<CombatState, 'turn'>, every: number): number {
  const t = Math.max(1, state.turn);
  const r = t % every;
  return r === 0 ? 1 : every - r + 1;
}
