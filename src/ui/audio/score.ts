import { RATE, type Instrument, type Note } from './chip';
import { DRUMS, INSTRUMENTS, type InstrumentId } from './instruments';

// §9.5.4 — the score, as a tracker would hold it: a song is a tempo, a set of channels and named sections, each
// section a line of notes per channel, with an intro played once and a loop played for ever. `expand` turns it into
// timed notes for the chip (`chip.ts`) — pure, so the form of every song is a unit test.
//
// A channel's line is written in a small music macro language:
//   c d e f g a b   a note; `+`/`#` sharp, `-` flat; then a length (4 = a quarter, 8 = an eighth, 12 = a triplet
//                   eighth), dots, and `^` ties (`c2^8`)
//   r               a rest            (ceg)4   a chord        o4 < >   the octave (o4 c is middle C)
//   l8              the default length                         v0–v15   the volume
//   q1–q8           how much of its length a note is held      @name    the instrument
//   K+5             transpose what follows                     [ … ]4   repeat          |   a bar line (checked)
// A drum channel reads letters as hits instead: k kick, s snare, h hat, o open hat, c crash, t m f toms.
// Every section starts from the channel's defaults (o4 l8 v12 q7, its instrument), so sections can be reordered.

/** Ticks in a quarter note: divisible by 3 and by 16, so triplets and 32nds both land on a tick. */
export const TPQ = 48;
export const BAR = TPQ * 4;

export interface ChannelDef {
  inst: InstrumentId;
  /** The channel's level, 0–1. */
  vol?: number;
  pan?: number;
  /** Out of the echo. */
  dry?: boolean;
  drums?: boolean;
  /** §9.5.2 — this channel belongs to the tension stem, not the song. */
  tension?: boolean;
  /** One bar, played in every section that writes nothing for this channel. */
  ostinato?: string;
  /** This channel is another's echo: the same notes, `echoTicks` later (an eighth by default), on its own voice. */
  echoOf?: string;
  echoTicks?: number;
}

export interface Song {
  bpm: number;
  /** Semitones the whole song is moved by: it is written in C or A minor and sounds in its own key. */
  transpose?: number;
  /** The echo over the melodic channels: delay in seconds and gain; null for none. */
  echo?: [number, number] | null;
  channels: Record<string, ChannelDef>;
  sections: Record<string, Record<string, string>>;
  /** Section names played once… */
  intro?: string[];
  /** …and round for ever. A song with no loop is a jingle. */
  loop?: string[];
  /** The player picks this track up where it left off when it comes back (a route after a fight). */
  resume?: boolean;
}

/** One event on a channel's own clock. */
export interface Ev {
  tick: number;
  /** Ticks the note is held. */
  len: number;
  midi: number;
  chord?: number[];
  vel: number;
  inst: InstrumentId;
  /** Seconds, for a drum part that decays on its own. */
  fixed?: number;
}

export interface Parsed {
  evs: Ev[];
  ticks: number;
  /** The tick of every bar line, for the form check. */
  bars: number[];
}

const SEMIS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

/** Write `[ … ]n` out in full. */
export function unroll(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '[') {
      out += s[i++];
      continue;
    }
    let depth = 1;
    let j = i + 1;
    while (j < s.length && depth > 0) {
      if (s[j] === '[') depth++;
      else if (s[j] === ']') depth--;
      j++;
    }
    if (depth > 0) throw new Error(`Unclosed [ in "${s}"`);
    const inner = unroll(s.slice(i + 1, j - 1));
    let k = j;
    while (k < s.length && s[k]! >= '0' && s[k]! <= '9') k++;
    const n = k > j ? Number(s.slice(j, k)) : 2;
    out += `${inner} `.repeat(n);
    i = k;
  }
  return out;
}

/** One channel's line as events. Throws on a character it does not know: a typo is never a silent rest. */
export function parseChannel(mml: string, def: Pick<ChannelDef, 'inst' | 'drums'>): Parsed {
  const s = unroll(mml);
  const evs: Ev[] = [];
  const bars: number[] = [];
  let i = 0;
  let tick = 0;
  let octave = 4;
  let length = TPQ / 2;
  let vol = 12;
  let gate = 7;
  let inst: InstrumentId = def.inst;
  let shift = 0;
  const digits = (): number | null => {
    const from = i;
    while (i < s.length && s[i]! >= '0' && s[i]! <= '9') i++;
    return i > from ? Number(s.slice(from, i)) : null;
  };
  const span = (): number => {
    const n = digits();
    let t = n === null ? length : (TPQ * 4) / n;
    if (!Number.isInteger(t)) throw new Error(`Length ${n} is not a whole number of ticks in "${mml}"`);
    let dot = t;
    while (s[i] === '.') {
      dot /= 2;
      t += dot;
      i++;
    }
    return t;
  };
  const tied = (): number => {
    let t = span();
    while (s[i] === '^') {
      i++;
      t += span();
    }
    return t;
  };
  const pitch = (): number => {
    let m = 12 * (octave + 1) + SEMIS[s[i++]!]! + shift;
    while (s[i] === '+' || s[i] === '#' || s[i] === '-') m += s[i++] === '-' ? -1 : 1;
    return m;
  };
  while (i < s.length) {
    const c = s[i]!;
    if (c === ' ' || c === '\n' || c === '\t') i++;
    else if (c === '|') {
      bars.push(tick);
      i++;
    } else if (c === 'l') {
      i++;
      length = span();
    } else if (c === 'v') {
      i++;
      vol = digits() ?? vol;
    } else if (c === 'r') {
      i++;
      tick += tied();
    } else if (def.drums) {
      const parts = DRUMS[c];
      if (!parts) throw new Error(`Unknown drum "${c}" in "${mml}"`);
      i++;
      const len = tied();
      for (const p of parts) evs.push({ tick, len, midi: p.midi, vel: (vol / 15) * p.vel, inst: p.inst, fixed: p.dur });
      tick += len;
    } else if (c === 'o') {
      i++;
      octave = digits() ?? octave;
    } else if (c === '<') {
      octave--;
      i++;
    } else if (c === '>') {
      octave++;
      i++;
    } else if (c === 'q') {
      i++;
      gate = digits() ?? gate;
    } else if (c === 'K') {
      i++;
      const sign = s[i] === '-' ? -1 : 1;
      if (s[i] === '-' || s[i] === '+') i++;
      shift = sign * (digits() ?? 0);
    } else if (c === '@') {
      const from = ++i;
      while (i < s.length && /[A-Za-z0-9]/.test(s[i]!)) i++;
      const id = s.slice(from, i);
      if (!(id in INSTRUMENTS)) throw new Error(`Unknown instrument "@${id}" in "${mml}"`);
      inst = id as InstrumentId;
    } else if (c === '(') {
      i++;
      const kept = octave;
      const notes: number[] = [];
      while (i < s.length && s[i] !== ')') {
        if (s[i] === '<') {
          octave--;
          i++;
        } else if (s[i] === '>') {
          octave++;
          i++;
        } else if (s[i]! in SEMIS) notes.push(pitch());
        else throw new Error(`Unknown "${s[i]}" in a chord in "${mml}"`);
      }
      i++;
      octave = kept;
      const len = tied();
      if (notes.length) evs.push({ tick, len: Math.max(1, Math.round((len * gate) / 8)), midi: notes[0]!, chord: notes, vel: vol / 15, inst });
      tick += len;
    } else if (c in SEMIS) {
      const midi = pitch();
      const len = tied();
      evs.push({ tick, len: Math.max(1, Math.round((len * gate) / 8)), midi, vel: vol / 15, inst });
      tick += len;
    } else throw new Error(`Unknown "${c}" in "${mml}"`);
  }
  return { evs, ticks: tick, bars };
}

/** How long a section is: its longest written channel. */
export function sectionTicks(song: Song, name: string): number {
  const sec = song.sections[name];
  if (!sec) throw new Error(`No section "${name}"`);
  let ticks = 0;
  for (const [ch, mml] of Object.entries(sec)) {
    const def = song.channels[ch];
    if (!def) throw new Error(`Section "${name}" writes for a channel "${ch}" the song does not have`);
    ticks = Math.max(ticks, parseChannel(mml, def).ticks);
  }
  return ticks;
}

/** What one channel plays in one section: its own line, or its ostinato as many bars as the section runs. */
export function lineOf(song: Song, name: string, ch: string): string | null {
  const own = song.sections[name]?.[ch];
  if (own !== undefined) return own;
  const def = song.channels[ch]!;
  if (!def.ostinato) return null;
  return `${def.ostinato} `.repeat(Math.max(1, Math.round(sectionTicks(song, name) / BAR)));
}

/** A song as the chip plays it. A looping song's buffer is `[0, loopEnd)`; it wraps from `loopEnd` to `loopStart`. */
export interface Expanded {
  notes: Note[];
  /** §9.5.2 — the tension stem, on the same clock. */
  tension: Note[];
  /** The whole rendering's length. */
  seconds: number;
  /** Where the loop wraps to and from; both 0 for a jingle. */
  loopStart: number;
  loopEnd: number;
  /** The musical lengths: the intro, and one pass of the loop. */
  introSeconds: number;
  loopSeconds: number;
}

/**
 * How far into the loop's second pass the rendering runs, in seconds. The buffer wraps `WRAP` seconds *into* the loop
 * rather than at its bar line, so the tails of the loop's last notes (a release, the echo) ring over its first notes
 * exactly as they do on every later pass: the seam is the same samples on both sides.
 */
export const WRAP = 1.5;
/** §9.5.5 — the echo a song gets when it names none: short and quiet, the successor handheld's "reverb". */
export const ECHO: [number, number] = [0.11, 0.2];
export const echoOf = (song: Song): [number, number] | null => (song.echo === undefined ? ECHO : song.echo);
/** What a jingle is given to ring out. */
const JINGLE_TAIL = 0.6;

interface Timed extends Ev {
  ch: string;
  /** The tick of the note this one came from (itself, or the note it echoes). */
  src: number;
}

/**
 * §9.5.4 — a song as timed notes: sections laid end to end, echoes written out, the loop's head played once more.
 * `passes` lays the loop out that many times before the head (the tests' "played straight through").
 */
export function expand(song: Song, passes = 1): Expanded {
  const order = [...(song.intro ?? []), ...(song.loop ?? [])];
  const starts: number[] = [];
  let total = 0;
  for (const name of order) {
    starts.push(total);
    total += sectionTicks(song, name);
  }
  const introTicks = (song.intro ?? []).reduce((a, n) => a + sectionTicks(song, n), 0);
  const loopTicks = total - introTicks;
  const spt = 60 / song.bpm / TPQ;
  const wrapTicks = Math.ceil(WRAP / spt);
  if (song.loop?.length && loopTicks <= wrapTicks) throw new Error('A loop must be longer than the wrap');

  const timed: Timed[] = [];
  for (const [ch, def] of Object.entries(song.channels)) {
    if (def.echoOf) continue;
    order.forEach((name, k) => {
      const line = lineOf(song, name, ch);
      if (line === null) return;
      for (const e of parseChannel(line, def).evs) timed.push({ ...e, tick: e.tick + starts[k]!, ch, src: e.tick + starts[k]! });
    });
  }
  for (const [ch, def] of Object.entries(song.channels)) {
    if (!def.echoOf) continue;
    const delay = def.echoTicks ?? TPQ / 2;
    for (const e of timed.filter((x) => x.ch === def.echoOf)) timed.push({ ...e, tick: e.tick + delay, ch, inst: def.inst });
  }
  const loops = !!song.loop?.length;
  // One pass of the loop is a whole number of samples, and every note sits on a sample: a later pass is then the
  // first one moved by exactly that many samples, and the wrap is the same samples on both sides.
  const grid = (seconds: number): number => Math.round(seconds * RATE) / RATE;
  const pass = grid(loopTicks * spt);
  const introSeconds = introTicks * spt;
  const seconds = loops ? introSeconds + passes * pass + WRAP : total * spt + JINGLE_TAIL;
  const notes: Note[] = [];
  const tension: Note[] = [];
  const instruments = INSTRUMENTS as Record<InstrumentId, Instrument>;
  const put = (e: Timed, t: number): void => {
    if (t >= seconds) return;
    const def = song.channels[e.ch]!;
    const drum = e.fixed !== undefined;
    const move = drum ? 0 : (song.transpose ?? 0);
    const inst = instruments[e.inst];
    const vel = e.vel * (def.vol ?? 1);
    const base = { t, dur: drum ? e.fixed! : e.len * spt, inst, pan: def.pan ?? 0, dry: def.dry ?? false };
    const into = def.tension ? tension : notes;
    if (e.chord && !inst.arp) for (const m of e.chord) into.push({ ...base, midi: m + move, vel: vel * 0.7 });
    else into.push({ ...base, midi: e.midi + move, vel, ...(e.chord ? { chord: e.chord.map((m) => m + move) } : {}) });
  };
  for (const e of timed) {
    const t = grid(e.tick * spt);
    put(e, t);
    // What the loop itself made (not the intro, nor the intro's echoes) comes round again: whole on every further
    // pass, and its head once more after the last.
    if (!loops || e.src < introTicks) continue;
    for (let p = 1; p < passes; p++) put(e, t + p * pass);
    if (e.tick < introTicks + wrapTicks) put(e, t + passes * pass);
  }
  return {
    notes,
    tension,
    seconds,
    loopStart: loops ? introSeconds + WRAP : 0,
    loopEnd: loops ? introSeconds + WRAP + pass : 0,
    introSeconds,
    loopSeconds: pass,
  };
}
