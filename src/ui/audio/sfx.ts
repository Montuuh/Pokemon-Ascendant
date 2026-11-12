import type { CombatEvent, PokemonType, StatusCondition } from '@/sim';
import { hz, loudnessOf, normalise, render, scale, type Instrument, type Loudness, type Note, type Pcm, type WaveId } from './chip';
import { SONG_CEILING, SONG_RMS } from './render';
import { echoOf, expand } from './score';
import { JINGLES, type JingleId } from './songs';
import { synth } from './synth';

// §9.5.3 — every sound effect, in the chip's own vocabulary: a pulse with a duty cycle and a pitch sweep, a wavetable
// tone, a burst of the noise register with its clock sliding — the three things the series' effects are made of. A
// recipe is data (`SFX`), which recipe plays is a pure function of the fight's events (`sfxForEvent`), a recipe becomes
// samples once (`sampleOf`, pure — the tests measure it), and the only thing that touches Web Audio is `playSfx`. The
// fanfares (a level, a Badge, the evolution, the Center's machine) are short songs (`JINGLES`) played the same way.

/** One voice of a recipe. Pitches in Hz — for noise, the register's clock. */
export interface Step {
  osc: 'pulse' | 'wave' | 'noise';
  duty?: number[];
  wave?: WaveId;
  short?: boolean;
  hp?: boolean;
  from: number;
  /** Where the pitch has slid to by the end. */
  to?: number;
  dur: number;
  gain: number;
  delay?: number;
  /** Held at full level rather than dying away (a beep, a whistle). */
  hold?: boolean;
  vib?: [number, number, number];
}
type More = Partial<Pick<Step, 'delay' | 'hold' | 'vib' | 'hp' | 'short'>>;

const pu = (duty: number | number[], from: number, to: number | null, dur: number, gain: number, more: More = {}): Step => ({
  osc: 'pulse',
  duty: typeof duty === 'number' ? [duty] : duty,
  from,
  ...(to ? { to } : {}),
  dur,
  gain,
  ...more,
});
const wv = (wave: WaveId, from: number, to: number | null, dur: number, gain: number, more: More = {}): Step => ({ osc: 'wave', wave, from, ...(to ? { to } : {}), dur, gain, ...more });
const nz = (from: number, to: number | null, dur: number, gain: number, more: More = {}): Step => ({ osc: 'noise', from, ...(to ? { to } : {}), dur, gain, ...more });
/** A run of notes, `step` seconds apart, each made by `make` from its pitch. */
const run = (midis: number[], step: number, make: (f: number) => Step, delay = 0): Step[] => midis.map((m, i) => ({ ...make(hz(m)), delay: delay + i * step }));

/** §9.5.3 — the type-coded part of a card's whoosh: what the move's type adds on top of the swish. */
export const TYPE_TIMBRE: Record<PokemonType, Step[]> = {
  normal: [pu(0.5, 330, 220, 0.1, 0.5)],
  fire: [nz(9000, 2500, 0.2, 0.6), nz(14000, null, 0.04, 0.35, { delay: 0.07, hp: true }), nz(14000, null, 0.04, 0.3, { delay: 0.14, hp: true })],
  water: [nz(5000, 900, 0.28, 0.5), wv('sine', 900, 300, 0.18, 0.4, { delay: 0.04 })],
  grass: [nz(7000, 3500, 0.18, 0.4, { hp: true }), pu(0.125, 660, 990, 0.12, 0.3)],
  electric: [pu(0.125, 1800, 500, 0.06, 0.45), pu(0.125, 2200, 700, 0.05, 0.4, { delay: 0.07 }), pu(0.25, 900, 1700, 0.06, 0.35, { delay: 0.13 })],
  ice: [wv('bell', 2200, 2600, 0.2, 0.4), pu(0.125, 3300, null, 0.12, 0.2, { delay: 0.05 })],
  fighting: [nz(2500, 500, 0.1, 0.7, { short: true }), pu(0.5, 180, 80, 0.12, 0.6)],
  poison: [pu(0.25, 260, 170, 0.22, 0.4, { vib: [1.5, 14, 0] }), nz(1500, 700, 0.18, 0.3, { short: true })],
  ground: [nz(1200, 250, 0.3, 0.8), wv('sine', 90, 45, 0.3, 0.7)],
  flying: [nz(1500, 7000, 0.26, 0.5, { hp: true })],
  psychic: [wv('sine', 440, 880, 0.3, 0.4, { vib: [0.6, 9, 0] }), wv('sine', 554, 1108, 0.3, 0.3, { delay: 0.03 })],
  bug: [pu(0.125, 520, 560, 0.15, 0.3, { vib: [1, 28, 0] }), nz(6000, null, 0.12, 0.25, { short: true })],
  rock: [nz(1800, 400, 0.16, 0.7, { short: true }), nz(1200, 300, 0.1, 0.5, { delay: 0.1 })],
  ghost: [wv('sine', 300, 190, 0.4, 0.4, { vib: [0.8, 6, 0] }), wv('sine', 452, 287, 0.4, 0.25)],
  dragon: [pu(0.25, 110, 220, 0.3, 0.5), nz(1000, 4500, 0.3, 0.4)],
  // Dark: a low, closing growl under a buzz. Steel: a struck bar — a bright ring over a clank.
  dark: [pu(0.25, 150, 65, 0.22, 0.5), nz(2500, 500, 0.16, 0.4, { short: true })],
  steel: [wv('bell', 1760, 1500, 0.3, 0.45), nz(9000, null, 0.04, 0.5, { short: true }), pu(0.125, 2640, null, 0.1, 0.2, { delay: 0.02 })],
};

/** §9.5.3 — the status stings, one motif each. */
export const STATUS_STING: Record<StatusCondition, Step[]> = {
  burn: [nz(4000, 1500, 0.28, 0.5), pu(0.25, 494, 392, 0.25, 0.4)],
  poison: [pu(0.25, 311, 233, 0.14, 0.45), pu(0.25, 277, 208, 0.14, 0.45, { delay: 0.15 }), pu(0.25, 233, 175, 0.2, 0.45, { delay: 0.3 })],
  paralysis: [pu(0.125, 1400, 700, 0.05, 0.45), pu(0.125, 1400, 700, 0.05, 0.45, { delay: 0.08 }), pu(0.125, 1400, 700, 0.05, 0.45, { delay: 0.16 })],
  sleep: [wv('sine', 523, 392, 0.35, 0.45), wv('sine', 392, 330, 0.4, 0.4, { delay: 0.28 })],
  freeze: [wv('bell', 2637, null, 0.14, 0.45), wv('bell', 3136, null, 0.22, 0.4, { delay: 0.08 }), nz(14000, null, 0.05, 0.2, { hp: true, delay: 0.02 })],
  confusion: [pu(0.5, 440, 620, 0.13, 0.4), pu(0.5, 620, 400, 0.13, 0.4, { delay: 0.13 }), pu(0.5, 400, 560, 0.13, 0.4, { delay: 0.26 })],
};

const blip = (f: number): Step => pu(0.25, f, null, 0.09, 0.4);
const ping = (f: number): Step => wv('bell', f, null, 0.2, 0.4);
const SCALE_UP = [72, 74, 76, 77, 79, 81, 83, 84];

export const SFX = {
  // §9.5.3 — the card's swish under its type; a consumable's soft chime.
  'card-swish': [nz(2500, 9000, 0.14, 0.45, { hp: true })],
  consumable: run([84, 91], 0.06, ping),
  // The hit, and how it landed — three timbres: a noise burst whose clock falls over a thump; the same twice as hard
  // with a rising zap on top; and the short register's dull knock.
  hit: [nz(7000, 800, 0.11, 0.9), pu(0.5, 180, 70, 0.1, 0.6)],
  'hit-super': [nz(11000, 600, 0.09, 1), nz(8000, 300, 0.2, 0.9, { delay: 0.07 }), pu(0.25, 400, 1600, 0.12, 0.45), pu(0.5, 140, 45, 0.25, 0.7)],
  'hit-resisted': [nz(1500, 500, 0.08, 0.7, { short: true }), pu(0.5, 110, 80, 0.07, 0.4)],
  crit: [pu(0.125, 2093, null, 0.05, 0.4), pu(0.125, 3136, null, 0.16, 0.4, { delay: 0.05 })],
  // §4.1.3.1 — one of your rhythm rings fills: three rising notes, short.
  'rhythm-ready': run([79, 84, 88], 0.045, blip),
  heal: run([72, 76, 79, 84, 88], 0.055, ping),
  // §9.5.3 — your swap: the whoosh out and the pop of the ball opening; directional whooshes for the steps.
  swap: [nz(1500, 8000, 0.12, 0.5, { hp: true }), pu(0.25, 400, 900, 0.07, 0.4, { delay: 0.1 })],
  'step-forward': [nz(1200, 6000, 0.16, 0.5, { hp: true })],
  'step-backward': [nz(6000, 1200, 0.16, 0.5, { hp: true })],
  // A faint: a falling cry — a pulse sweeping down as its duty thins — and the ground.
  faint: [pu([0.5, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.125], 520, 90, 0.5, 0.6, { hold: true, vib: [0.5, 11, 0.1] }), nz(900, 200, 0.16, 0.5, { delay: 0.48 })],
  // A stat stage: a ladder of eight quick steps, up or down.
  'stat-up': run(SCALE_UP, 0.032, (f) => pu(0.25, f, null, 0.05, 0.4)),
  'stat-down': run([...SCALE_UP].reverse(), 0.032, (f) => pu(0.25, f / 2, null, 0.05, 0.4)),
  draw: [nz(9000, 13000, 0.025, 0.4, { hp: true }), nz(9000, 13000, 0.025, 0.35, { hp: true, delay: 0.05 })],
  // Your Action Points come back: two bright notes.
  'ap-gain': [pu(0.25, hz(86), null, 0.04, 0.4), pu(0.25, hz(93), null, 0.1, 0.4, { delay: 0.045 })],
  // §9.5.3 — a solid bell for End Turn.
  'end-turn': [wv('bell', hz(76), null, 0.5, 0.45), wv('bell', hz(88), null, 0.35, 0.2)],
  'enemy-enter': [nz(800, 5000, 0.18, 0.4, { hp: true }), pu(0.25, hz(67), null, 0.08, 0.3, { delay: 0.15 })],
  // §9.5.3 — rising tension then a hit for a boss's new phase.
  phase: [pu(0.25, 110, 440, 0.5, 0.4, { hold: true }), nz(6000, 400, 0.35, 0.9, { delay: 0.5 }), ...[45, 52, 57].map((m) => pu(0.5, hz(m), null, 0.6, 0.3, { delay: 0.5 }))],
  'combo-break': [pu(0.125, 1046, 523, 0.15, 0.4), nz(9000, 3000, 0.1, 0.4)],
  // §9.5.2 — the team is nearly down: two beeps.
  'low-hp': [pu(0.5, hz(81), null, 0.09, 0.4, { hold: true }), pu(0.5, hz(81), null, 0.09, 0.4, { hold: true, delay: 0.17 })],
  // The ball: thrown, opening on the Pokémon, down to the ground with a bounce, a wobble per check, then the click —
  // or the burst.
  'ball-throw': [pu(0.125, 600, 1800, 0.25, 0.4, { hold: true }), nz(1500, 6000, 0.25, 0.25, { hp: true })],
  'ball-open': [pu(0.5, 300, 1500, 0.2, 0.35), nz(4000, 10000, 0.3, 0.3, { hp: true, delay: 0.05 }), wv('sine', 1200, 200, 0.4, 0.3, { delay: 0.2 })],
  'ball-land': [pu(0.5, 320, 110, 0.06, 0.6), nz(900, 400, 0.04, 0.4, { short: true }), pu(0.5, 300, 120, 0.05, 0.3, { delay: 0.19 })],
  'ball-shake': [pu(0.5, 500, 380, 0.05, 0.5), pu(0.5, 380, 300, 0.05, 0.4, { delay: 0.07 })],
  'ball-click': [pu(0.125, 2637, null, 0.03, 0.5), pu(0.125, 3520, null, 0.05, 0.5, { delay: 0.03 }), ...run([84, 88, 91, 96], 0.07, ping, 0.14)],
  'ball-break': [nz(3000, 10000, 0.14, 0.6, { hp: true }), pu(0.25, 900, 250, 0.2, 0.4)],
  // Short stings for a fight's end, for a caller that wants one; the fight itself hands over to the music (§9.5.2).
  victory: run([72, 76, 79, 84, 79, 84], 0.09, (f) => pu(0.25, f, null, 0.2, 0.4)),
  defeat: run([64, 60, 57, 52], 0.18, (f) => pu(0.5, f, null, 0.4, 0.4)),
  // §9.4.5 — the result screen's bars: the XP bar's rising whistle while it fills (a long fill and a short one, so the
  // sound ends with the bar), the HP bar's soft restore, a coin for the prize money.
  'exp-fill': [pu(0.25, hz(64), hz(88), 0.7, 0.4, { hold: true })],
  'exp-fill-short': [pu(0.25, hz(72), hz(86), 0.4, 0.4, { hold: true })],
  'hp-fill': [wv('flute', hz(67), hz(86), 0.5, 0.4, { hold: true }), ...run([84, 88, 91], 0.06, ping, 0.45)],
  coin: [pu(0.25, hz(95), null, 0.04, 0.4), pu(0.25, hz(100), null, 0.18, 0.4, { delay: 0.045 })],
  // A purchase: the coin twice and the till. A save: three notes up, held.
  purchase: [pu(0.25, hz(88), null, 0.04, 0.4), pu(0.25, hz(95), null, 0.04, 0.4, { delay: 0.07 }), pu(0.25, hz(100), null, 0.22, 0.4, { delay: 0.14 }), nz(12000, null, 0.03, 0.2, { hp: true, delay: 0.14 })],
  save: run([72, 79, 84], 0.09, (f) => pu(0.5, f, null, 0.16, 0.4)),
  // The evolution: the light's rise as the sprite whitens.
  evolve: [pu(0.25, 220, 880, 1.2, 0.35, { hold: true, vib: [0.3, 7, 0.2] }), nz(1500, 8000, 1.2, 0.15, { hp: true })],
  // §9.9.3 — a ball set in the Center's tray.
  'ball-set': [pu(0.25, hz(81), null, 0.03, 0.4), pu(0.5, 260, 140, 0.05, 0.4)],
  // §2.9.5 — the item ball's reel: a dry tick for each tile past the marker, then a chime where it stops — brighter, with
  // a sparkle, on a Rare.
  'reel-tick': [pu(0.125, hz(93), null, 0.018, 0.4)],
  'reel-land': [...run([76, 79, 84], 0.07, blip), wv('tri4', hz(60), null, 0.3, 0.3, { delay: 0.14 })],
  'reel-rare': [...run([72, 76, 79, 84, 88], 0.07, blip), ...[84, 88, 91].map((m) => wv('bell', hz(m), null, 0.7, 0.3, { delay: 0.36 })), nz(14000, null, 0.4, 0.12, { hp: true, delay: 0.36 })],
  // The interface: a tick on any button, a rising pair to confirm, a falling pair to go back, a blip as text moves on.
  'ui-click': [pu(0.125, 1568, null, 0.03, 0.4)],
  'ui-select': [pu(0.25, hz(84), null, 0.04, 0.4), pu(0.25, hz(91), null, 0.08, 0.4, { delay: 0.045 })],
  'ui-back': [pu(0.25, hz(79), null, 0.04, 0.4), pu(0.25, hz(72), null, 0.08, 0.4, { delay: 0.045 })],
  'text-advance': [pu(0.5, hz(88), null, 0.025, 0.4)],
} satisfies Record<string, Step[]>;

/** §9.5.5 — how loud each effect's sample peaks (0–1); the ones not named peak at `LEVEL`. */
const LEVEL = 0.5;
const LEVELS: Partial<Record<keyof typeof SFX, number>> = {
  'ui-click': 0.2,
  'text-advance': 0.22,
  'ui-select': 0.3,
  'ui-back': 0.3,
  'reel-tick': 0.25,
  draw: 0.25,
  'ap-gain': 0.28,
  'card-swish': 0.4,
  hit: 0.6,
  'hit-super': 0.75,
  'hit-resisted': 0.45,
  phase: 0.7,
  'exp-fill': 0.28,
  'exp-fill-short': 0.28,
  coin: 0.35,
  'low-hp': 0.4,
};
// §9.5.5 — a fanfare's loudness is the music's own (`SONG_RMS`), so it sits where the song it interrupts sat.
export { SONG_CEILING, SONG_RMS } from './render';
/** §9.5.5 — the fanfares the music stops for; under the others it only ducks. */
const HOLDS: ReadonlySet<JingleId> = new Set<JingleId>(['item-get', 'badge', 'evolved', 'heal-machine', 'hub-arrive']);

export type StepSfxId = keyof typeof SFX;
export type BaseSfxId = StepSfxId | JingleId;
export type SfxId = BaseSfxId | `card-${PokemonType}` | `status-${StatusCondition}`;

const isJingle = (id: SfxId): id is JingleId => id in JINGLES;

/** Every sound there is to ask for. */
export function sfxIds(types: readonly PokemonType[], statuses: readonly StatusCondition[]): SfxId[] {
  return [...(Object.keys(SFX) as SfxId[]), ...(Object.keys(JINGLES) as SfxId[]), ...types.map((t) => `card-${t}` as SfxId), ...statuses.map((s) => `status-${s}` as SfxId)];
}

/** The steps a sound is made of: a card is the swish and its type, a status its sting. A fanfare has none. */
export function stepsOf(id: SfxId): Step[] {
  if (isJingle(id)) return [];
  if (id.startsWith('card-') && id !== 'card-swish') return [...SFX['card-swish'], ...TYPE_TIMBRE[id.slice(5) as PokemonType]];
  if (id.startsWith('status-')) return STATUS_STING[id.slice(7) as StatusCondition];
  return SFX[id as StepSfxId];
}

/** A step as a note for the chip: its sweep a bend into the pitch it ends on. */
function noteOf(s: Step): Note {
  const end = s.to ?? s.from;
  const inst: Instrument = {
    osc: s.osc,
    ...(s.duty ? { duty: s.duty } : {}),
    ...(s.wave ? { wave: s.wave } : {}),
    ...(s.short ? { short: true } : {}),
    ...(s.hp ? { hp: true } : {}),
    a: 0.002,
    d: s.hold ? 0 : s.dur * 0.45,
    s: s.hold ? 1 : 0.15,
    r: Math.min(0.04, s.dur * 0.3),
    ...(s.to ? { bend: [12 * Math.log2(s.from / s.to), s.dur] as [number, number] } : {}),
    ...(s.vib ? { vib: s.vib } : {}),
  };
  return { t: s.delay ?? 0, dur: s.dur, midi: 69 + 12 * Math.log2(end / 440), vel: s.gain, inst };
}

const samples = new Map<SfxId, Pcm>();

/** §9.5.5 — a sound as samples, at its level. Pure but for the cache: the same id is always the same samples. */
export function sampleOf(id: SfxId): Pcm {
  const kept = samples.get(id);
  if (kept) return kept;
  let pcm: Pcm;
  if (isJingle(id)) {
    const song = JINGLES[id];
    const x = expand(song);
    pcm = normalise(render(x.notes, x.seconds, echoOf(song)), SONG_RMS, SONG_CEILING, 0, x.introSeconds);
  } else {
    const steps = stepsOf(id);
    const seconds = Math.max(...steps.map((s) => (s.delay ?? 0) + s.dur)) + 0.08;
    pcm = render(steps.map(noteOf), seconds);
    const peak = loudnessOf(pcm).peak;
    if (peak > 0) scale(pcm, (LEVELS[id as StepSfxId] ?? LEVEL) / peak);
  }
  samples.set(id, pcm);
  return pcm;
}

/** How long a fanfare holds the music: its bars, not its ring-out. */
export const fanfareSeconds = (id: JingleId): number => expand(JINGLES[id]).introSeconds;

/** What the fight's lookups tell the mapping: who is on your side, and each move's type. */
export interface SfxLookup {
  isPlayer: (uid: string) => boolean;
  moveType: (moveId: string) => PokemonType;
}

/**
 * §9.5.3 — the sounds one event makes. Pure: the screen feeds it the fight's new events and plays what comes back.
 * Events the player already hears another way make none: an intent is read, and a fight's end is the music's — the
 * victory fanfare or the defeat (`director.ts`).
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
      return ['ap-gain'];
    case 'draw':
      return e.cardIds.length ? ['draw'] : [];
    default:
      return [];
  }
}

/** The last sounds asked for, newest last — read by the tests and the dev tools, since a test cannot listen. */
const recent: SfxId[] = [];
export const recentSfx = (): readonly SfxId[] => recent;

const buffers = new Map<SfxId, AudioBuffer>();

/** Play a sound now (or `delay` seconds from now). Silent until a gesture has unlocked the context. */
export function playSfx(id: SfxId, delay = 0): void {
  recent.push(id);
  if (recent.length > 64) recent.shift();
  const ctx = synth.ready();
  if (!ctx) return;
  let buf = buffers.get(id);
  if (!buf) {
    buf = synth.bufferOf(sampleOf(id)) ?? undefined;
    if (!buf) return;
    buffers.set(id, buf);
  }
  const at = ctx.currentTime + delay;
  synth.play(buf, 'sfx', at);
  if (isJingle(id)) {
    // §9.5.5 — the music makes room: it stops for a long fanfare and picks up where it was, and ducks under a short one.
    const seconds = fanfareSeconds(id);
    if (HOLDS.has(id) && synth.onFanfare) synth.onFanfare(at, seconds);
    else synth.duck(at, seconds);
  }
}

/** Render every sound a little at a time once the context is up, so the first hit of a fight costs nothing. */
export function warmSfx(ids: readonly SfxId[]): void {
  const todo = ids.filter((id) => !samples.has(id));
  const next = () => {
    const id = todo.shift();
    if (!id) return;
    sampleOf(id);
    window.setTimeout(next, 0);
  };
  window.setTimeout(next, 200);
}

/** §9.5.5 — one sound's loudness, measured from its samples: the tests' way of hearing it. */
export function renderSfx(id: SfxId): Promise<Loudness> {
  return Promise.resolve(loudnessOf(sampleOf(id)));
}
