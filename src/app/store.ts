import { create } from 'zustand';

// App-level screen router. Game-flow states will grow into the §10.5 state tree; for now a flat screen id.
//
// Where you are is remembered in two places with two different lifetimes, and the split is the point:
//
//   The URL is READ, never written. `/?screen=hub` or `/?scenario=wild-basic&seed=7` opens straight there, which
//   is what Playwright, the browser tool and a shared link need. It is consumed on boot and then cleaned off
//   the address bar, so a player's URL is always just the site — the query string was a developer's affordance
//   that had leaked into every player's browser history.
//
//   sessionStorage is WRITTEN on every navigation and read on boot when the URL says nothing. It lives exactly
//   as long as the tab does, which is the behaviour a player expects: F5 mid-run lands back on the map; a fresh
//   visit lands on the menu. localStorage would make every visit resume, and the URL made every visit ugly.
export const SCREENS = ['menu', 'scenarios', 'combat', 'starter', 'map', 'victory', 'defeat', 'hub', 'settings', 'about', 'changelog'] as const;
export type Screen = (typeof SCREENS)[number];

/** What a boot has to know: the screen, and the practice fixture if that is what was asked for. */
export interface Entry {
  screen: Screen;
  scenario: string | null;
  seed: number | null;
}

const ENTRY_KEY = 'ascendant.entry';
const isScreen = (s: string | null): s is Screen => (SCREENS as readonly string[]).includes(s ?? '');

function fromUrl(): Entry | null {
  const q = new URLSearchParams(window.location.search);
  const scenario = q.get('scenario');
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const s = q.get('screen');
  if (!scenario && !isScreen(s)) return null;
  return { screen: scenario ? 'combat' : (s as Screen), scenario, seed };
}

function fromSession(): Entry | null {
  try {
    const raw = window.sessionStorage.getItem(ENTRY_KEY);
    if (!raw) return null;
    const e = JSON.parse(raw) as Partial<Entry>;
    if (!isScreen(e.screen ?? null)) return null;
    return { screen: e.screen as Screen, scenario: typeof e.scenario === 'string' ? e.scenario : null, seed: typeof e.seed === 'number' ? e.seed : null };
  } catch {
    return null;
  }
}

/** Remember where we are for a reload. Failures are swallowed: a blocked sessionStorage costs a reload, not a run. */
function remember(entry: Entry): void {
  try {
    window.sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    /* private mode or quota — F5 will land on the menu, which is survivable */
  }
}

/** Take the query string off the address bar without a navigation or a history entry. */
function cleanUrl(): void {
  const url = new URL(window.location.href);
  if (!url.search) return;
  url.search = '';
  window.history.replaceState(null, '', url);
}

/**
 * Where to boot. The URL wins when it says something — that is what a deep link is — and is then cleaned;
 * otherwise the tab's own memory; otherwise the menu. Pure apart from the read, so the boot effect and the
 * store initialiser agree.
 */
export function readEntry(): Entry {
  if (typeof window === 'undefined') return { screen: 'menu', scenario: null, seed: null };
  const linked = fromUrl();
  if (linked) {
    remember(linked);
    cleanUrl();
    return linked;
  }
  return fromSession() ?? { screen: 'menu', scenario: null, seed: null };
}

interface AppState {
  screen: Screen;
  /** The screen before this one, for a page with more than one door (What's new: the menu and About). */
  previous: Screen | null;
  goTo: (screen: Screen) => void;
  /** Starting a practice fixture: remember it so a reload replays the same fight, without touching the URL. */
  rememberScenario: (scenario: string, seed?: number) => void;
}

const initial = readEntry();

export const useAppStore = create<AppState>((set) => ({
  screen: initial.screen,
  previous: null,
  goTo: (screen) => {
    // Leaving combat forgets the fixture: a reload on the map should not relaunch last week's practice fight.
    const kept = screen === 'combat' ? fromSession() : null;
    remember({ screen, scenario: kept?.scenario ?? null, seed: kept?.seed ?? null });
    set((s) => ({ screen, previous: s.screen }));
  },
  rememberScenario: (scenario, seed) => remember({ screen: 'combat', scenario, seed: seed ?? null }),
}));
