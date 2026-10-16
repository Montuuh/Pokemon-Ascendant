import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ALL_GYMS, DEFAULT_BATTLE_CONFIG, LEAGUE, LEAGUE_MEMBERS, buildScenario, championAce, createCombat, createRun, defaultRunCtx, effectiveMax,
  newPartyMon, runReducer, synergyMultiplier,
  type CombatOutcomeReport, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { onFaint } from '@/sim/combat/damageFlow';
import { rngFromState } from '@/sim/combat/setup';

// §2.1.6 / §5.11 / §5.12 — the League: through the Summit's gate, five doors in a row — the Elite Four and the
// Champion — a micro-rest between them, and the run won at the last.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const combatCtx = { content, config: DEFAULT_BATTLE_CONFIG };
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const gymOf = (badge: string) => ALL_GYMS.find((g) => g.badgeId === badge)!.id;

/** A run of three through the Summit's gate, at the League's first door. */
function atTheLeague(starter = 'squirtle'): RunState {
  const run = structuredClone(createRun(starter, 11, ctx, 2)) as RunState;
  for (const id of ['golem', 'arcanine']) run.box.push(newPartyMon(id, 44, content, run.seed, `p-${id}`));
  run.activeUids = run.box.map((m) => m.uid);
  run.gymsOffered = [[gymOf('boulder-badge'), gymOf('cascade-badge')], [...run.map.gyms]];
  run.badges = ['boulder-badge'];
  run.phase = 'legendary';
  run.pendingLegendary = [];
  let s = apply(run, { type: 'pick-legendary', relicId: null });
  const summit = Object.values(s.map.nodes).find((n) => n.kind === 'summit')!;
  s = structuredClone(s) as RunState;
  s.reachable = [summit.id];
  s = apply(apply(s, { type: 'enter-node', nodeId: summit.id }), { type: 'begin-combat' });
  return apply(s, { type: 'enter-league', relicId: null });
}
const report = (s: RunState, outcome: 'victory' | 'defeat', fainted: string[] = []): CombatOutcomeReport => ({
  outcome,
  team: s.activeUids.map((uid) => ({ uid, hp: fainted.includes(uid) ? 0 : 20, status: null, fainted: fainted.includes(uid) })),
  caught: null,
  ballsLeft: 0,
  turns: 8,
});
/** Walk into the next door and fight it to `outcome`; on a win, through the reward and any evolution. */
function fightNext(s: RunState, outcome: 'victory' | 'defeat' = 'victory', fainted: string[] = []): RunState {
  let out = apply(apply(s, { type: 'enter-node', nodeId: s.reachable[0]! }), { type: 'begin-combat' });
  out = apply(out, { type: 'finish-combat', report: report(out, outcome, fainted) });
  if (out.phase === 'reward') out = apply(out, { type: 'claim-reward' });
  for (let guard = 0; guard < 6 && out.phase === 'evolution'; guard++) {
    const p = out.pendingEvolutions[0]!;
    out = apply(out, { type: 'choose-branch', uid: p.uid, branchId: p.branchIds[0]! });
  }
  return out;
}

describe('The League — §2.1.6', () => {
  it('Gate_OpensOntoFiveDoorsInARow_TheChampionLast', () => {
    const s = atTheLeague();
    expect(s.zone).toBe('league');
    const doors = Object.values(s.map.nodes).sort((a, b) => a.layer - b.layer);
    expect(doors.map((n) => n.preview.rosterId)).toEqual(LEAGUE_MEMBERS.map((m) => m.id));
    for (const [i, n] of doors.entries()) expect(n.next).toEqual(i + 1 < doors.length ? [doors[i + 1]!.id] : []);
    expect(s.reachable).toEqual([doors[0]!.id]);
  });

  it('EliteFour_TeamsOfTwoThenThree_TheAceThreePhases_OnTheirOwnTypesGround', () => {
    const s = atTheLeague();
    const doors = Object.values(s.map.nodes).sort((a, b) => a.layer - b.layer);
    const sizes = doors.slice(0, 4).map((n) => buildScenario(n, s, content, new RngStreams(1).get('EncounterRNG'))!.enemies.length);
    expect(sizes).toEqual([2, 2, 3, 3]);
    for (const n of doors.slice(0, 4)) {
      const sc = buildScenario(n, s, content, new RngStreams(1).get('EncounterRNG'))!;
      expect(sc.kind).toBe('boss');
      expect(sc.enemies.at(-1)!.phaseCount).toBe(3);
      expect(sc.fields?.home).toBe(LEAGUE_MEMBERS.find((m) => m.id === n.preview.rosterId)!.type);
    }
  });

  it('Champion_FiveOverSeveralTypes_HisAceCounterPicksYourStarter_HisSignatureAndHisLastPair', () => {
    const s = atTheLeague('squirtle');
    const champion = Object.values(s.map.nodes).find((n) => n.preview.rosterId === 'champion')!;
    const sc = buildScenario(champion, s, content, new RngStreams(1).get('EncounterRNG'))!;
    expect(sc.enemies).toHaveLength(5);
    expect(sc.enemies.at(-1)!.species).toBe('venusaur');
    expect(new Set(sc.enemies.flatMap((e) => content.species(e.species).types)).size).toBeGreaterThanOrEqual(5);
    for (const e of sc.enemies) expect(e.phaseCount).toBeGreaterThanOrEqual(2);
    expect(sc.gymRule).toBe('synergy');
    expect(sc.pairFrom).toBe(LEAGUE.championPairFrom);
    expect(championAce('charmander')).toBe('blastoise');
    expect(championAce('bulbasaur')).toBe('charizard');
  });

  it('MicroRest_BetweenDoors_ThirtyPercentToEveryoneStanding_NotTheFallen', () => {
    const s = atTheLeague();
    const fallen = s.activeUids[2]!;
    const after = fightNext(s, 'victory', [fallen]);
    expect(after.phase).toBe('map');
    for (const m of after.box) {
      if (!s.activeUids.includes(m.uid)) continue;
      const max = effectiveMax(after, m, content);
      if (m.uid === fallen) expect(m.hp).toBe(0);
      else expect(m.hp).toBe(Math.min(max, 20 + Math.max(1, Math.floor((max * LEAGUE.microRest) / 100))));
    }
    expect(after.reachable).toEqual([Object.values(after.map.nodes).find((n) => n.layer === 1)!.id]);
  });

  it('TheChampion_Beaten_WinsTheRun_ALossAnywhere_EndsIt', () => {
    let s = atTheLeague();
    for (let i = 0; i < LEAGUE_MEMBERS.length; i++) s = fightNext(s);
    expect(s.outcome).toBe('victory');
    expect(s.phase).toBe('ended');
    const lost = fightNext(atTheLeague(), 'defeat');
    expect(lost.outcome).toBe('defeat');
  });
});

describe("The Champion's fight — §5.12", () => {
  it('FullTeamSynergy_FivePercentAFallenAlly_CappedAtTwenty', () => {
    const s = atTheLeague();
    const champion = Object.values(s.map.nodes).find((n) => n.preview.rosterId === 'champion')!;
    let combat = createCombat(buildScenario(champion, s, content, new RngStreams(1).get('EncounterRNG'))!, combatCtx);
    expect(synergyMultiplier(combat, combatCtx.config)).toBe(1);
    // The first three fall, one after another: from then on two stand on the field.
    for (let i = 0; i < LEAGUE.championPairFrom; i++) {
      expect(combat.enemies).toHaveLength(1);
      const foe = combat.enemies[0]!;
      foe.hp = 0;
      onFaint(combat, { ...combatCtx, rng: rngFromState(combat) }, foe);
    }
    expect(combat.enemies).toHaveLength(2);
    expect(synergyMultiplier(combat, combatCtx.config)).toBeCloseTo(1 + 3 * combatCtx.config.gymRules.synergyPerFallen);
    combat = { ...combat, defeatedEnemies: [...combat.defeatedEnemies, ...combat.defeatedEnemies, ...combat.defeatedEnemies] };
    expect(synergyMultiplier(combat, combatCtx.config)).toBeCloseTo(1 + combatCtx.config.gymRules.synergyCap);
  });
});
