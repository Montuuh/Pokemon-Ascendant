import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { wildOdds } from './map';
import { BIOMES, BIOMES_R2, BIOMES_R3, REGIONS, WILD_TIERS, WILD_TIER_ODDS, type WildTier } from './region';
import { createRun, defaultRunCtx } from './run';
import type { MapNode, RunState } from './types';
import { rollWild, wildChances } from './wild';

// §2.6.2 / §2.6.3 — the Wild Areas of v0.9.7: the whole Pokédex placed by Region strength, three rarities, the
// species rolled on entry.

const ctx = defaultRunCtx(content);
const LEGENDARIES = ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew'];
const idsOf = (biomes: typeof BIOMES_R2) => new Set(Object.values(biomes).flatMap((b) => [...b!.common, ...b!.uncommon, ...b!.rare]));
const wildsOf = (run: RunState): MapNode[] => Object.values(run.map.nodes).filter((n) => n.kind === 'wild');

describe('The pools — §2.6.3', () => {
  it('EveryNonLegendary_LivesOnSomeRoute_TheLegendariesOnNone', () => {
    const routed = new Set([BIOMES, BIOMES_R2, BIOMES_R3].flatMap((b) => [...idsOf(b)]));
    const missing = content.allSpecies().filter((s) => !LEGENDARIES.includes(s.id) && !routed.has(s.id)).map((s) => s.id);
    expect(missing).toEqual([]);
    for (const id of LEGENDARIES) expect(routed.has(id), id).toBe(false);
  });

  it('EachRegion_FieldsItsStrength_NoPreEvolutionsLate_NoFinalsEarly', () => {
    // Region 1: first forms with a form still ahead — no last evolution, not even one that never evolves (v0.9.8).
    for (const id of idsOf(BIOMES)) {
      const s = content.species(id);
      expect(s.stage === 'basic' && s.evolvesTo.length > 0, `R1 ${id}`).toBe(true);
    }
    for (const id of idsOf(BIOMES_R2)) {
      const s = content.species(id);
      expect(s.stage === 'basic' && s.evolvesTo.length > 0, `R2 ${id}`).toBe(false);
    }
    for (const id of idsOf(BIOMES_R3)) expect(content.species(id).evolvesTo, `R3 ${id}`).toEqual([]);
  });

  it('TheStarters_AreRares_AtTheirRegionsForm', () => {
    const rares = (biomes: typeof BIOMES_R2) => Object.values(biomes).flatMap((b) => b!.rare);
    expect(rares(BIOMES)).toEqual(expect.arrayContaining(['bulbasaur', 'charmander', 'squirtle']));
    expect(rares(BIOMES_R2)).toEqual(expect.arrayContaining(['ivysaur', 'charmeleon', 'wartortle']));
    expect(rares(BIOMES_R3)).toEqual(expect.arrayContaining(['venusaur', 'charizard', 'blastoise']));
  });

  it('EveryBiome_IsBigAndVaried_AndNoSpeciesTwiceInOne', () => {
    for (const r of REGIONS) {
      for (const b of Object.values(r.biomes)) {
        const all = [...b!.common, ...b!.uncommon, ...b!.rare];
        expect(new Set(all).size, `${r.name} ${b!.id}`).toBe(all.length);
        expect(all.length, `${r.name} ${b!.id}`).toBeGreaterThanOrEqual(8);
        for (const t of WILD_TIERS) expect(b![t].length, `${r.name} ${b!.id} ${t}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('The roll — §2.6.2', () => {
  it('TheOdds_SumToOne_AndTheLensBuysRaresOutOfBoth', () => {
    const sum = (o: Record<WildTier, number>) => WILD_TIERS.reduce((a, t) => a + o[t], 0);
    expect(sum(WILD_TIER_ODDS)).toBeCloseTo(1);
    const lens = wildOdds(0.3);
    expect(sum(lens)).toBeCloseTo(1);
    expect(lens.common / lens.uncommon).toBeCloseTo(WILD_TIER_ODDS.common / WILD_TIER_ODDS.uncommon);
  });

  it('TheNode_ShowsItsWholePool_AndTheLanesCounter', () => {
    const run = createRun('squirtle', 3, ctx);
    for (const n of wildsOf(run)) {
      const w = n.preview.wild!;
      expect(n.preview.speciesIds).toEqual([...new Set(WILD_TIERS.flatMap((t) => w.pool[t]))]);
      expect(n.preview.speciesIds.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('TheRoll_IsStable_AndFollowsTheOdds', () => {
    const count: Record<WildTier, number> = { common: 0, uncommon: 0, rare: 0 };
    let total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const run = createRun('squirtle', seed, ctx);
      for (const n of wildsOf(run)) {
        const a = rollWild(n, run, content);
        expect(rollWild(n, run, content)).toEqual(a);
        expect(n.preview.wild!.pool[a.tier]).toContain(a.species);
        count[a.tier] += 1;
        total += 1;
      }
    }
    expect(count.common / total).toBeGreaterThan(0.52);
    expect(count.common / total).toBeLessThan(0.68);
    expect(count.rare / total).toBeGreaterThan(0.05);
    expect(count.rare / total).toBeLessThan(0.15);
  });

  it('WildChances_CountTheLure_AndPassAnEmptyTierDown', () => {
    const wild = { pool: { common: ['pidgey'], uncommon: ['oddish'], rare: ['eevee'] }, odds: { ...WILD_TIER_ODDS } };
    const one = wildChances(wild);
    expect(one.common).toBeCloseTo(0.6);
    expect(one.rare).toBeCloseTo(0.1);
    const two = wildChances(wild, 2);
    expect(two.common).toBeCloseTo(0.36);
    expect(two.uncommon).toBeCloseTo(0.81 - 0.36);
    expect(two.rare).toBeCloseTo(0.19);
    const empty = wildChances({ ...wild, pool: { ...wild.pool, rare: [] } });
    expect(empty.uncommon).toBeCloseTo(0.4);
    expect(empty.rare).toBe(0);
  });

  it('LureModule_RollsTwice_KeepsTheRarer', () => {
    let plain = 0, lured = 0, total = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const run = createRun('squirtle', seed, ctx);
      const withLure = { ...run, relics: [...run.relics, 'lure-module'] };
      for (const n of wildsOf(run)) {
        total += 1;
        if (rollWild(n, run, content).tier !== 'common') plain += 1;
        if (rollWild(n, withLure, content).tier !== 'common') lured += 1;
      }
    }
    // One roll lands off-Common 40 % of the time; the better of two, 64 %.
    expect(lured / total).toBeGreaterThan(plain / total + 0.15);
  });
});
