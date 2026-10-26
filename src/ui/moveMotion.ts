import type { MoveDef, PokemonType } from '@/sim';

// §9.9.2 — how a move moves: the catalogue that turns a move into its animation. Presentation only, read from the move's
// own row (its range, its reach, its type, its power): a Melee move dashes its user across the field and back, a
// Ranged one is charged up and thrown — an orb, a spray, a beam, a bolt — and the great area moves (Surf, Earthquake,
// Blizzard…) fill the whole stage. A move with no power is a glow: on its user when it raises or heals, thrown at
// the foe when it hexes. The fight's numbers wait for the impact (`impactMs`), so the hit and its number land together.

export type MotionKind = 'melee' | 'projectile' | 'beam' | 'bolt' | 'drain' | 'area' | 'aura' | 'hex';

/** What a thrown move looks like in flight. */
export type ProjectileStyle = 'orb' | 'flame' | 'bubbles' | 'leaves' | 'shards' | 'rocks' | 'needles' | 'sludge' | 'rings' | 'stars' | 'gust' | 'shadow';

/** What a stage-filling move looks like. */
export type AreaStyle = 'wave' | 'quake' | 'blizzard' | 'storm' | 'inferno' | 'rockfall' | 'shockwave' | 'petals' | 'psywave' | 'gale' | 'swarm' | 'toxic' | 'darkness' | 'dragon';

export interface Motion {
  kind: MotionKind;
  /** The flight's look (projectile, drain, hex) or the stage's (area). */
  style?: ProjectileStyle | AreaStyle;
  /** When, from the start, the move lands: the damage, the shake, the move's picture. */
  impactMs: number;
  /** When the whole beat is over. */
  totalMs: number;
}

/**
 * §9.9.2 — each kind's beat, in ms. The one table: the hook schedules the impact by it and the keyframes read it as
 * custom properties (`motionTimings`), so the hit and its number never drift apart.
 */
export const MOTION_MS = {
  melee: { windup: 120, dash: 170, strike: 110, back: 220 },
  /** `volley`: between the shapes of a volley (bubbles, leaves…). */
  projectile: { cast: 220, travel: 300, burst: 300, volley: 55 },
  beam: { cast: 200, grow: 150, hold: 220, fade: 160 },
  bolt: { cast: 160, strike: 120, hold: 200 },
  /** `stagger`: between the motes flowing back; the last is home by the beat's end. */
  drain: { cast: 180, travel: 240, back: 520, stagger: 40 },
  area: { build: 380, peak: 260, settle: 520 },
  /** `stagger`: between the rings rising (the sparks a fifth of it apart); the last is gone by the beat's end. */
  aura: { rise: 640, stagger: 100 },
  hex: { cast: 200, travel: 260, swirl: 360, stagger: 50 },
  /** Where any move lands: the ring and the sparks; and between the targets of a move landing on several. */
  impact: { ring: 380, spark: 340, stagger: 90 },
  /** The stage's own beats: Earthquake's shake (from `lead` before its impact to the end of its settle, so `shake` =
   *  `lead` + the settle), the white flash of an Explosion, the coloured one of a strike, stones jumping, a snowflake
   *  crossing; `spread`: how long a field of things (dust, flames, stones, rings) takes to all get going. */
  stage: { lead: 120, shake: 640, flash: 460, strike: 300, debris: 520, flake: 480, spread: 240 },
  /** A shape's own frames while it flies, in steps like a sprite's: a flame's flicker, a tumbling leaf, rock, star or
   *  petal, a ring's throb, a beam's core. */
  frames: { flicker: 90, tumble: 240, ring: 160, core: 70 },
} as const;

const T = MOTION_MS;
/** A beat that ends with its impact's burst played out — on its last target, for a move landing on several (up to three). */
const burst = (impactMs: number, totalMs: number, targetsAfter = 0) => ({ impactMs, totalMs: Math.max(totalMs, impactMs + targetsAfter * T.impact.stagger + T.impact.ring) });
const timing: Record<MotionKind, { impactMs: number; totalMs: number }> = {
  melee: burst(T.melee.windup + T.melee.dash, T.melee.windup + T.melee.dash + T.melee.strike + T.melee.back),
  projectile: burst(T.projectile.cast + T.projectile.travel, T.projectile.cast + T.projectile.travel + T.projectile.burst),
  beam: burst(T.beam.cast + T.beam.grow, T.beam.cast + T.beam.grow + T.beam.hold + T.beam.fade),
  bolt: burst(T.bolt.cast + T.bolt.strike, T.bolt.cast + T.bolt.strike + T.bolt.hold),
  drain: burst(T.drain.cast + T.drain.travel, T.drain.cast + T.drain.travel + T.drain.back),
  area: burst(T.area.build + T.area.peak, T.area.build + T.area.peak + T.area.settle, 2),
  aura: { impactMs: T.aura.rise / 2, totalMs: T.aura.rise },
  hex: { impactMs: T.hex.cast + T.hex.travel, totalMs: T.hex.cast + T.hex.travel + T.hex.swirl },
};

/** §9.9.2 — the great moves that fill the stage whatever they hit, each its own picture. */
export const AREA_MOVES: Readonly<Record<string, AreaStyle>> = {
  surf: 'wave',
  earthquake: 'quake',
  fissure: 'quake',
  blizzard: 'blizzard',
  thunder: 'storm',
  'fire-blast': 'inferno',
  'rock-slide': 'rockfall',
  explosion: 'shockwave',
  'self-destruct': 'shockwave',
  'petal-dance': 'petals',
  psychic: 'psywave',
  'razor-wind': 'gale',
  'night-shade': 'darkness',
  'pin-missile': 'swarm',
  'dragon-rage': 'dragon',
};

/** A move that hits several at once, and is not one of the great ones, fills the stage in its type's way. */
const AREA_BY_TYPE: Record<PokemonType, AreaStyle> = {
  normal: 'shockwave',
  fire: 'inferno',
  water: 'wave',
  grass: 'petals',
  electric: 'storm',
  ice: 'blizzard',
  fighting: 'shockwave',
  poison: 'toxic',
  ground: 'quake',
  flying: 'gale',
  psychic: 'psywave',
  bug: 'swarm',
  rock: 'rockfall',
  ghost: 'darkness',
  dragon: 'dragon',
};

/** The streams: a move that is one continuous line from its user to its target. */
const BEAM_MOVES = new Set(['flamethrower', 'water-gun', 'hydro-pump', 'ice-beam', 'psybeam', 'bubble-beam', 'aurora-beam', 'hyper-beam', 'solar-beam', 'tri-attack', 'sonic-boom']);
/** Lightning: drawn as a bolt, never as a ball. */
const BOLT_MOVES = new Set(['thunder-shock', 'thunderbolt']);
/** A move that takes from its target: the hit, then the life flowing back to the user. */
const DRAIN_MOVES = new Set(['absorb', 'mega-drain', 'dream-eater']);

/** A thrown move's look, by its type. */
const PROJECTILE_BY_TYPE: Record<PokemonType, ProjectileStyle> = {
  normal: 'stars',
  fire: 'flame',
  water: 'bubbles',
  grass: 'leaves',
  electric: 'orb',
  ice: 'shards',
  fighting: 'orb',
  poison: 'sludge',
  ground: 'rocks',
  flying: 'gust',
  psychic: 'rings',
  bug: 'needles',
  rock: 'rocks',
  ghost: 'shadow',
  dragon: 'orb',
};

/** The base move an upgraded card is drawn as: Flamethrower+ moves as Flamethrower does. */
export const baseMoveId = (id: string): string => id.replace(/(-plus)+$/, '');

/**
 * §9.9.2 — the move's animation, from its row: the great moves and anything hitting several fill the stage; a power-0
 * move glows on its user, or is thrown at the foe when it hexes; a Melee move dashes; a Ranged one is a beam, a bolt, a
 * drain or a thrown shape by its type.
 */
export function motionOf(move: MoveDef, victims: number): Motion {
  const id = baseMoveId(move.id);
  const at = (kind: MotionKind, style?: Motion['style']): Motion => ({ kind, ...(style ? { style } : {}), ...timing[kind] });
  if (move.power > 0 && (AREA_MOVES[id] || move.targeting === 'cleave' || victims > 1)) return at('area', AREA_MOVES[id] ?? AREA_BY_TYPE[move.type]);
  if (move.power <= 0) {
    const atFoe = move.effects.some((e) => (e.kind === 'status' && !e.self) || (e.kind === 'stage' && e.target === 'foe'));
    return atFoe ? at('hex', 'rings') : at('aura');
  }
  if (move.range === 'melee') return at('melee');
  if (DRAIN_MOVES.has(id)) return at('drain', 'leaves');
  if (BOLT_MOVES.has(id) || (move.type === 'electric' && !BEAM_MOVES.has(id))) return at('bolt');
  if (BEAM_MOVES.has(id)) return at('beam');
  return at('projectile', PROJECTILE_BY_TYPE[move.type]);
}

/** §9.9.2 — the kinds' beats as custom properties, so the keyframes read the same table the hook schedules by. */
export function motionTimings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [kind, beats] of Object.entries(MOTION_MS)) for (const [beat, ms] of Object.entries(beats)) out[`--mv-${kind}-${beat}`] = `${ms}ms`;
  return out;
}
