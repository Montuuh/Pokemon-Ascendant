import type { ContentRegistry } from '../content/defs';
import { afterTurn, canToss, lineBlocked, playerCanStand, SAFARI, step, throwOdds, tossBait, tossRock, traitsOf, walkDistance } from '../run/safari';
import type { Facing, SafariHunt, SafariSpot } from '../run/types';

// §2.11.6 — a player for the Safari's stalk, for the harness and the tests. It reads the board the way the
// screen shows it (the Pokémon's next move and the look it will have when it gets there) and plays one turn at a
// time: every way of spending the turn's two actions is tried on a copy with the sim's own functions, and the
// one that ends closest to a good throw without being noticed wins. It is not clever — it looks one turn ahead —
// which is the point: it measures what a careful first-time player gets, not what a solver would.

export type SafariMove =
  | { type: 'safari-step'; x: number; y: number }
  | { type: 'safari-bait'; x: number; y: number }
  | { type: 'safari-rock'; x: number; y: number }
  | { type: 'safari-throw' };

/** Throw when the chance is at least this — or, with no alarm to spare, only at `lastChance`. */
export const STALKER = { throwAt: 0.55, lastChance: 0.45, desperate: 0.25 };

const DIRS: Record<Facing, readonly [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

function clone(h: SafariHunt): SafariHunt {
  return { ...h, player: [...h.player], mon: [...h.mon], bait: h.bait ? [...h.bait] : null, patrol: h.patrol };
}

function apply(h: SafariHunt, m: SafariMove): void {
  if (m.type === 'safari-step') step(h, [m.x, m.y]);
  else if (m.type === 'safari-bait') tossBait(h, [m.x, m.y]);
  else if (m.type === 'safari-rock') tossRock(h, [m.x, m.y]);
}

/** Every legal non-throw action from here. Tosses only where they could matter: near the player. */
function options(h: SafariHunt, spot: SafariSpot, withTosses: boolean): SafariMove[] {
  const out: SafariMove[] = [];
  for (const d of Object.values(DIRS)) {
    const x = h.player[0] + d[0];
    const y = h.player[1] + d[1];
    if (playerCanStand(h, x, y)) out.push({ type: 'safari-step', x, y });
  }
  if (!withTosses) return out;
  const r = SAFARI.throwRange;
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      const p: [number, number] = [h.player[0] + dx, h.player[1] + dy];
      if (canToss(h, spot, 'bait', p)) out.push({ type: 'safari-bait', x: p[0], y: p[1] });
      if (canToss(h, spot, 'rock', p) && walkDistance(p, h.mon) <= 2) out.push({ type: 'safari-rock', x: p[0], y: p[1] });
    }
  }
  return out;
}

/** How good the board is for us once the turn has played out. */
function score(h: SafariHunt, spot: SafariSpot, content: ContentRegistry): number {
  const end = afterTurn(h, spot);
  const temper = traitsOf(spot).temper;
  if (end.spots) return h.alarms + 1 >= temper ? -10_000 : -1_000 - walkDistance(h.player, end.mon);
  const next = { ...h, mon: end.mon, facing: end.facing, eating: end.eating };
  const odds = throwOdds(next, spot, content);
  const d = walkDistance(h.player, end.mon);
  const f = DIRS[end.facing];
  const behind = (h.player[0] - end.mon[0]) * f[0] + (h.player[1] - end.mon[1]) * f[1] < 0;
  return (odds ? 100 * odds.chance : 0) - 4 * d + (behind ? 3 : 0) + (lineBlocked(h, h.player, end.mon) ? -2 : 0);
}

/** Should it throw now, from here? */
function shouldThrow(h: SafariHunt, spot: SafariSpot, content: ContentRegistry, clock: number): boolean {
  const odds = throwOdds(h, spot, content);
  if (!odds) return false;
  const spare = traitsOf(spot).temper - h.alarms - 1 > 0;
  if (clock <= 1) return odds.chance >= STALKER.desperate;
  return odds.chance >= (spare ? STALKER.throwAt : STALKER.lastChance);
}

/**
 * The next action for this turn, or null to end it. Called repeatedly: after each action the board has changed
 * (a step, a toss), so the plan is re-made from where it stands.
 */
export function nextSafariMove(h: SafariHunt, spot: SafariSpot, content: ContentRegistry, clock: number): SafariMove | null {
  if (h.ap >= SAFARI.cost.ball && shouldThrow(h, spot, content, clock)) return { type: 'safari-throw' };
  if (h.ap <= 0) return null;
  let best: SafariMove | null = null;
  let bestScore = score(h, spot, content);
  for (const a of options(h, spot, true)) {
    const one = clone(h);
    apply(one, a);
    // The first action alone, then every second action after it.
    const s1 = score(one, spot, content);
    if (s1 > bestScore) { bestScore = s1; best = a; }
    if (one.ap <= 0) continue;
    for (const b of options(one, spot, false)) {
      const two = clone(one);
      apply(two, b);
      const s2 = score(two, spot, content);
      if (s2 > bestScore) { bestScore = s2; best = a; }
    }
  }
  return best;
}
