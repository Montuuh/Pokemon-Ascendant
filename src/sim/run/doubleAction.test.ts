import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { GameRng } from '../rng/gameRng';
import { buildScenario } from './encounter';
import { doubleActorFor } from './doubleAction';
import { ALL_TRAINERS } from './region';
import { createRun, defaultRunCtx } from './run';
import type { MapNode, RunState } from './types';

// §5.6.1 / §5.6.3 — who acts twice, Region by Region (v0.9.12; v0.9.92 more often), and never more than two in a fight.

const ctx = defaultRunCtx(content);
const nodesOf = (run: RunState, kind: MapNode['kind']) => Object.values(run.map.nodes).filter((n) => n.kind === kind);
const actors = (node: MapNode, run: RunState, seed = 1) => buildScenario(node, run, content, new GameRng(seed))!.enemies.map((e, i) => (e.acts === 2 ? i : -1)).filter((i) => i >= 0);
const aceTrainer = (n: MapNode) => ALL_TRAINERS.find((t) => t.id === n.preview.rosterId)?.archetype === 'ace-trainer';

describe('Who acts twice — §5.6.1', () => {
  it('Region1_TheGymsAce_TheElitesLead_AndOnlyAnAceTrainersAce', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const run = createRun('squirtle', seed, ctx, 0);
      for (const n of nodesOf(run, 'gym')) expect(actors(n, run), n.id).toEqual([buildScenario(n, run, content, new GameRng(1))!.enemies.length - 1]);
      for (const n of nodesOf(run, 'elite')) expect(actors(n, run), n.id).toEqual([0]);
      for (const n of nodesOf(run, 'trainer')) {
        const size = buildScenario(n, run, content, new GameRng(1))!.enemies.length;
        expect(actors(n, run), n.preview.title).toEqual(aceTrainer(n) ? [size - 1] : []);
      }
    }
  });

  it('Region1_ARareWild_OnlyFromTheEighthColumn', () => {
    const run = createRun('squirtle', 3, ctx, 0);
    for (const n of nodesOf(run, 'wild')) expect(doubleActorFor(n, run), n.id).toBe(n.layer >= 8 && n.preview.wild ? 'rare' : null);
  });

  it('Region2_TheGymsFirstAndItsAce', () => {
    const run = createRun('squirtle', 4, ctx, 1);
    const gym = nodesOf(run, 'gym')[0]!;
    const s = buildScenario(gym, run, content, new GameRng(1))!;
    expect(doubleActorFor(gym, run)).toBe('lead-and-ace');
    expect(actors(gym, run)).toEqual([0, s.enemies.length - 1]);
  });

  it('Region2_EveryTrainersAce', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const run = createRun('squirtle', seed, ctx, 1);
      for (const n of nodesOf(run, 'trainer')) {
        const size = buildScenario(n, run, content, new GameRng(1))!.enemies.length;
        expect(actors(n, run), n.preview.title).toEqual([size - 1]);
      }
    }
  });

  it('Region2_TheElitesLeadAndItsAce', () => {
    const run = createRun('squirtle', 2, ctx, 1);
    for (const n of nodesOf(run, 'elite')) expect(actors(n, run)).toEqual([0, buildScenario(n, run, content, new GameRng(1))!.enemies.length - 1]);
  });

  it('EveryFight_AtMostTwoPokemonActTwice', () => {
    for (let seed = 1; seed <= 15; seed++) {
      for (const region of [0, 1, 2]) {
        const run = createRun('squirtle', seed, ctx, region);
        for (const n of Object.values(run.map.nodes)) {
          const s = buildScenario(n, run, content, new GameRng(seed));
          if (s) expect(s.enemies.filter((e) => e.acts === 2).length, `${n.kind} ${n.id}`).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});
