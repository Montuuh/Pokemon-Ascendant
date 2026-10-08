import type { ContentRegistry } from '../content/defs';
import type { AccountState } from './account';
import { ACHIEVEMENTS, type MedalTier } from './achievements';
import { discoverableRelics, discoveryProgress } from './unlocks';

// §8.7 / §8.6.1 — what a fold of the account moved, as notes the screen can show (v0.9.6): a medal that crept
// forward, one that completed, a Tier-2 relic's discovery counter that rose, one that was discovered. Derived by
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
  for (const id of discoverableRelics(content)) {
    if (before.relics.includes(id)) continue;
    const r = content.relic(id);
    const was = discoveryProgress(before, r);
    const now = discoveryProgress(after, r);
    if (!was || !now) continue;
    const done = after.relics.includes(id);
    const to = done ? now.goal : now.have;
    if (to <= was.have) continue;
    notes.push({ kind: 'discovery', id, name: r.name, text: now.text, from: was.have, to, goal: now.goal, done });
  }
  return notes;
}
