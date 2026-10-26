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
/** It folds away over the beat's last stretch. */
const FOLD_AT = 0.93;

/**
 * §9.4.5 — what a level gave, beside the card for the length of its beat (the series' stat window, in the game's own
 * register): "Pidgey grew to Lv 9!", each stat's gain, then the totals counting up to their new values, and a move the
 * level brought. It takes no click: it folds away when its beat ends, and the level tag's door shows the same again.
 *
 * It stands in reserved ground right of the Lead, separately from the Badge. The card whose news it is glows;
 * only the Lead's panel has a pointer. Enlarged text and learned moves wrap inside that reserved width.
 */
export function LevelUpPanel({ name, up, p, place }: { name: string; up: LevelUp; p: number; place: Place }) {
  const content = getContent();
  const count = Math.max(0, Math.min(1, (p - COUNT_FROM) / (COUNT_TO - COUNT_FROM)));
  return (
    <div className={`${styles.panel} ${p >= FOLD_AT ? styles.folding : ''}`} data-place={place} role="status" aria-live="polite" data-testid={`levelup-panel-${up.uid}`}>
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
          <span key={id} className={styles.move}>
            <span className={styles.new}>{RESULT_TEXT.learned}</span>
            <TypeLabel type={move.type} size={12} />
            <span className="display">{move.name}</span>
            {pooled && <span className={styles.pool}>{REWARD_TEXT.inPool}</span>}
          </span>
        );
      })}
    </div>
  );
}
