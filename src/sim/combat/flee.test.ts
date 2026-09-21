import { describe, expect, it } from 'vitest';
import { PIDGEY, STARTERS, dispatch, reject, scenario, start, tweak } from '../testing/harness';

// §3.1.2 — running from a fight: the parting shot lands, then the fight ends as Escaped; never from a Gym.

const ONIX_BOSS = { species: 'onix', level: 12, tier: 'boss' as const, phaseCount: 2 as const };

describe('Fleeing — §3.1.2', () => {
  it('Flee_TakesThePartingShot_ThenEndsAsEscaped', () => {
    const s0 = start(scenario({ team: STARTERS, enemies: [PIDGEY] }));
    const hpBefore = s0.player.team[s0.player.leadIndex]!.hp;
    expect(reject(s0, { type: 'flee' })).toBeNull();
    const s = dispatch(s0, { type: 'flee' });
    expect(s.outcome).toBe('escaped');
    expect(s.phase).toBe('ended');
    // Pidgey's telegraphed Gust landed on the way out.
    expect(s.player.team[s.player.leadIndex]!.hp).toBeLessThan(hpBefore);
    expect(s.events.some((e) => e.t === 'enemy-action')).toBe(true);
    expect(s.events.at(-1)).toMatchObject({ t: 'outcome', outcome: 'escaped' });
  });

  it('Flee_WhenThePartingShotWipesTheTeam_IsADefeat', () => {
    // A team of one at 1 HP does not get away from anything.
    let s = start(scenario({ team: [{ species: 'caterpie', level: 3 }], enemies: [{ ...PIDGEY, level: 12 }] }));
    s = tweak(s, (d) => {
      d.player.team[0]!.hp = 1;
    });
    s = dispatch(s, { type: 'flee' });
    expect(s.outcome).toBe('defeat');
  });

  it('Flee_IsRefusedFromAGym_AndOutsideTheActionPhase', () => {
    const gym = start(scenario({ team: STARTERS, enemies: [ONIX_BOSS], kind: 'boss' }));
    expect(reject(gym, { type: 'flee' })).toBe('no-fleeing-a-gym');
    const done = dispatch(start(scenario({ team: STARTERS, enemies: [PIDGEY] })), { type: 'flee' });
    expect(reject(done, { type: 'flee' })).not.toBeNull();
  });
});
