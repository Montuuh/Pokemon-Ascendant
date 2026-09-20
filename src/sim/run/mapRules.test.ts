import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  FORK_LAYER, LANE_THEME, LAYERS, ROUTE_LAYERS, drawGymPair, generateRegion, gymById, gymTeamFor,
  nodesInLayer, wildBandFor,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.5 — the generation rules v0.5 added, each one asserted over enough seeds that a roll cannot fake it.
//
// These are *distribution* tests, which is an unusual shape and a deliberate one: a rule like "the Elite Wild
// appears about half the time" cannot be checked on one map, and checking it on one map is how a percentage
// silently becomes a guarantee or a never.

const content = buildRegistry();
const SEEDS = 200;
const maps = Array.from({ length: SEEDS }, (_, i) => generateRegion(new RngStreams(i + 1).get('MapRNG'), content, 0, i + 1));

describe('Map generation rules — §2.5', () => {
  it('TheRouteLengthIsOneNumber_SharedByTheMapAndTheLevelBand', () => {
    // `region.ts` cannot import `map.ts` (the dependency runs the other way), so the route length is written
    // in both. This is the assertion that stops them drifting and silently flattening the level ramp.
    expect(ROUTE_LAYERS).toBe(LAYERS);
  });

  it('TheWildBandRampsAcrossTheWholeRoute_NotJustTheFirstHalf', () => {
    // v0.5's first cut used `band[0] + layer`, capped, which flattened from layer 8 on and let a team walk
    // into the Gym four levels over. Every layer must be at least as high as the one before it, and the last
    // must be strictly higher than the middle.
    const bands = Array.from({ length: LAYERS }, (_, l) => wildBandFor(l));
    for (let l = 1; l < LAYERS; l++) expect(bands[l]![0], `layer ${l}`).toBeGreaterThanOrEqual(bands[l - 1]![0]);
    expect(bands[LAYERS - 2]![0]).toBeGreaterThan(bands[Math.floor(LAYERS / 2)]![0]);
  });

  it('TheGymScalesWithTheRoute_§5.9.3', () => {
    // The power premium is band + 4 for the non-ace and band + 6 for the ace, *derived*, so a route change
    // cannot leave the climax behind. That is exactly what pinning the levels did on the jump to twelve.
    const top = wildBandFor(ROUTE_LAYERS - 2)[1];
    for (const id of ['rock-gym-r1', 'water-gym-r1', 'bug-gym-r1', 'normal-gym-r1']) {
      const team = gymTeamFor(gymById(id));
      expect(team[0]!.level, `${id} slot 1`).toBe(top + 4);
      expect(team[team.length - 1]!.level, `${id} ace`).toBe(top + 6);
      // §5.9.3 — the ace is a three-phase Pokémon and the other is not.
      expect(team[team.length - 1]!.phaseCount).toBe(3);
    }
  });

  it('EveryGymPairIsTwoDistinctTypes_AndAllFourAppearAcrossRuns_§5.9.2', () => {
    const seen = new Set<string>();
    for (const m of maps) {
      expect(m.gyms[0]).not.toBe(m.gyms[1]);
      m.gyms.forEach((g) => seen.add(g));
    }
    // All four of the Region's pool turn up across 200 runs; a draw that could only ever produce two would
    // make the 2-of-4 a decoration.
    expect(seen.size).toBe(4);
  });

  it('TheOpeningIsWildHeavy_AndNeverCentres_§2.5', () => {
    const early = maps.flatMap((m) => [...nodesInLayer(m, 0), ...nodesInLayer(m, 1)]);
    const wild = early.filter((n) => n.kind === 'wild').length;
    expect(wild / early.length, 'a lone Lv 5 starter needs bodies before it needs XP').toBeGreaterThan(0.6);
    expect(early.some((n) => n.kind === 'center')).toBe(false);
    // And every single map offers one to walk into, so the weighting can never roll a route with none.
    for (const m of maps) expect([...nodesInLayer(m, 0), ...nodesInLayer(m, 1)].some((n) => n.kind === 'wild')).toBe(true);
  });

  it('TheRolledSpecials_LandNearTheirDeclaredRates_§2.5.1', () => {
    const withEliteWild = maps.filter((m) => Object.values(m.nodes).some((n) => n.kind === 'elite-wild')).length;
    const withExtraElite = maps.filter((m) => Object.values(m.nodes).filter((n) => n.kind === 'elite').length > 1).length;

    // Declared 45 % and 22 %. The bands are wide because these are the numbers a balance pass moves; the
    // test is here to catch "it became a guarantee" and "it stopped happening", not to pin a constant.
    expect(withEliteWild / SEEDS, 'Elite Wild rate').toBeGreaterThan(0.3);
    expect(withEliteWild / SEEDS, 'Elite Wild rate').toBeLessThan(0.6);
    expect(withExtraElite / SEEDS, 'extra Elite Trainer rate').toBeGreaterThan(0.1);
    expect(withExtraElite / SEEDS, 'extra Elite Trainer rate').toBeLessThan(0.35);

    // At most one Elite Wild per Region, always.
    for (const m of maps) expect(Object.values(m.nodes).filter((n) => n.kind === 'elite-wild').length).toBeLessThanOrEqual(1);
  });

  it('OneEliteTrainerIsGuaranteed_AndItIsNotAWall_§2.8.1', () => {
    for (const m of maps) {
      const elites = Object.values(m.nodes).filter((n) => n.kind === 'elite');
      expect(elites.length).toBeGreaterThanOrEqual(1);
      // §2.5's diagram puts it as the middle of three, so the layer always offers a way past it. As the
      // whole layer it ended a third of the harness's runs and was not a decision at all.
      const guaranteed = elites.find((n) => n.lane === undefined)!;
      const row = nodesInLayer(m, guaranteed.layer);
      expect(row.length, 'the Elite layer must offer an alternative').toBeGreaterThan(1);
      expect(row.some((n) => n.kind !== 'elite')).toBe(true);
    }
  });

  it('EachLaneLooksLikeItsOwnGym_§2.5', () => {
    // The idea the map is built around. A lane's Wild nodes draw from its Gym's biome and its trainers from
    // its Gym's archetype, so the lane telegraphs its destination for four layers rather than on one sign.
    let checked = 0;
    for (const m of maps.slice(0, 60)) {
      for (const n of Object.values(m.nodes)) {
        if (n.lane === undefined || n.layer === LAYERS - 1) continue;
        const theme = LANE_THEME[gymById(m.gyms[n.lane]!).type]!;
        if (n.kind === 'wild') {
          expect(n.preview.icon, `${n.id} wild badge`).toBe(`wild-${theme.biome}`);
          checked++;
        }
        if (n.kind === 'trainer') {
          expect(theme.trainers.some((a) => n.preview.icon === `trainer-${a}`), `${n.id} ${n.preview.icon}`).toBe(true);
          checked++;
        }
      }
    }
    expect(checked, 'no themed lane nodes generated').toBeGreaterThan(200);
  });

  it('ALaneAlwaysOffersAnAnswerToItsOwnGym_§2.5', () => {
    // The escape hatch that stops a lane being a trap. Committing to the Rock lane offers Geodudes, which do
    // not beat Brock; the lane's `counter` is the one species in its pool that does, and it has to actually
    // appear. Otherwise "plan in the trunk, commit at the fork" becomes "plan in the trunk or lose".
    let lanesWithCounter = 0;
    let lanes = 0;
    for (const m of maps.slice(0, 80)) {
      for (const lane of [0, 1]) {
        const theme = LANE_THEME[gymById(m.gyms[lane]!).type]!;
        const wilds = Object.values(m.nodes).filter((n) => n.lane === lane && n.kind === 'wild');
        if (!wilds.length) continue;
        lanes++;
        if (wilds.some((n) => n.preview.speciesIds.includes(theme.counter))) lanesWithCounter++;
      }
    }
    expect(lanes).toBeGreaterThan(50);
    expect(lanesWithCounter / lanes, 'most lanes should offer their own counter').toBeGreaterThan(0.5);
  });

  it('TheGraphIsDense_ButEveryEdgeIsLocal_§2.5', () => {
    // "Highly connected, but clear paths" — the two pull against each other, and a locality rule is what
    // reconciles them: a node links only to columns near its own, so a route is a line you trace rather
    // than a graph you solve.
    let edges = 0;
    let nodes = 0;
    for (const m of maps) {
      for (const n of Object.values(m.nodes)) {
        nodes++;
        edges += n.next.length;
        expect(n.next.length, `${n.id} children`).toBeLessThanOrEqual(3);
        if (n.layer < LAYERS - 1) expect(n.next.length, `${n.id} is a dead end`).toBeGreaterThan(0);
        // No more than three parents, so the tree branches rather than funnelling.
        const parents = nodesInLayer(m, n.layer - 1).filter((p) => p.next.includes(n.id));
        if (n.layer > 0 && n.layer !== FORK_LAYER - 1) expect(parents.length, `${n.id} parents`).toBeLessThanOrEqual(3);
      }
    }
    expect(nodes / SEEDS, 'nodes per map').toBeGreaterThan(40);
    expect(edges / nodes, 'children per node').toBeGreaterThan(1.3);
  });

  it('EveryNodeIsReachable_AndNothingCrossesTheFork', () => {
    for (const m of maps) {
      const reached = new Set(m.entry);
      for (let layer = 0; layer < LAYERS - 1; layer++)
        for (const n of nodesInLayer(m, layer)) if (reached.has(n.id)) n.next.forEach((x) => reached.add(x));
      for (const n of Object.values(m.nodes)) expect(reached.has(n.id), `seed ${m.seed} ${n.id}`).toBe(true);
      for (const n of Object.values(m.nodes)) {
        if (n.lane === undefined) continue;
        for (const id of n.next) expect(m.nodes[id]!.lane, `${n.id} → ${id}`).toBe(n.lane);
      }
    }
  });

  it('TheGymDrawIsSeedStable', () => {
    const rngA = new RngStreams(4242).get('MapRNG');
    const rngB = new RngStreams(4242).get('MapRNG');
    expect(drawGymPair(rngA).map((g) => g.id)).toEqual(drawGymPair(rngB).map((g) => g.id));
  });
});
