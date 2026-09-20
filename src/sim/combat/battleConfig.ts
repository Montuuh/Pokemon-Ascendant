// Per docs/design/04-resolution.md — every balance value the combat sim reads lives here, never inline.
// Web counterpart of the Unity BattleConfigSO. Values are canon unless a § says "tuned in playtest".
// Content overlays (difficulty modifiers, badges, region modifiers) derive a per-run BattleConfig; the sim
// only ever reads the instance it is given.
export interface BattleConfig {
  /** §4.1.1 — damage formula divisor. Unity shipped 8 after tuning (asset value); §4.1.1 keeps it a knob. */
  divisor: number;
  /** §4.1.2 — same-type attack bonus. */
  stabMultiplier: number;
  /** §4.1.3 — critical hit multiplier. Crit base chance is 0 %; sources stack additively. */
  critMultiplier: number;
  /** §3.6 — Ranged moves deal a fraction of Melee damage. */
  rangedModifier: number;
  meleeModifier: number;
  /** §4.2.6 (CL-002) — linear ±6 stat-stage ladder, index 0 = stage −6 … index 12 = stage +6. */
  statStageMultipliers: readonly number[];
  /** §3.2.2 — AP granted at Draw phase and its ceiling. */
  baseApPerTurn: number;
  maxApPerTurn: number;
  /** §3.2.2 — hand composition at Draw phase. */
  baseSkillCardsPerTurn: number;
  baseConsumableCardsPerTurn: number;
  /** §4.2 — status conditions (deterministic redesigns of Gen I RNG). */
  burnDotDivisor: number;
  burnAttackMultiplier: number;
  poisonDotDivisor: number;
  poisonDefenseMultiplier: number;
  paralysisApCostBonus: number;
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
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  divisor: 8,
  stabMultiplier: 1.5,
  critMultiplier: 1.5,
  rangedModifier: 0.75,
  meleeModifier: 1.0,
  statStageMultipliers: [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
  baseApPerTurn: 3,
  maxApPerTurn: 6,
  baseSkillCardsPerTurn: 5,
  baseConsumableCardsPerTurn: 2,
  burnDotDivisor: 16,
  burnAttackMultiplier: 0.75,
  poisonDotDivisor: 16,
  poisonDefenseMultiplier: 0.85,
  paralysisApCostBonus: 1,
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
};

