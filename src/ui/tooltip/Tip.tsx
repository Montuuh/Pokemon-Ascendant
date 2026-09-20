import type { ReactNode } from 'react';
import styles from './Tooltip.module.css';

// The shape every tooltip in the game takes, so they read as one voice: a title, a short body, and an optional
// row of small facts. Anything richer (a move's full breakdown) composes these rather than inventing a layout.

export interface TipProps {
  title?: ReactNode;
  /** One or two sentences. What it does, in the player's words. */
  body?: ReactNode;
  /** Small facts as pills — "Fire", "Ranged", "2 AP", "40 power". Order is display order. */
  meta?: ReactNode[];
  /** A quieter last line: where it came from, what unlocks it, a caveat. */
  footer?: ReactNode;
  /** An icon or sprite at the left of the title. */
  icon?: ReactNode;
}

export function Tip({ title, body, meta, footer, icon }: TipProps) {
  return (
    <div className={styles.tip}>
      {(title || icon) && (
        <div className={styles.head}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {title && <span className={`${styles.title} display`}>{title}</span>}
        </div>
      )}
      {meta && meta.length > 0 && (
        <div className={styles.meta}>
          {meta.map((m, i) => (
            <span key={i} className={styles.pill}>
              {m}
            </span>
          ))}
        </div>
      )}
      {body && <div className={styles.body}>{body}</div>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
