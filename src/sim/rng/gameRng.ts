// Per docs/design/10-foundations.md §10.7.1 — seeded xorshift32.
// ALL gameplay randomness goes through a GameRng obtained from RngStreams. Math.random is lint-banned in src/sim.
// Bit-compatible with the Unity implementation so recorded runs can be replayed across both (golden-master).
// Float paths emulate C# single precision with Math.fround on purpose — do not "simplify" them.

const FLOAT_UINT_MAX = Math.fround(4294967295); // (float)uint.MaxValue rounds to 4294967296

export class GameRng {
  private state: number;

  constructor(seed: number) {
    const s = seed >>> 0;
    this.state = s === 0 ? 1 : s; // xorshift32 cannot leave the zero state
  }

  /** §10.8.6 — the live cursor. Snapshot into the run save; restore on resume so consumed rolls do not re-roll. */
  get cursor(): number {
    return this.state;
  }
  set cursor(value: number) {
    const v = value >>> 0;
    this.state = v === 0 ? 1 : v;
  }

  nextUint(): number {
    let s = this.state;
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    this.state = s;
    return s;
  }

  /** Integer in [min, maxExclusive). Modulo bias accepted for game use (matches the Unity build). */
  range(min: number, maxExclusive: number): number {
    if (maxExclusive <= min) return min;
    const span = (maxExclusive - min) >>> 0;
    return min + (this.nextUint() % span);
  }

  /** Float in [0, 1] (single-precision, as in the Unity build). */
  range01(): number {
    return Math.fround(Math.fround(this.nextUint()) / FLOAT_UINT_MAX);
  }

  /** True with the given probability. */
  chance(p: number): boolean {
    return this.range01() < p;
  }

  /** Per §10.7.1 — weighted pick; weights must be > 0 and options non-empty. */
  pickWeighted<T>(options: ReadonlyArray<readonly [value: T, weight: number]>): T {
    if (options.length === 0) throw new Error('pickWeighted: options must be non-empty');
    let total = 0;
    for (const [, w] of options) total = Math.fround(total + Math.fround(w));
    const roll = Math.fround(this.range01() * total);
    let cumulative = 0;
    for (const [v, w] of options) {
      cumulative = Math.fround(cumulative + Math.fround(w));
      if (roll <= cumulative) return v;
    }
    return options[options.length - 1]![0];
  }

  /** Fisher-Yates in place, deterministic. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.range(0, i + 1);
      const tmp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = tmp;
    }
    return arr;
  }
}
