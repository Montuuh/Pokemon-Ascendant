import { useEffect } from 'react';
import { readEntry, useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { AidScreen } from '@/ui/screens/AidScreen';
import { CenterScreen } from '@/ui/screens/CenterScreen';
import { CityScreen } from '@/ui/screens/city/CityScreen';
import { CombatScreen } from '@/ui/screens/CombatScreen';
import { DojoScreen } from '@/ui/screens/DojoScreen';
import { EventScreen } from '@/ui/screens/EventScreen';
import { GameCornerScreen } from '@/ui/screens/GameCornerScreen';
import { RingPrizeScreen } from '@/ui/screens/RingPrizeScreen';
import { RingScreen } from '@/ui/screens/RingScreen';
import { LegendaryScreen } from '@/ui/screens/LegendaryScreen';
import { HubScreen } from '@/ui/screens/HubScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { AboutScreen } from '@/ui/screens/AboutScreen';
import { ChangelogScreen } from '@/ui/screens/ChangelogScreen';
import { EvolutionScreen } from '@/ui/screens/EvolutionScreen';
import { MainMenu } from '@/ui/screens/MainMenu';
import { MapScreen } from '@/ui/screens/MapScreen';
import { RewardScreen } from '@/ui/screens/RewardScreen';
import { RunEndScreen } from '@/ui/screens/RunEndScreen';
import { ScenarioPicker } from '@/ui/screens/ScenarioPicker';
import { ShopScreen } from '@/ui/screens/ShopScreen';
import { StarterSelect } from '@/ui/screens/StarterSelect';
import { SwapOrSkip } from '@/ui/components/SwapOrSkip';
import { TooltipLayer } from '@/ui/tooltip';

function Screens() {
  const screen = useAppStore((s) => s.screen);
  const goTo = useAppStore((s) => s.goTo);
  const start = useCombatStore((s) => s.start);
  const hasCombat = useCombatStore((s) => s.state !== null);
  const runPhase = useRunStore((s) => s.run?.phase ?? null);
  const hasRun = useRunStore((s) => s.run !== null);

  // Deep link: /?scenario=<id>[&seed=n] boots straight into that fight (the web ScenarioLauncher).
  // A reload on /?screen=map has no run in memory, so the save is the source of truth (§10.8).
  useEffect(() => {
    const { screen: fromUrl, scenario, seed } = readEntry();
    if (scenario && !hasCombat) {
      try {
        start(scenario, seed ?? undefined);
        goTo('combat');
      } catch {
        goTo('scenarios');
      }
      return;
    }
    if (fromUrl !== 'map' && fromUrl !== 'combat') return;
    if (!hasRun && !useRunStore.getState().loadSave().ok) {
      goTo('menu');
      return;
    }
    // A run that was mid-fight when the tab closed comes back mid-fight.
    if (!hasCombat && useRunStore.getState().resumeCombat()) goTo('combat');
    else if (useRunStore.getState().run?.phase !== 'combat' && fromUrl === 'combat') goTo('map');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The run's own phase decides what sits over the map: a reward, an evolution, a service node, a recruit,
  // a City, or nothing. The order matches the reducer's, so the router never has to know the rules.
  if (screen === 'map') {
    if (runPhase === 'reward') return <RewardScreen />;
    if (runPhase === 'evolution') return <EvolutionScreen />;
    if (runPhase === 'dojo') return <DojoScreen />;
    if (runPhase === 'shop') return <ShopScreen />;
    if (runPhase === 'event') return <EventScreen />;
    if (runPhase === 'center') return <CenterScreen />;
    if (runPhase === 'aid') return <AidScreen />;
    // §2.11 — a Gym is behind the run and the town is the lobby; its buildings open the screens above.
    if (runPhase === 'city') return <CityScreen />;
    // §2.9.4.1 — the Challenge Ring between rungs, and its top prize. §2.11.5 — the Game Corner.
    if (runPhase === 'ring') return <RingScreen />;
    if (runPhase === 'relic-pick') return <RingPrizeScreen />;
    if (runPhase === 'game-corner') return <GameCornerScreen />;
    // §7.3.7 — the Gym is beaten and the 1-of-3 is open; the run is not over until it is answered.
    if (runPhase === 'legendary') return <LegendaryScreen />;
    return (
      <>
        <MapScreen />
        {runPhase === 'swap-or-skip' && <SwapOrSkip />}
      </>
    );
  }

  switch (screen) {
    case 'combat':
      return <CombatScreen />;
    case 'scenarios':
      return <ScenarioPicker />;
    case 'starter':
      return <StarterSelect />;
    case 'hub':
      return <HubScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'about':
      return <AboutScreen />;
    case 'changelog':
      return <ChangelogScreen />;
    case 'victory':
      return <RunEndScreen outcome="victory" />;
    case 'defeat':
      return <RunEndScreen outcome="defeat" />;
    case 'menu':
    default:
      return <MainMenu />;
  }
}

/** The screen router plus the one tooltip layer every screen borrows (see src/ui/tooltip). */
export function App() {
  return (
    <>
      <Screens />
      <TooltipLayer />
    </>
  );
}
