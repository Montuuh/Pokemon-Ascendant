import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ALL_GYMS, createRun, defaultRunCtx, evolvedAt, GYM_ROSTER, gymById, gymTeamFor, legacyGymTeamFor, runReducer, STARTER_IDS,
  type RunAction, type RunState,
} from '@/sim';
import { LEGENDARY_IDS } from './legendaries';
import { TEAM_SIZE } from './region';

// v0.9.88 — the twelve authored Gym teams (§5.9.3, `catalogs/gyms.md` §7): five explicit members, never padded,
// validated on the forms actually fielded; and a map saved before them keeps the roster its preview promised.

const content = buildRegistry();
const ctx = defaultRunCtx(content);
const apply = (s: RunState, a: RunAction): RunState => {
  const r = runReducer(s, a, ctx);
  if (r.rejected) throw new Error(`run action ${a.type} rejected: ${r.rejected}`);
  return r.state;
};
const fielded = (id: string) => gymTeamFor(gymById(id)).map((m) => ({ ...m, species: evolvedAt(m.species, m.level, content) }));

describe('Authored Gym teams — §5.9.3', () => {
  it('EveryGym_FieldsFiveDistinctSpeciesAndLines_AfterEvolution', () => {
    expect(ALL_GYMS).toHaveLength(12);
    for (const gym of ALL_GYMS) {
      const team = fielded(gym.id);
      expect(team, gym.id).toHaveLength(TEAM_SIZE.gym[gym.region - 1]!);
      expect(new Set(team.map((m) => m.species)).size, `${gym.id} species`).toBe(team.length);
      expect(new Set(team.map((m) => content.lineBase(m.species))).size, `${gym.id} lines`).toBe(team.length);
    }
  });

  it('EveryGym_KeepsItsType_WithAtMostOneDeclaredGuest_AndTheAceLast', () => {
    for (const gym of ALL_GYMS) {
      const team = fielded(gym.id);
      const offType = team.filter((m) => !content.species(m.species).types.includes(gym.type));
      // §5.9.3 — at least four share the type; the one that does not is the declared guest, and only it.
      expect(offType.length, gym.id).toBeLessThanOrEqual(1);
      expect(offType.map((m) => m.species), gym.id).toEqual(team.filter((m) => m.guest).map((m) => m.species));
      const ace = team.at(-1)!;
      expect(ace.guest, gym.id).toBeUndefined();
      expect(team.map((m) => m.phaseCount), gym.id).toEqual([2, 1, 1, 1, 3]);
      expect(ace.signature, gym.id).toBeDefined();
      expect(ace.moves, gym.id).toContain(ace.signature!.move);
    }
  });

  it('EveryMember_CarriesFourRealMoves_AndNoStarterOrLegendaryLine', () => {
    const banned = new Set([...STARTER_IDS, ...LEGENDARY_IDS]);
    for (const gym of ALL_GYMS) {
      for (const m of fielded(gym.id)) {
        expect(m.moves, `${gym.id} ${m.species}`).toHaveLength(4);
        expect(new Set(m.moves).size, `${gym.id} ${m.species}`).toBe(4);
        for (const id of m.moves!) expect(() => content.move(id), `${gym.id} ${m.species} ${id}`).not.toThrow();
        expect(banned.has(content.lineBase(m.species)), `${gym.id} ${m.species}`).toBe(false);
      }
    }
  });

  it('ANewMap_PromisesTheAuthoredRoster_AndNamesTheGuest_§2.7.3', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const map = createRun('squirtle', seed, ctx).map;
      for (const n of Object.values(map.nodes).filter((x) => x.kind === 'gym')) {
        const gym = gymById(map.gyms[n.lane!]!);
        seen.add(gym.id);
        expect(n.preview.gymRoster).toBe(GYM_ROSTER);
        expect(n.preview.enemies?.map((m) => m.species)).toEqual(fielded(gym.id).map((m) => m.species));
        const guest = gym.team.find((m) => m.guest);
        expect(n.preview.guest?.species).toBe(guest?.species);
      }
    }
    // Brock and Aster declare a guest; Misty and Whitney do not.
    expect(seen.size).toBe(4);
  });
});

describe('Save compatibility — a map saved before v0.9.88', () => {
  function fight(preview: RunState['map']['nodes'][string]['preview'], gymId: string): RunState {
    // Region 3: its run starts on the route (Region 1 opens in a town).
    let s = createRun('squirtle', 7, ctx, 2);
    const lane = s.map.gyms.indexOf(gymId) >= 0 ? s.map.gyms.indexOf(gymId) : 0;
    s = { ...s, map: { ...s.map, gyms: s.map.gyms.map((g, i) => (i === lane ? gymId : g)) } };
    const node = { id: 'g', layer: 11, col: 0, row: 0, lane, kind: 'gym' as const, next: [], preview };
    s = { ...s, map: { ...s.map, nodes: { ...s.map.nodes, g: node } }, reachable: ['g'] };
    return apply(apply(s, { type: 'enter-node', nodeId: 'g' }), { type: 'begin-combat' });
  }

  it('AnOldPreview_FightsItsLegacyRoster_NeverTheNewSlotsMoves', () => {
    // Lorelei's v0.9.87 ace was Cloyster; the authored five end on Lapras.
    const legacy = legacyGymTeamFor(gymById('ice-gym-r3'));
    const enemies = legacy.map((m) => ({ species: evolvedAt(m.species, m.level, content), level: m.level }));
    const s = fight({ title: 'Lorelei', detail: '', speciesIds: enemies.map((m) => m.species), levelBand: [0, 0], enemies }, 'ice-gym-r3');
    const fought = s.pendingScenario!.enemies;
    expect(fought.map((e) => e.species)).toEqual(enemies.map((m) => m.species));
    expect(fought.map((e) => e.phaseCount)).toEqual(legacy.map((m) => m.phaseCount));
    // The padded legacy slots fight their own learnset, not the new slots' scripted kits; the ace stays Cloyster.
    expect(fought[1]!.moves?.slice(0, 4)).not.toEqual(gymById('ice-gym-r3').team[1]!.moves);
    expect(fought.at(-1)!.species).toBe('cloyster');
    expect(fought.at(-1)!.signature?.move).toBe('ice-beam');
  });

  it('ANewPreview_FightsTheAuthoredFive_WithTheirKits', () => {
    const team = fielded('ice-gym-r3');
    const enemies = team.map((m) => ({ species: m.species, level: m.level }));
    const s = fight({ title: 'Lorelei', detail: '', speciesIds: [], levelBand: [0, 0], enemies, gymRoster: GYM_ROSTER }, 'ice-gym-r3');
    const fought = s.pendingScenario!.enemies;
    expect(fought.map((e) => e.species)).toEqual(team.map((m) => m.species));
    expect(fought.at(-1)!.species).toBe('lapras');
    // The Region's accent may append a status move (§2.2); the four authored moves arrive whole.
    fought.forEach((e, i) => expect(e.moves!.slice(0, 4), e.species).toEqual(team[i]!.moves));
  });
});
