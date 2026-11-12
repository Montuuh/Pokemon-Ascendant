import forms from './forms.json';
import parties from './parties.json';

/**
 * §9.13.1 — the parties on the title's summit. A party is three Pokémon, as a run's is, each a line of three forms:
 * it arrives as its first forms and evolves twice while the title is up. Every line is a real evolution chain, in
 * order, so a fan watching finds nothing off; the flyer is the Pokémon that crosses the sky while that party stands
 * there. Presentation only: no rule reads this table (`parties.json`, which `scripts/build-title-art.mjs` reads too).
 */
export type TitleLine = readonly [string, string, string];

export interface TitleParty {
  /** Left, centre, right — the order they stand in on the ledge. */
  readonly lines: readonly [TitleLine, TitleLine, TitleLine];
  /** A species with a front battle sprite drawn in flight. */
  readonly flyer: string;
}

export const TITLE_PARTIES = parties as unknown as readonly TitleParty[];

/** A form's picture, in the scene's pixels (`public/art/title/forms/`): its width, and its height with its shadow. */
export function formSize(id: string): { w: number; h: number } {
  const size = (forms.sizes as Record<string, number[] | undefined>)[id];
  if (!size) throw new Error(`title form "${id}" has no picture: run scripts/build-title-art.mjs`);
  return { w: size[0]!, h: size[1]! };
}
/** How far a form's shadow reaches below its feet, in the scene's pixels. */
export const FORM_FOOT = forms.foot;

/** The ledge, in the vista's pixels: where feet can stand, left to right, and the ground's height along it. */
const LEDGE = {
  from: 412,
  to: 596,
  /** Where a party that has room stands around. */
  centre: 500,
  /** Between two neighbours that have room. */
  gap: 10,
  ground: [
    [412, 289],
    [500, 277],
    [596, 286],
  ],
} as const;

function groundAt(x: number): number {
  const g = LEDGE.ground;
  const i = x <= g[1][0] ? 0 : 1;
  const [x0, y0] = g[i]!;
  const [x1, y1] = g[i + 1]!;
  return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
}

/**
 * Where three forms stand, by their widths: side by side with a gap, around the ledge's middle, and no nearer than
 * they have to be — a party of final forms is three times as wide as one of first forms, and fixed spots piled it up.
 * If the three are wider than the ledge, the spacing closes evenly and the nearer one overlaps the further.
 */
export function standParty(widths: readonly [number, number, number]): { x: number; y: number }[] {
  const d01 = (widths[0] + widths[1]) / 2 + LEDGE.gap;
  const d12 = (widths[1] + widths[2]) / 2 + LEDGE.gap;
  const room = LEDGE.to - LEDGE.from;
  const fit = Math.min(1, room / (d01 + d12));
  const span = (d01 + d12) * fit;
  // The middle one's place when the outer two are centred on the ledge's middle, kept inside the ledge.
  const first = Math.min(Math.max(LEDGE.centre - span / 2, LEDGE.from), LEDGE.to - span);
  return [first, first + d01 * fit, first + span].map((x) => ({ x: Math.round(x), y: groundAt(x) }));
}

/** The scene's beats, in ms. */
export const TITLE_BEATS = {
  /** A form stands this long before the party evolves, or leaves. */
  hold: 12_000,
  /** Before an evolution the three step apart, to where their next forms will have room. */
  shift: 600,
  /** One member's evolution: into light, the two shapes taking turns faster and faster, the flash, the new form. */
  evolve: 2400,
  /** Between one member's evolution ending and the next one's beginning. */
  gap: 300,
  /** The party leaves, and the next one arrives, in this long each. */
  leave: 700,
  /** A cloud strip's whole width going by: the far one a pixel every 750 ms, the near one every 250 ms. */
  far: 480_000,
  near: 160_000,
  /** One crossing of the sky; each party sees one. */
  fly: 26_000,
} as const;

/** A whole evolution of the party: the step apart, then each member in turn. */
export const TITLE_EVOLUTION = TITLE_BEATS.shift + 3 * TITLE_BEATS.evolve + 2 * TITLE_BEATS.gap;

/**
 * §9.13.1 — how much of a party's time something is evolving. Ambient decoration beside a menu moves less than a
 * third of the time: more, and it is the screen's subject rather than its backdrop.
 */
export const titleEvolvingShare = () => (2 * TITLE_EVOLUTION) / (3 * TITLE_BEATS.hold + 2 * TITLE_EVOLUTION + TITLE_BEATS.leave);
