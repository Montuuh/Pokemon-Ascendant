import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32 } from '../rng/rngStreams';
import { mysteryEvent } from '../run/events';
import { lockKey, type LockKind } from '../run/locks';

// §8.6 — the vault: the part of the game's content a new account has not opened yet, and how it is opened.
//
// v0.9.99 turned relic unlocks off because a fresh account held 3 of the 18 Uncommons and rarity could not mean
// what it says. The rework (v0.9.110) locks again, differently: **every rarity keeps more than half of its rows
// open from the first run** (a content test holds the floor), what is locked is what changes a rule or asks you to
// know the game, and it comes back a piece at a time — an Oak's Parcel after nearly every run (one of three, your
// pick), a Field Note for the relics that have a deed, a Gym Leader's TM with their Badge.
//
// The rows live here rather than as a field on each content row because the lock is the account's business, not
// the relic's: one table says what a new game holds back, and `catalogs/vault.md` is its catalogue.

export interface VaultEntry {
  /** `relic:barrier-charm`, `held:plates` — stable: a save holds it. */
  id: string;
  kind: LockKind;
  /** The content ids it opens. One, except a bundle (the Plates). */
  ids: readonly string[];
  /** Where it comes from: an Oak's Parcel, or the first Badge won from a Leader. */
  source: 'parcel' | { badge: string };
  /** A bundle's own name and line; a single row takes them from its content. */
  name?: string;
  blurb?: string;
}

const parcels = (kind: LockKind, ids: readonly string[]): VaultEntry[] => ids.map((id) => ({ id: lockKey(kind, id), kind, ids: [id], source: 'parcel' as const }));

/** §8.6.1 — the sixteen Type Plates arrive as one card. */
export const PLATES = [
  'splash-plate', 'flame-plate', 'zap-plate', 'meadow-plate', 'mind-plate', 'icicle-plate', 'fist-plate', 'earth-plate',
  'sky-plate', 'stone-plate', 'toxic-plate', 'insect-plate', 'spooky-plate', 'draco-plate', 'dread-plate', 'iron-plate',
] as const;

/** §8.14 — each Leader's TM, opened by their Badge the first time it is won. The series' own gifts where it has one. */
export const LEADER_TM: Readonly<Record<string, string>> = {
  'boulder-badge': 'tm48-rock-slide',
  'cascade-badge': 'tm05-surf',
  'hive-badge': 'tm03-swords-dance',
  'plain-badge': 'tm08-body-slam',
  'volcano-badge': 'tm38-fire-blast',
  'rainbow-badge': 'tm22-solar-beam',
  'thunder-badge': 'tm24-thunderbolt',
  'soul-badge': 'tm06-toxic',
  'marsh-badge': 'tm65-calm-mind',
  'earth-badge': 'tm07-earthquake',
  'knuckle-badge': 'tm66-bulk-up',
  'glacier-badge': 'tm13-ice-beam',
};

/**
 * §8.6.1 — everything a new account holds back. 43 cards come by parcel and 12 TMs by Badge. Every Legendary relic,
 * every consumable and every recruitable species is open from the first run: the party is the deck, a Gym's
 * one-of-three Legendary pick needs the whole six, and the supplies are written into the route's own tables.
 */
export const VAULT: readonly VaultEntry[] = [
  // Relics — 8 of 32 Commons, 8 of 18 Uncommons, 4 of 9 Rares. The Commons and four of the Uncommons also open by
  // their Field Note (§8.7.1).
  ...parcels('relic', ['barrier-charm', 'cleanse-tag', 'lucky-egg-token', 'soothe-bell', 'status-lance', 'healers-kit', 'hand-off-pouch', 'battle-tracker']),
  ...parcels('relic', ['reactor-core', 'lure-module', 'cycle-cell', 'phoenix-feather', 'crown-of-echoes', 'time-spinner', 'trainers-instinct', 'box-expander']),
  ...parcels('relic', ['champions-crest', 'soul-link', 'perfect-recall', 'evolution-catalyst']),
  // Held items — the five that change how a Pokémon is played, and the Plates as one card. The type boosters and
  // everything an evolution waits on are open.
  ...parcels('held', ['leftovers', 'eviolite', 'focus-sash', 'power-bracer', 'choice-scarf']),
  { id: 'held:plates', kind: 'held', ids: PLATES, source: 'parcel', name: 'The Type Plates', blurb: 'All sixteen Plates: a type boost for the wearer, and an aura for the bench while it leads.' },
  // TMs — fourteen by parcel, the heavy hitters and the moves that change a fight's shape; a Leader's own by Badge.
  ...parcels('tm', ['tm04-flamethrower', 'tm14-blizzard', 'tm15-hyper-beam', 'tm25-thunder', 'tm29-psychic', 'tm47-explosion', 'tm64-giga-impact', 'tm68-overheat']),
  ...parcels('tm', ['tm42-dream-eater', 'tm43-sky-attack', 'tm44-rest', 'tm51-dark-pulse', 'tm53-flash-cannon', 'tm62-substitute']),
  ...Object.entries(LEADER_TM).map(([badge, tm]): VaultEntry => ({ id: lockKey('tm', tm), kind: 'tm', ids: [tm], source: { badge } })),
  // Mystery events — the three gambles.
  ...parcels('event', ['cursed-trinket', 'slot-booth', 'unmarked-cave']),
];

const BY_ID = new Map(VAULT.map((e) => [e.id, e]));
export const vaultEntry = (id: string): VaultEntry | undefined => BY_ID.get(id);

/** The vault entry that holds a content id, if it is held back at all. */
export const vaultEntryFor = (kind: LockKind, id: string): VaultEntry | undefined => VAULT.find((e) => e.kind === kind && e.ids.includes(id));

/** The account's side of the vault: just the ids it has opened. */
export interface VaultHolder {
  unlocks: readonly string[];
}

/** §8.6.2 — the lock keys a run started by this account carries: every id of every entry still closed. */
export const lockedKeys = (account: VaultHolder): string[] =>
  VAULT.filter((e) => !account.unlocks.includes(e.id)).flatMap((e) => e.ids.map((id) => lockKey(e.kind, id)));

/** Is this content row held back from this account? */
export const isVaulted = (account: VaultHolder, kind: LockKind, id: string): boolean => {
  const e = vaultEntryFor(kind, id);
  return !!e && !account.unlocks.includes(e.id);
};

/** §8.6.2 — what a parcel can still hold for this account. */
export const parcelPool = (account: VaultHolder): VaultEntry[] => VAULT.filter((e) => e.source === 'parcel' && !account.unlocks.includes(e.id));

/** §8.6.2 — the numbers: Research a parcel costs (the first ten are cheaper), and what one is worth once the vault is empty. */
export const PARCEL = { earlyCost: 300, earlyCount: 10, cost: 450, overflowTokens: 10 } as const;
export const parcelCost = (earned: number): number => (earned < PARCEL.earlyCount ? PARCEL.earlyCost : PARCEL.cost);

/**
 * §8.6.2 — the cards the next parcel shows. A pure function of the account's salt, how many parcels it has opened
 * and what is left, so the offer is the same however many times the parcel is looked at, and taking a card is the
 * only thing that changes it.
 */
export function parcelOffer(account: VaultHolder & { salt: number; parcelsOpened: number }, choices: number): VaultEntry[] {
  const pool = [...parcelPool(account)];
  const rng = new GameRng(fmix32((account.salt ^ Math.imul(account.parcelsOpened + 1, 0x9e3779b1)) >>> 0) || 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.range(0, i + 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, choices);
}

const KIND_LABEL: Record<LockKind, string> = { relic: 'Relic', consumable: 'Item', held: 'Held item', tm: 'TM', event: 'Mystery event' };

/** A vault entry in the player's words: what the parcel's card and the Item Guide's silhouette print. */
export function vaultCard(entry: VaultEntry, content: ContentRegistry): { name: string; kind: string; description: string } {
  const kind = KIND_LABEL[entry.kind];
  if (entry.name) return { name: entry.name, kind, description: entry.blurb ?? '' };
  const id = entry.ids[0]!;
  switch (entry.kind) {
    case 'relic': {
      const r = content.relic(id);
      return { name: r.name, kind: `${r.rarity[0]!.toUpperCase()}${r.rarity.slice(1)} relic`, description: r.description };
    }
    case 'consumable': {
      const c = content.consumable(id);
      return { name: c.name, kind, description: c.description };
    }
    case 'held': {
      const h = content.heldItem(id);
      return { name: h.name, kind, description: h.description };
    }
    case 'tm': {
      const t = content.tm(id);
      return { name: t.name, kind, description: t.description };
    }
    case 'event': {
      const e = mysteryEvent(id);
      return { name: e.title, kind, description: 'A new Mystery can turn up on the route.' };
    }
  }
}
