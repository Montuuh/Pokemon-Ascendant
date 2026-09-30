import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  arriveAtCity, createRun, daycarePrice, effectiveMax, defaultRunCtx, deserialiseRun, dojoPrice, eggMovesFor, newPartyMon, PRICES, runReducer, serialiseRun,
  type CombatOutcomeReport, type RunAction, type RunState,
} from '@/sim';

// §2.11.1 — the Center's Daycare and PC Box, and §2.9.4.2 — the Dojo's egg moves: the last doors of v0.7.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

/** A run standing in the City after `regionIndex`, a Box of `extra` more Pokémon beside the starter, all active. */
const inCity = (regionIndex = 0, money = 5000, extra = 2): RunState =>
  produce({ ...createRun('charmander', 7, ctx, regionIndex), money }, (d) => {
    const others = ['pidgey', 'rattata', 'oddish'].slice(0, extra).map((id, i) => newPartyMon(id, 10, content, 100 + i));
    d.box.push(...others);
    d.activeUids = d.box.slice(0, 3).map((m) => m.uid);
    arriveAtCity(d, ctx);
  });
const at = (s: RunState, building: 'center' | 'dojo' | 'ring') => apply(s, { type: 'enter-building', building });

const report = (s: RunState): CombatOutcomeReport => ({
  outcome: 'victory',
  team: s.activeUids.map((uid) => ({ uid, hp: 10, status: null, fainted: false })),
  caught: null,
  ballsLeft: 0,
  turns: 5,
});

describe('The Daycare — §2.11.1', () => {
  it('RaisesOneLevel_ForItsPrice_AndTakesThePokemonOutOfTheTeam', () => {
    const s = at(inCity(), 'center');
    const mon = s.box[1]!;
    const after = apply(s, { type: 'daycare', uid: mon.uid });
    const raised = after.box.find((m) => m.uid === mon.uid)!;
    expect(raised.level).toBe(mon.level + 1);
    // Inside the Center everyone is at full HP, the level's new HP too.
    expect(raised.hp).toBe(effectiveMax(after, raised, content));
    expect(after.money).toBe(s.money - daycarePrice(s, content));
    expect(daycarePrice(s, content)).toBe(PRICES.daycare);
    expect(after.resting).toBe(mon.uid);
    expect(after.activeUids).not.toContain(mon.uid);
    expect(after.city!.daycareUsed).toBe(true);
  });

  it('TakesOnePokemonAVisit', () => {
    const first = at(inCity(), 'center');
    const s = apply(first, { type: 'daycare', uid: first.box[1]!.uid });
    expect(reject(s, { type: 'daycare', uid: s.box[2]!.uid })).toBe('daycare-used');
  });

  it('NeedsSomeoneElseToFight_AndMoney_AndACenter', () => {
    const lone = at(inCity(0, 5000, 0), 'center');
    expect(reject(lone, { type: 'daycare', uid: lone.box[0]!.uid })).toBe('needs-another');
    const broke = at(inCity(0, 50), 'center');
    expect(reject(broke, { type: 'daycare', uid: broke.box[1]!.uid })).toBe('cannot-afford');
    const lobby = inCity();
    expect(reject(lobby, { type: 'daycare', uid: lobby.box[1]!.uid })).toBe('wrong-phase');
  });

  it('TheRestingPokemon_CannotRejoin_UntilAFightIsPlayed_ThenWalksBackIn', () => {
    const first = at(inCity(), 'center');
    let s = apply(first, { type: 'daycare', uid: first.box[1]!.uid });
    const uid = s.resting!;
    expect(reject(s, { type: 'set-active', uids: [uid] })).toBe('resting');
    s = apply(s, { type: 'leave-center' });
    // A Ring rung is a fight like any other: the rested Pokémon sits it out, then comes back.
    s = apply(apply(at(s, 'ring'), { type: 'enter-ring' }), { type: 'ring-fight' });
    expect(s.pendingScenario!.player.team).toHaveLength(s.activeUids.length);
    expect(s.activeUids).not.toContain(uid);
    s = apply(s, { type: 'finish-combat', report: report(s) });
    expect(s.resting).toBeNull();
    expect(s.activeUids).toContain(uid);
  });

  it('EmptyingTheTeam_StandsTheOthersIn', () => {
    let s = at(inCity(), 'center');
    s = apply(s, { type: 'set-active', uids: [s.box[0]!.uid] });
    s = apply(s, { type: 'daycare', uid: s.box[0]!.uid });
    expect(s.activeUids.length).toBeGreaterThan(0);
    expect(s.activeUids).not.toContain(s.box[0]!.uid);
  });

  it('AnEvolutionItBrings_IsQueued_AndHandsBackToTheCenter', () => {
    const s = produce(at(inCity(), 'center'), (d) => {
      const mon = d.box[1]!;
      const def = content.species(mon.speciesId);
      mon.level = def.evolveLevel! - 1;
      mon.xp = 0;
    });
    const after = apply(s, { type: 'daycare', uid: s.box[1]!.uid });
    expect(after.phase).toBe('evolution');
    expect(after.pendingEvolutions[0]!.returnTo).toBe('center');
    const pending = after.pendingEvolutions[0]!;
    const back = apply(after, { type: 'choose-branch', uid: pending.uid, branchId: pending.branchIds[0]! });
    expect(back.phase).toBe('center');
    const evolved = back.box.find((m) => m.uid === pending.uid)!;
    expect(evolved.hp).toBe(effectiveMax(back, evolved, content));
  });

  it('AVersion14Save_HasNobodyResting_AndTheDaycareOpen', () => {
    const s = at(inCity(), 'center');
    const old = JSON.parse(serialiseRun(s, 0));
    delete old.run.resting;
    delete old.run.city.daycareUsed;
    old.version = 14;
    old.checksum = JSON.parse(serialiseRun({ ...old.run }, 0)).checksum;
    const migrated = deserialiseRun(JSON.stringify(old), content);
    expect(migrated.ok && migrated.run.resting).toBeNull();
    expect(migrated.ok && migrated.run.city!.daycareUsed).toBe(false);
  });
});

describe('The PC Box — §2.11.1', () => {
  it('ChoosesTheTeamAndTheLead_InsideTheCenter', () => {
    let s = at(inCity(), 'center');
    const [a, b] = [s.box[1]!.uid, s.box[2]!.uid];
    s = apply(s, { type: 'set-active', uids: [a, b] });
    s = apply(s, { type: 'set-lead', uid: b });
    expect(s.activeUids).toEqual([b, a]);
  });
});

describe('Egg moves — §2.9.4.2', () => {
  it('AreTheLines_SoldToAnyStage_AtTheirOwnPrice', () => {
    const s = at(inCity(), 'dojo');
    const charmander = s.box[0]!;
    const eggs = eggMovesFor(charmander, content);
    expect(eggs).toEqual(content.species('charmander').eggMoves);
    // An evolved stage buys what its base would: the list is the line's, not the stage's.
    expect(eggMovesFor({ ...charmander, speciesId: 'charizard' }, content)).toEqual(eggs);
    const after = apply(s, { type: 'teach-egg-move', uid: charmander.uid, moveId: eggs[0]! });
    expect(after.box[0]!.pool).toContain(eggs[0]);
    expect(after.money).toBe(s.money - dojoPrice(s, content, 'egg'));
    expect(dojoPrice(s, content, 'egg')).toBe(PRICES.dojoEgg);
    expect(reject(after, { type: 'teach-egg-move', uid: charmander.uid, moveId: eggs[0]! })).toBe('already-known');
  });

  it('CostMoreInTheCity_AndOnlySellTheLinesOwn', () => {
    const town = at(inCity(0), 'dojo');
    const city = at(inCity(1), 'dojo');
    expect(dojoPrice(city, content, 'egg')).toBeGreaterThan(dojoPrice(town, content, 'egg'));
    expect(reject(town, { type: 'teach-egg-move', uid: town.box[0]!.uid, moveId: 'tackle' })).toBe('not-an-egg-move');
    expect(reject(inCity(), { type: 'teach-egg-move', uid: town.box[0]!.uid, moveId: eggMovesFor(town.box[0]!, content)[0]! })).toBe('wrong-phase');
  });
});
