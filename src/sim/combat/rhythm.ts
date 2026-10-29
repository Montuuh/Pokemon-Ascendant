import type { MoveDef } from '../content/defs';
import type { BattleConfig, RhythmCurve } from './battleConfig';
import type { CombatCtx } from './context';
import type { Combatant, EnemyCombatant, Intent } from './state';
import { STAT_GROWTH_RATE } from './stats';
import { stageMultiplier } from './statStages';

// §4.1.3.1 — the critical rhythm. Every Pokémon, on both sides, fills a meter as it acts: a card played on the
// player's side, an action taken on the enemy's. Full, its next hit is a critical — certain, never rolled, and shown
// before it lands (Pillar 1). How fast it fills is set by its Speed, and — since v0.9.80 — by what is happening to
// that Speed right now: a Speed stage or Paralysis changes the pace of the acts still to come, never a meter already full.

/** Float noise: a meter of 0.9999999999 after three thirds is full. */
const EPS = 1e-9;

/** §4.1.3.1 — the curve of its side. */
export const rhythmCurve = (c: Combatant, config: BattleConfig): RhythmCurve => ('tier' in c ? config.critRhythm.enemy : config.critRhythm.ally);

/** §4.1.3.1 — the growth its level gave every stat (§6.2.3): what the card's Speed carries and the rhythm takes back out. */
export function rhythmLevelFactor(c: Pick<Combatant, 'level'>): number {
  return 1 + STAT_GROWTH_RATE * (Math.max(1, Math.trunc(c.level)) - 1);
}

/**
 * §4.1.3.1 — its Speed with the level taken back out and nothing else applied: the species (and its path and the Dojo's
 * points), so the pace reads what it *is* and not how far into the run it is.
 */
export function rhythmSpeed(c: Combatant): number {
  return c.base.speed / rhythmLevelFactor(c);
}

/** §4.1.3.1 — the acts a species of this level-free Speed takes to fill its meter on a side's curve: K / Speed, kept inside the curve's reach. */
export function rhythmActsAt(speed: number, curve: RhythmCurve): number {
  return Math.max(curve.minActs, Math.min(curve.maxActs, curve.k / Math.max(1, speed)));
}

/**
 * §4.1.3.1 — what is happening to its Speed now, as one multiplier on its pace: the Speed stages (§4.2.6) and Paralysis
 * (§4.2.2.3, half). They apply *after* the species' own reach is settled, so a slow Pokémon still speeds up with a stage
 * and a fast one still slows down with Paralysis — the curve's edges do not swallow them.
 */
export function rhythmModifier(c: Combatant, config: BattleConfig): number {
  return stageMultiplier(c.stages.speed, config) * (c.status?.kind === 'paralysis' ? config.paralysisSpeedMultiplier : 1);
}

/** §4.1.3.1 — how many acts fill its meter right now (a fraction: 3.4 means the fourth act completes it). */
export function rhythmActs(c: Combatant, config: BattleConfig): number {
  const curve = rhythmCurve(c, config);
  return Math.max(curve.floorActs, Math.min(curve.ceilActs, rhythmActsAt(rhythmSpeed(c), curve) / rhythmModifier(c, config)));
}

/** §4.1.3.1 — the share of the meter one act fills. */
export const rhythmPace = (c: Combatant, config: BattleConfig): number => 1 / rhythmActs(c, config);

/** §4.1.3.1 — its meter is full: its next hit is a critical. */
export function rhythmReady(c: Combatant): boolean {
  return c.rhythm >= 1 - EPS;
}

/** §4.1.3.1 — acts still to go before its next hit is a critical, at today's pace; 0 when full. */
export function rhythmLeft(c: Combatant, config: BattleConfig): number {
  if (rhythmReady(c)) return 0;
  return Math.max(1, Math.ceil((1 - c.rhythm) * rhythmActs(c, config) - EPS));
}

/** §4.1.3.1 — what spends the meter: a hit that would not crit anyway. An AlwaysCrit move leaves it full. */
export function spendsRhythm(move: MoveDef | null): boolean {
  return !!move && move.power > 0 && !move.alwaysCrit;
}

/** §4.1.3.1 — after an act: a rhythm crit empties the meter; anything else fills it a step at today's pace, up to full. */
export function stepRhythm(c: Combatant, config: BattleConfig, spent: boolean): void {
  c.rhythm = spent ? 0 : Math.min(1, c.rhythm + rhythmPace(c, config));
}

/** §4.1.3.1 — an intent that hits: an attack on a slot, a Cleave, a Backstrike. */
function hits(intent: Intent | null | undefined, ctx: CombatCtx): boolean {
  if (!intent || !intent.moveId || intent.broken) return false;
  if (intent.kind !== 'attack' && intent.kind !== 'cleave' && intent.kind !== 'backstrike') return false;
  return spendsRhythm(ctx.content.move(intent.moveId));
}

/**
 * §4.1.3.1 — the enemy's crits are declared with its intents, so the chip prints CRIT and the critical number a turn
 * ahead. Its actions are walked in order, as Resolution will take them: the first hit with a full meter is the
 * critical, and a Pokémon that acts twice fills its meter twice a turn.
 */
export function markRhythm(enemy: EnemyCombatant, ctx: CombatCtx): void {
  const pace = rhythmPace(enemy, ctx.config);
  let meter = enemy.rhythm;
  for (const intent of [enemy.intent, enemy.acts === 2 ? enemy.second : null]) {
    if (!intent || intent.kind === 'incapacitated') continue;
    const crit = meter >= 1 - EPS && hits(intent, ctx);
    if (crit) intent.crit = true;
    else delete intent.crit;
    meter = crit ? 0 : Math.min(1, meter + pace);
  }
}
