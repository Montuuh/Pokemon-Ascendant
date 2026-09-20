import { describe, expect, it } from 'vitest';
import { GameRng } from './gameRng';
import { RNG_STREAM_NAMES, RngStreams, fnv1a } from './rngStreams';

// Per §10.7 — deterministic, replayable, bit-compatible with the Unity build.
describe('GameRng', () => {
  it('nextUint_Seed1_MatchesXorshift32Vector', () => {
    // 1 → (^<<13) 8193 → (^>>17) 8193 → (^<<5) 270369
    expect(new GameRng(1).nextUint()).toBe(270369);
  });

  it('nextUint_ZeroSeed_ClampsToOne', () => {
    expect(new GameRng(0).nextUint()).toBe(new GameRng(1).nextUint());
  });

  it('sequence_SameSeed_Identical', () => {
    const a = new GameRng(123456789);
    const b = new GameRng(123456789);
    for (let i = 0; i < 1000; i++) expect(a.nextUint()).toBe(b.nextUint());
  });

  it('range_StaysWithinBounds', () => {
    const r = new GameRng(42);
    for (let i = 0; i < 10_000; i++) {
      const v = r.range(-3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
    expect(r.range(5, 5)).toBe(5);
  });

  it('range01_Within0And1', () => {
    const r = new GameRng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.range01();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('cursor_RestoreResumesSequence', () => {
    const r = new GameRng(99);
    r.nextUint();
    r.nextUint();
    const snap = r.cursor;
    const next = r.nextUint();
    const s = new GameRng(1);
    s.cursor = snap;
    expect(s.nextUint()).toBe(next);
  });

  it('pickWeighted_RespectsWeightsRoughly', () => {
    const r = new GameRng(2024);
    let heavy = 0;
    const n = 20_000;
    const options = [
      ['light', 1],
      ['heavy', 9],
    ] as const;
    for (let i = 0; i < n; i++) if (r.pickWeighted(options) === 'heavy') heavy++;
    expect(heavy / n).toBeGreaterThan(0.85);
    expect(heavy / n).toBeLessThan(0.95);
  });

  it('shuffle_IsDeterministicPermutation', () => {
    const a = new GameRng(5).shuffle([1, 2, 3, 4, 5, 6]);
    const b = new GameRng(5).shuffle([1, 2, 3, 4, 5, 6]);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('RngStreams', () => {
  it('fnv1a_KnownVectors', () => {
    expect(fnv1a('')).toBe(2166136261);
    expect(fnv1a('a')).toBe(0xe40c292c);
  });

  it('streams_AreIsolated', () => {
    const s = new RngStreams(1234);
    const before = s.get('LootRNG').cursor;
    for (let i = 0; i < 50; i++) s.get('CombatRNG').nextUint();
    expect(s.get('LootRNG').cursor).toBe(before);
  });

  it('restoreContentCursors_LeavesMapUntouched', () => {
    const s = new RngStreams(77);
    for (let i = 0; i < 5; i++) for (const n of RNG_STREAM_NAMES) s.get(n).nextUint();
    const snap = s.captureCursors();
    const fresh = new RngStreams(77);
    const mapBefore = fresh.get('MapRNG').cursor;
    fresh.restoreContentCursors(snap);
    expect(fresh.get('MapRNG').cursor).toBe(mapBefore);
    expect(fresh.get('CombatRNG').cursor).toBe(snap.CombatRNG);
    expect(fresh.get('EncounterRNG').nextUint()).toBe(s.get('EncounterRNG').nextUint());
  });
});
