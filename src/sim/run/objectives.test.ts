import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  buildScenario, createRun, defaultRunCtx, FLEE_RACE, generateRegion, HOLD_OUT, runnerById, runReducer,
  type CombatOutcomeReport, type MapNode, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';
import { GameRng } from '@/sim/rng/gameRng';

// §5.6.5 — fights with another objective, the run's half: where the map places them, the fight each builds, and what
// it pays — a runner that got away costs nothing, one knocked out pays its premium, a hold-out won pays the find.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};

/** The run with its first reachable node rewritten into the node under test, and walked into. */
function standOn(make: (node: MapNode, run: RunState) => MapNode, seed = 7): RunState {
  const run = structuredClone(createRun('squirtle', seed, ctx)) as RunState;
  const id = run.reachable[0]!;
  run.map.nodes[id] = make(run.map.nodes[id]!, run);
  return apply(apply(run, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' });
}
const runnerNode = (runner: 'abra' | 'meowth' | 'chansey', species: string) => (node: MapNode): MapNode => ({
  ...node,
  kind: 'wild',
  preview: { title: `Wild ${species}`, detail: '', speciesIds: [species], levelBand: [6, 6], enemies: [{ species, level: 6 }], objective: { kind: 'flee', runner, turns: 2 } },
});
const guardNode = (prize: Extract<NonNullable<MapNode['preview']['objective']>, { kind: 'hold' }>['prize']) => (node: MapNode): MapNode => ({
  ...node,
  kind: 'cache',
  preview: {
    title: 'A guarded find', detail: '', speciesIds: ['primeape'], levelBand: [7, 7], enemies: [{ species: 'primeape', level: 7 }], icon: 'cache',
    find: { items: ['potion'], money: 40 }, objective: { kind: 'hold', guard: 'primeape', turns: 3, prize },
  },
});
const report = (s: RunState, outcome: CombatOutcomeReport['outcome']): CombatOutcomeReport => ({
  outcome, team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: 0, turns: 2,
});

describe('Objectives on the map — §5.6.5', () => {
  const maps = Array.from({ length: 60 }, (_, i) => generateRegion(new RngStreams(1000 + i).get('MapRNG'), content, i % 3, 1000 + i));

  it('Runners_NeverInTheFirstColumns_NeverTwoOnARoute_AtTheRegionsForm', () => {
    let seen = 0;
    for (const map of maps) {
      const runners = Object.values(map.nodes).filter((n) => n.preview.objective?.kind === 'flee');
      expect(runners.length).toBeLessThanOrEqual(1);
      for (const n of runners) {
        seen++;
        expect(n.kind).toBe('wild');
        expect(n.layer).toBeGreaterThanOrEqual(FLEE_RACE.firstLayer);
        const o = n.preview.objective!;
        const row = FLEE_RACE.runners.find((r) => o.kind === 'flee' && r.id === o.runner)!;
        expect(n.preview.enemies?.[0]?.species).toBe(row.forms[map.regionIndex]);
        expect(n.preview.wild).toBeUndefined();
      }
    }
    // About one Wild Area in twelve: over sixty routes, most carry one.
    expect(seen).toBeGreaterThan(20);
  });

  it('GuardedFinds_NeverWhereTheyAreTheOnlyWayOn', () => {
    let seen = 0;
    for (const map of maps) {
      const all = Object.values(map.nodes);
      for (const n of all.filter((x) => x.preview.objective?.kind === 'hold')) {
        seen++;
        expect(n.kind).toBe('cache');
        expect(n.preview.find).toBeDefined();
        const parents = all.filter((p) => p.next.includes(n.id));
        for (const p of parents) expect(p.next.length).toBeGreaterThan(1);
        if (n.layer === 0) expect(map.entry.length).toBeGreaterThan(1);
        const guard = HOLD_OUT.guards.find((g) => g.region === map.regionIndex)!;
        expect(n.preview.enemies?.map((e) => e.species)).toEqual(guard.team.map((m) => m.species));
      }
    }
    expect(seen).toBeGreaterThan(5);
  });

  it('Placement_IsDeterministic', () => {
    // The same seed, the same route and the same objectives.
    const a = generateRegion(new RngStreams(77).get('MapRNG'), content, 0, 77);
    const b = generateRegion(new RngStreams(77).get('MapRNG'), content, 0, 77);
    expect(Object.values(a.nodes).map((n) => `${n.id}:${n.kind}:${n.preview.objective?.kind ?? ''}`)).toEqual(Object.values(b.nodes).map((n) => `${n.id}:${n.kind}:${n.preview.objective?.kind ?? ''}`));
  });
});

describe('Objective fights — §5.6.5', () => {
  it('Runner_BuildsALoneWildFight_WithItsClock_NeverAPackOrADoubleAction', () => {
    const s = standOn(runnerNode('abra', 'abra'));
    expect(s.phase).toBe('combat');
    const sc = s.pendingScenario!;
    expect(sc.objective).toEqual({ kind: 'flee', turns: 2 });
    expect(sc.enemies).toHaveLength(1);
    expect(sc.enemies[0]!.species).toBe('abra');
    expect(sc.enemies[0]!.acts).toBeUndefined();
    expect(sc.enemies[0]!.helpers).toBeUndefined();
  });

  it('GuardedFind_IsAFight_NotAPickUp', () => {
    const s = standOn(guardNode({ kind: 'held-item' }));
    expect(s.phase).toBe('combat');
    expect(s.pendingScenario!.objective).toEqual({ kind: 'hold', turns: HOLD_OUT.guards[0]!.turns });
    expect(s.pendingScenario!.enemies[0]!.hpMultiplier).toBe(HOLD_OUT.hpMultiplier);
    expect(s.consumables.filter((c) => c === 'potion').length).toBe(createRun('squirtle', 7, ctx).consumables.filter((c) => c === 'potion').length);
  });

  it('Fled_NoXpNoDropNoToll_BackToTheMap', () => {
    const s = standOn(runnerNode('abra', 'abra'));
    const after = apply(s, { type: 'finish-combat', report: report(s, 'fled') });
    expect(after.phase).toBe('map');
    expect(after.money).toBe(s.money);
    expect(after.box.map((m) => m.xp)).toEqual(s.box.map((m) => m.xp));
    expect(after.box.map((m) => m.traumaStacks)).toEqual(s.box.map((m) => m.traumaStacks));
    expect(after.pendingReward).toBeNull();
  });

  it('RunnerKnockedOut_PaysItsXpTimesItsMultiplier_AndARareCandyForTheLead', () => {
    // The same runner caught pays a wild fight's XP: a catch is a catch like any other.
    const s = standOn(runnerNode('abra', 'abra'));
    const plain = apply(s, { type: 'finish-combat', report: { ...report(s, 'caught'), caught: { speciesId: 'abra', level: 6 } } });
    const after = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    const lead = after.activeUids[0]!;
    const xpOf = (r: RunState) => r.pendingReward!.xpAwarded.find((x) => x.uid === lead)!.amount;
    expect(Math.abs(xpOf(after) - runnerById('abra').reward.xpMultiplier! * xpOf(plain))).toBeLessThanOrEqual(1);
    expect(after.pendingReward!.objective?.kind).toBe('flee');
    expect(after.pendingReward!.objective!.lines.some((l) => l.includes('Rare Candy'))).toBe(true);
    expect(after.box.find((m) => m.uid === lead)!.level).toBeGreaterThan(plain.box.find((m) => m.uid === lead)!.level);
  });

  it('PayDay_PaysATrainersPurseTimesFour', () => {
    const s = standOn(runnerNode('meowth', 'meowth'));
    const after = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
    expect(after.pendingReward!.money).toBeGreaterThanOrEqual(4 * 50);
  });

  it('HoldOutWon_TheFindAndItsPrize', () => {
    for (const prize of [{ kind: 'held-item' }, { kind: 'relic', rarity: 'uncommon' }] as const) {
      const s = standOn(guardNode(prize));
      const after = apply(s, { type: 'finish-combat', report: report(s, 'victory') });
      expect(after.consumables.filter((c) => c === 'potion').length).toBe(s.consumables.filter((c) => c === 'potion').length + 1);
      expect(after.money).toBeGreaterThanOrEqual(s.money + 40);
      if (prize.kind === 'relic') expect(after.pendingReward!.relic).not.toBeNull();
      else expect(after.pendingReward!.heldItem).not.toBeNull();
      // The find is loot like any other: on the reward screen's strip, said once.
      expect(after.pendingReward!.consumables).toContain('potion');
      expect(after.pendingReward!.money).toBeGreaterThanOrEqual(40);
    }
  });

  it('HoldOut_RunningCostsTheWildToll', () => {
    const s = standOn(guardNode({ kind: 'held-item' }));
    const after = apply(s, { type: 'finish-combat', report: report(s, 'escaped') });
    expect(after.phase).toBe('map');
    const lead = after.box.find((m) => m.uid === s.activeUids[0])!;
    expect(lead.traumaStacks).toBeGreaterThanOrEqual(1);
  });

  it('BuildScenario_ForARunner_IgnoresTheWildChoice', () => {
    const run = structuredClone(createRun('squirtle', 7, ctx)) as RunState;
    const node = runnerNode('abra', 'abra')(run.map.nodes[run.reachable[0]!]!);
    const sc = buildScenario(node, run, content, new GameRng(5), 'pidgey')!;
    expect(sc.enemies[0]!.species).toBe('abra');
  });
});
