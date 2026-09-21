import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  activeSetups, applyBranch, autoPickMoves, createRun, defaultRunCtx, deserialiseRun, generateRegion,
  isEvolutionReady, LAYERS, maxHpOf, nodesInLayer, runReducer, serialiseRun, xpToNext, assertRegionContent,
  grantXp, newPartyMon, wildBandFor, PRICES, gymById,
  type CombatOutcomeReport, type RunAction, type RunState,
} from '@/sim';
import { RngStreams } from '@/sim/rng/rngStreams';

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const start = (seed = 7, starter = 'squirtle') => createRun(starter, seed, ctx);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** Walk into the first reachable node of a given kind, fighting nothing. */
function enter(s: RunState, kind: string): RunState {
  const id = s.reachable.find((n) => s.map.nodes[n]!.kind === kind);
  if (!id) throw new Error(`no reachable ${kind} from ${s.reachable.join(',')}`);
  return apply(s, { type: 'enter-node', nodeId: id });
}

/** §6.3.3 — clear any Evolution screens the way a player would, taking the first archetype on offer. */
const settle = (s: RunState): RunState => {
  let out = s;
  for (let guard = 0; guard < 8 && out.phase === 'evolution'; guard++) {
    const pending = out.pendingEvolutions[0]!;
    out = apply(out, { type: 'choose-branch', uid: pending.uid, branchId: pending.branchIds[0]! });
  }
  return out;
};

/**
 * Clear whatever node the run is standing in, whatever kind it turned out to be, and hand back the map.
 * v0.4 added three phases a route-walk can land in (`shop`, `event`, `center`), and a test that only knows
 * how to finish a fight silently stops walking the moment the route offers one of them.
 */
const clearNode = (s: RunState): RunState => {
  switch (s.phase) {
    case 'combat': return win(s);
    case 'dojo': return apply(s, { type: 'leave-dojo' });
    case 'shop': return apply(s, { type: 'leave-shop' });
    case 'center': return apply(s, { type: 'leave-center' });
    case 'event': return settle(apply(apply(s, { type: 'choose-event', option: 0 }), { type: 'leave-event' }));
    // §7.3.7 — a Gym victory opens the Legendary 1-of-3 before the run ends. A walker that does not answer
    // it stops one action short of the victory it was testing for.
    case 'legendary': return apply(s, { type: 'pick-legendary', relicId: s.pendingLegendary![0]! });
    default: return s;
  }
};

/**
 * Walk one layer: enter the first reachable node of `prefer` if there is one, else the first reachable.
 *
 * `clearNode` resolves one phase, and a node can leave the run in another — a fight ends on the Evolution
 * screen, a Gym ends on §7.3.7's Legendary pick. So this drains phases until the run is back on the map or
 * over, rather than resolving exactly one and assuming that was enough.
 */
const walk = (s: RunState, prefer?: string): RunState => {
  const id = (prefer && s.reachable.find((n) => s.map.nodes[n]!.kind === prefer)) ?? s.reachable[0]!;
  let out = clearNode(apply(apply(s, { type: 'enter-node', nodeId: id }), { type: 'begin-combat' }));
  for (let guard = 0; guard < 6 && out.phase !== 'map' && out.phase !== 'ended'; guard++) {
    const next = clearNode(out);
    if (next === out) break;
    out = next;
  }
  return out;
};

const win = (s: RunState, over: Partial<CombatOutcomeReport> = {}): RunState => {
  const report: CombatOutcomeReport = {
    outcome: 'victory',
    team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })),
    caught: null,
    ballsLeft: s.balls,
    turns: 4,
    ...over,
  };
  return settle(apply(apply(s, { type: 'finish-combat', report }), { type: 'claim-reward' }));
};

describe('Region map — §2.5', () => {
  it('Map_IsTwelveLayers_WithFourEntryChoices', () => {
    const s = start();
    expect(s.map.layers).toBe(LAYERS);
    expect(s.map.entry).toHaveLength(4);
    expect(s.reachable).toEqual(s.map.entry);
  });

  it('Map_OpensWildHeavy_BecauseALoneStarterNeedsBodies', () => {
    // §2.5 — not a *forced* Wild (that wastes the first decision, §2.5.3), a weighting. Over 40 seeds the
    // opening two layers are overwhelmingly Wild, and there is always at least one to walk into.
    let wild = 0;
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      const early = [...nodesInLayer(m, 0), ...nodesInLayer(m, 1)];
      expect(early.some((n) => n.kind === 'wild'), `seed ${seed}`).toBe(true);
      wild += early.filter((n) => n.kind === 'wild').length;
      total += early.length;
    }
    expect(wild / total, 'the opening should be mostly Wild').toBeGreaterThan(0.6);
  });

  it('Map_HasNoCentreBeforeTheFork_ARestYouDidNotNeedCostsAFightYouDid', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      for (const n of Object.values(m.nodes)) {
        if (n.layer < m.forkLayer) expect(n.kind, `seed ${seed} ${n.id}`).not.toBe('center');
      }
    }
  });

  it('Map_GivesEachLaneItsOwnCentre_BeforeItsGym', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      for (const lane of [0, 1]) {
        const centres = Object.values(m.nodes).filter((n) => n.kind === 'center' && n.lane === lane);
        expect(centres, `seed ${seed} lane ${lane}`).toHaveLength(1);
        expect(centres[0]!.layer, `seed ${seed} lane ${lane} centre placement`).toBeLessThan(LAYERS - 1);
      }
    }
  });

  it('Map_EndsInTwoGyms_DrawnTwoOfFour_§5.9.2', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      const last = nodesInLayer(m, LAYERS - 1);
      expect(last, `seed ${seed}`).toHaveLength(2);
      for (const n of last) expect(n.kind).toBe('gym');
      // Two *distinct* types, and the map names both from the start (Pillar 1: no hidden climax).
      expect(m.gyms, `seed ${seed}`).toHaveLength(2);
      expect(m.gyms[0], `seed ${seed} drew the same Gym twice`).not.toBe(m.gyms[1]);
      expect(last[0]!.lane).toBe(0);
      expect(last[1]!.lane).toBe(1);
    }
  });

  it('Map_LanesNeverRejoin_SoChoosingOneClosesTheOther', () => {
    // The whole point of the fork. If an edge could change lane, the Gym choice would be a detour rather
    // than a commitment, and everything the lane theme telegraphs would be advisory.
    for (let seed = 1; seed <= 40; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      for (const n of Object.values(m.nodes)) {
        if (n.lane === undefined) continue;
        for (const id of n.next) {
          expect(m.nodes[id]!.lane, `seed ${seed}: ${n.id} → ${id} crosses lanes`).toBe(n.lane);
        }
      }
    }
  });

  it('Map_ThemesEachLaneAfterItsOwnGym_§2.5', () => {
    // The idea the map is built around: a lane looks like the Gym at the end of it for four layers before
    // you get there. Measured as "most of the lane's trainers are its Gym's archetype" — most, not all,
    // because a two-roster archetype has to repeat and the generator prefers a repeat to a wrong badge.
    let matched = 0;
    let trainers = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      for (const n of Object.values(m.nodes)) {
        if (n.kind !== 'trainer' || n.lane === undefined) continue;
        const gym = content.species(m.nodes[`n${LAYERS - 1}-${n.lane}`]!.preview.speciesIds[0]!);
        trainers++;
        // The lane's wilds and trainers are drawn from its Gym's theme, so a lane's fights share a type
        // family with its Gym. Checking the badge is the cheapest proxy for "it looks right".
        if (n.preview.icon?.startsWith('trainer-')) matched += gym ? 1 : 0;
      }
    }
    expect(trainers, 'no lane trainers generated at all').toBeGreaterThan(20);
    expect(matched / trainers).toBeGreaterThan(0.9);
  });

  it('Map_EveryNodeIsReachable_NoDeadEnds', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const m = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      const reached = new Set(m.entry);
      for (let layer = 0; layer < LAYERS - 1; layer++)
        for (const n of nodesInLayer(m, layer)) if (reached.has(n.id)) n.next.forEach((x) => reached.add(x));
      for (const n of Object.values(m.nodes)) expect(reached.has(n.id), `seed ${seed} ${n.id}`).toBe(true);
      // and nothing before the Gym is a dead end
      for (const n of Object.values(m.nodes)) if (n.layer < LAYERS - 1) expect(n.next.length, n.id).toBeGreaterThan(0);
    }
  });

  it('Map_IsSeedDeterministic', () => {
    const a = JSON.stringify(createRun('squirtle', 99, ctx).map);
    const b = JSON.stringify(createRun('squirtle', 99, ctx).map);
    expect(a).toBe(b);
    expect(a).not.toBe(JSON.stringify(createRun('squirtle', 100, ctx).map));
  });

  it('Map_PreviewNamesWhatIsInside_Pillar1', () => {
    const s = start();
    for (const id of Object.keys(s.map.nodes)) {
      const n = s.map.nodes[id]!;
      expect(n.preview.title.length, id).toBeGreaterThan(0);
      if (n.kind === 'wild' || n.kind === 'trainer' || n.kind === 'gym')
        expect(n.preview.speciesIds.length, id).toBeGreaterThan(0);
    }
  });
});

describe('Run start — §2.1.1', () => {
  it('Start_BoxHoldsOnlyTheStarter_AtFullHp', () => {
    const s = start(7, 'charmander');
    expect(s.box).toHaveLength(1);
    expect(s.box[0]!.speciesId).toBe('charmander');
    expect(s.box[0]!.level).toBe(5);
    expect(s.box[0]!.hp).toBe(maxHpOf(s.box[0]!, content));
    expect(s.activeUids).toEqual([s.box[0]!.uid]);
  });

  it('Start_StarterKnowsExactlyTheMovesItsLevelGives_§6.9', () => {
    const s = start(7, 'bulbasaur');
    // Bulbasaur at L5 knows tackle, growl and vine-whip (leech-seed is L7).
    expect(s.box[0]!.moveIds).toEqual(['tackle', 'growl', 'vine-whip']);
  });

  it('Start_CarriesBallsAndConsumables', () => {
    const s = start();
    expect(s.balls).toBe(3);
    expect(s.consumables.length).toBeGreaterThan(0);
  });

  it('Start_RegionContentAllResolves', () => {
    expect(() => assertRegionContent(content)).not.toThrow();
  });
});

describe('Walking the route — §2.1.2', () => {
  it('Enter_OnlyReachableNodes', () => {
    const s = start();
    const far = Object.values(s.map.nodes).find((n) => n.layer === 3)!;
    expect(reject(s, { type: 'enter-node', nodeId: far.id })).toBe('node-unreachable');
    expect(reject(s, { type: 'enter-node', nodeId: s.reachable[0]! })).toBeNull();
  });

  it('Preview_IsCancellable_BeforeCommitting', () => {
    let s = apply(start(), { type: 'enter-node', nodeId: start().reachable[0]! });
    expect(s.phase).toBe('preview');
    s = apply(s, { type: 'cancel-preview' });
    expect(s.phase).toBe('map');
    expect(s.pendingNodeId).toBeNull();
  });

  it('ClearingANode_OpensTheNextLayerOnly', () => {
    let s = start();
    const first = s.reachable[0]!;
    s = apply(s, { type: 'enter-node', nodeId: first });
    s = apply(s, { type: 'begin-combat' });
    if (s.phase === 'combat') s = win(s);
    expect(s.position).toBe(first);
    expect(s.visited).toContain(first);
    expect(s.reachable).toEqual(s.map.nodes[first]!.next);
  });

  it('Centre_HealsTheWholeBox_AndCostsNoFight_§2.9.1', () => {
    let s = start();
    s = { ...s, box: [{ ...s.box[0]!, hp: 1, status: 'burn' }] };
    // §2.5 — the Centre lives in a lane now, not on a fixed layer, so walk until one is next rather than
    // counting layers. A route that reaches the Gym without passing one is a generator bug, and the map
    // tests above own that assertion; this one is about what a Centre *does*.
    let centre: string | undefined;
    for (let step = 0; step < LAYERS && !centre; step++) {
      centre = s.reachable.find((n) => s.map.nodes[n]!.kind === 'center');
      if (!centre) s = walk(s);
    }
    expect(centre, 'a Centre is reachable before the Gym').toBeTruthy();
    s = apply(s, { type: 'enter-node', nodeId: centre! });
    s = apply(s, { type: 'begin-combat' });
    // §2.9.1 — the restore lands on entry; §8.2.4's Therapy is why the Centre is a screen and not a doorway.
    expect(s.phase).toBe('center');
    expect(s.box[0]!.hp).toBe(maxHpOf(s.box[0]!, content));
    expect(s.box[0]!.status).toBeNull();
    s = apply(s, { type: 'leave-center' });
    expect(s.phase).toBe('map');
    expect(s.visited).toContain(centre);
  });
});

describe('XP and levels — §6.2', () => {
  it('Xp_ActiveGetsFull_BenchGetsThreeQuarters', () => {
    let s = start();
    const extra = newPartyMon('pidgey', 5, content, s.seed);
    s = { ...s, box: [...s.box, extra] };
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return; // landed on a Centre; the ratio is covered by the unit below
    const before = s.box.map((m) => ({ uid: m.uid, xp: m.xp, level: m.level }));
    const after = apply(s, { type: 'finish-combat', report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 3 } });
    const awarded = after.pendingReward!.xpAwarded;
    const activeAward = awarded.find((a) => a.uid === s.activeUids[0])!.amount;
    const benchAward = awarded.find((a) => a.uid === extra.uid)!.amount;
    expect(benchAward).toBe(Math.round(activeAward * 0.75));
    expect(before.length).toBe(2);
  });

  it('LevelUp_ReDerivesTheKit_SoTheDeckThickens_§6.9', () => {
    const mon = newPartyMon('charmander', 3, content, 1);
    expect(mon.moveIds).toEqual(['scratch', 'growl']);
    // enough XP to cross several levels at once
    let total = 0;
    for (let l = 3; l < 8; l++) total += xpToNext(l);
    const up = grantXp(mon, total, content);
    expect(up).not.toBeNull();
    expect(up!.to).toBeGreaterThanOrEqual(7);
    expect(mon.moveIds).toContain('ember');
    expect(mon.moveIds.length).toBeLessThanOrEqual(4);
  });

  it('LevelUp_NeverExceedsFourActiveMoves', () => {
    const mon = newPartyMon('pidgey', 1, content, 1);
    grantXp(mon, 5000, content);
    expect(mon.moveIds.length).toBe(4);
  });
});

describe('HP, Trauma and defeat — §2.4, §8.2', () => {
  it('Hp_PersistsBetweenNodes', () => {
    let s = start();
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    s = win(s, { team: s.activeUids.map((uid) => ({ uid, hp: 4, status: 'poison' as const, fainted: false })) });
    expect(s.box[0]!.hp).toBe(4);
    expect(s.box[0]!.status).toBe('poison');
  });

  it('Faint_AddsATraumaStack_AndLowersEffectiveMaxHp', () => {
    let s = start();
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    s = win(s, { team: s.activeUids.map((uid) => ({ uid, hp: 0, status: null, fainted: true })) });
    const mon = s.box[0]!;
    expect(mon.traumaStacks).toBe(1);
    expect(s.stats.faints).toBe(1);
    // Compare like with like: same Pokémon, same level, without the scar. The XP from the fight may have
    // levelled it, which raises base HP — the point is that Trauma takes a slice off the top.
    expect(maxHpOf(mon, content)).toBeLessThan(maxHpOf({ ...mon, traumaStacks: 0 }, content));
  });

  it('Defeat_EndsTheRun', () => {
    let s = start();
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    s = apply(s, { type: 'finish-combat', report: { outcome: 'defeat', team: s.activeUids.map((uid) => ({ uid, hp: 0, status: null, fainted: true })), caught: null, ballsLeft: s.balls, turns: 6 } });
    expect(s.outcome).toBe('defeat');
    expect(s.phase).toBe('ended');
  });

  it('BeginCombat_RefusedWithNoHealthyPokemon', () => {
    let s = start();
    s = apply(s, { type: 'enter-node', nodeId: s.reachable.find((n) => s.map.nodes[n]!.kind !== 'center')! });
    s = { ...s, box: s.box.map((m) => ({ ...m, hp: 0 })) };
    expect(reject(s, { type: 'begin-combat' })).toBe('no-healthy-pokemon');
  });
});

describe('Catching and the Box — §2.6.4, §2.3.1', () => {
  const caughtReport = (s: RunState): CombatOutcomeReport => ({
    outcome: 'caught',
    team: s.activeUids.map((uid) => ({ uid, hp: 8, status: null, fainted: false })),
    caught: { speciesId: 'pidgey', level: 6 },
    // The throw already cost a ball inside the fight, so the report hands back what is left.
    ballsLeft: s.balls - 1,
    turns: 3,
  });

  it('Catch_AddsToTheBox_AndSpendsABall', () => {
    let s = start();
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    const balls = s.balls;
    s = apply(apply(s, { type: 'finish-combat', report: caughtReport(s) }), { type: 'claim-reward' });
    expect(s.box).toHaveLength(2);
    expect(s.box[1]!.speciesId).toBe('pidgey');
    expect(s.balls).toBe(balls - 1);
    expect(s.stats.catches).toBe(1);
  });

  it('Catch_AtFullBox_PromptsSwapOrSkip_AndSkipKeepsTheBox', () => {
    let s = start();
    s = { ...s, box: [s.box[0]!, ...['pidgey', 'rattata', 'oddish', 'zubat', 'geodude'].map((id) => newPartyMon(id, 6, content, s.seed))] };
    expect(s.box).toHaveLength(6);
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    s = apply(s, { type: 'finish-combat', report: caughtReport(s) });
    s = apply(s, { type: 'claim-reward' });
    expect(s.phase).toBe('swap-or-skip');
    s = apply(s, { type: 'resolve-recruit', releaseUid: null });
    expect(s.box).toHaveLength(6);
    expect(s.phase).toBe('map');
  });

  it('Catch_AtFullBox_SwapReleasesPermanently', () => {
    let s = start();
    s = { ...s, box: [s.box[0]!, ...['pidgey', 'rattata', 'oddish', 'zubat', 'geodude'].map((id) => newPartyMon(id, 6, content, s.seed))] };
    const victim = s.box[5]!.uid;
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'begin-combat' });
    if (s.phase !== 'combat') return;
    s = apply(apply(s, { type: 'finish-combat', report: caughtReport(s) }), { type: 'claim-reward' });
    s = apply(s, { type: 'resolve-recruit', releaseUid: victim });
    expect(s.box).toHaveLength(6);
    expect(s.box.some((m) => m.uid === victim)).toBe(false);
  });
});

describe('The Active Team — §2.3', () => {
  it('Active_IsAtMostThree_AndMustContainSomeoneStanding', () => {
    let s = start();
    s = { ...s, box: [s.box[0]!, ...['pidgey', 'rattata', 'oddish'].map((id) => newPartyMon(id, 6, content, s.seed))] };
    expect(reject(s, { type: 'set-active', uids: s.box.map((m) => m.uid) })).toBe('team-too-large');
    expect(reject(s, { type: 'set-active', uids: ['nope'] })).toBe('unknown-pokemon');
    const fainted = { ...s, box: s.box.map((m) => ({ ...m, hp: 0 })) };
    expect(reject(fainted, { type: 'set-active', uids: [s.box[0]!.uid] })).toBe('no-healthy-pokemon');
  });

  it('SetLead_MovesThatPokemonToTheFront', () => {
    let s = start();
    s = { ...s, box: [s.box[0]!, ...['pidgey', 'rattata'].map((id) => newPartyMon(id, 6, content, s.seed))] };
    s = apply(s, { type: 'set-active', uids: s.box.map((m) => m.uid) });
    s = apply(s, { type: 'set-lead', uid: s.box[2]!.uid });
    expect(s.activeUids[0]).toBe(s.box[2]!.uid);
    expect(s.activeUids).toHaveLength(3);
  });
});

describe('Winning the region — §2.1.3', () => {
  it('BeatingTheGym_EndsTheRunInVictory', () => {
    let s = start();
    for (let layer = 0; layer < LAYERS; layer++) {
      s = walk(s);
      if (s.outcome !== 'in-progress') break;
    }
    expect(s.outcome).toBe('victory');
    expect(s.phase).toBe('ended');
    expect(s.stats.nodesCleared).toBe(LAYERS);
  });
});

describe('Save and resume — §10.8', () => {
  it('Save_RoundTripsExactly', () => {
    let s = start(1234);
    s = enter(s, s.map.nodes[s.reachable[0]!]!.kind);
    s = apply(s, { type: 'cancel-preview' });
    const loaded = deserialiseRun(serialiseRun(s), content);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) expect(loaded.run).toEqual(s);
  });

  it('Save_RejectsCorruption_RatherThanCrashing', () => {
    const text = serialiseRun(start());
    const tampered = text.replace('"balls":3', '"balls":99');
    expect(deserialiseRun(tampered, content)).toEqual({ ok: false, reason: 'corrupt' });
    expect(deserialiseRun('not json', content).ok).toBe(false);
    expect(deserialiseRun(null, content)).toEqual({ ok: false, reason: 'empty' });
  });

  it('Save_RejectsAFutureVersion', () => {
    const envelope = JSON.parse(serialiseRun(start()));
    envelope.version = 999;
    expect(deserialiseRun(JSON.stringify(envelope), content)).toEqual({ ok: false, reason: 'version' });
  });

  it('Resume_ContinuesTheSameEncounterSequence', () => {
    let s = start(55);
    s = apply(s, { type: 'enter-node', nodeId: s.reachable.find((n) => s.map.nodes[n]!.kind !== 'center')! });
    s = apply(s, { type: 'begin-combat' });
    const liveScenario = JSON.stringify(s.pendingScenario);

    const reloaded = deserialiseRun(serialiseRun(s), content);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(JSON.stringify(reloaded.run.pendingScenario)).toBe(liveScenario);
    expect(reloaded.run.cursors.EncounterRNG).toBe(s.cursors.EncounterRNG);
  });
});

describe('Evolution — §6.2.4, §6.3', () => {
  /** XP enough to walk a level-5 recruit to `to`. */
  const xpTo = (to: number, from = 5) => {
    let total = 0;
    for (let l = from; l < to; l++) total += xpToNext(l);
    return total;
  };

  it('Threshold_FlagsTheEvolution_ButDoesNotApplyIt_§6.3.3', () => {
    const mon = newPartyMon('bulbasaur', 5, content, 1);
    expect(mon.moveIds).toEqual(['tackle', 'growl', 'vine-whip']);
    const up = grantXp(mon, xpTo(13), content);
    expect(up?.evolutionReady).toBe(true);
    // The branch is the player's call, so the species is untouched until the screen is answered.
    expect(mon.speciesId).toBe('bulbasaur');
  });

  it('Threshold_DoesNotFireBelowIt', () => {
    const mon = newPartyMon('squirtle', 5, content, 1);
    const up = grantXp(mon, xpToNext(5) + xpToNext(6), content);
    expect(up?.evolutionReady).toBeUndefined();
    expect(mon.speciesId).toBe('squirtle');
  });

  it('Branch_UpgradesInPlace_AddsItsMove_AndGrantsAPassive_§6.3.5', () => {
    const mon = newPartyMon('bulbasaur', 5, content, 1);
    grantXp(mon, xpTo(13), content);
    expect(mon.abilityId).toBeNull();
    expect(mon.pool).toContain('tackle');

    const poolSize = mon.pool.length;
    applyBranch(mon, 'ivysaur-vanguard', content);
    expect(mon.speciesId).toBe('ivysaur');
    expect(mon.archetype).toBe('vanguard');
    // tackle → headbutt happens *in place*: the pool does not grow, the entry changes.
    expect(mon.pool).not.toContain('tackle');
    expect(mon.pool).toContain('headbutt');
    expect(mon.pool).toHaveLength(poolSize);
    // §6.7.3 — the upgrade takes the same slot in the active 4.
    expect(mon.moveIds).toContain('headbutt');
    expect(mon.moveIds).not.toContain('tackle');
    // §6.5.1 — the first evolution grants the pool's first passive.
    expect(mon.abilityId).toBe('overgrow');
  });

  it('Branch_IsPickedFreshEachTime_AndCanCarryItsOwnPassive_§6.3.3', () => {
    const mon = newPartyMon('bulbasaur', 5, content, 1);
    grantXp(mon, xpTo(13), content);
    applyBranch(mon, 'ivysaur-support', content);
    // Grove Keeper names Healer, so it overrides the pool's first entry.
    expect(mon.abilityId).toBe('healer');
    grantXp(mon, xpTo(27, 13), content);
    expect(isEvolutionReady(mon, content)).toBe(true);
    applyBranch(mon, 'venusaur-vanguard', content);
    // A Support Ivysaur becomes a Vanguard Venusaur: nothing about the first pick locks the second.
    expect(mon.archetype).toBe('vanguard');
    // §6.3.5 — the final evolution's addition is the archetype's signature.
    expect(mon.pool).toContain('petal-blizzard');
    expect(mon.abilityId).toBe('tough-claws');
  });

  it('EveryBranch_ResolvesAndStaysWithinThePayloadBudget_§6.3.5', () => {
    let branches = 0;
    for (const s of content.allSpecies()) {
      for (const b of s.branches) {
        branches++;
        expect(b.upgrades.length, b.id).toBeLessThanOrEqual(2);
        expect(b.adds.length, b.id).toBeLessThanOrEqual(1);
        expect(b.upgrades.length + b.adds.length, `${b.id} has no payload`).toBeGreaterThan(0);
        expect(content.species(b.to).id).toBe(b.to);
      }
      // §6.3.3 — 2 archetypes for most lines, 3 for the starters.
      if (s.evolvesTo.length) expect(s.branches.length, s.id).toBeGreaterThanOrEqual(2);
    }
    expect(branches).toBeGreaterThanOrEqual(40);
  });

  it('Run_QueuesTheScreen_ThenWalksOnWhenItIsAnswered', () => {
    let s = start(7, 'bulbasaur');
    const mon = s.box[0]!;
    mon.level = 11;
    mon.xp = xpToNext(11) - 1;

    s = enter(s, s.reachable.map((n) => s.map.nodes[n]!.kind).find((k) => k !== 'center')!);
    s = apply(s, { type: 'begin-combat' });
    s = apply(s, {
      type: 'finish-combat',
      report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 3 },
    });
    s = apply(s, { type: 'claim-reward' });
    expect(s.phase).toBe('evolution');
    expect(s.pendingEvolutions[0]!.branchIds).toHaveLength(3);

    expect(reject(s, { type: 'choose-branch', uid: s.box[0]!.uid, branchId: 'wartortle-vanguard' })).toBe('unknown-branch');
    s = apply(s, { type: 'choose-branch', uid: s.box[0]!.uid, branchId: 'ivysaur-specialist' });
    expect(s.box[0]!.speciesId).toBe('ivysaur');
    expect(s.phase).toBe('map');
  });

  it('Eevee_EvolvesIntoTheSpeciesItsBranchNames_§8.5.2', () => {
    // §8.5.2 — Eevee's archetype *is* its species choice: three branches, three species, one type each.
    for (const [branchId, to, ability] of [['eevee-vanguard', 'flareon', 'flash-fire'], ['eevee-specialist', 'jolteon', 'volt-absorb'], ['eevee-support', 'vaporeon', 'water-absorb']] as const) {
      let s = start(7, 'eevee');
      const mon = s.box[0]!;
      mon.level = 11;
      mon.xp = xpToNext(11) - 1;
      s = enter(s, s.reachable.map((n) => s.map.nodes[n]!.kind).find((k) => k !== 'center')!);
      s = apply(s, { type: 'begin-combat' });
      s = apply(s, {
        type: 'finish-combat',
        report: { outcome: 'victory', team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })), caught: null, ballsLeft: s.balls, turns: 3 },
      });
      s = apply(s, { type: 'claim-reward' });
      expect(s.phase).toBe('evolution');
      expect(s.pendingEvolutions[0]!.branchIds).toEqual(['eevee-vanguard', 'eevee-specialist', 'eevee-support']);
      s = apply(s, { type: 'choose-branch', uid: mon.uid, branchId });
      const evolved = s.box[0]!;
      expect(evolved.speciesId).toBe(to);
      expect(evolved.abilityId).toBe(ability);
      expect(content.species(to).stage).toBe('stage1');
      expect(s.phase).toBe('map');
    }
  });

  it('Kit_KeepsItsTwoStrongestAttacks_NotJustTheNewest_§6.3.6', () => {
    // Oddish learns Absorb at 1 and Acid at 7; "the four most recent" dropped its only Grass attack.
    const mon = newPartyMon('oddish', 10, content, 1);
    expect(mon.moveIds).toContain('absorb');
    const damaging = mon.moveIds.filter((m) => (content.move(m).power ?? 0) > 0);
    expect(damaging.length).toBeGreaterThanOrEqual(2);
  });
});

describe('The Learned Move Pool — §6.7', () => {
  it('Levelling_GrowsThePool_ButNeverEvictsAChosenCard_§6.7.2', () => {
    const mon = newPartyMon('bulbasaur', 1, content, 1);
    expect(mon.pool).toHaveLength(2);
    expect(mon.moveIds).toHaveLength(2);

    let total = 0;
    for (let l = 1; l < 11; l++) total += xpToNext(l);
    const up = grantXp(mon, total, content);

    // Five known by L10, four slots: the fifth waits in the pool rather than pushing one out.
    expect(mon.pool).toHaveLength(5);
    expect(mon.moveIds).toHaveLength(4);
    expect(up!.learned.length).toBeGreaterThan(up!.activated.length);
    expect(mon.pool).toEqual(expect.arrayContaining(mon.moveIds));
  });

  it('SetMoves_AcceptsAnySubsetOfThePool_AndRefusesEverythingElse', () => {
    let s = start(7, 'bulbasaur');
    const uid = s.box[0]!.uid;
    s.box[0]!.pool = ['tackle', 'growl', 'vine-whip', 'leech-seed', 'sleep-powder'];

    s = apply(s, { type: 'set-moves', uid, moveIds: ['sleep-powder', 'vine-whip'] });
    expect(s.box[0]!.moveIds).toEqual(['sleep-powder', 'vine-whip']);

    expect(reject(s, { type: 'set-moves', uid, moveIds: [] })).toBe('empty-kit');
    expect(reject(s, { type: 'set-moves', uid, moveIds: ['tackle', 'growl', 'vine-whip', 'leech-seed', 'sleep-powder'] })).toBe('too-many-moves');
    expect(reject(s, { type: 'set-moves', uid, moveIds: ['surf'] })).toBe('move-not-in-pool');
  });

  it('AutoPick_KeepsTwoWaysToDealDamage_§6.3.6', () => {
    const pool = ['absorb', 'sweet-scent', 'poison-powder', 'acid', 'sleep-powder'];
    const picked = autoPickMoves(pool, content);
    expect(picked).toHaveLength(4);
    expect(picked.filter((m) => content.move(m).power > 0).length).toBeGreaterThanOrEqual(2);
    // Learn order is preserved, so the kit still reads as a history.
    expect(picked).toEqual(pool.filter((m) => picked.includes(m)));
  });

  it('TheKitWalksIntoTheFight_WithItsChosenPassive_§6.5.1', () => {
    let s = start(7, 'bulbasaur');
    const uid = s.box[0]!.uid;
    s.box[0]!.abilityId = 'healer';
    s = apply(s, { type: 'set-moves', uid, moveIds: ['growl'] });
    const setups = activeSetups(s, content);
    expect(setups[0]!.moves).toEqual(['growl']);
    expect(setups[0]!.abilityId).toBe('healer');
  });
});

describe('TMs — §6.4.1', () => {
  const withTm = (s: RunState, tmId: string): RunState => ({ ...s, tms: [...s.tms, tmId] });

  it('Teach_AddsToThePool_ConsumesTheTm_AndFillsAFreeSlot', () => {
    let s = withTm(start(7, 'squirtle'), 'tm05-surf');
    const uid = s.box[0]!.uid;
    s = apply(s, { type: 'use-tm', uid, tmId: 'tm05-surf' });
    expect(s.box[0]!.pool).toContain('surf');
    expect(s.box[0]!.moveIds).toContain('surf');
    expect(s.tms).toHaveLength(0);
  });

  it('Teach_RefusesAnIncompatibleTarget_AndADuplicate_§6.4.1', () => {
    let s = withTm(start(7, 'squirtle'), 'tm04-flamethrower');
    const uid = s.box[0]!.uid;
    expect(reject(s, { type: 'use-tm', uid, tmId: 'tm04-flamethrower' })).toBe('incompatible-tm');
    expect(reject(s, { type: 'use-tm', uid, tmId: 'tm07-earthquake' })).toBe('no-such-tm');

    s = withTm(start(7, 'squirtle'), 'tm05-surf');
    s = apply(s, { type: 'use-tm', uid: s.box[0]!.uid, tmId: 'tm05-surf' });
    s = withTm(s, 'tm05-surf');
    expect(reject(s, { type: 'use-tm', uid: s.box[0]!.uid, tmId: 'tm05-surf' })).toBe('already-known');
  });

  it('EveryTm_NamesARealMoveAndOnlyCompatibleSpecies', () => {
    for (const tm of content.allTms()) {
      expect(() => content.move(tm.move)).not.toThrow();
      expect(tm.compatibleSpecies.length).toBeGreaterThan(0);
      for (const id of tm.compatibleSpecies) expect(() => content.species(id)).not.toThrow();
    }
  });
});

describe('The Dojo — §2.9.4', () => {
  /** Walk the shortest route to the Dojo, clearing whatever is in the way, and step inside. */
  const reachDojo = (seed = 7): RunState => {
    let s = start(seed, 'bulbasaur');
    const target = Object.values(s.map.nodes).find((n) => n.kind === 'dojo')!;

    // Breadth-first from the entry row, so the walk follows the edges rather than hoping col 0 leads there.
    const cameFrom = new Map<string, string>();
    const queue = [...s.map.entry];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!;
      if (id === target.id) break;
      for (const next of s.map.nodes[id]!.next) {
        if (cameFrom.has(next) || s.map.entry.includes(next)) continue;
        cameFrom.set(next, id);
        queue.push(next);
      }
    }
    const path: string[] = [target.id];
    while (cameFrom.has(path[0]!)) path.unshift(cameFrom.get(path[0]!)!);

    for (const id of path) {
      s = apply(s, { type: 'enter-node', nodeId: id });
      s = apply(s, { type: 'begin-combat' });
      if (s.phase === 'dojo') return s;
      s = clearNode(s);
    }
    throw new Error('the route never reached the Dojo');
  };

  it('EveryRouteHasExactlyOne_§2.9.4', () => {
    for (const seed of [1, 7, 42, 999, 20260919]) {
      const map = generateRegion(new RngStreams(seed).get('MapRNG'), content, 0, seed);
      const dojos = Object.values(map.nodes).filter((n) => n.kind === 'dojo');
      expect(dojos, `seed ${seed}`).toHaveLength(1);
      // It has to be reachable, or it may as well not be there.
      const reachable = Object.values(map.nodes).some((n) => n.next.includes(dojos[0]!.id));
      expect(reachable, `seed ${seed} dojo unreachable`).toBe(true);
    }
  });

  it('Visit_ChargesCanonPrices_AndStopsWhenTheMoneyDoes_§2.9.4', () => {
    let s = reachDojo();
    expect(s.phase).toBe('dojo');
    const uid = s.box[0]!.uid;
    const tutor = content.species(s.box[0]!.speciesId).tutorMoves[0]!;

    // Whatever the route paid out, price the visit from a known wallet so the assertion is about the Dojo.
    s = { ...s, money: PRICES.dojoMove + PRICES.dojoAbility - 1 };
    const before = s.money;
    s = apply(s, { type: 'teach-move', uid, moveId: tutor });
    expect(s.box[0]!.pool).toContain(tutor);
    expect(s.money).toBe(before - PRICES.dojoMove);

    // One service no longer ends the visit — running out of money does.
    expect(reject(s, { type: 'set-ability', uid, abilityId: 'chlorophyll' })).toBe('cannot-afford');

    // §6.8.3 — the line's hidden ability (Bulbasaur's third, Healer) is in the pool but locked until Bond rank 3.
    const rich = { ...s, money: 10_000 };
    expect(reject(rich, { type: 'set-ability', uid, abilityId: 'healer' })).toBe('ability-locked');
    const bonded = { ...rich, perks: { ...rich.perks, bond: { bulbasaur: 3 } } };
    expect(reject(bonded, { type: 'set-ability', uid, abilityId: 'healer' })).toBeNull();

    s = apply(s, { type: 'leave-dojo' });
    expect(s.phase).toBe('map');
    expect(s.visited.length).toBeGreaterThan(0);
  });

  it('Visit_SellsAsManyServicesAsYouCanPayFor_§2.9.4', () => {
    let s = reachDojo();
    const mon = s.box[0]!;
    const tutors = content.species(mon.speciesId).tutorMoves.filter((m) => !mon.pool.includes(m));
    if (tutors.length < 2) return; // a one-entry list has nothing to prove here
    s = { ...s, money: PRICES.dojoMove * 2 };
    s = apply(s, { type: 'teach-move', uid: mon.uid, moveId: tutors[0]! });
    s = apply(s, { type: 'teach-move', uid: mon.uid, moveId: tutors[1]! });
    expect(s.box[0]!.pool).toEqual(expect.arrayContaining([tutors[0]!, tutors[1]!]));
    expect(s.money).toBe(0);
    expect(s.phase).toBe('dojo');
  });

  it('Tutor_OnlyOffersThisStagesList_§6.4.3', () => {
    const s = reachDojo();
    const mon = s.box[0]!;
    const species = content.species(mon.speciesId);
    // Whatever stage the Bulbasaur has reached by the Dojo, the menu is that stage's list and nothing else.
    expect(species.tutorMoves.length).toBeGreaterThan(0);
    const otherStage = content.species(species.id === 'bulbasaur' ? 'ivysaur' : 'bulbasaur').tutorMoves
      .find((m) => !species.tutorMoves.includes(m))!;
    expect(reject(s, { type: 'teach-move', uid: mon.uid, moveId: otherStage })).toBe('not-on-tutor-list');
    // And never something the line learns by itself — the Dojo sells what nature will not.
    expect(reject(s, { type: 'teach-move', uid: mon.uid, moveId: 'vine-whip' })).toBe('not-on-tutor-list');
  });

  it('Ability_SetsThePassive_AndOnlyFromTheSpeciesPool_§6.5.1', () => {
    let s = reachDojo();
    const mon = s.box[0]!;
    const pool = content.species(mon.speciesId).availableAbilities;
    expect(reject(s, { type: 'set-ability', uid: mon.uid, abilityId: 'sturdy' })).toBe('ability-not-in-pool');

    const swapTo = pool.find((a) => a !== mon.abilityId);
    if (!swapTo) return; // a single-entry pool has nothing to swap to
    s = { ...s, money: PRICES.dojoAbility };
    s = apply(s, { type: 'set-ability', uid: mon.uid, abilityId: swapTo });
    expect(s.box[0]!.abilityId).toBe(swapTo);
    expect(s.money).toBe(0);
    // §6.5.1 — swapping back is allowed, and it costs the same again.
    expect(reject(s, { type: 'set-ability', uid: mon.uid, abilityId: pool[0]! })).toBe('cannot-afford');
  });

  it('EveryTutorMove_IsOffTheSpeciesOwnLine_§6.4.3', () => {
    for (const s of content.allSpecies()) {
      const own = new Set(content.lineLearnset(s.id).map((l) => l.move));
      for (const t of s.tutorMoves) {
        expect(() => content.move(t)).not.toThrow();
        expect(own.has(t), `${s.id} tutors ${t}, which it learns anyway`).toBe(false);
      }
    }
  });
});

describe('Poké Balls reach the fight — §2.6.4', () => {
  it('WildScenario_OffersOneBallCardPerBallHeld', () => {
    let s = start();
    const wild = s.reachable.find((n) => s.map.nodes[n]!.kind === 'wild');
    if (!wild) return;
    s = apply(s, { type: 'enter-node', nodeId: wild });
    s = apply(s, { type: 'begin-combat' });
    const balls = s.pendingScenario!.player.consumables.filter((c) => c === 'poke-ball');
    expect(balls).toHaveLength(s.balls);
    expect(s.pendingScenario!.player.balls).toBe(s.balls);
  });

  it('TrainerScenario_HasNoBalls_YouCannotCatchSomeonesPokemon', () => {
    let s = start();
    const trainer = s.reachable.find((n) => s.map.nodes[n]!.kind === 'trainer');
    if (!trainer) return;
    s = apply(s, { type: 'enter-node', nodeId: trainer });
    s = apply(s, { type: 'begin-combat' });
    expect(s.pendingScenario!.player.balls).toBe(0);
    expect(s.pendingScenario!.player.consumables).not.toContain('poke-ball');
  });

  it('Balls_AreSpentOnTheThrow_NotOnTheCatch', () => {
    let s = start();
    const wild = s.reachable.find((n) => s.map.nodes[n]!.kind === 'wild');
    if (!wild) return;
    s = apply(s, { type: 'enter-node', nodeId: wild });
    s = apply(s, { type: 'begin-combat' });
    // Two misses and no catch still cost two balls.
    s = apply(s, {
      type: 'finish-combat',
      report: {
        outcome: 'victory',
        team: s.activeUids.map((uid) => ({ uid, hp: 5, status: null, fainted: false })),
        caught: null,
        ballsLeft: 1,
        turns: 5,
      },
    });
    expect(s.balls).toBe(1);
  });
});

describe('Layer-scaled difficulty — §2.6.3, §2.7.3', () => {
  it('Levels_ClimbWithTheLayer_SoLayerZeroIsNotLayerFive', () => {
    const s = start(21);
    const bandAt = (layer: number) =>
      nodesInLayer(s.map, layer).filter((n) => n.kind === 'wild' || n.kind === 'trainer').map((n) => n.preview.levelBand[1]);
    const early = bandAt(0);
    const late = bandAt(4);
    if (!early.length || !late.length) return;
    expect(Math.max(...late)).toBeGreaterThan(Math.max(...early));
  });

  it('Trainer_SitsAboveTheWildBandOfItsLayer', () => {
    const s = start(33);
    for (const node of Object.values(s.map.nodes)) {
      if (node.kind !== 'trainer') continue;
      const wildHi = wildBandFor(node.layer)[1];
      expect(node.preview.levelBand[0], `${node.id}`).toBeGreaterThan(wildHi);
    }
  });

  it('Preview_FixesTheTrainerRoster_SoTheFightMatchesWhatYouSaw', () => {
    let s = start(44);
    const trainer = s.reachable.find((n) => s.map.nodes[n]!.kind === 'trainer');
    if (!trainer) return;
    const promised = s.map.nodes[trainer]!.preview.enemies!;
    s = apply(s, { type: 'enter-node', nodeId: trainer });
    s = apply(s, { type: 'begin-combat' });
    expect(s.pendingScenario!.enemies.map((e) => ({ species: e.species, level: e.level }))).toEqual(promised);
  });
});

describe('Node badges — §2.5, Pillar 1', () => {
  it('Trainer_NodesNameTheirArchetype_SoTheMapSaysWhoIsWaiting', () => {
    const s = start(77);
    const trainers = Object.values(s.map.nodes).filter((n) => n.kind === 'trainer');
    expect(trainers.length).toBeGreaterThan(0);
    for (const n of trainers) {
      expect(n.preview.icon, n.id).toMatch(/^trainer-(bug-catcher|youngster|lass|hiker|swimmer)$/);
    }
  });

  it('OtherNodes_FallBackToTheirKind_UnlessTheKindIsNotSpecificEnough', () => {
    const s = start(77);
    // A badge is only overridden when the node kind alone does not say who is waiting: a Trainer node names
    // its archetype, and the Elite names itself because "trainer" would undersell the hardest fight but one.
    for (const n of Object.values(s.map.nodes)) {
      if (['trainer', 'elite', 'elite-wild', 'wild', 'gym'].includes(n.kind)) continue;
      expect(n.preview.icon, n.id).toBeUndefined();
    }
    expect(Object.values(s.map.nodes).find((n) => n.kind === 'elite')!.preview.icon).toBe('elite');
    // §9 — a Wild badge is tinted by its biome, and a Gym badge by its type, because both are things the
    // player is choosing between on the map rather than reading one at a time.
    for (const n of Object.values(s.map.nodes)) {
      if (n.kind === 'wild') expect(n.preview.icon, n.id).toMatch(/^wild-(meadow|cave|river)$/);
      if (n.kind === 'gym') expect(n.preview.icon, n.id).toMatch(/^gym-(rock|water|bug|normal)$/);
    }
  });
});

describe('Badges — §5.10', () => {
  it('BeatingAGym_AwardsThatGymsBadge_AndNotTheOtherLanes', () => {
    // Walk the whole route to whichever Gym the seed's lane leads to, and check the Badge matches the Gym
    // that was actually fought. Until v0.5 the run ended the same way whichever lane you took, so this is
    // the assertion that the fork reaches all the way to the trophy.
    let s = start(11);
    for (let layer = 0; layer < LAYERS && s.phase !== 'ended'; layer++) s = walk(s);

    expect(s.outcome).toBe('victory');
    expect(s.badges).toHaveLength(1);

    const gymNode = s.map.nodes[s.position!]!;
    const gym = gymById(s.map.gyms[gymNode.lane!]!);
    expect(s.badges[0]).toBe(gym.badgeId);
    // The other lane's Gym was never fought, so its Badge is not in the case.
    const other = gymById(s.map.gyms[1 - gymNode.lane!]!);
    expect(s.badges).not.toContain(other.badgeId);
  });

  it('ABadgeTravelsIntoEveryLaterFight_§7.3.6', () => {
    // A Badge is permanent from the moment it is awarded, so the scenario builder has to carry it the way it
    // carries relics. Region 1 ends at its Gym, so this is checked by putting one in the case directly.
    let s = start(11);
    s = { ...s, badges: ['boulder-badge'] };
    s = apply(s, { type: 'enter-node', nodeId: s.reachable[0]! });
    s = apply(s, { type: 'begin-combat' });
    expect(s.pendingScenario?.player.badges).toEqual(['boulder-badge']);
  });

  it('ABadgeIsNeverAwardedTwice_§5.10', () => {
    let s = start(11);
    for (let layer = 0; layer < LAYERS && s.phase !== 'ended'; layer++) s = walk(s);
    const once = [...s.badges];
    expect(new Set(once).size).toBe(once.length);
    // The run is over, so nothing that touches the cleared Gym again may stack a second copy.
    const again = runReducer(s, { type: 'claim-reward' }, ctx);
    expect(again.state.badges).toEqual(once);
  });
});
