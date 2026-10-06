import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY } from './autoRun';
import { ctx } from '../testing/harness';
import { STARTER_IDS } from '../run/region';
import { applyAccountEvents, emptyAccount, type AccountState } from '../meta/account';
import { accountContextFor, runPerksFor } from '../meta/unlocks';
import { BOND_RANKS, bondRank, MAX_BOND_RANK } from '../meta/bond';

// §6.8.2 / v0.9.1 — the Bond's pace, measured as a career: one account, many runs in a row with the same starter,
// every run's account events folded in exactly as the app's store folds them. It answers "after how many runs does
// a line reach each rank", for the starter a player keeps picking and for the lines it recruits on the way.
// Off in `npm run check`; run it with `BOND_REPORT=1 CAREERS=10 CAREER_RUNS=24 npx vitest run
// src/sim/balance/bondCareer.test.ts`.

const ON = !!process.env.BOND_REPORT;
const CAREERS = Number(process.env.CAREERS ?? 6);
const RUNS = Number(process.env.CAREER_RUNS ?? 24);

describe.skipIf(!ON)('Bond career — §6.8.2', () => {
  it('prints the career', { timeout: 60 * 60_000 }, () => {
    const actx = accountContextFor(ctx.content);
    const starterReach: (number | null)[][] = [];
    const perRunWith: number[] = [];
    const finals: AccountState[] = [];
    const shinies: number[] = [];
    for (const starter of STARTER_IDS) {
      for (let c = 0; c < CAREERS; c++) {
        let account = emptyAccount();
        const reach: (number | null)[] = Array(MAX_BOND_RANK).fill(null);
        const line = ctx.content.lineBase(starter);
        let shinyCatches = 0;
        for (let i = 0; i < RUNS; i++) {
          // The account plays into the run as it would in the app: Mastery tiers, hidden abilities, the Shiny Charm.
          const r = autoRun(50_000 + c * 1000 + i, starter, ctx, DEFAULT_RUN_POLICY, 3, undefined, runPerksFor(account, ctx.content));
          const before = { ...account.bond };
          account = applyAccountEvents(account, r.metaEvents, actx).state;
          shinyCatches += r.metaEvents.filter((e) => e.t === 'recruit' && e.shiny).length;
          for (const [l, p] of Object.entries(account.bond)) if (p > (before[l] ?? 0)) perRunWith.push(p - (before[l] ?? 0));
          const rank = bondRank(account.bond[line] ?? 0);
          for (let k = 1; k <= rank; k++) if (reach[k - 1] === null) reach[k - 1] = i + 1;
        }
        starterReach.push(reach);
        finals.push(account);
        shinies.push(shinyCatches);
      }
    }
    const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]! : NaN);
    console.log(`careers ${starterReach.length} × ${RUNS} runs · ranks at ${BOND_RANKS.join(' · ')}`);
    console.log(`the starter's line reaches tier 1–${MAX_BOND_RANK} after runs: ${Array.from({ length: MAX_BOND_RANK }, (_, k) => k).map((k) => {
      const got = starterReach.map((r) => r[k]).filter((x): x is number => x !== null);
      return `${median(got)}${got.length < starterReach.length ? ` (${got.length}/${starterReach.length})` : ''}`;
    }).join(' / ')}`);
    console.log(`Bond a line earns in a run it played: median ${median(perRunWith)} · mean ${(perRunWith.reduce((a, b) => a + b, 0) / perRunWith.length).toFixed(1)}`);
    const dist = Array.from({ length: MAX_BOND_RANK + 1 }, (_, k) => k).map((k) => finals.reduce((a, acc) => a + Object.values(acc.bond).filter((p) => bondRank(p) === k).length, 0) / finals.length);
    console.log(`after ${RUNS} runs, lines at tier 0–${MAX_BOND_RANK}: ${dist.map((x) => x.toFixed(1)).join(' / ')}`);
    console.log(`shinies caught per career of ${RUNS} runs: ${(shinies.reduce((a, b) => a + b, 0) / shinies.length).toFixed(2)}`);
    expect(starterReach.length).toBeGreaterThan(0);
  });
});
