import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  BIOMES, BIOMES_R2, createRun, defaultRunCtx, ELITE_R2, GYMS, GYMS_R2, LANE_THEME_R2, REGIONS, regionName, runReducer, TRAINERS_R2, wildBandFor,
  type CombatOutcomeReport, type RunAction, type RunState,
} from '@/sim';
import { abilityConditionalReduction } from '@/sim/combat/abilities';
import { itemAttackMultiplier } from '@/sim/combat/items';
import { leadOf, PIDGEY, scenario, start } from '@/sim/testing/harness';

// v0.7.3 — Region 2, Coastal Cliffs: its own biomes, rosters, Elites and Gyms (§2.2, §2.6.1, §2.7, §2.8, §5.9.2),
// Region 1's widened pools (§2.6.1), and the kit-level pieces the Region brought with it.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

const r2Species = new Set(Object.values(BIOMES_R2).flatMap((b) => [...b!.common, ...b!.uncommon, ...b!.rare]));
const r2Counters = new Set(Object.values(LANE_THEME_R2).map((t) => t.counter));

describe('Region 2 — its own content — §2.2, §2.6.1', () => {
  it('RegionTwo_DrawsItsOwnGymsBiomesAndRosters', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = createRun('squirtle', seed, ctx, 1).map;
      for (const id of map.gyms) expect(GYMS_R2.map((g) => g.id), `seed ${seed}`).toContain(id);
      for (const n of Object.values(map.nodes)) {
        if (n.kind === 'wild') for (const id of n.preview.speciesIds) expect(r2Species.has(id) || r2Counters.has(id), `${n.id} ${id}`).toBe(true);
        if (n.kind === 'trainer') expect(TRAINERS_R2.map((t) => t.name), n.id).toContain(n.preview.title);
        if (n.kind === 'elite') expect(n.preview.title).toBe(ELITE_R2.name);
        if (n.kind === 'elite-wild') expect(n.preview.speciesIds).toEqual(['lapras']);
      }
    }
  });

  it('RegionTwo_RampsAcrossItsOwnBand_§2.6.5', () => {
    const map = createRun('squirtle', 3, ctx, 1).map;
    for (const n of Object.values(map.nodes)) {
      if (n.kind !== 'wild') continue;
      expect(n.preview.levelBand, n.id).toEqual(wildBandFor(n.layer, REGIONS[1]!.wildBand));
    }
    expect(wildBandFor(0, REGIONS[1]!.wildBand)[0]).toBe(12);
    expect(wildBandFor(10, REGIONS[1]!.wildBand)[1]).toBe(20);
  });

  it('RegionTwo_LanesLookLikeTheirGyms_§2.5', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const map = createRun('squirtle', seed, ctx, 1).map;
      for (const n of Object.values(map.nodes)) {
        if (n.lane === undefined || n.kind === 'gym') continue;
        const gym = GYMS_R2.find((g) => g.id === map.gyms[n.lane!])!;
        const theme = LANE_THEME_R2[gym.type]!;
        if (n.kind === 'wild') expect(n.preview.icon, `${n.id} in the ${gym.type} lane`).toBe(`wild-${theme.biome}`);
        if (n.kind === 'trainer') {
          const roster = TRAINERS_R2.find((t) => t.name === n.preview.title)!;
          expect(theme.trainers, `${n.id} ${roster.id}`).toContain(roster.archetype);
        }
      }
    }
  });

  it('EveryRegionTwoGym_FieldsItsOwnType_§5.9.3', () => {
    // catalogs/gyms.md §7 rule 1 — the fork is a counter-pick only if the Gym's type reads off its whole team.
    for (const gym of GYMS_R2) {
      for (const m of gym.team) expect(content.species(m.species).types, `${gym.id} ${m.species}`).toContain(gym.type);
      expect(gym.team.at(-1)!.phaseCount).toBe(3);
    }
  });

  it('RegionThree_IsStillRegionOne_ShiftedUp_UntilItsOwnContent', () => {
    const map = createRun('squirtle', 5, ctx, 2).map;
    for (const id of map.gyms) expect(GYMS.map((g) => g.id)).toContain(id);
    expect(REGIONS[2]!.levelOffset).toBe(16);
    expect(REGIONS[1]!.levelOffset).toBe(0);
    // §2.13 — so the map does not name it yet: a name promises a place.
    expect(regionName(1)).toBe('Coastal Cliffs');
    expect(regionName(2)).toBeNull();
  });

  it('ATrainerNode_FightsTheRosterItsPreviewNamed_ById_§2.7.1', () => {
    // Both Region 2 Rocket Grunts are called "Rocket Grunt"; the preview carries the roster id so the fight
    // (its line, its sprite) is the one the map promised.
    for (const id of ['rocket-grunt-r2-a', 'rocket-grunt-r2-b']) {
      const roster = TRAINERS_R2.find((t) => t.id === id)!;
      let s = createRun('squirtle', 7, ctx, 1);
      const node = { id: 'tr', layer: 3, col: 0, kind: 'trainer' as const, next: [], preview: { title: roster.name, rosterId: roster.id, detail: '', speciesIds: roster.team.map((m) => m.species), levelBand: [18, 19] as [number, number], enemies: roster.team } };
      s = { ...s, map: { ...s.map, nodes: { ...s.map.nodes, tr: node } }, reachable: ['tr'] };
      s = apply(apply(s, { type: 'enter-node', nodeId: 'tr' }), { type: 'begin-combat' });
      expect(s.pendingScenario!.description).toBe(roster.line);
    }
    for (const n of Object.values(createRun('squirtle', 9, ctx, 1).map.nodes)) if (n.kind === 'trainer') expect(n.preview.rosterId, n.id).toBeTruthy();
  });
});

describe('The Region 2 Elites — §2.8', () => {
  it('Lapras_FightsWithItsCataloguedScript_NotItsLevelsKit_§2.8.2', () => {
    let s = createRun('squirtle', 7, ctx, 1);
    const node = { id: 'ew', layer: 9, col: 0, kind: 'elite-wild' as const, next: [], preview: { title: 'Wild Lapras', detail: '', speciesIds: ['lapras'], levelBand: [23, 23] as [number, number], enemies: [{ species: 'lapras', level: 23 }] } };
    s = { ...s, map: { ...s.map, nodes: { ...s.map.nodes, ew: node } }, reachable: ['ew'] };
    s = apply(apply(s, { type: 'enter-node', nodeId: 'ew' }), { type: 'begin-combat' });
    const e = s.pendingScenario!.enemies[0]!;
    expect(e.tier).toBe('boss');
    expect(e.moves).toEqual(['sing', 'ice-shard', 'ice-beam', 'surf']);
  });
});

describe('Region 1 widened — §2.6.1', () => {
  it('EveryPool_HasARealRare_AndTheLanesStillDraw', () => {
    for (const b of Object.values(BIOMES)) {
      expect(b!.uncommon.length, b!.id).toBeGreaterThanOrEqual(2);
      // A Rare slot that repeats a Common or an Uncommon is not a find.
      for (const id of b!.rare) expect([...b!.common, ...b!.uncommon], `${b!.id} rare ${id}`).not.toContain(id);
    }
    expect(BIOMES.meadow.uncommon).toContain('bellsprout');
    expect(BIOMES.river.uncommon).toContain('krabby');
  });
});

describe('Catching in Region 2 — §2.6.5, §6.3.1', () => {
  it('ARegionTwoBasic_CaughtPastItsThreshold_EvolvesAfterTheCatch', () => {
    let s = createRun('squirtle', 7, ctx, 1);
    const wild = s.reachable.map((id) => s.map.nodes[id]!).find((n) => n.kind === 'wild')!;
    s = apply(apply(s, { type: 'enter-node', nodeId: wild.id }), { type: 'begin-combat' });
    const report: CombatOutcomeReport = {
      outcome: 'caught',
      team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })),
      caught: { speciesId: 'tentacool', level: 14 },
      ballsLeft: s.balls - 1,
      turns: 4,
    };
    s = apply(s, { type: 'finish-combat', report });
    const recruit = s.box.find((m) => m.speciesId === 'tentacool')!;
    expect(recruit).toBeDefined();
    expect(s.pendingEvolutions.map((p) => p.uid)).toContain(recruit.uid);
    s = apply(s, { type: 'claim-reward' });
    expect(s.phase).toBe('evolution');
  });
});

describe('Region 2 kit pieces — §6.5.2, §8.5.3', () => {
  it('ThickFat_HalvesFireAndIce_AndNothingElse', () => {
    const seal = start(scenario({ team: [{ species: 'dewgong', level: 20, abilityId: 'thick-fat' }], enemies: [PIDGEY] }));
    const target = leadOf(seal);
    expect(abilityConditionalReduction(target, content.move('ember'), content)).toBe(0.5);
    expect(abilityConditionalReduction(target, content.move('ice-beam'), content)).toBe(0.5);
    expect(abilityConditionalReduction(target, content.move('thunderbolt'), content)).toBe(1);
  });

  it('LightBall_IsPikachusOnly_AndARaichuEvolvesOutOfIt_§8.5.3', () => {
    const hit = (species: string) => {
      const s = start(scenario({ team: [{ species, level: 12, heldItem: 'light-ball' }], enemies: [PIDGEY] }));
      return itemAttackMultiplier(s, leadOf(s), content.move('thunder-shock'), content);
    };
    expect(hit('pikachu')).toBeCloseTo(1.25);
    expect(hit('raichu')).toBe(1);
  });

  it('APikachuRun_StartsHoldingTheLightBall_§8.5.3', () => {
    expect(createRun('pikachu', 7, ctx).box[0]!.heldItem).toBe('light-ball');
    expect(createRun('squirtle', 7, ctx).box[0]!.heldItem).toBeNull();
  });
});
