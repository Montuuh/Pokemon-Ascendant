import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { arriveAtCity, createRun, defaultRunCtx, runReducer, type RunAction, type RunState } from '@/sim';
import { DEFAULT_RUN_POLICY, stalkSafari, type SafariVisit } from './autoRun';

// §2.11.6 — the Safari's bands, measured with the harness's stalker (a careful player who looks one turn ahead).
// The design's promise: a visit ends with one recruit or two; going for the rare lands it about a third of the
// time and is plainly the worse bet than a common; and leaving the rare for last mostly leaves it.
//
// Tune long: SAFARI_SEEDS=600 npx vitest run src/sim/balance/safari.test.ts

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const SEEDS = Number(process.env.SAFARI_SEEDS ?? 150);

type Order = 'rare-first' | 'easy-first';

const standInCity = (regionIndex: number, seed: number): RunState =>
  produce({ ...createRun('squirtle', seed, ctx, regionIndex), money: 5000 }, (d) => arriveAtCity(d, ctx));

function visit(start: RunState, order: Order): SafariVisit {
  let run = start;
  const step = (a: RunAction) => {
    const r = runReducer(run, a, ctx);
    if (r.rejected) throw new Error(`safari rejected ${a.type}: ${r.rejected}`);
    run = r.state;
  };
  step({ type: 'enter-building', building: 'safari' });
  return stalkSafari(() => run, content, { ...DEFAULT_RUN_POLICY, safariOrder: order }, step);
}

interface Bands {
  catches: number;
  rareVisits: number;
  twoPlus: number;
  rareTried: number;
  rareCaught: number;
  commonTried: number;
  commonCaught: number;
  bySpecies: Record<string, [number, number]>;
  turns: number;
  balls: number;
  ends: Record<string, number>;
}

function measure(regionIndex: number, order: Order): Bands {
  const b: Bands = { catches: 0, rareVisits: 0, twoPlus: 0, rareTried: 0, rareCaught: 0, commonTried: 0, commonCaught: 0, bySpecies: {}, turns: 0, balls: 0, ends: {} };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const start = standInCity(regionIndex, seed);
    const safari = start.city!.safari!;
    const v = visit(start, order);
    b.catches += v.caught.length;
    b.turns += safari.clock - v.clockLeft;
    b.balls += safari.balls - v.ballsLeft;
    for (const r of v.results) b.ends[r] = (b.ends[r] ?? 0) + 1;
    if (v.caught.some((c) => c.tier === 'rare')) b.rareVisits += 1;
    if (v.caught.length >= 2) b.twoPlus += 1;
    for (const spot of safari.lineup) {
      const caught = v.caught.some((c) => c.species === spot.species);
      const row = (b.bySpecies[spot.species] ??= [0, 0]);
      row[0] += 1;
      if (caught) row[1] += 1;
      if (spot.tier === 'rare') { b.rareTried += 1; if (caught) b.rareCaught += 1; }
      if (spot.tier === 'common') { b.commonTried += 1; if (caught) b.commonCaught += 1; }
    }
  }
  return b;
}

const pct = (n: number, d: number) => (d ? Math.round((100 * n) / d) : 0);

function describeBands(city: string, order: Order, b: Bands): string[] {
  return [
    `${city} ${order}: ${(b.catches / SEEDS).toFixed(2)} a visit · 2+ ${pct(b.twoPlus, SEEDS)} % · a rare ${pct(b.rareVisits, SEEDS)} % · rare ${pct(b.rareCaught, b.rareTried)} % vs common ${pct(b.commonCaught, b.commonTried)} %`,
    '   ' + Object.entries(b.bySpecies).map(([s, [t, c]]) => `${s} ${pct(c, t)}%`).join(' · '),
    `   turns used ${(b.turns / SEEDS).toFixed(1)} · balls used ${(b.balls / SEEDS).toFixed(1)} · ended by ${JSON.stringify(b.ends)}`,
  ];
}

describe('The Safari Zone, measured — §2.11.6', () => {
  it('Bands_OneOrTwoAVisit_TheRareAThird_AndTheWorseBet', { timeout: 120_000 }, () => {
    const rows: string[] = [];
    const checks: (() => void)[] = [];
    for (const [regionIndex, city] of [[0, 'Pallet'], [1, 'Celadon']] as const) {
      const rare = measure(regionIndex, 'rare-first');
      const easy = measure(regionIndex, 'easy-first');
      rows.push(...describeBands(city, 'rare-first', rare), ...describeBands(city, 'easy-first', easy));
      checks.push(() => {
        // One or two a visit, whichever way it is played.
        for (const b of [rare, easy]) {
          expect(b.catches / SEEDS, city).toBeGreaterThanOrEqual(1);
          expect(b.catches / SEEDS, city).toBeLessThanOrEqual(2.1);
        }
        // Going for the rare lands it about a third of the time, and it is the worse bet: a common stalked first
        // is caught about four times in five.
        expect(pct(rare.rareVisits, SEEDS), city).toBeGreaterThanOrEqual(25);
        expect(pct(rare.rareVisits, SEEDS), city).toBeLessThanOrEqual(50);
        expect(rare.rareCaught / rare.rareTried, city).toBeLessThan(easy.commonCaught / easy.commonTried - 0.2);
        // Leaving the rare for last mostly leaves it.
        expect(easy.rareVisits, city).toBeLessThan(rare.rareVisits);
      });
    }
    console.log(rows.join('\n'));
    for (const c of checks) c();
  });
});
