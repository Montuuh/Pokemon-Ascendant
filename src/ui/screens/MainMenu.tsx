import { useState } from 'react';
import { useAppStore } from '@/app/store';
import { useCombatStore } from '@/app/combatStore';
import { useRunStore } from '@/app/runStore';
import { menuVista } from '@/ui/art';
import { portraitUrl } from '@/content/schemas/species';
import { HowToPlay } from '@/ui/components/HowToPlay';
import styles from './MainMenu.module.css';

// Per docs/design/ui/03 §3.2 — warm-light front-end. The vista is CSS layers until a generated key image lands.
export function MainMenu() {
  const goTo = useAppStore((s) => s.goTo);
  const start = useCombatStore((s) => s.start);
  const loadSave = useRunStore((s) => s.loadSave);
  const saveSummary = useRunStore((s) => s.saveSummary);
  // §10.8 — the Continue line is read once, at first render: the menu should not re-parse the save each time.
  const [resumable, setResumable] = useState<string | null>(() => saveSummary());
  const [help, setHelp] = useState(false);

  function quickFight() {
    start('wild-basic');
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', 'wild-basic');
    url.searchParams.delete('screen');
    window.history.replaceState(null, '', url);
    goTo('combat');
  }

  function resume() {
    const result = loadSave();
    if (!result.ok) {
      setResumable(null);
      return;
    }
    goTo(result.run.phase === 'reward' || result.run.phase === 'swap-or-skip' ? 'map' : 'map');
  }

  return (
    <main className={styles.root} data-testid="main-menu">
      <div className={styles.vista} aria-hidden="true">
        <img className={styles.plate} src={menuVista()} alt="" />
        <div className={styles.warmth} />
        <img className={styles.mascot} src={portraitUrl(4, 'charmander')} alt="" />
      </div>
      <section className={styles.panel}>
        <h1 className={`${styles.title} display`}>Pokémon Ascendant</h1>
        <p className={styles.tagline}>Your party is your deck.</p>
        <nav className={styles.menu}>
          {resumable && (
            <button type="button" className={styles.primary} onClick={resume} data-testid="btn-continue-run">
              Continue
              <span className={styles.subLabel}>{resumable}</span>
            </button>
          )}
          <button
            type="button"
            className={resumable ? styles.secondary : styles.primary}
            onClick={() => goTo('starter')}
            data-testid="btn-new-run"
          >
            New run
          </button>
          {/* §9.6.1 — first contact. A newcomer meets six unfamiliar systems at once, so the rules are one
              click from the menu rather than something to reverse-engineer from tooltips. */}
          <button type="button" className={styles.secondary} onClick={() => setHelp(true)} data-testid="btn-how-to-play">
            How to play
          </button>
          <button type="button" className={styles.secondary} onClick={quickFight} data-testid="btn-combat">
            Quick fight
          </button>
          <button type="button" className={styles.secondary} onClick={() => goTo('scenarios')} data-testid="btn-scenarios">
            Practice fights
          </button>
          {/* §8.4 — the Hub. Four of its five kiosks open in v0.6; the PC Terminal and §8.7's medals are
              what v0.5 has to show, and they are the reason to start a second run. */}
          <button type="button" className={styles.secondary} onClick={() => goTo('hub')} data-testid="btn-hub">
            Trainer Hub
          </button>
          <button type="button" className={styles.secondary} onClick={() => goTo('settings')} data-testid="btn-settings">
            Settings
          </button>
        </nav>
        {/* Read from package.json at build time, so it cannot go stale the way "First Route v0.2" did. */}
        <p className={styles.footnote}>
          v{__APP_VERSION__} · Fan project · not affiliated with Nintendo, Game Freak or The Pokémon Company.
        </p>
      </section>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </main>
  );
}
