import { describe, expect, it } from 'vitest';
import { cardPlayability } from '../combat/preview';
import type { CombatState } from '../combat/state';
import { ctx, dispatch, handCard, scenario, start, tweak, withHand } from '../testing/harness';

// v0.7.5 — the two nerfs playtesting found (2026-09-24), measured rather than asserted. Each block plays the
// abuse on purpose — the line a player who has found it would play — and reports what it buys.

const TURNS = 10;

/** Keep the player's side alive and topped up, so the measure is the enemy's turns and nothing else. */
const topUp = (s: CombatState) =>
  tweak(s, (d) => {
    for (const m of d.player.team) m.hp = m.maxHp;
  });

describe('Sleep lock — §4.2.2.4', () => {
  // A Sleep card forced into every hand, played whenever it would land. Before v0.7.5 a sleeping Pokémon could
  // be put back to sleep, so one 1-AP card a turn meant the enemy never acted again after the opening turn.
  function enemyActions(moveId: string): number {
    let s = start(scenario({ team: [{ species: 'ivysaur', level: 16, moves: ['sleep-powder', 'tackle', 'vine-whip', 'growl'] }], enemies: [{ species: 'geodude', level: 16, tier: 'trainer', phaseCount: 1 }] }));
    let acted = 0;
    for (let t = 0; t < TURNS && s.outcome === 'in-progress'; t++) {
      s = topUp(withHand(s, [moveId, 'growl']));
      const enemy = s.enemies[0]!;
      if (enemy.intent && enemy.intent.kind !== 'incapacitated') acted += 1;
      const card = handCard(s, moveId);
      // The abuse: play it every turn it can be played, whether or not the enemy is already asleep.
      if (cardPlayability(s, card.id, ctx)?.playable) s = dispatch(s, { type: 'play-card', cardId: card.id });
      s = dispatch(s, { type: 'end-turn' });
    }
    return acted;
  }

  it('SleepLock_EnemyStillActsEveryOtherTurn', () => {
    const acted = enemyActions('sleep-powder');
    console.log(`sleep lock: the enemy acted ${acted} of ${TURNS} turns`);
    // Before: 1 of 10 (the opening turn only). The application turn is telegraph (§4.2.1), and Sleep cannot land on
    // a Pokémon already asleep, so the best a Sleep card can do is every other turn.
    expect(acted).toBeGreaterThanOrEqual(Math.floor(TURNS / 2));
  });
});

describe('Drain — §4.1.6, catalogs/moves.md', () => {
  // An Ivysaur holding Leftovers, Mega Drain in every hand, against an enemy that hits back. The measure is what
  // one AP of drain gives back and what the Lead's HP does over ten turns.
  function sustain(heldItem?: string) {
    let s = start(
      scenario({
        team: [{ species: 'ivysaur', level: 16, moves: ['mega-drain', 'tackle', 'vine-whip', 'growl'], ...(heldItem ? { heldItem } : {}) }],
        enemies: [{ species: 'poliwhirl', level: 16, tier: 'trainer', phaseCount: 1, hpPercent: 100 }],
      }),
    );
    // A bottomless enemy: the fight must last the ten turns, so its HP is refilled before every card.
    let healed = 0, dealt = 0, plays = 0;
    const start0 = s.player.team[0]!.hp;
    const maxHp = s.player.team[0]!.maxHp;
    for (let t = 0; t < TURNS && s.outcome === 'in-progress'; t++) {
      s = withHand(s, ['mega-drain', 'growl']);
      s = tweak(s, (d) => {
        d.enemies[0]!.hp = d.enemies[0]!.maxHp;
        d.player.team[0]!.hp = Math.min(d.player.team[0]!.hp, Math.floor(maxHp / 2));
      });
      const before = s.player.team[0]!.hp;
      const enemyBefore = s.enemies[0]!.hp;
      s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'mega-drain').id });
      healed += s.player.team[0]!.hp - before;
      dealt += enemyBefore - s.enemies[0]!.hp;
      plays += 1;
      s = dispatch(s, { type: 'end-turn' });
    }
    return { healPerAp: healed / (plays * 2) / maxHp, healPerDamage: healed / Math.max(1, dealt), start0 };
  }

  /** Ten turns of Mega Drain with Leftovers on, from full HP: the Lead's HP change per turn, as a share of Max HP. */
  function netPerTurn(): number {
    let s = start(
      scenario({
        team: [{ species: 'ivysaur', level: 16, moves: ['mega-drain', 'tackle', 'vine-whip', 'growl'], heldItem: 'leftovers' }],
        enemies: [{ species: 'raticate', level: 16, tier: 'trainer', phaseCount: 1 }],
      }),
    );
    const maxHp = s.player.team[0]!.maxHp;
    const first = s.player.team[0]!.hp;
    let turns = 0;
    for (let t = 0; t < TURNS && s.outcome === 'in-progress' && s.player.team[0]!.hp > 0; t++) {
      s = withHand(s, ['mega-drain', 'growl']);
      s = tweak(s, (d) => {
        d.enemies[0]!.hp = d.enemies[0]!.maxHp;
      });
      s = dispatch(s, { type: 'play-card', cardId: handCard(s, 'mega-drain').id });
      s = dispatch(s, { type: 'end-turn' });
      turns += 1;
    }
    return (s.player.team[0]!.hp - first) / turns / maxHp;
  }

  it('MegaDrain_HealsAShareOfTheDamage_NotOfTheMaxHp', () => {
    const plain = sustain();
    const net = netPerTurn();
    console.log(
      `mega drain: ${(plain.healPerAp * 100).toFixed(1)} % Max HP per AP · ${(plain.healPerDamage * 100).toFixed(0)} % of the damage back` +
        ` · with Leftovers the Lead's HP moves ${(net * 100).toFixed(1)} % of Max HP a turn under fire`,
    );
    // With Leftovers against a same-level Raticate the Lead held almost level before (−1.3 % a turn); it has to
    // lose real ground now (−6 %), or the card plus the item is still a wall.
    expect(net).toBeLessThan(-0.03);
    // Before: 12.5 % of Max HP per AP whatever it hit, which out-healed a same-level trainer with Leftovers on top.
    // Now the heal is half the damage dealt, so it tracks the matchup and stays under a Potion's worth per AP.
    expect(plain.healPerAp).toBeLessThan(0.06);
    expect(plain.healPerDamage).toBeGreaterThan(0.45);
    expect(plain.healPerDamage).toBeLessThan(0.55);
  });
});
