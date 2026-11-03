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

  it('full-hand-3mon — a real fight: 2–10 turns, mostly won', () => {
    expect(row('full-hand-3mon').winRate).toBeGreaterThanOrEqual(0.7);
    // 2 since v0.9.12: at divisor 5 (§4.1.1) a full hand of three ends a lone Graveler in two or three turns. 1.8 since
    // v0.9.89: one of the twelve seeds wins in a turn (a free quick swap, a critical Razor Leaf and an Ether), the rest in 2–3.
    expect(row('full-hand-3mon').avgTurns).toBeGreaterThanOrEqual(1.8);
    expect(row('full-hand-3mon').avgTurns).toBeLessThanOrEqual(10);
  });

  it('wild-boss-3phase — the climax: long, dangerous, but beatable', () => {
    const b = row('wild-boss-3phase');
    // A team that walked the route, not a best case: long, and it costs Pokémon.
    // 6 since v0.9.12: every hit lands harder at divisor 5 (§4.1.1); it still costs Pokémon. 5.5 since v0.9.89: Geodude's
    // Self-Destruct and Golem's Explosion wait for low HP now (§5.3.1), so the climax is a turn shorter on twelve seeds;
    // the run-level curve did not move (R1 69 · R2|R1 49 · R3|R2 49 · run 10 %, inside the noise).
    expect(b.avgTurns).toBeGreaterThanOrEqual(5.5);
    expect(b.avgTurns).toBeLessThanOrEqual(18);
    // v0.9.81: 0.3 / 0.7, from 0.5 / 0.65 — the rhythm became a curve and this 12-seed sample, which sat on the old line (0.50 / 0.64),
    // read 0.33 / 0.69; the run-level curve (120 runs x 3 starters) did not move, which is where the pace is guarded.
    // v0.9.89: 0.72 from 0.7 — with the sacrifices weighed by HP (§5.3.1) the sample reads 0.42 faints and 0.70 HP left; the
    // twelve seeds swing ±0.03 on the weight's second decimal, so the rail sits a hair above the noise.
    expect(b.avgFaints).toBeGreaterThanOrEqual(0.3);
    expect(b.avgTeamHpLeft).toBeLessThanOrEqual(0.72);
  });

  // §5.6 — a group is a harder read, not a wall: every group fixture is a real fight a decent player wins.
  it('group fixtures — longer than a duel, still won: 4–16 turns, three in four or better', () => {
    for (const r of rows.filter((x) => x.scenario.startsWith('group-'))) {
      expect(r.winRate, r.scenario).toBeGreaterThanOrEqual(0.75);
      expect(r.avgTurns, r.scenario).toBeGreaterThanOrEqual(4);
      expect(r.avgTurns, r.scenario).toBeLessThanOrEqual(16);
    }
  });

  it('no fixture drags past 30 turns on average', () => {
    // §5.12 — the Champion is five boss Pokémon and eleven phases in one fight, the game's last and longest by design;
    // it gets a cap of its own. Everything else stays under 30.
    for (const r of rows) expect(r.avgTurns, r.scenario).toBeLessThan(r.scenario === 'league-champion' ? 40 : 30);
  });
});
