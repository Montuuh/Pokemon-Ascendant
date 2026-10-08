import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { applyAccountEvents, emptyAccount } from './account';
import { ACHIEVEMENTS, type MetaEvent } from './achievements';
import { progressNotes } from './progress';
import { accountContextFor, discoverableRelics } from './unlocks';

// §8.7 / §8.6.1 — the notes a fold of the account leaves for the screen (v0.9.6).

const content = buildRegistry();
const ctx = accountContextFor(content, 1);
const win: MetaEvent = { t: 'combat-end', outcome: 'victory', tier: 'wild', turns: 3, damageTaken: 5, fainted: 0, enemies: ['pidgey'] } as unknown as MetaEvent;

describe('Progress notes — §8.7', () => {
  it('ProgressNotes_AFirstWin_CompletesFirstBlood_AndMovesTheCountersBelowTheirGoal', () => {
    const before = emptyAccount();
    const { state: after } = applyAccountEvents(before, [win], ctx);
    const notes = progressNotes(before, after, content);
    const blood = notes.find((n) => n.id === 'first-blood');
    expect(blood).toMatchObject({ kind: 'achievement', from: 0, to: 1, goal: 1, done: true });
    // Every note moved forward and none overshoots its goal.
    for (const n of notes) {
      expect(n.to).toBeGreaterThan(n.from);
      expect(n.to).toBeLessThanOrEqual(n.goal);
    }
  });

  it('ProgressNotes_NothingMoved_SaysNothing_AndAHiddenMedalStaysSilentUntilDone', () => {
    const a = emptyAccount();
    expect(progressNotes(a, a, content)).toEqual([]);
    const hidden = ACHIEVEMENTS.find((x) => x.hidden && x.goal > 1);
    if (hidden) {
      const after = { ...a, achievements: { ...a.achievements, counts: { [hidden.id]: 1 } } };
      expect(progressNotes(a, after, content).some((n) => n.id === hidden.id)).toBe(false);
    }
  });

  it('ProgressNotes_ADiscoveryCounterRising_IsANote_UntilTheRelicIsFound', () => {
    const id = discoverableRelics(content).find((r) => content.relic(r).discovery);
    if (!id) return;
    const d = content.relic(id).discovery!;
    const a = emptyAccount();
    const after = { ...a, counters: { [d.counter]: 1 } };
    const note = progressNotes(a, after, content).find((n) => n.id === id);
    expect(note).toMatchObject({ kind: 'discovery', from: 0, to: Math.min(1, d.goal), goal: d.goal });
  });
});
