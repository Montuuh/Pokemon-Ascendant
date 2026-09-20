import { describe, expect, it } from 'vitest';
import { autoPlay } from './autoPlayer';
import { content, ctx, startFixture } from '../testing/harness';

// Balance envelope — the auto-player is a decent human stand-in, so these bounds are sanity rails, not
// design targets (docs/design/03 §3.7 pacing lives in the playtest report). `npm run balance` prints the table.
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 12);

interface Row {
  scenario: string;
  winRate: number;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  avgFaints: number;
  avgSwaps: number;
  avgTeamHpLeft: number;
}

function simulate(id: string): Row {
  let wins = 0;
  let turns = 0;
  let minT = Infinity;
  let maxT = 0;
  let faints = 0;
  let swaps = 0;
  let hpLeft = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = autoPlay(startFixture(id, 1000 + seed), ctx, { retreatBelow: 0.3, healBelow: 0.45, tryCatch: false });
    if (r.state.outcome !== 'defeat') wins++;
    turns += r.turns;
    minT = Math.min(minT, r.turns);
    maxT = Math.max(maxT, r.turns);
    faints += r.state.player.team.filter((c) => c.hp <= 0).length;
    swaps += r.actions.filter((a) => a.type === 'swap').length;
    hpLeft += r.state.player.team.reduce((acc, c) => acc + c.hp / c.maxHp, 0) / r.state.player.team.length;
  }
  return {
    scenario: id,
    winRate: wins / SEEDS,
    avgTurns: turns / SEEDS,
    minTurns: minT,
    maxTurns: maxT,
    avgFaints: faints / SEEDS,
    avgSwaps: swaps / SEEDS,
    avgTeamHpLeft: hpLeft / SEEDS,
  };
}

describe('Balance envelope (auto-player)', () => {
  const rows: Row[] = content.allScenarios().map((s) => simulate(s.id));
  console.table(rows.map((r) => ({ ...r, winRate: r.winRate.toFixed(2), avgTurns: r.avgTurns.toFixed(1), avgFaints: r.avgFaints.toFixed(2), avgSwaps: r.avgSwaps.toFixed(2), avgTeamHpLeft: r.avgTeamHpLeft.toFixed(2) })));
  const row = (id: string) => rows.find((r) => r.scenario === id)!;

  it('wild-basic — an opener the player almost always wins in 2–6 turns', () => {
    expect(row('wild-basic').winRate).toBeGreaterThanOrEqual(0.9);
    expect(row('wild-basic').avgTurns).toBeGreaterThanOrEqual(2);
    expect(row('wild-basic').avgTurns).toBeLessThanOrEqual(6);
  });

  it('full-hand-3mon — a real fight: 3–10 turns, mostly won', () => {
    expect(row('full-hand-3mon').winRate).toBeGreaterThanOrEqual(0.7);
    expect(row('full-hand-3mon').avgTurns).toBeGreaterThanOrEqual(3);
    expect(row('full-hand-3mon').avgTurns).toBeLessThanOrEqual(10);
  });

  it('wild-boss-3phase — the climax: long, dangerous, but beatable', () => {
    const b = row('wild-boss-3phase');
    // A team that walked the route, not a best case: long, and it costs Pokémon.
    expect(b.avgTurns).toBeGreaterThanOrEqual(8);
    expect(b.avgTurns).toBeLessThanOrEqual(18);
    expect(b.avgFaints).toBeGreaterThanOrEqual(0.5);
    expect(b.avgTeamHpLeft).toBeLessThanOrEqual(0.65);
  });

  it('no fixture drags past 30 turns on average', () => {
    for (const r of rows) expect(r.avgTurns, r.scenario).toBeLessThan(30);
  });
});
