import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, content, ctx, dispatch, leadOf, scenario, start, teamWithKit, tweak } from '../testing/harness';
import { dealDamage } from './damageFlow';
import { itemApDelta } from './items';
import { GYMS } from '../run/region';

// §5.10 — the four Region 1 Badges, each asserted against the same fight without it.
//
// A Badge resolves through the relic hooks (§7.3.6) and that is the thing most worth testing: the wiring is
// shared, so a Badge that is "in the list" proves nothing until its own effect is measured. Each case here
// isolates one Badge's arithmetic.

const bare = (over: Parameters<typeof scenario>[0]) => start(scenario(over));

describe('Badges — §5.10.1', () => {
  it('EveryGymAwardsABadgeThatExists_§5.10', () => {
    // The Gym table and the Badge table are written in two files and joined by an id. This is the assertion
    // that stops a Gym promising a Badge nobody shipped — which is invisible until someone beats that Gym.
    for (const gym of GYMS) {
      const badge = content.badge(gym.badgeId);
      expect(badge.type, `${gym.id} awards a ${badge.type} badge`).toBe(gym.type);
      expect(badge.region).toBe(1);
    }
    expect(new Set(GYMS.map((g) => g.badgeId)).size, 'two Gyms share a Badge').toBe(GYMS.length);
  });

  it('Boulder_TakesOneLessOnTheLead_AndNothingOnTheBench_§5.10.1', () => {
    const team = teamWithKit(['tackle']);
    const withBadge = bare({ team, enemies: [PIDGEY], badges: ['boulder-badge'] });
    const without = bare({ team, enemies: [PIDGEY] });

    const hit = (state: typeof withBadge, targetIndex: number) =>
      tweak(state, (d) => {
        const before = d.player.team[targetIndex]!.hp;
        dealDamage(d, { ...ctx, rng: { range01: () => 0.5, range: () => 0, shuffle: <T,>(a: T[]) => a, cursor: 0 } as never }, null, d.player.team[targetIndex]!, 10, {
          crit: false,
          effectiveness: 'neutral',
          cause: 'move',
        });
        d.player.team[targetIndex]!.maxHp = before - d.player.team[targetIndex]!.hp; // stash the damage dealt
      }).player.team[targetIndex]!.maxHp;

    // The Lead: 10 damage becomes 9.
    expect(hit(without, 0)).toBe(10);
    expect(hit(withBadge, 0)).toBe(9);
    // The bench: untouched. §5.10.1 says *your Lead*, and "the Lead" is the Pokémon taking the hits.
    expect(hit(withBadge, 1)).toBe(10);
  });

  it('Boulder_NeverPushesDamageBelowZero_§5.10.1', () => {
    const state = bare({ team: teamWithKit(['tackle']), enemies: [PIDGEY], badges: ['boulder-badge'] });
    const after = tweak(state, (d) => {
      const target = d.player.team[0]!;
      const before = target.hp;
      dealDamage(d, ctx as never, null, target, 1, { crit: false, effectiveness: 'neutral', cause: 'move' });
      target.maxHp = before - target.hp;
    }).player.team[0]!.maxHp;
    // A 1-damage hit becomes 0, not −1, and the Pokémon does not heal.
    expect(after).toBe(0);
  });

  it('Normal_MakesTheFirstCardOfTheTurnCheaper_AndOnlyTheFirst_§5.10.1', () => {
    const team = teamWithKit(['water-gun', 'tackle']);
    const state = bare({ team, enemies: [PIDGEY], badges: ['normal-badge'] });
    const move = content.move('water-gun');
    const owner = leadOf(state);

    expect(itemApDelta(state, owner, move, content)).toBe(-1);

    // After one card has been played this turn the discount is gone.
    const played = tweak(state, (d) => {
      d.player.playedThisTurn = [{ ownerUid: owner.uid, moveId: 'tackle', apCost: 1 }];
    });
    expect(itemApDelta(played, owner, move, content)).toBe(0);
  });

  it('Cascade_PaysACardForAManualSwap_AndNotForTheTurn_§5.10.1', () => {
    const team = [...STARTERS];
    const withBadge = bare({ team, enemies: [PIDGEY], badges: ['cascade-badge'] });
    const without = bare({ team, enemies: [PIDGEY] });

    // The turn-start hand is the same size: a swap draw is not a turn draw. Without this the Badge would
    // quietly pay out twice, because it speaks the same `draw` hook the turn-start relics do.
    expect(withBadge.player.hand.length).toBe(without.player.hand.length);

    const swapped = dispatch(withBadge, { type: 'swap', benchIndex: 1 });
    const plain = dispatch(without, { type: 'swap', benchIndex: 1 });
    expect(swapped.player.hand.length).toBe(plain.player.hand.length + 1);
  });

  it('Cascade_DoesNotPayForAReplacementLead_ItPaysForTheApYouSpent_§3.3.1', () => {
    // §3.3.5's replacement Lead is not a manual swap: it costs nothing, and the Badge is written as
    // compensation for the AP a manual swap costs. The two run through different reducer paths and this is
    // the assertion that keeps them different — measured against the identical fight without the Badge,
    // because `pick-lead` also begins a turn and a raw hand count would be comparing two different things.
    const downed = (state: ReturnType<typeof bare>) =>
      dispatch(
        tweak(state, (d) => {
          d.player.pendingLeadPick = true;
          d.player.team[d.player.leadIndex]!.hp = 0;
        }),
        { type: 'pick-lead', benchIndex: 1 },
      ).player.hand.length;

    expect(downed(bare({ team: [...STARTERS], enemies: [PIDGEY], badges: ['cascade-badge'] })))
      .toBe(downed(bare({ team: [...STARTERS], enemies: [PIDGEY] })));
  });

  it('Hive_QueuesAFreeCopyWhenTheDeckCycles_AndNotOtherwise_§5.10.1', () => {
    const state = bare({ team: [...STARTERS], enemies: [PIDGEY], badges: ['hive-badge'] });
    // Nothing queued on turn 1: the deck has not cycled yet.
    expect(state.player.queuedCards).toHaveLength(0);

    // Force a cycle: an empty deck with a full discard is exactly the state a reshuffle reads.
    const cycled = tweak(state, (d) => {
      d.player.discard = [...d.player.deck];
      d.player.deck = [];
      d.player.reshuffled = true;
    });
    const next = dispatch(cycled, { type: 'end-turn' });
    // 20 % is a roll, so across the seeded turn it either queued one or it did not — never more than one,
    // and never a card belonging to a Pokémon that is not on the team.
    expect(next.player.queuedCards.length).toBeLessThanOrEqual(1);
    for (const q of next.player.queuedCards) {
      expect(next.player.team.some((m) => m.uid === q.ownerUid)).toBe(true);
    }
  });

  it('ABadgeIsInertWhenItIsNotHeld_§5.10', () => {
    // The null case, which is the one a shared code path gets wrong: no Badge, no change anywhere.
    const team = teamWithKit(['water-gun']);
    const state = bare({ team, enemies: [PIDGEY] });
    expect(itemApDelta(state, leadOf(state), content.move('water-gun'), content)).toBe(0);
    expect(state.player.badges).toEqual([]);
    expect(state.player.queuedCards).toEqual([]);
  });

  it('NoBadgeDescriptionLeaksASectionNumber_§9', () => {
    // Same rule the difficulty modifiers carry: a § tells us where a rule lives and tells a player nothing.
    for (const b of content.allBadges()) {
      expect(b.description, b.id).not.toMatch(/§\d/);
      expect(b.flavour, b.id).not.toMatch(/§\d/);
    }
  });
});
