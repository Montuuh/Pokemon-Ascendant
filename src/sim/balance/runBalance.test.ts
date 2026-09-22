import { describe, expect, it } from 'vitest';
import { autoRun, DEFAULT_RUN_POLICY } from './autoRun';
import { ctx } from '../testing/harness';
import { LAYERS } from '../run/map';
import { STARTER_IDS } from '../run/region';

// Whole-run pacing (§2.1, §3.7). The v0.2 exit criterion is "a tester finishes a 20-minute run", so the
// question here is not "is one fight fair" but "is the Region finishable, and does it take the right shape".
// `npm run balance` prints the table.
// 18 seeds was too few to tell a real change from noise — a two-run swing moved a starter's rate by 11 pp,
// which is wider than most of the differences worth catching. 30 costs about a second.
const SEEDS = Number(process.env.RUN_SEEDS ?? 30);

interface Row {
  starter: string;
  winRate: number;
  avgDepth: number;
  avgNodes: number;
  avgTurns: number;
  avgCatches: number;
  avgFaints: number;
  avgTopLevel: number;
  avgEvolutions: number;
}

function simulate(starter: string, policy = DEFAULT_RUN_POLICY, seeds = SEEDS): Row {
  let wins = 0, depth = 0, nodes = 0, turns = 0, catches = 0, faints = 0, top = 0, evos = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const r = autoRun(5000 + seed, starter, ctx, policy);
    if (r.outcome === 'victory') wins++;
    depth += r.depth;
    nodes += r.nodesCleared;
    turns += r.turns;
    catches += r.catches;
    faints += r.faints;
    top += r.topLevel;
    evos += r.evolutions;
  }
  return {
    starter,
    winRate: wins / seeds,
    avgDepth: depth / seeds,
    avgNodes: nodes / seeds,
    avgTurns: turns / seeds,
    avgCatches: catches / seeds,
    avgFaints: faints / seeds,
    avgTopLevel: top / seeds,
    avgEvolutions: evos / seeds,
  };
}

describe('Run pacing — §2.1, §3.7', () => {
  // Not `.map(simulate)`: Array.map passes the index as the second argument, which would land in `policy`.
  const rows = STARTER_IDS.map((starter) => simulate(starter));

  it('prints the run table', () => {
    console.table(
      rows.map((r) => ({
        starter: r.starter,
        'win %': r.winRate.toFixed(2),
        depth: r.avgDepth.toFixed(1),
        nodes: r.avgNodes.toFixed(1),
        turns: r.avgTurns.toFixed(0),
        catches: r.avgCatches.toFixed(1),
        faints: r.avgFaints.toFixed(1),
        'top lv': r.avgTopLevel.toFixed(1),
        evos: r.avgEvolutions.toFixed(1),
      })),
    );
    expect(rows).toHaveLength(3);
  });

  it('Run_ReachesTheGym_ForEveryStarter', () => {
    // The stronger invariant, and the one that catches real breakage. A starter that stops progressing —
    // the level-10 learning cliff, a kit with nothing that damages, a node that cannot be cleared — shows up
    // here long before it shows up in a win rate, and it is not muddied by the Gym's type matchup.
    for (const r of rows) expect(r.avgDepth, `${r.starter} depth of ${LAYERS}`).toBeGreaterThan(5.5);
  });

  it('Run_IsFinishable_ForEveryStarter', () => {
    // A floor against *unwinnable*, not a balance target. The floor sits at 0.20 so a real regression trips
    // it while ordinary seed noise at n=30 does not.
    //
    // v0.3, 120 seeds: Bulbasaur 64 %, Charmander 28 %, Squirtle 85 % — a 57-point spread, and the named
    // blocker on shipping the build. It was the Region 1 Gym's type matchup, which is flavour-correct
    // (Rock/Ground resists Fire and folds to Grass and Water) and still not a balance anyone would ship.
    //
    // v0.4, 60 seeds: **47 / 47 / 57** — a 10-point spread, without touching the Gym or the type chart.
    // The economy closed it. A Fire start that can buy a Hard Stone at the Mart, take a Starting Relic,
    // put a Held Item on a recruit and bank a relic from the Elite is no longer hostage to one matchup:
    // it has four places to find an answer that v0.3 did not have. v0.5's Gym fork is still the designed
    // fix for the *structural* problem, but it is no longer load-bearing for shipping this build.
    for (const r of rows) expect(r.winRate, `${r.starter} win rate`).toBeGreaterThan(0.2);
  });

  it('Run_IsNotAWalkover_NorAWall', () => {
    const overall = rows.reduce((a, r) => a + r.winRate, 0) / rows.length;
    expect(overall).toBeGreaterThan(0.35);
    expect(overall).toBeLessThan(0.85);
  });

  /**
   * A service node costs a fight on a one-node-per-layer route, so what it buys has to be worth roughly a
   * fight. "Roughly" is the honest word: at 30 seeds the standard error on a win rate near 0.5 is about 9 pp,
   * so a strict `>=` is a coin flip dressed as an assertion — v0.3's version of this test passed for two
   * versions and then failed on a change that moved nothing.
   *
   * What this asserts instead is that no service node is a *trap*: taking it costs less than the noise band.
   * A node that is merely break-even is a good node; a node you must skip to win is a design bug, and that is
   * the shape this catches.
   */
  const NOISE_BAND = 0.12;

  /**
   * A *comparison* needs more samples than a point estimate: the standard error of a difference of two win
   * rates near 0.5 is √2 times either one's, so at the table's 30 seeds it is about 13 pp — wider than the
   * band being tested, which makes the assertion a coin flip. 80 brings it to ~8 pp and the band means
   * something. This ran at 30 for exactly one commit and failed on pure noise, which is how it was found.
   */
  const AB_SEEDS = Math.max(SEEDS, 80);

  // §2.9 — the route's service nodes are the merchant and the Mysteries; the Dojo and the Shop moved into the
  // Cities (2026-09-22), where a visit costs no fight and so has no trade to measure here.
  it.each([
    ['the merchant', { takeShop: false }] as const,
    ['a Mystery', { takeMystery: false }] as const,
  ])(
    'Run_TakingAServiceNode_IsNotATrap_%s',
    // Six whole-run sweeps per case, so the 5 s default cuts it off mid-measurement and that reads as a
    // balance failure it is not. The budget scales with the sample size instead.
    { timeout: 2_000 + AB_SEEDS * 400 },
    (_label, skip) => {
      for (const starter of STARTER_IDS) {
        const taking = simulate(starter, DEFAULT_RUN_POLICY, AB_SEEDS);
        const skipping = simulate(starter, { ...DEFAULT_RUN_POLICY, ...skip }, AB_SEEDS);
        expect(taking.winRate, `${starter}: taking ${_label} costs more than the noise band`)
          .toBeGreaterThan(skipping.winRate - NOISE_BAND);
      }
    },
  );

  it('Run_ContinuesPastTheFirstGym_ThroughBothCities_§2.1.4', { timeout: 120_000 }, () => {
    // §2.1 — the seam. The whole run, three Regions and two Cities, played by the harness: every City visit
    // (Center, shop, Dojo, gate) has to be answerable, or autoRun throws on the rejected action. Regions 2
    // and 3 are placeholders at REGION_LEVEL_OFFSET until v0.7.3, so this asserts the run *continues*, not
    // how hard the later Regions are.
    let reachedRegion3 = 0;
    for (const starter of STARTER_IDS) {
      for (let seed = 1; seed <= 6; seed++) {
        const r = autoRun(7000 + seed, starter, ctx, DEFAULT_RUN_POLICY, 3);
        expect(r.regionsCleared).toBeLessThanOrEqual(3);
        if (r.regionsCleared >= 2) reachedRegion3++;
      }
    }
    expect(reachedRegion3, 'no run walked through both Cities').toBeGreaterThan(0);
  });

  it('Run_ThickensTheDeck_SomethingEvolvesEveryRun', () => {
    // §6.2.4 — a base form's learnset ends before its threshold, so a run with no evolution is a run whose
    // Pokémon stopped learning. This is the guard that caught that.
    for (const r of rows) expect(r.avgEvolutions, `${r.starter} evolutions`).toBeGreaterThan(1);
  });

  it('Run_RecruitsATeam_TheBoxDoesNotStayAtOne', () => {
    for (const r of rows) expect(r.avgCatches, `${r.starter} catches`).toBeGreaterThan(0.5);
  });

  it('Run_LandsInThePacingWindow', () => {
    // ~7 nodes at 8–14 turns each is the 20-minute run the roadmap asks for.
    const turns = rows.reduce((a, r) => a + r.avgTurns, 0) / rows.length;
    expect(turns).toBeGreaterThan(25);
    expect(turns).toBeLessThan(140);
  });
});
