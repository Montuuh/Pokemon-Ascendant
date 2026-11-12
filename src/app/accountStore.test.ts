import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACCOUNT_VERSION, emptyAccount, hubEarned, hubState, xpForRank, type AccountState } from '@/sim';
import { ACCOUNT_KEY } from './storageKeys';

// §8.10, §8.4 — loading an account saved by an earlier build. The v4 → v5 step (the Road to the Plateau) has to keep
// the account: the load used to answer "older than this build" with a fresh one, and a migration that silently
// resets looks exactly like a first launch. These assertions are what makes that loud (the lesson of
// `storageKeys.test.ts`).

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Storage;
}

let store: Storage;

beforeEach(() => {
  store = fakeStorage();
  vi.stubGlobal('localStorage', store);
  vi.stubGlobal('window', { localStorage: store });
  vi.resetModules();
});

const v4 = (recipe: (a: AccountState) => void): Partial<AccountState> => {
  const a = emptyAccount(4242);
  recipe(a);
  const old: Partial<AccountState> = { ...a, version: 4 };
  delete old.hubSeen;
  return old;
};
const boot = async () => (await import('./accountStore')).useAccountStore;

describe('Loading an older account — §8.10', () => {
  it('load_AV4Account_IsKeptWhole_AndHasSeenWhatItEarned', async () => {
    const old = v4((a) => {
      a.xp = xpForRank(5);
      a.tokens = 61;
      a.badges = ['boulder-badge', 'cascade-badge'];
      a.starters = ['eevee'];
      a.stats.runs = 9;
    });
    store.setItem(ACCOUNT_KEY, JSON.stringify({ account: old }));
    const account = (await boot()).getState().account;
    // Whole: every field the old save held, its salt, and nothing else changed but the version and the seen-list.
    expect(account).toEqual({ ...emptyAccount(4242), ...old, version: ACCOUNT_VERSION, hubSeen: hubEarned(account) });
    expect(account.stats.runs).toBe(9);
    // No parade of arrivals for what the player already had.
    expect(hubState(account).place).toBe('center');
    expect(hubState(account).fresh).toEqual([]);
    // And it is written back as v5, so the step happens once.
    expect((JSON.parse(store.getItem(ACCOUNT_KEY)!) as { account: AccountState }).account.version).toBe(ACCOUNT_VERSION);
  });

  it('load_AV5Account_IsLoadedAsSaved_AndNotWrittenAgain', async () => {
    const saved = emptyAccount(77);
    saved.xp = xpForRank(3);
    saved.tokens = 12;
    saved.hubSeen = ['place:lab', 'aide', 'guide'];
    const raw = JSON.stringify({ account: saved });
    store.setItem(ACCOUNT_KEY, raw);
    const account = (await boot()).getState().account;
    expect(account).toEqual(saved);
    // The Mart, earned and not yet seen, still has its arrival to play.
    expect(hubState(account).fresh).toEqual(['mart']);
    expect(store.getItem(ACCOUNT_KEY)).toBe(raw);
  });

  it('load_AV5AccountWithABrokenSeenList_HasSeenWhatItEarned_NotAParade', async () => {
    for (const broken of [undefined, null, 'place:lab', { lab: true }]) {
      vi.resetModules();
      const saved: Record<string, unknown> = { ...emptyAccount(78), xp: xpForRank(5), badges: ['boulder-badge'] };
      if (broken === undefined) delete saved.hubSeen;
      else saved.hubSeen = broken;
      store.setItem(ACCOUNT_KEY, JSON.stringify({ account: saved }));
      const account = (await boot()).getState().account;
      expect(account.xp, String(broken)).toBe(xpForRank(5));
      expect(account.hubSeen, String(broken)).toEqual(hubEarned(account));
      expect(hubState(account).fresh, String(broken)).toEqual([]);
      // Mended on disk too, so it is mended once.
      expect((JSON.parse(store.getItem(ACCOUNT_KEY)!) as { account: AccountState }).account.hubSeen).toEqual(account.hubSeen);
    }
  });

  it('load_AnAccountFromBeforeTheRework_IsStillReset', async () => {
    store.setItem(ACCOUNT_KEY, JSON.stringify({ account: { version: 3, xp: 12_000, tokens: 40 } }));
    const account = (await boot()).getState().account;
    expect(account.xp).toBe(0);
    expect(account.version).toBe(ACCOUNT_VERSION);
  });

  it('seeHub_MarksTheArrivalsSeen_AndTheyStaySeenAfterAReload', async () => {
    const useAccountStore = await boot();
    useAccountStore.getState().replace({ ...useAccountStore.getState().account, xp: xpForRank(2) });
    expect(hubState(useAccountStore.getState().account).fresh).toContain('place:lab');
    useAccountStore.getState().seeHub();
    expect(hubState(useAccountStore.getState().account).fresh).toEqual([]);
    vi.resetModules();
    expect(hubState((await boot()).getState().account).fresh).toEqual([]);
  });
});
