import { z } from 'zod';
import { POKEMON_TYPES, PRIMARY_STATUSES } from '@/sim/types';

// Zod schemas = the master content schema (§10.3.2 lineage). Everything under src/content/data is parsed
// through these at load time and in `npm test`. The inferred types are checked against the sim's
// ContentRegistry interfaces in registry.ts so a drift fails the typecheck, not a playtest.

export const PokemonTypeSchema = z.enum(POKEMON_TYPES);
export const StatusSchema = z.enum([...PRIMARY_STATUSES, 'confusion']);
export const StatSchema = z.enum(['attack', 'defense', 'speed']);
const KebabId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'kebab-case id');

export const MoveEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('status'), status: StatusSchema, chance: z.number().min(0).max(1), self: z.boolean().optional(), escalating: z.boolean().optional() }),
  z.object({ kind: z.literal('stage'), target: z.enum(['self', 'foe', 'bench']), stat: StatSchema, stages: z.number().int().min(-6).max(6) }),
  z.object({ kind: z.literal('heal'), percentOfMaxHp: z.number().positive().max(1), durationTurns: z.number().int().positive().optional() }),
  z.object({ kind: z.literal('draw'), cards: z.number().int().positive() }),
  z.object({ kind: z.literal('recoil'), percentOfDamage: z.number().positive().max(1) }),
  // §4.1.6 — the attacker recovers a share of the damage it dealt: recoil's mirror.
  z.object({ kind: z.literal('drain'), percentOfDamage: z.number().positive().max(1) }),
  z.object({ kind: z.literal('multi-hit'), hits: z.number().int().min(2).max(6) }),
  z.object({ kind: z.literal('on-kill-stage'), stat: StatSchema, stages: z.number().int().min(-6).max(6) }),
  z.object({ kind: z.literal('team-guard'), guard: z.enum(['status', 'cleave']), percent: z.number().int().min(1).max(99).optional() }),
  z.object({ kind: z.literal('team-cure') }),
]);

export const MoveSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  type: PokemonTypeSchema,
  role: z.enum(['offensive', 'defensive', 'utility']),
  range: z.enum(['melee', 'ranged']),
  modifier: z.enum(['none', 'step-forward', 'step-backward']),
  apCost: z.number().int().min(0).max(4),
  power: z.number().int().min(0),
  alwaysCrit: z.boolean().optional(),
  ignoresDefenseStages: z.boolean().optional(),
  targeting: z.enum(['single', 'cleave', 'backstrike']).optional(),
  cooldown: z.number().int().min(0).optional(),
  effects: z.array(MoveEffectSchema),
});

export const StatBlockSchema = z.object({
  hp: z.number().int().nonnegative(),
  attack: z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
});

/** §6.3.5 — one archetype's evolution payload: upgrade in place, add at most one, grant a passive. */
export const EvolutionBranchSchema = z.object({
  id: KebabId,
  archetype: z.enum(['vanguard', 'specialist', 'support']),
  label: z.string().min(1),
  description: z.string().min(1),
  to: KebabId,
  upgrades: z.array(z.object({ from: KebabId, to: KebabId })).max(2),
  adds: z.array(KebabId).max(1),
  abilityId: KebabId.optional(),
});

export const SpeciesSchema = z.object({
  id: KebabId,
  dex: z.number().int().positive(),
  name: z.string().min(1),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  stage: z.enum(['basic', 'stage1', 'stage2']),
  baseStats: StatBlockSchema,
  growth: StatBlockSchema,
  /** §6.9 — ordered (level, move); a Pokémon knows every entry at or below its level. */
  learnset: z.array(z.object({ level: z.number().int().min(1), move: KebabId })).min(1),
  /** §6.5.1 — the Dojo pool. The first entry is granted at the first evolution. */
  availableAbilities: z.array(KebabId),
  hiddenAbility: KebabId.optional(),
  hiddenAbilityPending: z.string().optional(),
  catchRate: z.number().min(0.01).max(1).optional(),
  /** §6.4.3 — this stage's off-learnset tutor list. */
  tutorMoves: z.array(KebabId).default([]),
  /** §6.2.4 — absent on a final form. */
  evolveLevel: z.number().int().min(2).optional(),
  evolvesTo: z.array(KebabId),
  /** §6.3.3 — 2 archetypes for most lines, 3 for the starters. Empty on a final form. */
  branches: z.array(EvolutionBranchSchema).default([]),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
  archetype: z.enum(['vanguard', 'specialist', 'support']).optional(),
});

/** §7.7 — the named-hook vocabulary shared by relics and held items. A new hook is a code change. */
export const ItemHookSchema = z.enum([
  'damage-dealt', 'damage-taken', 'ap-cost', 'draw', 'hand-size', 'free-swap', 'crit-multiplier', 'heal-bonus',
  'status-shield', 'reactive-stage', 'pinch-heal', 'status-duration', 'xp-multiplier', 'money-multiplier',
  'bench-xp-share', 'wild-choices', 'rider-first', 'retain-card', 'banked-ap', 'on-acquire',
  'lead-aura', 'turn-end-heal', 'endure', 'choice-lock',
  // v0.5 (§7.3.7) — the Legendary tier.
  'reveal-intents', 'start-shield',
  // v0.5 (§2.11.3) — the Region Modifier pool.
  'swap-heal', 'trauma-relief', 'victory-heal', 'price-multiplier',
  // v0.6 (§8.6.1) — the Tier-3 Mastery lane.
  'recall-discard', 'early-evolution', 'box-capacity', 'guaranteed-catch',
  // v0.7.4 (§5.10.3) — the Glacier Badge: a status on an enemy blunts its next attack.
  'status-chill',
  'none',
]);
const ItemParams = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

/** §7.3 — a relic row. */
export const RelicSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
  categories: z.array(z.enum(['lead', 'card', 'combat', 'meta', 'status'])).min(1),
  description: z.string().min(1),
  hook: ItemHookSchema,
  params: ItemParams.optional(),
  /**
   * A few relics do two things — §7.3.5's Sage's Tome ("hand size +2 **and** max AP +1") and three of
   * §7.3.7's Legendaries. This is the second clause, not a general effect list: the moment a relic needs a
   * third, the shape is wrong and it should become an array.
   */
  also: z.object({ hook: ItemHookSchema, params: ItemParams.optional() }).optional(),
  pending: z.string().optional(),
  // §8.6.1 — the meta tier and, for Tier 2, the run event that discovers it. Absent is Tier 1.
  tier: z.union([z.literal(2), z.literal(3)]).optional(),
  discovery: z.object({ counter: KebabId, goal: z.number().int().positive(), text: z.string().min(1) }).optional(),
  mastery: z.literal(true).optional(),
});

/** §5.13.2 — one line's Mastery Moves, base form first. A tier without a shipped move is `null`. */
export const MasteryLineSchema = z.tuple([KebabId.nullable(), KebabId.nullable(), KebabId.nullable()]);
export const MasteryFileSchema = z.object({ _note: z.string().optional(), lines: z.record(KebabId, MasteryLineSchema) });

/**
 * §5.10 — a Badge row.
 *
 * Deliberately the same `hook` + `params` shape as a relic. §7.3.6 lists Badges beside relics, held items and
 * fields as independent terms in the same formula, so they resolve through the same code path; what makes a
 * Badge a Badge is where it comes from (a Gym, permanently, §5.10) and that lives in the run layer.
 */
export const BadgeSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  type: PokemonTypeSchema,
  /** Which Region's Gym awards it (§5.10.1–§5.10.3). */
  region: z.number().int().min(1).max(3),
  description: z.string().min(1),
  flavour: z.string().min(1),
  hook: ItemHookSchema,
  params: ItemParams.optional(),
});

/** §7.4 — a held-item row. */
export const HeldItemSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  description: z.string().min(1),
  hook: ItemHookSchema,
  params: ItemParams.optional(),
  grantsLeadAura: PokemonTypeSchema.optional(),
  speciesLock: KebabId.optional(),
  pending: z.string().optional(),
});

/** §6.4.1 / §7.5 — a TM row. */
export const TmSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  move: KebabId,
  compatibleSpecies: z.array(KebabId).min(1),
  description: z.string().min(1),
});

export const AbilitySchema = z.object({
  id: KebabId,
  name: z.string(),
  category: z.string(),
  description: z.string(),
  hook: z.enum([
    'none', 'low-hp-type-boost', 'range-boost', 'lead-flat-reduction', 'riders-always-apply', 'reveal-intents',
    'sturdy', 'turn-end-bench-heal', 'start-stage',
    // v0.3 (§6.5.2)
    'while-statused', 'on-damaged', 'status-immunity', 'on-enter-lead', 'type-absorb', 'super-effective-reduction',
    // v0.4 (§7.4)
    'recoil-immunity', 'on-kill', 'conditional-reduction', 'swap-discount',
    // v0.6 (§8.5.2)
    'stab-multiplier', 'turn-start-ap',
  ]),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  pending: z.string().optional(),
  gdd: z.string().optional(),
});

export const ConsumableEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('heal-flat'), amount: z.number().int().positive() }),
  z.object({ kind: z.literal('heal-percent'), percent: z.number().int().min(1).max(100) }),
  z.object({ kind: z.literal('revive'), percent: z.number().int().min(1).max(100) }),
  z.object({ kind: z.literal('cure'), status: z.union([StatusSchema, z.literal('all')]) }),
  z.object({ kind: z.literal('ap'), amount: z.number().int().positive() }),
  z.object({ kind: z.literal('stage'), stat: StatSchema, stages: z.number().int().min(-6).max(6) }),
  z.object({ kind: z.literal('catch'), ballMultiplier: z.number().positive() }),
]);

export const ConsumableSchema = z.object({
  id: KebabId,
  name: z.string(),
  apCost: z.number().int().min(0).max(4),
  tier: z.number().int().positive(),
  target: z.enum(['ally', 'self-lead', 'none', 'enemy']),
  effect: ConsumableEffectSchema,
  description: z.string(),
  gdd: z.string().optional(),
  upgradeTo: KebabId.optional(),
});

const TeamMemberSetupSchema = z.object({
  species: KebabId,
  level: z.number().int().min(1).max(100),
  hpPercent: z.number().min(1).max(100).optional(),
  status: StatusSchema.optional(),
  traumaStacks: z.number().int().min(0).optional(),
  moves: z.array(KebabId).min(1).max(5).optional(),
  abilityId: KebabId.optional(),
  heldItem: KebabId.optional(),
});

const EnemySetupSchema = z.object({
  species: KebabId,
  level: z.number().int().min(1).max(100),
  tier: z.enum(['wild', 'trainer', 'elite', 'boss']),
  phaseCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  hpPercent: z.number().min(1).max(100).optional(),
  status: StatusSchema.optional(),
  moves: z.array(KebabId).min(1).max(5).optional(),
  abilityId: KebabId.optional(),
  veiled: z.boolean().optional(),
});

export const ScenarioSchema = z.object({
  id: KebabId,
  name: z.string(),
  description: z.string(),
  kind: z.enum(['wild', 'trainer', 'boss']),
  stage: z.string(),
  seed: z.number().int().nonnegative(),
  trainer: z.object({ name: z.string(), sprite: z.string() }).optional(),
  player: z.object({
    team: z.array(TeamMemberSetupSchema).min(1).max(3),
    leadIndex: z.number().int().min(0).max(2),
    consumables: z.array(KebabId),
    balls: z.number().int().min(0),
    relics: z.array(KebabId).optional(),
  }),
  enemies: z.array(EnemySetupSchema).min(1),
});

export const TmsFileSchema = z.object({ _note: z.string().optional(), tms: z.array(TmSchema) });

/** §6.3.2 / §7.2.5 — an Evolution Item: which lines it evolves, from what level, and (Eevee) into which branch. */
export const EvolutionItemSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  price: z.number().int().positive(),
  description: z.string().min(1),
  uses: z.array(z.object({ species: KebabId, fromLevel: z.number().int().positive(), branch: KebabId.optional() })).min(1),
});
export const EvolutionItemsFileSchema = z.object({ _note: z.string().optional(), items: z.array(EvolutionItemSchema) });
export const RelicsFileSchema = z.object({ _note: z.string().optional(), relics: z.array(RelicSchema) });
export const BadgesFileSchema = z.object({ _note: z.string().optional(), badges: z.array(BadgeSchema) });

/**
 * §2.11.3 — a Region Modifier row. Same hook vocabulary again, and the third system to use it after relics
 * and Badges: what distinguishes the three is scope and provenance, never how their effects are described.
 */
export const RegionModifierSchema = z.object({
  id: KebabId,
  name: z.string().min(1),
  /** §2.11.3.1 — Strong / Medium / Niche. It is the weighting axis, not a power claim. */
  tier: z.enum(['strong', 'medium', 'niche']),
  description: z.string().min(1),
  hook: ItemHookSchema,
  params: ItemParams.optional(),
  also: z.object({ hook: ItemHookSchema, params: ItemParams.optional() }).optional(),
  pending: z.string().optional(),
});
export const RegionModifiersFileSchema = z.object({ _note: z.string().optional(), modifiers: z.array(RegionModifierSchema) });
export const HeldItemsFileSchema = z.object({ _note: z.string().optional(), items: z.array(HeldItemSchema) });
export const MovesFileSchema = z.object({ _note: z.string().optional(), moves: z.array(MoveSchema) });
export const SpeciesFileSchema = z.object({ _note: z.string().optional(), species: z.array(SpeciesSchema) });
export const AbilitiesFileSchema = z.object({ _note: z.string().optional(), abilities: z.array(AbilitySchema) });
export const ConsumablesFileSchema = z.object({ _note: z.string().optional(), consumables: z.array(ConsumableSchema) });
export const ScenariosFileSchema = z.object({ _note: z.string().optional(), scenarios: z.array(ScenarioSchema) });
