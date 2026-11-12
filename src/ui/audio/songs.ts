import type { InstrumentId } from './instruments';
import type { ChannelDef, Song } from './score';

// §9.5.4 — the songbook. Every tune here is the game's own, written for it in the idiom of the handheld series: a
// fanfare or a riff played once, then a loop of two eight-bar ideas (A, A again with more of the band, B, A), a pulse
// lead answered by its own echo on the second channel, sixteenth-note arpeggios, a triangle bass that walks between
// root and fifth, and the noise channel as a drum kit. Nothing is transcribed from any of the series' own themes.
//
// How a tune is written here: A is a question and its answer — four bars that state a rhythmic cell and open on the
// dominant, four that take the cell further — moving by step between the chord's notes (passing and neighbour tones),
// not up and down the chord; B contrasts and **closes on the tonic** in its eighth bar, so the loop has one full
// cadence before A comes back. The lead sits an octave over the arpeggio and the pad.
//
// Each song is written in C major or A minor and moved to its own key by `transpose`, so the accompaniment can be
// one bar written over C and carried to each bar's chord (`over`).

const ROOT: Record<string, number> = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: -5, Ab: -4, A: -3, Bb: -2, B: -1 };

/**
 * One pattern, written over a C major chord, carried to each chord in turn: its `e` becomes `e-` under a minor chord.
 * `low` keeps a bass under the band: the roots from E up are taken below C rather than above it.
 */
export function over(chords: string, pattern: string, low = false): string {
  return chords
    .trim()
    .split(/\s+/)
    .map((c) => {
      const m = /^([A-G][#b]?)(m?)$/.exec(c);
      if (!m || !(m[1]! in ROOT)) throw new Error(`Unknown chord "${c}"`);
      let k = ROOT[m[1]!]!;
      if (low && k > 3) k -= 12;
      return `K${k} ${m[2] ? pattern.replace(/e(?![-+#])/g, 'e-') : pattern}`;
    })
    .join(' ');
}
const under = (chords: string, pattern: string): string => over(chords, pattern, true);

/** The band: a lead and its echo, a second pulse, strings, the bass, the kit and its cymbals. */
const band = (lead: InstrumentId = 'lead', more: Record<string, ChannelDef> = {}): Record<string, ChannelDef> => ({
  p1: { inst: lead, vol: 0.5, pan: -0.12 },
  e: { inst: 'pluck12', vol: 0.16, pan: 0.55, echoOf: 'p1' },
  p2: { inst: 'pluck25', vol: 0.24, pan: 0.35 },
  s: { inst: 'strings', vol: 0.2, pan: -0.3 },
  w: { inst: 'bass', vol: 0.62, dry: true },
  d: { inst: 'kick', vol: 0.5, dry: true, drums: true },
  c: { inst: 'kick', vol: 0.42, dry: true, drums: true },
  ...more,
});

/** §9.5.2 — the tension stem a fight's track carries: double-time hats and a kick pushing on the off-beats. */
const TENSE: Record<string, ChannelDef> = {
  t: { inst: 'kick', vol: 0.4, dry: true, drums: true, tension: true, ostinato: 'l16 h h h h h h k h h h h h h h k k' },
};

// One-bar drum patterns (eighths unless marked).
const D_MARCH = 'k h16 h16 s h k k s h16 h16';
const D_ROUTE = 'k h s h k k s h';
const D_BOUNCE = 'k h s h16 h16 k h16 k16 s h';
const D_BATTLE = 'k h16 h16 s h16 h16 k h16 k16 s h16 h16';
const D_FAST = 'k16 h16 h16 h16 s16 h16 h16 k16 k16 h16 k16 h16 s16 h16 h16 h16';
const D_EASY = 'k h s h k h s h16 h16';
const D_FILL = 'k h s h k s16 s16 t16 t16 m16 f16';
const D_ROLL = 'l16 s s s s s s s s t t t t m m f f';
const eight = (bar: string, last = D_FILL): string => `[${bar}]7 ${last}`;
const CRASH = 'c1 [r1]7';

const PAD = 'q8 o4 (ceg)1';
const ARP16 = 'l16 o4 [c e g e]4';
const ARP_UP = 'l16 o4 [c e g > c <]4';
const BOUNCE = 'o3 c > c < c > c < c > c < c > c <';
const WALK = 'q5 o3 c4 < g4 > c4 < g4 >';

/** A with more of the band: the lead on another voice, the strings under it. */
const fuller = (a: Record<string, string>, lead: string, voice: InstrumentId, chords: string): Record<string, string> => ({ ...a, p1: `@${voice} ${lead}`, s: over(chords, PAD), c: CRASH });

function title(): Song {
  const A = 'C C F G Am F D G';
  const B = 'F G Em Am F Dm G C';
  const melA = 'o5 c4. e g4 e g | > c4 < b a g2 | a4. f > c4 < a > c < | b4 a g d2 | e4. a > c4 < b a | a4 g f a2 | f+4. a > d4 c < b | g2^8 r < g16 a16 b |';
  const a = { p1: melA, p2: over(A, ARP16), w: under(A, WALK), d: eight(D_MARCH) };
  return {
    bpm: 132,
    transpose: 2,
    channels: band(),
    intro: ['I'],
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      I: {
        p1: '@trumpet o4 g16 g16 g > c4 < g > c e4 | f16 f16 f a4 f a > c4 < | d4. d g4 b4 | > d2^8 r < < g16 a16 b |',
        s: over('C F G G', PAD),
        w: 'o2 c1 | f1 | g2 g4 g4 | g g g g g g16 g16 g16 g16 g16 g16 |',
        d: 'c1 | r1 | s4 s4 s s s16 s16 s16 s16 | s s16 s16 s s16 s16 l16 s s s s s s s s |',
      },
      A: a,
      A2: fuller(a, melA, 'lead50', A),
      B: {
        p1: '@trumpet o5 a4 f a > c4. < a | g a b > d4 < b g4 | > e4. d < b4 g4 | a2 r4 e g | a4 > c4 < a g f e | d4 f a4 > d c < b | > d4. c < b4 > d4 < | > c2. < g4 |',
        p2: over(B, 'o4 c g > c < g c g > c < g'),
        s: over(B, PAD),
        w: under(B, 'o3 c4 c c < g4 > c4'),
        d: eight(D_ROUTE),
      },
    },
  };
}

function hub(): Song {
  const A = 'C Am F G C Am Dm G';
  const B = 'F C Dm Am F C G C';
  const melA = 'q6 o5 e4 d c g4 e4 | a4 g e c2 | f4 e d a4 f4 | g4 f d < b2 > | e4 d c g4 > c4 < | > c4 < b a e4 c4 | d4 e f a4 g f | g2 r4 c d |';
  const stabs = 'o4 r (eg) r (eg) r (eg) r (eg)';
  const bass = 'q5 o2 c4 r c < g4 > r c';
  const a = { p1: melA, p2: over(A, stabs), w: under(A, bass), d: eight(D_EASY, D_EASY) };
  return {
    bpm: 116,
    transpose: 5,
    resume: true,
    channels: band('p50'),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, s: over(A, PAD) },
      B: {
        p1: '@flute o5 a2 > c4 < a4 | g4. a g4 e4 | f2 a4 f4 | e4. f e4 c4 | a4 > c4 d4 c < a | g4 > e4 d c < g4 | > d4 < b4 g4 a b | > c2. < r4 |',
        p2: over(B, stabs),
        s: over(B, PAD),
        w: under(B, bass),
        d: eight(D_EASY),
      },
    },
  };
}

function route1(): Song {
  const A = 'C G Am Em F C Dm G';
  const B = 'Am Em F C F Dm G C';
  const melA = 'o5 c e g4 g a g e | d4. e d < b > d4 | c e a4 a b a e | g4. f+ e2 | f a > c4 c d c < a | g4. a g e c4 | d f a4 g f e d | d2 r g a b |';
  const bass = 'o3 c c > c < c g c > c < c';
  const a = { p1: melA, p2: over(A, ARP16), w: under(A, bass), d: eight(D_ROUTE) };
  return {
    bpm: 128,
    transpose: -5,
    resume: true,
    channels: band(),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: fuller(a, melA, 'lead50', A),
      B: {
        p1: '@flute o5 > c4. < b a2 | b4. a g2 | a4. g f4 a4 | g2. e g | a4 > c4 < a > c f4 < | > f4 e d < a4 > d4 < | > d4 < b > d f4. d < | > c2. < r4 |',
        p2: over(B, 'o4 c e g e c e g e'),
        s: over(B, PAD),
        w: under(B, bass),
        d: eight(D_ROUTE),
      },
    },
  };
}

function route2(): Song {
  const A = 'Am Am F G Am Am F E';
  const B = 'F G Em Am Dm E Am Am';
  const melA = 'o5 a4 e a b > c4 < b | a4 e4 r e a b | > c4 < a > c d e4 d < | > d4 < b4 r b > d e < | > e4 c e f e d c < | b4 a e a2 | a4 f a > c4. < a | g+2 b4 > e4 < |';
  const bass = 'o3 c c16 c16 c c > c < c c16 c16 c';
  const a = { p1: melA, p2: over(A, ARP_UP), w: under(A, bass), d: eight(D_BOUNCE) };
  return {
    bpm: 134,
    transpose: -5,
    resume: true,
    channels: band('trumpet'),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: fuller(a, melA, 'lead', A),
      B: {
        p1: '@lead50 o5 f4. g a4 > c4 < | b4. a g4 d4 | e4. f+ g4 b4 | a2. > c16 < b16 a16 g16 | f4 a4 > d4 c < b | g+4 b4 > e4 d < b | a4 > c e a4 e c < | a2. r4 |',
        p2: over(B, 'o4 c g > c < g c g > c < g'),
        s: over(B, PAD),
        w: under(B, bass),
        d: eight(D_BOUNCE),
      },
    },
  };
}

function route3(): Song {
  const A = 'Am D Am D Am D G Em';
  const B = 'C D Em Am C D E Am';
  const melA = 'o5 a g a > c4 < b a g | f+4 a4 r a b > c < | > e d e g4 e d c < | > d4 < a4 f+2 | a g a > c4 < b > c e < | > f+4 e d4 < a4 b | > d4 < b g b > d e d < | b2 g4 b4 |';
  const bass = 'o2 c > c < c > c < c > c < c > c <';
  const a = { p1: melA, p2: over(A, ARP16), w: under(A, bass), d: eight(D_BATTLE) };
  return {
    bpm: 142,
    transpose: 5,
    resume: true,
    channels: band('trumpet'),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: fuller(a, melA, 'lead', A),
      B: {
        p1: '@lead50 o5 g4. > c e4 d c < | a4. > d f+4 e d < | > e4 g4 f+ e d < b | > c4 < a2 r4 | e4 c e g4. e | f+4 d f+ a4. f+ | g+4 e4 b4 > c < b | a2. r4 |',
        p2: over(B, ARP_UP),
        s: over(B, PAD),
        w: under(B, bass),
        d: eight(D_BATTLE),
      },
    },
  };
}

function city(): Song {
  const A = 'C Am Dm G C Am Dm G';
  const B = 'F C F C Dm G C C';
  const melA = 'o5 e4. f g4 > c4 < | > c4 < b a e2 | f4. g a4 > d4 < | > c4 < b a g2 | e4. f g4 > e4 < | > e4 d c < a4 e4 | f g a > d4 c < b a | g2. r4 |';
  const keys = 'o4 (ceg)4 r (ceg) r (ceg)4 (ceg)';
  const bass = 'o2 c4. c < g4 > c4';
  const a = { p1: melA, p2: over(A, keys), w: under(A, bass), d: eight(D_EASY, D_EASY) };
  return {
    bpm: 108,
    transpose: 5,
    resume: true,
    channels: band('flute', { p2: { inst: 'epiano', vol: 0.26, pan: 0.3 } }),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, s: over(A, PAD) },
      B: {
        p1: '@lead o5 a4 > c < a f2 | g4 > c < g e2 | a4 > c d f4 e d < | > e4 d c < g2 | f4. e d4 a4 | g4. a b4 > d4 < | > e4 d c < g4 > c4 < | > c2. < r4 |',
        p2: over(B, keys),
        s: over(B, PAD),
        w: under(B, bass),
        d: eight(D_EASY),
      },
    },
  };
}

function center(): Song {
  const A = 'C G Am Em F C F G';
  const B = 'Am Em F C Dm G C C';
  const melA = 'o5 e2 g4. e | d4 e d < b2 > | c2 e4. c | < b4 > c < b g2 > | a4. g f4 a4 | g4. f e4 c4 | f g a > c4 < a g f | g2. r4 |';
  const keys = 'o4 c g > c e < g > c < g c';
  const bass = 'q8 o3 c2. < g4 >';
  const a = { p1: melA, p2: over(A, keys), w: under(A, bass), d: '[h4 h4 h4 h h]8' };
  return {
    bpm: 104,
    transpose: 2,
    resume: true,
    channels: band('flute', { p2: { inst: 'epiano', vol: 0.28, pan: 0.3 } }),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, p1: `@bell ${melA}`, s: over(A, PAD) },
      B: {
        p1: 'o5 a4. b > c4 < a4 | g4. a b4 g4 | f4 a > c d4 c < a | g2. r4 | f4. e d4 f4 | g4. a b4 > d4 < | > e4 d c < g4 e4 | c2. r4 |',
        p2: over(B, keys),
        s: over(B, PAD),
        w: under(B, bass),
        d: '[k h h h s h h h]8',
      },
    },
  };
}

function mart(): Song {
  const A = 'C F C G C F G C';
  const B = 'Am Em F C Dm G C C';
  const melA = 'q5 o5 e g4 e d c4 r | f a4 f e d4 r | e g4 e > c < b a g | a g4 d < b4 > r4 | e g4 e d c4 r | f a4 > c d c4 < r | b > d4 < b a g4 f | e4 c4 r4 g4 |';
  const stabs = 'o4 r (ceg) r (ceg) r (ceg) r (ceg)';
  const a = { p1: melA, p2: over(A, stabs), w: under(A, WALK), d: eight(D_EASY, D_EASY) };
  return {
    bpm: 132,
    transpose: 3,
    resume: true,
    channels: band('p50', { p2: { inst: 'organ', vol: 0.16, pan: 0.3 } }),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, p1: `@p25 ${melA}`, s: over(A, PAD) },
      B: {
        p1: '@lead o5 a4. g e4 a4 | g4. f+ e4 < b4 > | f g a > c4 < a f4 | g2 e4 c4 | d4 f a > d4 c4 < | b4 > d < b g4 a b | > c4 e4 d c < g4 | > c2. < r4 |',
        p2: over(B, stabs),
        w: under(B, WALK),
        d: eight(D_EASY),
      },
    },
  };
}

function gameCorner(): Song {
  const A = 'C C F F G G C C';
  const B = 'F F C C Dm G C C';
  const melA = 'q6 o5 e d+ e g > c4 < g4 | e d+ e g > c < g e c | f e f a > c4 < a4 | f e f a > c < a f c | g f+ g b > d4 < b4 | > d c+ d < b g b > d4 < | > e4 c4 < g4 e4 | c4 r4 r g a b |';
  const boom = 'q5 o2 c4 r4 < g4 > r4';
  const chick = 'q4 o4 r4 (eg)4 r4 (eg)4';
  const a = { p1: melA, p2: over(A, chick), w: under(A, boom), d: eight(D_ROUTE) };
  return {
    bpm: 152,
    transpose: 5,
    resume: true,
    channels: band('p25', { p2: { inst: 'epiano', vol: 0.3, pan: 0.3 } }),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, p1: `@lead50 ${melA}`, c: CRASH },
      B: {
        p1: '@trumpet o5 a4 > c4 < b- a g4 | f4 a4 > c2 < | g4 > c4 < a g e4 | e4 g4 > c2 < | f4 a4 > d4 c < a | b4 > d4 < b a g f | e4 g4 > c4 e4 < | > c4 r4 < g a b4 |',
        p2: over(B, chick),
        w: under(B, boom),
        d: eight(D_ROUTE),
      },
    },
  };
}

function mystery(): Song {
  const A = 'Am Am F F Am Am E E';
  const B = 'Dm Dm Am Am Bb E Am Am';
  const drift = 'o4 c g > c < g c g > c < g';
  return {
    bpm: 92,
    echo: [0.24, 0.3],
    resume: true,
    channels: band('bell', { p2: { inst: 'pluck12', vol: 0.14, pan: 0.4 } }),
    loop: ['A', 'B'],
    sections: {
      A: {
        p1: 'o5 a4 e4 d+4 e4 | a4 > c4 < b2 | a4 f4 e4 f4 | > c4 < a4 b2 | a4 e4 d+4 e4 | > e4 c4 < b2 | g+4 e4 d+4 e4 | b4 g+4 e2 |',
        p2: over(A, drift),
        s: over(A, 'q8 o3 (cg)1'),
        w: under(A, 'q8 o3 c1'),
      },
      B: {
        p1: 'o5 d4 f4 a4 g+4 | a2 f2 | c4 e4 a4 g+4 | a2 e2 | d4 f4 b-4 a4 | g+4 b4 > e4 d4 < | > c4 < a4 e4 a4 | a1 |',
        p2: over(B, drift),
        s: over(B, 'q8 o3 (cg)1'),
        w: under(B, 'q8 o3 c1'),
        d: '[r2 h4 r4]8',
      },
    },
  };
}

function hideout(): Song {
  const A = 'Am Am Dm Dm Am Am E E';
  const B = 'F F E E Dm E Am Am';
  const riff = 'q4 o3 c r c e r c g g-';
  const stabs = 'q3 o4 r4 (eg) r r4 (eg) r';
  const melA = 'q6 o5 r4 a e a > c4 < a | b4 a g+ a2 | r4 > d < a > d f4 d < | > e4 d c+ d2 < | r4 a e a > c4 e < | > d+4 e c < a2 | r4 g+ e g+ b4 g+ | b4 > d c < b g+ e4 |';
  const a = { p1: melA, p2: over(A, stabs), w: under(A, riff), d: '[k4 h h s4 h h]8' };
  return {
    bpm: 120,
    transpose: -5,
    resume: true,
    channels: band('p25'),
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      A: a,
      A2: { ...a, p1: `@trumpet ${melA}` },
      B: {
        p1: '@lead50 o5 a2 > c4 < a4 | f2. a4 | g+2 b4 g+4 | e2. r4 | f2 a4 > d4 < | > e4 d < b g+4 b4 | a4 > c < b a4 e4 | a2. r4 |',
        p2: over(B, stabs),
        s: over(B, PAD),
        w: under(B, riff),
        d: '[k4 h h s4 h h]8',
      },
    },
  };
}

function victoryRoad(): Song {
  const A = 'Am Am G G F F E E';
  const B = 'F G Am Am Dm E Am Am';
  const bass = 'o2 c4. c16 c16 c4 < g4 >';
  const drum = 'k4 s16 s16 s k4 s4';
  return {
    bpm: 100,
    transpose: 5,
    resume: true,
    channels: band('trumpet', { w: { inst: 'timpani', vol: 0.6, dry: true } }),
    loop: ['A', 'B'],
    sections: {
      A: {
        p1: 'o5 a2 > c4. < b | a2. e4 | g2 b4. a | g2. d4 | f2 a4. g | f2. > c4 < | b2 g+4. b | > e1 < |',
        s: over(A, PAD),
        w: under(A, bass),
        d: `[${drum}]8`,
      },
      B: {
        p1: 'o5 > c2 < a4 > c4 < | > d2 < b4 > d4 < | > e2. c4 < | a1 | > d2 f4. e < | > e2 < b4. > d < | > c2 < b4 a4 | a1 |',
        p2: over(B, 'o4 c g > c < g c g > c < g'),
        s: over(B, PAD),
        w: under(B, bass),
        d: `[${drum}]8`,
      },
    },
  };
}

function league(): Song {
  const A = 'Am F G Em Am F G E';
  const B = 'Dm Am Dm Am F G E Am';
  const bass = 'o3 c4 c4 c4 c g';
  const drum = 'k4 s4 k k s4';
  const organ = 'q8 o4 (ceg)2 (ceg)2';
  return {
    bpm: 116,
    transpose: 3,
    resume: true,
    channels: band('trumpet', { p2: { inst: 'organ', vol: 0.14, pan: 0.3 } }),
    loop: ['A', 'B'],
    sections: {
      A: {
        p1: 'o5 a4. a16 b16 > c4 < a4 | > c4. < b16 a16 f4 a4 | b4. b16 > c16 d4 < b4 | g2 e4 f+ g | a4. b16 > c16 e4 c4 < | > c4. < b16 a16 > c4 f4 < | > d4. c16 < b16 > d4 g4 < | b2 g+4 e4 |',
        p2: over(A, organ),
        w: under(A, bass),
        d: `[${drum}]8`,
        c: CRASH,
      },
      B: {
        p1: '@flute o5 f2 a4 g f | e2 a4 b > c < | > d2 c4 < b- a | > c2 < b4 a4 | > c4 < a4 f4 g a | b4 g4 > d4 c < b | > e4. d < b4 g+4 | a2. r4 |',
        p2: over(B, organ),
        s: over(B, PAD),
        w: under(B, bass),
        d: `[${drum}]8`,
      },
    },
  };
}

/** A fight's song: an intro played once, then A, A with the full band, B, A. */
function battle(o: { bpm: number; transpose: number; lead: InstrumentId; A: string; B: string; melA: string; melB: string; intro: Record<string, string>; bassA?: string; bassB?: string; drum?: string; introBars?: number }): Song {
  const drum = o.drum ?? D_BATTLE;
  const a = { p1: o.melA, p2: over(o.A, ARP_UP), w: under(o.A, o.bassA ?? BOUNCE), d: eight(drum), c: CRASH };
  return {
    bpm: o.bpm,
    transpose: o.transpose,
    channels: { ...band(o.lead), ...TENSE },
    intro: ['I'],
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      I: { ...o.intro, t: `[r1]${o.introBars ?? 4}` },
      A: a,
      A2: fuller(a, o.melA, o.lead === 'trumpet' ? 'lead50' : 'trumpet', o.A),
      B: { p1: o.melB, p2: over(o.B, ARP16), s: over(o.B, PAD), w: under(o.B, o.bassB ?? BOUNCE), d: eight(drum, D_ROLL), c: CRASH },
    },
  };
}

/** Every fight's B: four bars away from the tonic, then round to a full close on it. */
const BATTLE_B = 'F G Am Am F G E Am';

const battleWild = (): Song =>
  battle({
    bpm: 172,
    transpose: -2,
    lead: 'lead',
    A: 'Am Am F G Am Am F E',
    B: BATTLE_B,
    intro: {
      p1: 'l16 o5 a g+ g f+ f e d+ d c+ c < b a+ a g+ g f+ | > e d+ d c+ c < b a+ a g+ g f+ f e d+ d c+ | l8 o4 a a16 a16 r a a a16 a16 r a | o4 a16 b16 > c16 d16 e16 f16 g16 g+16 a4 r e16 g+16 < |',
      w: 'o2 [a a a a a a a a]2 | a a16 a16 r a a a16 a16 r a | e e e e e e g+ g+ |',
      d: `${D_FAST} ${D_FAST} k s16 s16 r s k s16 s16 r s ${D_ROLL}`,
    },
    melA: 'o5 a4. e r a > c4 < | a > c < b a e2 | f4. c r f a4 | g a g f d2 | a4. e r a > c4 | e4 d c < b a > c4 < | a4. f r a > c4 < | b4 g+4 e4 g+ b |',
    melB: '@lead50 o5 > c2 < a4 g f | b2 a4 g d | > c4. < b a4 e4 | a2. r e | f4 g a > c4. < a | g4 a b > d4. < b | > e4 d < b g+4 b4 | a2^8 e g+ b |',
  });

const battleTrainer = (): Song =>
  battle({
    bpm: 166,
    transpose: -5,
    lead: 'trumpet',
    A: 'Am G F E Am G F E',
    B: 'Dm Am Dm Am F G E Am',
    bassB: 'o3 c c c > c < c c > c < c',
    intro: {
      p1: 'l16 o4 a a r a a r a a r a a r > c c e e < | a a r a a r a a r a a r > e e g+ g+ < | l8 o5 a g+ a b > c < b > c d | e2 r4 < e16 f+16 g+16 b16 |',
      w: 'l16 o2 a a r a a r a a r a a r a a a a | a a r a a r a a r a a r a a a a | l8 a a a a a a a a | e e e e e16 e16 e16 e16 e e |',
      d: `[k s16 s16 k s16 s16 k s16 s16 k s]2 ${D_BATTLE} ${D_ROLL}`,
    },
    melA: 'o5 a4 r a > c < b a e | g4 r g b a g d | f4 r f a g f c | e4 g+ b > e4. d < | > c4 r c e d c < a | b4 r b > d c < b g | a4 r a > c < b a f | g+4 b > e g+4 e4 < |',
    melB: '@lead o5 d4. f a4 > d4 < | > c4. < a e4 a4 | f4. a > d4 f4 < | > e4. c < a2 | > f4 e d c4 < a4 | > d4 c < b a4 g4 | g+4 b4 > e4 d < b | a2. e16 g+16 b16 > e16 < |',
  });

const battleElite = (): Song =>
  battle({
    bpm: 178,
    transpose: -3,
    lead: 'lead50',
    drum: D_FAST,
    introBars: 2,
    A: 'Am Am C G Am Am F E',
    B: BATTLE_B,
    intro: {
      p1: 'l16 o5 [a e]4 [g+ e]4 | [a e]2 [b e]2 > c < b a g+ a8 r8 |',
      w: 'o2 a a a a a a a a | a a a a e e e e |',
      d: `${D_FAST} l16 s s s s s s s s s s s s t t f f`,
    },
    melA: 'o5 e4 a4 > c4 < b a | > e4. d c < b a4 | g4 > c4 e4 d c < | > d4. c < b a g4 | e4 a4 > c4 e d < | > a4. g e d c4 < | > c4 < a4 f4 a > c < | b4 g+4 e4 g+ b |',
    melB: '@trumpet o5 a4 > c f4 e d c < | b4 > d g4 f e d < | > e4 c < a > c e a4 < | > a2 e4 c4 < | > f4 e d c4 < a4 | > g4 f e d4 < b4 | > e4 d < b > e4 g+4 < | > a2 < r4 e4 |',
  });

const battleGym = (): Song =>
  battle({
    bpm: 168,
    transpose: 5,
    lead: 'trumpet',
    A: 'Am F G Am Am F G E',
    B: 'C G Am Em F G E Am',
    bassA: 'o2 c > c < c > c < c > c < c > c <',
    bassB: 'o2 c c > c < c c c > c < c',
    intro: {
      p1: 'o4 a4 r a a4 r a | a4 r a a4 > c4 < | a4 r a a4 r a | l16 a b > c d e f g g+ a8 r8 r4 < |',
      w: 'o2 [a a16 a16]4 | [a a16 a16]3 > c c < | [a a16 a16]4 | e e e e e e16 e16 e e |',
      d: `[k s16 s16 k k s r k k]3 ${D_ROLL}`,
    },
    melA: 'o5 a4 r e a b > c4 < | > c4 < r a > c d c < a | b4 r g b > c d4 < | > e2 r4 < e a | > c4 r < a > c d e4 < | > f4 r c f e d c < | > d4 r < b > d c < b a | g+2 b4 > e4 < |',
    melB: '@lead50 o5 g2 e4 f g | a4 g4 d2 | e2 c4 d e | f+4 e4 < b2 > | f g a > c4 < a f4 | g a b > d4 < b g4 | g+4 b4 > e4 d < b | a2. r4 |',
  });

const battleLeague = (): Song =>
  battle({
    bpm: 176,
    transpose: 2,
    lead: 'lead50',
    drum: D_FAST,
    A: 'Am Am F F Dm Dm E E',
    B: BATTLE_B,
    intro: {
      p1: 'l16 o5 [e r e r e e r e r e r e e r e e]2 | f r f r f f r f r f r f f r f f | g+ r g+ r g+ g+ r g+ b r b r > e8 e8 < |',
      w: 'o2 [a]8 | [a]8 | [f]8 | [e]8 |',
      d: `[${D_FAST}]3 ${D_ROLL}`,
    },
    melA: 'o5 a2 e4 a4 | > c4. < b a4 e4 | f2 c4 f4 | a4. g f4 c4 | d2 f4 a4 | > d4. c < a4 f4 | e2 g+4 b4 | > e4. d < b4 g+4 |',
    melB: '@trumpet o5 f4 a4 > c4. d < | > d4 < b4 > d4. e < | > e4 c4 < a4 > c < b | a2. r4 | a4 > c4 f4 e c < | b4 > d4 g4 f d < | > e4 < b g+ > e4 g+4 < | > a2. < r4 |',
  });

const battleChampion = (): Song =>
  battle({
    bpm: 186,
    transpose: 3,
    lead: 'trumpet',
    drum: D_FAST,
    A: 'Am C G D Am C E E',
    B: BATTLE_B,
    intro: {
      p1: 'o4 a1 | g+1 | l16 [a > c e a <]4 | [g+ b > e g+ <]3 > e8 r8 < |',
      s: 'q8 o3 (a>e)1 | (g+>e)1 | (a>ea)1 | (g+>eg+)1 |',
      w: 'o2 [a]8 | [g+]8 | [a]8 | [e]8 |',
      d: `k4 k4 k4 k4 | k4 k4 k k k k | ${D_FAST} ${D_ROLL}`,
    },
    melA: 'o5 a2 e4. a | g4 e g > c2 < | b4. a g4 d4 | f+4 e d a2 | a2 > c4. < a | > e4 d c < g2 | g+4 b4 > e4 d < b | > e2 < b4 g+4 |',
    melB: '@lead50 o5 f2. a4 | g2. b4 | a2 > c4 e4 < | > e2. r4 < | > f2 e4 c4 < | > d2 < b4 g4 | > e2 d4 < b4 | a1 |',
  });

function battleLegendary(): Song {
  const A = 'Am Am Bb Bb Am Am G G';
  const B = 'F F G G E E Am Am';
  const bass = 'o3 c r r c r r c c';
  const drum = 'k4 f f k f s4';
  const a = {
    p1: 'o5 a2. e4 | a2 b4 > c4 < | b-2. f4 | b-2 > c4 d4 < | > c2. < a4 | > e2 d4 c4 < | b2. g4 | > d2 c4 < b4 |',
    p2: over(A, ARP16),
    s: over(A, 'q8 o3 (cg)1'),
    w: under(A, bass),
    d: `[${drum}]8`,
  };
  return {
    bpm: 150,
    transpose: -2,
    echo: [0.2, 0.26],
    channels: { ...band('trumpet', { p2: { inst: 'pluck12', vol: 0.15, pan: 0.4 } }), ...TENSE },
    intro: ['I'],
    loop: ['A', 'A2', 'B', 'A2'],
    sections: {
      I: {
        w: 'o2 a r r a r r a a | a r r a r r b- b- | a r r a r r a a | a r r a b- b- > c c < |',
        s: over('Am Am Am Bb', 'q8 o3 (cg)1'),
        d: '[f4. f r4 f f]4',
        t: 'r1 r1 r1 r1',
      },
      A: a,
      A2: { ...a, p1: `@bell ${a.p1}`, c: CRASH },
      B: {
        p1: '@lead50 o5 a4 > c4 f2 < | > f4 e4 d4 c4 < | b4 > d4 g2 < | > g4 f4 e4 d4 < | > e4 d4 < b2 | g+4 a4 b4 > d4 < | > c4 < b4 a2 | a1 |',
        p2: over(B, ARP_UP),
        s: over(B, PAD),
        w: under(B, bass),
        d: `[${drum}]7 ${D_ROLL}`,
      },
    },
  };
}

function victoryWild(): Song {
  const A = 'C F G C C F G C';
  const B = 'Am F G C Dm G C C';
  return {
    bpm: 140,
    transpose: 2,
    channels: band(),
    intro: ['I'],
    loop: ['A', 'B'],
    sections: {
      I: {
        p1: '@trumpet o5 g4 e16 f16 g16 a16 g4 > c4 < | a4 b4 > c2 < |',
        s: 'q8 o4 (ceg)1 | (cfa)4 (dgb)4 (ceg)2 |',
        w: 'o3 c4 c c c4 c4 | < f4 g4 > c2 |',
        d: 'c4 s16 s16 s16 s16 s4 k4 | k4 s4 c2 |',
      },
      A: {
        p1: 'o5 e4 g e d c4 e | f4 a f e d4 f | g4 b g f e d < b > | c4 e4 g2 | > c4 < b a g4 e4 | a4 g f a4 > c4 < | b4 a g > d4 < b4 | > c2. < r4 |',
        p2: over(A, ARP16),
        w: under(A, WALK),
        d: eight(D_ROUTE),
      },
      B: {
        p1: '@lead50 o5 a4. b > c4 < a4 | f4. g a4 f4 | g4. a b4 > d4 < | > e2 c2 < | > d4 c < a f4 a4 | g4 b4 > d4 f4 < | > e4 c4 < g4 a b | > c2. < r4 |',
        p2: over(B, ARP16),
        s: over(B, PAD),
        w: under(B, WALK),
        d: eight(D_ROUTE),
      },
    },
  };
}

function victoryTrainer(): Song {
  const A = 'C G Am F C G F G';
  const B = 'F C F C Dm G C C';
  const walk = 'q5 o2 c4 < g4 > c4 < g4 >';
  return {
    bpm: 144,
    transpose: 5,
    channels: band(),
    intro: ['I'],
    loop: ['A', 'B'],
    sections: {
      I: {
        p1: '@trumpet o5 c4 < g4 > e4. c | d4 g4 b2 |',
        s: 'q8 o4 (ceg)1 | < (gb>d)1 |',
        w: 'o2 c4 c c c4 c4 | < g4 g g g2 > |',
        d: 'k4 k4 s s s16 s16 s16 s16 | s4 s4 c2 |',
      },
      A: {
        p1: 'o5 e4. d c4 g4 | g4. f+ g4 b4 | a4. g e4 c4 | f g a > c4 < a f4 | e4. d c4 > c4 < | b4. a g4 d4 | f4 a4 > c4 d c < | b2 g4 > d4 < |',
        p2: over(A, ARP16),
        w: under(A, walk),
        d: eight(D_BOUNCE),
      },
      B: {
        p1: '@lead50 o5 a2 > c4 < a4 | g4 e g > c2 < | a4 > c < a f4 a4 | g2 e2 | f4 e d a4 f4 | g4 a b > d4 < b4 | > c4 e4 g4 e d < | > c2. < r4 |',
        p2: over(B, ARP16),
        s: over(B, PAD),
        w: under(B, walk),
        d: eight(D_BOUNCE),
      },
    },
  };
}

function victoryGym(): Song {
  const A = 'C Am F G C Am F G';
  const B = 'F G Em Am F G C C';
  const hold = 'o3 c4 c c c4 c4';
  return {
    bpm: 132,
    transpose: 2,
    channels: band('trumpet'),
    intro: ['I'],
    loop: ['A', 'B'],
    sections: {
      I: {
        p1: 'o5 c4. c16 c16 c4 e4 | g4. g16 g16 g4 > c4 < | a4. a16 a16 a4 > c4 < | > d2. < g16 a16 b16 > c16 < |',
        s: over('C C F G', PAD),
        w: under('C C F G', hold),
        d: `[${D_MARCH}]3 ${D_ROLL}`,
      },
      A: {
        p1: 'o5 e4. e g4 > c4 < | > c4. < b a4 e4 | f4. f a4 > c4 < | b4. a g2 | > e4. d c4 < g4 | > c4. < b a4 > c4 < | > f4. e d4 c4 < | > d2 < b4 g4 |',
        p2: over(A, ARP16),
        s: over(A, PAD),
        w: under(A, WALK),
        d: eight(D_MARCH),
        c: CRASH,
      },
      B: {
        p1: '@lead o5 a4. g a4 > c4 < | b4. a b4 > d4 < | > e4. d < b4 g4 | a2. r4 | f g a > c4 < a > c4 < | g a b > d4 < b > d4 < | > e4. d c4 < g4 | > c1 < |',
        p2: over(B, 'o4 c g > c < g c g > c < g'),
        s: over(B, PAD),
        w: under(B, hold),
        d: eight(D_MARCH),
      },
    },
  };
}

function hallOfFame(): Song {
  const A = 'C G Am Em F C F G';
  const B = 'Am F C G Am F G C';
  const chime = 'o4 c g > c < g e g > c < g';
  const bass = 'q8 o3 c2. < g4 >';
  return {
    bpm: 92,
    transpose: 2,
    echo: [0.2, 0.26],
    channels: band('flute', { p2: { inst: 'bell', vol: 0.2, pan: 0.4 } }),
    loop: ['A', 'B'],
    sections: {
      A: {
        p1: 'o5 e2 g4. f | d2 g4. f | e2 a4. g | g2 e2 | a2 g4 f4 | g2 e4 > c4 < | > c4 < b4 a4 f4 | g1 |',
        p2: over(A, chime),
        s: over(A, PAD),
        w: under(A, bass),
      },
      B: {
        p1: '@trumpet o5 > c2 < b4 a4 | a2 g4 f4 | g2 > c4 d4 < | > d2 < b2 | > e2 d4 c4 < | > c2 < a4 f4 | b2 > d4 < b4 | > c1 < |',
        p2: over(B, chime),
        s: over(B, PAD),
        w: under(B, bass),
        d: '[k4 s16 s16 s k4 s4]8',
      },
    },
  };
}

function defeat(): Song {
  const C = 'Am Dm E Am';
  return {
    bpm: 76,
    echo: [0.22, 0.28],
    channels: band('flute'),
    intro: ['I'],
    sections: {
      I: { p1: 'q8 o5 e2 d2 | c2 < b2 | a2 g+2 | a1 |', s: over(C, 'q8 o3 (ceg)1'), w: under(C, 'q8 o3 c1') },
    },
  };
}

function evolution(): Song {
  // The one tune that is a broken chord on purpose: a figure that circles and never lands, until the fanfare does.
  const A = 'C Dm Em F C Dm Em G';
  const B = 'F G Am Am F G G G';
  const pulse = 'q4 o3 c c c c c c c c';
  const hats = 'r h r h r h r h';
  return {
    bpm: 144,
    transpose: 2,
    channels: band('pluck50', { p2: { inst: 'bell', vol: 0.16, pan: 0.4 } }),
    loop: ['A', 'B'],
    sections: {
      A: { p1: over(A, 'o5 c e g e c e g > c <'), w: under(A, pulse), d: `[${hats}]8` },
      B: { p1: over(B, 'o5 c e g > c e c < g e'), p2: over(B, 'o5 g2 > c2 <'), s: over(B, PAD), w: under(B, pulse), d: `[${hats}]8` },
    },
  };
}

export const TRACK_IDS = [
  'title',
  'hub',
  'route-1',
  'route-2',
  'route-3',
  'city',
  'center',
  'mart',
  'game-corner',
  'mystery',
  'hideout',
  'victory-road',
  'league',
  'battle-wild',
  'battle-trainer',
  'battle-elite',
  'battle-gym',
  'battle-league',
  'battle-champion',
  'battle-legendary',
  'victory-wild',
  'victory-trainer',
  'victory-gym',
  'hall-of-fame',
  'defeat',
  'evolution',
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

export const TRACKS: Record<TrackId, Song> = {
  title: title(),
  hub: hub(),
  'route-1': route1(),
  'route-2': route2(),
  'route-3': route3(),
  city: city(),
  center: center(),
  mart: mart(),
  'game-corner': gameCorner(),
  mystery: mystery(),
  hideout: hideout(),
  'victory-road': victoryRoad(),
  league: league(),
  'battle-wild': battleWild(),
  'battle-trainer': battleTrainer(),
  'battle-elite': battleElite(),
  'battle-gym': battleGym(),
  'battle-league': battleLeague(),
  'battle-champion': battleChampion(),
  'battle-legendary': battleLegendary(),
  'victory-wild': victoryWild(),
  'victory-trainer': victoryTrainer(),
  'victory-gym': victoryGym(),
  'hall-of-fame': hallOfFame(),
  defeat: defeat(),
  evolution: evolution(),
};

/** A short fanfare's two voices and its kit. */
const fanfare = (lead: InstrumentId = 'lead'): Record<string, ChannelDef> => ({
  p1: { inst: lead, vol: 0.5, pan: -0.1 },
  p2: { inst: 'p25', vol: 0.3, pan: 0.3 },
  s: { inst: 'strings', vol: 0.22, pan: -0.3 },
  w: { inst: 'bass', vol: 0.6, dry: true },
  d: { inst: 'kick', vol: 0.5, dry: true, drums: true },
});

/** §9.5.3 — the fanfares that play over the music as effects: it stops for them and picks up where it was. */
export const JINGLES = {
  // A level: a broken chord run up to a held top note.
  'level-up': {
    bpm: 160,
    transpose: 2,
    channels: fanfare(),
    intro: ['I'],
    sections: { I: { p1: 'l16 o5 c e g > c e8 < g8 > c4 <', p2: 'l16 o4 g > c e g > c8 < e8 g4 <', w: 'o3 c4 g g > c4 <' } },
  },
  // Something for the bag: three steps up and a doubled answer.
  'item-get': {
    bpm: 150,
    transpose: 5,
    channels: fanfare('p25'),
    intro: ['I'],
    sections: { I: { p1: 'o5 c e g > c4 r c16 c16 c4 <', p2: 'o4 g > c e g4 r g16 g16 g4 <', w: 'o2 c4 c g4 r c16 c16 c4' } },
  },
  // A Badge: a held call, a turn, and the dominant held over the kit.
  badge: {
    bpm: 132,
    transpose: 2,
    channels: fanfare('trumpet'),
    intro: ['I'],
    sections: {
      I: {
        p1: 'o5 g4. e16 g16 > c4 < a4 | b4 > d < b > g2 < |',
        p2: 'o5 e4. c16 e16 g4 f4 | g4 b g > d2 < |',
        s: 'q8 o4 (ceg)2 (cfa)2 | (dgb)1 |',
        w: 'o3 c4 c4 < f4 f4 | g4 g4 g2 > |',
        d: 'c4 s16 s16 s s4 k4 | s16 s16 s s s c2 |',
      },
    },
  },
  // The new Pokémon stands in its colours: a run up the scale, a turn across two chords, the tonic held.
  evolved: {
    bpm: 160,
    transpose: 2,
    channels: fanfare('trumpet'),
    intro: ['I'],
    sections: {
      I: {
        p1: 'o5 c16 d16 e16 f16 g4 > c4. < g | > f c < a > c g d < b > d < | > c2 r2 < |',
        p2: 'o4 e16 f16 g16 a16 > c4 e4. c < | o5 a f c f b g d g | g2 r2 |',
        s: 'q8 o4 (ceg)1 | (cfa)2 (dgb)2 | (ceg>c)2 r2 |',
        w: 'o3 c4 c c c4 c4 | < f4 f4 g4 g4 > | c2 r2 |',
        d: 's16 s16 s s s k4 k4 | k s k s k s s16 s16 s16 s16 | c2 r2 |',
      },
    },
  },
  // The Center's machine: a rising broken chord on the pulse, a bell on its last note.
  'heal-machine': {
    bpm: 150,
    transpose: 4,
    channels: { ...fanfare('p25'), p2: { inst: 'bell', vol: 0.3, pan: 0.3 } },
    intro: ['I'],
    sections: { I: { p1: 'o5 c e g > c < g > c e4 <', p2: 'o5 r2 r4 > e4 <', w: 'o3 c4 < g4 > c4 c4' } },
  },
  // §9.5.3 — the Hub has moved to a new place: the Hub theme's own voice, up a step and home.
  'hub-arrive': {
    bpm: 132,
    transpose: 5,
    channels: fanfare('p50'),
    intro: ['I'],
    sections: {
      I: {
        p1: 'o5 e g > c4 < b > c d4 < | > e4 d4 c2 < |',
        p2: 'o5 c e g4 g a b4 | > c4 < b4 g2 |',
        s: 'q8 o4 (ceg)2 (dgb)2 | (ceg)1 |',
        w: 'o3 c4 c4 < g4 g4 > | c2 c2 |',
        d: 'k4 s4 k s16 s16 s4 | c2 r2 |',
      },
    },
  },
  // A Hub door opens: a quick climb and two bell notes on top.
  'hub-unlock': {
    bpm: 150,
    transpose: 5,
    channels: { ...fanfare('p25'), p2: { inst: 'bell', vol: 0.3, pan: 0.3 } },
    intro: ['I'],
    sections: { I: { p1: 'l16 o4 g > c e g > c4 e4 < <', p2: 'o6 r4 c4 e4', w: 'o3 c4 g4 > c4 <' } },
  },
} satisfies Record<string, Song>;

export type JingleId = keyof typeof JINGLES;
