import { describe, expect, it } from 'vitest';
import { buildRegistry } from '@/content/registry';
import { accountFromProgress, applyAccountEvent, applyAccountEvents, buyTier3, emptyAccount, levelFor, levelProgress, REWARD_TRACK, TIER3_PRICE, XP, xpForLevel, type AccountContext } from './account';
import { dexTierFor, DEX_THRESHOLDS } from './pokedex';
import { accountContextFor, discoverableRelics, modifierUnlocked, relicPoolFor, runPerksFor } from './unlocks';
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
  it('CrossingALevel_GrantsItsReward_Once', () => {
    // 1 515 XP is level 2: a free Tier-2 relic. Starting from a seasoned account so no medal XP muddies it.
    // Three hundred clean wins also *discover* two relics on the way (§8.6.1: a no-faint win, fifty wins), so
    // the track's own pick is the next undiscovered row in catalogue order.
    const events: MetaEvent[] = Array.from({ length: 303 }, () => win());
    const { state, delta } = applyAccountEvents(seasoned(), events, ctx);
    expect(levelFor(state.xp)).toBe(2);
    expect(delta.levelsGained).toEqual([2]);
    expect(delta.rewards[0]).toEqual({ level: 2, reward: REWARD_TRACK[2] });
    expect(delta.discoveredRelics).toEqual(['barrier-charm', 'lucky-egg-token']);
    const order = discoverableRelics(content);
    const trackPick = order.find((id) => id !== 'barrier-charm' && id !== 'lucky-egg-token')!;
    expect(state.relics).toEqual(['barrier-charm', 'lucky-egg-token', trackPick]);
    // Folding more XP inside the same level grants nothing again.
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

  it('OneFightThatCrossesTwoLevels_GrantsBothInOrder', () => {
    // Sit just under level 2, then take a big hit of XP.
    let state = seasoned();
    state = { ...state, xp: 1_514 };
    const big = { ...ctx, xpMultiplier: 300 }; // 5 × 300 = 1500 → 3014 → level 3 (2 899)
    const { state: after, delta } = applyAccountEvent(state, win(), big);
    expect(levelFor(after.xp)).toBe(3);
    expect(delta.levelsGained).toEqual([2, 3]);
    expect(after.hub).toContain('starting-relic-plus-one');
  });

  it('MilestoneLevelsPayTokens_AndStartersLandOnTheirLevels', () => {
    const state = { ...seasoned(), xp: xpForLevel(12) - 1 };
    // The levels below were never claimed on this account, so crossing 12 back-fills 2..12 — including the
    // Tokens at 5 and 10 and all three meta-starters. That is the right behaviour for an account created
    // before the track existed, and the same code path an ordinary level-up takes.
    const { state: after } = applyAccountEvent(state, win(), ctx);
    expect(levelFor(after.xp)).toBe(12);
    expect(after.tokens).toBe(10);
    expect(after.starters).toEqual(['pikachu', 'eevee', 'magikarp']);
    expect(after.hub).toEqual(expect.arrayContaining(['starting-relic-plus-one', 'expanded-box', 'pokedex-insight']));
    expect(after.claimedLevels).toHaveLength(11);
  });
});

describe('The Pokédex — §5.13', () => {
  it('ThresholdsScaleWithRarity', () => {
    expect(dexTierFor(10, 'common')).toBe(1);
    expect(dexTierFor(9, 'common')).toBe(0);
    expect(dexTierFor(2, 'rare')).toBe(1);
    expect(dexTierFor(50, 'common')).toBe(3);
    expect(DEX_THRESHOLDS.uncommon).toEqual([5, 15, 25]);
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

  it('CatchingIsNotAKill_§5.13.1', () => {
    const { state } = applyAccountEvent(emptyAccount(), win({ outcome: 'caught', defeated: [] }), ctx);
    expect(state.dex.pidgey).toBeUndefined();
    expect(state.stats.catches).toBe(1);
  });
});

describe('Mastery Lv1 — §6.8.1', () => {
  it('AnyOfThreeThingsUnlocksFamiliarBond_Once', () => {
    // Recruiting it.
    const a = applyAccountEvent(emptyAccount(), { t: 'recruit', speciesId: 'geodude', boxFull: false, firstThisRun: true }, ctx);
    expect(a.state.mastery.geodude).toBe(1);
    expect(a.delta.masteryUnlocks).toEqual([{ line: 'geodude', tier: 1 }]);
    // Three wins with it.
    const wins: MetaEvent[] = Array.from({ length: 3 }, () => win({ activeSpecies: ['charmander'] }));
    const b = applyAccountEvents(emptyAccount(), wins, ctx);
    expect(b.state.mastery.charmander).toBe(1);
    expect(b.delta.masteryUnlocks).toHaveLength(1);
    // Finishing a run with it — and it is tracked per *line*: a Charmeleon counts for Charmander's line.
    const c = applyAccountEvent(emptyAccount(), { t: 'run-end', won: false, catches: 0, badges: 0, layersCleared: 2, activeSpecies: ['charmeleon'] }, ctx);
    expect(c.state.mastery.charmander).toBe(1);
  });
});

describe('Tier-2 discovery and the run pool — §8.6.1, §8.6.2', () => {
  it('ACriterionMet_OpensItsRelic_Once', () => {
    // Ten crits across three fights: Steady Aim. A fourth fight with more crits does not discover it twice.
    const crit = (n: number) => win({ tally: { crits: n, reshuffles: 0, statusesApplied: [], statusesTaken: 0, statusesCured: 0, riderFizzles: 0, maxApMove: 0, peakHandAtTurnEnd: 0 } });
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
    const a = { ...emptyAccount(), hub: ['expanded-box', 'pokedex-insight'], mastery: { squirtle: 1 }, dex: { pidgey: { defeats: 10, recruited: false, winsWith: 0, runsFinishedWith: 0, tier: 1 as const } } };
    const perks = runPerksFor(a, content);
    expect(perks.boxBonus).toBe(2);
    expect(perks.insight).toBe(true);
    expect(perks.familiar).toEqual(['pidgey']);
    expect(perks.mastery).toEqual({ squirtle: 1 });
    expect(runPerksFor(a, content, true).boxBonus).toBe(3);
  });

  it('ModifiersOpenByLevel_OrByTheTrack_§8.8.2', () => {
    const ironWill = MODIFIERS.find((m) => m.id === 'iron-will')!;
    expect(modifierUnlocked(emptyAccount(), ironWill)).toBe(false);
    expect(modifierUnlocked({ ...emptyAccount(), xp: xpForLevel(3) }, ironWill)).toBe(true);
    expect(modifierUnlocked({ ...emptyAccount(), modifiers: ['iron-will'] }, ironWill)).toBe(true);
  });
});

describe('Tokens and the Pokémart — §8.3.4, §8.6.1', () => {
  it('Tier3IsLockedBeforeLevelTen_ThenCostsFive', () => {
    const poor = { ...emptyAccount(), tokens: 20 };
    expect(buyTier3(poor, 'sages-tome')).toEqual({ error: 'locked' });
    const rich = { ...emptyAccount(), xp: xpForLevel(10), tokens: 7 };
    const bought = buyTier3(rich, 'sages-tome');
    expect('state' in bought && bought.state.tokens).toBe(7 - TIER3_PRICE);
    expect('state' in bought && bought.state.relics).toContain('sages-tome');
    expect(buyTier3('state' in bought ? bought.state : rich, 'sages-tome')).toEqual({ error: 'owned' });
    expect(buyTier3({ ...rich, tokens: 4 }, 'sages-tome')).toEqual({ error: 'cannot-afford' });
  });
});
