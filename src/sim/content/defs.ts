import type {
  BranchArchetype,
  EvolutionStage,
  MoveRange,
  MoveRole,
  PokemonType,
  PositionalModifier,
  RarityTier,
  Stat,
  StatusCondition,
} from '../types';

// Content definitions as the SIM sees them. `src/content` parses JSON with Zod and hands the sim objects that
// satisfy these interfaces; the sim never imports Zod or JSON. Field names follow §10.3.2 where sensible.

/** §5.4 — how a damaging move picks its target(s). */
export type MoveTargeting = 'single' | 'cleave' | 'backstrike';

export type MoveEffect =
  /**
   * §4.2 — status rider; `chance` in [0,1]; applied to the target (or self when `self`).
   * `escalating` is Toxic: the DoT doubles each turn instead of sitting flat (§7.5).
   */
  | { kind: 'status'; status: StatusCondition; chance: number; self?: boolean; escalating?: boolean }
  /** §4.2.6 — stat stage change on self or foe. */
  | { kind: 'stage'; target: 'self' | 'foe' | 'bench'; stat: Stat; stages: number }
  /** Heal self by a fraction of EffectiveMaxHP; with `durationTurns` it becomes a regen (Aqua Ring). */
  | { kind: 'heal'; percentOfMaxHp: number; durationTurns?: number }
  /** Draw extra skill cards immediately (Tailwind). */
  | { kind: 'draw'; cards: number }
  // ── v0.4. Each one is a simulation change the v0.3 branch payloads were waiting on (§6.10).
  /** Flare Blitz, Brave Bird — the attacker takes a share of the damage it dealt. Rock Head cancels it. */
  | { kind: 'recoil'; percentOfDamage: number }
  /** Pin Missile — N deterministic hits of `power / N` each, so the printed power is the total. */
  | { kind: 'multi-hit'; hits: number }
  /** Fell Stinger — a stage change that only lands if this move fainted the target. */
  | { kind: 'on-kill-stage'; stat: Stat; stages: number }
  /**
   * Safeguard, Wide Guard, Aqua Fortress — a shield the whole Active Team carries for the rest of the combat.
   * `status` blocks the next status applied to any of them; `cleave` softens the next Cleave that lands.
   */
  | { kind: 'team-guard'; guard: 'status' | 'cleave'; percent?: number }
  /** Aromatherapy — clear every status on the Active Team. */
  | { kind: 'team-cure' };

export interface MoveDef {
  id: string;
  name: string;
  type: PokemonType;
  role: MoveRole;
  range: MoveRange;
  modifier: PositionalModifier;
  apCost: number;
  power: number;
  alwaysCrit?: boolean;
  /** Fissure — the target's Defence stages do not apply. A ground-splitter ignores a braced stance. */
  ignoresDefenseStages?: boolean;
  targeting?: MoveTargeting;
  /** §5.3 CooldownGate — turns an enemy must wait before re-using it (0 = none). */
  cooldown?: number;
  effects: MoveEffect[];
}

export interface StatBlock {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

/**
 * §6.3.5 — what one evolution branch does to a Pokémon. An archetype is not a different species: Ivysaur is
 * Ivysaur whichever branch you take. What differs is the payload — which pool entries are upgraded in place,
 * what is added, and which passive comes with it. That is why a Specialist Wartortle can become a Vanguard
 * Blastoise (§6.3.3): the choice is made fresh at every evolution.
 */
export interface EvolutionBranch {
  id: string;
  archetype: BranchArchetype;
  /** The identity line on the choice card. */
  label: string;
  description: string;
  /** The species this branch evolves into. Usually the same for every branch of a stage. */
  to: string;
  /** §6.3.5 — 1–2 in-place upgrades. If `from` sits in the active 4, `to` takes that slot (§6.7.3). */
  upgrades: { from: string; to: string }[];
  /** §6.3.5 — at most one addition; at the final evolution it is the archetype's signature move. */
  adds: string[];
  /** §6.5.1 — the passive this branch grants, when the pool's first entry is not the right one. */
  abilityId?: string;
}

export interface SpeciesDef {
  id: string;
  dex: number;
  name: string;
  types: PokemonType[];
  stage: EvolutionStage;
  baseStats: StatBlock;
  /** §6.2.3 — flat per-level growth of the line. */
  growth: StatBlock;
  /** §6.9 — ordered (level, move). Known moves are every entry at or below the current level. */
  learnset: { level: number; move: string }[];
  /** §6.5.1 — the species' ability pool; the first entry is granted at the first evolution. */
  availableAbilities: string[];
  /**
   * §6.8.3 — the line's hidden ability: the last of its three authored abilities, in the pool but locked
   * until the line reaches Bond rank 3. Set on the base form; the line inherits it. Absent when the third
   * ability is not authored yet (`hiddenAbilityPending` says which and when).
   */
  hiddenAbility?: string;
  hiddenAbilityPending?: string;
  /** §2.6.4.1 — the chance at ~0 HP with a Poké Ball. Absent: the rarity × stage default in `catch.ts`. */
  catchRate?: number;
  /** §6.4.3 — the Dojo's off-learnset list for *this stage*. Evolving changes the menu. */
  tutorMoves: string[];
  /** §6.2.4 — the level this species evolves at. Absent on a final form. */
  evolveLevel?: number;
  evolvesTo: string[];
  /** §6.3 — the archetypes on offer when this species evolves. Empty on a final form. */
  branches: EvolutionBranch[];
  rarity: RarityTier;
  archetype?: BranchArchetype;
}

/** §7.3.1 — drop weight, not meta tier. The two are orthogonal and conflating them is the easy mistake. */
export type RelicRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** §7.3.2 — the synergy axis a relic sits on. The City Shop's curation scores on these (§2.11.2.1). */
export type RelicCategory = 'lead' | 'card' | 'combat' | 'meta' | 'status';

/**
 * §7.7 — an item effect is a **named hook plus parameters**, never a script. That is what lets a designer add
 * a relic without touching the simulation, as long as its hook already exists; a new hook is a code change.
 */
export type ItemHook =
  /** A multiplier on damage the holder's side deals, narrowed by `type`, `belowHp` or `sharedType`. */
  | 'damage-dealt'
  /** A multiplier on damage the holder's side takes, narrowed by `cleaveOnly`, `leadOnly` or `firstHit`. */
  | 'damage-taken'
  /** A flat AP change on a card, narrowed by `range`, `minAp` or `firstEachTurn`. */
  | 'ap-cost'
  /** Extra skill cards, narrowed by `turn` or `onReshuffle`. */
  | 'draw'
  /** Max hand size. */
  | 'hand-size'
  /** Free manual swaps banked at combat start. */
  | 'free-swap'
  /** A replacement crit multiplier. */
  | 'crit-multiplier'
  /** Healing from consumables and cures; `flat` adds HP to a cure that heals nothing by itself. */
  | 'heal-bonus'
  /** A team-wide status shield, granted at combat start. */
  | 'status-shield'
  /** Stat stages when something happens: `on` is faint, lead-low or swap-count. */
  | 'reactive-stage'
  /** Once per combat, heal to `toPercent` when the holder drops below `belowPercent`. */
  | 'pinch-heal'
  /** Statuses the holder applies last longer. */
  | 'status-duration'
  /** Run-layer multipliers. */
  | 'xp-multiplier'
  | 'money-multiplier'
  | 'bench-xp-share'
  /** Wild nodes offer one more species to choose from. */
  | 'wild-choices'
  /** Riders resolve before damage, so a faint never eats one. */
  | 'rider-first'
  /** Keep `cards` in hand past the end-of-turn discard, if the condition held. */
  | 'retain-card'
  /** Bank AP for next turn when `on` happens: a reshuffle, or three moves from one Pokémon. */
  | 'banked-ap'
  /** Fires once, in the run layer, the moment the relic is picked up. */
  | 'on-acquire'
  // ── held-item-only hooks
  /** §6.5.4 — while the wearer leads, the bench gains a type boost. */
  | 'lead-aura'
  /** Leftovers — the wearer heals a fraction of its max HP each turn. */
  | 'turn-end-heal'
  /** Focus Sash — survive a lethal hit at 1 HP, once per combat. */
  | 'endure'
  /** Choice Band / Scarf — a large upside bought with a restriction on what the wearer may play. */
  | 'choice-lock'
  // ── v0.5 (§7.3.7), the Legendary tier
  /** Clear Mind — no enemy intent is ever hidden. The ability of the same name already does this per-team. */
  | 'reveal-intents'
  /** Battle Hardened — every Pokémon opens each combat behind a shield worth a share of its max HP. */
  | 'start-shield'
  // ── v0.5 (§2.11.3), the Region Modifier pool
  /** Swap Fuel — a manual swap heals the incoming Lead. */
  | 'swap-heal'
  /** Trauma Resistance — a softer per-stack MaxHP penalty (§8.2.1). Run layer. */
  | 'trauma-relief'
  /** Pocket Healer — the team heals a share of max HP on a won fight. Run layer. */
  | 'victory-heal'
  /** Bargain Hunter — Shop and Dojo prices scale. Run layer. */
  | 'price-multiplier'
  // ── v0.6 (§8.6.1), the Tier-3 Mastery lane
  /** Perfect Recall — once per combat, a short deck takes its discard back before the draw. */
  | 'recall-discard'
  /** Evolution Catalyst — once per run, an evolution threshold is met `levels` early. Run layer. */
  | 'early-evolution'
  /** Box Expander — `bonus` more Box slots for the run. Run layer. */
  | 'box-capacity'
  /** Master Ball Charm — once per run, a throw cannot miss. */
  | 'guaranteed-catch'
  /** Authored, but the system it needs does not exist yet. Inert, and the UI says so. */
  | 'none';

/** §7.3 — a relic: persistent, run-long, no draw cost, uncapped in the inventory. */
export interface RelicDef {
  id: string;
  name: string;
  rarity: RelicRarity;
  categories: RelicCategory[];
  description: string;
  hook: ItemHook;
  params?: Record<string, string | number | boolean>;
  /**
   * A relic's second clause, for the few that have one (§7.3.5 Sage's Tome, §7.3.7 Grandmaster's Tempo,
   * Living Legend, Unbreakable Will). The combat resolver flattens it into the same hook list as the first,
   * so no hook site knows the difference.
   */
  also?: { hook: ItemHook; params?: Record<string, string | number | boolean> };
  /** Set when the system the effect needs does not exist yet; shown in the UI rather than sold as working. */
  pending?: string;
  /**
   * §8.6.1 — the meta tier. Absent is Tier 1, always in the pool. Tier 2 is discovered by `discovery`, once,
   * across any runs; Tier 3 is bought with Tokens at the Pokémart. Tier is not rarity: it decides whether
   * the relic is in your pool at all, and `rarity` decides how often it drops once it is.
   */
  tier?: 2 | 3;
  /** Tier 2 — the run event that unlocks it, keyed by the account counter that tracks it. */
  discovery?: { counter: string; goal: number; text: string };
  /** §8.6.1 — also sold at the Pokémart, for the one relic that is reachable both ways (Reactor Core). */
  mastery?: boolean;
}

/**
 * §5.10 — a Badge. Won from a Gym, permanent from the moment it is awarded, and never removed.
 *
 * It carries a hook and params exactly like a relic because §7.3.6 puts them in the same sentence: relics,
 * held items, Badges and fields are independent terms in one formula. `HookSource` below is the shape the
 * combat sim actually consumes, and a Badge satisfies it.
 */
export interface BadgeDef {
  id: string;
  name: string;
  type: PokemonType;
  region: number;
  description: string;
  flavour: string;
  hook: ItemHook;
  params?: Record<string, string | number | boolean>;
}

/**
 * What the combat sim needs from anything that carries a §7.7 hook — a relic or a Badge. Keeping the
 * resolver on this instead of `RelicDef` is what lets Badges work without a second copy of every hook site.
 */
/**
 * §2.11.3 — a Region Modifier. One is active at a time, it lasts exactly one Region, and they never stack.
 * Relic-shaped for the same reason a Badge is: the effects are terms in the same formulas (§7.3.6).
 */
export interface RegionModifierDef {
  id: string;
  name: string;
  tier: 'strong' | 'medium' | 'niche';
  description: string;
  hook: ItemHook;
  params?: Record<string, string | number | boolean>;
  also?: { hook: ItemHook; params?: Record<string, string | number | boolean> };
  pending?: string;
}

export interface HookSource {
  id: string;
  hook: ItemHook;
  params?: Record<string, string | number | boolean>;
}

/** §7.4 — a Held Item: one slot per Pokémon, always on, wearer-only. */
export interface HeldItemDef {
  id: string;
  name: string;
  description: string;
  hook: ItemHook;
  params?: Record<string, string | number | boolean>;
  /** §6.5.4 / §7.4.3 — a Type Plate gives the bench an aura of this type while the wearer leads. */
  grantsLeadAura?: string;
  /** §7.4.6 — a signature item never enters a random pool. */
  speciesLock?: string;
  pending?: string;
}

/** §6.4.1 / §7.5 — a TM. Single use, applied from the Map View, never enters the combat pile. */
export interface TmDef {
  id: string;
  name: string;
  move: string;
  /** §6.4.1 — incompatible targets are greyed out, never hidden. */
  compatibleSpecies: string[];
  description: string;
}

export type AbilityHook =
  | 'none'
  | 'low-hp-type-boost'
  | 'range-boost'
  | 'lead-flat-reduction'
  | 'riders-always-apply'
  | 'reveal-intents'
  | 'sturdy'
  | 'turn-end-bench-heal'
  | 'start-stage'
  // ── v0.3 (§6.5.2). Each one is a simulation change, not just a content row.
  /** Guts — +30 % Attack while statused, and Burn's −25 % does not apply. */
  | 'while-statused'
  /** Poison Point, Effect Spore — a Melee attacker takes a rider back. */
  | 'on-damaged'
  /** Inner Focus, Vital Spirit, Immunity — one status cannot land. */
  | 'status-immunity'
  /** Intimidate, Steadfast — a stat stage moves the instant the wearer takes the Lead. */
  | 'on-enter-lead'
  /** Water Absorb, Volt Absorb — a type heals instead of hurting. */
  | 'type-absorb'
  /** Solid Rock — super-effective hits land softer. */
  | 'super-effective-reduction'
  // ── v0.4
  /** Rock Head — no self-damage from a recoil move. */
  | 'recoil-immunity'
  /** Moxie — a stat stage for taking something down. */
  | 'on-kill'
  /** Tangled Feet, Sand Veil — incoming damage softened under a condition. */
  | 'conditional-reduction'
  /** Run Down — the first manual swap each combat is free. */
  | 'swap-discount'
  // ── v0.6 (§8.5.2), the Eevee line
  /** Adaptability — a replacement STAB multiplier for the wearer. */
  | 'stab-multiplier'
  /** Speed Boost — `ap` extra AP at the start of turn `turn`. */
  | 'turn-start-ap';

export interface AbilityDef {
  id: string;
  name: string;
  description: string;
  hook: AbilityHook;
  params?: Record<string, string | number>;
}

export type ConsumableTarget = 'ally' | 'self-lead' | 'none' | 'enemy';

export type ConsumableEffect =
  /**
   * §7.2.2 — healing is a **flat number**, in the franchise's own values: 20 / 60 / 120. A Potion is *a
   * Potion*, and everyone who has played a Pokémon game already knows what that is worth against a health
   * bar. A percentage has to be computed, and it computes to a different number on every party member.
   *
   * The percentage version shipped for a day and was reversed. It was solving a real problem — a flat 20
   * thins out by Region 3 — but it solved it by making every tier unreadable, and the upgrade chain
   * (§7.2.6) solves the same problem the way the games do: 20 → 60 → 120 → full.
   */
  | { kind: 'heal-flat'; amount: number }
  /** Max Potion only. "Restore to full" is genuinely a fraction of Effective Max HP, so it is encoded as one. */
  | { kind: 'heal-percent'; percent: number }
  /** §2.4.3 Revive — the only in-combat revival. Brings a fainted ally back at this share of its Max HP. */
  | { kind: 'revive'; percent: number }
  | { kind: 'cure'; status: StatusCondition | 'all' }
  | { kind: 'ap'; amount: number }
  | { kind: 'stage'; stat: Stat; stages: number }
  /** §2.6.4 (CL-014) — deterministic catch gauge. */
  /** §2.6.4 — a ball: its multiplier on the catch chance (Poké Ball 1). */
  | { kind: 'catch'; ballMultiplier: number };

export interface ConsumableDef {
  id: string;
  name: string;
  apCost: number;
  tier: number;
  target: ConsumableTarget;
  effect: ConsumableEffect;
  description: string;
  upgradeTo?: string;
}

export type EncounterKind = 'wild' | 'trainer' | 'elite' | 'boss';
export type EnemyTier = 'wild' | 'trainer' | 'elite' | 'boss';

export interface TeamMemberSetup {
  species: string;
  level: number;
  hpPercent?: number;
  status?: StatusCondition;
  traumaStacks?: number;
  /** Override the active moves (§6.7); defaults to the level-derived kit (§6.9). */
  moves?: string[];
  /** Pin the passive (§6.5.1); defaults to the pool's first entry on an evolved form. */
  abilityId?: string;
  /** §7.4 — the one held-item slot. Locked with the Active Team on node entry. */
  heldItem?: string;
  /** §7.3.5 Champion's Crest — enemies this Pokémon has defeated so far this run. */
  defeats?: number;
  /**
   * §5.13.2 — the Mastery Move in the immutable fifth slot, if this line has unlocked one. It is dealt into
   * the deck beside the active four and no Move Manager, TM or tutor can reach it.
   */
  masteryMove?: string;
  /** §6.8.2 rank 5 (two-stage lines) — the Mastery card is dealt into the opening hand. */
  masteryOpener?: boolean;
}

export interface EnemySetup {
  species: string;
  level: number;
  tier: EnemyTier;
  /** §5.8.3 — 1 = ordinary, 2 = two-phase, 3 = ace. */
  phaseCount: 1 | 2 | 3;
  /** §8.8 Iron Will — scales Max HP before hpPercent is applied. 1 (the default) is the baseline enemy. */
  hpMultiplier?: number;
  hpPercent?: number;
  status?: StatusCondition;
  moves?: string[];
  abilityId?: string;
}

export interface ScenarioDef {
  id: string;
  name: string;
  description: string;
  kind: EncounterKind;
  stage: string;
  seed: number;
  trainer?: { name: string; sprite: string };
  player: {
    team: TeamMemberSetup[];
    leadIndex: number;
    consumables: string[];
    balls: number;
    /** §7.3 — the relics the run is carrying. Run-long, so the fight only reads them. */
    relics?: string[];
    /** §5.10 — the Badges the run has won. Same deal: permanent, and the fight only reads them. */
    badges?: string[];
    /** §2.11.3 — the Region Modifier in force, if any. One at a time, and it never leaves its Region. */
    regionModifier?: string;
    /** §5.13.1 Familiar — enemy species whose Unknown intents open revealed. */
    familiar?: string[];
    /** §8.4.2 Pokédex Insight — enemy species whose first intent this fight is shown free. */
    insight?: string[];
  };
  enemies: EnemySetup[];
  /**
   * §8.8 — the run's difficulty modifiers, carried into the fight. The ones that change a *number* are folded
   * into the enemy list and the BattleConfig before we get here; the ones that change a *rule* mid-fight
   * (Dense Fog, Faint Echo) need the list itself, so it travels with the scenario like everything else does.
   */
  modifiers?: string[];
}

/** Read-only content lookups the sim needs. Throws on unknown ids — content is validated at load. */
export interface ContentRegistry {
  move(id: string): MoveDef;
  species(id: string): SpeciesDef;
  ability(id: string): AbilityDef;
  consumable(id: string): ConsumableDef;
  scenario(id: string): ScenarioDef;
  tm(id: string): TmDef;
  relic(id: string): RelicDef;
  badge(id: string): BadgeDef;
  regionModifier(id: string): RegionModifierDef;
  heldItem(id: string): HeldItemDef;
  allRelics(): readonly RelicDef[];
  allBadges(): readonly BadgeDef[];
  allRegionModifiers(): readonly RegionModifierDef[];
  allConsumables(): readonly ConsumableDef[];
  allHeldItems(): readonly HeldItemDef[];
  /**
   * §6.9 — the whole evolution line's learnset for a species, base form first, ordered by level.
   * Evolving never forgets: a Charmeleon still knows what it learned as a Charmander.
   */
  lineLearnset(id: string): readonly { level: number; move: string }[];
  /** §6.8 / §5.13 — the base species of a line, which is what Mastery and the Pokédex are keyed on. */
  lineBase(id: string): string;
  allSpecies(): readonly SpeciesDef[];
  hasMove(id: string): boolean;
  /** §8.5.2 — a starter can be unlocked on the account before its kit ships; the picker checks here. */
  hasSpecies(id: string): boolean;
  /** §5.13.2 — a line's Mastery Moves by tier (index 0 = Lv1); null where that tier has no shipped move. */
  masteryMoves(lineId: string): readonly (string | null)[];
  /** §6.3 — a branch by id, from whichever species offers it. */
  branch(id: string): EvolutionBranch;
  /** §6.4.1 — every TM in the catalogue, for the Move Manager's teach list. */
  allTms(): readonly TmDef[];
}
