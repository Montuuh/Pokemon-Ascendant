import type { ContentRegistry } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import { ROUTE_LAYERS, WILD_TIERS, evolvedAt, regionContent, wildBandFor, type WildTier } from './region';
import { ALL_GYMS } from './region';
import { APEX, LEGENDARY_ARENAS, rollLegendary, type LegendaryId } from './legendaries';
import type { MapNode, NodeKind, NodePreview, PartyMon, RegionMap, RunState } from './types';

// §2.12 — Victory Road: the last climb between the third Gym and the League. A small map of its own — four columns of
// three tracks, all converging on the Summit — with the hardest non-boss fights in the game, the Gauntlets, the
// Training Grounds, and no healing until the Summit. Region 3's tables, a few levels up; its own cave road.

export const VICTORY_ROAD = {
  /** The columns before the Summit, and the tracks across them (rows on the map's grid, top to bottom). */
  columns: 4,
  rows: [2, 5, 8] as const,
  /** A track crosses to its neighbour now and then, so the three paths are a choice and not three corridors. */
  crossingChance: 0.45,
  /** One or two Gauntlets, on different tracks, in the middle columns; one or two Training Grounds anywhere else. */
  gauntlets: [1, 2] as const,
  training: [1, 2] as const,
  /** The rest are Ace trainers, or the cave's wild Pokémon this often. */
  wildShare: 0.45,
  /** The cave's wild odds: Region 3's Uncommons as its Commons, its Rares as its Uncommons, a few of those as its Rares. */
  wildOdds: { common: 0.6, uncommon: 0.3, rare: 0.1 },
  wildRares: 3,
  /** A route fight here stands this many levels over Region 3's last wild band; a Gauntlet this many. */
  levelOver: 2,
  gauntletOver: 4,
  /** The map's own marker for its road: one past the three Regions (the painter's cave road). */
  regionIndex: 3,
  stage: 'victory-road',
  wildStage: 'victory-road-wild',
  /** §2.12.1 — a Gauntlet's Ace Trainer: four Pokémon, every one two-phase, two at a time. */
  gauntlet: { size: 4, phaseCount: 2 as const, onField: 2 as const, sprite: 'acetrainer', names: ['Naomi', 'Gwen', 'Vincent', 'Dakota', 'Rolando', 'Mira'] },
  /** §2.12.3 — what a Training Grounds' Stat Boost adds, for the rest of the run. */
  statBoost: { hp: 12, attack: 6, defense: 6, speed: 6 } as Record<'hp' | 'attack' | 'defense' | 'speed', number>,
} as const;

/** §2.12.3 — the five upgrades of a Training Grounds; one a node, and they do not combine. */
export const TRAINING_UPGRADES = ['stat', 'move-upgrade', 'level', 'evolve', 'move-replace'] as const;
export type TrainingUpgrade = (typeof TRAINING_UPGRADES)[number];

export const TRAINING_PREVIEW: NodePreview = {
  title: 'Training Grounds',
  detail: 'No fight. One Pokémon, one upgrade.',
  speciesIds: [],
  levelBand: [0, 0],
  icon: 'training',
  stage: VICTORY_ROAD.stage,
};

export const SUMMIT_PREVIEW: NodePreview = {
  title: 'The Summit',
  detail: 'Every Pokémon in the Box healed in full, and a Legendary relic to choose. Then the League.',
  speciesIds: [],
  levelBand: [0, 0],
  icon: 'summit',
};

/** The level a Victory Road fight stands at: Region 3's last wild band, raised. */
export function victoryRoadLevel(extra: number): number {
  const r3 = regionContent(2);
  return wildBandFor(ROUTE_LAYERS - 2, r3.wildBand)[1] + r3.levelOffset + extra;
}

/** §2.12 — Victory Road's map: four columns of three tracks, the Summit last. Deterministic in `rng`. */
export function generateVictoryRoad(rng: GameRng, content: ContentRegistry, seed: number, box: readonly PartyMon[] = []): RegionMap {
  const VR = VICTORY_ROAD;
  const tracks = VR.rows.length;
  const pick = <T,>(list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(rng.range01() * list.length))]!;
  const count = ([lo, hi]: readonly [number, number]) => lo + Math.floor(rng.range01() * (hi - lo + 1));

  // The Gauntlets in the middle columns on different tracks; the Training Grounds wherever is left.
  const kinds: NodeKind[][] = Array.from({ length: VR.columns }, () => Array<NodeKind>(tracks).fill('trainer'));
  const gauntletTracks = rng.shuffle([...Array(tracks).keys()]).slice(0, count(VR.gauntlets));
  for (const t of gauntletTracks) kinds[1 + Math.floor(rng.range01() * 2)]![t] = 'gauntlet';
  let training = count(VR.training);
  for (let guard = 0; training > 0 && guard < 40; guard++) {
    const c = Math.floor(rng.range01() * VR.columns);
    const t = Math.floor(rng.range01() * tracks);
    if (kinds[c]![t] !== 'trainer' || kinds[c]!.includes('training')) continue;
    kinds[c]![t] = 'training';
    training--;
  }
  // The rest: Ace trainers and the cave's wild Pokémon, about half and half.
  for (const col of kinds) for (let t = 0; t < tracks; t++) if (col[t] === 'trainer' && rng.range01() < VR.wildShare) col[t] = 'wild';
  // §2.12.2 — the Apex: one Legendary the Box does not hold, on one track of the last column — not on every path.
  const legendary = rollLegendary(rng, box);
  if (legendary) {
    const open = [...Array(tracks).keys()].filter((t) => kinds[APEX.column]![t] !== 'training');
    const t = open[rng.range(0, open.length)];
    if (t !== undefined) kinds[APEX.column]![t] = 'apex';
  }

  const nodes: Record<string, MapNode> = {};
  const id = (c: number, t: number) => `v${c}-${t}`;
  const summit = `v${VR.columns}-0`;
  for (let c = 0; c < VR.columns; c++) {
    for (let t = 0; t < tracks; t++) {
      const next = c + 1 < VR.columns ? [id(c + 1, t)] : [summit];
      // A crossing to a neighbouring track, never two from the same node.
      if (c + 1 < VR.columns && rng.range01() < VR.crossingChance) {
        const side = t === 0 ? 1 : t === tracks - 1 ? tracks - 2 : t + (rng.range01() < 0.5 ? -1 : 1);
        next.push(id(c + 1, side));
      }
      const kind = kinds[c]![t]!;
      nodes[id(c, t)] = { id: id(c, t), layer: c, col: t, row: VR.rows[t]!, kind, next: [...new Set(next)].sort(), preview: kind === 'apex' && legendary ? apexPreview(legendary, content) : previewFor(kind, rng, content, pick) };
    }
  }
  nodes[summit] = { id: summit, layer: VR.columns, col: 0, row: VR.rows[1]!, kind: 'summit', next: [], preview: { ...SUMMIT_PREVIEW } };

  return {
    seed,
    regionIndex: VR.regionIndex,
    layers: VR.columns + 1,
    rows: 11,
    nodes,
    entry: Array.from({ length: tracks }, (_, t) => id(0, t)),
    gyms: [],
    // No fork and no river: every track reaches the Summit.
    forkLayer: VR.columns + 1,
  };
}

/** §2.12.2 — the Apex's preview: the Legendary itself, where it waits, and the choice it is. */
export function apexPreview(legendary: LegendaryId, content: ContentRegistry): NodePreview {
  const arena = LEGENDARY_ARENAS[legendary];
  const level = victoryRoadLevel(APEX.levelOver);
  return {
    title: content.species(legendary).name,
    detail: arena.place,
    speciesIds: [legendary],
    levelBand: [level, level],
    enemies: [{ species: legendary, level }],
    icon: 'apex',
    stage: arena.stage,
    legendary,
  };
}

function previewFor(kind: NodeKind, rng: GameRng, content: ContentRegistry, pick: <T>(list: readonly T[]) => T): NodePreview {
  const r3 = regionContent(2);
  if (kind === 'training') return { ...TRAINING_PREVIEW };
  if (kind === 'wild') {
    // The cave's own Pokémon: Region 3's Uncommons and Rares, in their form at Victory Road's levels.
    const level = victoryRoadLevel(VICTORY_ROAD.levelOver);
    const pool: Record<WildTier, string[]> = { common: [], uncommon: [], rare: [] };
    for (const biome of Object.values(r3.biomes)) {
      if (!biome) continue;
      for (const id of biome.uncommon) if (!pool.common.includes(evolvedAt(id, level, content))) pool.common.push(evolvedAt(id, level, content));
      for (const id of biome.rare) if (!pool.uncommon.includes(evolvedAt(id, level, content))) pool.uncommon.push(evolvedAt(id, level, content));
    }
    pool.rare = pool.uncommon.splice(0, Math.min(VICTORY_ROAD.wildRares, Math.floor(pool.uncommon.length / 3)));
    // Each node its own order, so the map shows the cave's variety and not one face six times.
    pool.common = rng.shuffle(pool.common);
    const speciesIds = WILD_TIERS.flatMap((t) => pool[t]);
    return {
      title: 'Wild — Victory Road',
      detail: `${speciesIds.length} species`,
      speciesIds,
      wild: { pool, odds: { ...VICTORY_ROAD.wildOdds } },
      levelBand: [level, level + 1],
      icon: 'wild-cave',
      stage: VICTORY_ROAD.wildStage,
    };
  }
  if (kind === 'gauntlet') {
    // §2.12.1 — an Ace Trainer of Region 3's strongest: four of its trainers' Pokémon, every one two-phase.
    const level = victoryRoadLevel(VICTORY_ROAD.gauntletOver);
    const species = [...new Set(r3.trainers.flatMap((t) => t.team.map((m) => evolvedAt(m.species, level, content))))];
    const team: { species: string; level: number }[] = [];
    while (team.length < VICTORY_ROAD.gauntlet.size && species.length) {
      const i = Math.floor(rng.range01() * species.length);
      team.push({ species: species.splice(i, 1)[0]!, level: level + (team.length === VICTORY_ROAD.gauntlet.size - 1 ? 1 : 0) });
    }
    return {
      title: `Ace Trainer ${pick(VICTORY_ROAD.gauntlet.names)}`,
      detail: `A team of ${team.length} Pokémon · no healing before or after · a Rare relic pick`,
      speciesIds: team.map((m) => m.species),
      levelBand: [Math.min(...team.map((m) => m.level)), Math.max(...team.map((m) => m.level))],
      enemies: team,
      icon: 'gauntlet',
      stage: VICTORY_ROAD.stage,
    };
  }
  // An Ace trainer of the road: one of Region 3's rosters, its levels raised to Victory Road's.
  const roster = pick(r3.trainers);
  const level = victoryRoadLevel(VICTORY_ROAD.levelOver);
  const floor = Math.min(...roster.team.map((m) => m.level));
  const team = roster.team.map((m) => {
    const lv = level + (m.level - floor);
    return { species: evolvedAt(m.species, lv, content), level: lv };
  });
  return {
    title: roster.name,
    rosterId: roster.id,
    icon: `trainer-${roster.archetype}`,
    detail: `A team of ${team.length} Pokémon`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...team.map((m) => m.level)), Math.max(...team.map((m) => m.level))],
    enemies: team,
    stage: VICTORY_ROAD.stage,
  };
}

/**
 * §2.12.3 — what a Training Grounds can do for one Pokémon: the moves that have a stronger self (`-plus`), the moves
 * further up its learnset it has not learned, whether it has a level to gain, and whether it can evolve now.
 */
export function trainingOptions(mon: PartyMon, content: ContentRegistry, maxLevel: number): { upgradable: string[]; ahead: string[]; canLevel: boolean; canEvolve: boolean } {
  const upgradable = mon.moveIds.filter((id) => !id.endsWith('-plus') && content.hasMove(`${id}-plus`));
  const ahead = [...new Set(content.lineLearnset(mon.speciesId).filter((l) => l.level > mon.level && !mon.pool.includes(l.move)).map((l) => l.move))].filter((id) => content.hasMove(id));
  return { upgradable, ahead, canLevel: mon.level < maxLevel, canEvolve: content.species(mon.speciesId).branches.length > 0 };
}

/**
 * §2.12.6 — the Perfect Clear's Badge: one a run, beyond the Gyms' three — the Badge of a Gym the run was offered and
 * passed by, from the earliest Region with one. Null when there is none to give (or one was already given).
 */
export function perfectClearBadge(run: RunState): string | null {
  if (run.bonusBadge) return null;
  for (const pair of run.gymsOffered ?? []) {
    for (const gymId of pair) {
      const gym = ALL_GYMS.find((g) => g.id === gymId);
      if (gym && !run.badges.includes(gym.badgeId)) return gym.badgeId;
    }
  }
  return null;
}
