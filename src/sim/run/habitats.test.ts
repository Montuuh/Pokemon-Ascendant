import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { content } from '../testing/harness';
import { HABITAT_LEAN, habitatIdOf, routeHabitats } from './habitats';
import { nodesAhead } from './map';
import { createRun, defaultRunCtx } from './run';
import { wildFor } from './wild';
import type { RunState } from './types';

// §2.6.1 — the route's habitats as the map's legend reads them (v0.9.120).

const ctx = defaultRunCtx(content);
const runOf = (region: number, seed: number): RunState => createRun('squirtle', seed, ctx, region);
const wildNodes = (run: RunState) => Object.values(run.map.nodes).filter((n) => habitatIdOf(n, run.regionIndex));

describe('routeHabitats — §2.6.1', () => {
  it('EveryHabitatWildAreaAhead_IsListedOnceUnderItsStretchAndHabitat', () => {
    for (const region of [0, 1, 2]) for (const seed of [1, 7, 23]) {
      const run = runOf(region, seed);
      const ahead = nodesAhead(run.map, run.position ?? null);
      const sections = routeHabitats(run, content);
      const listed = sections.flatMap((s) => s.habitats.flatMap((h) => h.nodes));
      expect(new Set(listed).size, `R${region + 1} ${seed}`).toBe(listed.length);
      expect([...listed].sort()).toEqual(wildNodes(run).filter((n) => ahead.has(n.id)).map((n) => n.id).sort());
      // Each node stands under the habitat its own preview names, in the stretch of its own lane (or leaning track).
      for (const s of sections) for (const h of s.habitats) for (const id of h.nodes) {
        const n = run.map.nodes[id]!;
        expect(habitatIdOf(n, run.regionIndex)).toBe(h.biome);
        expect(n.lane ?? n.lean ?? null).toBe(s.lane);
      }
    }
  });

  it('AStretchesHabitat_HoldsOnePool_ForEveryOneOfItsNodes', () => {
    // The selector reads its first node's pool; this pins that the others would say the same.
    for (const region of [0, 1, 2]) for (const seed of [1, 7, 23]) {
      const run = runOf(region, seed);
      for (const s of routeHabitats(run, content)) for (const h of s.habitats) for (const id of h.nodes) {
        expect(wildFor(run.map.nodes[id]!, run, content)!.pool, `R${region + 1} ${seed} ${id}`).toEqual(h.pool);
      }
    }
  });

  it('ALaneStretch_HoldsOnlyItsOwnLanesAndLeaningTracksNodes_TheTrunkNeitherOfThem', () => {
    const run = runOf(0, 7);
    for (const s of routeHabitats(run, content)) {
      for (const id of s.habitats.flatMap((h) => h.nodes)) {
        const n = run.map.nodes[id]!;
        expect(n.lane ?? n.lean ?? null).toBe(s.lane);
      }
    }
  });

  it('Entries_NameTheirHabitat_CountTheirSpecies_AndLeanOnAtMostThreeTypes', () => {
    const run = runOf(1, 7);
    for (const s of routeHabitats(run, content)) {
      expect(s.lean.length).toBeLessThanOrEqual(HABITAT_LEAN);
      for (const h of s.habitats) {
        expect(h.name.length).toBeGreaterThan(0);
        expect(h.species).toBe(new Set([...h.pool.common, ...h.pool.uncommon, ...h.pool.rare]).size);
        expect(h.lean.length).toBeGreaterThan(0);
        expect(h.lean.length).toBeLessThanOrEqual(HABITAT_LEAN);
      }
    }
  });

  it('AfterTheFork_TheLaneLeftIsGoneFromTheList', () => {
    const run = runOf(0, 7);
    const lane0 = Object.values(run.map.nodes).find((n) => n.lane === 0 && habitatIdOf(n, 0))!;
    const first = Object.values(run.map.nodes).find((n) => n.lane === 0 && n.layer === lane0.layer - 1) ?? lane0;
    const inLane = produce(run, (d) => { d.position = first.id; d.visited = [first.id]; });
    const lanes = routeHabitats(inLane, content).map((s) => s.lane);
    expect(lanes).not.toContain(1);
    expect(lanes).toContain(0);
  });

  it('ANodeAlreadyWalked_IsNotListed', () => {
    const run = runOf(0, 7);
    const all = routeHabitats(run, content).flatMap((s) => s.habitats.flatMap((h) => h.nodes));
    const walked = produce(run, (d) => { d.visited = [all[0]!]; });
    expect(routeHabitats(walked, content).flatMap((s) => s.habitats.flatMap((h) => h.nodes))).not.toContain(all[0]);
  });
});
