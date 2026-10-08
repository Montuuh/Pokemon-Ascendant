import { useEffect, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { useAccountStore } from '@/app/accountStore';
import { useAppStore } from '@/app/store';
import { useRunStore } from '@/app/runStore';
import { itemIcon } from '@/ui/art';
import { MedalIcon } from '@/ui/components/MedalIcon';
import { PROGRESS_TEXT } from '@/ui/strings';
import styles from './ProgressToasts.module.css';

// §8.7 / §8.6.1 — the progress panel (v0.9.6): a medal or a discovery that moved shows for a moment along the bottom
// corner of the screen, one at a time, and never takes a click. A fight's own progress is listed on its reward screen —
// the moment the fight is over — so the panel carries what moves anywhere else, and holds itself while a fight or its
// reward screen is up.

/** How long one note stays up, and the gap before the next. */
const SHOW_MS = 3600;
const GAP_MS = 250;

export function ProgressToasts() {
  const toasts = useAccountStore((s) => s.toasts);
  const dismiss = useAccountStore((s) => s.dismissToast);
  // A fight, and the reward screen that lists what the fight moved, both hold the panel.
  const inFight = useAppStore((s) => s.screen === 'combat');
  const onReward = useRunStore((s) => s.run?.phase === 'reward');
  const [leaving, setLeaving] = useState(false);
  const note = inFight || onReward ? null : (toasts[0] ?? null);

  useEffect(() => {
    if (!note) return;
    const out = window.setTimeout(() => setLeaving(true), SHOW_MS);
    const next = window.setTimeout(() => {
      setLeaving(false);
      dismiss(note.key);
    }, SHOW_MS + GAP_MS);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(next);
    };
  }, [note, dismiss]);

  if (!note) return null;
  const pct = (n: number) => `${Math.round((n / note.goal) * 100)}%`;
  return (
    <div className={styles.dock} aria-live="polite">
      <div
        role="status"
        className={`${styles.toast} ${note.done ? styles.done : ''} ${leaving ? styles.leaving : ''}`}
        data-testid="progress-toast"
        data-kind={note.kind}
        aria-label={`${PROGRESS_TEXT.heading(note.kind, note.done)}: ${note.name}, ${note.to} of ${note.goal}`}
      >
        {note.kind === 'achievement' ? (
          <MedalIcon tier={note.tier} size={40} />
        ) : (
          <span className={styles.icon} aria-hidden="true">
            <img src={itemIcon(note.id)} alt="" width={30} height={30} />
          </span>
        )}
        <span className={styles.body}>
          <span className={styles.kicker}>
            {note.done && <IconSparkles size={13} />} {PROGRESS_TEXT.heading(note.kind, note.done)}
          </span>
          <b className={`${styles.name} display`}>{note.name}</b>
          {note.goal > 1 && (
            <span className={styles.bar}>
              <span className={styles.was} style={{ width: pct(note.from) }} />
              <span className={styles.now} style={{ width: pct(note.to) }} />
            </span>
          )}
        </span>
        {note.goal > 1 && (
          <span className={`${styles.count} tabular`}>
            {note.to}/{note.goal}
          </span>
        )}
      </div>
    </div>
  );
}
