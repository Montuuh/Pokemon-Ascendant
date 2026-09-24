import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY, playRing } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';

// §2.9.4.1 — the Challenge Ring is meant to be lost. The canon's targets, measured with the team a run actually
// brings to each City (the harness plays the Region, heals at the Center, then climbs every rung):
//
//   Pallet Town   rung 1 about half · the whole ladder about 1 in 6
//   Celadon City  rung 1 about half · rung 2 about a quarter · the whole ladder under 1 in 10
//
// Tuned over 70 Pallet and 89 Celadon climbs (Pallet +7 levels, +3 a rung, rivals of 3: 0.64 / 0.17; Celadon
// +10, +2, rivals of 3 against Region 2's rosters since v0.7.3: 0.60 / 0.22 / 0.03). This guard runs a smaller sample, so its bands are wide: they catch
// a Ring that turned into a formality (v0.7.2's canon starting values cleared the town ladder 63 % of the time)
// or into a wall, not a few points of drift.

// 40, not 20 (v0.7.5): at 20 the Celadon ladder saw 11 rung-1 fights, and 9 of 11 against a bound of 0.8 failed on
// noise when two relics became offerable. Measure long with RING_SEEDS=80 (Celadon then: rung 1 0.68, ladder 0.02).
const SEEDS = Number(process.env.RING_SEEDS ?? 40);

function climbs(regions: 1 | 2) {
  const won: number[] = [];
  for (const starter of STARTER_IDS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const r = autoRun(20000 + seed, starter, ctx, DEFAULT_RUN_POLICY, regions);
      if (r.state.phase !== 'city' || r.state.regionIndex !== regions - 1) continue;
      const c = playRing(r.state, ctx);
      if (c) won.push(c.won);
    }
  }
  const rate = (k: number) => won.filter((w) => w >= k).length / Math.max(1, won.length);
  return { n: won.length, rate };
}

describe('The Challenge Ring is meant to be lost — §2.9.4.1', () => {
  it('Pallet_Rung1AboutHalf_TheLadderAboutOneInSix', { timeout: 120_000 }, () => {
    const { n, rate } = climbs(1);
    console.log(`pallet ring: n ${n} · rung 1 ${rate(1).toFixed(2)} · ladder ${rate(2).toFixed(2)}`);
    expect(n).toBeGreaterThan(15);
    expect(rate(1)).toBeGreaterThan(0.35);
    expect(rate(1)).toBeLessThan(0.85);
    expect(rate(2)).toBeGreaterThan(0.02);
    expect(rate(2)).toBeLessThan(0.35);
  });

  it('Celadon_Rung1AboutHalf_TheLadderUnderOneInTen', { timeout: 180_000 }, () => {
    const { n, rate } = climbs(2);
    console.log(`celadon ring: n ${n} · rung 1 ${rate(1).toFixed(2)} · rung 2 ${rate(2).toFixed(2)} · ladder ${rate(3).toFixed(2)}`);
    expect(n).toBeGreaterThan(8);
    expect(rate(1)).toBeGreaterThan(0.2);
    expect(rate(1)).toBeLessThan(0.8);
    expect(rate(3)).toBeLessThan(0.25);
  });
});
