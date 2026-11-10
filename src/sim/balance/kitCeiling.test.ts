import { describe, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';
import { DEFAULT_PERKS } from '../run/run';
import { KIT } from '../meta/account';
import type { RunPerks } from '../run/types';

// §8.4.5 — the Trainer Kit's ceiling, measured: the same seeds played with nothing packed, with each perk alone, and
// with three packed (the Kit's most). The rule the Kit is held to is in §8.4.5: one perk is worth at most three points
// of first-Gym clear rate (the R1 column), a full Kit at most eight — a head start, never the reason a run is won.
// The whole-run rate is printed too, but the auto-player wins about one run in a thousand: no perk moves it.
// Off in `npm run check` (it is whole runs, minutes each arm); run it with `KIT_REPORT=1 KIT_SEEDS=100 npx vitest run
// src/sim/balance/kitCeiling.test.ts`, and `KIT_ARMS=none,head-start` for some arms only (one process an arm set,
// so the arms can be played side by side).

const ON = !!process.env.KIT_REPORT;
const SEEDS = Number(process.env.KIT_SEEDS ?? 60);
const BASE = Number(process.env.KIT_BASE ?? 31_000);

type Kit = NonNullable<RunPerks['kit']>;
const PERK: Record<string, Kit> = {
  'moms-allowance': { money: KIT.allowance },
  'first-aid-pouch': { potions: KIT.potions },
  'ball-case': { balls: KIT.balls },
  'head-start': { starterLevels: KIT.headStartLevels },
  'exp-share': { benchXpShare: KIT.benchXpShare },
  'tm-case': { tm: true },
};
/** The arms: nothing, each perk alone, and the three-perk Kits a player would pack to win. */
const ARMS: Record<string, RunPerks> = {
  none: DEFAULT_PERKS,
  ...Object.fromEntries(Object.entries(PERK).map(([id, kit]) => [id, { ...DEFAULT_PERKS, kit }])),
  'trauma-salve-cache': { ...DEFAULT_PERKS, salveCache: true },
  'full:start+aid+allowance': { ...DEFAULT_PERKS, kit: { ...PERK['head-start'], ...PERK['first-aid-pouch'], ...PERK['moms-allowance'] } },
  'full:start+share+aid': { ...DEFAULT_PERKS, kit: { ...PERK['head-start'], ...PERK['exp-share'], ...PERK['first-aid-pouch'] } },
  'full:start+share+tm': { ...DEFAULT_PERKS, kit: { ...PERK['head-start'], ...PERK['exp-share'], ...PERK['tm-case'] } },
};

const pct = (x: number) => `${(x * 100).toFixed(1)} %`;

describe.skipIf(!ON)("The Trainer Kit's ceiling — §8.4.5", () => {
  const wanted = (process.env.KIT_ARMS ?? Object.keys(ARMS).join(',')).split(',').filter((a) => a in ARMS);
  for (const arm of wanted) {
    it(`plays ${arm}`, { timeout: 120 * 60_000 }, () => {
      const cleared = [0, 0, 0, 0];
      let won = 0;
      const wins: number[] = [];
      for (const starter of STARTER_IDS) {
        for (let seed = 1; seed <= SEEDS; seed++) {
          const r = autoRun(BASE + seed, starter, ctx, DEFAULT_RUN_POLICY, 3, undefined, ARMS[arm]);
          cleared[r.regionsCleared]! += 1;
          if (r.outcome === 'victory') {
            won += 1;
            wins.push(STARTER_IDS.indexOf(starter) * 100_000 + seed);
          }
        }
      }
      const n = SEEDS * STARTER_IDS.length;
      const past = (k: number) => cleared.slice(k).reduce((a, b) => a + b, 0);
      console.log(`KIT ${arm} · runs ${n} · R1 ${pct(past(1) / n)} · R2 ${pct(past(2) / n)} · R3 ${pct(past(3) / n)} · won ${pct(won / n)} (${won}) · gyms/run ${((past(1) + past(2) + past(3)) / n).toFixed(3)} · wins [${wins.join(',')}]`);
    });
  }
});
