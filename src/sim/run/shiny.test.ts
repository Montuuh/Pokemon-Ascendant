import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import type { ScenarioDef } from '../content/defs';
import { createRun, newPartyMon, runReducer, defaultRunCtx } from './run';
import { activeSetups } from './encounter';
import { applyShiny, copyIsShiny, SHINY, shinyChance } from './shiny';
import { BOND_TIER } from '../meta/bond';
import type { CombatOutcomeReport, MapNode, RunAction, RunState } from './types';

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`${a.type}: ${r.rejected}`);
  return r.state;
};

const wildFight = (species: string[]): ScenarioDef => ({
  id: 'x', name: 'x', description: '', kind: 'wild', stage: 'meadow', seed: 1,
  player: { team: [{ species: 'squirtle', level: 5 }], leadIndex: 0, consumables: [], balls: 0 },
  enemies: species.map((s) => ({ species: s, level: 5, tier: 'wild' as const, phaseCount: 1 as const })),
});
const node = (id: string): MapNode => ({ id } as MapNode);

describe('Shiny — §5.14', () => {
  it('ShinyChance_TheCharm_TriplesTheWildOdds_FromTierOne_§6.8.2', () => {
    const base = createRun('squirtle', 11, ctx);
    const at = (rank: number) => shinyChance({ perks: { ...base.perks, bond: { pidgey: rank } } }, 'pidgeotto', content);
    expect(at(0)).toBeCloseTo(SHINY.chance);
    expect(at(BOND_TIER.shinyCharm)).toBeCloseTo(SHINY.chance * SHINY.charmMultiplier);
    expect(at(BOND_TIER.soulbound)).toBeCloseTo(SHINY.chance * SHINY.charmMultiplier);
  });

  it('CopyIsShiny_OnlyUnderTheCharm_AndASoulboundStarterAlways_§6.8.2', () => {
    const base = createRun('squirtle', 11, ctx);
    const run = (rank: number, seed = 11) => ({ seed, perks: { ...base.perks, bond: { squirtle: rank } } });
    // No Charm: a starter, a Safari catch or a trade never rolls.
    for (let seed = 1; seed <= 300; seed++) expect(copyIsShiny(run(0, seed), 'squirtle', 'starter', content)).toBe(false);
    // The Charm: about the charmed chance, over many seeds.
    let hits = 0;
    for (let seed = 1; seed <= 2000; seed++) if (copyIsShiny(run(BOND_TIER.shinyCharm, seed), 'squirtle', 'starter', content)) hits++;
    expect(hits).toBeGreaterThan(2000 * SHINY.chance * SHINY.charmMultiplier * 0.6);
    expect(hits).toBeLessThan(2000 * SHINY.chance * SHINY.charmMultiplier * 1.4);
    // Soulbound: the starter is shiny every time, and createRun reads it from the perks.
    expect(copyIsShiny(run(BOND_TIER.soulbound), 'squirtle', 'starter', content)).toBe(true);
    const soul = createRun('squirtle', 11, ctx, 0, [], undefined, undefined, { ...base.perks, bond: { squirtle: BOND_TIER.soulbound } });
    expect(soul.box[0]!.shiny).toBe(true);
  });

  it('ApplyShiny_IsAHashOfTheNode_SameNodeSameAnswer_AndAboutTheChance', () => {
    const run = createRun('squirtle', 11, ctx);
    let shinies = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const a = applyShiny(wildFight(['pidgey']), node(`n${i}`), run, content);
      const b = applyShiny(wildFight(['pidgey']), node(`n${i}`), run, content);
      expect(a).toEqual(b);
      if (a.enemies[0]!.shiny) shinies++;
    }
    // 4000 rolls at 1/40: 100 expected; the band is wide on purpose, the hash is fixed so it never flakes.
    expect(shinies).toBeGreaterThan(60);
    expect(shinies).toBeLessThan(140);
  });

  it('ApplyShiny_ATrainersPokemon_IsNeverShiny', () => {
    const run = { ...createRun('squirtle', 11, ctx), perks: { ...createRun('squirtle', 11, ctx).perks, bond: { pidgey: 5 } } };
    const trainer = { ...wildFight(['pidgey']), kind: 'trainer' as const, enemies: [{ species: 'pidgey', level: 5, tier: 'trainer' as const, phaseCount: 1 as const }] };
    for (let i = 0; i < 500; i++) expect(applyShiny(trainer, node(`n${i}`), run, content).enemies[0]!.shiny).toBeUndefined();
  });

  it('CatchingAShiny_KeepsThePalette_IntoTheBox_AndEveryFightAfter', () => {
    let s = createRun('squirtle', 7, ctx);
    const target = s.reachable.find((id) => s.map.nodes[id]!.kind === 'wild')!;
    s = apply(s, { type: 'enter-node', nodeId: target });
    s = apply(s, { type: 'begin-combat' });
    const report: CombatOutcomeReport = {
      outcome: 'caught',
      team: s.activeUids.map((uid) => ({ uid, hp: 8, status: null, fainted: false })),
      caught: { speciesId: 'pidgey', level: 6, shiny: true },
      ballsLeft: 0,
      turns: 3,
    };
    s = apply(s, { type: 'finish-combat', report });
    s = apply(s, { type: 'claim-reward' });
    const caught = s.box.find((m) => m.speciesId === 'pidgey')!;
    expect(caught.shiny).toBe(true);
    expect(activeSetups({ ...s, activeUids: [caught.uid] }, content)[0]!.shiny).toBe(true);
    // An ordinary recruit carries no flag at all, so a save from before v0.9.1 reads the same.
    expect(newPartyMon('rattata', 5, content, 1).shiny).toBeUndefined();
  });
});
