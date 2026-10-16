import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { POKEMON_TYPES, PRIMARY_STATUSES, createCombat, DEFAULT_BATTLE_CONFIG, type CombatEvent, type CombatState, type RunState } from '@/sim';
import { inTension, trackFor } from './director';
import { degreeToMidi, notesForBar, TRACK_IDS, TRACKS } from './music';
import { SFX, sfxForEvent, STATUS_STING, stepsOf, TYPE_TIMBRE, type SfxId } from './sfx';

// §9.5 — the sound as data: every type has its whoosh, every status its sting, every event the sound it should make,
// every track a well-formed score — and where each track plays. Web Audio itself is not under test: nothing here plays.

const content = buildRegistry();
const look = { isPlayer: (uid: string) => uid.startsWith('p'), moveType: (id: string) => content.move(id).type };

describe('Sound effects — §9.5.3', () => {
  it('EveryType_HasItsWhoosh_EveryStatus_ItsSting', () => {
    for (const t of POKEMON_TYPES) expect(TYPE_TIMBRE[t]?.length, t).toBeGreaterThan(0);
    for (const s of [...PRIMARY_STATUSES, 'confusion' as const]) expect(STATUS_STING[s]?.length, s).toBeGreaterThan(0);
  });

  it('EveryRecipe_IsAudibleAndSafe_NoStepLouderThanOne', () => {
    const ids: SfxId[] = [...(Object.keys(SFX) as SfxId[]), ...POKEMON_TYPES.map((t) => `card-${t}` as SfxId)];
    for (const id of ids) {
      const steps = stepsOf(id);
      expect(steps.length, id).toBeGreaterThan(0);
      for (const s of steps) {
        expect(s.dur, id).toBeGreaterThan(0);
        expect(s.gain, id).toBeGreaterThan(0);
        expect(s.gain, id).toBeLessThanOrEqual(1);
      }
    }
  });

  it('SfxForEvent_ACardSoundsItsType_AHitSoundsHowItLanded', () => {
    const played = { t: 'card-played', cardId: 'c', moveId: 'ember', ownerUid: 'p1', targetUid: 'e1', apCost: 1, seq: 0, turn: 1 } as CombatEvent;
    expect(sfxForEvent(played, look)).toEqual(['card-fire']);
    const hit = (effectiveness: string, crit = false) => ({ t: 'damage', sourceUid: 'p1', targetUid: 'e1', amount: 10, crit, effectiveness, hpAfter: 5, cause: 'move', seq: 0, turn: 1 }) as CombatEvent;
    expect(sfxForEvent(hit('double'), look)).toEqual(['hit-super']);
    expect(sfxForEvent(hit('half'), look)).toEqual(['hit-resisted']);
    expect(sfxForEvent(hit('neutral', true), look)).toEqual(['hit', 'crit']);
    expect(sfxForEvent({ t: 'status-applied', targetUid: 'e1', status: 'burn', seq: 0, turn: 1 } as CombatEvent, look)).toEqual(['status-burn']);
    expect(sfxForEvent({ t: 'swap', fromIndex: 0, toIndex: 1, kind: 'step-forward', apCost: 1, seq: 0, turn: 1 } as CombatEvent, look)).toEqual(['step-forward']);
    expect(sfxForEvent({ t: 'outcome', outcome: 'defeat', seq: 0, turn: 1 } as CombatEvent, look)).toEqual(['defeat']);
    // An intent is read, not heard.
    expect(sfxForEvent({ t: 'turn-start', ap: 3, seq: 0, turn: 1 } as CombatEvent, look)).toEqual([]);
  });
});

describe('Music — §9.5.4', () => {
  it('EveryTrack_IsWellFormed_FourBarsRound_TwoBarsOfLead', () => {
    for (const id of TRACK_IDS) {
      const t = TRACKS[id];
      expect(t.bpm, id).toBeGreaterThanOrEqual(80);
      expect(t.bpm, id).toBeLessThanOrEqual(170);
      expect(t.progression, id).toHaveLength(4);
      expect(t.lead, id).toHaveLength(16);
      for (let bar = 0; bar < 4; bar++) {
        for (const n of notesForBar(t, bar)) {
          expect(n.at, id).toBeGreaterThanOrEqual(0);
          expect(n.at, id).toBeLessThan(4);
          if (n.midi) {
            expect(n.midi, id).toBeGreaterThanOrEqual(24);
            expect(n.midi, id).toBeLessThanOrEqual(108);
          }
        }
      }
    }
  });

  it('Tension_AddsToTheBar_NeverTakesAway', () => {
    for (const id of TRACK_IDS) expect(notesForBar(TRACKS[id], 0, true).length, id).toBeGreaterThan(notesForBar(TRACKS[id], 0).length);
  });

  it('DegreeToMidi_WrapsUpAnOctavePastTheScale', () => {
    const major = [0, 2, 4, 5, 7, 9, 11];
    expect(degreeToMidi(60, major, 0)).toBe(60);
    expect(degreeToMidi(60, major, 7)).toBe(72);
    expect(degreeToMidi(60, major, -1)).toBe(59);
  });

  it('TrackFor_FollowsTheScreenTheZoneAndTheFight', () => {
    const run = (over: Partial<RunState>) => ({ regionIndex: 0, city: null, ...over }) as RunState;
    expect(trackFor('menu', null, null)).toBe('title');
    expect(trackFor('map', run({}), null)).toBe('region-1');
    expect(trackFor('map', run({ regionIndex: 2 }), null)).toBe('region-3');
    expect(trackFor('map', run({ city: {} as RunState['city'] }), null)).toBe('city');
    expect(trackFor('map', run({ zone: 'victory-road' }), null)).toBe('victory-road');
    expect(trackFor('map', run({ zone: 'league' }), null)).toBe('league');
    const fight = (over: Partial<CombatState>) => ({ kind: 'wild', enemies: [], ...over }) as unknown as CombatState;
    expect(trackFor('combat', null, fight({}))).toBe('combat');
    expect(trackFor('combat', null, fight({ kind: 'boss' }))).toBe('boss');
    expect(trackFor('combat', null, fight({ kind: 'boss', gymRule: 'synergy' }))).toBe('champion');
    expect(trackFor('victory', null, null)).toBeNull();
  });

  it('InTension_UnderAThirdOfTheTeamsHp', () => {
    const s = createCombat(content.scenario('wild-basic'), { content, config: DEFAULT_BATTLE_CONFIG });
    expect(inTension(s)).toBe(false);
    for (const m of s.player.team) m.hp = Math.floor(m.maxHp * 0.2);
    expect(inTension(s)).toBe(true);
  });
});
