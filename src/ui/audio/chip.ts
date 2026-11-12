// §9.5.1 — the sound chip, in software: the four voices of the handheld the series grew up on (two pulse channels with
// a duty cycle, a wavetable channel, an LFSR noise channel) plus the wavetable "samples" of its successor (strings, a
// trumpet, a flute, a bell, an electric piano), rendered to PCM by plain arithmetic. No Web Audio in here and nothing
// random: the same notes always render the same samples, so a song or an effect can be measured in a unit test, and
// what the test measured is, sample for sample, what the speaker plays.

/** The chip's own rate. The successor handheld mixed at 13–32 kHz; the top of that range keeps the pulse edges clean. */
export const RATE = 32000;

/** A MIDI note number as Hz (A4 = 69 = 440 Hz). */
export const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export type WaveId = 'sine' | 'tri4' | 'flute' | 'strings' | 'brass' | 'bell' | 'epiano' | 'organ' | 'ebass';

/** One voice's recipe. Times in seconds; `s` is the sustain level (0–1) the decay settles on. */
export interface Instrument {
  osc: 'pulse' | 'wave' | 'noise';
  /** Pulse: the duty cycle per frame (1/60 s) from the note's start, the last one held — 0.125, 0.25, 0.5, 0.75. */
  duty?: number[];
  /** Wave: which table. */
  wave?: WaveId;
  /** Noise: the 7-bit register (a metallic buzz) rather than the 15-bit one (a hiss). */
  short?: boolean;
  /** Noise: take the lows out (a hat, a cymbal). */
  hp?: boolean;
  a: number;
  d: number;
  s: number;
  r: number;
  /** Vibrato: depth in semitones, rate in Hz, and how long the note is held straight before it comes in. */
  vib?: [number, number, number];
  /** A pitch slide into the note: it starts this many semitones off and arrives after this many seconds. */
  bend?: [number, number];
  /** Wave: a second oscillator this many cents off (the chorus of a string section). */
  detune?: number;
  /** A chord on this voice is played one note at a time, this many frames each (the chip's arpeggio). */
  arp?: number;
  gain?: number;
}

/** One note to render. `midi` may be fractional; for noise it is the register's clock, as a pitch. */
export interface Note {
  t: number;
  dur: number;
  midi: number;
  vel: number;
  inst: Instrument;
  /** −1 (left) … 1 (right). */
  pan?: number;
  /** Kept out of the echo (the bass and the drums). */
  dry?: boolean;
  /** The other notes of a chord, for an arpeggiating voice. */
  chord?: number[];
}

export interface Pcm {
  l: Float32Array;
  r: Float32Array;
  rate: number;
}

const TABLE = 256;

/** A table from its harmonics' amplitudes (1st, 2nd, …), peak 1. */
function harmonics(amps: number[]): Float32Array {
  const t = new Float32Array(TABLE);
  let peak = 0;
  for (let i = 0; i < TABLE; i++) {
    let v = 0;
    for (let h = 0; h < amps.length; h++) v += amps[h]! * Math.sin((2 * Math.PI * (h + 1) * i) / TABLE);
    t[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < TABLE; i++) t[i] = t[i]! / peak;
  return t;
}

/** The wave channel's triangle: 32 steps of 4 bits, the stair-step that gives the series' bass its grain. */
function tri4(): Float32Array {
  const t = new Float32Array(TABLE);
  for (let i = 0; i < TABLE; i++) {
    const step = Math.floor((i * 32) / TABLE);
    const level = step < 16 ? step : 31 - step;
    t[i] = (level / 15) * 2 - 1;
  }
  return t;
}

const rolloff = (n: number, power: number): number[] => Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, power));

const WAVES: Record<WaveId, Float32Array> = {
  sine: harmonics([1]),
  tri4: tri4(),
  flute: harmonics([1, 0.28, 0.07, 0.03]),
  strings: harmonics(rolloff(9, 1.25)),
  brass: harmonics(rolloff(11, 0.9)),
  bell: harmonics([1, 0, 0, 0.4, 0, 0, 0.14]),
  epiano: harmonics([1, 0.42, 0.14, 0.07, 0.03]),
  organ: harmonics([1, 0.6, 0, 0.32, 0, 0.1]),
  ebass: harmonics([1, 0.55, 0.3, 0.14, 0.06]),
};

const BLOCK = 32;

/** The polynomial band-limited step: rounds a pulse's edges just enough that high notes do not alias into a buzz. */
function blep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

/** The envelope's level `t` seconds into a held note: up in `a`, then down towards `s`. */
function held(i: Instrument, t: number): number {
  if (t < i.a) return t / i.a;
  if (i.d <= 0) return i.s;
  return i.s + (1 - i.s) * Math.exp(-(t - i.a) / i.d);
}

/**
 * Renders notes into two stereo buses — one that takes the echo, one that stays dry — a slice at a time (`step`), so a
 * minute of music never holds the page for longer than a frame; `finish` adds the echo and hands back the mix.
 */
export class Renderer {
  private readonly length: number;
  private readonly wet: [Float32Array, Float32Array];
  private readonly dry: [Float32Array, Float32Array];
  private readonly notes: Note[];
  private next = 0;

  constructor(
    notes: readonly Note[],
    seconds: number,
    /** The echo: its delay in seconds and its gain, or null for none. */
    private readonly echo: [number, number] | null = null,
    /** One channel, no echo: the rendering's `l` and `r` are the same array (a stem that sits in the middle). */
    private readonly mono = false,
  ) {
    this.length = Math.max(1, Math.ceil(seconds * RATE));
    const buf = () => new Float32Array(this.length);
    if (mono) {
      const one = buf();
      this.dry = [one, one];
      this.wet = this.dry;
    } else {
      this.wet = [buf(), buf()];
      this.dry = [buf(), buf()];
    }
    this.notes = [...notes].sort((a, b) => a.t - b.t);
  }

  /** Render notes until `budgetMs` has passed; true when every note is in. */
  step(budgetMs = Infinity): boolean {
    const t0 = budgetMs === Infinity ? 0 : performance.now();
    while (this.next < this.notes.length) {
      this.note(this.notes[this.next++]!);
      if (budgetMs !== Infinity && performance.now() - t0 >= budgetMs) break;
    }
    return this.next >= this.notes.length;
  }

  finish(): Pcm {
    while (!this.step());
    if (this.mono) {
      dcBlock(this.dry[0]);
      return { l: this.dry[0], r: this.dry[0], rate: RATE };
    }
    const [wl, wr] = this.wet;
    if (this.echo) {
      const d = Math.max(1, Math.round(this.echo[0] * RATE));
      const g = this.echo[1];
      // Each side answers the other: a cross-fed delay line, the successor handheld's small "reverb".
      for (let i = d; i < this.length; i++) {
        wl[i] = wl[i]! + g * wr[i - d]!;
        wr[i] = wr[i]! + g * wl[i - d]!;
      }
    }
    const l = this.dry[0];
    const r = this.dry[1];
    for (let i = 0; i < this.length; i++) {
      l[i] = l[i]! + wl[i]!;
      r[i] = r[i]! + wr[i]!;
    }
    dcBlock(l);
    dcBlock(r);
    return { l, r, rate: RATE };
  }

  private note(n: Note): void {
    const I = n.inst;
    const start = Math.round(n.t * RATE);
    if (start >= this.length || n.vel <= 0) return;
    const gate = Math.max(1, Math.round(n.dur * RATE));
    const rel = Math.max(0.004, I.r) * RATE;
    const total = Math.min(Math.ceil(gate + rel), this.length - start);
    const pan = ((n.pan ?? 0) + 1) * (Math.PI / 4);
    const level = n.vel * (I.gain ?? 1);
    const gl = level * Math.cos(pan);
    // A mono rendering takes the left gain only: both names are one array, and it must not be written twice.
    const gr = this.mono ? 0 : level * Math.sin(pan);
    const [L, R] = n.dry ? this.dry : this.wet;
    const atGate = held(I, gate / RATE);
    const env = (i: number): number => (i < gate ? held(I, i / RATE) : atGate * Math.max(0, 1 - (i - gate) / rel));
    const table = I.osc === 'wave' ? WAVES[I.wave ?? 'sine'] : null;
    const spread = I.detune ? Math.pow(2, I.detune / 1200) : 0;
    let ph = 0;
    let ph2 = 0.37;
    let lfsr = 0x7fff;
    let acc = 0;
    let held0 = 1;
    let lp = 0;
    for (let b = 0; b < total; b += BLOCK) {
      const t = b / RATE;
      let m = n.chord && I.arp ? n.chord[Math.floor((t * 60) / I.arp) % n.chord.length]! : n.midi;
      if (I.bend && t < I.bend[1]) m += I.bend[0] * (1 - t / I.bend[1]);
      if (I.vib && t > I.vib[2]) m += I.vib[0] * Math.min(1, (t - I.vib[2]) / 0.2) * Math.sin(2 * Math.PI * I.vib[1] * (t - I.vib[2]));
      const f = hz(m);
      const inc = f / RATE;
      const e0 = env(b);
      const e1 = env(b + BLOCK);
      const end = Math.min(BLOCK, total - b);
      const base = start + b;
      if (I.osc === 'pulse') {
        const duty = I.duty ? I.duty[Math.min(I.duty.length - 1, Math.floor(t * 60))]! : 0.5;
        const dc = 2 * duty - 1;
        for (let j = 0; j < end; j++) {
          let v = ph < duty ? 1 : -1;
          v += blep(ph, inc);
          let p2 = ph - duty;
          if (p2 < 0) p2 += 1;
          v -= blep(p2, inc);
          const a = (e0 + ((e1 - e0) * j) / BLOCK) * (v - dc);
          L[base + j] = L[base + j]! + a * gl;
          R[base + j] = R[base + j]! + a * gr;
          ph += inc;
          if (ph >= 1) ph -= 1;
        }
      } else if (table) {
        const inc2 = inc * spread;
        for (let j = 0; j < end; j++) {
          const x = ph * TABLE;
          const i0 = x | 0;
          let v = table[i0]! + (table[(i0 + 1) & (TABLE - 1)]! - table[i0]!) * (x - i0);
          if (spread) {
            const y = ph2 * TABLE;
            const k0 = y | 0;
            v = 0.5 * (v + table[k0]! + (table[(k0 + 1) & (TABLE - 1)]! - table[k0]!) * (y - k0));
            ph2 += inc2;
            if (ph2 >= 1) ph2 -= 1;
          }
          const a = (e0 + ((e1 - e0) * j) / BLOCK) * v;
          L[base + j] = L[base + j]! + a * gl;
          R[base + j] = R[base + j]! + a * gr;
          ph += inc;
          if (ph >= 1) ph -= 1;
        }
      } else {
        const clock = Math.min(1, inc);
        for (let j = 0; j < end; j++) {
          acc += clock;
          if (acc >= 1) {
            acc -= 1;
            const bit = (lfsr ^ (lfsr >> 1)) & 1;
            lfsr = (lfsr >> 1) | (bit << 14);
            if (I.short) lfsr = (lfsr & ~0x40) | (bit << 6);
            held0 = lfsr & 1 ? -1 : 1;
          }
          let v = held0;
          if (I.hp) {
            lp += 0.25 * (v - lp);
            v -= lp;
          }
          const a = (e0 + ((e1 - e0) * j) / BLOCK) * v;
          L[base + j] = L[base + j]! + a * gl;
          R[base + j] = R[base + j]! + a * gr;
        }
      }
    }
  }
}

/** How much of the last output the DC blocker keeps: a one-pole high-pass a little under 20 Hz. */
const DC_POLE = 0.9965;

/**
 * Take the standing offset out of a rendering, in place: a pulse at a thin duty and the noise register both sit a
 * little off zero, and an offset is headroom spent on nothing and a click wherever a track starts or stops.
 */
export function dcBlock(x: Float32Array): void {
  let was = 0;
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i]!;
    y = v - was + DC_POLE * y;
    was = v;
    x[i] = y;
  }
}

/** A rendering's standing offset, 0–1: the mean of its samples. */
export function dcOf(pcm: Pcm): number {
  let sum = 0;
  for (let i = 0; i < pcm.l.length; i++) sum += pcm.l[i]! + pcm.r[i]!;
  return Math.abs(sum / Math.max(1, 2 * pcm.l.length));
}

/** Render every note at once (the tests, the effects). */
export function render(notes: readonly Note[], seconds: number, echo: [number, number] | null = null): Pcm {
  return new Renderer(notes, seconds, echo).finish();
}

/** How loud a rendering is: its peak and its RMS on a 0–1 scale, over `[from, to)` seconds (the whole of it by default). */
export interface Loudness {
  peak: number;
  rms: number;
}
export function loudnessOf(pcm: Pcm, from = 0, to = Infinity): Loudness {
  const i0 = Math.max(0, Math.floor(from * pcm.rate));
  const i1 = Math.min(pcm.l.length, to === Infinity ? pcm.l.length : Math.ceil(to * pcm.rate));
  let peak = 0;
  let sum = 0;
  for (let i = i0; i < i1; i++) {
    const a = pcm.l[i]!;
    const b = pcm.r[i]!;
    peak = Math.max(peak, Math.abs(a), Math.abs(b));
    sum += a * a + b * b;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, 2 * (i1 - i0))) };
}

/** Scale a rendering in place by `gain`. */
export function scale(pcm: Pcm, gain: number): Pcm {
  for (let i = 0; i < pcm.l.length; i++) {
    pcm.l[i] = pcm.l[i]! * gain;
    pcm.r[i] = pcm.r[i]! * gain;
  }
  return pcm;
}

/**
 * §9.5.5 — bring a rendering to one loudness: its RMS over `[from, to)` to `rms`, and no sample past `ceiling` (the
 * whole of it is turned down when a peak would cross it, never clipped).
 */
export function normalise(pcm: Pcm, rms: number, ceiling: number, from = 0, to = Infinity): Pcm {
  const body = loudnessOf(pcm, from, to);
  const all = loudnessOf(pcm);
  if (body.rms <= 0 || all.peak <= 0) return pcm;
  return scale(pcm, Math.min(rms / body.rms, ceiling / all.peak));
}

/** A rendering as a 16-bit stereo WAV file — for listening to a track outside the game. */
export function wavOf(pcm: Pcm): Uint8Array {
  const n = pcm.l.length;
  const out = new Uint8Array(44 + n * 4);
  const v = new DataView(out.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) out[at + i] = s.charCodeAt(i);
  };
  text(0, 'RIFF');
  v.setUint32(4, 36 + n * 4, true);
  text(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 2, true);
  v.setUint32(24, pcm.rate, true);
  v.setUint32(28, pcm.rate * 4, true);
  v.setUint16(32, 4, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, n * 4, true);
  const q = (x: number) => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
  for (let i = 0; i < n; i++) {
    v.setInt16(44 + i * 4, q(pcm.l[i]!), true);
    v.setInt16(46 + i * 4, q(pcm.r[i]!), true);
  }
  return out;
}
