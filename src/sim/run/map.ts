import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import {
  BIOMES, ELITE, GYMS, LANE_THEME, REGION1_BIOME_WEIGHTS, REGION_LEVEL_OFFSET, TRAINERS, eliteTeamFor, eliteWildTeamFor, evolvedAt,
  gymById, gymTeamFor, rostersOf, trainerTeamFor, wildBandFor, type BiomeId, type GymDef, type TrainerRoster,
} from './region';
import { AID_HEAL_PCT } from './economy';
import { hasModifier } from './modifiers';
import type { MapNode, NodeKind, NodePreview, RegionMap } from './types';

// §2.5 — the Region map, v2: a twelve-layer branching tree that forks near the end into two Gym lanes.
//
//   L0      4 entry nodes, wild-heavy — a lone Lv 5 starter needs bodies before it needs XP
//   L1–L6   the trunk, 4–5 nodes wide, a lattice rather than a ladder
//   L7      the last shared layer. The Elite Trainer is the middle of three: guaranteed on the map,
//           optional to walk into, and the hardest fight before the Gym
//   L8      THE FORK. Two lanes, each themed after the Gym at the end of it. They never rejoin.
//   L8–L10  each lane: fights in its Gym's biome, the field nurse before the end (§2.9.1)
//   L11     two Gyms, drawn 2-of-4 from the Region's pool. You fight the one your lane reaches.
//
// **What makes this different from v0.4's ten-layer ladder.**
//
// A ladder has one node per layer to choose from a row of two or three, and every run has the same shape.
// This is a lattice: five columns, edges only to adjacent columns, one to three children each. It looks
// dense and reads clean, because a node's children are always the column left, the column under, and the
// column right — you can trace a route with your eye, which is the whole requirement. And the width means
// the map holds ~50 nodes of which you walk 12, so the *unchosen* route is visible the whole way up.
//
// **The fork is the point.** Both Gyms are named from layer 0 (Pillar 1: no hidden climax), each lane looks
// like its Gym for four layers before you get there, and the lanes never reconnect — so choosing one closes
// the other, which is what makes it a choice. The counter to a Gym is built in the *trunk*, out of a mixed
// pool, and the lane is where you commit.
//
// Generation is seeded: the same (runSeed, regionIndex) always produces the same route, the same Gym pair
// and the same lane themes.

export const LAYERS = 12;
/** §2.5 — the two terminal Gym nodes. */
const GYM_LAYER = LAYERS - 1;
/** §2.5 — the first layer of the lanes. Everything from here on belongs to one Gym or the other. */
export const FORK_LAYER = 8;
/** §2.8.1 — the Elite Trainer, guaranteed *on the map* and beside two ordinary fights: a trade, not a gate. */
const ELITE_LAYER = FORK_LAYER - 1;
/** §2.9.2 — the travelling merchant, early-trunk, so what it sells has the rest of the route to pay back. */
const MERCHANT_LAYER = 3;
/**
 * §2.5.1 — three Mystery nodes across the trunk. L6 was the Dojo's until the Dojo moved into the Cities
 * (§2.9.4, 2026-09-22); a non-combat beat still belongs there, and events are the route's other one.
 */
const MYSTERY_LAYERS = [2, 5, 6];

/**
 * How wide each layer is. The trunk is four or five columns, the Elite layer narrows to three, and the Gym
 * layer is two — one terminal node per lane.
 *
 * After the fork the width is *per lane*: L8–L10 are 2 + 2, drawn as four columns with a gap down the middle
 * so the split is visible rather than inferred.
 */
const LAYER_WIDTH = [4, 5, 5, 4, 5, 4, 5, 3, 4, 4, 4, 2];
/** Nodes per lane once the trunk has forked. */
const LANE_WIDTH = 2;

/**
 * §2.5 — per-layer node weights for the trunk. Two rules the user asked for live here:
 *
 *   **Wild-heavy opening.** L0 and L1 are mostly Wild Areas. A lone Lv 5 starter loses the first *trainer*
 *   fight about as often as not — it is one Pokémon against two — and the answer is bodies, not levels. This
 *   is not a *forced* Wild (§2.5.3 rejected that, and rightly: it wastes the first decision). It is a
 *   weighting: four entry nodes, three of them Wild, and *which* wild is still a real choice because each
 *   one names its three species.
 *
 *   **No nurse in the trunk.** The field nurse belongs to the lanes (§2.9.1), one per lane, before its Gym.
 *   A rest at layer 2 is a rest you did not need that costs a fight you did.
 */
const WEIGHTS: Record<number, Partial<Record<NodeKind, number>>> = {
  0: { wild: 9, trainer: 2 },
  1: { wild: 7, trainer: 3 },
  2: { wild: 5, trainer: 4 },
  3: { wild: 4, trainer: 5 },
  4: { wild: 4, trainer: 5 },
  5: { wild: 3, trainer: 6 },
  6: { wild: 3, trainer: 6 },
};
/** The lanes lean back toward Wild: a lane is where you recruit for the Gym at the end of it. */
const LANE_WEIGHTS: Partial<Record<NodeKind, number>> = { wild: 5, trainer: 5 };

/**
 * §2.5.1 — the two rolled special nodes, and the reason they are percentages rather than guarantees.
 *
 * The Elite Trainer at L7 is the *landmark*: guaranteed on the map, sitting between two ordinary fights, and
 * the thing you level for. These two are the opposite — they are why two runs on the same route feel
 * different. An extra Elite Trainer in a lane is a spike you route around or level into; an Elite Wild is the
 * catch-or-kill dilemma (§2.8.2), at most one per Region, and genuinely not on every map.
 */
const EXTRA_ELITE_TRAINER_CHANCE = 0.22;
const ELITE_WILD_CHANCE = 0.45;

function pickWeighted<T>(rng: GameRng, entries: { value: T; weight: number }[]): T {
  const total = entries.reduce((n, e) => n + e.weight, 0);
  let roll = rng.range01() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1]!.value;
}

function pickOne<T>(rng: GameRng, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rng.range01() * list.length))]!;
}

export function biomeFor(rng: GameRng): BiomeId {
  return pickWeighted(rng, REGION1_BIOME_WEIGHTS.map((b) => ({ value: b.biome, weight: b.weight })));
}

/**
 * §5.9.2 — draw **two distinct** Gym types for this Region, and assign one to each lane. Nine of the twelve
 * Gym types are missed by any one run, which is what makes a three-Badge combination worth talking about.
 */
export function drawGymPair(rng: GameRng, onePath = false, exclude: readonly string[] = []): [GymDef, GymDef] {
  // §2.1 placeholder (v0.7.1) — Regions 2 and 3 draw from Region 1's pool until their own Gyms exist, so a Gym
  // whose Badge the run already holds is left out: nobody fights Brock twice. Only if that would leave fewer
  // than two does the full pool come back.
  const fresh = GYMS.filter((g) => !exclude.includes(g.id));
  const pool = fresh.length >= 2 ? [...fresh] : fresh.length === 1 && onePath ? [...fresh] : [...GYMS];
  const a = pool.splice(Math.floor(rng.range01() * pool.length), 1)[0]!;
  const b = pool[Math.min(pool.length - 1, Math.floor(rng.range01() * pool.length))]!;
  // §8.8.2 One Path — both lanes lead to the same Gym, so the fork offers a route and never a counter-pick.
  // The second draw still happens, so a seed's map is otherwise the same with the modifier on or off.
  return [a, onePath ? a : b];
}

/**
 * §2.6.2 — a Wild node shows its three species before you commit.
 *
 * `theme` is the lane's, once the trunk has forked: the biome is the Gym's biome and its favoured species are
 * weighted up inside it. The lane's `counter` — the one species that answers its own Gym — is seeded into the
 * Uncommon slot at a fixed rate, so a lane is a commitment and never a dead end.
 */
function wildPreview(rng: GameRng, content: ContentRegistry, layer: number, lane: GymDef | null): { preview: NodePreview; biome: BiomeId } {
  const theme = lane ? LANE_THEME[lane.type] : undefined;
  const biome = theme ? theme.biome : biomeFor(rng);
  const pool = BIOMES[biome];

  // Inside the biome, the lane's favoured species are three times as likely to fill a Common slot.
  const weighted = pool.common.map((id) => ({ value: id, weight: theme?.favours.includes(id) ? 3 : 1 }));
  const drawn: string[] = [];
  for (let i = 0; i < 2 && weighted.length; i++) {
    const id = pickWeighted(rng, weighted.filter((w) => !drawn.includes(w.value)));
    drawn.push(id);
  }

  // The third slot: the lane's counter a third of the time, a Rare a tenth of the time, otherwise Uncommon.
  const roll = rng.range01();
  const third = theme && roll < 0.33 ? theme.counter : roll < 0.43 ? pickOne(rng, pool.rare) : pickOne(rng, pool.uncommon);

  const speciesIds = [...new Set([...drawn, third])];
  return {
    biome,
    preview: {
      title: `Wild — ${pool.name}`,
      detail: speciesIds.map((id) => content.species(id).name).join(' · '),
      speciesIds,
      levelBand: wildBandFor(layer),
      icon: `wild-${biome}`,
    },
  };
}

/** A trainer node. In a lane, the archetype is the Gym's; in the trunk, anything Region 1 fields. */
function trainerPreview(rng: GameRng, content: ContentRegistry, used: Set<string>, layer: number, lane: GymDef | null): NodePreview {
  const themed = lane ? LANE_THEME[lane.type]!.trainers.flatMap(rostersOf) : TRAINERS;
  const unused = themed.filter((t) => !used.has(t.id));
  // A lane has only two rosters of its archetype, so a long lane will repeat one; that is better than a
  // Swimmer lane with a Hiker in the middle of it, which would break the telegraph the lane exists to give.
  const roster: TrainerRoster = pickOne(rng, unused.length ? unused : themed.length ? themed : TRAINERS);
  used.add(roster.id);

  const team = trainerTeamFor(roster, layer);
  const levels = team.map((m) => m.level);
  return {
    title: roster.name,
    icon: `trainer-${roster.archetype}`,
    detail: team.map((m) => `${content.species(m.species).name} L${m.level}`).join(' · '),
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** §2.9.1 — the field nurse. */
const AID_PREVIEW: NodePreview = {
  title: 'Field nurse',
  detail: `${AID_HEAL_PCT} % of max HP back for everyone in the Box, fainted or not, and every status cured. Free. Trauma stays — only a Pokémon Center's Therapy takes it off.`,
  speciesIds: [],
  levelBand: [0, 0],
};

/** §2.9.2 — the travelling merchant. */
const MERCHANT_PREVIEW: NodePreview = {
  title: 'Travelling merchant',
  detail: 'A cart with the basics: a couple of cures, Poké Balls, and one thing worth a look. One re-roll.',
  speciesIds: [],
  levelBand: [0, 0],
};

const MYSTERY_PREVIEW: NodePreview = {
  title: 'Something off the path',
  detail: 'A choice with its outcome stated up front — unless it is a gamble, and then it says that too.',
  speciesIds: [],
  levelBand: [0, 0],
};

/** §2.8.1 — the Elite Trainer: two Pokémon, both two-phase, a guaranteed relic. */
function elitePreview(content: ContentRegistry, layer: number): NodePreview {
  const team = eliteTeamFor(layer);
  const levels = team.map((m) => m.level);
  return {
    title: ELITE.name,
    icon: 'elite',
    detail: `${team.map((m) => `${content.species(m.species).name} L${m.level}`).join(' · ')} · reward: a relic`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** §2.8.2 — the Elite Wild: a boss-tier catchable. Catch it or beat it, never both. */
function eliteWildPreview(content: ContentRegistry, layer: number): NodePreview {
  const team = eliteWildTeamFor(layer);
  const levels = team.map((m) => m.level);
  return {
    title: `Wild ${content.species(team[0]!.species).name}`,
    icon: 'elite-wild',
    detail: `${content.species(team[0]!.species).name} L${team[0]!.level} · catch it for the recruit, or beat it for a relic`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team,
  };
}

/** "water" is a type id; "Water Gym" is what a player reads. */
const typeName = (t: string) => t[0]!.toUpperCase() + t.slice(1);

function gymPreview(content: ContentRegistry, gym: GymDef): NodePreview {
  const team = gymTeamFor(gym);
  const levels = team.map((m) => m.level);
  return {
    title: `${gym.name} — ${typeName(gym.type)} Gym`,
    icon: `gym-${gym.type}`,
    detail: `${team.map((m) => `${content.species(m.species).name} L${m.level}`).join(' · ')} · ${gym.telegraph}`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...levels), Math.max(...levels)],
    enemies: team.map((m) => ({ species: m.species, level: m.level })),
  };
}

/**
 * A rolled fight, weighted by layer.
 *
 * §2.5's "no two adjacent nodes share a type" was the rule here until v0.5, and it turned out to *override*
 * the weighting rather than season it: at layer 0's 9:2 Wild bias it fired on almost every roll and dragged
 * the opening down to a 52 % Wild share against a weighting that asked for 80 %. A row of four cannot be
 * both mostly-one-kind and never-twice-in-a-row; those are contradictory instructions.
 *
 * So the rule is now **no three in a row**. It still breaks up a wall of identical badges, which is what it
 * was for, and it leaves a deliberate weighting alone.
 */
function rolled(rng: GameRng, weights: Partial<Record<NodeKind, number>>, row: readonly MapNode[]): NodeKind {
  const kind = pickWeighted(rng, Object.entries(weights).map(([value, weight]) => ({ value: value as NodeKind, weight: weight! })));
  const [a, b] = [row[row.length - 1], row[row.length - 2]];
  if (a && b && a.kind === kind && b.kind === kind) return kind === 'wild' ? 'trainer' : 'wild';
  return kind;
}

/**
 * §2.1 placeholder — a preview moved up the level ladder, its Pokémon evolved to the forms those levels warrant
 * (`evolvedAt`). Every species and level a fight uses is read off its preview (the wild band and pool, the
 * trainer, Elite and Gym rosters), so shifting the preview shifts the fight, and the map and the fight can
 * never disagree (Pillar 1). A service node has no levels to move.
 */
function shifted(preview: NodePreview, offset: number, content: ContentRegistry): NodePreview {
  if (!offset || (preview.levelBand[0] === 0 && preview.levelBand[1] === 0)) return preview;
  const levelBand: [number, number] = [preview.levelBand[0] + offset, preview.levelBand[1] + offset];
  const name = (id: string) => content.species(id).name;
  if (!preview.enemies) {
    // A wild pool: the band's floor decides the form, so every level the node can roll shows the species named.
    const speciesIds = [...new Set(preview.speciesIds.map((id) => evolvedAt(id, levelBand[0], content)))];
    return { ...preview, levelBand, speciesIds, detail: speciesIds.map(name).join(' · ') };
  }
  let detail = preview.detail;
  let title = preview.title;
  const enemies = preview.enemies.map((e) => {
    const level = e.level + offset;
    const species = evolvedAt(e.species, level, content);
    detail = detail.replace(`${name(e.species)} L${e.level}`, `${name(species)} L${level}`);
    if (title === `Wild ${name(e.species)}`) title = `Wild ${name(species)}`;
    return { ...e, species, level };
  });
  return { ...preview, title, levelBand, detail, enemies, speciesIds: enemies.map((e) => e.species) };
}

/** §2.5 — build a Region. Deterministic in `rng`, which the caller seeds from the run seed. */
export function generateRegion(rng: GameRng, content: ContentRegistry, regionIndex = 0, seed = 0, modifiers: readonly string[] = [], excludeGyms: readonly string[] = []): RegionMap {
  const nodes: Record<string, MapNode> = {};
  const byLayer: MapNode[][] = [];
  const usedTrainers = new Set<string>();

  // §5.9.2 — two distinct Gyms, drawn before anything else so every lane node can be themed by its own.
  // §8.8.2 One Path collapses them to one.
  const [gymA, gymB] = drawGymPair(rng, hasModifier(modifiers, 'one-path'), excludeGyms);
  // §2.1 placeholder — how far above Region 1 this Region's levels sit (REGION_LEVEL_OFFSET).
  const offset = REGION_LEVEL_OFFSET[regionIndex] ?? REGION_LEVEL_OFFSET[REGION_LEVEL_OFFSET.length - 1]!;
  const lanes: GymDef[] = [gymA, gymB];

  // §2.5.1 — the two rolled specials. Both are decided up front so the layer loop stays a pure placement.
  //
  // The extra Elite Trainer goes in a **lane**, not the trunk. A second Elite before the fork is a wall in a
  // corridor everyone walks; in a lane it is a reason to take the other one, which is the same difficulty
  // spent on a decision instead of a tax. It also has somewhere to go: the trunk's free layers are 0, 1 and
  // 4 once the merchant and the three Mysteries have claimed theirs, and the first two are far too early.
  const extraEliteLane = rng.range01() < EXTRA_ELITE_TRAINER_CHANCE ? Math.floor(rng.range01() * 2) : -1;
  const extraEliteLayer = FORK_LAYER + Math.floor(rng.range01() * 2);
  const eliteWildLayer = rng.range01() < ELITE_WILD_CHANCE ? FORK_LAYER + Math.floor(rng.range01() * 2) : -1;
  const eliteWildLane = Math.floor(rng.range01() * 2);
  /** §2.9.1 — one field nurse per lane, in the last two layers before its Gym. */
  const centreLayer = [FORK_LAYER + 1 + Math.floor(rng.range01() * 2), FORK_LAYER + 1 + Math.floor(rng.range01() * 2)];

  for (let layer = 0; layer < LAYERS; layer++) {
    const width = LAYER_WIDTH[layer]!;
    const row: MapNode[] = [];
    for (let col = 0; col < width; col++) {
      // Past the fork, a column belongs to a lane: the left half walks to Gym A, the right half to Gym B.
      const inLane = layer >= FORK_LAYER;
      const laneIndex = inLane ? (col < width / 2 ? 0 : 1) : -1;
      const lane = inLane ? lanes[laneIndex]! : null;
      const laneCol = inLane ? col % LANE_WIDTH : col;

      let kind: NodeKind;
      if (layer === GYM_LAYER) kind = 'gym';
      // §2.5's own diagram puts the Elite as the *middle of three* at L7, not the whole layer, and the
      // difference is the whole design of the node. As a wall it ended a third of the harness's runs and
      // was not a decision; beside two ordinary fights it is the trade it was meant to be — the hardest
      // fight before the Gym, for a guaranteed relic, and you may walk past it.
      else if (layer === ELITE_LAYER) kind = col === 1 ? 'elite' : rolled(rng, WEIGHTS[6]!, row);
      // §2.9.2 / §2.5.1 — a service takes the last column of its layer, so taking it is always a fork against
      // the fight beside it. The other columns roll normally: pinning them to one kind deletes fights from
      // every route, which is how v0.4's Dojo layer quietly cost two levels.
      else if (layer === MERCHANT_LAYER) kind = col === width - 1 ? 'merchant' : rolled(rng, WEIGHTS[layer]!, row);
      else if (MYSTERY_LAYERS.includes(layer)) kind = col === width - 1 ? 'mystery' : rolled(rng, WEIGHTS[layer]!, row);
      else if (inLane && layer === centreLayer[laneIndex] && laneCol === LANE_WIDTH - 1) kind = 'aid';
      else if (inLane && layer === eliteWildLayer && laneIndex === eliteWildLane && laneCol === 0) kind = 'elite-wild';
      // A lane holds at most one special, and the nurse wins the tie: a lane with an Elite Wild *and* an
      // extra Elite and no rest is not hard, it is unfinishable.
      else if (inLane && laneIndex === extraEliteLane && layer === extraEliteLayer && laneCol === 0 && layer !== eliteWildLayer) kind = 'elite';
      else kind = rolled(rng, inLane ? LANE_WEIGHTS : WEIGHTS[layer]!, row);

      const id = `n${layer}-${col}`;
      const preview = shifted(
        kind === 'wild' ? wildPreview(rng, content, layer, lane).preview
        : kind === 'trainer' ? trainerPreview(rng, content, usedTrainers, layer, lane)
        : kind === 'aid' ? AID_PREVIEW
        : kind === 'merchant' ? MERCHANT_PREVIEW
        : kind === 'mystery' ? MYSTERY_PREVIEW
        : kind === 'elite' ? elitePreview(content, layer)
        : kind === 'elite-wild' ? eliteWildPreview(content, layer)
        : gymPreview(content, layer === GYM_LAYER ? lanes[col]! : gymA),
        offset,
        content,
      );

      const node: MapNode = { id, layer, col, kind, next: [], preview };
      if (inLane || layer === GYM_LAYER) node.lane = layer === GYM_LAYER ? col : laneIndex;
      row.push(node);
      nodes[id] = node;
    }
    byLayer.push(row);
  }

  linkLayers(byLayer, rng);

  return {
    seed,
    regionIndex,
    layers: LAYERS,
    nodes,
    entry: byLayer[0]!.map((n) => n.id),
    gyms: [gymA.id, gymB.id],
    forkLayer: FORK_LAYER,
  };
}

/**
 * Edges. The requirement is "highly connected, but clear paths", and those pull in opposite directions: a
 * mesh where every node reaches every node has no routes in it at all, because nothing you pick closes
 * anything. What makes a lattice readable is a **locality rule** — a node links only to the columns
 * immediately around it, so a route is a line you can trace with a finger rather than a graph you have to
 * solve.
 *
 *   · 1–3 children, biased to 2, always within one column of the parent
 *   · at most 3 parents, so the tree stays branchy rather than converging to a funnel
 *   · nothing is unreachable, and nothing before the Gym is a dead end
 *   · **across the fork, an edge may not change lane.** The two lanes never rejoin, which is the entire
 *     reason the Gym choice is a choice.
 */
function linkLayers(byLayer: MapNode[][], rng: GameRng): void {
  const laneOf = (n: MapNode, width: number): number => (n.lane ?? (n.col < width / 2 ? 0 : 1));

  for (let layer = 0; layer < byLayer.length - 1; layer++) {
    const row = byLayer[layer]!;
    const nextRow = byLayer[layer + 1]!;
    const crossesFork = layer + 1 >= FORK_LAYER;

    for (const node of row) {
      // Where this node sits in the next row, proportionally — the anchor its children cluster around.
      const scaled = Math.round((node.col / Math.max(1, row.length - 1)) * (nextRow.length - 1));
      const anchor = Math.min(nextRow.length - 1, Math.max(0, Number.isFinite(scaled) ? scaled : 0));

      // Candidates: the anchor and its immediate neighbours, filtered to the same lane once lanes exist.
      const lane = layer >= FORK_LAYER ? laneOf(node, row.length) : -1;
      const candidates = [anchor - 1, anchor, anchor + 1]
        .map((c) => nextRow[c])
        .filter((n): n is MapNode => !!n)
        .filter((n) => lane < 0 || laneOf(n, nextRow.length) === lane);

      // Two children is the shape that reads best: one is a corridor, three is a mesh.
      const want = Math.min(
        candidates.length,
        candidates.length === 1 ? 1 : rng.range01() < 0.62 ? 2 : rng.range01() < 0.5 ? 1 : 3,
      );
      // §2.5 — "edges do not cross". A *contiguous* window of candidates is what guarantees that: picking
      // columns 2 and 4 out of {2,3,4} sends an edge over the top of whatever column 3 links to, and a
      // crossed edge is the one thing that makes a lattice unreadable. A random subset did exactly that.
      const from = Math.floor(rng.range01() * (candidates.length - want + 1));
      node.next = candidates.slice(from, from + want).map((n) => n.id).sort();
    }

    // Nothing in the next layer may be unreachable, or the route dead-ends. Attach each orphan to the
    // nearest legal parent — legal meaning "same lane", which is what keeps the fork a fork.
    for (const target of nextRow) {
      if (row.some((n) => n.next.includes(target.id))) continue;
      const lane = crossesFork ? laneOf(target, nextRow.length) : -1;
      const eligible = row.filter((n) => lane < 0 || layer < FORK_LAYER || laneOf(n, row.length) === lane);
      const from = (eligible.length ? eligible : row).reduce(
        (best, n) => (Math.abs(n.col - target.col) < Math.abs(best.col - target.col) ? n : best),
        (eligible.length ? eligible : row)[0]!,
      );
      from.next.push(target.id);
      from.next.sort();
    }

    // §2.5 — no more than three parents, so the tree branches instead of funnelling. Trim the longest
    // child list of any over-subscribed target, never leaving that parent childless.
    for (const target of nextRow) {
      let parents = row.filter((n) => n.next.includes(target.id));
      while (parents.length > 3) {
        const fattest = parents.filter((p) => p.next.length > 1).sort((a, b) => b.next.length - a.next.length)[0];
        if (!fattest) break;
        fattest.next = fattest.next.filter((id) => id !== target.id);
        parents = row.filter((n) => n.next.includes(target.id));
      }
    }
  }
}

export const nodesInLayer = (map: RegionMap, layer: number): MapNode[] =>
  Object.values(map.nodes).filter((n) => n.layer === layer).sort((a, b) => a.col - b.col);

/** Which Gym a node's lane leads to, or null in the shared trunk. */
export function laneGymOf(map: RegionMap, node: MapNode): GymDef | null {
  return node.lane === undefined ? null : gymById(map.gyms[node.lane]!);
}
