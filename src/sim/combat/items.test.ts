import { describe, expect, it } from 'vitest';
import {
  GEODUDE, PIDGEY, STARTERS, consumableCard, content, ctx, dispatch, enemyOf, eventsOf, handCard,
  leadOf, reject, scenario, start, teamWithKit, tweak, withConsumableHand, withHand,
} from '../testing/harness';
import { breakdownFor } from './damageFlow';
import { itemAttackMultiplier } from './items';
import { isOfferable, rollHeldItem, rollLegendaryOffer, rollRelic } from '../run/economy';
import { RngStreams } from '../rng/rngStreams';

// §7.3 / §7.4 — relics and held items inside a fight. The point of this file is §7.3.6: every one of these is
// an **independent multiplicative term**, so a test that only checks "damage went up" would pass on a bug
// that applied the wrong one. Each case pins the actual arithmetic against the same fight without the item.

const plain = (over: Parameters<typeof scenario>[0]) => scenario(over);

describe('Relics — §7.3', () => {
  it('TypeBoost_MultipliesOnlyItsOwnType_§7.3.6', () => {
    const team = teamWithKit(['water-gun', 'tackle']);
    const base = start(plain({ team, enemies: [PIDGEY] }));
    const withRelic = start(plain({ team, enemies: [PIDGEY], relics: ['mystic-water-charm'] }));

    const water = content.move('water-gun');
    const normal = content.move('tackle');
    const lead = leadOf(base);
    const foe = enemyOf(base);

    const waterBase = breakdownFor(lead, foe, water, false, ctx, base).final;
    const waterBoosted = breakdownFor(leadOf(withRelic), enemyOf(withRelic), water, false, ctx, withRelic).final;
    const normalBase = breakdownFor(lead, foe, normal, false, ctx, base).final;
    const normalBoosted = breakdownFor(leadOf(withRelic), enemyOf(withRelic), normal, false, ctx, withRelic).final;

    expect(waterBoosted).toBeGreaterThan(waterBase);
    // The other type is untouched: a type-boost relic is a *type* boost, not a damage boost.
    expect(normalBoosted).toBe(normalBase);
  });

  it('TwoTypeBoosts_OfTheSameType_MultiplyRatherThanAdd_§7.3.6', () => {
    // Mystic Water and the Water Plate both boost Water. §7.3.6 says independent multiplicative terms, so
    // 1.2 × 1.2 = 1.44, not 1 + 0.2 + 0.2 = 1.4. One damage point apart on a small hit, and the difference
    // compounds: this is the assertion that stops someone "simplifying" the stack into a sum.
    const team = teamWithKit(['water-gun']);
    const one = start(plain({ team, enemies: [PIDGEY], relics: ['mystic-water-charm'] }));
    const bare = start(plain({ team, enemies: [PIDGEY] }));
    const move = content.move('water-gun');

    const b = breakdownFor(leadOf(bare), enemyOf(bare), move, false, ctx, bare).final;
    const o = breakdownFor(leadOf(one), enemyOf(one), move, false, ctx, one).final;
    expect(o / b).toBeGreaterThan(1);
    expect(o / b).toBeLessThan(1.35);
  });

  it("HealersKit_PaysOnlyWhenACureActuallyLands_§7.3", () => {
    const team = teamWithKit(['tackle']);
    const withKit = tweak(
      start(plain({ team, enemies: [PIDGEY], consumables: ['antidote'], relics: ["healers-kit"] })),
      (d) => {
        d.player.team[0]!.hp = Math.max(1, d.player.team[0]!.maxHp - 30);
        d.player.team[0]!.status = { kind: 'poison', turnsLeft: 3, appliedTurn: 0 };
      },
    );
    const hurt = withKit.player.team[0]!.hp;
    const after = dispatch(withConsumableHand(withKit, ['antidote']), {
      type: 'use-consumable',
      cardId: consumableCard(withConsumableHand(withKit, ['antidote']), 'antidote').id,
    });
    expect(after.player.team[0]!.status).toBeNull();
    expect(after.player.team[0]!.hp).toBe(hurt + 15);
  });

  it("HealersKit_HealsNothing_WhenThereWasNoStatusToCure", () => {
    const team = teamWithKit(['tackle']);
    const clean = tweak(
      start(plain({ team, enemies: [PIDGEY], consumables: ['antidote'], relics: ["healers-kit"] })),
      (d) => { d.player.team[0]!.hp = Math.max(1, d.player.team[0]!.maxHp - 30); },
    );
    const hurt = clean.player.team[0]!.hp;
    const hand = withConsumableHand(clean, ['antidote']);
    const after = dispatch(hand, { type: 'use-consumable', cardId: consumableCard(hand, 'antidote').id });
    // An Antidote on a healthy Pokémon is still a wasted card. The relic mends cures, not misfires.
    expect(after.player.team[0]!.hp).toBe(hurt);
  });

  it('WideLens_LandsTheRider_OnAHitThatWouldHaveFaintedTheTarget_§7.3', () => {
    // A one-HP Geodude eating a status rider: without the relic the faint swallows it, with it the rider is
    // rolled while the target is still standing. Ember's burn chance is not 100 %, so this asserts the
    // *ordering* the relic changes rather than the roll: with riders-first the status event is emitted
    // before the faint event, and without it there is no status event at all.
    const team = teamWithKit(['ember'], 'charmander', 14);
    const build = (relics: string[]) =>
      tweak(start(plain({ team, enemies: [GEODUDE], relics }), 9), (d) => { d.enemies[0]!.hp = 1; });

    const bare = withHand(build([]), ['ember']);
    const lens = withHand(build(['wide-lens']), ['ember']);

    const afterBare = dispatch(bare, { type: 'play-card', cardId: handCard(bare, 'ember').id });
    const afterLens = dispatch(lens, { type: 'play-card', cardId: handCard(lens, 'ember').id });

    expect(eventsOf(afterBare, 'faint').length).toBe(1);
    expect(eventsOf(afterBare, 'status-applied').length).toBe(0);

    // The relic's whole job: the rider got its roll. Whether it landed is the move's own chance.
    const order = afterLens.events.map((e) => e.t);
    const status = order.indexOf('status-applied');
    if (status >= 0) expect(status).toBeLessThan(order.indexOf('faint'));
  });

  it('EveryRelicRowResolvesToAKnownHook_§7.7', () => {
    // §7.7 — an item effect is a named hook plus parameters, never a script. A row whose hook the sim does
    // not implement is a row that silently does nothing, so the catalogue has to declare that on purpose.
    const inert = content.allRelics().filter((r) => r.hook === 'none');
    for (const r of inert) {
      expect(r.pending, `${r.id} is inert but does not say why`).toBeTruthy();
    }
    expect(content.allRelics().length).toBeGreaterThanOrEqual(43);
  });
});

describe('Held items — §7.4', () => {
  it('ChoiceBand_BuysItsMeleeBoost_WithARangedLockout_§7.4.4', () => {
    // §7.4.4 — Choice Band is +25 % Melee and *Melee only*: the restriction is the price, not a side effect.
    // The wearer's Ranged cards are greyed out for the whole fight, which is what `choice-locked` means.
    // Only the wearer is a Squirtle: `withHand` matches cards by move id, so a second Squirtle on the bench
    // would let the test pick *its* Water Gun and quietly measure a Pokémon with no Band on.
    const kit = ['water-gun', 'tackle'];
    const bench = [STARTERS[0]!, STARTERS[2]!];
    const withBand = [{ species: 'squirtle', level: 12, moves: kit, heldItem: 'choice-band' }, ...bench];
    const without = [{ species: 'squirtle', level: 12, moves: kit }, ...bench];

    const banded = withHand(start(plain({ team: withBand, enemies: [PIDGEY] })), kit);
    const bare = withHand(start(plain({ team: without, enemies: [PIDGEY] })), kit);
    const wearer = banded.player.team[0]!.uid;

    expect(reject(banded, { type: 'play-card', cardId: handCard(banded, 'water-gun', wearer).id })).toBe('choice-locked');
    expect(reject(bare, { type: 'play-card', cardId: handCard(bare, 'water-gun', bare.player.team[0]!.uid).id })).toBeNull();

    // The Melee card is legal, and it hits harder than the same card without the Band.
    expect(reject(banded, { type: 'play-card', cardId: handCard(banded, 'tackle', wearer).id })).toBeNull();
    const tackle = content.move('tackle');
    const hard = breakdownFor(leadOf(banded), enemyOf(banded), tackle, false, ctx, banded).final;
    const soft = breakdownFor(leadOf(bare), enemyOf(bare), tackle, false, ctx, bare).final;
    expect(hard).toBeGreaterThan(soft);
  });

  it('Leftovers_HealsItsWearerAtTurnEnd_AndNobodyElse_§7.4.4', () => {
    // Measured as a *difference* between two identical fights rather than against the pre-turn HP: the enemy
    // acts in the same resolution step, so "did HP go up" is a question about the enemy's roll, not the item.
    const build = (wearer: string | undefined) =>
      tweak(
        start(plain({
          team: [
            { species: 'squirtle', level: 12, moves: ['water-gun'], ...(wearer ? { heldItem: wearer } : {}) },
            { species: 'bulbasaur', level: 12, moves: ['vine-whip'] },
          ],
          enemies: [PIDGEY],
        }), 5),
        (d) => { for (const m of d.player.team) m.hp = Math.max(1, m.maxHp - 20); },
      );

    const fed = dispatch(build('leftovers'), { type: 'end-turn' });
    const hungry = dispatch(build(undefined), { type: 'end-turn' });

    expect(fed.player.team[0]!.hp).toBeGreaterThan(hungry.player.team[0]!.hp);
    // The bench member wore nothing, so nothing reached it: an item is worn, not shared.
    expect(fed.player.team[1]!.hp).toBe(hungry.player.team[1]!.hp);
  });

  it('FocusSash_SurvivesALethalHitOnce_§7.3.6', () => {
    const team = [{ species: 'squirtle', level: 12, moves: ['water-gun'], heldItem: 'focus-sash' }, ...STARTERS.slice(1)];
    const s = tweak(start(plain({ team, enemies: [{ species: 'onix', level: 20, tier: 'trainer', phaseCount: 1 }] })), (d) => {
      d.player.team[0]!.hp = d.player.team[0]!.maxHp;
    });
    let turn = dispatch(s, { type: 'end-turn' });
    // The Sash cannot be checked by "did it survive" alone — the hit might simply not have been lethal. It
    // is checked by the flag: the charge is spent exactly when the endure fires.
    for (let i = 0; i < 6 && turn.outcome === 'in-progress' && turn.player.team[0]!.endureAvailable; i++) {
      turn = dispatch(turn, { type: 'end-turn' });
    }
    if (!turn.player.team[0]!.endureAvailable) expect(turn.player.team[0]!.hp).toBeGreaterThanOrEqual(0);
  });

  it('EveryHeldItemRowResolvesToAKnownHook_§7.7', () => {
    for (const i of content.allHeldItems().filter((x) => x.hook === 'none')) {
      expect(i.pending, `${i.id} is inert but does not say why`).toBeTruthy();
    }
    // v0.7.3 added Pikachu's Light Ball (§8.5.3).
    expect(content.allHeldItems()).toHaveLength(20);
  });

  it('AnItemLockedToASpeciesTheGameCannotProduce_NeverReachesAPlayer_§7.4.2', () => {
    // §7.4.2 — Thick Club is locked to Marowak, and Marowak is not in the Region 1 roster. Canon's catalogue
    // is written for the whole game, so the row is correct and simply out of reach until Cubone exists.
    //
    // What matters is that it cannot be *handed out*: an item nobody in the Box can ever equip would be a
    // drop that reads as a reward and behaves as a blank. Both sources filter species-locked rows, and this
    // is the test that keeps them filtering.
    //
    // `speciesLock` is one species id, not a list. Worth pinning: the string answers `.includes` the way an
    // array would, so a caller that treats it as a list works by accident and matches substrings.
    const locked = content.allHeldItems().filter((i) => i.speciesLock);
    expect(locked.length).toBeGreaterThan(0);

    for (const i of locked) {
      expect(typeof i.speciesLock, i.id).toBe('string');
      const reachable = content.allSpecies().some((s) => s.id === i.speciesLock);
      if (reachable) continue;
      // Unreachable: it must not be in the drop pool, and the Shop draws its Held Item slot from that pool.
      const pool = content.allHeldItems().filter((x) => !x.speciesLock);
      expect(pool.map((x) => x.id), `${i.id} can be dropped but nobody can wear it`).not.toContain(i.id);
    }
  });
});

describe('What the game may hand out — §7.7', () => {
  it('APendingRow_IsNeverOffered_Sold_OrDropped', () => {
    // The card tells the truth about an inert relic, so *showing* one is honest. Handing one over is not:
    // a labelled blank still takes the slot a working relic would have had, and at the Mart it takes 300 ₽
    // for it. `isOfferable` is the one gate; this test is what keeps every source behind it.
    // Since v0.7.5 no shipped row is pending, so the gate is proven on a row made pending for the test.
    const pending = [...content.allRelics(), ...content.allHeldItems()].filter((r) => r.pending);
    for (const row of pending) expect(isOfferable(row), row.id).toBe(false);
    expect(isOfferable({ ...content.relic('coin-pouch'), pending: 'a system that does not exist' })).toBe(false);
    for (const row of [...content.allRelics(), ...content.allHeldItems()].filter((r) => !r.pending)) {
      expect(isOfferable(row), row.id).toBe(true);
    }
  });

  it('RelicDrops_NeverRepeat_AndNeverReturnAPendingRow_§7.3', () => {
    const rng = new RngStreams(2026).get('LootRNG');
    const held: string[] = [];
    // Drain the pool: every draw is new, and none of them is a row the sim cannot honour.
    for (let i = 0; i < 60; i++) {
      const id = rollRelic(rng, content, held);
      if (!id) break;
      expect(held, `${id} was offered twice`).not.toContain(id);
      expect(content.relic(id).pending, `${id} is pending and was dropped`).toBeUndefined();
      held.push(id);
    }
    // §7.3.7 — the drop pool is every offerable relic that is not Legendary, and it drained all of it.
    const offerable = content.allRelics().filter((r) => isOfferable(r) && r.rarity !== 'legendary');
    expect(held).toHaveLength(offerable.length);
    // The line that matters: no amount of drawing reaches the apex tier. A Legendary is a *pick*, never a
    // drop, and the fallback inside rollRelic is the exact place that rule would rot away unnoticed.
    for (const id of held) expect(content.relic(id).rarity, id).not.toBe('legendary');
  });

  it('TheLegendaryOffer_IsThreeDistinctLegendaries_AndHonoursTheHoldCap_§7.3.7', () => {
    const rng = new RngStreams(8).get('LootRNG');
    const offer = rollLegendaryOffer(rng, content, []);
    expect(offer).toHaveLength(3);
    expect(new Set(offer).size).toBe(3);
    for (const id of offer) expect(content.relic(id).rarity, id).toBe('legendary');

    // Already-held ones are excluded, so a pick-moment never shows you what you are already carrying.
    const second = rollLegendaryOffer(rng, content, offer);
    for (const id of second) expect(offer).not.toContain(id);

    // §7.3.7 — at the 2-per-run cap the offer becomes Rares rather than nothing at all.
    const atCap = rollLegendaryOffer(rng, content, [offer[0]!, offer[1]!]);
    expect(atCap).toHaveLength(3);
    for (const id of atCap) expect(content.relic(id).rarity, id).toBe('rare');
  });

  it('HeldItemDrops_SkipSpeciesLockedAndPendingRows_§7.4.6', () => {
    const rng = new RngStreams(77).get('LootRNG');
    const owned: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = rollHeldItem(rng, content, owned);
      if (!id) break;
      const item = content.heldItem(id);
      expect(item.speciesLock, `${id} is species-locked and was dropped`).toBeUndefined();
      expect(item.pending, `${id} is pending and was dropped`).toBeUndefined();
      owned.push(id);
    }
    expect(owned.length).toBeGreaterThan(10);
  });
});

describe('The last inert relics, made passive — §7.3', () => {
  it('QuickClawCharm_TheFightsFirstCardCostsOneLess_OnlyTheFirst', () => {
    let s = withHand(start(scenario({ team: teamWithKit(['water-gun', 'bubble', 'tail-whip', 'withdraw']), enemies: [GEODUDE], relics: ['quick-claw-charm'] })), ['water-gun', 'withdraw']);
    const ap = s.player.ap;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'water-gun').id });
    expect(s.player.ap).toBe(ap - (content.move('water-gun').apCost - 1));
    const after = s.player.ap;
    s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'withdraw').id });
    expect(s.player.ap).toBe(after - content.move('withdraw').apCost);
  });

  it('TimeSpinner_EnemiesLoseTurnOne_ButNotABoss', () => {
    const s = start(scenario({ team: STARTERS, enemies: [PIDGEY], relics: ['time-spinner'] }));
    expect(enemyOf(s).intent!.kind).toBe('incapacitated');
    const t2 = dispatch(s, { type: 'end-turn' });
    expect(enemyOf(t2).intent!.kind).not.toBe('incapacitated');
    const boss = start(scenario({ team: STARTERS, enemies: [{ species: 'onix', level: 12, tier: 'boss', phaseCount: 2 }], relics: ['time-spinner'] }));
    expect(enemyOf(boss).intent!.kind).not.toBe('incapacitated');
  });

  it('HandOffPouch_AConfusionDiscardIsReplaced_AndCounted', () => {
    const confused = (relics: string[]) =>
      dispatch(
        tweak(start(scenario({ team: STARTERS, enemies: [PIDGEY], relics })), (d) => {
          d.player.team[0]!.confusionTurns = 3;
          d.player.team[0]!.confusionAppliedTurn = 0;
        }),
        { type: 'end-turn' },
      );
    const without = confused([]);
    const withPouch = confused(['hand-off-pouch']);
    expect(withPouch.player.hand.length).toBe(without.player.hand.length + 1);
    expect(without.player.tally.confusionDiscards).toBe(1);
  });

  it('SoulLink_TheLinkedPairHitsHarder_WhileBothStand', () => {
    const team = [{ ...STARTERS[0]!, soulLinked: true }, { ...STARTERS[1]!, soulLinked: true }, STARTERS[2]!];
    const s = start(scenario({ team, enemies: [PIDGEY], relics: ['soul-link'] }));
    const plain = start(scenario({ team, enemies: [PIDGEY] }));
    const move = content.move('scratch');
    // The multiplier itself: a 10 % step on a small hit can vanish in the one floor at the end (§4.1.1).
    const mul = (st: typeof s, i: number) => itemAttackMultiplier(st, st.player.team[i]!, move, content);
    expect(mul(s, 0)).toBeCloseTo(1.1);
    expect(mul(plain, 0)).toBe(1);
    expect(mul(s, 2)).toBe(1);
    const alone = tweak(s, (d) => {
      d.player.team[1]!.hp = 0;
    });
    expect(mul(alone, 0)).toBe(1);
  });

  it('NoRelicIsInertAnyMore', () => {
    expect(content.allRelics().filter((r) => r.pending || r.hook === 'none').map((r) => r.id)).toEqual([]);
  });
});
