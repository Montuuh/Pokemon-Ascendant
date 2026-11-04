import type { ArenaRuleConfig } from './arenaRules';
import type { GymRuleConfig } from './gymRules';

// Per docs/design/04-resolution.md — every balance value the combat sim reads lives here, never inline.
// Web counterpart of the Unity BattleConfigSO. Values are canon unless a § says "tuned in playtest".
// Content overlays (difficulty modifiers, badges, region modifiers) derive a per-run BattleConfig; the sim
// only ever reads the instance it is given.
/** §4.1.3.1 — one side's rhythm curve. */
export interface RhythmCurve {
  k: number;
  minActs: number;
  maxActs: number;
  floorActs: number;
  ceilActs: number;
  /** Fill kept past a full meter, to start the next one: a big card that overshoots is not wasted (0: none). */
  carry: number;
}

export interface BattleConfig {
  /**
   * §4.1.1 — damage formula divisor. Unity shipped 8; v0.9.12 took it to 5 when enemies got their whole HP back; v0.9.93 to
   * 10 with the half-scale stats; v0.9.96 twice the series' 50, with the level term below in front of it.
   */
  divisor: number;
  /** §4.1.1 — the series' level term, slope × level + base (2L/5 + 2): a hit grows with its user's level as HP does. */
  levelTerm: { slope: number; base: number };
  /** §4.1.1 — the series' +2: every hit that is not immune does at least something before the multipliers. */
  damageFlat: number;
  /** §4.1.2 — same-type attack bonus. */
  stabMultiplier: number;
  /** §4.1.3 — critical hit multiplier. Crit base chance is 0 %; sources stack additively. */
  critMultiplier: number;
  /**
   * §4.1.3.1 — the critical rhythm: how many acts fill a Pokémon's meter, per side. A curve, not tiers (v0.9.80): the
   * species' level-free Speed gives `k / Speed` acts kept between `minActs` and `maxActs`; Speed stages and Paralysis then
   * scale that pace and the result is kept between `floorActs` and `ceilActs`. The enemy's reach is shorter at the slow end:
   * it acts once a turn where you play three cards, and the Rock Gym's slow walls must still cost Pokémon (v0.9.59).
   */
  critRhythm: { ally: RhythmCurve; enemy: RhythmCurve };
  /** §3.6 — Ranged moves deal a fraction of Melee damage. */
  rangedModifier: number;
  meleeModifier: number;
  /** §4.2.6 (CL-002) — linear ±6 stat-stage ladder, index 0 = stage −6 … index 12 = stage +6. */
  statStageMultipliers: readonly number[];
  /** §3.3.1.1 — Quick swap: a Pokémon faster than the enemy Lead steps in for this much less AP on every rung (floor 0). */
  quickSwapDiscount: number;
  /** §3.2.2 — AP granted at Draw phase and its ceiling. */
  baseApPerTurn: number;
  maxApPerTurn: number;
  /** §3.2.2 — hand composition at Draw phase. */
  baseSkillCardsPerTurn: number;
  /**
   * §3.5 — how many items the bag gives up in one turn. Since v0.8.6 the whole bag is open every turn (no draw);
   * this cap is what keeps a stack of Ethers from being a stack of AP. The name predates the bag.
   */
  baseConsumableCardsPerTurn: number;
  /** §4.2 — status conditions (deterministic redesigns of Gen I RNG). */
  burnDotDivisor: number;
  burnAttackMultiplier: number;
  poisonDotDivisor: number;
  poisonDefenseMultiplier: number;
  paralysisApCostBonus: number;
  /** §4.2.2.3 / §3.3.1.1 — Paralysis also halves Speed, so a paralysed Pokémon loses its quick swap. */
  paralysisSpeedMultiplier: number;
  paralysisDuration: number;
  sleepDuration: number;
  freezeDuration: number;
  freezeFireDamageMultiplier: number;
  confusionDuration: number;
  /** §5.3 — enemy AI scoring. */
  defaultUtilityWeight: number;
  lowTargetHpThreshold: number;
  lowTargetHpMultiplier: number;
  lowSelfHpThreshold: number;
  aggressiveSelfMultiplier: number;
  highSelfHpThreshold: number;
  setupSelfMultiplier: number;
  randomnessFloorChance: number;
  bossCounterIntelTopPenalty: number;
  /** §5.8.3 — boss phases. */
  bossPhase2HpThreshold: number;
  bossPhase3HpThreshold: number;
  bossPhaseAggressionMultiplier: number;
  /** §5.9.4 (CL-013) — Phase-2 archetype knobs. */
  phase2EntrenchmentDefStages: number;
  phase2TempoApTax: number;
  /** §6.5.3.4 — Blaze/Torrent/Overgrow. */
  abilityLowHpThreshold: number;
  abilityLowHpBoostMultiplier: number;
  /** §8.2 — Trauma: −5 % EffectiveMaxHP per stack, cap 5. */
  /** §8.2.1 zone 1 — percent of max HP lost per stack, stacks 1..traumaZone1Stacks. */
  traumaZone1PenaltyPercent: number;
  traumaZone1Stacks: number;
  /** §8.2.1 zone 2 — the steeper band, up to traumaStackCap. */
  traumaZone2PenaltyPercent: number;
  traumaStackCap: number;
  /** §2.6.4 — enemy AI never targets a bench slot that is empty; how many bench slots exist. */
  benchSlots: number;
  /** §5.6 — the most enemies that can stand on the field at once, whatever calls for help. */
  maxOnField: number;
  /** §5.6.1 — the AP a Pokémon that acts twice spends on its two actions together (v0.9.12): two light moves, never two heavy ones. */
  doubleActionApBudget: number;
  /** §5.6.1 — the same budget for a Gym Leader's ace, which may pair a heavy move with a light one. */
  doubleActionApBudgetBoss: number;
  /** §5.6.1 — the share of its Max HP that, dealt to it in one of your turns, breaks its second action. */
  comboBreakShare: number;
  /** §5.6.2 — a Call for Help is worth more to a Pokémon standing alone. */
  summonAloneMultiplier: number;
  /** §5.6 — a Defender covers its Lead once the Lead is at or under this share of its HP, and gains this Defence. */
  coverLeadHp: number;
  coverDefenseStages: number;
  /** §4.3.1–§4.3.2 — Sun and Rain: the boosted type's multiplier and the damped one's. */
  weatherBoost: number;
  weatherDamp: number;
  /** §4.3.3 — Electric Terrain on Electric moves into a grounded target. */
  electricTerrainBoost: number;
  /** §4.3.4 — Sandstorm: the share of Max HP it takes at the end of each turn. */
  sandstormPercent: number;
  /** §4.3.5 — a Home Field on the enemy's own type. */
  homeFieldBoost: number;
  /** §4.3.8 — Hail: the share of Max HP it takes at the end of each turn from everyone but the Ice-types. */
  hailPercent: number;
  /** §4.3.9 / §4.3.10 — Grassy and Psychic Terrain on their own type from a grounded attacker. */
  typeTerrainBoost: number;
  /** §4.3.9 — Grassy Terrain: the share of Max HP a grounded Pokémon gets back at the end of each turn. */
  grassyHealPercent: number;
  /** §4.3.13 — Sticky Web: the Speed stages a Pokémon loses stepping into the Lead. */
  stickyWebStages: number;
  /** §3.11 — the move keywords' numbers that are not on the move itself. */
  keywords: {
    /** §3.11.6 — Reflect and Light Screen: damage of their range into their side is multiplied by this. */
    screenMultiplier: number;
    /** §3.11.7 — the turns a matching rock adds to a field a move sets (Damp, Heat, Icy, Smooth Rock). */
    rockExtraTurns: number;
    /** §3.11.13 — a weather-scaled heal: ×`sun` under Sun, ×`other` under any other weather. */
    weatherHeal: { sun: number; other: number };
    /** §3.11.4 — the base Defence at which a Guard move's power blocks a hit of that power one for one. */
    guardReferenceDefence: number;
  };
  /**
   * §6.3.9 — Friendship in a fight: the scale's top (Return's full power), the value from which a Pokémon holds on at 1 HP
   * once a fight (§7.3.6), and the value Return reads for a Pokémon that brings none (an enemy, a fixture's).
   */
  friendship: { max: number; endure: number; foe: number };
  /**
   * §5.3.1 — how an enemy weighs the move keywords: a stance's score (against an attack's power) and when it is worth
   * it, and what a charge's warning and an ultimate's recharge take off a hit's score.
   */
  keywordAi: {
    protect: number; protectIdle: number; protectBelowHp: number;
    endure: number; endureBelowHp: number;
    guard: number; substitute: number; counter: number; screen: number; fieldSet: number;
    charge: number; recharge: number;
    /** A move that takes this share of its hit back or more is a sacrifice: worth this much while the enemy is healthy. */
    sacrificeRecoil: number; sacrificeHealthy: number;
  };
  /**
   * §5.2.3 — the disruption numbers: what a Spike or a Stealth Rock takes from the Lead stepping on it (× Rock's
   * effectiveness for the rock; they stay for the fight), and what Perish Song's last note takes from both Leads.
   */
  disruption: { hazardPercent: number; perishPercent: number };
  /**
   * §5.3.2 — how an enemy weighs a disruption move (against an attack's power), and a debuff's decay: a debuff on a
   * target already that far down is worth this much less per stage.
   */
  disruptAi: {
    disable: number; taunt: number; forceSwap: number; trap: number; drowsy: number; perish: number; seed: number;
    hazard: number; haze: number; helpingHand: number; teamDebuff: number;
  };
  /**
   * §5.5.2 — combos: an enemy opens one when its set-up plus `followWeight` × what it sets up beats its best single move;
   * after one runs or is broken it waits `rest` turns before the next.
   */
  combo: { followWeight: number; rest: number };
  /** §5.9.5 — the Gym Leaders' rules. */
  gymRules: GymRuleConfig;
  /** §2.12.2.1 — the Legendaries' arena rules. */
  arenaRules: ArenaRuleConfig;
  /**
   * §5.6.5 — fights with another objective: a hold-out's guard gains this many Attack stages at the end of every
   * turn, and on the last turn it telegraphs its finisher if its kit holds it (Rhydon's Horn Drill).
   */
  objectives: { guardEscalation: number; guardFinisher: string };
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  // §4.1.1 — the series' damage formula since v0.9.96, ((2L/5 + 2) × Power × Atk/Def) / D + 2, with the series' stats
  // (§6.2.3). D is twice the series' 50: a turn here plays two or three hits where the series plays one, and at 100 a
  // fight lasts the turns it did before (the fixtures' table) while it no longer stretches as both sides level.
  // At 70 every side is deadlier and the auto-player's Region 1 and Ring fell (7 %, 0.13): the early pace is the
  // third card's and the first catch's job (§6.9, §2.6.4.5), not the divisor's.
  divisor: 100,
  levelTerm: { slope: 0.4, base: 2 },
  damageFlat: 2,
  doubleActionApBudget: 3,
  doubleActionApBudgetBoss: 4,
  comboBreakShare: 0.25,
  stabMultiplier: 1.5,
  critMultiplier: 1.5,
  // A curve instead of tiers, so Speed stages and Paralysis move the rhythm. Allies fill by the AP their cards cost, printed: 260 / Speed
  // AP, between 2 and 5 (Speed 130+ fills in 2 AP, 65 in 4, 52 or less in 5); a stage or Paralysis then scales it, down to 2 and up to 10.
  // The constant is the one that keeps the old per-card pace's crits a run over the auto-player's runs (11.0 against 11.5): it plays
  // 0.8 AP a card, so 4.7 cards were ~3.9 AP. Enemies fill per action: 270 / Speed, between 2 and 4 (Speed 90 fills in 3), to a ceiling of 8.
  critRhythm: {
    ally: { k: 260, minActs: 2, maxActs: 5, floorActs: 2, ceilActs: 10, carry: 0.5 },
    enemy: { k: 270, minActs: 2, maxActs: 4, floorActs: 2, ceilActs: 8, carry: 0 },
  },
  rangedModifier: 0.75,
  meleeModifier: 1.0,
  statStageMultipliers: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
  quickSwapDiscount: 1,
  baseApPerTurn: 3,
  maxApPerTurn: 6,
  baseSkillCardsPerTurn: 5,
  baseConsumableCardsPerTurn: 2,
  burnDotDivisor: 16,
  burnAttackMultiplier: 0.75,
  poisonDotDivisor: 16,
  poisonDefenseMultiplier: 0.85,
  paralysisApCostBonus: 1,
  paralysisSpeedMultiplier: 0.5,
  paralysisDuration: 3,
  sleepDuration: 1,
  freezeDuration: 1,
  freezeFireDamageMultiplier: 1.5,
  confusionDuration: 3,
  defaultUtilityWeight: 50,
  lowTargetHpThreshold: 0.3,
  lowTargetHpMultiplier: 2.0,
  lowSelfHpThreshold: 0.4,
  aggressiveSelfMultiplier: 1.5,
  highSelfHpThreshold: 0.7,
  setupSelfMultiplier: 1.5,
  randomnessFloorChance: 0.125,
  bossCounterIntelTopPenalty: 0.7,
  bossPhase2HpThreshold: 0.5,
  bossPhase3HpThreshold: 0.2,
  bossPhaseAggressionMultiplier: 1.5,
  phase2EntrenchmentDefStages: 2,
  phase2TempoApTax: 1,
  abilityLowHpThreshold: 0.3,
  abilityLowHpBoostMultiplier: 1.2,
  traumaZone1PenaltyPercent: 5,
  traumaZone1Stacks: 5,
  traumaZone2PenaltyPercent: 10,
  traumaStackCap: 10,
  benchSlots: 2,
  maxOnField: 3,
  summonAloneMultiplier: 2,
  coverLeadHp: 0.35,
  coverDefenseStages: 1,
  weatherBoost: 1.5,
  weatherDamp: 0.5,
  electricTerrainBoost: 1.3,
  sandstormPercent: 0.03,
  homeFieldBoost: 1.2,
  hailPercent: 0.03,
  typeTerrainBoost: 1.3,
  grassyHealPercent: 0.03,
  stickyWebStages: 1,
  // §3.11 — the series' 0.66 for a screen in a double battle (this game's three-a-side field is closer to doubles than
  // singles' 0.5), and its two extra turns for a rock: 3 + 2 is the series' own 5 + 3 scaled to these longer turns.
  // Guard's reference is the roster's mean base Defence, so an average wall's Withdraw blocks the hit its power names.
  keywords: { screenMultiplier: 0.66, rockExtraTurns: 2, weatherHeal: { sun: 2, other: 0.5 }, guardReferenceDefence: 70 },
  // §6.3.9 — the series' scale and start; X/Y's "toughed it out" at the top of it; a foe's Return at a trainer's fondness.
  friendship: { max: 255, endure: 255, foe: 160 },
  // §5.3.1 — a stance scores against an attack's power (a 1-AP hit is 40–55): Protect is the hurt enemy's play, a
  // screen or a field one it makes once, a guard a weak turn. Measured on the harness with the v0.9.89 kits.
  keywordAi: {
    protect: 90, protectIdle: 15, protectBelowHp: 0.5,
    endure: 70, endureBelowHp: 0.25,
    guard: 35, substitute: 45, counter: 35, screen: 55, fieldSet: 60,
    charge: 0.75, recharge: 0.7,
    // v0.9.89: with no card above 3 AP, Explosion became affordable and a healthy Golem opened with it (a 5-turn boss).
    sacrificeRecoil: 0.5, sacrificeHealthy: 0.4,
  },
  // §5.2.3 — the series' 1/8 for a Spike and a Stealth Rock (neutral), for the fight; Perish Song's half (the series' faint,
  // softened for a fight of three: it is a clock to answer, not a kill).
  disruption: { hazardPercent: 0.125, perishPercent: 0.5 },
  // §5.3.2 — a disruption move scores against an attack's power (a 1-AP hit is 40–55, a 2-AP 65–80): worth a good hit when
  // its condition holds, nothing when it would do nothing. Measured on the harness with the v0.9.92 kits.
  // §5.5.2 — the plan's §4.4: step 1 + 0.8 × step 2; a turn between combos, so the boss is not only its combo.
  combo: { followWeight: 0.8, rest: 2 },
  disruptAi: { disable: 55, taunt: 55, forceSwap: 60, trap: 35, drowsy: 65, perish: 60, seed: 65, hazard: 55, haze: 30, helpingHand: 55, teamDebuff: 55 },
  // §5.9.5 — the Leaders' rules, measured on the whole-run harness with every Gym (v0.9.13).
  gymRules: {
    rockSolidCap: 0.5,
    riptideEvery: 2,
    swarmPerWaiting: 0.2,
    rolloutPerTurn: 0.25,
    rolloutMaxTurns: 4,
    meltdownFloor: -2,
    bloomHeal: 0.08,
    overchargeAp: 1,
    overchargeEvery: 2,
    tremorEvery: 3,
    tremorPercent: 0.05,
    mindLockEvery: 2,
    closeQuartersRanged: 0.7,
    closeQuartersMelee: 1.1,
    iceArmour: 0.04,
    synergyPerFallen: 0.05,
    synergyCap: 0.2,
  },
  // §2.12.2.1 — the arena rules: first values (v0.9.21), for the balance pass.
  arenaRules: {
    rekindleAt: 0.2,
    rekindleHeal: 0.25,
    barrierEvery: 3,
    barrierTaken: 0.5,
  },
  objectives: { guardEscalation: 1, guardFinisher: 'horn-drill' },
};

