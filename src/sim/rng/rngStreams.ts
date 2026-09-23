import { GameRng } from './gameRng';

// Per §10.7.2 — isolated RNG streams, each seeded deterministically from the run seed.
// streamSeed = fmix32(runSeed XOR FNV1a(streamName)). Consuming one stream never perturbs another.
// The fmix32 finaliser (MurmurHash3) is a deliberate departure from the Unity build: xorshift32's first
// outputs are strongly correlated for nearby seeds (1001, 1002, …), which made "different fights" open with
// the same roll. Parity note recorded in docs/migration/from-unity.md §5.
// CasinoRNG (§2.11.5) is its own stream so a Game Corner pull never moves a fight's or a shelf's rolls.
export const RNG_STREAM_NAMES = ['MapRNG', 'CombatRNG', 'LootRNG', 'MysteryRNG', 'EncounterRNG', 'CasinoRNG'] as const;
export type RngStreamName = (typeof RNG_STREAM_NAMES)[number];

/** §10.8.6 — JSON-safe snapshot of every stream cursor, persisted in the run save. */
export type RngCursors = Record<RngStreamName, number>;

/** FNV-1a 32-bit over UTF-16 code units (same as the C# `char` loop in the Unity build). */
export function fnv1a(s: string): number {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/** MurmurHash3 32-bit finaliser — spreads nearby integers across the whole 32-bit space. */
export function fmix32(h: number): number {
  h >>>= 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

export class RngStreams {
  readonly streams: Readonly<Record<RngStreamName, GameRng>>;

  constructor(readonly runSeed: number) {
    const seed = runSeed >>> 0;
    const make = (name: RngStreamName) => new GameRng(fmix32(seed ^ fnv1a(name)));
    this.streams = {
      MapRNG: make('MapRNG'),
      CombatRNG: make('CombatRNG'),
      LootRNG: make('LootRNG'),
      MysteryRNG: make('MysteryRNG'),
      EncounterRNG: make('EncounterRNG'),
      CasinoRNG: make('CasinoRNG'),
    };
  }

  get(name: RngStreamName): GameRng {
    return this.streams[name];
  }

  /** §10.8.6 — capture all cursors before a node-entry autosave. */
  captureCursors(): RngCursors {
    const out = {} as RngCursors;
    for (const n of RNG_STREAM_NAMES) out[n] = this.streams[n].cursor;
    return out;
  }

  /**
   * §10.8.6 — restore the CONTENT cursors on resume. MapRNG is deliberately left at its region-entry
   * state: the map is rebuilt by deterministic replay, so restoring a post-build cursor would generate
   * a different map.
   */
  restoreContentCursors(c: RngCursors): void {
    this.streams.CombatRNG.cursor = c.CombatRNG;
    this.streams.LootRNG.cursor = c.LootRNG;
    this.streams.MysteryRNG.cursor = c.MysteryRNG;
    this.streams.EncounterRNG.cursor = c.EncounterRNG;
  }
}
