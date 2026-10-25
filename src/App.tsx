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
import { SafariScreen } from '@/ui/screens/safari/SafariScreen';
import { BlackMarketScreen } from '@/ui/screens/BlackMarketScreen';
import { CheatMenu } from '@/ui/components/CheatMenu';
import { HubScreen } from '@/ui/screens/HubScreen';
import { SettingsScreen } from '@/ui/screens/SettingsScreen';
import { AboutScreen } from '@/ui/screens/AboutScreen';
import { ChangelogScreen } from '@/ui/screens/ChangelogScreen';
import { EvolutionScreen } from '@/ui/screens/EvolutionScreen';
import { MainMenu } from '@/ui/screens/MainMenu';
import { MapScreen } from '@/ui/screens/MapScreen';
import { FightResults } from '@/ui/screens/results/FightResults';
import { useAudioUnlock, useMusicDirector } from '@/ui/audio/useAudio';
import { TraderScreen } from '@/ui/screens/TraderScreen';
import { FindScreen } from '@/ui/screens/FindScreen';
import { TrainingScreen } from '@/ui/screens/TrainingScreen';
import { SummitScreen } from '@/ui/screens/SummitScreen';
import { RunEndScreen } from '@/ui/screens/RunEndScreen';
import { ScenarioPicker } from '@/ui/screens/ScenarioPicker';
import { ShopScreen } from '@/ui/screens/ShopScreen';
import { StarterSelect } from '@/ui/screens/StarterSelect';
import { SwapOrSkip } from '@/ui/components/SwapOrSkip';
import { TooltipLayer } from '@/ui/tooltip';
import { ProgressToasts } from '@/ui/components/ProgressToasts';

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
    if (fromUrl !== 'map' && fromUrl !== 'combat' && fromUrl !== 'results') return;
    if (!hasRun && !useRunStore.getState().loadSave().ok) {
      goTo('menu');
      return;
    }
    // A run that was mid-fight when the tab closed comes back mid-fight.
    if (!hasCombat && useRunStore.getState().resumeCombat()) goTo('combat');
    // A result screen is not saved: a reload there finds the run past it, on the map (or still in the fight, above).
    else if (useRunStore.getState().run?.phase !== 'combat' && fromUrl !== 'map') goTo('map');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The run's own phase decides what sits over the map: a reward, an evolution, a service node, a recruit,
  // a City, or nothing. The order matches the reducer's, so the router never has to know the rules.
  if (screen === 'map') {
    // §9.4.5 — a fight's reward, and a Gym's 1-of-3 after it (§7.3.7), on the fight's own stage.
    if (runPhase === 'reward') return <FightResults />;
    if (runPhase === 'evolution') return <EvolutionScreen />;
    if (runPhase === 'dojo') return <DojoScreen />;
    if (runPhase === 'shop') return <ShopScreen />;
    if (runPhase === 'event') return <EventScreen />;
    if (runPhase === 'center') return <CenterScreen />;
    if (runPhase === 'aid') return <AidScreen />;
    if (runPhase === 'trader') return <TraderScreen />;
    if (runPhase === 'find') return <FindScreen />;
    if (runPhase === 'training') return <TrainingScreen />;
    if (runPhase === 'summit') return <SummitScreen />;
    // §2.11 — a Gym is behind the run and the town is the lobby; its buildings open the screens above.
    if (runPhase === 'city') return <CityScreen />;
    // §2.9.4.1 — the Challenge Ring between rungs, and its top prize. §2.11.5 — the Game Corner.
    if (runPhase === 'ring') return <RingScreen />;
    if (runPhase === 'relic-pick') return <RingPrizeScreen />;
    if (runPhase === 'game-corner') return <GameCornerScreen />;
    if (runPhase === 'black-market') return <BlackMarketScreen />;
    // §2.11.6 — the Safari, and a catch into a full Box asked from inside it rather than over the map.
    if (runPhase === 'safari' || (runPhase === 'swap-or-skip' && useRunStore.getState().run?.city)) return <SafariScreen />;
    // §7.3.7 — the Gym is beaten and the 1-of-3 is open; the run is not over until it is answered.
    if (runPhase === 'legendary') return <FightResults />;
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
    // §9.4.5 — the fight's end, on its own stage, until Continue: every ending, the ones that pay no reward too.
    case 'results':
      return hasRun ? <FightResults /> : <MainMenu />;
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
  // §9.5 — sound: the first gesture wakes it, the music follows the screen.
  useAudioUnlock();
  useMusicDirector();
  return (
    <>
      <Screens />
      <TooltipLayer />
      <ProgressToasts />
      {/* The secret playtest menu: typed, never shown. */}
      <CheatMenu />
    </>
  );
}
