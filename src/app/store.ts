import { create } from 'zustand';

// App-level screen router. Game-flow states will grow into the §10.5 state tree; for now a flat screen id.
// Screens are readable from the URL so Playwright and the Claude browser tool can deep-link:
//   /?screen=scenarios            the fixture picker
//   /?screen=map                  the Region map (needs a run in progress)
//   /?scenario=wild-basic[&seed=7] start that combat immediately (the web ScenarioLauncher)
export const SCREENS = ['menu', 'scenarios', 'combat', 'starter', 'map', 'victory', 'defeat', 'hub', 'settings'] as const;
export type Screen = (typeof SCREENS)[number];

interface AppState {
  screen: Screen;
  goTo: (screen: Screen) => void;
}

export function readUrl(): { screen: Screen; scenario: string | null; seed: number | null } {
  if (typeof window === 'undefined') return { screen: 'menu', scenario: null, seed: null };
  const q = new URLSearchParams(window.location.search);
  const scenario = q.get('scenario');
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const s = q.get('screen');
  const screen: Screen = scenario ? 'combat' : (SCREENS as readonly string[]).includes(s ?? '') ? (s as Screen) : 'menu';
  return { screen, scenario, seed };
}

export const useAppStore = create<AppState>((set) => ({
  screen: readUrl().screen,
  goTo: (screen) => {
    const url = new URL(window.location.href);
    url.searchParams.set('screen', screen);
    if (screen !== 'combat') {
      url.searchParams.delete('scenario');
      url.searchParams.delete('seed');
    }
    window.history.replaceState(null, '', url);
    set({ screen });
  },
}));
