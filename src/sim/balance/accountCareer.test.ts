import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';
import { applyAccountEvents, emptyAccount, levelFor, SHELVES, type ShelfId } from '../meta/account';
import { accountContextFor, runPerksFor } from '../meta/unlocks';
import { shopTotal } from '../meta/mart';

// §8.3 / v0.9.2 — the account's pace, measured as a career: one account, many runs in a row, every run's account
// events folded in as the app's store folds them, the account's perks playing into each run. It answers the
// questions §8.3.3–§8.3.5 set: after how many runs each level and each shelf arrives, where the Tokens come from (the
// track, the medals, the ₽ a run ends with), and after how many runs the whole shop has been paid for.
// Off in `npm run check`; run it with `ACCOUNT_REPORT=1 CAREERS=4 CAREER_RUNS=60 npx vitest run
// src/sim/balance/accountCareer.test.ts`.

const ON = !!process.env.ACCOUNT_REPORT;
const CAREERS = Number(process.env.CAREERS ?? 2);
const RUNS = Number(process.env.CAREER_RUNS ?? 40);

describe.skipIf(!ON)('Account career — §8.3', () => {
  it('prints the career', { timeout: 120 * 60_000 }, () => {
    const actx = accountContextFor(ctx.content);
    const LEVELS = [2, 3, 4, 5, 6, 8, 10, 15, 20];
    const reach = new Map<number, number[]>();
    const tokensAt = new Map<number, { track: number[]; medals: number[]; money: number[] }>();
    const paidOff: number[] = [];
    const xpPerRun: number[] = [];
    const total = shopTotal(ctx.content);
    for (const starter of STARTER_IDS) {
      for (let c = 0; c < CAREERS; c++) {
        let account = emptyAccount();
        const seen = new Set<number>();
        let track = 0;
        let money = 0;
        let paid: number | null = null;
        for (let i = 0; i < RUNS; i++) {
          const r = autoRun(90_000 + c * 1000 + i, starter, ctx, DEFAULT_RUN_POLICY, 3, undefined, runPerksFor(account, ctx.content));
          const xp0 = account.xp;
          const { state, delta } = applyAccountEvents(account, r.metaEvents, actx);
          account = state;
          xpPerRun.push(account.xp - xp0);
          track += delta.rewards.reduce((a, x) => a + x.reward.tokens, 0);
          money += delta.moneyTokens.reduce((a, x) => a + x.tokens, 0);
          const lvl = levelFor(account.xp);
          for (const L of LEVELS) {
            if (lvl < L || seen.has(L)) continue;
            seen.add(L);
            reach.set(L, [...(reach.get(L) ?? []), i + 1]);
          }
          if (paid === null && account.tokensEarned >= total) paid = i + 1;
          if ((i + 1) % 10 === 0) {
            const at = tokensAt.get(i + 1) ?? { track: [], medals: [], money: [] };
            at.track.push(track);
            at.money.push(money);
            at.medals.push(account.tokensEarned - track - money);
            tokensAt.set(i + 1, at);
          }
        }
        for (const L of LEVELS) if (!seen.has(L)) reach.set(L, [...(reach.get(L) ?? []), Infinity]);
        paidOff.push(paid ?? Infinity);
      }
    }
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    const mean = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(0);
    const show = (n: number) => (n === Infinity ? `>${RUNS}` : String(n));
    console.log(`careers ${STARTER_IDS.length * CAREERS} × ${RUNS} runs · XP a run: mean ${mean(xpPerRun)}`);
    console.log(`level reached after run (median): ${LEVELS.map((L) => `L${L} ${show(med(reach.get(L)!))}`).join(' · ')}`);
    console.log(`shelves: ${(Object.keys(SHELVES) as ShelfId[]).map((s) => `${s} L${SHELVES[s].level}`).join(' · ')}`);
    console.log(`Tokens earned by run (mean · track / medals / ₽): ${[...tokensAt].map(([n, t]) => `${n}: ${mean(t.track)} / ${mean(t.medals)} / ${mean(t.money)}`).join(' · ')}`);
    console.log(`the whole shop (${total} Tokens) earned by run: median ${show(med(paidOff))}`);
    expect(paidOff.length).toBeGreaterThan(0);
  });
});
