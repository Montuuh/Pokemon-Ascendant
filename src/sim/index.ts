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
export { cardPlayability, consumablePlayability, swapOptions, catchStatus, catchOptions, catchTarget, canReach, aimsAtFoe, pickLeadOptions, stepBackOptions, effectiveApCost, type CardPlayability, type CardTarget, type SwapOption, type ConsumablePlayability } from './combat/preview';
export { CATCH, catchOdds, catchRateOf, catchPercent, type CatchOdds } from './combat/catch';
export { predictIntentDamage, describeIntent, intentRecipient, summonCount, summonedBy } from './combat/intents';
export { forecastTurn, forecastOn, forecastIfLead, asLeadDamage, type TurnForecast, type IntentForecast, type ForecastHit, visibleMoot } from './combat/forecast';
export { phaseMarkers, bossArchetype } from './combat/boss';
export { ARENA_RULE_IDS, METRONOME_FIELDS, arenaCounter, arenaRuleOf, barrierUp, metronomeNext, type ArenaRuleId, type ArenaCounter, type ArenaRuleConfig } from './combat/arenaRules';
export { LEAGUE, LEAGUE_MEMBERS, championAce, generateLeague, leagueBase, leagueMemberOf, leaguePreview, leagueTeam, microRestPct, type LeagueMember } from './run/league';
export { ACTIVE_TEAM, APEX, LEGENDARY_ARENAS, LEGENDARY_IDS, fillTeam, hasPlaceFor, isLegendarySpecies, joinTeam, legendariesOpen, placeInTeam, placesOf, placesTaken, type LegendaryArena, type LegendaryId } from './run/legendaries';
export { GYM_RULE_IDS, rolloutTurns, ruleCounter, synergyMultiplier, turnsUntil, isSealed, type GymRuleId, type GymRuleConfig, type RuleCounter } from './combat/gymRules';
export { slotOccupant, slotToIndex, indexToSlot, lead, benchIndices, aliveTeam, activeEnemy, aliveEnemies, isEnemyLead, resolutionOrder, enemySlotLabel, findCombatant, SLOT_LABEL } from './combat/slots';
export { markRhythm, rhythmActs, rhythmFillOf, rhythmLeft, rhythmModifier, rhythmReady, rhythmSpeed, spendsRhythm, type RhythmFill } from './combat/rhythm';
export { effectiveAttack, effectiveDefense, effectiveSpeed, outspeeds, statAtLevel, baseOfStat, STAT_FORMULA, effectiveMaxHp, hpFraction, isFainted, knownMoves, activeMoves } from './combat/stats';
export { cardsLocked, isPositionLocked, isImmuneToStatus, dotDamage, controlRecoveryThrough } from './combat/status';
export { breakdownFor } from './combat/damageFlow';
export * from './rng/gameRng';
export * from './rng/rngStreams';
export * from './replay/replay';

// ── the run layer (§2)
export * from './run/types';
export { completedRegions } from './run/progress';
export { generateRegion, wildOdds, WILD_RARE_CHANCE, nodesInLayer, nodesAhead, laneGymOf, drawGymPair, noReturnLayer, LAYERS, Y_LAYER, MAP_ROWS, TRACK_GAP, biomeFor } from './run/map';
export { REGIONS, regionContent, regionName, ALL_TRAINERS, ALL_GYMS, ALL_ELITES, BIOMES_R2, TRAINERS_R2, GYMS_R2, ELITE_R2, ELITE_WILD_R2, LANE_THEME_R2, REGION2_BIOME_WEIGHTS, BIOMES_R3, TRAINERS_R3, GYMS_R3, ELITE_R3, ELITE_WILD_R3, LANE_THEME_R3, REGION3_BIOME_WEIGHTS, type RegionContent, type EliteDef, type EliteWildDef, BIOMES, TRAINERS, TRAINER_SPRITES, ELITE, ELITE_WILD, GYM, GYMS, LANE_THEME, gymById, rostersOf, eliteWildTeamFor, type GymDef, type LaneTheme, RUN_START, STARTER_IDS, isStarterLine, WILD_LEVEL_BAND, ROUTE_LAYERS, gymTeamFor, gymTeamOf, legacyGymTeamFor, GYM_ROSTER, type GymMember, type GymFielded, TM_DROP_CHANCE, HELD_ITEM_DROP_CHANCE, wildBandFor, trainerTeamFor, eliteTeamFor, REGION1_BIOME_WEIGHTS, REGION_LEVEL_OFFSET, REGION_STAT_TIER, GREATER_THREATS_ATTACK, WALL_GUARD_REGIONS, WILD_TIER_ODDS, WILD_TIERS, type WildTier, STATUS_ACCENT_FROM, STATUS_ACCENT_MOVES, STATUS_ACCENT_FALLBACK, statTierFor, evolvedAt, type StatTier, assertRegionContent, type BiomeId, type BiomePool, type TrainerRoster } from './run/region';
export { rememberedMoves, createRun, runReducer, validateRunAction, newPartyMon, mintUid, resetUidCounter, runHelpers, defaultRunCtx, validateKit, shopSlotName, effectiveMax, boxCapacity, boxFitsWithout, marketTakesRelic, abilityLocked, arriveAtCity, dojoPrice, evolutionResume, friendshipScale, eggMovesFor, isServiceNode, tutorListFor, RUN_SAVE_VERSION, DEFAULT_PERKS, type RunCtx } from './run/run';
// §2.1.4, §2.11 — the Cities between Regions.
export { CASINO, CITIES, REGION_COUNT, RING, betChance, casinoExpectedValue, cityAfter, pocketColour, isFinalRegion, type CityDef } from './run/cities';
export { SAFARI, afterTurn, canToss, coneOf, lineBlocked, notices, planOf, playerCanStand, rollHunt, rollSafari, throwOdds, tileAt, traitsOf, walkDistance, type MonPlan, type SafariOdds, type SafariTrait, type SafariTraits } from './run/safari';
export { BLACK_MARKET, candyPrice, showcaseLevel, fencePrice, relicValue, rollBlackMarket, wagerChance } from './run/blackMarket';
export { activeSetups, buildRingScenario, buildScenario, maxHpOf } from './run/encounter';
export { AID_HEAL_PCT, MONEY_REWARD, PRICES, LEGENDARY_CAP, isOfferable, inPool, offerPool, startingRelicFits, rollRelic, rollLegendaryOffer, rollHeldItem, ownedItems, relicMultiplier, benchXpShare, wildRolls, rollShopStock, slotPrice, RELIC_PREMIUM, rollRelicOffer, rarePickOpen, floorRestockable, rerollPrice, therapyPrice, sellPrice, evolveItemsForBox } from './run/economy';
export { usableInField, fieldUseRefusal, applyFieldItem, type FieldUseRefusal } from './run/fieldItems';
export { FIGHT_SUPPLIES, SUPPLY_TABLE, PRIZE_TABLE, RELIC_REWARD, rollFightSupplies, rollMixedOffer, gymRelicOffer, drawSupplies, SERVICE_GIFTS, serviceGift, GROUND_FINDS, rollGroundFind, type GroundFind, countSupplies, supplyLabel, ballsIn, pokeBalls, POKE_BALL } from './run/rewards';
export { MYSTERY_EVENTS, mysteryEvent, rollEvent, allOutcomes, assertEventContent, eventRiskOf, RISK_LABEL, type MysteryEvent, type EventChoice, type EventOutcome, type EventRisk } from './run/events';
export { MODIFIERS, AVAILABLE_MODIFIERS, modifierById, modifierValue, hasModifier, modifierXpMultiplier, battleConfigFor, type DifficultyModifier } from './run/modifiers';
export { activeRegionModifier, regionModifierValue, rollRegionModifierOffer, regionModifierOffer, REGION_MODIFIERS_ON, priceFor, traumaZone1Pct, victoryHealPct } from './run/regionModifiers';
export { DEFAULT_PROGRESSION, encounterXp, levelXpFactor, grantXp, levelPush, xpToNext, isEvolutionReady, readyBranches, evolveMethod, befriend, applyBranch, autoPickMoves, learnMove, previewBranch, stoneUse, stonesForBox, type ProgressionConfig, type FriendshipConfig, type BranchPreview } from './run/xp';
export { buildOutcomeReport } from './run/report';
export { GYM_FIELD, laneField, fieldsFor, applyFields } from './run/battlefields';
export { FIELD_CATEGORY, battlefields, fieldsSuppressed, isGrounded, type FieldId, type FieldState } from './combat/fields';
export { SHINY, shinyChance, applyShiny } from './run/shiny';
export { rollWild, wildChances, wildChancesFor, wildFor, teamHasOwnTypeHit, type WildRoll } from './run/wild';
export { forgottenMoves, kitPaths, learnInto, MOVE_CAP, reminderOptions } from './combat/kit';
export { branchPayload, type BranchPayload } from './run/xp';
export { listPrice, type PricedKind } from './run/economy';
export { itemSources, type ItemSources } from './run/rewards';
export { GROUP_RATES, groupPlanFor, applyGroups, type GroupPlan, type GroupRates } from './run/groups';
export { FLEE_TOLL, fleeTierFor, describeToll, type FleeTier, type FleeToll } from './run/flee';
export { FLEE_RACE, HOLD_OUT, guardById, holdPrizeLine, runnerById, runnerRewardLine, type GuardDef, type HoldPrize, type RunnerDef, type RunnerReward } from './run/objectives';
export { objectiveTurnsLeft } from './combat/objective';
export { teamStats, matchupAgainst, matchupAgainstSpecies, type TeamStats, type Matchup } from './run/team';
export { FIND_REEL, REEL_SHAPE, buildReel, placeReels, prizeLabel, reelChances, spinReel } from './run/finds';
export { TRADER, TRADER_PREVIEW, rollTradeOffers, tradeLevel, tradeRefusal, type TradeOffer } from './run/trader';
export { GATES, ROUTE_FEATURES, gateOn, partyClears, stepOpen } from './run/routeFeatures';
export { VICTORY_ROAD, TRAINING_UPGRADES, TRAINING_PREVIEW, SUMMIT_PREVIEW, generateVictoryRoad, apexPreview, trainingOptions, perfectClearBadge, victoryRoadLevel, type TrainingUpgrade } from './run/victoryRoad';
export { serialiseRun, deserialiseRun, describeSave, type SaveProvider, type SaveEnvelope, type LoadResult } from './run/save';

// §8.7 — achievements. Pure definitions and a pure fold; persistence is the app layer's (achievementStore).
export {
  ACHIEVEMENTS, MEDAL_XP, achievementById, applyMetaEvent, applyMetaEvents, emptyProgress, metaEventsFor,
  type AchievementDef, type AchievementProgress, type MedalTier, type MetaEvent, type HallTeamMember,
} from './meta/achievements';

// §8.3–§8.10, §8.14, §8.15 — the account: Trainer XP and Rank, Research and Oak's Parcels, Tokens, the Kit, the
// Pokédex, the Bond, the Journal, the Badge Case, the League Ladder and the Hall of Fame.
// Pure state and a pure fold; persistence is the app layer's (accountStore).
export {
  ACCOUNT_VERSION, MAX_LEVEL, REWARD_TRACK, TOKENS, tokensForMoney, SHELVES, SHELF_ORDER, HUB_UPGRADE_LABEL, KIT, XP, AIDES, REPORT_LINES, STARS, HALL_SIZE, PIN_LIMIT,
  emptyAccount, emptyDelta, mergeDelta, xpForLevel, levelFor, levelProgress, trackTokensBetween, applyAccountEvent, applyAccountEvents,
  upgradeAccount, hasHubUpgrade, isKitPerk, kitSlots, packKit, takeParcel, pinEntry, medalCount, lineOf, speciesOwned, starsOf, speciesMet,
  type AccountState, type AccountDelta, type AccountContext, type TrackReward, type ShelfId, type HubUpgrade, type HubUpgradeRow, type LifetimeStats,
  type ReportLine, type AideRow, type HallEntry, type StarId,
} from './meta/account';
export { RANKS, MAX_RANK, rankRow, rankFor, rankProgress, xpForRank, kitSlotsFor, parcelChoicesFor, KIT_SLOT_RANKS, ARRIVAL_RANK, type RankRow } from './meta/rank';
// §8.6 — the vault and Oak's Parcels.
export {
  VAULT, PLATES, LEADER_TM, PARCEL, vaultEntry, vaultEntryFor, lockedKeys, isVaulted, parcelPool, parcelCost, parcelOffer, vaultCard,
  type VaultEntry,
} from './meta/vault';
export { lockKey, isLocked, lockedIds, type LockKind } from './run/locks';
// §8.7 — the Trainer Journal.
export {
  MEDAL_TOKENS, JOURNAL_COSMETICS, JOURNAL_SHELVES, journalReward, journalEntries, nextGoals, noteId,
  type JournalReward, type JournalShelf, type JournalEntry,
} from './meta/journal';
// §8.8.5 — the League Ladder.
export { LADDER, LADDER_TOP, LADDER_PRIZE, ladderModifiers, ladderRungOf } from './meta/ladder';
// §8.3.4, §8.4.1, §8.4.4 — the Poké Mart: shelves by rank, prices in Tokens, cosmetics.
export {
  MART_PRICE, META_STARTERS, shelfOpen, martShelf, martPrice, martOwned, martPending, shelfItems, shopTotal, buy, wear,
  type MartItem, type MartError,
} from './meta/mart';
export { COSMETICS, COSMETIC_PRICE, cosmeticById, type CosmeticDef, type CosmeticKind } from './meta/cosmetics';
export { DEX_FAMILIAR, DEX_TIER_XP, DEX_TIER_NAME, dexTierFor, dexNext, emptyDexEntry, normalizeDexEntry, isMet, UNMET_NAME, type DexTier, type DexEntry } from './meta/pokedex';
export {
  BOND, BOND_TIER, BOND_RANKS, BOND_RANK_NAME, BOND_LADDER, MAX_BOND_RANK, PARTNER_START_LEVELS, RIBBONS, bondRank, bondProgress, bondUnlocks, hiddenAbilityOf,
  type BondUnlocks, type RibbonId,
} from './meta/bond';
export {
  relicUnlocked, relicPoolFor, ladderOpen, nextRung,
  modifierUnlocked, modifierSlots, unlockedStarters, masteryTierFor, twinRun, startingRelicOffers,
  defaultPerks, runPerksFor, accountContextFor,
} from './meta/unlocks';
export { masteryMoveFor, stageTierCap, MASTERY_DECK_CAP } from './meta/mastery';
export { progressNotes, type ProgressNote } from './meta/progress';
export { DOUBLE_ACTION, doubleActorFor, doubleActorIndices, applyDoubleAction, type DoubleActionRules, type DoubleActor } from './run/doubleAction';
export { comboBreakAt, comboBreakLeft, doubleActionBudget } from './combat/combo';
export { cardDisabled, forcedSwapTarget, isTaunted, isTrapped, moveDisabled, sideHazardDamage } from './combat/disruption';
// §3.11 — the move keywords' read-only selectors for the screen.
export { isShielded, keywordLocksPosition, ppLeft, sideHas } from './combat/keywords';
