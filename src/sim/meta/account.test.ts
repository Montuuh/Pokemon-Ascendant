import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import {
  ACCOUNT_VERSION, AIDES, applyAccountEvent, applyAccountEvents, emptyAccount, hasHubUpgrade, HUB_UPGRADE_LABEL, KIT, kitSlots, levelFor, levelProgress,
  packKit, pinEntry, PIN_LIMIT, REWARD_TRACK, SHELVES, starsOf, takeParcel, TOKENS, tokensForMoney, trackTokensBetween, upgradeAccount, XP, xpForLevel,
  type AccountContext, type AccountState, type HubUpgrade,
} from './account';
import { dexTierFor, DEX_FAMILIAR, emptyDexEntry } from './pokedex';
import { BOND, BOND_RANKS, BOND_TIER, bondRank, MAX_BOND_RANK } from './bond';
import { accountContextFor, ladderOpen, modifierUnlocked, nextRung, relicPoolFor, runPerksFor, unlockedStarters } from './unlocks';
import { shelfOpen } from './mart';
import { ACHIEVEMENTS, MEDAL_XP, type MetaEvent } from './achievements';
import { COSMETICS } from './cosmetics';
import { journalReward, MEDAL_TOKENS, nextGoals, noteId } from './journal';
import { ladderModifiers, ladderRungOf, LADDER, LADDER_PRIZE, LADDER_TOP } from './ladder';
import { kitSlotsFor, MAX_RANK, parcelChoicesFor, RANKS, rankFor } from './rank';
import { LEADER_TM, PARCEL, parcelCost, parcelOffer, parcelPool, VAULT, vaultEntryFor } from './vault';
import { lockKey } from '../run/locks';
import { createRun, defaultRunCtx } from '../run/run';
import { offerPool, ownedItems, tmsFor } from '../run/economy';
import { RUN_START } from '../run/region';
import { MYSTERY_EVENTS } from '../run/events';

// §8.3–§8.10, §8.14, §8.15 — the account fold. Every number here is the canon's; the tests pin the shape, not the tuning.

const content = buildRegistry();
const ctx: AccountContext = accountContextFor(content);
/** An account that has already earned the one-shot medals and notes a first fight would trip, so XP reads clean. */
const seasoned = (): AccountState => {
  const a = emptyAccount();
  a.achievements.unlocked.push('first-blood', 'gotcha', 'growing-up', 'badge-collector', 'untouchable', 'swap-maestro', 'flawless-gym', 'champion', 'underdog', 'pacifists-path', 'minimalist');
  a.notes.push(...content.allRelics().filter((r) => r.discovery).map((r) => r.id));
  return a;
};
const win = (over: Partial<Extract<MetaEvent, { t: 'combat-end' }>> = {}): MetaEvent => ({ t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 5, manualSwaps: 0, faints: 0, defeated: [], activeSpecies: [], ...over });
const runEnd = (over: Partial<Extract<MetaEvent, { t: 'run-end' }>> = {}): MetaEvent => ({ t: 'run-end', won: false, catches: 1, badges: 0, layersCleared: 0, ...over });
const fold = (a: AccountState, ...events: MetaEvent[]) => applyAccountEvents(a, events, ctx);

describe('The Trainer Rank — §8.3.3', () => {
  it('RankFor_FollowsTheTable_NineRanks', () => {
    expect(MAX_RANK).toBe(9);
    expect(levelFor(0)).toBe(1);
    for (const row of RANKS.slice(1)) {
      expect(rankFor(row.xp - 1)).toBe(row.rank - 1);
      expect(rankFor(row.xp)).toBe(row.rank);
    }
    expect(levelFor(10 ** 9)).toBe(MAX_RANK);
    // The first four ranks sit inside the first handful of runs (~550 XP a run).
    expect(xpForLevel(2)).toBeLessThanOrEqual(350);
    expect(xpForLevel(4)).toBeLessThanOrEqual(2_500);
  });

  it('RankProgress_IsAFractionOfTheCurrentRank', () => {
    const p = levelProgress(xpForLevel(2) + 100);
    expect(p.level).toBe(2);
    expect(p.into).toBe(100);
    expect(p.span).toBe(xpForLevel(3) - xpForLevel(2));
    expect(levelProgress(10 ** 9).fraction).toBe(1);
  });

  it('EveryRankPaysItsPurse_Once_AndThreeOpenAKitSlot', () => {
    const a = seasoned();
    a.xp = xpForLevel(4) - 1;
    const { state, delta } = fold(a, win());
    expect(delta.levelsGained).toEqual([4]);
    // Self-healing: ranks 2 and 3 were never claimed and are paid with it.
    expect(state.claimedLevels).toEqual([2, 3, 4]);
    expect(delta.rewards.reduce((n, r) => n + r.reward.tokens, 0)).toBe(trackTokensBetween(1, 4));
    const again = fold(state, win());
    expect(again.delta.rewards).toEqual([]);
    expect([1, 3, 4, 5, 6, 7, 9].map(kitSlotsFor)).toEqual([0, 0, 1, 2, 2, 3, 3]);
    expect(parcelChoicesFor(5)).toBe(3);
    expect(parcelChoicesFor(6)).toBe(4);
    for (let r = 2; r <= MAX_RANK; r++) expect(REWARD_TRACK[r]!.arrives.length).toBeGreaterThan(3);
  });
});

describe('Trainer XP and the Field Report — §8.3.2, §8.3.6', () => {
  it('AFightWon_PaysFiveXp_OnTheFightsLine', () => {
    const { delta } = fold(seasoned(), win());
    expect(delta.xp).toBe(XP.combat);
    expect(delta.xpBy).toEqual({ fights: XP.combat });
  });

  it('TheRunsMultiplier_RidesOnEveryXp', () => {
    const { delta } = applyAccountEvents(seasoned(), [win()], accountContextFor(content, 1.5));
    expect(delta.xp).toBe(Math.round(XP.combat * 1.5));
  });

  it('ASpeciesNeverMet_IsADiscovery_Once', () => {
    const a = seasoned();
    const first = fold(a, win({ enemies: ['pidgey', 'rattata'] }));
    expect(first.delta.xpBy.discoveries).toBe(2 * XP.newSpecies);
    const second = fold(first.state, win({ enemies: ['pidgey'] }));
    expect(second.delta.xpBy.discoveries).toBeUndefined();
  });

  it('AFailedRun_PaysForTheDistance_Capped', () => {
    expect(fold(seasoned(), runEnd({ layersCleared: 3 })).delta.xpBy.distance).toBe(3 * XP.failedRunPerLayer);
    expect(fold(seasoned(), runEnd({ layersCleared: 40 })).delta.xpBy.distance).toBe(XP.failedRunCap);
    expect(fold(seasoned(), runEnd({ won: true, layersCleared: 40 })).delta.xpBy.distance).toBeUndefined();
  });

  it('TheRunsEnd_TurnsItsXpAndItsMoneyIntoTokens_AndStartsANewCount', () => {
    const a = seasoned();
    a.runXp = 5 * TOKENS.perRunXp + 10;
    const { state, delta } = fold(a, runEnd({ layersCleared: 2, moneyLeft: 3 * TOKENS.moneyPer + 50 }));
    // The distance XP is the run's too: it is counted before the Tokens are.
    expect(delta.reportTokens).toBe(Math.floor((5 * TOKENS.perRunXp + 10 + 2 * XP.failedRunPerLayer) / TOKENS.perRunXp));
    expect(delta.moneyTokens).toEqual([{ money: 350, tokens: 3 }]);
    expect(state.runXp).toBe(0);
    expect(tokensForMoney(10_000)).toBe(TOKENS.moneyCap);
    expect(tokensForMoney(-5)).toBe(0);
  });
});

describe("Research and Oak's Parcels — §8.6.2", () => {
  it('EveryXpIsResearch_AndAFullBarIsAParcel_WithTheRestCarried', () => {
    const a = seasoned();
    a.research = PARCEL.earlyCost - 2;
    const { state, delta } = fold(a, win());
    expect(delta.parcels).toBe(1);
    expect(state.parcels).toBe(1);
    expect(state.parcelsEarned).toBe(1);
    expect(state.research).toBe(XP.combat - 2);
  });

  it('TheFirstTenAreCheaper', () => {
    expect(parcelCost(0)).toBe(PARCEL.earlyCost);
    expect(parcelCost(PARCEL.earlyCount - 1)).toBe(PARCEL.earlyCost);
    expect(parcelCost(PARCEL.earlyCount)).toBe(PARCEL.cost);
    expect(PARCEL.cost).toBeGreaterThan(PARCEL.earlyCost);
  });

  it('TakeParcel_OpensTheCard_AndTheOfferMovesOn', () => {
    const a = emptyAccount(77);
    a.parcels = 2;
    const offer = parcelOffer(a, 3);
    expect(offer).toHaveLength(3);
    // The offer is the same every time it is looked at.
    expect(parcelOffer(a, 3).map((e) => e.id)).toEqual(offer.map((e) => e.id));
    const after = takeParcel(a, offer[1]!.id);
    expect(after.unlocks).toEqual([offer[1]!.id]);
    expect(after.parcels).toBe(1);
    expect(after.parcelsOpened).toBe(1);
    expect(parcelOffer(after, 3).some((e) => e.id === offer[1]!.id)).toBe(false);
    // No parcel, an unknown card, a Badge's TM or a card already taken: nothing happens.
    expect(takeParcel({ ...a, parcels: 0 }, offer[0]!.id).unlocks).toEqual([]);
    expect(takeParcel(a, 'relic:nope')).toBe(a);
    expect(takeParcel(a, lockKey('tm', LEADER_TM['boulder-badge']!))).toBe(a);
    expect(takeParcel(after, offer[1]!.id)).toBe(after);
  });

  it('TwoAccounts_DrawDifferentOffers', () => {
    const offers = [1, 2, 3, 4, 5, 6].map((salt) => parcelOffer(emptyAccount(salt), 3).map((e) => e.id).join());
    expect(new Set(offers).size).toBeGreaterThan(1);
  });

  it('AParcelEarnedWithAnEmptyVault_PaysTokensInstead', () => {
    const a = seasoned();
    a.unlocks = VAULT.map((e) => e.id);
    a.research = PARCEL.earlyCost - 1;
    const { state, delta } = fold(a, win());
    expect(delta.parcels).toBe(0);
    expect(state.parcels).toBe(0);
    expect(delta.tokens).toBe(PARCEL.overflowTokens);
    expect(parcelPool(a)).toEqual([]);
  });
});

describe('The vault — §8.6.1', () => {
  it('EveryRowNamesRealContent_AndNoIdIsHeldTwice', () => {
    const seen = new Set<string>();
    for (const e of VAULT) {
      for (const id of e.ids) {
        const key = lockKey(e.kind, id);
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
        if (e.kind === 'relic') expect(content.relic(id).id).toBe(id);
        if (e.kind === 'held') expect(content.heldItem(id).id).toBe(id);
        if (e.kind === 'tm') expect(content.tm(id).id).toBe(id);
        if (e.kind === 'event') expect(MYSTERY_EVENTS.some((m) => m.id === id), id).toBe(true);
      }
    }
    for (const b of content.allBadges()) expect(LEADER_TM[b.id], b.id).toBeDefined();
    // Supplies are never locked: they are written into the route's own drop tables.
    expect(VAULT.some((e) => e.kind === 'consumable')).toBe(false);
    expect(VAULT.filter((e) => e.source === 'parcel')).toHaveLength(43);
  });

  it('EveryRarityKeepsMoreThanHalfOpen_AndEveryLegendary', () => {
    // v0.9.99's lesson: a fresh account that holds 3 of 18 Uncommons makes rarity a lie.
    const fresh = emptyAccount();
    for (const rarity of ['common', 'uncommon', 'rare', 'legendary'] as const) {
      const rows = content.allRelics().filter((r) => r.rarity === rarity);
      const open = rows.filter((r) => relicPoolFor(fresh, content).includes(r.id));
      expect(open.length / rows.length, rarity).toBeGreaterThan(rarity === 'legendary' ? 0.99 : 0.5);
    }
    expect(MYSTERY_EVENTS.length - VAULT.filter((e) => e.kind === 'event').length).toBeGreaterThanOrEqual(10);
  });

  it('AFreshAccountsRun_NeverDrawsWhatIsLocked', () => {
    const fresh = emptyAccount();
    const run = createRun('bulbasaur', 7, defaultRunCtx(content), 0, [], undefined, undefined, runPerksFor(fresh, content));
    const pool = offerPool(run, content);
    for (const e of VAULT) {
      for (const id of e.ids) {
        if (e.kind === 'relic') expect(pool.includes(id), id).toBe(false);
        if (e.kind === 'held') expect(ownedItems(run).includes(id), id).toBe(true);
        if (e.kind === 'tm') expect(tmsFor(run, content).some((t) => t.id === id), id).toBe(false);
        if (e.kind === 'event') expect(Object.values(run.map.nodes).some((n) => n.preview.event === id), id).toBe(false);
      }
    }
    // An account that has opened everything plays the whole catalogue, like a fixture.
    const all = { ...fresh, unlocks: VAULT.map((e) => e.id) };
    expect(runPerksFor(all, content).locked).toEqual([]);
    expect(relicPoolFor(all, content)).toHaveLength(content.allRelics().length);
  });

  it('ARunWithNoAccount_HasNothingLocked', () => {
    const run = createRun('bulbasaur', 7, defaultRunCtx(content));
    expect(run.perks.locked).toBeUndefined();
    expect(tmsFor(run, content)).toHaveLength(content.allTms().length);
  });
});

describe('The Trainer Journal — §8.7', () => {
  it('ACompletedEntry_PaysXpTokensAndItsPrize', () => {
    const { state, delta } = fold(emptyAccount(), win({ damageTaken: 5, faints: 1 }));
    const blood = delta.journalRewards.find((r) => r.id === 'first-blood')!;
    // A Bronze entry's prize is a trainer avatar, worn at once if the card has none.
    expect(blood.reward).toEqual({ tokens: MEDAL_TOKENS.bronze, cosmetic: 'avatar-youngster' });
    expect(delta.xpBy.journal).toBe(MEDAL_XP.bronze);
    expect(state.tokens).toBeGreaterThanOrEqual(MEDAL_TOKENS.bronze);
    expect(state.cosmetics).toContain('avatar-youngster');
    expect(state.wearing.avatar).toBe('avatar-youngster');
  });

  it('NoEntryPaysOnlyANumber', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'platinum'] as const) {
      const r = journalReward({ id: 'x', tier });
      expect(r.tokens).toBe(MEDAL_TOKENS[tier]);
      expect((r.parcels ?? 0) > 0 || !!r.cosmetic).toBe(true);
    }
    // Every entry there is, by its own row: Tokens, and a parcel or a trophy.
    for (const a of ACHIEVEMENTS) {
      const r = journalReward(a);
      expect((r.parcels ?? 0) > 0 || !!r.cosmetic, a.id).toBe(true);
      if (r.cosmetic) expect(COSMETICS.some((c) => c.id === r.cosmetic), r.cosmetic).toBe(true);
    }
    const scholar = journalReward({ id: 'pokedex-apprentice', tier: 'silver' });
    expect(scholar.cosmetic).toBe('title-pokedex-scholar');
  });

  it('AFieldNote_OpensItsRelic_OrPaysAParcelWhenTheRelicWasNeverLocked', () => {
    const locked = content.allRelics().find((r) => r.discovery && vaultEntryFor('relic', r.id))!;
    const open = content.allRelics().find((r) => r.discovery && !vaultEntryFor('relic', r.id))!;
    const a = seasoned();
    a.notes = a.notes.filter((id) => id !== locked.id && id !== open.id);
    a.counters[locked.discovery!.counter] = locked.discovery!.goal;
    a.counters[open.discovery!.counter] = open.discovery!.goal;
    const { state, delta } = fold(a, { t: 'relic-acquired', relicId: 'coin-pouch', heldCount: 1 });
    expect(delta.notes.sort()).toEqual([locked.id, open.id].sort());
    expect(state.unlocks).toContain(lockKey('relic', locked.id));
    expect(delta.opened).toEqual([lockKey('relic', locked.id)]);
    expect(delta.parcels).toBe(1);
    expect(delta.xpBy.journal).toBe(2 * XP.fieldNote);
    // Written once.
    expect(fold(state, { t: 'relic-acquired', relicId: 'coin-pouch', heldCount: 1 }).delta.notes).toEqual([]);
  });

  it('Pins_ThreeAtMost_AndNextGoalsLeadsWithThem', () => {
    let a = emptyAccount();
    for (const id of ['champion', 'monotype-master', 'minimalist', 'win-streak']) a = pinEntry(a, id, true);
    expect(a.pins).toHaveLength(PIN_LIMIT);
    expect(a.pins).not.toContain('win-streak');
    expect(nextGoals(a, content).map((g) => g.id)).toEqual(['champion', 'monotype-master', 'minimalist']);
    a = pinEntry(a, 'champion', false);
    expect(a.pins).toEqual(['monotype-master', 'minimalist']);
    // Unpinned, the closest open entries fill in; a hidden one is never suggested, a finished one never shown.
    const fresh = emptyAccount();
    fresh.counters['combats-won'] = 49;
    const goals = nextGoals(fresh, content);
    expect(goals).toHaveLength(3);
    expect(goals[0]!.id).toBe(noteId('lucky-egg-token'));
    expect(goals.every((g) => !g.done && !g.hidden)).toBe(true);
  });
});

describe('Bond — §6.8', () => {
  it('SixRanks_AtTheCanonThresholds', () => {
    expect(BOND_RANKS).toEqual([20, 60, 120, 200, 300, 420]);
    expect(MAX_BOND_RANK).toBe(6);
    expect(bondRank(19)).toBe(0);
    expect(bondRank(20)).toBe(BOND_TIER.acquainted);
    expect(bondRank(419)).toBe(BOND_TIER.soulbound);
    expect(bondRank(420)).toBe(BOND_TIER.partner);
  });

  it('ATrainerWin_IsBondForTheTeam_AndOneMoreForTheLead_AWildOneIsNot', () => {
    const { state } = fold(seasoned(), win({ kind: 'trainer', activeSpecies: ['charmander', 'pidgey'], leadTurns: { charmander: 3, pidgey: 1 } }));
    expect(state.bond.charmander).toBe(BOND.win + BOND.lead);
    expect(state.bond.pidgey).toBe(BOND.win);
    expect(fold(seasoned(), win({ kind: 'wild', activeSpecies: ['charmander'] })).state.bond.charmander).toBeUndefined();
  });

  it('TheBox_SharesHalfOfAGymAndOfTheRunsEnd', () => {
    const gym = fold(seasoned(), win({ kind: 'boss', activeSpecies: ['charmander'], boxSpecies: ['pidgey', 'pidgeotto', 'charmeleon'] }));
    expect(gym.state.bond.charmander).toBe(BOND.gym);
    // One share per line, and none for a line that is also in the Active Team.
    expect(gym.state.bond.pidgey).toBe(Math.floor(BOND.gym * BOND.benchShare));
    const end = fold(seasoned(), runEnd({ activeSpecies: ['charmander'], boxSpecies: ['rattata'] }));
    expect(end.state.bond.charmander).toBe(BOND.runFinished);
    expect(end.state.bond.rattata).toBe(Math.floor(BOND.runFinished * BOND.benchShare));
  });

  it('Acquainted_MakesTheLineFamiliar_AndPartnerStartsALevelHigher', () => {
    const a = emptyAccount();
    a.bond.charmander = BOND_RANKS[BOND_TIER.acquainted - 1]!;
    const perks = runPerksFor(a, content);
    expect(perks.familiar).toEqual(expect.arrayContaining(['charmander', 'charmeleon', 'charizard']));
    expect(runPerksFor(emptyAccount(), content).familiar).toEqual([]);
    a.bond.charmander = BOND_RANKS[BOND_TIER.partner - 1]!;
    const run = createRun('charmander', 7, defaultRunCtx(content), 0, [], undefined, undefined, runPerksFor(a, content));
    expect(run.box[0]!.level).toBe(RUN_START.starterLevel + 1);
    expect(unlockedStarters(a, content)).toContain('charmander');
  });

  it('Ribbons_ArePinnedOnce_ByTheGymTheLeagueTheChampionAndTheLadder', () => {
    let a = seasoned();
    const gym = fold(a, { t: 'badge-awarded', badgeId: 'boulder-badge', activeSpecies: ['charmeleon', 'pidgey'] });
    expect(gym.delta.ribbons).toEqual([{ line: 'charmander', ribbon: 'gym' }, { line: 'pidgey', ribbon: 'gym' }]);
    a = gym.state;
    expect(fold(a, { t: 'badge-awarded', badgeId: 'cascade-badge', activeSpecies: ['charmeleon'] }).delta.ribbons).toEqual([]);
    const lost = fold(a, runEnd({ reachedLeague: true, activeSpecies: ['charizard'] }));
    expect(lost.state.ribbons.charmander).toEqual(['gym', 'league']);
    const won = fold(a, runEnd({ won: true, reachedLeague: true, ladderRung: 1, activeSpecies: ['charizard'] }));
    expect(won.state.ribbons.charmander).toEqual(['gym', 'league', 'champion', 'ladder']);
  });
});

describe('The Badge Case — §8.14', () => {
  it('ALeadersFirstBadge_GoesOnTheWall_PaysXp_AndOpensTheirTm', () => {
    const { state, delta } = fold(seasoned(), { t: 'badge-awarded', badgeId: 'boulder-badge' });
    expect(state.badges).toEqual(['boulder-badge']);
    expect(delta.newBadges).toEqual(['boulder-badge']);
    expect(delta.xpBy.badges).toBe(XP.gym + XP.firstBadge);
    expect(delta.opened).toEqual([lockKey('tm', LEADER_TM['boulder-badge']!)]);
    const again = fold(state, { t: 'badge-awarded', badgeId: 'boulder-badge' });
    expect(again.delta.newBadges).toEqual([]);
    expect(again.delta.xpBy.badges).toBe(XP.gym);
    expect(again.state.badges).toEqual(['boulder-badge']);
  });
});

describe('The League Ladder — §8.8.5', () => {
  it('TheLadder_IsTheModifiersInRungOrder', () => {
    expect(LADDER_TOP).toBe(10);
    expect(LADDER.map((m) => m.rung)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ladderRungOf([])).toBe(0);
    expect(ladderRungOf(ladderModifiers(3))).toBe(3);
    expect(ladderRungOf([...ladderModifiers(3)].reverse())).toBe(3);
    // A custom pick is not a rung.
    expect(ladderRungOf([LADDER[4]!.id])).toBe(0);
  });

  it('OpensWithTheFirstChampion_AndARungWonOpensTheNextAndItsModifier', () => {
    let a = seasoned();
    expect(ladderOpen(a)).toBe(false);
    expect(nextRung(a)).toBeNull();
    expect(modifierUnlocked(a, LADDER[0]!)).toBe(false);
    a = fold(a, runEnd({ won: true })).state;
    expect(nextRung(a)).toBe(1);
    const won = fold(a, runEnd({ won: true, ladderRung: 1, modifierCount: 1 }));
    expect(won.delta.ladderRung).toBe(1);
    expect(won.state.ladder).toBe(1);
    expect(won.delta.tokens).toBeGreaterThanOrEqual(LADDER_PRIZE.tokens);
    // The rung's parcel, beside whatever the Journal paid for a second win in a row.
    expect(won.delta.parcels).toBeGreaterThanOrEqual(LADDER_PRIZE.parcels);
    expect(modifierUnlocked(won.state, LADDER[0]!)).toBe(true);
    expect(modifierUnlocked(won.state, LADDER[1]!)).toBe(false);
    // The same rung again, a lost rung, or a rung skipped ahead moves nothing.
    expect(fold(won.state, runEnd({ won: true, ladderRung: 1 })).state.ladder).toBe(1);
    expect(fold(won.state, runEnd({ won: false, ladderRung: 2 })).state.ladder).toBe(1);
    expect(fold(won.state, runEnd({ won: true, ladderRung: 3 })).state.ladder).toBe(1);
  });
});

describe('The Hall of Fame and the stars — §8.15', () => {
  it('AWonRun_IsKept_WithItsTeamAndItsRung', () => {
    const hall = { seed: 9, starter: 'squirtle', team: [{ speciesId: 'blastoise', level: 52, shiny: true }], badges: ['boulder-badge'], relics: ['coin-pouch'] };
    const { state, delta } = fold(seasoned(), runEnd({ won: true, hall, ladderRung: 0 }));
    expect(delta.hall).toBe(true);
    expect(state.hall).toEqual([{ run: 1, rung: 0, ...hall }]);
    expect(fold(seasoned(), runEnd({ won: false })).state.hall).toEqual([]);
  });

  it('Stars_AreDerivedFromTheFeats', () => {
    const a = seasoned();
    expect(starsOf(a, content)).toEqual([]);
    a.stats.wins = 1;
    a.badges = content.allBadges().map((b) => b.id);
    a.ladder = LADDER_TOP;
    for (const s of content.allSpecies()) a.dex[s.id] = { ...emptyDexEntry(), encounters: 1 };
    expect(starsOf(a, content)).toEqual(['champion', 'badges', 'pokedex', 'ladder']);
  });
});

describe("Oak's aide — §8.9.3", () => {
  it('PaysEachPokedexMilestone_Once', () => {
    const a = seasoned();
    const species = content.allSpecies().slice(0, AIDES[1]!.owned);
    for (const s of species) a.dex[s.id] = { ...emptyDexEntry(), recruits: 1 };
    const { state, delta } = fold(a, win());
    expect(delta.aides.map((r) => r.owned)).toEqual([AIDES[0]!.owned, AIDES[1]!.owned]);
    expect(state.hub).toContain(AIDES[1]!.perk);
    expect(delta.parcels).toBe(AIDES[0]!.parcels);
    expect(fold(state, win()).delta.aides).toEqual([]);
  });
});

describe('The Trainer Kit — §8.4.5', () => {
  const owning = (...perks: HubUpgrade[]) => {
    const a = emptyAccount();
    a.hub.push(...perks);
    return a;
  };

  it('AService_IsAlwaysOn_APerk_OnlyWhilePacked', () => {
    const a = owning('expanded-box', 'moms-allowance');
    expect(hasHubUpgrade(a, 'expanded-box')).toBe(true);
    expect(hasHubUpgrade(a, 'moms-allowance')).toBe(false);
    // No slot before Challenger: packing is refused.
    expect(kitSlots(a)).toBe(0);
    expect(packKit(a, 'moms-allowance', true)).toBe(a);
    a.xp = xpForLevel(4);
    const packed = packKit(a, 'moms-allowance', true);
    expect(packed.kit).toEqual(['moms-allowance']);
    expect(hasHubUpgrade(packed, 'moms-allowance')).toBe(true);
    expect(packKit(packed, 'moms-allowance', false).kit).toEqual([]);
    // A service is not packed, and a perk you do not own is not either.
    expect(packKit(a, 'expanded-box', true)).toBe(a);
    expect(packKit(a, 'head-start', true)).toBe(a);
  });

  it('TheKit_HoldsOnlyAsManyAsTheRankHasSlots', () => {
    let a = owning('moms-allowance', 'first-aid-pouch', 'tm-case');
    a.xp = xpForLevel(5);
    for (const p of ['moms-allowance', 'first-aid-pouch', 'tm-case'] as const) a = packKit(a, p, true);
    expect(a.kit).toEqual(['moms-allowance', 'first-aid-pouch']);
    // A Kit saved at a higher rank does not outgrow the account that loads it.
    const demoted = { ...a, xp: xpForLevel(4) };
    expect(hasHubUpgrade(demoted, 'moms-allowance')).toBe(true);
    expect(hasHubUpgrade(demoted, 'first-aid-pouch')).toBe(false);
  });

  it('ThePackedKit_ChangesWhatTheRunStartsWith_AndNothingElse', () => {
    let a = owning('moms-allowance', 'first-aid-pouch', 'ball-case', 'head-start', 'exp-share', 'tm-case');
    a.xp = xpForLevel(7);
    const base = createRun('bulbasaur', 7, defaultRunCtx(content));
    for (const p of ['moms-allowance', 'first-aid-pouch', 'head-start'] as const) a = packKit(a, p, true);
    const run = createRun('bulbasaur', 7, defaultRunCtx(content), 0, [], undefined, undefined, runPerksFor(a, content));
    expect(run.money).toBe(base.money + KIT.allowance);
    expect(run.consumables.filter((c) => c === 'potion')).toHaveLength(base.consumables.filter((c) => c === 'potion').length + KIT.potions);
    expect(run.box[0]!.level).toBe(RUN_START.starterLevel + KIT.headStartLevels);
    expect(run.tms).toEqual([]);
    let b = owning('ball-case', 'exp-share', 'tm-case');
    b.xp = xpForLevel(7);
    for (const p of ['ball-case', 'exp-share', 'tm-case'] as const) b = packKit(b, p, true);
    const other = createRun('bulbasaur', 7, defaultRunCtx(content), 0, [], undefined, undefined, runPerksFor(b, content));
    expect(other.consumables.filter((c) => c === 'poke-ball')).toHaveLength(RUN_START.balls + KIT.balls);
    expect(other.perks.kit?.benchXpShare).toBe(KIT.benchXpShare);
    expect(other.tms).toHaveLength(1);
    expect(content.tm(other.tms[0]!).compatibleSpecies).toContain('bulbasaur');
    // The TM Case never hands over a TM the account has not opened.
    expect(tmsFor(other, content).some((t) => t.id === other.tms[0])).toBe(true);
    expect(other.money).toBe(base.money);
  });

  it('EveryPerkAndServiceSaysWhatItIs', () => {
    for (const row of Object.values(HUB_UPGRADE_LABEL)) {
      expect(row.name.length).toBeGreaterThan(3);
      expect(row.effect.length).toBeGreaterThan(10);
    }
    expect(SHELVES.kit.level).toBe(4);
    expect(shelfOpen(emptyAccount(), 'starters')).toBe(false);
  });
});

describe('The Pokédex — §5.13', () => {
  it('Familiar_ByKnockOuts_PaysItsXpOnce', () => {
    expect(dexTierFor(DEX_FAMILIAR.common - 1, 'common')).toBe(0);
    expect(dexTierFor(DEX_FAMILIAR.common, 'common')).toBe(1);
    const a = seasoned();
    a.dex.pidgey = { ...emptyDexEntry(), defeats: DEX_FAMILIAR[content.species('pidgey').rarity] - 1, encounters: 3 };
    a.achievements.unlocked.push('acquaintance');
    const { state, delta } = fold(a, win({ defeated: ['pidgey'], enemies: ['pidgey'] }));
    expect(state.dex.pidgey!.tier).toBe(1);
    expect(delta.dexPromotions).toEqual([{ speciesId: 'pidgey', tier: 1 }]);
    expect(delta.xpBy.pokedex).toBeGreaterThan(0);
    expect(fold(state, win({ defeated: ['pidgey'], enemies: ['pidgey'] })).delta.dexPromotions).toEqual([]);
  });
});

describe('Older saves — §8.10', () => {
  it('AnAccountFromBeforeTheRework_IsReset_WithASaltOfItsOwn', () => {
    const old = { version: 3, xp: 12_000, tokens: 40, hub: ['twin-run'] } as never;
    const fresh = upgradeAccount(old, 4242);
    expect(fresh).toEqual(emptyAccount(4242));
    expect(fresh.version).toBe(ACCOUNT_VERSION);
    const current = emptyAccount(5);
    current.xp = 900;
    expect(upgradeAccount(current)).toBe(current);
  });

  it('applyAccountEvent_IsPure', () => {
    const a = seasoned();
    const snapshot = structuredClone(a);
    applyAccountEvent(a, win({ kind: 'trainer', activeSpecies: ['charmander'] }), ctx);
    expect(a).toEqual(snapshot);
  });
});
