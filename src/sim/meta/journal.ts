import type { ContentRegistry } from '../content/defs';
import type { AccountState } from './account';
import { ACHIEVEMENTS, type AchievementDef, type MedalTier } from './achievements';
import { vaultEntryFor } from './vault';

// §8.7 — the Trainer Journal: deeds, and what each one hands over.
//
// Until v0.9.110 an achievement paid Trainer XP and lived on a tab of the PC, and a relic's discovery criterion was
// a second, separate list. They are one book now, in three shelves — **Field Notes** (do a thing once, and the relic
// that carries the deed opens), **Challenges** (win under a constraint) and **Milestones** (the totals) — and no
// entry pays only a number: every one hands over Tokens by its medal *and* a thing with a name, a parcel at the
// least. Up to three can be pinned (§8.7.2), and the pinned ones are what a run's end shows as "next time".

/** §8.7.0 — Tokens by medal. */
export const MEDAL_TOKENS: Record<MedalTier, number> = { bronze: 2, silver: 5, gold: 10, platinum: 20 };

export interface JournalReward {
  tokens: number;
  /** Oak's Parcels handed over on the spot. */
  parcels?: number;
  /** A cosmetic only the Journal gives — never sold at the Corner. */
  cosmetic?: string;
}

/**
 * §8.7.0 — the named prize of each entry, where it is not the medal's default (a parcel; two for a Platinum).
 * A cosmetic here is the deed's own trophy, so the Corner does not sell it. **Every Bronze entry's prize is a
 * trainer avatar**: the first steps come four to a first run, and four parcels on top of the run's own would empty
 * the vault before the player had learned what a parcel is.
 */
const PRIZE: Readonly<Record<string, Omit<JournalReward, 'tokens'>>> = {
  'first-blood': { cosmetic: 'avatar-youngster' },
  gotcha: { cosmetic: 'avatar-bug-catcher' },
  'growing-up': { cosmetic: 'avatar-lass' },
  'badge-collector': { cosmetic: 'avatar-hiker' },
  'welcome-wagon': { cosmetic: 'avatar-camper' },
  metamorphosis: { cosmetic: 'avatar-picnicker' },
  acquaintance: { cosmetic: 'avatar-swimmer' },
  'pokedex-apprentice': { cosmetic: 'title-pokedex-scholar' },
  'veteran-trainer': { cosmetic: 'title-veteran' },
  specialist: { cosmetic: 'frame-great' },
  'living-pokedex': { cosmetic: 'frame-master' },
  'flawless-gym': { cosmetic: 'avatar-ace-trainer' },
  champion: { cosmetic: 'frame-ultra', parcels: 1 },
  'win-streak': { cosmetic: 'title-champion-in-waiting', parcels: 1 },
};

/** The cosmetics the Journal hands out; the Trainer's Corner leaves them off its shelf. */
export const JOURNAL_COSMETICS: readonly string[] = Object.values(PRIZE).flatMap((p) => (p.cosmetic ? [p.cosmetic] : []));

/** §8.7.0 — what an entry pays when it completes. */
export function journalReward(a: Pick<AchievementDef, 'id' | 'tier'>): JournalReward {
  const prize = PRIZE[a.id] ?? { parcels: a.tier === 'platinum' ? 2 : 1 };
  return { tokens: MEDAL_TOKENS[a.tier], ...prize };
}

export type JournalShelf = 'notes' | 'challenges' | 'milestones';
export const JOURNAL_SHELVES: readonly { id: JournalShelf; name: string; about: string }[] = [
  { id: 'notes', name: 'Field Notes', about: 'One deed, one relic.' },
  { id: 'challenges', name: 'Challenges', about: 'Win under a constraint.' },
  { id: 'milestones', name: 'Milestones', about: 'The totals, across every run.' },
];

const SHELF_OF: Record<AchievementDef['category'], JournalShelf> = {
  'first-steps': 'milestones', recruitment: 'milestones', evolution: 'milestones', mastery: 'milestones',
  combat: 'challenges', boss: 'challenges', 'build-identity': 'challenges', endurance: 'challenges',
};

/** One row of the Journal, whichever shelf it is on. */
export interface JournalEntry {
  /** An achievement's id, or `note:<relic id>` for a Field Note. */
  id: string;
  shelf: JournalShelf;
  name: string;
  /** The deed. `???` for a hidden entry that is not done. */
  description: string;
  tier: MedalTier | null;
  have: number;
  goal: number;
  done: boolean;
  hidden: boolean;
  /** The prize, in the player's words. */
  prize: string;
  pinned: boolean;
}

export const noteId = (relicId: string): string => `note:${relicId}`;

const prizeText = (r: JournalReward, cosmeticName: (id: string) => string): string => {
  const parts = [`${r.tokens} Tokens`];
  if (r.cosmetic) parts.push(cosmeticName(r.cosmetic));
  if (r.parcels) parts.push(r.parcels === 1 ? "an Oak's Parcel" : `${r.parcels} Oak's Parcels`);
  return parts.join(' · ');
};

/** §8.7.2 — the whole Journal for this account, in shelf order. */
export function journalEntries(account: AccountState, content: ContentRegistry, cosmeticName: (id: string) => string = (id) => id): JournalEntry[] {
  const notes: JournalEntry[] = content.allRelics().filter((r) => r.discovery && !r.pending).map((r) => {
    const done = account.notes.includes(r.id);
    const locked = !!vaultEntryFor('relic', r.id);
    return {
      id: noteId(r.id), shelf: 'notes' as const, name: r.name, description: r.discovery!.text, tier: null,
      have: done ? r.discovery!.goal : Math.min(r.discovery!.goal, account.counters[r.discovery!.counter] ?? 0), goal: r.discovery!.goal,
      done, hidden: false, prize: locked ? `${r.name} unlocked` : "An Oak's Parcel", pinned: account.pins.includes(noteId(r.id)),
    };
  });
  const medals: JournalEntry[] = ACHIEVEMENTS.map((a) => {
    const done = account.achievements.unlocked.includes(a.id);
    const secret = !!a.hidden && !done;
    return {
      id: a.id, shelf: SHELF_OF[a.category], name: a.name, description: secret ? '???' : a.description, tier: a.tier,
      have: done ? a.goal : (account.achievements.counts[a.id] ?? 0), goal: a.goal, done, hidden: !!a.hidden,
      prize: prizeText(journalReward(a), cosmeticName), pinned: account.pins.includes(a.id),
    };
  });
  return [...notes, ...medals];
}

/**
 * §8.7.2 — what to chase next: the pinned entries first, then the open ones closest to done. A hidden entry is
 * never suggested (§8.7.3), and a pin on a finished entry is skipped rather than shown as a goal.
 */
export function nextGoals(account: AccountState, content: ContentRegistry, n = 3, cosmeticName?: (id: string) => string): JournalEntry[] {
  const open = journalEntries(account, content, cosmeticName).filter((e) => !e.done && !(e.hidden && !e.pinned));
  const pinned = open.filter((e) => e.pinned);
  const rest = open.filter((e) => !e.pinned).sort((a, b) => b.have / b.goal - a.have / a.goal || a.goal - b.goal);
  return [...pinned, ...rest].slice(0, n);
}
