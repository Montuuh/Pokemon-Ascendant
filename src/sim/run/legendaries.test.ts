import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ACTIVE_TEAM, ALL_GYMS, APEX, LEGENDARY_ARENAS, LEGENDARY_IDS, buildScenario, createRun, defaultRunCtx, fillTeam, generateVictoryRoad,
  newPartyMon, placeInTeam, placesOf, placesTaken, runReducer,
  type CombatOutcomeReport, type LegendaryId, type MapNode, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

// §2.3 / §2.12.2 — the Legendary Pokémon: two places in the Active Team with one body, met at Victory Road's Apex
// (caught, or beaten for a Legendary relic pick) and in its own arena.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const refusal = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;
const gymOf = (badge: string) => ALL_GYMS.find((g) => g.badgeId === badge)!.id;

/** A run on its map with a Box of four: Squirtle, Golem, Arcanine and a Zapdos. */
function withALegendary(): RunState {
  const run = structuredClone(createRun('squirtle', 11, ctx, 0)) as RunState;
  for (const id of ['golem', 'arcanine', 'zapdos']) run.box.push(newPartyMon(id, 40, content, run.seed, `p-${id}`));
  return run;
}

/** Victory Road, entered from the third Gym's Legendary pick with a team of three. */
function onVictoryRoad(seed = 11): RunState {
  const run = structuredClone(createRun('squirtle', seed, ctx, 2)) as RunState;
  for (const id of ['golem', 'arcanine']) run.box.push(newPartyMon(id, 40, content, run.seed, `p-${id}`));
  run.activeUids = run.box.map((m) => m.uid);
  run.gymsOffered = [[gymOf('boulder-badge'), gymOf('cascade-badge')], [...run.map.gyms]];
  run.badges = ['boulder-badge'];
  run.phase = 'legendary';
  run.pendingLegendary = [];
  return apply(run, { type: 'pick-legendary', relicId: null });
}
function standOnTheApex(run: RunState): RunState {
  const s = structuredClone(run) as RunState;
  const apex = Object.values(s.map.nodes).find((n) => n.kind === 'apex')!;
  const id = s.reachable[0]!;
  s.map.nodes[id] = { ...s.map.nodes[id]!, kind: 'apex', preview: structuredClone(apex.preview) };
  return apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
}
const report = (s: RunState, outcome: 'victory' | 'caught', caught: string | null = null): CombatOutcomeReport => ({
  outcome,
  team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })),
  caught: caught ? { speciesId: caught, level: 46 } : null,
  ballsLeft: 0,
  turns: 6,
});

describe('Two places, one body — §2.3', () => {
  it('PlacesOf_ALegendaryTakesTwo_AnyoneElseOne', () => {
    for (const id of LEGENDARY_IDS) expect(placesOf(id, content)).toBe(ACTIVE_TEAM.legendaryPlaces);
    expect(placesOf('golem', content)).toBe(1);
  });

  it('SetActive_ALegendaryAndOnePartner_Fits_ALegendaryAndTwo_DoesNot', () => {
    const run = withALegendary();
    const [squirtle, golem, , zapdos] = run.box.map((m) => m.uid);
    expect(refusal(run, { type: 'set-active', uids: [zapdos!, squirtle!] })).toBeNull();
    expect(refusal(run, { type: 'set-active', uids: [zapdos!, squirtle!, golem!] })).toBe('team-too-large');
    expect(placesTaken([zapdos!, squirtle!], run.box, content)).toBe(ACTIVE_TEAM.places);
  });

  it('PlaceInTeam_ALegendaryIntoAFullTeam_TheLongestStandingStepsBack', () => {
    const run = withALegendary();
    const [squirtle, golem, arcanine, zapdos] = run.box.map((m) => m.uid);
    const team = [squirtle!, golem!, arcanine!];
    // Into the third place: Arcanine goes to the Box, and Squirtle, there longest, steps back for the second place.
    expect(placeInTeam(team, zapdos!, 2, run.box, content)).toEqual([golem!, zapdos!]);
    expect(refusal(run, { type: 'set-active', uids: placeInTeam(team, zapdos!, 2, run.box, content) })).toBeNull();
    // Anyone else just takes the place.
    expect(placeInTeam([squirtle!, golem!], arcanine!, 0, run.box, content)).toEqual([arcanine!, golem!]);
    expect(placeInTeam([squirtle!], arcanine!, 1, run.box, content)).toEqual([squirtle!, arcanine!]);
  });

  it('FillTeam_TakesEachOneThatStillFits_InOrder', () => {
    const run = withALegendary();
    const zapdosFirst = [run.box[3]!, ...run.box.slice(0, 3)];
    expect(fillTeam(zapdosFirst, content)).toEqual([run.box[3]!.uid, run.box[0]!.uid]);
    expect(fillTeam(run.box, content)).toEqual(run.box.slice(0, 3).map((m) => m.uid));
  });
});

describe('The Apex — §2.12.2', () => {
  it('VictoryRoad_HasOneApex_InItsLastColumn_ALegendaryTheBoxDoesNotHold', () => {
    const zapdos = [newPartyMon('zapdos', 40, content, 1, 'z')];
    for (let seed = 300; seed < 330; seed++) {
      const map = generateVictoryRoad(new RngStreams(seed).get('MapRNG'), content, seed, zapdos);
      const apexes = Object.values(map.nodes).filter((n) => n.kind === 'apex');
      expect(apexes).toHaveLength(1);
      expect(apexes[0]!.layer).toBe(APEX.column);
      expect(apexes[0]!.preview.legendary).not.toBe('zapdos');
      expect(LEGENDARY_IDS).toContain(apexes[0]!.preview.legendary);
    }
  });

  it('VictoryRoad_NoApex_WhenTheBoxHoldsAllFive', () => {
    const all = LEGENDARY_IDS.map((id, i) => newPartyMon(id, 40, content, 1, `l${i}`));
    const map = generateVictoryRoad(new RngStreams(5).get('MapRNG'), content, 5, all);
    expect(Object.values(map.nodes).some((n) => n.kind === 'apex')).toBe(false);
  });

  it('Apex_IsFoughtInItsArena_ItsFieldItsRuleItsBackdrop', () => {
    const s = standOnTheApex(onVictoryRoad());
    const node = s.map.nodes[s.pendingNodeId!]!;
    const legendary = node.preview.legendary as LegendaryId;
    const arena = LEGENDARY_ARENAS[legendary];
    const scenario = s.pendingScenario!;
    expect(scenario.kind).toBe('wild');
    expect(scenario.arenaRule).toBe(arena.rule);
    expect(scenario.stage).toBe(arena.stage);
    expect(scenario.fields ?? {}).toEqual(arena.fields);
    expect(!!scenario.metronome).toBe(!!arena.metronome);
    expect(scenario.enemies[0]).toMatchObject({ species: legendary, tier: 'boss', phaseCount: APEX.phaseCount });
  });

  it('Apex_Beaten_PaysALegendaryRelicPick_NotThePokemon', () => {
    const s = standOnTheApex(onVictoryRoad());
    const after = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    const pick = after.pendingReward!.relicPick!;
    expect(pick.length).toBeGreaterThan(0);
    for (const id of pick) expect(['legendary', 'rare']).toContain(content.relic(id).rarity);
    expect(after.box.some((m) => LEGENDARY_IDS.includes(m.speciesId as LegendaryId))).toBe(false);
  });

  it('Apex_Caught_Joins_WaitingInTheBox_WhileTheTeamHasNoTwoPlacesFree', () => {
    const s = standOnTheApex(onVictoryRoad());
    const legendary = s.map.nodes[s.pendingNodeId!]!.preview.legendary!;
    const after = apply(s, { type: 'finish-combat', report: report(s, 'caught', legendary) });
    const caught = after.box.find((m) => m.speciesId === legendary)!;
    expect(caught).toBeDefined();
    expect(after.pendingReward?.relicPick ?? null).toBeNull();
    // A team of three: no room for two places, so it waits in the Box.
    expect(after.activeUids).not.toContain(caught.uid);
    // Back on the map, made the team with one partner, it fits.
    const onMap = apply(after, { type: 'claim-reward' });
    const team = onMap.activeUids[0]!;
    expect(refusal(onMap, { type: 'set-active', uids: [caught.uid, team] })).toBeNull();
  });

  it('Apex_ItsFightBuildsTheSameEveryTime', () => {
    const s = standOnTheApex(onVictoryRoad());
    const node = s.map.nodes[s.pendingNodeId!] as MapNode;
    expect(buildScenario(node, s, content, new RngStreams(1).get('EncounterRNG'))!.arenaRule).toBe(s.pendingScenario!.arenaRule);
  });
});
