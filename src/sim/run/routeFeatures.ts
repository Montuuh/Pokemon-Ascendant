import type { ContentRegistry } from '../content/defs';
import { GameRng } from '../rng/gameRng';
import { fmix32, fnv1a } from '../rng/rngStreams';
import type { PokemonType } from '../types';
import { MYSTERY_EVENTS } from './events';
import type { GateKind, MapNode, RegionMap, RunState } from './types';

// §2.5.5 — what a route holds besides its nodes (v0.9.107, the user's "all phases" of the route review, 2026-11-09):
// the field moves' obstacles that close a crossing until the party can clear it, a ledge that drops past a column one
// way, and every Mystery's event, rolled with the map. Each is placed on a stream of its own off the map's cursor, as
// the trader and the reels are, so placing one never moves another.

/** §2.5.5 — the obstacles, and the types in the party that clear each: the games' field moves, by who can learn them. */
export const GATES: Readonly<Record<GateKind, { types: readonly PokemonType[] }>> = {
  cut: { types: ['grass', 'bug'] },
  smash: { types: ['fighting', 'rock', 'ground'] },
  surf: { types: ['water'] },
};

/** §2.5.5 — the route's extras, as numbers: data, not literals in the rules. */
export const ROUTE_FEATURES = {
  /** How many crossings an obstacle closes on a map, at most, and how likely each candidate is to hold one. */
  gatesMax: 3,
  gateChance: 0.45,
  /** Which obstacles each Region's road favours: a cut tree on a grass route, deep water on the coast. */
  gateWeights: [
    { cut: 3, smash: 2, surf: 1 },
    { cut: 1, smash: 1, surf: 3 },
    { cut: 1, smash: 3, surf: 2 },
  ] as Readonly<Record<GateKind, number>>[],
  /** The chance a map has its ledge, and the trunk columns it may drop from (it lands two columns on). */
  ledgeChance: 0.6,
  ledgeFrom: [1, 5] as const,
};

/** §2.5.5 — the obstacle on the edge from `node` to `to`, if one closes it. */
export const gateOn = (node: MapNode, to: string): GateKind | null => node.gates?.[to] ?? null;

/** §2.5.5 — whether the party carries a type that clears an obstacle (anyone in the Box: the team is chosen on the map). */
export function partyClears(run: Pick<RunState, 'box'>, gate: GateKind, content: ContentRegistry): boolean {
  return run.box.some((m) => content.species(m.speciesId).types.some((t) => GATES[gate].types.includes(t)));
}

/** §2.5.5 — whether the step from where the run stands to `to` is open: in reach, and no obstacle it cannot clear. */
export function stepOpen(run: Pick<RunState, 'box' | 'position' | 'map'>, to: string, content: ContentRegistry): boolean {
  const from = run.position ? run.map.nodes[run.position] : undefined;
  const gate = from ? gateOn(from, to) : null;
  return !gate || partyClears(run, gate, content);
}

const streamOf = (cursor: number, name: string) => new GameRng(fmix32(cursor ^ fnv1a(name)));

/**
 * §2.5.5 — the obstacles. Only on a node with a second, open child — so no obstacle is ever the only way on — never on
 * the step into a lane (the commitment, which the middle track must keep offering both ways), never into a Gym or the
 * lanes' last nurse, and never before the first stop. The step it closes is the one that changes track: the crossing.
 */
export function placeGates(map: Pick<RegionMap, 'nodes' | 'regionIndex'>, mapCursor: number): void {
  const rng = streamOf(mapCursor, 'GateRNG');
  const nodes = Object.values(map.nodes).sort((a, b) => a.layer - b.layer || a.col - b.col);
  const weights = ROUTE_FEATURES.gateWeights[Math.min(map.regionIndex, ROUTE_FEATURES.gateWeights.length - 1)]!;
  let placed = 0;
  for (const n of nodes) {
    if (placed >= ROUTE_FEATURES.gatesMax || n.layer < 2 || n.next.length < 2 || n.gates) continue;
    const targets = n.next.map((id) => map.nodes[id]!).filter((t) => t.layer === n.layer + 1);
    const crossing = targets
      .filter((t) => t.kind !== 'gym' && t.kind !== 'aid' && !(n.lane === undefined && t.lane !== undefined))
      .sort((a, b) => Math.abs(b.row - n.row) - Math.abs(a.row - n.row))[0];
    if (!crossing || Math.abs(crossing.row - n.row) < 2 || !rng.chance(ROUTE_FEATURES.gateChance)) continue;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let roll = rng.range01() * total;
    const kind = (Object.keys(weights) as GateKind[]).find((k) => (roll -= weights[k]) <= 0) ?? 'cut';
    n.gates = { [crossing.id]: kind };
    placed++;
  }
}

/**
 * §2.5.5 — the ledge: from a trunk node, a one-way drop past the next column onto the track below, two columns on — down,
 * as FRLG's ledges drop south. It skips that column's fight — a way past a fight the team is too hurt for, paid for in the
 * fight's XP and prize. Only over a fight column, never into the Y, at most one a map.
 */
export function placeLedge(map: Pick<RegionMap, 'nodes'>, mapCursor: number, isStopColumn: (layer: number) => boolean, lastTrunkLayer: number): void {
  const rng = streamOf(mapCursor, 'LedgeRNG');
  if (!rng.chance(ROUTE_FEATURES.ledgeChance)) return;
  const [lo, hi] = ROUTE_FEATURES.ledgeFrom;
  const nodes = Object.values(map.nodes);
  const pairs: [MapNode, MapNode][] = [];
  for (const n of nodes) {
    if (n.layer < lo || n.layer > hi || n.layer + 2 > lastTrunkLayer || isStopColumn(n.layer + 1) || n.ledge) continue;
    for (const t of nodes) if (t.layer === n.layer + 2 && t.row - n.row >= 2 && t.row - n.row <= 4 && t.lane === undefined && t.lean === undefined) pairs.push([n, t]);
  }
  if (!pairs.length) return;
  const [from, to] = pairs[rng.range(0, pairs.length)]!;
  from.ledge = to.id;
  from.next = [...from.next, to.id].sort();
}

/**
 * §2.10 — every Mystery's event, rolled with the map: drawn without replacement against the run's seen events and the
 * map's own, so one map never holds the same event twice. It stays a "?" until it is entered (the user, 2026-11-09: "los
 * mystery deberían seguir siendo mystery"); v0.9.107 showed it as its place.
 */
export function placeEvents(map: Pick<RegionMap, 'nodes'>, mapCursor: number, seen: readonly string[]): void {
  const rng = streamOf(mapCursor, 'PlaceRNG');
  const taken = new Set(seen);
  const mysteries = Object.values(map.nodes).filter((n) => n.kind === 'mystery').sort((a, b) => a.layer - b.layer || a.col - b.col);
  for (const n of mysteries) {
    const pool = MYSTERY_EVENTS.filter((e) => !taken.has(e.id));
    const from = pool.length ? pool : MYSTERY_EVENTS;
    const total = from.reduce((a, e) => a + (e.weight ?? 1), 0);
    let roll = rng.range01() * total;
    const event = from.find((e) => (roll -= e.weight ?? 1) <= 0) ?? from[from.length - 1]!;
    n.preview = { ...n.preview, event: event.id };
    taken.add(event.id);
  }
}

