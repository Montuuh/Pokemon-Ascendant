import type { CombatEvent, PokemonType, StatusCondition } from '@/sim';
import { hz, Synth, synth, type NoiseSpec, type ToneSpec } from './synth';

// §9.5.3 — every sound effect as a recipe: a few tones and noise bursts, each with its own delay. The recipes are data
// (`SFX`), the choice of which plays is a pure function of the fight's events (`sfxForEvent`), and the only thing that
// touches Web Audio is `playSfx`. A card's whoosh is coloured by its type: Fire crackles, Water splashes.

type Step = ({ kind: 'tone' } & ToneSpec) | ({ kind: 'noise' } & NoiseSpec);
const tone = (s: ToneSpec): Step => ({ kind: 'tone', ...s });
const hiss = (s: NoiseSpec): Step => ({ kind: 'noise', ...s });

/** §9.5.3 — the type-coded part of a card's whoosh: what the move's type adds on top of the swish. */
export const TYPE_TIMBRE: Record<PokemonType, Step[]> = {
  normal: [tone({ wave: 'triangle', from: 330, to: 220, dur: 0.12, gain: 0.25 })],
  fire: [
    hiss({ filter: 'bandpass', from: 2400, to: 900, q: 2, dur: 0.22, gain: 0.5 }),
    hiss({ filter: 'highpass', from: 4000, dur: 0.05, gain: 0.25, delay: 0.06 }),
    hiss({ filter: 'highpass', from: 4500, dur: 0.04, gain: 0.2, delay: 0.13 }),
  ],
  water: [
    hiss({ filter: 'bandpass', from: 1800, to: 400, q: 1.5, dur: 0.3, gain: 0.5 }),
    tone({ wave: 'sine', from: 900, to: 300, dur: 0.18, gain: 0.2, delay: 0.04 }),
  ],
  grass: [hiss({ filter: 'bandpass', from: 3000, to: 1500, q: 3, dur: 0.2, gain: 0.35 }), tone({ wave: 'sine', from: 660, to: 880, dur: 0.12, gain: 0.12 })],
  electric: [
    tone({ wave: 'square', from: 1200, to: 300, dur: 0.08, gain: 0.18 }),
    tone({ wave: 'square', from: 1600, to: 500, dur: 0.06, gain: 0.15, delay: 0.07 }),
    tone({ wave: 'sawtooth', from: 900, to: 1400, dur: 0.06, gain: 0.12, delay: 0.13 }),
  ],
  ice: [tone({ wave: 'sine', from: 2200, to: 2600, dur: 0.2, gain: 0.15 }), tone({ wave: 'triangle', from: 3300, dur: 0.15, gain: 0.08, delay: 0.05 })],
  fighting: [hiss({ filter: 'lowpass', from: 900, to: 200, dur: 0.12, gain: 0.6 }), tone({ wave: 'triangle', from: 180, to: 90, dur: 0.12, gain: 0.35 })],
  poison: [tone({ wave: 'sawtooth', from: 260, to: 180, dur: 0.22, gain: 0.12, cutoff: 900 }), hiss({ filter: 'bandpass', from: 700, q: 6, dur: 0.18, gain: 0.25, delay: 0.05 })],
  ground: [hiss({ filter: 'lowpass', from: 500, to: 120, dur: 0.3, gain: 0.7 }), tone({ wave: 'sine', from: 90, to: 50, dur: 0.3, gain: 0.4 })],
  flying: [hiss({ filter: 'bandpass', from: 600, to: 2400, q: 1, dur: 0.28, gain: 0.45 })],
  psychic: [tone({ wave: 'sine', from: 440, to: 880, dur: 0.3, gain: 0.15 }), tone({ wave: 'sine', from: 554, to: 1108, dur: 0.3, gain: 0.1, delay: 0.03 })],
  bug: [tone({ wave: 'square', from: 520, to: 560, dur: 0.15, gain: 0.08, cutoff: 2000 }), hiss({ filter: 'bandpass', from: 2600, q: 8, dur: 0.15, gain: 0.25 })],
  rock: [hiss({ filter: 'lowpass', from: 700, to: 200, dur: 0.18, gain: 0.6 }), hiss({ filter: 'lowpass', from: 500, dur: 0.1, gain: 0.4, delay: 0.1 })],
  ghost: [tone({ wave: 'sine', from: 300, to: 200, dur: 0.4, gain: 0.15 }), tone({ wave: 'sine', from: 310, to: 205, dur: 0.4, gain: 0.12 })],
  dragon: [tone({ wave: 'sawtooth', from: 110, to: 220, dur: 0.3, gain: 0.2, cutoff: 1200 }), hiss({ filter: 'bandpass', from: 400, to: 1600, q: 1, dur: 0.3, gain: 0.35 })],
};

/** §9.5.3 — the status stings, one motif each. */
export const STATUS_STING: Record<StatusCondition, Step[]> = {
  burn: [hiss({ filter: 'bandpass', from: 1500, to: 700, q: 2, dur: 0.3, gain: 0.35 }), tone({ wave: 'triangle', from: 494, to: 392, dur: 0.25, gain: 0.15 })],
  poison: [tone({ wave: 'sawtooth', from: 311, to: 233, dur: 0.3, gain: 0.12, cutoff: 1000 }), tone({ wave: 'sine', from: 233, dur: 0.2, gain: 0.12, delay: 0.15 })],
  paralysis: [tone({ wave: 'square', from: 1400, to: 700, dur: 0.06, gain: 0.12 }), tone({ wave: 'square', from: 1400, to: 700, dur: 0.06, gain: 0.12, delay: 0.1 })],
  sleep: [tone({ wave: 'sine', from: 523, to: 392, dur: 0.35, gain: 0.15 }), tone({ wave: 'sine', from: 392, to: 330, dur: 0.4, gain: 0.12, delay: 0.25 })],
  freeze: [tone({ wave: 'sine', from: 2637, dur: 0.12, gain: 0.12 }), tone({ wave: 'sine', from: 3136, dur: 0.2, gain: 0.1, delay: 0.08 })],
  confusion: [tone({ wave: 'sine', from: 440, to: 620, dur: 0.15, gain: 0.12 }), tone({ wave: 'sine', from: 620, to: 400, dur: 0.15, gain: 0.12, delay: 0.15 })],
};

/** A chord as tones: each MIDI note a short soft voice. */
const chord = (notes: number[], dur: number, gain: number, delay = 0, wave: ToneSpec['wave'] = 'triangle'): Step[] =>
  notes.map((n) => tone({ wave, from: hz(n), dur, gain, delay, attack: 0.01 }));
/** An arpeggio: one note after another, `step` apart. */
const arp = (notes: number[], step: number, dur: number, gain: number, wave: ToneSpec['wave'] = 'square'): Step[] =>
  notes.map((n, i) => tone({ wave, from: hz(n), dur, gain, delay: i * step, cutoff: 3000 }));

export const SFX = {
  // §9.5.3 — the card's swish under its type; a consumable's soft chime.
  'card-swish': [hiss({ filter: 'bandpass', from: 800, to: 2600, q: 0.8, dur: 0.16, gain: 0.3 })],
  consumable: [tone({ wave: 'sine', from: hz(84), dur: 0.25, gain: 0.12 }), tone({ wave: 'sine', from: hz(91), dur: 0.3, gain: 0.08, delay: 0.06 })],
  // The hit, and how it landed.
  hit: [hiss({ filter: 'lowpass', from: 1400, to: 300, dur: 0.12, gain: 0.5 }), tone({ wave: 'triangle', from: 160, to: 80, dur: 0.12, gain: 0.3 })],
  'hit-super': [
    hiss({ filter: 'lowpass', from: 2000, to: 200, dur: 0.25, gain: 0.7 }),
    tone({ wave: 'sawtooth', from: 120, to: 50, dur: 0.25, gain: 0.35, cutoff: 900 }),
    tone({ wave: 'square', from: 880, to: 1320, dur: 0.08, gain: 0.1, delay: 0.02 }),
  ],
  'hit-resisted': [hiss({ filter: 'lowpass', from: 400, to: 150, dur: 0.1, gain: 0.4 })],
  crit: [tone({ wave: 'sine', from: hz(100), dur: 0.18, gain: 0.15 }), tone({ wave: 'sine', from: hz(107), dur: 0.25, gain: 0.1, delay: 0.04 })],
  heal: arp([72, 76, 79, 84], 0.05, 0.18, 0.08, 'sine'),
  // §9.5.3 — a confident step plus a chord for your swap; directional whooshes for the steps.
  swap: [hiss({ filter: 'lowpass', from: 300, dur: 0.06, gain: 0.5 }), ...chord([60, 64, 67], 0.3, 0.07, 0.06)],
  'step-forward': [hiss({ filter: 'bandpass', from: 500, to: 2000, q: 1, dur: 0.18, gain: 0.35 })],
  'step-backward': [hiss({ filter: 'bandpass', from: 2000, to: 500, q: 1, dur: 0.18, gain: 0.35 })],
  faint: [tone({ wave: 'triangle', from: 392, to: 98, dur: 0.6, gain: 0.25 }), hiss({ filter: 'lowpass', from: 300, dur: 0.2, gain: 0.3, delay: 0.45 })],
  'stat-up': arp([67, 71, 74], 0.05, 0.12, 0.07),
  'stat-down': arp([74, 70, 67], 0.05, 0.12, 0.07),
  draw: [hiss({ filter: 'highpass', from: 3000, dur: 0.04, gain: 0.15 }), hiss({ filter: 'highpass', from: 3500, dur: 0.04, gain: 0.12, delay: 0.05 })],
  // §9.5.3 — a solid bell for End Turn.
  'end-turn': [tone({ wave: 'sine', from: hz(76), dur: 0.6, gain: 0.15 }), tone({ wave: 'sine', from: hz(88), dur: 0.4, gain: 0.05 }), tone({ wave: 'sine', from: hz(95), dur: 0.25, gain: 0.03 })],
  'enemy-enter': [hiss({ filter: 'bandpass', from: 400, to: 1800, q: 1, dur: 0.2, gain: 0.25 }), tone({ wave: 'square', from: hz(67), dur: 0.08, gain: 0.06, delay: 0.15, cutoff: 2500 })],
  // §9.5.3 — rising tension then a hit for a boss's new phase.
  phase: [tone({ wave: 'sawtooth', from: 110, to: 440, dur: 0.5, gain: 0.15, cutoff: 1500 }), hiss({ filter: 'lowpass', from: 1500, to: 200, dur: 0.35, gain: 0.6, delay: 0.5 }), ...chord([45, 52, 57], 0.6, 0.1, 0.5, 'sawtooth')],
  'combo-break': [tone({ wave: 'square', from: 1046, to: 523, dur: 0.15, gain: 0.1 }), hiss({ filter: 'highpass', from: 3000, dur: 0.1, gain: 0.2 })],
  // The ball: thrown, opening on the Pokémon (its beam drawing it in), down to the ground with a bounce, a wobble per
  // check, then the click — or the burst.
  'ball-throw': [hiss({ filter: 'bandpass', from: 600, to: 2400, q: 1, dur: 0.3, gain: 0.3 })],
  'ball-open': [tone({ wave: 'square', from: 300, to: 1500, dur: 0.22, gain: 0.07, cutoff: 3500 }), hiss({ filter: 'highpass', from: 2500, to: 5000, dur: 0.35, gain: 0.18, delay: 0.05 }), tone({ wave: 'sine', from: 1200, to: 200, dur: 0.4, gain: 0.08, delay: 0.25 })],
  'ball-land': [tone({ wave: 'triangle', from: 320, to: 110, dur: 0.07, gain: 0.3 }), hiss({ filter: 'lowpass', from: 900, dur: 0.05, gain: 0.3 }), tone({ wave: 'triangle', from: 300, to: 120, dur: 0.05, gain: 0.14, delay: 0.19 })],
  'ball-shake': [tone({ wave: 'triangle', from: 220, to: 180, dur: 0.08, gain: 0.25 }), hiss({ filter: 'lowpass', from: 600, dur: 0.05, gain: 0.25 })],
  'ball-click': [tone({ wave: 'square', from: hz(88), dur: 0.04, gain: 0.12, cutoff: 4000 }), ...arp([72, 76, 79, 84], 0.08, 0.3, 0.08)],
  'ball-break': [hiss({ filter: 'highpass', from: 2000, dur: 0.15, gain: 0.4 }), tone({ wave: 'square', from: 660, to: 220, dur: 0.2, gain: 0.08, cutoff: 2500 })],
  // Stings for the fight's end, the level, the evolution.
  victory: arp([72, 76, 79, 84, 79, 84], 0.09, 0.3, 0.09),
  defeat: arp([64, 60, 57, 52], 0.18, 0.5, 0.08, 'triangle'),
  'level-up': arp([72, 74, 76, 77, 79, 84], 0.06, 0.2, 0.08),
  // The evolution: the light's rise as the sprite whitens; the fanfare when the new Pokémon stands in its colours.
  evolve: [tone({ wave: 'sine', from: 220, to: 880, dur: 1.2, gain: 0.12 }), hiss({ filter: 'bandpass', from: 1500, to: 6000, q: 0.7, dur: 1.2, gain: 0.08 })],
  evolved: [...arp([67, 72, 76, 79], 0.09, 0.22, 0.08, 'square'), ...chord([72, 76, 79, 84], 1, 0.06, 0.38, 'triangle'), tone({ wave: 'square', from: hz(91), dur: 0.6, gain: 0.04, delay: 0.38, cutoff: 3000 })],
  // The interface: a soft tick on a button.
  'ui-click': [tone({ wave: 'sine', from: 900, to: 700, dur: 0.05, gain: 0.05 })],
} satisfies Record<string, Step[]>;

export type BaseSfxId = keyof typeof SFX;
export type SfxId = BaseSfxId | `card-${PokemonType}` | `status-${StatusCondition}`;

/** The steps a sound is made of: a card is the swish and its type, a status its sting. */
export function stepsOf(id: SfxId): Step[] {
  if (id.startsWith('card-') && id !== 'card-swish') return [...SFX['card-swish'], ...TYPE_TIMBRE[id.slice(5) as PokemonType]];
  if (id.startsWith('status-')) return STATUS_STING[id.slice(7) as StatusCondition];
  return SFX[id as BaseSfxId];
}

/** What the fight's lookups tell the mapping: who is on your side, and each move's type. */
export interface SfxLookup {
  isPlayer: (uid: string) => boolean;
  moveType: (moveId: string) => PokemonType;
}

/**
 * §9.5.3 — the sounds one event makes. Pure: the screen feeds it the fight's new events and plays what comes back.
 * Events the player already hears another way (an intent, a field change) make none.
 */
export function sfxForEvent(e: CombatEvent, look: SfxLookup): SfxId[] {
  switch (e.t) {
    case 'card-played':
      return [`card-${look.moveType(e.moveId)}`];
    case 'consumable-used':
      return ['consumable'];
    case 'damage':
      if (e.amount <= 0) return [];
      return [e.effectiveness === 'double' || e.effectiveness === 'quad' ? 'hit-super' : e.effectiveness === 'half' || e.effectiveness === 'quarter' ? 'hit-resisted' : 'hit', ...(e.crit ? (['crit'] as const) : [])];
    case 'heal':
      return e.amount > 0 && e.cause !== 'regen' ? ['heal'] : [];
    case 'status-applied':
      return [`status-${e.status}`];
    case 'stage':
      return e.delta > 0 ? ['stat-up'] : e.delta < 0 ? ['stat-down'] : [];
    case 'swap':
      return e.kind === 'step-forward' ? ['step-forward'] : e.kind === 'step-backward' ? ['step-backward'] : ['swap'];
    case 'faint':
      return ['faint'];
    case 'enemy-enter':
      return ['enemy-enter'];
    case 'phase':
      return e.phase > 1 ? ['phase'] : [];
    case 'combo-break':
      return ['combo-break'];
    case 'catch':
      return ['ball-throw'];
    case 'turn-start':
      return [];
    case 'outcome':
      return e.outcome === 'victory' || e.outcome === 'caught' ? ['victory'] : e.outcome === 'defeat' ? ['defeat'] : [];
    default:
      return [];
  }
}

/** The last sounds asked for, newest last — read by the tests and the dev tools, since a test cannot listen. */
const recent: SfxId[] = [];
export const recentSfx = (): readonly SfxId[] => recent;

/** Play a sound now (or `delay` seconds from now). Silent until a gesture has unlocked the context. */
export function playSfx(id: SfxId, delay = 0): void {
  recent.push(id);
  if (recent.length > 64) recent.shift();
  schedule(synth, id, synth.now() + delay);
}

function schedule(on: Synth, id: SfxId, at: number): void {
  for (const step of stepsOf(id)) {
    if (step.kind === 'tone') on.tone(step, at, 'sfx');
    else on.noise(step, at, 'sfx');
  }
}

/** How loud a rendering is: its peak and its RMS, on a 0–1 scale. */
export interface Loudness {
  peak: number;
  rms: number;
}
export function loudnessOf(buf: AudioBuffer): Loudness {
  const data = buf.getChannelData(0);
  let peak = 0;
  let sum = 0;
  for (const x of data) {
    peak = Math.max(peak, Math.abs(x));
    sum += x * x;
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, data.length)) };
}

/** §9.5.5 — render one sound offline at full volume and measure it: the tests' way of hearing it. */
export async function renderSfx(id: SfxId): Promise<Loudness> {
  const steps = stepsOf(id);
  const seconds = Math.max(...steps.map((s) => (s.delay ?? 0) + s.dur)) + 0.1;
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  schedule(Synth.offline(ctx), id, 0);
  return loudnessOf(await ctx.startRendering());
}
