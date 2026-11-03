import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { PIDGEY, STARTERS, content, ctx, enemyOf, leadOf, scenario, start } from '../testing/harness';
import { breakdownFor, dealDamage } from './damageFlow';

// §6.3.9 — Friendship inside a fight: Return reads it, and at its top a Pokémon holds on at 1 HP once. §6.3.8 — the
// Macho Brace weighs its wearer down a Speed stage.

const withFriendship = (friendship: number | undefined, heldItem?: string) =>
  start(scenario({ team: [{ species: 'eevee', level: 20, moves: ['return', 'tackle'], ...(friendship !== undefined ? { friendship } : {}), ...(heldItem ? { heldItem } : {}) }, ...STARTERS.slice(1)], enemies: [PIDGEY] }));

describe('Friendship in a fight — §6.3.9', () => {
  it('Return_FullPowerAtFullFriendship_ItsShareBelow', () => {
    const at = (f: number | undefined) => {
      const s = withFriendship(f);
      return breakdownFor(leadOf(s), enemyOf(s), content.move('return'), false, ctx, s).final;
    };
    const full = at(ctx.config.friendship.max);
    expect(at(220)).toBeLessThan(full);
    expect(at(70)).toBeLessThan(at(220));
    // The share is the series' friendship / 255, inside the one floor of §4.1.1.
    expect(at(70)).toBeLessThanOrEqual(Math.ceil((full * 70) / 255) + 1);
    // A Pokémon that brings no Friendship (an enemy, a fixture's) reads the foe's value.
    expect(at(undefined)).toBe(at(ctx.config.friendship.foe));
  });

  it('FullFriendship_HoldsOnAtOneHp_OnceAFight_AfterTheItem', () => {
    let s = withFriendship(ctx.config.friendship.max);
    expect(leadOf(s).fondEndure).toBe(true);
    s = produce(s, (d) => {
      const lead = d.player.team[d.player.leadIndex]!;
      dealDamage(d, ctx as never, null, lead, lead.hp * 3, { crit: false, effectiveness: 'neutral', cause: 'move' });
    });
    expect(leadOf(s).hp).toBe(1);
    expect(leadOf(s).fondEndure).toBe(false);
    s = produce(s, (d) => {
      const lead = d.player.team[d.player.leadIndex]!;
      lead.hp = lead.maxHp;
      dealDamage(d, ctx as never, null, lead, lead.hp * 3, { crit: false, effectiveness: 'neutral', cause: 'move' });
    });
    expect(leadOf(s).hp).toBe(0);
    // Below the top there is no hold-on; and a Focus Sash goes first, keeping the Friendship's for later.
    expect(leadOf(withFriendship(254)).fondEndure).toBeUndefined();
    const sash = produce(withFriendship(ctx.config.friendship.max, 'focus-sash'), (d) => {
      const lead = d.player.team[d.player.leadIndex]!;
      dealDamage(d, ctx as never, null, lead, lead.hp * 3, { crit: false, effectiveness: 'neutral', cause: 'move' });
    });
    expect(leadOf(sash).endureAvailable).toBe(false);
    expect(leadOf(sash).fondEndure).toBe(true);
  });
});

describe('Macho Brace — §6.3.8', () => {
  it('StartsItsWearerAStageSlower', () => {
    expect(leadOf(withFriendship(70, 'macho-brace')).stages.speed).toBe(-1);
    expect(leadOf(withFriendship(70, 'leftovers')).stages.speed).toBe(0);
  });
});
