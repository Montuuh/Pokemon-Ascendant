import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { accountFromProgress, applyAccountEvent, applyAccountEvents, emptyAccount, LEVEL_CURVE, levelFor, levelProgress, MONEY_TO_TOKENS, REWARD_TRACK, SHELF_ORDER, SHELVES, TRACK_TOKENS, tokensForMoney, trackTokensBetween, upgradeAccount, XP, xpForLevel, type AccountContext } from './account';
import { dexTierFor, DEX_FAMILIAR, emptyDexEntry, normalizeDexEntry } from './pokedex';
import { BOND, BOND_RANKS, bondRank } from './bond';
import { accountContextFor, modifierUnlocked, relicPoolFor, runPerksFor, unlockedStarters } from './unlocks';
import { shelfOpen } from './mart';
import { emptyProgress, type MetaEvent } from './achievements';
import { MODIFIERS } from '../run/modifiers';

// §8.3–§8.6 — the account fold. Every number here is the canon's; the tests pin the shape, not the tuning.

const content = buildRegistry();
const ctx: AccountContext = accountContextFor(content);
/** An account that has already earned the one-shot medals a first fight would trip, so XP reads clean. */
const seasoned = () => {
  const a = emptyAccount();
  a.achievements.unlocked.push('first-blood', 'gotcha', 'growing-up', 'badge-collector', 'untouchable', 'swap-maestro', 'flawless-gym');
  return a;
};
const emptyTally = () => ({ crits: 0, reshuffles: 0, statusesApplied: [] as string[], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 0, peakHandAtTurnEnd: 0, catchFails: 0, koBy: {}, faintsOf: {}, damageBy: {} });
const win = (over: Partial<Extract<MetaEvent, { t: 'combat-end' }>> = {}): MetaEvent => ({ t: 'combat-end', outcome: 'victory', kind: 'wild', damageTaken: 5, manualSwaps: 0, faints: 0, defeated: [], activeSpecies: [], ...over });

describe('The level curve — §8.3.3', () => {
  it('FollowsTheFormula_AndTheCanonTable', () => {
    const curve = (n: number) => Math.floor(LEVEL_CURVE.scale * Math.pow(n, LEVEL_CURVE.power));
    for (const n of [2, 5, 6, 10, 30]) expect(xpForLevel(n)).toBe(curve(n));
    // §8.3.3's table (v0.9.2).
    expect(xpForLevel(2)).toBe(1_000);
    expect(xpForLevel(6)).toBe(5_801);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(xpForLevel(2) - 1)).toBe(1);
    expect(levelFor(xpForLevel(2))).toBe(2);
    expect(levelFor(10 ** 9)).toBe(30);
  });

  it('ProgressIsAFractionOfTheCurrentLevel', () => {
    const xp = xpForLevel(2) + 300;
    const p = levelProgress(xp);
    expect(p.level).toBe(2);
    expect(p.into).toBe(300);
    expect(p.fraction).toBeCloseTo(300 / (xpForLevel(3) - xpForLevel(2)));
    expect(levelProgress(10 ** 9).fraction).toBe(1);
  });
});

describe('XP sources — §8.3.2', () => {
  it('AWonFightPaysFive_ALostOneNothing', () => {
    expect(applyAccountEvent(seasoned(), win(), ctx).delta.xp).toBe(XP.combat);
    expect(applyAccountEvent(seasoned(), win({ outcome: 'defeat' }), ctx).delta.xp).toBe(0);
  });

  it('OnlyTheFirstRecruitOfASpeciesPays', () => {
    expect(applyAccountEvent(seasoned(), { t: 'recruit', speciesId: 'pidgey', boxFull: false, firstThisRun: true }, ctx).delta.xp).toBe(XP.recruit);
    expect(applyAccountEvent(seasoned(), { t: 'recruit', speciesId: 'pidgey', boxFull: false, firstThisRun: false }, ctx).delta.xp).toBe(0);
  });

  it('AFailedRunPaysByLayer_Capped', () => {
    const lost = (layers: number) => applyAccountEvent(seasoned(), { t: 'run-end', won: false, catches: 0, badges: 0, layersCleared: layers }, ctx).delta.xp;
    expect(lost(3)).toBe(150);
    expect(lost(12)).toBe(XP.failedRunCap);
    // A won run's XP came from its fights, Badge and Legendary along the way; the end itself pays nothing extra.
    expect(applyAccountEvent(seasoned(), { t: 'run-end', won: true, catches: 1, badges: 1, layersCleared: 12 }, ctx).delta.xp).toBe(0);
  });

  it('TheDifficultyMultiplierScalesEveryXp_§8.8.3', () => {
    const hard = { ...ctx, xpMultiplier: 1.5 };
    expect(applyAccountEvent(seasoned(), win(), hard).delta.xp).toBe(Math.round(XP.combat * 1.5));
    expect(applyAccountEvent(seasoned(), { t: 'badge-awarded', badgeId: 'boulder-badge' }, hard).delta.xp).toBe(75);
  });

  it('AnAchievementPaysItsMedalXp_AndGoldPaysTokens_§8.7.0', () => {
    // Untouchable is Silver: XP, no tokens. Flawless Gym is Gold: XP and 2 Tokens.
    const silver = applyAccountEvent(emptyAccount(), win({ damageTaken: 0 }), ctx);
    expect(silver.delta.unlockedAchievements.map((a) => a.id)).toContain('untouchable');
    expect(silver.delta.tokens).toBe(0);
    const gold = applyAccountEvent(emptyAccount(), win({ kind: 'boss', faints: 0 }), ctx);
    expect(gold.delta.unlockedAchievements.map((a) => a.id)).toContain('flawless-gym');
    expect(gold.delta.tokens).toBe(2);
    expect(gold.state.tokens).toBe(2);
  });
});

describe('The reward track — §8.3.5', () => {
  it('EveryLevelPaysTokens_MilestonesPayMore', () => {
    expect(REWARD_TRACK[3]).toEqual({ tokens: TRACK_TOKENS.level });
    expect(REWARD_TRACK[5]!.tokens).toBe(TRACK_TOKENS.milestone[5]);
    expect(REWARD_TRACK[30]!.tokens).toBe(TRACK_TOKENS.milestone[30]);
    expect(REWARD_TRACK[1]).toBeUndefined();
    expect(Object.keys(REWARD_TRACK)).toHaveLength(29);
    // 23 ordinary levels and six milestones.
    const milestones = Object.values(TRACK_TOKENS.milestone).reduce((a, b) => a + b, 0);
    expect(trackTokensBetween(1, 30)).toBe(23 * TRACK_TOKENS.level + milestones);
    // The stops that open a shelf sit where the shelves say they do, in shelf order (v0.9.2: 2 / 4 / 6).
    expect(Object.entries(REWARD_TRACK).filter(([, r]) => r.opens).map(([l, r]) => [Number(l), r.opens])).toEqual(SHELF_ORDER.filter((s) => SHELVES[s].level > 1).map((s) => [SHELVES[s].level, s]));
    expect(SHELVES.corner.level).toBe(1);
  });

  it('TheRunsLeftoverMoney_BecomesTokens_AtAPoorRate_Capped_§8.3.4', () => {
    expect(tokensForMoney(MONEY_TO_TOKENS.per - 1)).toBe(0);
    expect(tokensForMoney(MONEY_TO_TOKENS.per * 2 + 10)).toBe(2);
    expect(tokensForMoney(10 ** 6)).toBe(MONEY_TO_TOKENS.cap);
    const end = (money: number, won = false) => applyAccountEvent(seasoned(), { t: 'run-end', won, catches: 0, badges: 0, layersCleared: 2, moneyLeft: money }, ctx);
    const lost = end(MONEY_TO_TOKENS.per * 3);
    expect(lost.delta.moneyTokens).toEqual([{ money: MONEY_TO_TOKENS.per * 3, tokens: 3 }]);
    expect(lost.state.tokens).toBe(3);
    expect(lost.state.tokensEarned).toBe(3);
    // Won or lost alike; nothing for an empty wallet.
    expect(end(MONEY_TO_TOKENS.per, true).delta.moneyTokens).toEqual([{ money: MONEY_TO_TOKENS.per, tokens: 1 }]);
    expect(end(0).delta.moneyTokens).toEqual([{ money: 0, tokens: 0 }]);
  });

  it('CrossingALevel_PaysItsTokens_Once', () => {
    // 1 515 XP is level 2 (it was the threshold before v0.9.2), and level 2 pays its Tokens. Starting from a seasoned account so no medal XP muddies it.
    const events: MetaEvent[] = Array.from({ length: 303 }, () => win());
    const { state, delta } = applyAccountEvents(seasoned(), events, ctx);
    expect(levelFor(state.xp)).toBe(2);
    expect(delta.levelsGained).toEqual([2]);
    expect(delta.rewards).toEqual([{ level: 2, reward: REWARD_TRACK[2] }]);
    expect(delta.tokens).toBe(REWARD_TRACK[2]!.tokens);
    expect(state.tokens).toBe(REWARD_TRACK[2]!.tokens);
    // Three hundred clean wins also *discover* two relics on the way (§8.6.1: a no-faint win, fifty wins).
    expect(delta.discoveredRelics).toEqual(['barrier-charm', 'lucky-egg-token']);
    // Folding more XP inside the same level pays nothing again.
    const again = applyAccountEvent(state, win(), ctx);
    expect(again.delta.rewards).toHaveLength(0);
    expect(again.state.claimedLevels).toEqual([2]);
  });

  it('AMedalCaseFromBeforeTheAccount_OpensAtTheLevelItEarned', () => {
    // v0.5 kept only achievements. Two Gold and a Bronze are 2 × 200 + 50 = 450 XP and 4 Tokens; not level 2 yet.
    const progress = { ...emptyProgress(), unlocked: ['first-blood', 'flawless-gym', 'badge-collector'] };
    const account = accountFromProgress(progress, ctx);
    expect(account.achievements.unlocked).toEqual(progress.unlocked);
    expect(account.xp).toBeGreaterThan(0);
    expect(account.tokens).toBe(account.tokensEarned);
    expect(levelFor(account.xp)).toBe(account.claimedLevels.length + 1);
  });

  it('OneFightThatCrossesTwoLevels_PaysBothInOrder', () => {
    // Sit just under level 2, then take a big hit of XP.
    let state = seasoned();
    state = { ...state, xp: xpForLevel(2) - 1 };
    const big = { ...ctx, xpMultiplier: Math.ceil((xpForLevel(3) - xpForLevel(2) + 1) / XP.combat) };
    const { state: after, delta } = applyAccountEvent(state, win(), big);
    expect(levelFor(after.xp)).toBe(3);
    expect(delta.levelsGained).toEqual([2, 3]);
    expect(delta.rewards.map((r) => r.level)).toEqual([2, 3]);
    expect(after.tokens).toBe(REWARD_TRACK[2]!.tokens + REWARD_TRACK[3]!.tokens);
    // Level 2 opened the Starters shelf; nothing was handed out — the shelf sells.
    expect(shelfOpen(after, 'starters')).toBe(true);
    expect(after.starters).toEqual([]);
  });

  it('UnclaimedLevelsBelowTheCurrentOne_AreBackFilled', () => {
    const state = { ...seasoned(), xp: xpForLevel(12) - 1 };
    // The levels below were never claimed on this account, so crossing 12 back-fills 2..12: nine ordinary
    // levels and the milestones at 5 and 10. That is the right behaviour for an account created before the track
    // existed, and the same code path an ordinary level-up takes.
    const { state: after } = applyAccountEvent(state, win(), ctx);
    expect(levelFor(after.xp)).toBe(12);
    expect(after.tokens).toBe(trackTokensBetween(1, 12));
    expect(after.claimedLevels).toHaveLength(11);
    expect(after.hub).toEqual([]);
  });

  it('AVersionOneSave_IsBackPaidTheTokensItsLevelsNowPay_AndKeepsWhatItWasGranted', () => {
    // A v0.6.2 account at Level 9: the old track paid 5 Tokens (Level 5) and granted Pikachu, Eevee and three
    // Hub upgrades. It keeps all of that and is paid what an ordinary level pays now for the seven that paid nothing.
    const old = {
      ...emptyAccount(), version: 1, xp: xpForLevel(9), tokens: 5, tokensEarned: 5, claimedLevels: [2, 3, 4, 5, 6, 7, 8, 9],
      starters: ['pikachu', 'eevee'], hub: ['starting-relic-plus-one', 'expanded-box', 'pokedex-insight'], titles: ['Ace Trainer'],
    };
    const now = upgradeAccount(old);
    expect(now.version).toBe(2);
    expect(now.tokens).toBe(5 + 7 * TRACK_TOKENS.level);
    expect(now.tokensEarned).toBe(5 + 7 * TRACK_TOKENS.level);
    expect(now.starters).toEqual(['pikachu', 'eevee']);
    expect(now.hub).toHaveLength(3);
    expect(now.cosmetics).toEqual(['title-ace-trainer']);
    expect(now.wearing).toEqual({ title: 'title-ace-trainer' });
    expect('titles' in now).toBe(false);
    // Already current: untouched.
    expect(upgradeAccount(now)).toBe(now);
  });
});

describe('The Pokédex — §5.13', () => {
  it('FamiliarScalesWithRarity_AndIsTheOnlyTier', () => {
    expect(dexTierFor(10, 'common')).toBe(1);
    expect(dexTierFor(9, 'common')).toBe(0);
    expect(dexTierFor(2, 'rare')).toBe(1);
    expect(dexTierFor(50, 'common')).toBe(1);
    expect(DEX_FAMILIAR.uncommon).toBe(5);
  });

  it('KillsPromote_AndAPromotionPaysOnce_§8.3.2', () => {
    // Pidgey is common: ten defeats reach Familiar, worth 25 XP on top of the fights' own.
    const events: MetaEvent[] = Array.from({ length: 10 }, () => win({ defeated: ['pidgey'] }));
    const { state, delta } = applyAccountEvents(seasoned(), events, ctx);
    expect(state.dex.pidgey?.defeats).toBe(10);
    expect(state.dex.pidgey?.tier).toBe(1);
    expect(delta.dexPromotions).toEqual([{ speciesId: 'pidgey', tier: 1 }]);
    expect(delta.xp).toBe(10 * XP.combat + 25);
  });

  it('TheRecord_CountsMetCaughtKnockoutsFaintsDamageAndEvolutions_§8.9', () => {
    // A fight against a Pidgey and a Rattata: Charmander landed two knock-outs for 40 damage, Pidgey (yours)
    // fainted once; the Rattata went into the ball.
    const fight = win({
      outcome: 'caught', defeated: ['pidgey'], enemies: ['pidgey', 'rattata'], caughtSpecies: 'rattata', activeSpecies: ['charmander', 'pidgey'],
      tally: { ...emptyTally(), koBy: { charmander: 2 }, faintsOf: { pidgey: 1 }, damageBy: { charmander: 40, pidgey: 3 } },
    });
    const events: MetaEvent[] = [fight, { t: 'recruit', speciesId: 'rattata', boxFull: false, firstThisRun: true }, { t: 'evolution', uid: 'u', fromSpeciesId: 'charmander', toSpeciesId: 'charmeleon' }];
    const { state } = applyAccountEvents(seasoned(), events, ctx);
    expect(state.dex.pidgey).toMatchObject({ encounters: 1, defeats: 1, faints: 1, damageDealt: 3, winsWith: 1 });
    expect(state.dex.rattata).toMatchObject({ encounters: 1, caught: 1, recruits: 1, recruited: true, defeats: 0 });
    expect(state.dex.charmander).toMatchObject({ knockouts: 2, damageDealt: 40, evolutions: 1, winsWith: 1 });
    expect(state.dex.charmeleon).toBeUndefined();
  });

  it('AnEntrySavedBeforeTheRecord_IsMadeWhole', () => {
    const old = normalizeDexEntry({ defeats: 4, recruited: true, winsWith: 2, runsFinishedWith: 1, tier: 0 });
    expect(old).toMatchObject({ defeats: 4, recruits: 1, encounters: 0, caught: 0, knockouts: 0, faints: 0, damageDealt: 0, evolutions: 0 });
    expect(normalizeDexEntry(undefined)).toEqual(emptyDexEntry());
  });

  it('CatchingIsNotAKill_§5.13.1', () => {
    const { state } = applyAccountEvent(emptyAccount(), win({ outcome: 'caught', defeated: [] }), ctx);
    expect(state.dex.pidgey).toBeUndefined();
    expect(state.stats.catches).toBe(1);
  });
});

describe('Bond — §6.8', () => {
  it('PlayingWithALine_EarnsBond_AndTheLeadEarnsOneMore', () => {
    // A won trainer fight with Charmander leading and Pidgey on the bench: 2 for the line that led, 1 for the other.
    const { state, delta } = applyAccountEvent(seasoned(), win({ kind: 'trainer', activeSpecies: ['charmander', 'pidgey'], leadTurns: { charmander: 4, pidgey: 1 } }), ctx);
    expect(state.bond.charmander).toBe(BOND.win + BOND.lead);
    expect(state.bond.pidgey).toBe(BOND.win);
    expect(delta.bondGains).toEqual([{ line: 'charmander', points: 2 }, { line: 'pidgey', points: 1 }]);
  });

  it('EvolutionRecruitAndTheRunsEnd_AllFeedTheLine_PerLine', () => {
    // It is tracked per *line*: a Charmeleon's evolution and a Charizard's run count for Charmander.
    const events: MetaEvent[] = [
      { t: 'recruit', speciesId: 'charmander', boxFull: false, firstThisRun: true },
      { t: 'evolution', uid: 'u', toSpeciesId: 'charmeleon' },
      { t: 'run-end', won: true, catches: 0, badges: 1, layersCleared: 12, activeSpecies: ['charizard'] },
    ];
    const { state } = applyAccountEvents(seasoned(), events, ctx);
    expect(state.bond.charmander).toBe(BOND.recruit + BOND.evolution + BOND.runWon);
    expect(state.bond.charmeleon).toBeUndefined();
  });

  it('CrossingARank_IsReportedOnce_AndPaysTheMedal', () => {
    // Clean trainer wins leading, two points each, until the first rank: reported once.
    const n = BOND_RANKS[0] / (BOND.win + BOND.lead);
    const wins: MetaEvent[] = Array.from({ length: n }, () => win({ kind: 'trainer', activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 } }));
    const { state, delta } = applyAccountEvents(seasoned(), wins, ctx);
    expect(state.bond.squirtle).toBe(BOND_RANKS[0]);
    expect(bondRank(state.bond.squirtle!)).toBe(1);
    expect(delta.bondRankUps).toEqual([{ line: 'squirtle', rank: 1 }]);
    // A big single step crosses the next rank.
    const from = BOND_RANKS[2] - 1;
    const big = applyAccountEvent({ ...seasoned(), bond: { squirtle: from } }, { t: 'run-end', won: true, catches: 0, badges: 1, activeSpecies: ['squirtle'] }, ctx);
    expect(big.delta.bondRankUps).toEqual([{ line: 'squirtle', rank: 3 }]);
    expect(big.state.bond.squirtle).toBe(from + BOND.runWon);
  });

  it('AWildWin_PaysNoBond_AGymWinPaysTheRegion_§6.8.1', () => {
    // v0.9.1 — the fights that mean something: a wild one pays nothing, a Gym is a Region cleared together.
    const wild = applyAccountEvent(seasoned(), win({ kind: 'wild', activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 } }), ctx);
    expect(wild.state.bond.squirtle ?? 0).toBe(0);
    const gym = applyAccountEvent(seasoned(), win({ kind: 'boss', activeSpecies: ['squirtle', 'pidgey'], leadTurns: { squirtle: 3 } }), ctx);
    expect(gym.state.bond.squirtle).toBe(BOND.gym + BOND.lead);
    expect(gym.state.bond.pidgey).toBe(BOND.gym);
  });

  it('AShinyRecruit_FeedsTheLine_TheCollection_AndTheMedal_§5.14', () => {
    const { state, delta } = applyAccountEvent(seasoned(), { t: 'recruit', speciesId: 'pidgey', boxFull: false, firstThisRun: true, shiny: true }, ctx);
    expect(state.bond.pidgey).toBe(BOND.recruit + BOND.shiny);
    expect(state.dex.pidgey!.shinyCaught).toBe(1);
    expect(delta.unlockedAchievements.map((a) => a.id)).toContain('shiny-hunter');
    // Met, not caught: the record notes it; the line earns nothing for a shiny that got away.
    const seen = applyAccountEvent(seasoned(), win({ kind: 'wild', enemies: ['rattata'], shinies: ['rattata'] }), ctx);
    expect(seen.state.dex.rattata!.shinySeen).toBe(1);
    expect(seen.state.bond.rattata ?? 0).toBe(0);
  });
});

describe('Tier-2 discovery and the run pool — §8.6.1, §8.6.2', () => {
  it('ACriterionMet_OpensItsRelic_Once', () => {
    // Ten crits across three fights: Steady Aim. A fourth fight with more crits does not discover it twice.
    const crit = (n: number) => win({ tally: { ...emptyTally(), crits: n } });
    const { state, delta } = applyAccountEvents(seasoned(), [crit(4), crit(4), crit(2)], ctx);
    expect(state.counters.crits).toBe(10);
    expect(delta.discoveredRelics).toContain('steady-aim');
    const again = applyAccountEvent(state, crit(3), ctx);
    expect(again.delta.discoveredRelics).not.toContain('steady-aim');
    expect(again.state.relics.filter((id) => id === 'steady-aim')).toHaveLength(1);
  });

  it('TheRunPool_IsTierOnePlusWhatIsOpen_AndLegendariesAlways', () => {
    const fresh = relicPoolFor(emptyAccount(), content);
    expect(fresh).not.toContain('steady-aim');
    expect(fresh).not.toContain('sages-tome');
    expect(fresh).toContain('coin-pouch');
    expect(fresh).toContain('clear-mind');
    const opened = relicPoolFor({ ...emptyAccount(), relics: ['steady-aim', 'sages-tome'] }, content);
    expect(opened).toEqual(expect.arrayContaining(['steady-aim', 'sages-tome']));
    expect(opened).toHaveLength(fresh.length + 2);
  });

  it('RunPerks_AreTheAccountsWidenings_AndNothingElse', () => {
    // Squirtle at tier 3: its whole Mastery. Rattata at tier 2: the hidden ability, no Mastery yet. Pidgey short of tier 1.
    const a = { ...emptyAccount(), hub: ['expanded-box', 'pokedex-insight'], bond: { squirtle: BOND_RANKS[2], rattata: BOND_RANKS[1], pidgey: BOND_RANKS[0] - 1 }, dex: { pidgey: { ...emptyDexEntry(), defeats: 10, tier: 1 as const } } };
    const perks = runPerksFor(a, content);
    expect(perks.boxBonus).toBe(2);
    expect(perks.insight).toBe(true);
    expect(perks.familiar).toEqual(['pidgey']);
    expect(perks.mastery).toEqual({ squirtle: 3 });
    expect(perks.bond).toEqual({ squirtle: 3, rattata: 2 });
    expect(runPerksFor(a, content, true).boxBonus).toBe(3);
  });

  it('ASoulboundLine_CanStartARun_§6.8.2', () => {
    const a = { ...emptyAccount(), bond: { geodude: BOND_RANKS[3], pidgey: BOND_RANKS[3] - 1 } };
    const starters = unlockedStarters(a, content);
    expect(starters).toContain('geodude');
    expect(starters).not.toContain('pidgey');
  });

  it('ModifiersOpenByLevel_OrByTheTrack_§8.8.2', () => {
    const ironWill = MODIFIERS.find((m) => m.id === 'iron-will')!;
    expect(modifierUnlocked(emptyAccount(), ironWill)).toBe(false);
    expect(modifierUnlocked({ ...emptyAccount(), xp: xpForLevel(3) }, ironWill)).toBe(true);
    expect(modifierUnlocked({ ...emptyAccount(), modifiers: ['iron-will'] }, ironWill)).toBe(true);
  });
});
