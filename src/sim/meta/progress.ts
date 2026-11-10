import type { ContentRegistry } from '../content/defs';
import type { AccountState } from './account';
import { ACHIEVEMENTS, type MedalTier } from './achievements';

// §8.7 — what a fold of the account moved in the Journal, as notes the screen can show (v0.9.6): a medal that
// crept forward, one that completed, a Field Note's counter that rose, one that was written up. Derived by
// comparing two account states, so it can never disagree with what the account actually holds.

export type ProgressNote =
  | { kind: 'achievement'; id: string; name: string; tier: MedalTier; from: number; to: number; goal: number; done: boolean }
  | { kind: 'discovery'; id: string; name: string; text: string; from: number; to: number; goal: number; done: boolean };

export function progressNotes(before: AccountState, after: AccountState, content: ContentRegistry): ProgressNote[] {
  const notes: ProgressNote[] = [];
  for (const a of ACHIEVEMENTS) {
    if (before.achievements.unlocked.includes(a.id)) continue;
    const done = after.achievements.unlocked.includes(a.id);
    const from = before.achievements.counts[a.id] ?? 0;
    const to = done ? a.goal : (after.achievements.counts[a.id] ?? 0);
    // A hidden medal says nothing until it completes (§8.7.3).
    if (to <= from || (a.hidden && !done)) continue;
    notes.push({ kind: 'achievement', id: a.id, name: a.name, tier: a.tier, from, to, goal: a.goal, done });
  }
  // §8.7.1 — Field Notes: the deed's counter, capped at its goal.
  for (const r of content.allRelics()) {
    if (!r.discovery || r.pending || before.notes.includes(r.id)) continue;
    const have = (s: AccountState) => Math.min(r.discovery!.goal, s.counters[r.discovery!.counter] ?? 0);
    const done = after.notes.includes(r.id);
    const from = have(before);
    const to = done ? r.discovery.goal : have(after);
    if (to <= from) continue;
    notes.push({ kind: 'discovery', id: r.id, name: r.name, text: r.discovery.text, from, to, goal: r.discovery.goal, done });
  }
  return notes;
}
