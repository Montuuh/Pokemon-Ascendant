import { loudnessOf, Renderer, scale, type Pcm } from './chip';
import { echoOf, expand } from './score';
import { TRACKS, type TrackId } from './songs';

// §9.5.4 / §9.5.5 — a song from the songbook as samples: expanded, rendered by the chip and brought to the songbook's
// one loudness. Pure, and free of the page (no Web Audio, no window), so the same function runs in the render worker,
// on the main thread where there is no worker, and in the unit tests.

/** §9.5.5 — the songbook's loudness: every track's RMS over what loops, and the peak none may pass. */
export const SONG_RMS = 0.16;
export const SONG_CEILING = 0.89;

/** A track as samples, at the songbook's one loudness (§9.5.5). */
export interface RenderedTrack {
  pcm: Pcm;
  /** The tension stem, mono (`l === r`), on the same clock; null for a track with none. */
  tension: Pcm | null;
  /** Where the buffer wraps from and to, in seconds; both 0 for a track that plays once. */
  loopStart: number;
  loopEnd: number;
  seconds: number;
  introSeconds: number;
  loopSeconds: number;
}

/** §9.5.4 — a track rendered in one go. */
export function renderTrack(id: TrackId): RenderedTrack {
  const song = TRACKS[id];
  const x = expand(song);
  const pcm = new Renderer(x.notes, x.seconds, echoOf(song)).finish();
  const tension = x.tension.length ? new Renderer(x.tension, x.seconds, null, true).finish() : null;
  const loops = x.loopEnd > 0;
  const body = loudnessOf(pcm, loops ? x.loopStart : 0, loops ? x.loopEnd : x.introSeconds);
  const peak = loudnessOf(pcm).peak;
  const gain = body.rms > 0 ? Math.min(SONG_RMS / body.rms, SONG_CEILING / peak) : 1;
  scale(pcm, gain);
  // The stem is one array under both names: scale it once.
  if (tension) for (let i = 0; i < tension.l.length; i++) tension.l[i] = tension.l[i]! * gain;
  return { pcm, tension, loopStart: x.loopStart, loopEnd: x.loopEnd, seconds: x.seconds, introSeconds: x.introSeconds, loopSeconds: x.loopSeconds };
}

/** What the render worker is asked, and what it answers: the samples go across as transferred buffers, not copies. */
export interface RenderRequest {
  id: TrackId;
}
export interface RenderReply {
  id: TrackId;
  l: Float32Array;
  r: Float32Array;
  rate: number;
  stem: Float32Array | null;
  loopStart: number;
  loopEnd: number;
  seconds: number;
  introSeconds: number;
  loopSeconds: number;
}

export function replyOf(id: TrackId, t: RenderedTrack): RenderReply {
  return { id, l: t.pcm.l, r: t.pcm.r, rate: t.pcm.rate, stem: t.tension ? t.tension.l : null, loopStart: t.loopStart, loopEnd: t.loopEnd, seconds: t.seconds, introSeconds: t.introSeconds, loopSeconds: t.loopSeconds };
}

export function trackOf(m: RenderReply): RenderedTrack {
  return {
    pcm: { l: m.l, r: m.r, rate: m.rate },
    tension: m.stem ? { l: m.stem, r: m.stem, rate: m.rate } : null,
    loopStart: m.loopStart,
    loopEnd: m.loopEnd,
    seconds: m.seconds,
    introSeconds: m.introSeconds,
    loopSeconds: m.loopSeconds,
  };
}
