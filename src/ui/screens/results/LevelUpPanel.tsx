import type { LevelUp } from '@/sim';
import type { Place } from './results';
import { TypeLabel } from '@/ui/components/TypeBadge';
import { getContent } from '@/content/registry';
import { RESULT_TEXT, REWARD_TEXT, STAT_LONG } from '@/ui/strings';
import styles from './LevelUpPanel.module.css';

const STATS = ['hp', 'attack', 'defense', 'speed'] as const;

/** Where the panel's beat turns: the gains are up from the start, the totals count up across this stretch. */
const COUNT_FROM = 0.3;
const COUNT_TO = 0.62;
/** Where the window stands finished: the gains up, the totals counted, not yet folding (a screen that ends its beat by leaving). */
export const LEVEL_UP_SETTLED = COUNT_TO;
/** It folds away over the beat's last stretch. */
const FOLD_AT = 0.93;

/**
 * §9.4.5 — what a level gave, beside the card for the length of its beat (the series' stat window, in the game's own
 * register): "Pidgey grew to Lv 9!", each stat's gain, then the totals counting up to their new values, and a move the
 * level brought. It takes no click: it folds away when its beat ends, and the level tag's door shows the same again.
 *
 * It stands in reserved ground right of the Lead, separately from the Badge. The card whose news it is glows;
 * only the Lead's panel has a pointer. Enlarged text and learned moves wrap inside that reserved width.
 *
 * v0.9.80 (the user): a small ring at its top right drains for as long as the panel will stay; a level that teaches a move
 * lights the panel up, keeps the ring full and stops the clock (`held`) until a click, so the move is read, not missed. One panel
 * per level: `up` is the news of a single level.
 */
export function LevelUpPanel({
  name,
  up,
  p,
  place,
  variant = 'stage',
  held = false,
}: {
  name: string;
  up: LevelUp;
  p: number;
  place: Place;
  variant?: 'stage' | 'screen';
  /** The reveal's clock is standing on this panel, waiting for a click. */
  held?: boolean;
}) {
  const content = getContent();
  const count = Math.max(0, Math.min(1, (p - COUNT_FROM) / (COUNT_TO - COUNT_FROM)));
  const teaches = up.learned.length > 0;
  // The ring drains over a panel that folds by itself; one that teaches a move never leaves on its own, so its ring stands full.
  const left = teaches ? 1 : Math.max(0, Math.min(1, 1 - p));
  return (
    <div
      className={`${styles.panel} ${p >= FOLD_AT && !held ? styles.folding : ''} ${variant === 'screen' ? styles.onScreen : ''} ${teaches ? styles.teaches : ''}`}
      data-place={place}
      data-held={held || undefined}
      // On a screen that already says the result aloud (Training), the window is the picture of it, not a second announcement.
      {...(variant === 'stage' ? { role: 'status', 'aria-live': 'polite' as const } : {})}
      data-testid={`levelup-panel-${up.uid}`}
    >
      {variant === 'stage' && (
        <svg className={styles.timer} viewBox="0 0 24 24" aria-hidden="true" data-testid="levelup-timer" data-held={held || undefined}>
          <circle className={styles.timerTrack} cx="12" cy="12" r="9" />
          <circle className={styles.timerArc} cx="12" cy="12" r="9" pathLength={1} strokeDasharray={`${held ? 1 : left} 1`} />
        </svg>
      )}
      <span className={`${styles.head} display`}>{RESULT_TEXT.grew(name, up.to)}</span>
      {up.gains && up.statsAt && (
        <span className={styles.rows}>
          {STATS.map((k) => {
            const now = up.statsAt![k];
            const gain = up.gains![k];
            return (
              <span key={k} className={styles.row}>
                <span className={styles.stat}>{STAT_LONG[k]}</span>
                <span className={`${styles.value} tabular`}>{Math.round(now - gain + gain * count)}</span>
                <span className={`${styles.gain} tabular`}>+{gain}</span>
              </span>
            );
          })}
        </span>
      )}
      {up.learned.map((id) => {
        const move = content.move(id);
        const pooled = !up.activated.includes(id);
        return (
          <span key={id} className={styles.move} data-testid={`learned-${id}`}>
            <span className={styles.new}>{RESULT_TEXT.learned}</span>
            <TypeLabel type={move.type} size={12} />
            <span className={`${styles.moveName} display`}>{move.name}</span>
            {pooled && <span className={styles.pool}>{REWARD_TEXT.inPool}</span>}
          </span>
        );
      })}
      {held && <span className={styles.resume}>{RESULT_TEXT.clickOn}</span>}
    </div>
  );
}
