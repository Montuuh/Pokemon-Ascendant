import { useState } from 'react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { changelogUnread } from '@/app/changelogSeen';
import { menuVista } from '@/ui/art';
import { portraitUrl } from '@/content/schemas/species';
import styles from './MainMenu.module.css';

// Per docs/design/ui/03 §3.2 — warm-light front-end.
//
// Four entries, and no more on purpose (2026-09-21). Quick fight and Practice fights were developer doors —
// fixtures reachable by deep link (`?scenario=`) that had leaked onto the player's menu — and How to play
// moved off it too: the rules are taught where they are needed (tooltips, the pause menu) rather than as a
// wall of text before the first click.
export function MainMenu() {
  const goTo = useAppStore((s) => s.goTo);
  const loadSave = useRunStore((s) => s.loadSave);
  const saveSummary = useRunStore((s) => s.saveSummary);
  // §10.8 — the Continue line is read once, at first render: the menu should not re-parse the save each time.
  const [resumable, setResumable] = useState<string | null>(() => saveSummary());
  // docs/release-doctrine.md — the version is the door to what it added; a dot until this browser has read it.
  const [unread] = useState(changelogUnread);

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
          {/* §8.4 — the Hub. Four of its five kiosks open in v0.6; the PC Terminal and §8.7's medals are
              what v0.5 has to show, and they are the reason to start a second run. */}
          <button type="button" className={styles.secondary} onClick={() => goTo('hub')} data-testid="btn-hub">
            Trainer Hub
          </button>
          <button type="button" className={styles.secondary} onClick={() => goTo('settings')} data-testid="btn-settings">
            Settings
          </button>
          <button type="button" className={styles.secondary} onClick={() => goTo('about')} data-testid="btn-about">
            About
          </button>
        </nav>
        {/* Read from package.json at build time, so it cannot go stale the way "First Route v0.2" did. */}
        <button type="button" className={styles.whatsNew} onClick={() => goTo('changelog')} data-testid="btn-changelog" data-unread={unread}>
          <span className="tabular">v{__APP_VERSION__}</span> · What's new
          {unread && (
            <>
              <span className={styles.newDot} aria-hidden="true" />
              <span className="sr-only">(unread)</span>
            </>
          )}
        </button>
        <p className={styles.footnote}>Fan project · not affiliated with Nintendo, Game Freak or The Pokémon Company.</p>
      </section>
    </main>
  );
}
