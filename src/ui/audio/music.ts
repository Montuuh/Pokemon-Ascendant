import { loudnessOf, type Loudness } from './sfx';
import { hz, Synth, synth, type Wave } from './synth';

// §9.5.4 — the music, composed in code: each track a key, a tempo, a four-bar progression and the patterns its
// voices play over it — a lead, a bass, a pad and a little percussion — read bar by bar (`notesForBar`, pure) and
// scheduled a beat ahead on the music bus. §9.5.2's stems become one layer: **tension**, the fight's low-HP layer
// (busier drums, the bass doubled), cross-faded in and out over 250 ms.

export const TRACK_IDS = ['title', 'region-1', 'region-2', 'region-3', 'city', 'victory-road', 'league', 'combat', 'boss', 'champion', 'evolution'] as const;
export type TrackId = (typeof TRACK_IDS)[number];
export type Voice = 'lead' | 'bass' | 'pad' | 'kick' | 'hat' | 'snare';

/** Scales as semitone steps from the root. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];

export interface Track {
  bpm: number;
  /** MIDI root of the key. */
  root: number;
  scale: number[];
  /** The chord of each bar, as a scale degree (0 = the tonic), four bars round. */
  progression: number[];
  /** The lead over two bars, eight steps a bar: a scale degree over the bar's chord root, or null for a rest. */
  lead: (number | null)[];
  /** Steps (of eight) the bass plays the chord's root on. */
  bass: number[];
  /** Kick, snare and hat steps (of eight); the tension layer adds its own. */
  kick: number[];
  snare: number[];
  hat: number[];
  tensionHat: number[];
  leadWave: Wave;
  padWave: Wave;
  /** The voices' levels. */
  mix: Partial<Record<Voice, number>>;
}

const T = (t: Partial<Track> & Pick<Track, 'bpm' | 'root' | 'scale' | 'progression' | 'lead'>): Track => ({
  bass: [0, 4],
  kick: [],
  snare: [],
  hat: [],
  tensionHat: [1, 3, 5, 7],
  leadWave: 'triangle',
  padWave: 'sine',
  mix: { lead: 0.09, bass: 0.12, pad: 0.035, kick: 0.25, hat: 0.05, snare: 0.12 },
  ...t,
});

export const TRACKS: Record<TrackId, Track> = {
  // The title: hopeful, a march-like major.
  title: T({ bpm: 100, root: 60, scale: MAJOR, progression: [0, 4, 5, 3], lead: [4, null, 2, 4, 7, null, 4, 2, 5, null, 4, 2, 0, null, null, null], kick: [0, 4], hat: [2, 6] }),
  // Region 1 — light flute and strings, ~110 BPM, major; a bird's chirp in the lead's top notes.
  'region-1': T({ bpm: 110, root: 67, scale: MAJOR, progression: [0, 3, 4, 0], lead: [0, 2, 4, 7, 9, 7, 4, null, 5, 4, 2, 0, 2, null, 11, 9], kick: [0, 4], hat: [2, 6], leadWave: 'sine' }),
  // Region 2 — brass and tense strings, ~115 BPM, minor.
  'region-2': T({ bpm: 115, root: 57, scale: MINOR, progression: [0, 5, 2, 6], lead: [0, null, 2, 4, null, 2, 4, 6, 7, null, 6, 4, 2, null, 0, null], kick: [0, 3, 4], snare: [2, 6], hat: [1, 3, 5, 7], leadWave: 'sawtooth', mix: { lead: 0.05, bass: 0.13, pad: 0.035, kick: 0.25, hat: 0.04, snare: 0.12 } }),
  // Region 3 — percussion, brass and sub-bass, ~125 BPM, modal minor.
  'region-3': T({ bpm: 125, root: 50, scale: DORIAN, progression: [0, 6, 3, 4], lead: [7, 7, null, 5, 4, null, 2, null, 4, 5, 7, null, 9, 7, 5, null], bass: [0, 2, 4, 6], kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], leadWave: 'sawtooth', mix: { lead: 0.05, bass: 0.15, pad: 0.03, kick: 0.28, hat: 0.04, snare: 0.13 } }),
  // A City — a warm looped rest-hub jingle.
  city: T({ bpm: 96, root: 65, scale: MAJOR, progression: [0, 5, 3, 4], lead: [4, 4, 2, 0, 2, 4, null, null, 5, 5, 4, 2, 4, null, null, null], kick: [0], hat: [4] }),
  // Victory Road — sparse cinematic strings, ~85 BPM.
  'victory-road': T({ bpm: 85, root: 55, scale: MINOR, progression: [0, 5, 3, 4], lead: [0, null, null, null, 2, null, 4, null, 3, null, null, null, 1, null, null, null], bass: [0], kick: [0], padWave: 'triangle', mix: { lead: 0.08, bass: 0.12, pad: 0.05, kick: 0.2 } }),
  // The League — the doors in a row, a steady minor march.
  league: T({ bpm: 130, root: 57, scale: MINOR, progression: [0, 3, 5, 4], lead: [0, 2, 4, null, 4, 5, 7, null, 6, 5, 4, null, 2, 4, 0, null], bass: [0, 2, 4, 6], kick: [0, 4], snare: [2, 6], hat: [1, 3, 5, 7], leadWave: 'square', mix: { lead: 0.04, bass: 0.13, pad: 0.03, kick: 0.26, hat: 0.04, snare: 0.13 } }),
  // A fight — driving, minor.
  combat: T({ bpm: 140, root: 52, scale: MINOR, progression: [0, 5, 6, 4], lead: [0, null, 4, 0, 7, null, 4, 2, 3, null, 2, 0, 2, null, 4, null], bass: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0, 4], snare: [2, 6], hat: [0, 2, 4, 6], leadWave: 'square', mix: { lead: 0.035, bass: 0.1, pad: 0.025, kick: 0.26, hat: 0.04, snare: 0.12 } }),
  // A boss — a Gym, an Elite, a Legendary's arena: phrygian and heavy.
  boss: T({ bpm: 150, root: 52, scale: PHRYGIAN, progression: [0, 1, 0, 6], lead: [0, 1, 0, null, 4, 3, 1, null, 0, 1, 3, 4, 5, null, 4, null], bass: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0, 2, 4, 6], snare: [2, 6], hat: [1, 3, 5, 7], leadWave: 'sawtooth', mix: { lead: 0.035, bass: 0.11, pad: 0.03, kick: 0.28, hat: 0.04, snare: 0.13 } }),
  // The Champion — dorian, the fastest.
  champion: T({ bpm: 156, root: 50, scale: DORIAN, progression: [0, 3, 6, 4], lead: [7, 9, 7, 4, 2, 4, 7, null, 9, 11, 9, 7, 4, null, 2, null], bass: [0, 1, 2, 3, 4, 5, 6, 7], kick: [0, 2, 4, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], leadWave: 'sawtooth', mix: { lead: 0.04, bass: 0.11, pad: 0.03, kick: 0.28, hat: 0.03, snare: 0.13 } }),
  evolution: T({
    // The evolution (the user's note, 2026-10-19: the series has its music here) — our own: a pulse of eighths on one
    // note under a rising, circling figure, the chord climbing a step each bar so it never settles until the bloom. Fast,
    // hushed and expectant; no snare, no kick, only the pulse and the shimmer.
    bpm: 144,
    root: 62,
    scale: MAJOR,
    progression: [0, 1, 2, 3],
    lead: [0, 4, 7, 4, 2, 4, 7, 9, 0, 4, 7, 11, 9, 7, 4, 2],
    bass: [0, 1, 2, 3, 4, 5, 6, 7],
    hat: [1, 3, 5, 7],
    leadWave: 'square',
    padWave: 'triangle',
    mix: { lead: 0.035, bass: 0.07, pad: 0.04, hat: 0.03 },
  }),
};

/** One note: when in the bar (in beats), what, how long (in beats), which voice. */
export interface Note {
  at: number;
  midi: number;
  dur: number;
  voice: Voice;
}

const STEP = 0.5; // eight steps a bar: eighth notes in 4/4
/** §9.5.2 — the tension layer's own kicks, syncopated. */
const TENSION_KICK = [3, 7];

/** A scale degree as MIDI from a root: degrees past the scale wrap up an octave. */
export function degreeToMidi(root: number, scale: number[], degree: number): number {
  const octave = Math.floor(degree / scale.length);
  const idx = ((degree % scale.length) + scale.length) % scale.length;
  return root + octave * 12 + scale[idx]!;
}

/** §9.5.4 — the notes of one bar of a track, with the tension layer or without. Pure. */
export function notesForBar(track: Track, bar: number, tension = false): Note[] {
  const chord = track.progression[bar % track.progression.length]!;
  const notes: Note[] = [];
  // The pad: the bar's triad, held.
  for (const d of [0, 2, 4]) notes.push({ at: 0, midi: degreeToMidi(track.root - 12, track.scale, chord + d), dur: 4, voice: 'pad' });
  // The bass: the chord's root, two octaves down; doubled an octave up under tension.
  for (const s of track.bass) {
    const midi = degreeToMidi(track.root - 24, track.scale, chord);
    notes.push({ at: s * STEP, midi, dur: STEP * 0.9, voice: 'bass' });
    if (tension) notes.push({ at: s * STEP, midi: midi + 12, dur: STEP * 0.5, voice: 'bass' });
  }
  // The lead: its two-bar phrase, over the bar's chord.
  const half = (bar % 2) * 8;
  for (let s = 0; s < 8; s++) {
    const d = track.lead[half + s];
    if (d === null || d === undefined) continue;
    notes.push({ at: s * STEP, midi: degreeToMidi(track.root, track.scale, chord + d), dur: STEP * 0.85, voice: 'lead' });
  }
  // Under tension the kick pushes on the off-beats too: the fight's pulse quickens with the danger.
  for (const s of new Set([...track.kick, ...(tension ? TENSION_KICK : [])])) notes.push({ at: s * STEP, midi: 0, dur: 0.2, voice: 'kick' });
  for (const s of track.snare) notes.push({ at: s * STEP, midi: 0, dur: 0.15, voice: 'snare' });
  for (const s of new Set([...track.hat, ...(tension ? track.tensionHat : [])])) notes.push({ at: s * STEP, midi: 0, dur: 0.05, voice: 'hat' });
  return notes;
}

/** Play one note on a channel at a time (seconds), a beat being `beat` seconds. */
function voice(on: Synth, track: Track, n: Note, at: number, beat: number, out: AudioNode): void {
  const level = track.mix[n.voice] ?? 0;
  const dur = n.dur * beat;
  switch (n.voice) {
    case 'lead':
      on.tone({ wave: track.leadWave, from: hz(n.midi), dur, gain: level, attack: 0.01, cutoff: 2600 }, at, out);
      break;
    case 'bass':
      on.tone({ wave: 'triangle', from: hz(n.midi), dur, gain: level, attack: 0.005 }, at, out);
      break;
    case 'pad':
      on.tone({ wave: track.padWave, from: hz(n.midi), dur, gain: level, attack: 0.3 }, at, out);
      break;
    case 'kick':
      on.tone({ wave: 'sine', from: 140, to: 45, dur, gain: level }, at, out);
      break;
    case 'snare':
      on.noise({ filter: 'bandpass', from: 1800, q: 0.8, dur, gain: level }, at, out);
      break;
    case 'hat':
      on.noise({ filter: 'highpass', from: 7000, dur, gain: level }, at, out);
      break;
  }
}

/**
 * The player: one track at a time, bars scheduled a little ahead of the clock. A new track cross-fades in over the old
 * one; the tension layer is read at every bar.
 */
class MusicPlayer {
  private current: TrackId | null = null;
  /** The screen's track (the director's), and a scene's over it — the evolution — or its silence (`hush`). */
  private base: TrackId | null = null;
  private scene: TrackId | 'hush' | null = null;
  private channel: GainNode | null = null;
  private bar = 0;
  private nextBarAt = 0;
  private timer: number | null = null;
  private tension = false;

  get track(): TrackId | null {
    return this.current;
  }

  /** The screen's track; it waits under a scene until the scene ends. */
  play(id: TrackId | null): void {
    this.base = id;
    if (this.scene === null) this.switchTo(id);
  }

  /** §9.5.4 — a scene's own music over the screen's (`hush`: its silence); null gives the screen its track back. */
  setScene(id: TrackId | 'hush' | null): void {
    this.scene = id;
    this.switchTo(id === null ? this.base : id === 'hush' ? null : id);
  }

  private switchTo(id: TrackId | null): void {
    if (id === this.current) return;
    this.fadeOut();
    this.current = id;
    this.bar = 0;
    this.nextBarAt = 0;
    if (id) this.ensureTimer();
  }

  setTension(on: boolean): void {
    this.tension = on;
  }

  private fadeOut(): void {
    const ch = this.channel;
    this.channel = null;
    if (!ch) return;
    const t = synth.now();
    ch.gain.cancelScheduledValues(t);
    ch.gain.setValueAtTime(ch.gain.value, t);
    ch.gain.linearRampToValueAtTime(0, t + 0.25);
    window.setTimeout(() => ch.disconnect(), 400);
  }

  private ensureTimer(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => this.tick(), 50);
  }

  /** Schedule every bar that starts within the lookahead; start the channel when the context first runs. */
  private tick(): void {
    if (!this.current) return;
    const ctx = synth.ready();
    if (!ctx) return;
    const track = TRACKS[this.current];
    if (!this.channel) {
      this.channel = synth.channel('music', 0);
      if (!this.channel) return;
      this.channel.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.25);
      this.nextBarAt = ctx.currentTime + 0.05;
    }
    const beat = 60 / track.bpm;
    while (this.nextBarAt < ctx.currentTime + 0.2) {
      for (const n of notesForBar(track, this.bar, this.tension)) voice(synth, track, n, this.nextBarAt + n.at * beat, beat, this.channel);
      this.bar += 1;
      this.nextBarAt += 4 * beat;
    }
  }
}

export const music = new MusicPlayer();

/** §9.5.5 — render one bar of a track offline at full volume and measure it. */
export async function renderBar(id: TrackId, tension = false): Promise<Loudness> {
  const track = TRACKS[id];
  const beat = 60 / track.bpm;
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * (4 * beat + 1)), 44100);
  const on = Synth.offline(ctx);
  const out = on.channel('music')!;
  for (const n of notesForBar(track, 0, tension)) voice(on, track, n, n.at * beat, beat, out);
  return loudnessOf(await ctx.startRendering());
}
