import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  BIOMES_R3, createRun, defaultRunCtx, ELITE_R3, GYMS_R3, LANE_THEME_R3, REGIONS, regionName, runReducer, TRAINERS_R3, wildBandFor,
  type RunAction, type RunState,
} from '@/sim';

// v0.7.4 — Region 3, Volcanic Highlands: its own biomes, rosters, Elites and Gyms (§2.2, §2.6.1, §2.7, §2.8,
// §5.9.2), the Hex Maniac's veil (§2.7.1), and the placeholder retired (§2.13.3).

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

const r3Species = new Set(Object.values(BIOMES_R3).flatMap((b) => [...b!.common, ...b!.uncommon, ...b!.rare]));
const r3Counters = new Set(Object.values(LANE_THEME_R3).map((t) => t.counter));

/** Enter a hand-placed node of Region 3 and build its fight. */
function fightAt(node: RunState['map']['nodes'][string], seed = 7): RunState {
  let s = createRun('squirtle', seed, ctx, 2);
  s = { ...s, map: { ...s.map, nodes: { ...s.map.nodes, [node.id]: node } }, reachable: [node.id] };
  return apply(apply(s, { type: 'enter-node', nodeId: node.id }), { type: 'begin-combat' });
}

describe('Region 3 — its own content — §2.2, §2.6.1, §2.13.3', () => {
  it('RegionThree_DrawsItsOwnGymsBiomesAndRosters', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = createRun('squirtle', seed, ctx, 2).map;
      for (const id of map.gyms) expect(GYMS_R3.map((g) => g.id), `seed ${seed}`).toContain(id);
      for (const n of Object.values(map.nodes)) {
        if (n.kind === 'wild') for (const id of n.preview.speciesIds) expect(r3Species.has(id) || r3Counters.has(id), `${n.id} ${id}`).toBe(true);
        if (n.kind === 'trainer') expect(TRAINERS_R3.map((t) => t.id), n.id).toContain(n.preview.rosterId);
        if (n.kind === 'elite') expect(n.preview.title).toBe(ELITE_R3.name);
        if (n.kind === 'elite-wild') expect(n.preview.speciesIds).toEqual(['aerodactyl']);
      }
    }
  });

  it('RegionThree_IsNamed_AndNoRegionIsAPlaceholderAnyMore', () => {
    // §2.13 — a name promises a place, and since v0.7.4 Region 3 is one.
    expect(regionName(2)).toBe('Volcanic Highlands');
    for (const r of REGIONS) expect(r.levelOffset, r.name).toBe(0);
  });

  it('RegionThree_RampsAcrossItsOwnBand_§2.6.5', () => {
    const map = createRun('squirtle', 3, ctx, 2).map;
    for (const n of Object.values(map.nodes)) if (n.kind === 'wild') expect(n.preview.levelBand, n.id).toEqual(wildBandFor(n.layer, REGIONS[2]!.wildBand));
    // catalogs/biomes-regions.md §3 — Region 3 recruits at 22–30.
    expect(wildBandFor(0, REGIONS[2]!.wildBand)[0]).toBe(22);
    expect(wildBandFor(10, REGIONS[2]!.wildBand)[1]).toBe(30);
  });

  it('RegionThree_LanesLookLikeTheirGyms_§2.5', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const map = createRun('squirtle', seed, ctx, 2).map;
      for (const n of Object.values(map.nodes)) {
        if (n.lane === undefined || n.kind === 'gym') continue;
        const gym = GYMS_R3.find((g) => g.id === map.gyms[n.lane!])!;
        const theme = LANE_THEME_R3[gym.type]!;
        if (n.kind === 'wild') expect(n.preview.icon, `${n.id} in the ${gym.type} lane`).toBe(`wild-${theme.biome}`);
        if (n.kind === 'trainer') {
          const roster = TRAINERS_R3.find((t) => t.id === n.preview.rosterId)!;
          expect(theme.trainers, `${n.id} ${roster.id}`).toContain(roster.archetype);
        }
      }
    }
  });

  it('EveryRegionThreeGym_FieldsItsOwnType_AndCarriesAnOffTypeAnswer_§5.9.3', () => {
    for (const gym of GYMS_R3) {
      for (const m of gym.team) expect(content.species(m.species).types, `${gym.id} ${m.species}`).toContain(gym.type);
      expect(gym.team.at(-1)!.phaseCount).toBe(3);
      expect(content.badge(gym.badgeId).type, gym.id).toBe(gym.type);
      expect(content.badge(gym.badgeId).region).toBe(3);
    }
    // The two scripted kits are there for the off-type answer their learnsets lack.
    for (const [gymId, move] of [['psychic-gym-r3', 'shadow-ball'], ['fighting-gym-r3', 'thunder-punch']] as const) {
      const ace = GYMS_R3.find((g) => g.id === gymId)!.team.at(-1)!;
      expect(ace.moves, gymId).toContain(move);
      expect(content.move(move).type).not.toBe(GYMS_R3.find((g) => g.id === gymId)!.type);
    }
  });

  it('AScriptedGymKit_ReachesTheFight_§5.9.3', () => {
    // A seed whose first lane ends at Sabrina's Gym, so the scripted ace is the one fought.
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((n) => createRun('squirtle', n, ctx, 2).map.gyms[0] === 'psychic-gym-r3')!;
    expect(seed).toBeDefined();
    const s = fightAt({ id: 'g', layer: 11, col: 0, lane: 0, kind: 'gym', next: [], preview: { title: 'Sabrina', detail: '', speciesIds: [], levelBand: [34, 36] } }, seed);
    const scripted = GYMS_R3.find((g) => g.id === 'psychic-gym-r3')!.team.at(-1)!.moves!;
    // The accent may add its type's status move after the kit (§2.2); the kit itself arrives whole.
    expect(s.pendingScenario!.enemies.at(-1)!.moves!.slice(0, scripted.length)).toEqual(scripted);
  });
});

describe('The Region 3 trainers — §2.7.1', () => {
  it('AHexManiacsPokemon_AreVeiled_AndNoOtherTrainersAre', () => {
    for (const roster of TRAINERS_R3) {
      const s = fightAt({ id: 'tr', layer: 3, col: 0, kind: 'trainer', next: [], preview: { title: roster.name, rosterId: roster.id, detail: '', speciesIds: roster.team.map((m) => m.species), levelBand: [26, 27], enemies: roster.team } });
      for (const e of s.pendingScenario!.enemies) expect(!!e.veiled, roster.id).toBe(roster.archetype === 'hex-maniac');
    }
  });
});

describe('The Region 3 Elites — §2.8', () => {
  it('Giovanni_IsTheEliteTrainer_TwoPokemonBothTwoPhase_§2.8.1', () => {
    expect(ELITE_R3.team.map((m) => m.species)).toEqual(['dugtrio', 'persian']);
    for (const m of ELITE_R3.team) expect(m.phaseCount).toBe(2);
  });

  it('Aerodactyl_FightsWithItsCataloguedScript_§2.8.2', () => {
    const s = fightAt({ id: 'ew', layer: 9, col: 0, kind: 'elite-wild', next: [], preview: { title: 'Wild Aerodactyl', detail: '', speciesIds: ['aerodactyl'], levelBand: [32, 32], enemies: [{ species: 'aerodactyl', level: 32 }] } });
    const e = s.pendingScenario!.enemies[0]!;
    expect(e.tier).toBe('boss');
    expect(e.moves!.slice(0, 4)).toEqual(['agility', 'ancient-power', 'sky-drop', 'rock-slide-m']);
  });
});
