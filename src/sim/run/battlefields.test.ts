import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { GameRng } from '../rng/gameRng';
import { GYM_FIELD, fieldsFor, laneField } from './battlefields';
import { buildScenario } from './encounter';
import { REGIONS, gymById } from './region';
import { createRun, defaultRunCtx } from './run';

// §4.3.14 / §4.3 — the ground a node's fight is fought on: its Gym's own Battlefield on its lane and leaning track, a Home
// Field at the Gym and the Elite, nothing in the trunk or on the Y's middle track.

const ctx = defaultRunCtx(content);

describe('Battlefields across the run — §2.6.1, §4.3', () => {
  it('TrunkAndMiddleTrack_AreOpenGround_EveryLaneAndLeaningTrackCarriesItsGymsField', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const run = createRun('squirtle', seed, ctx);
      for (const node of Object.values(run.map.nodes)) {
        if (!['wild', 'trainer', 'gym'].includes(node.kind)) continue;
        const f = fieldsFor(node, run, content);
        // §2.6.1 (v0.9.108) — the Gym's ground is its lane and the leaning track that blends into it.
        const side = node.lane ?? node.lean;
        if (side === undefined) expect(f, `${node.id} in the trunk`).toEqual({});
        else {
          const ground = { ...f };
          delete ground.home;
          expect(ground, `${node.id} on side ${side}`).toEqual(laneField(run, side));
          expect(Object.keys(ground).length, `${node.id} has no field`).toBe(1);
        }
      }
    }
  });

  it('EveryGymHasAField_AndNoTwoGymsOfARegionShareOne_§4.3.14', () => {
    for (const region of REGIONS) {
      const fields = region.gyms.map((g) => JSON.stringify(GYM_FIELD[g.type]));
      for (const f of fields) expect(f).toBeDefined();
      expect(new Set(fields).size, region.name).toBe(region.gyms.length);
    }
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

  it('GymTable_NamesOneCategoryEach', () => {
    for (const f of Object.values(GYM_FIELD)) expect(Object.keys(f).length).toBe(1);
  });
});
