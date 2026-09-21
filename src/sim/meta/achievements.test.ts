import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ACHIEVEMENTS, accountContextFor, applyAccountEvents, applyMetaEvent, applyMetaEvents, createRun, defaultRunCtx, emptyAccount, emptyProgress, metaEventsFor,
  newPartyMon, type MetaEvent, type RunState,
} from '@/sim';

// §8.7 — the achievement fold. Pure in, pure out, so a ten-run streak is a millisecond rather than ten runs.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const run = () => createRun('squirtle', 7, ctx);

const combatEnd = (over: Partial<Extract<MetaEvent, { t: 'combat-end' }>> = {}): MetaEvent => ({
  t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 10, manualSwaps: 0, faints: 0, ...over,
});

describe('Achievements — §8.7', () => {
  it('EveryRowHasAGoalAndATrigger_AndNoDescriptionLeaksASectionNumber', () => {
    expect(ACHIEVEMENTS).toHaveLength(24);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(24);
    for (const a of ACHIEVEMENTS) {
      expect(a.goal, a.id).toBeGreaterThan(0);
      expect(a.description, a.id).not.toMatch(/§\d/);
      // A row nothing can ever fire is the thing this whole file exists to prevent (§8.7.1.1).
      const tally = { crits: 0, reshuffles: 0, statusesApplied: ['burn', 'poison', 'sleep', 'paralysis'], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 0, peakHandAtTurnEnd: 0 };
      const fires = [
        combatEnd({ damageTaken: 0, manualSwaps: 5, kind: 'boss', tally }),
        combatEnd({ faints: 2, activeSpecies: ['a', 'b', 'c'] }),
        { t: 'recruit', speciesId: 'pidgey', boxFull: true },
        { t: 'evolution', uid: 'u', toSpeciesId: 'wartortle' },
        { t: 'badge-awarded', badgeId: 'boulder-badge' },
        { t: 'relic-acquired', relicId: 'coin-pouch', heldCount: 8 },
        { t: 'run-end', won: true, catches: 0, badges: 1, monoType: true, relicCount: 1, modifierCount: 2 },
        { t: 'dex-tier-up', speciesId: 'pidgey', tier: 1 },
        { t: 'bond-rank-up', line: 'pidgey', rank: 3 },
        { t: 'bond-rank-up', line: 'pidgey', rank: 5 },
      ] satisfies MetaEvent[];
      // The streak rows read a streak already in progress.
      const streak = { ...emptyProgress(), winStreak: 4 };
      expect(fires.some((e) => a.count(e, streak) > 0), `${a.id} can never fire`).toBe(true);
    }
  });

  it('AOneShotUnlocksOnce_AndNeverRefires', () => {
    const first = applyMetaEvent(emptyProgress(), combatEnd());
    expect(first.unlocked.map((a) => a.id)).toContain('first-blood');
    const second = applyMetaEvent(first.progress, combatEnd());
    expect(second.unlocked.map((a) => a.id)).not.toContain('first-blood');
    expect(second.progress.unlocked.filter((id) => id === 'first-blood')).toHaveLength(1);
  });

  it('ACountedRow_TracksProgress_AndCountsEachSpeciesOnce_§8.7.2', () => {
    const events: MetaEvent[] = ['pidgey', 'rattata', 'pidgey', 'oddish'].map((speciesId) => ({ t: 'recruit', speciesId, boxFull: false }));
    const { progress } = applyMetaEvents(emptyProgress(), events);
    // Three distinct species out of four recruits: the bar says three, because it is a dex and not a tally.
    expect(progress.counts['welcome-wagon']).toBe(3);
    expect(progress.species).toEqual(['pidgey', 'rattata', 'oddish']);
    expect(progress.unlocked).not.toContain('welcome-wagon');
  });

  it('ProgressNeverExceedsItsGoal', () => {
    const many: MetaEvent[] = Array.from({ length: 30 }, (_, i) => ({ t: 'recruit', speciesId: `s${i}`, boxFull: false }));
    const { progress } = applyMetaEvents(emptyProgress(), many);
    expect(progress.counts['welcome-wagon']).toBe(10);
    expect(progress.unlocked).toContain('welcome-wagon');
  });

  it('AHiddenRowIsStillEarnable_§8.7.3', () => {
    const { unlocked } = applyMetaEvent(emptyProgress(), { t: 'recruit', speciesId: 'pidgey', boxFull: true });
    expect(unlocked.map((a) => a.id)).toContain('full-house');
    expect(ACHIEVEMENTS.find((a) => a.id === 'full-house')?.hidden).toBe(true);
  });

  it('TheWinStreak_ResetsOnALoss_§8.7', () => {
    let p = emptyProgress();
    for (let i = 0; i < 3; i++) p = applyMetaEvent(p, { t: 'run-end', won: true, catches: 2, badges: 1 }).progress;
    expect(p.winStreak).toBe(3);
    p = applyMetaEvent(p, { t: 'run-end', won: false, catches: 0, badges: 0 }).progress;
    expect(p.winStreak).toBe(0);
  });

  it('UntouchableAndSwapMaestro_ReadTheFightTheyActuallyGot', () => {
    expect(applyMetaEvent(emptyProgress(), combatEnd({ damageTaken: 0 })).unlocked.map((a) => a.id)).toContain('untouchable');
    expect(applyMetaEvent(emptyProgress(), combatEnd({ damageTaken: 1 })).unlocked.map((a) => a.id)).not.toContain('untouchable');
    expect(applyMetaEvent(emptyProgress(), combatEnd({ manualSwaps: 5 })).unlocked.map((a) => a.id)).toContain('swap-maestro');
    expect(applyMetaEvent(emptyProgress(), combatEnd({ manualSwaps: 4 })).unlocked.map((a) => a.id)).not.toContain('swap-maestro');
    // A lost fight earns neither, however clean it was.
    expect(applyMetaEvent(emptyProgress(), combatEnd({ outcome: 'defeat', damageTaken: 0 })).unlocked).toHaveLength(0);
  });
});

describe('Reading events off the run — §8.7', () => {
  it('ARecruit_AnEvolution_AndABadge_AreAllVisibleInADiff', () => {
    const before = run();
    const after: RunState = {
      ...before,
      box: [...before.box, newPartyMon('pidgey', 6, content, 99)],
      badges: ['boulder-badge'],
      relics: ['coin-pouch'],
    };
    const kinds = metaEventsFor(before, after, content).map((e) => e.t);
    expect(kinds).toContain('recruit');
    expect(kinds).toContain('badge-awarded');
    expect(kinds).toContain('relic-acquired');

    // An evolution is the same uid wearing a different species — not a new Pokémon.
    const evolved: RunState = { ...before, box: before.box.map((m) => ({ ...m, speciesId: 'wartortle' })) };
    const evo = metaEventsFor(before, evolved, content);
    expect(evo.map((e) => e.t)).toEqual(['evolution']);
  });

  it('NothingHappened_ProducesNoEvents', () => {
    const s = run();
    expect(metaEventsFor(s, s, content)).toEqual([]);
  });

  it('TheRunEnding_IsReportedOnce_WithWhatItWas', () => {
    const before = run();
    const won: RunState = { ...before, outcome: 'victory', badges: ['boulder-badge'] };
    const events = metaEventsFor(before, won, content);
    const end = events.find((e) => e.t === 'run-end');
    expect(end).toMatchObject({ t: 'run-end', won: true, catches: 0, badges: 1, layersCleared: 0 });
    // And not again on the next diff, because the run was already over.
    expect(metaEventsFor(won, won, content).some((e) => e.t === 'run-end')).toBe(false);
  });
});

describe('The v0.6 rows — §8.7.1.1', () => {
  it('MasteryMedals_CountPokedexPromotions_ThroughTheAccountFold', () => {
    // §5.13.1 — ten defeats of a common species is Familiar. Five species at Familiar is Acquaintance.
    const events: MetaEvent[] = [];
    for (const sid of ['pidgey', 'rattata', 'caterpie', 'weedle', 'zubat']) {
      for (let i = 0; i < 10; i++) events.push({ t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 1, manualSwaps: 0, faints: 0, defeated: [sid], activeSpecies: [] });
    }
    const { state, delta } = applyAccountEvents(emptyAccount(), events, accountContextFor(content));
    expect(state.achievements.counts.acquaintance).toBe(5);
    expect(delta.unlockedAchievements.map((a) => a.id)).toContain('acquaintance');
  });

  it('TheStreakRows_ReadTheStreakBeforeThisRunCountsIt', () => {
    const won: MetaEvent = { t: 'run-end', won: true, catches: 1, badges: 1 };
    const lost: MetaEvent = { t: 'run-end', won: false, catches: 0, badges: 0 };
    const two = applyMetaEvents(emptyProgress(), [won, won]);
    expect(two.progress.unlocked).toContain('back-to-back');
    expect(two.progress.unlocked).not.toContain('win-streak');
    // A loss resets the streak; the next win starts again from one.
    const broken = applyMetaEvents(emptyProgress(), [won, lost, won]);
    expect(broken.progress.unlocked).not.toContain('back-to-back');
    expect(broken.progress.winStreak).toBe(1);
  });

  it('TheRunEndFacts_DriveTheBuildIdentityRows', () => {
    const mono: MetaEvent = { t: 'run-end', won: true, catches: 2, badges: 1, monoType: true, relicCount: 2, modifierCount: 2 };
    const { progress } = applyMetaEvent(emptyProgress(), mono);
    expect(progress.unlocked).toEqual(expect.arrayContaining(['monotype-master', 'minimalist', 'modifier-master']));
    const many: MetaEvent = { t: 'relic-acquired', relicId: 'coin-pouch', heldCount: 8 };
    expect(applyMetaEvent(emptyProgress(), many).progress.unlocked).toContain('relic-hoarder');
  });
});
