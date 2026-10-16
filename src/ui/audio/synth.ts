// §9.5 — the game's whole sound, made in code: a Web Audio synthesiser with two voices (a tone and a filtered noise)
// on two buses (effects and music) under one master. No files, nothing of Nintendo's: every sound is a recipe of
// these two primitives (`sfx.ts`), every song a pattern over them (`music.ts`).
//
// The context is made on the first gesture (a browser will not start sound without one) and is the only state here.
// Everything that plays asks `ready()` first and does nothing without a context, so a page that never got a gesture —
// a test, a screenshot — stays silent and stays fast.

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth';
export type Bus = 'sfx' | 'music';

/** A tone: one oscillator, a pitch glide, an envelope. Times in seconds from `at`. */
export interface ToneSpec {
  wave: Wave;
  /** Hz at the start, and at the end of the glide (the same for a steady note). */
  from: number;
  to?: number;
  dur: number;
  gain: number;
  attack?: number;
  delay?: number;
  /** A lowpass over the tone, for a softer edge. */
  cutoff?: number;
}

/** A noise burst through a filter whose centre sweeps — a whoosh, a splash, a crackle, a thud. */
export interface NoiseSpec {
  filter: BiquadFilterType;
  from: number;
  to?: number;
  q?: number;
  dur: number;
  gain: number;
  attack?: number;
  delay?: number;
}

const MASTER = 0.8;

export class Synth {
  private ctx: BaseAudioContext | null = null;
  /** An offline context renders to a buffer and is always ready (`renderOffline`). */
  private offline = false;
  private master: GainNode | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private noiseBuffer: AudioBuffer | null = null;
  private volumes: Record<Bus, number> = { sfx: 0.66, music: 0.33 };

  /** A synthesiser on an offline context, for measuring a sound without playing it (the tests' ears). */
  static offline(ctx: OfflineAudioContext, volumes: Partial<Record<Bus, number>> = {}): Synth {
    const s = new Synth();
    s.offline = true;
    s.ctx = ctx;
    s.master = ctx.createGain();
    s.master.gain.value = MASTER;
    s.master.connect(ctx.destination);
    for (const bus of ['sfx', 'music'] as const) {
      const g = ctx.createGain();
      g.gain.value = volumes[bus] ?? 1;
      g.connect(s.master);
      s.buses[bus] = g;
    }
    return s;
  }

  /** Make (or wake) the context. Called from a gesture; harmless to call again. */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = MASTER;
      this.master.connect(ctx.destination);
      for (const bus of ['sfx', 'music'] as const) {
        const g = ctx.createGain();
        g.gain.value = this.volumes[bus];
        g.connect(this.master);
        this.buses[bus] = g;
      }
    }
    if (this.ctx instanceof AudioContext && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** The running context, or null while there is none (no gesture yet, or no Web Audio). */
  ready(): BaseAudioContext | null {
    return this.ctx && (this.offline || this.ctx.state === 'running') ? this.ctx : null;
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  setVolume(bus: Bus, v: number): void {
    this.volumes[bus] = v;
    const g = this.buses[bus];
    if (g && this.ctx) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  volume(bus: Bus): number {
    return this.volumes[bus];
  }

  /** A gain node on a bus, for a voice that wants its own level (the music's layers). */
  channel(bus: Bus, level = 1): GainNode | null {
    const ctx = this.ready();
    const out = this.buses[bus];
    if (!ctx || !out) return null;
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(out);
    return g;
  }

  tone(spec: ToneSpec, at: number, out: AudioNode | Bus = 'sfx'): void {
    const ctx = this.ready();
    const dest = typeof out === 'string' ? this.buses[out] : out;
    if (!ctx || !dest || spec.gain <= 0) return;
    const t0 = at + (spec.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.setValueAtTime(spec.from, t0);
    if (spec.to && spec.to !== spec.from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), t0 + spec.dur);
    const env = envelope(ctx, t0, spec.dur, spec.gain, spec.attack ?? 0.005);
    let node: AudioNode = osc;
    if (spec.cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = spec.cutoff;
      node.connect(lp);
      node = lp;
    }
    node.connect(env);
    env.connect(dest);
    osc.start(t0);
    osc.stop(t0 + spec.dur + 0.05);
  }

  noise(spec: NoiseSpec, at: number, out: AudioNode | Bus = 'sfx'): void {
    const ctx = this.ready();
    const dest = typeof out === 'string' ? this.buses[out] : out;
    if (!ctx || !dest || spec.gain <= 0) return;
    const t0 = at + (spec.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseOf(ctx);
    const f = ctx.createBiquadFilter();
    f.type = spec.filter;
    f.Q.value = spec.q ?? 1;
    f.frequency.setValueAtTime(spec.from, t0);
    if (spec.to && spec.to !== spec.from) f.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), t0 + spec.dur);
    const env = envelope(ctx, t0, spec.dur, spec.gain, spec.attack ?? 0.005);
    src.connect(f);
    f.connect(env);
    env.connect(dest);
    src.start(t0);
    src.stop(t0 + spec.dur + 0.05);
  }

  private noiseOf(ctx: BaseAudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Presentation only: the sim's RNG rule (§10.7) is for the game's outcomes, and hiss decides none.
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
    return buf;
  }
}

/** An attack-then-decay envelope: up in `attack`, down to silence by the end. */
function envelope(ctx: BaseAudioContext, t0: number, dur: number, peak: number, attack: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + Math.min(attack, dur * 0.5));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return g;
}

export const synth = new Synth();

/** A MIDI note number as Hz (A4 = 69 = 440 Hz). */
export const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
