import { useEffect, useState } from 'react';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { HowToPlay } from './HowToPlay';
import { Modal } from './Modal';
import styles from './PauseMenu.module.css';

// Per docs/design/ui/screens.md §2.2 (bottom utility bar) — Save & Quit behind a confirm, and an explicit
// Abandon so a stuck run has a way out. The save is written on every node boundary, so quitting loses nothing.

export function PauseMenu({ onResume }: { onResume: () => void }) {
  const goTo = useAppStore((s) => s.goTo);
  const save = useRunStore((s) => s.save);
  const abandon = useRunStore((s) => s.abandon);
  const run = useRunStore((s) => s.run);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  // §9.6.1 — the rules are also reachable mid-run, because the moment you need them is the moment you are
  // stuck, not the moment you are on the menu.
  if (help) return <HowToPlay onClose={() => setHelp(false)} />;

  if (confirmAbandon) {
    return (
      <Modal title="Abandon this run?" testId="confirm-abandon" tone="defeat">
        <p className={styles.body}>
          The save is deleted and the region resets. Your Box, your Trauma and the map all go with it.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => setConfirmAbandon(false)}>
            Keep playing
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => {
              abandon();
              goTo('menu');
            }}
            data-testid="btn-abandon-confirm"
          >
            Abandon
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Paused" testId="pause-menu">
      <p className={styles.body}>
        {run ? `Region ${run.regionIndex + 1} · ${run.stats.nodesCleared} nodes cleared · ${run.stats.catches} caught.` : ''}
      </p>
      <div className={styles.stack}>
        <button type="button" className={styles.primary} onClick={onResume} data-testid="btn-resume">
          Resume
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            save();
            goTo('menu');
          }}
          data-testid="btn-save-quit"
        >
          Save and quit to menu
        </button>
        <button type="button" className={styles.secondary} onClick={() => setHelp(true)} data-testid="btn-help">
          How to play
        </button>
        <button type="button" className={styles.quiet} onClick={() => setConfirmAbandon(true)} data-testid="btn-abandon">
          Abandon run
        </button>
      </div>
    </Modal>
  );
}
