import type { MoveDef } from '../content/defs';
import type { BattleConfig } from './battleConfig';
import type { CombatCtx } from './context';
import type { Combatant, EnemyCombatant, Intent } from './state';
import { effectiveSpeed, STAT_GROWTH_RATE } from './stats';

// §4.1.3.1 — the critical rhythm. Every Pokémon, on both sides, fills a meter as it acts: a card played on the
// player's side, an action taken on the enemy's. Full, its next hit is a critical — certain, never rolled, and shown
// before it lands (Pillar 1). How many it takes is set by its Speed.

/**
 * §4.1.3.1 — its Speed with the level taken back out, so the tiers read the species (and its stages, Paralysis and
 * the Dojo's points) rather than how far into the run it is: every stat grows by the same share a level (§6.2.3).
 */
export function rhythmSpeed(c: Combatant, config: BattleConfig): number {
  return effectiveSpeed(c, config) / rhythmLevelFactor(c);
}

/** §4.1.3.1 — the growth its level gave every stat (§6.2.3): what the card's Speed carries and the rhythm takes back out. */
export function rhythmLevelFactor(c: Pick<Combatant, 'level'>): number {
  return 1 + STAT_GROWTH_RATE * (Math.max(1, Math.trunc(c.level)) - 1);
}

/** §4.1.3.1 — which row of its side's table it sits in (fastest first): the first tier its level-free Speed reaches. */
export function rhythmTierIndex(c: Combatant, config: BattleConfig): number {
  const s = rhythmSpeed(c, config);
  const tiers = 'tier' in c ? config.critRhythm.enemyTiers : config.critRhythm.tiers;
  const at = tiers.findIndex((t) => s >= t.speed);
  return at < 0 ? tiers.length - 1 : at;
}

/** §4.1.3.1 — how many acts fill its meter: its tier's `every`, on its side's table. */
export function rhythmEvery(c: Combatant, config: BattleConfig): number {
  const tiers = 'tier' in c ? config.critRhythm.enemyTiers : config.critRhythm.tiers;
  return tiers[rhythmTierIndex(c, config)]?.every ?? Infinity;
}

/** §4.1.3.1 — its meter is full: its next hit is a critical. */
export function rhythmReady(c: Combatant, config: BattleConfig): boolean {
  return c.rhythm >= rhythmEvery(c, config);
}

/** §4.1.3.1 — what spends the meter: a hit that would not crit anyway. An AlwaysCrit move leaves it full. */
export function spendsRhythm(move: MoveDef | null): boolean {
  return !!move && move.power > 0 && !move.alwaysCrit;
}

/** §4.1.3.1 — after an act: a rhythm crit empties the meter; anything else fills it a step, up to full. */
export function stepRhythm(c: Combatant, config: BattleConfig, spent: boolean): void {
  c.rhythm = spent ? 0 : Math.min(rhythmEvery(c, config), c.rhythm + 1);
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
  const every = rhythmEvery(enemy, ctx.config);
  let meter = enemy.rhythm;
  for (const intent of [enemy.intent, enemy.acts === 2 ? enemy.second : null]) {
    if (!intent || intent.kind === 'incapacitated') continue;
    const crit = meter >= every && hits(intent, ctx);
    if (crit) intent.crit = true;
    else delete intent.crit;
    meter = crit ? 0 : Math.min(every, meter + 1);
  }
}
