import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import { wildRolls } from './economy';
import { WILD_TIERS, type WildTier } from './region';
import type { MapNode, RunState } from './types';

// §2.6.2 — who is waiting in a Wild Area (v0.9.7). The node shows its whole pool by rarity; walking in rolls the
// rarity by its odds, then one species evenly inside it. The roll is a hash of the run's seed, the Region and the
// node's id — like the group plan (§5.6.3) — so the fight, a replay and a reload all meet the same Pokémon, and no
// draw is taken from the map's stream.

export interface WildRoll {
  species: string;
  tier: WildTier;
}

/** §2.6.2 — the rarity a 0–1 roll lands on. */
function tierFor(roll: number, odds: Record<WildTier, number>): number {
  let edge = 0;
  for (let i = 0; i < WILD_TIERS.length; i++) {
    edge += odds[WILD_TIERS[i]!];
    if (roll < edge) return i;
  }
  return 0;
}

/**
 * §2.6.2 — the chance each rarity is the one met, as the roll will make it: the node's odds, the better of
 * `rolls` draws (§7.3.4 Lure Module: P(at most tier k) = (odds up to k)^rolls), and an empty tier's share passed
 * down to the next commoner one. What the preview card shows, so its numbers always add up and never lie.
 */
export function wildChances(wild: NonNullable<MapNode['preview']['wild']>, rolls = 1): Record<WildTier, number> {
  const out: Record<WildTier, number> = { common: 0, uncommon: 0, rare: 0 };
  let below = 0;
  let cum = 0;
  WILD_TIERS.forEach((t, i) => {
    cum += wild.odds[t];
    const atMost = i === WILD_TIERS.length - 1 ? 1 : Math.min(1, cum) ** rolls;
    let land = i;
    while (land > 0 && !wild.pool[WILD_TIERS[land]!].length) land--;
    out[WILD_TIERS[land]!] += atMost - below;
    below = atMost;
  });
  return out;
}

/** §2.6.2 — a Wild node's chances for this run: the Lure Module counted in. */
export function wildChancesFor(node: MapNode, run: RunState, content: ContentRegistry): { chances: Record<WildTier, number>; rolls: number } | null {
  if (!node.preview.wild) return null;
  const rolls = wildRolls(run, content);
  return { chances: wildChances(node.preview.wild, rolls), rolls };
}

/**
 * §2.6.2 — roll the species a Wild node holds. §7.3.4 Lure Module: the rarity is rolled more than once and the
 * rarest kept. A tier left empty (a pool a level offset evolved together) falls to the next commoner one.
 */
export function rollWild(node: MapNode, run: RunState, content: ContentRegistry): WildRoll {
  const wild = node.preview.wild;
  // A save from before v0.9.7: its named species were the offer, and the first was the one fought.
  if (!wild) return { species: node.preview.speciesIds[0]!, tier: 'common' };
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`wild:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
  let t = 0;
  for (let i = 0; i < wildRolls(run, content); i++) t = Math.max(t, tierFor(rng.range01(), wild.odds));
  while (t > 0 && !wild.pool[WILD_TIERS[t]!].length) t--;
  const tier = WILD_TIERS[t]!;
  const list = wild.pool[tier].length ? wild.pool[tier] : node.preview.speciesIds;
  return { species: list[Math.min(list.length - 1, Math.floor(rng.range01() * list.length))]!, tier };
}
