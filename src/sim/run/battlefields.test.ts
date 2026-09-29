import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { GameRng } from '../rng/gameRng';
import { BIOME_FIELD, fieldsFor } from './battlefields';
import { buildScenario } from './encounter';
import { gymById } from './region';
import { createRun, defaultRunCtx } from './run';

// §2.6.1 / §4.3 — the ground a node's fight is fought on: a biome's Battlefield past the fork, a Home Field at the
// Gym and the Elite, nothing in the trunk.

const ctx = defaultRunCtx(content);

describe('Battlefields across the run — §2.6.1, §4.3', () => {
  it('Trunk_IsOpenGround_TheLaneCarriesItsBiome', () => {
    let laneWithField = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = createRun('squirtle', seed, ctx);
      for (const node of Object.values(run.map.nodes)) {
        if (!['wild', 'trainer'].includes(node.kind)) continue;
        const f = fieldsFor(node, run, content);
        if (node.lane === undefined) expect(f, `${node.id} in the trunk`).toEqual({});
        else if (Object.keys(f).length) laneWithField += 1;
      }
    }
    expect(laneWithField).toBeGreaterThan(0);
  });

  it('Gym_BringsAHomeFieldOfItsType_IntoTheFight', () => {
    const run = createRun('squirtle', 4, ctx);
    const gym = Object.values(run.map.nodes).find((n) => n.kind === 'gym')!;
    const type = gymById(run.map.gyms[gym.lane!]!).type;
    expect(fieldsFor(gym, run, content).home).toBe(type);
    expect(buildScenario(gym, run, content, new GameRng(4))!.fields?.home).toBe(type);
  });

  it('Elite_BringsAHomeFieldOfItsLeadsType', () => {
    const run = createRun('squirtle', 4, ctx);
    const elite = Object.values(run.map.nodes).find((n) => n.kind === 'elite')!;
    const lead = elite.preview.enemies![0]!.species;
    expect(fieldsFor(elite, run, content).home).toBe(content.species(lead).types[0]);
  });

  it('BiomeTable_OnlyNamesLaunchFields', () => {
    for (const f of Object.values(BIOME_FIELD)) expect(Object.keys(f!).every((k) => ['weather', 'terrain', 'hazard'].includes(k))).toBe(true);
  });
});
