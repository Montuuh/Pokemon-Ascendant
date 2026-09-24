import type { ContentRegistry } from '../content/defs';
import { catchRateOf } from '../combat/catch';
import type { GameRng } from '../rng/gameRng';
import type { CityId, Facing, SafariHunt, SafariSpot, SafariState, SafariTier, Tile } from './types';

// §2.11.6 — the Safari Zone: the stalk.
//
// No fight. The lineup is on the board at the entrance; walk up to one and the park lays out a patch of tall
// grass with that Pokémon wandering it. Everything it will do is on screen — the path it walks this turn, the
// tiles it will be looking at when it gets there — so the stalk is a puzzle with one roll at the end: the ball,
// at a chance printed before it is thrown (§2.6.4.3's argument, unchanged). Rarer means a harder board, never a
// hidden rule: a quicker walker, a longer look, sharper ears, a shorter temper.
//
// Pure and deterministic: the board is drawn from the Safari's own stream (SafariRNG), and the Pokémon moves by
// rule, so the only other roll is the throw.

export const SAFARI = {
  /** Per City: what the ticket costs, what it buys, and what the lineup holds (by the Safari's own tiers). */
  cities: {
    'pallet-town': { fee: 200, balls: 3, clock: 10, lineup: ['common', 'uncommon', 'rare'] },
    'celadon-city': { fee: 350, balls: 3, clock: 12, lineup: ['common', 'common', 'uncommon', 'rare'] },
  } as Record<CityId, { fee: number; balls: number; clock: number; lineup: readonly SafariTier[] }>,
  /**
   * §2.11.6 — Gen I's Safari list, less every species a route already offers (a test holds that line), less the
   * fossils (the Laboratory's, v1.3), the starters (the Poké Mart's) and Ditto (until its Transform exists).
   * Dratini is the big city's: the one thing the town's park does not have.
   */
  pools: {
    'pallet-town': {
      common: ['nidoran-m', 'paras', 'venonat', 'goldeen'],
      uncommon: ['exeggcute', 'slowpoke'],
      rare: ['chansey', 'tauros', 'kangaskhan', 'pinsir'],
    },
    'celadon-city': {
      common: ['nidoran-m', 'paras', 'venonat', 'goldeen'],
      uncommon: ['exeggcute', 'slowpoke'],
      rare: ['chansey', 'tauros', 'kangaskhan', 'pinsir', 'dratini'],
    },
  } as Record<CityId, Record<SafariTier, readonly string[]>>,
  /** A recruit stands at the next Region's recruit floor, up to this many levels over it. */
  levelSpread: 2,
  /** The board, by tier: its side, and how the Pokémon behaves. */
  tiers: {
    common: { size: 7, sight: 2, speed: 1, temper: 3, ears: 0 },
    uncommon: { size: 8, sight: 3, speed: 1, temper: 2, ears: 0 },
    rare: { size: 9, sight: 3, speed: 1, temper: 1, ears: 0 },
  } as Record<SafariTier, SafariTraits>,
  /**
   * The rares' one trait each — what makes that board the harder one. `water` puts the Pokémon in a pond it
   * never leaves, which you can only reach from the open shore.
   */
  species: {
    goldeen: { water: true },
    slowpoke: { water: true },
    chansey: { sight: 4, trait: 'keen-eyed' },
    tauros: { speed: 2, trait: 'quick' },
    kangaskhan: { ears: 1, trait: 'alert' },
    pinsir: { ears: 2, trait: 'sharp-eared' },
    dratini: { water: true, speed: 2, trait: 'quick' },
  } as Record<string, Partial<SafariTraits> & { water?: boolean; trait?: SafariTrait }>,
  /**
   * Actions per turn, and what each costs. A throw is the whole turn: you have to *end* the turn before it within
   * reach, which means surviving its move and its look first — the part of the stalk that is a puzzle.
   */
  ap: 2,
  cost: { step: 1, bait: 1, rock: 1, ball: 2 },
  /** How far a ball, a bait or a rock can be thrown (tiles, walking distance). */
  ballRange: 2,
  throwRange: 3,
  /** Turns a bait holds it once it reaches it. */
  eatTurns: 2,
  /**
   * The throw: `catchRate × base × range × unseen × behind × eating`, clamped. A common basic from behind,
   * never having seen you, one tile away is at the cap; a rare seen at two tiles is under one in five.
   */
  odds: { base: 0.5, range: [1, 1, 0.7] as readonly number[], unseen: 1.5, behind: 1.25, eating: 1.25, floor: 0.01, cap: 0.9 },
  /** The board: roughly this share of open ground and of rocks. */
  terrain: { openPatches: 3, openPatch: 4, rocks: 0.06 },
} as const;

export type SafariTrait = 'keen-eyed' | 'quick' | 'alert' | 'sharp-eared';

export interface SafariTraits {
  size: number;
  /** How many tiles ahead it looks (its cone is one wide at 1, three at 2, five at 3). */
  sight: number;
  /** Tiles walked a turn. */
  speed: number;
  /** Alarms it will take; the last one sends it off. */
  temper: number;
  /** Within this walking distance it hears you through the grass, facing or not. 0 is deaf. */
  ears: number;
}

/** The species' behaviour on its board: the tier's, with its own trait on top. */
export function traitsOf(spot: Pick<SafariSpot, 'species' | 'tier'>): SafariTraits & { water: boolean; trait: SafariTrait | null } {
  const own = SAFARI.species[spot.species] ?? {};
  return { ...SAFARI.tiers[spot.tier], ...own, water: !!own.water, trait: own.trait ?? null };
}

/** §2.11.6 — the Safari for this City visit: the ticket and the lineup, rolled on arrival and shown at the door. */
export function rollSafari(rng: GameRng, city: CityId, recruitFloor: number): SafariState {
  const def = SAFARI.cities[city];
  const pools = SAFARI.pools[city];
  const lineup: SafariSpot[] = [];
  for (const tier of def.lineup) {
    const fresh = pools[tier].filter((s) => !lineup.some((l) => l.species === s));
    const from = fresh.length ? fresh : pools[tier];
    const species = from[rng.range(0, from.length)]!;
    lineup.push({ species, tier, level: recruitFloor + rng.range(0, SAFARI.levelSpread + 1), result: null });
  }
  return { fee: def.fee, balls: def.balls, clock: def.clock, lineup, entered: false, done: false, hunt: null };
}

// ── The board ───────────────────────────────────────────────────────────────────────────────────────────────

type Pt = readonly [number, number];
const DIRS: Record<Facing, Pt> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

export const tileAt = (h: Pick<SafariHunt, 'tiles' | 'width' | 'height'>, x: number, y: number): Tile | null =>
  x < 0 || y < 0 || x >= h.width || y >= h.height ? null : (h.tiles[y * h.width + x] as Tile);

export const walkDistance = (a: Pt, b: Pt): number => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const same = (a: Pt, b: Pt): boolean => a[0] === b[0] && a[1] === b[1];

/** Where the player may stand: anything but rock and water, and never on the Pokémon. */
export function playerCanStand(h: SafariHunt, x: number, y: number): boolean {
  const t = tileAt(h, x, y);
  return (t === 'g' || t === 'o') && !same([x, y], h.mon);
}

/** Where the Pokémon may walk: its pond, or everything dry but rock. */
function monCanWalk(h: SafariHunt, water: boolean, p: Pt): boolean {
  const t = tileAt(h, p[0], p[1]);
  return water ? t === 'w' : t === 'g' || t === 'o';
}

/**
 * The board for one approach. Tall grass everywhere, a few open clearings (where you can be seen), a scatter of
 * rocks (which block a look and a throw), and the Pokémon's beat: a loop it walks round. A water species' loop is
 * a pond with an open shore round it. You come in at the bottom edge.
 */
export function rollHunt(rng: GameRng, spotIndex: number, spot: SafariSpot): SafariHunt {
  const tr = traitsOf(spot);
  const n = tr.size;
  const grid: Tile[] = Array.from({ length: n * n }, () => 'g');
  const set = (x: number, y: number, t: Tile) => {
    if (x >= 0 && y >= 0 && x < n && y < n) grid[y * n + x] = t;
  };
  const get = (x: number, y: number) => grid[y * n + x]!;

  // The beat: a rectangle's rim in the upper part of the board.
  const w = 3 + rng.range(0, 2);
  const hgt = 2 + rng.range(0, 2);
  const x0 = 1 + rng.range(0, n - w - 1);
  const y0 = 1 + rng.range(0, Math.max(1, n - hgt - 4));
  const patrol: [number, number][] = [];
  for (let x = x0; x < x0 + w; x++) patrol.push([x, y0]);
  for (let y = y0 + 1; y < y0 + hgt; y++) patrol.push([x0 + w - 1, y]);
  for (let x = x0 + w - 2; x >= x0; x--) patrol.push([x, y0 + hgt - 1]);
  for (let y = y0 + hgt - 2; y > y0; y--) patrol.push([x0, y]);
  if (rng.chance(0.5)) patrol.reverse();

  // Clearings, then rocks, never on the beat or the entrance.
  for (let k = 0; k < SAFARI.terrain.openPatches; k++) {
    let x = rng.range(0, n);
    let y = rng.range(0, n);
    for (let s = 0; s < SAFARI.terrain.openPatch; s++) {
      set(x, y, 'o');
      const d = (['n', 'e', 's', 'w'] as const)[rng.range(0, 4)]!;
      x = Math.min(n - 1, Math.max(0, x + DIRS[d][0]));
      y = Math.min(n - 1, Math.max(0, y + DIRS[d][1]));
    }
  }
  const onBeat = (x: number, y: number) => patrol.some((p) => p[0] === x && p[1] === y);
  const entrance: [number, number] = [Math.floor(n / 2), n - 1];
  for (let i = 0; i < n * n; i++) {
    const x = i % n;
    const y = Math.floor(i / n);
    if (!onBeat(x, y) && !same([x, y], entrance) && rng.chance(SAFARI.terrain.rocks)) set(x, y, 'r');
  }

  if (tr.water) {
    // The pond is the beat's bounding box grown by one — water — and a ring of open shore round that.
    for (let y = y0 - 2; y <= y0 + hgt + 1; y++) for (let x = x0 - 2; x <= x0 + w + 1; x++) set(x, y, 'o');
    for (let y = y0 - 1; y <= y0 + hgt; y++) for (let x = x0 - 1; x <= x0 + w; x++) set(x, y, 'w');
  } else {
    for (const [x, y] of patrol) if (get(x, y) === 'r') set(x, y, 'g');
  }
  set(entrance[0], entrance[1], 'g');

  const start = rng.range(0, patrol.length);
  const next = patrol[(start + 1) % patrol.length]!;
  const at = patrol[start]!;
  return {
    spot: spotIndex,
    width: n,
    height: n,
    tiles: grid.join(''),
    player: entrance,
    mon: at,
    facing: facingOf(at, next),
    patrol,
    patrolIndex: start,
    alarms: 0,
    seen: false,
    ap: SAFARI.ap,
    bait: null,
    eating: 0,
    held: false,
    heldLast: false,
    lastThrow: null,
    turn: 1,
  };
}

function facingOf(from: Pt, to: Pt): Facing {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'e' : 'w';
  return dy >= 0 ? 's' : 'n';
}

/** Breadth-first path for the Pokémon, around rocks and the player, as the steps after `from`. */
function pathTo(h: SafariHunt, water: boolean, from: Pt, goal: (p: Pt) => boolean): Pt[] | null {
  const key = (p: Pt) => p[1] * h.width + p[0];
  const prev = new Map<number, number>();
  const queue: Pt[] = [from];
  prev.set(key(from), -1);
  while (queue.length) {
    const p = queue.shift()!;
    if (!same(p, from) && goal(p)) {
      const out: Pt[] = [];
      let k = key(p);
      while (k !== key(from)) {
        out.unshift([k % h.width, Math.floor(k / h.width)]);
        k = prev.get(k)!;
      }
      return out;
    }
    for (const d of ['n', 'e', 's', 'w'] as const) {
      const q: Pt = [p[0] + DIRS[d][0], p[1] + DIRS[d][1]];
      if (prev.has(key(q)) || !monCanWalk(h, water, q) || same(q, h.player)) continue;
      prev.set(key(q), key(p));
      queue.push(q);
    }
  }
  return null;
}

/**
 * What the Pokémon will do when the turn ends, as it stands now: the tiles it will walk, where it will be facing,
 * and whether it stops to eat. Pure — the screen draws this, and the end of the turn plays exactly this.
 */
export interface MonPlan {
  steps: Pt[];
  facing: Facing;
  /** It reaches the bait on this move and starts eating. */
  eats: boolean;
  /** Its way is blocked by the player: it walks into you. */
  bumps: boolean;
}

export function planOf(h: SafariHunt, spot: SafariSpot): MonPlan {
  const tr = traitsOf(spot);
  if (h.held) return { steps: [], facing: h.facing, eats: false, bumps: false };
  if (h.eating > 0) return { steps: [], facing: h.facing, eats: false, bumps: false };
  const steps: Pt[] = [];
  let at: Pt = h.mon;
  let facing = h.facing;
  let idx = h.patrolIndex;
  let eats = false;
  let bumps = false;
  for (let s = 0; s < tr.speed; s++) {
    let step: Pt | null;
    if (h.bait) {
      const bait = h.bait;
      step = same(at, bait) ? null : (pathTo(h, tr.water, at, (p) => same(p, bait))?.[0] ?? null);
    } else if (idx >= 0 && same(h.patrol[idx]!, at)) {
      step = h.patrol[(idx + 1) % h.patrol.length]!;
    } else {
      step = pathTo(h, tr.water, at, (p) => h.patrol.some((q) => same(p, q)))?.[0] ?? null;
    }
    if (!step) break;
    if (same(step, h.player)) {
      bumps = true;
      facing = facingOf(at, step);
      break;
    }
    facing = facingOf(at, step);
    at = step;
    steps.push(step);
    const onBeat = h.patrol.findIndex((q) => same(q, at));
    idx = onBeat;
    if (h.bait && same(at, h.bait)) {
      eats = true;
      break;
    }
  }
  return { steps, facing, eats, bumps };
}

/** The tiles it is looking at from `at`, facing `facing`: a cone, blocked by rocks. Eating, it looks one tile. */
export function coneOf(h: SafariHunt, spot: SafariSpot, at: Pt = h.mon, facing: Facing = h.facing, eating = h.eating > 0): Pt[] {
  const sight = eating ? 1 : traitsOf(spot).sight;
  const f = DIRS[facing];
  const side: Pt = [-f[1], f[0]];
  const out: Pt[] = [];
  for (let a = 1; a <= sight; a++) {
    for (let b = -(a - 1); b <= a - 1; b++) {
      const p: Pt = [at[0] + f[0] * a + side[0] * b, at[1] + f[1] * a + side[1] * b];
      if (!tileAt(h, p[0], p[1]) || tileAt(h, p[0], p[1]) === 'r') continue;
      if (lineBlocked(h, at, p)) continue;
      out.push(p);
    }
  }
  return out;
}

/** A rock strictly between two tiles blocks a look or a throw. */
export function lineBlocked(h: SafariHunt, a: Pt, b: Pt): boolean {
  const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
  for (let i = 1; i < steps; i++) {
    const x = Math.round(a[0] + ((b[0] - a[0]) * i) / steps);
    const y = Math.round(a[1] + ((b[1] - a[1]) * i) / steps);
    if (tileAt(h, x, y) === 'r') return true;
  }
  return false;
}

/**
 * Would it notice the player standing at `p`? In its cone and in the open, or in its cone one tile away (the
 * grass hides you from everything but the tile in front of it), or — for sharp ears — within earshot anywhere.
 * A Pokémon with its head in the bait hears nothing.
 */
export function notices(h: SafariHunt, spot: SafariSpot, p: Pt, at: Pt = h.mon, facing: Facing = h.facing, eating = h.eating > 0): boolean {
  const ears = traitsOf(spot).ears;
  if (!eating && ears > 0 && walkDistance(p, at) <= ears) return true;
  if (!coneOf(h, spot, at, facing, eating).some((c) => same(c, p))) return false;
  return tileAt(h, p[0], p[1]) === 'o' || walkDistance(p, at) <= 1;
}

/** The throw from where the player stands, or null when it cannot be thrown from here. */
export interface SafariOdds {
  chance: number;
  catchRate: number;
  range: number;
  unseen: boolean;
  behind: boolean;
  eating: boolean;
}

export function throwOdds(h: SafariHunt, spot: SafariSpot, content: ContentRegistry): SafariOdds | null {
  const d = walkDistance(h.player, h.mon);
  if (d > SAFARI.ballRange || lineBlocked(h, h.player, h.mon)) return null;
  const f = DIRS[h.facing];
  const behind = (h.player[0] - h.mon[0]) * f[0] + (h.player[1] - h.mon[1]) * f[1] < 0;
  const eating = h.eating > 0;
  const catchRate = catchRateOf(spot.species, content);
  const o = SAFARI.odds;
  const raw = catchRate * o.base * (o.range[d] ?? 0) * (h.seen ? 1 : o.unseen) * (behind ? o.behind : 1) * (eating ? o.eating : 1);
  return { chance: Math.min(o.cap, Math.max(o.floor, raw)), catchRate, range: d, unseen: !h.seen, behind, eating };
}

/** A bait or a rock may land on any tile within reach that is not a rock. The bait has to be somewhere it can walk. */
export function canToss(h: SafariHunt, spot: SafariSpot, kind: 'bait' | 'rock', p: Pt): boolean {
  const t = tileAt(h, p[0], p[1]);
  if (!t || t === 'r' || walkDistance(h.player, p) > SAFARI.throwRange || same(p, h.player)) return false;
  if (kind === 'rock') return !h.heldLast && !h.held;
  if (h.bait || h.eating > 0) return false;
  const water = traitsOf(spot).water;
  return monCanWalk(h, water, p) && !!pathTo(h, water, h.mon, (q) => same(q, p));
}

/** Alarm it once. Returns true if that was the last it would take. */
function alarm(h: SafariHunt, spot: SafariSpot): boolean {
  h.alarms += 1;
  h.seen = true;
  return h.alarms >= traitsOf(spot).temper;
}

export type HuntEvent = 'caught' | 'broke-free' | 'fled' | null;

/** Throw a ball. The one roll of the stalk. Mutates `h`. */
export function throwBall(h: SafariHunt, spot: SafariSpot, content: ContentRegistry, rng: GameRng): HuntEvent {
  const odds = throwOdds(h, spot, content)!;
  h.ap -= SAFARI.cost.ball;
  const caught = rng.range01() < odds.chance;
  h.lastThrow = { chance: odds.chance, caught };
  if (caught) return 'caught';
  return alarm(h, spot) ? 'fled' : 'broke-free';
}

export function tossBait(h: SafariHunt, p: Pt): void {
  h.ap -= SAFARI.cost.bait;
  h.bait = [p[0], p[1]];
}

/** The rock: it stops where it stands this turn, turned towards the noise. Never two turns running. */
export function tossRock(h: SafariHunt, p: Pt): void {
  h.ap -= SAFARI.cost.rock;
  h.held = true;
  h.eating = 0;
  h.bait = null;
  h.facing = facingOf(h.mon, p);
}

export function step(h: SafariHunt, p: Pt): void {
  h.ap -= SAFARI.cost.step;
  h.player = [p[0], p[1]];
}

/**
 * The turn ends: the Pokémon does what its plan said, then looks. Seen — or walked into — is an alarm; its last
 * alarm sends it off. Mutates `h`.
 */
export function endTurn(h: SafariHunt, spot: SafariSpot): HuntEvent {
  const plan = planOf(h, spot);
  const after = afterTurn(h, spot, plan);
  h.heldLast = h.held;
  h.held = false;
  h.mon = after.mon;
  h.facing = after.facing;
  h.eating = after.eating;
  h.patrolIndex = h.patrol.findIndex((q) => same(q, h.mon));
  if (plan.eats) h.bait = null;
  h.ap = SAFARI.ap;
  h.turn += 1;
  if (after.spots && alarm(h, spot)) return 'fled';
  return null;
}

/**
 * Where it will stand, face and whether it will be eating once the turn ends — and whether, from there, it will
 * notice the player where they stand now. The screen draws this as the danger; `endTurn` plays exactly it.
 */
export function afterTurn(h: SafariHunt, spot: SafariSpot, plan: MonPlan = planOf(h, spot)): { mon: [number, number]; facing: Facing; eating: number; cone: Pt[]; spots: boolean } {
  const mon: [number, number] = plan.steps.length ? [plan.steps[plan.steps.length - 1]![0], plan.steps[plan.steps.length - 1]![1]] : [h.mon[0], h.mon[1]];
  const eating = plan.eats ? SAFARI.eatTurns : Math.max(0, h.eating - 1);
  const cone = coneOf(h, spot, mon, plan.facing, eating > 0);
  const spots = plan.bumps || notices({ ...h, mon }, spot, h.player, mon, plan.facing, eating > 0);
  return { mon, facing: plan.facing, eating, cone, spots };
}
