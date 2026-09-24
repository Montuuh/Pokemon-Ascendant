import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { buildRegistry } from '@/content/registry';
import {
  afterTurn, arriveAtCity, BIOMES, BIOMES_R2, BIOMES_R3, coneOf, createRun, defaultRunCtx, deserialiseRun, notices, planOf, regionContent,
  runReducer, SAFARI, serialiseRun, throwOdds, tileAt, traitsOf,
  type RunAction, type RunState, type SafariHunt, type SafariSpot,
} from '@/sim';

// §2.11.6 — the Safari Zone: the ticket, the lineup, and the stalk.

const content = buildRegistry();
const ctx = defaultRunCtx(content);

const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const reject = (s: RunState, a: RunAction) => runReducer(s, a, ctx).rejected ?? null;

const inCity = (regionIndex = 0, money = 5000, seed = 7): RunState =>
  produce({ ...createRun('squirtle', seed, ctx, regionIndex), money }, (d) => arriveAtCity(d, ctx));
const inPark = (regionIndex = 0, seed = 7) => apply(apply(inCity(regionIndex, 5000, seed), { type: 'enter-building', building: 'safari' }), { type: 'enter-safari' });

/** A hand-built board: all grass unless drawn, the Pokémon at `mon` facing `facing`, on a straight beat. */
function board(rows: string[], over: Partial<SafariHunt> = {}): SafariHunt {
  const width = rows[0]!.length;
  const tiles = rows.join('').replace(/[PM]/g, 'g');
  const find = (c: string): [number, number] => {
    const i = rows.join('').indexOf(c);
    return [i % width, Math.floor(i / width)];
  };
  const mon = find('M');
  return {
    spot: 0, width, height: rows.length, tiles, player: find('P'), mon, facing: 's',
    patrol: [mon, [mon[0] + 1, mon[1]]], patrolIndex: 0, alarms: 0, seen: false, ap: SAFARI.ap,
    bait: null, eating: 0, held: false, heldLast: false, lastThrow: null, turn: 1, ...over,
  };
}
const common: SafariSpot = { species: 'paras', tier: 'common', level: 12, result: null };

describe('The Safari Zone — §2.11.6', () => {
  it('IsRolledOnArrival_ThreeInTheTown_FourInTheCity_AtTheNextRegionsFloor', () => {
    const town = inCity(0).city!.safari!;
    const city = inCity(1).city!.safari!;
    expect(town.lineup.map((l) => l.tier)).toEqual(SAFARI.cities['pallet-town'].lineup);
    expect(city.lineup.map((l) => l.tier)).toEqual(SAFARI.cities['celadon-city'].lineup);
    const floor = regionContent(1).wildBand[0];
    for (const l of town.lineup) {
      expect(l.level).toBeGreaterThanOrEqual(floor);
      expect(l.level).toBeLessThanOrEqual(floor + SAFARI.levelSpread);
    }
    expect(new Set(city.lineup.map((l) => l.species)).size).toBe(city.lineup.length);
  });

  it('NoSafariSpecies_IsOfferedByAnyRoute', () => {
    // The exit criterion: a recruit no route could have given. Every line in any biome of any Region is out.
    const lineOf = (id: string): string[] => {
      const out = [id];
      for (let i = 0; i < out.length; i++) out.push(...(content.species(out[i]!).evolvesTo ?? []));
      return out;
    };
    const routed = new Set(
      [BIOMES, BIOMES_R2, BIOMES_R3].flatMap((b) => Object.values(b).flatMap((p) => [...p!.common, ...p!.uncommon, ...p!.rare])).flatMap(lineOf),
    );
    for (const pools of Object.values(SAFARI.pools)) {
      for (const id of Object.values(pools).flat()) {
        expect(content.species(id).stage, id).toBe('basic');
        expect(routed.has(id), id).toBe(false);
      }
    }
    // Dratini is the big city's.
    expect(Object.values(SAFARI.pools['pallet-town']).flat()).not.toContain('dratini');
    expect(SAFARI.pools['celadon-city'].rare).toContain('dratini');
  });

  it('Ticket_PaysTheFee_OncePerVisit', () => {
    const s = apply(inCity(0, 1000), { type: 'enter-building', building: 'safari' });
    expect(s.phase).toBe('safari');
    expect(reject({ ...s, money: 10 }, { type: 'enter-safari' })).toBe('cannot-afford');
    expect(reject(s, { type: 'safari-approach', spot: 0 })).toBe('safari-closed');
    const paid = apply(s, { type: 'enter-safari' });
    expect(paid.money).toBe(1000 - SAFARI.cities['pallet-town'].fee);
    const out = apply(paid, { type: 'leave-safari' });
    expect(out.phase).toBe('city');
    const back = apply(out, { type: 'enter-building', building: 'safari' });
    expect(reject(back, { type: 'enter-safari' })).toBe('safari-closed');
    expect(reject(back, { type: 'safari-approach', spot: 0 })).toBe('safari-closed');
  });

  it('Approach_LaysOutABoard_YouEnterAtTheBottom_ItWalksItsBeat', () => {
    const s = apply(inPark(), { type: 'safari-approach', spot: 0 });
    const h = s.city!.safari!.hunt!;
    const tr = traitsOf(s.city!.safari!.lineup[0]!);
    expect(h.width).toBe(tr.size);
    expect(h.player[1]).toBe(h.height - 1);
    expect(h.patrol.some((p) => p[0] === h.mon[0] && p[1] === h.mon[1])).toBe(true);
    expect(reject(s, { type: 'leave-safari' })).toBe('safari-closed');
    expect(reject(s, { type: 'safari-approach', spot: 1 })).toBe('safari-closed');
  });

  it('Step_OneTileOneAction_TheLastEndsTheTurn', () => {
    let s = apply(inPark(), { type: 'safari-approach', spot: 0 });
    const h = s.city!.safari!.hunt!;
    expect(reject(s, { type: 'safari-step', x: h.player[0], y: h.player[1] - 2 })).toBe('bad-tile');
    s = apply(s, { type: 'safari-step', x: h.player[0], y: h.player[1] - 1 });
    expect(s.city!.safari!.hunt!.ap).toBe(SAFARI.ap - 1);
    // The last action ends the turn: it moves, the clock ticks, and the actions come back.
    const clock = s.city!.safari!.clock;
    const p = s.city!.safari!.hunt!.player;
    s = apply(s, { type: 'safari-step', x: p[0], y: p[1] + 1 });
    expect(s.city!.safari!.clock).toBe(clock - 1);
    expect(s.city!.safari!.hunt?.ap ?? SAFARI.ap).toBe(SAFARI.ap);
  });

  it('Wait_ItWalksThePlanItShowed_AndTheClockTicks', () => {
    const s = apply(inPark(), { type: 'safari-approach', spot: 0 });
    const safari = s.city!.safari!;
    const plan = planOf(safari.hunt!, safari.lineup[0]!);
    const after = apply(s, { type: 'safari-wait' });
    expect(after.city!.safari!.hunt!.mon).toEqual(plan.steps.at(-1) ?? safari.hunt!.mon);
    expect(after.city!.safari!.clock).toBe(safari.clock - 1);
    expect(after.city!.safari!.hunt!.ap).toBe(SAFARI.ap);
  });

  it('Cone_WidensWithDistance_AndARockBlocksIt', () => {
    const h = board(['ggMgg', 'ggggg', 'ggggg', 'ggggg'], { facing: 's' });
    const cone = coneOf(h, common);
    // Sight 2 for a common: one tile at 1, three at 2.
    expect(cone).toHaveLength(1 + 3);
    const blocked = board(['ggMgg', 'ggrgg', 'ggggg', 'ggggg'], { facing: 's' });
    expect(coneOf(blocked, common).some((p) => p[0] === 2 && p[1] === 2)).toBe(false);
  });

  it('Grass_HidesYou_ExceptTheTileInFront_OpenGroundDoesNot', () => {
    const inGrass = board(['ggMgg', 'ggggg', 'ggPgg'], { facing: 's' });
    expect(notices(inGrass, common, inGrass.player)).toBe(false);
    const inFront = board(['ggMgg', 'ggPgg', 'ggggg'], { facing: 's' });
    expect(notices(inFront, common, inFront.player)).toBe(true);
    const inTheOpen = board(['ggMgg', 'ggggg', 'ggogg'], { facing: 's' });
    expect(notices({ ...inTheOpen, player: [2, 2] }, common, [2, 2])).toBe(true);
    // Behind it, nothing.
    const behind = board(['ggPgg', 'ggMgg', 'ggggg'], { facing: 's' });
    expect(notices(behind, common, behind.player)).toBe(false);
  });

  it('SharpEars_HearYouThroughTheGrass_UnlessItIsEating', () => {
    const pinsir: SafariSpot = { species: 'pinsir', tier: 'rare', level: 12, result: null };
    const h = board(['PgMgg', 'ggggg', 'ggggg'], { facing: 's' });
    expect(notices(h, pinsir, h.player)).toBe(true);
    expect(notices({ ...h, eating: 2 }, pinsir, h.player)).toBe(false);
  });

  it('Throw_IsBetterUnseen_FromBehind_Close_AndWhileItEats', () => {
    const near = board(['ggPgg', 'ggMgg', 'ggggg'], { facing: 's' });
    const far = board(['ggPgg', 'ggggg', 'ggMgg'], { facing: 's' });
    const oNear = throwOdds(near, common, content)!;
    const oFar = throwOdds(far, common, content)!;
    expect(oNear.behind).toBe(true);
    expect(oNear.chance).toBeGreaterThan(oFar.chance);
    expect(throwOdds({ ...near, seen: true }, common, content)!.chance).toBeLessThan(oNear.chance);
    const three = board(['ggPgg', 'ggggg', 'ggggg', 'ggMgg']);
    expect(throwOdds(three, common, content)).toBeNull();
    const rare: SafariSpot = { species: 'chansey', tier: 'rare', level: 12, result: null };
    expect(throwOdds(far, rare, content)!.chance).toBeLessThan(oFar.chance);
  });

  it('Rock_HoldsItAndTurnsIt_NeverTwoTurnsRunning', () => {
    const h = board(['gggggg', 'ggMggg', 'gggggg', 'gggPgg'], { facing: 'e', patrol: [[2, 1], [3, 1]] });
    const s0 = afterTurn(h, common);
    expect(s0.mon).toEqual([3, 1]);
    const held = { ...h, held: true, facing: 'w' as const };
    expect(afterTurn(held, common).mon).toEqual([2, 1]);
    expect(afterTurn(held, common).facing).toBe('w');
  });

  it('Bait_DrawsIt_ThenItEats_LookingOneTileAhead', () => {
    const h = board(['gggggg', 'gMgggg', 'gggggg', 'ggggPg', 'gggggg'], { facing: 'e', patrol: [[1, 1], [2, 1]], bait: [1, 3] });
    const plan = planOf(h, common);
    expect(plan.steps.at(-1)).toEqual([1, 2]);
    const next = { ...h, mon: [1, 2] as [number, number] };
    const eatPlan = planOf(next, common);
    expect(eatPlan.eats).toBe(true);
    expect(afterTurn(next, common).eating).toBe(SAFARI.eatTurns);
    expect(afterTurn(next, common).cone.length).toBe(1);
  });

  it('LastAlarm_SendsItOff', () => {
    let s = apply(inPark(), { type: 'safari-approach', spot: 0 });
    // Stand in the open in front of it and wait until it bolts.
    s = produce(s, (d) => {
      const h = d.city!.safari!.hunt!;
      h.alarms = traitsOf(d.city!.safari!.lineup[0]!).temper - 1;
      const f = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[h.facing];
      h.held = true;
      h.player = [h.mon[0] + f[0]!, h.mon[1] + f[1]!];
      h.tiles = h.tiles.split('').map((t, i) => (i === h.player[1] * h.width + h.player[0] ? 'o' : t)).join('');
    });
    if (tileAt(s.city!.safari!.hunt!, ...s.city!.safari!.hunt!.player) === null) return;
    const after = apply(s, { type: 'safari-wait' });
    expect(after.city!.safari!.hunt).toBeNull();
    expect(after.city!.safari!.lineup[0]!.result).toBe('fled');
  });

  it('ACatch_JoinsTheBox_AndTheSafariGoesOn', () => {
    // Put the player right behind it, unseen, and throw until the stream says yes (seeded, so it is fixed).
    for (let seed = 1; seed < 40; seed++) {
      let s = apply(inPark(0, seed), { type: 'safari-approach', spot: 0 });
      s = produce(s, (d) => {
        const h = d.city!.safari!.hunt!;
        const f = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[h.facing];
        h.tiles = h.tiles.replace(/[rw]/g, 'g');
        h.player = [h.mon[0] - f[0]!, h.mon[1] - f[1]!];
      });
      if (reject(s, { type: 'safari-throw' })) continue;
      const before = s.box.length;
      s = apply(s, { type: 'safari-throw' });
      if (s.city!.safari!.lineup[0]!.result !== 'caught') continue;
      while (s.phase === 'evolution') s = apply(s, { type: 'choose-branch', uid: s.pendingEvolutions[0]!.uid, branchId: s.pendingEvolutions[0]!.branchIds[0]! });
      expect(s.phase).toBe('safari');
      expect(s.box.length).toBe(before + 1);
      expect(s.city!.safari!.balls).toBe(SAFARI.cities['pallet-town'].balls - 1);
      expect(s.city!.safari!.done).toBe(false);
      return;
    }
    throw new Error('no seed caught at the cap in 40 tries');
  });

  it('AFullBox_GoesToSwapOrSkip_AndBackToThePark', () => {
    for (let seed = 1; seed < 40; seed++) {
      let s = apply(inPark(0, seed), { type: 'safari-approach', spot: 0 });
      s = produce(s, (d) => {
        while (d.box.length < 6) d.box.push({ ...d.box[0]!, uid: `pad${d.box.length}` });
        const h = d.city!.safari!.hunt!;
        const f = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[h.facing];
        h.tiles = h.tiles.replace(/[rw]/g, 'g');
        h.player = [h.mon[0] - f[0]!, h.mon[1] - f[1]!];
      });
      if (reject(s, { type: 'safari-throw' })) continue;
      s = apply(s, { type: 'safari-throw' });
      if (s.phase !== 'swap-or-skip') continue;
      s = apply(s, { type: 'resolve-recruit', releaseUid: null });
      expect(s.phase).toBe('safari');
      return;
    }
    throw new Error('no seed caught in 40 tries');
  });

  it('Save_CarriesTheSafari_AndAVersion11CityHasNone', () => {
    const s = apply(inPark(), { type: 'safari-approach', spot: 1 });
    const loaded = deserialiseRun(serialiseRun(s, 0), content);
    expect(loaded.ok && loaded.run.city!.safari!.hunt!.spot).toBe(1);
    const old = JSON.parse(serialiseRun(inCity(0), 0));
    delete old.run.city.safari;
    old.version = 11;
    const { checksum } = JSON.parse(serialiseRun({ ...old.run }, 0));
    old.checksum = checksum;
    const migrated = deserialiseRun(JSON.stringify(old), content);
    expect(migrated.ok && migrated.run.city!.safari).toBeNull();
  });
});
