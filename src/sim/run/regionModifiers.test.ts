import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { createRun, defaultRunCtx, isOfferable, priceFor, rollRegionModifierOffer, traumaZone1Pct } from '@/sim';
import { PIDGEY, STARTERS, content as combatContent, ctx as combatCtx, dispatch, leadOf, scenario, start, teamWithKit, tweak } from '../testing/harness';
import { itemApDelta, itemFlatReduction, teamPrimaryType } from '../combat/items';

// §2.11.3 — the Region Modifier. One at a time, one Region long, never stacking.
//
// The pool is written against the same hook vocabulary as relics and Badges, so the interesting tests are
// not "does a multiplier multiply" — that is §7.3.6's ground and already covered. They are the *scoping*
// claims: one at a time, offered honestly, and the run-layer halves that do not go through combat at all.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const withModifier = (id: string | undefined) => createRun('squirtle', 7, ctx, 0, [], undefined, id);

describe('Region Modifiers — §2.11.3', () => {
  it('EveryRowIsAKnownHook_AndAPendingOneIsNeverOffered_§7.7', () => {
    const all = content.allRegionModifiers();
    expect(all.length).toBe(17);
    for (const m of all) {
      // A row is either inert with a note that names its version, or it does something.
      if (m.pending) expect(m.hook, m.id).toBe('none');
      else expect(m.hook, m.id).not.toBe('none');
      expect(m.description, m.id).not.toMatch(/§\d/);
    }
    // §7.7 — the offer never contains a row the sim cannot honour.
    const offer = rollRegionModifierOffer(1234, content);
    for (const id of offer) expect(isOfferable(content.regionModifier(id)), id).toBe(true);
  });

  it('TheOfferIsThreeDistinct_AndStableForASeed_§2.11.3', () => {
    const a = rollRegionModifierOffer(99, content);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    // Stable, because the screen re-renders and the cards must not move under the cursor.
    expect(rollRegionModifierOffer(99, content)).toEqual(a);
    // And not the same three for everyone.
    const seeds = new Set(Array.from({ length: 40 }, (_, i) => rollRegionModifierOffer(i + 1, content).join()));
    expect(seeds.size).toBeGreaterThan(8);
  });

  it('TheOfferLeansTowardWhatTheRunNeeds_§2.11.3', () => {
    // Trauma Resistance is weighted up by Trauma actually carried. Measured across seeds, because a single
    // offer proves nothing about a weighting — that is the whole reason it is a weighting.
    const hurt = createRun('squirtle', 3, ctx);
    hurt.box[0]!.traumaStacks = 5;
    const rate = (team: typeof hurt.box) =>
      Array.from({ length: 120 }, (_, i) => rollRegionModifierOffer(i + 1, content, team, 1000))
        .filter((o) => o.includes('trauma-resistance')).length / 120;
    expect(rate(hurt.box)).toBeGreaterThan(rate(createRun('squirtle', 3, ctx).box));
  });

  it('ExactlyOneIsInForce_AndNoneIsLegal_§2.11.3.2', () => {
    // The state holds a single id rather than a list, which is what makes "they never stack" a type rather
    // than a convention somebody has to remember.
    expect(withModifier(undefined).regionModifier).toBeNull();
    expect(withModifier('coin-purse').regionModifier).toBe('coin-purse');
  });

  it('BargainHunter_DiscountsTheTillAndTheGuardTogether_§2.11.3', () => {
    // The bug this is here to stop: a discount at the till but not at the "can you afford it" check, which
    // rejects a purchase the player was told they could make.
    const plain = withModifier(undefined);
    const thrifty = withModifier('bargain-hunter');
    expect(priceFor(plain, content, 150)).toBe(150);
    expect(priceFor(thrifty, content, 150)).toBe(120);
    // Rounded up, so a discount never makes anything free.
    expect(priceFor(thrifty, content, 1)).toBe(1);
  });

  it('TraumaResistance_IsWorthTheSamePointWhateverTheDifficulty_§8.2.1', () => {
    expect(traumaZone1Pct(withModifier(undefined), content)).toBe(5);
    expect(traumaZone1Pct(withModifier('trauma-resistance'), content)).toBe(4);
  });

  it('APendingModifier_ResolvesToNothingRatherThanHalfSomething_§7.7', () => {
    // Field Surveyor needs Battlefields, which are Region 3. Holding it must be indistinguishable from
    // holding none — the UI says why, and the sim does not pretend.
    const surveyed = withModifier('field-surveyor');
    expect(priceFor(surveyed, content, 150)).toBe(150);
    expect(traumaZone1Pct(surveyed, content)).toBe(5);
  });
});

describe('Region Modifiers inside a fight — §7.3.6', () => {
  it('HandOfPlenty_DrawsOneMoreCardEveryTurn', () => {
    const team = [...STARTERS];
    const base = start(scenario({ team, enemies: [PIDGEY] }));
    const rich = start(scenario({ team, enemies: [PIDGEY], regionModifier: 'hand-of-plenty' }));
    expect(rich.player.hand.length).toBe(base.player.hand.length + 1);
  });

  it('IronSkin_IsFlat_AndOnlyAgainstCleave_§2.11.3', () => {
    const state = start(scenario({ team: teamWithKit(['tackle']), enemies: [PIDGEY], regionModifier: 'iron-skin' }));
    const target = state.player.team[0]!;
    expect(itemFlatReduction(state, target, combatContent, true, true)).toBe(1);
    // An ordinary single-target hit is untouched: this is the answer to the attack that hits everybody.
    expect(itemFlatReduction(state, target, combatContent, true, false)).toBe(0);
  });

  it('TypeAffinity_PicksTheTypeTheTeamActuallyLeansOn_§2.11.3', () => {
    // Three Water Pokémon: the modifier boosts Water, and says so before it is taken.
    const water = start(scenario({
      team: [
        { species: 'squirtle', level: 12 },
        { species: 'poliwag', level: 12 },
        { species: 'psyduck', level: 12 },
      ],
      enemies: [PIDGEY],
      regionModifier: 'type-affinity',
    }));
    expect(teamPrimaryType(water)).toBe('water');
  });

  it('GlassCannon_CutsBothWays_§2.11.3', () => {
    // The second clause is the point of the modifier, and a flattened `also` is where it would go missing.
    const state = start(scenario({ team: teamWithKit(['tackle']), enemies: [PIDGEY], regionModifier: 'glass-cannon' }));
    const row = content.regionModifier('glass-cannon');
    expect(row.also?.hook).toBe('damage-taken');
    expect(row.also?.params?.multiplier).toBe(1.2);
    expect(state.player.regionModifier).toBe('glass-cannon');
  });

  it('SwapFuel_HealsTheIncomingLead_AndOnlyOnAManualSwap_§2.11.3', () => {
    const hurt = (id?: string) =>
      tweak(start(scenario({ team: [...STARTERS], enemies: [PIDGEY], ...(id ? { regionModifier: id } : {}) })), (d) => {
        for (const c of d.player.team) c.hp = Math.max(1, c.maxHp - 20);
      });
    const fuelled = dispatch(hurt('swap-fuel'), { type: 'swap', benchIndex: 1 });
    const plain = dispatch(hurt(), { type: 'swap', benchIndex: 1 });
    expect(fuelled.player.team[1]!.hp).toBe(plain.player.team[1]!.hp + 5);
  });

  it('ARunWithNoModifier_PlaysExactlyAsBefore', () => {
    // The null case for a system that reads through a shared code path: no modifier, nothing changes.
    const state = start(scenario({ team: teamWithKit(['water-gun']), enemies: [PIDGEY] }));
    expect(state.player.regionModifier).toBeNull();
    expect(itemApDelta(state, leadOf(state), combatContent.move('water-gun'), combatCtx.content)).toBe(0);
  });
});

describe("The v0.7.5 modifiers — §2.11.3", () => {
  it("NaturalistsLens_WildAreasOfferARareFarMoreOften", () => {
    const rares = (id: string | undefined) => {
      let n = 0, wilds = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const run = createRun('squirtle', seed, ctx, 0, [], undefined, id);
        for (const node of Object.values(run.map.nodes)) {
          if (node.kind !== 'wild') continue;
          wilds += 1;
          if (node.preview.speciesIds.some((s) => content.species(s).rarity === 'rare')) n += 1;
        }
      }
      return n / wilds;
    };
    const base = rares(undefined);
    const lens = rares('naturalists-lens');
    // The Rare slot rises from a tenth to three tenths; lanes also field Rare counters, so the base is not zero.
    expect(lens).toBeGreaterThan(base + 0.15);
  });

  it('MassMobilization_AStepForwardDrawsACard', () => {
    const step = (modifier?: string) => {
      let s = start(scenario({ team: [STARTERS[1]!, { species: 'charmeleon', level: 16, moves: ['fire-fang', 'ember'] }], enemies: [PIDGEY], ...(modifier ? { regionModifier: modifier } : {}) }));
      const card = [...s.player.hand, ...s.player.deck].find((c) => combatContent.move(c.moveId).modifier === 'step-forward');
      if (!card) return null;
      s = tweak(s, (d) => {
        const all = [...d.player.hand, ...d.player.deck];
        const pick = all.find((c) => c.id === card.id)!;
        d.player.deck = all.filter((c) => c.id !== card.id);
        d.player.hand = [pick];
      });
      s = dispatch(s, { type: 'play-card', cardId: card.id });
      return s.player.hand.length;
    };
    const without = step();
    const withIt = step('mass-mobilization');
    expect(without).not.toBeNull();
    expect(withIt).toBe(without! + 1);
  });
});
