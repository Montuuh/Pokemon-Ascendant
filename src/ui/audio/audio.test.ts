import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { POKEMON_TYPES, PRIMARY_STATUSES, createCombat, DEFAULT_BATTLE_CONFIG, type CombatEvent, type CombatState, type RunState } from '@/sim';
import { catchTimeline, FX_MS } from '@/ui/hooks/useCombatFx';
import { dcOf, loudnessOf, render, type Pcm } from './chip';
import { battleTrack, inTension, trackFor, tracksAhead, victoryTrack } from './director';
import { INSTRUMENTS } from './instruments';
import { measureTrack, positionAfter, renderTrack, TrackCache } from './music';
import { BAR, echoOf, expand, lineOf, parseChannel, TPQ, WRAP, type Song } from './score';
import { sampleOf, SFX, sfxForEvent, sfxIds, SONG_CEILING, SONG_RMS, STATUS_STING, stepsOf, TYPE_TIMBRE, type SfxId } from './sfx';
import { JINGLES, over, TRACK_IDS, TRACKS } from './songs';
import { clipAt, CLIP_KNEE } from './synth';
import { buttonSfx, catchSounds } from './useAudio';

// §9.5 — the sound as data, and as samples: every type has its whoosh, every status its sting, every event the sound it
// should make; every song is well-formed, long enough and at one loudness; a loop's seam is the same samples on both
// sides; and the right track plays in the right place. The chip renders in plain arithmetic, so the tests hear what the
// speaker plays — only Web Audio itself (a buffer, a gain) is not under test.

const content = buildRegistry();
const look = { isPlayer: (uid: string) => uid.startsWith('p'), moveType: (id: string) => content.move(id).type };
const ALL_SFX = sfxIds(POKEMON_TYPES, [...PRIMARY_STATUSES, 'confusion']);
/** Rendering is arithmetic on a few million samples: quick alone, slow when the whole suite shares the machine. */
const RENDER_MS = 60_000;
const SONGS: [string, Song][] = [...Object.entries(TRACKS), ...Object.entries(JINGLES)];
/** How often a rendering crosses zero, per second: a cheap ear for "is this a different timbre". */
const crossings = (pcm: Pcm): number => {
  let n = 0;
  for (let i = 1; i < pcm.l.length; i++) if (pcm.l[i - 1]! < 0 !== pcm.l[i]! < 0) n++;
  return (n * pcm.rate) / pcm.l.length;
};

describe('Sound effects — §9.5.3', () => {
  it('EveryType_HasItsWhoosh_EveryStatus_ItsSting', () => {
    for (const t of POKEMON_TYPES) expect(TYPE_TIMBRE[t]?.length, t).toBeGreaterThan(0);
    for (const s of [...PRIMARY_STATUSES, 'confusion' as const]) expect(STATUS_STING[s]?.length, s).toBeGreaterThan(0);
  });

  it('EveryRecipe_IsWellFormed_NoStepLouderThanOne', () => {
    const ids: SfxId[] = [...(Object.keys(SFX) as SfxId[]), ...POKEMON_TYPES.map((t) => `card-${t}` as SfxId)];
    for (const id of ids) {
      const steps = stepsOf(id);
      expect(steps.length, id).toBeGreaterThan(0);
      for (const s of steps) {
        expect(s.dur, id).toBeGreaterThan(0);
        expect(s.from, id).toBeGreaterThan(0);
        expect(s.gain, id).toBeGreaterThan(0);
        expect(s.gain, id).toBeLessThanOrEqual(1);
      }
    }
  });

  it('EverySound_RendersAudible_AndBelowClipping — §9.5.5', () => {
    expect(ALL_SFX.length).toBeGreaterThan(60);
    for (const id of ALL_SFX) {
      const pcm = sampleOf(id);
      const { peak, rms } = loudnessOf(pcm);
      expect(peak, id).toBeGreaterThan(0.15);
      expect(peak, id).toBeLessThanOrEqual(0.9);
      expect(rms, id).toBeGreaterThan(0.005);
      expect(pcm.l.length / pcm.rate, id).toBeLessThan(6);
    }
  }, RENDER_MS);

  it('TheThreeHits_AreThreeTimbres_LouderAndLongerAsTheyLandHarder', () => {
    const [soft, plain, hard] = (['hit-resisted', 'hit', 'hit-super'] as const).map((id) => sampleOf(id));
    expect(loudnessOf(soft!).peak).toBeLessThan(loudnessOf(plain!).peak);
    expect(loudnessOf(plain!).peak).toBeLessThan(loudnessOf(hard!).peak);
    expect(soft!.l.length).toBeLessThan(plain!.l.length);
    expect(plain!.l.length).toBeLessThan(hard!.l.length);
    // The resisted hit is the short register's dull knock: far fewer crossings than the hiss of a clean hit.
    expect(crossings(soft!)).toBeLessThan(crossings(plain!) * 0.7);
  });

  it('TheChip_IsDeterministic_TheSameNotesAreTheSameSamples', () => {
    const notes = [
      { t: 0, dur: 0.1, midi: 120, vel: 0.5, inst: INSTRUMENTS.snare },
      { t: 0.02, dur: 0.2, midi: 69, vel: 0.5, inst: INSTRUMENTS.lead },
    ];
    const a = render(notes, 0.4, [0.05, 0.3]);
    const b = render(notes, 0.4, [0.05, 0.3]);
    expect(Array.from(a.l)).toEqual(Array.from(b.l));
    expect(Array.from(a.r)).toEqual(Array.from(b.r));
    expect(loudnessOf(a).peak).toBeGreaterThan(0.1);
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
    expect(sfxForEvent({ t: 'turn-start', ap: 3, seq: 0, turn: 1 } as CombatEvent, look)).toEqual(['ap-gain']);
    // A fight's end is the music's (the fanfare, the fall), not an effect over it.
    expect(sfxForEvent({ t: 'outcome', outcome: 'victory', seq: 0, turn: 1 } as CombatEvent, look)).toEqual([]);
    expect(sfxForEvent({ t: 'outcome', outcome: 'defeat', seq: 0, turn: 1 } as CombatEvent, look)).toEqual([]);
  });
});

describe('The score — §9.5.4', () => {
  const pulse = { inst: 'p25' as const };

  it('ParseChannel_ReadsLengthsDotsTiesOctavesAndChords', () => {
    const p = parseChannel('o4 c4 d8. e16 f2^8 r8 > c1 < (ceg)4', pulse);
    expect(p.evs.map((e) => e.midi)).toEqual([60, 62, 64, 65, 72, 60]);
    expect(p.evs.map((e) => e.tick)).toEqual([0, TPQ, TPQ * 1.75, TPQ * 2, TPQ * 5, TPQ * 9]);
    expect(p.evs[5]!.chord).toEqual([60, 64, 67]);
    expect(p.ticks).toBe(TPQ * 10);
    // A note is held for its gate (q7 of 8 by default), never its whole length.
    expect(p.evs[0]!.len).toBe(Math.round((TPQ * 7) / 8));
  });

  it('ParseChannel_RepeatsTransposesAndReadsADrumLine', () => {
    expect(parseChannel('l16 [c e]3 K+7 c K-5 c', pulse).evs.map((e) => e.midi)).toEqual([60, 64, 60, 64, 60, 64, 67, 55]);
    expect(parseChannel('c12 c12 c12', pulse).ticks).toBe(TPQ);
    const kit = parseChannel('k h s4', { inst: 'kick', drums: true });
    expect(kit.ticks).toBe(TPQ * 2);
    expect(kit.evs.filter((e) => e.tick === 0).map((e) => e.inst)).toEqual(['kick', 'click']);
    expect(kit.evs.every((e) => e.fixed !== undefined)).toBe(true);
  });

  it('ParseChannel_ATypoThrows_NeverASilentRest', () => {
    expect(() => parseChannel('c d x', pulse)).toThrow();
    expect(() => parseChannel('@nothing c', pulse)).toThrow();
    expect(() => parseChannel('c7', pulse)).toThrow();
    expect(() => parseChannel('[c d', pulse)).toThrow();
  });

  it('Over_CarriesAPatternToEachChord_MinorTakesTheFlatThird_ABassStaysLow', () => {
    const notes = (mml: string) => parseChannel(mml, pulse).evs.map((e) => e.midi);
    expect(notes(over('C Am G', 'c e g'))).toEqual([60, 64, 67, 57, 60, 64, 55, 59, 62]);
    expect(notes(over('F', 'c'))).toEqual([65]);
    expect(notes(over('F', 'c', true))).toEqual([53]);
    expect(() => over('H', 'c')).toThrow();
  });

  it('EverySong_IsWellFormed_EveryChannelOfASectionTheSameWholeBars', () => {
    for (const [id, song] of SONGS) {
      expect(song.bpm, id).toBeGreaterThanOrEqual(70);
      expect(song.bpm, id).toBeLessThanOrEqual(190);
      for (const name of [...(song.intro ?? []), ...(song.loop ?? [])]) expect(song.sections[name], `${id}/${name}`).toBeDefined();
      for (const name of Object.keys(song.sections)) {
        const lengths = new Set<number>();
        for (const [ch, def] of Object.entries(song.channels)) {
          if (def.echoOf) continue;
          const line = lineOf(song, name, ch);
          if (line === null) continue;
          const p = parseChannel(line, def);
          lengths.add(p.ticks);
          for (const b of p.bars) expect(b % BAR, `${id}/${name}/${ch}: a bar line off the bar`).toBe(0);
        }
        expect([...lengths], `${id}/${name}`).toHaveLength(1);
        if (song.loop) expect([...lengths][0]! % BAR, `${id}/${name}`).toBe(0);
      }
    }
  });

  it('EveryTrack_HasItsForm_AnABLoopOfHalfAMinute_InAPlayableRange', () => {
    for (const id of TRACK_IDS) {
      const song = TRACKS[id];
      const x = expand(song);
      if (id === 'defeat') {
        expect(x.loopEnd, id).toBe(0);
        continue;
      }
      expect(new Set(song.loop).size, id).toBeGreaterThanOrEqual(2);
      expect(x.loopSeconds, id).toBeGreaterThan(25);
      expect(x.loopEnd - x.loopStart, id).toBeCloseTo(x.loopSeconds, 6);
      expect(x.loopStart, id).toBeCloseTo(x.introSeconds + WRAP, 6);
      for (const n of x.notes) {
        if (n.inst.osc === 'noise' || n.inst.bend !== undefined) continue;
        expect(n.midi, id).toBeGreaterThanOrEqual(28);
        expect(n.midi, id).toBeLessThanOrEqual(98);
      }
    }
    // A fight's track opens with a riff played once and carries the tension stem; a place's comes back where it was.
    for (const id of TRACK_IDS.filter((t) => t.startsWith('battle-'))) {
      const x = expand(TRACKS[id]);
      expect(x.introSeconds, id).toBeGreaterThan(2);
      expect(x.tension.length, id).toBeGreaterThan(100);
      expect(x.tension.every((n) => n.t >= x.introSeconds - 1e-4), id).toBe(true);
      expect(TRACKS[id].resume, id).toBeFalsy();
    }
    for (const id of ['route-1', 'route-2', 'route-3', 'city', 'hub'] as const) expect(TRACKS[id].resume, id).toBe(true);
  }, RENDER_MS);

  it('Expand_AnEchoChannelPlaysItsSourceLater_OnItsOwnVoice', () => {
    const song: Song = {
      bpm: 120,
      echo: null,
      channels: { p1: { inst: 'lead' }, e: { inst: 'pluck12', vol: 0.5, echoOf: 'p1', echoTicks: TPQ / 2 } },
      sections: { A: { p1: 'c4 e4 g4 r4' } },
      intro: ['A'],
    };
    const x = expand(song);
    const lead = x.notes.filter((n) => n.inst === INSTRUMENTS.lead);
    const echo = x.notes.filter((n) => n.inst === INSTRUMENTS.pluck12);
    expect(lead.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(echo.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(echo.map((n) => n.t - 0.25)).toEqual(lead.map((n) => n.t));
    expect(echo[0]!.vel).toBeCloseTo(lead[0]!.vel * 0.5, 6);
  });

  it('ALoop_SeamIsTheSameSamples_AsTheSongPlayedStraightThrough', () => {
    for (const id of ['title', 'battle-wild', 'mystery'] as const) {
      const song = TRACKS[id];
      const once = expand(song);
      const twice = expand(song, 2);
      const looped = render(once.notes, once.seconds, echoOf(song));
      const straight = render(twice.notes, twice.seconds, echoOf(song));
      // A quarter of a second either side of the wrap, in the second pass: what the looping buffer plays against what
      // the song is when it simply carries on.
      const seam = Math.round(once.loopEnd * looped.rate);
      const pass = Math.round(once.loopSeconds * looped.rate);
      let worst = 0;
      for (let k = -8000; k < 8000; k++) {
        const i = seam + k;
        worst = Math.max(worst, Math.abs(straight.l[i]! - looped.l[i < seam ? i : i - pass]!));
      }
      expect(worst / loudnessOf(looped).rms, id).toBeLessThan(0.02);
    }
  }, RENDER_MS);

  it('EveryTrack_SitsAtOneLoudness_BelowClipping — §9.5.5', () => {
    for (const id of TRACK_IDS) {
      const m = measureTrack(id);
      expect(m.peak, id).toBeLessThanOrEqual(SONG_CEILING + 1e-6);
      // Within 1.5 dB of the songbook's level: a track is only quieter where its peaks would otherwise clip.
      expect(20 * Math.log10(m.rms / SONG_RMS), id).toBeGreaterThan(-1.5);
      expect(20 * Math.log10(m.rms / SONG_RMS), id).toBeLessThan(0.01);
    }
    const wild = renderTrack('battle-wild');
    const stem = wild.tension!;
    expect(stem.l).toBe(stem.r);
    expect(loudnessOf(stem).rms).toBeGreaterThan(0.005);
    // No standing offset: under -70 dBFS, where the pulse and noise voices alone would leave it near -46.
    expect(dcOf(wild.pcm)).toBeLessThan(0.0003);
  }, RENDER_MS);

  it('EveryTune_ClosesOnItsTonic_InTheEighthBarOfB', () => {
    // The loop's one full cadence: on the downbeat of B's last bar the lead and the bass are on the same note, and
    // that note is the key's — C in the major tunes, A in the minor ones (every tune is written in one of the two).
    for (const id of TRACK_IDS) {
      const song = TRACKS[id];
      if (!song.sections.B || id === 'evolution') continue;
      const at = (ch: string) => parseChannel(lineOf(song, 'B', ch)!, song.channels[ch]!).evs.find((e) => e.tick === 7 * BAR);
      const lead = at('p1');
      const bass = at('w');
      expect(lead, id).toBeDefined();
      expect(bass, id).toBeDefined();
      expect(lead!.midi % 12, id).toBe(bass!.midi % 12);
      expect([0, 9], id).toContain(lead!.midi % 12);
    }
  });

  it('EveryLead_MovesByStep_NotOnlyUpAndDownTheChord', () => {
    // A tune, not an arpeggio: in every A and B at least a quarter of the lead's moves are a tone or a semitone.
    for (const id of TRACK_IDS) {
      const song = TRACKS[id];
      if (id === 'evolution' || id === 'defeat') continue;
      for (const name of ['A', 'B']) {
        const evs = parseChannel(lineOf(song, name, 'p1')!, song.channels.p1!).evs;
        let steps = 0;
        for (let i = 1; i < evs.length; i++) if (Math.abs(evs[i]!.midi - evs[i - 1]!.midi) <= 2 && evs[i]!.midi !== evs[i - 1]!.midi) steps++;
        expect(steps / (evs.length - 1), `${id}/${name}`).toBeGreaterThanOrEqual(0.25);
      }
    }
  });

  it('TheLead_SitsOverTheArpeggioAndThePad', () => {
    // Register: the lead's middle note is above the middle of what accompanies it.
    const middle = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    for (const id of TRACK_IDS) {
      const song = TRACKS[id];
      if (id === 'evolution' || id === 'defeat') continue;
      for (const name of ['A', 'B']) {
        const notes = (ch: string) => {
          const line = lineOf(song, name, ch);
          return line === null ? [] : parseChannel(line, song.channels[ch]!).evs.flatMap((e) => e.chord ?? [e.midi]);
        };
        const under = [...notes('p2'), ...notes('s')];
        if (under.length) expect(middle(notes('p1')), `${id}/${name}`).toBeGreaterThan(middle(under));
      }
    }
  });

  it('PositionAfter_WrapsAtTheLoopPoint_AndAOneShotEnds', () => {
    expect(positionAfter(0, 5, 10, 40, 40)).toBe(5);
    expect(positionAfter(0, 45, 10, 40, 40)).toBe(15);
    expect(positionAfter(20, 80, 10, 40, 40)).toBe(10 + ((100 - 10) % 30));
    expect(positionAfter(0, 9, 0, 0, 8)).toBe(0);
    expect(positionAfter(3, -1, 10, 40, 40)).toBe(3);
  });
});

describe('The player and the desk — §9.5.4, §9.5.5', () => {
  it('TrackCache_DropsTheLeastRecentlyUsed_NotTheOldest', () => {
    const c = new TrackCache<number>(3);
    c.set('route', 1);
    c.set('wild', 2);
    c.set('trainer', 3);
    // Reading the route is using it: the next one in pushes out the fight nobody touched.
    expect(c.get('route')).toBe(1);
    c.set('victory', 4);
    expect(c.ids()).toEqual(['trainer', 'route', 'victory']);
    expect(c.has('wild')).toBe(false);
  });

  it('TrackCache_NeverDropsWhatIsInUse_TheRouteUnderAFight', () => {
    const c = new TrackCache<number>(3);
    const inUse = new Set(['route']);
    c.set('route', 1, inUse);
    for (const [i, id] of ['wild', 'trainer', 'victory', 'elite', 'gym'].entries()) c.set(id, i, inUse);
    expect(c.has('route')).toBe(true);
    expect(c.ids()).toEqual(['route', 'elite', 'gym']);
    // With everything in use nothing is dropped: the limit bends before a sounding track does.
    const all = new TrackCache<number>(1);
    all.set('a', 1, new Set(['a', 'b']));
    all.set('b', 2, new Set(['a', 'b']));
    expect(all.ids()).toEqual(['a', 'b']);
  });

  it('ClipAt_IsALineBelowTheKnee_AndNeverPassesFullScale', () => {
    expect(clipAt(0.5)).toBe(0.5);
    expect(clipAt(-CLIP_KNEE)).toBe(-CLIP_KNEE);
    for (const x of [0.85, 1, 1.5, 4]) {
      expect(clipAt(x)).toBeGreaterThan(CLIP_KNEE);
      expect(clipAt(x)).toBeLessThan(1);
      expect(clipAt(-x)).toBe(-clipAt(x));
    }
    expect(clipAt(1.5)).toBeGreaterThan(clipAt(1));
  });

  it('ButtonSfx_ReadsWhatAButtonDoes_FromItsOwnWordOrItsTestId — §9.5.3', () => {
    expect(buttonSfx(undefined, undefined)).toBe('ui-click');
    expect(buttonSfx(undefined, 'btn-team')).toBe('ui-click');
    expect(buttonSfx(undefined, 'btn-settings-back')).toBe('ui-back');
    expect(buttonSfx(undefined, 'btn-close-inventory')).toBe('ui-back');
    expect(buttonSfx(undefined, 'btn-leave-stay')).toBe('ui-back');
    expect(buttonSfx(undefined, 'btn-leave-confirm')).toBe('ui-select');
    expect(buttonSfx(undefined, 'btn-enter-node')).toBe('ui-select');
    expect(buttonSfx(undefined, 'btn-continue')).toBe('ui-select');
    expect(buttonSfx(undefined, 'btn-save-quit')).toBe('save');
    expect(buttonSfx(undefined, 'shop-slot-2')).toBe('purchase');
    // What the button asks for itself wins, and a control with its own sound is left alone.
    expect(buttonSfx('back', 'btn-continue')).toBe('ui-back');
    expect(buttonSfx('own', 'btn-continue')).toBeNull();
    expect(buttonSfx('none', undefined)).toBeNull();
  });
});

describe('The director — §9.5.2, §9.5.4', () => {
  const run = (over: Partial<RunState>) => ({ regionIndex: 0, city: null, phase: 'map', ...over }) as RunState;
  const fight = (over: Partial<CombatState>) => ({ kind: 'wild', enemies: [], outcome: 'in-progress', ...over }) as unknown as CombatState;
  const town = {} as RunState['city'];

  it('TrackFor_FollowsTheScreenAndWhereTheRunStands', () => {
    expect(trackFor('menu', null, null)).toBe('title');
    expect(trackFor('settings', null, null)).toBe('title');
    expect(trackFor('hub', null, null)).toBe('hub');
    expect(trackFor('starter', null, null)).toBe('hub');
    expect(trackFor('map', run({}), null)).toBe('route-1');
    expect(trackFor('map', run({ regionIndex: 2 }), null)).toBe('route-3');
    expect(trackFor('map', run({ city: town, phase: 'city' }), null)).toBe('city');
    expect(trackFor('map', run({ city: town, phase: 'center' }), null)).toBe('center');
    expect(trackFor('map', run({ city: town, phase: 'shop' }), null)).toBe('mart');
    expect(trackFor('map', run({ city: town, phase: 'game-corner' }), null)).toBe('game-corner');
    expect(trackFor('map', run({ city: town, phase: 'black-market' }), null)).toBe('hideout');
    expect(trackFor('map', run({ phase: 'event' }), null)).toBe('mystery');
    expect(trackFor('map', run({ zone: 'victory-road' }), null)).toBe('victory-road');
    expect(trackFor('map', run({ zone: 'league' }), null)).toBe('league');
    expect(trackFor('victory', null, null)).toBe('hall-of-fame');
    expect(trackFor('defeat', null, null)).toBe('defeat');
  });

  it('BattleTrack_ByWhatIsAcrossTheField', () => {
    expect(trackFor('combat', null, fight({}))).toBe('battle-wild');
    expect(battleTrack(fight({ kind: 'trainer' }), null)).toBe('battle-trainer');
    expect(battleTrack(fight({ kind: 'elite' }), null)).toBe('battle-elite');
    expect(battleTrack(fight({ kind: 'boss' }), run({}))).toBe('battle-gym');
    expect(battleTrack(fight({ kind: 'boss' }), run({ zone: 'league' }))).toBe('battle-league');
    expect(battleTrack(fight({ kind: 'boss', gymRule: 'synergy' }), run({ zone: 'league' }))).toBe('battle-champion');
    expect(battleTrack(fight({ kind: 'boss', arenaRule: 'x' as CombatState['arenaRule'] }), run({}))).toBe('battle-legendary');
  });

  it('AFightsEnd_IsTheMusics_TheFanfareThroughTheResult_ThenTheRouteAgain', () => {
    const won = fight({ kind: 'trainer', outcome: 'victory' });
    expect(trackFor('combat', run({}), won)).toBe('victory-trainer');
    expect(trackFor('results', run({}), won)).toBe('victory-trainer');
    expect(victoryTrack(fight({ outcome: 'caught' }))).toBe('victory-wild');
    expect(victoryTrack(fight({ kind: 'boss', outcome: 'victory' }))).toBe('victory-gym');
    expect(trackFor('combat', run({}), fight({ outcome: 'defeat' }))).toBe('defeat');
    // Back on the map the fight is over, whatever the combat store still holds.
    expect(trackFor('map', run({}), won)).toBe('route-1');
    expect(trackFor('results', run({}), fight({ outcome: 'fled' }))).toBe('route-1');
  });

  it('TracksAhead_TheFanfareDuringAFight_TheFightsOnARoute', () => {
    expect(tracksAhead('combat', null, fight({ kind: 'boss' }))).toEqual(['victory-gym']);
    expect(tracksAhead('map', run({}), null)).toEqual(['battle-wild', 'battle-trainer']);
    expect(tracksAhead('menu', null, null)).toEqual([]);
  });

  it('InTension_UnderAThirdOfTheTeamsHp_WhileTheFightIsOn', () => {
    const s = createCombat(content.scenario('wild-basic'), { content, config: DEFAULT_BATTLE_CONFIG });
    expect(inTension(s)).toBe(false);
    for (const m of s.player.team) m.hp = Math.floor(m.maxHp * 0.2);
    expect(inTension(s)).toBe(true);
    expect(inTension({ ...s, outcome: 'defeat' })).toBe(false);
  });
});

describe('The catch, heard — §9.5.3, §2.6.4.4', () => {
  it('CatchSounds_EachAtItsBeatOfTheBallsAnimation_InOrder', () => {
    const t = catchTimeline(3, true);
    const s = catchSounds(3, true);
    expect(s.map(([id]) => id)).toEqual(['ball-throw', 'ball-open', 'ball-land', 'ball-shake', 'ball-shake', 'ball-shake', 'ball-click']);
    expect(s[1]![1]).toBe(t.absorbAt);
    // Each wobble is heard as it rocks, after the still moment that opens its cycle — not at the cycle's start.
    expect(s[3]![1]).toBe(t.wobbleAt + FX_MS.pause);
    expect(s[4]![1] - s[3]![1]).toBe(t.cycle);
    expect(s.at(-1)![1]).toBe(t.resultAt);
    for (let i = 1; i < s.length; i++) expect(s[i]![1]).toBeGreaterThan(s[i - 1]![1]);
  });

  it('CatchSounds_ABreakOut_BurstsOnItsLastWobble', () => {
    const s = catchSounds(1, false);
    expect(s.map(([id]) => id)).toEqual(['ball-throw', 'ball-open', 'ball-land', 'ball-shake', 'ball-break']);
    expect(s.at(-1)![1]).toBe(catchTimeline(1, false).resultAt);
  });
});
