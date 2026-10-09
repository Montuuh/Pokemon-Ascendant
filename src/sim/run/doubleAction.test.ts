import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { GameRng } from '../rng/gameRng';
import { buildScenario } from './encounter';
import { doubleActorFor } from './doubleAction';
import { ALL_TRAINERS } from './region';
import { createRun, defaultRunCtx } from './run';
import type { MapNode, RunState } from './types';

// §5.6.1 / §5.6.3 — who acts twice, Region by Region (v0.9.12), and never more than one Pokémon in a fight.

const ctx = defaultRunCtx(content);
const nodesOf = (run: RunState, kind: MapNode['kind']) => Object.values(run.map.nodes).filter((n) => n.kind === kind);
const actors = (node: MapNode, run: RunState, seed = 1) => buildScenario(node, run, content, new GameRng(seed))!.enemies.map((e, i) => (e.acts === 2 ? i : -1)).filter((i) => i >= 0);

describe('Who acts twice — §5.6.1', () => {
  it('Region1_OnlyTheEliteWild', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const run = createRun('squirtle', seed, ctx, 0);
      for (const kind of ['wild', 'trainer', 'gym', 'elite'] as const) for (const n of nodesOf(run, kind)) expect(actors(n, run), `${kind} ${n.id}`).toEqual([]);
    }
  });

  it('Region2_TheGymLeadersAce_TheLastOfItsTeam', () => {
    const run = createRun('squirtle', 4, ctx, 1);
    const gym = nodesOf(run, 'gym')[0]!;
    const s = buildScenario(gym, run, content, new GameRng(1))!;
    expect(doubleActorFor(gym, run)).toBe('ace');
    expect(actors(gym, run)).toEqual([s.enemies.length - 1]);
  });

  it('Region2_AnAceTrainersLead_AndNoOtherTrainer', () => {
    let aces = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = createRun('squirtle', seed, ctx, 1);
      for (const n of nodesOf(run, 'trainer')) {
        const ace = ALL_TRAINERS.find((t) => t.id === n.preview.rosterId)?.archetype === 'ace-trainer';
        expect(actors(n, run), n.preview.title).toEqual(ace ? [0] : []);
        if (ace) aces++;
      }
    }
    expect(aces).toBeGreaterThan(0);
  });

  it('Region3_TheElitesLead', () => {
    const run = createRun('squirtle', 2, ctx, 2);
    for (const n of nodesOf(run, 'elite')) expect(actors(n, run)).toEqual([0]);
  });

  it('EveryFight_AtMostOnePokemonActsTwice', () => {
    for (let seed = 1; seed <= 15; seed++) {
      for (const region of [0, 1, 2]) {
        const run = createRun('squirtle', seed, ctx, region);
        for (const n of Object.values(run.map.nodes)) {
          const s = buildScenario(n, run, content, new GameRng(seed));
          if (s) expect(s.enemies.filter((e) => e.acts === 2).length, `${n.kind} ${n.id}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});
