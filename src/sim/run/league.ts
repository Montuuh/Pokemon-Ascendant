import type { ContentRegistry, EnemySetup, ScenarioDef } from '../content/defs';
import type { PokemonType } from '../types';
import { ENEMY_KIT_SIZE, evolvedAt } from './region';
import { enemyKit } from '../combat/enemyKit';
import type { MapNode, NodePreview, RegionMap, RunState } from './types';
import { victoryRoadLevel } from './victoryRoad';
import { modifierValue } from './modifiers';

// §2.1.6 / §5.11 / §5.12 — the League: through the Summit's gate, five doors in a row and no map to walk — the Elite
// Four, then the Champion. Between doors a micro-rest gives everyone standing a share of their HP back; nothing else
// heals, and nothing is sold or recruited. Beating the Champion wins the run.

export const LEAGUE = {
  /** §2.1.6 — the micro-rest between doors: this share of Effective Max HP, to every Pokémon still standing. */
  microRest: 30,
  /** The map's own marker for the League: one past Victory Road. */
  regionIndex: 4,
  /** §5.12 — the Champion's last two take the field together, from the moment this many have fallen. */
  championPairFrom: 3,
  /**
   * §5.11 — the League's own Attack, on top of its tier (v0.9.92): its aces' combos and the Champion's last two acting
   * twice made it the hardest step (48 % given Region 3 against 59 %); ×0.9 hands that back.
   */
  attackMultiplier: 0.9,
} as const;

/** One League member: who, the type they are known by, where they fight, and their team as levels over the base. */
export interface LeagueMember {
  id: 'elite-four-1' | 'elite-four-2' | 'elite-four-3' | 'elite-four-4' | 'champion';
  name: string;
  title: 'Elite Four' | 'Champion';
  sprite: string;
  /** The type identity the Summit shows a door ahead, and the Home Field it fights on (§4.3.5). */
  type: PokemonType | null;
  /** §5.11 — field effects the run has not met at boss intensity: one Battlefield an Elite fights under. */
  battlefield?: NonNullable<ScenarioDef['fields']>;
  stage: string;
  line: string;
  /** Levels over the League's base (Region 3's last wild band); the ace last, three phases. */
  team: { species: string; over: number; phaseCount: 2 | 3; moves?: string[]; signature?: { move: string; response: string }; combo?: [string, string] }[];
  /** §5.2.2 — the moves the member teaches, filling the roles its scripted kits lack (six each). */
  repertoire?: readonly string[];
}

/**
 * §5.11 — the Elite Four, a step each: two Pokémon for the first two, three for the last two, the ace always three
 * phases; each fights on its own type's Home Field and one Battlefield. Lorelei leads a Gym here (§5.9), so Will
 * holds the Psychic seat. §5.12 — the Champion is the Rival, Blue: five Pokémon over several types, his ace the
 * starter that beats yours.
 */
export const LEAGUE_MEMBERS: readonly LeagueMember[] = [
  {
    id: 'elite-four-1', name: 'Bruno', title: 'Elite Four', sprite: 'bruno', type: 'fighting', battlefield: { hazard: 'sandstorm' }, stage: 'league-bruno',
    line: 'We will grind you down with our superior power! Hoo hah!',
    team: [{ species: 'steelix', over: 6, phaseCount: 2 }, { species: 'machamp', over: 7, phaseCount: 3, signature: { move: 'submission', response: 'Ghost immunity or a Fighting-resistant Lead; the move keeps its recoil.' }, combo: ['bulk-up', 'cross-chop'] }],
    repertoire: ['bulk-up', 'detect', 'revenge'],
  },
  {
    id: 'elite-four-2', name: 'Agatha', title: 'Elite Four', sprite: 'agatha', type: 'ghost', battlefield: { hazard: 'toxic-spikes' }, stage: 'league-agatha',
    line: 'Pokémon are for battling, child. I will show you how a real Trainer fights.',
    // §5.5.2 — the classic: Mean Look holds your Lead, then Perish Song starts the count.
    team: [{ species: 'arbok', over: 8, phaseCount: 2 }, { species: 'gengar', over: 10, phaseCount: 3, signature: { move: 'night-shade-plus', response: 'Normal immunity or a Ghost-resistant Lead; this is ordinary typed damage, not fixed damage.' }, combo: ['mean-look', 'perish-song'] }],
    repertoire: ['curse', 'hypnosis', 'dream-eater'],
  },
  {
    id: 'elite-four-3', name: 'Will', title: 'Elite Four', sprite: 'will', type: 'psychic', battlefield: { terrain: 'psychic-terrain' }, stage: 'league-will',
    line: 'I have trained all over the world to make my Psychic Pokémon powerful. I cannot lose now.',
    team: [{ species: 'jynx', over: 10, phaseCount: 2, combo: ['lovely-kiss', 'dream-eater'] }, { species: 'slowbro', over: 11, phaseCount: 2, combo: ['yawn', 'surf'] }, { species: 'alakazam', over: 13, phaseCount: 3, signature: { move: 'psychic', response: 'Dark immunity or Psychic/Steel resistance; keep its Attack drops in place.' }, combo: ['calm-mind', 'psychic'] }],
    repertoire: ['reflect', 'light-screen', 'disable'],
  },
  {
    id: 'elite-four-4', name: 'Lance', title: 'Elite Four', sprite: 'lance', type: 'dragon', battlefield: { weather: 'rain-dance' }, stage: 'league-lance',
    line: 'Dragons are mythical Pokémon. They are hard to catch and raise, but their power is superior.',
    team: [{ species: 'gyarados', over: 13, phaseCount: 2, combo: ['dragon-dance', 'waterfall'] }, { species: 'aerodactyl', over: 14, phaseCount: 2 }, { species: 'dragonite', over: 15, phaseCount: 3, signature: { move: 'fly', response: 'A Flying-resistant Lead or damage reduction; this Fly gives it no turn out of reach.' }, combo: ['dragon-dance', 'outrage'] }],
    repertoire: ['dragon-dance', 'roar', 'protect'],
  },
  {
    id: 'champion', name: 'Blue', title: 'Champion', sprite: 'blue', type: null, stage: 'league-champion',
    line: 'I hate to say it, but I was waiting for you. Now I get to beat you in front of everyone.',
    // The fifth is the counter-pick (`championAce`); the fourth is the support that stands beside it, buffing it.
    team: [
      { species: 'pidgeot', over: 14, phaseCount: 2 },
      { species: 'rhydon', over: 15, phaseCount: 2 },
      { species: 'arcanine', over: 15, phaseCount: 2 },
      // §5.5.2 — the support that stands beside the ace: its Helping Hand is up the turn it is declared.
      { species: 'exeggutor', over: 15, phaseCount: 2, moves: ['egg-bomb', 'psychic', 'helping-hand', 'amnesia'] },
      { species: 'venusaur', over: 18, phaseCount: 3 },
    ],
  },
];

/** §5.12 — the Champion's ace counter-picks the run's starter, as the Rival does (`catalogs/elites.md` §2). */
const COUNTER: Record<string, string> = {
  bulbasaur: 'charizard',
  charmander: 'blastoise',
  squirtle: 'venusaur',
  pikachu: 'venusaur',
  eevee: 'charizard',
  magikarp: 'venusaur',
};
export const championAce = (starter: string): string => COUNTER[starter] ?? 'charizard';

/** §5.8.3 — the counter-pick ace's signature, per starter it answers (`catalogs/elites.md` §8). */
export const CHAMPION_SIGNATURE: Record<string, { move: string; response: string }> = {
  venusaur: { move: 'petal-dance', response: 'Grass resistance; its own self-Confusion still follows.' },
  charizard: { move: 'flamethrower', response: 'Fire/Water/Rock resistance or damage reduction.' },
  blastoise: { move: 'surf', response: 'A Water-resistant team and Cleave protection; swapping only the Lead does not shield the bench.' },
};

/** §5.5.2 — the Champion's ace's combo, by the starter it counter-picks: its weather, then the move the weather feeds. */
export const CHAMPION_COMBO: Record<string, [string, string]> = {
  venusaur: ['sunny-day', 'solar-beam'],
  charizard: ['sunny-day', 'flamethrower'],
  blastoise: ['rain-dance', 'hydro-pump'],
};

/** The League's base level: Region 3's last wild band, as Victory Road's is. */
export const leagueBase = (): number => victoryRoadLevel(0);

/** One member's team as it stands for this run: levels from the base, forms walked to their level, the counter-pick. */
export function leagueTeam(member: LeagueMember, run: Pick<RunState, 'starter'>, content: ContentRegistry): (EnemySetup & { species: string; level: number })[] {
  const base = leagueBase();
  return member.team.map((m, i) => {
    const level = base + m.over;
    const ace = member.id === 'champion' && i === member.team.length - 1;
    const species = ace ? championAce(run.starter) : evolvedAt(m.species, level, content);
    const signature = ace ? CHAMPION_SIGNATURE[species] : m.signature;
    const combo = ace ? CHAMPION_COMBO[species] : m.combo;
    // §5.2.2 — six moves by role: the scripted ones first, the combo's, then the member's repertoire.
    const moves = enemyKit(content, species, level, ENEMY_KIT_SIZE.climax, member.repertoire ?? [], m.moves, combo);
    return { species, level, tier: 'boss' as const, phaseCount: m.phaseCount, moves, attackMultiplier: LEAGUE.attackMultiplier, ...(signature ? { signature: { ...signature } } : {}), ...(combo ? { combo: [...combo] as [string, string] } : {}) };
  });
}

/** §5.11 — a League door's preview: who, the type they are known by, and how many — the team itself hidden, as a Gym's. */
export function leaguePreview(member: LeagueMember, run: Pick<RunState, 'starter'>, content: ContentRegistry): NodePreview {
  const team = leagueTeam(member, run, content);
  return {
    title: member.name,
    detail: `A team of ${team.length} Pokémon`,
    speciesIds: team.map((m) => m.species),
    levelBand: [Math.min(...team.map((m) => m.level)), Math.max(...team.map((m) => m.level))],
    enemies: team.map((m) => ({ species: m.species, level: m.level })),
    icon: member.id,
    stage: member.stage,
    rosterId: member.id,
  };
}

export const leagueMemberOf = (node: Pick<MapNode, 'preview'>): LeagueMember | undefined => LEAGUE_MEMBERS.find((m) => m.id === node.preview.rosterId);

/** §2.1.6 — the League as a map of five doors in a row: one way on from each, the Champion last. */
export function generateLeague(run: Pick<RunState, 'starter' | 'seed'>, content: ContentRegistry): RegionMap {
  const nodes: Record<string, MapNode> = {};
  LEAGUE_MEMBERS.forEach((member, i) => {
    const id = `league-${i}`;
    nodes[id] = {
      id,
      layer: i,
      col: 0,
      row: 5,
      kind: 'league',
      next: i + 1 < LEAGUE_MEMBERS.length ? [`league-${i + 1}`] : [],
      preview: leaguePreview(member, run, content),
    };
  });
  return {
    seed: run.seed,
    regionIndex: LEAGUE.regionIndex,
    layers: LEAGUE_MEMBERS.length,
    rows: 11,
    nodes,
    entry: ['league-0'],
    gyms: [],
    forkLayer: LEAGUE_MEMBERS.length,
  };
}

/** §2.1.6 with §8.8 — the micro-rest's share of Max HP this run: Tight Schedule cuts it. */
export function microRestPct(modifiers: readonly string[]): number {
  return modifierValue(modifiers, 'tight-schedule', 'microRest', LEAGUE.microRest);
}
