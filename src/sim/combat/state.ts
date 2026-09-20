import type { EncounterKind, EnemyTier } from '../content/defs';
import type { IntentKind, PokemonType, PrimaryStatus, SlotId, Stat, StatusCondition } from '../types';
import type { Effectiveness } from './typeChart';

// Plain, JSON-serialisable combat state. Everything the UI shows, the save writes and a replay compares is here.
// No classes, no functions, no references: `structuredClone`/`JSON` round-trips are identity.

export interface StatusInstance {
  kind: PrimaryStatus;
  /** Turn the status was applied (§4.2.1 G7 — application turn is telegraph only). */
  appliedTurn: number;
  /** Remaining turns for timed statuses; null = permanent until cured (Burn/Poison). */
  turnsLeft: number | null;
  /** §7.5 Toxic — the DoT doubles each tick instead of sitting flat. Counts ticks taken so far. */
  escalatingTicks?: number;
}

export interface Regen {
  percentOfMaxHp: number;
  turnsLeft: number;
}

export interface Combatant {
  uid: string;
  speciesId: string;
  name: string;
  types: PokemonType[];
  level: number;
  /** §8.2 — EffectiveMaxHP (Trauma-adjusted at setup). All caps/DoT use this. */
  maxHp: number;
  hp: number;
  /** Level-scaled base stats before stages/status (§6.2.3). */
  base: { attack: number; defense: number; speed: number };
  /** §4.2.6 — stat stages, ±6. */
  stages: Record<Stat, number>;
  status: StatusInstance | null;
  /** §4.2.3.1 — secondary status; 0 = not confused. */
  confusionTurns: number;
  confusionAppliedTurn: number;
  abilityIds: string[];
  /** §7.4 — the wearer's one held item, locked in with the Active Team. */
  heldItemId: string | null;
  /** §7.4 Focus Sash — one endure charge, re-armed at combat end. */
  endureAvailable: boolean;
  /**
   * §7.3.5 Champion's Crest — enemies this Pokémon has personally defeated, carried in from the run.
   * Zero in a fixture fight, which is right: there is no run behind it to have a record in.
   */
  defeats: number;
  /**
   * §7.3.7 Battle Hardened — damage absorbed before HP, granted at combat start and never regenerated.
   * A separate pool rather than extra max HP, so a heal cannot quietly top it back up.
   */
  shield: number;
  /** §6.6 / §5.8.3 — Sturdy charge left this combat. */
  sturdyAvailable: boolean;
  /** The 4 active moves (§6.7). Player: deck ownership. Enemy: intent pool. */
  moveIds: string[];
  traumaStacks: number;
  regen: Regen | null;
}

export interface EnemyCombatant extends Combatant {
  tier: EnemyTier;
  /** §5.8.3 — 1 ordinary, 2 two-phase, 3 ace. */
  phaseCount: 1 | 2 | 3;
  /** Current phase derived at the last Intent phase (kept for UI + one-shot transitions). */
  phase: 1 | 2 | 3;
  /** One-shot phase-entry effects already applied (§5.9.4 Entrenchment, §5.8.3 P3 cooldown reset). */
  enteredPhase2: boolean;
  enteredPhase3: boolean;
  intent: Intent | null;
  /** §5.3 CooldownGate — moveId → turns remaining. */
  cooldowns: Record<string, number>;
  /** §5.5 (CL-011) — once the enemy has fired any move, its intents are Witnessed. */
  witnessed: boolean;
}

export interface Intent {
  kind: IntentKind;
  moveId: string | null;
  /** Slot the intent is locked to (null for cleave/buff/stall/incapacitated). */
  targetSlot: SlotId | null;
  /** §5.5 — hidden intents render as ❓ until witnessed. */
  hidden: boolean;
}

export interface SkillCard {
  id: string;
  moveId: string;
  ownerUid: string;
  /**
   * §8.8 Faint Echo — the turn after which this dead card finally leaves the discard pile. Undefined on
   * every card in every other run; a card with it set is inert and only there to pad the reshuffle.
   */
  echoUntilTurn?: number;
}

export interface ConsumableCard {
  id: string;
  consumableId: string;
}

export type Phase = 'draw' | 'intent' | 'action' | 'resolution' | 'ended';
export type Outcome = 'in-progress' | 'victory' | 'defeat' | 'caught';

export interface PlayerState {
  team: Combatant[];
  leadIndex: number;
  ap: number;
  /** §3.3.1 — manual swaps this turn (1/2/3 AP ladder). */
  swapCounter: number;
  /** §3.3.1 — a manual swap arms a −1 AP discount for the first Defensive card that follows. */
  defensiveDiscount: boolean;
  deck: SkillCard[];
  discard: SkillCard[];
  hand: SkillCard[];
  consumables: { pool: ConsumableCard[]; hand: ConsumableCard[]; used: ConsumableCard[] };
  /** §2.6.4 — Poké Balls left in the run inventory (each throw costs one). */
  balls: number;
  /** §4.1.3 — stackable crit chance from consumables/passives (0 at slice launch). */
  critChance: number;
  /** §3.3.5 — the Lead fainted; a replacement must be picked before play continues. */
  pendingLeadPick: boolean;
  /**
   * §7.4 / Safeguard, Wide Guard — team-wide shields that last the combat and are spent on use. A `status`
   * charge eats the next condition applied to anyone on the team; a `cleave` charge softens the next Cleave.
   * Kept on the player rather than per-Pokémon because that is what "team-wide" means, and because a shield
   * the Lead bought should still be there after it swaps out.
   */
  guards: { status: number; cleave: { charges: number; percent: number } };
  /**
   * §6.5.2 Run Down, and the relics that do the same thing — manual swaps that cost nothing, spent before the
   * 1/2/3 ladder. Counted at combat start rather than resolved per-swap so the number is in the state the UI
   * reads and the save writes, instead of being re-derived from abilities in three places.
   */
  freeSwaps: number;
  /** §7.3 — the run's relics, read-only inside a fight. */
  relics: string[];
  /** §5.10 — the run's Badges, read-only inside a fight. Resolved through the same hooks as relics (§7.3.6). */
  badges: string[];
  /** §2.11.3 — the Region Modifier in force. Same hooks again; one at a time, so one id. */
  regionModifier: string | null;
  /** Per-turn bookkeeping the card-economy relics need: what was played, and in what order. */
  playedThisTurn: { ownerUid: string; moveId: string; apCost: number }[];
  /** §7.3 — AP banked by a relic for the next turn (Cycle Cell, Move Echo). */
  bankedAp: number;
  /** Set when the deck reshuffled this turn, so a reshuffle relic can pay out next turn. */
  reshuffled: boolean;
  /** Relic charges spent once per combat: pinch-heal, first-hit reduction, lead-low. */
  spent: string[];
  /** §8.8 Faint Echo — true while the discard pile is holding dead cards, so the sweep can skip otherwise. */
  echoing: boolean;
  /**
   * §8.7 — running tallies the achievements read at combat end. `swapCounter` resets every turn and the
   * damage tally has nowhere else to live, so both are kept here rather than reconstructed from the event
   * log, which is a display artefact and not a record.
   */
  totalManualSwaps: number;
  totalDamageTaken: number;
  /**
   * §5.10.1 Hive Badge — cards promised to next turn's hand.
   *
   * A copy is queued rather than dealt because the Badge pays out *when the deck cycles*, which happens
   * mid-draw, and a card pushed into a hand that is still being drawn would be drawn over.
   */
  queuedCards: { moveId: string; ownerUid: string }[];
}

export type LogCategory = 'player' | 'enemy' | 'turn' | 'system';
export interface LogEntry {
  turn: number;
  category: LogCategory;
  text: string;
}

export type CombatEvent = { seq: number; turn: number } & (
  | { t: 'combat-start' }
  | { t: 'turn-start'; ap: number }
  | { t: 'draw'; cardIds: string[]; consumableIds: string[] }
  | { t: 'confusion-discard'; uid: string; cardId: string }
  | { t: 'intent'; enemyUid: string; intent: Intent }
  | { t: 'card-played'; cardId: string; moveId: string; ownerUid: string; targetUid: string | null; apCost: number }
  | { t: 'consumable-used'; consumableId: string; targetUid: string | null; apCost: number }
  | { t: 'enemy-action'; enemyUid: string; intent: Intent; fizzled: boolean }
  | { t: 'attack'; sourceUid: string; targetUid: string; moveId: string }
  | { t: 'damage'; sourceUid: string | null; targetUid: string; amount: number; crit: boolean; effectiveness: Effectiveness; hpAfter: number; cause: 'move' | 'burn' | 'poison' }
  | { t: 'heal'; targetUid: string; amount: number; hpAfter: number; cause: 'move' | 'consumable' | 'regen' | 'ability' }
  | { t: 'status-applied'; targetUid: string; status: StatusCondition }
  | { t: 'status-immune'; targetUid: string; status: StatusCondition }
  | { t: 'status-cleared'; targetUid: string; status: StatusCondition; cause: 'expired' | 'cured' }
  | { t: 'stage'; targetUid: string; stat: Stat; delta: number; total: number }
  | { t: 'swap'; fromIndex: number; toIndex: number; kind: 'manual' | 'step-forward' | 'step-backward' | 'replacement'; apCost: number }
  | { t: 'sturdy'; uid: string }
  | { t: 'faint'; uid: string; side: 'player' | 'enemy' }
  | { t: 'enemy-enter'; enemyUid: string }
  | { t: 'phase'; enemyUid: string; phase: 1 | 2 | 3 }
  | { t: 'catch'; success: boolean; gauge: number; ballsLeft: number }
  | { t: 'lead-pick-required' }
  | { t: 'outcome'; outcome: Outcome }
);

export interface CombatState {
  scenarioId: string;
  kind: EncounterKind;
  /** §8.8 — the run's difficulty modifiers. Only the two that change a mid-fight rule read this. */
  modifiers: string[];
  stage: string;
  trainer: { name: string; sprite: string } | null;
  seed: number;
  /** Live xorshift32 cursor of the CombatRNG stream (§10.7 / §10.8.6). The reducer is pure over this. */
  rngCursor: number;
  turn: number;
  phase: Phase;
  player: PlayerState;
  /** Active enemies (v0.1: exactly one while in progress). */
  enemies: EnemyCombatant[];
  /** §5.9.3 — enemies still to come, fought sequentially. */
  enemyQueue: EnemyCombatant[];
  /** Fainted/caught enemies, for the summary. */
  defeatedEnemies: EnemyCombatant[];
  outcome: Outcome;
  events: CombatEvent[];
  log: LogEntry[];
  nextSeq: number;
  nextCardSerial: number;
}

// ---- Player actions = the input log (§10.7.4 replay) ---------------------------------------------------

export type CombatAction =
  | { type: 'play-card'; cardId: string; stepBackTo?: number }
  | { type: 'use-consumable'; cardId: string; targetIndex?: number }
  | { type: 'swap'; benchIndex: number }
  | { type: 'pick-lead'; benchIndex: number }
  | { type: 'end-turn' };

/** Why an action is not currently legal — surfaced verbatim by the UI. */
export type RejectReason =
  | 'not-action-phase'
  | 'lead-pick-pending'
  | 'card-not-in-hand'
  | 'owner-fainted'
  | 'owner-asleep'
  | 'owner-frozen'
  | 'melee-needs-lead'
  | 'not-enough-ap'
  | 'no-enemy'
  | 'target-fainted'
  | 'target-is-lead'
  | 'target-frozen'
  | 'lead-frozen'
  | 'invalid-index'
  | 'not-wild'
  | 'no-balls'
  /** §2.6.4.1 — the gauge is below READY, so the throw would fail for certain. The card waits. */
  | 'not-ready'
  | 'nothing-to-cure'
  /** §7.4.5 — a held item forbids this card: Choice Band's Ranged lock, or Choice Scarf's one-a-turn. */
  | 'choice-locked';
