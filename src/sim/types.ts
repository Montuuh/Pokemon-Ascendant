// Core game vocabulary shared by every sim module.
// Per docs/design/04-resolution.md §4.1.2 — Gen I 15-type chart (Dark/Steel/Fairy intentionally absent;
// the Unity port carried an 18-value enum for serialisation reasons only — see docs/migration/from-unity.md).
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
] as const;
export type PokemonType = (typeof POKEMON_TYPES)[number];

// Per §4.1.1 — unified Attack/Defense (no Physical/Special split); Speed is kept for tie-breaks only.
export type Stat = 'attack' | 'defense' | 'speed';

// Per §4.2 — one primary status at a time; Confusion is the only secondary status.
export const PRIMARY_STATUSES = ['burn', 'freeze', 'paralysis', 'poison', 'sleep'] as const;
export type PrimaryStatus = (typeof PRIMARY_STATUSES)[number];
export type StatusCondition = PrimaryStatus | 'confusion';

export type EvolutionStage = 'basic' | 'stage1' | 'stage2';

// Per §3.6 — move taxonomy: Role × Range + optional positional modifier.
export type MoveRole = 'offensive' | 'defensive' | 'utility';
export type MoveRange = 'melee' | 'ranged';
export type PositionalModifier = 'none' | 'step-forward' | 'step-backward';
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'legendary';

// Per §6.3.4 — evolution branch archetypes.
export type BranchArchetype = 'vanguard' | 'specialist' | 'support';

// Per §5.2 — intent kinds an enemy can telegraph. Intents target SLOTS, never Pokémon.
// `debuff` (stat-stage drop on the occupant) is the Unity-era extension of the §5.2 table;
// `incapacitated` is the telegraph for an enemy that is Asleep/Frozen and cannot act this turn.
export type IntentKind =
  | 'attack'
  | 'cleave'
  | 'backstrike'
  | 'buff'
  | 'debuff'
  | 'stall'
  | 'status'
  | 'unknown'
  | 'incapacitated';

// Per §3.3 — the three Active Team slots. Slots are positions; occupants change when the Lead swaps.
export const SLOT_IDS = ['lead', 'bench1', 'bench2'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

// Per §4.1.1 — simplified stat block.
export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}
