import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import { arriveAtCity, createRun, defaultRunCtx, offerPool, runReducer, startingRelicFits, type RunAction, type RunState } from '@/sim';
import { carriedRelics } from './encounter';
import { STARTERS, dispatch, scenario, start as startFight } from '../testing/harness';

// v0.9.97 — the relic balance pass: the run-layer rules it added (§7.3.1 Gem curation, §8.6.3 Starting Relic fit,
// §7.3 Phoenix Feather once per Region) and Healer's Kit's swap cure (§7.3).

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

describe('Type Gems only for a type the Box can use — §7.3.1', () => {
  it('OfferPool_KeepsTheGemOfTheTeamsType_AndDropsOnesNobodyCarries', () => {
    const pool = offerPool(createRun('squirtle', 7, ctx), content);
    expect(pool).toContain('water-gem');
    expect(pool).not.toContain('steel-gem');
    expect(pool).not.toContain('rock-gem');
    // Everything that is not a Gem is untouched.
    expect(pool).toContain('coin-pouch');
    expect(pool).toContain('sages-tome');
  });

  it('OfferPool_OpensAGem_TheMomentSomeoneInTheBoxCarriesItsType', () => {
    const run = createRun('squirtle', 7, ctx);
    const withOnix = produce(run, (d) => {
      d.box.push({ ...d.box[0]!, uid: 'onix-test', speciesId: 'onix', pool: [] });
    });
    expect(offerPool(withOnix, content)).toContain('rock-gem');
  });
});

describe('A Starting Relic does something from the first node — §8.6.3', () => {
  const fits = (id: string, starters: string[]) => startingRelicFits(content.relic(id), starters, content);
  it('StartingRelicFits_NeverTraumaSalve_AndAGemOnlyForAStartersType', () => {
    expect(fits('trauma-salve', ['squirtle'])).toBe(false);
    expect(fits('water-gem', ['squirtle'])).toBe(true);
    expect(fits('fire-gem', ['squirtle'])).toBe(false);
    expect(fits('fire-gem', ['squirtle', 'charmander'])).toBe(true);
    expect(fits('coin-pouch', ['squirtle'])).toBe(true);
  });
});

describe('Phoenix Feather — once per Region (§7.3)', () => {
  it('CarriedRelics_LeaveTheSpentFeatherOutOfTheFight', () => {
    expect(carriedRelics({ relics: ['phoenix-feather', 'coin-pouch'], spentRelics: ['phoenix-feather'] })).toEqual(['coin-pouch']);
  });

  it('DepartCity_RegrowsTheFeather_ButNotAnotherRunCharge', () => {
    const run = produce(createRun('squirtle', 7, ctx), (d) => {
      d.relics.push('phoenix-feather', 'evolution-catalyst');
      d.spentRelics.push('phoenix-feather', 'evolution-catalyst');
    });
    const inCity = produce(run, (d) => arriveAtCity(d, ctx));
    const next = apply(inCity, { type: 'depart-city', modifierId: inCity.city!.reflection[0] ?? null });
    expect(next.spentRelics).toEqual(['evolution-catalyst']);
  });
});

describe("Healer's Kit — the swap cure (§7.3)", () => {
  it('ManualSwap_CuresTheOutgoingLead_AndTheCureMends', () => {
    const team = [{ ...STARTERS[0]!, status: 'poison' as const, hpPercent: 50 }, STARTERS[1]!, STARTERS[2]!];
    const fight = (relics: string[]) => dispatch(startFight(scenario({ team, enemies: [{ species: 'caterpie', level: 2, tier: 'wild', phaseCount: 1 }], relics })), { type: 'swap', benchIndex: 1 });
    const kit = fight(['healers-kit']);
    const bare = fight([]);
    expect(bare.player.team[0]!.status?.kind).toBe('poison');
    expect(kit.player.team[0]!.status).toBeFalsy();
    expect(kit.player.team[0]!.hp).toBe(bare.player.team[0]!.hp + 8);
  });
});
