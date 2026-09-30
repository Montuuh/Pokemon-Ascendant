import type { ContentRegistry, RelicRarity } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { NodeKind } from './types';
import { inPool, isOfferable, rollLegendaryOffer, rollRelic, rollRelicOffer } from './economy';

// §2.7.2 / §2.8 / §2.6.2 / §7.3.1 — what a won fight hands over besides money and XP (v0.8.6, the user's call of
// 2026-09-30). Consumables are spent now (§3.5), so a fight is where most of them come from; relics are scarce,
// so a fight rarely hands one over. Every number here is a first value for the v0.8.8 balance pass.

type FightKind = 'wild' | 'trainer' | 'elite' | 'elite-wild' | 'gym';

export interface SupplyRule {
  /** The chance the fight drops any consumables at all. */
  chance: number;
  /** How many, inclusive, drawn from the Region's supply table. */
  count: readonly [number, number];
  /** One more from the Region's prize table — the better item a big fight owes. */
  prize: boolean;
  /** Poké Balls found: the chance, then how many. */
  balls: { chance: number; count: readonly [number, number] };
}

/** §2.7.2 / §2.8 / §2.6.2 — the supplies each kind of fight drops. */
export const FIGHT_SUPPLIES: Readonly<Record<FightKind, SupplyRule>> = {
  // §2.6.2 — a wild node sometimes leaves a ball or two in the grass, and now and then a Potion.
  wild: { chance: 0.15, count: [1, 1], prize: false, balls: { chance: 0.3, count: [1, 2] } },
  // §2.7.2 — a trainer always pays in supplies; that is the reward now that relics are rare.
  trainer: { chance: 1, count: [1, 2], prize: false, balls: { chance: 0.2, count: [1, 1] } },
  'elite-wild': { chance: 1, count: [2, 2], prize: false, balls: { chance: 0, count: [0, 0] } },
  elite: { chance: 1, count: [2, 2], prize: true, balls: { chance: 1, count: [2, 2] } },
  gym: { chance: 1, count: [2, 2], prize: true, balls: { chance: 0, count: [0, 0] } },
};

/**
 * §7.2 — the Region's supply table, weighted. Curated rather than uniform by tier: a uniform draw handed out as
 * many Ice Heals as Potions. Region 1 is Potions and cures, Region 2 Super Potion territory, Region 3 Hyper
 * Potion territory — the upgrade chain (§7.2.6) doing the scaling, the way it does in the games.
 */
export const SUPPLY_TABLE: readonly (readonly [string, number])[][] = [
  [['potion', 40], ['antidote', 10], ['paralyze-heal', 10], ['burn-heal', 6], ['awakening', 5], ['ice-heal', 3], ['full-heal', 5], ['ether', 8], ['x-attack', 7], ['x-defense', 3], ['defog', 3]],
  [['potion', 15], ['super-potion', 32], ['antidote', 5], ['paralyze-heal', 7], ['burn-heal', 5], ['awakening', 4], ['ice-heal', 4], ['full-heal', 8], ['ether', 9], ['x-attack', 5], ['x-defense', 5], ['defog', 5]],
  [['super-potion', 22], ['hyper-potion', 28], ['paralyze-heal', 5], ['burn-heal', 5], ['awakening', 4], ['ice-heal', 4], ['full-heal', 10], ['ether', 10], ['x-attack', 5], ['x-defense', 5], ['max-potion', 2], ['revive', 2], ['defog', 4]],
];

/** §2.8 / §5.9 — the Region's prize table: one of these, evenly, on top of an Elite's or a Gym's supplies. */
export const PRIZE_TABLE: readonly (readonly string[])[] = [
  ['super-potion', 'ether', 'full-heal'],
  ['hyper-potion', 'ether', 'full-heal'],
  ['max-potion', 'revive', 'hyper-potion'],
];

/** A table row names a consumable the content has — a missing one is left out rather than thrown on mid-run. */
const shippable = (content: ContentRegistry, id: string): boolean => content.allConsumables().some((c) => c.id === id);

function weighted(rng: GameRng, table: readonly (readonly [string, number])[]): string {
  const total = table.reduce((n, [, w]) => n + w, 0);
  let roll = rng.range01() * total;
  for (const [id, w] of table) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return table[table.length - 1]![0];
}

const between = (rng: GameRng, [lo, hi]: readonly [number, number]): number => lo + Math.floor(rng.range01() * (hi - lo + 1));

/** §7.2 — `count` draws from the Region's supply table. */
export function drawSupplies(rng: GameRng, content: ContentRegistry, regionIndex: number, count: number): string[] {
  const table = (SUPPLY_TABLE[Math.min(regionIndex, SUPPLY_TABLE.length - 1)] ?? []).filter(([id]) => shippable(content, id));
  const out: string[] = [];
  for (let i = 0; i < count && table.length; i++) out.push(weighted(rng, table));
  return out;
}

/**
 * §2.7.2 — roll a won fight's supplies. The rolls happen in a fixed order on the loot stream, so a reload drops
 * the same things (§10.8.6). `lean` is the Lean Pack modifier (§8.8): fights drop nothing to carry.
 */
export function rollFightSupplies(rng: GameRng, content: ContentRegistry, kind: NodeKind, regionIndex: number, lean: boolean): { consumables: string[]; balls: number } {
  const rule = FIGHT_SUPPLIES[kind as FightKind];
  if (!rule) return { consumables: [], balls: 0 };
  const consumables: string[] = [];
  if (rng.chance(rule.chance)) consumables.push(...drawSupplies(rng, content, regionIndex, between(rng, rule.count)));
  if (rule.prize) {
    const prizes = (PRIZE_TABLE[Math.min(regionIndex, PRIZE_TABLE.length - 1)] ?? []).filter((id) => shippable(content, id));
    if (prizes.length) consumables.push(prizes[Math.min(prizes.length - 1, Math.floor(rng.range01() * prizes.length))]!);
  }
  const balls = rule.balls.chance > 0 && rng.chance(rule.balls.chance) ? between(rng, rule.balls.count) : 0;
  return lean ? { consumables: [], balls: 0 } : { consumables, balls };
}

/**
 * §7.3.1 — relics are scarce (v0.8.6). A trainer drops only a Common, and only sometimes; the Elite Trainer
 * offers a pick of three; the Elite Wild, beaten rather than caught, a single Rare (§2.8.2); the Gym its own
 * 1-of-3 (`gymRelicOffer`). Nothing else in a fight hands one over.
 */
export const RELIC_REWARD = {
  trainerChance: 0.15,
  trainerRarity: 'common' as RelicRarity,
  /** §2.8.1 — the Elite Trainer's pick: two Uncommons and a Rare. */
  elitePick: ['uncommon', 'uncommon', 'rare'] as RelicRarity[],
  eliteWild: 'rare' as RelicRarity,
  /** §7.3.7 — the Region whose Gym offers Rares rather than Legendaries (the first). */
  rareGymRegions: 1,
};

/**
 * §7.3 / §8.6.2 — the best rarity at or below the one asked for that still has a relic to offer. An account that
 * has not opened a Rare yet is offered an Uncommon in its place, not whatever the general fallback lands on.
 */
function bestOpenRarity(content: ContentRegistry, held: readonly string[], rarity: RelicRarity, accountPool: readonly string[] | null): RelicRarity {
  const ladder: RelicRarity[] = ['rare', 'uncommon', 'common'];
  for (const r of ladder.slice(Math.max(0, ladder.indexOf(rarity)))) {
    if (content.allRelics().some((x) => x.rarity === r && isOfferable(x) && inPool(x, accountPool) && !held.includes(x.id))) return r;
  }
  return rarity;
}

/** §2.8.1 — one relic of each rarity asked for, distinct, none held; a rarity that has run dry steps down one. */
export function rollMixedOffer(rng: GameRng, content: ContentRegistry, held: readonly string[], rarities: readonly RelicRarity[], accountPool: readonly string[] | null = null): string[] {
  const out: string[] = [];
  for (const rarity of rarities) {
    const taken = [...held, ...out];
    const id = rollRelic(rng, content, taken, bestOpenRarity(content, taken, rarity, accountPool), accountPool);
    if (id) out.push(id);
  }
  return out;
}

/**
 * §7.3.7 — the Gym's 1-of-3. The first Region's Gym offers Rares; from the second on it is the Legendary pick,
 * which at the two-a-run cap becomes Rares again. A pick short of three is topped up the way every relic roll
 * falls back, so the moment never offers fewer than it can.
 */
export function gymRelicOffer(rng: GameRng, content: ContentRegistry, held: readonly string[], regionIndex: number, accountPool: readonly string[] | null = null): string[] {
  const offer = regionIndex < RELIC_REWARD.rareGymRegions
    ? rollRelicOffer(rng, content, held, 'rare', 3, accountPool)
    : rollLegendaryOffer(rng, content, held, 3, accountPool);
  while (offer.length < 3) {
    const taken = [...held, ...offer];
    const id = rollRelic(rng, content, taken, bestOpenRarity(content, taken, 'rare', accountPool), accountPool);
    if (!id) break;
    offer.push(id);
  }
  return offer;
}

/** A list of ids as counted pairs, in first-seen order: `['potion', 'potion', 'ether']` → potion ×2, ether ×1. */
export function countSupplies(ids: readonly string[]): [string, number][] {
  const out = new Map<string, number>();
  for (const id of ids) out.set(id, (out.get(id) ?? 0) + 1);
  return [...out];
}

/** The one way a list of supplies is written, in the log and on every screen: "Potion ×2, Ether". */
export const supplyLabel = (ids: readonly string[], nameOf: (id: string) => string): string =>
  countSupplies(ids).map(([id, n]) => (n > 1 ? `${nameOf(id)} ×${n}` : nameOf(id))).join(', ');

/**
 * §2.9.1 / §2.11.1 — the healers hand out supplies too (v0.8.6): the field nurse a pair for the road, by Region;
 * a City's Center a pair on the first visit, sized for the Region ahead. Gifts, so Lean Pack leaves them alone.
 */
export const SERVICE_GIFTS = {
  nurse: [['potion', 'potion'], ['super-potion', 'super-potion'], ['super-potion', 'super-potion']] as readonly (readonly string[])[],
  center: [['super-potion', 'super-potion'], ['hyper-potion', 'hyper-potion'], ['hyper-potion', 'hyper-potion']] as readonly (readonly string[])[],
};

export const serviceGift = (kind: keyof typeof SERVICE_GIFTS, regionIndex: number): string[] => {
  const table = SERVICE_GIFTS[kind];
  return [...(table[Math.min(regionIndex, table.length - 1)] ?? [])];
};
