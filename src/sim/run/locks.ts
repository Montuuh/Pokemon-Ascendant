import type { RunPerks } from './types';

// §8.6.2 — what a run may not draw: the content its account has not opened (the vault, `meta/vault.ts`).
//
// The run carries the closed ids as `perks.locked`, frozen at its start like every other perk, and every place that
// draws from a content pool — a shop's stock, a drop, a find, a Mystery — asks here first. A fixture, the balance
// harness and any run started without an account carry no locks: the whole catalogue is theirs.

export type LockKind = 'relic' | 'consumable' | 'held' | 'tm' | 'event';

export const lockKey = (kind: LockKind, id: string): string => `${kind}:${id}`;

/** Is this content row closed to the run? */
export const isLocked = (run: { perks?: Pick<RunPerks, 'locked'> | undefined }, kind: LockKind, id: string): boolean =>
  run.perks?.locked?.includes(lockKey(kind, id)) ?? false;

/** A pool with the run's locked rows taken out. */
export const unlockedOnly = <T extends { id: string }>(run: { perks?: Pick<RunPerks, 'locked'> | undefined }, kind: LockKind, rows: readonly T[]): T[] =>
  run.perks?.locked?.length ? rows.filter((r) => !isLocked(run, kind, r.id)) : [...rows];

/** The locked ids of one kind, bare — for the map generator, which takes the Mystery events it may not place. */
export const lockedIds = (perks: Pick<RunPerks, 'locked'> | undefined, kind: LockKind): string[] =>
  (perks?.locked ?? []).filter((k) => k.startsWith(`${kind}:`)).map((k) => k.slice(kind.length + 1));
