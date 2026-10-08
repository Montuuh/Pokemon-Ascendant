import { describe, expect, it } from 'vitest';
import { content } from '../testing/harness';
import { kitPaths, MOVE_CAP } from '../combat/kit';
import { listPrice } from './economy';
import { itemSources } from './rewards';
import { branchPayload } from './xp';

// v0.9.9 — what the Pokédex and the Item Guide read: a form's kit on every path, one branch's payload, an item's price
// and where it turns up. Pure reads of the content; the screens only draw them.

describe('The kit on every path — §6.3.5', () => {
  it('KitPaths_ABaseForm_IsItsOwnPool_AnEvolvedOne_ARowPerChainOfBranches', () => {
    const mankey = kitPaths(content, 'mankey');
    expect(mankey).toHaveLength(1);
    expect(mankey[0]!.branches).toEqual([]);
    expect(mankey[0]!.pool).toEqual(['scratch', 'leer', 'low-kick', 'karate-chop']);
    const primeape = kitPaths(content, 'primeape');
    expect(primeape.map((p) => p.branches)).toEqual([['primeape-vanguard'], ['primeape-specialist']]);
    // The vanguard path upgrades Karate Chop and turns Low Kick into Submission: Low Kick is forgotten.
    expect(primeape[0]!.pool).toContain('submission');
    expect(primeape[0]!.pool).not.toContain('low-kick');
    expect(kitPaths(content, 'venusaur').length).toBe(content.species('bulbasaur').branches.length * content.species('ivysaur').branches.length);
  });

  it('KitPaths_EveryFormOfEveryLine_StaysUnderTheKitCap', () => {
    for (const s of content.allSpecies()) for (const p of kitPaths(content, s.id)) expect(p.pool.length, `${s.id} ${p.branches.join('>')}`).toBeLessThanOrEqual(MOVE_CAP.kit);
  });
});

describe('A branch on its own — §6.3', () => {
  it('BranchPayload_NamesWhatItForgets_Learns_AndHowTheStatsMove', () => {
    const p = branchPayload(content, 'primeape-vanguard');
    expect(p).toMatchObject({ from: 'mankey', to: 'primeape', level: content.species('mankey').evolveLevel, archetype: 'vanguard' });
    expect(p.upgrades).toContainEqual({ from: 'low-kick', to: 'submission' });
    expect(p.adds).toEqual(['thrash']);
    expect(p.statsAfter.attack).toBeGreaterThan(p.statsBefore.attack);
  });

  it('BranchPayload_AStoneBranch_NamesItsStone', () => {
    const eevee = content.species('eevee').branches.map((b) => branchPayload(content, b.id));
    expect(eevee.some((p) => p.stones.length > 0)).toBe(true);
  });
});

describe('The Item Guide — §3, §2.7.2', () => {
  it('ListPrice_TheMasterBall_IsNeverSold_ABallIsItsUnitPrice', () => {
    expect(listPrice('consumable', 'master-ball', content)).toBeNull();
    expect(listPrice('consumable', 'ultra-ball', content)).toBe(250);
    expect(listPrice('tm', content.allTms()[0]!.id, content)).toBeGreaterThan(0);
  });

  it('ItemSources_TheMasterBall_IsAnEliteOrGymPrize_InRegionsTwoAndThree', () => {
    expect(itemSources('master-ball')).toEqual({ supplies: [], prizes: [2, 3], ground: [] });
    expect(itemSources('potion').supplies).toContain(1);
  });
});
