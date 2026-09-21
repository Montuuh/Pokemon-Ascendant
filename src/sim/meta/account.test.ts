import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { accountFromProgress, applyAccountEvent, applyAccountEvents, emptyAccount, levelFor, levelProgress, REWARD_TRACK, SHELVES, trackTokensBetween, upgradeAccount, XP, xpForLevel, type AccountContext } from './account';
import { dexTierFor, DEX_FAMILIAR, emptyDexEntry, normalizeDexEntry } from './pokedex';
import { BOND, bondRank } from './bond';
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
  it('MatchesTheCanonTable', () => {
    expect(xpForLevel(2)).toBe(1_515);
    expect(xpForLevel(5)).toBe(6_566);
    expect(xpForLevel(10)).toBe(19_905);
    expect(xpForLevel(30)).toBe(115_442);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(1_514)).toBe(1);
    expect(levelFor(1_515)).toBe(2);
    expect(levelFor(10 ** 9)).toBe(30);
  });

  it('ProgressIsAFractionOfTheCurrentLevel', () => {
    const p = levelProgress(2_000);
    expect(p.level).toBe(2);
    expect(p.into).toBe(485);
    expect(p.fraction).toBeGreaterThan(0.3);
    expect(p.fraction).toBeLessThan(0.4);
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
  it('EveryLevelPaysTokens_MilestonesPayMore_NinetyTwoInAll', () => {
    expect(REWARD_TRACK[2]).toEqual({ tokens: 2 });
    expect(REWARD_TRACK[5]).toEqual({ tokens: 5, opens: 'hub' });
    expect(REWARD_TRACK[15]).toEqual({ tokens: 8 });
    expect(REWARD_TRACK[30]).toEqual({ tokens: 10 });
    expect(REWARD_TRACK[1]).toBeUndefined();
    expect(Object.keys(REWARD_TRACK)).toHaveLength(29);
    expect(trackTokensBetween(1, 30)).toBe(92);
    // The four stops that open a shelf sit where the shelves say they do.
    expect(Object.entries(REWARD_TRACK).filter(([, r]) => r.opens).map(([l, r]) => [Number(l), r.opens])).toEqual([[3, 'starters'], [5, 'hub'], [8, 'discoveries'], [10, 'mastery']]);
    expect(SHELVES.corner.level).toBe(1);
  });

  it('CrossingALevel_PaysItsTokens_Once', () => {
    // 1 515 XP is level 2: two Tokens. Starting from a seasoned account so no medal XP muddies it.
    const events: MetaEvent[] = Array.from({ length: 303 }, () => win());
    const { state, delta } = applyAccountEvents(seasoned(), events, ctx);
    expect(levelFor(state.xp)).toBe(2);
    expect(delta.levelsGained).toEqual([2]);
    expect(delta.rewards).toEqual([{ level: 2, reward: REWARD_TRACK[2] }]);
    expect(delta.tokens).toBe(2);
    expect(state.tokens).toBe(2);
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
    state = { ...state, xp: 1_514 };
    const big = { ...ctx, xpMultiplier: 300 }; // 5 × 300 = 1500 → 3014 → level 3 (2 899)
    const { state: after, delta } = applyAccountEvent(state, win(), big);
    expect(levelFor(after.xp)).toBe(3);
    expect(delta.levelsGained).toEqual([2, 3]);
    expect(delta.rewards.map((r) => r.level)).toEqual([2, 3]);
    expect(after.tokens).toBe(4);
    // Level 3 opened the Starters shelf; nothing was handed out — the shelf sells.
    expect(shelfOpen(after, 'starters')).toBe(true);
    expect(after.starters).toEqual([]);
  });

  it('UnclaimedLevelsBelowTheCurrentOne_AreBackFilled', () => {
    const state = { ...seasoned(), xp: xpForLevel(12) - 1 };
    // The levels below were never claimed on this account, so crossing 12 back-fills 2..12: nine ordinary
    // levels at two and the milestones at 5 and 10 at five — 28 Tokens. That is the right behaviour for an
    // account created before the track existed, and the same code path an ordinary level-up takes.
    const { state: after } = applyAccountEvent(state, win(), ctx);
    expect(levelFor(after.xp)).toBe(12);
    expect(after.tokens).toBe(28);
    expect(after.claimedLevels).toHaveLength(11);
    expect(after.hub).toEqual([]);
  });

  it('AVersionOneSave_IsBackPaidTheTokensItsLevelsNowPay_AndKeepsWhatItWasGranted', () => {
    // A v0.6.2 account at Level 9: the old track paid 5 Tokens (Level 5) and granted Pikachu, Eevee and three
    // Hub upgrades. It keeps all of that and gains 2 × 7 for the seven levels that paid nothing.
    const old = {
      ...emptyAccount(), version: 1, xp: xpForLevel(9), tokens: 5, tokensEarned: 5, claimedLevels: [2, 3, 4, 5, 6, 7, 8, 9],
      starters: ['pikachu', 'eevee'], hub: ['starting-relic-plus-one', 'expanded-box', 'pokedex-insight'], titles: ['Ace Trainer'],
    };
    const now = upgradeAccount(old);
    expect(now.version).toBe(2);
    expect(now.tokens).toBe(5 + 14);
    expect(now.tokensEarned).toBe(19);
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
    // A won fight with Charmander leading and Pidgey on the bench: 2 for the line that led, 1 for the other.
    const { state, delta } = applyAccountEvent(seasoned(), win({ activeSpecies: ['charmander', 'pidgey'], leadTurns: { charmander: 4, pidgey: 1 } }), ctx);
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
    // Five clean wins leading: 10 points, ranks 1 (5) and 2 (10 < 15? no) — rank 1 only.
    const wins: MetaEvent[] = Array.from({ length: 5 }, () => win({ activeSpecies: ['squirtle'], leadTurns: { squirtle: 3 } }));
    const { state, delta } = applyAccountEvents(seasoned(), wins, ctx);
    expect(state.bond.squirtle).toBe(10);
    expect(bondRank(state.bond.squirtle!)).toBe(1);
    expect(delta.bondRankUps).toEqual([{ line: 'squirtle', rank: 1 }]);
    // A big single step crosses several ranks in order.
    const big = applyAccountEvent({ ...seasoned(), bond: { squirtle: 34 } }, { t: 'run-end', won: true, catches: 0, badges: 1, activeSpecies: ['squirtle'] }, ctx);
    expect(big.delta.bondRankUps).toEqual([{ line: 'squirtle', rank: 3 }]);
    expect(big.state.bond.squirtle).toBe(49);
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
    // Squirtle at 60 Bond is rank 4: Mastery Lv2. Rattata at 100 is rank 5 on a two-stage line: still Lv2.
    const a = { ...emptyAccount(), hub: ['expanded-box', 'pokedex-insight'], bond: { squirtle: 60, rattata: 100, pidgey: 3 }, dex: { pidgey: { ...emptyDexEntry(), defeats: 10, tier: 1 as const } } };
    const perks = runPerksFor(a, content);
    expect(perks.boxBonus).toBe(2);
    expect(perks.insight).toBe(true);
    expect(perks.familiar).toEqual(['pidgey']);
    expect(perks.mastery).toEqual({ squirtle: 2, rattata: 2 });
    expect(perks.bond).toEqual({ squirtle: 4, rattata: 5 });
    expect(runPerksFor(a, content, true).boxBonus).toBe(3);
  });

  it('ASoulboundLine_CanStartARun_§6.8.2', () => {
    const a = { ...emptyAccount(), bond: { geodude: 100, pidgey: 99 } };
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
