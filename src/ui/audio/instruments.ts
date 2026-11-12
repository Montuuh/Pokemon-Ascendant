import type { Instrument } from './chip';

// §9.5.1 — the voices. The first group is the old handheld's: pulse waves at its four duty cycles (thin 12.5 %, reedy
// 25 %, hollow 50 %), a lead whose duty opens over its first frames and whose vibrato arrives late, the 4-bit triangle
// bass, and the noise register as a drum kit. The second is the successor's sampled feel, as wavetables: strings, a
// trumpet with a scoop, a flute, a bell, an electric piano, an organ.

const pulse = (duty: number[], over: Partial<Instrument> = {}): Instrument => ({ osc: 'pulse', duty, a: 0.003, d: 0.25, s: 0.7, r: 0.04, ...over });

export const INSTRUMENTS = {
  p12: pulse([0.125]),
  p25: pulse([0.25]),
  p50: pulse([0.5]),
  p75: pulse([0.75]),
  /** The lead: thin at the attack, opening to 25 %, the vibrato coming in once the note is held. */
  lead: pulse([0.125, 0.125, 0.25], { vib: [0.22, 5.6, 0.2], s: 0.75 }),
  lead50: pulse([0.25, 0.25, 0.5], { vib: [0.22, 5.6, 0.2], s: 0.75 }),
  /** Plucked pulses, for arpeggios and the second channel's echo. */
  pluck12: pulse([0.125], { d: 0.14, s: 0.12, r: 0.03 }),
  pluck25: pulse([0.25], { d: 0.16, s: 0.15, r: 0.03 }),
  pluck50: pulse([0.5, 0.25], { d: 0.16, s: 0.15, r: 0.03 }),
  /** A chord on one channel, a note a frame-pair: the chip's arpeggio. */
  arp: pulse([0.25], { arp: 2, d: 0.3, s: 0.5 }),
  bass: { osc: 'wave', wave: 'tri4', a: 0.002, d: 0.3, s: 0.75, r: 0.03 },
  ebass: { osc: 'wave', wave: 'ebass', a: 0.002, d: 0.22, s: 0.35, r: 0.04 },
  strings: { osc: 'wave', wave: 'strings', a: 0.07, d: 0.4, s: 0.8, r: 0.14, detune: 9, vib: [0.1, 5, 0.35] },
  trumpet: { osc: 'wave', wave: 'brass', a: 0.012, d: 0.18, s: 0.72, r: 0.05, bend: [-0.8, 0.035], vib: [0.28, 5.8, 0.24] },
  flute: { osc: 'wave', wave: 'flute', a: 0.03, d: 0.3, s: 0.85, r: 0.07, vib: [0.18, 5.4, 0.16] },
  bell: { osc: 'wave', wave: 'bell', a: 0.001, d: 0.32, s: 0, r: 0.25 },
  epiano: { osc: 'wave', wave: 'epiano', a: 0.002, d: 0.45, s: 0.12, r: 0.16 },
  organ: { osc: 'wave', wave: 'organ', a: 0.004, d: 0.1, s: 0.85, r: 0.04 },
  timpani: { osc: 'wave', wave: 'sine', a: 0.001, d: 0.3, s: 0, r: 0.1, bend: [5, 0.04] },
  // The kit.
  kick: { osc: 'wave', wave: 'sine', a: 0.001, d: 0.1, s: 0, r: 0.02, bend: [28, 0.045] },
  click: { osc: 'noise', a: 0.0005, d: 0.006, s: 0, r: 0.004 },
  snare: { osc: 'noise', a: 0.0005, d: 0.07, s: 0, r: 0.03 },
  snareBody: { osc: 'wave', wave: 'sine', a: 0.001, d: 0.045, s: 0, r: 0.02, bend: [10, 0.03] },
  hat: { osc: 'noise', hp: true, a: 0.0005, d: 0.016, s: 0, r: 0.01 },
  openHat: { osc: 'noise', hp: true, a: 0.0005, d: 0.1, s: 0, r: 0.04 },
  crash: { osc: 'noise', hp: true, a: 0.001, d: 0.4, s: 0, r: 0.2 },
  tom: { osc: 'wave', wave: 'sine', a: 0.001, d: 0.15, s: 0, r: 0.04, bend: [9, 0.07] },
} satisfies Record<string, Instrument>;

export type InstrumentId = keyof typeof INSTRUMENTS;

/** A drum hit: the voices it is made of, each at its pitch (for noise, its register's clock) and level. */
export interface DrumPart {
  inst: InstrumentId;
  midi: number;
  vel: number;
  /** Seconds the part is held before it decays on its own. */
  dur: number;
}

/** The drum channel's letters. */
export const DRUMS: Record<string, DrumPart[]> = {
  k: [
    { inst: 'kick', midi: 33, vel: 1, dur: 0.12 },
    { inst: 'click', midi: 130, vel: 0.3, dur: 0.01 },
  ],
  s: [
    { inst: 'snare', midi: 115, vel: 0.62, dur: 0.09 },
    { inst: 'snareBody', midi: 57, vel: 0.5, dur: 0.05 },
  ],
  h: [{ inst: 'hat', midi: 140, vel: 0.3, dur: 0.02 }],
  o: [{ inst: 'openHat', midi: 140, vel: 0.3, dur: 0.1 }],
  c: [{ inst: 'crash', midi: 128, vel: 0.5, dur: 0.4 }],
  t: [{ inst: 'tom', midi: 57, vel: 0.8, dur: 0.15 }],
  m: [{ inst: 'tom', midi: 52, vel: 0.8, dur: 0.15 }],
  f: [{ inst: 'tom', midi: 45, vel: 0.85, dur: 0.18 }],
};
