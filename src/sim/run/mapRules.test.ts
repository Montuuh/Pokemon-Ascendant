import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { GYM_LEVEL_PREMIUM, PAD_LEVEL_GAP, TEAM_SIZE } from './region';
import {
  LANE_THEME, LAYERS, MAP_ROWS, ROUTE_LAYERS, TRACK_GAP, Y_LAYER, drawGymPair, generateRegion, gymById, gymTeamFor,
  noReturnLayer, nodesInLayer, wildBandFor,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.5 — the generation rules, each one asserted over enough seeds that a roll cannot fake it.
//
// These are *distribution* tests, which is an unusual shape and a deliberate one: a rule like "the Elite Wild
// appears about half the time" cannot be checked on one map, and checking it on one map is how a percentage
// silently becomes a guarantee or a never.

const content = buildRegistry();
const SEEDS = 200;
const maps = Array.from({ length: SEEDS }, (_, i) => generateRegion(new RngStreams(i + 1).get('MapRNG'), content, 0, i + 1));
const STOPS = new Set(['aid', 'merchant', 'mystery', 'cache']);

describe('Map generation rules — §2.5', () => {
  it('TheRouteLengthIsOneNumber_SharedByTheMapAndTheLevelBand', () => {
    // `region.ts` cannot import `map.ts` (the dependency runs the other way), so the route length is written
    // in both. This is the assertion that stops them drifting and silently flattening the level ramp.
    expect(ROUTE_LAYERS).toBe(LAYERS);
  });

  it('TheWildBandRampsAcrossTheWholeRoute_NotJustTheFirstHalf', () => {
    // v0.5's first cut used `band[0] + layer`, capped, which flattened from layer 8 on and let a team walk
    // into the Gym four levels over. Every column must be at least as high as the one before it, and the last
    // must be strictly higher than the middle.
    const bands = Array.from({ length: LAYERS }, (_, l) => wildBandFor(l));
    for (let l = 1; l < LAYERS; l++) expect(bands[l]![0], `column ${l}`).toBeGreaterThanOrEqual(bands[l - 1]![0]);
    expect(bands[LAYERS - 2]![0]).toBeGreaterThan(bands[Math.floor(LAYERS / 2)]![0]);
  });

  it('TheGymScalesWithTheRoute_§5.9.3', () => {
    // The power premium is derived from the band (GYM_LEVEL_PREMIUM), so a route change cannot leave the climax
    // behind — which is exactly what pinning the levels did on the jump to twelve. Since v0.8.5 the Leader fields
    // TEAM_SIZE.gym Pokémon: its own non-ace at the premium, the padding under it, the ace last.
    const top = wildBandFor(ROUTE_LAYERS - 2)[1];
    for (const id of ['rock-gym-r1', 'water-gym-r1', 'bug-gym-r1', 'normal-gym-r1']) {
      const gym = gymById(id);
      const team = gymTeamFor(gym);
      expect(team).toHaveLength(TEAM_SIZE.gym[0]);
      expect(team[0]!.level, `${id} slot 1`).toBe(top + GYM_LEVEL_PREMIUM.other);
      expect(team[team.length - 1]!.level, `${id} ace`).toBe(top + GYM_LEVEL_PREMIUM.ace);
      expect(team[team.length - 1]!.species).toBe(gym.team[gym.team.length - 1]!.species);
      // §5.9.3 — the ace is a three-phase Pokémon and the rest are not.
      expect(team[team.length - 1]!.phaseCount).toBe(3);
      for (const m of team.slice(gym.team.length - 1, -1)) expect(m.level).toBe(top + GYM_LEVEL_PREMIUM.other - PAD_LEVEL_GAP.gym);
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

  it('TheOpeningIsWildHeavy_AndNeverRests_§2.5', () => {
    const early = maps.flatMap((m) => [...nodesInLayer(m, 0), ...nodesInLayer(m, 1)]);
    const wild = early.filter((n) => n.kind === 'wild').length;
    expect(wild / early.length, 'a lone Lv 5 starter needs bodies before it needs XP').toBeGreaterThan(0.6);
    expect(early.some((n) => STOPS.has(n.kind))).toBe(false);
    // And every single map offers one to walk into, so the weighting can never roll a route with none.
    for (const m of maps) expect(nodesInLayer(m, 0).some((n) => n.kind === 'wild')).toBe(true);
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

    // At most one Elite Wild per Region, always, and both specials only ever in a lane.
    for (const m of maps) {
      expect(Object.values(m.nodes).filter((n) => n.kind === 'elite-wild').length).toBeLessThanOrEqual(1);
      for (const n of Object.values(m.nodes)) if (n.kind === 'elite-wild') expect(n.lane).toBeDefined();
    }
  });

  it('OneEliteTrainerIsGuaranteed_OnTheYsMiddleTrack_AndItIsNotAWall_§2.8.1', () => {
    for (const m of maps) {
      const elites = Object.values(m.nodes).filter((n) => n.kind === 'elite');
      expect(elites.length).toBeGreaterThanOrEqual(1);
      // v0.8.7: on the Y's middle track at column 9 or 10 — the price of keeping both Gyms open — with a fight on
      // each side of it, so walking past it is always legal.
      const guaranteed = elites.find((n) => n.lane === undefined)!;
      expect([9, 10]).toContain(guaranteed.layer);
      expect(guaranteed.lean, 'the middle track leans nowhere').toBeUndefined();
      const row = nodesInLayer(m, guaranteed.layer);
      expect(row.length, 'the Elite column must offer an alternative').toBe(3);
      expect(row[1]!.id).toBe(guaranteed.id);
    }
  });

  it('EachLaneLooksLikeItsOwnGym_AndSoDoesEachLeaningTrack_§2.5', () => {
    // The idea the map is built around. A lane's Wild nodes draw from its Gym's biome and its trainers from
    // its Gym's archetype, so the lane telegraphs its destination for ten columns rather than on one sign. Since
    // v0.8.7 a leaning track on the Y wears its Gym's theme too, before it commits.
    let checked = 0;
    let leaning = 0;
    for (const m of maps.slice(0, 60)) {
      for (const n of Object.values(m.nodes)) {
        const side = n.lane ?? n.lean;
        if (side === undefined || n.layer === LAYERS - 1) continue;
        const theme = LANE_THEME[gymById(m.gyms[side]!).type]!;
        if (n.kind === 'wild') {
          expect(n.preview.icon, `${n.id} wild badge`).toBe(`wild-${theme.biome}`);
          checked++;
          if (n.lean !== undefined) leaning++;
        }
        if (n.kind === 'trainer') {
          expect(theme.trainers.some((a) => n.preview.icon === `trainer-${a}`), `${n.id} ${n.preview.icon}`).toBe(true);
          checked++;
          if (n.lean !== undefined) leaning++;
        }
      }
    }
    expect(checked, 'no themed lane nodes generated').toBeGreaterThan(400);
    expect(leaning, 'no themed leaning nodes generated').toBeGreaterThan(100);
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
        const wilds = Object.values(m.nodes).filter((n) => (n.lane ?? n.lean) === lane && n.kind === 'wild');
        if (!wilds.length) continue;
        lanes++;
        if (wilds.some((n) => n.preview.speciesIds.includes(theme.counter))) lanesWithCounter++;
      }
    }
    expect(lanes).toBeGreaterThan(50);
    expect(lanesWithCounter / lanes, 'most lanes should offer their own counter').toBeGreaterThan(0.5);
  });

  it('TracksNotALattice_OneOrTwoChildren_NoCrossedEdges_§2.5', () => {
    // A node usually has one child, on its own track; the choices are the crossings, the splits, and the one
    // node before the lanes that offers both. Edges are monotone top to bottom, so none crosses another.
    let edges = 0;
    let nodes = 0;
    for (const m of maps) {
      for (let layer = 0; layer < LAYERS - 1; layer++) {
        const from = nodesInLayer(m, layer);
        const pairs = from.flatMap((n) => n.next.map((id) => [n.col, m.nodes[id]!.col] as const));
        for (const n of from) {
          nodes++;
          edges += n.next.length;
          expect(n.next.length, `seed ${m.seed} ${n.id} is a dead end`).toBeGreaterThan(0);
          expect(n.next.length, `seed ${m.seed} ${n.id} children`).toBeLessThanOrEqual(2);
          for (const id of n.next) expect(m.nodes[id]!.layer, `${n.id} → ${id}`).toBe(layer + 1);
        }
        for (const [a1, b1] of pairs) for (const [a2, b2] of pairs) if (a1 < a2) expect(b1, `seed ${m.seed} column ${layer}: crossed edges`).toBeLessThanOrEqual(b2);
        for (const t of nodesInLayer(m, layer + 1)) expect(from.filter((n) => n.next.includes(t.id)).length, `${t.id} parents`).toBeLessThanOrEqual(3);
      }
    }
    // Not a corridor (every node one child) and not a lattice (v0.5 read 1.6+): a choice every few steps.
    expect(edges / nodes, 'children per node').toBeGreaterThan(1.12);
    expect(edges / nodes, 'children per node').toBeLessThan(1.45);
    expect(nodes / SEEDS, 'nodes per map').toBeGreaterThan(55);
  });

  it('PivotingAcrossTheMapTakesTwoSteps_§2.5', () => {
    // The user's rule (2026-10-02): you can move from side to side, but not from one node to the next — the top
    // track to the bottom one takes at least two steps wherever there are three tracks or more.
    for (const m of maps) {
      for (let layer = 0; layer < LAYERS - 2; layer++) {
        const [here, there] = [nodesInLayer(m, layer), nodesInLayer(m, layer + 1)];
        if (here.length < 3 || there.length < 3 || here.some((n) => n.lane !== undefined)) continue;
        expect(here[0]!.next, `seed ${m.seed} ${here[0]!.id} jumps to the bottom`).not.toContain(there[there.length - 1]!.id);
        expect(here[here.length - 1]!.next, `seed ${m.seed} jumps to the top`).not.toContain(there[0]!.id);
      }
    }
  });

  it('NoTwoRoutesShareAShape_§2.5', () => {
    // Until v0.8.7 every layer's width was a constant, and every map had the same silhouette. The shape is seeded.
    const shapes = new Set(maps.map((m) => Array.from({ length: LAYERS }, (_, l) => nodesInLayer(m, l).map((n) => `${n.row}:${n.next.length}`).join('.')).join('|')));
    expect(shapes.size, 'distinct shapes across 200 seeds').toBeGreaterThan(190);
    const noReturn = new Set(maps.map((m) => noReturnLayer(m)));
    expect([...noReturn].sort()).toEqual([11, 12, 13]);
    const entries = new Set(maps.map((m) => m.entry.length));
    expect([...entries].sort()).toEqual([3, 4]);
  });

  it('RowsAreOrdered_WithAClearRowBetweenTracks_AndTheLanesApart', () => {
    for (const m of maps) {
      expect(m.rows).toBe(MAP_ROWS);
      for (let layer = 0; layer < LAYERS; layer++) {
        const col = nodesInLayer(m, layer);
        for (const n of col) {
          expect(n.row).toBeGreaterThanOrEqual(0);
          expect(n.row).toBeLessThan(MAP_ROWS);
        }
        for (let i = 1; i < col.length; i++) expect(col[i]!.row - col[i - 1]!.row, `seed ${m.seed} ${col[i]!.id}`).toBeGreaterThanOrEqual(TRACK_GAP);
        const lane0 = col.filter((n) => n.lane === 0).map((n) => n.row);
        const lane1 = col.filter((n) => n.lane === 1).map((n) => n.row);
        if (lane0.length && lane1.length) expect(Math.max(...lane0)).toBeLessThan(Math.min(...lane1));
      }
    }
  });

  it('TheYLeans_AndThePointOfNoReturnOffersBothLanesFromTheMiddle_§2.5', () => {
    for (const m of maps) {
      const p = noReturnLayer(m);
      expect(p).toBeGreaterThanOrEqual(11);
      expect(p).toBeLessThanOrEqual(13);
      for (let layer = Y_LAYER; layer <= p; layer++) {
        const col = nodesInLayer(m, layer);
        expect(col.map((n) => n.lean ?? -1), `seed ${m.seed} column ${layer}`).toEqual([0, -1, 1]);
        expect(col.every((n) => n.lane === undefined)).toBe(true);
      }
      for (const n of Object.values(m.nodes)) if (n.layer < Y_LAYER) expect(n.lean).toBeUndefined();
      const [top, middle, bottom] = nodesInLayer(m, p);
      expect(middle!.next.map((id) => m.nodes[id]!.lane).sort()).toEqual([0, 1]);
      // The leaning tracks enter their own lane only.
      for (const id of top!.next) expect(m.nodes[id]!.lane).toBe(0);
      for (const id of bottom!.next) expect(m.nodes[id]!.lane).toBe(1);
    }
  });

  it('SixStopColumns_SoEveryRouteWalksTheSameFights_§2.5.1', () => {
    for (const m of maps) {
      let stops = 0;
      for (let layer = 0; layer < LAYERS - 1; layer++) {
        const col = nodesInLayer(m, layer);
        if (col.every((n) => STOPS.has(n.kind))) stops++;
        // One nurse and one merchant a column at most (a lane's last column holds one per lane).
        const perLane = layer === LAYERS - 2 ? 2 : 1;
        expect(col.filter((n) => n.kind === 'aid').length, `seed ${m.seed} column ${layer}`).toBeLessThanOrEqual(perLane);
        expect(col.filter((n) => n.kind === 'merchant').length, `seed ${m.seed} column ${layer}`).toBeLessThanOrEqual(1);
        // §2.9.1 — never a nurse in the opening.
        if (layer < 4) expect(col.some((n) => n.kind === 'aid'), `seed ${m.seed} rests at ${layer}`).toBe(false);
      }
      expect(stops, `seed ${m.seed}`).toBe(6);
      // §2.9.1 — each lane's nurse in the last column before its Gym; §2.9.2 — a merchant in the trunk's stops.
      const last = nodesInLayer(m, LAYERS - 2);
      for (const lane of [0, 1]) {
        const nurse = last.filter((n) => n.lane === lane && n.kind === 'aid');
        expect(nurse, `seed ${m.seed} lane ${lane}`).toHaveLength(1);
        // Every track of the lane reaches her: no route walks into its Gym without passing the nurse.
        for (const n of nodesInLayer(m, LAYERS - 3).filter((x) => x.lane === lane)) expect(n.next, `seed ${m.seed} ${n.id}`).toContain(nurse[0]!.id);
      }
      expect(Object.values(m.nodes).some((n) => n.kind === 'merchant' && n.layer >= 2 && n.layer <= 6), `seed ${m.seed}`).toBe(true);
    }
  });

  it('AFindOnTheGroundIsNamedOnTheMap_§2.9.5', () => {
    const caches = maps.flatMap((m) => Object.values(m.nodes)).filter((n) => n.kind === 'cache');
    expect(caches.length / SEEDS).toBeGreaterThan(4);
    for (const n of caches) {
      expect(n.preview.find, n.id).toBeDefined();
      expect(n.preview.find!.items.length + n.preview.find!.money).toBeGreaterThan(0);
    }
  });

  it('EveryNodeIsReachable_AndNothingCrossesTheLanes', () => {
    for (const m of maps) {
      const reached = new Set(m.entry);
      for (let layer = 0; layer < LAYERS - 1; layer++)
        for (const n of nodesInLayer(m, layer)) if (reached.has(n.id)) n.next.forEach((x) => reached.add(x));
      for (const n of Object.values(m.nodes)) expect(reached.has(n.id), `seed ${m.seed} ${n.id}`).toBe(true);
      for (const n of Object.values(m.nodes)) {
        if (n.lane === undefined) continue;
        expect(n.layer).toBeGreaterThanOrEqual(m.forkLayer);
        for (const id of n.next) expect(m.nodes[id]!.lane, `${n.id} → ${id}`).toBe(n.lane);
      }
    }
  });

  it('TheMapIsSeedStable', () => {
    const a = generateRegion(new RngStreams(99).get('MapRNG'), content, 1, 99);
    const b = generateRegion(new RngStreams(99).get('MapRNG'), content, 1, 99);
    expect(a).toEqual(b);
  });

  it('TheGymDrawIsSeedStable', () => {
    const rngA = new RngStreams(4242).get('MapRNG');
    const rngB = new RngStreams(4242).get('MapRNG');
    expect(drawGymPair(rngA).map((g) => g.id)).toEqual(drawGymPair(rngB).map((g) => g.id));
  });
});
