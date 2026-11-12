import { loudnessOf, type Loudness } from './chip';
import { renderTrack, trackOf, type RenderedTrack, type RenderReply, type RenderRequest } from './render';
import { TRACKS, type TrackId } from './songs';
import { synth } from './synth';

// §9.5.4 — the music, played. A track is a song from the songbook (`songs.ts`) rendered once by the chip into a buffer
// — its intro, one pass of its loop, and the first moments of the next pass — and then left to the browser: one buffer
// source with a loop point, sample-exact, no timer anywhere near a note. The rendering happens in a worker
// (`render.worker.ts`) and comes back as transferred buffers, so a change of music costs the page nothing. §9.5.2's
// tension stem is a second, mono buffer on the same clock, faded in and out. The player keeps one track sounding at a
// time, cross-fades between them, steps aside for a fanfare and picks the track up where it stopped, and brings a
// route back where the fight interrupted it.

export { TRACK_IDS, TRACKS, type TrackId } from './songs';
export { renderTrack, type RenderedTrack } from './render';

/**
 * The renderings kept, least recently used first: a track asked for again moves to the back of the line, and what is
 * dropped when there are too many is the one untouched longest — never one the player has named as in use.
 */
export class TrackCache<T> {
  private readonly map = new Map<string, T>();
  constructor(private readonly kept: number) {}

  has(id: string): boolean {
    return this.map.has(id);
  }

  /** Read a rendering; reading it is using it. */
  get(id: string): T | undefined {
    const v = this.map.get(id);
    if (v === undefined) return undefined;
    this.map.delete(id);
    this.map.set(id, v);
    return v;
  }

  /** Keep a rendering, then drop the least recently used past the limit, sparing `inUse`. */
  set(id: string, v: T, inUse: ReadonlySet<string> = new Set()): void {
    this.map.delete(id);
    this.map.set(id, v);
    for (const old of [...this.map.keys()]) {
      if (this.map.size <= this.kept) break;
      if (old !== id && !inUse.has(old)) this.map.delete(old);
    }
  }

  ids(): string[] {
    return [...this.map.keys()];
  }
}

/** Ask the worker for a track; with no worker (a test, an old browser) render it here, off the current task. */
let worker: Worker | null | undefined;
const waiting = new Map<TrackId, (t: RenderedTrack) => void>();
function renderAway(id: TrackId): Promise<RenderedTrack> {
  if (worker === undefined) {
    try {
      worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./render.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      worker = null;
    }
    if (worker) {
      worker.onmessage = (e: MessageEvent<RenderReply>) => {
        waiting.get(e.data.id)?.(trackOf(e.data));
        waiting.delete(e.data.id);
      };
      // A worker that cannot start (a blocked script, a broken build) hands what it owed to the main thread.
      worker.onerror = () => {
        worker = null;
        for (const [owed, done] of [...waiting]) done(renderTrack(owed));
        waiting.clear();
      };
    }
  }
  return new Promise((resolve) => {
    if (worker) {
      waiting.set(id, resolve);
      worker.postMessage({ id } satisfies RenderRequest);
    } else setTimeout(() => resolve(renderTrack(id)), 0);
  });
}

/** Tracks kept rendered: the one playing, the place to go back to, and what the director expects next. */
const KEPT = 4;
const FADE_OUT = 0.3;
const FADE_IN = 0.2;
const TENSION_FADE = 0.25;

interface Ready {
  main: AudioBuffer;
  stem: AudioBuffer | null;
  loopStart: number;
  loopEnd: number;
  seconds: number;
}

interface Playing {
  id: TrackId;
  track: Ready;
  src: AudioBufferSourceNode;
  stem: AudioBufferSourceNode | null;
  gain: GainNode;
  stemGain: GainNode | null;
  /** The context time the sources start at, and where in the buffer. */
  at: number;
  offset: number;
}

/** Where a buffer that started at `offset` is after `elapsed` seconds, wrapping at its loop point. Pure. */
export function positionAfter(offset: number, elapsed: number, loopStart: number, loopEnd: number, seconds: number): number {
  const p = offset + Math.max(0, elapsed);
  if (loopEnd > loopStart) return p < loopEnd ? p : loopStart + ((p - loopStart) % (loopEnd - loopStart));
  return p < seconds ? p : 0;
}

class MusicPlayer {
  private current: TrackId | null = null;
  /** The screen's track (the director's), and a scene's over it — the evolution — or its silence (`hush`). */
  private base: TrackId | null = null;
  private scene: TrackId | 'hush' | null = null;
  private tension = false;
  private playing: Playing | null = null;
  private readonly tracks = new TrackCache<Ready | RenderedTrack>(KEPT);
  /** The last place's track (a route, a City): what a fight goes back to, so it is never dropped under one. */
  private place: TrackId | null = null;
  private readonly queue: TrackId[] = [];
  private rendering = false;
  /** Where each resumable track was when it last stopped. */
  private readonly left = new Map<TrackId, number>();
  /** §9.5.5 — a fanfare has the floor until this context time. */
  private holdUntil = 0;
  private wired = false;

  get track(): TrackId | null {
    return this.current;
  }

  /** Whether the current track is actually sounding (a context, a rendering, a source) — for the dev tools. */
  get sounding(): boolean {
    return this.playing !== null;
  }

  /** Where the sounding track is in its buffer, in seconds. */
  get position(): number {
    const p = this.playing;
    return p ? positionAfter(p.offset, synth.now() - p.at, p.track.loopStart, p.track.loopEnd, p.track.seconds) : 0;
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

  /** §9.5.2 — the tension stem, in or out. */
  setTension(on: boolean): void {
    this.tension = on;
    const p = this.playing;
    const ctx = synth.ready();
    if (!p?.stemGain || !ctx) return;
    p.stemGain.gain.cancelScheduledValues(ctx.currentTime);
    p.stemGain.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, TENSION_FADE / 3);
  }

  /** Render tracks the director expects next, behind the one playing. */
  prewarm(ids: readonly TrackId[]): void {
    for (const id of ids) if (!this.tracks.has(id) && !this.queue.includes(id)) this.queue.push(id);
    this.pump();
  }

  private wire(): void {
    if (this.wired) return;
    this.wired = true;
    synth.onRunning(() => {
      this.pump();
      this.begin();
    });
    synth.onFanfare = (at, seconds) => this.holdFor(at, seconds);
  }

  private switchTo(id: TrackId | null): void {
    this.wire();
    if (id === this.current) return;
    this.stop(FADE_OUT);
    this.current = id;
    if (!id) return;
    if (!this.tracks.has(id) && !this.queue.includes(id)) this.queue.unshift(id);
    this.pump();
    this.begin();
  }

  /** Render what is queued, the current track first, one at a time — once there is a context to play it on. */
  private pump(): void {
    if (this.rendering || !synth.ready()) return;
    const at = this.current ? this.queue.indexOf(this.current) : -1;
    const id = at >= 0 ? this.queue.splice(at, 1)[0] : this.queue.shift();
    if (!id) return;
    this.rendering = true;
    void renderAway(id).then((r) => {
      this.rendering = false;
      this.tracks.set(id, r, this.inUse());
      this.begin();
      this.pump();
    });
  }

  /** What must stay rendered: what sounds, what is wanted, and the place a fight returns to. */
  private inUse(): ReadonlySet<string> {
    return new Set([this.current, this.base, this.place, this.playing?.id].filter((x): x is TrackId => !!x));
  }

  /** The ids rendered and kept, least recently used first — for the dev tools. */
  get kept(): string[] {
    return this.tracks.ids();
  }

  /** A rendering as buffers, made once the context exists. */
  private ready(id: TrackId): Ready | null {
    const t = this.tracks.get(id);
    if (!t) return null;
    if ('main' in t) return t;
    const main = synth.bufferOf(t.pcm);
    if (!main) return null;
    const r: Ready = { main, stem: t.tension ? synth.bufferOf(t.tension) : null, loopStart: t.loopStart, loopEnd: t.loopEnd, seconds: t.seconds };
    this.tracks.set(id, r, this.inUse());
    return r;
  }

  /** Start the current track if it is not sounding and everything it needs is there. */
  private begin(): void {
    const id = this.current;
    if (!id || this.playing?.id === id) return;
    const ctx = synth.ready();
    if (!ctx) return;
    const track = this.ready(id);
    if (!track) return;
    if (TRACKS[id].resume) this.place = id;
    const offset = TRACKS[id].resume ? (this.left.get(id) ?? 0) : 0;
    this.left.delete(id);
    this.start(id, track, offset, Math.max(ctx.currentTime + 0.04, this.holdUntil));
  }

  private start(id: TrackId, track: Ready, offset: number, at: number): void {
    const ctx = synth.ready();
    const out = synth.input('music');
    if (!ctx || !out) return;
    const source = (buffer: AudioBuffer, to: AudioNode): AudioBufferSourceNode => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (track.loopEnd > 0) {
        src.loop = true;
        src.loopStart = track.loopStart;
        src.loopEnd = track.loopEnd;
      }
      src.connect(to);
      src.start(at, offset);
      return src;
    };
    const gain = ctx.createGain();
    gain.connect(out);
    // A track picked up mid-way fades in; one that starts at its first bar keeps its attack.
    if (offset > 0) {
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + FADE_IN);
    }
    let stemGain: GainNode | null = null;
    let stem: AudioBufferSourceNode | null = null;
    if (track.stem) {
      stemGain = ctx.createGain();
      stemGain.gain.value = this.tension ? 1 : 0;
      stemGain.connect(gain);
      stem = source(track.stem, stemGain);
    }
    this.playing = { id, track, src: source(track.main, gain), stem, gain, stemGain, at, offset };
  }

  /** Fade the sounding track out and let it go; a resumable track remembers where it was. */
  private stop(fade: number): number {
    const p = this.playing;
    if (!p) return 0;
    const where = this.position;
    this.playing = null;
    if (TRACKS[p.id].resume) this.left.set(p.id, where);
    const now = synth.now();
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0, now + fade);
    for (const s of [p.src, p.stem]) {
      if (!s) continue;
      try {
        s.stop(now + fade + 0.02);
      } catch {
        // A source that was never started (the context closed under it) has nothing to stop.
      }
    }
    window.setTimeout(() => p.gain.disconnect(), (fade + 0.2) * 1000);
    return where;
  }

  /** §9.5.5 — a fanfare takes the floor from `at` for `seconds`: the track stops, and starts again where it was. */
  private holdFor(at: number, seconds: number): void {
    this.holdUntil = Math.max(this.holdUntil, at + seconds);
    const p = this.playing;
    if (!p) return;
    const where = this.stop(0.06);
    this.left.delete(p.id);
    this.start(p.id, p.track, where, this.holdUntil);
  }
}

export const music = new MusicPlayer();

/** §9.5.5 — a track's loudness over what loops, its peak over all of it, and its form: what the dev tools report. */
export function measureTrack(id: TrackId): Loudness & { seconds: number; introSeconds: number; loopSeconds: number; tensionRms: number } {
  const t = renderTrack(id);
  const loops = t.loopEnd > 0;
  return {
    peak: loudnessOf(t.pcm).peak,
    rms: loudnessOf(t.pcm, loops ? t.loopStart : 0, loops ? t.loopEnd : t.introSeconds).rms,
    seconds: t.seconds,
    introSeconds: t.introSeconds,
    loopSeconds: t.loopSeconds,
    tensionRms: t.tension ? loudnessOf(t.tension).rms : 0,
  };
}
