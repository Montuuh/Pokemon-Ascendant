import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, regionContent } from '@/sim';

// §2.7.3 — a hidden team leaves a hint: the types this kind of trainer usually brings (v0.8.6).

const content = buildRegistry();
const ctx = defaultRunCtx(content);

describe('The usual types — §2.7.3', () => {
  it('EveryTrainerNode_HintsOneOrTwoTypes_FromItsArchetypesRosters_NotItsOwnTeam', () => {
    for (const seed of [1, 7, 42]) {
      const run = createRun('squirtle', seed, ctx);
      const region = regionContent(run.regionIndex);
      for (const node of Object.values(run.map.nodes).filter((n) => n.kind === 'trainer')) {
        const types = node.preview.usualTypes ?? [];
        expect(types.length, node.id).toBeGreaterThanOrEqual(1);
        expect(types.length).toBeLessThanOrEqual(2);
        const roster = region.trainers.find((t) => t.id === node.preview.rosterId)!;
        const pool = region.trainers.filter((t) => t.archetype === roster.archetype).flatMap((t) => t.team.flatMap((m) => content.species(m.species).types));
        for (const t of types) expect(pool, `${node.id} ${t}`).toContain(t);
      }
    }
  });

  it('TheElite_HintsToo_AndWildNodesAndGymsDoNot', () => {
    const run = createRun('squirtle', 7, ctx);
    const nodes = Object.values(run.map.nodes);
    for (const n of nodes.filter((x) => x.kind === 'elite')) expect(n.preview.usualTypes?.length).toBeGreaterThan(0);
    for (const n of nodes.filter((x) => x.kind === 'wild' || x.kind === 'gym')) expect(n.preview.usualTypes).toBeUndefined();
  });
});
