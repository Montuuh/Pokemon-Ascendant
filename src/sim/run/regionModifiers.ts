import type { ContentRegistry, RegionModifierDef } from '../content/defs';
import { isOfferable } from './economy';
import type { PartyMon, RunState } from './types';

// §2.11.3 — the Region Modifier: one at a time, one Region long, never stacking.
//
// Most of the pool resolves inside a fight through the shared §7.7 hooks (`src/sim/combat/items.ts` reads it
// beside relics and Badges). What lives here is the other half: the offer, and the three modifiers whose
// effect is a *run-layer* number — Trauma's per-stack cost, shop prices, and the heal after a won fight.

/** §2.11.3.1 — how often each tier turns up in a three-card offer. */
const TIER_WEIGHT: Record<RegionModifierDef['tier'], number> = { strong: 3, medium: 4, niche: 2 };

/** The one in force, or null. Returns null for a `pending` row too, so callers never branch on it twice. */
export function activeRegionModifier(run: RunState, content: ContentRegistry): RegionModifierDef | null {
  if (!run.regionModifier) return null;
  const row = content.regionModifier(run.regionModifier);
  return row.pending ? null : row;
}

/**
 * A run-layer number the Region Modifier changes, or `fallback`.
 *
 * Deliberately the same shape as §8.8's `modifierValue`: two systems that both answer "what number is in
 * force" should be read the same way, or the call sites start looking different for no reason.
 */
export function regionModifierValue(run: RunState, content: ContentRegistry, hook: string, key: string, fallback: number): number {
  const row = activeRegionModifier(run, content);
  if (!row || row.hook !== hook) return fallback;
  const v = row.params?.[key];
  return typeof v === 'number' ? v : fallback;
}

/**
 * §2.11.3 — three modifiers to choose between, weighted by tier and by the team in front of you.
 *
 * The weighting is what stops the offer being a random draw from seventeen: Trauma Resistance climbs when
 * the Box is actually carrying stacks, Coin Purse climbs when the purse is thin. A modifier whose system is
 * not reachable is excluded outright rather than offered and explained away — §7.7's rule, again.
 */
export function rollRegionModifierOffer(
  seed: number,
  content: ContentRegistry,
  team: readonly PartyMon[] = [],
  money = 0,
  count = 3,
): string[] {
  const trauma = team.reduce((n, m) => n + m.traumaStacks, 0);
  const weightOf = (m: RegionModifierDef): number => {
    let w = TIER_WEIGHT[m.tier];
    if (m.id === 'trauma-resistance') w += Math.min(6, trauma * 2);
    if (m.id === 'coin-purse' && money < 300) w += 3;
    if (m.id === 'pocket-healer' && team.some((x) => x.hp > 0 && x.traumaStacks > 0)) w += 2;
    return w;
  };

  const pool = content.allRegionModifiers().filter(isOfferable);
  const bag = pool.map((m) => ({ id: m.id, weight: weightOf(m) }));
  const out: string[] = [];
  // A small deterministic LCG rather than a GameRng: the offer is drawn by the new-run screen, which has a
  // seed but no stream, and it has to be stable across re-renders or the cards move under the cursor.
  let x = (seed || 1) >>> 0;
  for (let i = 0; i < count && bag.length; i++) {
    const total = bag.reduce((n, b) => n + b.weight, 0);
    x = (x * 1664525 + 1013904223) >>> 0;
    let roll = (x / 2 ** 32) * total;
    let idx = bag.length - 1;
    for (let j = 0; j < bag.length; j++) {
      roll -= bag[j]!.weight;
      if (roll <= 0) {
        idx = j;
        break;
      }
    }
    out.push(bag.splice(idx, 1)[0]!.id);
  }
  return out;
}

/**
 * §2.11.3 Bargain Hunter — what a Shop or Dojo price actually costs this Region.
 *
 * One function rather than a multiplier sprinkled over ten call sites, because a discount that is applied at
 * the till but not at the "can you afford it" guard is a rejected purchase the player was told they could
 * make. Rounded up, so a discount never makes something free.
 */
export function priceFor(run: RunState, content: ContentRegistry, base: number): number {
  const m = regionModifierValue(run, content, 'price-multiplier', 'multiplier', 1);
  return m === 1 ? base : Math.max(1, Math.ceil(base * m));
}

/** §8.2.1 / §2.11.3 Trauma Resistance — what one Trauma stack costs, as a percentage of max HP. */
export const traumaZone1Pct = (run: RunState, content: ContentRegistry): number =>
  regionModifierValue(run, content, 'trauma-relief', 'zone1Pct', 5);

/** §2.11.3 Pocket Healer — the share of max HP a won fight gives back, or 0. */
export const victoryHealPct = (run: RunState, content: ContentRegistry): number =>
  regionModifierValue(run, content, 'victory-heal', 'percentOfMaxHp', 0);
