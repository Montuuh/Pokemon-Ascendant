// Public surface of the simulation core. UI, dev tooling and tests import from here only.
export * from './types';
export type * from './content/defs';
export * from './combat/battleConfig';
export * from './combat/statStages';
export * from './combat/typeChart';
export * from './combat/damage';
export * from './combat/state';
export type { CombatCtx } from './combat/context';
export { createCombat } from './combat/setup';
export { combatReducer, validateAction, type ReduceResult } from './combat/reducer';
export { cardPlayability, consumablePlayability, swapOptions, catchStatus, pickLeadOptions, stepBackOptions, effectiveApCost, type CardPlayability, type SwapOption, type ConsumablePlayability } from './combat/preview';
export { CATCH, catchOdds, catchRateOf, catchPercent, type CatchOdds } from './combat/catch';
export { predictIntentDamage, describeIntent } from './combat/intents';
export { currentPhase, phaseMarkers, bossArchetype } from './combat/boss';
export { slotOccupant, slotToIndex, indexToSlot, lead, benchIndices, aliveTeam, activeEnemy, findCombatant, SLOT_LABEL } from './combat/slots';
export { effectiveAttack, effectiveDefense, statAtLevel, effectiveMaxHp, hpFraction, isFainted, knownMoves, activeMoves } from './combat/stats';
export { cardsLocked, isPositionLocked, isImmuneToStatus, dotDamage } from './combat/status';
export { breakdownFor } from './combat/damageFlow';
export * from './rng/gameRng';
export * from './rng/rngStreams';
export * from './replay/replay';

// ── the run layer (§2)
export * from './run/types';
export { generateRegion, nodesInLayer, laneGymOf, drawGymPair, LAYERS, FORK_LAYER, biomeFor } from './run/map';
export { REGIONS, regionContent, regionName, ALL_TRAINERS, ALL_GYMS, ALL_ELITES, BIOMES_R2, TRAINERS_R2, GYMS_R2, ELITE_R2, ELITE_WILD_R2, LANE_THEME_R2, REGION2_BIOME_WEIGHTS, BIOMES_R3, TRAINERS_R3, GYMS_R3, ELITE_R3, ELITE_WILD_R3, LANE_THEME_R3, REGION3_BIOME_WEIGHTS, type RegionContent, type EliteDef, type EliteWildDef, BIOMES, TRAINERS, TRAINER_SPRITES, ELITE, ELITE_WILD, GYM, GYMS, LANE_THEME, gymById, rostersOf, eliteWildTeamFor, type GymDef, type LaneTheme, RUN_START, STARTER_IDS, WILD_LEVEL_BAND, ROUTE_LAYERS, gymTeamFor, TM_DROP_CHANCE, RELIC_DROP_CHANCE, HELD_ITEM_DROP_CHANCE, wildBandFor, trainerTeamFor, eliteTeamFor, REGION1_BIOME_WEIGHTS, REGION_LEVEL_OFFSET, REGION_STAT_TIER, STATUS_ACCENT_FROM, STATUS_ACCENT_MOVES, STATUS_ACCENT_FALLBACK, statTierFor, evolvedAt, type StatTier, assertRegionContent, type BiomeId, type BiomePool, type TrainerRoster } from './run/region';
export { createRun, runReducer, validateRunAction, newPartyMon, resetUidCounter, runHelpers, defaultRunCtx, validateKit, shopSlotName, effectiveMax, boxCapacity, boxFitsWithout, marketTakesRelic, abilityLocked, arriveAtCity, dojoPrice, isServiceNode, tutorListFor, RUN_SAVE_VERSION, DEFAULT_PERKS, type RunCtx } from './run/run';
// §2.1.4, §2.11 — the Cities between Regions.
export { CASINO, CITIES, REGION_COUNT, RING, casinoExpectedValue, cityAfter, isFinalRegion, type CityDef } from './run/cities';
export { SAFARI, afterTurn, canToss, coneOf, lineBlocked, notices, planOf, playerCanStand, rollHunt, rollSafari, throwOdds, tileAt, traitsOf, walkDistance, type MonPlan, type SafariOdds, type SafariTrait, type SafariTraits } from './run/safari';
export { BLACK_MARKET, SHOWCASE_CAP, atLegendaryCap, candyPrice, fencePrice, relicValue, rollBlackMarket, wagerChance } from './run/blackMarket';
export { activeSetups, buildRingScenario, buildScenario, maxHpOf } from './run/encounter';
export { AID_HEAL_PCT, MONEY_REWARD, PRICES, LEGENDARY_CAP, isOfferable, inPool, rollRelic, rollLegendaryOffer, rollHeldItem, ownedItems, relicMultiplier, benchXpShare, wildChoices, rollShopStock, rollRelicOffer, rarePickOpen, floorRestockable, rerollPrice, therapyPrice, sellPrice } from './run/economy';
export { MYSTERY_EVENTS, mysteryEvent, rollEvent, allOutcomes, assertEventContent, eventRiskOf, RISK_LABEL, type MysteryEvent, type EventChoice, type EventOutcome, type EventRisk } from './run/events';
export { MODIFIERS, AVAILABLE_MODIFIERS, modifierById, modifierValue, hasModifier, modifierXpMultiplier, battleConfigFor, type DifficultyModifier } from './run/modifiers';
export { activeRegionModifier, regionModifierValue, rollRegionModifierOffer, priceFor, traumaZone1Pct, victoryHealPct } from './run/regionModifiers';
export { DEFAULT_PROGRESSION, encounterXp, levelXpFactor, grantXp, xpToNext, isEvolutionReady, applyBranch, autoPickMoves, learnMove, previewBranch, stoneUse, stonesForBox, type ProgressionConfig, type BranchPreview } from './run/xp';
export { buildOutcomeReport } from './run/report';
export { FLEE_TOLL, fleeTierFor, describeToll, type FleeTier, type FleeToll } from './run/flee';
export { serialiseRun, deserialiseRun, describeSave, type SaveProvider, type SaveEnvelope, type LoadResult } from './run/save';

// §8.7 — achievements. Pure definitions and a pure fold; persistence is the app layer's (achievementStore).
export {
  ACHIEVEMENTS, MEDAL_XP, achievementById, applyMetaEvent, applyMetaEvents, emptyProgress, metaEventsFor,
  type AchievementDef, type AchievementProgress, type MedalTier, type MetaEvent,
} from './meta/achievements';

// §8.3–§8.6, §8.9, §8.10 — the account: Trainer XP, the track, Tokens, the Pokédex, Mastery, what is unlocked.
// Pure state and a pure fold; persistence is the app layer's (accountStore).
export {
  ACCOUNT_VERSION, MAX_LEVEL, REWARD_TRACK, TRACK_TOKENS, SHELVES, SHELF_ORDER, HUB_UPGRADE_LABEL, XP,
  emptyAccount, emptyDelta, xpForLevel, levelFor, levelProgress, trackTokensBetween, applyAccountEvent, applyAccountEvents, accountFromProgress,
  upgradeAccount, hasHubUpgrade, medalCount, lineOf,
  type AccountState, type AccountDelta, type AccountContext, type TrackReward, type ShelfId, type HubUpgrade, type LifetimeStats, type LegacyAccountFields, speciesMet } from './meta/account';
// §8.3.4, §8.4.1, §8.4.4 — the Poké Mart: shelves by level, prices in Tokens, cosmetics.
export {
  MART_PRICE, META_STARTERS, shelfOpen, discoveryShelf, martShelf, martPrice, martOwned, martPending, shelfItems, shopTotal, buy, wear,
  type MartItem, type MartError,
} from './meta/mart';
export { COSMETICS, COSMETIC_PRICE, cosmeticById, TITLE_ID_BY_NAME, type CosmeticDef, type CosmeticKind } from './meta/cosmetics';
export { DEX_FAMILIAR, DEX_TIER_XP, DEX_TIER_NAME, dexTierFor, dexNext, emptyDexEntry, normalizeDexEntry, isMet, UNMET_NAME, type DexTier, type DexEntry } from './meta/pokedex';
export { BOND, BOND_RANKS, BOND_RANK_NAME, BOND_LADDER, MAX_BOND_RANK, bondRank, bondProgress, bondUnlocks, isThreeStageLine, hiddenAbilityOf, type BondUnlocks } from './meta/bond';
export {
  relicTier, discoverableRelics, masteryRelics, relicUnlocked, relicPoolFor, discoveryProgress,
  modifierUnlocked, modifierSlots, unlockedStarters, masteryTierFor, twinRun, startingRelicOffers,
  defaultPerks, runPerksFor, accountContextFor,
} from './meta/unlocks';
export { masteryMoveFor, stageTierCap, MASTERY_DECK_CAP } from './meta/mastery';
