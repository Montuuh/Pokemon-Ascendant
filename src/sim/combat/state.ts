import type { CombatTally } from '../run/types';
import type { EncounterKind, EnemySetup, EnemyTier } from '../content/defs';
import type { IntentKind, PokemonType, PrimaryStatus, SlotId, Stat, StatusCondition } from '../types';
import type { Effectiveness } from './typeChart';
import type { FieldState } from './fields';
import type { ArenaRuleId } from './arenaRules';
import type { FieldCategory, FieldId } from './fields';
import type { GymRuleId } from './gymRules';

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
  /** §5.13.2 — the Mastery Move dealt beside the active four, if the line has one unlocked. Player side only. */
  masteryMoveId: string | null;
  /** §4.2.6 — stat stages, ±6. */
  stages: Record<Stat, number>;
  /** §4.1.3.1 — the critical rhythm's meter, 0 to 1: each act fills the share its pace allows (v0.9.80: a fraction, not a count); full, its next hit is a critical. */
  rhythm: number;
  status: StatusInstance | null;
  /** §4.2.2.4 — Sleep/Freeze cannot be reapplied through this turn, even after a cure or replacement. */
  controlBlockedThroughTurn?: number;
  /** §4.2.3.1 — secondary status; 0 = not confused. */
  confusionTurns: number;
  confusionAppliedTurn: number;
  abilityIds: string[];
  /** §7.4 — the wearer's one held item, locked in with the Active Team. */
  heldItemId: string | null;
  /** §7.4 Focus Sash — one endure charge, re-armed at combat end. */
  endureAvailable: boolean;
  /** §6.3.9 — the run's Friendship (Return reads it); absent on an enemy, which uses BattleConfig's `friendship.foe`. */
  friendship?: number;
  /** §7.3.6 — at full Friendship, one hold-on at 1 HP this fight; true while it is unspent. */
  fondEndure?: boolean;
  /**
   * §7.3.5 Champion's Crest — enemies this Pokémon has personally defeated, carried in from the run.
   * Zero in a fixture fight, which is right: there is no run behind it to have a record in.
   */
  defeats: number;
  /** §7.3.5 Soul Link — one of the run's two longest-travelling Pokémon. Read only while the relic is held. */
  soulLinked?: boolean;
  /** §5.14 — wears the official shiny palette: a wild one that rolled it, or a caught shiny on the player's side. */
  shiny?: boolean;
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
  /**
   * §5.10.3 Glacier Badge — a multiplier on this Pokémon's *next* attack, set when a status lands on it and spent
   * by that attack. Absent (the usual case) is 1.
   */
  chill?: number;
  /** §3.11.1 — PP spent this fight, by move. Absent until a move with PP is used. */
  ppUsed?: Record<string, number>;
  /** §3.11.4 — Guard: HP that lasts until the next turn starts. */
  guard?: number;
  /** §3.11.5 — the decoy's HP, while it stands. */
  substitute?: number;
  /** §3.11 — what the move keywords leave on the Pokémon between plays. Absent until one is used. */
  volatile?: Volatile;
}

/**
 * §3.11 — a keyword's state on its user. Recharge and the rampage go `pending → active` at the next turn's start, so
 * the turn they were used in is not the turn they bind.
 */
export interface Volatile {
  /** §3.11.2 — the turn its Protect is up. */
  protectTurn?: number;
  /** §3.11.2 — the last turn it raised one, so it cannot raise the next. */
  protectedLast?: number;
  /** §3.11.3 — the turn its Endure holds. */
  endureTurn?: number;
  /** §3.11.8 — recharging after an ultimate. */
  recharge?: 'pending' | 'active';
  /** §3.11.8 — an enemy's Fatigue: AP its next turn's budget is short. Yours is the player's AP debt instead. */
  fatigue?: number;
  /** §3.11.9 — the rampaging move and how many free returns are left. */
  rampage?: { moveId: string; left: number; active: boolean };
  /** §3.11.10 — a charged hit waiting to land next turn, at the foe it was aimed at; `outOfReach` meanwhile. */
  charge?: { moveId: string; targetUid: string | null; outOfReach: boolean; turn: number };
  /** §3.11.11 — this turn's Counter: hits of `range` are returned ×`multiplier`. */
  counter?: { range: 'melee' | 'ranged'; multiplier: number; turn: number };
  /** §3.11.13 Ingrain — it cannot be swapped out for the rest of the fight. */
  rooted?: true;
  /** §5.2.3 Taunt — through this turn, no move but an attack. */
  tauntUntil?: number;
  /** §5.2.3 Mean Look — through this turn, it cannot be swapped out. */
  trappedUntil?: number;
  /** §5.2.3 Yawn — at the end of this turn, still leading, it falls asleep. */
  drowsyTurn?: number;
  /** §5.2.3 Leech Seed / Curse — a share of its HP at every turn's end, fed to the other side's Lead for a seed. */
  seeded?: { percent: number; heal: boolean; bySide: 'player' | 'enemy' };
  /** §5.2.3 Helping Hand — its hits this turn are ×`multiplier`. */
  helped?: { turn: number; multiplier: number };
  /** §5.2.3 Revenge — the last turn a move hurt it. */
  hurtTurn?: number;
  /** §5.2.3 Disable on an enemy — the move it cannot use through `untilTurn` (yours are on `PlayerState.disabled`). */
  disabledMove?: { moveId: string; untilTurn: number };
}

/** §3.11.6 / §3.11.13 — a condition over one side, counted down at the end of each Resolution. Wish names its place. */
/** What dealt a hit: a move, a status tick, the weather, a Gym's rule, or a disruption (§5.2.3: a hazard, a seed, Perish Song). */
export type DamageCause = 'move' | 'burn' | 'poison' | 'sandstorm' | 'hail' | 'tremor' | 'hazard' | 'seed' | 'perish';

export interface SideCondition {
  /** §5.2.3 — Spikes and Stealth Rock stay for the fight, hurting whoever steps into that side's Lead. */
  id: 'reflect' | 'light-screen' | 'safeguard' | 'mist' | 'wish' | 'spikes' | 'stealth-rock';
  side: 'player' | 'enemy';
  turnsLeft: number;
  /** §5.2.3 — it stays for the fight: no clock counts it down (`turnsLeft` is then not a count). */
  lasting?: true;
  /** Wish — the place it heals (a team index for the player, an enemy uid for the enemy) and how much. */
  place?: number | string;
  amount?: number;
}

export interface EnemyCombatant extends Combatant {
  tier: EnemyTier;
  /** §5.8.3 — 1 ordinary, 2 two-phase, 3 ace. */
  phaseCount: 1 | 2 | 3;
  /** §5.8.3 — the active phase: entered at a turn's start, never left (healing does not take it back). */
  phase: 1 | 2 | 3;
  /** §5.8.3 — the highest threshold crossed while it stands and not yet entered: it commits next turn, before the AP refill. */
  pendingPhase?: 2 | 3;
  /** §5.8.3 — a three-phase ace's one authored signature opportunity. */
  signature?: SignatureState;
  intent: Intent | null;
  /** §5.3 CooldownGate — moveId → turns remaining. */
  cooldowns: Record<string, number>;
  /** §5.5 (CL-011) — once the enemy has fired any move, its intents are Witnessed. */
  witnessed: boolean;
  /** §2.7.1 Hex Maniac — its first intent is hidden, as an Elite's is. */
  veiled?: boolean;
  /** §5.5.1 — under Trainer's Instinct, what it will do next turn. It commits to it unless it becomes illegal. */
  next?: QueuedIntent | null;
  /** §5.6 — Intent phases this Pokémon has stood on the field for; a support that lingers escalates. */
  fieldTurns?: number;
  /** §5.6.1 — it acts twice a turn; `second` is this turn's second intent, resolved right after the first. */
  acts?: 2;
  second?: Intent | null;
  /** §5.6.1 — the damage it has taken in your current turn, toward breaking its second action (or its combo, §5.5.2). */
  stagger?: number;
  /** §5.5.2 — its authored combo, and the turn it may open it again after one ran or was broken. */
  combo?: [string, string];
  comboRestUntil?: number;
  /** §5.6.2 — the companions its Call for Help can still bring in, in order. */
  helpers?: EnemySetup[];
  /** §5.9.5 Bloom — it took damage this turn, so it does not bloom at the turn's end. */
  hurtThisTurn?: boolean;
}

/** §5.8.3 — why an open signature opportunity is not this turn's action. */
export type SignatureWait = 'asleep' | 'frozen' | 'recharging' | 'paralysed' | 'no-target';

/**
 * §5.8.3 — `locked` until Phase 3 commits, `ready` from then until it is declared (or KO'd), then `spent`. `wait` says why
 * a ready one was not declared this turn; the response is the authored counterplay the intent card shows.
 */
export interface SignatureState {
  moveId: string;
  response: string;
  state: 'locked' | 'ready' | 'spent';
  wait?: SignatureWait;
}

/** §5.5.1 — the intent queue: an enemy's committed plan for next turn, and the boss phase it was planned in. */
export interface QueuedIntent {
  intent: Intent;
  phase: number;
  /** §5.5.2 — the second step of a combo: breaking it this turn (a quarter of its HP, or a super-effective hit) cancels it. */
  combo?: true;
}

export interface Intent {
  kind: IntentKind;
  moveId: string | null;
  /** Slot the intent is locked to (null for cleave/buff/stall/incapacitated). */
  targetSlot: SlotId | null;
  /** §5.6 — a Healer's heal or a Buffer's raise aimed at an ally (the enemy Lead) rather than at itself. */
  targetEnemyUid?: string;
  /** §5.5 — hidden intents render as ❓ until witnessed. */
  hidden: boolean;
  /** §5.6.1 — a second action you broke this turn: shown struck out, and it does not happen. */
  broken?: boolean;
  /** §4.1.3.1 — its critical rhythm is full: this hit is a critical, declared and shown now. */
  crit?: boolean;
  /** §5.8.3 — the ace's signature, declared: always shown, whatever veils its other intents. */
  signature?: boolean;
  /** §5.2.1 — a stance: its effects went up when it was declared, so its turn only says so. */
  stance?: true;
}

export interface SkillCard {
  id: string;
  moveId: string;
  ownerUid: string;
  /** §5.13.2 — the immutable fifth slot. The UI marks it; the rules treat it as any other card. */
  mastery?: true;
  /**
   * §8.8 Faint Echo — the turn after which this dead card finally leaves the discard pile. Undefined on
   * every card in every other run; a card with it set is inert and only there to pad the reshuffle.
   */
  echoUntilTurn?: number;
  /** §3.11.9 — a rampage's free return: played or not, it leaves at the turn's end and never reaches the discard. */
  temp?: true;
}

export interface ConsumableCard {
  id: string;
  consumableId: string;
}

export type Phase = 'draw' | 'intent' | 'action' | 'resolution' | 'ended';
/** §5.6.5 — `fled`: a runner got away before it was beaten or caught. Nothing was lost but the chance. */
export type Outcome = 'in-progress' | 'victory' | 'defeat' | 'caught' | 'escaped' | 'fled';

/**
 * §5.6.5 — a fight won by something other than knocking everything out: a runner that leaves at the end of turn
 * `turns` (`flee`), or a find held until the end of turn `turns` against a guard that escalates (`hold`).
 */
export interface CombatObjective {
  kind: 'flee' | 'hold';
  turns: number;
}

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
  /**
   * §3.5 — the bag. `hand` is everything usable this turn (the whole bag since v0.8.6), `used` what was played
   * this fight and will leave the inventory; `pool` holds the rest between turns.
   */
  consumables: { pool: ConsumableCard[]; hand: ConsumableCard[]; used: ConsumableCard[] };
  /** §3.5 — items used this turn, and how many the turn allows (BattleConfig + Lucky Draw and relic bonuses). */
  itemsUsed: number;
  itemCap: number;
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
  freeSwapSources?: { source: string; remaining: number }[];
  /** §7.3.7 Flow State — the free swaps a relic grants afresh every turn, spent before the combat's bank and lost if unused. */
  turnFreeSwaps: number;
  turnFreeSwapSources?: { source: string; remaining: number }[];
  /** §7.3 — the run's relics, read-only inside a fight. */
  relics: string[];
  /** §5.10 — the run's Badges, read-only inside a fight. Resolved through the same hooks as relics (§7.3.6). */
  badges: string[];
  /** §2.11.3 — the Region Modifier in force. Same hooks again; one at a time, so one id. */
  regionModifier: string | null;
  /** Per-turn bookkeeping the card-economy relics need: what was played, and in what order. */
  playedThisTurn: { ownerUid: string; moveId: string; apCost: number }[];
  /** §3.3 — the team's indices by place (Lead, bench 1, bench 2); a swap trades two places. Absent: array order. */
  order?: number[];
  /** §7.3 — AP banked by a relic for the next turn (Cycle Cell, Move Echo). */
  bankedAp: number;
  bankedApSources?: { source: string; amount: number }[];
  /** Set when the deck reshuffled this turn, so a reshuffle relic can pay out next turn. */
  reshuffled: boolean;
  /**
   * §7.3 Recycle Tag / Cycle Cell — the turn the deck last reshuffled. `reshuffled` is cleared at the top of every
   * turn, right after the turn-start draw that most often sets it, so those relics read this instead (v0.9.97).
   */
  reshuffledTurn?: number;
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
  /** §8.4.3 — turns each Pokémon (by uid) has begun as Lead, for the Trainer Card's favourite. */
  leadTurns: Record<string, number>;
  /** §8.6.1 — the fight's discovery tallies. Read once at combat end; never a rule input. */
  tally: CombatTally;
  /**
   * §5.10.1 Hive Badge — cards promised to next turn's hand.
   *
   * A copy is queued rather than dealt because the Badge pays out *when the deck cycles*, which happens
   * mid-draw, and a card pushed into a hand that is still being drawn would be drawn over.
   */
  queuedCards: { moveId: string; ownerUid: string }[];
  /** §3.11.1 — cards whose PP ran out: out of the deck for the rest of the fight. */
  exhausted?: SkillCard[];
  /** §3.11.12 — AP borrowed this turn by an overexerting card, owed by next turn's refill. */
  apDebt?: number;
  /** §5.2.3 Disable — one card of one Pokémon that cannot be played through `untilTurn`. */
  disabled?: { moveId: string; ownerUid: string; untilTurn: number };
}

/**
 * §9.2 — `intent` is an enemy's declaration for the turn ("readies Ember → Lead"): the intent chip already shows it,
 * so the log's ticker skips it and says what happened instead; the full log keeps it.
 */
export type LogCategory = 'player' | 'enemy' | 'intent' | 'turn' | 'system' | 'ap';
export interface LogEntry {
  turn: number;
  category: LogCategory;
  text: string;
  /** §3.8 — actual committed AP changes, distinct from credits for a future turn. */
  ap?: { kind: 'balance' | 'bank'; source: string; requested: number; before: number; after: number };
}

export type CombatEvent = { seq: number; turn: number } & (
  | { t: 'combat-start' }
  | { t: 'turn-start'; ap: number }
  | { t: 'draw'; cardIds: string[]; consumableIds: string[] }
  | { t: 'confusion-discard'; uid: string; cardId: string }
  | { t: 'intent'; enemyUid: string; intent: Intent }
  | { t: 'combo-break'; enemyUid: string }
  | { t: 'card-played'; cardId: string; moveId: string; ownerUid: string; targetUid: string | null; apCost: number }
  | { t: 'consumable-used'; consumableId: string; targetUid: string | null; apCost: number }
  | { t: 'enemy-action'; enemyUid: string; intent: Intent; fizzled: boolean }
  | { t: 'attack'; sourceUid: string; targetUid: string; moveId: string }
  | { t: 'damage'; sourceUid: string | null; targetUid: string; amount: number; crit: boolean; effectiveness: Effectiveness; hpAfter: number; cause: DamageCause }
  | { t: 'heal'; targetUid: string; amount: number; hpAfter: number; cause: 'move' | 'consumable' | 'regen' | 'ability' }
  | { t: 'status-applied'; targetUid: string; status: StatusCondition }
  | { t: 'status-immune'; targetUid: string; status: StatusCondition }
  | { t: 'status-cleared'; targetUid: string; status: StatusCondition; cause: 'expired' | 'cured' }
  | { t: 'stage'; targetUid: string; stat: Stat; delta: number; total: number }
  | { t: 'swap'; fromIndex: number; toIndex: number; kind: 'manual' | 'step-forward' | 'step-backward' | 'replacement' | 'forced'; apCost: number }
  | { t: 'sturdy'; uid: string }
  | { t: 'faint'; uid: string; side: 'player' | 'enemy' }
  | { t: 'enemy-enter'; enemyUid: string; called?: boolean }
  | { t: 'phase'; enemyUid: string; phase: 1 | 2 | 3; from?: 1 | 2 | 3 }
  /** §2.6.4.4 — `checks`: how many of the four shake checks passed (4 is the catch). */
  /** §2.6.4 — `targetUid`: the Pokémon the ball was thrown at, the Lead or one standing behind it (§5.6). */
  | { t: 'catch'; targetUid: string; success: boolean; chance: number; checks: number; ballsLeft: number }
  /** §5.6 — a Defender took its Lead's place (Cover). */
  | { t: 'enemy-cover'; enemyUid: string; coveredUid: string }
  | { t: 'lead-pick-required' }
  | { t: 'outcome'; outcome: Outcome }
  /** §4.3.6 — the fields changed mid-fight (Defog). */
  | { t: 'field'; fields: FieldState }
  /** §2.12.2.1 Playful — a Legendary took the type of the move that hit it. */
  | { t: 'type-change'; targetUid: string; types: PokemonType[] }
  /** §3.11 — a keyword went up on a Pokémon (or, `blocked`, it stopped something), for the animation. */
  | { t: 'keyword'; uid: string; keyword: 'protect' | 'endure' | 'guard' | 'substitute' | 'recharge' | 'rampage' | 'charge' | 'counter' | 'blocked'; amount?: number }
);

export interface CombatState {
  scenarioId: string;
  kind: EncounterKind;
  /** §2.6.2 — the rarity a Wild Area rolled for this fight; absent anywhere else. */
  wildTier?: 'common' | 'uncommon' | 'rare';
  /** §8.8 — the run's difficulty modifiers. Only the two that change a mid-fight rule read this. */
  modifiers: string[];
  /** §5.13.1 Familiar — enemy species whose intents are never hidden from this account. */
  familiar: string[];
  /** §8.4.2 Pokédex Insight — enemy species whose *first* intent this fight is shown free. */
  insight: string[];
  stage: string;
  trainer: { name: string; sprite: string } | null;
  /** §2.7 — said as the fight opens: the trainer's line, or the narration before an Elite Wild or a Legendary. */
  opening?: string;
  /** §2.7 — the log's length when the first turn was dealt: the opening is said until the log grows past it. */
  openingUntil?: number;
  seed: number;
  /** Live xorshift32 cursor of the CombatRNG stream (§10.7 / §10.8.6). The reducer is pure over this. */
  rngCursor: number;
  turn: number;
  phase: Phase;
  player: PlayerState;
  /**
   * §5.6 — the enemies on the field, in slot order: index 0 is the enemy Lead, the rest are its supports. Only
   * the living stand here; a faint removes one and promotes or refills (`onFaint`).
   */
  enemies: EnemyCombatant[];
  /** §5.6 — how many enemies stand on the field at once (1 = one after another). */
  onField: number;
  /** §5.12 — from this many fallen, two stand on the field. Absent everywhere but the Champion. */
  pairFrom?: number;
  /** §4.3 — the Battlefield and any Home Field standing. Empty when the fight has none. */
  fields: FieldState;
  /**
   * §4.3.15 — a field a move set, by category: the Resolutions it has left, and the field the fight opened with,
   * which comes back when they run out.
   */
  fieldTimers?: Partial<Record<FieldCategory, { turnsLeft: number; restore: FieldId | null }>>;
  /** §3.11.6 — Reflect, Light Screen, Safeguard, Mist and Wish, on either side. */
  sides?: SideCondition[];
  /** §5.2.3 Perish Song — Resolutions left before both Leads are struck. */
  perish?: { turnsLeft: number; sungTurn: number };
  /** §5.9.5 — the Gym Leader's rule, for the whole fight. Absent in every fight but a Gym. */
  gymRule?: GymRuleId;
  /** §2.12.2.1 — a Legendary's arena rule, for the whole fight. Absent in every fight but a Legendary's. */
  arenaRule?: ArenaRuleId;
  /** §5.6.5 — the fight's other objective, for the whole fight. Absent in every fight won the usual way. */
  objective?: CombatObjective;
  /** §5.9.5 — what a rule keeps between turns: Rollout's Lead and its count, Mind Lock's sealed card. */
  ruleState?: {
    leadUid?: string;
    leadTurns?: number;
    sealedCardId?: string;
    /** §2.12.2.1 Rekindle — it has risen, once a fight. */
    rekindled?: boolean;
    /** §2.12.2.1 Metronome — the field drawn for the next turn, shown a turn ahead. */
    metronomeNext?: FieldId;
  };
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
  /** §5.6 — `targetUid` names the enemy the card is aimed at; absent, it is the enemy Lead. */
  | { type: 'play-card'; cardId: string; stepBackTo?: number; targetUid?: string }
  /** `targetIndex` is the ally for an ally item; `targetUid` the enemy a Poké Ball is thrown at (§2.6.4). */
  | { type: 'use-consumable'; cardId: string; targetIndex?: number; targetUid?: string }
  | { type: 'swap'; benchIndex: number }
  | { type: 'pick-lead'; benchIndex: number }
  | { type: 'end-turn' }
  /** §3.1.2 — run from the fight: the enemy takes its telegraphed action, then the fight ends as Escaped. */
  | { type: 'flee' };

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
  /** §5.6 — a single-target Melee card reaches only the enemy Lead. */
  | 'out-of-reach'
  | 'target-fainted'
  | 'target-is-lead'
  | 'target-frozen'
  | 'lead-frozen'
  | 'invalid-index'
  | 'not-wild'
  /** §5.6.5 — a hold-out's guard is not for catching. */
  | 'guard'
  | 'no-balls'
  | 'item-limit'
  /** §3.1.2 — there is no running from a Gym. */
  | 'no-fleeing-a-gym'
  | 'nothing-to-cure'
  /** §7.4.5 — a held item forbids this card: Choice Band's Ranged lock, or Choice Scarf's one-a-turn. */
  | 'choice-locked'
  /** §5.9.5 Mind Lock — Sabrina sealed this card at the draw. */
  | 'sealed'
  /** §3.11.1 — its PP for this fight is spent. */
  | 'no-pp'
  /** §3.11.2 — Protect cannot be raised two turns running. */
  | 'protect-again'
  /** §5.2.3 — Disable has this card; a Taunt allows attacks only; Mean Look holds the Lead. */
  | 'disabled'
  | 'taunted'
  | 'lead-trapped'
  /** §3.11.2 / §3.11.10 — the target is behind its Protect, or out of reach. */
  | 'target-protected'
  /** §3.11.8 — the owner is recharging. */
  | 'recharging';
