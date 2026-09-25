import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';

// §2.11.6 — what finding the Black Market is worth. The curve (§2.2.1) is tuned on the harness that has *not* found
// it (the market is a secret; `takeMarket` is off by default), so this measures the other player: the same seeds,
// the same choices, and the market used whenever the run reaches Celadon — Rare Candies for the Lead, and the
// showcase's Legendary for the three weakest in a Box of five or more.
//
// `npm run check` plays a small block of the same seeds each way and guards only that the market is reachable and
// used; to measure, run it long: `MARKET_SEEDS=80 npx vitest run src/sim/balance/market.test.ts`.

const SEEDS = Number(process.env.MARKET_SEEDS ?? 4);

describe('The Black Market, found — §2.11.6', () => {
  it('Market_UsedAtCeladon_TakesTheLegendaryForThreePokemon_AndIsMeasured', { timeout: 120_000 + SEEDS * 6_000 }, () => {
    const tally = (market: boolean, legendaryFrom = 5) => {
      const cleared = [0, 0, 0, 0];
      let legendaries = 0;
      let reachedCeladon = 0;
      for (const starter of STARTER_IDS) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const r = autoRun(7000 + seed, starter, ctx, { ...DEFAULT_RUN_POLICY, takeMarket: market, marketLegendaryFrom: legendaryFrom }, 3);
          cleared[r.regionsCleared]! += 1;
          if (r.regionsCleared >= 2) reachedCeladon += 1;
          if (market && r.state.log.some((l) => l.includes('went to Team Rocket'))) legendaries += 1;
        }
      }
      const past2 = cleared[2]! + cleared[3]!;
      return { r3: cleared[3]! / Math.max(1, past2), full: cleared[3]! / (SEEDS * STARTER_IDS.length), legendaries, reachedCeladon };
    };
    const without = tally(false);
    const withIt = tally(true);
    // The two halves apart: the Fence's candies alone, and the showcase only from a full Box of six.
    const candies = process.env.MARKET_SPLIT ? tally(true, 99) : null;
    const fullBox = process.env.MARKET_SPLIT ? tally(true, 6) : null;
    if (candies && fullBox) console.log(`  candies only: R3|R2 ${candies.r3.toFixed(2)} · full run ${candies.full.toFixed(2)} — showcase from a Box of six: R3|R2 ${fullBox.r3.toFixed(2)} · full run ${fullBox.full.toFixed(2)} (${fullBox.legendaries} bought)`);
    console.log(
      `black market (${SEEDS * STARTER_IDS.length} runs each): R3|R2 ${without.r3.toFixed(2)} → ${withIt.r3.toFixed(2)} · ` +
        `full run ${without.full.toFixed(2)} → ${withIt.full.toFixed(2)} · Legendary bought in ${withIt.legendaries} of ${withIt.reachedCeladon} Celadon visits`,
    );
    // Reachable and used: a run that reaches Celadon with a Box of five buys the Legendary.
    if (withIt.reachedCeladon > 0) expect(withIt.legendaries).toBeGreaterThan(0);
    // Never a win button: three Pokémon is a real price, and a secret must not break the curve's top band.
    expect(withIt.r3).toBeLessThan(0.85);
  });
});
