import type { ContentRegistry } from '../content/defs';
import type { PokemonType } from '../types';
import { typeMultiplier } from '../combat/typeChart';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import { wildRolls } from './economy';
import { WILD_TIERS, WALL_GUARD_REGIONS, type WildTier } from './region';
import type { MapNode, RunState } from './types';

// §2.6.2 — who is waiting in a Wild Area (v0.9.7). The node shows its whole pool by rarity; walking in rolls the
// rarity by its odds, then one species evenly inside it. The roll is a hash of the run's seed, the Region and the
// node's id — like the group plan (§5.6.3) — so the fight, a replay and a reload all meet the same Pokémon, and no
// draw is taken from the map's stream.

export interface WildRoll {
  species: string;
  tier: WildTier;
}

/**
 * §2.6.2 — the row a rolled rarity is met in: itself, else the next commoner row that holds someone, else (a Common row
 * the wall guard emptied, §2.6.2.1) the next rarer one. Never an empty row while any row holds a Pokémon.
 */
function landingRow(pool: Record<WildTier, string[]>, t: number): number {
  let land = t;
  while (land > 0 && !pool[WILD_TIERS[land]!].length) land--;
  while (land < WILD_TIERS.length - 1 && !pool[WILD_TIERS[land]!].length) land++;
  return land;
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
    out[WILD_TIERS[landingRow(wild.pool, i)]!] += atMost - below;
    below = atMost;
  });
  return out;
}

/**
 * §2.6.2.1 — the team has a hit of its own type that is not Normal: a damaging move in an Active Pokémon's four that
 * matches one of its types. Until it does, a starter's Tackle and Scratch are all it has.
 */
export function teamHasOwnTypeHit(run: RunState, content: ContentRegistry): boolean {
  return run.box.some((mon) => {
    if (!run.activeUids.includes(mon.uid)) return false;
    const types = content.species(mon.speciesId).types;
    return mon.moveIds.some((id) => {
      const m = content.move(id);
      return m.power > 0 && m.type !== 'normal' && types.includes(m.type);
    });
  });
}

/** §2.6.2.1 — the types of the one Pokémon in the Active Team, while it stands alone; null once it has company. */
function loneActive(run: RunState, content: ContentRegistry): readonly PokemonType[] | null {
  if (run.activeUids.length !== 1) return null;
  const mon = run.box.find((m) => m.uid === run.activeUids[0]);
  return mon ? content.species(mon.speciesId).types : null;
}

/**
 * §2.6.2.1 — no wall before the first STAB: in the first Regions, while the team holds no hit of its own type, a Wild
 * Area keeps out the species a Normal move cannot hurt in full (Rock, Steel, Ghost — read off the type chart). A row
 * it empties is left empty, so its share falls to the commoner row as any empty row's does; a pool it would empty
 * whole is kept as it is. Every reader of the pool goes through here — the roll, the odds, the card, a pack's
 * companions — so what the card shows is what can come out of the grass.
 */
export function wildFor(node: MapNode, run: RunState, content: ContentRegistry): MapNode['preview']['wild'] {
  const wild = node.preview.wild;
  if (!wild || run.regionIndex >= WALL_GUARD_REGIONS) return wild;
  const walls = !teamHasOwnTypeHit(run, content);
  const lone = loneActive(run, content);
  if (!walls && !lone) return wild;
  const isWall = (id: string) => walls && typeMultiplier('normal', content.species(id).types) < 1;
  // §2.6.2.1 — and while a starter stands alone, no species whose own type hits it super-effectively.
  const isCounter = (id: string) => !!lone && content.species(id).types.some((t) => typeMultiplier(t, lone) > 1);
  const filtered = (drop: (id: string) => boolean) => ({ common: wild.pool.common.filter((id) => !drop(id)), uncommon: wild.pool.uncommon.filter((id) => !drop(id)), rare: wild.pool.rare.filter((id) => !drop(id)) });
  // Both guards, else the walls' alone (a shore of Water-types facing a lone Charmander), else the pool as it is.
  for (const pool of [filtered((id) => isWall(id) || isCounter(id)), filtered(isWall)]) if (WILD_TIERS.some((t) => pool[t].length)) return { ...wild, pool };
  return wild;
}

/** §2.6.2 — a Wild node's chances for this run: the Lure Module and the wall guard (§2.6.2.1) counted in. */
export function wildChancesFor(node: MapNode, run: RunState, content: ContentRegistry): { chances: Record<WildTier, number>; rolls: number } | null {
  const wild = wildFor(node, run, content);
  if (!wild) return null;
  const rolls = wildRolls(run, content);
  return { chances: wildChances(wild, rolls), rolls };
}

/**
 * §2.6.2 — roll the species a Wild node holds. §7.3.4 Lure Module: the rarity is rolled more than once and the
 * rarest kept. A tier left empty (a pool a level offset evolved together) falls to the next commoner one.
 */
export function rollWild(node: MapNode, run: RunState, content: ContentRegistry): WildRoll {
  const wild = wildFor(node, run, content);
  // A save from before v0.9.7: its named species were the offer, and the first was the one fought.
  if (!wild) return { species: node.preview.speciesIds[0]!, tier: 'common' };
  const rng = new GameRng(fmix32((run.seed ^ fnv1a(`wild:${run.regionIndex}:${node.id}`)) >>> 0) || 1);
  let t = 0;
  for (let i = 0; i < wildRolls(run, content); i++) t = Math.max(t, tierFor(rng.range01(), wild.odds));
  const tier = WILD_TIERS[landingRow(wild.pool, t)]!;
  const list = wild.pool[tier].length ? wild.pool[tier] : node.preview.speciesIds;
  return { species: list[Math.min(list.length - 1, Math.floor(rng.range01() * list.length))]!, tier };
}
