import type { ScenarioDef, TeamMemberSetup } from '../content/defs';
import type { BranchArchetype, PrimaryStatus } from '../types';

// The run layer: everything outside a fight (§2). Pure and deterministic like the combat sim — the same seed
// and the same action log rebuild the same run, which is what makes the save a seed plus a list (§10.7.4).

/**
 * §2.5 — the node types a route offers. Since 2026-09-22 a route's services are small (§2.9): the field nurse
 * (`aid`) and the travelling merchant. The Pokémon Center, the Mart and the Dojo are City buildings (§2.11),
 * reached through `RunState.city`, not map nodes.
 */
export const NODE_KINDS = ['wild', 'trainer', 'elite', 'elite-wild', 'aid', 'merchant', 'mystery', 'gym'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export interface MapNode {
  id: string;
  layer: number;
  /** Position within the layer, left to right. Used for drawing and for keeping edges from crossing. */
  col: number;
  kind: NodeKind;
  /** Ids in the next layer this node leads to. Empty on the final layer. */
  next: string[];
  /**
   * §2.5 — which Gym lane this node belongs to, once the trunk has forked. Undefined in the shared trunk.
   * An edge may never change lane, which is what stops the fork being a detour.
   */
  lane?: number;
  /** What the Node Preview shows before you commit (§2.5, Pillar 1). */
  preview: NodePreview;
}

export interface NodePreview {
  title: string;
  detail: string;
  /** Wild nodes name the species on offer; trainer nodes name the archetype's team. */
  speciesIds: string[];
  levelBand: [number, number];
  /** Trainer and Gym nodes fix their roster at generation, so what the preview promised is what you fight. */
  enemies?: { species: string; level: number }[];
  /**
   * The map badge to draw, when the node kind alone is not specific enough. A trainer node names its
   * archetype here so the map says *who* is waiting, not just "a trainer" (Pillar 1: the preview is the
   * promise). Falls back to the node kind.
   */
  icon?: string;
}

export interface RegionMap {
  seed: number;
  regionIndex: number;
  layers: number;
  nodes: Record<string, MapNode>;
  /** Layer 0 — the player's first choice (§2.5: no forced Wild, but a wild-heavy weighting). */
  entry: string[];
  /**
   * §5.9.2 — the two Gym ids this Region drew, lane 0 then lane 1. Named from layer 0 so the climax is
   * never a surprise (Pillar 1), and fixed at generation so the map and the fight can never disagree.
   */
  gyms: string[];
  /** The first layer at which the lanes separate. Below it every node is shared. */
  forkLayer: number;
}

/** A Pokémon in the Box. HP and Trauma persist between fights (§2.4); this is the run's real state. */
export interface PartyMon {
  uid: string;
  speciesId: string;
  level: number;
  xp: number;
  /** Current HP. 0 is fainted (§2.4.1) — there is no separate flag. */
  hp: number;
  traumaStacks: number;
  /**
   * §6.7 — the Learned Move Pool: everything this Pokémon has ever learned, from levelling, evolution, a TM
   * or the Dojo. It never shrinks. The pressure lives in the active 4 below, not here.
   */
  pool: string[];
  /** §6.7.2 — the active 4: the cards this Pokémon contributes to the skill deck. A subset of `pool`. */
  moveIds: string[];
  /** §6.5.1 — the one passive slot. Null until the first evolution grants one. */
  abilityId: string | null;
  /** §6.3 — the archetype picked at the last evolution. Null on a base form. */
  archetype: BranchArchetype | null;
  /**
   * §4.2.7.1 — the primary condition carried out of the last fight, with what is left of its clock. Every status
   * outlives the fight that inflicted it; the nurse and the Center cure it.
   */
  status: CarriedStatus | null;
  /** §4.2.7.1 — Confusion's remaining turns, carried like the primary. 0 is none. */
  confusionTurns: number;
  /** §7.4 — the one held-item slot. Releasing this Pokémon drops the item back to the bag, never loses it. */
  heldItem: string | null;
  /** §7.3.5 Champion's Crest — enemies this Pokémon has personally knocked out this run. */
  defeats: number;
}

export type RunPhase =
  /** Looking at the map, choosing where to go. */
  | 'map'
  /** A node is selected; the preview is open and the team can still be changed (§2.3). */
  | 'preview'
  /** Inside a fight. The combat sim owns the state; the run waits for its result. */
  | 'combat'
  /** Post-combat summary: XP, level-ups, a catch. */
  | 'reward'
  /** §3.6 / §6.3.3 — one or more Pokémon are at their threshold and the branch is waiting to be picked. */
  | 'evolution'
  /** The Box is full and a recruit is waiting (§2.3.1). */
  | 'swap-or-skip'
  /** §2.9.1 — the route's field nurse. The half-heal already happened; the screen says what it did. */
  | 'aid'
  /** §2.11 — standing in a City's lobby, between buildings. */
  | 'city'
  /** §2.11.1 / §8.2.4 — inside a City's Pokémon Center. The heal already happened; Therapy is left to decide. */
  | 'center'
  /** §2.9.4 — inside a City's Dojo, spending money. */
  | 'dojo'
  /** §2.9.2 / §2.11.2 — at the travelling merchant's cart, or inside a City's Mart. */
  | 'shop'
  /** §2.10 — a Mystery Event is on screen, waiting for a choice. */
  | 'event'
  /** §2.9.4.1 — on the Challenge Ring's ladder, between rungs: fight the next one or cash out. */
  | 'ring'
  /** §2.9.4.1 — the Ring's top rung is won and its Rare relic 1-of-3 is open. */
  | 'relic-pick'
  /** §2.11.5 — inside Celadon's Game Corner, at the Wheel and the Slots. */
  | 'game-corner'
  /**
   * §7.3.7 — a Gym is beaten and the Legendary 1-of-3 is open. It sits *between* the Gym and the end of the
   * run rather than beside the reward screen, because it is the Gym's own reward and the last decision the
   * Region asks for.
   */
  | 'legendary'
  /** The run is over, won or lost. */
  | 'ended';

export interface RunStats {
  nodesCleared: number;
  combatsWon: number;
  catches: number;
  faints: number;
  turnsPlayed: number;
  /** §8.6.1 Lure Module's discovery counts recruits per Region; the Trainer Card counts them for life. */
  recruits: number;
  /** §8.6.1 Cleanse Tag's discovery: statuses your side has taken this run. */
  statusesTaken: number;
  /** §3.1.2 — fights run from. */
  escapes: number;
  /** Wall-clock is not part of the sim; the app layer fills this in on save. */
  startedAt: number;
}

export interface LevelUp {
  uid: string;
  from: number;
  to: number;
  /** §6.7.1 — moves the levels added to the Learned Move Pool. */
  learned: string[];
  /**
   * §6.7.2 — the subset of `learned` that also reached the active 4, because a slot happened to be free.
   * Anything learned beyond four waits in the pool until the player swaps it in, which is the whole point
   * of a fixed budget against a growing pool.
   */
  activated: string[];
  /** §6.2.4 — the Pokémon stands at its threshold; the branch is picked on the Evolution screen (§3.6). */
  evolutionReady?: boolean;
}

/** §6.3.3 — one queued Evolution screen: who, from what, and which archetypes are on offer. */
export interface PendingEvolution {
  uid: string;
  from: string;
  branchIds: string[];
}

export interface RewardSummary {
  xpAwarded: { uid: string; amount: number }[];
  levelUps: LevelUp[];
  caught: { speciesId: string; level: number } | null;
  faintedUids: string[];
  /** §7.5 — the TM this fight dropped, if any. */
  tm: string | null;
  /** §2.14 — Poké Dollars earned, after any relic multiplier. */
  money: number;
  /** §7.3 — the relic this fight dropped, if any. */
  relic: string | null;
  /** §7.4.6 — the held item this fight dropped, if any. */
  heldItem: string | null;
}

/** §2.9.2 — one row of shop stock. Seeded per visit; a sold slot stays sold across a re-roll. */
export interface ShopSlot {
  kind: 'consumable' | 'relic' | 'held-item' | 'tm' | 'ball';
  id: string;
  price: number;
  sold: boolean;
  /** How many the slot hands over. Absent is one; the merchant's Poké Balls come three to a slot (§2.9.2). */
  qty?: number;
  /** §2.11.2 — the Department Store floor the slot is on. Absent everywhere else. */
  floor?: StoreFloor;
}

/** §2.11.2 — the Department Store's floors, one category each, bottom to top. */
export const STORE_FLOORS = ['consumables', 'tms', 'held-items', 'relics', 'rare'] as const;
export type StoreFloor = (typeof STORE_FLOORS)[number];

export interface ShopStock {
  slots: ShopSlot[];
  /** §2.9.3 — re-rolls used so far this visit. */
  rerolls: number;
  /** §2.9.3 — how many this shop allows: one at the merchant, three at a City shop. */
  maxRerolls: number;
}

/** §4.2.7.1 — a primary condition as it leaves a fight: the kind, its remaining clock, and Toxic's escalation. */
export interface CarriedStatus {
  kind: PrimaryStatus;
  /** Turns left for a timed condition; null for Burn and Poison, which last until cured. */
  turnsLeft: number | null;
  /** §7.5 Toxic — ticks already taken, so the escalation resumes rather than resetting. */
  escalatingTicks?: number;
}

/** §2.11 — the two Cities of a run: the small town after Gym 1 and the big city after Gym 2. */
export type CityId = 'pallet-town' | 'celadon-city';

/** §2.11.4 — the buildings a player can walk into. Doors still in development are drawn by the UI only. */
export type CityBuilding = 'center' | 'mart' | 'dojo' | 'game-corner';

/** §2.9.4.1 — one rung of the Challenge Ring: a rival, their team (seen before you fight it), and the prize. */
export interface RingRung {
  trainer: string;
  sprite: string;
  line: string;
  team: { species: string; level: number }[];
  /** Poké Dollars banked for winning it, or the Rare relic 1-of-3 at the top of the ladder. */
  prize: { money: number } | { relicPick: true };
}

/** §2.9.4.1 — the Challenge Ring for this City visit. Rolled on arrival; resolves once per visit. */
export interface RingState {
  fee: number;
  rungs: RingRung[];
  /** The fee is paid and the ladder is open. */
  entered: boolean;
  /** Rungs won so far. */
  cleared: number;
  /** Money the won rungs have paid, held until a cash-out and lost with a lost rung. */
  banked: number;
  /** A rung's fight is in progress. */
  fighting: boolean;
  /** The ladder is over for this visit: cashed out, cleared or lost. */
  done: boolean;
  /** The top rung's prize, while it is being picked. */
  pick: string[] | null;
}

/** §2.11.5 — the last thing a Game Corner machine did, so the screen can show it and a reload shows the same. */
export interface CasinoResult {
  machine: 'wheel' | 'slots';
  stake: number;
  multiplier: number;
  /** What paid out: `stake × multiplier`. The stake itself is already gone. */
  payout: number;
  /** The wheel segment it stopped on, or the three reel faces. Presentation, drawn *after* the outcome. */
  face: number | string[];
}

/** §2.11 — the City the run is standing in. Everything here was rolled on arrival, so re-entering never re-rolls. */
export interface CityState {
  id: CityId;
  /** §2.11.2 — the shop's stock. Carried between visits to the building; a sold slot stays sold. */
  shop: ShopStock;
  /** §2.11.3 — the three Region Modifiers the gate offers. Picking one leaves the City. */
  reflection: string[];
  /** §2.9.4.1 — the Challenge Ring inside this City's Dojo. */
  ring: RingState | null;
  /** §2.11.5 — each Game Corner machine's last result, for the screen. */
  casino: { wheel: CasinoResult | null; slots: CasinoResult | null };
}

export interface PendingRecruit {
  speciesId: string;
  level: number;
}

export interface RunState {
  /** Bumped when the save shape changes so an old file can be migrated or rejected (§10.8.3). */
  version: number;
  seed: number;
  regionIndex: number;
  map: RegionMap;
  /** The node the player is standing on; null before the first choice. */
  position: string | null;
  /** Nodes the player may enter next. */
  reachable: string[];
  visited: string[];
  box: PartyMon[];
  /** Up to 3 uids from the Box (§2.3). The first is the Lead. */
  activeUids: string[];
  balls: number;
  consumables: string[];
  /** §6.4.1 — TMs held but not yet taught. Each is single use. */
  tms: string[];
  /** §2.14 / economy — Poké Dollars. The run's only currency; Trainer Tokens are an account thing (§8.3). */
  money: number;
  /** §7.3 — relics held. Run-long, uncapped, never removed once taken. */
  relics: string[];
  /**
   * §7.3.7 — relic ids whose **once-per-run** charge is gone (Phoenix Feather). Distinct from combat's
   * `player.spent`, which is per-combat and starts empty every fight.
   */
  spentRelics: string[];
  /**
   * §5.10 — Badges won, in the order they were won. Permanent from the moment they are awarded and never
   * removed, which is why there is no `lostBadges` and never will be.
   */
  badges: string[];
  /** §7.4 — held items not currently equipped. Equipped ones live on their PartyMon. */
  bag: string[];
  /** §8.8 — difficulty modifiers opted into at run start. Empty is the baseline, and the baseline is the floor. */
  modifiers: string[];
  /**
   * §2.11.3 — the one Region Modifier in force, or null. Exactly one at a time, and it expires with its
   * Region: this is a single id rather than an array so "they never stack" is a type, not a convention.
   */
  regionModifier: string | null;
  /** §2.9.2 — the stock of the shop currently being visited, re-rolled at a rising price. */
  pendingShop: ShopStock | null;
  /** §2.11 — the City the run is standing in, between two Regions. Null on a route. */
  city: CityState | null;
  /** §2.10 — the Mystery Event on screen. */
  pendingEvent: string | null;
  /**
   * What the chosen option actually did, as log lines, held on screen until the player leaves the node.
   * Null while the choice is still open. A Gamble needs this to be watchable; everything else reads better
   * confirmed than assumed.
   */
  eventResult: string[] | null;
  /** §2.10.4 — events already seen this run; the pool is drawn from without replacement. */
  seenEvents: string[];
  /** §8.4.2 Pokédex Insight — enemy species this run has already met, so the free reveal is a first-meeting thing. */
  seenSpecies: string[];
  phase: RunPhase;
  /** Set while `phase` is 'preview' or 'combat'. */
  pendingNodeId: string | null;
  pendingScenario: ScenarioDef | null;
  pendingReward: RewardSummary | null;
  /** §7.3.7 — the three Legendaries on offer, while `phase` is 'legendary'. */
  pendingLegendary: string[] | null;
  pendingRecruit: PendingRecruit | null;
  /** §6.3.1 — the Evolution screens still owed, oldest first. */
  pendingEvolutions: PendingEvolution[];
  outcome: 'in-progress' | 'victory' | 'defeat';
  /** One cursor per RNG stream, so a resumed run continues the same sequences (§10.8.6). */
  cursors: Record<string, number>;
  stats: RunStats;
  /**
   * §8.10 — what the account handed this run when it started, frozen. The sim never reads the account: a run
   * that asked it mid-flight would replay differently on a machine with a different account (§10.8).
   */
  perks: RunPerks;
  log: string[];
}

/**
 * §8.10 — the account's contribution to one run, snapshotted at run start.
 *
 * Every field is a *widening*: a bigger Box, a bigger relic pool, a species whose intents you have earned the
 * right to see, a Mastery card a line has unlocked. None of them is a point of damage (§8.3.1).
 */
export interface RunPerks {
  /** §8.4.2 Expanded Box (+2) and Twin Run (+1), on top of `RUN_START.boxCapacity`. */
  boxBonus: number;
  /**
   * §8.6.2 — the relic ids this account may drop, offer or stock: all Tier 1, plus discovered Tier 2, plus
   * bought Tier 3. `null` is the whole catalogue — the fixtures, the balance harness and any run started
   * before there was an account.
   */
  relicPool: string[] | null;
  /** §6.8 — Mastery tier the line may carry (keyed by base species id), derived from its Bond rank. Absent is 0. */
  mastery: Record<string, number>;
  /** §6.8.2 — Bond rank per line, for the hidden ability (rank 3) and the opening-hand Mastery card (rank 5). */
  bond: Record<string, number>;
  /** §5.13.1 Familiar — species whose Unknown intents are revealed at combat start. */
  familiar: string[];
  /** §8.4.2 Pokédex Insight — the Hub upgrade is in force. */
  insight: boolean;
  /** §8.4.2 Trauma Salve Cache — the first City's shop always stocks a Trauma Salve. */
  salveCache?: boolean;
}

/** What a finished combat reports back to the run layer. */
export interface CombatOutcomeReport {
  outcome: 'victory' | 'defeat' | 'caught' | 'escaped';
  /** Final HP and status for each Active Pokémon, keyed by uid. §4.2.7.1 — the status leaves with its clock. */
  team: { uid: string; hp: number; status: CarriedStatus | null; confusionTurns?: number; fainted: boolean; defeats?: number }[];
  /** The wild Pokémon that was caught, if any. */
  caught: { speciesId: string; level: number } | null;
  /** Poké Balls still in stock. A miss costs a ball too, so the run takes the fight's own count (§2.6.4). */
  ballsLeft: number;
  /** §8.8 No Refunds — consumable ids actually played, so the run can take them off the shelf. */
  spentConsumables?: string[];
  /** §7.3.7 — relic charges the fight spent; the run keeps the ones whose row says `oncePerRun`. */
  spentRelics?: string[];
  /** §8.7 — what the fight looked like, for the achievements that ask. Derived, never balance input. */
  damageTaken?: number;
  manualSwaps?: number;
  /** §5.13.1 — every enemy species knocked out, one entry per knockout. The Pokédex counts these. */
  defeated?: string[];
  /** §8.4.3 — turns each of your species spent as Lead this fight. */
  leadTurns?: Record<string, number>;
  /** §8.6.1 — the fight's running tallies, for the Tier-2 discoveries that ask. */
  tally?: CombatTally;
  /** §8.6.1 Vital Pendant's discovery — the Lead's HP as a fraction of its max when the fight ended. */
  leadHpFraction?: number;
  /** §8.6.1 Type Resonance's discovery — the Active Team's species at the end, in slot order. */
  activeSpecies?: string[];
  /** §8.9 — every enemy species that took the field, once each. The Pokédex counts these as met. */
  enemies?: string[];
  turns: number;
}

/**
 * §8.6.1 — what a fight counts as it goes, read once at its end. Every number here is a discovery criterion
 * from the relic catalogue and nothing here is a balance input: a tally that drove a rule would belong on
 * the Combatant or the PlayerState proper.
 */
export interface CombatTally {
  /** Critical hits your side landed. */
  crits: number;
  /** Times the skill deck ran dry and the discard came back. */
  reshuffles: number;
  /** Distinct conditions your moves put on the enemy. */
  statusesApplied: string[];
  /** Conditions applied to your Pokémon. */
  statusesTaken: number;
  /** Conditions cured on your side, by any means. */
  statusesCured: number;
  /** A rider of yours that never landed because the target had already fainted. */
  riderFizzles: number;
  /** The highest printed AP cost you played. */
  maxApMove: number;
  /** The most skill cards in hand at the moment a turn ended. */
  peakHandAtTurnEnd: number;
  /** §8.6.1 Master Ball Charm's discovery — throws the target broke out of. */
  catchFails: number;
  /** §8.9 — per *your* species, for the Pokédex record: enemy knock-outs landed, faints, damage dealt. */
  koBy: Record<string, number>;
  faintsOf: Record<string, number>;
  damageBy: Record<string, number>;
}

export type RunAction =
  | { type: 'enter-node'; nodeId: string }
  | { type: 'cancel-preview' }
  | { type: 'begin-combat' }
  | { type: 'finish-combat'; report: CombatOutcomeReport }
  | { type: 'claim-reward' }
  | { type: 'set-active'; uids: string[] }
  | { type: 'set-lead'; uid: string }
  | { type: 'resolve-recruit'; releaseUid: string | null }
  /** §6.3.3 — pick the archetype for the queued evolution. Permanent. */
  | { type: 'choose-branch'; uid: string; branchId: string }
  /** §6.7.2 — the Move Manager: set one Pokémon's active 4 from its pool. */
  | { type: 'set-moves'; uid: string; moveIds: string[] }
  /** §6.4.1 — teach a held TM. Single use. */
  | { type: 'use-tm'; uid: string; tmId: string }
  /** §6.4.2 — the Dojo's tutor service. */
  | { type: 'teach-move'; uid: string; moveId: string }
  /** §6.4.2 / §6.5.1 — the Dojo's ability service; sets or swaps the one passive slot. */
  | { type: 'set-ability'; uid: string; abilityId: string }
  | { type: 'leave-dojo' }
  | { type: 'leave-center' }
  /** §2.9.1 — walk on from the field nurse. */
  | { type: 'leave-aid' }
  /** §2.11.0 — walk into one of the City's open buildings. Leaving it returns to the lobby. */
  | { type: 'enter-building'; building: CityBuilding }
  /** §2.11.3 — the gate: pick one of the three Region Modifiers, which *is* leaving the City for the next Region. */
  | { type: 'depart-city'; modifierId: string }
  /** §2.11.2.4 — sell a bagged held item for 30 % of its listed price. City shops only. */
  | { type: 'sell-item'; itemId: string }
  /** §2.9.2 — buy the stock in slot `index`. */
  | { type: 'buy'; index: number }
  /** §2.9.3 — re-roll the unsold slots at 25 → 50 → 100 ₽; in the Department Store, one floor's. */
  | { type: 'reroll-shop'; floor?: StoreFloor }
  /** §2.9.4.1 — pay the Challenge Ring's fee and step onto the ladder (from inside the Dojo). */
  | { type: 'enter-ring' }
  /** §2.9.4.1 — fight the next rung. */
  | { type: 'ring-fight' }
  /** §2.9.4.1 — take what the ladder has paid and leave it. */
  | { type: 'ring-cash-out' }
  /** §2.9.4.1 — the top rung's Rare relic, or null to leave all three. */
  | { type: 'ring-pick'; relicId: string | null }
  /** §2.11.5 — spin the Wheel for a stake of your choosing. */
  | { type: 'spin-wheel'; stake: number }
  /** §2.11.5 — pull the Slots at their fixed stake. */
  | { type: 'pull-slots' }
  | { type: 'leave-game-corner' }
  | { type: 'leave-shop' }
  /** §8.2.4 — a Centre's Therapy service: one Trauma stack off one Pokémon. */
  | { type: 'use-therapy'; uid: string }
  /** §7.4.1 — equip a bagged held item, or take one off. `itemId` null unequips. */
  | { type: 'equip-item'; uid: string; itemId: string | null }
  /** §2.10 — answer the Mystery Event on screen. */
  | { type: 'choose-event'; option: number }
  /** §2.10 — acknowledge the result and walk on. */
  | { type: 'leave-event' }
  /** §7.3.7 — take one of the three, or `null` to decline. Declining is a real option: two is the cap. */
  | { type: 'pick-legendary'; relicId: string | null };

export type RunRejectReason =
  /** §6.8.3 — the line's hidden ability, before Bond rank 3. */
  | 'ability-locked'
  | 'not-on-map'
  | 'node-unreachable'
  | 'wrong-phase'
  | 'no-healthy-pokemon'
  | 'team-too-large'
  | 'unknown-pokemon'
  | 'box-not-full'
  | 'unknown-branch'
  | 'move-not-in-pool'
  | 'too-many-moves'
  | 'empty-kit'
  | 'incompatible-tm'
  | 'no-such-tm'
  | 'already-known'
  | 'not-on-tutor-list'
  | 'ability-not-in-pool'
  | 'invalid-slot'
  | 'cannot-afford'
  | 'already-sold'
  | 'no-rerolls-left'
  | 'no-such-item'
  | 'item-locked-to-species'
  | 'no-trauma'
  | 'unknown-option'
  /** §2.11 — a City action outside a City, or a City shop action at the route's merchant. */
  | 'not-in-city'
  /** §2.11.4 — a building this City does not have open. */
  | 'building-closed'
  /** §7.3.7 — a Legendary pick that names a relic the offer did not contain. */
  | 'not-offered'
  /** §2.9.4.1 — the Ring is not open for this: already run this visit, not entered, or no rung left. */
  | 'ring-closed' | 'nothing-to-restock'
  /** §2.11.5 — a Wheel stake outside the table's range or off its step. */
  | 'bad-stake';

export interface RunReduceResult {
  state: RunState;
  rejected?: RunRejectReason;
}

/** A team member as the combat sim wants it, tagged with the Box uid so results map back. */
export interface ActiveSetup extends TeamMemberSetup {
  uid: string;
}
