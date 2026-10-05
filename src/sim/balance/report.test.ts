import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY, type FightTrace } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';

// §2.2.1 / v0.8.8 — the balance pass's instrument: whole three-Region runs, and per Region how often it is cleared,
// how long a fight runs, how hard the enemies hit (the median landed move as a share of the target's Max HP — the
// playtest's "enemies hit too softly" was 12 %), how Gyms go, and what the bag still holds when the run ends.
// Off in `npm run check` (it is minutes long); run it with `BALANCE_REPORT=1 REPORT_SEEDS=80 npx vitest run
// src/sim/balance/report.test.ts`.

const ON = !!process.env.BALANCE_REPORT;
const SEEDS = Number(process.env.REPORT_SEEDS ?? 40);

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const pct = (x: number) => `${Math.round(x * 100)} %`;

describe.skipIf(!ON)('Balance report — §2.2.1', () => {
  it('prints the report', { timeout: 60 * 60_000 }, () => {
    const fights: FightTrace[] = [];
    const cleared = [0, 0, 0, 0];
    const bagLeft: number[] = [];
    for (const starter of STARTER_IDS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const r = autoRun(9000 + seed, starter, ctx, DEFAULT_RUN_POLICY, 3, (f) => fights.push(f));
        cleared[r.regionsCleared]! += 1;
        bagLeft.push(r.bagLeft.length);
      }
    }
    const n = SEEDS * STARTER_IDS.length;
    const past = (k: number) => cleared.slice(k).reduce((a, b) => a + b, 0);
    console.log(`runs ${n} · R1 ${pct(past(1) / n)} · R2|R1 ${pct(past(2) / Math.max(1, past(1)))} · R3|R2 ${pct(past(3) / Math.max(1, past(2)))} · whole run ${pct(past(3) / n)}`);
    for (const region of [0, 1, 2]) {
      const here = fights.filter((f) => f.region === region);
      const gyms = here.filter((f) => f.kind === 'gym');
      const lost = (f: FightTrace) => f.outcome === 'defeat';
      const used = here.flatMap((f) => f.used).filter((id) => ctx.content.consumable(id).effect.kind !== 'catch');
      console.log(
        `R${region + 1}: fights ${here.length} · turns ${(here.reduce((a, f) => a + f.turns, 0) / Math.max(1, here.length)).toFixed(1)}` +
          ` · median enemy hit ${pct(median(here.flatMap((f) => f.enemyHits)))}` +
          ` · Gym fights ${gyms.length} lost ${pct(gyms.filter(lost).length / Math.max(1, gyms.length))} (${(gyms.reduce((a, f) => a + f.turns, 0) / Math.max(1, gyms.length)).toFixed(1)} turns)` +
          ` · items used per fight ${(used.length / Math.max(1, here.length)).toFixed(2)}`,
      );
    }
    console.log(`bag left at the run's end: mean ${(bagLeft.reduce((a, b) => a + b, 0) / bagLeft.length).toFixed(1)} · median ${median(bagLeft)}`);
    expect(fights.length).toBeGreaterThan(0);
  });
});
