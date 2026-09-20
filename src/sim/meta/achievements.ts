import type { ContentRegistry } from '../content/defs';
import type { CombatOutcomeReport, RunState } from '../run/types';
import { boxCapacity } from '../run/run';

// §8.7 — achievements: the account's record of what has been done, across runs.
//
// Three rules shape this file.
//
// **An achievement without a named trigger is not implementable.** `catalogs/achievements.md` exists because
// the Unity project shipped 19 of 50 for exactly that reason, so every row here names the event it listens
// for and nothing is authored that cannot be watched.
//
// **The sim stays pure.** Nothing here reads or writes storage and nothing subscribes to anything: the run
// layer produces *events*, this file folds them into progress, and the app layer persists the result. That
// is what makes a ten-run streak testable in a millisecond instead of ten runs.
//
// **The catalogue is fifty and v0.5 ships ten.** The other forty need Trainer XP, Tokens, the Pokédex tiers,
// Mastery moves or Regions 2 and 3. They arrive with those systems rather than shipping as rows that can
// never complete — §7.7's honest-degradation rule, applied to a list instead of an item.

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** §8.7 — the events the run layer can produce. Each one is something that visibly happened. */
export type MetaEvent =
  | { t: 'combat-end'; outcome: 'victory' | 'defeat' | 'caught'; kind: string; damageTaken: number; manualSwaps: number; faints: number }
  | { t: 'recruit'; speciesId: string; boxFull: boolean }
  | { t: 'evolution'; uid: string; toSpeciesId: string }
  | { t: 'badge-awarded'; badgeId: string }
  | { t: 'relic-acquired'; relicId: string; heldCount: number }
  | { t: 'run-end'; won: boolean; catches: number; badges: number };

export interface AchievementDef {
  id: string;
  category: 'first-steps' | 'recruitment' | 'evolution' | 'combat' | 'boss' | 'build-identity' | 'endurance';
  name: string;
  description: string;
  tier: MedalTier;
  /** §8.7.3 — about a fifth are hidden, and the description is `???` until it completes. */
  hidden?: boolean;
  /** How many of the thing are needed. 1 for a one-shot. Shown as a progress bar when above 1. */
  goal: number;
  /**
   * What this row counts, given one event and the account's running state. Returns the number to *add*, or
   * `'set'` to mean "this completes it outright". Pure: no dates, no storage, no RNG.
   */
  count: (e: MetaEvent, seen: AchievementProgress) => number;
}

/** The account's record. `counts` is per-achievement progress; `species` is the lifetime dex of recruits. */
export interface AchievementProgress {
  counts: Record<string, number>;
  species: string[];
  /** §8.7 Endurance — consecutive won runs. Reset by a loss, which is what makes it a streak. */
  winStreak: number;
  /** Ids already completed, with the run index they completed on. Insertion order is completion order. */
  unlocked: string[];
}

export const emptyProgress = (): AchievementProgress => ({ counts: {}, species: [], winStreak: 0, unlocked: [] });

/** §8.7.0 — the reward band. Tokens and Trainer XP are v0.6; the tier is what the medal shows today. */
export const MEDAL_XP: Record<MedalTier, number> = { bronze: 75, silver: 200, gold: 325, platinum: 450 };

/**
 * §8.7.1.1 — the ten v0.5 rows, one or two per category, chosen for one reason: every trigger already
 * exists. Numbers in the comments are the catalogue's own row numbers, so the two stay joinable.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ── First Steps
  {
    id: 'first-blood', category: 'first-steps', name: 'First Blood', tier: 'bronze', goal: 1,
    description: 'Win your first fight.',
    count: (e) => (e.t === 'combat-end' && e.outcome !== 'defeat' ? 1 : 0),
  },
  {
    id: 'gotcha', category: 'first-steps', name: 'Gotcha!', tier: 'bronze', goal: 1,
    description: 'Recruit your first Pokémon.',
    count: (e) => (e.t === 'recruit' ? 1 : 0),
  },
  {
    id: 'growing-up', category: 'first-steps', name: 'Growing Up', tier: 'bronze', goal: 1,
    description: 'Trigger your first evolution.',
    count: (e) => (e.t === 'evolution' ? 1 : 0),
  },
  {
    id: 'badge-collector', category: 'first-steps', name: 'Badge Collector', tier: 'bronze', goal: 1,
    description: 'Earn your first Badge.',
    count: (e) => (e.t === 'badge-awarded' ? 1 : 0),
  },
  // ── Recruitment
  {
    id: 'welcome-wagon', category: 'recruitment', name: 'Welcome Wagon', tier: 'bronze', goal: 10,
    description: 'Recruit ten different species, across every run you have played.',
    // The dex is deduplicated by the folder, so a repeat recruit adds nothing and the bar stays honest.
    count: (e, seen) => (e.t === 'recruit' && !seen.species.includes(e.speciesId) ? 1 : 0),
  },
  {
    id: 'full-house', category: 'recruitment', name: 'Full House', tier: 'silver', goal: 1, hidden: true,
    description: 'Recruit a Pokémon with a Box that is already full, and choose who leaves.',
    count: (e) => (e.t === 'recruit' && e.boxFull ? 1 : 0),
  },
  // ── Combat
  {
    id: 'untouchable', category: 'combat', name: 'Untouchable', tier: 'silver', goal: 1,
    description: 'Win a fight without taking a single point of damage.',
    count: (e) => (e.t === 'combat-end' && e.outcome !== 'defeat' && e.damageTaken === 0 ? 1 : 0),
  },
  {
    id: 'swap-maestro', category: 'combat', name: 'Swap Maestro', tier: 'silver', goal: 1,
    description: 'Win a fight in which you paid for five or more manual swaps.',
    count: (e) => (e.t === 'combat-end' && e.outcome !== 'defeat' && e.manualSwaps >= 5 ? 1 : 0),
  },
  // ── Boss
  {
    id: 'flawless-gym', category: 'boss', name: 'Flawless Gym', tier: 'gold', goal: 1,
    description: 'Beat a Gym Leader without a single Pokémon fainting.',
    count: (e) => (e.t === 'combat-end' && e.kind === 'boss' && e.outcome === 'victory' && e.faints === 0 ? 1 : 0),
  },
  // ── Build Identity
  {
    id: 'pacifists-path', category: 'build-identity', name: "Pacifist's Path", tier: 'gold', goal: 1, hidden: true,
    description: 'Win a run without catching a single wild Pokémon.',
    count: (e) => (e.t === 'run-end' && e.won && e.catches === 0 ? 1 : 0),
  },
];

export const achievementById = (id: string): AchievementDef | undefined => ACHIEVEMENTS.find((a) => a.id === id);

/**
 * Fold one event into the account's progress. Returns the new progress and whatever completed *on this
 * event*, so the caller can show a toast for it without diffing two arrays.
 *
 * Pure and total: an event nothing listens for is a no-op, and an already-unlocked row never re-fires.
 */
export function applyMetaEvent(progress: AchievementProgress, e: MetaEvent): { progress: AchievementProgress; unlocked: AchievementDef[] } {
  const next: AchievementProgress = {
    counts: { ...progress.counts },
    species: [...progress.species],
    winStreak: progress.winStreak,
    unlocked: [...progress.unlocked],
  };

  // The streak is state, not a count: it has to move before the rows that read it do.
  if (e.t === 'run-end') next.winStreak = e.won ? next.winStreak + 1 : 0;

  const unlocked: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (next.unlocked.includes(a.id)) continue;
    const add = a.count(e, progress);
    if (add <= 0) continue;
    const total = Math.min(a.goal, (next.counts[a.id] ?? 0) + add);
    next.counts[a.id] = total;
    if (total >= a.goal) {
      next.unlocked.push(a.id);
      unlocked.push(a);
    }
  }

  // The dex grows *after* the rows have been scored against the old one, so "a species you had not seen"
  // means what it says on the event that introduced it.
  if (e.t === 'recruit' && !next.species.includes(e.speciesId)) next.species.push(e.speciesId);

  return { progress: next, unlocked };
}

/** Fold a whole list, for a resumed session or a test. */
export function applyMetaEvents(progress: AchievementProgress, events: readonly MetaEvent[]): { progress: AchievementProgress; unlocked: AchievementDef[] } {
  let out = progress;
  const all: AchievementDef[] = [];
  for (const e of events) {
    const step = applyMetaEvent(out, e);
    out = step.progress;
    all.push(...step.unlocked);
  }
  return { progress: out, unlocked: all };
}

/**
 * §8.7 — what happened between two run states, as events.
 *
 * Derived by comparison rather than emitted by the reducer, on purpose. `RunState` is saved, replayed and
 * checksummed (§10.8); hanging an event queue off it would put account bookkeeping inside the thing that has
 * to replay identically. A diff is pure, testable, and cannot desynchronise a save.
 */
export function metaEventsFor(before: RunState, after: RunState, content: ContentRegistry, report?: CombatOutcomeReport): MetaEvent[] {
  const events: MetaEvent[] = [];

  if (report) {
    const faints = report.team.filter((t) => t.fainted).length;
    events.push({
      t: 'combat-end',
      outcome: report.outcome,
      kind: before.pendingScenario?.kind ?? 'wild',
      damageTaken: report.damageTaken ?? 0,
      manualSwaps: report.manualSwaps ?? 0,
      faints,
    });
  }

  // A recruit is a Pokémon in the Box that was not there before. Catching and the Box-full path both land
  // here, which is right: §8.7's row is about the roster, not about how it grew.
  for (const mon of after.box) {
    if (before.box.some((m) => m.uid === mon.uid)) continue;
    // §2.3.1 — "the Box was already full" is measured against the capacity the run is actually playing at,
    // which §8.8's Box Squeeze can lower from six to four.
    events.push({ t: 'recruit', speciesId: mon.speciesId, boxFull: before.box.length >= boxCapacity(before) });
  }

  // An evolution is a Pokémon whose species changed under the same uid.
  for (const mon of after.box) {
    const was = before.box.find((m) => m.uid === mon.uid);
    if (was && was.speciesId !== mon.speciesId) events.push({ t: 'evolution', uid: mon.uid, toSpeciesId: mon.speciesId });
  }

  for (const id of after.badges) if (!before.badges.includes(id)) events.push({ t: 'badge-awarded', badgeId: id });

  for (const id of after.relics) {
    if (!before.relics.includes(id)) events.push({ t: 'relic-acquired', relicId: id, heldCount: after.relics.length });
  }

  if (before.outcome === 'in-progress' && after.outcome !== 'in-progress') {
    events.push({ t: 'run-end', won: after.outcome === 'victory', catches: after.stats.catches, badges: after.badges.length });
  }

  // `content` is taken so a future row can ask about a species it has never seen; nothing needs it yet.
  void content;
  return events;
}
