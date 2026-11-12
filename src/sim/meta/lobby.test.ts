import { describe, expect, it } from 'vitest';
import { ACCOUNT_VERSION, AIDES, emptyAccount, upgradeAccount, type AccountState } from './account';
import { ACHIEVEMENTS } from './achievements';
import { HUB_DOORS, HUB_FEATURES, HUB_PLACES, hubEarned, hubPlace, hubState, markHubSeen } from './lobby';
import { ARRIVAL_RANK, DEX_AWARD_OWNED, PARCEL_CHOICES, PLATEAU_BADGES, xpForRank } from './rank';

// §8.4, §8.4.1, §8.4.6 — the Road to the Plateau: the place, the features and their silhouettes, the arrivals.

const at = (recipe: (a: AccountState) => void): AccountState => {
  const a = emptyAccount();
  recipe(a);
  return a;
};
const gold = ACHIEVEMENTS.find((a) => a.tier === 'gold')!.id;
const platinum = ACHIEVEMENTS.find((a) => a.tier === 'platinum')!.id;
const feature = (a: AccountState, id: string) => hubState(a).features.find((f) => f.id === id);

describe('The Road to the Plateau — §8.4', () => {
  it('hubPlace_FreshAccount_IsTheBedroom', () => {
    expect(hubPlace(emptyAccount())).toBe('bedroom');
    expect(hubState(emptyAccount()).next?.id).toBe('lab');
  });

  it('hubPlace_FollowsTheRank_ThenTheBadgeCase', () => {
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.aide))))).toBe('lab');
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.clerk))))).toBe('lab');
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.kit))))).toBe('lab');
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.center))))).toBe('center');
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.elite - 1))))).toBe('center');
    const cased = at((a) => {
      a.xp = xpForRank(ARRIVAL_RANK.center);
      a.badges = ['boulder-badge', 'cascade-badge', 'volcano-badge'];
    });
    expect(cased.badges.length).toBe(PLATEAU_BADGES);
    expect(hubPlace(cased)).toBe('plateau');
    expect(hubState(cased).next).toBeNull();
  });

  it('hubPlace_AnElite_IsAtThePlateau_WithAnEmptyCase_SoNoCareerIsLeftInViridian', () => {
    expect(hubPlace(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.elite))))).toBe('plateau');
  });

  it('hubPlace_AChampion_IsAtThePlateau_WhateverTheCaseHolds', () => {
    expect(hubPlace(at((a) => (a.stats.wins = 1)))).toBe('plateau');
  });

  it('hubPlace_OneBadgeShort_IsNotYetThePlateau', () => {
    expect(hubPlace(at((a) => (a.badges = ['boulder-badge', 'cascade-badge'].slice(0, PLATEAU_BADGES - 1))))).toBe('bedroom');
  });
});

describe('Features and silhouettes — §8.4.1, §8.4.6', () => {
  it('hubState_FirstDay_OpensTheRunTheCardAndThePc_AndShowsTheRestLocked', () => {
    const s = hubState(emptyAccount());
    expect(s.features.filter((f) => f.unlocked).map((f) => f.id)).toEqual(['run', 'card', 'pc']);
    // §8.4.6 — every feature still to come stands in the room as a silhouette, with the fact that brings it.
    expect(s.features.filter((f) => !f.unlocked).map((f) => f.id)).toEqual(['aide', 'guide', 'mart', 'kit', 'badges', 'trophies', 'dex', 'banner', 'ladder']);
    expect(s.features.every((f) => f.unlocked || f.need.kind !== 'start')).toBe(true);
    expect(s.fresh).toEqual([]);
  });

  it('hubState_TheItemGuide_ArrivesWithTheAide', () => {
    expect(feature(emptyAccount(), 'guide')!.unlocked).toBe(false);
    const rookie = at((a) => (a.xp = xpForRank(ARRIVAL_RANK.aide)));
    expect(feature(rookie, 'guide')!.unlocked).toBe(true);
    expect(feature(rookie, 'aide')!.unlocked).toBe(true);
    expect(feature(rookie, 'mart')!.unlocked).toBe(false);
  });

  it('hubState_TheHallOfFame_StandsOnlyAtThePlateau', () => {
    expect(feature(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.center))), 'hall')).toBeUndefined();
    const plateau = at((a) => (a.badges = ['a', 'b', 'c']));
    expect(feature(plateau, 'hall')).toMatchObject({ unlocked: false, need: { kind: 'champion' } });
    expect(feature(at((a) => (a.stats.wins = 1)), 'hall')!.unlocked).toBe(true);
  });

  it('hubState_ThePokedexAward_StandsOnceTheAideHasPaidItsMilestone', () => {
    // §8.9.3 — the award reads a milestone the aide pays, so the two cannot drift apart.
    expect(AIDES.some((row) => row.owned === DEX_AWARD_OWNED)).toBe(true);
    const before = AIDES.map((row) => row.owned).filter((owned) => owned < DEX_AWARD_OWNED);
    expect(feature(at((a) => (a.aides = before)), 'dex')!.unlocked).toBe(false);
    expect(feature(at((a) => (a.aides = [...before, DEX_AWARD_OWNED])), 'dex')!.unlocked).toBe(true);
  });

  it('ARRIVAL_RANK_TheBannerAndTheFullerParcel_AreTheSameRank', () => {
    expect(PARCEL_CHOICES.veteranRank).toBe(ARRIVAL_RANK.banner);
  });

  it('hubState_TheFloor_ReadsTheCareer', () => {
    expect(feature(at((a) => (a.badges = ['boulder-badge'])), 'badges')!.unlocked).toBe(true);
    expect(feature(at((a) => (a.ladder = 1)), 'ladder')!.unlocked).toBe(true);
    const bronze = ACHIEVEMENTS.find((a) => a.tier === 'bronze')!.id;
    expect(feature(at((a) => (a.achievements.unlocked = [bronze])), 'trophies')!.tier).toBe(0);
    expect(feature(at((a) => (a.achievements.unlocked = [gold])), 'trophies')!.tier).toBe(1);
    expect(feature(at((a) => (a.achievements.unlocked = [platinum])), 'trophies')!.tier).toBe(2);
    expect(feature(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.banner - 1))), 'banner')!.tier).toBe(0);
    expect(feature(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.banner))), 'banner')!.tier).toBe(1);
    expect(feature(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.elite))), 'banner')!.tier).toBe(2);
    expect(feature(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.master))), 'banner')!.tier).toBe(3);
  });

  it('HUB_DOORS_AreFeatures_AndEveryPlaceIsOnTheRoadOnce', () => {
    for (const id of HUB_DOORS) expect(HUB_FEATURES.some((f) => f.id === id)).toBe(true);
    expect(new Set(HUB_PLACES.map((p) => p.id)).size).toBe(HUB_PLACES.length);
    expect(HUB_PLACES[0]!.needs).toEqual([{ kind: 'start' }]);
  });
});

describe('Arrivals — §8.4.6', () => {
  it('hubState_ARankReached_IsFreshOnce', () => {
    const rookie = at((a) => (a.xp = xpForRank(ARRIVAL_RANK.aide)));
    expect(hubState(rookie).fresh).toEqual(['place:lab', 'aide', 'guide']);
    const seen = markHubSeen(rookie);
    expect(hubState(seen).fresh).toEqual([]);
    // Nothing new: the same account comes back, so the store writes nothing.
    expect(markHubSeen(seen)).toBe(seen);
    // The next rank is new again, and only it.
    expect(hubState({ ...seen, xp: xpForRank(ARRIVAL_RANK.clerk) }).fresh).toEqual(['mart']);
  });

  it('hubEarned_ASkippedStop_IsEarnedToo_SoOnlyTheCurrentPlacePlays', () => {
    const champion = at((a) => (a.stats.wins = 1));
    expect(hubEarned(champion).filter((k) => k.startsWith('place:'))).toEqual(['place:lab', 'place:center', 'place:plateau']);
  });

  it('hubEarned_ALaterForm_HasItsOwnKey', () => {
    expect(hubEarned(at((a) => (a.xp = xpForRank(ARRIVAL_RANK.elite)))).filter((k) => k.startsWith('banner'))).toEqual(['banner', 'banner:2']);
  });
});

describe('Older saves — §8.10', () => {
  const v4Of = (a: AccountState): Partial<AccountState> => {
    const old: Partial<AccountState> = { ...a, version: 4 };
    delete old.hubSeen;
    return old;
  };

  it('upgradeAccount_AV4Account_IsKept_AndHasSeenEverythingItEarned', () => {
    const v4 = v4Of(at((a) => {
      a.xp = xpForRank(5);
      a.tokens = 37;
      a.badges = ['boulder-badge', 'cascade-badge', 'volcano-badge', 'marsh-badge'];
      a.hub = ['twin-run'];
      a.achievements.unlocked = [gold];
    }));
    const up = upgradeAccount(v4, 99);
    // Kept whole — the migration is not a reset: every field is the old one's, the salt included, and the only
    // things that change are the version and the seen-list, which holds exactly what the account has earned.
    expect(up).toEqual({ ...emptyAccount(99), ...v4, version: ACCOUNT_VERSION, hubSeen: hubEarned(up) });
    expect(up.salt).toBe(v4.salt);
    expect(up.hubSeen).toEqual(['place:lab', 'place:center', 'place:plateau', 'aide', 'guide', 'mart', 'kit', 'badges', 'trophies']);
    // And no parade.
    expect(hubState(up).fresh).toEqual([]);
    expect(hubState(up).place).toBe('plateau');
  });

  it('upgradeAccount_AV5Account_ComesBackUntouched', () => {
    const v5 = at((a) => {
      a.xp = xpForRank(3);
      a.hubSeen = ['place:lab'];
    });
    expect(upgradeAccount(v5, 99)).toBe(v5);
  });

  it('upgradeAccount_AV4Newcomer_HasSeenNothing_AndStillMeetsItsFirstArrival', () => {
    const up = upgradeAccount(v4Of(emptyAccount(7)), 7);
    expect(up.hubSeen).toEqual([]);
    expect(hubState({ ...up, xp: xpForRank(2) }).fresh).toContain('place:lab');
  });

  it('upgradeAccount_BeforeV4_IsStillAReset', () => {
    expect(upgradeAccount({ version: 3, xp: 5000 } as never, 3)).toEqual(emptyAccount(3));
  });
});
