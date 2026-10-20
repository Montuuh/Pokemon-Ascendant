import type { ArenaRuleId } from '../combat/arenaRules';
import type { ContentRegistry, ScenarioDef } from '../content/defs';
import type { GameRng } from '../rng/gameRng';
import type { PartyMon, RunState } from './types';

// §2.3 / §2.12.2 — the Legendary Pokémon. Five of them, met two ways: the Apex on Victory Road, fought in its own
// arena (§2.12.2.1) and caught or beaten, and the Black Market's showcase, bought for three of yours (§2.11.6). In the
// Box a Legendary is one Pokémon like any other; in the Active Team it fills two of the three places with one body.

export const LEGENDARY_IDS = ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew'] as const;
export type LegendaryId = (typeof LEGENDARY_IDS)[number];

/** §2.3 — the Active Team's places, and what a Legendary takes of them. */
export const ACTIVE_TEAM = { places: 3, legendaryPlaces: 2 } as const;

export const isLegendarySpecies = (speciesId: string, content: ContentRegistry): boolean => content.species(speciesId).rarity === 'legendary';

/** §2.3 — the places one Pokémon takes in the Active Team: two for a Legendary, one for anyone else. */
export const placesOf = (speciesId: string, content: ContentRegistry): number =>
  isLegendarySpecies(speciesId, content) ? ACTIVE_TEAM.legendaryPlaces : 1;

/** §2.3 — the places a list of the Box's Pokémon takes. Unknown uids take none. */
export function placesTaken(uids: readonly string[], box: readonly PartyMon[], content: ContentRegistry): number {
  return uids.reduce((n, uid) => {
    const mon = box.find((m) => m.uid === uid);
    return n + (mon ? placesOf(mon.speciesId, content) : 0);
  }, 0);
}

/** §2.3 — is there room in the Active Team for this species, as it stands? */
export function hasPlaceFor(run: Pick<RunState, 'activeUids' | 'box'>, speciesId: string, content: ContentRegistry): boolean {
  return placesTaken(run.activeUids, run.box, content) + placesOf(speciesId, content) <= ACTIVE_TEAM.places;
}

/** §2.3 — an Active Team from a list in order: each one that still fits, until the places are full. */
export function fillTeam(candidates: readonly PartyMon[], content: ContentRegistry): string[] {
  const uids: string[] = [];
  let taken = 0;
  for (const m of candidates) {
    const p = placesOf(m.speciesId, content);
    if (taken + p > ACTIVE_TEAM.places) continue;
    uids.push(m.uid);
    taken += p;
  }
  return uids;
}

/**
 * §2.3 — the Active Team with one more joining: it comes in last, and whoever has stood there longest steps back
 * until the places fit — one for a Pokémon, two for a Legendary.
 */
export function joinTeam(uids: readonly string[], uid: string, box: readonly PartyMon[], content: ContentRegistry): string[] {
  const next = [...uids.filter((u) => u !== uid), uid];
  while (next.length > 1 && placesTaken(next, box, content) > ACTIVE_TEAM.places) next.shift();
  return next;
}

/**
 * §2.3 / §9.12 — a Box Pokémon put into a place of the formation (the Team screen): it takes that place, whoever stood
 * there going back to the Box, or the next free one; and, as `joinTeam`, whoever has stood there longest steps back
 * until the places fit — a Legendary taking two.
 */
export function placeInTeam(uids: readonly string[], uid: string, slot: number, box: readonly PartyMon[], content: ContentRegistry): string[] {
  const next = uids.filter((u) => u !== uid);
  if (slot < next.length) next[slot] = uid;
  else next.push(uid);
  while (next.length > 1 && placesTaken(next, box, content) > ACTIVE_TEAM.places) next.splice(next.findIndex((u) => u !== uid), 1);
  return next;
}

/** §2.12.2.1 — a Legendary's arena: the place, its backdrop, the field it opens under, its rule, and its kit there. */
export interface LegendaryArena {
  place: string;
  stage: string;
  fields: NonNullable<ScenarioDef['fields']>;
  /** Mew's Metronome: a Battlefield redrawn every turn instead of one that stands. */
  metronome?: true;
  rule: ArenaRuleId;
  moves: string[];
  line: string;
}

export const LEGENDARY_ARENAS: Record<LegendaryId, LegendaryArena> = {
  articuno: {
    place: 'Seafoam Islands',
    stage: 'ice-cave',
    fields: { weather: 'hail' },
    rule: 'mist',
    moves: ['blizzard', 'ice-beam', 'peck', 'agility'],
    line: 'The cold deepens. Something pale settles on the ice above you.',
  },
  zapdos: {
    place: 'the Power Plant',
    stage: 'power-plant',
    fields: { terrain: 'electric-terrain' },
    rule: 'thundercloud',
    moves: ['thunder', 'drill-peck', 'thunder-shock', 'agility'],
    line: 'The lights flicker and the air crackles. Zapdos lands among the generators.',
  },
  moltres: {
    place: 'Mt. Ember',
    stage: 'volcano',
    fields: { weather: 'sunny-day' },
    rule: 'rekindle',
    moves: ['fire-blast', 'flamethrower', 'sky-attack', 'agility'],
    line: 'The rock is hot underfoot. Wings of fire spread over the crater.',
  },
  mewtwo: {
    place: 'Cerulean Cave',
    stage: 'damp-cave',
    fields: { terrain: 'psychic-terrain' },
    rule: 'barrier',
    moves: ['psychic', 'swift', 'recover', 'barrier'],
    line: 'At the bottom of the cave, something is waiting. It already knows you are here.',
  },
  mew: {
    place: 'Faraway Island',
    stage: 'forest',
    fields: {},
    metronome: true,
    rule: 'playful',
    moves: ['psychic', 'mega-punch', 'transform', 'recover'],
    line: 'A small pink shape darts between the trees, laughing.',
  },
};

/** §2.12.2 — the Apex: one a run, in Victory Road's last column, at the Gauntlets' level and more, two phases. */
export const APEX = {
  column: 3,
  levelOver: 6,
  phaseCount: 2 as const,
};

/** §2.12.2 / §2.11.6 — the Legendaries a run can still meet: the five, less any line already in the Box. */
export function legendariesOpen(box: readonly PartyMon[]): LegendaryId[] {
  return LEGENDARY_IDS.filter((id) => !box.some((m) => m.speciesId === id));
}

/** §2.12.2 / §2.11.6 — draw one Legendary the run does not hold, or null when it holds all five. */
export function rollLegendary(rng: GameRng, box: readonly PartyMon[]): LegendaryId | null {
  const open = legendariesOpen(box);
  return open.length ? open[rng.range(0, open.length)]! : null;
}
