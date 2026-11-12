import type { Pcm } from './chip';

// §9.5.5 — the desk the chip's renderings are played through: one Web Audio context, an effects bus and a music bus
// under a master with a compressor and a clip guard on it, and a duck on the music for the fanfares. Nothing here makes a sound — the
// samples come from `chip.ts` — it only plays them: a buffer, a bus, a time.
//
// The context is made on the first gesture (a browser will not start sound without one) and sleeps while the tab is
// hidden. Everything that plays asks `ready()` first and does nothing without a running context, so a page that never
// got a gesture — a test, a screenshot — stays silent and stays fast.

export type Bus = 'sfx' | 'music';

const MASTER = 0.9;

export class Synth {
  private ctx: AudioContext | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private ducker: GainNode | null = null;
  private volumes: Record<Bus, number> = { sfx: 0.66, music: 0.33 };
  private running: (() => void)[] = [];
  /** §9.5.5 — told when a fanfare starts on the effects bus, so the music can stop for it (`music.ts`). */
  onFanfare: ((at: number, seconds: number) => void) | null = null;

  /** Make (or wake) the context. Called from a gesture; harmless to call again. */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    if (!this.ctx) {
      // Nothing here is played live against the player's hands: a larger output buffer is cheaper and never crackles.
      const ctx = new AudioContext({ latencyHint: 'balanced' });
      this.ctx = ctx;
      // Two stages. A bus compressor (12:1 over -9 dBFS, 3 ms attack) holds a turn's pile of effects over the music
      // together; what its attack lets through meets the clip guard, a soft knee that is a straight line below
      // CLIP_KNEE and bends towards full scale above it, so the sum can never leave the converter's range.
      const guard = ctx.createWaveShaper();
      guard.curve = clipCurve();
      guard.oversample = '2x';
      guard.connect(ctx.destination);
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -9;
      comp.knee.value = 6;
      comp.ratio.value = 12;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      comp.connect(guard);
      const master = ctx.createGain();
      master.gain.value = MASTER;
      master.connect(comp);
      for (const bus of ['sfx', 'music'] as const) {
        const g = ctx.createGain();
        g.gain.value = this.volumes[bus];
        g.connect(master);
        this.buses[bus] = g;
      }
      this.ducker = ctx.createGain();
      this.ducker.connect(this.buses.music!);
      ctx.addEventListener('statechange', () => {
        if (ctx.state === 'running') for (const cb of this.running) cb();
      });
      // A hidden tab plays nothing: the context's clock stops, so every scheduled note waits where it was.
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) void ctx.suspend();
        else void ctx.resume();
      });
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
  }

  /** The running context, or null while there is none (no gesture yet, a hidden tab, or no Web Audio). */
  ready(): AudioContext | null {
    return this.ctx && this.ctx.state === 'running' ? this.ctx : null;
  }

  /** Called whenever the context starts running (the first gesture, the tab shown again). */
  onRunning(cb: () => void): void {
    this.running.push(cb);
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

  /** A rendering as a buffer the context can play. A mono rendering (`l === r`) is kept as one channel. */
  bufferOf(pcm: Pcm): AudioBuffer | null {
    if (!this.ctx) return null;
    const mono = pcm.l === pcm.r;
    const buf = this.ctx.createBuffer(mono ? 1 : 2, pcm.l.length, pcm.rate);
    buf.getChannelData(0).set(pcm.l);
    if (!mono) buf.getChannelData(1).set(pcm.r);
    return buf;
  }

  /** Where a bus takes its sound: the music's goes through the duck. */
  input(bus: Bus): AudioNode | null {
    return (bus === 'music' ? this.ducker : this.buses.sfx) ?? null;
  }

  /** Play a buffer on a bus at a time on the context's clock. */
  play(buffer: AudioBuffer, bus: Bus, at: number): void {
    const ctx = this.ready();
    const out = this.input(bus);
    if (!ctx || !out) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(out);
    src.start(Math.max(at, ctx.currentTime));
  }

  /** §9.5.5 — turn the music down to `depth` for `seconds` from `at`, and bring it back. */
  duck(at: number, seconds: number, depth = 0.3): void {
    const ctx = this.ready();
    const g = this.ducker?.gain;
    if (!ctx || !g) return;
    const t = Math.max(at, ctx.currentTime);
    g.cancelScheduledValues(t);
    g.setTargetAtTime(depth, t, 0.02);
    g.setTargetAtTime(1, t + seconds, 0.12);
  }
}

/** Where the clip guard starts to bend, 0-1. */
export const CLIP_KNEE = 0.8;

/** The clip guard's response: the input itself up to the knee, then a curve that closes on full scale and never passes it. Pure. */
export function clipAt(x: number): number {
  const a = Math.abs(x);
  if (a <= CLIP_KNEE) return x;
  return Math.sign(x) * (CLIP_KNEE + (1 - CLIP_KNEE) * Math.tanh((a - CLIP_KNEE) / (1 - CLIP_KNEE)));
}

function clipCurve(): Float32Array<ArrayBuffer> {
  // A WaveShaper's curve spans an input of -1 to 1, and an input beyond that takes the curve's last value: the ceiling.
  const n = 2049;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = clipAt((i / (n - 1)) * 2 - 1);
  return curve;
}

export const synth = new Synth();
